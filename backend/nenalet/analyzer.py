"""Hlavní logika: ověřená fakta + jazykový model -> verdikt."""

from __future__ import annotations

import asyncio
import base64
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import date

import io
import os

import anthropic
import httpx
from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener

from .config import OPENROUTER_BASE_URL, Settings, openrouter_model_id, settings as default_settings
from .netguard import BlockedTarget, safe_fetch
from .page import PageInfo, ico_checksum_ok, parse_page
from .prompt import SYSTEM_PROMPT
from .schemas import (
    SEVERITY,
    VERDICT_LABELS,
    Check,
    CheckRequest,
    CheckResponse,
    ModelVerdict,
)
from .sources import CoiList, ares_lookup, domain_registered
from .urls import FREE_FORM_HOSTS, UrlInfo, analyze_url, extract_urls

log = logging.getLogger(__name__)
register_heif_opener()

DISCLAIMER = (
    "Nenaleť je pomocník, ne záruka. Může se mýlit oběma směry. "
    "Když jde o peníze, vždy si to ověřte sami – zavolejte bance nebo blízkému na číslo, které znáte."
)

MAX_IMAGE_SIDE = 1600

# Modely, které podporují serverový fallback při odmítnutí.
FALLBACK_MODELS = {"claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-1", "claude-opus-5"}


class InputError(ValueError):
    """Chyba ve vstupu, kterou ukážeme uživateli."""


@dataclass
class Facts:
    checks: list[Check] = field(default_factory=list)
    page: PageInfo | None = None
    page_url: str | None = None

    def add(self, name: str, status: str, detail: str, source: str | None = None) -> None:
        self.checks.append(Check(name=name, status=status, detail=detail, source=source))


def decode_b64(b64: str, max_bytes: int) -> bytes:
    b64 = b64.strip()
    if b64.startswith("data:") and "," in b64[:100]:
        b64 = b64.split(",", 1)[1]
    try:
        data = base64.b64decode(b64, validate=False)
    except Exception as e:  # noqa: BLE001
        raise InputError("Obrázek se nepodařilo načíst.") from e
    if len(data) > max_bytes:
        raise InputError("Obrázek je příliš velký (max. 10 MB).")
    return data


def normalize_image(data: bytes) -> tuple[bytes, str]:
    """Libovolný běžný formát (i HEIC z iPhonu) -> menší JPEG pro jazykový model."""
    try:
        with Image.open(io.BytesIO(data)) as im:
            im = ImageOps.exif_transpose(im)
            im = im.convert("RGB")
            im.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
            out = io.BytesIO()
            im.save(out, "JPEG", quality=85)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as e:
        raise InputError("Tento obrázek neumíme přečíst. Pošlete prosím snímek obrazovky jako JPEG nebo PNG.") from e
    return out.getvalue(), "image/jpeg"


def decode_image(b64: str, max_bytes: int) -> tuple[bytes, str]:
    return normalize_image(decode_b64(b64, max_bytes))


def _age_days(registered: date) -> int:
    return (date.today() - registered).days


