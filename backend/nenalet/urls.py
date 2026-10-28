"""Vytažení odkazů z textu a jejich rozbor bez přístupu na síť."""

from __future__ import annotations

import ipaddress
import re
from dataclasses import dataclass, field
from urllib.parse import urlsplit

import tldextract

from .brands import BRANDS, OFFICIAL_INDEX, SHORT_KEYWORD_LEN, Brand

# Přibalený seznam veřejných přípon (bez stahování); soukromé přípony (github.io, pages.dev...)
# zapnuté, aby se z nich nestala "registrovaná doména" celého hostingu.
_EXTRACT = tldextract.TLDExtract(suffix_list_urls=(), include_psl_private_domains=True)

SHORTENERS = frozenset(
    "bit.ly tinyurl.com t.ly is.gd cutt.ly rebrand.ly ow.ly shorturl.at tiny.cc s.id rb.gy t.co "
    "goo.gl buff.ly bl.ink short.io lnkd.in qrco.de urlz.fr v.gd clck.ru u.to".split()
)

# Služby, kde si web zdarma založí kdokoli - samy o sobě nejsou špatné, ale banka ani dopravce
# na nich své přihlašování neprovozují.
FREE_HOSTING_SUFFIXES = frozenset(
    "pages.dev workers.dev vercel.app netlify.app web.app firebaseapp.com github.io gitlab.io "
    "glitch.me herokuapp.com onrender.com repl.co replit.app weebly.com wixsite.com "
    "blogspot.com webflow.io framer.app framer.website ngrok.io ngrok-free.app "
    "azurewebsites.net r2.dev surge.sh webnode.cz webnode.page mozello.cz "
    "000webhostapp.com godaddysites.com square.site carrd.co".split()
)
FREE_FORM_HOSTS = frozenset({"forms.gle", "docs.google.com", "sites.google.com", "forms.office.com"})

# Domény nejvyššího řádu, které jsou podle reportů o phishingu výrazně častěji zneužívány.
SUSPICIOUS_TLDS = frozenset(
    "top xyz shop store online site click icu live vip cfd sbs cyou buzz rest bond lol mom "
    "monster quest beauty hair skin makeup boats autos yachts motorcycles today world fun "
    "space website pw tk ml ga cf gq work support help life".split()
)

_URL_RE = re.compile(
    r"""(?ix)
    (?<![@\w.-])                                   # ne část e-mailu
    (?:
        (?:https?://|hxxps?://)[^\s<>"'`]+         # s protokolem
      | (?:www\.)[^\s<>"'`]+                       # www bez protokolu
      | (?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,23}(?:/[^\s<>"'`]*)?  # holá doména
    )
    """
)
_TRAILING = ".,;:!?)]}'\"»“”"


@dataclass
class UrlInfo:
    raw: str
    url: str
    host: str
    registered_domain: str
    suffix: str
    scheme: str
    is_ip: bool = False
    is_punycode: bool = False
    has_userinfo: bool = False
    shortener: bool = False
    free_hosting: bool = False
    suspicious_tld: bool = False
    official_brand: Brand | None = None
    impersonated_brand: Brand | None = None
    impersonation_reason: str | None = None
    notes: list[str] = field(default_factory=list)


def _normalize(raw: str) -> str:
    url = raw.strip().rstrip(_TRAILING)
    url = re.sub(r"^hxxp", "http", url, flags=re.I)
    url = url.replace("[.]", ".").replace("(.)", ".")
    if not re.match(r"^[a-z][a-z0-9+.-]*://", url, re.I):
        url = "http://" + url
    return url


def extract_urls(text: str, limit: int = 5) -> list[str]:
    """Najde odkazy v textu; holé domény bere jen s platnou příponou."""
    found: list[str] = []
    for m in _URL_RE.finditer(text or ""):
        candidate = m.group(0).rstrip(_TRAILING)
        if not re.match(r"(?i)^(https?|hxxps?)://|^www\.", candidate):
            ext = _EXTRACT(candidate.split("/")[0])
            if not ext.suffix or not ext.domain:
                continue
        if candidate not in found:
            found.append(candidate)
        if len(found) >= limit:
            break
    return found


_HOMOGLYPHS = (("0", "o"), ("1", "l"), ("3", "e"), ("5", "s"), ("rn", "m"), ("vv", "w"), ("-", ""))


def _skeleton(label: str) -> str:
    s = label.lower()
    for a, b in _HOMOGLYPHS:
        s = s.replace(a, b)
    return s


def _levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _find_impersonation(host: str, registered: str) -> tuple[Brand, str] | None:
    host_l = host.lower()
    tokens = set(re.split(r"[.\-]", host_l))
    reg_label = registered.split(".")[0].lower()
    for brand in BRANDS:
        for kw in brand.keywords:
            if len(kw) >= SHORT_KEYWORD_LEN:
                if kw in host_l:
                    return brand, f"adresa obsahuje „{kw}“, ale nepatří k oficiálním doménám ({', '.join(sorted(brand.official))})"
            elif kw in tokens:
                return brand, f"adresa obsahuje „{kw}“, ale nepatří k oficiálním doménám ({', '.join(sorted(brand.official))})"
        for off in brand.official:
            off_label = off.split(".")[0]
            if len(off_label) < 4 or reg_label == off_label:
                continue
            if _skeleton(reg_label) == _skeleton(off_label) or (
                len(off_label) >= 5 and _levenshtein(reg_label, off_label) == 1
            ):
                return brand, f"adresa „{registered}“ je skoro stejná jako oficiální „{off}“ (záměna písmen)"
    return None


def analyze_url(raw: str) -> UrlInfo | None:
    url = _normalize(raw)
    try:
        parts = urlsplit(url)
    except ValueError:
        return None
    host = (parts.hostname or "").rstrip(".").lower()
    if not host:
        return None
    ext = _EXTRACT(host)
    registered = ext.top_domain_under_public_suffix or host
    info = UrlInfo(raw=raw, url=url, host=host, registered_domain=registered, suffix=ext.suffix, scheme=parts.scheme)

    try:
        ipaddress.ip_address(host)
        info.is_ip = True
    except ValueError:
        pass
    info.is_punycode = "xn--" in host
    info.has_userinfo = "@" in (parts.netloc or "")
    info.shortener = registered in SHORTENERS or host in SHORTENERS
    info.free_hosting = ext.suffix in FREE_HOSTING_SUFFIXES or host in FREE_FORM_HOSTS
    last_label = ext.suffix.split(".")[-1] if ext.suffix else ""
    info.suspicious_tld = last_label in SUSPICIOUS_TLDS

    official = OFFICIAL_INDEX.get(registered)
    if official:
        info.official_brand = official
    elif not info.is_ip:
        hit = _find_impersonation(host, registered)
        if hit:
            info.impersonated_brand, info.impersonation_reason = hit
    return info
