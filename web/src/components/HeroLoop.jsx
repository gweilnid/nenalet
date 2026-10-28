import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Logo, VerdictMark } from './Icons.jsx';
import { useLang, VERDICT_EN } from '../lib/lang.jsx';
import recSms from '../assets/rec-sms.webp';
import recShare from '../assets/rec-share.webp';
import recResult from '../assets/rec-result.webp';

gsap.registerPlugin(useGSAP);

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/* ---------- iPhone ---------- */
function Status({ dark }) {
  return (
    <div className={`ios-status${dark ? ' is-dark' : ''}`} aria-hidden="true">
      <b>9:41</b>
      <i className="ios-island" />
      <span className="ios-icons"><i className="ios-signal" /><i className="ios-battery" /></span>
    </div>
  );
}

/** Skutečné snímky obrazovky ze záznamu iPhonu: SMS → Sdílet → výsledek Nenaleť. */
const GLS_LINK = 'https://gls-groupecr.cc/cz';

/** Anglický překlad textů na záznamu: SMS, náhled v nabídce Sdílet a odpověď Nenaleť (záznam samotný je skutečný). */
function RecEnglish({ part }) {
  if (part === 'sms')
    return (
      <div className="rec-en rec-en-sms">
        Delivery is on hold because your parcel has no house number. Please update as soon as possible: <u>{GLS_LINK}</u>
      </div>
    );
  if (part === 'share') return <div className="rec-en rec-en-preview">Delivery is on hold because…</div>;
  return (
    <div className="rec-en rec-en-card">
      <div className="rec-en-text">
        <p><i className="rec-stop" aria-hidden="true" />Almost certainly a scam</p>
        <p>It’s a scam – the message only poses as the courier GLS.</p>
        <p className="rec-en-gap">Why:</p>
        <p>• Fake link address: Scammers use addresses that only resemble the real company.</p>
        <p>• New web address: Scam sites appear shortly before the messages go out and soon disappear.</p>
        <p>• Urgency and a made-up address problem: It pushes you to act fast so you don’t think.</p>
        <p>• No parcel number or name: A real courier usually says which parcel it’s about.</p>
        <p className="rec-en-gap">What to do:</p>
        <p>1. Don’t click the link or reply.</p>
      </div>
      <div className="rec-en-btns" aria-hidden="true"><span>Cancel</span><span className="is-done">Done</span></div>
    </div>
  );
}

function RealIphone() {
  const { t, lang } = useLang();
  const layer = (part, src) =>
    lang === 'en' ? (
      <div className={`rec rec-${part}`}>
        <img className="rec-img" src={src} alt="" />
        <RecEnglish part={part} />
      </div>
    ) : (
      <img className={`rec rec-${part}`} src={src} alt="" />
    );
  return (
    <div className="iphone loop-object" data-ui>
      <div className="ip-screen">
        {layer('sms', recSms)}
        {layer('share', recShare)}
        <i className="rec-ring" />
        {layer('result', recResult)}
        <span className="rec-fast">{t({ cs: 'zrychleno', en: 'sped up' })}</span>
      </div>
    </div>
  );
}

/** Pravá SMS od PPL ve vzhledu Zpráv v iPhonu (tmavý režim jako na záznamu). */
function PplSms({ ex }) {
  const { t } = useLang();
  const [before, link] = ex.text.split(/(ppl\.cz\/\S+)/);
  return (
    <div className="iphone loop-object" data-ui>
      <div className="ip-screen ios-msgs">
        <Status dark />
        <div className="msg-head">
          <span className="msg-back" aria-hidden="true">‹</span>
          <span className="msg-avatar" aria-hidden="true" />
          <b>{ex.sender} ›</b>
        </div>
        <p className="msg-meta">{t({ cs: 'Textová zpráva · SMS', en: 'Text Message · SMS' })}<br />{t({ cs: 'Dnes', en: 'Today' })} 9:41</p>
        <p className="msg-bubble">
          {before}
          {link && <u>{link}</u>}
        </p>
        <div className="msg-input"><i aria-hidden="true">+</i><span>{t({ cs: 'Textová zpráva · SMS', en: 'Text Message · SMS' })}</span></div>
      </div>
    </div>
  );
}