async def _url_facts(info: UrlInfo, coi: CoiList, http: httpx.AsyncClient, facts: Facts) -> None:
    d = info.registered_domain
    label = f"Odkaz {info.host}"

    if info.host in FREE_FORM_HOSTS:
        facts.add(label, "varovani", "Odkaz vede na formulář nebo web, který si zdarma může založit kdokoli (např. Google Formuláře). Banky ani úřady přes ně údaje nesbírají.")
    elif info.official_brand:
        facts.add(label, "ok", f"Doména {d} patří společnosti {info.official_brand.name}.", "seznam oficiálních domén Nenaleť")
    if info.impersonated_brand:
        facts.add(label, "nebezpeci", f"Napodobenina značky {info.impersonated_brand.name}: {info.impersonation_reason}.", "porovnání s oficiálními doménami")
    if info.is_punycode:
        facts.add(label, "varovani", "Adresa používá znaky z jiných abeced, které mohou vypadat jako česká písmena.")
    if info.is_ip:
        facts.add(label, "varovani", "Odkaz místo jména webu obsahuje jen číselnou IP adresu.")
    if info.has_userinfo:
        facts.add(label, "nebezpeci", "Adresa obsahuje znak @, kterým se dá skrýt skutečný cíl odkazu.")
    if info.shortener:
        facts.add(label, "varovani", "Zkrácený odkaz – není vidět, kam doopravdy vede.")
    if info.free_hosting and info.host not in FREE_FORM_HOSTS:
        facts.add(label, "info", f"Stránka běží na bezplatném hostingu ({info.suffix}), kde si web může založit kdokoli.")
    if info.suspicious_tld and not info.official_brand:
        facts.add(label, "info", f"Koncovka .{info.suffix.split('.')[-1]} je u podvodných webů častá (sama o sobě ale nic nedokazuje).")

    entry = coi.lookup(info.host, d)
    if entry:
        facts.add(label, "nebezpeci", f"Doména je na seznamu rizikových e-shopů České obchodní inspekce (zveřejněno {entry.listed}): {entry.reason}", "ČOI – rizikové e-shopy")

    if not info.is_ip and not info.free_hosting and not info.shortener and not info.official_brand:
        reg = await domain_registered(d, http)
        if reg:
            days = _age_days(reg)
            if days < 30:
                facts.add(label, "nebezpeci", f"Doména {d} byla zaregistrována teprve před {days} dny ({reg.isoformat()}).", "registr domén (RDAP)")
            elif days < 180:
                facts.add(label, "varovani", f"Doména {d} je nová – registrace {reg.isoformat()} (před {days} dny).", "registr domén (RDAP)")
            else:
                facts.add(label, "info", f"Doména {d} existuje od {reg.isoformat()}.", "registr domén (RDAP)")


async def _page_facts(url: str, coi: CoiList, http: httpx.AsyncClient, facts: Facts) -> None:
    try:
        res = await safe_fetch(url)
    except BlockedTarget as e:
        facts.add("Stažení stránky", "info", f"Stránku jsme z bezpečnostních důvodů nestahovali ({e}).")
        return
    except (httpx.HTTPError, OSError):
        facts.add("Stažení stránky", "info", "Stránka se nenačetla (nemusí už existovat, což je u podvodných webů běžné).")
        return

    orig, final = analyze_url(url), analyze_url(res.final_url)
    if orig and final and final.registered_domain != orig.registered_domain:
        facts.add("Přesměrování", "varovani", f"Odkaz přesměrovává na jiný web: {final.host}.")
        # Konečnou adresu ověříme stejně jako původní odkaz.
        await _url_facts(final, coi, http, facts)
    if "html" not in res.content_type.lower() and res.content_type:
        facts.add("Obsah stránky", "info", f"Odkaz nevede na webovou stránku, ale na soubor typu {res.content_type.split(';')[0]}.")
        if any(x in res.content_type for x in ("application/vnd.android", "octet-stream", "x-msdownload")):
            facts.add("Obsah stránky", "nebezpeci", "Odkaz stahuje aplikaci nebo program – podvodníci tak instalují škodlivý software.")
        return

    host = (final or orig).host if (final or orig) else ""
    page = parse_page(res.body.decode("utf-8", errors="replace"), host, res.final_url)
    facts.page, facts.page_url = page, res.final_url
    if page.card_fields:
        facts.add("Formulář na stránce", "varovani", f"Stránka chce vyplnit údaje z platební karty ({', '.join(page.card_fields)}).")
    if page.external_form_actions:
        facts.add("Formulář na stránce", "varovani", "Vyplněné údaje se odesílají na jinou doménu, než na které stránka běží.")

    # IČO bývá v kontaktech nebo obchodních podmínkách, ne na úvodní stránce.
    icos, ico_page = page.icos, None
    if not icos:
        for link in page.operator_links[:2]:
            try:
                sub = await safe_fetch(link)
            except (BlockedTarget, httpx.HTTPError, OSError):
                continue
            if "html" in sub.content_type.lower():
                found = parse_page(sub.body.decode("utf-8", errors="replace"), host).icos
                if found:
                    icos, ico_page = found, link
                    break
    where = f" (uvedeno na {ico_page})" if ico_page else ""

    for ico in icos[:2]:
        if not ico_checksum_ok(ico):
            facts.add(f"IČO {ico}", "nebezpeci", f"Uvedené IČO{where} je neplatné (nesedí kontrolní číslice) – takové IČO nemůže existovat.", "kontrola IČO")
            continue
        company = await ares_lookup(ico, http)
        if company is None:
            facts.add(f"IČO {ico}", "info", "Rejstřík ARES teď neodpovídá, IČO jsme neověřili.")
        elif not company.found:
            facts.add(f"IČO {ico}", "nebezpeci", f"Firma s tímto IČO{where} v rejstříku ARES neexistuje.", "ARES")
        else:
            status = "varovani" if company.dissolved else "ok"
            extra = f", zanikla {company.dissolved}" if company.dissolved else ""
            facts.add(f"IČO {ico}", status, f"Provozovatel{where}: v ARES vedený jako {company.name} (vznik {company.founded or '?'}{extra}, sídlo {company.address or '?'}).", "ARES")
    if page.text and not icos and _looks_like_shop(page):
        facts.add("Provozovatel", "varovani", "Stránka vypadá jako e-shop, ale na úvodní stránce ani v kontaktech jsme nenašli IČO provozovatele.")


