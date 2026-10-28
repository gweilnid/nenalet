"""Značky, za které se podvodníci v Česku nejčastěji vydávají, a jejich oficiální domény.

Seznam není úplný - slouží k odhalení napodobenin typu `zasilkovna-platba.com`.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Brand:
    name: str
    official: frozenset[str]  # registrované domény (bez subdomén)
    keywords: tuple[str, ...]  # řetězce, které v cizí doméně prozrazují napodobeninu


def _b(name: str, official: list[str], keywords: list[str]) -> Brand:
    return Brand(name, frozenset(official), tuple(keywords))


BRANDS: tuple[Brand, ...] = (
    # Doprava a balíky
    _b("Česká pošta", ["cpost.cz", "ceskaposta.cz", "postaonline.cz", "balikovna.cz"], ["cpost", "ceskaposta", "ceska-posta", "balikovna"]),
    _b("Zásilkovna / Packeta", ["zasilkovna.cz", "packeta.com", "packeta.cz", "packeta.sk", "zasielkovna.sk"], ["zasilkovna", "zasielkovna", "packeta"]),
    _b("PPL", ["ppl.cz", "pplcz.com"], ["ppl"]),
    _b("DPD", ["dpd.cz", "dpd.com", "dpdgroup.com"], ["dpd"]),
    _b("GLS", ["gls-group.eu", "gls-group.com", "gls-czech.com"], ["gls"]),
    # Banky
    _b("Česká spořitelna", ["csas.cz", "servis24.cz", "ceskasporitelna.cz"], ["csas", "sporitelna", "george-"]),
    _b("ČSOB", ["csob.cz", "csob.sk", "postovnisporitelna.cz"], ["csob"]),
    _b("Komerční banka", ["kb.cz", "mojebanka.cz", "komercnibanka.cz"], ["komercni", "mojebanka", "kb"]),
    _b("Moneta", ["moneta.cz", "moneta.com"], ["moneta"]),
    _b("Air Bank", ["airbank.cz"], ["airbank", "air-bank"]),
    _b("Fio banka", ["fio.cz", "fiobanka.cz"], ["fiobank", "fio"]),
    _b("Raiffeisenbank", ["rb.cz", "raiffeisenbank.cz"], ["raiffeisen", "rb"]),
    _b("UniCredit Bank", ["unicreditbank.cz", "unicredit.eu"], ["unicredit"]),
    _b("mBank", ["mbank.cz", "mbank.pl"], ["mbank"]),
    _b("Revolut", ["revolut.com", "revolut.me"], ["revolut"]),
    _b("PayPal", ["paypal.com", "paypal.me"], ["paypal"]),
    _b("Česká národní banka", ["cnb.cz"], ["cnb"]),
    # Úřady a stát
    _b("Portál občana / Identita občana", ["gov.cz", "identita.gov.cz", "portal.gov.cz", "mojedatovaschranka.cz"], ["identita", "datovaschranka", "portal-obcana", "gov-cz"]),
    _b("Finanční správa", ["financnisprava.cz", "mfcr.cz", "financnisprava.gov.cz", "mf.gov.cz"], ["financnisprava", "financni-sprava", "danovy"]),
    _b("ČSSZ", ["cssz.cz"], ["cssz"]),
    _b("Policie ČR", ["policie.cz", "policie.gov.cz"], ["policie"]),
    _b("Dálniční známka", ["edalnice.cz"], ["edalnice", "dalnice", "dalnicni", "znamka"]),
    # Energie, operátoři
    _b("ČEZ", ["cez.cz", "cezdistribuce.cz"], ["cez"]),
    _b("E.ON", ["eon.cz"], ["eon"]),
    _b("PRE", ["pre.cz"], ["pre-energie"]),
    _b("O2", ["o2.cz"], ["o2"]),
    _b("T-Mobile", ["t-mobile.cz"], ["tmobile", "t-mobile"]),
    _b("Vodafone", ["vodafone.cz", "vodafone.com"], ["vodafone"]),
    # Obchody a tržiště
    _b("Alza", ["alza.cz", "alza.sk", "alza.de", "alza.at", "alza.hu"], ["alza"]),
    _b("Bazoš", ["bazos.cz", "bazos.sk"], ["bazos"]),
    _b("Vinted", ["vinted.cz", "vinted.com", "vinted.sk"], ["vinted"]),
    _b("Seznam.cz", ["seznam.cz", "email.cz", "sbazar.cz"], ["seznam"]),
    _b("Rohlík", ["rohlik.cz"], ["rohlik"]),
    _b("Temu", ["temu.com"], ["temu"]),
    _b("Amazon", ["amazon.com", "amazon.de", "amazon.co.uk"], ["amazon"]),
    _b("Booking.com", ["booking.com"], ["booking"]),
    # Technologie
    _b("Apple", ["apple.com", "icloud.com"], ["apple", "icloud"]),
    _b("Microsoft", ["microsoft.com", "live.com", "office.com", "outlook.com"], ["microsoft", "office365", "outlook"]),
    _b("Meta / Facebook / WhatsApp", ["facebook.com", "meta.com", "whatsapp.com", "instagram.com", "fb.com"], ["facebook", "whatsapp", "instagram", "meta-"]),
    _b("Netflix", ["netflix.com"], ["netflix"]),
    _b("Google", ["google.com", "google.cz", "gmail.com", "youtube.com"], ["google", "gmail"]),
)

# Krátké klíčové výrazy porovnáváme jen jako celé části domény (oddělené tečkou/pomlčkou),
# jinak by např. "kb" vyskočilo v každém druhém slově.
SHORT_KEYWORD_LEN = 4

OFFICIAL_INDEX: dict[str, Brand] = {d: b for b in BRANDS for d in b.official}
