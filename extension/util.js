export function isWebUrl(u) {
  return /^https?:\/\//i.test(u || "");
}

export function shorten(s, n = 80) {
  s = (s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/** Snímek viditelné části stránky (base64 JPEG bez prefixu), nebo null bez oprávnění. */
export async function screenshot(windowId) {
  try {
    return (await chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 80 })).split(",")[1];
  } catch (e) {
    console.warn("Snímek obrazovky se nepodařil:", e);
    return null;
  }
}
