"""Předpočítá ukázky pro web: skutečné zveřejněné zprávy z testové sady + výsledek Nenaleť.

Web pak ukázky jen zobrazuje (žádné volání API). Spuštění z adresáře backend/:
    PYTHONPATH=. uv run python ../eval/build_showcase.py
Podvodné stránky se nestahují (jen registr domén a seznam ČOI).
"""

from __future__ import annotations

import asyncio
import dataclasses
import json
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))

from nenalet.analyzer import Analyzer  # noqa: E402
from nenalet.config import Settings  # noqa: E402
from nenalet.sources import CoiList  # noqa: E402

from run_eval import load, to_request  # noqa: E402

# (id v testové sadě, krátký název ukázky)
SHOWCASE = [
    ("scam-037", "SMS od „PPL“: doplatek 15 Kč"),
    ("scam-025", "SMS od „České spořitelny“: cizí zařízení"),
    ("scam-061", "„Mami, mám nové číslo“"),
    ("scam-023", "Telefonát „z banky“: účet napaden"),
    ("scam-059", "Reklama: investice do ČEZ"),
    ("scam-042", "Bazar: kupec posílá „DPD“ odkaz"),
    ("scam-053", "SMS: nezaplacené mýtné"),
    ("legit-005", "Skutečná SMS od PPL"),
    ("legit-002", "Skutečné upozornění datové schránky"),
]

CHANNELS = {"sms": "SMS", "email": "E-mail", "chat": "Zpráva v chatu", "call": "Telefonát", "web": "Webová stránka",
            "ad": "Reklama", "marketplace": "Bazar"}


async def main() -> None:
    items = {i["id"]: i for i in load(HERE / "dataset.jsonl")}
    cfg = dataclasses.replace(Settings(), fetch_pages=False)
    coi = CoiList(cfg.data_dir / "coi.json")
    await coi.refresh()
    analyzer = Analyzer(coi, cfg)

    async def one(item_id: str, title: str) -> dict:
        item = items[item_id]
        r = await analyzer.check(to_request(item))
        result = r.model_dump(exclude={"check_id", "usage", "latency_ms", "summary_text"})
        return {
            "id": item_id,
            "title": title,
            "label": item["label"],
            "channel": CHANNELS.get(item["channel"], item["channel"]),
            "sender": item.get("sender"),
            "text": item["text"],
            "url_in_message": item.get("url_in_message"),
            "source_url": item["source_url"],
            "source_name": urlsplit(item["source_url"]).hostname.removeprefix("www."),
            "result": result,
        }

    examples = await asyncio.gather(*(one(i, t) for i, t in SHOWCASE))
    out = {"generated": date.today().isoformat(), "model": cfg.model, "examples": examples}
    target = HERE.parent / "web" / "src" / "data" / "examples.json"
    target.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    for e in examples:
        print(f"{e['id']:10} {e['label']:5} -> {e['result']['verdict']:22} {e['result']['headline']}")
    print("uloženo:", target)


if __name__ == "__main__":
    asyncio.run(main())
