import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import Home from './pages/Home.jsx';
import Metodika from './pages/Metodika.jsx';
import Zkratka from './pages/Zkratka.jsx';

// Web běží pod /nenalet/ - stránku vybereme podle konce cesty.
const path = window.location.pathname.replace(/\/+$/, '');
const Page = path.endsWith('/metodika') ? Metodika : path.endsWith('/zkratka') ? Zkratka : Home;
document.title = Page === Metodika ? 'Metodika a přesnost – Nenaleť' : Page === Zkratka ? 'Zkratka pro iPhone – Nenaleť' : document.title;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Page />
  </StrictMode>
);
