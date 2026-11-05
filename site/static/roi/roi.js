// Fraud ROI Calculator: runs entirely in the browser, no AI and no data sent anywhere.
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var cur = "£", used = false;
  var ids = ["payments", "fraud", "loss", "catch", "alarms", "review", "cost"];

  function val(id) { var i = $("#roi-" + id); return Number(i.dataset.values.split(",")[i.value]); }
  function money(n, dp) {
    var a = Math.abs(n), s = n < 0 ? "−" : "";
    if (a >= 1e9) return s + cur + (a / 1e9).toFixed(dp == null ? 2 : dp) + "bn";
    if (a >= 1e6) return s + cur + (a / 1e6).toFixed(dp == null ? 2 : dp) + "m";
    if (a >= 1e3) return s + cur + Math.round(a / 1e3) + "k";
    return s + cur + (a < 10 && a % 1 ? a.toFixed(2) : Math.round(a));
  }
  function count(n) { return Math.round(n).toLocaleString("en-GB"); }
  function show(id, kind, v) {
    $("#roi-v-" + id).textContent = kind === "money" ? money(v, 1) : kind === "pct" ? v + "%" : kind === "x" ? String(v) : count(v);
  }

  function chart(stopped, reviews, model, net) {
    var W = 320, H = 180, top = 22, base = 150, lo = Math.min(0, net, stopped - reviews - model), hi = Math.max(stopped, 1);
    var y = function (v) { return top + (hi - v) / (hi - lo) * (base - top); };
    var bars = [
      ["Stopped", 0, stopped, "var(--safe)", money(stopped)],
      ["Reviews", stopped - reviews, stopped, "var(--risk)", "−" + money(reviews)],
      ["Model", stopped - reviews - model, stopped - reviews, "var(--risk)", "−" + money(model)],
      ["Net", Math.min(0, net), Math.max(0, net), net >= 0 ? "var(--accent)" : "var(--risk)", money(net)],
    ];
    var svg = '<svg class="roi-wf" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Losses stopped ' + money(stopped) + ", minus review cost " + money(reviews) +
      " and model cost " + money(model) + ", leaves " + money(net) + ' net a year">';
    svg += '<line x1="0" x2="' + W + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '" stroke="var(--line)"/>';
    bars.forEach(function (b, i) {
      var x = 14 + i * 78, y1 = y(b[2]), y2 = y(b[1]), h = Math.max(2, y2 - y1);
      svg += '<rect x="' + x + '" y="' + y1.toFixed(1) + '" width="56" height="' + h.toFixed(1) + '" rx="4" fill="' + b[3] + '"/>';
      var ly = i === 1 || i === 2 ? y2 + 14 : y1 - 6;
      svg += '<text class="v" x="' + (x + 28) + '" y="' + Math.max(12, Math.min(base - 2, ly)).toFixed(1) + '" text-anchor="middle">' + b[4] + "</text>";
      svg += '<text x="' + (x + 28) + '" y="' + (H - 8) + '" text-anchor="middle">' + b[0] + "</text>";
    });
    $("#roi-chart").innerHTML = svg + "</svg>";
  }

  function calc() {
    var p = val("payments"), f = val("fraud") / 100, loss = val("loss"), c = val("catch") / 100, fa = val("alarms"), rc = val("review"), mc = val("cost");
    ids.forEach(function (id) { var i = $("#roi-" + id); show(id, i.dataset.kind, val(id)); });
    var frauds = p * f, caught = frauds * c, stoppedM = caught * loss, alerts = caught * (1 + fa), reviewM = alerts * rc;
    var stopped = stoppedM * 12, reviews = reviewM * 12, net = stopped - reviews - mc, cost = reviews + mc, monthly = stoppedM - reviewM;
    $("#roi-net").textContent = money(net, 1);
    $("#roi-net").parentNode.className = net >= 0 ? "good" : "bad";
    $("#roi-x").textContent = cost > 0 ? (net / cost).toFixed(1) + "×" : "—";
    $("#roi-pay").textContent = mc === 0 ? "Straight away" : monthly <= 0 ? "Never" : mc / monthly < 1 ? "< 1 month" : Math.ceil(mc / monthly) + " months";
    $("#roi-stop").textContent = money(stopped, 1);
    var blocked = caught * fa;
    $("#roi-friction").innerHTML = "";
    var b = document.createElement("b"); b.textContent = count(blocked) + " genuine payments a month";
    $("#roi-friction").append("The hidden cost: ", b, " are stopped as false alarms" + (blocked >= 1 ? " (about 1 in " + count(p / blocked) + " payments)" : "") + ". Push the catch rate up and watch this climb.");
    $("#roi-miss").textContent = "Still missed: " + count(frauds - caught) + " frauds a month, about " + money((frauds - caught) * loss * 12, 1) + " a year.";
    chart(stopped, reviews, mc, net);
  }

  ids.forEach(function (id) {
    $("#roi-" + id).addEventListener("input", function () { calc(); if (!used) { used = true; if (window.akTrack) window.akTrack("tool-roi-use"); } });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".roi-c"), function (btn) {
    btn.addEventListener("click", function () {
      cur = btn.dataset.c;
      Array.prototype.forEach.call(document.querySelectorAll(".roi-c"), function (x) { x.setAttribute("aria-checked", String(x === btn)); });
      calc();
    });
  });
  calc();
})();