def _looks_like_shop(page: PageInfo) -> bool:
    t = page.text.lower()
    return sum(w in t for w in ("košík", "do košíku", "objednat", "doprava zdarma", "sleva", "skladem")) >= 2


async def gather_facts(req: CheckRequest, coi: CoiList, cfg: Settings) -> Facts:
    facts = Facts()
    raw_urls: list[str] = []
    if req.url:
        raw_urls.append(req.url.strip())
    raw_urls += [u for u in extract_urls(req.text or "") if u not in raw_urls]
    infos = [i for i in (analyze_url(u) for u in raw_urls[:3]) if i]

    async with httpx.AsyncClient(headers={"User-Agent": "Nenalet/1.0 (+https://github.com/gweilnid/nenalet)"}) as http:
        tasks = [_url_facts(i, coi, http, facts) for i in infos]
        if cfg.fetch_pages and infos and not infos[0].official_brand:
            tasks.append(_page_facts(infos[0].url, coi, http, facts))
        await asyncio.gather(*tasks)
    return facts


def _facts_block(facts: Facts) -> str:
    lines = [f"- [{c.status}] {c.name}: {c.detail}" + (f" (zdroj: {c.source})" if c.source else "") for c in facts.checks]
    if facts.page:
        p = facts.page
        lines.append(f"- Obsah stránky {facts.page_url}: titulek „{p.title}“. Úryvek textu: {p.text[:2500]}")
    return "\n".join(lines) if lines else "- Žádné automatické kontroly se neprováděly (vstup neobsahuje odkaz)."


def build_user_content(req: CheckRequest, facts: Facts, image: tuple[bytes, str] | None) -> list[dict]:
    parts: list[dict] = []
    if image:
        data, mt = image
        parts.append({"type": "image", "source": {"type": "base64", "media_type": mt, "data": base64.standard_b64encode(data).decode()}})
    body = ["<vstup>"]
    if req.text:
        body.append(f"<text>\n{req.text}\n</text>")
    if req.url:
        body.append(f"<odkaz>{req.url}</odkaz>")
    if image:
        body.append("<obrazek>Uživatel přiložil obrázek (snímek obrazovky nebo fotku) – je výše.</obrazek>")
    body.append("</vstup>")
    body.append(f"<overena_fakta>\n{_facts_block(facts)}\n</overena_fakta>")
    body.append("Posuďte, zda jde o podvod, a vyplňte odpověď.")
    parts.append({"type": "text", "text": "\n".join(body)})
    return parts


def _floor_from_facts(checks: list[Check]) -> str:
    return "podezrele" if any(c.status == "nebezpeci" for c in checks) else "nelze_posoudit"


def summary_text(resp_verdict: str, mv: ModelVerdict) -> str:
    icon = {"podvod": "🛑", "podezrele": "⚠️", "bez_varovnych_signalu": "✅", "nelze_posoudit": "❔"}[resp_verdict]
    out = [f"{icon} {VERDICT_LABELS[resp_verdict]}", mv.headline]
    if mv.red_flags:
        out.append("\nProč:")
        out += [f"• {f.signal}: {f.explanation}" for f in mv.red_flags[:4]]
    if mv.what_to_do:
        out.append("\nCo dělat:")
        out += [f"{i}. {s}" for i, s in enumerate(mv.what_to_do[:4], 1)]
    out.append("\n" + DISCLAIMER)
    return "\n".join(out)


