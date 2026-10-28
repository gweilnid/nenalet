// Kontextové menu (text, odkaz, obrázek, celá stránka) -> výsledek v postranním panelu.
// Panel si požadavek vyzvedne z chrome.storage.session (klíč "nenalet_request").
import { isWebUrl, screenshot, shorten } from "./util.js";

const MENUS = [
  { id: "nenalet-text", title: "Ověřit označený text v Nenaleť", contexts: ["selection"] },
  { id: "nenalet-link", title: "Ověřit odkaz v Nenaleť", contexts: ["link"] },
  { id: "nenalet-image", title: "Ověřit obrázek v Nenaleť (i zda ho vytvořila AI)", contexts: ["image"] },
  { id: "nenalet-page", title: "Ověřit tuto stránku v Nenaleť", contexts: ["page", "frame", "video"] },
];

function setup() {
  chrome.contextMenus.removeAll(() => MENUS.forEach((m) => chrome.contextMenus.create(m)));
  // Klik na ikonu rozšíření otevře postranní panel.
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.warn);
}
chrome.runtime.onInstalled.addListener(setup);
chrome.runtime.onStartup.addListener(setup);

async function submit(windowId, payload, label) {
  await chrome.storage.session.set({
    nenalet_request: { id: crypto.randomUUID(), windowId, payload, label, ts: Date.now() },
  });
}

async function handleMenu(info, tab) {
  const windowId = tab?.windowId;
  if (info.menuItemId === "nenalet-text") {
    await submit(windowId, { text: info.selectionText || "" }, `Označený text: „${shorten(info.selectionText)}“`);
  } else if (info.menuItemId === "nenalet-link") {
    await submit(windowId, { url: info.linkUrl, text: info.selectionText || null }, `Odkaz: ${shorten(info.linkUrl)}`);
  } else {
    const shot = await screenshot(windowId);
    const pageUrl = isWebUrl(info.pageUrl || tab?.url) ? info.pageUrl || tab.url : null;
    // U obrázku pošleme i jeho adresu: server stáhne originál a hledá v něm podpis původu (C2PA)
    // a vodoznak SynthID, které se snímkem obrazovky ztrácejí.
    const imageUrl = info.menuItemId === "nenalet-image" && isWebUrl(info.srcUrl) ? info.srcUrl : null;
    await submit(
      windowId,
      {
        url: pageUrl,
        image_base64: shot,
        image_url: imageUrl,
        text: imageUrl ? "Uživatel chce ověřit tento obrázek na stránce (je na snímku obrazovky)." : null,
      },
      imageUrl ? `Obrázek na stránce ${shorten(pageUrl || "", 60)}` : `Stránka: ${shorten(pageUrl || "aktuální stránka")}`
    );
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Panel je nutné otevřít hned - Chrome to dovolí jen jako přímou reakci na klik uživatele.
  if (tab?.windowId != null) chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.warn);
  handleMenu(info, tab).catch(console.error);
});
