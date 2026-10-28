import data from '../data/examples.json';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import HeroLoop from '../components/HeroLoop.jsx';
import CaseExplorer from '../components/CaseExplorer.jsx';
import ProofSection from '../components/ProofSection.jsx';
import Story from '../components/Story.jsx';
import { Logo } from '../components/Icons.jsx';
import SplitText from '../components/reactbits/SplitText.jsx';
import ScrollReveal from '../components/reactbits/ScrollReveal.jsx';
import AnimatedContent from '../components/reactbits/AnimatedContent.jsx';
import Magnet from '../components/reactbits/Magnet.jsx';
import '../components/reactbits/ScrollReveal.css';

const examples = data.examples;
const ppl = examples.find((e) => e.id === 'scam-037') || examples[0];

const WATCH = [
  ['Spěch a výhrůžky', '„Do 24 hodin“, zablokovaný účet, pokuta, vrácený balík.'],
  ['Žádost o kartu, PIN nebo kód', 'Skutečná banka o ně nikdy nežádá. Ani po telefonu.'],
  ['„Bezpečný účet“ a vzdálený přístup', 'Převod peněz „do bezpečí“, instalace AnyDesku nebo TeamVieweru.'],
  ['Odkaz na cizí web', 'Doména nepatří firmě, za kterou se zpráva vydává.'],
  ['Nové číslo a utajení', '„Mami, mám nové číslo“, „nikomu to neříkej“.'],
];

const LIMITS = [
  ['Nevidí do vašeho účtu.', 'Neví, jestli jste opravdu něco objednali nebo platili. U nejasných zpráv proto radí ověření přes kontakt, který znáte.'],
  ['Občas zbytečně varuje.', 'U záludných, ale pravých zpráv (třeba od banky s telefonním číslem) občas řekne „podezřelé“. Raději jeden zbytečný telefonát bance než ztracené úspory.'],
  ['Neověří telefonní čísla.', 'Zatím nepozná, jestli číslo ve zprávě patří bance. U výzvy „zavolejte nám“ proto radí volat na číslo ze zadní strany karty.'],
  ['Vaše zprávy neukládáme.', 'Obsah jednorázově posoudí model Claude a zahodí se. Ukládáme jen anonymní statistiku a vaše hodnocení „sedí / nesedí“.'],
];

function BrowserFragment() {
  return (
    <div className="browser" data-ui aria-label="Ukázka rozšíření v Chromu">
      <div className="browser-page">
        <p><b>Webmail · Doručená pošta</b></p>
        <p>Vážený zákazníku, na vašem účtu jsme zaznamenali neobvyklou aktivitu.</p>
        <p><span className="browser-sel">Pro ověření se přihlaste do 24 hodin, jinak bude účet zablokován.</span></p>
        <div className="ctx-menu" aria-hidden="true">
          <span>Kopírovat</span>
          <span>Hledat na Googlu</span>
          <span className="is-us">Ověřit označený text v Nenaleť</span>
          <span>Prozkoumat</span>
        </div>
      </div>
      <div className="browser-panel">
        <span className="brand-mini"><Logo />Nenaleť</span>
        <span className="stamp" data-v="podvod" style={{ fontSize: '1rem', justifySelf: 'start' }}>Téměř jistě podvod</span>
        <p className="small">Banka vás nikdy nežádá o přihlášení přes odkaz v e-mailu s lhůtou 24 hodin.</p>
      </div>
    </div>
  );
}

