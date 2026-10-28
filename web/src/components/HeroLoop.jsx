import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Logo, VerdictMark } from './Icons.jsx';

gsap.registerPlugin(useGSAP);

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Texty jsou doslovně ze skutečných případů v testové sadě (zdroje v examples.json).
function PplSms({ ex }) {
  const url = ex.url_in_message;
  const [before] = ex.text.split(url);
  return (
    <div className="phone loop-object" data-ui>
      <div className="phone-head"><b>{ex.sender}</b><small>Textová zpráva</small></div>
      <div className="phone-body">
        <p className="bubble">
          {before.trim()}{' '}
          <mark className="loop-hl">{url}</mark>
        </p>
      </div>
    </div>
  );
}

function RealSms({ ex }) {
  return (
    <div className="phone loop-object" data-ui>
      <div className="phone-head"><b>{ex.sender}</b><small>Textová zpráva</small></div>
      <div className="phone-body">
        <p className="bubble">{ex.text}</p>
      </div>
    </div>
  );
}

function ShopPage() {
  return (
    <div className="win loop-object" data-ui>
      <div className="win-bar">
        <span className="win-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="win-addr"><mark className="loop-hl">simonasperky.cz</mark></span>
      </div>
      <div className="shop">
        <p className="shop-top">UKONČENÍ SBÍRKY VÝPRODEJ!</p>
        <p className="shop-big"><mark className="loop-hl">75% SLEVA</mark></p>
        <p className="shop-top">DOPRAVA ZDARMA NAD 746 KČ</p>
        <span className="shop-btn">NAKUPOVAT NYNÍ</span>
        <p className="shop-story">S lítostí vám musím oznámit, že moje sbírka bude brzy uzavřena…</p>
      </div>
    </div>
  );
}

function PostPage() {
  return (
    <div className="phone phone-web loop-object" data-ui>
      <div className="phone-addr"><mark className="loop-hl">ceskapostacz.com.cn</mark></div>
      <div className="phone-page">
        <p className="pp-title">Potvrďte svou adresu</p>
        <p className="pp-text">Balíček dorazil do skladu, ale nemohl být doručen z důvodu neúplných údajů o adrese.</p>
        <span className="pp-field">Jméno a příjmení</span>
        <span className="pp-field">Ulice a číslo</span>
        <span className="pp-field">PSČ a obec</span>
        <span className="pp-btn">Pokračovat</span>
      </div>
    </div>
  );
}

const SCENES = [
  { id: 'scam-037', tab: 'SMS od „PPL“', View: PplSms },
  { id: 'scam-047', tab: 'E-shop v počítači', View: ShopPage },
  { id: 'page-ceskaposta', tab: '„Česká pošta“ v mobilu', View: PostPage },
  { id: 'legit-005', tab: 'Pravá SMS', View: RealSms },
];

/** Úvodní smyčka: skutečné zprávy i stránky, zvýrazňovač a razítko s verdiktem. */
export default function HeroLoop({ examples }) {
  const byId = Object.fromEntries(examples.map((e) => [e.id, e]));
  const scenes = SCENES.filter((s) => byId[s.id]);
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const auto = useRef(true);
  const visible = useRef(true);
  const tlRef = useRef(null);
  const stage = useRef(null);
  const scene = scenes[index];
  const ex = byId[scene.id];
  const r = ex.result;

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
        gsap.set('.loop-hl', { backgroundSize: '100% 100%' });
        return;
      }
      const tl = gsap.timeline({
        paused: !visible.current,
        onComplete: () => auto.current && setIndex((i) => (i + 1) % scenes.length),
      });
      tl.from('.loop-object', { y: 48, opacity: 0, scale: 0.96, duration: 0.9, ease: 'expo.out' })
        .to('.loop-hl', { backgroundSize: '100% 100%', duration: 0.5, stagger: 0.18, ease: 'power2.inOut' }, 0.75)
        .from('.loop-verdict', { y: 36, opacity: 0, duration: 0.7, ease: 'expo.out' }, 1.35)
        .from('.loop-stamp', { scale: 1.9, rotation: -18, opacity: 0, duration: 0.5, ease: 'back.out(2.2)' }, 1.6)
        .from('.loop-headline', { y: 10, opacity: 0, duration: 0.45, ease: 'expo.out' }, 1.85);
      // Po kliknutí na ukázku smyčka skončí a výsledek zůstane na místě.
      if (auto.current) {
        tl.to({}, { duration: 2.6 }).to(['.loop-object', '.loop-verdict'], { y: -28, opacity: 0, duration: 0.45, ease: 'power2.in', stagger: 0.05 });
      }
      tlRef.current = tl;
    },
    { scope: stage, dependencies: [index, run], revertOnUpdate: true }
  );

  return (
    <div className="hero-loop">
      <div className="loop-stage" ref={stage}>
        <div className="loop-tabs" role="group" aria-label="Ukázky v úvodu">
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
              {s.tab}
            </button>
          ))}
        </div>
        <div className="loop-scene" key={scene.id} aria-label={`Ukázka: ${scene.tab}. Nenaleť: ${r.verdict_label}.`}>
          <scene.View ex={ex} />
          <div className="loop-verdict" data-ui>
            <span className="brand-mini"><Logo />Nenaleť</span>
            <span className="stamp loop-stamp" data-v={r.verdict}><VerdictMark v={r.verdict} />{r.verdict_label}</span>
            <p className="loop-headline">{r.headline}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
