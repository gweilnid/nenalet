"""Měření přesnosti Nenaleť na testové sadě skutečných českých podvodů a běžných zpráv.

Spuštění (z adresáře backend/):
    PYTHONPATH=. uv run python ../eval/run_eval.py --model claude-opus-5-5 --effort low
    PYTHONPATH=. uv run python ../eval/run_eval.py --facts-only      # jen automatické kontroly, bez AI

Živé podvodné stránky se při měření NEstahují (jen registr domén a seznam ČOI).
"""

from __future__ import annotations

import argparse
import asyncio
import dataclasses
import json
import math
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))

from nenalet.analyzer import Analyzer, gather_facts  # noqa: E402
from nenalet.config import Settings  # noqa: E402
from nenalet.schemas import CheckRequest  # noqa: E402
from nenalet.sources import CoiList  # noqa: E402

# USD za milion tokenů (vstup, výstup, čtení cache, zápis cache)
PRICES = {
    "claude-opus-5-5": (4.0, 20.0, 0.20, 5.0),
    "claude-sonnet-5-5": (2.0, 10.0, 0.20, 2.5),
    "claude-haiku-5-5": (0.10, 0.50, 0.01, 0.125),
}
FLAGGED = {"podvod", "podezrele"}
# Úryvky z bezpečnostních rad bank/dopravců/policie: skutečné texty, ale ne zprávy - vykazujeme i výsledky bez nich.
ADVICE_PAGE_IDS = {"legit-011", "legit-016", "legit-017", "legit-018", "legit-020", "legit-021"}


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (max(0.0, c - h), min(1.0, c + h))


