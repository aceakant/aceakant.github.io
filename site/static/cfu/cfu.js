// Cash-Flow Underwriting Lab: the same 5,000 loan applicants decided twice, once on the credit bureau file alone and once
// with bank-account cash flow added (for the applicants who agree to share it). Both policies approve as many people as
// they can while keeping the expected bad rate within your appetite. Runs entirely in the browser, no AI.
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var N = 5000, LOAN = 6000, EARN = 0.14, LOSE = 0.65, THIN = 0.25;
  var CODES = { "$": "USD", "£": "GBP", "€": "EUR", "C$": "CAD" };
  var st = { seed: 11, cur: "$", target: 5, consent: 70, w: 50 }, used = false, talkBox = null, last = null, P = null;

  /* ---------- formats ---------- */
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function money(v, dp) { var a = Math.abs(v), s = v < 0 ? "−" : "", c = st.cur;
    if (a >= 1e6) return s + c + (a / 1e6).toFixed(dp == null ? 2 : dp) + "m"; if (a >= 1e4) return s + c + Math.round(a / 1e3) + "k"; return s + c + Math.round(a).toLocaleString("en-GB"); }
  function pct(v, dp) { return (v * 100).toFixed(dp == null ? 1 : dp) + "%"; }
  function count(n) { return Math.round(n).toLocaleString("en-GB"); }
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- the applicants ---------- */
  // z = how well someone really manages money (hidden). The bureau sees it clearly for people with a long credit file and
  // only faintly for thin files, which also score lower for having little history. Bank-account cash flow sees it about as
  // well for everyone, through four signals.
  function people(seed) {
    var r = rng(seed), out = [];
    for (var i = 0; i < N; i++) {
      var thin = r() < THIN, z = gauss(r), e = gauss(r), s = [0, 1, 2, 3].map(function () { return 0.5 * z + 0.866 * gauss(r); });
      var pd = 1 / (1 + Math.exp(-((thin ? -2.8 : -3.0) - 1.15 * z)));
      var b = thin ? 0.3 * z + 0.95 * e - 0.8 : 0.75 * z + 0.66 * e;
      var cf = (s[0] + s[1] + s[2] + s[3]) / 4 / Math.sqrt(0.4375);
      out.push({ i: i, thin: thin, pd: pd, b: b, cf: cf, u: r(), s: s,
        score: Math.round(clamp(640 + 75 * b, 300, 900)), cfs: Math.round(clamp(50 + 15 * cf, 1, 99)),
        stable: Math.round(clamp(9 + 2.5 * s[0], 2, 12)), essential: Math.round(clamp(58 - 10 * s[1], 25, 95)),
        buffer: Math.round(clamp(Math.exp(2.6 + 0.7 * s[2]), 1, 180)), overdraft: Math.round(clamp(5 - 5 * s[3], 0, 60)),
        file: thin ? (1 + Math.floor(r() * 2)) + " account" + "s" + ", " + (4 + Math.floor(r() * 9)) + " months" : (4 + Math.floor(r() * 9)) + " accounts, " + (3 + Math.floor(r() * 15)) + " years" });
      if (thin && out[i].file.indexOf("1 accounts") === 0) out[i].file = out[i].file.replace("1 accounts", "1 account");
    }
    return out;
  }

  /* ---------- the two policies ---------- */
  function shared(p) { return p.u < st.consent / 100; }
  function scoreBureau(p) { return p.b; }
  function scoreCash(p) { if (!shared(p)) return p.b; var w = st.w / 100; return p.thin ? 0.2 * p.b + 0.8 * p.cf : (1 - w) * p.b + w * p.cf; }
  function decide(score) { // rank everyone, approve the most people whose expected bad rate stays within the appetite
    var a = P.slice().sort(function (x, y) { return score(y) - score(x); }), cum = 0, k = 0, curve = [];
    for (var j = 0; j < a.length; j++) {
      cum += a[j].pd;
      if (cum / (j + 1) <= st.target / 100 + 1e-12) k = j + 1;
      if ((j + 1) % 50 === 0) curve.push([(j + 1) / N, cum / (j + 1)]);
    }
    var ok = new Uint8Array(N); for (j = 0; j < k; j++) ok[a[j].i] = 1;
    return { ok: ok, k: k, curve: curve };
  }
  function stats(ok, f) {
    var n = 0, tot = 0, bad = 0, profit = 0, goodDeclined = 0;
    P.forEach(function (p) {
      if (!f(p)) return; tot++;
      if (ok[p.i]) { n++; bad += p.pd; profit += (1 - p.pd) * EARN * LOAN - p.pd * LOSE * LOAN; }
      else goodDeclined += 1 - p.pd;
    });
    return { n: n, tot: tot, rate: tot ? n / tot : 0, bad: n ? bad / n : 0, profit: profit, goodDeclined: goodDeclined };
  }

  /* ---------- charts ---------- */
  function curveChart(A, B) {
    var W = 560, H = 240, L = 46, R = 12, Tp = 14, Bm = 30, ymax = 0.14;
    var X = function (v) { return L + v * (W - L - R); }, Y = function (v) { return Tp + (H - Tp - Bm) * (1 - Math.min(v, ymax) / ymax); };
    var svg = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Approval rate against expected bad rate for both policies, with your appetite line">';
    [0, 0.04, 0.08, 0.12].forEach(function (v) { svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" class="cs-grid"/><text x="' + (L - 6) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + pct(v, 0) + "</text>"; });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { svg += '<text x="' + X(v).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + pct(v, 0) + "</text>"; });
    svg += '<text x="' + (W - R) + '" y="' + (H - 1) + '" text-anchor="end">share of applicants approved →</text>';
    var ty = Y(st.target / 100);
    svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + ty.toFixed(1) + '" y2="' + ty.toFixed(1) + '" class="cfu-target"/><text x="' + (L + 4) + '" y="' + (ty - 5).toFixed(1) + '" class="cfu-targett">your appetite: ' + st.target + "% bad rate</text>";
    function path(c, cls) { return '<path d="' + c.map(function (p, i) { return (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); }).join(" ") + '" class="' + cls + '"/>'; }
    svg += path(A.curve, "cfu-ca") + path(B.curve, "cfu-cb");
    [[A, "cfu-pa", "bureau only"], [B, "cfu-pb", "with cash flow"]].forEach(function (d, i) {
      var x = X(d[0].k / N);
      svg += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + ty.toFixed(1) + '" y2="' + (H - Bm) + '" class="' + d[1] + 'l"/><circle cx="' + x.toFixed(1) + '" cy="' + ty.toFixed(1) + '" r="5.5" class="' + d[1] + '"/>';
      svg += '<text x="' + x.toFixed(1) + '" y="' + (H - Bm - 6 - i * 12) + '" text-anchor="' + (i ? "start" : "end") + '" dx="' + (i ? 5 : -5) + '" class="' + d[1] + 't">' + d[2] + " " + pct(d[0].k / N, 0) + "</text>";
    });
    $("#cfu-curve").innerHTML = svg + "</svg>";
  }
  function groupChart(g) {
    var W = 560, H = 230, L = 46, R = 12, Tp = 16, Bm = 40;
    var Y = function (v) { return Tp + (H - Tp - Bm) * (1 - v); };
    var svg = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Approval rate for long and thin credit files, bureau only against with cash flow">';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) { svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" class="cs-grid"/><text x="' + (L - 6) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + pct(v, 0) + "</text>"; });
    var groups = [["Long credit file", g.thickA, g.thickB], ["Thin credit file", g.thinA, g.thinB]], gw = (W - L - R) / 2, bw = Math.min(70, gw * 0.3);
    groups.forEach(function (gr, i) {
      var cx = L + gw * i + gw / 2;
      [[gr[1], "cfu-ba", -1], [gr[2], "cfu-bb", 1]].forEach(function (b) {
        var x = cx + b[2] * (bw / 2 + 4) - bw / 2, y = Y(b[0].rate);
        svg += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (Y(0) - y).toFixed(1) + '" rx="3" class="' + b[1] + '"><title>' + pct(b[0].rate) + " approved, bad rate " + pct(b[0].bad) + "</title></rect>";
        svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 5).toFixed(1) + '" text-anchor="middle" class="cfu-v">' + pct(b[0].rate, 0) + "</text>";
        svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (Y(0) + 13) + '" text-anchor="middle">bad ' + pct(b[0].bad, 1) + "</text>";
      });
      svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" class="cfu-g">' + gr[0] + " (" + count(gr[1].tot) + ")</text>";
    });
    $("#cfu-groups").innerHTML = svg + "</svg>";
  }
  function swapTable(A, B) {
    var cells = [
      ["Approved by both", function (p) { return A.ok[p.i] && B.ok[p.i]; }],
      ["Only with cash flow: newly approved", function (p) { return !A.ok[p.i] && B.ok[p.i]; }],
      ["Only on the bureau: now declined", function (p) { return A.ok[p.i] && !B.ok[p.i]; }],
      ["Declined by both", function (p) { return !A.ok[p.i] && !B.ok[p.i]; }]];
    var t = "<thead><tr><th>Applicants</th><th>Number</th><th>Thin credit file</th><th>Shared bank data</th><th>Expected bad rate</th></tr></thead><tbody>", out = {};
    cells.forEach(function (c, k) {
      var n = 0, thin = 0, sh = 0, bad = 0;
      P.forEach(function (p) { if (!c[1](p)) return; n++; if (p.thin) thin++; if (shared(p)) sh++; bad += p.pd; });
      out[k] = { n: n, bad: n ? bad / n : 0, thin: n ? thin / n : 0 };
      t += '<tr class="' + (k === 1 ? "cfu-in" : k === 2 ? "cfu-out" : "") + '"><td>' + c[0] + "</td><td>" + count(n) + "</td><td>" + (n ? pct(thin / n, 0) : "—") + "</td><td>" + (n ? pct(sh / n, 0) : "—") + "</td><td>" + (n ? pct(bad / n, 1) : "—") + "</td></tr>";
    });
    $("#cfu-swap").innerHTML = t + "</tbody>";
    return out;
  }
  function examples(A, B) {
    var ins = P.filter(function (p) { return !A.ok[p.i] && B.ok[p.i]; }), outs = P.filter(function (p) { return A.ok[p.i] && !B.ok[p.i]; });
    var pickIn = ins.filter(function (p) { return p.thin; }).sort(function (a, b) { return a.pd - b.pd; })[Math.floor(ins.length / 12)] || ins[0];
    var pickOut = outs.slice().sort(function (a, b) { return b.pd - a.pd; })[Math.floor(outs.length / 6)] || outs[0];
    var h = "";
    [[pickIn, "Newly approved with cash flow", "cfu-in"], [pickOut, "Approved on the bureau, declined with cash flow", "cfu-out"]].forEach(function (x, k) {
      var p = x[0]; if (!p) return;
      h += '<div class="cfu-app ' + x[2] + '"><span class="mono cs-k">' + x[1] + "</span><b>Applicant " + (k ? "B" : "A") + " · " + (p.thin ? "thin credit file" : "long credit file") + "</b><dl>" +
        "<dt>Credit file</dt><dd>" + esc(p.file) + "</dd><dt>Bureau score</dt><dd>" + p.score + "</dd><dt>Cash-flow score</dt><dd>" + p.cfs + " / 99</dd>" +
        "<dt>Months with steady income</dt><dd>" + p.stable + " of 12</dd><dt>Essential spend</dt><dd>" + p.essential + "% of income</dd>" +
        "<dt>Money left at month end</dt><dd>" + p.buffer + " days of spending</dd><dt>Overdrawn</dt><dd>" + p.overdraft + " of the last 90 days</dd>" +
        '<dt>Chance of not repaying</dt><dd><b>' + pct(p.pd, 1) + "</b></dd></dl></div>";
    });
    $("#cfu-apps").innerHTML = h;
  }

  /* ---------- the page ---------- */
  function calc() {
    $("#cfu-t-v").textContent = st.target.toFixed(1) + "%"; $("#cfu-c-v").textContent = st.consent + "%"; $("#cfu-w-v").textContent = st.w + "%";
    if (!P || P.seed !== st.seed) { P = people(st.seed); P.seed = st.seed; }
    var A = decide(scoreBureau), B = decide(scoreCash);
    var all = function () { return true; }, thin = function (p) { return p.thin; }, thick = function (p) { return !p.thin; };
    var g = { allA: stats(A.ok, all), allB: stats(B.ok, all), thinA: stats(A.ok, thin), thinB: stats(B.ok, thin), thickA: stats(A.ok, thick), thickB: stats(B.ok, thick) };
    curveChart(A, B); groupChart(g); var sw = swapTable(A, B); examples(A, B);
    var extra = g.allB.n - g.allA.n, dProfit = (g.allB.profit - g.allA.profit) * 12;
    $("#cfu-extra").textContent = (extra >= 0 ? "+" : "−") + count(Math.abs(extra));
    $("#cfu-extra-em").textContent = pct(g.allA.rate, 0) + " → " + pct(g.allB.rate, 0) + " approved";
    $("#cfu-thin").textContent = pct(g.thinA.rate, 0) + " → " + pct(g.thinB.rate, 0);
    $("#cfu-thin-em").textContent = count(g.thinB.n - g.thinA.n) + " more thin-file applicants";
    $("#cfu-in").textContent = sw[1].n ? pct(sw[1].bad, 1) : "—";
    $("#cfu-in-em").textContent = count(sw[1].n) + " newly approved · " + count(sw[2].n) + " now declined at " + (sw[2].n ? pct(sw[2].bad, 1) : "—");
    $("#cfu-profit").textContent = (dProfit >= 0 ? "+" : "−") + money(Math.abs(dProfit), 1);
    $("#cfu-profit-em").textContent = "a year, at 5,000 applications a month";
    $("#cfu-profit").parentNode.className = dProfit > 0 ? "good" : "";
    var story = "At a " + st.target.toFixed(1) + "% bad-rate appetite, the bureau alone approves " + pct(g.allA.rate, 0) + " of applicants; adding cash flow approves " + pct(g.allB.rate, 0) + ", at the same expected bad rate.";
    story += " Thin-file applicants gain most: from " + pct(g.thinA.rate, 0) + " to " + pct(g.thinB.rate, 0) + " approved, because the bureau barely sees them but their bank account does.";
    if (sw[2].n) story += " Cash flow also declines " + count(sw[2].n) + " people the bureau would have approved, with an expected bad rate of " + pct(sw[2].bad, 1) + ".";
    if (g.allA.rate > 0.97) story = "At a " + st.target.toFixed(1) + "% bad-rate appetite, almost everyone is approved either way, so cash flow adds little. Lower the appetite to see the difference.";
    if (st.consent < 50) story += " Only " + st.consent + "% share their bank data, so most applicants are still judged on the bureau file.";
    $("#cfu-story").textContent = story;
    last = { A: A, B: B, g: g, sw: sw, extra: extra, dProfit: dProfit };
    if (talkBox) talkBox.akRefresh();
  }

  function mark(box, key, v) { Array.prototype.forEach.call(document.querySelectorAll(box + " .roi-c"), function (x) { x.setAttribute("aria-checked", String(x.dataset[key] === v)); }); }
  function touch() { if (!used) { used = true; if (window.akTrack) window.akTrack("tool-cash-flow-underwriting-use"); } }
  Array.prototype.forEach.call(document.querySelectorAll("#cfu-cur .roi-c"), function (x) { x.addEventListener("click", function () { st.cur = x.dataset.c; mark("#cfu-cur", "c", st.cur); calc(); }); });
  [["#cfu-t", "target"], ["#cfu-c", "consent"], ["#cfu-w", "w"]].forEach(function (s) { $(s[0]).addEventListener("input", function (e) { st[s[1]] = Number(e.target.value); touch(); calc(); }); });
  $("#cfu-new").addEventListener("click", function () { st.seed = 1 + Math.floor(Math.random() * 9999); touch(); calc(); });

  // settings from a shared link (?s=seed&t=5&c=70&w=50&k=GBP)
  (function () {
    var q = new URLSearchParams(location.search), n;
    n = parseInt(q.get("s"), 10); if (n > 0 && n < 100000) st.seed = n;
    [["t", "target", "#cfu-t"], ["c", "consent", "#cfu-c"], ["w", "w", "#cfu-w"]].forEach(function (p) { var v = Number(q.get(p[0])), i = $(p[2]); if (q.get(p[0]) && v >= Number(i.min) && v <= Number(i.max)) { st[p[1]] = v; i.value = v; } });
    Object.keys(CODES).forEach(function (k) { if (CODES[k] === q.get("k")) { st.cur = k; mark("#cfu-cur", "c", k); } });
  })();
  function link() { return location.origin + location.pathname + "?s=" + st.seed + "&t=" + st.target + "&c=" + st.consent + "&w=" + st.w + "&k=" + CODES[st.cur]; }
  function lines() {
    var L = last;
    return ["Sample: " + count(N) + " loan applicants, " + pct(THIN, 0) + " with thin credit files · appetite " + st.target + "% bad rate · " + st.consent + "% share bank data · " + st.w + "% weight on cash flow",
      "Result: bureau only approves " + pct(L.g.allA.rate, 0) + ", with cash flow " + pct(L.g.allB.rate, 0) + " · thin files " + pct(L.g.thinA.rate, 0) + " → " + pct(L.g.thinB.rate, 0) + " · " + (L.dProfit >= 0 ? "+" : "−") + money(Math.abs(L.dProfit), 1) + " a year"];
  }
  calc();
  var holder = $("#cfu-talk");
  if (holder && window.AkTalk) talkBox = window.AkTalk.mount(holder, { tool: "cash-flow", toolName: "Cash-Flow Underwriting Lab", lines: lines, link: link,
    linkNote: "The link in your message reopens the lab with your exact sample and settings. Nothing is stored." });
  window.__cfu = { people: people, decide: decide, stats: stats, st: st, P: function () { return P; }, scoreBureau: scoreBureau, scoreCash: scoreCash };
})();
