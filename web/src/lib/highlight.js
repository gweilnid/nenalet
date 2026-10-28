// Napáruje citované „důkazy“ z výsledku Nenaleť na text zprávy, aby je šlo vyznačit zvýrazňovačem.

// české i anglické uvozovky (anglický překlad ukázek používá “ ” a ‘ ’)
const QUOTES = /^[\s„“”"'‚‘’»«]+|[\s„“”"'‚‘’»«.,]+$/g;

function parts(evidence) {
  // „citace“ – vysvětlení  ->  jen citace; „začátek… konec“ -> dvě části
  const cut = evidence.split(/\s[–—]\s/)[0];
  return cut
    .split(/…|\.\.\./)
    .map((p) => p.replace(QUOTES, '').trim())
    .filter((p) => p.length >= 4);
}

/** Vrátí úseky textu [{text, flag}] - flag je index varovného signálu, nebo null. */
export function segment(text, redFlags) {
  const lower = text.toLowerCase();
  const ranges = [];
  redFlags.forEach((f, i) => {
    for (const p of parts(f.evidence || '')) {
      const at = lower.indexOf(p.toLowerCase());
      if (at >= 0) ranges.push({ start: at, end: at + p.length, flag: i });
    }
  });
  ranges.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) continue; // překryv: necháme první
    merged.push(r);
  }
  const out = [];
  let pos = 0;
  for (const r of merged) {
    if (r.start > pos) out.push({ text: text.slice(pos, r.start), flag: null });
    out.push({ text: text.slice(r.start, r.end), flag: r.flag });
    pos = r.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), flag: null });
  return out;
}

/** Který signál se týká odesílatele („Odesílatel: …“, v anglickém překladu „Sender: …“). */
export function senderFlag(redFlags) {
  return redFlags.findIndex((f) => /^\s*(Odesílatel|Sender):/i.test(f.evidence || ''));
}
