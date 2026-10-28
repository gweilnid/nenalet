"""Měření rozhodovacího modelu Jev na testové sadě: dostane zprávu a ověřená fakta, vybere kategorii.

Spuštění (z adresáře backend/):
    PYTHONPATH=. uv run python ../eval/run_jev.py
"""

from __future__ import annotations

import argparse
import asyncio
import dataclasses
import sys
import time
from pathlib import Path

import httpx

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))
sys.path.insert(0, str(HERE))

from nenalet.analyzer import Analyzer, _facts_block, gather_facts  # noqa: E402
from nenalet.config import Settings  # noqa: E402
from nenalet.jev import JEV_MODEL, decide  # noqa: E402
from nenalet.sources import CoiList  # noqa: E402
from run_eval import FLAGGED, load, report, to_request  # noqa: E402


def jev_state(req, facts, analysis=None) -> dict:
    state = {"zprava": req.text or "", "overena_fakta": _facts_block(facts)}
    if req.url:
        state["odkaz"] = req.url
    if analysis is not None:
        # Podklady od jazykového modelu bez jeho verdiktu: o verdiktu rozhoduje Jev.
        state["nalezene_varovne_signaly"] = [f"{f.signal}: {f.evidence} – {f.explanation}" for f in analysis.red_flags] or ["žádné"]
        state["co_pusobi_duveryhodne"] = analysis.reassuring_signs or ["nic"]
    return state


def conf_label(c: float) -> str:
    return "vysoka" if c >= 0.85 else "stredni" if c >= 0.6 else "nizka"


async def run(args) -> None:
    items = load(Path(args.dataset))
    cfg = dataclasses.replace(Settings(), fetch_pages=False)
    coi = CoiList(cfg.data_dir / "coi.json")
    await coi.refresh()
    sem = asyncio.Semaphore(args.concurrency)
    results: list[dict] = []
    analyst = Analyzer(coi, dataclasses.replace(cfg, model=args.analyst, second_model="", effort="low")) if args.analyst else None
    async with httpx.AsyncClient() as http:

        async def one(item: dict) -> None:
            async with sem:
                req = to_request(item)
                t0 = time.monotonic()
                try:
                    facts = await gather_facts(req, coi, cfg)
                    a = await analyst.check(req) if analyst else None
                    d = await decide(http, jev_state(req, facts, a))
                    cost = d.cost + ((a.usage or {}).get("cost") or 0) if a else d.cost
                    verdict, conf, usage, err = d.choice, conf_label(d.confidence), {"cost": cost}, None
                    probs = d.probabilities
                    analyst_verdict = a.verdict if a else None
                except Exception as e:  # noqa: BLE001
                    verdict, conf, usage, err, probs, analyst_verdict = "chyba", None, None, repr(e)[:300], None, None
                results.append({
                    "id": item["id"], "label": item["label"], "channel": item["channel"], "category": item["category"],
                    "synthetic": item.get("synthetic", False), "verdict": verdict, "confidence": conf,
                    "flagged": verdict in FLAGGED, "latency_ms": int((time.monotonic() - t0) * 1000),
                    "usage": usage, "model": JEV_MODEL, "probabilities": probs, "analyst_verdict": analyst_verdict, "error": err,
                })
                print(f"{item['id']:>12} {item['label']:>5} -> {verdict} {conf}", flush=True)

        await asyncio.gather(*(one(i) for i in items))
    results.sort(key=lambda r: r["id"])
    name = f"{JEV_MODEL}+podklady-{args.analyst}" if args.analyst else JEV_MODEL
    report(results, argparse.Namespace(facts_only=False, model=name, effort="rozhodnuti", second=""))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default=str(HERE / "dataset.jsonl"))
    ap.add_argument("--concurrency", type=int, default=6)
    ap.add_argument("--analyst", default="", help="jazykový model, který Jevovi připraví podklady (např. openai/gpt-5.6-luna)")
    asyncio.run(run(ap.parse_args()))
