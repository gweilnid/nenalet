"""Skutečná kontrola Nenaleť na rekonstrukci falešné stránky „České pošty“ (pro video a web).

Stránka ceskapostacz.com.cn už neexistuje, proto místo stažení z internetu dostane Nenaleť
rekonstrukci podle popisu v článcích (fake_posta/page.html). Všechno ostatní běží beze změny:
kontrola adresy, seznam oficiálních domén, rozbor formuláře a posouzení modelem.
Spuštění z adresáře backend/:  PYTHONPATH=. uv run python ../eval/check_fake_posta.py
"""

from __future__ import annotations

import asyncio
import dataclasses
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "backend"))

from nenalet import analyzer  # noqa: E402
from nenalet.config import Settings  # noqa: E402
from nenalet.netguard import FetchResult  # noqa: E402
from nenalet.schemas import CheckRequest  # noqa: E402
from nenalet.sources import CoiList  # noqa: E402

URL = "https://ceskapostacz.com.cn/cz"
HTML = (HERE / "fake_posta" / "page.html").read_bytes()


async def fake_fetch(url: str, *args, **kwargs) -> FetchResult:
    return FetchResult(final_url=url, status=200, content_type="text/html; charset=utf-8", body=HTML)


async def main() -> None:
    analyzer.safe_fetch = fake_fetch  # jen tahle jedna věc je nahrazená
    cfg = dataclasses.replace(Settings(), fetch_pages=True)
    coi = CoiList(cfg.data_dir / "coi.json")
    await coi.refresh()
    r = await analyzer.Analyzer(coi, cfg).check(CheckRequest(url=URL, client="eval"))
    out = r.model_dump(exclude={"check_id", "usage", "summary_text"})
    (HERE / "fake_posta" / "result.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(r.verdict_label, "|", r.headline)
    for c in r.checks:
        print(" CHECK", c.status, c.name, "|", c.detail)
    for f in r.red_flags:
        print(" FLAG", f.signal, "|", f.evidence, "|", f.explanation)
    for t in r.what_to_do:
        print(" TODO", t)
    print(" latency_ms", out.get("latency_ms"))


if __name__ == "__main__":
    asyncio.run(main())
