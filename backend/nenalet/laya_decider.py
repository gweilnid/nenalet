"""Laya: otevřený rozhodovací model (Apache 2.0) dotrénovaný na českých zprávách (laya/train.py). Běží lokálně, bez API.

Zapnutí: NENALET_DECIDER=laya a NENALET_LAYA_PATH=<složka s checkpointem>. Potřebuje balíčky laya a torch.
Otázka i možnosti jsou stejné jako u Jevu, takže jde o přímou náhradu.
"""

from __future__ import annotations

import asyncio
import os
import threading

from .jev import CRITERIA, QUESTION, Decision, JevError

LAYA_PATH = os.environ.get("NENALET_LAYA_PATH", "")
LAYA_NAME = "laya-nenalet"
QUESTIONS = {"verdikt": {"type": "choice", "instructions": QUESTION, "criteria": CRITERIA}}
MAX_LEN = 2048  # trénovací vstupy mají do ~600 tokenů, dlouhé stránky až ~1 800

_agent = None
_lock = threading.Lock()


def _load():
    global _agent
    with _lock:
        if _agent is None:
            if not LAYA_PATH:
                raise JevError("NENALET_LAYA_PATH není nastavená")
            os.environ.setdefault("USE_TF", "0")
            import laya  # noqa: PLC0415 (načítá se jen když je Laya zapnutá)

            _agent = laya.load(LAYA_PATH)
    return _agent


def _predict(state: dict) -> Decision:
    a = _load().predict(state, QUESTIONS, max_len=MAX_LEN)["answers"]["verdikt"]
    probs = {str(k): float(v) for k, v in a["probabilities"].items()}
    conf = float(a.get("confidence", max(probs.values())))
    if a["choice"] not in CRITERIA:
        raise JevError(f"Laya zvolila neplatnou možnost {a['choice']!r}")
    return Decision(a["choice"], conf, probs, 0.0, {})


def warm_up() -> None:
    """Načte model předem (jinak by první kontrola čekala ~20 s)."""
    _load()


async def decide(state: dict) -> Decision:
    try:
        return await asyncio.to_thread(_predict, state)
    except JevError:
        raise
    except Exception as e:  # noqa: BLE001
        raise JevError(f"Laya selhala: {e!r}") from e
