import { useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Logo, VerdictMark } from './Icons.jsx';
import { segment, senderFlag } from '../lib/highlight.js';

gsap.registerPlugin(useGSAP);

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Živá ukázka: skutečná zpráva, vyznačené varovné signály a razítko s verdiktem. */
export default function HeroDemo({ examples }) {
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(null);
  const device = useRef(null);
  const ex = examples[index];
  const r = ex.result;

  const flags = r.red_flags.slice(0, 3);
  const segments = useMemo(() => segment(ex.text || '', flags), [ex.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const sFlag = senderFlag(flags);
  const facts = r.checks.filter((c) => c.status === 'nebezpeci' || c.status === 'varovani').slice(0, 1);

  useGSAP(
    () => {
      const marks = gsap.utils.toArray('.hl');
      if (reduceMotion()) {
        gsap.set(marks, { backgroundSize: '100% 100%' });
        return;
      }
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('.bubble', { y: 18, opacity: 0, duration: 0.5 })
        .to(marks, { backgroundSize: '100% 100%', duration: 0.42, stagger: 0.14, ease: 'power2.inOut' }, '-=0.15')
        .from('.verdict-card', { y: 22, opacity: 0, duration: 0.5 }, '-=0.25')
        .from('.stamp', { scale: 1.8, rotation: -16, opacity: 0, duration: 0.4 }, '-=0.3')
        .from('.verdict-card .reveal', { y: 12, opacity: 0, duration: 0.45, stagger: 0.06 }, '-=0.2');
    },
    { scope: device, dependencies: [ex.id], revertOnUpdate: true }
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

  return (
    <>
    <div className="hero-stage">
      <div className="device" data-ui ref={device} aria-label="Ukázka: jak Nenaleť posoudil skutečnou zprávu">
        <div className="device-bar">
          <b>{ex.channel}</b>
          <span className="muted">skutečná zpráva · zdroj {ex.source_name}</span>
        </div>
        <div className="thread">
          {ex.sender && (
            <p className="thread-sender">
              Od: {sFlag >= 0 ? mark(ex.sender, sFlag, 'sender') : ex.sender}
            </p>
          )}
          <p className="bubble">
            {segments.map((s, i) => (s.flag === null ? <span key={i}>{s.text}</span> : mark(s.text, s.flag, i)))}
          </p>
        </div>

        <div className="verdict-card" aria-live="polite">
          <div className="verdict-head">
            <span className="brand-mini">
              <Logo />
              Nenaleť
            </span>
            <span className="stamp" data-v={r.verdict}>
              <VerdictMark v={r.verdict} />
              {r.verdict_label}
            </span>
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
                  <span>
                    <b>{f.signal}.</b> {f.explanation}
                  </span>
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
              {r.what_to_do.slice(0, 2).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </div>

          {facts.length > 0 && (
            <div className="facts-mini reveal">
              {facts.map((c, i) => (
                <p key={i}>
                  <b>Ověřeno:</b> {c.detail}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

      <div className="switcher hero-switcher">
        <p className="switcher-label" id="switcher-label">Vyzkoušejte další skutečné zprávy</p>
        <div className="switcher-list" role="group" aria-labelledby="switcher-label">
          {examples.map((e, i) => (
            <button
              key={e.id}
              type="button"
              className="chip"
              aria-pressed={i === index}
              onClick={() => {
                setActive(null);
                setIndex(i);
              }}
            >
              {e.title}
              {e.label === 'legit' && <span className="kind"> · legitimní</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
