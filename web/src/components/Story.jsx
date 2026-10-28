import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Logo, VerdictMark, STATUS_MARK } from './Icons.jsx';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Skutečné výstupy Nenaleť (z ukázek a z ověření rizikového e-shopu ze seznamu ČOI).
const FACTS = [
  {
    status: 'nebezpeci',
    title: 'Odkaz ppl-abc.def',
    text: 'Napodobenina značky PPL: adresa obsahuje „ppl“, ale nepatří k oficiálním doménám (ppl.cz, pplcz.com).',
    source: 'porovnání s oficiálními doménami',
  },
  {
    status: 'nebezpeci',
    title: 'Odkaz 100-solarni-lampa-cz.com',
    text: 'Doména je na seznamu rizikových e-shopů České obchodní inspekce: provozovatel není uveden, web je zcela anonymní.',
    source: 'ČOI – rizikové e-shopy (1 299 domén)',
  },
  {
    status: 'info',
    title: 'Odkaz eu-orders.site',
    text: 'Doména existuje od 8. 3. 2026 (odkaz, který falešný kupec z bazaru poslal jako „kurýra DPD“).',
    source: 'registr domén (RDAP)',
  },
];

function SharePanel({ example }) {
  return (
    <div className="device" data-ui>
      <div className="share-sheet">
        <div className="share-preview">
          <span className="share-thumb">SMS</span>
          <span className="small">{(example.text || '').slice(0, 70)}…</span>
        </div>
        <div className="share-apps" aria-hidden="true">
          <span className="share-app"><i />Zprávy</span>
          <span className="share-app"><i />Mail</span>
          <span className="share-app is-us"><i><Logo /></i><b>Nenaleť</b></span>
          <span className="share-app"><i />Poznámky</span>
        </div>
        <div className="share-actions">
          <span>Kopírovat</span>
          <span className="is-us">Nenaleť <span aria-hidden="true">›</span></span>
          <span>Uložit do Souborů</span>
        </div>
      </div>
    </div>
  );
}

function FactsPanel() {
  return (
    <div className="device" data-ui>
      <div className="device-bar"><b>Co jsme ověřili v registrech</b></div>
      <div className="facts-panel">
        {FACTS.map((f) => (
          <div className="fact-row" key={f.title}>
            <span className="fact-mark" data-s={f.status} aria-hidden="true">{STATUS_MARK[f.status]}</span>
            <span>
              <b>{f.title}</b>
              {f.text}
              <br />
              <small>Zdroj: {f.source}</small>
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
    h: 'Nasdílíte zprávu',
    p: 'V iPhonu klepnete na Sdílet a vyberete Nenaleť. V Chromu kliknete pravým tlačítkem na text, odkaz, obrázek nebo celou stránku. Nic nekopírujete.',
  },
  {
    h: 'Ověříme fakta v registrech',
    p: 'Program zjistí, komu odkaz patří, jak stará je doména, jestli je web na seznamu České obchodní inspekce a jestli existuje IČO. U obrázků hledá podpis původu, že ho vytvořila AI.',
  },
  {
    h: 'Dostanete verdikt a radu',
    p: 'Jazykový model Claude posoudí celou situaci a česky řekne, jestli jde o podvod, proč, a co máte udělat hned teď. Fakta z registrů nesmí popřít.',
  },
];

export default function Story({ example }) {
  const root = useRef(null);
  const [active, setActive] = useState(0);
  const panels = [<SharePanel example={example} />, <FactsPanel />, <VerdictPanel example={example} />];

  useGSAP(
    () => {
      gsap.utils.toArray('.story-step').forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && setActive(i),
        });
      });
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
    <section id="jak" className="section frame" aria-labelledby="jak-h" ref={root}>
      <div className="grid">
        <h2 id="jak-h" className="story-head">Tři kroky, jedenáct sekund</h2>
        <ol className="story-steps" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {STEPS.map((s, i) => (
            <li className="story-step" key={s.h} aria-current={active === i ? 'step' : undefined}>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
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
    </section>
  );
}
