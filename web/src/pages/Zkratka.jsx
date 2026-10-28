import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';

const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

export default function Zkratka() {
  const [download, setDownload] = useState('zkratka/stahnout');
  useEffect(() => {
    fetch('api/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => c?.shortcut_url && setDownload(c.shortcut_url))
      .catch(() => {});
  }, []);
  const qr = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(window.location.href.split('#')[0]);
    q.make();
    return q.createDataURL(6, 2);
  }, []);

  return (
    <>
      <Nav home="./" />
      <main className="frame">
        <header className="page-head">
          <h1>Nenaleť v iPhonu</h1>
          <p className="lead">
            Zkratka přidá Nenaleť do nabídky Sdílet. Podezřelou zprávu, odkaz nebo snímek obrazovky ověříte jedním klepnutím, nic nemusíte kopírovat.
          </p>
        </header>

        <div className="two-col">
          <section aria-labelledby="add-h" style={{ display: 'grid', gap: 20 }}>
            <h2 id="add-h" style={{ fontSize: 'clamp(1.9rem, 3.2vw, 3rem)' }}>Přidejte si zkratku</h2>
            <ol style={{ margin: 0, paddingLeft: '1.3em', display: 'grid', gap: 10 }}>
              <li>Otevřete tuto stránku <b>na iPhonu v Safari</b>.</li>
              <li>Klepněte na tlačítko níže a potvrďte <b>Stáhnout</b>.</li>
              <li>Otevře se aplikace Zkratky. Klepněte na <b>Přidat zkratku</b>.</li>
            </ol>
            <div className="actions">
              <a className="btn btn-primary" href={download}>Stáhnout zkratku Nenaleť</a>
            </div>
            <p className="small muted">Zkratka odešle jen to, co jí nasdílíte, a ukáže výsledek. Obsah zpráv neukládáme.</p>
          </section>
          {!isIOS && (
            <section aria-labelledby="qr-h" style={{ display: 'grid', gap: 16 }}>
              <h2 id="qr-h" style={{ fontSize: 'clamp(1.9rem, 3.2vw, 3rem)' }}>Jste na počítači?</h2>
              <p>Namiřte fotoaparát iPhonu na kód a stránka se otevře v telefonu.</p>
              <div className="qr-box"><img src={qr} alt="QR kód s odkazem na tuto stránku" /></div>
            </section>
          )}
        </div>

        <section aria-labelledby="use-h" style={{ marginTop: 'var(--section)' }}>
          <h2 id="use-h" style={{ marginBottom: 40 }}>Jak ji používat</h2>
          <div className="usage">
            <div>
              <h3>Podezřelá SMS nebo WhatsApp</h3>
              <p>Udělejte snímek obrazovky. Klepněte na náhled snímku vlevo dole, pak na Sdílet a vyberte Nenaleť.</p>
            </div>
            <div>
              <h3>Zkopírovaný text</h3>
              <p>Podržte prst na zprávě a zvolte Kopírovat. Pak spusťte zkratku Nenaleť z aplikace Zkratky nebo z plochy. Když jí nic nenasdílíte, vezme si zkopírovaný text.</p>
            </div>
            <div>
              <h3>Webová stránka nebo odkaz</h3>
              <p>V Safari klepněte na Sdílet a vyberte Nenaleť. Odkaz v e-mailu podržte prstem, zvolte Sdílet a pak Nenaleť.</p>
            </div>
            <div>
              <h3>Nevidíte Nenaleť v nabídce?</h3>
              <p>V nabídce Sdílet sjeďte úplně dolů, klepněte na Upravit akce a Nenaleť přidejte mezi oblíbené.</p>
            </div>
          </div>
        </section>
      </main>
      <div style={{ height: 'var(--section)' }} />
      <Footer />
    </>
  );
}
