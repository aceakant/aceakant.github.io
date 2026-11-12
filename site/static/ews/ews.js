// Early-Warning Studio: follow 12 monthly batches ("vintages") of new loans for 18 months each, then test early-warning
// triggers against them. Runs entirely in the browser, no AI. Three of the batches are quietly worse; can you spot them?
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var V = 12, MOB = 18, T = V + MOB, N = 2000, BAL = 8000, LGD = 0.75, DT = 19, BAD = [7, 8, 9];
  var ACT_COST = 4; // per active loan in scope, per month of action (extra collections calls, tighter limits)
  var CODES = { "$": "USD", "£": "GBP", "€": "EUR", "C$": "CAD" };
  var st = { seed: 7, down: false, reveal: false, cur: "$", t1: 2.0, t2: 30, t3: 0.25 }, used = false, talkBox = null, last = null;

  /* ---------- numbers and formats ---------- */
  function money(v, dp) {
    var a = Math.abs(v), s = v < 0 ? "−" : "", c = st.cur;
    if (a >= 1e6) return s + c + (a / 1e6).toFixed(dp == null ? 2 : dp) + "m";
    if (a >= 1e3) return s + c + Math.round(a / 1e3) + "k";
    return s + c + Math.round(a);
  }
  function pct(v, dp) { return (v * 100).toFixed(dp == null ? 1 : dp) + "%"; }
  function count(n) { return Math.round(n).toLocaleString("en-GB"); }
  function rnd(seed, v, t, k) { // repeatable noise: the same sample with or without action, so savings are like for like
    var a = (seed * 7919 + v * 104729 + t * 1299709 + k * 15485863) >>> 0;
    a = (a + 0x6D2B79F5) >>> 0; var x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }
  function noise(v, t, k, w) { return 1 + (rnd(st.seed, v, t, k) - 0.5) * 2 * w; }
  function shape(m) { return m < 1 ? 0 : Math.pow(m / 7, 1.4) * Math.exp(1.4 * (1 - m / 7)); } // missed payments peak around month 7

  /* ---------- the simulation ---------- */
  // act: { from: {vintage: calendar month action starts} } — collections step up and limits tighten for loans in scope
  function sim(act) {
    var vs = [], port = [], i, t;
    for (i = 1; i <= V; i++) vs.push({ v: i, bad: BAD.indexOf(i) >= 0, vf: noise(i, 0, 9, 0.12), cur: N, d30: 0, d60: 0, def: 0, at: [] });
    for (t = 1; t <= T; t++) {
      var p = { t: t, d30prev: 0, d60prev: 0, n60: 0, nDef: 0, active: 0, d30: 0, cost: 0 };
      vs.forEach(function (x) {
        var m = t - x.v; if (m < 0 || m > MOB) return;
        if (m === 0) { x.at[0] = { d30: 0, d60: 0, def: 0 }; p.active += N; return; }
        var down = st.down && t >= DT, acting = act && act[x.v] != null && t >= act[x.v];
        var h = 0.016 * shape(m) * x.vf * (x.bad ? 1.9 : 1) * (down ? 1.5 : 1) * noise(x.v, t, 1, 0.1) * (acting ? (x.bad ? 0.85 : 0.97) : 1);
        var r1 = Math.min(0.9, (0.27 + (x.bad ? 0.12 : 0) + (down ? 0.08 : 0)) * noise(x.v, t, 2, 0.06) * (acting ? (x.bad ? 0.7 : 0.92) : 1));
        var r2 = Math.min(0.95, (0.55 + (x.bad ? 0.08 : 0) + (down ? 0.06 : 0)) * noise(x.v, t, 3, 0.05) * (acting ? (x.bad ? 0.8 : 0.95) : 1));
        var n30 = x.cur * h, n60 = x.d30 * r1, nd = x.d60 * r2;
        p.d30prev += x.d30; p.d60prev += x.d60; p.n60 += n60; p.nDef += nd;
        x.cur = x.cur - n30 + (x.d30 - n60) + (x.d60 - nd); x.d30 = n30; x.d60 = n60; x.def += nd;
        x.at[m] = { d30: x.d30, d60: x.d60, def: x.def };
        var live = x.cur + x.d30 + x.d60; p.active += live; p.d30 += x.d30 + x.d60;
        if (acting) p.cost += live * ACT_COST;
      });
      p.roll1 = p.d30prev > 0 ? p.n60 / p.d30prev : 0; p.roll2 = p.d60prev > 0 ? p.nDef / p.d60prev : 0;
      p.defRate = p.active > 0 ? p.nDef / p.active : 0; p.loss = p.nDef * BAL * LGD;
      port.push(p);
    }
    var loss = 0, cost = 0; port.forEach(function (p) { loss += p.loss; cost += p.cost; });
    return { vs: vs, port: port, loss: loss, cost: cost };
  }

  // a portfolio trigger "fires" at the start of the first run of 3+ months above the line; shorter runs are false alarms
  function episodes(port, key, line, from) {
    var runs = [], run = null;
    port.forEach(function (p) {
      var on = p.t >= from && p[key] > line;
      if (on && !run) run = { s: p.t, len: 0 };
      if (on) run.len++;
      if (!on && run) { runs.push(run); run = null; }
    });
    if (run) runs.push(run);
    var real = runs.filter(function (r) { return r.len >= 3; })[0];
    return { fire: real ? real.s : null, blips: runs.filter(function (r) { return r.len < 3 && (!real || r.s < real.s); }).length };
  }

  function triggers(base) {
    var peak = base.port.reduce(function (a, p) { return p.loss > a.loss ? p : a; }, base.port[0]).t, out = [];
    // 1. each batch's 30+ days past due at 3 months on book (an early, batch-level signal)
    var flagged = {}, caught = 0, falseA = 0, first = null;
    base.vs.forEach(function (x) {
      var a = x.at[3]; if (!a) return;
      var r = (a.d30 + a.d60) / N, t = x.v + 3;
      if (r > st.t1 / 100) {
        flagged[x.v] = t; first = first == null ? t : Math.min(first, t);
        if (x.bad) caught++; else if (!(st.down && t >= DT)) falseA++;
      }
    });
    out.push({ id: "t1", name: "30+ days past due at month 3, per batch", line: st.t1.toFixed(1) + "%", fire: first, caught: caught, falseA: falseA, act: flagged, scope: "the flagged batches" });
    // 2. portfolio roll rate from 30 to 60 days past due (a middle signal)
    var e2 = episodes(base.port, "roll1", st.t2 / 100, 4), a2 = {};
    if (e2.fire) base.vs.forEach(function (x) { a2[x.v] = e2.fire; });
    out.push({ id: "t2", name: "Portfolio roll rate, 30 → 60 days", line: st.t2 + "%", fire: e2.fire, caught: null, falseA: e2.blips, act: e2.fire ? a2 : null, scope: "the whole book" });
    // 3. portfolio new defaults (90+ days) as a share of live loans each month (a late signal)
    var e3 = episodes(base.port, "defRate", st.t3 / 100, 4), a3 = {};
    if (e3.fire) base.vs.forEach(function (x) { a3[x.v] = e3.fire; });
    out.push({ id: "t3", name: "Portfolio new defaults (90+ days) a month", line: st.t3.toFixed(2) + "%", fire: e3.fire, caught: null, falseA: e3.blips, act: e3.fire ? a3 : null, scope: "the whole book" });
    out.forEach(function (g) {
      g.warn = g.fire ? peak - g.fire : null;
      if (g.act) { var s = sim(g.act); g.saved = base.loss - s.loss; g.cost = s.cost; g.net = g.saved - g.cost; } else { g.saved = 0; g.cost = 0; g.net = 0; }
    });
    return { list: out, peak: peak };
  }

  /* ---------- charts ---------- */
  function vintageChart(base) {
    var W = 560, H = 230, L = 46, R = 12, Tp = 12, Bm = 30, mx = 0;
    base.vs.forEach(function (x) { x.at.forEach(function (a) { if (a && a.def / N > mx) mx = a.def / N; }); });
    mx = Math.max(0.01, mx * 1.08);
    var X = function (m) { return L + m / MOB * (W - L - R); }, Y = function (v) { return Tp + (H - Tp - Bm) * (1 - v / mx); };
    var svg = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Share of each batch defaulted by months on book, for 12 monthly batches' + (st.reveal ? "; batches 7, 8 and 9 highlighted as the worse group" : "") + '">';
    [0, mx / 2, mx].forEach(function (v) { svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" class="cs-grid"/><text x="' + (L - 6) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + pct(v, 1) + "</text>"; });
    var order = base.vs.slice().sort(function (a, b) { return (st.reveal && a.bad ? 1 : 0) - (st.reveal && b.bad ? 1 : 0); });
    order.forEach(function (x) {
      var d = "", started = false;
      x.at.forEach(function (a, m) { if (!a) return; d += (started ? "L" : "M") + X(m).toFixed(1) + " " + Y(a.def / N).toFixed(1) + " "; started = true; });
      var cls = st.reveal ? (x.bad ? "ews-bad" : "ews-norm") : "ews-any";
      svg += '<path d="' + d + '" class="ews-v ' + cls + '"><title>Batch ' + x.v + "</title></path>";
      var lastA = x.at[x.at.length - 1], lm = x.at.length - 1;
      if (lastA && (st.reveal ? x.bad : x.v % 3 === 0)) svg += '<text x="' + (X(lm) - 3).toFixed(1) + '" y="' + (Y(lastA.def / N) - 4).toFixed(1) + '" text-anchor="end" class="' + (st.reveal && x.bad ? "ews-badt" : "") + '">B' + x.v + "</text>";
    });
    [0, 3, 6, 9, 12, 15, 18].forEach(function (m) { svg += '<text x="' + X(m).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + m + "</text>"; });
    $("#ews-vint").innerHTML = svg + "</svg>";
  }

  function timeChart(base, tr) {
    var W = 560, H = 230, L = 52, R = 12, Tp = 18, Bm = 30, mx = 0;
    base.port.forEach(function (p) { if (p.loss > mx) mx = p.loss; }); mx *= 1.12;
    var X = function (t) { return L + (t - 1) / (T - 1) * (W - L - R); }, Y = function (v) { return Tp + (H - Tp - Bm) * (1 - v / mx); };
    var bw = (W - L - R) / T * 0.72;
    var svg = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Credit losses each month; losses peak in month ' + tr.peak + '">';
    if (st.down) svg += '<rect x="' + X(DT).toFixed(1) + '" y="' + Tp + '" width="' + (W - R - X(DT)).toFixed(1) + '" height="' + (H - Tp - Bm) + '" class="ews-down"/><text x="' + (X(DT) + 4).toFixed(1) + '" y="' + (Tp + 10) + '" class="ews-downt">downturn</text>';
    [0, mx / 2].forEach(function (v) { svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" class="cs-grid"/><text x="' + (L - 6) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + money(v, 1) + "</text>"; });
    base.port.forEach(function (p) { svg += '<rect x="' + (X(p.t) - bw / 2).toFixed(1) + '" y="' + Y(p.loss).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (Y(0) - Y(p.loss)).toFixed(1) + '" class="' + (p.t === tr.peak ? "ews-peak" : "ews-lossbar") + '"><title>Month ' + p.t + ": " + money(p.loss, 1) + "</title></rect>"; });
    tr.list.forEach(function (g, i) {
      if (!g.fire) return;
      var x = X(g.fire), yy = Tp + 2 + i * 14;
      svg += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + yy + '" y2="' + (H - Bm) + '" class="ews-fire ews-' + g.id + '"/>';
      svg += '<circle cx="' + x.toFixed(1) + '" cy="' + yy + '" r="6" class="ews-firec ews-' + g.id + 'c"/><text x="' + x.toFixed(1) + '" y="' + (yy + 3.5) + '" text-anchor="middle" class="ews-firet">' + (i + 1) + "</text>";
    });
    [1, 6, 12, 18, 24, 30].forEach(function (t) { svg += '<text x="' + X(t).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + t + "</text>"; });
    $("#ews-time").innerHTML = svg + "</svg>";
  }

  function rollTable(base) {
    var rows = [["Month", "30 → 60 days", "60 → 90+ days", "New defaults a month"]];
    [6, 12, 18, 24, 30].forEach(function (t) { var p = base.port[t - 1]; rows.push(["Month " + t, pct(p.roll1, 0), pct(p.roll2, 0), pct(p.defRate, 2) + " of live loans"]); });
    var tb = $("#ews-rolls"); tb.innerHTML = "";
    rows.forEach(function (r, i) { var tr = document.createElement("tr"); r.forEach(function (c) { var td = document.createElement(i ? "td" : "th"); td.textContent = c; tr.appendChild(td); }); tb.appendChild(tr); });
  }

  function scorecard(tr) {
    var tb = $("#ews-score"); tb.innerHTML = "";
    var head = ["", "Trigger", "Line", "Fires in", "Warning before the peak", "Worse batches caught", "False alarms", "Saved by acting then"];
    var trh = document.createElement("tr"); head.forEach(function (h) { var th = document.createElement("th"); th.textContent = h; trh.appendChild(th); }); tb.appendChild(trh);
    tr.list.forEach(function (g, i) {
      var r = document.createElement("tr");
      [String(i + 1), g.name, g.line, g.fire ? "month " + g.fire : "never", g.fire ? (g.warn > 0 ? g.warn + " months" : g.warn === 0 ? "at the peak" : (-g.warn) + " months after") : "—",
        g.caught == null ? "whole book" : g.caught + " of 3", String(g.falseA), g.fire ? money(g.net, 1) : "—"].forEach(function (c, k) {
        var td = document.createElement("td"); td.textContent = c;
        if (k === 0) td.className = "ews-num ews-" + g.id + "c";
        if (k === 7 && g.fire) td.className = g.net >= 0 ? "ews-pos" : "ews-neg";
        r.appendChild(td);
      });
      tb.appendChild(r);
    });
  }

  /* ---------- the page ---------- */
  function calc() {
    ["t1", "t2", "t3"].forEach(function (k) { var v = Number($("#ews-" + k).value); st[k] = v; $("#ews-" + k + "-v").textContent = (k === "t2" ? v : v.toFixed(k === "t3" ? 2 : 1)) + "%"; });
    var base = sim(null), tr = triggers(base);
    vintageChart(base); timeChart(base, tr); rollTable(base); scorecard(tr);
    var fired = tr.list.filter(function (g) { return g.fire; }), best = fired.slice().sort(function (a, b) { return b.net - a.net; })[0];
    var earliest = fired.slice().sort(function (a, b) { return a.fire - b.fire; })[0];
    $("#ews-peak").textContent = "Month " + tr.peak;
    $("#ews-loss").textContent = money(base.loss, 1);
    $("#ews-warn").textContent = earliest ? (earliest.warn > 0 ? earliest.warn + " months" : "none") : "none";
    $("#ews-saved").textContent = best ? money(best.net, 1) : money(0);
    $("#ews-saved").parentNode.className = best && best.net > 0 ? "good" : "";
    var story;
    if (!fired.length) story = "None of your triggers fired: the lines are set too high to see this book go bad. Lower them and watch how much warning you get.";
    else {
      story = "Losses peak in month " + tr.peak + ". Trigger " + (tr.list.indexOf(earliest) + 1) + " fires first, in month " + earliest.fire + (earliest.warn > 0 ? ", " + earliest.warn + " months ahead" : ", too late to get ahead of it") + ".";
      story += " Acting on trigger " + (tr.list.indexOf(best) + 1) + " is worth " + money(best.net, 1) + " after the cost of acting.";
      var t1 = tr.list[0];
      if (t1.fire && t1.caught === 3 && t1.falseA === 0) story += " The batch trigger caught all three worse batches without flagging a normal one.";
      else if (t1.falseA > 0) story += " The batch trigger also flagged " + t1.falseA + " normal batch" + (t1.falseA > 1 ? "es" : "") + ": each one is a false alarm someone has to chase.";
      else if (t1.fire && t1.caught < 3) story += " The batch trigger missed " + (3 - t1.caught) + " of the 3 worse batches.";
    }
    if (st.down) story += " The downturn from month " + DT + " lifts every batch, so portfolio triggers fire whatever the batches looked like.";
    $("#ews-story").textContent = story;
    $("#ews-reveal").textContent = st.reveal ? "Hide which batches were worse" : "Show which batches were worse";
    last = { base: base, tr: tr, best: best, earliest: earliest };
    if (talkBox) talkBox.akRefresh();
  }

  function mark(box, key, val) { Array.prototype.forEach.call(document.querySelectorAll(box + " .roi-c"), function (x) { x.setAttribute("aria-checked", String(x.dataset[key] === val)); }); }
  function touch() { if (!used) { used = true; if (window.akTrack) window.akTrack("tool-early-warning-studio-use"); } }
  Array.prototype.forEach.call(document.querySelectorAll("#ews-econ .roi-c"), function (x) { x.addEventListener("click", function () { st.down = x.dataset.e === "down"; mark("#ews-econ", "e", x.dataset.e); touch(); calc(); }); });
  Array.prototype.forEach.call(document.querySelectorAll("#ews-cur .roi-c"), function (x) { x.addEventListener("click", function () { st.cur = x.dataset.c; mark("#ews-cur", "c", st.cur); calc(); }); });
  ["t1", "t2", "t3"].forEach(function (k) { $("#ews-" + k).addEventListener("input", function () { touch(); calc(); }); });
  $("#ews-reveal").addEventListener("click", function () { st.reveal = !st.reveal; touch(); calc(); });
  $("#ews-new").addEventListener("click", function () { st.seed = 1 + Math.floor(Math.random() * 9999); st.reveal = false; touch(); calc(); });

  // settings from a shared link (?s=seed&d=1&a=3.0&b=30&c=0.9&k=GBP)
  (function () {
    var q = new URLSearchParams(location.search), n;
    n = parseInt(q.get("s"), 10); if (n > 0 && n < 100000) st.seed = n;
    if (q.get("d") === "1") { st.down = true; mark("#ews-econ", "e", "down"); }
    [["a", "t1"], ["b", "t2"], ["c", "t3"]].forEach(function (p) { var v = Number(q.get(p[0])), i = $("#ews-" + p[1]); if (v >= Number(i.min) && v <= Number(i.max)) i.value = v; });
    Object.keys(CODES).forEach(function (k) { if (CODES[k] === q.get("k")) { st.cur = k; mark("#ews-cur", "c", k); } });
  })();
  function link() { return location.origin + location.pathname + "?s=" + st.seed + "&d=" + (st.down ? 1 : 0) + "&a=" + st.t1 + "&b=" + st.t2 + "&c=" + st.t3 + "&k=" + CODES[st.cur]; }
  function lines() {
    var L = last;
    return ["Book: 12 monthly batches of " + count(N) + " loans · " + (st.down ? "downturn from month " + DT : "normal economy") + " · losses peak in month " + L.tr.peak,
      "Triggers: " + L.tr.list.map(function (g, i) { return (i + 1) + ") " + g.name + " over " + g.line + ": " + (g.fire ? "fires month " + g.fire + ", " + g.falseA + " false alarms, " + money(g.net, 1) + " saved" : "never fires"); }).join(" · ")];
  }
  calc();
  // the AI note: only these settings and results are sent
  function facts() {
    var L = last, f = { data: "illustrative sample loan book: 12 monthly batches of 2,000 loans followed for 18 months; batches 7-9 are quietly worse",
      currency: CODES[st.cur], economy: st.down ? "downturn from month " + DT : "normal", total_credit_losses: Math.round(L.base.loss), losses_peak_in_month: L.tr.peak,
      cost_of_acting_per_live_loan_per_month: ACT_COST };
    L.tr.list.forEach(function (g, i) {
      var k = "trigger_" + (i + 1) + "_";
      f[k + "name"] = g.name + " over " + g.line;
      f[k + "fires_in_month"] = g.fire || "never";
      f[k + "months_of_warning_before_peak"] = g.fire ? g.warn : "n/a";
      f[k + "false_alarms"] = g.falseA;
      if (g.caught != null) f[k + "worse_batches_caught_of_3"] = g.caught;
      f[k + "net_saving_if_acted_on"] = Math.round(g.net);
    });
    return f;
  }
  var noteHolder = $("#ews-note");
  if (noteHolder && window.AkNote) window.AkNote.mount(noteHolder, { tool: "early-warning", facts: facts });
  var holder = $("#ews-talk");
  if (holder && window.AkTalk) talkBox = window.AkTalk.mount(holder, { tool: "early-warning", toolName: "Early-Warning Studio", lines: lines, link: link,
    linkNote: "The link in your message reopens the studio with your exact sample and triggers. Nothing is stored." });
  window.__ews = { sim: sim, triggers: triggers, st: st };
})();
