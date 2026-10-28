import io
from pathlib import Path

import pytest
from PIL import Image

from nenalet import provenance
from nenalet.analyzer import image_mime, normalize_image
from nenalet.provenance import check_image_provenance, read_c2pa

FIX = Path(__file__).parent / "fixtures"


def _plain_jpeg() -> bytes:
    b = io.BytesIO()
    Image.new("RGB", (64, 64), (10, 20, 30)).save(b, "JPEG")
    return b.getvalue()


def test_c2pa_ai_generated_detected():
    info = read_c2pa((FIX / "ai_generated.jpg").read_bytes(), "image/jpeg")
    assert info.present and info.ai_kind == "vytvořený umělou inteligencí"
    assert info.generator == "Nenalet test generator"


def test_c2pa_non_ai_manifest():
    info = read_c2pa((FIX / "C.jpg").read_bytes(), "image/jpeg")
    assert info.present and info.ai_kind is None  # algorithmicMedia není AI


def test_no_manifest():
    assert not read_c2pa(_plain_jpeg(), "image/jpeg").present


def test_reencoding_strips_c2pa():
    # Proto ověřujeme originál, ne zmenšenou kopii pro model.
    data, _ = normalize_image((FIX / "ai_generated.jpg").read_bytes())
    assert not read_c2pa(data, "image/jpeg").present


@pytest.mark.asyncio
async def test_checks_ai_image_without_openai(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    checks = await check_image_provenance((FIX / "ai_generated.jpg").read_bytes(), "image/jpeg")
    assert [c.status for c in checks] == ["varovani"]
    assert "umělou inteligencí" in checks[0].detail


@pytest.mark.asyncio
async def test_checks_synthid_from_openai(monkeypatch):
    async def fake(data, mime, client=None):
        return {"synthid": {"outcome": "detected", "model": "gpt-image"}, "c2pa": {"outcome": "not_detected"}}

    monkeypatch.setattr(provenance, "openai_provenance", fake)
    checks = await check_image_provenance(_plain_jpeg(), "image/jpeg")
    assert any(c.name.startswith("Vodoznak SynthID") and c.status == "varovani" for c in checks)
    assert not any(c.name == "Je obrázek vytvořený AI?" for c in checks)


@pytest.mark.asyncio
async def test_nothing_found_is_honest(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    checks = await check_image_provenance(_plain_jpeg(), "image/jpeg")
    assert len(checks) == 1 and checks[0].status == "info"
    assert "NEZNAMENÁ" in checks[0].detail


def test_image_mime():
    assert image_mime(_plain_jpeg()) == "image/jpeg"
    assert image_mime(b"not an image") is None
