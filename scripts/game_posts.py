"""Posts one Playground game or Workbench tool on Ajay's LinkedIn every 3rd day (content/game-posts.yaml).
Run by the hourly publish job. Which item goes out is decided on the day:
  1. anything never posted yet (a new game or a newly launched tool jumps the queue),
  2. otherwise whatever was posted longest ago, games and tools taking turns (2 games, then 1 tool).
Each repeat of the same item uses its next text style. Posted slots are recorded in content/game-posts-log.txt,
so nothing posts twice; a slot missed by more than a day is skipped, not posted late.
    python3 scripts/game_posts.py --plan        # what the next slots would post if nothing new is added
    python3 scripts/game_posts.py --post-now    # post content/post-now.yaml (a one-off, e.g. a video) as the current slot
"""
import datetime
import os
import pathlib
import sys
import time

import requests
import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "agents"))
sys.path.insert(0, str(ROOT / "scripts"))
from linkedin_agent import API, _headers, escape  # noqa: E402
import share_items  # noqa: E402

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
LOG = ROOT / "content" / "game-posts-log.txt"


def at(c, day):
    hh, mm = map(int, (c["saturday_time"] if day.weekday() == 5 else c["time"]).split(":"))
    return datetime.datetime(day.year, day.month, day.day, hh, mm, tzinfo=IST)


def busy_days(c):
    """Days that already have a LinkedIn post of their own: an article going out, a teaser or a launch post."""
    days = {a["when"].astimezone(IST).date() for a in share_items.article_releases()}
    return days | {x["when"].date() for x in specials(c)}


def slots(c, busy=None):
    """The regular slots, one post a day at most. Every 3rd day until `weekdays_from`, then every weekday (Mon-Fri).
    A day that already has a post of its own (an article, a teaser, a launch) is left to that post."""
    busy = busy_days(c) if busy is None else busy
    start, out = datetime.date.fromisoformat(c["start"]), []
    wfrom = datetime.date.fromisoformat(c["weekdays_from"]) if c.get("weekdays_from") else None
    end = start + datetime.timedelta(days=c["days"])
    n, day = 0, start
    while day < end:
        if not wfrom or day < wfrom:
            if (day - start).days % c["every_days"] == 0 and (day == start or day not in busy):
                n += 1
                out.append((n, at(c, day)))
        elif day.weekday() in c.get("weekdays", [0, 1, 2, 3, 4]) and day not in busy:
            n += 1
            out.append((n, at(c, day)))
        day += datetime.timedelta(days=1)
    return out


def insight_for(c, rows):
    """The next Wednesday insight: the first one not posted yet, then round again."""
    done = [r[2] for r in rows if r[3] == "insight" and not r[4].startswith("skipped")]
    ins = c.get("insights") or []
    fresh = [x for x in ins if "insight-" + x["id"] not in done]
    x = fresh[0] if fresh else ins[len(done) % len(ins)]
    body = c["insight_style"].format(hook=x["hook"], body="\n".join("→ " + p for p in x["points"]), question=x["question"])
    return dict(kind="insight", id="insight-" + x["id"], title=x["title"], hashtags=x.get("hashtags", []),
                picture=ROOT / "site" / "static" / "og" / f"insight-{x['id']}.jpg"), body


def is_insight_day(c, when):
    wfrom = c.get("weekdays_from")
    return bool(c.get("insights")) and wfrom and when.date() >= datetime.date.fromisoformat(wfrom) and when.weekday() == c.get("insight_weekday", 2)


def ln_tag(n):
    """What goes after ?ln= in a post's link: the slot number, or a short name for a teaser or launch post."""
    return str(n).replace("teaser-article-", "ta-").replace("teaser-", "t-").replace("launch-", "l-")[:40]


