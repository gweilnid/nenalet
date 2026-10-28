"""Datové struktury: vstup, výstup modelu a odpověď API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

VerdictKind = Literal["podvod", "podezrele", "bez_varovnych_signalu", "nelze_posoudit"]
Confidence = Literal["vysoka", "stredni", "nizka"]
CheckStatus = Literal["ok", "info", "varovani", "nebezpeci"]

# Pořadí závažnosti - používá se pro "podlahu" verdiktu z ověřených faktů.
SEVERITY: dict[str, int] = {
    "nelze_posoudit": 0,
    "bez_varovnych_signalu": 1,
    "podezrele": 2,
    "podvod": 3,
}

VERDICT_LABELS: dict[str, str] = {
    "podvod": "Téměř jistě podvod",
    "podezrele": "Podezřelé – buďte opatrní",
    "bez_varovnych_signalu": "Nenašli jsme varovné signály",
    "nelze_posoudit": "Nedokážeme posoudit",
}


class RedFlag(BaseModel):
    signal: str = Field(description="Krátký název varovného signálu, např. 'Nátlak a spěch'.")
    evidence: str = Field(description="Doslovná citace nebo popis místa ze vstupu, kde se signál objevuje.")
    explanation: str = Field(description="Jednou větou, proč je to varovné - srozumitelně pro laika.")


class ModelVerdict(BaseModel):
    """Strukturovaný výstup jazykového modelu."""

    verdict: VerdictKind
    confidence: Confidence
    headline: str = Field(description="Jedna krátká věta s hlavním závěrem.")
    scam_type: str | None = Field(description="Typ podvodu česky (např. 'falešný dopravce'), nebo null.")
    red_flags: list[RedFlag]
    reassuring_signs: list[str] = Field(description="Co naopak působí důvěryhodně (může být prázdné).")
    what_to_do: list[str] = Field(description="2-4 konkrétní kroky, co má člověk udělat teď.")
    explanation: str = Field(description="Krátké vysvětlení (max. 3 věty) pro člověka bez technických znalostí.")


class Check(BaseModel):
    """Jedna ověřená skutečnost (nezávislá na jazykovém modelu)."""

    name: str
    status: CheckStatus
    detail: str
    source: str | None = None


class CheckRequest(BaseModel):
    text: str | None = None
    url: str | None = None
    image_base64: str | None = None
    image_media_type: str | None = None
    client: Literal["web", "extension", "shortcut", "eval", "other"] = "other"


class CheckResponse(BaseModel):
    check_id: str
    verdict: VerdictKind
    verdict_label: str
    confidence: Confidence
    headline: str
    scam_type: str | None
    red_flags: list[RedFlag]
    reassuring_signs: list[str]
    what_to_do: list[str]
    explanation: str
    checks: list[Check]
    summary_text: str
    model: str
    latency_ms: int
    disclaimer: str
    usage: dict | None = Field(default=None, exclude=True)  # jen pro měření nákladů, neposílá se ven


class FeedbackRequest(BaseModel):
    check_id: str
    helpful: bool | None = None
    correct: Literal["ano", "ne", "nevim"] | None = None
