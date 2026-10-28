import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import CountUp from './reactbits/CountUp.jsx';
import SplitText from './reactbits/SplitText.jsx';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CAUGHT = 69; // zachycené podvody z testové sady (eval/results)

/** Druhá obrazovka: výsledky měření. Žlutá plocha se při příjezdu roztáhne, tečky = jednotlivé zachycené podvody. */
export default function ProofSection() {
  const root = useRef(null);

  useGSAP(
    () => {
      const dots = gsap.utils.toArray('.proof-dot');
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(dots, { backgroundColor: '#0d2a1c', scale: 1 });
        return;
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
      gsap
        .timeline({ scrollTrigger: { trigger: '.proof-figures', start: 'top 85%', once: true } })
        .from('.proof-lead', { y: 24, opacity: 0, duration: 0.6, ease: 'expo.out' })
        .from('.figure', { y: 48, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'expo.out' }, 0.1)
        .to(dots, { backgroundColor: '#0d2a1c', scale: 1, duration: 0.3, ease: 'back.out(3)', stagger: 0.02 }, 0.35)
        .from('.proof-foot > *', { y: 20, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'expo.out' }, '-=0.5');
    },
    { scope: root }
  );

  return (
    <section id="presnost" className="proof frame" aria-labelledby="proof-h" ref={root}>
      <div className="grid">
        <SplitText
          text="Změřeno na skutečných zprávách"
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
          Nenaleť jsme otestovali na 107 zprávách: 69 skutečných podvodů z varování policie, bank, dopravců a médií a 38 legitimních zpráv.
        </p>
        <div className="proof-figures">
          <div className="figure">
            <span className="figure-num"><CountUp to={CAUGHT} duration={1.6} /> z 69</span>
            <p className="figure-text">podvodů Nenaleť zachytil</p>
            <div className="proof-dots" role="img" aria-label="69 teček, každá je jeden zachycený podvod z testu">
              {Array.from({ length: CAUGHT }, (_, i) => <i key={i} className="proof-dot" />)}
            </div>
            <p className="proof-dots-note">Každá tečka je jeden skutečný podvod z testu.</p>
          </div>
          <div className="figure">
            <span className="figure-num"><CountUp to={11} duration={1.2} /> s</span>
            <p className="figure-text">trvá jedna kontrola (medián)</p>
          </div>
        </div>
        <div className="proof-foot">
          <p>Instrukce pro model vznikly dřív než testová sada a podle výsledků jsme je neladili.</p>
          <a className="btn btn-ink" href="metodika">Celá metodika i s chybami</a>
        </div>
      </div>
    </section>
  );
}
