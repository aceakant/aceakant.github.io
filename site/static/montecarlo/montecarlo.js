// Portfolio Monte Carlo: a sample loan book and thousands of simulated years of credit defaults and fraud.
// Runs entirely in the browser, no AI. Defaults move together through one economy factor (Vasicek one-factor model).
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var RUNS = 5000, PDO = 20;
  var PRODUCTS = [
    { id: "personal", name: "Personal loans", share: 0.5, median: 8000, spread: 0.55, yield: 0.14, opex: 150, lgd: 0.65, odds600: 15, scoreAdj: 0 },
    { id: "cards", name: "Credit cards", share: 0.35, median: 2500, spread: 0.6, yield: 0.22, opex: 60, lgd: 0.8, odds600: 12, scoreAdj: -5, limitX: 2 },
    { id: "bnpl", name: "Buy now, pay later", share: 0.15, median: 300, spread: 0.5, yield: 0.24, opex: 8, lgd: 0.8, odds600: 10, scoreAdj: -20 },
  ];
  var ECON = { normal: 0, mild: -1, severe: -2 };
  var SIZES = [2000, 5000, 10000, 20000];
  var CODES = { "$": "USD", "£": "GBP", "€": "EUR", "C$": "CAD" };
  var CHECK_COST = 1.5, FRAUD_LGD = 0.95, BUST_DOWNTURN = { normal: 1, mild: 1.2, severe: 1.4 };
  var st = { n: 10000, q: 640, e: "normal", rho: 8, fund: 5, fr: 1.5, fc: 60, bo: 1, cur: "$", seed: 20261110 };
  var book = null, res = null, used = false, talkBox = null;

  /* ---------- maths ---------- */
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function normal(r) { var u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function cdf(x) { var t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; }
  function inv(p) { // Acklam's approximation of the inverse normal
    var a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239],
      b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155211477],
      c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783],
      d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416], q, r, pl = 0.02425;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  function count(n, p, r) { // how many of n loans go bad when each does with chance p
    if (n <= 0 || p <= 0) return 0;
    var m = n * p;
    if (m < 30) { var L = Math.exp(-m), k = 0, t = r(); while (t > L && k < n) { k++; t *= r(); } return k; }
    return Math.max(0, Math.min(n, Math.round(m + Math.sqrt(m * (1 - p)) * normal(r))));
  }

  /* ---------- the sample book ---------- */
  function makeBook() {
    var r = rng(st.seed), loans = [], groups = {};
    for (var i = 0; i < st.n; i++) {
      var u = r(), prod = u < PRODUCTS[0].share ? PRODUCTS[0] : u < PRODUCTS[0].share + PRODUCTS[1].share ? PRODUCTS[1] : PRODUCTS[2];
      var score = Math.round(Math.max(450, Math.min(820, st.q + prod.scoreAdj + 60 * normal(r))));
      var amount = Math.round(prod.median * Math.exp(prod.spread * normal(r)) / 10) * 10;
      var pd = 1 / (1 + prod.odds600 * Math.pow(2, (score - 600) / PDO));
      var band = Math.min(8, Math.max(0, Math.floor((score - 480) / 40)));
      var key = prod.id + ":" + band, g = groups[key] || (groups[key] = { prod: prod, n: 0, amount: 0, pdSum: 0 });
      g.n++; g.amount += amount; g.pdSum += pd;
      if (loans.length < 1000) loans.push({ id: "L" + String(i + 1).padStart(5, "0"), product: prod.name, amount: amount, rate: Math.round(prod.yield * 1000) / 10, score: score, pd: Math.round(pd * 10000) / 100 });
    }
    var list = Object.keys(groups).map(function (k) { var g = groups[k]; g.avg = g.amount / g.n; g.pd = g.pdSum / g.n; return g; });
    var tot = { n: st.n, amount: 0, byProd: {} };
    list.forEach(function (g) { tot.amount += g.amount; var b = tot.byProd[g.prod.id] || (tot.byProd[g.prod.id] = { n: 0, amount: 0 }); b.n += g.n; b.amount += g.amount; });
    return { groups: list, sample: loans, tot: tot };
  }

  /* ---------- one simulated year, repeated ---------- */
  function simulate() {
    var r = rng(st.seed * 7 + 13), rho = st.rho / 100, sr = Math.sqrt(rho), s1 = Math.sqrt(1 - rho), shift = ECON[st.e];
    var fr = st.fr / 100, fc = st.fc / 100, bo = st.bo / 100 * BUST_DOWNTURN[st.e], fund = st.fund / 100;
    var cards = book.tot.byProd.cards || { n: 0, amount: 0 }, cardLimit = cards.n ? cards.amount / cards.n * PRODUCTS[1].limitX : 0;
    var avgLoan = book.tot.amount / book.tot.n, out = [];
    var fixed = { funding: book.tot.amount * fund, opex: 0, checks: book.tot.n / (1 - fr) * CHECK_COST };
    book.groups.forEach(function (g) { fixed.opex += g.n * g.prod.opex; g.t = inv(g.pd); });
    for (var k = 0; k < RUNS; k++) {
      var z = shift + normal(r), rev = 0, credit = 0;
      for (var j = 0; j < book.groups.length; j++) {
        var g = book.groups[j], p = cdf((g.t - sr * z) / s1), d = count(g.n, p, r);
        credit += d * g.avg * g.prod.lgd;
        rev += (g.n - d) * g.avg * g.prod.yield + d * g.avg * g.prod.yield * 0.5;  // defaulters pay about half a year
      }
      var fraudApps = count(Math.round(book.tot.n / (1 - fr)), fr, r), missed = count(fraudApps, 1 - fc, r);
      var busts = count(cards.n, bo, r), fraud = missed * avgLoan * FRAUD_LGD + busts * cardLimit;
      rev -= missed * avgLoan * 0.14;  // fraudulent loans never pay
      out.push({ profit: rev - fixed.funding - fixed.opex - fixed.checks - credit - fraud, rev: rev, credit: credit, fraud: fraud });
    }
    out.sort(function (a, b) { return a.profit - b.profit; });
    var mean = function (arr, f) { return arr.reduce(function (s, x) { return s + x[f]; }, 0) / arr.length; };
    var tail = out.slice(0, Math.floor(RUNS * 0.05));
    return { runs: out, fixed: fixed, exp: mean(out, "profit"), rev: mean(out, "rev"), ecl: mean(out, "credit"), efl: mean(out, "fraud"),
      ploss: out.filter(function (x) { return x.profit < 0; }).length / RUNS, p5: out[Math.floor(RUNS * 0.05)].profit, p1: out[Math.floor(RUNS * 0.01)].profit,
      tail: { rev: mean(tail, "rev"), credit: mean(tail, "credit"), fraud: mean(tail, "fraud"), profit: mean(tail, "profit") } };
  }

  /* ---------- display ---------- */
  function money(v, dp) { var a = Math.abs(v), s = v < 0 ? "−" : ""; if (a >= 1e9) return s + st.cur + (a / 1e9).toFixed(dp == null ? 2 : dp) + "bn"; if (a >= 1e6) return s + st.cur + (a / 1e6).toFixed(dp == null ? 2 : dp) + "m"; if (a >= 1e3) return s + st.cur + Math.round(a / 1e3) + "k"; return s + st.cur + Math.round(a); }
  function pct(v, dp) { return (v * 100).toFixed(dp == null ? 1 : dp).replace("-", "−") + "%"; }
  function cnt(n) { return Math.round(n).toLocaleString("en-GB"); }

  function hist() {
    var W = 560, H = 220, L = 10, R = 10, T = 16, B = 34, bins = 40, runs = res.runs;
    var lo = runs[0].profit, hi = runs[runs.length - 1].profit; if (hi === lo) hi = lo + 1;
    var w = (hi - lo) / bins, c = new Array(bins).fill(0);
    runs.forEach(function (x) { c[Math.min(bins - 1, Math.floor((x.profit - lo) / w))]++; });
    var max = Math.max.apply(null, c), bw = (W - L - R) / bins, X = function (v) { return L + (v - lo) / (hi - lo) * (W - L - R); };
    var s = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Profit in 5,000 simulated years, from ' + money(lo, 1) + " to " + money(hi, 1) + '">';
    c.forEach(function (n, i) { var h = (H - T - B) * n / max, x0 = lo + i * w; s += '<rect x="' + (L + i * bw + 0.5).toFixed(1) + '" y="' + (H - B - h).toFixed(1) + '" width="' + Math.max(1, bw - 1).toFixed(1) + '" height="' + h.toFixed(1) + '" class="' + (x0 + w / 2 < 0 ? "mc-neg" : "mc-pos") + '"/>'; });
    [[res.exp, "Expected", "mc-mexp"], [res.p5, "1 in 20", "mc-m5"], [res.p1, "1 in 100", "mc-m1"]].forEach(function (m, i) {
      var x = X(m[0]); s += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '" class="' + m[2] + '"/>';
      s += '<text x="' + (x + (i === 0 ? 4 : -4)).toFixed(1) + '" y="' + (T + 10 + i * 12) + '" text-anchor="' + (i === 0 ? "start" : "end") + '" class="' + m[2] + 't">' + m[1] + "</text>";
    });
    if (lo < 0 && hi > 0) s += '<line x1="' + X(0).toFixed(1) + '" x2="' + X(0).toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '" class="cs-zero"/>';
    [lo, (lo + hi) / 2, hi].forEach(function (v, i) { s += '<text x="' + X(v).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="' + ["start", "middle", "end"][i] + '">' + money(v, 1) + "</text>"; });
    $("#mc-hist").innerHTML = s + "</svg>";
  }
  function bars() {
    var rows = [["Interest and fees", res.rev, res.tail.rev, "mc-in"], ["Funding cost", -res.fixed.funding, -res.fixed.funding, "mc-out"], ["Running costs and fraud checks", -(res.fixed.opex + res.fixed.checks), -(res.fixed.opex + res.fixed.checks), "mc-out"],
      ["Credit losses", -res.ecl, -res.tail.credit, "mc-cl"], ["Fraud losses", -res.efl, -res.tail.fraud, "mc-fl"], ["Profit", res.exp, res.tail.profit, "mc-pr"]];
    var max = Math.max.apply(null, rows.map(function (r) { return Math.max(Math.abs(r[1]), Math.abs(r[2])); })), W = 560, rowH = 34, H = rows.length * rowH + 26, L = 170, mid = L + (W - L - 10) / 2, half = (W - L - 10) / 2;
    var s = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Average year compared with the worst 5% of years">';
    s += '<text x="0" y="12" class="mc-leg">■ average year</text><text x="110" y="12" class="mc-leg2">■ worst 5% of years</text>';
    rows.forEach(function (r, i) {
      var y = 22 + i * rowH; s += '<text x="0" y="' + (y + 15) + '" class="mc-lab">' + r[0] + "</text>";
      [[r[1], 0, "a"], [r[2], 13, "b"]].forEach(function (v) { var w = Math.abs(v[0]) / max * half, x = v[0] >= 0 ? mid : mid - w; s += '<rect x="' + x.toFixed(1) + '" y="' + (y + v[1]) + '" width="' + Math.max(1, w).toFixed(1) + '" height="11" rx="2" class="' + r[3] + " " + v[2] + '"/>'; });
      s += '<text x="' + (W - 2) + '" y="' + (y + 10) + '" text-anchor="end" class="mc-val">' + money(r[1], 1) + '</text><text x="' + (W - 2) + '" y="' + (y + 23) + '" text-anchor="end" class="mc-val2">' + money(r[2], 1) + "</text>";
    });
    s += '<line x1="' + mid + '" x2="' + mid + '" y1="18" y2="' + (H - 4) + '" class="cs-zero"/>';
    $("#mc-bars").innerHTML = s + "</svg>";
  }
  function render() {
    $("#mc-exp").textContent = money(res.exp, 2); $("#mc-exp").parentNode.className = res.exp >= 0 ? "good" : "bad";
    $("#mc-ploss").textContent = pct(res.ploss);
    $("#mc-p5").textContent = money(res.p5, 2); $("#mc-p1").textContent = money(res.p1, 2);
    $("#mc-ecl").textContent = money(res.ecl, 2); $("#mc-efl").textContent = money(res.efl, 2); $("#mc-roa").textContent = pct(res.exp / book.tot.amount);
    var cx = res.ecl ? res.tail.credit / res.ecl : 1, fx = res.efl ? res.tail.fraud / res.efl : 1, extraC = res.tail.credit - res.ecl, extraF = res.tail.fraud - res.efl;
    var credShare = extraC + extraF > 0 ? extraC / (extraC + extraF) : 1;
    var verdict = res.ploss < 0.01 ? "Profitable in almost every simulated year (" + pct(1 - res.ploss) + ")" : "Profitable in " + pct(1 - res.ploss, 0) + " of simulated years";
    verdict += ". In a 1-in-20 bad year the book " + (res.p5 >= 0 ? "still makes " + money(res.p5, 2) : "loses " + money(-res.p5, 2)) + ". ";
    verdict += "In the worst 5% of years credit losses run " + cx.toFixed(1) + "× their average and fraud losses " + fx.toFixed(1) + "×, so " + pct(credShare, 0) + " of the extra damage comes from " + (credShare >= 0.5 ? "defaults moving together" : "fraud") + ".";
    var fShare = res.ecl + res.efl > 0 ? res.efl / (res.ecl + res.efl) : 0;
    if (fShare >= 0.05) verdict += " Fraud is " + pct(fShare, 0) + " of expected losses but hardly changes in bad years: it lowers every year's profit rather than deepening the worst ones.";
    $("#mc-story").textContent = verdict;
    hist(); bars();
    if (talkBox) talkBox.akRefresh();
  }
  function bookInfo() {
    var t = book.tot, parts = PRODUCTS.map(function (p) { var b = t.byProd[p.id] || { n: 0, amount: 0 }; return p.name + ": " + cnt(b.n) + " loans, " + money(b.amount, 1); });
    $("#mc-mix").textContent = cnt(t.n) + " loans worth " + money(t.amount, 1) + " · " + parts.join(" · ");
    $("#mc-data-sum").textContent = "Dummy loans generated in your browser (sample number " + st.seed + "). The first 8 of " + cnt(t.n) + " are shown; the download has the first 1,000.";
    var tb = $("#mc-table"); tb.innerHTML = "";
    var head = ["Loan", "Product", "Amount", "Rate", "Credit score", "Chance of default"], tr = document.createElement("tr");
    head.forEach(function (h) { var th = document.createElement("th"); th.textContent = h; tr.appendChild(th); }); tb.appendChild(tr);
    book.sample.slice(0, 8).forEach(function (l) { var r = document.createElement("tr"); [l.id, l.product, money(l.amount), l.rate + "%", l.score, l.pd + "%"].forEach(function (v) { var td = document.createElement("td"); td.textContent = v; r.appendChild(td); }); tb.appendChild(r); });
    var csv = "loan_id,product,amount_" + CODES[st.cur] + ",annual_rate_pct,credit_score,chance_of_default_pct\n" + book.sample.map(function (l) { return [l.id, l.product, l.amount, l.rate, l.score, l.pd].join(","); }).join("\n");
    var a = $("#mc-csv"); if (a.dataset.url) URL.revokeObjectURL(a.dataset.url); a.dataset.url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.href = a.dataset.url;
    var at = $("#mc-assume"); at.innerHTML = "";
    var rows = [["Product", "Typical amount", "Interest and fees a year", "Running cost a loan", "Lost after recoveries", "Odds of good at 600"]].concat(PRODUCTS.map(function (p) { return [p.name, money(p.median), pct(p.yield, 0), money(p.opex), pct(p.lgd, 0), p.odds600 + " to 1"]; }));
    rows.forEach(function (r, i) { var tr2 = document.createElement("tr"); r.forEach(function (v) { var c = document.createElement(i ? "td" : "th"); c.textContent = v; tr2.appendChild(c); }); at.appendChild(tr2); });
  }

  /* ---------- controls ---------- */
  function labels() {
    $("#mc-q-v").textContent = st.q; $("#mc-rho-v").textContent = st.rho + "%"; $("#mc-fund-v").textContent = st.fund + "%";
    $("#mc-fr-v").textContent = st.fr + "%"; $("#mc-fc-v").textContent = st.fc + "%"; $("#mc-bo-v").textContent = st.bo + "%";
  }
  function mark(box, key, val) { Array.prototype.forEach.call(document.querySelectorAll(box + " .roi-c"), function (x) { x.setAttribute("aria-checked", String(x.dataset[key] === String(val))); }); }
  var timer = null;
  function run(rebuild) {
    labels(); $("#mc-status").textContent = "Simulating…";
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (rebuild || !book) book = makeBook();
      var t0 = performance.now(); res = simulate(); bookInfo(); render();
      $("#mc-status").textContent = cnt(RUNS) + " years simulated in " + Math.max(1, Math.round(performance.now() - t0)) + " ms";
    }, 30);
  }
  function touch() { if (!used) { used = true; if (window.akTrack) window.akTrack("tool-montecarlo-use"); } }
  SIZES.forEach(function (n) { var b = document.createElement("button"); b.type = "button"; b.className = "roi-c"; b.setAttribute("role", "radio"); b.dataset.n = n; b.textContent = cnt(n); b.addEventListener("click", function () { st.n = n; mark("#mc-n", "n", n); touch(); run(true); }); $("#mc-n").appendChild(b); });
  [["q", true], ["rho", false], ["fund", false], ["fr", false], ["fc", false], ["bo", false]].forEach(function (c) {
    var el = $("#mc-" + c[0]); el.addEventListener("input", function () { st[c[0]] = Number(el.value); labels(); });
    el.addEventListener("change", function () { touch(); run(c[1]); });
  });
  Array.prototype.forEach.call(document.querySelectorAll("#mc-e .roi-c"), function (x) { x.addEventListener("click", function () { st.e = x.dataset.e; mark("#mc-e", "e", st.e); touch(); run(false); }); });
  Array.prototype.forEach.call(document.querySelectorAll("#mc-cur .roi-c"), function (x) { x.addEventListener("click", function () { st.cur = x.dataset.c; mark("#mc-cur", "c", st.cur); run(false); }); });
  $("#mc-regen").addEventListener("click", function () { st.seed = Math.floor(Math.random() * 9e8) + 1e8; touch(); run(true); });
  $("#mc-go").addEventListener("click", function () { touch(); run(false); });

  // settings from a shared link
  (function () {
    var q = new URLSearchParams(location.search), num = function (k, lo, hi) { var v = Number(q.get(k)); return q.has(k) && v >= lo && v <= hi ? v : null; };
    var v;
    if ((v = num("n", 1, 1e9)) && SIZES.indexOf(v) >= 0) st.n = v;
    [["q", 600, 700], ["rho", 1, 25], ["fund", 1, 10], ["fr", 0, 5], ["fc", 0, 95], ["bo", 0, 3], ["seed", 1, 4e9]].forEach(function (c) { var x = num(c[0], c[1], c[2]); if (x !== null) st[c[0]] = x; });
    if (ECON[q.get("e")] !== undefined) st.e = q.get("e");
    Object.keys(CODES).forEach(function (k) { if (CODES[k] === q.get("k")) st.cur = k; });
    ["q", "rho", "fund", "fr", "fc", "bo"].forEach(function (k) { $("#mc-" + k).value = st[k]; });
    mark("#mc-n", "n", st.n); mark("#mc-e", "e", st.e); mark("#mc-cur", "c", st.cur);
  })();

  function link() { return location.origin + location.pathname + "?n=" + st.n + "&q=" + st.q + "&e=" + st.e + "&rho=" + st.rho + "&fund=" + st.fund + "&fr=" + st.fr + "&fc=" + st.fc + "&bo=" + st.bo + "&seed=" + st.seed + "&k=" + CODES[st.cur]; }
  function lines() {
    return ["Book: " + cnt(book.tot.n) + " dummy loans worth " + money(book.tot.amount, 1) + " · " + ({ normal: "normal economy", mild: "mild downturn", severe: "severe downturn" })[st.e] + " · fraud " + st.fr + "% of applications, " + st.fc + "% stopped",
      "Result: expected profit " + money(res.exp, 2) + " a year · " + pct(res.ploss) + " chance of a loss · 1-in-20 bad year " + money(res.p5, 2) + " · expected credit losses " + money(res.ecl, 2) + ", fraud losses " + money(res.efl, 2)];
  }
  function facts() {
    var r0 = Math.round, p1 = function (v) { return Math.round(v * 1000) / 10; };
    return { data: "dummy loan book generated in the browser", currency: CODES[st.cur], loans: book.tot.n, book_value: r0(book.tot.amount),
      typical_credit_score: st.q, economy: ({ normal: "normal", mild: "mild downturn", severe: "severe downturn" })[st.e], default_correlation_pct: st.rho, funding_cost_pct: st.fund,
      fraudulent_applications_pct: st.fr, fraud_stopped_by_controls_pct: st.fc, card_bust_out_pct: st.bo, simulated_years: RUNS,
      expected_profit: r0(res.exp), chance_of_loss_making_year_pct: p1(res.ploss), profit_1_in_20_bad_year: r0(res.p5), profit_1_in_100_bad_year: r0(res.p1),
      expected_credit_losses: r0(res.ecl), expected_fraud_losses: r0(res.efl), credit_losses_worst_5pct_years: r0(res.tail.credit), fraud_losses_worst_5pct_years: r0(res.tail.fraud),
      expected_return_on_book_pct: Math.round(res.exp / book.tot.amount * 10000) / 100 };
  }
  labels(); book = makeBook(); res = simulate(); bookInfo(); render();
  $("#mc-status").textContent = cnt(RUNS) + " years simulated";
  if (window.AkNote && $("#mc-note")) window.AkNote.mount($("#mc-note"), { tool: "monte-carlo", facts: facts });
  if (window.AkTalk && $("#mc-talk")) talkBox = window.AkTalk.mount($("#mc-talk"), { tool: "montecarlo", toolName: "Portfolio Monte Carlo", lines: lines, link: link,
    linkNote: "The link in your message reopens the simulation with your exact settings and sample book. Nothing is stored." });
})();
