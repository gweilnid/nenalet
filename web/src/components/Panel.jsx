import { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/**
 * Celoobrazovkové sekce: na počítači s dost vysokým oknem je každá sekce přesně jedna obrazovka.
 * Skrolování nejdřív postupně odkryje obsah sekce (kroky), pak se stránka přichytí na další sekci.
 * Na telefonu, v nízkém okně a při omezení pohybu je stránka obyčejná (vše vidět, normální skrolování).
 */
export const FP_QUERY = '(min-width: 1080px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)';
export const NOT_FP_QUERY = `not all and ${FP_QUERY}`;

export function Panel({ id, className = '', steps = 1, labelledBy, sectionRef, children, marks = true }) {
  return (
    <section
      id={id}
      ref={sectionRef}
      className={`panel frame ${className}`}
      aria-labelledby={labelledBy}
      data-steps={steps}
      style={{ '--steps': steps }}
    >
      <div className="panel-inner">
        <div className="panel-fit">{children}</div>
      </div>
      {marks && Array.from({ length: steps }, (_, k) => (
        <i key={k} className="snap-mark" data-k={k + 1} aria-hidden="true" style={{ top: `calc(${k} * 100svh)` }} />
      ))}
    </section>
  );
}

/** Aktuální krok sekce (Infinity = celoobrazovkový režim je vypnutý a vše je vidět). */
export function usePanelStep(ref) {
  const [step, setStep] = useState(Infinity);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const mq = window.matchMedia(FP_QUERY);
    const onStep = (e) => setStep(e.detail);
    const onMq = () => setStep(mq.matches ? Number(el.dataset.at || 0) : Infinity);
    onMq();
    el.addEventListener('panelstep', onStep);
    mq.addEventListener('change', onMq);
    return () => {
      el.removeEventListener('panelstep', onStep);
      mq.removeEventListener('change', onMq);
    };
  }, [ref]);
  return step;
}

function setStep(panel, k) {
  for (let i = 1; i <= 6; i++) panel.classList.toggle(`s${i}`, i <= k);
  if (panel.dataset.at !== String(k)) {
    panel.dataset.at = String(k);
    panel.dispatchEvent(new CustomEvent('panelstep', { detail: k }));
  }
}

/** Zmenší obsah sekce, když se do obrazovky nevejde (nízké okno). */
function fitPanels(panels) {
  panels.forEach((panel) => {
    const inner = panel.querySelector('.panel-inner');
    const box = panel.querySelector('.panel-fit');
    if (!inner || !box) return;
    box.style.transform = '';
    const cs = getComputedStyle(inner);
    const avail = inner.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.min(1, avail / box.offsetHeight);
    box.style.transform = s < 0.995 ? `scale(${s.toFixed(4)})` : '';
  });
}

/** Může prvek pod kurzorem sám skrolovat tímto směrem (text stránky v ukázce apod.)? */
function innerScrolls(target, dy, stop) {
  for (let el = target; el && el !== stop && el !== document.body; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
      if (dy < 0 && el.scrollTop > 0) return true;
    }
  }
  return false;
}

/**
 * Krokování kolečkem, touchpadem a klávesami.
 * Dolů: jedno gesto = jeden krok (nebo další sekce), rychlé švihnutí během animace se zařadí do fronty.
 * Nahoru: rovnou celé předchozí sekce. Delší nebo opakované švihnutí jich přeskočí víc, jako při běžném skrolování.
 */
