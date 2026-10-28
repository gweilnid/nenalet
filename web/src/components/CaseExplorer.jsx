import { useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Logo, VerdictMark } from './Icons.jsx';
import { segment, senderFlag } from '../lib/highlight.js';
import { useLang } from '../lib/lang.jsx';

gsap.registerPlugin(useGSAP);

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Situace jsou skutečné případy z testové sady; výsledky spočítal Nenaleť předem (eval/build_showcase.py).
const PAGE_PC = { cs: 'Stránka v počítači', en: 'Page on a computer' };
const PAGE_PHONE = { cs: 'Stránka v mobilu', en: 'Page on a phone' };
export const CASES = [
  { id: 'scam-047', group: 'page', title: { cs: 'Nedůvěryhodný e-shop', en: 'Untrustworthy online shop' }, where: PAGE_PC, situation: { cs: 'Na Facebooku vám vyskočí výprodej šperků se slevou 75 %.', en: 'A jewellery clearance sale at 75% off pops up on Facebook.' } },
  { id: 'page-ceskaposta', group: 'page', title: { cs: 'Falešná stránka České pošty', en: 'Fake Czech Post page' }, where: PAGE_PHONE, situation: { cs: 'SMS o nedoručeném balíku vás pošle na stránku, kde máte potvrdit adresu.', en: 'A text about an undelivered parcel sends you to a page asking you to confirm your address.' } },
  { id: 'scam-044', group: 'page', title: { cs: 'Peníze za zboží z bazaru', en: 'Payment for something you sold' }, where: PAGE_PHONE, situation: { cs: 'Kupec vám pošle odkaz na „Zásilkovnu“, kde si máte vyzvednout platbu.', en: 'A buyer sends you a link to “Zásilkovna”, a parcel service, where you are supposed to collect the payment.' } },
  { id: 'scam-060', group: 'page', title: { cs: 'Článek o snadné investici', en: 'An article about easy investing' }, where: PAGE_PC, situation: { cs: 'Reklama vás zavede na „zprávu“ o dividendách z ČEZ pro každého.', en: 'An ad takes you to a “news story” about ČEZ dividends for everyone.' } },
  { id: 'scam-025', group: 'message', title: { cs: 'SMS od „banky“', en: 'A text from the “bank”' }, where: { cs: 'SMS', en: 'SMS' }, situation: { cs: 'K vašemu účtu se prý připojilo cizí zařízení a máte ho hned ověřit.', en: 'An unknown device has supposedly connected to your account and you must verify it right away.' } },
  { id: 'scam-061', group: 'message', title: { cs: '„Mami, mám nové číslo“', en: '“Mum, I’ve got a new number”' }, where: { cs: 'Zpráva', en: 'Message' }, situation: { cs: 'Dítě prý má nový telefon a chce, abyste mu napsali na WhatsApp.', en: 'Your child supposedly has a new phone and wants you to message them on WhatsApp.' } },
  { id: 'legit-005', group: 'message', title: { cs: 'Pravá zpráva od dopravce', en: 'A genuine courier message' }, where: { cs: 'SMS', en: 'SMS' }, situation: { cs: 'Nenaleť pozná i skutečnou zprávu a zbytečně nestraší.', en: 'Nenaleť also recognises a genuine message and doesn’t scare you for nothing.' } },
];

