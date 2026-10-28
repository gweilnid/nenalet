import { Logo } from './Icons.jsx';

export default function Nav({ home = './' }) {
  return (
    <header className="frame">
      <nav className="nav" aria-label="Hlavní navigace">
        <a className="wordmark" href={home} aria-label="Nenaleť – úvod">
          <Logo />
          <span>Nenaleť</span>
        </a>
        <div className="nav-links">
          <a className="hide-sm" href={`${home}#jak`}>Jak to funguje</a>
          <a className="hide-sm" href="metodika">Přesnost</a>
          <a className="btn btn-primary" href="zkratka">Přidat do iPhonu</a>
        </div>
      </nav>
    </header>
  );
}