def specials(c):
    """Teasers the day before anything new goes live, and a launch post on the day, each on a day of its own.
    A teaser that would land on a busy day (an article going out, another teaser or launch) moves a day earlier."""
    now = datetime.datetime.now(IST)
    taken = {a["when"].astimezone(IST).date() for a in share_items.article_releases()}
    out = []
    base = yaml.safe_load((ROOT / "config.yaml").read_text())["site"]["base_url"].rstrip("/")
    og = ROOT / "site" / "static" / "og"

    def free_day(day, step, tries=3):
        for _ in range(tries):
            if day not in taken:
                return day
            day += datetime.timedelta(days=step)
        return None

    def weekday(d, launch_day):
        return "tomorrow" if (launch_day - d).days == 1 else "this " + launch_day.strftime("%A")

    for x in sorted(share_items.launches(), key=lambda x: x["when"]):
        L = x["when"].astimezone(IST)
        if L < now - datetime.timedelta(days=3):
            continue
        if x["kind"] == "tool":
            pic = og / f"tool-{x['id']}.jpg"
            pic = pic if pic.exists() else og / "workbench.jpg"
            live_url, tease_url, where = f"{base}/{x['url']}", f"{base}/workbench.html", "the Workbench"
        else:
            pic = og / f"game-{x['id']}.jpg"
            pic = pic if pic.exists() else og / f"lab-{x['lab']}.jpg"
            live_url, tease_url, where = f"{base}/play/{x['id']}.html", f"{base}/lab.html", "the Playground"
        lday = free_day(L.date(), +1)
        if lday:
            taken.add(lday)
            when = max(at(c, lday), L + datetime.timedelta(minutes=20)) if lday == L.date() else at(c, lday)
            out.append(dict(sid=f"launch-{x['id']}", when=when, kind=x["kind"], item=x["id"], style="launch", url=live_url, picture=pic,
                            title=x["name"], description=x["blurb"], tags=["RiskAnalytics", "Analytics"],
                            text=c["launch_styles"][x["kind"]].format(name=x["name"], blurb=x["blurb"], where=where, url=live_url)))
        tday = free_day(L.date() - datetime.timedelta(days=1), -1)
        if tday and at(c, tday) < L:
            taken.add(tday)
            out.append(dict(sid=f"teaser-{x['id']}", when=at(c, tday), kind=x["kind"], item=x["id"], style="teaser", url=tease_url, picture=pic,
                            title=f"Coming {L:%a %d %b}: {x['name']}", description=x["blurb"], tags=["RiskAnalytics", "Analytics"],
                            text=c["teaser_styles"][x["kind"]].format(name=x["name"], blurb=x["blurb"], where=where, url=tease_url,
                                                                       when_word=weekday(tday, L.date()), when_cap=weekday(tday, L.date()).capitalize(), launch_day=L.strftime("%A %d %B"))))
    for a in share_items.article_releases():
        m, R = a["meta"], a["when"].astimezone(IST)
        if R <= now or m.get("linkedin_shared"):
            continue  # already out
        tday = free_day(R.date() - datetime.timedelta(days=1), -1)
        if not tday or at(c, tday) >= R:
            continue
        taken.add(tday)
        hook, market = m.get("hook") or {}, m.get("market") or ""
        url = f"{base}/updates.html"
        out.append(dict(sid=f"teaser-article-{m['slug']}"[:120], when=at(c, tday), kind="article", item="article-" + m["slug"], style="teaser", url=url,
                        picture=ROOT / "content" / m["image"], title=f"Coming {R:%a %d %b} on VertexNode", description=m.get("summary", ""),
                        tags=["RiskManagement", "Banking"],
                        text=c["teaser_styles"]["article"].format(question=hook.get("question") or m["title"], when_word=weekday(tday, R.date()), when_cap=weekday(tday, R.date()).capitalize(),
                                                                   launch_day=R.strftime("%A"), topic=(("" if market in ("", "Global") else market + " ") + (m.get("category") or "").lower()), url=url)))
    return sorted(out, key=lambda x: x["when"])


