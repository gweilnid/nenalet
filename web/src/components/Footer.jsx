import { useLang } from '../lib/lang.jsx';

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="footer frame">
      <div className="footer-word" aria-hidden="true">Nenaleť</div>
      <div className="footer-row">
        <nav aria-label={t({ cs: 'Odkazy v patičce', en: 'Footer links' })}>
          <a href="./">{t({ cs: 'Úvod', en: 'Home' })}</a>
          <a href="zkratka">{t({ cs: 'Zkratka pro iPhone', en: 'iPhone shortcut' })}</a>
          <a href="./#instalace">{t({ cs: 'Rozšíření pro Chrome', en: 'Chrome extension' })}</a>
          <a href="metodika">{t({ cs: 'Metodika a přesnost', en: 'Method and accuracy' })}</a>
          <a href="https://github.com/gweilnid/nenalet">{t({ cs: 'Zdrojový kód', en: 'Source code' })}</a>
        </nav>
        <p className="muted">{t({
          cs: 'Projekt do AI výzvy pro Česko 2026. Obsah zpráv neukládáme.',
          en: 'An entry in AI výzva pro Česko 2026 (the AI Challenge for Czechia). We don’t store message content.',
        })}</p>
      </div>
    </footer>
  );
}
