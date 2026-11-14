"""Builds the table behind the LinkedIn Post Tracker: one row per post slot (posted or coming up), with the website
numbers counted for that post (content/audience.json, from the ?ln=<post> links) and the LinkedIn numbers Sweta
sends (content/linkedin-stats.yaml). Writes content/post-tracker.csv; the weekly review uploads it to the tracker.
    python3 scripts/tracker_csv.py"""
import csv
import json
import pathlib
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))


def main():
    import game_posts
    aud = json.loads((ROOT / "content" / "audience.json").read_text()) if (ROOT / "content" / "audience.json").exists() else {}
    site = aud.get("per_post_all_time") or {}
    li_file = ROOT / "content" / "linkedin-stats.yaml"
    li = (yaml.safe_load(li_file.read_text()) or {}) if li_file.exists() else {}
    rows = []
    for r in game_posts.plan_rows():
        s, l = site.get(game_posts.ln_tag(r["n"]), {}), li.get(r["n"]) or {}
        rows.append({"post": r["n"], "date": r["when"].strftime("%Y-%m-%d"), "kind": r["kind"] if r["style"] not in ("teaser", "launch", "insight") else r["style"], "item": r["item"].replace("article-", ""), "style": r["style"],
                     "status": r["status"], "clicks": s.get("visit", ""), "started": s.get("start", s.get("use", "")), "finished": s.get("finish", s.get("read", "")),
                     "shared": s.get("share", ""), "impressions": l.get("impressions", ""), "reactions": l.get("reactions", ""), "comments": l.get("comments", "")})
    out = ROOT / "content" / "post-tracker.csv"
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} rows → {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
