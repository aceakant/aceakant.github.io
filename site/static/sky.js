/* Constellation background: drifting, twinkling teal and gold signal dots on a navy sky.
   Near the pointer, dots link up like a network being detected. Pauses when hidden;
   draws a single still frame for people who prefer reduced motion. */
(function () {
  "use strict";
  var canvas = document.getElementById("sky");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, dots = [], sprites = {}, pointer = { x: -9999, y: -9999, on: false }, running = true, last = 0;

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  // Pre-rendered glow sprites (cheaper than shadowBlur on every frame)
  function sprite(color) {
    var s = 48, c = document.createElement("canvas");
    c.width = c.height = s * dpr;
    var g = c.getContext("2d"), r = (s * dpr) / 2;
    var grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.12, color);
    grad.addColorStop(0.22, hexA(color, 0.45));
    grad.addColorStop(0.55, hexA(color, 0.08));
    grad.addColorStop(1, hexA(color, 0));
    g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function hexA(hex, a) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (x) { return x + x; }).join("");
    var n = parseInt(h, 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }
  function buildSprites() {
    var teal = css("--accent") || "#2FD3C8", gold = css("--amber") || "#F5C04E";
    sprites = { teal: sprite(teal), gold: sprite(gold), tealLine: hexA(teal, 1) };
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var target = Math.round(Math.min(110, Math.max(36, (W * H) / 15000)));
    while (dots.length < target) dots.push(make(true));
    dots.length = target;
  }

  function make(anywhere) {
    var gold = Math.random() < 0.2;
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 10,
      vx: (Math.random() - 0.5) * 0.12, vy: -(0.03 + Math.random() * 0.1),
      size: 10 + Math.random() * 12, kind: gold ? "gold" : "teal",
      phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.9
    };
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var linkR = Math.min(170, W * 0.22), near = [];
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (!reduce) {
        d.x += d.vx; d.y += d.vy;
        if (d.y < -20 || d.x < -20 || d.x > W + 20) { dots[i] = make(false); dots[i].y = H + 10; continue; }
      }
      var tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(d.phase + (t / 1000) * d.speed));
      ctx.globalAlpha = tw;
      ctx.drawImage(sprites[d.kind], d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
      if (pointer.on) {
        var dx = d.x - pointer.x, dy = d.y - pointer.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkR) near.push({ d: d, dist: dist });
      }
    }
    if (near.length) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = sprites.tealLine;
      for (var a = 0; a < near.length; a++) {
        ctx.globalAlpha = 0.5 * (1 - near[a].dist / linkR);
        ctx.beginPath(); ctx.moveTo(pointer.x, pointer.y); ctx.lineTo(near[a].d.x, near[a].d.y); ctx.stroke();
        for (var b = a + 1; b < near.length; b++) {
          var ex = near[a].d.x - near[b].d.x, ey = near[a].d.y - near[b].d.y, e = Math.sqrt(ex * ex + ey * ey);
          if (e < linkR * 0.7) {
            ctx.globalAlpha = 0.28 * (1 - e / (linkR * 0.7));
            ctx.beginPath(); ctx.moveTo(near[a].d.x, near[a].d.y); ctx.lineTo(near[b].d.x, near[b].d.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 0.9; ctx.drawImage(sprites.teal, pointer.x - 9, pointer.y - 9, 18, 18);
    }
    ctx.globalAlpha = 1;
  }

  function loop(t) {
    if (!running) return;
    if (t - last > 30) { draw(t); last = t; } // ~30 fps is plenty for a slow drift
    requestAnimationFrame(loop);
  }

  function setPointer(x, y) { pointer.x = x; pointer.y = y; pointer.on = true; if (reduce) draw(0); }
  window.addEventListener("pointermove", function (e) { setPointer(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener("pointerdown", function (e) { setPointer(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener("pointerleave", function () { pointer.on = false; });
  window.addEventListener("touchend", function () { setTimeout(function () { pointer.on = false; }, 900); }, { passive: true });
  window.addEventListener("resize", function () { resize(); if (reduce) draw(0); });
  document.addEventListener("visibilitychange", function () {
    running = !document.hidden && !reduce;
    if (running) requestAnimationFrame(loop);
  });
  // re-tint when the theme toggle changes
  new MutationObserver(function () { buildSprites(); if (reduce) draw(0); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  buildSprites(); resize();
  if (reduce) { running = false; draw(0); } else requestAnimationFrame(loop);
})();
