"""Jev (TypeSafe, OpenRouter Decisions API): rozhodovací model. Jen vybírá z možností a vrací pravděpodobnosti, nepíše text."""

from __future__ import annotations

import asyncio
import math
import os
from dataclasses import dataclass, field

import httpx

from .config import OPENROUTER_BASE_URL

JEV_URL = f"{OPENROUTER_BASE_URL}/alpha/decisions"
JEV_MODEL = os.environ.get("NENALET_JEV_MODEL", "typesafe/jev-1.13")

QUESTION = (
    "Is this message (or web page) a scam? Judge what it asks the person to do, who it claims to be, "
    "and the verified facts. Pick exactly one category."
)
# Definice kategorií jsou doslova ze systémových instrukcí (prompt.py), podle testu se neladily.
CRITERIA = {
    "podvod": (
        "A clear scam pattern (a request for money, card data, codes, logins or remote access under a false pretext), "
        "or the verified facts show it (ČOI risky list, a domain imitating a brand, a page asking for card data on a foreign domain)."
    ),
    "podezrele": (
        "Real warning signs, but a legitimate explanation is plausible or information is missing."
    ),
    "bez_varovnych_signalu": (
        "Consistent with ordinary legitimate communication and no verified fact against it."
    ),
    "nelze_posoudit": "Too little to judge (a single word, an unreadable or irrelevant image, an empty page).",
}


RISKY = {"podvod", "podezrele"}


def state_for(text: str | None, url: str | None, facts_block: str, analysis=None) -> dict:
    """Co Jev uvidí: zprávu, ověřená fakta a podklady jazykového modelu (bez jeho verdiktu - o verdiktu rozhoduje Jev)."""
    state = {"zprava": text or "(uživatel poslal jen obrázek, jeho obsah popisují podklady níže)", "overena_fakta": facts_block}
    if url:
        state["odkaz"] = url
    if analysis is not None:
        state["nalezene_varovne_signaly"] = [f"{f.signal}: {f.evidence} – {f.explanation}" for f in analysis.red_flags] or ["žádné"]
        state["co_pusobi_duveryhodne"] = list(analysis.reassuring_signs) or ["nic"]
    return state


def conf_label(c: float) -> str:
    return "vysoka" if c >= 0.85 else "stredni" if c >= 0.6 else "nizka"


class JevError(RuntimeError):
    """API selhalo nebo odpovědělo něco, co není platná volba."""


@dataclass(frozen=True)
class Decision:
    choice: str
    confidence: float
    probabilities: dict[str, float]
    cost: float | None
    raw: dict = field(default_factory=dict)


async def decide(http: httpx.AsyncClient, state: dict, retries: int = 3) -> Decision:
    body = {
        "model": JEV_MODEL,
        "state": state,
        "questions": {"verdikt": {"type": "choice", "instructions": QUESTION, "criteria": CRITERIA}},
    }
    headers = {"Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}"}
    last = "žádný pokus"
    for attempt in range(retries):
        try:
            r = await http.post(JEV_URL, json=body, headers=headers, timeout=30.0)
        except httpx.HTTPError as e:
            last = f"{type(e).__name__}: {e}"
        else:
            if r.status_code == 200:
                return _parse(r.json())
            last = f"HTTP {r.status_code}: {r.text[:300]}"
            if r.status_code not in (429, 500, 502, 503, 504):
                break
        await asyncio.sleep(0.5 * 2**attempt)
    raise JevError(last)


def _parse(payload: dict) -> Decision:
    try:
        a = payload["answers"]["verdikt"]
        choice = a["choice"]
        conf = float(a["confidence"])
        probs = {str(k): float(v) for k, v in a["probabilities"].items()}
    except (KeyError, TypeError, ValueError) as e:
        raise JevError(f"neplatná odpověď: {e!r}") from e
    if choice not in CRITERIA or not (0.0 <= conf <= 1.0) or not math.isfinite(conf):
        raise JevError(f"neplatná volba {choice!r} / {conf!r}")
    usage = payload.get("usage") or {}
    cost = usage.get("cost") if isinstance(usage.get("cost"), (int, float)) else None
    return Decision(choice, conf, probs, cost, payload)
