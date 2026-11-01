/* Interactions for Ajay Kant · Weekly Insights. No libraries, no tracking. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* night look only: clear any old light-mode choice saved by the former switch */
  try { localStorage.removeItem("ak-theme"); } catch (e) {}

  /* ---------- scroll reveal + count-up ---------- */
  function countUp(el) {
    var to = parseFloat(el.getAttribute("data-to")), start = null, dur = 1200;
    if (reduce || isNaN(to)) return;
    function step(t) {
      if (!start) start = t;
      var p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.remove("pending");
        $$(".count", en.target).forEach(countUp);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15 });
    $$(".reveal").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top > innerHeight) { el.classList.add("pending"); io.observe(el); }
    });
    var counters = $(".counters");
    if (counters) io.observe(counters);
  }

  /* ---------- confetti (small, celebratory) ---------- */
  function confetti() {
    if (reduce) return;
    var c = document.createElement("canvas"); c.className = "confetti";
    c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
    var ctx = c.getContext("2d"), cs = getComputedStyle(doc);
    var cols = ["--accent", "--amber", "--safe", "--risk"].map(function (v) { return cs.getPropertyValue(v).trim(); });
    var bits = [];
    for (var i = 0; i < 120; i++) bits.push({ x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 4, s: Math.random() * 6 + 4, c: cols[i % 4], r: Math.random() * 6 });
    var frames = 0;
    (function tick() {
      ctx.clearRect(0, 0, c.width, c.height);
      bits.forEach(function (b) { b.x += b.vx; b.y += b.vy; b.vy += .35; b.r += .1; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore(); });
      if (++frames < 110) requestAnimationFrame(tick); else c.remove();
    })();
  }

  window.akConfetti = confetti;

  /* Anonymous play counting for the Pulse page (GoatCounter, no cookies). Silent if counting is off. */
  var counted = {};
  function akTrack(name) {
    if (counted[name]) return;
    counted[name] = 1;
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: name, title: name, event: true }); } catch (e) {}
  }
  window.akDone = function (id, pct) {
    var band = Math.max(0, Math.min(100, Math.round((pct || 0) / 10) * 10));
    akTrack("game-" + id + "-finish"); akTrack("game-" + id + "-score-" + band);
  };
  function playStarted(e) {
    var g = e.target.closest && e.target.closest(".game"), st = g && g.closest(".game-stage[data-game]");
    if (st) akTrack("game-" + st.dataset.game + "-start");
  }
  document.addEventListener("click", playStarted, true);
  document.addEventListener("input", playStarted, true);

  /* ---------- Spot the fraud ---------- */
  var game = $("#game");
  if (game) {
    var data = JSON.parse($("#game-data").textContent), round = 0, results = [];
    var casesEl = $("#game-cases"), foot = $("#game-foot");
    function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
    function dots() { return '<span class="score">' + data.rounds.map(function (_, i) { return '<i class="' + (results[i] === true ? "hit" : results[i] === false ? "miss" : "") + '"></i>'; }).join("") + "</span>"; }
    function render() {
      var r = data.rounds[round];
      $("#game-round").textContent = "Round " + (round + 1) + " of " + data.rounds.length + " · " + r.name;
      $("#game-prompt").textContent = r.prompt;
      casesEl.innerHTML = r.cases.map(function (c, i) {
        return '<button class="case pop" type="button" data-i="' + i + '"><span class="mono case-id">' + esc(c.id) + "</span><b>" + esc(c.title) + "</b><ul>" + c.lines.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul></button>";
      }).join("");
      foot.innerHTML = '<span class="hint">Tap the case you would stop.</span>' + dots();
    }
    casesEl.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".case"); if (!btn || btn.disabled) return;
      var r = data.rounds[round], pick = +btn.getAttribute("data-i"), fraudIdx = 0;
      r.cases.forEach(function (c, i) { if (c.fraud) fraudIdx = i; });
      var right = pick === fraudIdx; results[round] = right;
      $$(".case", casesEl).forEach(function (b, i) { b.disabled = true; b.classList.add(i === fraudIdx ? "is-fraud" : "is-safe"); });
      if (!right) btn.classList.add("picked-wrong");
      var last = round === data.rounds.length - 1;
      foot.innerHTML = '<div class="verdict"><b>' + (right ? "Caught it! 🎯" : "Close, but it slipped through 🙈") + "</b>" + esc(r.cases[fraudIdx].why) + "</div>" + dots() +
        '<button class="btn small" type="button" id="game-next">' + (last ? "See my score" : "Next round →") + "</button>";
      $("#game-next").focus({ preventScroll: true });
      foot.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    });
    foot.addEventListener("click", function (ev) {
      if (ev.target.id === "game-next") {
        if (round < data.rounds.length - 1) { round++; render(); return; }
        var score = results.filter(Boolean).length, n = data.rounds.length;
        if (window.akDone) window.akDone("spot-the-fraud", score / n * 100);
        var msg = score === n ? "Flawless. You think like a fraud analyst. Want the job? 😄" : score >= n - 1 ? "Sharp eye! Fraud teams would be glad to have you." : score > 0 ? "Not bad. Fraud is sneaky, that's why it needs patterns, not hunches." : "Fraud won this time. That's exactly why we build detection models!";
        $("#game-prompt").textContent = "Your result";
        casesEl.innerHTML = '<div class="final"><span class="mono">YOU CAUGHT</span><div class="big">' + score + " / " + n + "</div><p>" + msg + "</p></div>";
        foot.innerHTML = dots() + '<span class="btns"><button class="btn small ghost" type="button" id="game-again">Play again</button><a class="btn small" href="portfolio.html">See how I do it for real</a></span>';
        if (score === n) confetti();
      }
      if (ev.target.id === "game-again") { round = 0; results = []; render(); }
    });
    render();
  }

  /* ---------- Quick answers (profile) ---------- */
  var qa = $("#qa");
  if (qa) qa.addEventListener("click", function (ev) {
    var chip = ev.target.closest(".chip"); if (!chip) return;
    $$(".chip", qa).forEach(function (c) { c.setAttribute("aria-selected", c === chip ? "true" : "false"); });
    var out = $("#qa-answer"); out.textContent = chip.getAttribute("data-a");
    out.style.animation = "none"; void out.offsetWidth; out.style.animation = "";
  });

  /* ---------- Weekly updates: filter, flip, surprise ---------- */
  var grid = $("#ugrid");
  if (grid) {
    $$(".filters [data-filter]").forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-filter");
        $$(".filters [data-filter]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        $$(".ucard", grid).forEach(function (card) { card.hidden = f !== "all" && card.getAttribute("data-cat") !== f; });
      });
    });
    grid.addEventListener("click", function (ev) {
      var fb = ev.target.closest(".flip"); if (!fb) return;
      var card = fb.closest(".ucard"), on = card.classList.toggle("flipped");
      fb.textContent = on ? "Flip back ↺" : "Flip for the result ↻";
      $(".back", card).setAttribute("aria-hidden", on ? "false" : "true");
      $(".back .btn", card).tabIndex = on ? 0 : -1;
    });
    var sp = $("#surprise");
    if (sp) sp.addEventListener("click", function () {
      var cards = $$(".ucard", grid).filter(function (c) { return !c.hidden; });
      if (!cards.length) return;
      var pick = cards[Math.floor(Math.random() * cards.length)];
      pick.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      pick.classList.remove("pulse"); void pick.offsetWidth; pick.classList.add("pulse");
      setTimeout(function () { var a = $("h3 a", pick); if (a) a.focus({ preventScroll: true }); }, 500);
    });
  }

  /* ---------- Article: reading progress ---------- */
  var bar = $("#progress-bar"), art = $(".article");
  if (bar && art) {
    var upd = function () {
      var r = art.getBoundingClientRect(), total = r.height - innerHeight;
      bar.style.width = Math.max(0, Math.min(100, (-r.top / Math.max(total, 1)) * 100)) + "%";
    };
    addEventListener("scroll", upd, { passive: true }); upd();
  }

  /* ---------- Article: guess the number ---------- */
  var hook = $(".hook");
  if (hook) {
    var range = $("#hook-range"), out = $("#hook-out");
    range.addEventListener("input", function () { out.textContent = range.value; });
    $("#hook-go").addEventListener("click", function () {
      var ans = parseFloat(hook.getAttribute("data-answer")), g = parseFloat(range.value);
      var span = (parseFloat(range.max) - parseFloat(range.min)) || 1, off = Math.abs(g - ans) / span;
      $("#hook-verdict").textContent = off <= 0.05 ? "Spot on! 🎯" : off <= 0.15 ? "Very close!" : g < ans ? "Higher than you think." : "Lower than you think.";
      $("#hook-result").hidden = false; range.disabled = true; this.disabled = true;
      if (off <= 0.05) confetti();
    });
  }

  /* ---------- Article: STAR stepper ---------- */
  var star = $("#star");
  if (star) {
    var tabs = $$(".star-tab", star), panels = $$(".star-panel", star), cur = 0, next = $("#star-next");
    function show(i) {
      cur = i;
      tabs.forEach(function (t, j) { t.setAttribute("aria-selected", j === i ? "true" : "false"); });
      panels.forEach(function (p, j) { p.hidden = j !== i; });
      next.textContent = i === 3 ? "Start again ↺" : "Next →";
    }
    tabs.forEach(function (t, j) { t.addEventListener("click", function () { show(j); }); });
    next.addEventListener("click", function () { show(cur === 3 ? 0 : cur + 1); });
  }

  /* ---------- Article: process steps ---------- */
  $$(".steps .step").forEach(function (b) {
    b.addEventListener("click", function () {
      var open = b.getAttribute("aria-expanded") === "true";
      b.setAttribute("aria-expanded", open ? "false" : "true");
      b.parentNode.querySelector("p").hidden = open;
    });
  });

  /* ---------- Article: ROI calculator ---------- */
  var calc = $(".calc");
  if (calc) {
    var formula = calc.getAttribute("data-formula"), res = $("#calc-result");
    var compute = function () {
      var expr = formula;
      $$("input[data-var]", calc).forEach(function (inp) {
        inp.nextElementSibling.textContent = Number(inp.value).toLocaleString("en-IN");
        expr = expr.replace(new RegExp("\\b" + inp.getAttribute("data-var") + "\\b", "g"), "(" + parseFloat(inp.value) + ")");
      });
      if (!/^[\d\s+\-*/().]+$/.test(expr)) { res.textContent = "—"; return; }
      try {
        var v = Function('"use strict";return (' + expr + ")")();
        res.textContent = isFinite(v) ? Math.round(v).toLocaleString("en-IN") : "—";
      } catch (e) { res.textContent = "—"; }
    };
    $$("input[data-var]", calc).forEach(function (inp) { inp.addEventListener("input", compute); });
    compute();
  }

  /* ---------- Article: myth or fact ---------- */
  var quiz = $("#quiz");
  if (quiz) {
    var qs = $$(".quiz-q", quiz), answered = 0, right = 0;
    qs.forEach(function (q) {
      q.addEventListener("click", function (ev) {
        var b = ev.target.closest("button[data-pick]"); if (!b || q.dataset.done) return;
        q.dataset.done = "1"; answered++;
        var ok = b.getAttribute("data-pick") === q.getAttribute("data-fact"); if (ok) right++;
        $$("button", q).forEach(function (x) { x.disabled = true; if (x.getAttribute("data-pick") === q.getAttribute("data-fact")) x.classList.add("right"); });
        if (!ok) b.classList.add("wrong");
        $(".quiz-why", q).hidden = false;
        if (answered === qs.length) {
          var s = $("#quiz-score"), n = qs.length;
          s.textContent = right + "/" + n + (right === n ? " · You think like a risk head! 🏆" : right >= n - 1 ? " · Sharp! One sneaky one got you." : " · The myths are convincing, that's why they survive!");
          s.hidden = false; if (right === n) confetti();
        }
      });
    });
  }

  /* ---------- Case page: stakeholder hub ---------- */
  var hub = $("#hub");
  if (hub) {
    var nodes = $$(".hub-node", hub), items = $$("#hub-detail .hub-item");
    nodes.forEach(function (n, i) {
      n.addEventListener("click", function () {
        nodes.forEach(function (m, k) { m.setAttribute("aria-pressed", k === i ? "true" : "false"); });
        items.forEach(function (it, k) { it.hidden = k !== i; });
      });
    });
  }

  /* ---------- Mobile dock: hide near the footer ---------- */
  var dock = $(".dock"), pageFoot = $(".foot");
  if (dock && pageFoot && "IntersectionObserver" in window) {
    var hideFor = [pageFoot, $("#game")].filter(Boolean), seen = new Set();
    var dio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
      dock.classList.toggle("away", seen.size > 0);
    });
    hideFor.forEach(function (el) { dio.observe(el); });
  }
})();
