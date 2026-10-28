"""Rozbor stažené HTML stránky: titulek, text, formuláře, IČO."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlsplit

from selectolax.lexbor import LexborHTMLParser as HTMLParser

_SENSITIVE_INPUT = re.compile(
    r"(?i)(card|karty|karta|cvv|cvc|csc|expir|platnost|pin\b|heslo|password|passwd|otp|sms.?kod|ucet|iban|rodne)"
)
_ICO_RE = re.compile(r"(?i)\bI[ČC]O?\s*[:.]?\s*((?:\d\s?){7}\d)\b")
_TERMS_RE = re.compile(r"(?i)obchodn[íi]\s+podm[íi]nk|reklamac|vr[áa]cen[íi]\s+zbo[žz][íi]")
_OPERATOR_LINK = re.compile(r"(?i)kontakt|obchodn[íi]\s+podm[íi]nk|provozovatel|o\s+n[áa]s|impressum|imprint")
_CARD_FIELDS = {"card", "karty", "karta", "cvv", "cvc", "csc", "expir", "platnost", "pin"}


@dataclass
class PageInfo:
    title: str = ""
    description: str = ""
    text: str = ""
    sensitive_fields: list[str] = field(default_factory=list)
    password_field: bool = False
    external_form_actions: list[str] = field(default_factory=list)
    icos: list[str] = field(default_factory=list)
    has_terms: bool = False
    operator_links: list[str] = field(default_factory=list)  # odkazy na kontakty / obchodní podmínky

    @property
    def card_fields(self) -> list[str]:
        return [f for f in self.sensitive_fields if f in _CARD_FIELDS]


def parse_page(html: str, page_host: str = "", base_url: str = "") -> PageInfo:
    tree = HTMLParser(html)
    info = PageInfo()
    if tree.css_first("title"):
        info.title = tree.css_first("title").text(strip=True)[:200]
    meta = tree.css_first('meta[name="description"]')
    if meta:
        info.description = (meta.attributes.get("content") or "")[:300]

    for inp in tree.css("input, select, textarea"):
        attrs = inp.attributes
        if (attrs.get("type") or "").lower() == "password":
            info.password_field = True
        blob = " ".join(str(attrs.get(k) or "") for k in ("name", "id", "placeholder", "autocomplete", "aria-label"))
        m = _SENSITIVE_INPUT.search(blob)
        if m and m.group(1).lower() not in info.sensitive_fields:
            info.sensitive_fields.append(m.group(1).lower())
    for form in tree.css("form"):
        action = (form.attributes.get("action") or "").strip()
        if action.startswith("http") and page_host and page_host not in action:
            info.external_form_actions.append(action[:200])

    if base_url:
        for a in tree.css("a[href]"):
            if not _OPERATOR_LINK.search(a.text(strip=True) or ""):
                continue
            href = urljoin(base_url, a.attributes.get("href") or "")
            if urlsplit(href).hostname == urlsplit(base_url).hostname and href not in info.operator_links:
                info.operator_links.append(href)
            if len(info.operator_links) >= 3:
                break

    for node in tree.css("script, style, noscript, svg, template"):
        node.decompose()
    body = tree.body
    text = body.text(separator=" ", strip=True) if body else ""
    text = re.sub(r"\s+", " ", text)
    info.text = text[:6000]
    info.has_terms = bool(_TERMS_RE.search(text))
    for m in _ICO_RE.finditer(text):
        ico = re.sub(r"\s", "", m.group(1))
        if ico not in info.icos:
            info.icos.append(ico)
        if len(info.icos) >= 3:
            break
    return info


def ico_checksum_ok(ico: str) -> bool:
    """Kontrolní číslice IČO (modulo 11)."""
    if not re.fullmatch(r"\d{8}", ico):
        return False
    digits = [int(c) for c in ico]
    s = sum(d * w for d, w in zip(digits[:7], range(8, 1, -1)))
    check = (11 - s % 11) % 10
    return check == digits[7]
