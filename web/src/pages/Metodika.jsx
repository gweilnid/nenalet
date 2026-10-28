import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import CountUp from '../components/reactbits/CountUp.jsx';
import { useLang } from '../lib/lang.jsx';

const GH = 'https://github.com/gweilnid/nenalet/blob/main';

export default function Metodika() {
  const { t, lang } = useLang();
  const en = lang === 'en';
  return (
    <>
      <Nav home="./" />
      <main className="frame">
        <header className="page-head">
          <h1>{t({ cs: 'Jak přesný je Nenaleť', en: 'How accurate Nenaleť is' })}</h1>
          <p className="lead">
            {t({
              cs: 'Přesnost měříme na testové sadě skutečných českých podvodů a legitimních zpráv. Zveřejňujeme výsledky i chyby. Sadu, zdroje i skript si můžete stáhnout a měření zopakovat.',
              en: 'We measure accuracy on a test set of real Czech scams and legitimate messages. We publish the results and the mistakes. You can download the set, the sources and the script and repeat the measurement.',
            })}
          </p>
        </header>

        <section className="kpis" aria-label={t({ cs: 'Hlavní výsledky', en: 'Main results' })}>
          <div><p className="kpi-num"><CountUp to={69} duration={1.2} /> {t({ cs: 'z', en: 'of' })} 69</p><p>{t({ cs: 'podvodů zachyceno (95% CI 95–100 %)', en: 'scams caught (95% CI 95–100%)' })}</p></div>
          <div><p className="kpi-num"><CountUp to={5} duration={0.8} />{en ? '%' : '\u00a0%'}</p><p>{t({ cs: 'planých poplachů u legitimních zpráv (2 z 38, 95% CI 1–17 %)', en: 'false alarms on legitimate messages (2 of 38, 95% CI 1–17%)' })}</p></div>
          <div><p className="kpi-num">{t({ cs: '0,39 Kč', en: 'CZK 0.39' })}</p><p>{t({ cs: 'stojí jedna kontrola, medián odpovědi 11 s', en: 'per check, median response 11 s' })}</p></div>
        </section>

        <div className="prose" style={{ maxWidth: 'none', marginTop: 'clamp(48px, 6vw, 96px)' }}>
          <h2>{t({ cs: 'Výsledky měření (28. 10. 2026)', en: 'Results (28 October 2026)' })}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                {en
                  ? <tr><th>Setup</th><th>Scams caught</th><th>Of these, a clear “scam”</th><th>False alarms</th><th>Cost per check</th><th>Response (median)</th></tr>
                  : <tr><th>Varianta</th><th>Zachycené podvody</th><th>Z toho jednoznačně „podvod“</th><th>Planý poplach</th><th>Cena za kontrolu</th><th>Odpověď (medián)</th></tr>}
              </thead>
              <tbody>
                {en ? (
                  <>
                    <tr><td>Automatic checks only (no AI)</td><td>7 of 69 · 10%</td><td>0%</td><td>0 of 38 · 0%</td><td>CZK 0</td><td>under 1 s</td></tr>
                    <tr><td>Claude Haiku 5.5 and checks</td><td>67 of 69 · 97%</td><td>81%</td><td>14 of 38 · 37%</td><td>CZK 0.01</td><td>4.9 s</td></tr>
                    <tr className="pick"><td>Claude Opus 5.5 and checks (in production)</td><td>69 of 69 · 100%</td><td>86%</td><td>2 of 38 · 5%</td><td>CZK 0.39</td><td>10.9 s</td></tr>
                  </>
                ) : (
                  <>
                    <tr><td>Jen automatické kontroly (bez AI)</td><td>7 z 69 · 10 %</td><td>0 %</td><td>0 z 38 · 0 %</td><td>0 Kč</td><td>pod 1 s</td></tr>
                    <tr><td>Claude Haiku 5.5 a kontroly</td><td>67 z 69 · 97 %</td><td>81 %</td><td>14 z 38 · 37 %</td><td>0,01 Kč</td><td>4,9 s</td></tr>
                    <tr className="pick"><td>Claude Opus 5.5 a kontroly (v provozu)</td><td>69 z 69 · 100 %</td><td>86 %</td><td>2 z 38 · 5 %</td><td>0,39 Kč</td><td>10,9 s</td></tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {en ? (
          <div className="prose" style={{ marginTop: 32 }}>
            <p>
              We count a scam as caught when the verdict is “scam” or “suspicious”, because both stop the person and advise them to check. The confidence intervals are Wilson 95% intervals. The set is small, so they are wide, and we report them.
            </p>
            <p>
              The automatic checks alone catch few scams, because most published scam messages have no link or the source masked it. But when they do find something, they are not wrong and they give a concrete explanation. The main work is done by the model that assesses the situation. The cheaper Haiku would raise false alarms on a third of ordinary messages, and people would stop trusting it. That is why Opus runs in production.
            </p>

            <h2>The test set</h2>
            <ul>
              <li><b>69 scams.</b> All real, publicly published texts from warnings by the Czech Police, banks (Komerční banka, Česká spořitelna, Moneta), the Czech National Bank, couriers (Zásilkovna, PPL, DPD, GLS), the Financial Administration, the Czech Social Security Administration (ČSSZ), the hoax.cz archive and the news.</li>
              <li><b>38 legitimate texts.</b> 15 real messages (data box, eRecept, PPL, Allegro, Seznam, Česká spořitelna), 6 excerpts from real security advice that serve as tricky cases, and 17 messages written to match published formats.</li>
              <li>The sources (85) are in <a href={`${GH}/eval/SOURCES.md`}>SOURCES.md</a>, the data in <a href={`${GH}/eval/dataset.jsonl`}>dataset.jsonl</a>. Victims’ names are anonymised. We did not open the scam links during the measurement.</li>
              <li><b>The model’s instructions were written before the test set existed,</b> and we did not change them based on the results.</li>
            </ul>

            <h2>Where Nenaleť got it wrong</h2>
            <ul>
              <li><b>A real text from Česká spořitelna</b> about activating a new device, saying “if this wasn’t you, call +420 956 777 438”, came out as “suspicious”. A typical scam looks exactly like this, and Nenaleť can’t yet verify that the number is the bank’s official line.</li>
              <li><b>A real promotional text from Cinema City</b>, “every ticket wins at www.vyhernivstupenka.cz”, came out as “suspicious”. It confused journalists too.</li>
              <li>Both false alarms were on real messages. Among the 15 verified real legitimate messages that is 2 of 15 (13%, 95% CI 4–38%).</li>
            </ul>

            <h2>Privacy and operation</h2>
            <ul>
              <li>We don’t store message content. It is assessed once through OpenRouter by GPT-5.6 Luna (OpenAI), the Jev decision model (TypeSafe) and, for unclear cases, Gemini 3.8 Flash (Google). We only call language models at providers that, according to their policies on OpenRouter, neither store the data nor train on it. We only store anonymous statistics and voluntary ratings.</li>
              <li>We fetch linked pages safely: without JavaScript, with a size limit and with no access to the server’s internal addresses.</li>
              <li>Abuse protection: at most 30 checks per address per hour, plus a daily cap.</li>
              <li>The source code is open: <a href="https://github.com/gweilnid/nenalet">github.com/gweilnid/nenalet</a>.</li>
            </ul>
          </div>
        ) : (
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

            <h2>Soukromí a provoz</h2>
            <ul>
              <li>Obsah zpráv neukládáme. Jednorázově ho přes OpenRouter posoudí GPT-5.6 Luna (OpenAI), rozhodovací model Jev (TypeSafe) a u nejasných případů Gemini 3.8 Flash (Google). Jazykové modely voláme jen u poskytovatelů, kteří podle zásad na OpenRouteru data neukládají ani na nich netrénují. Ukládáme jen anonymní statistiku a dobrovolné hodnocení.</li>
              <li>Odkazované stránky stahujeme bezpečně: bez JavaScriptu, s limitem velikosti a bez přístupu k interním adresám serveru.</li>
              <li>Ochrana proti zneužití: nejvýš 30 kontrol z jedné adresy za hodinu a denní strop.</li>
              <li>Zdrojový kód je otevřený: <a href="https://github.com/gweilnid/nenalet">github.com/gweilnid/nenalet</a>.</li>
            </ul>
          </div>
        )}
      </main>
      <div style={{ height: 'var(--section)' }} />
      <Footer />
    </>
  );
}
