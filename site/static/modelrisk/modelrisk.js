// Model Risk Check: the page. The score is worked out here from the answers (shared core, no AI); the live service
// adds the maker-checker review of the gaps. Everything the AI writes is inserted as plain text, never as HTML.
import { MARKETS, QUESTIONS, SAMPLES, scoreAnswers, marketById } from "./mr-core.js";
import { el, add, renderScore, renderAI, stages, talkLines } from "./mr-render.js";

const CFG = JSON.parse(document.getElementById("mr-config").textContent);
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
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

function waiting() {
  ai.hidden = false; ai.innerHTML = "";
  add(ai, stages(0), el("p", "an-wait", "The maker is drafting the gaps. This takes about 30 to 60 seconds."));
  let i = 0;
  return setInterval(() => { if (i < 1) { i++; ai.replaceChild(stages(i), ai.firstChild); ai.lastChild.textContent = "The checker is reviewing every gap and the rule it cites."; } }, 22000);
}

// The "Talk to Ajay" panel: the message carries the market, model, score and top gaps; the full result goes as a
// private link only if the visitor keeps "Include my full result" ticked.
function talk(r, d) {
  if (!window.AkTalk) return;
  const m = marketById(state.market), isSample = state.model !== "own", snap = { market: m.name, name: state.name || "Unnamed model" };
  const opts = { tool: "model-risk", toolName: "Model Risk Check", lines: () => talkLines(snap.market, snap.name, isSample, r, d) };
  if (d && d.sig && CFG.worker_url) {
    const { sig, remaining, free, ...payload } = d;
    opts.share = () => window.AkTalk.share(CFG.worker_url, "model-risk", payload, sig);
  }
  window.AkTalk.mount(ai.hidden ? scoreBox : ai, opts);
}
function actions() {
  const row = el("div", "an-actions mr-noprint");
  const pdf = el("button", "btn small", "Save as PDF"); pdf.type = "button"; pdf.addEventListener("click", () => window.print());
  const again = el("button", "btn small ghost", "Check another model"); again.type = "button";
  again.addEventListener("click", () => { $("#mr-form").scrollIntoView({ behavior: "smooth" }); });
  return add(row, pdf, again);
}
function limitReached(r) {
  ai.hidden = false; ai.innerHTML = "";
  const box = add(el("div", "an-contact"), el("span", "mono", `You've used your ${CFG.free} free checks`), el("h3", null, "Want a full model review? Let's talk."),
    el("p", null, "Your score above still stands. Send it to Ajay below to talk through the gaps, or for a fuller review of your models."));
  add(ai, box);
  talk(r, null);
}

async function run() {
  if (!ready() || busy) return;
  say("");
  const r = scoreAnswers(state.answers), m = marketById(state.market);
  out.hidden = false;
  renderScore(scoreBox, r, `${state.name || "Your model"} · ${m.name}`, "Worked out from your answers alone. The AI review below explains what it means under your market's rules.");
  out.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!CFG.worker_url) { ai.hidden = false; ai.innerHTML = ""; add(ai, el("p", "an-sub", "The live AI review isn't switched on yet. Your score above is complete.")); talk(r, null); return; }
  if (left === 0) return limitReached(r);
  busy = true; refresh();
  const timer = waiting();
  try {
    const res = await fetch(CFG.worker_url.replace(/\/$/, "") + "/model-risk", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ market: state.market, answers: state.answers, name: state.name }) });
    const body = await res.json().catch(() => ({}));
    clearInterval(timer);
    if (res.ok && body.conclusion) {
      left = body.remaining; showLeft(); track("tool-modelrisk-check"); track("tool-modelrisk-market-" + state.market.toLowerCase());
      renderAI(ai, body); ai.appendChild(actions()); talk(r, body);
    }
    else if (body.error === "visitor_limit") { left = 0; showLeft(); limitReached(r); }
    else { ai.innerHTML = ""; add(ai, el("p", "an-msg err", body.message || "That didn't finish. Please try again in a minute.")); talk(r, null); }
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