function stepper(panels) {
  const top = (el) => Math.round(el.getBoundingClientRect().top + window.scrollY);
  const marksOf = (p) => [...p.querySelectorAll(':scope > .snap-mark')].map(top);
  const points = () => {
    const ys = [0, ...panels.flatMap(marksOf), Math.round(document.documentElement.scrollHeight - window.innerHeight)]; // + patička
    return [...new Set(ys)].sort((a, b) => a - b);
  };
  // Začátek a poslední krok každé sekce s kroky (úvod kroky nemá).
  const sections = () => panels.map(marksOf).filter((ys) => ys.length).map((ys) => ({ first: ys[0], last: ys[ys.length - 1] }));

  const SPEED = 0.4; // s na jednu sekci, když se přeskakuje víc sekcí za sebou
  let tween = null;
  let moving = 0; // 1 = jede dolů, -1 = jede nahoru
  let queueDown = false;
  let queueUp = 0; // kolik sekcí nahoru ještě zbývá
  let flowing = false; // běžící skok nahoru skončí v pohybu a naváže na něj další

  const run = (y, duration, ease, done) => {
    tween?.kill();
    tween = gsap.to(window, { scrollTo: { y, autoKill: false }, duration, ease, onComplete: () => { tween = null; done(); } });
  };
  const stop = () => {
    tween?.kill();
    tween = null;
    moving = 0;
    queueUp = 0;
    queueDown = false;
    flowing = false;
  };

  const stepDown = () => {
    const target = points().find((p) => p > window.scrollY + 4);
    if (target === undefined) { moving = 0; return; }
    moving = 1;
    run(target, 0.85, 'power3.inOut', () => {
      moving = 0;
      if (queueDown) { queueDown = false; stepDown(); }
    });
  };
  const down = () => {
    if (moving === -1) stop();
    if (moving === 1) queueDown = true;
    else stepDown();
  };

  const hopUp = () => {
    if (queueUp <= 0) { moving = 0; flowing = false; return; }
    const info = sections();
    let y = window.scrollY;
    let i = -1;
    info.forEach((sec, idx) => { if (sec.first <= y + 4) i = idx; });
    let target;
    if (i === -1) target = 0;
    else if (y > info[i].last + 4) target = info[i].last; // z patičky nebo z půlky přechodu na celou sekci
    else {
      // Uvnitř přišpendlené sekce vypadá každá poloha stejně, takže skok na její začátek není vidět
      // a cesta nahoru nemá hluchá místa.
      if (y > info[i].first + 1) {
        window.scrollTo({ top: info[i].first, behavior: 'instant' });
        y = window.scrollY;
      }
      target = i === 0 ? 0 : info[i - 1].last;
    }
    if (target >= y - 4) { stop(); return; }
    queueUp -= 1;
    const more = queueUp > 0;
    const [duration, ease] = flowing ? (more ? [SPEED, 'none'] : [0.8, 'power1.out']) : more ? [0.6, 'power1.in'] : [0.85, 'power3.inOut'];
    flowing = more;
    moving = -1;
    run(target, duration, ease, hopUp);
  };
  const up = (n = 1) => {
    if (moving === 1) stop();
    const was = queueUp;
    queueUp = Math.min(queueUp + n, 20);
    if (moving !== -1) { flowing = false; hopUp(); return; }
    // Běží poslední skok, který měl zabrzdit: místo brzdění plynule pokračovat do další sekce.
    if (was === 0 && !flowing && tween) {
      const target = tween.vars.scrollTo.y;
      flowing = true;
      run(target, Math.max(0.12, (Math.abs(window.scrollY - target) / window.innerHeight) * SPEED), 'none', hopUp);
    }
  };

  // Gesto: souvislá řada událostí kolečka. Dojezd touchpadu plynule slábne; když síla znovu vzroste
  // nebo přijde pauza či opačný směr, je to nové švihnutí.
  let g = null;
  let last = 0;
  const recent = [];
  const onWheel = (e) => {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // zoom, vodorovné skrolování
    const now = performance.now();
    const gap = now - last;
    last = now;
    if (innerScrolls(e.target, e.deltaY, null)) return;
    e.preventDefault();
    const dir = Math.sign(e.deltaY);
    if (!dir) return;
    const a = Math.abs(e.deltaY) * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1);
    recent.push(a);
    if (recent.length > 3) recent.shift();
    const avg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    let fresh = !g || gap > 140 || dir !== g.dir;
    if (!fresh && now - g.t0 > 200 && g.low < g.peak * 0.45 && avg > Math.max(g.low * 2.2, 8)) fresh = true;
    if (fresh) {
      g = { dir, acc: 0, fired: 0, peak: 0, low: Infinity, t0: now };
      recent.length = 0;
      recent.push(a);
    }
    if (a >= g.peak) { g.peak = a; g.low = a; } else if (a < g.low) g.low = a;
    g.acc += a;
    if (g.acc < 24) return;
    if (dir > 0) {
      if (!g.fired) { g.fired = 1; down(); }
    } else {
      // Nahoru jako běžné skrolování: první sekce hned, každá další obrazovka pohybu = další sekce.
      const want = 1 + Math.floor((g.acc - 24) / window.innerHeight);
      if (want > g.fired) { up(want - g.fired); g.fired = want; }
    }
  };
  const onKey = (e) => {
    const t = e.target;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || t.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    const isDown = ['PageDown', 'ArrowDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey && t.tagName !== 'BUTTON' && t.tagName !== 'A');
    const isUp = ['PageUp', 'ArrowUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
    if (!isDown && !isUp) return;
    e.preventDefault();
    if (isDown) down();
    else up();
  };
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  return () => {
    stop();
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
  };
}

/** Zapne celoobrazovkový režim pro všechny .panel uvnitř scope (volat z useGSAP). */
export function setupPanels(scope) {
  const mm = gsap.matchMedia();
  mm.add(FP_QUERY, () => {
    document.documentElement.classList.add('fp');
    const panels = gsap.utils.toArray('.panel', scope);
    panels.forEach((panel) => {
      const marks = panel.querySelectorAll(':scope > .snap-mark');
      if (!marks.length) return;
      const n = marks.length;
      marks.forEach((mark) => {
        const k = Number(mark.dataset.k);
        ScrollTrigger.create({
          trigger: mark,
          start: 'top 55%',
          end: 'bottom 55%',
          // Dolů: odkrývat po krocích. Zpátky nahoru: celá sekce hned, nic se neschovává.
          onEnter: () => setStep(panel, Math.max(k, Number(panel.dataset.at || 0))),
          // Při velkém skoku nahoru (Home, odkaz) přeletí ScrollTrigger i sekce pod cílem; ty zůstanou schované.
          onEnterBack: () => {
            if (panel.getBoundingClientRect().top < window.innerHeight * 0.9) setStep(panel, n);
          },
        });
      });
      // Sekce odjela dolů z obrazovky (člověk je nad ní): příště se kroky přehrají znovu.
      ScrollTrigger.create({ trigger: panel, start: 'top 90%', onLeaveBack: () => setStep(panel, 0) });
    });
    const fit = () => fitPanels(panels);
    fit();
    const ro = new ResizeObserver(fit);
    panels.forEach((p) => p.querySelector('.panel-fit') && ro.observe(p.querySelector('.panel-fit')));
    window.addEventListener('resize', fit);
    document.fonts?.ready.then(fit);
    const stopStepper = stepper(panels);
    return () => {
      stopStepper();
      document.documentElement.classList.remove('fp');
      ro.disconnect();
      window.removeEventListener('resize', fit);
      panels.forEach((p) => {
        for (let i = 1; i <= 6; i++) p.classList.remove(`s${i}`);
        delete p.dataset.at;
        p.dispatchEvent(new CustomEvent('panelstep', { detail: Infinity }));
        const box = p.querySelector('.panel-fit');
        if (box) box.style.transform = '';
      });
    };
  });
  return mm;
}
