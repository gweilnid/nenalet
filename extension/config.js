// Výchozí adresa serveru Nenaleť. Lze přepsat v nastavení rozšíření.
export const DEFAULT_API_BASE = "http://localhost:8000";

export async function apiBase() {
  try {
    const { apiBase } = await chrome.storage.sync.get("apiBase");
    return (apiBase || DEFAULT_API_BASE).replace(/\/+$/, "");
  } catch (_) {
    return DEFAULT_API_BASE;
  }
}
