// Kontextové menu: text, odkaz, obrázek / celá stránka -> okno s výsledkem.

const MENUS = [
  { id: "nenalet-text", title: "Ověřit označený text v Nenaleť", contexts: ["selection"] },
  { id: "nenalet-link", title: "Ověřit odkaz v Nenaleť", contexts: ["link"] },
  { id: "nenalet-image", title: "Ověřit obrázek v Nenaleť (i zda ho vytvořila AI)", contexts: ["image"] },
  { id: "nenalet-page", title: "Ověřit tuto stránku v Nenaleť", contexts: ["page", "frame", "video"] },
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => MENUS.forEach((m) => chrome.contextMenus.create(m)));
});

function isWebUrl(u) {
  return /^https?:\/\//i.test(u || "");
}

export async function openResult(payload) {
  const id = crypto.randomUUID();
  await chrome.storage.session.set({ [id]: payload });
  await chrome.windows.create({ url: `result.html#${id}`, type: "popup", width: 480, height: 760 });
}

async function screenshot(windowId) {
  try {
    return await chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 80 });
  } catch (e) {
    console.warn("Snímek obrazovky se nepodařil:", e);
    return null;
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "nenalet-text") {
    await openResult({ text: info.selectionText || "" });
  } else if (info.menuItemId === "nenalet-link") {
    await openResult({ url: info.linkUrl, text: info.selectionText || null });
  } else if (info.menuItemId === "nenalet-page" || info.menuItemId === "nenalet-image") {
    const shot = await screenshot(tab?.windowId);
    const pageUrl = isWebUrl(info.pageUrl || tab?.url) ? info.pageUrl || tab.url : null;
    // U obrázku pošleme i jeho adresu: server stáhne originál a hledá v něm podpis původu (C2PA)
    // a vodoznak SynthID, které se snímkem obrazovky ztrácejí.
    const imageUrl = isWebUrl(info.srcUrl) ? info.srcUrl : null;
    await openResult({
      url: pageUrl,
      image_base64: shot ? shot.split(",")[1] : null,
      image_url: imageUrl,
      text: imageUrl ? "Uživatel chce ověřit tento obrázek na stránce (je na snímku obrazovky)." : null,
    });
  }
});

// Zprávy z vyskakovacího okna (ikona rozšíření).
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "check-text") {
      await openResult({ text: msg.text });
    } else if (msg?.type === "check-current-page") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const shot = await screenshot(tab?.windowId);
      await openResult({ url: isWebUrl(tab?.url) ? tab.url : null, image_base64: shot ? shot.split(",")[1] : null });
    }
    sendResponse({ ok: true });
  })();
  return true;
});