/** Falešná stránka „České pošty“ v Safari (rekonstrukce podle Novinek a CNN Prima, jako ve videu). */
function PostSafari() {
  const { t } = useLang();
  return (
    <div className="iphone loop-object" data-ui>
      <div className="ip-screen safari">
        <Status />
        <div className="cp-top"><b>Česká pošta</b><i className="cp-menu" aria-hidden="true" /></div>
        <div className="cp-body">
          <p className="cp-h">{t({ cs: 'Vaše zásilka nemohla být doručena', en: 'Your parcel could not be delivered' })}</p>
          <p className="cp-p">{t({ cs: 'Balíček dorazil do skladu, ale nemohl být doručen z důvodu neúplných údajů o adrese.', en: 'The parcel arrived at our warehouse but could not be delivered because the address details are incomplete.' })}</p>
          <span className="cp-f">{t({ cs: 'Jméno a příjmení', en: 'Full name' })}</span>
          <span className="cp-f">{t({ cs: 'Ulice a číslo domu', en: 'Street and house number' })}</span>
          <p className="cp-p">{t({ cs: 'Za opětovné doručení je nutné uhradit poplatek.', en: 'A fee must be paid for redelivery.' })}</p>
          <div className="cp-card">
            <span className="cp-f">{t({ cs: 'Číslo karty', en: 'Card number' })}</span>
            <div className="cp-row"><span className="cp-f">{t({ cs: 'Platnost', en: 'Expiry' })}</span><span className="cp-f">CVV</span></div>
          </div>
          <span className="cp-btn">{t({ cs: 'Potvrdit a zaplatit', en: 'Confirm and pay' })}</span>
        </div>
        <div className="sf-bar"><span className="sf-addr"><mark className="loop-hl">ceskapostacz<span className="cp-tld">.com.cn</span></mark></span></div>
      </div>
    </div>
  );
}

/* ---------- Chrome s rozšířením ---------- */
function ShopChrome({ ex }) {
  const { t } = useLang();
  const r = ex.result;
  return (
    <div className="chrome loop-object" data-ui>
      <div className="ch-tabs"><span className="ch-tab"><i className="ch-fav" />Simona Šperky – {t({ cs: 'výprodej', en: 'sale' })}</span></div>
      <div className="ch-bar">
        <span className="ch-nav" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
          <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
          <svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.1-5M19 4v4h-4" /></svg>
        </span>
        <span className="ch-omni"><i className="ch-lock" aria-hidden="true" /><mark className="loop-hl">simonasperky.cz</mark></span>
        <span className="ch-ext"><Logo /></span>
      </div>
      <div className="ch-body">
        <div className="ch-page">
          <p className="sh-t">{t({ cs: 'UKONČENÍ SBÍRKY VÝPRODEJ!', en: 'COLLECTION CLOSING SALE!' })}</p>
          <p className="sh-big"><mark className="loop-hl">{t({ cs: '75% SLEVA', en: '75% OFF' })}</mark></p>
          <p className="sh-t">{t({ cs: 'DOPRAVA ZDARMA NAD 746 KČ', en: 'FREE SHIPPING OVER CZK 746' })}</p>
          <span className="sh-btn">{t({ cs: 'NAKUPOVAT NYNÍ', en: 'SHOP NOW' })}</span>
          <p className="sh-story">{t({ cs: 'S lítostí vám musím oznámit, že moje sbírka bude brzy uzavřena…', en: 'I’m sad to tell you that my collection will soon be closing…' })}</p>
        </div>
        <div className="ch-menu">
          <span>{t({ cs: 'Zpět', en: 'Back' })}</span><span>{t({ cs: 'Znovu načíst', en: 'Reload' })}</span><span>{t({ cs: 'Uložit jako…', en: 'Save as…' })}</span>
          <span className="is-us">{t({ cs: 'Ověřit tuto stránku v Nenaleť', en: 'Check this page in Nenaleť' })}</span><span>{t({ cs: 'Prozkoumat', en: 'Inspect' })}</span>
        </div>
        <svg className="ch-cursor" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2l17 10-7.5 1.6L9 21z" /></svg>
        <aside className="ch-panel">
          <p className="chp-brand"><Logo />Nenaleť</p>
          <p className="chp-subj">{t({ cs: 'Stránka', en: 'Page' })}: https://simonasperky.cz/</p>
          <div className="chp-v"><b>✕ {r.verdict_label}</b><p>{r.headline}</p></div>
          <p className="chp-h">{t({ cs: 'Co teď udělat', en: 'What to do now' })}</p>
          <ol className="chp-todo"><li>{r.what_to_do[0]}</li></ol>
        </aside>
      </div>
    </div>
  );
}

