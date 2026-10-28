from fastapi.testclient import TestClient

from nenalet.app import app


def test_shortcut_page_has_button_and_qr_and_does_not_download():
    with TestClient(app) as c:
        r = c.get("/zkratka")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/html")
        assert "content-disposition" not in r.headers
        assert 'href="zkratka/stahnout"' in r.text
        assert "<svg" in r.text and "{{" not in r.text


def test_shortcut_download_get_and_head(tmp_path, monkeypatch):
    from nenalet import app as app_module

    (tmp_path / "Nenalet.shortcut").write_bytes(b"signed")
    monkeypatch.setattr(app_module, "STATIC", tmp_path)
    with TestClient(app) as c:
        r = c.get("/zkratka/stahnout")
        assert r.status_code == 200 and r.content == b"signed"
        assert "attachment" in r.headers["content-disposition"]
        assert c.head("/zkratka/stahnout").status_code == 200


def test_shortcut_page_uses_icloud_link_when_set(monkeypatch):
    monkeypatch.setenv("NENALET_SHORTCUT_ICLOUD", "https://www.icloud.com/shortcuts/abc")
    with TestClient(app) as c:
        assert 'href="https://www.icloud.com/shortcuts/abc"' in c.get("/zkratka").text
