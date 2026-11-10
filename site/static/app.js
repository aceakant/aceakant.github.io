/* Interactions for Ajay Kant · Weekly Insights. No libraries, no tracking. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* WhatsApp buttons: join the number in the browser */
  $$("a[data-wa]").forEach(function (a) {
    a.href = "https://wa.me/" + a.getAttribute("data-wa").split("|").join("") + "?text=" + encodeURIComponent(a.getAttribute("data-msg") || "");
  });

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
  // Links in LinkedIn posts carry ?ln=<post number>. That number is kept for the visit, so every step after the
  // click (game started, finished, tool used, shared, article read) is also counted against that post: li-<n>-<step>.
  var lnPost = null, gcQueue = [];
  try {
    var q = new URLSearchParams(location.search).get("ln");
    if (q && /^\d{1,3}$/.test(q)) { lnPost = q; sessionStorage.setItem("ak-ln", q); } else lnPost = sessionStorage.getItem("ak-ln");
  } catch (e) {}
  function gcSend(name) {
    if (window.goatcounter && window.goatcounter.count) { try { window.goatcounter.count({ path: name, title: name, event: true }); } catch (e) {} return; }
    gcQueue.push(name); // counter script still loading
  }
  var gcWait = setInterval(function () { if (window.goatcounter && window.goatcounter.count) { clearInterval(gcWait); gcQueue.splice(0).forEach(gcSend); } }, 400);
  setTimeout(function () { clearInterval(gcWait); }, 15000);
  function akTrack(name) {
    if (counted[name]) return;
    counted[name] = 1;
    gcSend(name);
    if (lnPost && name.indexOf("li-") !== 0) {
      var step = /-start$/.test(name) ? "start" : /-finish$/.test(name) ? "finish" : /^share-/.test(name) ? "share" : /^tool-.*-use$/.test(name) ? "use" : /^tool-talk-/.test(name) ? "talk" : /^hof-submit$/.test(name) ? "halloffame" : null;
      if (step) akTrack("li-" + lnPost + "-" + step);
    }
  }
  if (lnPost && /[?&]ln=/.test(location.search)) akTrack("li-" + lnPost + "-visit");
  if (lnPost && document.querySelector(".prose, article")) { // an article read to the end
    window.addEventListener("scroll", function onScroll() {
      if ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight > 0.75) { akTrack("li-" + lnPost + "-read"); window.removeEventListener("scroll", onScroll); }
    }, { passive: true });
  }
  window.akTrack = akTrack;
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
        inp.nextElementSibling.textContent = Number(inp.value).toLocaleString("en-GB");
        expr = expr.replace(new RegExp("\\b" + inp.getAttribute("data-var") + "\\b", "g"), "(" + parseFloat(inp.value) + ")");
      });
      if (!/^[\d\s+\-*/().]+$/.test(expr)) { res.textContent = "—"; return; }
      try {
        var v = Function('"use strict";return (' + expr + ")")();
        res.textContent = isFinite(v) ? Math.round(v).toLocaleString("en-GB") : "—";
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

/* ---------- Playground Hall of Fame: monthly top scores (nickname, game, score, country) ---------- */
(function () {
  "use strict";
  var cfgEl = document.getElementById("ak-hof");
  if (!cfgEl) return;
  var CFG; try { CFG = JSON.parse(cfgEl.textContent); } catch (e) { return; }
  if (!CFG.api) return;
  var API = CFG.api, GAMES = CFG.games || {}, tokens = {}, asked = {};
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function flag(cc) { return /^[A-Z]{2}$/.test(cc || "") ? String.fromCodePoint(0x1F1E6 + cc.charCodeAt(0) - 65, 0x1F1E6 + cc.charCodeAt(1) - 65) : ""; }
  function monthName(m) { var p = String(m || "").split("-"); return p.length === 2 ? new Date(+p[0], +p[1] - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" }) : ""; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function post(path, body) {
    return fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  }
  function list(entries, opts) {
    var ol = el("ol", "hof-list");
    entries.forEach(function (x, i) {
      var g = GAMES[x.g] || {}, li = el("li", opts && opts.mine === i + 1 ? "mine" : null);
      li.appendChild(el("span", "hof-rank", String(i + 1)));
      var who = el("span", "hof-who"); who.appendChild(el("b", null, x.n));
      if (opts && opts.games && g.name) who.appendChild(el("small", null, g.name + (g.lab ? " · " + g.lab : "")));
      li.appendChild(who);
      li.appendChild(el("span", "hof-flag", flag(x.c)));
      li.appendChild(el("b", "hof-score", x.p + "%"));
      ol.appendChild(li);
    });
    return ol;
  }

  /* a signed start token the first time each game is played on this page (also counts players to date) */
  function started(e) {
    var st = e.target.closest && e.target.closest(".game-stage[data-game]");
    if (!st || !(e.target.closest(".game"))) return;
    var id = st.dataset.game;
    if (tokens[id] !== undefined) return;
    tokens[id] = null;
    post("/hof/start", { game: id }).then(function (j) { if (j.token) tokens[id] = j.token; }).catch(function () {});
  }
  document.addEventListener("click", started, true);
  document.addEventListener("input", started, true);

  /* the offer at the end of a game */
  function offer(id, pct) {
    var stage = document.querySelector('.game-stage[data-game="' + id + '"]');
    if (!stage || !(pct > 0) || !tokens[id]) return;
    var old = stage.querySelector(".hof-offer"); if (old) old.remove();
    var box = el("div", "hof-offer"), g = GAMES[id] || {};
    box.appendChild(el("span", "mono hof-k", "🏆 Hall of Fame · " + monthName(new Date().toISOString().slice(0, 7))));
    box.appendChild(el("h3", null, "You scored " + pct + "%. Add it to this month's Hall of Fame?"));
    var form = el("form", "hof-form"), input = el("input");
    input.type = "text"; input.maxLength = 14; input.placeholder = "Your nickname"; input.autocomplete = "nickname";
    input.setAttribute("aria-label", "Nickname"); input.value = store("ak-hof-name") || "";
    var go = el("button", "btn small", "Add my score"), no = el("button", "btn small ghost", "No thanks");
    go.type = "submit"; no.type = "button";
    form.appendChild(input); form.appendChild(go); form.appendChild(no);
    var note = el("p", "hof-note", "A nickname, not your real name: 2 to 14 letters or numbers. Shown with your score, the game and your country's flag.");
    box.appendChild(form); box.appendChild(note);
    no.addEventListener("click", function () { box.remove(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = input.value.trim();
      if (name.length < 2) { note.textContent = "Please type a nickname of at least 2 characters."; note.className = "hof-note err"; return; }
      go.disabled = true; go.textContent = "Adding…";
      post("/hof", { game: id, pct: pct, name: name, token: tokens[id] }).then(function (j) {
        if (!j.ok) { go.disabled = false; go.textContent = "Add my score"; note.textContent = j.message || "That didn't work. Please try again."; note.className = "hof-note err"; return; }
        store("ak-hof-name", name);
        box.innerHTML = "";
        box.appendChild(el("span", "mono hof-k", "🏆 Hall of Fame · " + monthName(j.month)));
        box.appendChild(el("h3", null, j.rank_game ? "You're #" + j.rank_game + " in " + (g.name || "this game") + " this month!" : "Score added. Beat the top 5 to get on the board!"));
        if (j.rank_all) box.appendChild(el("p", "hof-note", "And #" + j.rank_all + " across the whole Playground."));
        if (j.top && j.top.length) box.appendChild(list(j.top, { mine: j.rank_game }));
        var a = el("a", "hof-link", "See the full Hall of Fame on Pulse →"); a.href = "pulse.html#hall-of-fame"; box.appendChild(a);
        if (window.AkShare) {
          var sb = el("div", "share-bar hof-share"), sk = el("span", "mono share-k", "Share my score");
          sb.appendChild(sk);
          [["native", "Share…"], ["linkedin", "LinkedIn"], ["whatsapp", "WhatsApp"], ["x", "X"], ["copy", "Copy link"]].forEach(function (n) {
            var x = el(n[0] === "native" || n[0] === "copy" ? "button" : "a", "share-b", n[1]); x.dataset.net = n[0];
            if (x.tagName === "A") { x.target = "_blank"; x.rel = "noopener"; } else x.type = "button";
            if (n[0] === "native") x.hidden = true;
            sb.appendChild(x);
          });
          box.appendChild(sb);
          var gameUrl = (document.querySelector('meta[property="og:url"]') || {}).content + "#" + id;
          window.AkShare.wire(sb, function () { return gameUrl; }, function () { return "I scored " + pct + "% on " + (g.name || "this game") + (j.rank_game ? " and I'm #" + j.rank_game + " this month" : "") + ". Can you beat me?"; }, "score");
        }
        if (window.akConfetti && j.rank_game === 1) window.akConfetti();
        if (window.akTrack) window.akTrack("hof-submit");
        var strip = stage.querySelector(".hof-strip"); if (strip) fillStrip(strip, j.top || []);
      }).catch(function () { go.disabled = false; go.textContent = "Add my score"; note.textContent = "Couldn't reach the Hall of Fame. Please try again."; note.className = "hof-note err"; });
    });
    var strip = stage.querySelector(".hof-strip");
    (strip ? strip.parentNode : stage).insertAdjacentElement(strip ? "beforebegin" : "beforeend", box);
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  var prev = window.akDone;
  window.akDone = function (id, pct) {
    if (prev) prev(id, pct);
    var key = id + ":" + Math.round(pct);
    if (asked[key]) return; asked[key] = 1;
    setTimeout(function () { offer(id, Math.round(pct || 0)); }, 1200);
  };

  /* each game's top 5, under the game */
  function fillStrip(strip, top) {
    strip.innerHTML = ""; strip.hidden = false;
    var head = el("div", "hof-strip-head");
    head.appendChild(el("span", "mono hof-k", "🏆 This month's top 5"));
    var a = el("a", null, "Hall of Fame →"); a.href = "pulse.html#hall-of-fame"; head.appendChild(a);
    strip.appendChild(head);
    if (top.length) strip.appendChild(list(top)); else strip.appendChild(el("p", "hof-note", "No scores yet this month. Finish a game to take the top spot."));
  }
  Array.prototype.forEach.call(document.querySelectorAll(".hof-strip[data-hof-game]"), function (strip) {
    fetch(API + "/hof?game=" + encodeURIComponent(strip.dataset.hofGame)).then(function (r) { return r.json(); })
      .then(function (j) { fillStrip(strip, j.top || []); }).catch(function () {});
  });

  /* the Pulse page section */
  var pulse = document.getElementById("hall-of-fame");
  if (pulse) {
    var q = function (k) { return pulse.querySelector('[data-hof="' + k + '"]'); };
    fetch(API + "/hof").then(function (r) { return r.json(); }).then(function (j) {
      pulse.hidden = false;
      q("players").textContent = Number(j.players || 0).toLocaleString("en-GB");
      q("month").textContent = monthName(j.month) + " · top 5";
      var top = j.top || [];
      if (top.length) {
        q("leader").textContent = top[0].p + "%"; q("leader-l").textContent = "top score this month, by " + top[0].n;
        q("top").replaceWith(list(top, { games: true }));
      } else { q("empty").hidden = false; q("top").remove(); q("leader").textContent = "–"; }
      if (j.last && j.last.top && j.last.top.length) {
        q("last-wrap").hidden = false; q("last-title").textContent = monthName(j.last.month) + " · champions";
        q("last").replaceWith(list(j.last.top, { games: true }));
      }
    }).catch(function () {});
  }
})();


/* ---------- Share buttons (articles, labs, Workbench) and "share my score" ---------- */
(function () {
  "use strict";
  function meta(p) { var m = document.querySelector('meta[property="' + p + '"]'); return m ? m.content : ""; }
  function links(url, text) {
    var u = encodeURIComponent(url), t = encodeURIComponent(text);
    return { linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=" + u, whatsapp: "https://wa.me/?text=" + encodeURIComponent(text + " " + url),
      x: "https://twitter.com/intent/tweet?text=" + t + "&url=" + u, email: "mailto:?subject=" + t + "&body=" + encodeURIComponent(text + "\n\n" + url) };
  }
  function wire(bar, getUrl, getText, tag) {
    var native = bar.querySelector('[data-net="native"]');
    if (native && navigator.share) native.hidden = false;
    function refresh() { var l = links(getUrl(), getText()); Array.prototype.forEach.call(bar.querySelectorAll("a[data-net]"), function (a) { a.href = l[a.dataset.net]; }); }
    refresh();
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("[data-net]"); if (!b) return;
      refresh();
      var net = b.dataset.net; if (window.akTrack) window.akTrack("share-" + net + "-" + tag);
      if (net === "native") { e.preventDefault(); navigator.share({ title: meta("og:title") || document.title, text: getText(), url: getUrl() }).catch(function () {}); }
      if (net === "copy") {
        e.preventDefault();
        var done = function () { var old = b.textContent; b.textContent = "Link copied ✓"; setTimeout(function () { b.textContent = old; }, 1800); };
        try { navigator.clipboard.writeText(getUrl()).then(done, function () { window.prompt("Copy this link", getUrl()); }); } catch (x) { window.prompt("Copy this link", getUrl()); }
      }
    });
    return refresh;
  }
  var page = (document.body.className.match(/page-([\w-]+)/) || [])[1] || "page";
  Array.prototype.forEach.call(document.querySelectorAll("[data-share]"), function (bar) {
    var base = meta("og:url") || location.href.split("#")[0].split("?")[0];
    var refresh = wire(bar, function () { var h = location.hash && /lab$/.test(page) ? location.hash : ""; return base + h; },
      function () { return bar.dataset.text || meta("og:title") || document.title; }, page);
    window.addEventListener("hashchange", refresh);
  });
  window.AkShare = { links: links, wire: wire };
})();
