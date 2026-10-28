from pathlib import Path

from nenalet.sources import CoiList, parse_coi

HTML = """
<article class="information-row" id="post-1"><div class="entry-content">
<p class = "list_titles"><br><span>cz.gigantv.com</span></p>
<p> Internetové stránky slibují neznámý přípravek. Obchodní podmínky chybí. </p>
<p> (07. 05. 2022) </p><p>———</p></div></article>
<article class="information-row" id="post-2"><div class="entry-content">
<p class = "list_titles"><br><span>www.levne-boty.shop</span><br><span>levne-boty2.shop</span></p>
<p> Provozovatel není uveden. </p><p> (29. 03. 2022) </p></div></article>
"""


def test_parse_coi():
    entries = parse_coi(HTML)
    assert set(entries) == {"cz.gigantv.com", "levne-boty.shop", "levne-boty2.shop"}
    assert entries["levne-boty.shop"].listed == "29. 03. 2022"
    assert "Provozovatel" in entries["levne-boty.shop"].reason


def test_coi_lookup_by_host_and_registered(tmp_path: Path):
    coi = CoiList(tmp_path / "coi.json")
    coi.entries = parse_coi(HTML)
    assert coi.lookup("www.levne-boty.shop", "levne-boty.shop")
    assert coi.lookup("cz.gigantv.com", "gigantv.com")
    assert coi.lookup("alza.cz", "alza.cz") is None