def make_client(cfg: Settings) -> anthropic.AsyncAnthropic:
    if cfg.provider == "openrouter":
        # OpenRouter nabízí rozhraní kompatibilní s Anthropic Messages API.
        return anthropic.AsyncAnthropic(
            base_url=OPENROUTER_BASE_URL,
            auth_token=os.environ["OPENROUTER_API_KEY"],
            api_key=None,
            timeout=60.0,
            max_retries=2,
        )
    return anthropic.AsyncAnthropic(timeout=60.0, max_retries=2)


class Analyzer:
    def __init__(self, coi: CoiList, cfg: Settings = default_settings, client: anthropic.AsyncAnthropic | None = None):
        self.coi = coi
        self.cfg = cfg
        self.client = client or make_client(cfg)

    async def _ask_model(self, content: list[dict]) -> tuple[ModelVerdict | None, str, dict | None]:
        kwargs: dict = dict(
            max_tokens=4000,
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": content}],
            output_config={"effort": self.cfg.effort},
            output_format=ModelVerdict,
        )
        if self.cfg.provider == "openrouter":
            resp = await self.client.messages.parse(model=openrouter_model_id(self.cfg.model), **kwargs)
        else:
            if self.cfg.model in FALLBACK_MODELS:
                kwargs.update(betas=["server-side-fallback-2026-07-01"], fallbacks="default")
            resp = await self.client.beta.messages.parse(model=self.cfg.model, **kwargs)
        u = resp.usage
        usage = {
            "input": u.input_tokens, "output": u.output_tokens,
            "cache_read": u.cache_read_input_tokens or 0, "cache_write": u.cache_creation_input_tokens or 0,
        }
        if resp.stop_reason == "refusal":
            log.warning("model odmítl: %s", getattr(resp, "stop_details", None))
            return None, resp.model, usage
        return resp.parsed_output, resp.model, usage

    async def check(self, req: CheckRequest) -> CheckResponse:
        t0 = time.monotonic()
        text = (req.text or "").strip()
        if len(text) > self.cfg.max_text_chars:
            text = text[: self.cfg.max_text_chars]
        # Zkratka v iPhonu umí poslat několik odkazů oddělených řádky - první je hlavní, další přidáme k textu.
        urls = (req.url or "").split()
        if len(urls) > 1:
            extra = "\n".join(u for u in urls[1:] if u not in text)
            text = f"{text}\n{extra}".strip() if extra else text
        req = req.model_copy(update={"text": text or None, "url": urls[0] if urls else None})

        image = normalize_image(decode_b64(req.image_base64, self.cfg.max_image_bytes)) if req.image_base64 else None
        if not (req.text or req.url or image):
            raise InputError("Vložte prosím text zprávy, odkaz nebo obrázek.")

        facts = await gather_facts(req, self.coi, self.cfg)
        mv, model_used, usage = await self._ask_model(build_user_content(req, facts, image))
        if mv is None:
            mv = ModelVerdict(
                verdict="nelze_posoudit",
                confidence="nizka",
                headline="Tohle jsme automaticky posoudit nedokázali.",
                scam_type=None,
                red_flags=[],
                reassuring_signs=[],
                what_to_do=[
                    "Neklikejte na odkazy a neposílejte žádné údaje ani peníze.",
                    "Ověřte si to přímo u odesílatele – na čísle nebo webu, který znáte odjinud.",
                ],
                explanation="Model odpověď odmítl vytvořit. Řiďte se prosím ověřenými údaji níže a obecnými pravidly.",
            )

        verdict = mv.verdict
        floor = _floor_from_facts(facts.checks)
        if SEVERITY[floor] > SEVERITY[verdict]:
            verdict = floor
            mv.headline = "Ověřené údaje ukazují na riziko – buďte opatrní."
            mv.confidence = "stredni"

        return CheckResponse(
            check_id=uuid.uuid4().hex,
            verdict=verdict,
            verdict_label=VERDICT_LABELS[verdict],
            confidence=mv.confidence,
            headline=mv.headline,
            scam_type=mv.scam_type,
            red_flags=mv.red_flags[:5],
            reassuring_signs=mv.reassuring_signs[:4],
            what_to_do=mv.what_to_do[:4],
            explanation=mv.explanation,
            checks=facts.checks,
            summary_text=summary_text(verdict, mv),
            model=model_used,
            latency_ms=int((time.monotonic() - t0) * 1000),
            disclaimer=DISCLAIMER,
            usage=usage,
        )
