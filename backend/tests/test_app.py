from fastapi.testclient import TestClient

from nenalet import app as app_module
from nenalet.app import app


def _fake_web(tmp_path, monkeypatch):
    (tmp_path / "index.html").write_text("<!doctype html><div id=root></div>", encoding="utf-8")
    monkeypatch.setattr(app_module, "WEB", tmp_path)


def test_pages_serve_react_index(tmp_path, monkeypatch):
    _fake_web(tmp_path, monkeypatch)
    with TestClient(app) as c:
        for path in ("/", "/metodika", "/zkratka"):
            r = c.get(path)
            assert r.status_code == 200 and "id=root" in r.text, path
            assert r.headers["cache-control"] == "no-cache"


def test_shortcut_download_get_and_head(tmp_path, monkeypatch):
    (tmp_path / "Nenalet.shortcut").write_bytes(b"signed")
    monkeypatch.setattr(app_module, "STATIC", tmp_path)
    with TestClient(app) as c:
        r = c.get("/zkratka/stahnout")
        assert r.status_code == 200 and r.content == b"signed"
        assert "attachment" in r.headers["content-disposition"]
        assert c.head("/zkratka/stahnout").status_code == 200


def test_config_uses_icloud_link_when_set(monkeypatch):
    with TestClient(app) as c:
        assert c.get("/api/config").json() == {"shortcut_url": "zkratka/stahnout"}
        monkeypatch.setenv("NENALET_SHORTCUT_ICLOUD", "https://www.icloud.com/shortcuts/abc")
        assert c.get("/api/config").json()["shortcut_url"] == "https://www.icloud.com/shortcuts/abc"
