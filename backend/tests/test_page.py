from nenalet.page import ico_checksum_ok, parse_page


def test_ico_checksum():
    assert ico_checksum_ok("27082440")  # Alza.cz a.s.
    assert ico_checksum_ok("00006947")  # Ministerstvo financí
    assert not ico_checksum_ok("27082441")
    assert not ico_checksum_ok("1234")


def test_parse_page_finds_card_fields_ico_and_terms():
    html = """<html><head><title>Doplatek za zásilku</title></head><body>
    <form action="https://collector.example/x"><input name="cardnumber"><input name="cvv">
    <input type="password" name="p"></form>
    <p>Provozovatel: Firma s.r.o., IČO: 270 82 440</p><a href="/op">Obchodní podmínky</a>
    <script>var secret=1</script></body></html>"""
    p = parse_page(html, "zasilkovna-pay.top")
    assert p.title == "Doplatek za zásilku"
    assert "card" in p.sensitive_fields and "cvv" in p.sensitive_fields
    assert p.password_field
    assert p.external_form_actions == ["https://collector.example/x"]
    assert p.icos == ["27082440"]
    assert p.has_terms
    assert "secret" not in p.text