function ShareFragment() {
  return (
    <div className="device" data-ui aria-label="Ukázka nabídky Sdílet v iPhonu">
      <div className="share-sheet">
        <div className="share-apps" aria-hidden="true">
          <span className="share-app"><i />Zprávy</span>
          <span className="share-app is-us"><i><Logo /></i><b>Nenaleť</b></span>
          <span className="share-app"><i />Mail</span>
          <span className="share-app"><i />Poznámky</span>
        </div>
        <div className="share-actions">
          <span>Kopírovat</span>
          <span className="is-us">Nenaleť <span aria-hidden="true">›</span></span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <section className="hero grid frame" aria-labelledby="hero-h">
          <div className="hero-copy">
            <SplitText
              text="Ověřte zprávu i web, než naletíte"
              tag="h1"
              className="hero-h"
              textAlign="left"
              splitType="words"
              mask
              delay={70}
              duration={0.9}
              ease="expo.out"
              rootMargin="0px"
            />
            <p className="lead hero-lead">
              SMS, e-mail, odkaz i celý e-shop. Nenaleť během pár sekund řekne, jestli jde o podvod, a poradí, co dělat.
            </p>
            <div className="actions">
              <Magnet padding={60} magnetStrength={4}>
                <a className="btn btn-primary" href="zkratka">Přidat do iPhonu</a>
              </Magnet>
              <a className="btn btn-quiet" href="#instalace">Přidat do Chromu</a>
            </div>
          </div>
          <HeroLoop examples={examples} />
        </section>

        <ProofSection />

        <section className="band band-why frame" aria-labelledby="why-h">
          <div className="grid why">
            <h2 id="why-h" style={{ gridColumn: '1 / -1' }}>Hlídá, co po vás zpráva chce</h2>
            <div className="why-statement">
              <ScrollReveal as="p" enableBlur={false} baseOpacity={0.18} baseRotation={0} stagger={0.04}>
                Podvodník dnes píše bezchybně česky a vydává se za banku, dopravce i vnuka. Nenaleť proto nehodnotí, jak zpráva vypadá, ale co po vás chce.
              </ScrollReveal>
              <p className="why-source">
                Podvodů s pomocí AI se bojí 77,5 % lidí v Česku, víc než čehokoli jiného (
                <a href="https://asociace.ai/cesky-barometr-obav-z-ai-2026/">Český barometr obav z AI 2026</a>).
              </p>
            </div>
            <AnimatedContent className="why-list" distance={28} direction="horizontal" duration={0.7} stagger={0.08} ease="expo.out">
              {WATCH.map(([b, t]) => (
                <div key={b}>
                  <b>{b}</b>
                  <p className="muted">{t}</p>
                </div>
              ))}
            </AnimatedContent>
          </div>
        </section>

        <Story example={ppl} />


        <section id="pouziti" className="band band-cases frame" aria-labelledby="cases-h">
          <div className="grid">
            <div className="cases-head">
              <h2 id="cases-h">Kdy se Nenaleť hodí</h2>
              <p className="lead">
                Ověří zprávu i celou stránku, v počítači i v mobilu. Tady jsou skutečné podvody, na které lidé v Česku narazili.
              </p>
            </div>
            <CaseExplorer examples={examples} />
          </div>
        </section>

        <section className="band band-limits frame" aria-labelledby="limits-h">
          <div className="grid limits">
            <div className="limits-head">
              <h2 id="limits-h">Kde se může mýlit</h2>
              <p className="lead">
                Nenaleť je pomocník, ne záruka. Když jde o peníze, vždy si to ověřte sami na čísle, které znáte.
              </p>
            </div>
            <AnimatedContent className="limits-list" distance={22} duration={0.7} stagger={0.09} ease="expo.out">
              {LIMITS.map(([b, t]) => (
                <div key={b}>
                  <b>{b}</b>
                  <p>{t}</p>
                </div>
              ))}
            </AnimatedContent>
          </div>
        </section>

        <section id="instalace" className="band band-install frame" aria-labelledby="install-h">
          <div className="grid">
            <div className="install-head">
              <h2 id="install-h">Přidejte si Nenaleť</h2>
              <p className="lead">Ověřujte tam, kde podvod potkáte. Obojí je zdarma.</p>
            </div>
            <div className="install-col">
              <AnimatedContent distance={0} scale={0.96} duration={0.9} ease="expo.out">
                <ShareFragment />
              </AnimatedContent>
              <h3>iPhone: tlačítko Sdílet</h3>
              <ol>
                <li>Otevřete stránku se zkratkou v Safari.</li>
                <li>Klepněte na Stáhnout zkratku a pak na Přidat zkratku.</li>
                <li>U podezřelé zprávy, stránky nebo snímku obrazovky klepněte na Sdílet a vyberte Nenaleť.</li>
              </ol>
              <div className="actions">
                <a className="btn btn-primary" href="zkratka">Přidat do iPhonu</a>
              </div>
            </div>
            <div className="install-col">
              <AnimatedContent distance={0} scale={0.96} duration={0.9} delay={0.1} ease="expo.out">
                <BrowserFragment />
              </AnimatedContent>
              <h3>Chrome: pravé tlačítko</h3>
              <ol>
                <li>Stáhněte rozšíření a rozbalte ho.</li>
                <li>V adrese chrome://extensions zapněte Režim pro vývojáře a zvolte Načíst nerozbalené.</li>
                <li>Na podezřelý text, odkaz nebo obrázek klikněte pravým tlačítkem a zvolte Ověřit v Nenaleť. Výsledek se ukáže v panelu vedle stránky.</li>
              </ol>
              <div className="actions">
                <a className="btn btn-quiet" href="nenalet-chrome.zip">Stáhnout rozšíření</a>
              </div>
            </div>
          </div>
        </section>

        <section className="urgent frame" aria-labelledby="urgent-h">
          <div className="grid">
            <h2 id="urgent-h">Už se to stalo?</h2>
            <AnimatedContent className="urgent-list" distance={24} duration={0.7} stagger={0.12} ease="expo.out">
              <div>
                <span className="urgent-big">Volejte bance</span>
                <p>Zadali jste údaje z karty nebo kód? Hned volejte na číslo ze zadní strany karty a kartu zablokujte.</p>
              </div>
              <div>
                <span className="urgent-big">158</span>
                <p>Poslali jste peníze? Kontaktujte banku a Policii ČR. Zprávu nemažte, poslouží jako důkaz.</p>
              </div>
            </AnimatedContent>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
