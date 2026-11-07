// "Draft a note for the CRO": an AI layer for the Workbench tools that run in the browser. One AI drafts a short
// briefing note from the tool's own numbers; a second checks every number and statement. Only the tool's settings
// and results are sent, never personal data. Everything the AI writes is shown as plain text.
(function () {
  "use strict";
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function api() { var m = document.querySelector('meta[name="ak-api"]'); return m ? m.content.replace(/\/$/, "") : ""; }
  function track(n) { if (window.akTrack) window.akTrack(n); }

  // opts: tool ("cutoff" | "fraud-roi" | "early-warning"), facts() -> flat object of numbers and short labels
  function mount(container, opts) {
    var url = api();
    if (!url) return null;
    var box = el("div", "ainote");
    box.appendChild(el("span", "mono ainote-k", "AI · maker-checker"));
    box.appendChild(el("h3", null, "Turn this result into a note for your Chief Risk Officer"));
    box.appendChild(el("p", "ainote-sub", "One AI drafts a short briefing from the numbers above; a second checks every figure and removes anything the numbers don't support. Only the settings and results are sent."));
    var go = el("button", "btn small", "Draft the note"); go.type = "button";
    var left = el("span", "mono ainote-left");
    var row = el("div", "ainote-row"); row.appendChild(go); row.appendChild(left); box.appendChild(row);
    var out = el("div", "ainote-out"); out.hidden = true; box.appendChild(out);
    container.appendChild(box);

    fetch(url + "/status?tool=note").then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.remaining != null) left.textContent = j.remaining > 0 ? j.remaining + " of " + j.free + " free notes left" : "Free notes used";
    }).catch(function () {});

    function stage(i, text) {
      out.hidden = false; out.innerHTML = "";
      var ol = el("ol", "an-stages");
      [["Maker AI", "Drafts the note"], ["Checker AI", "Checks every number"], ["Final note", "Ready to copy"]].forEach(function (s, k) {
        var li = el("li", "an-stage" + (k < i ? " done" : k === i ? " now" : "")); li.appendChild(el("b", null, s[0])); li.appendChild(el("span", null, s[1])); ol.appendChild(li);
      });
      out.appendChild(ol); if (text) out.appendChild(el("p", "an-wait", text));
    }
    function asText(n) {
      return [n.title, "", "What we see: " + n.what_we_see, "What it means: " + n.what_it_means, "",
        "Recommended actions:"].concat(n.actions.map(function (a) { return "- " + a; }), ["", "Check before acting:"],
        n.checks.map(function (c) { return "- " + c; }), ["", "Caveat: " + n.caveat]).join("\n");
    }
    function render(d) {
      var n = d.note; out.innerHTML = "";
      var memo = el("div", "ainote-memo");
      memo.appendChild(el("h4", null, n.title));
      var p1 = el("p"); p1.appendChild(el("b", null, "What we see. ")); p1.appendChild(document.createTextNode(n.what_we_see)); memo.appendChild(p1);
      var p2 = el("p"); p2.appendChild(el("b", null, "What it means. ")); p2.appendChild(document.createTextNode(n.what_it_means)); memo.appendChild(p2);
      memo.appendChild(el("p", "ainote-h", "Recommended actions"));
      var ul = el("ul"); n.actions.forEach(function (a) { ul.appendChild(el("li", null, a)); }); memo.appendChild(ul);
      memo.appendChild(el("p", "ainote-h", "Check before acting"));
      var ul2 = el("ul"); n.checks.forEach(function (c) { ul2.appendChild(el("li", null, c)); }); memo.appendChild(ul2);
      memo.appendChild(el("p", "ainote-cav", "Caveat: " + n.caveat));
      out.appendChild(memo);
      var v = { confirmed: 0, corrected: 0, removed: 0 }; (d.reviews || []).forEach(function (r) { if (r.verdict in v) v[r.verdict]++; });
      var chips = el("div", "ainote-chips");
      chips.appendChild(el("span", "mr-pill ready", d.numbers_checked + " numbers checked"));
      chips.appendChild(el("span", "mr-pill ready", v.confirmed + " confirmed"));
      if (v.corrected) chips.appendChild(el("span", "mr-pill partly", v.corrected + " corrected"));
      if (v.removed) chips.appendChild(el("span", "mr-pill gap", v.removed + " removed"));
      out.appendChild(chips);
      (d.reviews || []).filter(function (r) { return r.verdict !== "confirmed"; }).forEach(function (r) {
        var line = el("p", "ainote-fix"); line.appendChild(el("b", null, (r.verdict === "removed" ? "Removed" : "Corrected") + " (" + String(r.part).replace(/_/g, " ") + "): ")); line.appendChild(document.createTextNode(r.note)); out.appendChild(line);
      });
      var cp = el("button", "btn small ghost", "Copy the note"); cp.type = "button";
      var msg = el("span", "mono ainote-left");
      cp.addEventListener("click", function () {
        var t = asText(n);
        try { navigator.clipboard.writeText(t).then(function () { msg.textContent = "Copied"; }, function () { msg.textContent = "Select the note and copy it"; }); } catch (e) { msg.textContent = "Select the note and copy it"; }
      });
      var r2 = el("div", "ainote-row"); r2.appendChild(cp); r2.appendChild(msg); out.appendChild(r2);
    }

    go.addEventListener("click", function () {
      go.disabled = true; go.textContent = "Drafting…";
      stage(0, "The maker is drafting the note. About 20 to 40 seconds.");
      var t = setTimeout(function () { stage(1, "The checker is checking every number against your result."); }, 14000);
      fetch(url + "/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: opts.tool, facts: opts.facts() }) })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (d) {
          clearTimeout(t); go.disabled = false; go.textContent = "Draft it again";
          if (d && d.note) { render(d); if (d.remaining != null) left.textContent = d.remaining > 0 ? d.remaining + " of " + d.free + " free notes left" : "Free notes used"; track("tool-ainote-" + opts.tool); }
          else { out.hidden = false; out.innerHTML = ""; out.appendChild(el("p", "an-msg err", (d && d.message) || "That didn't finish. Please try again in a minute.")); if (d && d.error === "visitor_limit") { go.disabled = true; go.textContent = "Free notes used"; } }
        })
        .catch(function () { clearTimeout(t); go.disabled = false; go.textContent = "Draft the note"; out.hidden = false; out.innerHTML = ""; out.appendChild(el("p", "an-msg err", "Couldn't reach the AI service. Check your connection and try again.")); });
    });
    return box;
  }
  window.AkNote = { mount: mount };
})();
