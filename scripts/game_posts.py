"""Posts one Playground game on Ajay's LinkedIn every 3rd day for 90 days (content/game-posts.yaml).
Run by the hourly publish job: posts the slot that has come due (at most one per run) and records it in
content/game-posts-log.txt so nothing posts twice. A slot missed by more than a day is skipped, not posted late.
    python3 scripts/game_posts.py --plan     # print the full schedule with each post's text (posts nothing)
"""
import datetime
import os
import sys
import pathlib

import requests
import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "agents"))
from linkedin_agent import API, _headers, escape  # noqa: E402

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
CFG = ROOT / "content" / "game-posts.yaml"
LOG = ROOT / "content" / "game-posts-log.txt"


def plan():
    c = yaml.safe_load(CFG.read_text())
    base = yaml.safe_load((ROOT / "config.yaml").read_text())["site"]["base_url"].rstrip("/")
    games, styles, start = c["games"], c["styles"], datetime.date.fromisoformat(c["start"])
    slots = []
    for n in range(c["days"] // c["every_days"]):
        day = start + datetime.timedelta(days=n * c["every_days"])
        hh, mm = map(int, (c["saturday_time"] if day.weekday() == 5 else c["time"]).split(":"))
        g, style = games[n % len(games)], styles[(n // len(games)) % len(styles)]
        url = f"{base}/play/{g['id']}.html"
        text = style["text"].format(url=url, **{k: g[k] for k in ("hook", "teaser", "more", "blurb", "lesson", "time")})
        slots.append(dict(n=n + 1, when=datetime.datetime(day.year, day.month, day.day, hh, mm, tzinfo=IST), game=g, style=style["name"],
                          url=url, text=text, tags=g.get("hashtags", [])))
    return c, slots


def commentary(s):
    """Plain text -> LinkedIn's post format: escape special characters, keep the link clickable, real hashtags."""
    body = escape(s["text"]).replace(escape(s["url"]), s["url"])
    if s["tags"]:
        body += "\n\n" + " ".join("{hashtag|\\#|%s}" % t for t in s["tags"])
    return body


def post(s):
    token, version = os.environ["LINKEDIN_ACCESS_TOKEN"], yaml.safe_load((ROOT / "config.yaml").read_text())["linkedin"]["api_version"]
    me = requests.get(f"{API}/v2/userinfo", headers={"Authorization": f"Bearer {token}"}, timeout=30)
    me.raise_for_status()
    author = f"urn:li:person:{me.json()['sub']}"
    init = requests.post(f"{API}/rest/images?action=initializeUpload", headers=_headers(token, version),
                         json={"initializeUploadRequest": {"owner": author}}, timeout=30)
    init.raise_for_status()
    upload_url, image = init.json()["value"]["uploadUrl"], init.json()["value"]["image"]
    pic = ROOT / "site" / "static" / "og" / f"game-{s['game']['id']}.jpg"
    requests.put(upload_url, data=pic.read_bytes(), headers={"Authorization": f"Bearer {token}"}, timeout=120).raise_for_status()
    common = {"author": author, "commentary": commentary(s), "visibility": "PUBLIC", "lifecycleState": "PUBLISHED", "isReshareDisabledByAuthor": False,
              "distribution": {"feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": []}}
    # a link card (the real game screen, the whole card opens the game); if LinkedIn refuses that, the same picture as an image post
    for content in ({"article": {"source": s["url"], "title": s["game"]["title"], "description": s["game"]["description"], "thumbnail": image}},
                    {"media": {"id": image, "altText": s["game"]["title"]}}):
        r = requests.post(f"{API}/rest/posts", headers=_headers(token, version), json={**common, "content": content}, timeout=30)
        if r.status_code in (200, 201):
            return r.headers.get("x-restli-id", "posted")
        print(f"LinkedIn refused ({r.status_code}): {r.text[:300]}")
    raise RuntimeError("LinkedIn post failed")


def main():
    c, slots = plan()
    if "--plan" in sys.argv:
        for s in slots:
            print(f"#{s['n']:>2}  {s['when']:%a %d %b %Y %H:%M} IST  {s['game']['id']}  ({s['style']})\n{s['text']}\n{' '.join('#' + t for t in s['tags'])}\n")
        return
    if not c.get("enabled"):
        return
    done = {int(line.split()[0]) for line in LOG.read_text().splitlines() if line.strip()} if LOG.exists() else set()
    now = datetime.datetime.now(IST)
    due = [s for s in slots if s["when"] <= now and s["n"] not in done and s["n"] not in c.get("skip", [])]
    if not due:
        return
    s = due[-1]
    with LOG.open("a") as f:
        for old in due[:-1]:
            f.write(f"{old['n']} {old['when']:%Y-%m-%d} {old['game']['id']} skipped-missed\n")
        if now - s["when"] > datetime.timedelta(hours=24):
            f.write(f"{s['n']} {s['when']:%Y-%m-%d} {s['game']['id']} skipped-missed\n")
        elif os.environ.get("DRY_RUN") == "1" or not os.environ.get("LINKEDIN_ACCESS_TOKEN"):
            print("DRY RUN, not posted:\n" + s["text"])
            return
        else:
            f.write(f"{s['n']} {s['when']:%Y-%m-%d} {s['game']['id']} {post(s)}\n")
            print(f"Posted game #{s['n']}: {s['game']['id']}")
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a") as f:
            f.write("changed=true\n")


if __name__ == "__main__":
    main()
