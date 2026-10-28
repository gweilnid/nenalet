"""Veřejné zdroje ověřených faktů: ČOI (rizikové e-shopy), ARES (firmy), RDAP (stáří domén)."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime
from pathlib import Path

import httpx
from selectolax.lexbor import LexborHTMLParser as HTMLParser

log = logging.getLogger(__name__)

COI_URL = "https://coi.gov.cz/pro-spotrebitele/rizikove-e-shopy/"
ARES_URL = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/{ico}"
RDAP_CZ = "https://rdap.nic.cz/domain/{domain}"
RDAP_ANY = "https://rdap.org/domain/{domain}"
HTTP_TIMEOUT = httpx.Timeout(6.0, connect=3.0)


# --------------------------------------------------------------------------- ČOI


@dataclass
class CoiEntry:
    domain: str
    reason: str
    listed: str  # datum zveřejnění tak, jak ho uvádí ČOI


def parse_coi(html: str) -> dict[str, CoiEntry]:
    tree = HTMLParser(html)
    out: dict[str, CoiEntry] = {}
    for art in tree.css("article.information-row"):
        paras = art.css("div.entry-content > p")
        if not paras:
            continue
        domains = [s.text(strip=True).lower() for s in paras[0].css("span") if s.text(strip=True)]
        reason = paras[1].text(strip=True) if len(paras) > 1 else ""
        listed = paras[2].text(strip=True).strip("() ") if len(paras) > 2 else ""
        for d in domains:
            d = re.sub(r"^https?://", "", d).strip("/ ")
            d = d.removeprefix("www.")
            if "." in d and " " not in d:
                out[d] = CoiEntry(d, re.sub(r"\s+", " ", reason)[:600], listed)
    return out


class CoiList:
    """Seznam rizikových e-shopů ČOI, obnovovaný jednou za 12 hodin a ukládaný na disk."""

    REFRESH_SECONDS = 12 * 3600

    def __init__(self, cache_file: Path):
        self.cache_file = cache_file
        self.entries: dict[str, CoiEntry] = {}
        self.fetched_at: float = 0.0
        self._lock = asyncio.Lock()
        self._load_from_disk()

    def _load_from_disk(self) -> None:
        try:
            data = json.loads(self.cache_file.read_text(encoding="utf-8"))
            self.entries = {k: CoiEntry(**v) for k, v in data["entries"].items()}
            self.fetched_at = data["fetched_at"]
        except FileNotFoundError:
            pass
        except Exception:  # poškozená cache - stáhneme znovu
            log.exception("ČOI cache nelze načíst")

    async def refresh(self, force: bool = False) -> None:
        async with self._lock:
            if not force and self.entries and time.time() - self.fetched_at < self.REFRESH_SECONDS:
                return
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(30.0), follow_redirects=True) as c:
                    r = await c.get(COI_URL)
                    r.raise_for_status()
                entries = parse_coi(r.text)
                if len(entries) < 100:  # ochrana proti změně struktury stránky
                    raise ValueError(f"podezřele málo záznamů: {len(entries)}")
                self.entries, self.fetched_at = entries, time.time()
                self.cache_file.parent.mkdir(parents=True, exist_ok=True)
                self.cache_file.write_text(
                    json.dumps({"fetched_at": self.fetched_at, "entries": {k: asdict(v) for k, v in entries.items()}}, ensure_ascii=False),
                    encoding="utf-8",
                )
                log.info("ČOI seznam obnoven: %d domén", len(entries))
            except Exception:
                log.exception("ČOI seznam se nepodařilo obnovit (používám poslední známý)")

    def lookup(self, host: str, registered: str) -> CoiEntry | None:
        host = host.lower().removeprefix("www.")
        for key in (host, registered.lower()):
            if key in self.entries:
                return self.entries[key]
        return None


# --------------------------------------------------------------------------- ARES


@dataclass
class AresCompany:
    ico: str
    found: bool
    name: str | None = None
    founded: str | None = None
    dissolved: str | None = None
    address: str | None = None


async def ares_lookup(ico: str, client: httpx.AsyncClient) -> AresCompany | None:
    """Vrátí firmu z ARES, `found=False` když IČO neexistuje, None při výpadku ARES."""
    try:
        r = await client.get(ARES_URL.format(ico=ico), timeout=HTTP_TIMEOUT)
    except httpx.HTTPError:
        return None
    if r.status_code == 404:
        return AresCompany(ico=ico, found=False)
    if r.status_code != 200:
        return None
    d = r.json()
    sidlo = d.get("sidlo") or {}
    return AresCompany(
        ico=ico,
        found=True,
        name=d.get("obchodniJmeno"),
        founded=d.get("datumVzniku"),
        dissolved=d.get("datumZaniku"),
        address=sidlo.get("textovaAdresa"),
    )


# --------------------------------------------------------------------------- RDAP

_rdap_cache: dict[str, tuple[float, date | None]] = {}


async def domain_registered(domain: str, client: httpx.AsyncClient) -> date | None:
    """Datum registrace domény z RDAP (registr domén), nebo None když není k dispozici."""
    now = time.time()
    hit = _rdap_cache.get(domain)
    if hit and now - hit[0] < 24 * 3600:
        return hit[1]
    url = (RDAP_CZ if domain.endswith(".cz") else RDAP_ANY).format(domain=domain)
    result: date | None = None
    try:
        r = await client.get(url, timeout=HTTP_TIMEOUT, follow_redirects=True)
        if r.status_code == 200:
            for ev in r.json().get("events", []):
                if ev.get("eventAction") == "registration" and ev.get("eventDate"):
                    result = datetime.fromisoformat(ev["eventDate"].replace("Z", "+00:00")).date()
                    break
    except (httpx.HTTPError, ValueError):
        return None
    _rdap_cache[domain] = (now, result)
    return result
