"""HTTP API a webové rozhraní Nenaleť."""

from __future__ import annotations

import asyncio
import base64
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import anthropic
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from .analyzer import Analyzer, InputError
from .config import settings
from .schemas import CheckRequest, CheckResponse, FeedbackRequest
from .sources import CoiList
from .store import RateLimiter, Store

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("nenalet")

STATIC = Path(__file__).resolve().parent / "static"
WEB = Path(__file__).resolve().parent / "web"


async def _coi_refresher(coi: CoiList) -> None:
    while True:
        await coi.refresh()
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    coi = CoiList(settings.data_dir / "coi.json")
    app.state.coi = coi
    app.state.store = Store(settings.data_dir / "stats.db")
    app.state.limiter = RateLimiter(settings.per_ip_per_hour, settings.daily_cap)
    app.state.analyzer = Analyzer(coi)
    task = asyncio.create_task(_coi_refresher(coi))
    yield
    task.cancel()


app = FastAPI(title="Nenaleť", lifespan=lifespan, docs_url=None, redoc_url=None)
# Rozšíření pro Chrome a zkratka v iPhonu volají API z jiného původu.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


def client_ip(request: Request) -> str:
    if settings.trusted_proxies > 0:
        xff = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
        if len(xff) >= settings.trusted_proxies:
            return xff[-settings.trusted_proxies]
    return request.client.host if request.client else "unknown"


async def _parse_request(request: Request) -> CheckRequest:
    ctype = request.headers.get("content-type", "")
    if ctype.startswith("multipart/form-data") or ctype.startswith("application/x-www-form-urlencoded"):
        form = await request.form()
        image_b64 = None
        upload = form.get("image")
        if upload is not None and hasattr(upload, "read"):
            data = await upload.read()
            if data:
                image_b64 = base64.b64encode(data).decode()
        return CheckRequest(
            text=(form.get("text") or None),
            url=(form.get("url") or None),
            image_base64=image_b64 or (form.get("image_base64") or None),
            client=form.get("client") or "other",
        )
    return CheckRequest.model_validate(await request.json())


def _input_kind(req: CheckRequest) -> str:
    kinds = [k for k, v in (("text", req.text), ("url", req.url), ("image", req.image_base64)) if v]
    return "+".join(kinds) or "none"


@app.post("/api/check", response_model=CheckResponse)
async def check(request: Request):
    as_text = request.query_params.get("format") == "text"

    def error(msg: str, status: int):
        if as_text:  # zkratka v iPhonu zobrazí odpověď tak, jak přijde
            return PlainTextResponse(f"❔ {msg}", status_code=status)
        return JSONResponse({"error": msg}, status_code=status)

    ok, msg = request.app.state.limiter.allow(client_ip(request))
    if not ok:
        return error(msg, 429)
    try:
        req = await _parse_request(request)
        log.info("kontrola: klient=%s vstup=%s", req.client, _input_kind(req))
        result = await request.app.state.analyzer.check(req)
    except InputError as e:
        return error(str(e), 400)
    except ValueError:
        return error("Neplatný požadavek.", 400)
    except anthropic.APIError:
        log.exception("chyba jazykového modelu")
        return error("Služba je teď přetížená. Zkuste to prosím za chvíli.", 503)

    request.app.state.store.record_check(
        result.check_id, req.client, _input_kind(req), result.verdict, result.confidence,
        len(result.checks), result.latency_ms, result.model,
    )
    if as_text:
        return PlainTextResponse(result.summary_text)
    return result


@app.post("/api/feedback")
async def feedback(body: FeedbackRequest, request: Request):
    ok = request.app.state.store.record_feedback(body.check_id, body.helpful, body.correct)
    return {"ok": ok}


@app.get("/api/stats")
async def stats(request: Request):
    data = request.app.state.store.stats()
    data["coi_domains"] = len(request.app.state.coi.entries)
    return data


@app.get("/api/health")
async def health(request: Request):
    return {
        "ok": True, "model": settings.model, "decider": settings.decider or None, "second_model": settings.second_model or None,
        "coi_domains": len(request.app.state.coi.entries),
    }


# Web (React, sestavený do nenalet/web) - jedna stránka pro úvod, metodiku i zkratku.
def _web_index() -> FileResponse:
    return FileResponse(WEB / "index.html", headers={"Cache-Control": "no-cache"})


@app.get("/")
async def index():
    return _web_index()


@app.get("/metodika")
async def methodology():
    return _web_index()


@app.get("/zkratka")
async def shortcut_page():
    return _web_index()


@app.get("/api/config")
async def public_config():
    """Odkaz ke stažení zkratky - po nahrání do iCloudu stačí nastavit NENALET_SHORTCUT_ICLOUD."""
    return {"shortcut_url": os.environ.get("NENALET_SHORTCUT_ICLOUD") or "zkratka/stahnout"}


@app.api_route("/zkratka/stahnout", methods=["GET", "HEAD"])
async def shortcut_file():
    return FileResponse(STATIC / "Nenalet.shortcut", media_type="application/octet-stream", filename="Nenalet.shortcut")


app.mount("/assets", StaticFiles(directory=WEB / "assets", check_dir=False), name="web-assets")
app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")
