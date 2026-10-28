import { apiBase } from "./config.js";

const ICONS = { podvod: "🛑", podezrele: "⚠️", bez_varovnych_signalu: "✅", nelze_posoudit: "❔" };
const CONF = { vysoka: "vysoká", stredni: "střední", nizka: "nízká" };
const ST = { ok: "✓", info: "i", varovani: "!", nebezpeci: "✕" };
const PROGRESS = ["Kontroluji odkazy a domény…", "Ověřuji v registrech…", "Posuzuji situaci…", "Ještě chvilku…"];
const $ = (id) => document.getElementById(id);
let checkId = null;

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
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
  $("loading").hidden = true;
  $("result").hidden = false;
}

async function run() {
  const id = location.hash.slice(1);
  const stored = await chrome.storage.session.get(id);
  const payload = stored[id];
  await chrome.storage.session.remove(id);
  if (!payload) throw new Error("Nemám co ověřit. Zkuste to prosím znovu.");
  let step = 0;
  const timer = setInterval(() => ($("progress").textContent = PROGRESS[Math.min(++step, PROGRESS.length - 1)]), 2500);
  $("progress").textContent = PROGRESS[0];
  try {
    const resp = await fetch(`${await apiBase()}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, client: "extension" }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || "Server teď neodpovídá. Zkuste to prosím za chvíli.");
    render(data);
  } finally {
    clearInterval(timer);
  }
}

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

run().catch((e) => {
  $("loading").hidden = true;
  $("error").textContent = e.message || "Nepodařilo se spojit se serverem.";
  $("error").hidden = false;
});
