/* Playground games: Analytics Lab, Risk Lab, Framework Lab. (Fraud Lab lives in app.js.) */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function party() { if (window.akConfetti) window.akConfetti(); }

  // seeded random so each round looks the same for everyone
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* ---------------- Analytics Lab: guess the correlation ---------------- */
  var cg = $("#corr-game");
  if (cg) {
    var cdata = JSON.parse($("#corr-data").textContent).rounds, ci = 0, total = 0, locked = false;
    var plot = $("#corr-plot"), guess = $("#corr-guess"), out = $("#corr-out"), foot = $("#corr-foot");
    function sample(target, seed) {
      var r = rng(seed), xs = [], ys = [], n = 70;
      for (var i = 0; i < n; i++) { var x = gauss(r), e = gauss(r); xs.push(x); ys.push(target * x + Math.sqrt(1 - target * target) * e); }
      var mx = xs.reduce(function (a, b) { return a + b; }) / n, my = ys.reduce(function (a, b) { return a + b; }) / n, sxy = 0, sxx = 0, syy = 0;
      for (var j = 0; j < n; j++) { sxy += (xs[j] - mx) * (ys[j] - my); sxx += (xs[j] - mx) * (xs[j] - mx); syy += (ys[j] - my) * (ys[j] - my); }
      return { xs: xs, ys: ys, r: sxy / Math.sqrt(sxx * syy) };
    }
    function draw(s) {
      while (plot.firstChild) plot.removeChild(plot.firstChild);
      var pad = 22, W = 320, H = 230, minx = Math.min.apply(null, s.xs), maxx = Math.max.apply(null, s.xs), miny = Math.min.apply(null, s.ys), maxy = Math.max.apply(null, s.ys);
      plot.appendChild(svgEl("line", { x1: pad, y1: H - pad, x2: W - 8, y2: H - pad, "class": "ax" }));
      plot.appendChild(svgEl("line", { x1: pad, y1: 8, x2: pad, y2: H - pad, "class": "ax" }));
      s.xs.forEach(function (x, i) {
        var cx = pad + (x - minx) / (maxx - minx) * (W - pad - 14) + 3, cy = H - pad - (s.ys[i] - miny) / (maxy - miny) * (H - pad - 14) - 3;
        var c = svgEl("circle", { cx: cx.toFixed(1), cy: cy.toFixed(1), r: 3.4, "class": "pt" });
        c.style.animationDelay = (i * 8) + "ms"; plot.appendChild(c);
      });
    }
    var current;
    function round() {
      var d = cdata[ci]; locked = false;
      current = sample(d.r, 1000 + ci * 37);
      $("#corr-round").textContent = "Round " + (ci + 1) + " of " + cdata.length;
      $("#corr-x").textContent = "→ " + d.x; $("#corr-y").textContent = "↑ " + d.y;
      guess.disabled = false; guess.value = 0; out.textContent = "0.00";
      draw(current);
      foot.innerHTML = '<button class="btn small" type="button" id="corr-go">Lock in my guess</button><span class="score">Score ' + total + "</span>";
    }
    guess.addEventListener("input", function () { out.textContent = Number(guess.value).toFixed(2); });
    foot.addEventListener("click", function (e) {
      if (e.target.id === "corr-go" && !locked) {
        locked = true; guess.disabled = true;
        var real = current.r, g = Number(guess.value), pts = Math.max(0, Math.round(100 - Math.abs(g - real) * 100));
        total += pts;
        var verdict = pts >= 90 ? "Data whisperer! 🎯" : pts >= 70 ? "Nicely read." : pts >= 40 ? "In the neighbourhood." : "The data fooled you this time.";
        foot.innerHTML = '<div class="verdict"><b>' + verdict + " +" + pts + "</b>The real correlation is <b class=\"inline\">" + real.toFixed(2) + "</b>. " + esc(cdata[ci].quip) + "</div>" +
          '<span class="score">Score ' + total + '</span><button class="btn small" type="button" id="corr-next">' + (ci === cdata.length - 1 ? "See my score" : "Next round →") + "</button>";
        if (pts >= 90) party();
      } else if (e.target.id === "corr-next") {
        if (ci < cdata.length - 1) { ci++; round(); return; }
        var max = cdata.length * 100, msg = total >= max * 0.85 ? "You read data like an analytics lead." : total >= max * 0.6 ? "Solid instincts. A little more practice and you're there." : "Correlation is slippery. That's why we measure instead of eyeballing.";
        while (plot.firstChild) plot.removeChild(plot.firstChild);
        $("#corr-x").textContent = ""; $("#corr-y").textContent = "";
        foot.innerHTML = '<div class="final"><span class="mono">YOUR SCORE</span><div class="big">' + total + " / " + max + "</div><p>" + msg + '</p></div><span class="btns"><button class="btn small ghost" type="button" id="corr-again">Play again</button></span>';
        if (total >= max * 0.85) party();
      } else if (e.target.id === "corr-again") { ci = 0; total = 0; round(); }
    });
    round();
  }

  /* ---------------- Risk Lab: run the bank for a day ---------------- */
  var rg = $("#risk-game");
  if (rg) {
    var P = JSON.parse($("#risk-data").textContent);
    var cut = $("#risk-cut"), rout = $("#risk-out"), rec = $("#risk-recession"), rplot = $("#risk-plot"), rfoot = $("#risk-foot");
    function erf(x) { var t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
    function above(mean, c) { return 1 - 0.5 * (1 + erf((c - mean) / (P.spread * Math.SQRT2))); }
    function pdf(mean, x) { var z = (x - mean) / P.spread; return Math.exp(-0.5 * z * z); }
    function model(c) {
      var badMean = P.bad_mean + (rec.checked ? P.recession_shift : 0);
      var br = rec.checked ? P.recession_bad_rate : P.bad_rate;
      var nGood = P.customers * (1 - br), nBad = P.customers * br;
      var g = nGood * above(P.good_mean, c), b = nBad * above(badMean, c);
      return { approved: g + b, turned: nGood - g, bad: b, profit: g * P.earn_good - b * P.lose_bad, badMean: badMean };
    }
    function best() { var bc = 450, bp = -Infinity; for (var c = 450; c <= 800; c += 5) { var m = model(c); if (m.profit > bp) { bp = m.profit; bc = c; } } return { cut: bc, profit: bp }; }
    // amounts are in ₹ thousand: 100k = ₹1 lakh, 10,000k = ₹1 crore
    function money(k) { var v = Math.round(k), sign = v < 0 ? "−" : ""; v = Math.abs(v);
      return sign + "₹" + (v >= 10000 ? (v / 10000).toFixed(2) + " cr" : v >= 100 ? (v / 100).toFixed(1) + " lakh" : v + "k"); }
    function fmt(n) { return Math.round(n).toLocaleString("en-IN"); }
    function drawRisk() {
      var c = Number(cut.value), m = model(c);
      while (rplot.firstChild) rplot.removeChild(rplot.firstChild);
      var W = 320, H = 170, x0 = 450, x1 = 820, sx = function (x) { return 8 + (x - x0) / (x1 - x0) * (W - 16); };
      var gH = 120, bH = 120 * 0.55;
      function curve(mean, h, cls) {
        var d = "M" + sx(x0) + " " + (H - 18);
        for (var x = x0; x <= x1; x += 5) d += " L" + sx(x).toFixed(1) + " " + (H - 18 - pdf(mean, x) * h).toFixed(1);
        d += " L" + sx(x1) + " " + (H - 18) + " Z";
        rplot.appendChild(svgEl("path", { d: d, "class": cls }));
      }
      curve(P.good_mean, gH, "g"); curve(m.badMean, bH, "b");
      rplot.appendChild(svgEl("rect", { x: 8, y: 6, width: Math.max(0, sx(c) - 8), height: H - 24, "class": "declined" }));
      rplot.appendChild(svgEl("line", { x1: sx(c), y1: 4, x2: sx(c), y2: H - 18, "class": "cut" }));
      var t1 = svgEl("text", { x: Math.max(12, sx(c) - 6), y: 16, "class": "lbl", "text-anchor": "end" }); t1.textContent = "declined"; rplot.appendChild(t1);
      var t2 = svgEl("text", { x: Math.min(W - 12, sx(c) + 6), y: 16, "class": "lbl" }); t2.textContent = "approved"; rplot.appendChild(t2);
      [500, 600, 700, 800].forEach(function (v) { var t = svgEl("text", { x: sx(v), y: H - 4, "class": "tick", "text-anchor": "middle" }); t.textContent = v; rplot.appendChild(t); });
      rout.textContent = c;
      $("#rs-approved").textContent = fmt(m.approved);
      $("#rs-turned").textContent = fmt(m.turned);
      $("#rs-bad").textContent = fmt(m.bad);
      var pe = $("#rs-profit"); pe.textContent = money(m.profit); pe.classList.toggle("neg", m.profit < 0);
    }
    cut.addEventListener("input", drawRisk);
    rec.addEventListener("change", function () { drawRisk(); rfoot.innerHTML = '<button class="btn small" type="button" id="risk-go">Lock in my cut-off</button>'; });
    rfoot.addEventListener("click", function (e) {
      if (e.target.id !== "risk-go") return;
      var c = Number(cut.value), m = model(c), b = best(), pct = Math.max(0, Math.round(m.profit / b.profit * 100));
      var tip = c < b.cut - 10 ? "A bit generous: defaults are eating into profit. Try moving the cut-off up." :
                c > b.cut + 10 ? "A bit strict: you're turning away good customers. Try moving it down." :
                "Right on the sweet spot.";
      var head = pct >= 97 ? "Chief Risk Officer material! 🏆" : pct >= 85 ? "Very good banking." : pct >= 60 ? "Profitable, but money left on the table." : "Ouch. The board would like a word.";
      rfoot.innerHTML = '<div class="verdict"><b>' + head + "</b>You made " + pct + "% of the best possible profit (" + money(b.profit) + ", at a cut-off of about " + b.cut + "). " + tip +
        (rec.checked ? "" : " Now switch on recession mode: more people default and defaulters look more like good customers, so the best cut-off moves up.") +
        '</div><button class="btn small ghost" type="button" id="risk-go">Try again</button>';
      if (pct >= 97) party();
    });
    drawRisk();
  }

  /* ---------------- Framework Lab: sort it out ---------------- */
  var sg = $("#sort-game");
  if (sg) {
    var rounds = JSON.parse($("#sort-data").textContent).rounds, ri = 0, right = 0, total = 0, done = 0;
    var items = $("#sort-items"), sfoot = $("#sort-foot");
    rounds.forEach(function (r) { total += r.items.length; });
    function showRound() {
      var r = rounds[ri]; done = 0;
      $("#sort-round").textContent = "Round " + (ri + 1) + " of " + rounds.length;
      $("#sort-title").textContent = r.title; $("#sort-intro").textContent = r.intro;
      items.innerHTML = r.items.map(function (it, i) {
        return '<div class="sort-card" data-i="' + i + '"><p>' + esc(it.text) + '</p><div class="sort-btns">' +
          r.buckets.map(function (b, k) { return '<button type="button" data-k="' + k + '">' + esc(b) + "</button>"; }).join("") + "</div></div>";
      }).join("");
      sfoot.innerHTML = '<span class="hint">Pick the right box for each card.</span><span class="score">' + right + " / " + total + "</span>";
    }
    items.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-k]"); if (!btn) return;
      var card = btn.closest(".sort-card"); if (card.dataset.done) return;
      var r = rounds[ri], it = r.items[+card.dataset.i], k = +btn.dataset.k;
      card.dataset.done = "1"; done++;
      var ok = k === it.answer; if (ok) right++;
      Array.prototype.forEach.call(card.querySelectorAll("button"), function (b) {
        b.disabled = true; if (+b.dataset.k === it.answer) b.classList.add("right");
      });
      if (!ok) btn.classList.add("wrong");
      card.classList.add(ok ? "ok" : "miss");
      if (done === r.items.length) {
        var last = ri === rounds.length - 1;
        sfoot.innerHTML = '<span class="score">' + right + " / " + total + '</span><button class="btn small" type="button" id="sort-next">' + (last ? "See my score" : "Next round →") + "</button>";
      } else {
        sfoot.querySelector(".score").textContent = right + " / " + total;
      }
    });
    sfoot.addEventListener("click", function (e) {
      if (e.target.id === "sort-next") {
        if (ri < rounds.length - 1) { ri++; showRound(); sg.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
        var pct = right / total, msg = pct === 1 ? "Perfect. You could run the risk committee. 🏆" : pct >= 0.8 ? "Strong grasp of who owns what." : pct >= 0.5 ? "Getting there. The lines blur in real life too." : "Tricky stuff. That's exactly why frameworks exist.";
        $("#sort-title").textContent = "Your result"; $("#sort-intro").textContent = "";
        items.innerHTML = '<div class="final"><span class="mono">YOU SORTED</span><div class="big">' + right + " / " + total + "</div><p>" + msg + "</p></div>";
        sfoot.innerHTML = '<span class="btns"><button class="btn small ghost" type="button" id="sort-again">Play again</button></span>';
        if (pct === 1) party();
      } else if (e.target.id === "sort-again") { ri = 0; right = 0; showRound(); }
    });
    showRound();
  }
})();
