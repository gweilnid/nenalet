import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Logo, VerdictMark, STATUS_MARK } from './Icons.jsx';
import { NOT_FP_QUERY, Panel, usePanelStep } from './Panel.jsx';
import { useLang } from '../lib/lang.jsx';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Skutečné výstupy Nenaleť (z ukázek a z ověření rizikového e-shopu ze seznamu ČOI).
const FACTS = [
  {
    status: 'nebezpeci',
    title: { cs: 'Odkaz ppl-abc.def', en: 'Link ppl-abc.def' },
    text: {
      cs: 'Napodobenina značky PPL: adresa obsahuje „ppl“, ale nepatří k oficiálním doménám (ppl.cz, pplcz.com).',
      en: 'An imitation of the PPL brand: the address contains “ppl” but isn’t one of the official domains (ppl.cz, pplcz.com).',
    },
    source: { cs: 'porovnání s oficiálními doménami', en: 'compared with the official domains' },
  },
  {
    status: 'nebezpeci',
    title: { cs: 'Odkaz 100-solarni-lampa-cz.com', en: 'Link 100-solarni-lampa-cz.com' },
    text: {
      cs: 'Doména je na seznamu rizikových e-shopů České obchodní inspekce: provozovatel není uveden, web je zcela anonymní.',
      en: 'The domain is on the Czech Trade Inspection’s list of risky online shops: no operator is named and the site is completely anonymous.',
    },
    source: { cs: 'ČOI – rizikové e-shopy (1 299 domén)', en: 'ČOI – risky online shops (1,299 domains)' },
  },
  {
    status: 'info',
    title: { cs: 'Odkaz eu-orders.site', en: 'Link eu-orders.site' },
    text: {
      cs: 'Doména existuje od 8. 3. 2026 (odkaz, který falešný kupec z bazaru poslal jako „kurýra DPD“).',
      en: 'The domain has existed since 8 March 2026 (the link a fake buyer on a second-hand marketplace sent as the “DPD courier”).',
    },
    source: { cs: 'registr domén (RDAP)', en: 'domain registry (RDAP)' },
  },
];

function SharePanel({ example }) {
  const { t } = useLang();
  return (
    <div className="device" data-ui>
      <div className="share-sheet">
        <div className="share-preview">
          <span className="share-thumb">SMS</span>
          <span className="small">{(example.text || '').slice(0, 70)}…</span>
        </div>
        <div className="share-apps" aria-hidden="true">
          <span className="share-app"><i />{t({ cs: 'Zprávy', en: 'Messages' })}</span>
          <span className="share-app"><i />Mail</span>
          <span className="share-app is-us"><i><Logo /></i><b>Nenaleť</b></span>
          <span className="share-app"><i />{t({ cs: 'Poznámky', en: 'Notes' })}</span>
        </div>
        <div className="share-actions">
          <span>{t({ cs: 'Kopírovat', en: 'Copy' })}</span>
          <span className="is-us">Nenaleť <span aria-hidden="true">›</span></span>
          <span>{t({ cs: 'Uložit do Souborů', en: 'Save to Files' })}</span>
        </div>
      </div>
    </div>
  );
}

