"""Builds the static website into _site/.

Published articles  -> listed on the site under articles/
Drafts and held ones -> unlisted preview pages under drafts/ (for the 48-hour review)
Run:  python site/build.py
"""
import datetime
import json
import subprocess
import math
import os
import pathlib
import re
import shutil

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"


def read_article(path):
    _, front, body = path.read_text(encoding="utf-8").split("---", 2)
    a = yaml.safe_load(front)
    a["body_html"] = markdown.markdown(body, extensions=["tables", "sane_lists"])
    a["date"] = str(a["date"])
    a["date_label"] = datetime.date.fromisoformat(a["date"]).strftime("%d %b %Y")
    words = len(re.findall(r"\w+", body))
    a["read_min"] = max(2, math.ceil(words / 220))
    a["status"] = a.get("status", "published")
    if a.get("publish_at"):
        ist = datetime.datetime.fromisoformat(str(a["publish_at"]).replace("Z", "+00:00")).astimezone(
            datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
        a["publish_label"] = ist.strftime("%a %d %b, %I:%M %p IST")
    folder = "articles" if a["status"] == "published" else "drafts"
    a["url"] = f"{folder}/{a['slug']}.html"
    return a


IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


def nice_date(iso):
    d = datetime.date.fromisoformat(str(iso)[:10])
    return f"{d.day} {d.strftime('%b %Y')}"


ROI_SLIDERS = [  # Fraud ROI Calculator: each slider moves through these values (default must be in the list)
    dict(id="payments", label="Payments a month", kind="count", default=2000000,
         values=[10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2000000, 5000000, 10000000, 25000000, 50000000, 100000000]),
    dict(id="fraud", label="Share that are fraud", kind="pct", default=0.08, values=[0.01, 0.02, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3, 0.5, 0.75, 1]),
    dict(id="loss", label="Average loss per fraud", kind="money", default=420, values=[25, 50, 75, 100, 150, 200, 300, 420, 500, 750, 1000, 1500, 2500, 5000]),
    dict(id="catch", label="Fraud the model catches", kind="pct", default=72, values=list(range(5, 100))),
    dict(id="alarms", label="False alarms per 10,000 genuine payments", kind="x", default=50, values=[1, 2, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300]),
    dict(id="review", label="Cost to review one alert", kind="money", default=4.5, values=[0.5, 1, 2, 3, 4.5, 6, 8, 10, 15, 20, 30]),
    dict(id="cost", label="Model build and run, a year", kind="money", default=350000,
         values=[0, 25000, 50000, 100000, 150000, 250000, 350000, 500000, 750000, 1000000, 2000000, 5000000]),
]


def model_risk_view(config):
    """Model Risk Check: the questions, markets and samples come from the shared core file (also used by the live
    service), read here so the page renders them without waiting for any script."""
    src = (ROOT / "site" / "static" / "modelrisk" / "mr-core.js").read_text()
    js = subprocess.run(["node", "--input-type=module", "-e",
                         "const m = await import(process.argv[1]); console.log(JSON.stringify({markets: m.MARKETS, questions: m.QUESTIONS, samples: m.SAMPLES, as_of: m.RULES_AS_OF}))",
                         str(ROOT / "site" / "static" / "modelrisk" / "mr-core.js")], capture_output=True, text=True, check=True).stdout
    data = json.loads(js)
    an = config.get("analyst") or {}
    return dict(data, worker_url=an.get("worker_url") or "", free=an.get("free_per_visitor", 5))


def accountability_view(config, published, data):
    """How the site's AI is held to account: fact-checks behind each published article, and the
    Analyst on Call checker's verdicts (prepared samples + live reviews), plus tool use."""
    rows, claims, corrected, removed, sources = [], 0, 0, 0, 0
    for a in sorted(published, key=lambda x: x["week_no"]):
        rep = ROOT / "content" / "media" / a["slug"] / "factcheck-report.json"
        checks = json.loads(rep.read_text()).get("checks", []) if rep.exists() else []
        c = sum(1 for x in checks if x.get("status") == "corrected")
        r = sum(1 for x in checks if x.get("status") == "removed")
        n = len(a.get("sources") or [])
        rows.append(dict(a=a, claims=len(checks), corrected=c, removed=r, sources=n))
        claims += len(checks); corrected += c; removed += r; sources += n
    verified = max(0, claims - corrected - removed)
    verdicts = {"confirmed": 0, "corrected": 0, "removed": 0, "added": 0}
    for f in sorted((ROOT / "site" / "static" / "analyst" / "samples").glob("*.review.json")):
        for rv in json.loads(f.read_text()).get("reviews", []):
            if rv.get("verdict") in verdicts:
                verdicts[rv["verdict"]] += 1
    live = (data or {}).get("analyst_live") or {}
    mr, nt = live.get("model_risk") or {}, live.get("notes") or {}
    for k in verdicts:
        verdicts[k] += int((live.get("verdicts") or {}).get(k, 0)) + int((mr.get("verdicts") or {}).get(k, 0)) + int((nt.get("verdicts") or {}).get(k, 0))
    checked = sum(verdicts.values())
    tools = (data or {}).get("tools") or {}
    an = config.get("analyst") or {}
    return dict(
        fc=dict(articles=len(rows), claims=claims, verified=verified, corrected=corrected, removed=removed, sources=sources, rows=rows,
                pct_verified=round(verified / claims * 100) if claims else 0, pct_corrected=round(corrected / claims * 100) if claims else 0),
        mc=dict(checked=checked, verdicts=[dict(name=k, count=v, pct=round(v / checked * 100) if checked else 0) for k, v in verdicts.items()],
                live_reviews=int(live.get("reviews", 0)), live_avg=round(live["seconds"] / live["reviews"]) if live.get("reviews") else None,
                samples_opened=sum((tools.get("samples") or {}).values()), uploads=int(tools.get("uploads", 0)), model_checks=int(mr.get("checks", 0)), notes=int(nt.get("notes", 0)), note_numbers=int(nt.get("numbers", 0)), talks=int(tools.get("talks", 0)),
                free=an.get("free_per_visitor", 5), cap=an.get("daily_cap", 20), live_on=bool(an.get("worker_url"))))


def pulse_view(config, labs, published):
    """Numbers for the Pulse page, from content/pulse.json (written each morning by scripts/pulse_fetch.py)."""
    pcfg = config.get("pulse") or {}
    path = ROOT / "content" / "pulse.json"
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
    v = dict(on=bool((config.get("analytics") or {}).get("goatcounter")), ready=False,
             min_visitors=pcfg.get("min_visitors", 200),
             since=nice_date(data["since"]) if data else None,
             acc=accountability_view(config, published, data),
             games_played=int(data.get("players", 0)) if data else 0)
    if not data or data.get("visitors", 0) < v["min_visitors"]:
        return v
    updated = datetime.datetime.fromisoformat(data["updated"].replace("Z", "+00:00")).astimezone(IST)
    top = max([w["players"] for w in data["weekly"]] + [1])
    weekly = [dict(w, label=nice_date(w["week"])[:-5], h=round(w["players"] / top * 110, 1)) for w in data["weekly"]]
    total_src = sum(s["count"] for s in data["sources"]) or 1
    sources = [dict(s, pct=round(s["count"] / total_src * 100)) for s in data["sources"]]
    rows = []
    for lab in labs["labs"]:
        stats = [(g, data["games"].get(g["id"], {})) for g in lab["games"]]
        players = sum(s.get("players", 0) for _, s in stats)
        finished = sum(s.get("finished", 0) for _, s in stats)
        scored = sum(s.get("scored", 0) for _, s in stats)
        avg = (sum((s.get("avg_score") or 0) * s.get("scored", 0) for _, s in stats) / scored) if scored else None
        best = max(stats, key=lambda gs: gs[1].get("players", 0))
        rows.append(dict(lab=lab, players=players, finish=round(min(finished, players) / players * 100) if players else None,
                         avg=round(avg) if avg is not None else None,
                         most=best[0]["name"] if best[1].get("players") else lab["games"][0]["name"]))
    rows.sort(key=lambda r: -r["players"])
    titles = {a["slug"]: a for a in published}
    reads = [r for r in data["articles"] if r["slug"] in titles][:5]
    most = max([r["reads"] for r in reads] + [1])
    articles = [dict(r, a=titles[r["slug"]], pct=round(r["reads"] / most * 100)) for r in reads]
    v.update(ready=True, d=data, weekly=weekly, sources=sources, rows=rows, articles=articles,
             updated=updated.strftime("%d %b %Y, %I:%M %p IST"))
    return v


def build():
    config = yaml.safe_load((ROOT / "config.yaml").read_text())
    profile = yaml.safe_load((ROOT / "content" / "profile.yaml").read_text())
    game = yaml.safe_load((ROOT / "content" / "game.yaml").read_text())
    leadership = yaml.safe_load((ROOT / "content" / "leadership.yaml").read_text())
    labs = yaml.safe_load((ROOT / "content" / "labs.yaml").read_text())
    topics = yaml.safe_load((ROOT / "content" / "topics.yaml").read_text())["topics"]
    upcoming = next((t["title"] for t in topics if t.get("status") == "pending"), None)

    all_articles = [read_article(p) for p in sorted((ROOT / "content" / "articles").glob("*.md"))]
    published = sorted([a for a in all_articles if a["status"] == "published"], key=lambda a: a["date"])
    for i, a in enumerate(published, 1):
        a["week_no"] = i
    published.reverse()
    drafts = [a for a in all_articles if a["status"] != "published"]
    categories = sorted({a.get("category") for a in published if a.get("category")})

    if OUT.exists():
        shutil.rmtree(OUT)
    for d in ("articles", "drafts", "cases"):
        (OUT / d).mkdir(parents=True)
    shutil.copytree(ROOT / "site" / "static", OUT / "static")
    media = ROOT / "content" / "media"
    if media.exists():
        shutil.copytree(media, OUT / "media", ignore=shutil.ignore_patterns("*.txt", "*.json"))

    env = Environment(loader=FileSystemLoader(ROOT / "site" / "templates"), autoescape=True)
    env.filters["num"] = lambda n: f"{int(n):,}"
    # new version tag on every build, so browsers fetch fresh styles and scripts
    asset_v = (os.environ.get("GITHUB_SHA") or datetime.datetime.now().strftime("%Y%m%d%H%M%S"))[:10]
    # A tool shows on the Workbench once it is launched: status "preview" = built and waiting for approval
    # (its page exists at its URL but isn't listed); launch: "2026-11-15T09:00:00+05:30" = listed from then on.
    ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    def launched(t):
        if t.get("status") == "preview":
            return False
        when = t.get("launch")
        if not when:
            return True
        when = when if isinstance(when, datetime.datetime) else datetime.datetime.fromisoformat(str(when))
        return (when if when.tzinfo else when.replace(tzinfo=ist)) <= datetime.datetime.now(ist)
    tools = [t for t in yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())["tools"] if launched(t)]
    # Workbench roadmap: the next two tools not yet live appear as "Coming <date>" cards
    live_ids = {t["id"] for t in tools}
    roadmap = yaml.safe_load((ROOT / "content" / "tool-roadmap.yaml").read_text())["tools"] if (ROOT / "content" / "tool-roadmap.yaml").exists() else []
    today_d = datetime.date.today()
    for r in [r for r in roadmap if r["id"] not in live_ids][:2]:
        d = r["date"] if isinstance(r["date"], datetime.date) else datetime.date.fromisoformat(str(r["date"]))
        tools.append(dict(r, status="next", style="ai" if r.get("ai") else "lite",
                          due=f"Coming {d.day} {d.strftime('%b')}" if d >= today_d else "Coming soon"))
    game_map = {g["id"]: dict(name=g["name"], lab=l["name"], url=f"{l['slug']}.html#{g['id']}", color=l.get("color", ""))
                for l in labs["labs"] for g in l["games"]}
    common = dict(site=config["site"], profile=profile, leadership=leadership, labs=labs, analytics=config.get("analytics") or {},
                  year=datetime.date.today().year, upcoming=upcoming, asset_v=asset_v, tools=tools, game_map=game_map,
                  api_url=((config.get("analyst") or {}).get("worker_url") or "").rstrip("/"))

    show_drafts = os.environ.get("PREVIEW_DRAFTS") == "1"
    for c in leadership["companies"]:
        for p in c["projects"]:
            p["published"] = bool(p.get("detail")) and (p.get("status") == "live" or show_drafts)

    pages = {
        "index.html": dict(latest=published[0] if published else None, game=game, week_count=len(published)),
        "portfolio.html": {},
        **{f"{l['slug']}.html": dict(lab=l, game=game, template="lab.html") for l in labs["labs"]},
        "updates.html": dict(articles=published, categories=categories, week_count=len(published)),
        "pulse.html": dict(pulse=pulse_view(config, labs, published)),
        "analyst.html": dict(analyst=config.get("analyst") or {},
                             samples=json.loads((ROOT / "site" / "static" / "analyst" / "samples" / "samples.json").read_text())),
        "model-risk.html": dict(mr=model_risk_view(config)),
        "workbench.html": {},
        "cut-off-studio.html": {},
        "portfolio-monte-carlo.html": {},
        "result.html": {},
        "fraud-roi.html": dict(roi=dict(sliders=ROI_SLIDERS, article=next(
            (dict(url=a["url"], short="fraud model ROI") for a in published if "fraud-model-roi" in a["slug"]), None))),
    }
    # link-preview pictures (made by scripts/make_og.py): which picture each page shows when shared
    og = {"workbench.html": "workbench", "updates.html": "updates", "pulse.html": "pulse"}
    og.update({t["url"]: "tool-" + t["id"] for t in yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())["tools"] if t.get("url")})
    og.update({f"{l['slug']}.html": "lab-" + l["slug"] for l in labs["labs"]})
    common["og_map"] = {k: f"static/og/{v}.jpg" for k, v in og.items() if (ROOT / "site" / "static" / "og" / f"{v}.jpg").exists()}
    for name, ctx in pages.items():
        html = env.get_template(ctx.pop("template", name)).render(root="", page=name, **common, **ctx)
        (OUT / name).write_text(html, encoding="utf-8")

    for a in published + drafts:
        others = [o for o in published if o["slug"] != a["slug"]][:2]
        html = env.get_template("article.html").render(root="../", page="article", a=a, read_next=others, **common)
        (OUT / a["url"]).write_text(html, encoding="utf-8")

    # leadership case pages: only cases marked "live" are published.
    # Set PREVIEW_DRAFTS=1 to also build draft cases for a private preview.
    show_drafts = os.environ.get("PREVIEW_DRAFTS") == "1"
    for c in leadership["companies"]:
        for p in c["projects"]:
            p["published"] = bool(p.get("detail")) and (p.get("status") == "live" or show_drafts)
            if not p["published"]:
                continue
            st = p["detail"]["stakeholders"]
            nodes = []
            for i, s in enumerate(st):
                ang = -math.pi / 2 + 2 * math.pi * i / len(st)
                nodes.append(dict(s, x=round(50 + 40 * math.cos(ang), 2), y=round(50 + 40 * math.sin(ang), 2)))
            html = env.get_template("case.html").render(root="../", page="case", c=c, p=p, nodes=nodes, **common)
            (OUT / "cases" / f"{p['slug']}.html").write_text(html, encoding="utf-8")

    # one-game share links for LinkedIn posts: their own preview picture and headline, then straight into the game
    base = config["site"]["base_url"].rstrip("/")
    from html import escape as _esc
    for g in yaml.safe_load((ROOT / "content" / "game-posts.yaml").read_text())["games"]:
        slug, lab, title, desc = g["id"], g["lab"], _esc(g["title"]), _esc(g["description"])
        target = f"/{lab}.html#{slug}"
        (OUT / "play").mkdir(exist_ok=True)
        (OUT / "play" / f"{slug}.html").write_text(
            f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{title}</title><meta name="description" content="{desc}">'
            f'<meta property="og:type" content="website"><meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">'
            f'<meta property="og:url" content="{base}/play/{slug}.html"><meta property="og:image" content="{base}/static/og/game-{slug}.jpg">'
            f'<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">'
            f'<script>location.replace("{target}")</script></head>'
            f'<body style="background:#09121e;color:#f0f6f9;font-family:system-ui;padding:40px"><a style="color:#3ccfc4" href="{target}">Play the game →</a></body></html>',
            encoding="utf-8")

    # old addresses keep working
    for old, new in (("profile.html", "portfolio.html"), ("leadership.html", "portfolio.html"), ("lab.html", "fraud-lab.html")):
        (OUT / old).write_text(f'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url={new}">'
                               f'<link rel="canonical" href="{new}"><a href="{new}">Continue</a>')

    # The site moved from aceakant.github.io/insights/ to aceakant.github.io/ (10 Nov 2026). Every old address,
    # including links already posted on LinkedIn and shared results (?id=…), forwards to the same page at the new one.
    for page in sorted(OUT.rglob("*.html")):
        rel = page.relative_to(OUT).as_posix()
        if rel.startswith("insights/"):
            continue
        stub = OUT / "insights" / rel
        stub.parent.mkdir(parents=True, exist_ok=True)
        target = "/" + ("" if rel == "index.html" else rel)
        stub.write_text('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex">'
                        f'<link rel="canonical" href="https://aceakant.github.io{target}"><title>Moved</title>'
                        f'<script>location.replace("{target}" + location.search + location.hash)</script>'
                        f'<meta http-equiv="refresh" content="0; url={target}"><a href="{target}">This page has moved</a>', encoding="utf-8")

    # the downloadable bio was shared as a file link too
    bio = OUT / "static" / "bio" / "Ajay-Kant-bio.pdf"
    if bio.exists():
        (OUT / "insights" / "static" / "bio").mkdir(parents=True, exist_ok=True)
        shutil.copy2(bio, OUT / "insights" / "static" / "bio" / bio.name)
    (OUT / "robots.txt").write_text("User-agent: *\nDisallow: /insights/\nDisallow: /drafts/\n")
    (OUT / ".nojekyll").write_text("")
    print(f"Built {len(published)} published and {len(drafts)} draft article(s) into {OUT}")


if __name__ == "__main__":
    build()
