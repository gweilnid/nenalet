import { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import Nav from '../components/Nav.jsx';
import Footer from '../components/Footer.jsx';
import { useLang } from '../lib/lang.jsx';

const USAGE = [
  [{ cs: 'Podezřelá SMS nebo WhatsApp', en: 'A suspicious text or WhatsApp message' }, { cs: 'Udělejte snímek obrazovky. Klepněte na náhled snímku vlevo dole, pak na Sdílet a vyberte Nenaleť.', en: 'Take a screenshot. Tap the screenshot preview in the bottom-left corner, then Share, and choose Nenaleť.' }],
  [{ cs: 'Zkopírovaný text', en: 'Copied text' }, { cs: 'Podržte prst na zprávě a zvolte Kopírovat. Pak spusťte zkratku Nenaleť z aplikace Zkratky nebo z plochy. Když jí nic nenasdílíte, vezme si zkopírovaný text.', en: 'Press and hold the message and choose Copy. Then run the Nenaleť shortcut from the Shortcuts app or your home screen. When you don’t share anything with it, it takes the copied text.' }],
  [{ cs: 'Webová stránka nebo odkaz', en: 'A web page or a link' }, { cs: 'V Safari klepněte na Sdílet a vyberte Nenaleť. Odkaz v e-mailu podržte prstem, zvolte Sdílet a pak Nenaleť.', en: 'In Safari, tap Share and choose Nenaleť. For a link in an e-mail, press and hold it, choose Share and then Nenaleť.' }],
  [{ cs: 'Nevidíte Nenaleť v nabídce?', en: 'Don’t see Nenaleť in the menu?' }, { cs: 'V nabídce Sdílet sjeďte úplně dolů, klepněte na Upravit akce a Nenaleť přidejte mezi oblíbené.', en: 'Scroll to the very bottom of the Share menu, tap Edit Actions and add Nenaleť to your favourites.' }],
];

const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

export default function Zkratka() {
  const { t } = useLang();
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
          <h1>{t({ cs: 'Nenaleť v iPhonu', en: 'Nenaleť on your iPhone' })}</h1>
          <p className="lead">
            {t({
              cs: 'Zkratka přidá Nenaleť do nabídky Sdílet. Podezřelou zprávu, odkaz nebo snímek obrazovky ověříte jedním klepnutím, nic nemusíte kopírovat.',
              en: 'The shortcut adds Nenaleť to the Share menu. You check a suspicious message, link or screenshot with one tap, with nothing to copy.',
            })}
          </p>
        </header>

        <div className="two-col">
          <section aria-labelledby="add-h" style={{ display: 'grid', gap: 20 }}>
            <h2 id="add-h" style={{ fontSize: 'clamp(1.9rem, 3.2vw, 3rem)' }}>{t({ cs: 'Přidejte si zkratku', en: 'Add the shortcut' })}</h2>
            <ol style={{ margin: 0, paddingLeft: '1.3em', display: 'grid', gap: 10 }}>
              {t({
                cs: <><li>Otevřete tuto stránku <b>na iPhonu v Safari</b>.</li><li>Klepněte na tlačítko níže a potvrďte <b>Stáhnout</b>.</li><li>Otevře se aplikace Zkratky. Klepněte na <b>Přidat zkratku</b>.</li></>,
                en: <><li>Open this page <b>on your iPhone in Safari</b>.</li><li>Tap the button below and confirm <b>Download</b>.</li><li>The Shortcuts app opens. Tap <b>Add Shortcut</b>.</li></>,
              })}
            </ol>
            <div className="actions">
              <a className="btn btn-primary" href={download}>{t({ cs: 'Stáhnout zkratku Nenaleť', en: 'Download the Nenaleť shortcut' })}</a>
            </div>
            <p className="small muted">{t({
              cs: 'Zkratka odešle jen to, co jí nasdílíte, a ukáže výsledek. Obsah zpráv neukládáme.',
              en: 'The shortcut sends only what you share with it and shows the result, in Czech. We don’t store message content.',
            })}</p>
          </section>
          {!isIOS && (
            <section aria-labelledby="qr-h" style={{ display: 'grid', gap: 16 }}>
              <h2 id="qr-h" style={{ fontSize: 'clamp(1.9rem, 3.2vw, 3rem)' }}>{t({ cs: 'Jste na počítači?', en: 'On a computer?' })}</h2>
              <p>{t({ cs: 'Namiřte fotoaparát iPhonu na kód a stránka se otevře v telefonu.', en: 'Point your iPhone camera at the code and the page opens on your phone.' })}</p>
              <div className="qr-box"><img src={qr} alt={t({ cs: 'QR kód s odkazem na tuto stránku', en: 'QR code linking to this page' })} /></div>
            </section>
          )}
        </div>

        <section aria-labelledby="use-h" style={{ marginTop: 'var(--section)' }}>
          <h2 id="use-h" style={{ marginBottom: 40 }}>{t({ cs: 'Jak ji používat', en: 'How to use it' })}</h2>
          <div className="usage">
            {USAGE.map(([h, p]) => (
              <div key={h.cs}>
                <h3>{t(h)}</h3>
                <p>{t(p)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <div style={{ height: 'var(--section)' }} />
      <Footer />
    </>
  );
}
