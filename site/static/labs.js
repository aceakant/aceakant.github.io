/* Playground games for the four labs. ("Spot the fraud" lives in app.js.) */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
  function party() { if (window.akConfetti) window.akConfetti(); }
  function done(id, pct) { if (window.akDone) window.akDone(id, pct); }  // counted for the Pulse page

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
        var max = cdata.length * 100; done("correlation", total / max * 100); var msg = total >= max * 0.85 ? "You read data like an analytics lead." : total >= max * 0.6 ? "Solid instincts. A little more practice and you're there." : "Correlation is slippery. That's why we measure instead of eyeballing.";
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
    // amounts in the settings are in units of $100 (earn_good 12 = $1,200 per good loan)
    function money(k) { var v = Math.round(k * 100), sign = v < 0 ? "−" : ""; v = Math.abs(v);
      return sign + "$" + (v >= 1e6 ? (v / 1e6).toFixed(2) + "m" : v >= 1e3 ? Math.round(v / 1e3) + "k" : v); }
    function fmt(n) { return Math.round(n).toLocaleString("en-GB"); }
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
      done("cut-off", pct);
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
        var pct = right / total; done("sort-it-out", pct * 100); var msg = pct === 1 ? "Perfect. You could run the risk committee. 🏆" : pct >= 0.8 ? "Strong grasp of who owns what." : pct >= 0.5 ? "Getting there. The lines blur in real life too." : "Tricky stuff. That's exactly why frameworks exist.";
        $("#sort-title").textContent = "Your result"; $("#sort-intro").textContent = "";
        items.innerHTML = '<div class="final"><span class="mono">YOU SORTED</span><div class="big">' + right + " / " + total + "</div><p>" + msg + "</p></div>";
        sfoot.innerHTML = '<span class="btns"><button class="btn small ghost" type="button" id="sort-again">Play again</button></span>';
        if (pct === 1) party();
      } else if (e.target.id === "sort-again") { ri = 0; right = 0; showRound(); }
    });
    showRound();
  }
  /* ---------------- lab page: switch games from the shelf ---------------- */
  var stages = document.querySelectorAll(".game-stage"), shelf = $("#shelf");
  function showGame(id, scroll) {
    var found = false;
    Array.prototype.forEach.call(stages, function (st) { var on = st.dataset.game === id; st.hidden = !on; if (on) found = true; });
    if (!found) return;
    Array.prototype.forEach.call(shelf.querySelectorAll(".shelf-card"), function (c) { c.setAttribute("aria-pressed", c.dataset.game === id ? "true" : "false"); });
    if (scroll) {
      try { history.replaceState(null, "", "#" + id); } catch (e) {}
      var st = document.querySelector('.game-stage[data-game="' + id + '"]');
      if (st) st.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  if (shelf && stages.length) {
    shelf.addEventListener("click", function (e) { var c = e.target.closest(".shelf-card"); if (c) showGame(c.dataset.game, true); });
    if (location.hash) showGame(location.hash.slice(1), false);
    window.addEventListener("hashchange", function () { showGame(location.hash.slice(1), false); });
  }

  /* ---------------- Analytics Lab: spot the chart trick ---------------- */
  var chg = $("#chart-game");
  if (chg) {
    var crounds = JSON.parse($("#chart-data").textContent).rounds, chi = 0, chs = 0;
    var cplot = $("#chart-plot"), copts = $("#chart-opts"), cfoot = $("#chart-foot");
    function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
    function txt(x, y, t, cls, anchor) { var e = svgEl("text", { x: x, y: y, "class": cls || "tick", "text-anchor": anchor || "middle" }); e.textContent = t; cplot.appendChild(e); return e; }
    var W = 320, H = 200, L = 34, B = 172, T = 18;
    function axes(lo, hi, ticks) {
      cplot.appendChild(svgEl("line", { x1: L, y1: B, x2: W - 8, y2: B, "class": "ax" }));
      cplot.appendChild(svgEl("line", { x1: L, y1: T, x2: L, y2: B, "class": "ax" }));
      ticks.forEach(function (v) { var y = B - (v - lo) / (hi - lo) * (B - T); txt(L - 5, y + 3, v, "tick", "end"); cplot.appendChild(svgEl("line", { x1: L, y1: y, x2: W - 8, y2: y, "class": "grid" })); });
    }
    function drawChart(d, honest) {
      clear(cplot);
      if (d.kind === "bar") {
        var lo = honest ? 0 : d.ymin, hi = d.ymax, n = d.bars.length, bw = 70;
        axes(lo, hi, honest ? [0, 25, 50, 75, 100] : [100, 101, 102, 103, 104, 105]);
        d.bars.forEach(function (b, i) {
          var x = L + 40 + i * 120, h = (b.v - lo) / (hi - lo) * (B - T);
          var r = svgEl("rect", { x: x, y: B - h, width: bw, height: h, rx: 4, "class": i ? "bar hi" : "bar" }); cplot.appendChild(r);
          txt(x + bw / 2, B - h - 5, b.v, "val"); txt(x + bw / 2, B + 14, b.label);
        });
      } else if (d.kind === "line") {
        var all = d.series, from = honest ? 0 : all.length - d.window, pts = all.slice(from);
        var mn = honest ? 30 : Math.min.apply(null, pts) - 1, mx = honest ? 65 : Math.max.apply(null, pts) + 1;
        axes(mn, mx, honest ? [30, 40, 50, 60] : [Math.ceil(mn), Math.round((mn + mx) / 2), Math.floor(mx)]);
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var sx = function (i) { return L + 14 + i / (pts.length - 1) * (W - L - 34); }, sy = function (v) { return B - (v - mn) / (mx - mn) * (B - T); };
        var dpath = pts.map(function (v, i) { return (i ? "L" : "M") + sx(i).toFixed(1) + " " + sy(v).toFixed(1); }).join(" ");
        if (honest) { var x0 = sx(all.length - d.window); cplot.appendChild(svgEl("rect", { x: x0 - 6, y: T, width: W - 8 - x0 + 6, height: B - T, "class": "zone" })); txt(x0 + 2, T + 12, "the 4 months shown", "lbl", "start"); }
        cplot.appendChild(svgEl("path", { d: dpath, "class": "line" }));
        pts.forEach(function (v, i) { cplot.appendChild(svgEl("circle", { cx: sx(i), cy: sy(v), r: 3.5, "class": "dot" })); if (!honest || i % 2 === 0 || i === pts.length - 1) txt(sx(i), B + 14, months[from + i]); });
      } else if (d.kind === "pie") {
        var tot = d.slices.reduce(function (a, b) { return a + b.v; }, 0);
        if (!honest) {
          var cx = 110, cy = 98, R = 76, a0 = -Math.PI / 2;
          d.slices.forEach(function (sl, i) {
            var a1 = a0 + sl.v / tot * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0;
            var path = "M" + cx + " " + cy + " L" + (cx + R * Math.cos(a0)).toFixed(1) + " " + (cy + R * Math.sin(a0)).toFixed(1) + " A" + R + " " + R + " 0 " + large + " 1 " + (cx + R * Math.cos(a1)).toFixed(1) + " " + (cy + R * Math.sin(a1)).toFixed(1) + " Z";
            cplot.appendChild(svgEl("path", { d: path, "class": "slice s" + i }));
            var y = 50 + i * 30; cplot.appendChild(svgEl("rect", { x: 210, y: y - 9, width: 11, height: 11, rx: 2, "class": "slice s" + i }));
            txt(227, y, sl.label + " " + sl.v + "%", "leg", "start");
            a0 = a1;
          });
        } else {
          axes(0, 50, [0, 25, 50]);
          d.slices.forEach(function (sl, i) { var x = L + 18 + i * 68, h = sl.v / 50 * (B - T); cplot.appendChild(svgEl("rect", { x: x, y: B - h, width: 44, height: h, rx: 4, "class": "slice s" + i })); txt(x + 22, B - h - 5, sl.v + "%", "val"); txt(x + 22, B + 14, sl.label); });
          txt(W - 8, T - 4, "Total: " + tot + "% (people picked more than one)", "lbl", "end");
        }
      } else if (d.kind === "people") {
        var mean = d.values.reduce(function (a, b) { return a + b; }, 0) / d.values.length;
        var sorted = d.values.slice().sort(function (a, b) { return a - b; }), med = (sorted[4] + sorted[5]) / 2;
        d.values.forEach(function (v, i) {
          var x = 24 + i * 30, y = 92, big = v >= 1000;
          cplot.appendChild(svgEl("circle", { cx: x, cy: y - 16, r: 7, "class": big ? "head big" : "head" }));
          cplot.appendChild(svgEl("path", { d: "M" + (x - 10) + " " + (y + 8) + " Q" + x + " " + (y - 14) + " " + (x + 10) + " " + (y + 8) + " Z", "class": big ? "head big" : "head" }));
          txt(x, y + 24, v >= 1000 ? "$" + (v / 1000).toFixed(2) + "m" : "$" + v + "k", big ? "val" : "tick");
        });
        txt(W / 2, 30, "Average salary: $" + Math.round(mean) + "k", honest ? "lbl" : "val");
        if (honest) txt(W / 2, 162, "Typical person (median): $" + med + "k", "val ok");
      }
    }
    function chartRound() {
      var d = crounds[chi];
      $("#chart-round").textContent = "Round " + (chi + 1) + " of " + crounds.length;
      $("#chart-title").textContent = d.title;
      drawChart(d, false);
      copts.innerHTML = d.options.map(function (o, i) { return '<button type="button" class="opt" data-i="' + i + '">' + esc(o) + "</button>"; }).join("");
      cfoot.innerHTML = '<span class="hint">What\'s the trick?</span><span class="score">' + chs + " / " + crounds.length + "</span>";
    }
    copts.addEventListener("click", function (e) {
      var b = e.target.closest(".opt"); if (!b || copts.dataset.locked === "1") return;
      copts.dataset.locked = "1";
      var d = crounds[chi], ok = +b.dataset.i === d.answer; if (ok) chs++;
      Array.prototype.forEach.call(copts.querySelectorAll(".opt"), function (o) { o.disabled = true; if (+o.dataset.i === d.answer) o.classList.add("right"); });
      if (!ok) b.classList.add("wrong");
      drawChart(d, true);
      $("#chart-title").textContent = "The honest version";
      cfoot.innerHTML = '<div class="verdict"><b>' + (ok ? "Spotted it! 🔍" : "It got you this time.") + "</b>" + esc(d.explain) + '</div><span class="score">' + chs + " / " + crounds.length +
        '</span><button class="btn small" type="button" id="chart-next">' + (chi === crounds.length - 1 ? "See my score" : "Next chart →") + "</button>";
      if (ok) party();
    });
    cfoot.addEventListener("click", function (e) {
      if (e.target.id === "chart-next") {
        copts.dataset.locked = "";
        if (chi < crounds.length - 1) { chi++; chartRound(); return; }
        clear(cplot); copts.innerHTML = ""; done("chart-tricks", chs / crounds.length * 100);
        $("#chart-title").textContent = "Your result";
        var msg = chs === crounds.length ? "No chart will ever fool you. Board packs beware. 🏆" : chs >= 3 ? "Sharp eyes. Always check the axis first." : chs >= 2 ? "Not bad. Most people miss the sneaky averages." : "Charts are persuasive. That's why analysts check the numbers behind them.";
        cfoot.innerHTML = '<div class="final"><span class="mono">TRICKS SPOTTED</span><div class="big">' + chs + " / " + crounds.length + "</div><p>" + msg + '</p></div><span class="btns"><button class="btn small ghost" type="button" id="chart-again">Play again</button></span>';
      } else if (e.target.id === "chart-again") { chi = 0; chs = 0; copts.dataset.locked = ""; chartRound(); }
    });
    chartRound();
  }

  /* ---------------- Risk Lab: survive the recession ---------------- */
  var bkg = $("#book-game");
  if (bkg) {
    var BK = JSON.parse($("#book-data").textContent), sliders = bkg.querySelectorAll('input[type=range]');
    var bar = $("#book-bar"), econ = $("#book-econ"), bfoot = $("#book-foot");
    var colors = ["#4ADE9A", "#2FD3C8", "#F5C04E", "#FF7A6E"];
    function shares() {
      var w = {}, sum = 0;
      Array.prototype.forEach.call(sliders, function (s) { w[s.dataset.id] = +s.value; sum += +s.value; });
      BK.products.forEach(function (p) { w[p.id] = sum ? w[p.id] / sum : 1 / BK.products.length; });
      return w;
    }
    function margin(w, sc) { return BK.products.reduce(function (a, p) { return a + w[p.id] * (p.yield - BK.funding_cost - p.loss[sc]); }, 0); }
    function bestMix() {
      var best = -Infinity, step = 5, ids = BK.products.map(function (p) { return p.id; });
      for (var a = 0; a <= 100; a += step) for (var b = 0; a + b <= 100; b += step) for (var c = 0; a + b + c <= 100; c += step) {
        var w = {}; w[ids[0]] = a / 100; w[ids[1]] = b / 100; w[ids[2]] = c / 100; w[ids[3]] = (100 - a - b - c) / 100;
        if (margin(w, "recession") >= BK.appetite - 1e-9) best = Math.max(best, margin(w, "normal"));
      }
      return best;
    }
    var BEST = bestMix();
    function pctTxt(v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "%"; }
    function crTxt(v) { return (v >= 0 ? "+" : "−") + "$" + Math.abs(v).toFixed(1) + "m"; }
    function drawBook(reset) {
      var w = shares();
      bar.innerHTML = BK.products.map(function (p, i) { return '<span style="width:' + (w[p.id] * 100).toFixed(1) + "%;background:" + colors[i] + '" title="' + esc(p.name) + '"></span>'; }).join("");
      Array.prototype.forEach.call(sliders, function (s) { $("#bk-" + s.dataset.id + "-out").textContent = "$" + Math.round(w[s.dataset.id] * 100) + "m"; });
      if (reset) {
        Array.prototype.forEach.call(econ.children, function (c) { c.className = ""; c.querySelector("b").textContent = "–"; });
        bfoot.innerHTML = '<span class="hint">Goal: at least +' + BK.target.toFixed(1) + '% in a normal year, and no loss in a recession.</span><button class="btn small" type="button" id="book-go">Run the economy</button>';
      }
    }
    Array.prototype.forEach.call(sliders, function (s) { s.addEventListener("input", function () { drawBook(true); }); });
    bfoot.addEventListener("click", function (e) {
      if (e.target.id !== "book-go") return;
      var w = shares(), res = {};
      ["boom", "normal", "recession"].forEach(function (sc, k) {
        res[sc] = margin(w, sc);
        var cell = econ.querySelector('[data-s="' + sc + '"]');
        setTimeout(function () { cell.className = "pop " + (res[sc] >= 0 ? "up" : "down"); cell.querySelector("b").textContent = pctTxt(res[sc]); cell.querySelector("b").title = crTxt(res[sc]); }, k * 350);
      });
      var survive = res.recession >= BK.appetite - 1e-9, hits = res.normal >= BK.target - 1e-9, pct = Math.max(0, Math.round(res.normal / BEST * 100));
      done("survive-recession", survive && hits ? pct : 0);
      var head, tip;
      if (survive && hits) { head = pct >= 97 ? "Chief Risk Officer material! 🏆" : "You survived the recession! 🎉"; tip = "Normal year: " + crTxt(res.normal) + " profit, " + pct + "% of the best safe mix (" + pctTxt(BEST) + "). " + (pct >= 97 ? "That is the sweet spot." : "There's a little more profit to find without breaking the recession rule."); }
      else if (!survive) { head = "The recession wiped out your profit. 😬"; tip = "You'd lose " + crTxt(res.recession).replace("−", "") + " in a bad year. Credit cards and personal loans pay the most but blow up first. Trim them and try again."; }
      else { head = "Safe, but too safe."; tip = "You survive the recession, but a normal year only earns " + pctTxt(res.normal) + ". Add a small slice of higher-yield lending."; }
      setTimeout(function () {
        bfoot.innerHTML = '<div class="verdict"><b>' + head + "</b>" + tip + '</div><button class="btn small ghost" type="button" id="book-go">Run it again</button>';
        if (survive && hits && pct >= 97) party();
      }, 1100);
    });
    drawBook(true);
  }

  /* ---------------- Fraud Lab: scam or legit? ---------------- */
  var phg = $("#phish-game");
  if (phg) {
    var msgs = JSON.parse($("#phish-data").textContent).messages, pi = 0, ps = 0;
    var pbtns = $("#phish-btns"), pfoot = $("#phish-foot"), bubble = $("#phish-text");
    function showMsg() {
      var m = msgs[pi];
      $("#phish-round").textContent = (pi + 1) + " of " + msgs.length;
      $("#phish-from").textContent = m.from; bubble.textContent = m.text; bubble.className = "bubble pop";
      pbtns.hidden = false; pbtns.dataset.locked = "";
      Array.prototype.forEach.call(pbtns.querySelectorAll("button"), function (b) { b.disabled = false; b.classList.remove("right", "wrong"); });
      pfoot.innerHTML = '<span class="hint">Trust your gut, then check the flags.</span><span class="score">' + ps + " / " + msgs.length + "</span>";
    }
    pbtns.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-pick]"); if (!b || pbtns.dataset.locked) return;
      pbtns.dataset.locked = "1";
      var m = msgs[pi], truth = m.scam ? "scam" : "legit", ok = b.dataset.pick === truth; if (ok) ps++;
      Array.prototype.forEach.call(pbtns.querySelectorAll("button"), function (x) { x.disabled = true; if (x.dataset.pick === truth) x.classList.add("right"); });
      if (!ok) b.classList.add("wrong");
      bubble.classList.add(m.scam ? "is-scam" : "is-legit");
      pfoot.innerHTML = '<div class="verdict"><b>' + (ok ? (m.scam ? "Caught it! 🚩" : "Correct, that one's genuine. ✅") : (m.scam ? "That was a scam." : "That one was actually genuine.")) + "</b><ul class=\"flags\">" +
        m.flags.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + '</ul></div><span class="score">' + ps + " / " + msgs.length +
        '</span><button class="btn small" type="button" id="phish-next">' + (pi === msgs.length - 1 ? "See my score" : "Next message →") + "</button>";
      if (ok && m.scam) party();
    });
    pfoot.addEventListener("click", function (e) {
      if (e.target.id === "phish-next") {
        if (pi < msgs.length - 1) { pi++; showMsg(); return; }
        pbtns.hidden = true; $("#phish-from").textContent = "Your result"; bubble.className = "bubble"; done("scam-or-legit", ps / msgs.length * 100);
        bubble.textContent = ps === msgs.length ? "Perfect score. Scammers would hate you. 🛡️" : ps >= 4 ? "Good instincts. The 'PIN to receive' trick catches a lot of people." : "Scams are designed to feel urgent. Slow down, and never click links in messages.";
        pfoot.innerHTML = '<div class="final"><span class="mono">YOU SPOTTED</span><div class="big">' + ps + " / " + msgs.length + '</div><p>Golden rule: you never need a PIN or one-time code to receive money.</p></div><span class="btns"><button class="btn small ghost" type="button" id="phish-again">Play again</button></span>';
        if (ps === msgs.length) party();
      } else if (e.target.id === "phish-again") { pi = 0; ps = 0; showMsg(); }
    });
    showMsg();
  }

  /* ---------------- Framework Lab: put it in order ---------------- */
  var og = $("#order-game");
  if (og) {
    var orounds = JSON.parse($("#order-data").textContent).rounds, oi = 0, oscore = 0, picked = [], order = [];
    var pool = $("#order-pool"), plist = $("#order-picked"), ofoot = $("#order-foot"), omax = 0;
    orounds.forEach(function (r) { omax += r.steps.length; });
    function shuffled(n, seed) {
      var r = rng(seed), a = [];
      for (var i = 0; i < n; i++) a.push(i);
      for (var j = n - 1; j > 0; j--) { var k = Math.floor(r() * (j + 1)), t = a[j]; a[j] = a[k]; a[k] = t; }
      if (a.every(function (v, i) { return v === i; })) a.reverse();
      return a;
    }
    function renderOrder() {
      var r = orounds[oi];
      plist.innerHTML = picked.map(function (i) { return "<li>" + esc(r.steps[i]) + "</li>"; }).join("") || '<li class="empty">Tap the first step below</li>';
      pool.innerHTML = order.filter(function (i) { return picked.indexOf(i) < 0; }).map(function (i) { return '<button type="button" class="step-btn" data-i="' + i + '">' + esc(r.steps[i]) + "</button>"; }).join("");
      var full = picked.length === r.steps.length;
      ofoot.innerHTML = '<span class="btns"><button class="btn small ghost" type="button" id="order-undo"' + (picked.length ? "" : " disabled") + ">Undo</button>" +
        (full ? '<button class="btn small" type="button" id="order-check">Check my order</button>' : "") + '</span><span class="score">' + oscore + " / " + omax + "</span>";
    }
    function orderRound() {
      var r = orounds[oi]; picked = []; order = shuffled(r.steps.length, 77 + oi * 13);
      $("#order-round").textContent = "Round " + (oi + 1) + " of " + orounds.length;
      $("#order-title").textContent = r.title; $("#order-intro").textContent = r.intro;
      renderOrder();
    }
    pool.addEventListener("click", function (e) { var b = e.target.closest(".step-btn"); if (!b) return; picked.push(+b.dataset.i); renderOrder(); });
    ofoot.addEventListener("click", function (e) {
      var id = e.target.id, r = orounds[oi];
      if (id === "order-undo") { picked.pop(); renderOrder(); }
      else if (id === "order-check") {
        var right = 0;
        plist.innerHTML = picked.map(function (s, pos) { var ok = s === pos; if (ok) right++; return '<li class="' + (ok ? "ok" : "miss") + '">' + esc(r.steps[s]) + (ok ? "" : '<small>Should be step ' + (s + 1) + "</small>") + "</li>"; }).join("");
        oscore += right; pool.innerHTML = "";
        var head = right === r.steps.length ? "Perfect order! 🎯" : right >= r.steps.length - 2 ? "Nearly there." : "The order matters more than it looks.";
        ofoot.innerHTML = '<div class="verdict"><b>' + head + "</b>" + right + " of " + r.steps.length + ' steps in the right place.</div><span class="score">' + oscore + " / " + omax +
          '</span><button class="btn small" type="button" id="order-next">' + (oi === orounds.length - 1 ? "See my score" : "Next round →") + "</button>";
        if (right === r.steps.length) party();
      } else if (id === "order-next") {
        if (oi < orounds.length - 1) { oi++; orderRound(); og.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
        $("#order-title").textContent = "Your result"; $("#order-intro").textContent = ""; plist.innerHTML = ""; pool.innerHTML = "";
        var pct = oscore / omax; done("in-order", pct * 100); var msg = pct === 1 ? "Flawless. You'd breeze through an audit. 🏆" : pct >= 0.75 ? "Strong sense of process." : pct >= 0.5 ? "Getting there. Most mix up validation and approval." : "Order is hard. That's why frameworks write it down.";
        ofoot.innerHTML = '<div class="final"><span class="mono">STEPS IN PLACE</span><div class="big">' + oscore + " / " + omax + "</div><p>" + msg + '</p></div><span class="btns"><button class="btn small ghost" type="button" id="order-again">Play again</button></span>';
        if (pct === 1) party();
      } else if (id === "order-again") { oi = 0; oscore = 0; orderRound(); }
    });
    orderRound();
  }
})();
