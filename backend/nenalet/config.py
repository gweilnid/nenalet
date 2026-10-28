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


def is_claude(model: str) -> bool:
    return model.startswith(("claude-", "anthropic/"))


# USD za milion tokenů (vstup, výstup, čtení cache, zápis cache) - pro odhad ceny u modelů Claude,
# u ostatních posílá cenu přímo OpenRouter.
CLAUDE_PRICES = {
    "claude-opus-5-5": (4.0, 20.0, 0.20, 5.0),
    "claude-sonnet-5-5": (2.0, 10.0, 0.20, 2.5),
    "claude-haiku-5-5": (0.10, 0.50, 0.01, 0.125),
}


def openrouter_model_id(model: str) -> str:
    """claude-opus-5-5 -> anthropic/claude-opus-5.5 (pojmenování na OpenRouteru). Id s lomítkem se nemění."""
    if "/" in model:
        return model
    head, _, tail = model.rpartition("-")
    if tail.isdigit() and head and head[-1].isdigit():
        model = f"{head}.{tail}"
    return f"anthropic/{model}"


@dataclass(frozen=True)
class Settings:
    provider: str = field(default_factory=_provider)
    # Jazykový model připraví podklady a texty pro člověka, rozhodovací model Jev vybere verdikt.
    # Když Jev váhá („podezřelé“), nesouhlasí s podklady nebo něco selže, posoudí to silnější druhý model.
    model: str = field(default_factory=lambda: os.environ.get("NENALET_MODEL", "openai/gpt-5.6-luna"))
    decider: str = field(default_factory=lambda: os.environ.get("NENALET_DECIDER", "jev"))  # "jev", "laya" nebo "" (rozhoduje model)
    second_model: str = field(default_factory=lambda: os.environ.get("NENALET_SECOND_MODEL", "google/gemini-3.8-flash"))
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
