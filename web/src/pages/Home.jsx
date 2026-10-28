import data from '../data/examples.json';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import HeroLoop from '../components/HeroLoop.jsx';
import CaseExplorer from '../components/CaseExplorer.jsx';
import ProofSection from '../components/ProofSection.jsx';
import { Panel, setupPanels } from '../components/Panel.jsx';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import Story from '../components/Story.jsx';
import { Logo } from '../components/Icons.jsx';
import SplitText from '../components/reactbits/SplitText.jsx';
import ScrollReveal from '../components/reactbits/ScrollReveal.jsx';
import AnimatedContent from '../components/reactbits/AnimatedContent.jsx';
import Magnet from '../components/reactbits/Magnet.jsx';
import '../components/reactbits/ScrollReveal.css';
import { useLang } from '../lib/lang.jsx';

const examples = data.examples;
const ppl = examples.find((e) => e.id === 'scam-037') || examples[0];

const WATCH = [
  [{ cs: 'Spěch a výhrůžky', en: 'Urgency and threats' }, { cs: '„Do 24 hodin“, zablokovaný účet, pokuta, vrácený balík.', en: '“Within 24 hours”, a blocked account, a fine, a returned parcel.' }],
  [{ cs: 'Žádost o kartu, PIN nebo kód', en: 'A request for your card, PIN or code' }, { cs: 'Skutečná banka o ně nikdy nežádá. Ani po telefonu.', en: 'A real bank never asks for them. Not even over the phone.' }],
  [{ cs: '„Bezpečný účet“ a vzdálený přístup', en: 'A “safe account” and remote access' }, { cs: 'Převod peněz „do bezpečí“, instalace AnyDesku nebo TeamVieweru.', en: 'Moving money “to safety”, installing AnyDesk or TeamViewer.' }],
  [{ cs: 'Odkaz na cizí web', en: 'A link to someone else’s website' }, { cs: 'Doména nepatří firmě, za kterou se zpráva vydává.', en: 'The domain doesn’t belong to the company the message claims to be from.' }],
  [{ cs: 'Nové číslo a utajení', en: 'A new number and secrecy' }, { cs: '„Mami, mám nové číslo“, „nikomu to neříkej“.', en: '“Mum, I’ve got a new number”, “don’t tell anyone”.' }],
];

const LIMITS = [
  [{ cs: 'Nevidí do vašeho účtu.', en: 'It can’t see into your account.' }, { cs: 'Neví, jestli jste opravdu něco objednali nebo platili. U nejasných zpráv proto radí ověření přes kontakt, který znáte.', en: 'It doesn’t know whether you really ordered or paid for something. So for unclear messages it advises checking through a contact you know.' }],
  [{ cs: 'Občas zbytečně varuje.', en: 'It sometimes warns for nothing.' }, { cs: 'U záludných, ale pravých zpráv (třeba od banky s telefonním číslem) občas řekne „podezřelé“. Raději jeden zbytečný telefonát bance než ztracené úspory.', en: 'With tricky but genuine messages (say, from a bank with a phone number) it sometimes says “suspicious”. Better one unnecessary call to your bank than lost savings.' }],
  [{ cs: 'Neověří telefonní čísla.', en: 'It doesn’t verify phone numbers.' }, { cs: 'Zatím nepozná, jestli číslo ve zprávě patří bance. U výzvy „zavolejte nám“ proto radí volat na číslo ze zadní strany karty.', en: 'It can’t yet tell whether a number in a message belongs to the bank. When a message says “call us”, it advises calling the number on the back of your card.' }],
  [{ cs: 'Vaše zprávy neukládáme.', en: 'We don’t store your messages.' }, { cs: 'Obsah jednorázově posoudí jazykové modely přes OpenRouter a my ho neukládáme. Ukládáme jen anonymní statistiku a vaše hodnocení „sedí / nesedí“.', en: 'Language models assess the content once through OpenRouter, and we don’t keep it. We only store anonymous statistics and your rating of whether the answer was right.' }],
];