const host = (u) => (u || '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();

function linkFlagged(ex) {
  const h = host(ex.url_in_message);
  return !!h && ex.result.checks.some((c) => (c.status === 'nebezpeci' || c.status === 'varovani') && c.name.toLowerCase().includes(h));
}

/** Falešná stránka „České pošty“: rekonstrukce podle popisu v článcích (eval/fake_posta/page.html). */
function PostForm() {
  const { t } = useLang();
  return (
    <div className="post-form">
      <p className="fp-bar">Česká pošta</p>
      <p className="pp-title">{t({ cs: 'Vaše zásilka nemohla být doručena', en: 'Your parcel could not be delivered' })}</p>
      <p>{t({ cs: 'Balíček dorazil do skladu, ale nemohl být doručen z důvodu neúplných údajů o adrese. Potvrďte prosím svou adresu.', en: 'The parcel arrived at our warehouse but could not be delivered because the address details are incomplete. Please confirm your address.' })}</p>
      <span className="pp-field">{t({ cs: 'Jméno a příjmení', en: 'Full name' })}</span>
      <p>{t({ cs: 'Za opětovné doručení je nutné uhradit poplatek. Platbu provedete kartou.', en: 'A fee must be paid for redelivery. You pay by card.' })}</p>
      <span className="pp-field"><mark className="hl">{t({ cs: 'Číslo karty', en: 'Card number' })}</mark></span>
      <span className="pp-field"><mark className="hl">{t({ cs: 'Platnost · CVV', en: 'Expiry · CVV' })}</mark></span>
      <span className="pp-btn">{t({ cs: 'Potvrdit a zaplatit', en: 'Confirm and pay' })}</span>
    </div>
  );
}

export default function CaseExplorer({ examples }) {
  const { t, lang } = useLang();
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
  const segments = useMemo(() => segment(ex.text || '', flags), [ex.id, lang]); // eslint-disable-line react-hooks/exhaustive-deps
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
    { scope: root, dependencies: [ex.id, lang], revertOnUpdate: true }
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
              <b>{t(k.title)}</b>
              <span className="case-sit">{t(k.situation)}</span>
              <span className="case-where">{t(k.where)}</span>
            </button>
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="cases" ref={root}>
      <div className="case-stage">
        <div className="device case-device" data-ui aria-label={`${t({ cs: 'Ukázka', en: 'Example' })}: ${t(c.title)}`}>
          {isPage ? (
            <div className="addr-bar">
              <span className="win-dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="win-addr">
                {ex.url_in_message ? (
                  addrMarked ? <mark className="hl">{host(ex.url_in_message)}</mark> : host(ex.url_in_message)
                ) : (
                  <span className="muted">{t({ cs: 'adresa stránky nebyla zveřejněna', en: 'the page address was not published' })}</span>
                )}
              </span>
            </div>
          ) : (
            <div className="device-bar">
              <b>{ex.channel}</b>
              <span className="muted">{t({ cs: 'Od', en: 'From' })}: {ex.sender && sFlag >= 0 ? mark(ex.sender, sFlag, 'sender') : ex.sender || t({ cs: 'neznámé číslo', en: 'unknown number' })}</span>
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
              <ul className="flag-list" aria-label={t({ cs: 'Proč si to myslíme', en: 'Why we think so' })}>
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
              <ul className="flag-list" aria-label={t({ cs: 'Co působí důvěryhodně', en: 'What looks trustworthy' })}>
                {r.reassuring_signs.slice(0, 3).map((t, i) => (
                  <li key={i} className="reveal">
                    <span className="flag-dot" style={{ background: 'var(--ok)' }} aria-hidden="true" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="reveal">
              <p className="mini-h">{t({ cs: 'Co teď udělat', en: 'What to do now' })}</p>
              <ol className="todo-mini">
                {r.what_to_do.slice(0, 2).map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </div>
          </div>
        </div>
        <p className="case-source small muted">
          {ex.text || !isPage
            ? t({ cs: 'Skutečný případ', en: 'A real case, translated from Czech' })
            : t({ cs: 'Stránka podle popisu v článku, výsledek skutečné kontroly Nenaleť', en: 'Page rebuilt from the article’s description, the result of a real Nenaleť check, translated from Czech' })}
          , {t({ cs: 'zdroj', en: 'source' })}: <a href={ex.source_url}>{ex.source_name}</a>
        </p>
      </div>

      <div className="case-picker">
        {group('page', t({ cs: 'Stránky', en: 'Pages' }))}
        {group('message', t({ cs: 'Zprávy', en: 'Messages' }))}
      </div>
    </div>
  );
}
