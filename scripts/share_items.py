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
    return c, games, out_tools


def text(c, item, style_no):
    styles = c["styles"] if item["kind"] == "game" else c["tool_styles"]
    st = styles[style_no % len(styles)]
    return st["name"], st["text"].format(**{k: v for k, v in item.items() if isinstance(v, str)})