function BrowserFragment() {
  const { t } = useLang();
  return (
    <div className="browser" data-ui aria-label={t({ cs: 'Ukázka rozšíření v Chromu', en: 'The extension in Chrome' })}>
      <div className="browser-page">
        <p><b>Webmail · Doručená pošta</b></p>
        <p>Vážený zákazníku, na vašem účtu jsme zaznamenali neobvyklou aktivitu.</p>
        <p><span className="browser-sel">Pro ověření se přihlaste do 24 hodin, jinak bude účet zablokován.</span></p>
        <div className="ctx-menu" aria-hidden="true">
          <span>{t({ cs: 'Kopírovat', en: 'Copy' })}</span>
          <span>{t({ cs: 'Hledat na Googlu', en: 'Search Google' })}</span>
          <span className="is-us">Ověřit označený text v Nenaleť</span>
          <span>{t({ cs: 'Prozkoumat', en: 'Inspect' })}</span>
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
  const { t } = useLang();
  return (
    <div className="device" data-ui aria-label={t({ cs: 'Ukázka nabídky Sdílet v iPhonu', en: 'The iPhone Share menu' })}>
      <div className="share-sheet">
        <div className="share-apps" aria-hidden="true">
          <span className="share-app"><i />{t({ cs: 'Zprávy', en: 'Messages' })}</span>
          <span className="share-app is-us"><i><Logo /></i><b>Nenaleť</b></span>
          <span className="share-app"><i />Mail</span>
          <span className="share-app"><i />{t({ cs: 'Poznámky', en: 'Notes' })}</span>
        </div>
        <div className="share-actions">
          <span>{t({ cs: 'Kopírovat', en: 'Copy' })}</span>
          <span className="is-us">Nenaleť <span aria-hidden="true">›</span></span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { t, lang } = useLang();
  const main = useRef(null);
  useGSAP(() => {
    const mm = setupPanels(main.current);
    return () => mm.revert();
  }, { scope: main });

  return (
    <>
      <Nav />
      <main ref={main}>
        <Panel className="panel-hero s1" steps={1} labelledBy="hero-h" marks={false}>
          <div className="hero grid">
          <div className="hero-copy">
            <SplitText
              key={lang}
              text={t({ cs: 'Ověřte zprávu i web, než naletíte', en: 'Check it before you fall for it' })}
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
              {t({
                cs: 'SMS, e-mail, odkaz i celý e-shop. Nenaleť během pár sekund řekne, jestli jde o podvod, a poradí, co dělat.',
                en: 'A text message, an e-mail, a link or a whole online shop. In a few seconds Nenaleť tells you whether it’s a scam and what to do.',
              })}
            </p>
            <div className="actions">
              <Magnet padding={60} magnetStrength={4}>
                <a className="btn btn-primary" href="zkratka">{t({ cs: 'Přidat do iPhonu', en: 'Add to iPhone' })}</a>
              </Magnet>
              <a className="btn btn-quiet" href="#instalace">{t({ cs: 'Přidat do Chromu', en: 'Add to Chrome' })}</a>
            </div>
          </div>
          <HeroLoop examples={examples} />
          </div>
        </Panel>

        <ProofSection />

        <Panel className="band band-why" steps={2} labelledBy="why-h">
          <div className="grid why">
            <h2 id="why-h" data-step="1" style={{ gridColumn: '1 / -1' }}>{t({ cs: 'Hlídá, co po vás zpráva chce', en: 'It watches what the message wants from you' })}</h2>
            <div className="why-statement" data-step="1">
              <ScrollReveal key={lang} as="p" enableBlur={false} baseOpacity={0.18} baseRotation={0} stagger={0.04}>
                {t({
                  cs: 'Podvodník dnes píše bezchybně česky a vydává se za banku, dopravce i vnuka. Nenaleť proto nehodnotí, jak zpráva vypadá, ale co po vás chce.',
                  en: 'Today’s scammer writes flawless Czech and poses as your bank, a courier or your grandson. So Nenaleť doesn’t judge how a message looks, but what it wants you to do.',
                })}
              </ScrollReveal>
              <p className="why-source">
                {t({ cs: 'Podvodů s pomocí AI se bojí 77,5 % lidí v Česku, víc než čehokoli jiného (', en: 'AI-assisted scams worry 77.5% of people in Czechia, more than anything else (' })}
                <a href="https://asociace.ai/cesky-barometr-obav-z-ai-2026/">Český barometr obav z AI 2026</a>).
              </p>
            </div>
            <AnimatedContent data-step="2" className="why-list" distance={28} direction="horizontal" duration={0.7} stagger={0.08} ease="expo.out">
              {WATCH.map(([b, d]) => (
                <div key={b.cs}>
                  <b>{t(b)}</b>
                  <p className="muted">{t(d)}</p>
                </div>
              ))}
            </AnimatedContent>
          </div>
        </Panel>

        <Story example={ppl} />


        <Panel id="pouziti" className="band band-cases" steps={2} labelledBy="cases-h">
          <div className="grid">
            <div className="cases-head" data-step="1">
              <h2 id="cases-h">{t({ cs: 'Kdy se Nenaleť hodí', en: 'When Nenaleť helps' })}</h2>
              <p className="lead">
                {t({
                  cs: 'Ověří zprávu i celou stránku, v počítači i v mobilu. Tady jsou skutečné podvody, na které lidé v Česku narazili.',
                  en: 'It checks a message or a whole page, on a computer or a phone. These are real scams people in Czechia ran into, with Nenaleť’s real answers, which are in Czech.',
                })}
              </p>
            </div>
            <div className="cases-wrap" data-step="2">
              <CaseExplorer examples={examples} />
            </div>
          </div>
        </Panel>

        <Panel className="band band-limits" steps={2} labelledBy="limits-h">
          <div className="grid limits">
            <div className="limits-head" data-step="1">
              <h2 id="limits-h">{t({ cs: 'Kde se může mýlit', en: 'Where it can be wrong' })}</h2>
              <p className="lead">
                {t({
                  cs: 'Nenaleť je pomocník, ne záruka. Když jde o peníze, vždy si to ověřte sami na čísle, které znáte.',
                  en: 'Nenaleť is a helper, not a guarantee. When money is at stake, always check for yourself on a number you know.',
                })}
              </p>
            </div>
            <AnimatedContent data-step="2" className="limits-list" distance={22} duration={0.7} stagger={0.09} ease="expo.out">
              {LIMITS.map(([b, d]) => (
                <div key={b.cs}>
                  <b>{t(b)}</b>
                  <p>{t(d)}</p>
                </div>
              ))}
            </AnimatedContent>
          </div>
        </Panel>

        <Panel id="instalace" className="band band-install" steps={3} labelledBy="install-h">
          <div className="grid">
            <div className="install-head" data-step="1">
              <h2 id="install-h">{t({ cs: 'Přidejte si Nenaleť', en: 'Add Nenaleť' })}</h2>
              <p className="lead">{t({ cs: 'Ověřujte tam, kde podvod potkáte. Obojí je zdarma.', en: 'Check things where you run into scams. Both are free.' })}</p>
            </div>
            <div className="install-col" data-step="2">
              <AnimatedContent distance={0} scale={0.96} duration={0.9} ease="expo.out">
                <ShareFragment />
              </AnimatedContent>
              <h3>{t({ cs: 'iPhone: tlačítko Sdílet', en: 'iPhone: the Share button' })}</h3>
              <ol>
                <li>{t({ cs: 'Otevřete stránku se zkratkou v Safari.', en: 'Open the shortcut page in Safari.' })}</li>
                <li>{t({ cs: 'Klepněte na Stáhnout zkratku a pak na Přidat zkratku.', en: 'Tap Download the shortcut, then Add Shortcut.' })}</li>
                <li>{t({ cs: 'U podezřelé zprávy, stránky nebo snímku obrazovky klepněte na Sdílet a vyberte Nenaleť.', en: 'On a suspicious message, page or screenshot, tap Share and choose Nenaleť.' })}</li>
              </ol>
              <div className="actions">
                <a className="btn btn-primary" href="zkratka">{t({ cs: 'Přidat do iPhonu', en: 'Add to iPhone' })}</a>
              </div>
            </div>
            <div className="install-col" data-step="3">
              <AnimatedContent distance={0} scale={0.96} duration={0.9} delay={0.1} ease="expo.out">
                <BrowserFragment />
              </AnimatedContent>
              <h3>{t({ cs: 'Chrome: pravé tlačítko', en: 'Chrome: right-click' })}</h3>
              <ol>
                <li>{t({ cs: 'Stáhněte rozšíření a rozbalte ho.', en: 'Download the extension and unzip it.' })}</li>
                <li>{t({ cs: 'V adrese chrome://extensions zapněte Režim pro vývojáře a zvolte Načíst nerozbalené.', en: 'Go to chrome://extensions, switch on Developer mode and choose Load unpacked.' })}</li>
                <li>{t({ cs: 'Na podezřelý text, odkaz nebo obrázek klikněte pravým tlačítkem a zvolte Ověřit v Nenaleť. Výsledek se ukáže v panelu vedle stránky.', en: 'Right-click suspicious text, a link or an image and choose “Ověřit v Nenaleť” (Check in Nenaleť). The result appears in a panel next to the page, in Czech.' })}</li>
              </ol>
              <div className="actions">
                <a className="btn btn-quiet" href="nenalet-chrome.zip">{t({ cs: 'Stáhnout rozšíření', en: 'Download the extension' })}</a>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="urgent" steps={2} labelledBy="urgent-h">
          <div className="grid">
            <h2 id="urgent-h" data-step="1">{t({ cs: 'Už se to stalo?', en: 'Already happened?' })}</h2>
            <AnimatedContent data-step="2" className="urgent-list" distance={24} duration={0.7} stagger={0.12} ease="expo.out">
              <div>
                <span className="urgent-big">{t({ cs: 'Volejte bance', en: 'Call your bank' })}</span>
                <p>{t({ cs: 'Zadali jste údaje z karty nebo kód? Hned volejte na číslo ze zadní strany karty a kartu zablokujte.', en: 'Entered your card details or a code? Call the number on the back of your card right away and block the card.' })}</p>
              </div>
              <div>
                <span className="urgent-big">158</span>
                <p>{t({ cs: 'Poslali jste peníze? Kontaktujte banku a Policii ČR. Zprávu nemažte, poslouží jako důkaz.', en: 'Sent money? Contact your bank and the Czech Police (158). Don’t delete the message, it’s evidence.' })}</p>
              </div>
            </AnimatedContent>
          </div>
        </Panel>
      </main>
      <Footer />
    </>
  );
}
