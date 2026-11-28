// Risk Appetite Builder: pick the measures a lender's board should watch, set an early-warning trigger and a limit for
// each, and test them on an illustrative sample lender: today, through next year's plan, and in a downturn. Runs in the
// browser with no AI. "Draft the board statement with AI" sends only the choices (fixed measure names and numbers) to a
// maker AI that drafts the risk appetite statement and a checker AI that checks every limit; the browser checks again.
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var CODES = { "$": "USD", "£": "GBP", "€": "EUR", "C$": "CAD" };
  var api = (document.querySelector('meta[name="ak-api"]') || {}).content || "";
  var LENDING = 4000; // the sample lender's book today, in millions
  var QL = ["−3q", "−2q", "−1q", "Now", "+1q", "+2q", "+3q", "+4q"];

  /* ---------- the sample lender: four quarters of history, then next year's plan and a downturn (at 8% growth) ---------- */
  // g = change at the end of the year for each point of growth above 8%; preset = [trigger, limit]
  var M = [
    { id: "ecl", name: "Expected credit loss", unit: "% of lending", u: "%", dp: 1, better: "low", min: 1, max: 4, step: 0.1, g: 0.03, on: true,
      hist: [1.6, 1.7, 1.7, 1.8], plan: [1.8, 1.9, 1.9, 2.0], down: [2.1, 2.5, 2.9, 3.2], preset: { cautious: [1.9, 2.2], balanced: [2.2, 2.6], growth: [2.6, 3.0] } },
    { id: "arrears", name: "Loans 90+ days past due", unit: "% of lending", u: "%", dp: 1, better: "low", min: 1.5, max: 5, step: 0.1, g: 0.02, on: true,
      hist: [2.1, 2.2, 2.2, 2.3], plan: [2.3, 2.4, 2.4, 2.5], down: [2.6, 3.1, 3.6, 4.0], preset: { cautious: [2.5, 3.0], balanced: [3.0, 3.5], growth: [3.5, 4.2] } },
    { id: "highrisk", name: "New lending to the riskiest grades", unit: "% of new lending", u: "%", dp: 0, better: "low", min: 8, max: 30, step: 1, g: 0.5, on: true,
      hist: [11, 12, 13, 14], plan: [15, 15, 16, 16], down: [15, 17, 18, 19], preset: { cautious: [12, 15], balanced: [15, 18], growth: [18, 22] } },
    { id: "conc", name: "Largest single sector or region", unit: "% of lending", u: "%", dp: 0, better: "low", min: 15, max: 40, step: 1, g: 0.25, on: false,
      hist: [21, 22, 22, 23], plan: [23, 24, 24, 25], down: [23, 24, 24, 25], preset: { cautious: [22, 25], balanced: [25, 30], growth: [30, 35] } },
    { id: "fraud", name: "Fraud losses", unit: "basis points of lending", u: " bp", dp: 0, better: "low", min: 5, max: 30, step: 1, g: 0.3, on: true,
      hist: [9, 10, 11, 12], plan: [12, 13, 13, 14], down: [13, 15, 17, 18], preset: { cautious: [12, 15], balanced: [15, 20], growth: [20, 25] } },
    { id: "capital", name: "Capital ratio (CET1)", unit: "%", u: "%", dp: 1, better: "high", min: 9, max: 15, step: 0.1, g: -0.12, on: true,
      hist: [14.2, 14.0, 13.9, 13.7], plan: [13.6, 13.4, 13.3, 13.1], down: [13.0, 12.2, 11.5, 10.9], preset: { cautious: [13.5, 12.5], balanced: [12.5, 11.5], growth: [11.5, 10.5] } },
    { id: "liquidity", name: "Liquidity coverage ratio", unit: "%", u: "%", dp: 0, better: "high", min: 100, max: 180, step: 5, g: -1.5, on: true,
      hist: [165, 160, 158, 152], plan: [150, 148, 145, 142], down: [140, 128, 120, 115], preset: { cautious: [150, 130], balanced: [130, 115], growth: [120, 105] } },
    { id: "complaints", name: "Complaints", unit: "per 1,000 customers a quarter", u: "", dp: 1, better: "low", min: 2, max: 7, step: 0.1, g: 0.03, on: false,
      hist: [3.1, 3.0, 3.3, 3.4], plan: [3.5, 3.6, 3.6, 3.7], down: [3.8, 4.3, 4.8, 5.2], preset: { cautious: [3.5, 4.5], balanced: [4.0, 5.0], growth: [4.5, 5.5] } },
    { id: "gini", name: "Credit score power (Gini)", unit: "points", u: "", dp: 0, better: "high", min: 40, max: 70, step: 1, g: 0, on: false,
      hist: [62, 61, 60, 58], plan: [57, 56, 55, 54], down: [55, 52, 50, 48], preset: { cautious: [58, 52], balanced: [55, 50], growth: [52, 45] } },
  ];
  var BY = {}; M.forEach(function (m) { BY[m.id] = m; });
  var st = { cur: "$", stance: "balanced", growth: 8, focus: "ecl", ai: null }, used = false, talkBox = null, last = null;
  M.forEach(function (m) { m.trig = m.preset.balanced[0]; m.lim = m.preset.balanced[1]; });

  /* ---------- numbers and formats ---------- */
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function fx(m, v) { return Number(v).toFixed(m.dp); }
  function val(m, v) { return fx(m, v) + m.u; }
  function money(v) { var a = Math.abs(v), c = st.cur; return (v < 0 ? "−" : "") + c + (a >= 1000 ? (a / 1000).toFixed(2) + "bn" : Math.round(a) + "m"); }
  function round(v, step) { var dp = String(step).indexOf(".") >= 0 ? String(step).split(".")[1].length : 0; return Number((Math.round(v / step) * step).toFixed(dp)); }
  function status(m, v) {
    if (m.better === "low") return v > m.lim + 1e-9 ? "red" : v > m.trig + 1e-9 ? "amber" : "green";
    return v < m.lim - 1e-9 ? "red" : v < m.trig - 1e-9 ? "amber" : "green";
  }
  var RANK = { green: 0, amber: 1, red: 2 };
  function path(m, sc, g) { // 8 quarters: 4 of history, then 4 projected under the plan or a downturn, at growth g
    var base = sc === "down" ? m.down : m.plan;
    return m.hist.concat(base.map(function (v, i) { return v + m.g * (g - 8) * (i + 1) / 4; }));
  }

  /* ---------- the assessment ---------- */
  function assess(g) {
    var rows = M.filter(function (m) { return m.on; }).map(function (m) {
      var p = path(m, "plan", g), d = path(m, "down", g), now = m.hist[3];
      var ps = p.slice(4).map(function (v) { return status(m, v); }), ds = d.slice(4).map(function (v) { return status(m, v); });
      var worstP = ps.reduce(function (a, s) { return RANK[s] > RANK[a] ? s : a; }, "green"), worstD = ds.reduce(function (a, s) { return RANK[s] > RANK[a] ? s : a; }, "green");
      var tq = null, lq = null;
      ds.forEach(function (s, i) { if (tq == null && s !== "green") tq = i + 1; if (lq == null && s === "red") lq = i + 1; });
      var worstV = m.better === "low" ? Math.max.apply(null, d.slice(4)) : Math.min.apply(null, d.slice(4));
      var sNow = status(m, now), verdict, why;
      if (sNow === "red") { verdict = "broken"; why = "Already past the limit today."; }
      else if (sNow === "amber") { verdict = "tight"; why = "Amber today, before anything goes wrong: a trigger that's always on stops being read."; }
      else if (worstP === "red") { verdict = "plan"; why = "Next year's plan breaks this limit: the plan and the appetite disagree."; }
      else if (tq == null) { verdict = "loose"; why = "Stays green even in a downturn: is this line doing any work?"; }
      else if (lq != null && lq === tq) { verdict = "close"; why = "Trigger and limit break in the same quarter: no time to act."; }
      else { verdict = "good"; why = lq ? "Warns " + (lq - tq) + " quarter" + (lq - tq > 1 ? "s" : "") + " before the limit breaks in a downturn." : "Warns in a downturn and the limit holds."; }
      return { m: m, now: now, sNow: sNow, plan: p, down: d, worstP: worstP, worstD: worstD, tq: tq, lq: lq, worstV: worstV, verdict: verdict, why: why };
    });
    return rows;
  }
  function fastest(sc) { // the fastest growth (0-30%, in steps of 0.5) with no measure red in the next 4 quarters
    var best = null;
    for (var g = 0; g <= 30.0001; g += 0.5) {
      var ok = M.filter(function (m) { return m.on; }).every(function (m) { return path(m, sc, g).slice(4).every(function (v) { return status(m, v) !== "red"; }); });
      if (ok) best = g; else break;
    }
    return best;
  }

  /* ---------- controls ---------- */
  function drawControls() {
    var h = "";
    M.forEach(function (m) {
      var lowWord = m.better === "low" ? "above" : "below";
      h += '<div class="rab-m' + (m.on ? "" : " off") + '" data-id="' + m.id + '">' +
        '<label class="fat-on"><input type="checkbox" data-on="' + m.id + '"' + (m.on ? " checked" : "") + "> <b>" + esc(m.name) + "</b></label>" +
        '<span class="rab-u">' + esc(m.unit) + " · now " + val(m, m.hist[3]) + " · " + (m.better === "low" ? "lower is safer" : "higher is safer") + "</span>" +
        '<label class="roi-sl"><span class="roi-top"><span><i class="rab-sw amber"></i>Trigger: amber when ' + lowWord + '</span><b id="rab-' + m.id + '-tv"></b></span>' +
        '<input type="range" data-k="trig" data-id="' + m.id + '" min="' + m.min + '" max="' + m.max + '" step="' + m.step + '" value="' + m.trig + '"' + (m.on ? "" : " disabled") + ' aria-label="' + esc(m.name) + ' trigger"></label>' +
        '<label class="roi-sl"><span class="roi-top"><span><i class="rab-sw red"></i>Limit: red when ' + lowWord + '</span><b id="rab-' + m.id + '-lv"></b></span>' +
        '<input type="range" data-k="lim" data-id="' + m.id + '" min="' + m.min + '" max="' + m.max + '" step="' + m.step + '" value="' + m.lim + '"' + (m.on ? "" : " disabled") + ' aria-label="' + esc(m.name) + ' limit"></label></div>';
    });
    $("#rab-ms").innerHTML = h;
    var sel = $("#rab-focus"); sel.innerHTML = M.filter(function (m) { return m.on; }).map(function (m) { return '<option value="' + m.id + '"' + (m.id === st.focus ? " selected" : "") + ">" + esc(m.name) + "</option>"; }).join("");
  }
  function syncValues() { M.forEach(function (m) { var t = $("#rab-" + m.id + "-tv"), l = $("#rab-" + m.id + "-lv"); if (t) t.textContent = val(m, m.trig); if (l) l.textContent = val(m, m.lim); }); }
  function setSlider(m, k) { var i = document.querySelector('#rab-ms input[data-k="' + k + '"][data-id="' + m.id + '"]'); if (i) i.value = m[k]; }

  /* ---------- charts ---------- */
  function board(rows) {
    var W = 560, rowH = 46, Tp = 8, L = 8, R = 8, H = Tp + rows.length * rowH + 4;
    var svg = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Each measure today against its trigger and limit, with its worst value in a downturn">';
    rows.forEach(function (r, i) {
      var m = r.m, vals = r.plan.concat(r.down, [m.trig, m.lim]), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * 0.12 || 1;
      lo -= pad; hi += pad; if (m.better === "low" && lo > 0 && lo < (hi - lo) * 0.6) lo = Math.max(0, lo);
      var X = function (v) { return L + (v - lo) / (hi - lo) * (W - L - R); }, y = Tp + i * rowH, by = y + 18, bh = 12;
      svg += '<text x="' + L + '" y="' + (y + 11) + '" class="rab-lab">' + esc(m.name) + '</text><text x="' + (W - R) + '" y="' + (y + 11) + '" text-anchor="end" class="rab-st ' + r.sNow + '">now ' + val(m, r.now) + "</text>";
      var zones = m.better === "low" ? [[lo, m.trig, "g"], [m.trig, m.lim, "a"], [m.lim, hi, "r"]] : [[lo, m.lim, "r"], [m.lim, m.trig, "a"], [m.trig, hi, "g"]];
      zones.forEach(function (z) { svg += '<rect x="' + X(z[0]).toFixed(1) + '" y="' + by + '" width="' + Math.max(0, X(z[1]) - X(z[0])).toFixed(1) + '" height="' + bh + '" class="rab-z' + z[2] + '"/>'; });
      var wx = X(r.worstV), nx = X(r.now);
      svg += '<line x1="' + nx.toFixed(1) + '" x2="' + wx.toFixed(1) + '" y1="' + (by + bh / 2) + '" y2="' + (by + bh / 2) + '" class="rab-move"/>';
      svg += '<path d="M' + wx.toFixed(1) + " " + (by - 3) + " l5 " + (bh / 2 + 3) + " l-5 " + (bh / 2 + 3) + " l-5 " + (-(bh / 2 + 3)) + ' z" class="rab-worst"><title>Worst in a downturn: ' + val(m, r.worstV) + "</title></path>";
      svg += '<circle cx="' + nx.toFixed(1) + '" cy="' + (by + bh / 2) + '" r="5.5" class="rab-now"><title>Now: ' + val(m, r.now) + "</title></circle>";
      svg += '<text x="' + X(lo).toFixed(1) + '" y="' + (by + bh + 11) + '" class="rab-tick">' + fx(m, lo) + '</text><text x="' + X(hi).toFixed(1) + '" y="' + (by + bh + 11) + '" text-anchor="end" class="rab-tick">' + fx(m, hi) + "</text>";
    });
    $("#rab-board").innerHTML = svg + "</svg>";
  }
  function pathChart(rows) {
    var r = rows.filter(function (x) { return x.m.id === st.focus; })[0] || rows[0]; if (!r) { $("#rab-path").innerHTML = ""; return; }
    var m = r.m, W = 560, H = 230, L = 46, R = 12, Tp = 14, Bm = 28;
    var vals = r.plan.concat(r.down, [m.trig, m.lim]), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
    var X = function (i) { return L + i / 7 * (W - L - R); }, Y = function (v) { return Tp + (H - Tp - Bm) * (1 - (v - lo) / (hi - lo)); };
    var svg = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(m.name) + ' over 8 quarters: history, then the plan and a downturn, against the trigger and limit">';
    var bands = m.better === "low" ? [[m.trig, m.lim, "a"], [m.lim, hi, "r"]] : [[m.lim, m.trig, "a"], [lo, m.lim, "r"]];
    bands.forEach(function (b) { svg += '<rect x="' + L + '" y="' + Y(b[1]).toFixed(1) + '" width="' + (W - L - R) + '" height="' + Math.max(0, Y(b[0]) - Y(b[1])).toFixed(1) + '" class="rab-b' + b[2] + '"/>'; });
    [[m.trig, "trigger", "rab-tl"], [m.lim, "limit", "rab-ll"]].forEach(function (t) {
      svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(t[0]).toFixed(1) + '" y2="' + Y(t[0]).toFixed(1) + '" class="' + t[2] + '"/><text x="' + (L - 6) + '" y="' + (Y(t[0]) + 3).toFixed(1) + '" text-anchor="end" class="' + t[2] + 't">' + fx(m, t[0]) + "</text>";
      svg += '<text x="' + (L + 4) + '" y="' + (Y(t[0]) - 4).toFixed(1) + '" class="' + t[2] + 't">' + t[1] + "</text>";
    });
    svg += '<line x1="' + X(3).toFixed(1) + '" x2="' + X(3).toFixed(1) + '" y1="' + Tp + '" y2="' + (H - Bm) + '" class="cs-today"/>';
    function line(arr, from, to, cls) { var d = ""; for (var i = from; i <= to; i++) d += (i === from ? "M" : "L") + X(i).toFixed(1) + " " + Y(arr[i]).toFixed(1) + " "; return '<path d="' + d + '" class="' + cls + '"/>'; }
    svg += line(r.down, 3, 7, "rab-pd") + line(r.plan, 3, 7, "rab-pp") + line(r.plan, 0, 3, "rab-ph");
    for (var i = 0; i < 8; i++) {
      if (i <= 3) svg += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(r.plan[i]).toFixed(1) + '" r="3.5" class="rab-dh"/>';
      else { svg += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(r.plan[i]).toFixed(1) + '" r="3.5" class="rab-dp"><title>Plan ' + QL[i] + ": " + val(m, r.plan[i]) + '</title></circle><circle cx="' + X(i).toFixed(1) + '" cy="' + Y(r.down[i]).toFixed(1) + '" r="3.5" class="rab-dd"><title>Downturn ' + QL[i] + ": " + val(m, r.down[i]) + "</title></circle>"; }
      svg += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle">' + QL[i] + "</text>";
    }
    var lx = X(7), ly1 = Y(r.plan[7]), ly2 = Y(r.down[7]);
    svg += '<text x="' + (lx - 6) + '" y="' + (ly1 + (ly1 < ly2 ? -7 : 13)).toFixed(1) + '" text-anchor="end" class="rab-ppt">plan</text><text x="' + (lx - 6) + '" y="' + (ly2 + (ly2 <= ly1 ? -7 : 13)).toFixed(1) + '" text-anchor="end" class="rab-pdt">downturn</text>';
    $("#rab-path").innerHTML = svg + "</svg>";
    $("#rab-path-cap").textContent = m.name + " (" + m.unit + "): four quarters of history, then next year under the plan and in a downturn, at " + st.growth + "% lending growth. " + (m.better === "low" ? "Above" : "Below") + " the trigger is amber; past the limit is red.";
  }
  var VERD = { good: ["Well set", "ready"], loose: ["Too loose?", "partly"], close: ["No warning", "gap"], tight: ["Too tight", "partly"], plan: ["Plan breaks it", "gap"], broken: ["Broken today", "gap"] };
  function table(rows) {
    var t = "<thead><tr><th>Measure</th><th>Now</th><th>Trigger</th><th>Limit</th><th>Plan, worst</th><th>Downturn, worst</th><th>Downturn: amber · red</th><th>Calibration</th></tr></thead><tbody>";
    rows.forEach(function (r) {
      var m = r.m, v = VERD[r.verdict];
      t += '<tr data-id="' + m.id + '"><td><button type="button" class="rab-pick">' + esc(m.name) + '</button></td><td><span class="rab-dot ' + r.sNow + '"></span>' + val(m, r.now) + "</td><td>" + val(m, m.trig) + "</td><td>" + val(m, m.lim) +
        '</td><td><span class="rab-dot ' + r.worstP + '"></span>' + r.worstP + '</td><td><span class="rab-dot ' + r.worstD + '"></span>' + val(m, r.worstV) + "</td><td>" + (r.tq ? QL[3 + r.tq] : "never") + " · " + (r.lq ? QL[3 + r.lq] : "never") +
        '</td><td><span class="mr-pill ' + v[1] + '">' + v[0] + '</span><small class="rab-why">' + esc(r.why) + "</small></td></tr>";
    });
    $("#rab-table").innerHTML = t + "</tbody>";
  }

  /* ---------- the plain statement (no AI) ---------- */
  var OVERALL = {
    cautious: "We aim for steady, predictable earnings. We will give up growth to stay well inside our limits, and we act early when a measure moves towards them.",
    balanced: "We accept moderate credit and fraud risk to grow steadily, while keeping capital and liquidity comfortably above our limits through a downturn.",
    growth: "We accept higher credit risk to grow faster, as long as capital and liquidity stay within our limits even in a downturn.",
  };
  function plainLine(m) {
    var w = m.better === "low" ? ["below", "rises above"] : ["above", "falls below"];
    return "We keep " + m.name.charAt(0).toLowerCase() + m.name.slice(1) + " " + w[0] + " " + val(m, m.lim) + (m.u ? "" : " " + m.unit) + ". If it " + w[1] + " " + val(m, m.trig) + (m.u ? "" : " " + m.unit) + ", the Chief Risk Officer is told and a plan goes to the risk committee.";
  }
  function plain(rows) {
    var h = '<p class="rab-sk mono">Plain draft, made in your browser</p><h4>Risk appetite statement (draft)</h4><p>' + esc(OVERALL[st.stance]) + "</p><ul>";
    rows.forEach(function (r) { h += "<li>" + esc(plainLine(r.m)) + "</li>"; });
    h += '</ul><p><b>Escalation.</b> Amber (a trigger passed): the Chief Risk Officer tells the risk committee within 5 working days, with a plan. Red (a limit broken): the board is told within 2 working days and new lending in that area is reviewed.</p>';
    $("#rab-plain").innerHTML = h;
  }

  /* ---------- the page ---------- */
  function calc() {
    syncValues();
    var rows = assess(st.growth), cnt = { green: 0, amber: 0, red: 0 }, brk = 0, good = 0;
    rows.forEach(function (r) { cnt[r.sNow]++; if (r.worstD === "red") brk++; if (r.verdict === "good") good++; });
    var fp = fastest("plan"), fd = fastest("down");
    $("#rab-today").textContent = cnt.green + " · " + cnt.amber + " · " + cnt.red;
    $("#rab-grow").textContent = fp == null ? "none" : fp >= 30 ? "30%+" : fp + "%";
    $("#rab-grow-em").textContent = fd == null ? "a downturn breaks a limit even at 0%" : "in a downturn: " + (fd >= 30 ? "30%+" : fd + "%");
    $("#rab-brk").textContent = brk + " of " + rows.length;
    $("#rab-good").textContent = good + " of " + rows.length;
    $("#rab-good").parentNode.className = good === rows.length && rows.length ? "good" : "";
    var ecl = rows.filter(function (r) { return r.m.id === "ecl"; })[0];
    $("#rab-brk-em").textContent = ecl ? "credit losses up to " + money(LENDING * Math.pow(1 + st.growth / 100, 1) * ecl.worstV / 100) + " (limit " + money(LENDING * Math.pow(1 + st.growth / 100, 1) * ecl.m.lim / 100) + ")" : "";
    board(rows); pathChart(rows); table(rows); plain(rows);
    var story;
    if (rows.length < 2) story = "Pick at least two measures: a risk appetite needs more than one line.";
    else {
      var bad = rows.filter(function (r) { return r.verdict !== "good"; });
      story = "At " + st.growth + "% lending growth, " + good + " of your " + rows.length + " measures are well set: green today, and amber before red in a downturn.";
      if (fp != null && fp < st.growth) story += " But the plan itself breaks a limit: growth above " + fp + "% doesn't fit this appetite.";
      else if (fp != null) story += " The plan fits your limits up to " + (fp >= 30 ? "30%+" : fp + "%") + " growth" + (fd == null ? ", but a downturn breaks a limit even with no growth." : fd < st.growth ? "; to survive a downturn without a red, keep it to " + fd + "%." : ", and survives a downturn at your growth.");
      if (bad.length) story += " Look again at " + bad.slice(0, 3).map(function (r) { return r.m.name.toLowerCase() + " (" + VERD[r.verdict][0].toLowerCase() + ")"; }).join(", ") + ".";
    }
    $("#rab-story").textContent = story;
    last = { rows: rows, fp: fp, fd: fd, cnt: cnt, brk: brk, good: good };
    if (st.ai) checkAI();
    if (talkBox) talkBox.akRefresh();
  }

  function mark(box, key, v) { Array.prototype.forEach.call(document.querySelectorAll(box + " .roi-c"), function (x) { x.setAttribute("aria-checked", String(x.dataset[key] === v)); }); }
  function touch() { if (!used) { used = true; if (window.akTrack) window.akTrack("tool-risk-appetite-builder-use"); } }
  function stale() { if (st.ai) { st.ai.stale = true; drawAI(); } }
  function setStance(s) {
    st.stance = s; mark("#rab-stance", "s", s);
    M.forEach(function (m) { m.trig = m.preset[s][0]; m.lim = m.preset[s][1]; setSlider(m, "trig"); setSlider(m, "lim"); });
  }
  Array.prototype.forEach.call(document.querySelectorAll("#rab-stance .roi-c"), function (x) { x.addEventListener("click", function () { setStance(x.dataset.s); touch(); stale(); calc(); }); });
  Array.prototype.forEach.call(document.querySelectorAll("#rab-cur .roi-c"), function (x) { x.addEventListener("click", function () { st.cur = x.dataset.c; mark("#rab-cur", "c", st.cur); calc(); }); });
  $("#rab-g").addEventListener("input", function (e) { st.growth = Number(e.target.value); $("#rab-g-v").textContent = st.growth + "%"; touch(); stale(); calc(); });
  $("#rab-focus").addEventListener("change", function (e) { st.focus = e.target.value; calc(); });
  $("#rab-ms").addEventListener("input", function (e) {
    var i = e.target; if (!i.dataset.k) return;
    var m = BY[i.dataset.id], k = i.dataset.k, v = Number(i.value); m[k] = v;
    // keep the trigger on the safe side of the limit, one step apart
    var safeLow = m.better === "low";
    if (k === "trig" && (safeLow ? m.trig >= m.lim : m.trig <= m.lim)) { m.lim = round(m.trig + (safeLow ? m.step : -m.step), m.step); if (m.lim > m.max || m.lim < m.min) { m.lim = safeLow ? m.max : m.min; m.trig = round(m.lim - (safeLow ? m.step : -m.step), m.step); setSlider(m, "trig"); } setSlider(m, "lim"); }
    if (k === "lim" && (safeLow ? m.trig >= m.lim : m.trig <= m.lim)) { m.trig = round(m.lim - (safeLow ? m.step : -m.step), m.step); if (m.trig > m.max || m.trig < m.min) { m.trig = safeLow ? m.min : m.max; m.lim = round(m.trig + (safeLow ? m.step : -m.step), m.step); setSlider(m, "lim"); } setSlider(m, "trig"); }
    st.focus = m.id; $("#rab-focus").value = m.id; touch(); stale(); calc();
  });
  $("#rab-ms").addEventListener("change", function (e) {
    var id = e.target.dataset.on; if (!id) return;
    var on = M.filter(function (m) { return m.on; }).length;
    if (!e.target.checked && on <= 2) { e.target.checked = true; $("#rab-story").textContent = "Keep at least two measures switched on."; return; }
    BY[id].on = e.target.checked; if (BY[id].on) st.focus = id; else if (st.focus === id) st.focus = M.filter(function (m) { return m.on; })[0].id;
    drawControls(); touch(); stale(); calc();
  });
  $("#rab-table").addEventListener("click", function (e) { var b = e.target.closest(".rab-pick"); if (!b) return; st.focus = b.closest("tr").dataset.id; $("#rab-focus").value = st.focus; calc(); $("#rab-path").scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("#rab-reset").addEventListener("click", function () { setStance(st.stance); touch(); stale(); calc(); });

  /* ---------- draft the board statement with AI (maker-checker), then check it again here ---------- */
  function payload() {
    return { stance: st.stance, growth: st.growth, metrics: last.rows.map(function (r) {
      return { id: r.m.id, now: r.now, trigger: r.m.trig, limit: r.m.lim, status_now: r.sNow, plan_status: r.worstP, downturn_worst: Math.round(r.worstV * 100) / 100, downturn_status: r.worstD };
    }) };
  }
  function hasNum(text, n, m) { var s = fx(m, n).replace(".", "\\."); return new RegExp("(^|[^\\d.])" + s + "(?![\\d])").test(text) || (m.dp && Number(n) === Math.round(n) && new RegExp("(^|[^\\d.])" + Math.round(n) + "(?![\\d.])").test(text)); }
  function checkAI() { // the browser's own check: every line must carry this measure's exact trigger and limit
    var a = st.ai, ok = 0, n = 0;
    a.lineCheck = {};
    a.statement.lines.forEach(function (l) { var m = BY[l.metric]; if (!m) return; n++; var good = hasNum(l.text, m.lim, m) && hasNum(l.text, m.trig, m); a.lineCheck[l.metric] = good; if (good) ok++; });
    a.ok = ok; a.n = n;
  }
  function drawAI() {
    var out = $("#rab-ai-out");
    if (!st.ai) { out.hidden = true; out.innerHTML = ""; return; }
    var a = st.ai, s = a.statement, v = { confirmed: 0, corrected: 0, removed: 0 };
    (a.reviews || []).forEach(function (r) { if (r.verdict in v) v[r.verdict]++; });
    var h = '<div class="ainote-memo"><p class="rab-sk mono">Drafted by a maker AI, checked by a checker AI</p><h4>' + esc(s.title) + "</h4><p>" + esc(s.overall) + "</p><ul>";
    s.lines.forEach(function (l) { var good = a.lineCheck && a.lineCheck[l.metric]; h += "<li>" + esc(l.text) + (good === false ? ' <span class="mr-pill gap">numbers differ from your settings</span>' : "") + "</li>"; });
    h += "</ul>" + (s.escalation ? "<p><b>Escalation.</b> " + esc(s.escalation) + "</p>" : "") + (s.caveat ? '<p class="ainote-cav">' + esc(s.caveat) + "</p>" : "") + "</div>";
    h += '<div class="ainote-chips"><span class="mr-pill ' + (a.limits_match === "yes" ? "ready" : a.limits_match === "partly" ? "partly" : "gap") + '">Checker AI: ' + (a.limits_match === "yes" ? "every limit matches" : a.limits_match === "partly" ? "some limits fixed" : "limits don't match") + "</span>" +
      '<span class="mr-pill ' + (a.ok === a.n ? "ready" : "gap") + '">Your browser: ' + a.ok + " of " + a.n + " lines carry your exact numbers</span>" +
      '<span class="mr-pill ready">' + v.confirmed + " confirmed</span>" + (v.corrected ? '<span class="mr-pill partly">' + v.corrected + " corrected</span>" : "") + (v.removed ? '<span class="mr-pill gap">' + v.removed + " removed</span>" : "") + "</div>";
    (a.reviews || []).filter(function (r) { return r.verdict !== "confirmed"; }).forEach(function (r) { h += '<p class="ainote-fix"><b>' + (r.verdict === "removed" ? "Removed" : "Corrected") + " (" + esc(BY[r.part] ? BY[r.part].name : r.part) + "):</b> " + esc(r.note) + "</p>"; });
    if (a.stale) h += '<p class="ainote-fix"><b>Out of date:</b> you have changed the settings since this was drafted. Draft it again to match.</p>';
    out.innerHTML = h; out.hidden = false;
  }
  function aiLeft(j) { var el = $("#rab-ai-left"); if (j && j.remaining != null) el.textContent = j.remaining > 0 ? j.remaining + " of " + j.free + " free AI statements left" : "Free AI statements used"; }
  if (api) fetch(api + "/status?tool=appetite").then(function (r) { return r.json(); }).then(aiLeft).catch(function () {});
  else { $("#rab-ai-go").disabled = true; $("#rab-ai-left").textContent = "AI statements aren't switched on here yet; the plain draft above works."; }
  $("#rab-ai-go").addEventListener("click", function () {
    var go = $("#rab-ai-go"), msg = $("#rab-ai-msg");
    if (last.rows.length < 2) { msg.textContent = "Pick at least two measures first."; return; }
    go.disabled = true; go.textContent = "Drafting…"; msg.textContent = "The maker AI is drafting your statement, then a checker AI checks every limit against your settings. About 20 to 40 seconds.";
    touch();
    fetch(api + "/appetite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        go.disabled = false; go.textContent = "Draft it again";
        if (d && d.statement) { st.ai = d; checkAI(); msg.textContent = ""; aiLeft(d); drawAI(); if (window.akTrack) window.akTrack("tool-ai-statement-risk-appetite-builder"); }
        else msg.textContent = (d && d.error === "not_found") ? "The AI statement service is being switched on. Please try again later; the plain draft above works now." : (d && d.message) || "That didn't finish. Please try again in a minute.";
      })
      .catch(function () { go.disabled = false; go.textContent = "Draft the statement with AI"; msg.textContent = "That didn't finish. Please try again in a minute."; });
  });

  /* ---------- shared link (?st=b&g=8&on=ecl.arrears&t=ecl:2.2:2.6,...&k=GBP) ---------- */
  (function () {
    var q = new URLSearchParams(location.search), s = { c: "cautious", b: "balanced", g: "growth" }[q.get("st")];
    if (s) setStance(s);
    var g = Number(q.get("g")); if (q.get("g") && g >= 0 && g <= 25) { st.growth = g; $("#rab-g").value = g; }
    var on = (q.get("on") || "").split(".").filter(function (id) { return BY[id]; });
    if (on.length >= 2) M.forEach(function (m) { m.on = on.indexOf(m.id) >= 0; });
    (q.get("t") || "").split(",").forEach(function (p) {
      var a = p.split(":"), m = BY[a[0]], t = Number(a[1]), l = Number(a[2]);
      if (m && a.length === 3 && t >= m.min && t <= m.max && l >= m.min && l <= m.max && (m.better === "low" ? t < l : t > l)) { m.trig = t; m.lim = l; }
    });
    Object.keys(CODES).forEach(function (k) { if (CODES[k] === q.get("k")) { st.cur = k; mark("#rab-cur", "c", k); } });
    if (!BY[st.focus].on) st.focus = M.filter(function (m) { return m.on; })[0].id;
  })();
  function link() {
    var on = M.filter(function (m) { return m.on; });
    return location.origin + location.pathname + "?st=" + st.stance.charAt(0) + "&g=" + st.growth + "&on=" + on.map(function (m) { return m.id; }).join(".") +
      "&t=" + on.map(function (m) { return m.id + ":" + m.trig + ":" + m.lim; }).join(",") + "&k=" + CODES[st.cur];
  }
  function lines() {
    var L = last;
    return ["Sample lender, " + money(LENDING) + " of lending · " + st.stance + " stance · " + st.growth + "% planned growth",
      "Result: " + L.good + " of " + L.rows.length + " measures well set · " + L.brk + " limits broken in a downturn · plan fits up to " + (L.fp == null ? "no" : L.fp + "%") + " growth",
      "Limits: " + L.rows.map(function (r) { return r.m.name + " trigger " + val(r.m, r.m.trig) + ", limit " + val(r.m, r.m.lim); }).join(" · ")];
  }
  $("#rab-g-v").textContent = st.growth + "%";
  drawControls(); calc();
  var holder = $("#rab-talk");
  if (holder && window.AkTalk) talkBox = window.AkTalk.mount(holder, { tool: "risk-appetite", toolName: "Risk Appetite Builder", lines: lines, link: link,
    linkNote: "The link in your message reopens the builder with your exact measures, triggers and limits. Nothing is stored." });
  window.__rab = { assess: assess, fastest: fastest, M: M, st: st, status: status, path: path, hasNum: hasNum };
})();
