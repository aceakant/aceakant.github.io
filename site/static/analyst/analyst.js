/* Analyst on Call: the page. Samples load a prepared maker-checker review; your own file gets a live one.
   Everything about the file is worked out here in the browser; only the statistics summary is ever sent. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var cfgEl = $("#an-config");
  if (!cfgEl || !window.AkProfile) return;
  var CFG = JSON.parse(cfgEl.textContent), P = window.AkProfile, base = cfgEl.getAttribute("data-base") || "";
  var out = $("#an-out"), check = $("#an-check"), ai = $("#an-ai"), msg = $("#an-msg"), quota = $("#an-quota");
  var current = null, timers = [];
  function track(name) { if (window.akTrack) window.akTrack(name); }

  /* ---------- tiny DOM helpers (text only, never HTML from data) ---------- */
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function add(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  function fmt(n) { return n == null ? "–" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
  function note(text, kind) { msg.textContent = text || ""; msg.className = "an-msg" + (kind ? " " + kind : ""); msg.hidden = !text; }
  var TYPES = { number: "Number", category: "Category", date: "Date", yesno: "Yes / No", id: "ID", text: "Text" };

  /* ---------- 1 · the data check ---------- */
  function renderCheck(p) {
    check.innerHTML = "";
    var head = add(el("div", "an-step-head"), el("span", "an-num", "1"), add(el("div"), el("h2", null, "Data check"), el("p", "an-sub", "Worked out in your browser in a moment. No AI needed for this part.")));
    var dr = p.period && p.period.from ? fmtDate(p.period.from) + " – " + fmtDate(p.period.to) : (p.file.duplicate_rows ? fmt(p.file.duplicate_rows) : "None");
    var kpis = add(el("div", "an-kpis"),
      kpi(fmt(p.file.rows), "rows"), kpi(fmt(p.file.columns), "columns"),
      kpi((p.file.missing_cells_pct || 0) + "%", "cells missing"),
      kpi(dr, p.period && p.period.from ? "date range" : "duplicate rows"));
    var table = el("table", "an-table"), thead = el("thead"), tr = el("tr");
    ["Column", "Type", "Missing", "What's in it"].forEach(function (h) { add(tr, el("th", null, h)); });
    add(table, add(thead, tr));
    var tb = el("tbody");
    p.columns.forEach(function (c) {
      var row = el("tr");
      add(row, add(el("td"), el("code", null, c.name)), el("td", null, TYPES[c.type] || c.type));
      var m = el("td", "an-miss");
      if (c.missing_pct > 0) { var bar = el("i"); bar.style.width = Math.min(60, 6 + c.missing_pct * 4) + "px"; add(m, bar); }
      add(m, document.createTextNode((c.missing_pct || 0) + "%"));
      var what = el("td", c.note ? "an-flag" : null, describe(c, p));
      add(row, m, what); add(tb, row);
    });
    add(table, tb);
    add(check, head, kpis, add(el("div", "an-table-wrap"), table));
    if (p.target) add(check, el("p", "an-sub an-target", "Outcome column found: " + p.target.column + " (" + p.target.positive + " in " + p.target.rate + "% of rows). The review looks at what goes with it."));
  }
  function kpi(v, l) { return add(el("div"), el("b", null, v), el("span", null, l)); }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtDate(iso) { var d = new Date(iso + "T00:00:00Z"); return MON[d.getUTCMonth()] + " " + String(d.getUTCFullYear()).slice(2); }
  function describe(c, p) {
    if (c.note) return "⚠ " + c.note;
    if (c.personal) return "Looks personal: values are not shown or sent";
    if (c.type === "number" && c.stats) return fmt(c.stats.min) + " to " + fmt(c.stats.max) + " · median " + fmt(c.stats.median);
    if (c.type === "date" && c.range) return fmtDate(c.range.from) + " to " + fmtDate(c.range.to);
    if ((c.type === "category" || c.type === "yesno") && c.top) return c.top.slice(0, 4).map(function (t) { return t.value + " " + t.share + "%"; }).join(", ");
    if (c.type === "id") return "Different in every row";
    return fmt(c.distinct) + " different values";
  }

  /* ---------- 2 · the maker-checker review ---------- */
  var STAGES = [["Maker", "drafts the findings"], ["Checker", "verifies every number"], ["Conclusion", "the final word"]];
  function stageBar(state) {
    var bar = el("ol", "an-stages");
    STAGES.forEach(function (s, i) { add(bar, add(el("li", "an-stage " + (i < state ? "done" : i === state ? "now" : "")), el("b", null, s[0]), el("span", null, s[1]))); });
    return bar;
  }
  function aiHead(sub) { return add(el("div", "an-step-head"), el("span", "an-num", "2"), add(el("div"), el("h2", null, "Maker-checker review"), el("p", "an-sub", sub))); }

  function renderWorking() {
    ai.innerHTML = ""; ai.hidden = false;
    var bar = stageBar(0);
    add(ai, aiHead("Two AI reviewers, the way a bank checks important work. About 30 seconds."), bar, el("p", "an-wait", "The maker is reading the statistics…"));
    timers.push(setTimeout(function () { bar.replaceWith(bar = stageBar(1)); $(".an-wait", ai).textContent = "The checker is verifying each finding against the numbers…"; }, 12000));
  }

  function renderReview(r, prof, opts) {
    timers.forEach(clearTimeout); timers = [];
    ai.innerHTML = ""; ai.hidden = false;
    add(ai, aiHead(opts.prepared ? "Prepared earlier with the same maker-checker process as the live tool." : "Written by Claude from the summary statistics only."), stageBar(3));
    if (r.title) add(ai, el("p", "an-title mono", r.title));
    add(ai, add(el("div", "an-conclusion"), el("span", "mono", "Final conclusion"), el("p", null, r.conclusion)));

    var verdicts = {};
    (r.reviews || []).forEach(function (v) { verdicts[v.id] = v; });
    var list = el("div", "an-findings");
    r.findings.forEach(function (f) {
      var v = verdicts[f.id], item = el("div", "an-find");
      add(item, el("span", "an-sev " + f.severity, f.severity === "stable" ? "Stable" : f.severity === "high" ? "High" : "Medium"));
      var body = add(el("div"), el("b", null, f.headline), el("p", null, f.detail));
      if (v) add(body, el("p", "an-verdict " + v.verdict, "Checker: " + v.verdict + (v.note ? ". " + v.note : "")));
      add(list, add(item, body));
    });
    add(ai, list);

    var removed = (r.reviews || []).filter(function (v) { return v.verdict === "removed"; });
    if (removed.length) {
      var rm = add(el("div", "an-removed"), el("span", "mono", "Removed by the checker"));
      removed.forEach(function (v) {
        var d = (r.draft && r.draft.findings || []).filter(function (f) { return f.id === v.id; })[0];
        add(rm, add(el("p"), el("s", null, d ? d.headline : v.id), document.createTextNode(" · " + v.note)));
      });
      add(ai, rm);
    }

    var ch = P.charts(prof), grid = el("div", "an-charts");
    if (ch.trend) add(grid, trendChart(ch.trend));
    if (ch.share) add(grid, shareChart(ch.share));
    if (grid.children.length) add(ai, grid);

    if (r.next_steps && r.next_steps.length) {
      var ol = el("ol");
      r.next_steps.forEach(function (s) { add(ol, el("li", null, s)); });
      add(ai, add(el("div", "an-next"), el("b", null, "What to investigate next"), ol));
    }
    if (r.limits) add(ai, el("p", "an-limits", "Limits: " + r.limits));

    var draft = add(el("details", "an-more"), el("summary", null, "See the maker's first draft"));
    (r.draft && r.draft.findings || []).forEach(function (f) { add(draft, add(el("p"), el("b", null, f.headline + ". "), document.createTextNode(f.detail))); });
    var sent = add(el("details", "an-more"), el("summary", null, "See exactly what the AI was sent"));
    add(sent, el("pre", null, JSON.stringify(P.summaryForAI(prof), null, 2)));
    add(ai, draft, sent);

    var actions = add(el("div", "an-actions"));
    var pdf = el("button", "btn small", "Save as PDF"); pdf.type = "button"; pdf.addEventListener("click", function () { window.print(); });
    var again = el("button", "btn small ghost", "Try another file"); again.type = "button";
    again.addEventListener("click", function () { $("#an-pick").scrollIntoView({ behavior: "smooth", block: "start" }); });
    add(ai, add(actions, pdf, again));
    if (opts.remaining != null) add(ai, el("p", "an-sub", opts.remaining + " of " + CFG.free + " free reviews left on this connection."));
  }

  function trendChart(c) {
    var box = add(el("div", "an-chart"), el("h3", null, c.title), el("p", "an-sub", c.sub));
    var NS = "http://www.w3.org/2000/svg", W = 320, H = 160, base = 128, pts = c.points.filter(function (p) { return p.value != null; });
    var max = Math.max.apply(null, pts.map(function (p) { return p.value; }).concat([0.0001])), w = W / pts.length;
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("class", "an-svg"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", c.title);
    var ln = document.createElementNS(NS, "line"); [["x1", 0], ["y1", base], ["x2", W], ["y2", base], ["class", "grid"]].forEach(function (a) { ln.setAttribute(a[0], a[1]); }); svg.appendChild(ln);
    pts.forEach(function (p, i) {
      var h = p.value / max * 100, x = i * w + w * 0.2, bw = w * 0.6;
      var r = document.createElementNS(NS, "rect");
      [["x", x], ["y", base - h], ["width", bw], ["height", Math.max(h, 1)], ["rx", 4], ["class", "bar" + (i === pts.length - 1 ? "" : " prev")]].forEach(function (a) { r.setAttribute(a[0], a[1]); });
      var t = document.createElementNS(NS, "title"); t.textContent = p.label + ": " + fmt(p.value) + c.unit; r.appendChild(t); svg.appendChild(r);
      txt(svg, x + bw / 2, H - 14 + 10, p.label, "");
      if (i === 0 || i === pts.length - 1) txt(svg, x + bw / 2, base - h - 6, fmt(p.value) + c.unit, "v");
    });
    function txt(s, x, y, t, cls) { var e = document.createElementNS(NS, "text"); e.setAttribute("x", x); e.setAttribute("y", y); e.setAttribute("text-anchor", "middle"); if (cls) e.setAttribute("class", cls); e.textContent = t; s.appendChild(e); }
    return add(box, svg);
  }
  function shareChart(c) {
    var box = add(el("div", "an-chart"), el("h3", null, c.title), el("p", "an-sub", c.sub));
    var max = Math.max.apply(null, c.bars.map(function (b) { return b.value || 0; }).concat([0.0001]));
    c.bars.forEach(function (b) {
      var row = el("div", "an-hb"), track = el("div", "track"), fill = el("div", "fill");
      fill.style.width = ((b.value || 0) / max * 100) + "%";
      add(row, el("p", null, b.label + (b.n != null && b.n < 30 ? " (few rows)" : "")), add(track, fill), el("b", null, fmt(b.value) + c.unit));
      add(box, row);
    });
    return box;
  }

  /* ---------- running it ---------- */
  function start(name) {
    out.hidden = false; ai.hidden = true; ai.innerHTML = ""; check.innerHTML = ""; note("");
    check.appendChild(el("p", "an-wait", "Reading " + name + "…"));
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function runProfile(text, name) {
    var table = P.parseCSV(text);
    if (table.header.length < 2 || table.rows.length < 5) throw new Error("This doesn't look like a CSV file with columns and rows. If it's an Excel file, save it as CSV first.");
    if (table.rows.length > CFG.max_rows) throw new Error("This file has " + fmt(table.rows.length) + " rows. The limit is " + fmt(CFG.max_rows) + ", so please trim it and try again.");
    var prof = P.profile(table, { name: name });
    renderCheck(prof);
    return prof;
  }

  function loadSample(s, btn) {
    Array.prototype.forEach.call(document.querySelectorAll(".an-sample"), function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
    start(s.name); track("tool-analyst-sample-" + s.id);
    Promise.all([
      fetch(base + "samples/" + s.file).then(function (r) { if (!r.ok) throw new Error("sample"); return r.text(); }),
      fetch(base + "samples/" + s.id + ".review.json?v=" + (CFG.v || "")).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    ]).then(function (res) {
      var prof = runProfile(res[0], s.file);
      current = prof;
      if (res[1]) renderReview(res[1], prof, { prepared: true });
      else { ai.hidden = false; ai.innerHTML = ""; add(ai, aiHead("The prepared review for this sample is on its way. The data check above is ready now.")); }
    }).catch(function () { note("Sorry, that sample didn't load. Please refresh and try again.", "err"); });
  }

  function loadFile(file) {
    if (!file) return;
    if (file.size > CFG.max_mb * 1024 * 1024) { note("That file is over " + CFG.max_mb + " MB. Please trim it and try again.", "err"); return; }
    Array.prototype.forEach.call(document.querySelectorAll(".an-sample"), function (b) { b.setAttribute("aria-pressed", "false"); });
    start(file.name); track("tool-analyst-upload");
    var reader = new FileReader();
    reader.onerror = function () { note("Sorry, that file couldn't be read.", "err"); };
    reader.onload = function () {
      var prof;
      try { prof = runProfile(String(reader.result), file.name); } catch (e) { check.innerHTML = ""; out.hidden = true; note(e.message, "err"); return; }
      current = prof;
      offerReview(prof);
    };
    reader.readAsText(file);
  }

  function offerReview(prof) {
    ai.hidden = false; ai.innerHTML = "";
    add(ai, aiHead("Want the AI's read on this file?"));
    if (!CFG.worker_url) {
      add(ai, el("p", "an-sub", "Live reviews of your own files are being switched on. Your data check is ready above, and each sample shows a full maker-checker review."));
      return;
    }
    if (left === 0) return limitReached();
    var box = el("div", "an-consent");
    add(box, el("p", null, "This sends the summary statistics from the data check (not your rows, and nothing from personal-looking columns) to Claude for a maker-checker review."));
    var go = el("button", "btn", "Get the maker-checker review"); go.type = "button";
    go.addEventListener("click", function () { go.disabled = true; requestReview(prof); });
    add(ai, add(box, go, left != null ? el("p", "an-sub", left + " of " + CFG.free + " free reviews left") : null));
  }

  function requestReview(prof) {
    renderWorking();
    fetch(CFG.worker_url.replace(/\/$/, "") + "/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary: P.summaryForAI(prof) }) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
      .then(function (res) {
        timers.forEach(clearTimeout); timers = [];
        if (res.status === 200) { left = res.body.remaining; showQuota(); track("tool-analyst-review"); renderReview(res.body, prof, { remaining: res.body.remaining }); return; }
        if (res.body && res.body.error === "visitor_limit") { left = 0; showQuota(); return limitReached(); }
        ai.innerHTML = ""; add(ai, aiHead((res.body && res.body.message) || "Something went wrong. Please try again in a minute."));
      })
      .catch(function () { timers.forEach(clearTimeout); timers = []; ai.innerHTML = ""; add(ai, aiHead("The analyst couldn't be reached. Please check your connection and try again.")); });
  }

  function limitReached() {
    ai.hidden = false; ai.innerHTML = "";
    var box = add(el("div", "an-contact"), el("span", "mono", "You've used your " + CFG.free + " free reviews"),
      el("h3", null, "Want more analyses? Let's talk."),
      el("p", null, "Message Ajay and he'll be glad to help with more reviews, or to talk through what your data is telling you."));
    var row = el("div", "an-actions");
    var wa = $(".an-contact-tpl a[data-wa]"), li = $(".an-contact-tpl .an-li");
    if (wa) row.appendChild(wa.cloneNode(true));
    if (li) row.appendChild(li.cloneNode(true));
    add(ai, add(box, row));
  }

  var left = null;
  function showQuota() { if (quota && left != null) quota.textContent = left > 0 ? left + " of " + CFG.free + " free reviews of your own data left" : "Free reviews used: message Ajay for more"; }
  if (CFG.worker_url) {
    fetch(CFG.worker_url.replace(/\/$/, "") + "/status").then(function (r) { return r.json(); }).then(function (j) { if (j && j.remaining != null) { left = j.remaining; showQuota(); } }).catch(function () {});
  }

  /* ---------- wiring ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".an-sample"), function (b) {
    b.addEventListener("click", function () { var s = CFG.samples.filter(function (x) { return x.id === b.dataset.id; })[0]; if (s) loadSample(s, b); });
  });
  var input = $("#an-file"), drop = $("#an-drop");
  input.addEventListener("change", function () { loadFile(input.files[0]); input.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });
  drop.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
})();
