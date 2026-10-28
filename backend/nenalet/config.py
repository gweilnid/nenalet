"""Nastavení aplikace z proměnných prostředí (a ze souboru backend/.env)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

OPENROUTER_BASE_URL = "https://openrouter.ai/api"


def _int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    return int(raw) if raw else default


def _provider() -> str:
    explicit = os.environ.get("NENALET_PROVIDER")
    if explicit:
        return explicit
    if os.environ.get("OPENROUTER_API_KEY") and not os.environ.get("ANTHROPIC_API_KEY"):
        return "openrouter"
    return "anthropic"


def openrouter_model_id(model: str) -> str:
    """claude-opus-5-5 -> anthropic/claude-opus-5.5 (pojmenování na OpenRouteru)."""
    if model.startswith("anthropic/"):
        return model
    head, _, tail = model.rpartition("-")
    if tail.isdigit() and head and head[-1].isdigit():
        model = f"{head}.{tail}"
    return f"anthropic/{model}"


@dataclass(frozen=True)
class Settings:
    provider: str = field(default_factory=_provider)
    model: str = field(default_factory=lambda: os.environ.get("NENALET_MODEL", "claude-opus-5-5"))
    effort: str = field(default_factory=lambda: os.environ.get("NENALET_EFFORT", "low"))
    data_dir: Path = field(default_factory=lambda: Path(os.environ.get("NENALET_DATA_DIR", BACKEND_DIR / "data")))
    # Ochrana nákladů: limit na IP za hodinu a celkový denní strop.
    per_ip_per_hour: int = field(default_factory=lambda: _int("NENALET_PER_IP_PER_HOUR", 30))
    daily_cap: int = field(default_factory=lambda: _int("NENALET_DAILY_CAP", 3000))
    # Za kolika proxy servery běžíme (nginx = 1) - podle toho čteme X-Forwarded-For.
    trusted_proxies: int = field(default_factory=lambda: _int("NENALET_TRUSTED_PROXIES", 0))
    max_text_chars: int = 8000
    max_image_bytes: int = 10 * 1024 * 1024
    fetch_pages: bool = field(default_factory=lambda: os.environ.get("NENALET_FETCH_PAGES", "1") == "1")


settings = Settings()
