"""Builds the static website into _site/.

Published articles  -> listed on the site under articles/
Drafts and held ones -> unlisted preview pages under drafts/ (for the 48-hour review)
Run:  python site/build.py
"""
import datetime
import json
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


def pulse_view(config, labs, published):
    """Numbers for the Pulse page, from content/pulse.json (written each morning by scripts/pulse_fetch.py)."""
    pcfg = config.get("pulse") or {}
    path = ROOT / "content" / "pulse.json"
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
    v = dict(on=bool((config.get("analytics") or {}).get("goatcounter")), ready=False,
             min_visitors=pcfg.get("min_visitors", 200),
             since=nice_date(data["since"]) if data else None)
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
    common = dict(site=config["site"], profile=profile, leadership=leadership, labs=labs, analytics=config.get("analytics") or {},
                  year=datetime.date.today().year, upcoming=upcoming, asset_v=asset_v)

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
    }
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

    # old addresses keep working
    for old, new in (("profile.html", "portfolio.html"), ("leadership.html", "portfolio.html"), ("lab.html", "fraud-lab.html")):
        (OUT / old).write_text(f'<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url={new}">'
                               f'<link rel="canonical" href="{new}"><a href="{new}">Continue</a>')

    (OUT / "robots.txt").write_text("User-agent: *\nDisallow: /insights/drafts/\nDisallow: /drafts/\n")
    (OUT / ".nojekyll").write_text("")
    print(f"Built {len(published)} published and {len(drafts)} draft article(s) into {OUT}")


if __name__ == "__main__":
    build()
