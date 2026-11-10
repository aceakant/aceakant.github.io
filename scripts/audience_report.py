"""Daily: how the LinkedIn game and tool posts are doing on the website side, from GoatCounter (totals only).
Saves content/audience.json: visits to each share link (/play/<game>), visits to each tool page, game starts and
finishes, share-button clicks, and visits arriving from LinkedIn, for the last 7 and 30 days.
The weekly review reads this next to the LinkedIn numbers Sweta sends, to judge what is working."""
import datetime
import json
import os
import pathlib
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from pulse_fetch import GoatCounter, source_group  # noqa: E402


def window(gc, days):
    today = datetime.datetime.now(datetime.timezone.utc).date()
    rng = {"start": (today - datetime.timedelta(days=days)).isoformat(), "end": (today + datetime.timedelta(days=1)).isoformat()}
    hits, seen = [], []
    while True:
        params = dict(rng, limit=100)
        if seen:
            params["exclude_paths"] = ",".join(str(i) for i in seen)
        page = gc.get("/stats/hits", **params)
        batch = page.get("hits") or []
        hits += batch
        seen += [h["path_id"] for h in batch if "path_id" in h]
        if not page.get("more") or not batch or len(seen) >= 2000:
            break
    out = {"share_links": {}, "tool_pages": {}, "game_starts": {}, "game_finishes": {}, "share_clicks": 0, "pages": 0}
    tools = {t["url"]: t["id"] for t in yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())["tools"] if t.get("url")}
    for h in hits:
        p, n = h.get("path") or "", int(h.get("count") or 0)
        if h.get("event"):
            if p.startswith("game-") and p.endswith("-start"):
                out["game_starts"][p[5:-6]] = n
            elif p.startswith("game-") and p.endswith("-finish"):
                out["game_finishes"][p[5:-7]] = n
            elif p.startswith("share-"):
                out["share_clicks"] += n
            continue
        out["pages"] += n
        if p.startswith("/play/"):
            out["share_links"][p[6:].replace(".html", "")] = n
        elif p.lstrip("/") in tools:
            out["tool_pages"][tools[p.lstrip("/")]] = n
    refs = gc.get("/stats/toprefs", limit=100, **rng).get("stats") or []
    out["from_linkedin"] = sum(int(r.get("count") or 0) for r in refs if source_group(r.get("name")) == "LinkedIn")
    return out


def main():
    code = ((yaml.safe_load((ROOT / "config.yaml").read_text()).get("analytics") or {}).get("goatcounter") or "").strip()
    token = os.environ.get("GOATCOUNTER_TOKEN", "").strip()
    if not code or not token:
        print("GoatCounter not set up; nothing to fetch.")
        return
    gc = GoatCounter(f"https://{code}.goatcounter.com/api/v0", token)
    data = {"updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="minutes"), "last_7_days": window(gc, 7), "last_30_days": window(gc, 30)}
    (ROOT / "content" / "audience.json").write_text(json.dumps(data, indent=1) + "\n")
    print(json.dumps(data["last_7_days"], indent=1))


if __name__ == "__main__":
    main()
