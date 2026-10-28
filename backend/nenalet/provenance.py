"""Ověření původu obrázku.

1. C2PA Content Credentials (lokálně, knihovna c2pa) - podepsaný údaj o vzniku obrázku. Používají ho
   Google (Gemini / Imagen / Nano Banana), OpenAI, Adobe Firefly, Microsoft a další.
2. OpenAI Content Provenance API - C2PA a neviditelný vodoznak SynthID v obsahu vytvořeném modely OpenAI.

Obě metody poznají jen obsah od generátorů, které se samy označují. Když nic nenajdou,
neznamená to, že je obrázek pravý (snímek obrazovky nebo sociální síť údaje často odstraní).
Google SynthID pro obsah od Googlu zatím nemá veřejné API pro vývojáře.
"""

from __future__ import annotations

import asyncio
import io
import json
import logging
import os
from dataclasses import dataclass

import c2pa
import openai

from .schemas import Check

log = logging.getLogger(__name__)

# IPTC digitalSourceType -> lidský popis
# (algorithmicMedia = počítačová grafika bez AI, např. graf - za AI ho nepovažujeme)
AI_SOURCE_TYPES = {
    "trainedAlgorithmicMedia": "vytvořený umělou inteligencí",
    "compositeWithTrainedAlgorithmicMedia": "upravený pomocí umělé inteligence",
}
_AI_PRIORITY = list(AI_SOURCE_TYPES)  # první = nejsilnější

OPENAI_MIME = {"image/png", "image/jpeg", "image/webp"}


@dataclass
class C2paInfo:
    present: bool
    state: str | None = None  # Trusted / Valid / Invalid
    issuer: str | None = None
    generator: str | None = None
    ai_kind: str | None = None


def read_c2pa(data: bytes, mime: str) -> C2paInfo:
    try:
        with c2pa.Reader(mime, io.BytesIO(data)) as reader:
            manifest_store = json.loads(reader.json())
            state = str(reader.get_validation_state() or "")
    except Exception:  # noqa: BLE001 - bez manifestu knihovna hází výjimku
        return C2paInfo(present=False)

    manifests = manifest_store.get("manifests") or {}
    active = manifests.get(manifest_store.get("active_manifest") or "", {})
    best: str | None = None
    # Projdeme i starší manifesty (ingredience): AI mohla být použita kdykoli v historii obrázku.
    for m in manifests.values():
        for a in m.get("assertions", []):
            if not str(a.get("label", "")).startswith("c2pa.actions"):
                continue
            for act in (a.get("data") or {}).get("actions", []):
                dst = str(act.get("digitalSourceType") or "").rsplit("/", 1)[-1]
                if dst in AI_SOURCE_TYPES and (best is None or _AI_PRIORITY.index(dst) < _AI_PRIORITY.index(best)):
                    best = dst
    gen_info = active.get("claim_generator_info") or [{}]
    generator = (gen_info[0] or {}).get("name") or active.get("claim_generator")
    issuer = (active.get("signature_info") or {}).get("issuer")
    return C2paInfo(True, state, issuer, generator, AI_SOURCE_TYPES.get(best) if best else None)


async def openai_provenance(data: bytes, mime: str, client: openai.AsyncOpenAI | None = None) -> dict | None:
    """Výsledky OpenAI Content Provenance API jako {typ: {...}}; None když klíč chybí."""
    if client is None:
        if not os.environ.get("OPENAI_API_KEY"):
            return None
        client = openai.AsyncOpenAI(timeout=20.0, max_retries=1)
    if mime not in OPENAI_MIME:
        return None
    ext = mime.split("/")[1]
    try:
        res = await client.content_provenance_checks.create(file=(f"obrazek.{ext}", data, mime))
    except openai.NotFoundError:
        log.warning("OpenAI provenance: organizace nemá přístup")
        return {"error": "Ověření u OpenAI teď není dostupné."}
    except openai.RateLimitError:
        return {"error": "Ověření u OpenAI je dočasně přetížené."}
    except openai.APIError:
        log.exception("OpenAI provenance selhalo")
        return {"error": "Ověření u OpenAI se nepovedlo."}
    out: dict = {}
    for r in res.results:
        out[r.type] = {
            "outcome": r.outcome,
            "model": getattr(r, "model", None),
            "issuer": getattr(r, "issuer", None),
            "generated_at": getattr(r, "generated_at", None),
        }
    return out


async def check_image_provenance(data: bytes, mime: str) -> list[Check]:
    c2pa_info, oa = await asyncio.gather(asyncio.to_thread(read_c2pa, data, mime), openai_provenance(data, mime))
    checks: list[Check] = []
    found_ai = False

    if c2pa_info.present:
        who = c2pa_info.issuer or "neznámý vydavatel"
        tool = f", nástroj {c2pa_info.generator}" if c2pa_info.generator else ""
        if c2pa_info.state == "Invalid":
            checks.append(Check(name="Původ obrázku (C2PA)", status="varovani",
                                detail=f"Obrázek obsahuje údaj o původu, ale jeho podpis nesedí – obrázek byl po podepsání změněn (uvedený vydavatel: {who}).",
                                source="C2PA Content Credentials"))
        elif c2pa_info.ai_kind:
            found_ai = True
            checks.append(Check(name="Původ obrázku (C2PA)", status="varovani",
                                detail=f"Obrázek nese podepsaný údaj, že je {c2pa_info.ai_kind} (podepsal: {who}{tool}).",
                                source="C2PA Content Credentials"))
        else:
            checks.append(Check(name="Původ obrázku (C2PA)", status="info",
                                detail=f"Obrázek má podepsaný údaj o původu bez zmínky o AI (podepsal: {who}{tool}).",
                                source="C2PA Content Credentials"))

    if oa and "error" not in oa:
        syn = oa.get("synthid") or {}
        c2 = oa.get("c2pa") or {}
        if syn.get("outcome") == "detected":
            found_ai = True
            model = f" (model {syn['model']})" if syn.get("model") else ""
            checks.append(Check(name="Vodoznak SynthID (OpenAI)", status="varovani",
                                detail=f"Obrázek obsahuje neviditelný vodoznak, podle kterého ho vytvořila umělá inteligence OpenAI{model}.",
                                source="OpenAI Content Provenance API"))
        if c2.get("outcome") == "detected" and not (c2pa_info.present and c2pa_info.ai_kind):
            found_ai = True
            checks.append(Check(name="Původ obrázku (OpenAI)", status="varovani",
                                detail="OpenAI potvrdilo podepsaný údaj, že obrázek vytvořil jeho model.",
                                source="OpenAI Content Provenance API"))

    if not found_ai:
        methods = ["podpis původu C2PA (Google, OpenAI, Adobe, Microsoft…)"]
        if oa and "error" not in oa:
            methods.append("vodoznak SynthID od OpenAI")
        checks.append(Check(name="Je obrázek vytvořený AI?", status="info",
                            detail=f"Hledali jsme {' a '.join(methods)} – nic jsme nenašli. To ale NEZNAMENÁ, že je obrázek pravý: "
                                   "snímky obrazovky a sociální sítě tyto údaje odstraňují a mnoho nástrojů je vůbec nepřidává.",
                            source="C2PA" + (" + OpenAI" if oa and "error" not in oa else "")))
    return checks
