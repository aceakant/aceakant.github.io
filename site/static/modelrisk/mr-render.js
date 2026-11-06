// Model Risk Check: how a result is drawn. Used by the tool page and by the shared-result page, so Ajay sees a
// shared result exactly as the visitor saw it. Everything the AI wrote is inserted as plain text, never HTML.
export function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
export function add(parent, ...kids) { kids.forEach((k) => k && parent.appendChild(k)); return parent; }

function ring(score, tone) {
  const c = 2 * Math.PI * 64, col = { ok: "var(--safe)", part: "var(--amber)", gap: "var(--risk)" }[tone] || "var(--amber)";
  const wrap = el("div", "mr-ring");
  wrap.innerHTML = `<svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="64" fill="none" stroke="var(--sunk)" stroke-width="14"/>` +
    `<circle cx="75" cy="75" r="64" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(c * Number(score) / 100).toFixed(1)} ${c.toFixed(1)}"/></svg>`;
  add(wrap, add(el("div", "mr-ring-lbl"), el("b", null, String(score)), el("span", "mono", "out of 100")));
  wrap.setAttribute("role", "img"); wrap.setAttribute("aria-label", `Readiness score ${score} out of 100`);
  return wrap;
}

// r: { score, verdict, tone, areas:[{area,status,note}] }
export function renderScore(box, r, title, sub) {
  box.innerHTML = "";
  const head = el("div", "mr-res-top");
  add(head, ring(r.score, r.tone), add(el("div"), el("span", `mr-verdict mono ${r.tone}`, r.verdict), el("h2", null, title), el("p", "an-sub", sub)));
  const grid = el("div", "mr-areas");
  (r.areas || []).forEach((a) => add(grid, add(el("div", "mr-area"), el("b", null, a.area),
    el("span", `mr-pill ${a.status}`, { ready: "In place", partly: "Partly", gap: "Gap" }[a.status] || a.status), el("small", null, a.note))));
  add(box, head, grid);
}

const STAGES = [["Maker AI", "Drafts the gaps against the rulebook"], ["Checker AI", "Checks every gap and citation"], ["Conclusion", "What to fix first"]];
export function stages(now) {
  const ol = el("ol", "an-stages");
  STAGES.forEach(([b, s], i) => add(ol, add(el("li", "an-stage" + (i < now ? " done" : i === now ? " now" : "")), el("b", null, b), el("span", null, s))));
  return ol;
}

const VERDICT_LABEL = { confirmed: "Confirmed", corrected: "Corrected", removed: "Removed", added: "Added" };
// d: the service's answer (classification, gaps, reviews, draft, conclusion, limits, rules_as_of)
export function renderAI(box, d) {
  box.innerHTML = "";
  add(box, stages(3));
  add(box, add(el("div", "an-conclusion"), el("span", "mono", "Conclusion"), el("p", null, d.conclusion)));
  add(box, add(el("p", "mr-class"), el("b", null, "How the rules treat this model: "), document.createTextNode(d.classification || "")));

  const v = { confirmed: 0, corrected: 0, removed: 0, added: 0 };
  (d.reviews || []).forEach((r) => { if (r.verdict in v) v[r.verdict]++; });
  const trail = el("div", "mr-trail");
  add(trail, add(el("div"), el("b", null, String(((d.draft && d.draft.gaps) || []).length)), el("span", null, "gaps drafted by the maker")));
  [["confirmed", "ok", "confirmed by the checker"], ["corrected", "part", "corrected"], ["removed", "gap", "removed"], ["added", "ok", "added"]].forEach(([k, cls, lbl]) => {
    if (k === "added" && !v.added) return;
    add(trail, add(el("div", cls), el("b", null, String(v[k])), el("span", null, lbl)));
  });
  const trailBox = add(el("div", "mr-box"), el("span", "mono mr-k", "Maker-checker trail"), trail);
  (d.reviews || []).filter((r) => r.verdict !== "confirmed").forEach((r) => {
    const g = (((d.draft && d.draft.gaps) || []).concat(d.gaps || [])).find((x) => x.id === r.id);
    add(trailBox, add(el("div", "mr-note"), el("span", `mr-pill ${r.verdict === "removed" ? "gap" : r.verdict === "corrected" ? "partly" : "ready"}`, VERDICT_LABEL[r.verdict] || r.verdict),
      add(el("p"), el("b", null, (g ? g.title : r.id) + ": "), document.createTextNode(r.note || ""))));
  });

  const gapsBox = el("div", "mr-box"), gaps = d.gaps || [];
  add(gapsBox, el("span", "mono mr-k", gaps.length ? "Fix these first" : "No gaps found"));
  gaps.forEach((g, i) => {
    if (i === 3) add(gapsBox, el("span", "mono mr-k mr-k2", "Also worth doing"));
    const ev = el("ul", "mr-ev"); (g.evidence || []).forEach((e) => add(ev, el("li", null, e)));
    add(gapsBox, add(el("div", "mr-gap"), el("span", `mr-num ${g.severity}`, String(i + 1)),
      add(el("div"), el("h3", null, g.title), el("p", null, g.why), el("span", "mr-rule mono", g.rule), ev)));
  });
  add(box, gapsBox, trailBox,
    add(el("div", "mr-foot"), el("p", "mr-limits", `Limits: ${d.limits || ""} A readiness guide built from the answers, not legal or compliance advice and not an audit. Rules as of ${d.rules_as_of || ""}.`)));
}

// The lines of the WhatsApp message for a Model Risk Check result
export function talkLines(marketName, modelName, isSample, r, d) {
  const lines = [`Market: ${marketName} · Model: ${modelName}${isSample ? " (sample)" : ""}`, `Score: ${r.score}/100 · ${r.verdict}`];
  const gaps = (d && d.gaps) || [];
  if (gaps.length) lines.push("Fix first: " + gaps.slice(0, 3).map((g, i) => `${i + 1}) ${g.title}`).join(" "));
  else { const weak = (r.areas || []).filter((a) => a.status === "gap").map((a) => a.area); if (weak.length) lines.push("Gaps: " + weak.join(", ")); }
  return lines;
}
