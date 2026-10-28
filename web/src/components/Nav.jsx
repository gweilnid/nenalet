import { Logo } from './Icons.jsx';
import { FP_QUERY } from './Panel.jsx';
import { useLang } from '../lib/lang.jsx';

/** Po stažení zipu ukáže návod k instalaci rozšíření (na úvodu sloupec Chrome, jinde úvod s návodem). */
function showChromeSteps(home) {
  const sec = document.getElementById('instalace');
  if (!sec) {
    // Stahování už běží, stránka může přejít na návod.
    setTimeout(() => { window.location.href = `${home}#instalace`; }, 700);
    return;
  }
  const fp = window.matchMedia(FP_QUERY).matches;
  // Na počítači po obrazovkách je návod pro Chrome až třetí krok sekce, jinak stačí doskrolovat k jeho sloupci.
  const target = (fp && sec.querySelector('.snap-mark[data-k="3"]')) || sec.querySelector('.install-col:last-child') || sec;
  const y = target.getBoundingClientRect().top + window.scrollY - (fp ? 0 : 16);
  window.scrollTo({ top: y, behavior: fp ? 'instant' : 'smooth' });
}

export default function Nav({ home = './' }) {
  const { t, lang, setLang } = useLang();
  const other = lang === 'cs' ? 'en' : 'cs';
  return (
    <header className="frame">
      <nav className="nav" aria-label={t({ cs: 'Hlavní navigace', en: 'Main navigation' })}>
        <a className="wordmark" href={home} aria-label={t({ cs: 'Nenaleť – úvod', en: 'Nenaleť – home' })}>
          <Logo />
          <span>Nenaleť</span>
        </a>
        <div className="nav-links">
          <a className="hide-lg" href={`${home}#jak`}>{t({ cs: 'Jak to funguje', en: 'How it works' })}</a>
          <a className="hide-md" href="metodika">{t({ cs: 'Přesnost', en: 'Accuracy' })}</a>
          <a className="nav-video" href="video.mp4" target="_blank" rel="noopener" aria-label={t({ cs: 'Otevřít video (38 s)', en: 'Watch the video (38 s)' })}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>
            <span>{t({ cs: 'Otevřít video', en: 'Watch the video' })}</span>
          </a>
          <button type="button" className="nav-lang" onClick={() => setLang(other)} lang={other}
            aria-label={other === 'en' ? 'Switch to English' : 'Přepnout do češtiny'}>
            {other.toUpperCase()}
          </button>
          <a className="btn btn-quiet hide-sm" href="nenalet-chrome.zip" download onClick={() => showChromeSteps(home)}>
            {t({ cs: 'Stáhnout do Chromu', en: 'Get it for Chrome' })}
          </a>
          <a className="btn btn-primary" href="zkratka">{t({ cs: 'Přidat do iPhonu', en: 'Add to iPhone' })}</a>
        </div>
      </nav>
    </header>
  );
}