def read_log():
    """[(slot, date, item id, style, post id)]"""
    rows = []
    if LOG.exists():
        for line in LOG.read_text().splitlines():
            p = line.split()
            if len(p) >= 5:
                rows.append(tuple(p[:5]))
    return rows


def choose(c, games, tools, rows, when=None, arts=None):
    """The next item and how many times it has been posted before."""
    posted = [r for r in rows if not r[4].startswith("skipped") and r[0].isdigit() and r[3] != "insight"]
    times = {}
    for i, r in enumerate(posted):
        times.setdefault(r[2], []).append(i)
    when = when or datetime.datetime.now(IST)
    rest = datetime.timedelta(days=c.get("article_rest_days", 21))
    arts = [a for a in (arts or []) if when >= a["release"] + rest]
    if any(abs((a["release"] - when).total_seconds()) < 86400 for a in share_items.articles(c)):
        arts = []  # a new article is going out on LinkedIn around today: no re-share
    kinds = c.get("mix", ["game", "game", "tool"])
    want = kinds[len(posted) % len(kinds)]
    pool = {"game": games, "tool": tools, "article": arts}
    if not pool.get(want):
        want = "game"
    brand_new = [x for x in games + tools if x.get("new") and x["id"] not in times]
    if brand_new:  # a game or tool added since the post text was written: it jumps the queue
        item = brand_new[0]
    else:
        fresh = [x for x in pool[want] if x["id"] not in times]
        item = fresh[0] if fresh else min(pool[want], key=lambda x: times[x["id"]][-1])
    return item, len(times.get(item["id"], []))


def plan_rows():
    """Every slot: done ones from the log, the rest as the queue would fill them today."""
    c, games, tools = share_items.load()
    rows, arts, out = read_log(), share_items.articles(c), []
    fake = list(rows)
    kinds = {x["id"]: x["kind"] for x in games + tools + arts}
    for n, when in slots(c):
        r = next((r for r in rows if r[0] == str(n)), None)
        if r:
            out.append(dict(n=n, when=when, kind=kinds.get(r[2], "game" if r[2] != "-" else ""), item=r[2], style=r[3], status="skipped" if r[4].startswith("skipped") else "posted", post=r[4], body=""))
            continue
        if is_insight_day(c, when):
            item, body = insight_for(c, fake)
            style = "insight"
        else:
            item, k = choose(c, games, tools, fake, when, arts)
            style, body = share_items.text(c, item, k)
        fake.append((str(n), "", item["id"], style, "planned"))
        out.append(dict(n=n, when=when, kind=item["kind"], item=item["id"], style=style, status="coming up", post="", body=body, tags=item.get("hashtags", [])))
    for x in specials(c):
        r = next((r for r in rows if r[0] == x["sid"]), None)
        out.append(dict(n=x["sid"], when=x["when"], kind=x["kind"], item=x["item"], style=x["style"], status="posted" if r else "coming up",
                        post=r[4] if r else "", body=x["text"], tags=x["tags"]))
    return sorted(out, key=lambda r: r["when"])


def commentary(body_text, url, tags):
    body = escape(body_text).replace(escape(url), url)
    if tags:
        body += "\n\n" + " ".join("{hashtag|\\#|%s}" % t for t in tags)
    return body


