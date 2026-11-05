// Model Risk Check: the page. The score is worked out here from the answers (shared core, no AI); the live service
// adds the maker-checker review of the gaps. Everything the AI writes is inserted as plain text, never as HTML.
import { MARKETS, QUESTIONS, SAMPLES, scoreAnswers, marketById } from "./mr-core.js";

const CFG = JSON.parse(document.getElementById("mr-config").textContent);
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function add(parent, ...kids) { kids.forEach((k) => k && parent.appendChild(k)); return parent; }
function track(name) { if (window.akTrack) window.akTrack(name); }

const state = { market: null, model: null, name: "", answers: {} };
const qs = $("#mr-qs"), runBtn = $("#mr-run"), msg = $("#mr-msg"), out = $("#mr-out"), scoreBox = $("#mr-score"), ai = $("#mr-ai");
const nameWrap = $("#mr-name-wrap"), nameIn = $("#mr-name"), leftEl = $("#mr-left");
let left = null, busy = false;

function say(text, isErr) { msg.hidden = !text; msg.textContent = text || ""; msg.classList.toggle("err", !!isErr); }
function ready() { return state.market && QUESTIONS.every((q) => state.answers[q.id]); }
function refresh() {
  $$(".mr-market").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.id === state.market)));
  $$(".mr-model").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === state.model)));
  $$(".mr-opt").forEach((b) => b.setAttribute("aria-pressed", String(state.answers[b.dataset.q] === b.dataset.v)));
  const missing = QUESTIONS.filter((q) => !state.answers[q.id]).length;
  runBtn.disabled = busy || !ready();
  runBtn.textContent = busy ? "Checking…" : !state.market ? "Pick a market first" : missing ? `Answer ${missing} more question${missing > 1 ? "s" : ""}` : "Check my model →";
}
function showLeft() { if (left != null) leftEl.textContent = left > 0 ? `${left} of ${CFG.free} free checks left` : "Free checks used: message Ajay for more"; }

/* ---------- the score (instant, from the answers) ---------- */
function ring(score, tone) {
  const c = 2 * Math.PI * 64, col = { ok: "var(--safe)", part: "var(--amber)", gap: "var(--risk)" }[tone];
  const wrap = el("div", "mr-ring");
  wrap.innerHTML = `<svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="64" fill="none" stroke="var(--sunk)" stroke-width="14"/>` +
    `<circle cx="75" cy="75" r="64" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${(c * score / 100).toFixed(1)} ${c.toFixed(1)}"/></svg>`;
  add(wrap, add(el("div", "mr-ring-lbl"), el("b", null, String(score)), el("span", "mono", "out of 100")));
  wrap.setAttribute("role", "img"); wrap.setAttribute("aria-label", `Readiness score ${score} out of 100`);
  return wrap;
}
function renderScore(r) {
  scoreBox.innerHTML = "";
  const m = marketById(state.market);
  const head = el("div", "mr-res-top");
  add(head, ring(r.score, r.tone), add(el("div"), el("span", `mr-verdict mono ${r.tone}`, r.verdict),
    el("h2", null, `${state.name || "Your model"} · ${m.name}`),
    el("p", "an-sub", "Worked out from your answers alone. The AI review below explains what it means under your market's rules.")));
  const grid = el("div", "mr-areas");
  r.areas.forEach((a) => add(grid, add(el("div", "mr-area"), el("b", null, a.area),
    el("span", `mr-pill ${a.status}`, { ready: "In place", partly: "Partly", gap: "Gap" }[a.status]), el("small", null, a.note))));
  add(scoreBox, head, grid);
}

