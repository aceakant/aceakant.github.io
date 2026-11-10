"""Runs every morning: fetches anonymous visit and game counts from GoatCounter and saves them to
content/pulse.json for the Pulse page. Nothing personal is fetched or stored, only totals.

Does nothing until GoatCounter is set up: the site code in config.yaml (analytics.goatcounter) and the
GOATCOUNTER_TOKEN secret in GitHub.
"""
import datetime
import json
import os
import pathlib
import re
import sys
import time

import requests
import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "pulse.json"

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
GAME_EVENT = re.compile(r"^game-(.+)-(start|finish)$")
SCORE_EVENT = re.compile(r"^game-(.+)-score-(\d+)$")
ARTICLE_PATH = re.compile(r"/articles/([a-z0-9-]+?)(?:\.html)?/?$")
SEARCH = ("google", "bing", "duckduckgo", "yahoo", "ecosia", "baidu", "yandex", "brave", "startpage")


def source_group(name):
    n = (name or "").lower()
    if "linkedin" in n or "lnkd.in" in n:
        return "LinkedIn"
    if any(s in n for s in SEARCH):
        return "Google and other search"
    return "Other sites"


class GoatCounter:
    def __init__(self, base, token):
        self.base = base.rstrip("/")
        self.s = requests.Session()
        self.s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})

    def get(self, path, **params):
        for attempt in range(4):
            r = self.s.get(self.base + path, params=params, timeout=60)
            if r.status_code == 429:  # rate limit: 4 requests a second
                time.sleep(1.5 * (attempt + 1))
                continue
            if r.status_code == 404 and "not found" in r.text:
                return {}  # GoatCounter says "not found" when nothing has been counted yet
            if r.status_code >= 400:
                raise RuntimeError(f"GoatCounter {path} → {r.status_code}: {r.text[:300]}")
            time.sleep(0.3)
            return r.json()
        raise RuntimeError(f"GoatCounter {path}: still rate-limited")


def day_counts(hit):
    """{date: visitors} for one path, from the per-day stats."""
    out = {}
    for st in hit.get("stats") or []:
        day = st.get("day")
        n = st.get("daily")
        if n is None:
            n = sum(st.get("hourly") or [])
        if day and n:
            out[day] = out.get(day, 0) + int(n)
    return out


def analyst_live(cfg):
    """The live Analyst on Call service's public tally (reviews run, checker verdicts). None if unreachable."""
    url = ((cfg.get("analyst") or {}).get("worker_url") or "").rstrip("/")
    if not url:
        return None
    try:
        r = requests.get(url + "/stats", timeout=20)
        return r.json() if r.ok else None
    except Exception:
        return None


