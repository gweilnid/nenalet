export default function Footer() {
  return (
    <footer className="footer frame">
      <div className="footer-word" aria-hidden="true">Nenaleť</div>
      <div className="footer-row">
        <nav aria-label="Odkazy v patičce">
          <a href="./">Úvod</a>
          <a href="zkratka">Zkratka pro iPhone</a>
          <a href="./#instalace">Rozšíření pro Chrome</a>
          <a href="metodika">Metodika a přesnost</a>
          <a href="https://github.com/gweilnid/nenalet">Zdrojový kód</a>
        </nav>
        <p className="muted">Projekt do AI výzvy pro Česko 2026. Obsah zpráv neukládáme.</p>
      </div>
    </footer>
  );
}
