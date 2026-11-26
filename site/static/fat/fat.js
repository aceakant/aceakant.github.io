// Fraud Alert Tuner: test fraud detection rules on 14 days of illustrative sample data, against the number of alerts a
// review team can actually work each day. Two samples: card and bank payments, and loan applications with synthetic
// identities. The ready-made rules run in the browser with no AI; "Write your own rule" sends only the description
// to a maker AI that writes it as a rule and a checker AI that checks it, and the browser then tests it here.
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var DAYS = 14, CODES = { "$": "USD", "£": "GBP", "€": "EUR", "C$": "CAD" };
  var api = (document.querySelector('meta[name="ak-api"]') || {}).content || "";

  /* ---------- the two samples ---------- */
  var SC = {
    payments: {
      label: "Card & bank payments", perDay: 3000, unit: "payment", units: "payments",
      fields: [
        { k: "amount", label: "payment amount", money: true },
        { k: "payee_new", label: "first payment to this payee", bool: true },
        { k: "device_new", label: "new device or browser", bool: true },
        { k: "account_age_days", label: "days since the account was opened" },
        { k: "payments_last_hour", label: "payments in the last hour" },
        { k: "night", label: "between midnight and 6am", bool: true },
        { k: "overseas", label: "overseas payment", bool: true }],
      types: [
        { id: "ato", name: "Account takeover", share: 0.0021, recover: 0.9 },
        { id: "testing", name: "Card testing", share: 0.0018, recover: 0.9 },
        { id: "scam", name: "Scam payment the customer makes", share: 0.0012, recover: 0.5 }],
      rules: [
        { id: "r1", name: "Big payment to a new payee", knob: { label: "Payment to a new payee of at least", min: 200, max: 5000, step: 100, def: 1000, money: true },
          make: function (x) { return [["payee_new", "==", 1], ["amount", ">=", x]]; } },
        { id: "r2", name: "New device and new payee", knob: { label: "New device and new payee, payment of at least", min: 0, max: 2000, step: 50, def: 100, money: true },
          make: function (x) { return [["device_new", "==", 1], ["payee_new", "==", 1], ["amount", ">=", x]]; } },
        { id: "r3", name: "Burst of payments", knob: { label: "Payments from one account in an hour, at least", min: 3, max: 15, step: 1, def: 5 },
          make: function (x) { return [["payments_last_hour", ">=", x]]; } }],
      friction: 3, frictionText: "a genuine payment held",
      examples: ["Payments over 500 made at night from a new device", "Overseas payments to a new payee from accounts opened in the last 60 days"]
    },
    applications: {
      label: "Loan applications (synthetic identity)", perDay: 800, unit: "application", units: "applications",
      fields: [
        { k: "amount", label: "loan amount requested", money: true },
        { k: "credit_file_months", label: "age of oldest credit account (months)" },
        { k: "authorised_user_lines", label: "authorised-user credit accounts" },
        { k: "phone_shared_apps", label: "other applications with the same phone" },
        { k: "address_shared_apps", label: "other applications with the same address" },
        { k: "email_age_days", label: "days since the email was first seen" },
        { k: "inquiries_30d", label: "credit enquiries in the last 30 days" }],
      types: [
        { id: "synthetic", name: "Synthetic identity (bust-out)", share: 0.009, recover: 0.95 },
        { id: "stolen", name: "Stolen identity", share: 0.004, recover: 0.95 }],
      rules: [
        { id: "r1", name: "Thin file built on borrowed accounts", knob: { label: "Credit file younger than (months), with 2+ authorised-user accounts", min: 12, max: 72, step: 6, def: 36 },
          make: function (x) { return [["credit_file_months", "<=", x], ["authorised_user_lines", ">=", 2]]; } },
        { id: "r2", name: "Phone shared with other applications", knob: { label: "Other applications with the same phone, at least", min: 1, max: 6, step: 1, def: 2 },
          make: function (x) { return [["phone_shared_apps", ">=", x]]; } },
        { id: "r3", name: "New email and many enquiries", knob: { label: "Email first seen within (days), with 3+ enquiries", min: 7, max: 180, step: 1, def: 30 },
          make: function (x) { return [["email_age_days", "<=", x], ["inquiries_30d", ">=", 3]]; } }],
      friction: 40, frictionText: "a genuine applicant held up (some walk away)",
      examples: ["Applications for more than 15,000 where the address is shared with 3 or more other applications", "Thin credit files under 2 years with lots of recent credit enquiries"]
    }
  };

  var st = { sc: "payments", seed: 11, cur: "$", analysts: 2, perAnalyst: 40, reviewCost: 6, on: [true, true, true], knob: [null, null, null], focus: 0, ai: null, aiOn: true };
  var data = {}, used = false, talkBox = null, last = null;

  /* ---------- sample data (repeatable from the seed) ---------- */
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function make(scId) {
    var s = SC[scId], R = rng(st.seed * 31 + (scId === "payments" ? 1 : 2)), n = s.perDay * DAYS, d = { n: n, day: new Uint8Array(n), type: new Int8Array(n), loss: new Float64Array(n) };
    s.fields.forEach(function (f) { d[f.k] = new Float64Array(n); });
    var u = R, logn = function (med, sd) { var z = Math.sqrt(-2 * Math.log(u() || 1e-9)) * Math.cos(2 * Math.PI * u()); return med * Math.exp(sd * z); };
    var pois = function (l) { var L = Math.exp(-l), k = 0, p = 1; do { k++; p *= u(); } while (p > L); return k - 1; };
    var yes = function (p) { return u() < p ? 1 : 0; }, between = function (a, b) { return a + Math.floor(u() * (b - a + 1)); };
    for (var i = 0; i < n; i++) {
      d.day[i] = Math.floor(i / s.perDay);
      var r = u(), t = -1, acc = 0;
      for (var j = 0; j < s.types.length; j++) { acc += s.types[j].share; if (r < acc) { t = j; break; } }
      d.type[i] = t;
      if (scId === "payments") {
        var id = t < 0 ? "" : s.types[t].id, g = u(), big = !id && g < 0.07, busy = !id && g >= 0.07 && g < 0.09;  // genuine: everyday, big transfers (rent, deposits), busy accounts
        d.amount[i] = Math.round(Math.min(25000, id === "ato" ? logn(1600, 0.7) : id === "testing" ? 1 + u() * 14 : id === "scam" ? logn(1400, 0.9) : big ? logn(1200, 0.8) : logn(55, 1.3)));
        d.device_new[i] = yes(id === "ato" ? 0.85 : id === "testing" ? 0.5 : id === "scam" ? 0.08 : 0.05);
        d.payee_new[i] = yes(id === "ato" ? 0.9 : id === "scam" ? 0.85 : id === "testing" ? 0.3 : big ? 0.4 : d.device_new[i] ? 0.3 : 0.08);
        d.account_age_days[i] = id === "testing" ? between(5, 2000) : u() < 0.05 ? between(1, 30) : between(31, 3600);
        d.payments_last_hour[i] = id === "testing" ? between(4, 22) : id === "ato" ? 1 + pois(1.2) : busy ? 3 + pois(2) : 1 + pois(0.25);
        d.night[i] = yes(id === "ato" ? 0.35 : id === "testing" ? 0.45 : id === "scam" ? 0.08 : 0.06);
        d.overseas[i] = yes(id === "ato" ? 0.3 : id === "testing" ? 0.5 : id === "scam" ? 0.15 : 0.04);
        // card testing is small on its own; the loss it leads to is the stolen cards used next
        d.loss[i] = t < 0 ? 0 : id === "testing" ? 350 : d.amount[i];
      } else {
        var sy = t >= 0 && s.types[t].id === "synthetic", sto = t >= 0 && !sy, young = !sy && !sto && u() < 0.12;
        d.amount[i] = Math.round(Math.min(40000, sy ? logn(14000, 0.4) : sto ? logn(11000, 0.5) : logn(7500, 0.6)) / 100) * 100;
        d.credit_file_months[i] = sy ? between(9, 40) : sto ? between(36, 360) : young ? between(6, 30) : Math.round(Math.min(420, logn(130, 0.6)));
        d.authorised_user_lines[i] = sy ? (u() < 0.7 ? between(2, 6) : between(0, 1)) : young ? (u() < 0.5 ? between(1, 4) : 0) : (u() < 0.03 ? between(2, 3) : u() < 0.06 ? 1 : 0);
        d.phone_shared_apps[i] = sy ? (u() < 0.55 ? between(1, 8) : 0) : sto ? (u() < 0.25 ? between(1, 3) : 0) : (u() < 0.04 ? between(1, 3) : 0);
        d.address_shared_apps[i] = sy ? (u() < 0.5 ? between(1, 10) : 0) : pois(0.12);
        d.email_age_days[i] = sy ? (u() < 0.7 ? between(1, 60) : between(61, 900)) : sto ? (u() < 0.6 ? between(1, 20) : between(21, 3000)) : (u() < 0.08 ? between(1, 30) : u() < 0.05 ? between(31, 180) : between(181, 5000));
        d.inquiries_30d[i] = sy ? between(2, 8) : sto ? between(1, 6) : pois(1.4);
        d.loss[i] = t < 0 ? 0 : Math.round(d.amount[i] * (sy ? 0.95 : 0.85));
      }
    }
    return d;
  }
  function D() { var k = st.sc + ":" + st.seed; if (!data[k]) data[k] = make(st.sc); return data[k]; }

  /* ---------- rules ---------- */
  function test(d, conds) {
    var cs = conds.map(function (c) { return { a: d[c[0]], op: c[1], v: c[2] }; });
    var hit = new Uint8Array(d.n);
    outer: for (var i = 0; i < d.n; i++) {
      for (var j = 0; j < cs.length; j++) {
        var x = cs[j].a[i], v = cs[j].v, op = cs[j].op;
        if (!(op === ">=" ? x >= v : op === "<=" ? x <= v : op === ">" ? x > v : op === "<" ? x < v : x === v)) continue outer;
      }
      hit[i] = 1;
    }
    return hit;
  }
  function rules() {
    var s = SC[st.sc], list = s.rules.map(function (r, i) { return { id: r.id, name: r.name, on: st.on[i], conds: r.make(knob(i)) }; });
    if (st.ai && st.ai.scenario === st.sc) list.push({ id: "ai", name: st.ai.rule.name, on: st.aiOn, ai: true, conds: st.ai.rule.conditions.map(function (c) { return [c.field, c.op, c.value]; }) });
    return list;
  }
  function knob(i) { return st.knob[i] == null ? SC[st.sc].rules[i].knob.def : st.knob[i]; }

  // everything the page shows, for one set of rules
  function score(list) {
    var d = D(), s = SC[st.sc], cap = st.analysts * st.perAnalyst, hits = list.map(function (r) { return test(d, r.conds); });
    var any = new Uint8Array(d.n), perDay = [], fraudN = 0, fraudV = 0, i, k;
    for (k = 0; k < DAYS; k++) perDay.push({ alerts: 0, fraud: 0 });
    for (i = 0; i < d.n; i++) {
      for (k = 0; k < list.length; k++) if (list[k].on && hits[k][i]) { any[i] = 1; break; }
      if (d.type[i] >= 0) { fraudN++; fraudV += d.loss[i]; }
      if (any[i]) { perDay[d.day[i]].alerts++; if (d.type[i] >= 0) perDay[d.day[i]].fraud++; }
    }
    // alerts beyond the team's capacity that day wait unworked: on average only cap/alerts of them are reviewed in time
    var caught = 0, caughtV = 0, reviewed = 0, falseA = 0, alerts = 0, byType = s.types.map(function (t) { return { name: t.name, n: 0, flagged: 0, caught: 0, v: 0, cv: 0 }; });
    perDay.forEach(function (p) { p.share = p.alerts ? Math.min(1, cap / p.alerts) : 1; p.reviewed = Math.min(p.alerts, cap); alerts += p.alerts; reviewed += p.reviewed; });
    for (i = 0; i < d.n; i++) {
      var t = d.type[i];
      if (t >= 0) { byType[t].n++; byType[t].v += d.loss[i]; }
      if (!any[i]) continue;
      var sh = perDay[d.day[i]].share;
      if (t >= 0) { var rec = s.types[t].recover; caught += sh; caughtV += d.loss[i] * sh * rec; byType[t].flagged++; byType[t].caught += sh; byType[t].cv += d.loss[i] * sh * rec; }
      else falseA++;
    }
    var per = list.map(function (r, k) {
      var a = 0, f = 0, fv = 0, only = 0;
      for (i = 0; i < d.n; i++) if (hits[k][i]) {
        a++; if (d.type[i] >= 0) { f++; fv += d.loss[i]; var other = false; for (var m = 0; m < list.length; m++) if (m !== k && list[m].on && hits[m][i]) { other = true; break; } if (!other) only++; }
      }
      return { r: r, alerts: a / DAYS, fraud: f, fraudV: fv, precision: a ? f / a : 0, only: only };
    });
    var reviewCost = reviewed * st.reviewCost, friction = falseA * s.friction;
    return { cap: cap, perDay: perDay, alertsDay: alerts / DAYS, fraudN: fraudN, fraudV: fraudV, caught: caught, caughtV: caughtV, falseA: falseA,
      precision: alerts ? (alerts - falseA) / alerts : 0, reviewCost: reviewCost, friction: friction, net: caughtV - reviewCost - friction,
      over: perDay.filter(function (p) { return p.alerts > cap; }).length, byType: byType, per: per };
  }

  /* ---------- formats ---------- */
  function money(v, dp) {
    var a = Math.abs(v), sg = v < 0 ? "−" : "", c = st.cur;
    if (a >= 1e6) return sg + c + (a / 1e6).toFixed(dp == null ? 2 : dp) + "m";
    if (a >= 1e4) return sg + c + Math.round(a / 1e3) + "k";
    return sg + c + Math.round(a).toLocaleString("en-GB");
  }
  function pct(v, dp) { return (v * 100).toFixed(dp == null ? 0 : dp) + "%"; }
  function num(n) { return Math.round(n).toLocaleString("en-GB"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function knobText(k, v) { return k.money ? money(v) : num(v); }
  function condText(c) {
    var f = SC[st.sc].fields.filter(function (x) { return x.k === c[0]; })[0] || { label: c[0] };
    if (f.bool) return (c[2] ? "" : "not ") + f.label;
    var op = { ">=": "at least", "<=": "at most", ">": "more than", "<": "less than", "==": "exactly" }[c[1]];
    return f.label + " " + op + " " + (f.money ? money(c[2]) : num(c[2]));
  }

  /* ---------- drawing ---------- */
  function drawKnobs() {
    var s = SC[st.sc], h = "";
    s.rules.forEach(function (r, i) {
      var k = r.knob, v = knob(i);
      h += '<div class="fat-rule' + (st.on[i] ? "" : " off") + '"><label class="fat-on"><input type="checkbox" data-i="' + i + '"' + (st.on[i] ? " checked" : "") + '> <b>' + (i + 1) + ". " + esc(r.name) + "</b></label>" +
        '<label class="roi-sl"><span class="roi-top"><span>' + esc(k.label) + '</span><b id="fat-k' + i + '-v">' + knobText(k, v) + "</b></span>" +
        '<input type="range" id="fat-k' + i + '" data-i="' + i + '" min="' + k.min + '" max="' + k.max + '" step="' + k.step + '" value="' + v + '"' + (st.on[i] ? "" : " disabled") + "></label></div>";
    });
    $("#fat-rules").innerHTML = h;
    Array.prototype.forEach.call(document.querySelectorAll("#fat-rules input[type=checkbox]"), function (x) {
      x.addEventListener("change", function () { st.on[+x.dataset.i] = x.checked; touch(); drawKnobs(); calc(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("#fat-rules input[type=range]"), function (x) {
      x.addEventListener("input", function () { var i = +x.dataset.i; st.knob[i] = Number(x.value); st.focus = i; $("#fat-k" + i + "-v").textContent = knobText(SC[st.sc].rules[i].knob, st.knob[i]); touch(); calc(); });
    });
  }

  function chartDays(R) {
    var W = 560, H = 220, L = 44, Rm = 10, Tp = 14, Bm = 28, mx = Math.max(R.cap * 1.15, Math.max.apply(null, R.perDay.map(function (p) { return p.alerts; })) * 1.08, 10);
    var X = function (k) { return L + (k + 0.5) * (W - L - Rm) / DAYS; }, Y = function (v) { return H - Bm - v / mx * (H - Tp - Bm); }, bw = (W - L - Rm) / DAYS * 0.66;
    var svg = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Alerts each day for 14 days, against a team capacity of ' + R.cap + ' a day">';
    [0, Math.round(mx / 2), Math.round(mx)].forEach(function (v) { svg += '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" class="cs-grid"/><text x="' + (L - 6) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + num(v) + "</text>"; });
    R.perDay.forEach(function (p, k) {
      var x = X(k) - bw / 2, over = p.alerts > R.cap;
      svg += '<rect x="' + x.toFixed(1) + '" y="' + Y(p.alerts).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (Y(0) - Y(p.alerts)).toFixed(1) + '" class="' + (over ? "fat-over" : "fat-false") + '"><title>Day ' + (k + 1) + ": " + p.alerts + " alerts, " + p.fraud + " fraud</title></rect>";
      svg += '<rect x="' + x.toFixed(1) + '" y="' + Y(p.fraud).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (Y(0) - Y(p.fraud)).toFixed(1) + '" class="fat-fraud"/>';
      if (k % 2 === 0) svg += '<text x="' + X(k).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + (k + 1) + "</text>";
    });
    svg += '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + Y(R.cap).toFixed(1) + '" y2="' + Y(R.cap).toFixed(1) + '" class="fat-cap"/><text x="' + (W - Rm) + '" y="' + (Y(R.cap) - 5).toFixed(1) + '" text-anchor="end" class="fat-capt">your team: ' + num(R.cap) + " a day</text>";
    $("#fat-days").innerHTML = svg + "</svg>";
  }

  // trade-off for the rule you last moved: fraud value caught against alerts a day, across its whole range
  function chartSweep(R) {
    var s = SC[st.sc], i = st.focus, k = s.rules[i].knob, pts = [], steps = 16, save = st.knob[i], wasOn = st.on[i];
    st.on[i] = true;
    for (var j = 0; j <= steps; j++) {
      var v = k.min + Math.round((k.max - k.min) / k.step * j / steps) * k.step; st.knob[i] = v;
      var r = score(rules()); pts.push({ v: v, a: r.alertsDay, c: r.fraudV ? r.caughtV / r.fraudV : 0 });
    }
    st.knob[i] = save; st.on[i] = wasOn;
    var cur = { a: R.alertsDay, c: R.fraudV ? R.caughtV / R.fraudV : 0 };
    var W = 560, H = 220, L = 44, Rm = 14, Tp = 14, Bm = 30, mxA = Math.max(R.cap * 1.3, Math.max.apply(null, pts.map(function (p) { return p.a; })) * 1.05);
    var X = function (a) { return L + a / mxA * (W - L - Rm); }, Y = function (c) { return H - Bm - c * (H - Tp - Bm); };
    pts.sort(function (a, b) { return a.a - b.a; });
    var svg = '<svg class="cs-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Fraud losses stopped against alerts a day as rule ' + (i + 1) + ' is moved across its range">';
    [0, 0.5, 1].forEach(function (c) { svg += '<line x1="' + L + '" x2="' + (W - Rm) + '" y1="' + Y(c).toFixed(1) + '" y2="' + Y(c).toFixed(1) + '" class="cs-grid"/><text x="' + (L - 6) + '" y="' + (Y(c) + 3).toFixed(1) + '" text-anchor="end">' + pct(c) + "</text>"; });
    [0, mxA / 2, mxA].forEach(function (a) { svg += '<text x="' + X(a).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="' + (a === 0 ? "start" : a === mxA ? "end" : "middle") + '">' + num(a) + "</text>"; });
    svg += '<text x="' + ((W + L) / 2) + '" y="' + (H - 1) + '" text-anchor="middle">alerts a day</text>';
    svg += '<rect x="' + X(R.cap).toFixed(1) + '" y="' + Tp + '" width="' + Math.max(0, W - Rm - X(R.cap)).toFixed(1) + '" height="' + (H - Tp - Bm) + '" class="fat-overzone"/>';
    svg += '<line x1="' + X(R.cap).toFixed(1) + '" x2="' + X(R.cap).toFixed(1) + '" y1="' + Tp + '" y2="' + (H - Bm) + '" class="fat-cap"/><text x="' + (X(R.cap) + 4).toFixed(1) + '" y="' + (Tp + 10) + '" class="fat-capt">beyond your team</text>';
    svg += '<path d="' + pts.map(function (p, j) { return (j ? "L" : "M") + X(p.a).toFixed(1) + " " + Y(p.c).toFixed(1); }).join(" ") + '" class="cs-line"/>';
    svg += '<circle cx="' + X(cur.a).toFixed(1) + '" cy="' + Y(cur.c).toFixed(1) + '" r="6" class="cs-dot"><title>Now: ' + num(cur.a) + " alerts a day, " + pct(cur.c) + " of fraud losses stopped</title></circle>";
    $("#fat-sweep").innerHTML = svg + "</svg>";
    $("#fat-sweep-cap").textContent = "Moving rule " + (i + 1) + " (" + s.rules[i].name.toLowerCase() + ") across its range, with your other rules as they are. The dot is where you are now; past the line, alerts go unworked.";
  }

  function calc() {
    var s = SC[st.sc], list = rules(), R = score(list), share = R.fraudV ? R.caughtV / R.fraudV : 0;
    $("#fat-alerts").textContent = num(R.alertsDay) + " a day";
    $("#fat-alerts-em").textContent = "team can work " + num(R.cap);
    $("#fat-alerts-em").className = R.alertsDay > R.cap ? "down" : "up";
    $("#fat-caught").textContent = pct(share);
    $("#fat-caught-em").textContent = money(R.caughtV) + " of " + money(R.fraudV);
    $("#fat-prec").textContent = R.precision > 0 ? "1 in " + Math.max(1, Math.round(1 / R.precision)) : "none";
    $("#fat-prec-em").textContent = num(R.falseA / DAYS) + " false alarms a day";
    $("#fat-net").textContent = money(R.net);
    $("#fat-net").parentNode.className = R.net >= 0 ? "good" : "bad";
    $("#fat-net-em").textContent = "after " + money(R.reviewCost) + " reviews, " + money(R.friction) + " friction";

    var story;
    var onCount = list.filter(function (r) { return r.on; }).length;
    if (!onCount) story = "All rules are off, so nothing is flagged and every fraud gets through. Switch a rule back on.";
    else {
      story = "Your rules raise " + num(R.alertsDay) + " alerts a day and your team of " + st.analysts + " can work " + num(R.cap) + ".";
      if (R.over) story += " On " + R.over + " of the 14 days the queue overflows, so some real fraud is flagged but not worked in time.";
      else story += " The queue never overflows" + (R.alertsDay < R.cap * 0.6 ? ", and there is room to widen a rule and catch more." : ".");
      story += " You stop " + pct(share) + " of fraud losses; 1 in " + Math.max(1, Math.round(1 / Math.max(R.precision, 1e-6))) + " alerts is real fraud.";
      var worst = R.byType.slice().sort(function (a, b) { return (a.n ? a.caught / a.n : 1) - (b.n ? b.caught / b.n : 1); })[0];
      if (worst && worst.n && worst.caught / worst.n < 0.35) story += " Blind spot: " + worst.name.toLowerCase() + ", where only " + pct(worst.caught / worst.n) + " of cases are caught.";
    }
    $("#fat-story").textContent = story;

    var t = "<thead><tr><th>Rule</th><th>Alerts a day</th><th>Fraud cases flagged</th><th>Real fraud per alert</th><th>Only this rule caught</th></tr></thead><tbody>";
    R.per.forEach(function (p, k) {
      t += '<tr class="' + (p.r.on ? "" : "fat-offrow") + '"><td>' + (p.r.ai ? '<span class="mr-pill ready">AI</span> ' : (k + 1) + ". ") + esc(p.r.name) + (p.r.on ? "" : " (off)") +
        '<span class="fat-cond">' + esc(p.r.conds.map(condText).join(" and ")) + "</span></td><td>" + num(p.alerts) + "</td><td>" + p.fraud + " of " + R.fraudN + "</td><td>" + (p.alerts ? "1 in " + Math.max(1, Math.round(1 / Math.max(p.precision, 1e-6))) : "–") + "</td><td>" + p.only + "</td></tr>";
    });
    $("#fat-score").innerHTML = t + "</tbody>";
    var b = "<thead><tr><th>Fraud type</th><th>Cases in 14 days</th><th>Flagged</th><th>Stopped in time</th><th>Losses stopped</th></tr></thead><tbody>";
    R.byType.forEach(function (x) { b += "<tr><td>" + esc(x.name) + "</td><td>" + x.n + "</td><td>" + x.flagged + "</td><td>" + (x.n ? pct(x.caught / x.n) : "–") + "</td><td>" + money(x.cv) + " of " + money(x.v) + "</td></tr>"; });
    $("#fat-types").innerHTML = b + "</tbody>";

    chartDays(R); chartSweep(R);
    last = { R: R, list: list, share: share };
    if (talkBox) talkBox.akRefresh();
  }

  /* ---------- controls ---------- */
  function mark(box, key, val) { Array.prototype.forEach.call(document.querySelectorAll(box + " .roi-c"), function (x) { x.setAttribute("aria-checked", String(x.dataset[key] === val)); }); }
  function touch() { if (!used) { used = true; if (window.akTrack) window.akTrack("tool-fraud-alert-tuner-use"); } }
  function setScenario(sc) {
    st.sc = sc; st.knob = [null, null, null]; st.on = [true, true, true]; st.focus = 0; mark("#fat-sc", "s", sc);
    $("#fat-unit").textContent = SC[sc].perDay.toLocaleString("en-GB") + " " + SC[sc].units + " a day";
    drawKnobs(); drawExamples(); drawAI(); calc();
  }
  Array.prototype.forEach.call(document.querySelectorAll("#fat-sc .roi-c"), function (x) { x.addEventListener("click", function () { touch(); setScenario(x.dataset.s); }); });
  Array.prototype.forEach.call(document.querySelectorAll("#fat-cur .roi-c"), function (x) { x.addEventListener("click", function () { st.cur = x.dataset.c; mark("#fat-cur", "c", st.cur); drawKnobs(); calc(); }); });
  [["analysts", "fat-an"], ["perAnalyst", "fat-pa"], ["reviewCost", "fat-rc"]].forEach(function (p) {
    var el = $("#" + p[1]);
    el.addEventListener("input", function () { st[p[0]] = Number(el.value); $("#" + p[1] + "-v").textContent = p[0] === "reviewCost" ? money(st.reviewCost) : num(st[p[0]]); touch(); calc(); });
  });
  $("#fat-new").addEventListener("click", function () { st.seed = 1 + Math.floor(Math.random() * 9999); touch(); calc(); });
  $("#fat-best").addEventListener("click", function () { touch(); bestFit(); });

  // "Fit to my team": try each rule's setting in turn and keep the one that stops the most fraud losses
  // without the average day overflowing the team, then repeat once (a simple search, not an optimiser)
  function bestFit() {
    var s = SC[st.sc];
    for (var pass = 0; pass < 2; pass++) s.rules.forEach(function (r, i) {
      if (!st.on[i]) return;
      var k = r.knob, best = null;
      for (var v = k.min; v <= k.max + 1e-9; v += k.step) {
        st.knob[i] = Math.round(v * 100) / 100; var R = score(rules());
        if (R.alertsDay <= R.cap && (!best || R.net > best.net)) best = { v: st.knob[i], net: R.net };
      }
      st.knob[i] = best ? best.v : (k.def < (k.min + k.max) / 2 ? k.max : k.min);
    });
    drawKnobs(); calc();
    $("#fat-fit").textContent = last.R.alertsDay <= last.R.cap ? "Fitted: the busiest rules are tightened until the average day fits your team." : "Even the tightest settings overflow your team; switch a rule off or add analysts.";
  }

  /* ---------- write your own rule (maker-checker AI) ---------- */
  function drawExamples() {
    $("#fat-ex").innerHTML = SC[st.sc].examples.map(function (e) { return '<button type="button" class="chip">' + esc(e) + "</button>"; }).join("");
    Array.prototype.forEach.call(document.querySelectorAll("#fat-ex .chip"), function (b) { b.addEventListener("click", function () { $("#fat-text").value = b.textContent; }); });
    $("#fat-fields").textContent = "Fields it can use: " + SC[st.sc].fields.map(function (f) { return f.label; }).join(" · ");
  }
  function drawAI() {
    var out = $("#fat-ai-out");
    if (!st.ai || st.ai.scenario !== st.sc) { out.hidden = true; out.innerHTML = ""; return; }
    var a = st.ai, v = { confirmed: 0, corrected: 0, removed: 0 }; (a.reviews || []).forEach(function (r) { if (r.verdict in v) v[r.verdict]++; });
    var h = '<div class="fat-airule"><label class="fat-on"><input type="checkbox" id="fat-ai-on"' + (st.aiOn ? " checked" : "") + "> <b>" + esc(a.rule.name) + "</b></label>" +
      '<p class="fat-cond">Alert when ' + esc(a.rule.conditions.map(function (c) { return condText([c.field, c.op, c.value]); }).join(" and ")) + "</p>" +
      '<div class="ainote-chips"><span class="mr-pill ' + (a.matches_description === "yes" ? "ready" : a.matches_description === "partly" ? "partly" : "gap") + '">Checker: ' + (a.matches_description === "yes" ? "matches your description" : a.matches_description === "partly" ? "partly matches" : "doesn't match") + "</span>" +
      '<span class="mr-pill ready">' + v.confirmed + " confirmed</span>" + (v.corrected ? '<span class="mr-pill partly">' + v.corrected + " corrected</span>" : "") + (v.removed ? '<span class="mr-pill gap">' + v.removed + " removed</span>" : "") + "</div>";
    (a.reviews || []).filter(function (r) { return r.verdict !== "confirmed"; }).forEach(function (r) { h += '<p class="ainote-fix"><b>' + (r.verdict === "removed" ? "Removed" : "Corrected") + " (" + esc(r.part) + "):</b> " + esc(r.note) + "</p>"; });
    (a.rule.assumptions || []).forEach(function (s) { h += '<p class="ainote-fix"><b>Assumed:</b> ' + esc(s) + "</p>"; });
    out.innerHTML = h + '<p class="an-sub">Tested on the sample above: see the AI row in the rules table.</p></div>'; out.hidden = false;
    $("#fat-ai-on").addEventListener("change", function (e) { st.aiOn = e.target.checked; calc(); });
  }
  function aiLeft(j) { var el = $("#fat-ai-left"); if (j && j.remaining != null) el.textContent = j.remaining > 0 ? j.remaining + " of " + j.free + " free AI rules left" : "Free AI rules used"; }
  if (api) fetch(api + "/status?tool=rule").then(function (r) { return r.json(); }).then(aiLeft).catch(function () {});
  else { $("#fat-ai-go").disabled = true; $("#fat-ai-left").textContent = "AI rules aren't switched on here yet; the ready-made rules work."; }
  $("#fat-ai-go").addEventListener("click", function () {
    var text = $("#fat-text").value.trim(), go = $("#fat-ai-go"), msg = $("#fat-ai-msg");
    if (text.length < 8) { msg.textContent = "Describe the pattern in a sentence or two."; return; }
    go.disabled = true; go.textContent = "Writing the rule…"; msg.textContent = "The maker AI is writing your rule, then a checker AI checks it says what you meant. About 20 to 40 seconds.";
    touch();
    fetch(api + "/rule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: st.sc, text: text }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        go.disabled = false; go.textContent = "Write another rule";
        if (d && d.rule) {
          st.ai = d; st.aiOn = true; msg.textContent = ""; aiLeft(d); drawAI(); calc();
          if (window.akTrack) window.akTrack("tool-ai-rule-fraud-alert-tuner");
        } else msg.textContent = (d && d.message) || "That didn't finish. Please try again in a minute.";
      })
      .catch(function () { go.disabled = false; go.textContent = "Write the rule"; msg.textContent = "That didn't finish. Please try again in a minute."; });
  });

  /* ---------- shared link (?sc=a&s=seed&k1=..&k2=..&k3=..&on=101&an=4&pa=50&k=GBP) ---------- */
  (function () {
    var q = new URLSearchParams(location.search), n;
    if (q.get("sc") === "a") st.sc = "applications";
    n = parseInt(q.get("s"), 10); if (n > 0 && n < 100000) st.seed = n;
    var on = q.get("on"); if (on && /^[01]{3}$/.test(on)) st.on = on.split("").map(function (c) { return c === "1"; });
    [1, 2, 3].forEach(function (j) { var v = Number(q.get("k" + j)), k = SC[st.sc].rules[j - 1].knob; if (q.get("k" + j) && v >= k.min && v <= k.max) st.knob[j - 1] = v; });
    n = Number(q.get("an")); if (n >= 1 && n <= 20) { st.analysts = n; $("#fat-an").value = n; }
    n = Number(q.get("pa")); if (n >= 10 && n <= 150) { st.perAnalyst = n; $("#fat-pa").value = n; }
    Object.keys(CODES).forEach(function (k) { if (CODES[k] === q.get("k")) { st.cur = k; mark("#fat-cur", "c", k); } });
  })();
  function link() {
    return location.origin + location.pathname + "?sc=" + (st.sc === "applications" ? "a" : "p") + "&s=" + st.seed + [0, 1, 2].map(function (i) { return "&k" + (i + 1) + "=" + knob(i); }).join("") +
      "&on=" + st.on.map(function (o) { return o ? 1 : 0; }).join("") + "&an=" + st.analysts + "&pa=" + st.perAnalyst + "&k=" + CODES[st.cur];
  }
  function lines() {
    var R = last.R;
    return ["Sample: " + SC[st.sc].label + ", " + num(SC[st.sc].perDay) + " a day for 14 days · team of " + st.analysts + " working " + num(R.cap) + " alerts a day",
      "Result: " + num(R.alertsDay) + " alerts a day · " + pct(last.share) + " of fraud losses stopped · 1 in " + Math.max(1, Math.round(1 / Math.max(R.precision, 1e-6))) + " alerts is fraud · net " + money(R.net),
      "Rules: " + last.list.filter(function (r) { return r.on; }).map(function (r) { return r.name + " (" + r.conds.map(condText).join(" and ") + ")"; }).join(" · ")];
  }
  function facts() {
    var R = last.R, f = { data: "illustrative sample: " + SC[st.sc].label.toLowerCase() + ", " + SC[st.sc].perDay + " a day for 14 days", currency: CODES[st.cur],
      team_alerts_per_day_capacity: R.cap, alerts_per_day: Math.round(R.alertsDay), days_queue_overflowed_of_14: R.over, fraud_cases_in_sample: R.fraudN,
      fraud_losses_in_sample: Math.round(R.fraudV), fraud_losses_stopped: Math.round(R.caughtV), share_of_fraud_losses_stopped: Math.round(last.share * 1000) / 1000,
      false_alarms_per_day: Math.round(R.falseA / DAYS), alerts_per_real_fraud: R.precision ? Math.round(1 / R.precision) : 0, review_cost: Math.round(R.reviewCost),
      customer_friction_cost: Math.round(R.friction), net_benefit_14_days: Math.round(R.net) };
    R.per.forEach(function (p, i) {
      var k = "rule_" + (i + 1) + "_"; f[k + "name"] = (p.r.ai ? "AI-written: " : "") + p.r.name + (p.r.on ? "" : " (switched off)");
      f[k + "alerts_per_day"] = Math.round(p.alerts); f[k + "fraud_flagged"] = p.fraud; f[k + "fraud_only_this_rule_caught"] = p.only;
    });
    R.byType.forEach(function (x) { f["stopped_share_" + x.name.toLowerCase().replace(/[^a-z]+/g, "_").replace(/_+$/, "")] = x.n ? Math.round(x.caught / x.n * 100) / 100 : 0; });
    return f;
  }

  setScenario(st.sc);
  var noteHolder = $("#fat-note");
  if (noteHolder && window.AkNote) window.AkNote.mount(noteHolder, { tool: "fraud-alert", facts: facts });
  var holder = $("#fat-talk");
  if (holder && window.AkTalk) talkBox = window.AkTalk.mount(holder, { tool: "fraud-alert", toolName: "Fraud Alert Tuner", lines: lines, link: link,
    linkNote: "The link in your message reopens the tuner with your exact sample, rules and team. Nothing is stored." });
  window.__fat = { score: score, rules: rules, st: st, SC: SC };
})();
