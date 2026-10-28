import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import CountUp from './reactbits/CountUp.jsx';
import SplitText from './reactbits/SplitText.jsx';
import { NOT_FP_QUERY, Panel, usePanelStep } from './Panel.jsx';
import { useLang } from '../lib/lang.jsx';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CAUGHT = 69; // zachycené podvody z testové sady (eval/results)
const INK = '#0d2a1c';

/** Druhá obrazovka: výsledky měření. Žlutá plocha se při příjezdu roztáhne, tečky = jednotlivé zachycené podvody. */
export default function ProofSection() {
  const { t, lang } = useLang();
  const root = useRef(null);
  const step = usePanelStep(root); // Infinity = obyčejná stránka
  const fp = step !== Infinity;

  useGSAP(
    () => {
      const dots = gsap.utils.toArray('.proof-dot');
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(dots, { backgroundColor: INK, scale: 1 });
        return undefined;
      }
      // Žlutá plocha přijede jako karta a při skrolování se roztáhne přes celou šířku.
      gsap.fromTo(
        root.current,
        { clipPath: 'inset(0% 3.5% 0% 3.5% round 32px)' },
        {
          clipPath: 'inset(0% 0% 0% 0% round 0px)',
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 20%', scrub: true },
        }
      );
      // Obyčejná stránka: obsah přijede, když na něj člověk doskroluje.
      const mm = gsap.matchMedia();
      mm.add(NOT_FP_QUERY, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: '.proof-figures', start: 'top 85%', once: true } })
          .from('.proof-lead', { y: 24, opacity: 0, duration: 0.6, ease: 'expo.out' })
          .from('.figure', { y: 48, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'expo.out' }, 0.1)
          .to(dots, { backgroundColor: INK, scale: 1, duration: 0.3, ease: 'back.out(3)', stagger: 0.02 }, 0.35)
          .from('.proof-foot > *', { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'expo.out' }, '-=0.5');
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  // Celoobrazovkový režim: tečky se plní, když se ukáže „69 z 69“ (krok 2), a při návratu se vyprázdní.
  useEffect(() => {
    if (!fp || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const dots = root.current?.querySelectorAll('.proof-dot');
    if (!dots?.length) return;
    gsap.killTweensOf(dots);
    if (step >= 2) gsap.to(dots, { backgroundColor: INK, scale: 1, duration: 0.3, ease: 'back.out(3)', stagger: 0.02, delay: 0.25 });
    else gsap.set(dots, { backgroundColor: 'rgba(13, 42, 28, 0)', scale: 0.8 });
  }, [fp, step]);

  return (
    <Panel id="presnost" className="proof" steps={3} labelledBy="proof-h" sectionRef={root}>
      <div className="grid">
        <div className="proof-top" data-step="1">
          <SplitText
            key={lang}
            text={t({ cs: 'Změřeno na skutečných zprávách', en: 'Measured on real messages' })}
            tag="h2"
            className="proof-h"
            textAlign="left"
            splitType="words"
            mask
            delay={60}
            duration={0.9}
            ease="expo.out"
          />
          <p className="proof-lead">
            {t({
              cs: 'Nenaleť jsme otestovali na 107 zprávách: 69 skutečných podvodů z varování policie, bank, dopravců a médií a 38 legitimních zpráv.',
              en: 'We tested Nenaleť on 107 messages: 69 real scams from warnings by the police, banks, couriers and the media, and 38 legitimate messages.',
            })}
          </p>
        </div>
        <div className="proof-figures">
          <div className="figure" data-step="2">
            <span className="figure-num"><CountUp to={CAUGHT} duration={1.6} startWhen={!fp || step >= 2} /> {t({ cs: 'z', en: 'of' })} 69</span>
            <p className="figure-text">{t({ cs: 'podvodů Nenaleť zachytil', en: 'scams caught by Nenaleť' })}</p>
            <div className="proof-dots" role="img" aria-label={t({ cs: '69 teček, každá je jeden zachycený podvod z testu', en: '69 dots, each one a scam caught in the test' })}>
              {Array.from({ length: CAUGHT }, (_, i) => <i key={i} className="proof-dot" />)}
            </div>
            <p className="proof-dots-note">{t({ cs: 'Každá tečka je jeden skutečný podvod z testu.', en: 'Each dot is one real scam from the test.' })}</p>
          </div>
          <div className="figure" data-step="3">
            <span className="figure-num"><CountUp to={11} duration={1.2} startWhen={!fp || step >= 3} /> s</span>
            <p className="figure-text">{t({ cs: 'trvá jedna kontrola (medián)', en: 'per check (median)' })}</p>
          </div>
        </div>
        <div className="proof-foot" data-step="3">
          <p>{t({ cs: 'Instrukce pro model vznikly dřív než testová sada a podle výsledků jsme je neladili.', en: 'The model’s instructions were written before the test set, and we didn’t tune them to the results.' })}</p>
          <a className="btn btn-ink" href="metodika">{t({ cs: 'Celá metodika i s chybami', en: 'The full method, mistakes included' })}</a>
        </div>
      </div>
    </Panel>
  );
}