/* ---------- the AI review ---------- */
const STAGES = [["Maker AI", "Drafts the gaps against the rulebook"], ["Checker AI", "Checks every gap and citation"], ["Conclusion", "What to fix first"]];
function stages(now) {
  const ol = el("ol", "an-stages");
  STAGES.forEach(([b, s], i) => add(ol, add(el("li", "an-stage" + (i < now ? " done" : i === now ? " now" : "")), el("b", null, b), el("span", null, s))));
  return ol;
}
function waiting() {
  ai.hidden = false; ai.innerHTML = "";
  add(ai, stages(0), el("p", "an-wait", "The maker is drafting the gaps. This takes about 30 to 60 seconds."));
  let i = 0;
  return setInterval(() => { if (i < 1) { i++; ai.replaceChild(stages(i), ai.firstChild); ai.lastChild.textContent = "The checker is reviewing every gap and the rule it cites."; } }, 22000);
}
const VERDICT_LABEL = { confirmed: "Confirmed", corrected: "Corrected", removed: "Removed", added: "Added" };
function renderAI(d) {
  ai.innerHTML = "";
  add(ai, stages(3));
  add(ai, add(el("div", "an-conclusion"), el("span", "mono", "Conclusion"), el("p", null, d.conclusion)));
  add(ai, add(el("p", "mr-class"), el("b", null, "How the rules treat this model: "), document.createTextNode(d.classification)));

  const v = { confirmed: 0, corrected: 0, removed: 0, added: 0 };
  (d.reviews || []).forEach((r) => { if (r.verdict in v) v[r.verdict]++; });
  const trail = el("div", "mr-trail");
  add(trail, add(el("div"), el("b", null, String((d.draft && d.draft.gaps || []).length)), el("span", null, "gaps drafted by the maker")));
  [["confirmed", "ok", "confirmed by the checker"], ["corrected", "part", "corrected"], ["removed", "gap", "removed"], ["added", "ok", "added"]].forEach(([k, cls, lbl]) => {
    if (k === "added" && !v.added) return;
    add(trail, add(el("div", cls), el("b", null, String(v[k])), el("span", null, lbl)));
  });
  const trailBox = add(el("div", "mr-box"), el("span", "mono mr-k", "Maker-checker trail"), trail);
  (d.reviews || []).filter((r) => r.verdict !== "confirmed").forEach((r) => {
    const g = ((d.draft && d.draft.gaps) || []).concat(d.gaps || []).find((x) => x.id === r.id);
    add(trailBox, add(el("div", "mr-note"), el("span", `mr-pill ${r.verdict === "removed" ? "gap" : r.verdict === "corrected" ? "partly" : "ready"}`, VERDICT_LABEL[r.verdict]),
      add(el("p"), el("b", null, (g ? g.title : r.id) + ": "), document.createTextNode(r.note))));
  });

  const gapsBox = el("div", "mr-box");
  const gaps = d.gaps || [];
  add(gapsBox, el("span", "mono mr-k", gaps.length ? "Fix these first" : "No gaps found"));
  gaps.forEach((g, i) => {
    if (i === 3) add(gapsBox, el("span", "mono mr-k mr-k2", "Also worth doing"));
    const ev = el("ul", "mr-ev"); (g.evidence || []).forEach((e) => add(ev, el("li", null, e)));
    add(gapsBox, add(el("div", "mr-gap"), el("span", `mr-num ${g.severity}`, String(i + 1)),
      add(el("div"), el("h3", null, g.title), el("p", null, g.why), el("span", "mr-rule mono", g.rule), ev)));
  });

  const foot = add(el("div", "mr-foot"), el("p", "mr-limits", `Limits: ${d.limits} A readiness guide built from your answers, not legal or compliance advice and not an audit. Rules as of ${d.rules_as_of}.`));
  const row = el("div", "an-actions mr-noprint");
  const pdf = el("button", "btn small", "Save as PDF"); pdf.type = "button"; pdf.addEventListener("click", () => window.print());
  const again = el("button", "btn small ghost", "Check another model"); again.type = "button";
  again.addEventListener("click", () => { $("#mr-form").scrollIntoView({ behavior: "smooth" }); });
  add(row, pdf, again);
  const wa = $(".an-contact-tpl a[data-wa]");
  if (wa) { const w = wa.cloneNode(true); w.textContent = "Talk to Ajay about a full review"; w.className = "btn small ghost"; row.appendChild(w); }
  add(ai, gapsBox, trailBox, add(foot, row));
}
function limitReached() {
  ai.hidden = false; ai.innerHTML = "";
  const box = add(el("div", "an-contact"), el("span", "mono", `You've used your ${CFG.free} free checks`), el("h3", null, "Want a full model review? Let's talk."),
    el("p", null, "Your score above still stands. Message Ajay to talk through the gaps, or for a fuller review of your models."));
  const row = el("div", "an-actions"), wa = $(".an-contact-tpl a[data-wa]"), li = $(".an-contact-tpl .an-li");
  if (wa) row.appendChild(wa.cloneNode(true));
  if (li) row.appendChild(li.cloneNode(true));
  add(ai, add(box, row));
}

async function run() {
  if (!ready() || busy) return;
  say("");
  const r = scoreAnswers(state.answers);
  out.hidden = false; renderScore(r);
  out.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!CFG.worker_url) { ai.hidden = false; ai.innerHTML = ""; add(ai, el("p", "an-sub", "The live AI review isn't switched on yet. Your score above is complete.")); return; }
  if (left === 0) return limitReached();
  busy = true; refresh();
  const timer = waiting();
  try {
    const res = await fetch(CFG.worker_url.replace(/\/$/, "") + "/model-risk", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ market: state.market, answers: state.answers, name: state.name }) });
    const body = await res.json().catch(() => ({}));
    clearInterval(timer);
    if (res.ok && body.conclusion) { left = body.remaining; showLeft(); track("tool-modelrisk-check"); track("tool-modelrisk-market-" + state.market.toLowerCase()); renderAI(body); }
    else if (body.error === "visitor_limit") { left = 0; showLeft(); limitReached(); }
    else { ai.innerHTML = ""; add(ai, el("p", "an-msg err", body.message || "That didn't finish. Please try again in a minute.")); }
  } catch (e) {
    clearInterval(timer); ai.innerHTML = ""; add(ai, el("p", "an-msg err", "Couldn't reach the AI service. Check your connection and try again."));
  } finally { busy = false; refresh(); }
}

/* ---------- wiring ---------- */
$$(".mr-market").forEach((b) => b.addEventListener("click", () => { state.market = b.dataset.id; refresh(); }));
$$(".mr-model").forEach((b) => b.addEventListener("click", () => {
  state.model = b.dataset.id;
  const s = SAMPLES.find((x) => x.id === b.dataset.id);
  if (s) { state.answers = { ...s.answers }; state.name = s.name; nameWrap.hidden = true; track("tool-modelrisk-sample-" + s.id); }
  else { state.answers = {}; state.name = nameIn.value.trim(); nameWrap.hidden = false; }
  qs.hidden = false; refresh();
  (s ? runBtn : qs).scrollIntoView({ behavior: "smooth", block: s ? "center" : "start" });
}));
nameIn.addEventListener("input", () => { if (state.model === "own") state.name = nameIn.value.trim().slice(0, 80); });
$$(".mr-opt").forEach((b) => b.addEventListener("click", () => { state.answers[b.dataset.q] = b.dataset.v; refresh(); }));
runBtn.addEventListener("click", run);
if (CFG.worker_url) {
  fetch(CFG.worker_url.replace(/\/$/, "") + "/status?tool=model-risk").then((r) => r.json()).then((j) => { if (j && j.remaining != null) { left = j.remaining; showLeft(); } }).catch(() => {});
}
if (!MARKETS.length) say("Something went wrong loading the questions.", true);
refresh();
