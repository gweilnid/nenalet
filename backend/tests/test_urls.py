from nenalet.urls import analyze_url, extract_urls


def test_extracts_urls_with_and_without_scheme():
    text = "Váš balík čeká: https://zasilkovna-cz.top/pay?id=1. Nebo www.ppl-doruceni.info a alza.cz."
    assert extract_urls(text) == ["https://zasilkovna-cz.top/pay?id=1", "www.ppl-doruceni.info", "alza.cz"]


def test_ignores_emails_and_plain_words():
    assert extract_urls("Napište na info@alza.cz, děkujeme. Cena 12.50 Kč") == []


def test_official_domain_is_recognised():
    info = analyze_url("https://www.zasilkovna.cz/sledovani")
    assert info.official_brand and info.official_brand.name.startswith("Zásilkovna")
    assert info.impersonated_brand is None


def test_brand_keyword_in_foreign_domain_is_impersonation():
    info = analyze_url("https://zasilkovna-platba.com/x")
    assert info.impersonated_brand and info.impersonated_brand.name.startswith("Zásilkovna")
    assert info.official_brand is None


def test_brand_in_subdomain_is_impersonation():
    info = analyze_url("http://csob.cz.secure-login.xyz/")
    assert info.impersonated_brand.name == "ČSOB"
    assert info.suspicious_tld


def test_typosquat_detected():
    info = analyze_url("https://a1za.cz")
    assert info.impersonated_brand.name == "Alza"


def test_short_keyword_only_as_whole_token():
    # "kb" je uvnitř slova - nesmí to být napodobenina Komerční banky
    assert analyze_url("https://kbelskypivovar.cz").impersonated_brand is None
    assert analyze_url("https://kb-overeni.online").impersonated_brand.name == "Komerční banka"


def test_shortener_and_free_hosting():
    assert analyze_url("https://bit.ly/3abc").shortener
    info = analyze_url("https://moje-banka-login.pages.dev/")
    assert info.free_hosting and info.registered_domain == "moje-banka-login.pages.dev"


def test_google_forms_is_free_form_not_official():
    info = analyze_url("https://docs.google.com/forms/d/e/abc/viewform")
    assert info.free_hosting


def test_punycode_and_userinfo():
    assert analyze_url("https://xn--alza-qva.cz").is_punycode
    assert analyze_url("https://www.csob.cz@evil.example/").has_userinfo