class LinkedIn:
    def __init__(self):
        self.token = os.environ["LINKEDIN_ACCESS_TOKEN"]
        self.version = yaml.safe_load((ROOT / "config.yaml").read_text())["linkedin"]["api_version"]
        me = requests.get(f"{API}/v2/userinfo", headers={"Authorization": f"Bearer {self.token}"}, timeout=30)
        me.raise_for_status()
        self.author = f"urn:li:person:{me.json()['sub']}"

    def h(self, json_body=True):
        return _headers(self.token, self.version, json_body)

    def image(self, path):
        init = requests.post(f"{API}/rest/images?action=initializeUpload", headers=self.h(), json={"initializeUploadRequest": {"owner": self.author}}, timeout=30)
        init.raise_for_status()
        v = init.json()["value"]
        requests.put(v["uploadUrl"], data=pathlib.Path(path).read_bytes(), headers={"Authorization": f"Bearer {self.token}"}, timeout=120).raise_for_status()
        return v["image"]

    def video(self, path):
        data = pathlib.Path(path).read_bytes()
        init = requests.post(f"{API}/rest/videos?action=initializeUpload", headers=self.h(), timeout=30,
                             json={"initializeUploadRequest": {"owner": self.author, "fileSizeBytes": len(data), "uploadCaptions": False, "uploadThumbnail": False}})
        if init.status_code >= 400:
            raise RuntimeError(f"video init {init.status_code}: {init.text[:300]}")
        v = init.json()["value"]
        parts = []
        for ins in v["uploadInstructions"]:
            r = requests.put(ins["uploadUrl"], data=data[ins["firstByte"]:ins["lastByte"] + 1],
                             headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/octet-stream"}, timeout=300)
            r.raise_for_status()
            parts.append(r.headers.get("etag") or r.headers.get("ETag"))
        fin = requests.post(f"{API}/rest/videos?action=finalizeUpload", headers=self.h(), timeout=60,
                            json={"finalizeUploadRequest": {"video": v["video"], "uploadToken": v.get("uploadToken", ""), "uploadedPartIds": parts}})
        if fin.status_code >= 400:
            raise RuntimeError(f"video finalize {fin.status_code}: {fin.text[:300]}")
        for _ in range(40):  # wait until LinkedIn has processed it
            st = requests.get(f"{API}/rest/videos/{requests.utils.quote(v['video'], safe='')}", headers=self.h(False), timeout=30)
            if st.ok and st.json().get("status") == "AVAILABLE":
                break
            time.sleep(6)
        return v["video"]

    def post(self, commentary_text, content):
        body = {"author": self.author, "commentary": commentary_text, "visibility": "PUBLIC", "lifecycleState": "PUBLISHED", "isReshareDisabledByAuthor": False,
                "distribution": {"feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": []}, "content": content}
        r = requests.post(f"{API}/rest/posts", headers=self.h(), json=body, timeout=60)
        if r.status_code in (200, 201):
            return r.headers.get("x-restli-id", "posted")
        print(f"LinkedIn refused ({r.status_code}): {r.text[:300]}")
        return None


def post_item(item, body):
    li = LinkedIn()
    image = li.image(item["picture"])
    text = commentary(body, item["url"], item.get("hashtags", []))
    # a link card (the whole card opens the game or tool); if LinkedIn refuses that, the same picture as an image post
    pid = li.post(text, {"article": {"source": item["url"], "title": item["title"], "description": item["description"], "thumbnail": image}}) \
        or li.post(text, {"media": {"id": image, "altText": item["title"]}})
    if not pid:
        raise RuntimeError("LinkedIn post failed")
    return pid


def set_changed():
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a") as f:
            f.write("changed=true\n")


def main():
    c, games, tools = share_items.load()
    rows, now = read_log(), datetime.datetime.now(IST)
    done = {r[0] for r in rows}
    if "--plan" in sys.argv:
        for r in plan_rows():
            head = f"#{r['n']:>2}" if isinstance(r["n"], int) else f"★ {r['style'].upper()}"
            print(f"{head}  {r['when']:%a %d %b %Y %H:%M} IST  {r['kind']}: {r['item']}  ({r['style']})  [{r['status']}]")
            if r["body"]:
                print(r["body"] + ("\n" + " ".join("#" + t for t in r.get("tags", [])) if r.get("tags") else ""))
            print()
        return
    if "--post-now" in sys.argv:  # a one-off post approved in chat, recorded as the current slot
        one = yaml.safe_load((ROOT / "content" / "post-now.yaml").read_text())
        if one.get("done"):
            print("post-now.yaml already posted")
            return
        item = next(x for x in games + tools if x["id"] == one["id"])
        n = max([s for s, w in slots(c) if w <= now + datetime.timedelta(hours=1)] or [1])
        li = LinkedIn()
        media = li.video(ROOT / one["video"]) if one.get("video") else li.image(item["picture"])
        pid = li.post(commentary(one["text"], item["url"], item.get("hashtags", [])), {"media": {"id": media, "title": item["title"]}})
        if not pid:
            raise RuntimeError("LinkedIn post failed")
        with LOG.open("a") as f:
            f.write(f"{n} {now:%Y-%m-%d} {item['id']} {one.get('style', 'puzzle')} {pid}\n")
        p = ROOT / "content" / "post-now.yaml"
        p.write_text(p.read_text() + f"\ndone: {pid}\n")
        print(f"Posted now as slot #{n}: {item['id']} ({pid})")
        set_changed()
        return
    if not c.get("enabled"):
        return
    for x in specials(c):  # a teaser or launch post that has come due (within 12 hours of its time)
        if x["sid"] not in done and x["when"] <= now < x["when"] + datetime.timedelta(hours=12):
            if os.environ.get("DRY_RUN") == "1" or not os.environ.get("LINKEDIN_ACCESS_TOKEN"):
                print(f"DRY RUN, not posted ({x['sid']}):\n{x['text']}")
                return
            tag = ln_tag(x["sid"])
            item = dict(x, url=x["url"] + f"?ln={tag}", hashtags=x["tags"])
            pid = post_item(item, x["text"].replace(x["url"], item["url"]))
            with LOG.open("a") as f:
                f.write(f"{x['sid']} {x['when']:%Y-%m-%d} {x['item']} {x['style']} {pid}\n")
            print(f"Posted {x['sid']}")
            set_changed()
            return
    due = [(n, w) for n, w in slots(c) if w <= now and str(n) not in done and n not in c.get("skip", [])]
    if not due:
        return
    with LOG.open("a") as f:
        for n, w in due[:-1]:
            f.write(f"{n} {w:%Y-%m-%d} - - skipped-missed\n")
    n, w = due[-1]
    if now - w > datetime.timedelta(hours=24):
        with LOG.open("a") as f:
            f.write(f"{n} {w:%Y-%m-%d} - - skipped-missed\n")
        set_changed()
        return
    if is_insight_day(c, w):  # Wednesday: a no-link insight post (picture and text, nothing to click)
        item, body = insight_for(c, read_log())
        if os.environ.get("DRY_RUN") == "1" or not os.environ.get("LINKEDIN_ACCESS_TOKEN"):
            print(f"DRY RUN, not posted ({item['id']}):\n{body}")
            return
        li = LinkedIn()
        pid = li.post(commentary(body, "https://none.invalid", item["hashtags"]), {"media": {"id": li.image(item["picture"]), "altText": item["title"]}})
        if not pid:
            raise RuntimeError("LinkedIn post failed")
        with LOG.open("a") as f:
            f.write(f"{n} {w:%Y-%m-%d} {item['id']} insight {pid}\n")
        print(f"Posted slot #{n}: {item['id']} (insight)")
        set_changed()
        return
    item, k = choose(c, games, tools, read_log(), w, share_items.articles(c))
    style, body = share_items.text(c, item, k)
    if os.environ.get("DRY_RUN") == "1" or not os.environ.get("LINKEDIN_ACCESS_TOKEN"):
        print(f"DRY RUN, not posted ({item['id']}, {style}):\n{body}")
        return
    item = dict(item, url=item["url"] + f"?ln={n}")  # the link carries the post number, so the website can count each post's clicks and plays
    body = body.replace(item["url"].split("?")[0], item["url"])
    pid = post_item(item, body)
    with LOG.open("a") as f:
        f.write(f"{n} {w:%Y-%m-%d} {item['id']} {style} {pid}\n")
    print(f"Posted slot #{n}: {item['id']} ({style})")
    set_changed()


if __name__ == "__main__":
    main()
