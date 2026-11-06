// The shared-result page: a Workbench result a visitor chose to share with Ajay (private link, deleted after 30 days).
// Drawn with the same code as the tool itself, as plain text only.
import { el, add, renderScore, renderAI } from "./modelrisk/mr-render.js";
import { marketById } from "./modelrisk/mr-core.js";

const CFG = JSON.parse(document.getElementById("rs-config").textContent);
const $ = (s) => document.querySelector(s);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const nice = (iso) => { const d = new Date(iso + "T00:00:00Z"); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const num = (n) => (n == null ? "–" : Number(n).toLocaleString("en-GB", { maximumFractionDigits: 2 }));

function missing() { $("#rs-title").textContent = "Shared result"; $("#rs-lede").hidden = true; $("#rs-missing").hidden = false; }

function meta(tool, data, href) {
  const m = $("#rs-meta"); m.hidden = false;
  add(m, el("span", null, tool), el("span", null, "Shared " + nice(data.created)), el("span", null, "Link expires " + nice(data.expires)));
  const a = el("a", null, "Open the tool →"); a.href = href; m.appendChild(a);
}

function modelRisk(d) {
  const m = marketById(d.market);
  $("#rs-title").textContent = `${d.name} · ${m ? m.name : d.market}`;
  meta("Model Risk Check", window.__rs, "model-risk.html");
  $("#rs-out").hidden = false;
  renderScore($("#rs-a"), d, `${d.score}/100 · ${d.verdict}`, "The score comes from the visitor's answers alone. The review below was drafted by one AI and checked by a second.");
  const b = $("#rs-b"); b.hidden = false; renderAI(b, d);
}

function analyst(p) {
  const r = p.review || {}, s = p.summary || {}, f = s.file || {};
  $("#rs-title").textContent = r.title || "Analyst on Call review";
  meta("Analyst on Call", window.__rs, "analyst.html");
  $("#rs-out").hidden = false;
  const a = $("#rs-a");
  add(a, el("span", "mono mr-k", "The data (statistics only, never the rows)"),
    add(el("div", "mr-trail"),
      add(el("div"), el("b", null, num(f.rows)), el("span", null, "rows")),
      add(el("div"), el("b", null, num(f.columns)), el("span", null, "columns")),
      add(el("div"), el("b", null, f.missing_cells_pct == null ? "–" : num(f.missing_cells_pct) + "%"), el("span", null, "cells missing")),
      add(el("div"), el("b", null, num(f.duplicate_rows)), el("span", null, "duplicate rows"))));
  add(a, add(el("div", "an-conclusion"), el("span", "mono", "Final conclusion"), el("p", null, r.conclusion || "")));
  const verdicts = {}; (r.reviews || []).forEach((v) => { verdicts[v.id] = v; });
  const list = el("div", "an-findings");
  (r.findings || []).forEach((x) => {
    const v = verdicts[x.id];
    const body = add(el("div"), el("b", null, x.headline), el("p", null, x.detail));
    if (v) add(body, el("p", "an-verdict " + v.verdict, "Checker: " + v.verdict + (v.note ? ". " + v.note : "")));
    add(list, add(el("div", "an-find"), el("span", "an-sev " + x.severity, x.severity === "stable" ? "Stable" : x.severity === "high" ? "High" : "Medium"), body));
  });
  add(a, list);
  const removed = (r.reviews || []).filter((v) => v.verdict === "removed");
  if (removed.length) {
    const rm = add(el("div", "an-removed"), el("span", "mono", "Removed by the checker"));
    removed.forEach((v) => { const d = ((r.draft && r.draft.findings) || []).find((x) => x.id === v.id); add(rm, add(el("p"), el("s", null, d ? d.headline : v.id), document.createTextNode(" · " + v.note))); });
    add(a, rm);
  }
  if (r.next_steps && r.next_steps.length) { const ol = el("ol"); r.next_steps.forEach((x) => add(ol, el("li", null, x))); add(a, add(el("div", "an-next"), el("b", null, "What to investigate next"), ol)); }
  if (r.limits) add(a, el("p", "an-limits", "Limits: " + r.limits));
  const sent = add(el("details", "an-more"), el("summary", null, "See exactly what the AI was sent"));
  add(sent, el("pre", null, JSON.stringify(s, null, 2)));
  add(a, sent);
}

const id = (new URLSearchParams(location.search).get("id") || "").toUpperCase();
if (!CFG.api || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id)) missing();
else fetch(CFG.api + "/share?id=" + encodeURIComponent(id)).then((r) => (r.ok ? r.json() : null)).then((data) => {
  if (!data || !data.payload) return missing();
  window.__rs = data;
  if (data.tool === "model-risk") modelRisk(data.payload);
  else if (data.tool === "review") analyst(data.payload);
  else missing();
}).catch(missing);
