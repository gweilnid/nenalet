import { useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Logo, VerdictMark } from './Icons.jsx';
import { segment, senderFlag } from '../lib/highlight.js';

gsap.registerPlugin(useGSAP);

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Situace jsou skutečné případy z testové sady; výsledky spočítal Nenaleť předem (eval/build_showcase.py).
export const CASES = [
  { id: 'scam-047', group: 'page', title: 'Nedůvěryhodný e-shop', where: 'Stránka v počítači', situation: 'Na Facebooku vám vyskočí výprodej šperků se slevou 75 %.' },
  { id: 'page-ceskaposta', group: 'page', title: 'Falešná stránka České pošty', where: 'Stránka v mobilu', situation: 'SMS o nedoručeném balíku vás pošle na stránku, kde máte potvrdit adresu.' },
  { id: 'scam-044', group: 'page', title: 'Peníze za zboží z bazaru', where: 'Stránka v mobilu', situation: 'Kupec vám pošle odkaz na „Zásilkovnu“, kde si máte vyzvednout platbu.' },
  { id: 'scam-060', group: 'page', title: 'Článek o snadné investici', where: 'Stránka v počítači', situation: 'Reklama vás zavede na „zprávu“ o dividendách z ČEZ pro každého.' },
  { id: 'scam-025', group: 'message', title: 'SMS od „banky“', where: 'SMS', situation: 'K vašemu účtu se prý připojilo cizí zařízení a máte ho hned ověřit.' },
  { id: 'scam-061', group: 'message', title: '„Mami, mám nové číslo“', where: 'Zpráva', situation: 'Dítě prý má nový telefon a chce, abyste mu napsali na WhatsApp.' },
  { id: 'legit-005', group: 'message', title: 'Pravá zpráva od dopravce', where: 'SMS', situation: 'Nenaleť pozná i skutečnou zprávu a zbytečně nestraší.' },
];

const host = (u) => (u || '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();

function linkFlagged(ex) {
  const h = host(ex.url_in_message);
  return !!h && ex.result.checks.some((c) => (c.status === 'nebezpeci' || c.status === 'varovani') && c.name.toLowerCase().includes(h));
}

/** Formulář, na který vede SMS „České pošty“ (stránka sama už nefunguje; ověřuje se její adresa). */
function PostForm() {
  return (
    <div className="post-form">
      <p className="pp-title">Potvrďte svou adresu</p>
      <p>Balíček dorazil do skladu, ale nemohl být doručen z důvodu neúplných údajů o adrese.</p>
      <span className="pp-field">Jméno a příjmení</span>
      <span className="pp-field">Ulice a číslo</span>
      <span className="pp-btn">Pokračovat</span>
    </div>
  );
}

export default function CaseExplorer({ examples }) {
  const byId = Object.fromEntries(examples.map((e) => [e.id, e]));
  const cases = CASES.filter((c) => byId[c.id]);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(null);
  const root = useRef(null);
  const c = cases[index];
  const ex = byId[c.id];
  const r = ex.result;
  const isPage = ex.kind === 'page';

  const flags = r.red_flags.slice(0, 3);
  const segments = useMemo(() => segment(ex.text || '', flags), [ex.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const sFlag = senderFlag(flags);
  const addrMarked = isPage && linkFlagged(ex);

  useGSAP(
    () => {
      const marks = gsap.utils.toArray('.case-device .hl');
      if (reduceMotion()) {
        gsap.set(marks, { backgroundSize: '100% 100%' });
        return;
      }
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('.case-content', { y: 18, opacity: 0, duration: 0.5 })
        .to(marks, { backgroundSize: '100% 100%', duration: 0.42, stagger: 0.14, ease: 'power2.inOut' }, '-=0.15')
        .from('.case-device .verdict-card', { y: 22, opacity: 0, duration: 0.5 }, '-=0.25')
        .from('.case-device .stamp', { scale: 1.8, rotation: -16, opacity: 0, duration: 0.4 }, '-=0.3')
        .from('.case-device .reveal', { y: 12, opacity: 0, duration: 0.45, stagger: 0.06 }, '-=0.2');
    },
    { scope: root, dependencies: [ex.id], revertOnUpdate: true }
  );

  const mark = (text, flag, key) => (
    <mark
      key={key}
      className={`hl${active === flag ? ' is-active' : ''}`}
      data-flag={flag}
      onMouseEnter={() => setActive(flag)}
      onMouseLeave={() => setActive(null)}
    >
      {text}
    </mark>
  );

  const body = segments.map((s, i) => (s.flag === null ? <span key={i}>{s.text}</span> : mark(s.text, s.flag, i)));

  const group = (g, label) => (
    <div className="case-group">
      <h3>{label}</h3>
      <div className="case-list">
        {cases.map((k, i) =>
          k.group !== g ? null : (
            <button
              key={k.id}
              type="button"
              className="case-btn"
              aria-pressed={i === index}
              onClick={() => {
                setActive(null);
                setIndex(i);
              }}
            >
              <b>{k.title}</b>
              <span className="case-sit">{k.situation}</span>
              <span className="case-where">{k.where}</span>
            </button>
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="cases" ref={root}>
      <div className="case-stage">
        <div className="device case-device" data-ui aria-label={`Ukázka: ${c.title}`}>
          {isPage ? (
            <div className="addr-bar">
              <span className="win-dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="win-addr">
                {ex.url_in_message ? (
                  addrMarked ? <mark className="hl">{host(ex.url_in_message)}</mark> : host(ex.url_in_message)
                ) : (
                  <span className="muted">adresa stránky nebyla zveřejněna</span>
                )}
              </span>
            </div>
          ) : (
            <div className="device-bar">
              <b>{ex.channel}</b>
              <span className="muted">Od: {ex.sender && sFlag >= 0 ? mark(ex.sender, sFlag, 'sender') : ex.sender || 'neznámé číslo'}</span>
            </div>
          )}

          <div className="case-content">
            {isPage ? (
              ex.text ? <div className="page-body">{body}</div> : <PostForm />
            ) : (
              <div className="thread">
                <p className="bubble">{body}</p>
              </div>
            )}
          </div>

          <div className="verdict-card" aria-live="polite">
            <div className="verdict-head">
              <span className="brand-mini"><Logo />Nenaleť</span>
              <span className="stamp" data-v={r.verdict}><VerdictMark v={r.verdict} />{r.verdict_label}</span>
            </div>
            <p className="verdict-headline reveal">{r.headline}</p>

            {flags.length > 0 ? (
              <ul className="flag-list" aria-label="Proč si to myslíme">
                {flags.map((f, i) => (
                  <li
                    key={i}
                    className={`reveal${active === i ? ' is-active' : ''}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                  >
                    <span className="flag-dot" aria-hidden="true" />
                    <span><b>{f.signal}.</b> {f.explanation}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="flag-list" aria-label="Co působí důvěryhodně">
                {r.reassuring_signs.slice(0, 3).map((t, i) => (
                  <li key={i} className="reveal">
                    <span className="flag-dot" style={{ background: 'var(--ok)' }} aria-hidden="true" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="reveal">
              <p className="mini-h">Co teď udělat</p>
              <ol className="todo-mini">
                {r.what_to_do.slice(0, 2).map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </div>
          </div>
        </div>
        <p className="case-source small muted">
          Skutečný případ, zdroj: <a href={ex.source_url}>{ex.source_name}</a>
        </p>
      </div>

      <div className="case-picker">
        {group('page', 'Stránky')}
        {group('message', 'Zprávy')}
      </div>
    </div>
  );
}
