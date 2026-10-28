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
 * Krokování: jedno gesto (kolečko, touchpad, klávesa) = jeden krok dolů, nebo rovnou předchozí sekce nahoru.
 * Dojezd touchpadu se nepočítá jako nové gesto; nové gesto začne až po krátké pauze v událostech kolečka.
 */
function stepper(panels) {
  const points = () => {
    const marks = panels.flatMap((p) => [...p.querySelectorAll(':scope > .snap-mark')]);
    const ys = [0, ...marks.map((m) => Math.round(m.getBoundingClientRect().top + window.scrollY))];
    ys.push(Math.round(document.documentElement.scrollHeight - window.innerHeight)); // patička
    return [...new Set(ys)].sort((a, b) => a - b);
  };
  let busy = false;
  let last = 0;
  let acc = 0;
  let used = false;
  // Začátek a poslední krok každé sekce s kroky (úvod kroky nemá).
  const sections = () =>
    panels
      .map((p) => [...p.querySelectorAll(':scope > .snap-mark')].map((m) => Math.round(m.getBoundingClientRect().top + window.scrollY)))
      .filter((ys) => ys.length)
      .map((ys) => ({ first: ys[0], last: ys[ys.length - 1] }));
  const go = (dir) => {
    const y = window.scrollY;
    let target;
    if (dir > 0) {
      // Dolů: další krok (nebo další sekce).
      target = points().find((p) => p > y + 4);
    } else {
      // Nahoru: rovnou na předchozí sekci, celou (kroky se při návratu neschovávají).
      const info = sections();
      let i = -1;
      info.forEach((sec, idx) => { if (sec.first <= y + 4) i = idx; });
      if (i === -1) target = 0;
      else if (y > info[i].last + 4) target = info[i].last; // z patičky na poslední sekci
      else target = i === 0 ? 0 : info[i - 1].last;
      if (target >= y - 4) target = undefined;
    }
    if (target === undefined) return;
    busy = true;
    gsap.to(window, { scrollTo: { y: target, autoKill: false }, duration: 0.85, ease: 'power3.inOut', onComplete: () => { busy = false; } });
  };
  const onWheel = (e) => {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return; // zoom, vodorovné skrolování
    const now = performance.now();
    const gap = now - last;
    last = now;
    if (innerScrolls(e.target, e.deltaY, null)) return;
    e.preventDefault();
    if (gap > 140) { acc = 0; used = false; } // nové gesto
    acc += e.deltaY;
    if (busy || used || Math.abs(acc) < 24) return;
    used = true;
    go(Math.sign(acc));
  };
  const onKey = (e) => {
    const t = e.target;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || t.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    const down = ['PageDown', 'ArrowDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey && t.tagName !== 'BUTTON' && t.tagName !== 'A');
    const up = ['PageUp', 'ArrowUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
    if (!down && !up) return;
    e.preventDefault();
    if (!busy) go(down ? 1 : -1);
  };
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  return () => {
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
          onEnterBack: () => setStep(panel, n),
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
