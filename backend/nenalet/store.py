"""Anonymní statistiky a zpětná vazba (SQLite). Obsah zpráv se NIKDY neukládá."""

from __future__ import annotations

import sqlite3
import threading
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

PRAGUE = ZoneInfo("Europe/Prague")

SCHEMA = """
CREATE TABLE IF NOT EXISTS checks (
    check_id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    client TEXT,
    input_kind TEXT,          -- text / url / image a jejich kombinace
    verdict TEXT,
    confidence TEXT,
    n_checks INTEGER,
    latency_ms INTEGER,
    model TEXT
);
CREATE TABLE IF NOT EXISTS feedback (
    check_id TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    helpful INTEGER,
    correct TEXT
);
"""


class Store:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.executescript(SCHEMA)
        self._lock = threading.Lock()

    def record_check(self, check_id: str, client: str, input_kind: str, verdict: str, confidence: str, n_checks: int, latency_ms: int, model: str) -> None:
        with self._lock, self._conn:
            self._conn.execute(
                "INSERT INTO checks VALUES (?,?,?,?,?,?,?,?,?)",
                (check_id, int(time.time()), client, input_kind, verdict, confidence, n_checks, latency_ms, model),
            )

    def record_feedback(self, check_id: str, helpful: bool | None, correct: str | None) -> bool:
        with self._lock, self._conn:
            exists = self._conn.execute("SELECT 1 FROM checks WHERE check_id=?", (check_id,)).fetchone()
            if not exists:
                return False
            self._conn.execute(
                "INSERT OR REPLACE INTO feedback VALUES (?,?,?,?)",
                (check_id, int(time.time()), None if helpful is None else int(helpful), correct),
            )
            return True

    def stats(self) -> dict:
        with self._lock:
            c = self._conn
            total = c.execute("SELECT COUNT(*) FROM checks").fetchone()[0]
            by_verdict = dict(c.execute("SELECT verdict, COUNT(*) FROM checks GROUP BY verdict").fetchall())
            by_client = dict(c.execute("SELECT client, COUNT(*) FROM checks GROUP BY client").fetchall())
            fb = c.execute(
                "SELECT COUNT(*), SUM(helpful=1), SUM(helpful=0), SUM(correct='ano'), SUM(correct='ne') FROM feedback"
            ).fetchone()
            p50 = c.execute(
                "SELECT latency_ms FROM checks ORDER BY latency_ms LIMIT 1 OFFSET (SELECT COUNT(*)/2 FROM checks)"
            ).fetchone()
            since = int(time.time()) - 14 * 86400
            recent = c.execute("SELECT ts, client FROM checks WHERE ts >= ? ORDER BY ts", (since,)).fetchall()
            last = c.execute("SELECT MAX(ts) FROM checks").fetchone()[0]
        return {
            "checks_total": total,
            "by_verdict": by_verdict,
            "by_client": by_client,
            "feedback": {"total": fb[0], "helpful": fb[1] or 0, "not_helpful": fb[2] or 0, "correct": fb[3] or 0, "incorrect": fb[4] or 0},
            "latency_ms_median": p50[0] if p50 else None,
            # Kdy se Nenaleť používal (pražský čas): poslední kontrola a počty po dnech za 14 dní.
            "last_check": _local(last).isoformat(timespec="minutes") if last else None,
            "by_day": _by_day(recent),
        }


def _local(ts: int) -> datetime:
    return datetime.fromtimestamp(ts, tz=PRAGUE)


def _by_day(rows: list[tuple[int, str]]) -> dict[str, dict]:
    days: dict[str, dict] = {}
    for ts, client in rows:
        d = days.setdefault(_local(ts).date().isoformat(), {"checks": 0})
        d["checks"] += 1
        d[client or "other"] = d.get(client or "other", 0) + 1
    return days


class RateLimiter:
    """Jednoduchý limit: N kontrol na IP za hodinu + celkový denní strop (ochrana nákladů)."""

    def __init__(self, per_ip_per_hour: int, daily_cap: int):
        self.per_ip = per_ip_per_hour
        self.daily_cap = daily_cap
        self._hits: dict[str, list[float]] = {}
        self._day = time.strftime("%Y-%m-%d")
        self._day_count = 0
        self._lock = threading.Lock()

    def allow(self, ip: str) -> tuple[bool, str | None]:
        now = time.time()
        with self._lock:
            today = time.strftime("%Y-%m-%d")
            if today != self._day:
                self._day, self._day_count = today, 0
                self._hits.clear()
            if self._day_count >= self.daily_cap:
                return False, "Dnes už jsme vyčerpali denní kapacitu služby. Zkuste to prosím zítra."
            hits = [t for t in self._hits.get(ip, []) if now - t < 3600]
            if len(hits) >= self.per_ip:
                self._hits[ip] = hits
                return False, "Příliš mnoho kontrol za krátkou dobu. Zkuste to prosím za chvíli."
            hits.append(now)
            self._hits[ip] = hits
            self._day_count += 1
            return True, None
