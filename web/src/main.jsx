import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import Home from './pages/Home.jsx';
import Metodika from './pages/Metodika.jsx';
import Zkratka from './pages/Zkratka.jsx';
import { LangProvider } from './lib/lang.jsx';

// Web běží pod /nenalet/ - stránku vybereme podle konce cesty.
const path = window.location.pathname.replace(/\/+$/, '');
const Page = path.endsWith('/metodika') ? Metodika : path.endsWith('/zkratka') ? Zkratka : Home;
const TITLES =
  Page === Metodika
    ? { cs: 'Metodika a přesnost – Nenaleť', en: 'Method and accuracy – Nenaleť' }
    : Page === Zkratka
      ? { cs: 'Zkratka pro iPhone – Nenaleť', en: 'iPhone shortcut – Nenaleť' }
      : { cs: 'Nenaleť – ověřte zprávu i web, než naletíte', en: 'Nenaleť – check it before you fall for it' };

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider titles={TITLES}>
      <Page />
    </LangProvider>
  </StrictMode>
);
