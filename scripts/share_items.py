"""The games and Workbench tools that can be posted on LinkedIn, with their text fields, link and picture.
Listed ones come from content/game-posts.yaml; a game added to labs.yaml or a tool that goes live in tools.yaml
without an entry there is still included, with text made from its own hook and blurb."""
import datetime
import pathlib

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
OG = ROOT / "site" / "static" / "og"


def _live(t, now):
    if t.get("status") == "preview" or not t.get("url"):
        return False
    when = t.get("launch")
    if when:
        try:
            return now >= datetime.datetime.fromisoformat(str(when))
        except ValueError:
            return False
    return True


def load(now=None):
    now = now or datetime.datetime.now(datetime.timezone.utc)
    c = yaml.safe_load((ROOT / "content" / "game-posts.yaml").read_text())
    labs = yaml.safe_load((ROOT / "content" / "labs.yaml").read_text())["labs"]
    tools = yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())["tools"]
    base = yaml.safe_load((ROOT / "config.yaml").read_text())["site"]["base_url"].rstrip("/")

    games, listed = [], {g["id"]: g for g in c.get("games", [])}
    for g in c.get("games", []):
        games.append(dict(g, kind="game"))
    for lab in labs:
        for g in lab["games"]:
            if g["id"] not in listed:  # a new game nobody wrote post text for yet
                games.append(dict(kind="game", id=g["id"], lab=lab["slug"], title=g["name"], description=g["hook"], hook=g["hook"],
                                  teaser=g["hook"], more="play the full game", blurb=g["hook"], lesson=lab["teaches"], time="quick",
                                  hashtags=["Analytics", "RiskManagement"], new=True))
    for g in games:
        g["url"] = f"{base}/play/{g['id']}.html"
        pic = OG / f"game-{g['id']}.jpg"
        g["picture"] = pic if pic.exists() else OG / f"lab-{g['lab']}.jpg"

    out_tools, tlisted = [], {t["id"]: t for t in c.get("tools", [])}
    for t in tools:
        if not _live(t, now):
            continue
        extra = tlisted.get(t["id"]) or dict(hook=t["blurb"], question=f"What does {t['name']} show for your numbers?", lesson=t["blurb"],
                                             short=t["blurb"][0].lower() + t["blurb"][1:], hashtags=["RiskAnalytics", "Analytics"], new=True)
        out_tools.append(dict(extra, kind="tool", id=t["id"], name=t["name"], title=t["name"], description=t["blurb"], blurb=t["blurb"],
                              url=f"{base}/{t['url']}", picture=OG / f"tool-{t['id']}.jpg"))
    lab_names = {lab["slug"]: lab["name"] for lab in labs}
    for g in games:
        g["lab_name"] = lab_names.get(g["lab"], "Playground")
    return c, games, out_tools


def articles(c, now=None):
    """Published VertexNode articles, each with its first LinkedIn post date (release) for the rest-day rule."""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    base = yaml.safe_load((ROOT / "config.yaml").read_text())["site"]["base_url"].rstrip("/")
    out = []
    for path in sorted((ROOT / "content" / "articles").glob("*.md")):
        _, front, _ = path.read_text(encoding="utf-8").split("---", 2)
        m = yaml.safe_load(front)
        if m.get("status") != "published" or m.get("test_run"):
            continue
        rel = m.get("linkedin_release")
        release = datetime.datetime.fromisoformat(str(rel)) if rel else datetime.datetime.fromisoformat(str(m["date"]) + "T13:30:00+05:30")
        star, hook = m.get("star") or {}, m.get("hook") or {}
        market = m.get("market") or ""
        out.append(dict(kind="article", id="article-" + m["slug"], slug=m["slug"], title=m["title"], description=m.get("summary", ""), summary=m.get("summary", ""),
                        question=hook.get("question") or m["title"], situation=star.get("situation", ""), action=star.get("action", ""), result=star.get("result", ""),
                        category=(m.get("category") or "").lower(), market_label=("" if market in ("", "Global") else market + " ") , release=release,
                        url=f"{base}/articles/{m['slug']}.html", picture=ROOT / "content" / m["image"],
                        hashtags=[t for t in (["FraudPrevention"] if "Fraud" in (m.get("category") or "") else ["CreditRisk"] if "Credit" in (m.get("category") or "") else ["DataAnalytics"])] + ["RiskManagement", "Banking"]))
    return out


def text(c, item, style_no):
    styles = {"game": c["styles"], "tool": c["tool_styles"], "article": c["article_styles"]}[item["kind"]]
    st = styles[style_no % len(styles)]
    fields = {k: v for k, v in item.items() if isinstance(v, str)}
    label = (c.get("labels") or {}).get(item["kind"], "").format(**fields)
    body = st["text"].format(**fields)
    return st["name"], (label + "\n\n" + body) if label else body
