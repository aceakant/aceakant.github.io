// Takes the link-preview picture for each game's share link: the real game screen, plus a "Play free" button.
//   python3 -m http.server 8765 -d _site &   node scripts/game_shots.js
const { chromium } = require("playwright");
const fs = require("fs"), yaml = require("path");
const games = fs.readFileSync("content/game-posts.yaml", "utf8").split("\n").filter(l => /^  - id: /.test(l)).map(l => l.split(": ")[1].trim());
const labs = fs.readFileSync("content/game-posts.yaml", "utf8").split("\n").filter(l => /^    lab: /.test(l)).map(l => l.split(": ")[1].trim());
(async () => {
  const b = await chromium.launch();
  for (let i = 0; i < games.length; i++) {
    const p = await b.newPage({ viewport: { width: 1500, height: 788 }, deviceScaleFactor: 0.8, colorScheme: "dark" });
    await p.goto(`http://localhost:8765/${labs[i]}.html#${games[i]}`, { waitUntil: "networkidle" });
    await p.addStyleTag({ content: "*{transition:none!important;animation:none!important}" });
    await p.evaluate((id) => {
      document.querySelectorAll("body *").forEach(e => { if (getComputedStyle(e).position === "fixed" && !e.closest("header")) e.style.display = "none"; });
      const st = document.querySelector(`.game-stage[data-game="${id}"]`) || document;
      const copy = st.querySelector(".play-copy"), game = st.querySelector(".game");
      const a = document.createElement("div");
      a.innerHTML = '<span class="btn" style="margin-top:22px;pointer-events:none">Play free →</span><span style="display:block;margin-top:10px;font-size:14px;opacity:.7">Free · no sign-up · aceakant.github.io</span>';
      copy.appendChild(a);
      const h = document.querySelector("header"), hh = h ? h.getBoundingClientRect().height : 0;
      window.scrollTo(0, Math.min(copy.getBoundingClientRect().top, game.getBoundingClientRect().top) + scrollY - hh - 22);
    }, games[i]);
    await p.waitForTimeout(600);
    await p.screenshot({ path: `site/static/og/game-${games[i]}.jpg`, type: "jpeg", quality: 88 });
    await p.close();
    console.log("shot", games[i]);
  }
  await b.close();
})();
