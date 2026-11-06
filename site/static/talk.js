// "Talk to Ajay about this result": the panel at the end of every Workbench tool. It writes a WhatsApp message
// that already holds the visitor's choices and result (they see it, and WhatsApp lets them edit it before sending),
// and can add a private link to the full result. LinkedIn can't take a pre-written message, so we copy it instead.
(function () {
  "use strict";
  var TOPICS = ["A full review", "A project or role with Ajay", "Just a question"];
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function waDigits() { var a = document.querySelector("a[data-wa]"); return a ? a.getAttribute("data-wa").split("|").join("") : ""; }
  function emailAddr() { var a = document.querySelector("a[data-em]"); return a ? a.getAttribute("data-em").split("|").join("@") : ""; }
  function linkedIn() { var a = document.querySelector('a[href*="linkedin.com/in/"]'); return a ? a.href : ""; }
  function track(n) { if (window.akTrack) window.akTrack(n); }

  // opts: tool, toolName, lines() -> [strings], link (fixed URL) or share() -> Promise<URL>, shareNote
  function mount(container, opts) {
    var old = container.querySelector(".ak-talk"); if (old) old.remove();
    var box = el("div", "ak-talk mr-noprint"), topic = "", include = !!opts.share, url = "", making = null;
    var fixed = function () { return typeof opts.link === "function" ? opts.link() : opts.link; };
    box.appendChild(el("span", "mono talk-k", "💬 Talk to Ajay about this result"));
    box.appendChild(el("h3", null, "Want to talk it through?"));
    box.appendChild(el("p", "talk-sub", "Your message to Ajay already includes your result, so the conversation can start from it."));

    box.appendChild(el("p", "talk-q", "What would you like to discuss? (optional)"));
    var chips = el("div", "talk-topics");
    TOPICS.forEach(function (t) {
      var b = el("button", "talk-chip", t); b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        topic = topic === t ? "" : t;
        Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute("aria-pressed", String(c.textContent === topic)); });
        draw();
      });
      chips.appendChild(b);
    });
    box.appendChild(chips);

    if (opts.share) {
      var lab = el("label", "talk-inc"), cb = el("input"); cb.type = "checkbox"; cb.checked = true;
      var txt = el("span"); txt.appendChild(el("b", null, "Include my full result"));
      txt.appendChild(el("small", null, opts.shareNote || "A private link Ajay can open to see exactly what you saw. Deleted after 30 days. No files, names or contact details."));
      lab.appendChild(cb); lab.appendChild(txt); box.appendChild(lab);
      cb.addEventListener("change", function () { include = cb.checked; draw(); });
    } else if (opts.link) {
      box.appendChild(el("p", "talk-sub", opts.linkNote || "The link in your message reopens your exact result. Nothing is stored."));
    }

    var prev = el("details", "talk-prev"), pre = el("pre"); prev.open = true;
    prev.appendChild(el("summary", null, "Your message")); prev.appendChild(pre); box.appendChild(prev);

    var row = el("div", "an-actions"), digits = waDigits(), li = linkedIn();
    var wa = el("button", "btn small", "Send on WhatsApp"); wa.type = "button";
    var cp = el("button", "btn small ghost", "Copy for LinkedIn"); cp.type = "button";
    var em = emailAddr(), mb = el("button", "btn small ghost", "Send by email"); mb.type = "button";
    if (digits) row.appendChild(wa);
    if (em) row.appendChild(mb);
    row.appendChild(cp);
    box.appendChild(row);
    var note = el("p", "talk-note"); note.setAttribute("aria-live", "polite"); box.appendChild(note);

    function text(withUrl) {
      var t = ["Hi Ajay, I used " + opts.toolName + " on your website."].concat(opts.lines());
      if (topic) t.push("I'd like to discuss: " + topic);
      if (opts.link) t.push("Full result: " + fixed());
      else if (include) t.push("Full result: " + (withUrl && url ? url : "(a private link is added when you send)"));
      return t.join("\n");
    }
    function draw() { pre.textContent = text(!!url); }
    function ready() {
      if (!include || !opts.share || url) return Promise.resolve();
      if (!making) making = opts.share().then(function (u) { url = u; }).catch(function (e) { making = null; include = false; note.textContent = (e && e.message) || "The private link couldn't be made, so your message goes without it."; });
      return making;
    }
    wa.addEventListener("click", function () {
      var w = window.open("", "_blank");  // opened now, so pop-up blockers allow it; filled once the link is ready
      wa.disabled = true; wa.textContent = "Preparing…";
      ready().then(function () {
        draw();
        var href = "https://wa.me/" + digits + "?text=" + encodeURIComponent(text(true));
        if (w) w.location.href = href; else window.location.href = href;
        wa.disabled = false; wa.textContent = "Send on WhatsApp";
        if (!note.textContent) note.textContent = "WhatsApp is open with your message. Check it, then press send.";
        track("tool-talk-" + opts.tool + "-whatsapp");
      });
    });
    mb.addEventListener("click", function () {
      mb.disabled = true; mb.textContent = "Preparing…";
      ready().then(function () {
        draw();
        window.location.href = "mailto:" + em + "?subject=" + encodeURIComponent("About my " + opts.toolName.replace(/^the /, "") + " result") + "&body=" + encodeURIComponent(text(true));
        mb.disabled = false; mb.textContent = "Send by email";
        if (!note.textContent) note.textContent = "Your email app should open with the message ready. Check it, then send.";
        track("tool-talk-" + opts.tool + "-email");
      });
    });
    cp.addEventListener("click", function () {
      var w = li ? window.open("", "_blank") : null;
      cp.disabled = true;
      ready().then(function () {
        draw();
        var t = text(true), done = function () {
          note.textContent = "Copied. Paste it into a LinkedIn message to Ajay" + (li ? " (his profile is open in a new tab)." : ".");
          if (w) w.location.href = li;
          cp.disabled = false; track("tool-talk-" + opts.tool + "-linkedin");
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fallback(t); done(); });
        else { fallback(t); done(); }
      });
    });
    function fallback(t) { var ta = el("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) { /* ignore */ } ta.remove(); }

    draw();
    box.akRefresh = draw;  // a tool whose result changes live (the calculator) calls this to update the message
    container.appendChild(box);
    return box;
  }

  // Create a private link for a signed result (Analyst on Call, Model Risk Check)
  function share(api, tool, payload, sig) {
    return fetch(api.replace(/\/$/, "") + "/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: tool, payload: payload, sig: sig }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.id) throw new Error(j.message || "The private link couldn't be made, so your message goes without it."); return j; }); })
      .then(function (j) { return new URL("result.html?id=" + j.id, document.baseURI).href; });
  }

  window.AkTalk = { mount: mount, share: share };
})();
