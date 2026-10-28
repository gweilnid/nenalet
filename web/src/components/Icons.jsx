import logoUrl from '../assets/logo.webp';

/** Logo Nenaleť: axolotl (vygenerováno skillem ip-as-logo, brand/nenalet-axolotl.png). */
export function Logo({ className = '' }) {
  return <img className={`logo-img ${className}`.trim()} src={logoUrl} alt="" width="64" height="64" decoding="async" />;
}

/** Značka verdiktu kreslená v kódu (místo emoji). */
export function VerdictMark({ v }) {
  if (v === 'podvod')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" fill="currentColor" />
        <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  if (v === 'podezrele')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5l10.5 19h-21z" fill="currentColor" />
        <path d="M12 9v5.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="12" cy="18" r="1.4" fill="#fff" />
      </svg>
    );
  if (v === 'bez_varovnych_signalu')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="currentColor" />
        <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">?</text>
    </svg>
  );
}

export const STATUS_MARK = { ok: '✓', info: 'i', varovani: '!', nebezpeci: '✕' };
