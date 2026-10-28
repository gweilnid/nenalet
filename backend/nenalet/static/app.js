"use strict";
// Ukázky skutečných podvodů s předem spočítaným výsledkem (examples.json) - web nevolá API.

const ICONS = { podvod: "🛑", podezrele: "⚠️", bez_varovnych_signalu: "✅", nelze_posoudit: "❔" };
const CONF = { vysoka: "vysoká", stredni: "střední", nizka: "nízká" };
const ST = { ok: "✓", info: "i", varovani: "!", nebezpeci: "✕" };

const $ = (id) => document.getElementById(id);

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

function renderResult(r) {
  $("verdict").dataset.v = r.verdict;
  $("v-icon").textContent = ICONS[r.verdict] || "";
  $("v-label").textContent = r.verdict_label;
  $("v-headline").textContent = r.headline;
  $("v-expl").textContent = r.explanation;
  $("v-meta").textContent = `Jistota hodnocení: ${CONF[r.confidence] || r.confidence}` + (r.scam_type ? ` · Typ: ${r.scam_type}` : "");
  $("todo").replaceChildren(...r.what_to_do.map((t) => el("li", t)));
  $("flags").replaceChildren(
    ...r.red_flags.map((f) => {
      const li = el("li");
      li.append(el("span", f.signal, "sig"), el("q", f.evidence), el("span", f.explanation));
      return li;
    })
  );
  $("good").replaceChildren(...r.reassuring_signs.map((t) => el("li", t)));
  $("flags-panel").hidden = !r.red_flags.length && !r.reassuring_signs.length;
  $("checks").replaceChildren(
    ...r.checks.map((c) => {
      const li = el("li");
      const st = el("span", ST[c.status] || "i", "st");
      st.dataset.s = c.status;
      const body = el("div");
      body.append(el("div", c.name, "name"), el("div", c.detail, "detail"));
      if (c.source) body.append(el("div", `Zdroj: ${c.source}`, "src"));
      li.append(st, body);
      return li;
    })
  );
  $("checks-panel").hidden = !r.checks.length;
  $("checks-panel").open = r.checks.some((c) => c.status === "nebezpeci" || c.status === "varovani");
  $("disclaimer").textContent = r.disclaimer;
  $("result").hidden = false;
}

function showExample(ex, buttons, focus = false) {
  buttons.forEach((b) => {
    const on = b.dataset.id === ex.id;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  });
  $("m-channel").textContent = ex.channel;
  $("m-sender").textContent = ex.sender ? ` · ${ex.sender}` : "";
  let text = ex.text || "";
  if (ex.url_in_message && !text.includes(ex.url_in_message)) text += `\n${ex.url_in_message}`;
  $("m-text").textContent = text;
  $("m-source").textContent = ex.source_name;
  $("m-source").href = ex.source_url;
  $("message").dataset.label = ex.label;
  renderResult(ex.result);
}

async function init() {
  let data;
  try {
    const resp = await fetch("examples.json", { cache: "no-cache" });
    data = await resp.json();
  } catch (_) {
    $("m-text").textContent = "Ukázky se nepodařilo načíst. Obnovte prosím stránku.";
    return;
  }
  const list = $("example-list");
  const buttons = data.examples.map((ex) => {
    const b = el("button", null, "example-tab");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.dataset.id = ex.id;
    b.append(el("span", ex.title, "example-title"), el("span", ex.label === "scam" ? "skutečný podvod" : "skutečná legitimní zpráva", "example-kind"));
    b.addEventListener("click", () => showExample(ex, buttons));
    return b;
  });
  list.replaceChildren(...buttons);
  // Šipky mezi kartami (přístupnost)
  list.addEventListener("keydown", (e) => {
    const i = buttons.findIndex((b) => b.getAttribute("aria-selected") === "true");
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const next = data.examples[(i + step + buttons.length) % buttons.length];
    showExample(next, buttons, true);
  });
  showExample(data.examples[0], buttons);
}

document.addEventListener("DOMContentLoaded", init);
