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


def slots(c):
    start, out = datetime.date.fromisoformat(c["start"]), []
    for n in range(c["days"] // c["every_days"]):
        day = start + datetime.timedelta(days=n * c["every_days"])
        hh, mm = map(int, (c["saturday_time"] if day.weekday() == 5 else c["time"]).split(":"))
        out.append((n + 1, datetime.datetime(day.year, day.month, day.day, hh, mm, tzinfo=IST)))
    return out


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
    posted = [r for r in rows if not r[4].startswith("skipped")]
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
    done = {int(r[0]) for r in rows}
    if "--plan" in sys.argv:
        fake = list(rows)
        for n, when in slots(c):
            if n in done:
                r = next(r for r in rows if int(r[0]) == n)
                print(f"#{n:>2}  {when:%a %d %b %Y %H:%M}  {r[2]} ({r[3]})  done: {r[4]}\n")
                continue
            item, k = choose(c, games, tools, fake, when, share_items.articles(c))
            style, body = share_items.text(c, item, k)
            fake.append((str(n), "", item["id"], style, "planned"))
            print(f"#{n:>2}  {when:%a %d %b %Y %H:%M} IST  {item['kind']}: {item['id']}  ({style})\n{body}\n{' '.join('#' + t for t in item.get('hashtags', []))}\n")
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
    due = [(n, w) for n, w in slots(c) if w <= now and n not in done and n not in c.get("skip", [])]
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
    item, k = choose(c, games, tools, read_log(), w, share_items.articles(c))
    style, body = share_items.text(c, item, k)
    if os.environ.get("DRY_RUN") == "1" or not os.environ.get("LINKEDIN_ACCESS_TOKEN"):
        print(f"DRY RUN, not posted ({item['id']}, {style}):\n{body}")
        return
    pid = post_item(item, body)
    with LOG.open("a") as f:
        f.write(f"{n} {w:%Y-%m-%d} {item['id']} {style} {pid}\n")
    print(f"Posted slot #{n}: {item['id']} ({style})")
    set_changed()


if __name__ == "__main__":
    main()
