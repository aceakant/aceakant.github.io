/* Analyst on Call: the data check. Runs entirely in the visitor's browser (and in Node for the sample job).
   It reads a CSV, works out what each column is, and builds a compact summary of statistics.
   Only that summary is ever sent to the AI: never the rows, and never values from columns that look personal. */
(function (root) {
  "use strict";

  var MISSING = { "": 1, "na": 1, "n/a": 1, "null": 1, "none": 1, "nan": 1, "-": 1, "#n/a": 1 };
  var PERSONAL = /(^|_|\b)(name|first.?name|last.?name|full.?name|email|e.?mail|phone|mobile|contact|address|addr|pin.?code|zip|postcode|pan|aadha?ar|passport|dob|birth|ssn|national.?id|voter|ip.?addr)(\b|_|$)/i;
  var ID_NAME = /(^id$|_id$|^id_|\bid\b|ref$|reference|number$|_no$|^no$|uuid|guid|key$|hash)/i;
  var TARGET_STRONG = /(dpd|default|delinq|fraud|bad|charge.?back|outcome|target|label|arrear|npa|write.?off|churn)/i;
  var TARGET_WEAK = /(flag|is_|missed|loss|confirmed)/i;
  var MEASURE_NAME = /(amount|amt|value|exposure|balance|outstanding|limit|loan|price|spend|revenue|income|salary|minutes|mins|time|duration|score|cost|fee)/i;
  var ADDITIVE = /(amount|amt|value|exposure|balance|outstanding|loan|spend|revenue|sales|minutes|mins|hours|duration|cost|fee|count|qty|quantity|volume)/i;
  var REPEAT_NAME = /(phone|mobile|device|email|ip|address|account|pan|card|imei|contact)/i;
  var POSITIVE = /^(yes|y|true|t|1|fraud|confirmed.*|default.*|bad|delinquent|charge.?back|missed|npa|written.?off)$/i;

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    text = String(text).replace(/^﻿/, "");
    var first = text.slice(0, text.indexOf("\n") > -1 ? text.indexOf("\n") : text.length);
    var counts = { ",": (first.match(/,/g) || []).length, ";": (first.match(/;/g) || []).length, "\t": (first.match(/\t/g) || []).length };
    var sep = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
    var rows = [], row = [], cell = "", q = false, i = 0, c, n = text.length;
    for (; i < n; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); if (row.length > 1 || row[0] !== "") rows.push(row); }
    if (!rows.length) return { header: [], rows: [] };
    var header = rows.shift().map(function (h, k) { h = String(h).trim(); return h || "column_" + (k + 1); });
    return { header: header, rows: rows };
  }

  /* ---------- small helpers ---------- */
  function isMissing(v) { return v == null || MISSING[String(v).trim().toLowerCase()] === 1; }
  function toNum(v) {
    var s = String(v).trim().replace(/[₹$£€,\s]/g, "").replace(/%$/, "");
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
    return parseFloat(s);
  }
  function toDate(v) {
    var s = String(v).trim(), m;
    if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)))
      return mk(+m[1], +m[2], +m[3], m[4], m[5]);
    if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/))) {
      var a = +m[1], b = +m[2];                     // day first (India, UK) unless that is impossible
      return a > 12 || b <= 12 ? mk(+m[3], b, a, m[4], m[5]) : mk(+m[3], a, b, m[4], m[5]);
    }
    return null;
    function mk(y, mo, d, hh, mm) {
      if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
      return { y: y, m: mo, d: d, t: Date.UTC(y, mo - 1, d), hasTime: hh != null, h: hh != null ? +hh : null };
    }
  }
  function sig(x) { if (x == null || !isFinite(x)) return null; var a = Math.abs(x); return a >= 1000 ? Math.round(x) : a >= 10 ? Math.round(x * 10) / 10 : a >= 1 ? Math.round(x * 100) / 100 : Math.round(x * 10000) / 10000; }
  function pct(a, b) { return b ? Math.round(a / b * 1000) / 10 : null; }
  function quantile(sorted, p) { if (!sorted.length) return null; var i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo); }
  function label(v) { v = String(v).trim(); return v.length > 40 ? v.slice(0, 39) + "…" : v; }
  function nice(s) { s = String(s).replace(/[_]+/g, " ").trim(); return s.charAt(0).toUpperCase() + s.slice(1); }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ---------- the profile ---------- */
  function profile(table, opts) {
    opts = opts || {};
    var H = table.header, R = table.rows, N = R.length;
    var cols = H.map(function (name, j) {
      var vals = [], miss = 0, distinct = {}, nd = 0;
      for (var i = 0; i < N; i++) {
        var v = R[i][j];
        if (isMissing(v)) { miss++; vals.push(null); continue; }
        v = String(v).trim(); vals.push(v);
        if (!distinct[v]) { distinct[v] = 0; nd++; }
        distinct[v]++;
      }
      var present = N - miss, sample = vals.filter(function (x) { return x != null; });
      var c = { name: name, index: j, vals: vals, missing: miss, present: present, distinct: nd, counts: distinct };
      var lower = Object.keys(distinct).map(function (k) { return k.toLowerCase(); });
      var nums = 0, dates = 0, timed = 0;
      sample.forEach(function (v) { if (toNum(v) !== null) nums++; var d = toDate(v); if (d) { dates++; if (d.hasTime) timed++; } });
      c.personal = PERSONAL.test(name) || sample.slice(0, 200).some(function (v) { return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v); });
      if (nd <= 2 && present && lower.every(function (k) { return /^(yes|no|y|n|true|false|t|f|0|1)$/.test(k); })) c.type = "yesno";
      else if (present && dates / present >= 0.9 && !(nums / present >= 0.9 && dates < nums)) { c.type = "date"; c.timed = timed / present >= 0.5; }
      else if (present && nums / present >= 0.95) c.type = (nd >= 0.95 * present && ID_NAME.test(name)) ? "id" : "number";
      else if (present && nd >= 0.95 * present && present > 20) c.type = (ID_NAME.test(name) || REPEAT_NAME.test(name) || c.personal) ? "id" : "text";
      else if (nd <= 50 || nd / Math.max(present, 1) <= 0.05) c.type = "category";
      else c.type = (ID_NAME.test(name) || REPEAT_NAME.test(name)) ? "id" : "text";
      if (c.type === "number") {
        c.nums = vals.map(function (v) { return v == null ? null : toNum(v); });
        var s = c.nums.filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; });
        var sum = s.reduce(function (a, b) { return a + b; }, 0);
        c.stats = { min: s[0], p5: quantile(s, .05), median: quantile(s, .5), mean: s.length ? sum / s.length : null, p95: quantile(s, .95), max: s[s.length - 1], sum: sum };
      }
      if (c.type === "date") {
        c.dates = vals.map(function (v) { return v == null ? null : toDate(v); });
        var ts = c.dates.filter(Boolean).map(function (d) { return d.t; });
        c.range = { from: Math.min.apply(null, ts), to: Math.max.apply(null, ts) };
      }
      return c;
    });

    var byName = {};
    cols.forEach(function (c) { byName[c.name] = c; });

    // the outcome column: something like "defaulted", "is_fraud" or "outcome" with two values
    var target = null, best = -1;
    cols.forEach(function (c) {
      if (c.personal || !(c.type === "yesno" || (c.type === "category" && c.distinct === 2))) return;
      var score = (TARGET_STRONG.test(c.name) ? 10 : TARGET_WEAK.test(c.name) ? 6 : 0) + (c.type === "yesno" ? 2 : 0);
      if (score > best && score >= 2) { best = score; target = c; }
    });
    var tinfo = null, isPos = null;
    if (target) {
      var keys = Object.keys(target.counts);
      var pos = keys.filter(function (k) { return POSITIVE.test(k.toLowerCase()); })[0];
      if (!pos) pos = keys.sort(function (a, b) { return target.counts[a] - target.counts[b]; })[0];  // the rarer value
      isPos = function (i) { return target.vals[i] === pos; };
      var hits = target.counts[pos] || 0;
      tinfo = { column: target.name, positive: pos, rate: pct(hits, target.present), count: hits };
    }
    function rateOf(idx) { if (!isPos) return null; var h = 0; idx.forEach(function (i) { if (isPos(i)) h++; }); return pct(h, idx.length); }

    var measures = cols.filter(function (c) { return c.type === "number" && !c.personal && c !== target; })
      .sort(function (a, b) { return (MEASURE_NAME.test(b.name) ? 1 : 0) - (MEASURE_NAME.test(a.name) ? 1 : 0); }).slice(0, 3);
    var main = measures.filter(function (c) { return /(amount|amt|value|exposure|balance|outstanding|loan|spend|price)/i.test(c.name); })[0] || null;

    // over time
    var dcol = cols.filter(function (c) { return c.type === "date"; })[0] || null, period = null;
    if (dcol) {
      var span = (dcol.range.to - dcol.range.from) / 864e5, unit = span > 270 ? "quarter" : span > 45 ? "month" : span > 6 ? "week" : null;
      if (unit) {
        var groups = {};
        dcol.dates.forEach(function (d, i) {
          if (!d) return;
          var k, lab;
          if (unit === "quarter") { var qn = Math.floor((d.m - 1) / 3) + 1; k = d.y * 10 + qn; lab = "Q" + qn + " " + String(d.y).slice(2); }
          else if (unit === "month") { k = d.y * 100 + d.m; lab = MONTHS[d.m - 1] + " " + String(d.y).slice(2); }
          else { var dd = new Date(d.t), dow = (dd.getUTCDay() + 6) % 7, mon = new Date(d.t - dow * 864e5); k = mon.getTime(); lab = mon.getUTCDate() + " " + MONTHS[mon.getUTCMonth()]; }
          (groups[k] = groups[k] || { label: lab, idx: [] }).idx.push(i);
        });
        period = { column: dcol.name, unit: unit, from: new Date(dcol.range.from).toISOString().slice(0, 10), to: new Date(dcol.range.to).toISOString().slice(0, 10),
          points: Object.keys(groups).sort(function (a, b) { return a - b; }).map(function (k) {
            var g = groups[k], p = { label: g.label, count: g.idx.length, rate: rateOf(g.idx) };
            if (main) p.sum = sig(g.idx.reduce(function (a, i) { return a + (main.nums[i] || 0); }, 0));
            return p;
          }) };
      }
      if (dcol.timed) {
        var bands = [["Night (0–5)", 0, 5], ["Morning (6–11)", 6, 11], ["Afternoon (12–17)", 12, 17], ["Evening (18–23)", 18, 23]];
        period = period || { column: dcol.name };
        period.hours = bands.map(function (b) {
          var idx = []; dcol.dates.forEach(function (d, i) { if (d && d.h >= b[1] && d.h <= b[2]) idx.push(i); });
          return { label: b[0], count: idx.length, share: pct(idx.length, N), rate: rateOf(idx) };
        });
      }
    }

    // segments: how the outcome and the measures differ across each category
    var segments = cols.filter(function (c) { return c.type === "category" && !c.personal && c !== target && c.distinct >= 2 && c.distinct <= 40; }).map(function (c) {
      var idxBy = {};
      c.vals.forEach(function (v, i) { if (v != null) (idxBy[v] = idxBy[v] || []).push(i); });
      var levels = Object.keys(idxBy).sort(function (a, b) { return idxBy[b].length - idxBy[a].length; });
      var top = levels.slice(0, 8).map(function (v) {
        var idx = idxBy[v], lev = { value: label(v), count: idx.length, share: pct(idx.length, N), rate: rateOf(idx), means: {} };
        measures.forEach(function (m) { var s = 0, k = 0; idx.forEach(function (i) { if (m.nums[i] !== null) { s += m.nums[i]; k++; } }); lev.means[m.name] = k ? sig(s / k) : null; });
        lev.shares = {};  // share of each total (e.g. of all amount, of all handling minutes) sitting in this level
        measures.forEach(function (m) { if (ADDITIVE.test(m.name) && m.stats.min >= 0) lev.shares[m.name] = pct(idx.reduce(function (a, i) { return a + (m.nums[i] || 0); }, 0), m.stats.sum); });
        return lev;
      });
      var rates = top.filter(function (l) { return l.count >= 30 && l.rate !== null; }).map(function (l) { return l.rate; });
      return { column: c.name, levels: top, other_levels: Math.max(0, levels.length - 8), spread: rates.length > 1 ? Math.max.apply(null, rates) - Math.min.apply(null, rates) : 0 };
    }).sort(function (a, b) { return b.spread - a.spread; });

    // two-way view: outcome by period within the strongest segment (e.g. channel by quarter)
    var cross = null;
    if (isPos && period && period.points && segments.length && dcol) {
      var sc = byName[segments[0].column], keysP = period.points.map(function (p) { return p.label; });
      cross = { segment: sc.name, rows: segments[0].levels.slice(0, 4).map(function (l) {
        var g = {};
        dcol.dates.forEach(function (d, i) {
          if (!d || sc.vals[i] == null || label(sc.vals[i]) !== l.value) return;
          var lab = period.unit === "quarter" ? "Q" + (Math.floor((d.m - 1) / 3) + 1) + " " + String(d.y).slice(2) : period.unit === "month" ? MONTHS[d.m - 1] + " " + String(d.y).slice(2) : null;
          if (lab) (g[lab] = g[lab] || []).push(i);
        });
        return { value: l.value, rates: keysP.map(function (k) { return g[k] && g[k].length >= 20 ? rateOf(g[k]) : null; }) };
      }), periods: keysP };
      if (period.unit === "week") cross = null;
    }

    // bands of the main numbers (e.g. small vs large amounts)
    var bandsOut = measures.slice(0, 2).map(function (m) {
      var s = m.nums.map(function (x, i) { return [x, i]; }).filter(function (p) { return p[0] !== null; }).sort(function (a, b) { return a[0] - b[0]; });
      if (s.length < 50) return null;
      var out = [];
      for (var k = 0; k < 5; k++) {
        var part = s.slice(Math.floor(s.length * k / 5), Math.floor(s.length * (k + 1) / 5));
        if (!part.length) continue;
        out.push({ from: sig(part[0][0]), to: sig(part[part.length - 1][0]), count: part.length, rate: rateOf(part.map(function (p) { return p[1]; })) });
      }
      return { column: m.name, bands: out };
    }).filter(Boolean);

    // identifiers that should be unique but repeat (shared phones, devices...)
    var repeats = cols.filter(function (c) { return (c.type === "id" || c.type === "text") && REPEAT_NAME.test(c.name) && c.present > 50; }).map(function (c) {
      var vals = Object.keys(c.counts).filter(function (k) { return c.counts[k] >= 3; });
      if (!vals.length || c.distinct < 0.8 * c.present) return null;
      var idx = []; c.vals.forEach(function (v, i) { if (v != null && c.counts[v] >= 3) idx.push(i); });
      var extra = {};
      cols.forEach(function (o) { if (o.type === "yesno" && o !== target) { var h = 0; idx.forEach(function (i) { if (/^(yes|y|true|t|1)$/i.test(o.vals[i] || "")) h++; }); extra[o.name] = pct(h, idx.length); } });
      return { column: c.name, shared_values: vals.length, rows: idx.length, rate: rateOf(idx), yes_rates: extra };
    }).filter(Boolean);

    // where missing values cluster
    var missingBy = cols.filter(function (c) { return c.missing / Math.max(N, 1) >= 0.02; }).map(function (c) {
      var bestSeg = null;
      segments.forEach(function (s) {
        var sc = byName[s.column], m = {};
        c.vals.forEach(function (v, i) { if (v == null && sc.vals[i] != null) m[sc.vals[i]] = (m[sc.vals[i]] || 0) + 1; });
        Object.keys(m).forEach(function (k) {
          var share = m[k] / c.missing, within = m[k] / sc.counts[k];
          if (share >= 0.6 && (!bestSeg || share > bestSeg.share_of_missing / 100)) bestSeg = { column: s.column, value: label(k), share_of_missing: pct(m[k], c.missing), missing_within: pct(m[k], sc.counts[k]) };
        });
      });
      return { column: c.name, missing_pct: pct(c.missing, N), concentrated_in: bestSeg };
    });

    // a plain-language note per column for the data-check table
    var notes = {};
    missingBy.forEach(function (m) { if (m.missing_pct >= 5) notes[m.column] = "Missing " + m.missing_pct + "%" + (m.concentrated_in ? ", mostly where " + m.concentrated_in.column + " is " + m.concentrated_in.value : ""); });
    repeats.forEach(function (r) { notes[r.column] = r.shared_values + " values repeat across " + r.rows + " rows"; });
    cols.forEach(function (c) { if (c.distinct === 1 && c.present > 1) notes[c.name] = "Same value in every row"; });

    var dupRows = 0, seen = {};
    for (var i = 0; i < N; i++) { var key = R[i].join("\u0001"); if (seen[key]) dupRows++; else seen[key] = 1; }

    return {
      file: { name: opts.name || "your file", rows: N, columns: H.length, missing_cells_pct: pct(cols.reduce(function (a, c) { return a + c.missing; }, 0), N * H.length), duplicate_rows: dupRows },
      columns: cols.map(function (c) {
        var o = { name: c.name, type: c.type, missing_pct: pct(c.missing, N), distinct: c.distinct, personal: !!c.personal, note: notes[c.name] || null };
        if (c.stats) o.stats = { min: sig(c.stats.min), median: sig(c.stats.median), mean: sig(c.stats.mean), p95: sig(c.stats.p95), max: sig(c.stats.max) };
        if (c.range) o.range = { from: new Date(c.range.from).toISOString().slice(0, 10), to: new Date(c.range.to).toISOString().slice(0, 10) };
        if ((c.type === "category" || c.type === "yesno") && !c.personal) o.top = Object.keys(c.counts).sort(function (a, b) { return c.counts[b] - c.counts[a]; }).slice(0, 6).map(function (k) { return { value: label(k), share: pct(c.counts[k], N) }; });
        return o;
      }),
      target: tinfo, main_measure: main ? main.name : null, period: period, cross: cross, segments: segments.slice(0, 5), bands: bandsOut, repeats: repeats, missing_by: missingBy
    };
  }

  /* ---------- what the AI sees: statistics only, trimmed to a safe size ---------- */
  function summaryForAI(p) {
    var s = JSON.parse(JSON.stringify(p));
    s.columns.forEach(function (c) { if (c.personal) { delete c.top; c.note = c.note && c.note.replace(/[^\d\s%a-z,.]/gi, ""); } });
    var text = JSON.stringify(s);
    while (text.length > 18000 && s.segments.length > 2) { s.segments.pop(); text = JSON.stringify(s); }
    while (text.length > 18000 && s.columns.length > 20) { s.columns.pop(); text = JSON.stringify(s); }
    return s;
  }

  /* ---------- the two charts on the page ---------- */
  function charts(p) {
    var out = {}, t = p.target;
    if (p.period && p.period.points && p.period.points.length >= 2) {
      var pts = p.period.points.slice(-8);
      out.trend = t
        ? { title: nice(t.column) + " rate by " + p.period.unit, sub: "Share of rows where " + t.column + " is " + t.positive + ", by " + p.period.column, unit: "%", points: pts.map(function (x) { return { label: x.label, value: x.rate }; }) }
        : { title: "Rows by " + p.period.unit, sub: "Number of rows, by " + p.period.column, unit: "", points: pts.map(function (x) { return { label: x.label, value: x.count }; }) };
    }
    var seg = p.segments.filter(function (s) { return s.levels.length >= 2 && s.levels.length <= 8; })[0] || p.segments[0];
    if (seg) {
      var lv = seg.levels.slice(0, 6);
      out.share = t
        ? { title: nice(t.column) + " rate by " + seg.column.replace(/_/g, " "), sub: "Share of rows where " + t.column + " is " + t.positive + ", for each " + seg.column.replace(/_/g, " "), unit: "%",
            bars: lv.map(function (l) { return { label: l.value, value: l.rate, n: l.count }; }) }
        : { title: "Where the " + (p.main_measure ? p.main_measure.replace(/_/g, " ") : "rows") + " sit", sub: "Share of the total, by " + seg.column.replace(/_/g, " "), unit: "%",
            bars: lv.map(function (l) { return { label: l.value, value: p.main_measure ? l.shares[p.main_measure] : l.share, n: l.count }; }) };
    }
    return out;
  }

  var api = { parseCSV: parseCSV, profile: profile, summaryForAI: summaryForAI, charts: charts };
  if (typeof module === "object" && module.exports) module.exports = api; else root.AkProfile = api;
})(this);