def load(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def to_request(item: dict) -> CheckRequest:
    text = item["text"] or ""
    url = item.get("url_in_message")
    if url and url not in text:
        text = f"{text}\n{url}"
    if item.get("sender"):
        text = f"Odesílatel: {item['sender']}\n{text}"
    return CheckRequest(text=text, client="eval")


async def run(args) -> None:
    items = load(Path(args.dataset))
    if args.limit:
        items = items[: args.limit]
    cfg = dataclasses.replace(Settings(), model=args.model, second_model=args.second, decider=args.decider, effort=args.effort, fetch_pages=False)
    coi = CoiList(cfg.data_dir / "coi.json")
    await coi.refresh()
    analyzer = Analyzer(coi, cfg)
    sem = asyncio.Semaphore(args.concurrency)
    results: list[dict] = []

    async def one(item: dict) -> None:
        async with sem:
            req = to_request(item)
            t0 = time.monotonic()
            try:
                if args.facts_only:
                    facts = await gather_facts(req, coi, cfg)
                    danger = any(c.status == "nebezpeci" for c in facts.checks)
                    verdict, conf, usage, checks = ("podezrele" if danger else "bez_varovnych_signalu"), None, None, facts.checks
                    model_used = None
                else:
                    r = await analyzer.check(req)
                    verdict, conf, usage, checks = r.verdict, r.confidence, r.usage, r.checks
                    model_used = r.model
                err = None
            except Exception as e:  # noqa: BLE001
                verdict, conf, usage, checks, err, model_used = "chyba", None, None, [], repr(e)[:300], None
            results.append({
                "id": item["id"], "label": item["label"], "channel": item["channel"], "category": item["category"],
                "synthetic": item.get("synthetic", False), "verdict": verdict, "confidence": conf,
                "flagged": verdict in FLAGGED, "latency_ms": int((time.monotonic() - t0) * 1000),
                "usage": usage, "model": model_used, "n_danger_checks": sum(c.status == "nebezpeci" for c in checks), "error": err,
            })
            print(f"{item['id']:>12} {item['label']:>5} -> {verdict}", flush=True)

    await asyncio.gather(*(one(i) for i in items))
    results.sort(key=lambda r: r["id"])
    report(results, args)


def report(results: list[dict], args) -> None:
    name = "facts-only" if args.facts_only else f"{args.model.replace('/', '_')}{'+jev' if getattr(args, 'decider', '') == 'jev' else ''}{'+' + args.second.replace('/', '_') if args.second else ''}-{args.effort}"
    stamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    out_dir = HERE / "results"
    out_dir.mkdir(exist_ok=True)
    (out_dir / f"{name}_{stamp}.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")

    ok = [r for r in results if r["verdict"] != "chyba"]
    scams = [r for r in ok if r["label"] == "scam"]
    legit = [r for r in ok if r["label"] == "legit"]
    tp = sum(r["flagged"] for r in scams)
    fp = sum(r["flagged"] for r in legit)
    strict = sum(r["verdict"] == "podvod" for r in scams)
    unsure = sum(r["verdict"] == "nelze_posoudit" for r in ok)
    lines = [f"# Výsledky měření: {name}", "", f"Datum: {stamp}  ·  položek: {len(results)}  ·  chyb: {len(results) - len(ok)}", ""]

    def pct(k, n):
        lo, hi = wilson(k, n)
        return f"{k}/{n} = **{100 * k / n:.1f} %** (95% CI {100 * lo:.0f}–{100 * hi:.0f} %)" if n else "–"

    lines += [
        "| Ukazatel | Hodnota |", "|---|---|",
        f"| Zachycené podvody (podvod + podezřelé) | {pct(tp, len(scams))} |",
        f"| Podvody označené jednoznačně jako „podvod“ | {pct(strict, len(scams))} |",
        f"| Planý poplach u běžných zpráv | {pct(fp, len(legit))} |",
        f"| Legitimní zprávy správně bez poplachu | {pct(len(legit) - fp, len(legit))} |",
        f"| „Nedokážeme posoudit“ | {unsure}/{len(ok)} |",
    ]
    legit_msgs = [r for r in legit if r["id"] not in ADVICE_PAGE_IDS]
    legit_real = [r for r in legit_msgs if not r["synthetic"]]
    lines += [
        f"| Planý poplach – jen skutečné zprávy (bez úryvků z bezpečnostních rad) | {pct(sum(r['flagged'] for r in legit_msgs), len(legit_msgs))} |",
        f"| Planý poplach – jen ověřeně skutečné (nesyntetické) legitimní zprávy | {pct(sum(r['flagged'] for r in legit_real), len(legit_real))} |",
    ]
    lat = sorted(r["latency_ms"] for r in ok)
    if lat:
        lines.append(f"| Doba odpovědi (medián / 90. percentil) | {lat[len(lat) // 2] / 1000:.1f} s / {lat[int(len(lat) * 0.9)] / 1000:.1f} s |")
    usages = [r["usage"] for r in ok if r["usage"]]
    if usages and all(u.get("cost") is not None for u in usages):
        cost = sum(u["cost"] for u in usages)
        lines.append(f"| Cena za jednu kontrolu (průměr; OpenRouter, u Claude podle ceníku) | {cost / len(usages) * 25:.2f} Kč (${cost / len(usages):.4f}) |")
        routed = Counter(r["model"] for r in ok if r.get("model"))
        if len(routed) > 1 or args.model not in routed or args.second or getattr(args, "decider", ""):
            lines.append(f"| Skutečně použité modely | {', '.join(f'{m} ×{n}' for m, n in routed.most_common())} |")
    elif usages and args.model in PRICES:
        pi, po, pr, pw = PRICES[args.model]
        cost = sum(u["input"] * pi + u["output"] * po + u["cache_read"] * pr + u["cache_write"] * pw for u in usages) / 1e6
        lines.append(f"| Cena za jednu kontrolu (průměr) | {cost / len(usages) * 25:.2f} Kč (${cost / len(usages):.4f}) |")

    lines += ["", "## Podle kategorie", "", "| Kategorie | Typ | n | Označeno jako riziko | Verdikty |", "|---|---|---|---|---|"]
    by_cat: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for r in ok:
        by_cat[(r["category"], r["label"])].append(r)
    for (cat, label), rs in sorted(by_cat.items(), key=lambda x: (x[0][1], x[0][0])):
        verdicts = ", ".join(f"{k} {v}" for k, v in Counter(r["verdict"] for r in rs).most_common())
        lines.append(f"| {cat} | {label} | {len(rs)} | {sum(r['flagged'] for r in rs)} | {verdicts} |")

    misses = [r for r in scams if not r["flagged"]] + [r for r in legit if r["flagged"]]
    if misses:
        lines += ["", "## Chyby (k ručnímu rozboru)", ""]
        lines += [f"- `{r['id']}` ({r['category']}, {r['label']}) → {r['verdict']}" for r in misses]
    errs = [r for r in results if r["verdict"] == "chyba"]
    if errs:
        lines += ["", "## Technické chyby", ""] + [f"- `{r['id']}`: {r['error']}" for r in errs]

    md = "\n".join(lines) + "\n"
    (out_dir / f"{name}_{stamp}.md").write_text(md, encoding="utf-8")
    print("\n" + md)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default=str(HERE / "dataset.jsonl"))
    ap.add_argument("--model", default="claude-opus-5-5")
    ap.add_argument("--effort", default="low")
    ap.add_argument("--decider", default="", help="rozhodovací model: jev (jako v provozu), prázdné = rozhoduje jazykový model")
    ap.add_argument("--second", default="", help="model pro druhý názor u nejistých případů (jako v provozu: claude-opus-5-5)")
    ap.add_argument("--facts-only", action="store_true")
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--limit", type=int, default=0)
    asyncio.run(run(ap.parse_args()))


if __name__ == "__main__":
    main()