const SCENES = [
  { id: 'real-gls', tab: { cs: 'SMS od „GLS“', en: 'SMS from “GLS”' }, View: RealIphone, real: true },
  { id: 'scam-047', tab: { cs: 'Podvodný e-shop', en: 'Scam online shop' }, View: ShopChrome, chrome: true },
  { id: 'page-ceskaposta', tab: { cs: 'Falešná Česká pošta', en: 'Fake Czech Post' }, View: PostSafari },
  { id: 'legit-005', tab: { cs: 'Pravá SMS od PPL', en: 'Genuine SMS from PPL' }, View: PplSms },
];

function timeline(scene, q) {
  const tl = gsap.timeline();
  const has = (sel) => q(sel).length > 0;
  tl.from('.loop-object', { y: 48, opacity: 0, scale: 0.96, duration: 0.9, ease: 'expo.out' });
  if (scene.real) {
    tl.to('.rec-share', { opacity: 1, duration: 0.3 }, 1.1)
      .to('.rec-ring', { opacity: 1, duration: 0.25 }, 1.45)
      .to('.rec-ring', { opacity: 0, duration: 0.2 }, 2.25)
      .to('.rec-fast', { opacity: 1, duration: 0.25 }, 2.25)
      .to('.rec-result', { opacity: 1, duration: 0.35 }, 2.35)
      .to('.rec-fast', { opacity: 0, duration: 0.25 }, 3.3);
    return { tl, hold: 2.4 };
  }
  if (scene.chrome) {
    tl.set('.ch-panel', { xPercent: 101 }, 0)
      .to('.loop-hl', { backgroundSize: '100% 100%', duration: 0.45, stagger: 0.5, ease: 'power2.inOut' }, 0.7)
      .fromTo('.ch-cursor', { x: 220, y: 140, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, 1.15)
      .fromTo('.ch-menu', { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: 'power2.out' }, 1.5)
      .to('.ch-cursor', { x: () => menuTarget().x, y: () => menuTarget().y, duration: 0.28, ease: 'power2.inOut' }, 1.65)
      .to('.ch-menu .is-us', { backgroundColor: '#f6e016', duration: 0.12 }, 1.95)
      .to(['.ch-menu', '.ch-cursor'], { opacity: 0, duration: 0.15 }, 2.05)
      .to('.ch-panel', { xPercent: 0, duration: 0.55, ease: 'expo.inOut' }, 2.1)
      .to('.ch-page', { xPercent: -21, duration: 0.55, ease: 'expo.inOut' }, 2.1)
      .from('.chp-v', { y: 14, opacity: 0, duration: 0.45, ease: 'expo.out' }, 2.6)
      .from(['.chp-h', '.chp-todo'], { opacity: 0, duration: 0.4, stagger: 0.1 }, 2.85);
    return { tl, hold: 2.6 };
  }
  if (has('.loop-hl')) tl.to('.loop-hl', { backgroundSize: '100% 100%', duration: 0.5, stagger: 0.18, ease: 'power2.inOut' }, 0.75);
  if (has('.cp-tld')) tl.to('.cp-tld', { color: '#c4251a', duration: 0.25 }, 1.15);
  if (has('.cp-card')) tl.to('.cp-card', { outlineColor: 'rgba(246, 224, 22, 1)', duration: 0.25 }, 1.35);
  tl.from('.loop-verdict', { y: 36, opacity: 0, duration: 0.7, ease: 'expo.out' }, 1.6)
    .from('.loop-stamp', { scale: 1.9, rotation: -18, opacity: 0, duration: 0.5, ease: 'back.out(2.2)' }, 1.85)
    .from('.loop-headline', { y: 10, opacity: 0, duration: 0.45, ease: 'expo.out' }, 2.1);
  return { tl, hold: 2.6 };
}

/** Kam má kurzor dojet: na položku „Ověřit tuto stránku v Nenaleť“ (vůči výchozí poloze kurzoru). */
function menuTarget() {
  const cur = document.querySelector('.ch-cursor');
  const item = document.querySelector('.ch-menu .is-us');
  if (!cur || !item) return { x: 0, y: 0 };
  const a = cur.getBoundingClientRect();
  const b = item.getBoundingClientRect();
  return { x: b.left + b.width * 0.35 - a.left, y: b.top + b.height * 0.5 - a.top };
}

/** Úvodní smyčka: skutečný záznam z iPhonu, ověření e-shopu v Chromu, falešná pošta a pravá SMS. */
export default function HeroLoop({ examples }) {
  const { t, lang } = useLang();
  const byId = Object.fromEntries(examples.map((e) => [e.id, e]));
  const scenes = SCENES.filter((s) => s.real || byId[s.id]);
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const auto = useRef(true);
  const visible = useRef(true);
  const tlRef = useRef(null);
  const stage = useRef(null);
  const scene = scenes[index];
  const ex = byId[scene.id];
  const r = ex?.result;

  useEffect(() => {
    const el = stage.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting;
      tlRef.current?.paused(!entry.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      if (reduceMotion()) {
        // Bez animace: hned konečný stav každé scény.
        gsap.set('.loop-hl', { backgroundSize: '100% 100%' });
        gsap.set('.rec-result', { opacity: 1 });
        gsap.set('.ch-panel', { xPercent: 0 });
        gsap.set('.ch-page', { xPercent: -21 });
        return;
      }
      const { tl, hold } = timeline(scene, gsap.utils.selector(stage));
      tl.paused(!visible.current);
      // Po kliknutí na ukázku smyčka skončí a výsledek zůstane na místě.
      if (auto.current) {
        tl.to({}, { duration: hold })
          .to(['.loop-object', '.loop-verdict'], { y: -28, opacity: 0, duration: 0.45, ease: 'power2.in', stagger: 0.05 })
          .call(() => auto.current && setIndex((i) => (i + 1) % scenes.length));
      }
      tlRef.current = tl;
    },
    { scope: stage, dependencies: [index, run], revertOnUpdate: true }
  );

  const verdict = scene.real ? 'podvod' : r.verdict;
  const label = `Nenaleť: ${lang === 'en' ? VERDICT_EN[verdict] || r.verdict_label : scene.real ? 'Téměř jistě podvod' : r.verdict_label}.`;

  return (
    <div className="hero-loop">
      <div className="loop-stage" ref={stage}>
        <div className="loop-tabs" role="group" aria-label={t({ cs: 'Ukázky v úvodu', en: 'Examples' })}>
          {scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="loop-tab"
              aria-pressed={i === index}
              onClick={() => {
                auto.current = false;
                setIndex(i);
                setRun((n) => n + 1);
              }}
            >
              {t(s.tab)}
            </button>
          ))}
        </div>
        <div className={`loop-scene${scene.chrome || scene.real ? ' is-wide' : ''}`} key={scene.id} aria-label={`${t({ cs: 'Ukázka', en: 'Example' })}: ${t(scene.tab)}. ${label}`}>
          <scene.View ex={ex} />
          {!scene.real && !scene.chrome && (
            <div className="loop-verdict" data-ui>
              <span className="brand-mini"><Logo />Nenaleť</span>
              <span className="stamp loop-stamp" data-v={r.verdict}><VerdictMark v={r.verdict} />{r.verdict_label}</span>
              <p className="loop-headline">{r.headline}</p>
            </div>
          )}
        </div>
      </div>
      <p className="loop-note">
        {scene.real
          ? t({ cs: 'Skutečný záznam obrazovky z iPhonu, čekání na výsledek je zkrácené.', en: 'A real iPhone screen recording with the wait shortened. The text message and Nenaleť’s answer are translated from Czech.' })
          : scene.id === 'page-ceskaposta'
            ? t({ cs: 'Falešná stránka podle popisu Novinek a CNN Prima, výsledek je skutečná kontrola Nenaleť.', en: 'A fake page rebuilt from reports by Novinky and CNN Prima; the result is a real Nenaleť check, translated from Czech.' })
            : t({ cs: 'Skutečný případ a skutečný výsledek Nenaleť.', en: 'A real case and a real Nenaleť result, translated from Czech.' })}
      </p>
    </div>
  );
}
