// Postranní panel: vyzvedne požadavek z kontextového menu (chrome.storage.session),
// nebo ověří aktuální stránku. Vlastní text vkládat nejde (šetříme volání API). Výsledek zobrazí v panelu.
import { apiBase } from "./config.js";
import { isWebUrl, screenshot, shorten } from "./util.js";

const ICONS = { podvod: "🛑", podezrele: "⚠️", bez_varovnych_signalu: "✅", nelze_posoudit: "❔" };
const CONF = { vysoka: "vysoká", stredni: "střední", nizka: "nízká" };
const ST = { ok: "✓", info: "i", varovani: "!", nebezpeci: "✕" };
const PROGRESS = ["Kontroluji odkazy a domény…", "Ověřuji v registrech…", "Posuzuji situaci…", "Ještě chvilku…"];
const $ = (id) => document.getElementById(id);

let myWindowId = null;
let checkId = null;
let current = null; // AbortController běžící kontroly

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

function showState(state) {
  $("idle").hidden = state !== "idle";
  $("loading").hidden = state !== "loading";
  $("result").hidden = state !== "result";
  $("error").hidden = state !== "error";
  $("subject").hidden = state === "idle" || !$("subject").textContent;
  $("again").hidden = state === "idle" || state === "loading";
}

function render(r) {
  checkId = r.check_id;
  $("verdict").dataset.v = r.verdict;
  $("v-icon").textContent = ICONS[r.verdict] || "";
  $("v-label").textContent = r.verdict_label;
  $("v-headline").textContent = r.headline;
  $("v-expl").textContent = r.explanation;
  $("v-meta").textContent = `Jistota: ${CONF[r.confidence] || r.confidence}` + (r.scam_type ? ` · ${r.scam_type}` : "");
  $("todo").replaceChildren(...r.what_to_do.map((t) => el("li", t)));
  $("flags").replaceChildren(
    ...r.red_flags.map((f) => {
      const li = el("li");
      li.append(el("b", f.signal), el("q", f.evidence), el("span", f.explanation));
      return li;
    })
  );
  $("good").replaceChildren(...r.reassuring_signs.map((t) => el("li", t)));
  $("flags-wrap").hidden = !r.red_flags.length && !r.reassuring_signs.length;
  $("checks").replaceChildren(
    ...r.checks.map((c) => {
      const li = el("li");
      const st = el("span", ST[c.status] || "i", "st");
      st.dataset.s = c.status;
      const body = el("div");
      body.append(el("b", c.name), el("div", c.detail));
      if (c.source) body.append(el("div", `Zdroj: ${c.source}`, "hint"));
      li.append(st, body);
      return li;
    })
  );
  $("checks-wrap").hidden = !r.checks.length;
  $("disclaimer").textContent = r.disclaimer;
  document.querySelectorAll("[data-correct]").forEach((b) => b.setAttribute("aria-pressed", "false"));
  $("thanks").hidden = true;
  showState("result");
  window.scrollTo({ top: 0 });
}

function showError(msg) {
  $("error").textContent = msg;
  showState("error");
}

async function runCheck(payload, label) {
  current?.abort();
  const ctrl = new AbortController();
  current = ctrl;
  $("subject").textContent = label || "";
  showState("loading");
  let step = 0;
  $("progress").textContent = PROGRESS[0];
  const timer = setInterval(() => ($("progress").textContent = PROGRESS[Math.min(++step, PROGRESS.length - 1)]), 2500);
  try {
    const resp = await fetch(`${await apiBase()}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, client: "extension" }),
      signal: ctrl.signal,
    });
    const data = await resp.json().catch(() => ({}));
    if (ctrl !== current) return; // mezitím přišla novější kontrola
    if (!resp.ok) throw new Error(data.error || "Server teď neodpovídá. Zkuste to prosím za chvíli.");
    render(data);
  } catch (e) {
    if (e.name === "AbortError") return;
    showError(e.message || "Nepodařilo se spojit se serverem.");
  } finally {
    clearInterval(timer);
  }
}

async function takePending() {
  const { nenalet_request: req } = await chrome.storage.session.get("nenalet_request");
  if (!req || req.windowId !== myWindowId || Date.now() - req.ts > 2 * 60 * 1000) return false;
  await chrome.storage.session.remove("nenalet_request");
  runCheck(req.payload, req.label);
  return true;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes.nenalet_request?.newValue) takePending();
});

$("page").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, windowId: myWindowId });
  const shot = await screenshot(myWindowId);
  const url = isWebUrl(tab?.url) ? tab.url : null;
  if (!shot && !url) {
    $("subject").textContent = "";
    return showError("K této stránce nemám přístup. Klikněte na ni pravým tlačítkem a zvolte „Ověřit tuto stránku v Nenaleť“.");
  }
  runCheck({ url, image_base64: shot }, `Stránka: ${shorten(url || tab?.title || "aktuální stránka")}`);
});

$("again").addEventListener("click", () => {
  current?.abort();
  $("subject").textContent = "";
  showState("idle");
});

document.querySelectorAll("[data-correct]").forEach((b) =>
  b.addEventListener("click", async () => {
    if (!checkId) return;
    document.querySelectorAll("[data-correct]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    try {
      await fetch(`${await apiBase()}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ check_id: checkId, correct: b.dataset.correct }),
      });
      $("thanks").hidden = false;
    } catch (_) {}
  })
);

myWindowId = (await chrome.windows.getCurrent()).id;
if (!(await takePending())) showState("idle");
