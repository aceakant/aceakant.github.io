// Cut-off Studio: a credit-score cut-off simulator on a sample loan book. Runs entirely in the browser, no AI.
// Scores follow the usual scorecard scaling: every 20 points (PDO) doubles the odds of good.
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var PDO = 20, LO = 450, HI = 750, STEP = 5, DOWNTURN = 1.8;
  var BOOKS = [
    { id: "personal", name: "Personal loans", apps: 20000, mean: 610, sd: 55, odds600: 25, good: 720, bad: 4760, today: 580,
      note: "Average loan 8,000; lifetime margin 9% after funding and costs; 70% of a bad loan is lost after recoveries." },
    { id: "cards", name: "Credit cards", apps: 50000, mean: 620, sd: 60, odds600: 20, good: 300, bad: 2000, today: 590,
      note: "Average balance 2,500; 300 a year earned per good account; 80% of a bad balance is lost." },
    { id: "bnpl", name: "Buy now, pay later", apps: 200000, mean: 590, sd: 60, odds600: 15, good: 12, bad: 240, today: 540,
      note: "Average purchase 300; a 4% merchant fee is the only income; 80% of a missed purchase is lost." },
  ];
  var CODES = { "$": "USD", "£": "GBP", "€": "EUR", "C$": "CAD" };
  var book = BOOKS[0], econ = "normal", cur = "$", used = false, talkBox = null, last = null;

  function money(v, dp) {
    var a = Math.abs(v), s = v < 0 ? "−" : "";
    if (a >= 1e9) return s + cur + (a / 1e9).toFixed(dp == null ? 2 : dp) + "bn";
    if (a >= 1e6) return s + cur + (a / 1e6).toFixed(dp == null ? 2 : dp) + "m";
    if (a >= 1e3) return s + cur + Math.round(a / 1e3) + "k";
    return s + cur + Math.round(a);
  }
  function pct(v, dp) { return (v * 100).toFixed(dp == null ? 1 : dp) + "%"; }
  function count(n) { return Math.round(n).toLocaleString("en-GB"); }
  function signed(v, f) { return (v > 0 ? "+" : v < 0 ? "−" : "±") + f(Math.abs(v)); }

  // the sample book: applicants and expected bads in each 5-point band
  function bands(b) {
    var out = [], tot = 0, i, s;
    for (s = LO; s <= HI; s += STEP) { var z = (s - b.mean) / b.sd, d = Math.exp(-z * z / 2); out.push({ s: s, d: d }); tot += d; }
    for (i = 0; i < out.length; i++) {
      var o = out[i], odds = b.odds600 * Math.pow(2, (o.s - 600) / PDO) / (econ === "downturn" ? DOWNTURN : 1);
      o.n = b.apps * o.d / tot; o.p = 1 / (1 + odds); o.bad = o.n * o.p; o.good = o.n - o.bad;
    }
    return out;
  }
  function at(B, b, cut) {
    var r = { appr: 0, bad: 0, turned: 0, avoided: 0, allBad: 0 };
    B.forEach(function (o) { r.allBad += o.bad; if (o.s >= cut) { r.appr += o.n; r.bad += o.bad; } else { r.turned += o.good; r.avoided += o.bad; } });
    r.good = r.appr - r.bad; r.loss = r.bad * b.bad; r.profit = r.good * b.good - r.loss;
    r.apprRate = r.appr / b.apps; r.badRate = r.appr ? r.bad / r.appr : 0;
    return r;
  }
  function best(B, b) { var bc = LO, bp = -Infinity; for (var c = LO; c <= HI; c += STEP) { var p = at(B, b, c).profit; if (p > bp) { bp = p; bc = c; } } return bc; }

  /* ---------- charts ---------- */
  function distChart(B, cut) {
    var W = 560, H = 210, L = 8, R = 8, T = 10, Bm = 30, max = 0;
    B.forEach(function (o) { if (o.n > max) max = o.n; });
    var bw = (W - L - R) / B.length, y = function (v) { return T + (H - T - Bm) * (1 - v / max); };
    var svg = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Applicants by score band from ' + LO + " to " + HI + ", with bands below " + cut + ' declined">';
    var cx = L + (cut - LO) / STEP * bw;
    svg += '<rect x="' + L + '" y="' + T + '" width="' + Math.max(0, cx - L).toFixed(1) + '" height="' + (H - T - Bm) + '" class="cs-decl"/>';
    B.forEach(function (o, i) {
      var x = L + i * bw + 0.6, w = Math.max(1, bw - 1.2), yt = y(o.n), yb = y(o.good);
      svg += '<rect x="' + x.toFixed(1) + '" y="' + yb.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (H - Bm - yb).toFixed(1) + '" class="cs-good' + (o.s < cut ? " off" : "") + '"/>';
      svg += '<rect x="' + x.toFixed(1) + '" y="' + yt.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0, yb - yt).toFixed(1) + '" class="cs-badbar' + (o.s < cut ? " off" : "") + '"/>';
    });
    svg += '<line x1="' + cx.toFixed(1) + '" x2="' + cx.toFixed(1) + '" y1="' + (T - 4) + '" y2="' + (H - Bm + 4) + '" class="cs-cutline"/>';
    [450, 500, 550, 600, 650, 700, 750].forEach(function (s) {
      var x = L + (s - LO) / STEP * bw + bw / 2; svg += '<text x="' + x.toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + s + "</text>";
    });
    $("#cs-dist").innerHTML = svg + "</svg>";
  }
  function curveChart(B, b, cut, bc) {
    var W = 560, H = 210, L = 58, R = 12, T = 14, Bm = 30, pts = [], mn = Infinity, mx = -Infinity;
    for (var c = LO; c <= HI; c += STEP) { var p = at(B, b, c).profit; pts.push([c, p]); if (p < mn) mn = p; if (p > mx) mx = p; }
    mn = Math.min(mn, 0); var pad = (mx - mn) * 0.08; mx += pad; mn -= pad;
    var x = function (c) { return L + (c - LO) / (HI - LO) * (W - L - R); }, y = function (v) { return T + (H - T - Bm) * (mx - v) / (mx - mn); };
    var svg = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Profit at each cut-off; most profitable at ' + bc + '">';
    [mx - pad, (mx - pad + mn + pad) / 2, mn + pad].forEach(function (v) { svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" class="cs-grid"/><text x="' + (L - 6) + '" y="' + (y(v) + 3).toFixed(1) + '" text-anchor="end">' + money(v, 1) + "</text>"; });
    if (mn < 0) svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '" class="cs-zero"/>';
    var d = pts.map(function (q, i) { return (i ? "L" : "M") + x(q[0]).toFixed(1) + " " + y(q[1]).toFixed(1); }).join(" ");
    svg += '<path d="' + d + " L" + x(HI).toFixed(1) + " " + y(mn).toFixed(1) + " L" + x(LO).toFixed(1) + " " + y(mn).toFixed(1) + ' Z" class="cs-area"/>';
    svg += '<path d="' + d + '" class="cs-line"/>';
    svg += '<line x1="' + x(b.today).toFixed(1) + '" x2="' + x(b.today).toFixed(1) + '" y1="' + T + '" y2="' + (H - Bm) + '" class="cs-today"/>';
    var bp = at(B, b, bc).profit, cp = at(B, b, cut).profit;
    svg += '<circle cx="' + x(bc).toFixed(1) + '" cy="' + y(bp).toFixed(1) + '" r="7" class="cs-ring"/>';
    svg += '<circle cx="' + x(cut).toFixed(1) + '" cy="' + y(cp).toFixed(1) + '" r="5" class="cs-dot"/>';
    [450, 500, 550, 600, 650, 700, 750].forEach(function (s) { svg += '<text x="' + x(s).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + s + "</text>"; });
    $("#cs-curve").innerHTML = svg + "</svg>";
  }

  /* ---------- the numbers ---------- */
  function delta(el, v, fmt, goodIfUp) {
    var e = $(el); if (Math.abs(v) < 1e-9) { e.textContent = "same as today's policy"; e.className = ""; return; }
    e.textContent = signed(v, fmt) + " vs today"; e.className = (v > 0) === goodIfUp ? "up" : "down";
  }
  function calc() {
    var cut = Number($("#cs-cut").value), B = bands(book), r = at(B, book, cut), t = at(B, book, book.today), bc = best(B, book);
    $("#cs-cut-v").textContent = cut;
    $("#cs-appr").textContent = pct(r.apprRate, 0);
    $("#cs-bad").textContent = pct(r.badRate);
    $("#cs-loss").textContent = money(r.loss, 1);
    $("#cs-profit").textContent = money(r.profit, 1);
    $("#cs-profit").parentNode.className = r.profit >= 0 ? "good" : "bad";
    delta("#cs-appr-d", (r.apprRate - t.apprRate) * 100, function (v) { return v.toFixed(0) + " pts"; }, true);
    delta("#cs-bad-d", (r.badRate - t.badRate) * 100, function (v) { return v.toFixed(1) + " pts"; }, false);
    delta("#cs-loss-d", r.loss - t.loss, function (v) { return money(v, 1); }, false);
    delta("#cs-profit-d", r.profit - t.profit, function (v) { return money(v, 1); }, true);
    $("#cs-turned").textContent = count(r.turned);
    $("#cs-avoided").textContent = pct(r.allBad ? r.avoided / r.allBad : 0, 0);
    var be = book.good / (book.good + book.bad);
    $("#cs-breakeven").textContent = pct(be);

    var bestR = at(B, book, bc), story;
    if (cut === bc) story = "This is the most profitable cut-off for this book" + (econ === "downturn" ? " in a downturn" : "") + ": every band above it earns more from good customers than it loses on bad ones.";
    else if (cut < bc) story = "Too loose for profit: the bands between " + cut + " and " + (bc - STEP) + " lose more on bad loans than they earn. Moving up to " + bc + " would add " + money(bestR.profit - r.profit, 1) + " a year.";
    else story = "Tighter than profit needs: you're turning away " + count(r.turned - bestR.turned) + " good customers who would have paid. Moving down to " + bc + " would add " + money(bestR.profit - r.profit, 1) + " a year, if your risk appetite allows it.";
    if (econ === "downturn") story += " Today's policy (" + book.today + ") " + (book.today < bc ? "is too loose for a downturn." : "holds up in a downturn.");
    $("#cs-story").textContent = story;
    distChart(B, cut); curveChart(B, book, cut, bc);
    last = { cut: cut, r: r, bc: bc, t: t, best: bestR };
    if (talkBox) talkBox.akRefresh();
  }

  /* ---------- the assumptions table ---------- */
  function table() {
    var rows = [["Loan book", "Applications a year", "Odds of good at 600", "Profit per good", "Loss per bad", "Today's cut-off"]];
    BOOKS.forEach(function (b) { rows.push([b.name, count(b.apps), b.odds600 + " to 1", money(b.good), money(b.bad), String(b.today)]); });
    var t = $("#cs-table"); t.innerHTML = "";
    rows.forEach(function (r, i) { var tr = document.createElement("tr"); r.forEach(function (c) { var td = document.createElement(i ? "td" : "th"); td.textContent = c; tr.appendChild(td); }); t.appendChild(tr); });
  }

  /* ---------- controls ---------- */
  var prodBox = $("#cs-products");
  BOOKS.forEach(function (b, i) {
    var x = document.createElement("button"); x.type = "button"; x.className = "roi-c"; x.setAttribute("role", "radio"); x.dataset.p = b.id; x.textContent = b.name;
    x.setAttribute("aria-checked", String(i === 0));
    x.addEventListener("click", function () { book = b; $("#cs-cut").value = b.today; mark("#cs-products", "p", b.id); touch(); calc(); });
    prodBox.appendChild(x);
  });
  function mark(box, key, val) { Array.prototype.forEach.call(document.querySelectorAll(box + " .roi-c"), function (x) { x.setAttribute("aria-checked", String(x.dataset[key] === val)); }); }
  function touch() { if (!used) { used = true; if (window.akTrack) window.akTrack("tool-cutoff-use"); } }
  Array.prototype.forEach.call(document.querySelectorAll("#cs-economy .roi-c"), function (x) { x.addEventListener("click", function () { econ = x.dataset.e; mark("#cs-economy", "e", econ); touch(); calc(); }); });
  Array.prototype.forEach.call(document.querySelectorAll("#cs-cur .roi-c"), function (x) { x.addEventListener("click", function () { cur = x.dataset.c; mark("#cs-cur", "c", cur); table(); calc(); }); });
  $("#cs-cut").addEventListener("input", function () { touch(); calc(); });
  $("#cs-best").addEventListener("click", function () { $("#cs-cut").value = best(bands(book), book); touch(); calc(); });
  $("#cs-today").addEventListener("click", function () { $("#cs-cut").value = book.today; calc(); });

  // settings from a shared link (?p=personal&c=560&e=downturn&k=GBP)
  (function () {
    var q = new URLSearchParams(location.search), p = BOOKS.filter(function (b) { return b.id === q.get("p"); })[0];
    if (p) { book = p; mark("#cs-products", "p", p.id); $("#cs-cut").value = p.today; }
    var c = Number(q.get("c")); if (c >= LO && c <= HI && c % STEP === 0) $("#cs-cut").value = c;
    if (q.get("e") === "downturn") { econ = "downturn"; mark("#cs-economy", "e", econ); }
    Object.keys(CODES).forEach(function (k) { if (CODES[k] === q.get("k")) { cur = k; mark("#cs-cur", "c", cur); } });
  })();

  function link() { return location.origin + location.pathname + "?p=" + book.id + "&c=" + $("#cs-cut").value + "&e=" + econ + "&k=" + CODES[cur]; }
  function lines() {
    var L = last;
    return ["Book: " + book.name + " · " + (econ === "downturn" ? "downturn" : "normal year") + " · today's cut-off " + book.today,
      "My cut-off: " + L.cut + " · approval " + pct(L.r.apprRate, 0) + " · bad rate " + pct(L.r.badRate) + " · profit " + money(L.r.profit, 1) + " a year (most profitable: " + L.bc + ")"];
  }
  table(); calc();
  // the AI note: only these settings and results are sent
  function facts() {
    var L = last, r2 = function (v) { return Math.round(v); }, p1 = function (v) { return Math.round(v * 1000) / 10; };
    return { data: "illustrative sample loan book", currency: CODES[cur], loan_book: book.name, economy: econ === "downturn" ? "downturn (every score 1.8x as likely to go bad)" : "normal year",
      applications_per_year: book.apps, profit_per_good_loan: book.good, loss_per_bad_loan: book.bad,
      todays_cutoff: book.today, chosen_cutoff: L.cut, most_profitable_cutoff: L.bc,
      approval_rate_pct: p1(L.r.apprRate), approval_rate_today_pct: p1(L.t.apprRate),
      bad_rate_pct: p1(L.r.badRate), bad_rate_today_pct: p1(L.t.badRate),
      expected_losses_per_year: r2(L.r.loss), expected_losses_today: r2(L.t.loss),
      profit_per_year: r2(L.r.profit), profit_today: r2(L.t.profit), profit_at_most_profitable_cutoff: r2(L.best.profit),
      good_customers_turned_away: r2(L.r.turned), share_of_all_bad_loans_avoided_pct: p1(L.r.allBad ? L.r.avoided / L.r.allBad : 0),
      break_even_chance_of_going_bad_pct: p1(book.good / (book.good + book.bad)) };
  }
  var noteHolder = $("#cs-note");
  if (noteHolder && window.AkNote) window.AkNote.mount(noteHolder, { tool: "cutoff", facts: facts });
  var holder = $("#cs-talk");
  if (holder && window.AkTalk) talkBox = window.AkTalk.mount(holder, { tool: "cutoff", toolName: "Cut-off Studio", lines: lines, link: link,
    linkNote: "The link in your message reopens the studio with your exact settings. Nothing is stored." });
})();
