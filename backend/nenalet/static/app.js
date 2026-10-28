"use strict";

const SAMPLES = [
  "Zasilkovna: Vase zasilka c. Z 2219 0412 nemohla byt dorucena kvuli nedoplatku 29 Kc za clo. Uhradte prosim do 24 hodin, jinak bude vracena odesilateli: https://zasilkovna-cz.top/platba",
  "Ahoj mami, rozbil se mi telefon a tohle je moje nové číslo, to staré si smaž. Můžeš mi napsat sem na WhatsApp? Potřebuju dneska nutně zaplatit jednu fakturu, vrátím ti to zítra ❤️",
  "Air Bank: Kód pro potvrzení platby 1 290 Kč u ALZA.CZ je 482913. Nikomu kód nesdělujte, ani pracovníkům banky.",
];

const ICONS = { podvod: "🛑", podezrele: "⚠️", bez_varovnych_signalu: "✅", nelze_posoudit: "❔" };
const CONF = { vysoka: "vysoká", stredni: "střední", nizka: "nízká" };
const ST = { ok: "✓", info: "i", varovani: "!", nebezpeci: "✕" };
const PROGRESS = ["Kontroluji odkazy a domény…", "Ověřuji v registrech (ČOI, ARES, registr domén)…", "Posuzuji situaci…", "Ještě chvilku…"];

const $ = (id) => document.getElementById(id);
let imageB64 = null;
let lastCheckId = null;

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

async function fileToJpegBase64(file, maxSide = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Obrázek se nepodařilo načíst."));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function setImage(file) {
  if (!file || !file.type.startsWith("image/")) return;
  try {
    const dataUrl = await fileToJpegBase64(file);
    imageB64 = dataUrl.split(",")[1];
    $("preview-img").src = dataUrl;
    $("preview").hidden = false;
  } catch (e) {
    showStatus(e.message, true);
  }
}

function clearImage() {
  imageB64 = null;
  $("image").value = "";
  $("preview").hidden = true;
  $("preview-img").removeAttribute("src");
}

function showStatus(msg, isError = false) {
  const s = $("status");
  s.textContent = msg || "";
  s.classList.toggle("error", isError);
}

function render(r) {
  lastCheckId = r.check_id;
  const v = $("verdict");
  v.dataset.v = r.verdict;
  $("v-icon").textContent = ICONS[r.verdict] || "";
  $("v-label").textContent = r.verdict_label;
  $("v-headline").textContent = r.headline;
  $("v-expl").textContent = r.explanation;
  $("v-meta").textContent = `Jistota hodnocení: ${CONF[r.confidence] || r.confidence}` + (r.scam_type ? ` · Typ: ${r.scam_type}` : "");

  const todo = $("todo");
  todo.replaceChildren(...r.what_to_do.map((t) => el("li", t)));

  const flags = $("flags");
  flags.replaceChildren(
    ...r.red_flags.map((f) => {
      const li = el("li");
      li.append(el("span", f.signal, "sig"), el("q", f.evidence), el("span", f.explanation));
      return li;
    })
  );
  const good = $("good");
  good.replaceChildren(...r.reassuring_signs.map((t) => el("li", t)));
  $("flags-panel").hidden = !r.red_flags.length && !r.reassuring_signs.length;

  const checks = $("checks");
  checks.replaceChildren(
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

  $("disclaimer").textContent = r.disclaimer;
  document.querySelectorAll("[data-correct]").forEach((b) => b.setAttribute("aria-pressed", "false"));
  $("feedback-thanks").hidden = true;

  const res = $("result");
  res.hidden = false;
  res.focus({ preventScroll: true });
  res.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

async function submit(ev) {
  ev.preventDefault();
  const text = $("text").value.trim();
  if (!text && !imageB64) {
    showStatus("Vložte prosím text zprávy, odkaz nebo snímek obrazovky.", true);
    return;
  }
  const btn = $("submit");
  btn.disabled = true;
  let step = 0;
  showStatus(PROGRESS[0]);
  const timer = setInterval(() => showStatus(PROGRESS[Math.min(++step, PROGRESS.length - 1)]), 2500);
  try {
    const resp = await fetch("api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text || null, image_base64: imageB64, client: "web" }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || "Něco se nepovedlo. Zkuste to prosím znovu.");
    showStatus("");
    render(data);
  } catch (e) {
    showStatus(e.message || "Nepodařilo se spojit se serverem. Zkontrolujte připojení.", true);
  } finally {
    clearInterval(timer);
    btn.disabled = false;
  }
}

async function sendFeedback(correct, button) {
  if (!lastCheckId) return;
  document.querySelectorAll("[data-correct]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
  try {
    await fetch("api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ check_id: lastCheckId, correct }),
    });
    $("feedback-thanks").hidden = false;
  } catch (_) {
    /* zpětná vazba není kritická */
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("form").addEventListener("submit", submit);
  $("image").addEventListener("change", (e) => setImage(e.target.files[0]));
  $("remove-image").addEventListener("click", clearImage);
  document.addEventListener("paste", (e) => {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (item) {
      e.preventDefault();
      setImage(item.getAsFile());
    }
  });
  const ta = $("text");
  ta.addEventListener("dragover", (e) => e.preventDefault());
  ta.addEventListener("drop", (e) => {
    const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith("image/"));
    if (f) {
      e.preventDefault();
      setImage(f);
    }
  });
  document.querySelectorAll("[data-sample]").forEach((b) =>
    b.addEventListener("click", () => {
      clearImage();
      ta.value = SAMPLES[Number(b.dataset.sample)];
      ta.focus();
    })
  );
  document.querySelectorAll("[data-correct]").forEach((b) => b.addEventListener("click", () => sendFeedback(b.dataset.correct, b)));
  $("again").addEventListener("click", () => {
    $("result").hidden = true;
    ta.value = "";
    clearImage();
    window.scrollTo({ top: 0 });
    ta.focus();
  });
  // Předvyplnění z odkazu ?text=... (používá zkratka a rozšíření jako záloha)
  const params = new URLSearchParams(location.search);
  if (params.get("text")) ta.value = params.get("text");
});
