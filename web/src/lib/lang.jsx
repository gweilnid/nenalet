import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import EN_EXAMPLES from '../data/examples.en.json';

// Čeština je výchozí (soutěž i uživatelé jsou čeští), angličtina po přepnutí.
// Volba se ukládá do localStorage 'site-lang', stejně jako na yasinsezgin.dev, takže platí na celém webu.
const KEY = 'site-lang';
const LangContext = createContext({ lang: 'cs', setLang: () => {} });

function initialLang() {
  try {
    if (localStorage.getItem(KEY) === 'en') return 'en';
  } catch {}
  return 'cs';
}

export function LangProvider({ titles, children }) {
  const [lang, set] = useState(initialLang);
  useEffect(() => {
    document.documentElement.lang = lang;
    if (titles) document.title = titles[lang];
  }, [lang, titles]);
  const setLang = useCallback((l) => {
    set(l);
    try { localStorage.setItem(KEY, l); } catch {}
  }, []);
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

/** t({ cs, en }) vrátí text v aktuálním jazyce; chybí-li anglický, použije český. */
export function useLang() {
  const { lang, setLang } = useContext(LangContext);
  const t = useCallback((o) => (typeof o === 'string' ? o : o[lang] ?? o.cs), [lang]);
  return { lang, setLang, t };
}

// Verdikty Nenaleť odpovídají česky; anglický název slouží jen pro popisky a čtečky obrazovky.
export const VERDICT_EN = {
  podvod: 'Almost certainly a scam',
  podezrele: 'Suspicious',
  bez_varovnych_signalu: 'No warning signs found',
};

/** Ukázky v aktuálním jazyce: v angličtině přeložené texty (data/examples.en.json), jinak beze změny. */
export function useExamples(examples) {
  const { lang } = useLang();
  return useMemo(() => {
    if (lang !== 'en') return examples;
    return examples.map((ex) => {
      const en = EN_EXAMPLES[ex.id];
      if (!en) return ex;
      return { ...ex, ...en, result: { ...ex.result, ...en.result } };
    });
  }, [examples, lang]);
}