def main():
    cfg = yaml.safe_load((ROOT / "config.yaml").read_text())
    code = ((cfg.get("analytics") or {}).get("goatcounter") or "").strip()
    token = os.environ.get("GOATCOUNTER_TOKEN", "").strip()
    if not code or not token:
        print("GoatCounter is not set up yet (site code in config.yaml and GOATCOUNTER_TOKEN secret). Nothing to fetch.")
        return
    gc = GoatCounter(os.environ.get("GOATCOUNTER_API") or f"https://{code}.goatcounter.com/api/v0", token)

    today = datetime.datetime.now(datetime.timezone.utc).date()
    start = str((cfg.get("pulse") or {}).get("start") or (today - datetime.timedelta(days=90)))
    rng = {"start": start, "end": (today + datetime.timedelta(days=1)).isoformat()}

    total = gc.get("/stats/total", **rng)

    hits, seen = [], []
    while True:  # pages of 100 paths; the API pages by excluding the paths already fetched
        params = dict(rng, limit=100)
        if seen:
            params["exclude_paths"] = ",".join(str(i) for i in seen)
        page = gc.get("/stats/hits", **params)
        batch = page.get("hits") or []
        hits += batch
        seen += [h["path_id"] for h in batch if "path_id" in h]
        if not page.get("more") or not batch or len(seen) >= 2000:
            break

    refs = gc.get("/stats/toprefs", limit=100, **rng).get("stats") or []
    places = gc.get("/stats/locations", limit=100, **rng).get("stats") or []

    games, articles, weekly, first_day = {}, {}, {}, None
    tools = {"samples": {}, "uploads": 0, "reviews": 0, "model_risk": 0, "model_risk_samples": 0, "roi": 0, "talks": 0}
    for h in hits:
        path, count, days = h.get("path") or "", int(h.get("count") or 0), day_counts(h)
        if days:
            d0 = min(days)
            first_day = d0 if first_day is None or d0 < first_day else first_day
        m = GAME_EVENT.match(path) if h.get("event") else None
        s = SCORE_EVENT.match(path) if h.get("event") else None
        if m:
            g = games.setdefault(m.group(1), {"players": 0, "finished": 0, "scores": {}})
            g["players" if m.group(2) == "start" else "finished"] += count
            if m.group(2) == "start":
                for day, n in days.items():
                    d = datetime.date.fromisoformat(day[:10])
                    monday = (d - datetime.timedelta(days=d.weekday())).isoformat()
                    weekly[monday] = weekly.get(monday, 0) + n
        elif s:
            g = games.setdefault(s.group(1), {"players": 0, "finished": 0, "scores": {}})
            g["scores"][int(s.group(2))] = g["scores"].get(int(s.group(2)), 0) + count
        elif h.get("event") and path.startswith("tool-analyst-"):
            if path.startswith("tool-analyst-sample-"):
                k = path[len("tool-analyst-sample-"):]
                tools["samples"][k] = tools["samples"].get(k, 0) + count
            elif path == "tool-analyst-upload":
                tools["uploads"] += count
            elif path == "tool-analyst-review":
                tools["reviews"] += count
        elif h.get("event") and path.startswith("tool-modelrisk-"):
            if path == "tool-modelrisk-check":
                tools["model_risk"] += count
            elif path.startswith("tool-modelrisk-sample-"):
                tools["model_risk_samples"] += count
        elif h.get("event") and path.startswith("tool-talk-"):
            tools["talks"] += count
        elif h.get("event") and path == "tool-montecarlo-use":
            tools["montecarlo"] = tools.get("montecarlo", 0) + count
        elif h.get("event") and path == "tool-cutoff-use":
            tools["cutoff"] = tools.get("cutoff", 0) + count
        elif h.get("event") and path == "tool-roi-use":
            tools["roi"] += count
        elif not h.get("event"):
            a = ARTICLE_PATH.search(path)
            if a:
                articles[a.group(1)] = articles.get(a.group(1), 0) + count

    for g in games.values():
        n = sum(g["scores"].values())
        g["scored"] = n
        g["avg_score"] = round(sum(k * v for k, v in g["scores"].items()) / n) if n else None
        g["scores"] = {str(k): v for k, v in sorted(g["scores"].items())}

    visitors = max(0, int(total.get("total") or 0) - int(total.get("total_events") or 0))
    grouped = {}
    for r in refs:
        grouped[source_group(r.get("name"))] = grouped.get(source_group(r.get("name")), 0) + int(r.get("count") or 0)
    grouped["Direct link or bookmark"] = max(0, visitors - sum(grouped.values()))
    order = ["LinkedIn", "Direct link or bookmark", "Google and other search", "Other sites"]
    sources = [{"name": k, "count": grouped.get(k, 0)} for k in order]

    this_monday = today - datetime.timedelta(days=today.weekday())
    weeks = [(this_monday - datetime.timedelta(weeks=i)).isoformat() for i in range(7, -1, -1)]
    data = {
        "updated": datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "since": first_day[:10] if first_day else datetime.datetime.now(IST).date().isoformat(),
        "visitors": visitors,
        "players": sum(g["players"] for g in games.values()),
        "article_reads": sum(articles.values()),
        "countries": len([p for p in places if (p.get("name") or "").strip() and (p.get("name") or "").lower() not in ("(unknown)", "unknown")]),
        "weekly": [{"week": w, "players": weekly.get(w, 0)} for w in weeks],
        "sources": sources,
        "games": games,
        "articles": [{"slug": k, "reads": v} for k, v in sorted(articles.items(), key=lambda kv: -kv[1])],
        "tools": tools,
        "analyst_live": analyst_live(cfg),
    }
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Pulse: {visitors} visitors, {data['players']} plays, {data['article_reads']} article reads, {data['countries']} countries")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # a bad day at GoatCounter should never break the site
        print(f"Pulse fetch failed, keeping yesterday's numbers: {e}")
        sys.exit(0)
