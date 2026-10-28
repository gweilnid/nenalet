import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import CountUp from '../components/reactbits/CountUp.jsx';

const GH = 'https://github.com/gweilnid/nenalet/blob/main';

export default function Metodika() {
  return (
    <>
      <Nav home="./" />
      <main className="frame">
        <header className="page-head">
          <h1>Jak přesný je Nenaleť</h1>
          <p className="lead">
            Přesnost měříme na testové sadě skutečných českých podvodů a legitimních zpráv. Zveřejňujeme výsledky i chyby. Sadu, zdroje i skript si můžete stáhnout a měření zopakovat.
          </p>
        </header>

        <section className="kpis" aria-label="Hlavní výsledky">
          <div><p className="kpi-num"><CountUp to={69} duration={1.2} /> z 69</p><p>podvodů zachyceno (95% CI 95–100 %)</p></div>
          <div><p className="kpi-num"><CountUp to={2} duration={0.8} /> z 38</p><p>planých poplachů u legitimních zpráv (5 %, 95% CI 1–17 %)</p></div>
          <div><p className="kpi-num">0,39 Kč</p><p>stojí jedna kontrola, medián odpovědi 11 s</p></div>
        </section>

        <div className="prose" style={{ maxWidth: 'none', marginTop: 'clamp(48px, 6vw, 96px)' }}>
          <h2>Výsledky měření (28. 10. 2026)</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Varianta</th><th>Zachycené podvody</th><th>Z toho jednoznačně „podvod“</th><th>Planý poplach</th><th>Cena za kontrolu</th><th>Odpověď (medián)</th></tr>
              </thead>
              <tbody>
                <tr><td>Jen automatické kontroly (bez AI)</td><td>7 z 69 · 10 %</td><td>0 %</td><td>0 z 38 · 0 %</td><td>0 Kč</td><td>pod 1 s</td></tr>
                <tr><td>Claude Haiku 5.5 a kontroly</td><td>67 z 69 · 97 %</td><td>81 %</td><td>14 z 38 · 37 %</td><td>0,01 Kč</td><td>4,9 s</td></tr>
                <tr className="pick"><td>Claude Opus 5.5 a kontroly (v provozu)</td><td>69 z 69 · 100 %</td><td>86 %</td><td>2 z 38 · 5 %</td><td>0,39 Kč</td><td>10,9 s</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="prose" style={{ marginTop: 32 }}>
          <p>
            Za zachycený podvod považujeme verdikt „podvod“ nebo „podezřelé“, protože obojí člověka zastaví a poradí mu ověření. Intervaly spolehlivosti jsou Wilsonovy 95% intervaly. Sada je malá, proto jsou široké a uvádíme je.
          </p>
          <p>
            Samotné automatické kontroly zachytí málo podvodů, protože většina zveřejněných podvodných zpráv odkaz nemá nebo ho zdroj zamaskoval. Když ale něco najdou, nemýlí se a dávají konkrétní vysvětlení. Hlavní práci dělá model, který posoudí situaci. Levnější Haiku by zbytečně varoval u třetiny běžných zpráv, a tak by mu lidé přestali věřit. Proto v provozu běží Opus.
          </p>

          <h2>Testová sada</h2>
          <ul>
            <li><b>69 podvodů.</b> Všechno skutečné, veřejně zveřejněné texty z varování Policie ČR, bank (Komerční banka, Česká spořitelna, Moneta), ČNB, dopravců (Zásilkovna, PPL, DPD, GLS), Finanční správy, ČSSZ, archivu hoax.cz a zpravodajství.</li>
            <li><b>38 legitimních textů.</b> 15 skutečných zpráv (datová schránka, eRecept, PPL, Allegro, Seznam, Česká spořitelna), 6 úryvků ze skutečných bezpečnostních rad, které slouží jako záludné případy, a 17 zpráv dopsaných podle zveřejněných formátů.</li>
            <li>Zdroje (85) jsou v <a href={`${GH}/eval/SOURCES.md`}>SOURCES.md</a>, data v <a href={`${GH}/eval/dataset.jsonl`}>dataset.jsonl</a>. Jména obětí jsou anonymizovaná. Podvodné odkazy jsme při měření neotevírali.</li>
            <li><b>Instrukce pro model vznikly dřív, než existovala testová sada,</b> a podle výsledků jsme je neupravovali.</li>
          </ul>

          <h2>Kde se Nenaleť spletl</h2>
          <ul>
            <li><b>Skutečná SMS České spořitelny</b> o aktivaci nového zařízení s výzvou „pokud jste to nebyl vy, volejte na +420 956 777 438“ dopadla jako „podezřelé“. Stejně vypadá typický podvod a Nenaleť zatím neumí ověřit, že je číslo oficiální linkou banky.</li>
            <li><b>Skutečná reklamní SMS Cinema City</b> „každá vstupenka vyhrává na www.vyhernivstupenka.cz“ dopadla jako „podezřelé“. Matoucí byla i pro novináře.</li>
            <li>Oba plané poplachy padly na skutečné zprávy. U 15 ověřeně skutečných legitimních zpráv je to 2 z 15 (13 %, 95% CI 4–38 %).</li>
          </ul>

          <h2>Pozná, jestli obrázek vytvořila AI?</h2>
          <p>
            Jen tehdy, když se tvůrce sám přizná. Hledáme podepsaný údaj o původu C2PA, který přidávají Google, OpenAI, Adobe, Microsoft a další, a vodoznak SynthID přes rozhraní OpenAI. Když takový údaj najdeme, víme jistě, že obrázek vytvořila AI. Když nic nenajdeme, neznamená to, že je obrázek pravý. Google SynthID pro obsah od Googlu zatím veřejné rozhraní pro vývojáře nemá, Nenaleť proto u důležitých obrázků poradí ověření v aplikaci Gemini. Anthropic vlastní detektor nemá. Nenaleť proto vždy posuzuje hlavně to, co po vás zpráva chce.
          </p>

          <h2>Soukromí a provoz</h2>
          <ul>
            <li>Obsah zpráv neukládáme. Jednorázově ho posoudí model Claude (Anthropic, přes OpenRouter). Ukládáme jen anonymní statistiku a dobrovolné hodnocení.</li>
            <li>Odkazované stránky stahujeme bezpečně: bez JavaScriptu, s limitem velikosti a bez přístupu k interním adresám serveru.</li>
            <li>Ochrana proti zneužití: nejvýš 30 kontrol z jedné adresy za hodinu a denní strop.</li>
            <li>Zdrojový kód je otevřený: <a href="https://github.com/gweilnid/nenalet">github.com/gweilnid/nenalet</a>.</li>
          </ul>
        </div>
      </main>
      <div style={{ height: 'var(--section)' }} />
      <Footer />
    </>
  );
}