function FactsPanel() {
  const { t } = useLang();
  return (
    <div className="device" data-ui>
      <div className="device-bar"><b>{t({ cs: 'Co jsme ověřili v registrech', en: 'What we checked in the registers' })}</b></div>
      <div className="facts-panel">
        {FACTS.map((f) => (
          <div className="fact-row" key={f.title.cs}>
            <span className="fact-mark" data-s={f.status} aria-hidden="true">{STATUS_MARK[f.status]}</span>
            <span>
              <b>{t(f.title)}</b>
              {t(f.text)}
              <br />
              <small>{t({ cs: 'Zdroj', en: 'Source' })}: {t(f.source)}</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerdictPanel({ example }) {
  const r = example.result;
  return (
    <div className="device" data-ui>
      <div className="verdict-card" style={{ borderTop: 0 }}>
        <div className="verdict-head">
          <span className="brand-mini"><Logo />Nenaleť</span>
          <span className="stamp" data-v={r.verdict}><VerdictMark v={r.verdict} />{r.verdict_label}</span>
        </div>
        <p className="verdict-headline">{r.headline}</p>
        <p className="mini-h">Co teď udělat</p>
        <ol className="todo-mini">
          {r.what_to_do.map((t, i) => <li key={i}>{t}</li>)}
        </ol>
      </div>
    </div>
  );
}

const STEPS = [
  {
    h: { cs: 'Nasdílíte zprávu', en: 'You share the message' },
    p: {
      cs: 'V iPhonu klepnete na Sdílet a vyberete Nenaleť. V Chromu kliknete pravým tlačítkem na text, odkaz, obrázek nebo celou stránku. Nic nekopírujete.',
      en: 'On an iPhone you tap Share and choose Nenaleť. In Chrome you right-click text, a link, an image or the whole page. Nothing to copy.',
    },
  },
  {
    h: { cs: 'Ověříme fakta v registrech', en: 'We check the facts in public registers' },
    p: {
      cs: 'Program zjistí, komu odkaz patří, jak stará je doména, jestli je web na seznamu České obchodní inspekce a jestli existuje IČO.',
      en: 'The program finds out who the link belongs to, how old the domain is, whether the site is on the Czech Trade Inspection’s list and whether the company ID (IČO) exists.',
    },
  },
  {
    h: { cs: 'Dostanete verdikt a radu', en: 'You get a verdict and advice' },
    p: {
      cs: 'Jazykový model sepíše varovné signály a rozhodovací model Jev z nich vybere verdikt. Česky se dozvíte, jestli jde o podvod, proč, a co udělat hned teď. Fakta z registrů nesmí popřít.',
      en: 'A language model writes up the warning signs and the Jev decision model picks the verdict from them. You learn, in Czech, whether it’s a scam, why, and what to do right now. It may not contradict the facts from the registers.',
    },
  },
];

export default function Story({ example }) {
  const { t } = useLang();
  const root = useRef(null);
  const [active, setActive] = useState(0);
  const panels = [<SharePanel example={example} />, <FactsPanel />, <VerdictPanel example={example} />];
  const step = usePanelStep(root);

  // Celoobrazovkový režim: krok sekce = aktivní krok příběhu.
  useEffect(() => {
    if (step !== Infinity) setActive(Math.min(2, Math.max(0, step - 1)));
  }, [step]);

  // Obyčejná stránka: aktivní krok podle toho, kam člověk doskroloval.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(NOT_FP_QUERY, () => {
        gsap.utils.toArray('.story-step').forEach((el, i) => {
          ScrollTrigger.create({
            trigger: el,
            start: 'top 55%',
            end: 'bottom 55%',
            onToggle: (self) => self.isActive && setActive(i),
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  // Výměna obrazovky: obsah nové obrazovky přijede v pořadí čtení.
  useGSAP(
    () => {
      const panel = root.current?.querySelector(`.story-panel[data-i="${active}"]`);
      if (!panel || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      gsap.fromTo(
        panel.querySelectorAll('.share-preview, .share-app, .share-actions span, .fact-row, .verdict-head, .verdict-headline, .todo-mini li'),
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.05 }
      );
    },
    { scope: root, dependencies: [active] }
  );

  return (
    <Panel id="jak" className="band band-story" steps={3} labelledBy="jak-h" sectionRef={root}>
      <div className="grid">
        <h2 id="jak-h" className="story-head">{t({ cs: 'Tři kroky, jedenáct sekund', en: 'Three steps, eleven seconds' })}</h2>
        <ol className="story-steps" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {STEPS.map((s, i) => (
            <li className="story-step" key={s.h.cs} aria-current={active === i ? 'step' : undefined}>
              <h3>{t(s.h)}</h3>
              <p>{t(s.p)}</p>
              <div className="story-inline">{panels[i]}</div>
            </li>
          ))}
        </ol>
        <div className="story-stage" aria-hidden="true">
          <div className="story-sticky">
            {panels.map((p, i) => (
              <div key={i} className="story-panel" data-i={i} style={{ opacity: active === i ? 1 : 0, visibility: active === i ? 'visible' : 'hidden' }}>
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
