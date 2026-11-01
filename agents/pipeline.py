"""Weekly pipeline: Topic → Writer → Fact-check → Visual → saved as a DRAFT for the 48-hour review.

Run:  python agents/pipeline.py            (live, needs ANTHROPIC_API_KEY)
      DRY_RUN=1 python agents/pipeline.py  (sample content, no keys)
"""
import datetime
import json
import os

import yaml

import factcheck_agent
import topic_agent
import visual_agent
import writer_agent
from common import DRY_RUN, ROOT, config, log, slugify

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


def save_article(art, slug, date, image, publish_at):
    front = {
        "title": art["title"], "slug": slug, "date": date, "category": art.get("category"),
        "status": "draft",
        "publish_at": publish_at,               # None = waits for a human "approve"
        "review_issue": None, "reminded": False,
        "summary": art["summary"],
        "hook": art.get("hook"), "star": art["star"], "process": art.get("process"),
        "calculator": art.get("calculator"), "roi": art.get("roi", []), "myth_fact": art.get("myth_fact"),
        "image": image,
        "factcheck": {"status": art["factcheck"]["status"], "summary": art["factcheck"]["summary"]},
        "sources": art.get("sources", []),
        "linkedin_post": art["linkedin_post"], "linkedin_shared": False,
    }
    path = ROOT / "content" / "articles" / f"{date}-{slug}.md"
    path.write_text("---\n" + yaml.safe_dump(front, sort_keys=False, allow_unicode=True, width=1000) +
                    "---\n\n" + art["article_markdown"].strip() + "\n", encoding="utf-8")
    (ROOT / "content" / "media" / slug / "factcheck-report.json").write_text(
        json.dumps(art["factcheck"], indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def main():
    now = datetime.datetime.now(datetime.timezone.utc).replace(second=0, microsecond=0)
    date = now.astimezone(IST).date().isoformat()
    log("pipeline", f"Weekly run {date} {'(DRY RUN)' if DRY_RUN else ''}")

    topic = topic_agent.pick_topic()          # 1. topic
    draft = writer_agent.write(topic)          # 2. playful STAR piece
    checked = factcheck_agent.check(draft)     # 3. fact-check with web search
    slug = slugify(checked["title"])
    image = visual_agent.create(checked, slug) # 4. STAR image

    status = checked["factcheck"]["status"]
    hours = config()["review"]["hours_before_publish"]
    publish_at = (now + datetime.timedelta(hours=hours)).isoformat().replace("+00:00", "Z") if status != "needs-review" else None
    path = save_article(checked, slug, date, image, publish_at)
    topic_agent.mark_used(topic["title"], date)
    log("pipeline", f"Saved {path.relative_to(ROOT)} — fact-check: {status}; publish_at: {publish_at or 'waits for approval'}")

    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        when = (datetime.datetime.fromisoformat(publish_at.replace("Z", "+00:00")).astimezone(IST)
                .strftime("%a %d %b, %I:%M %p IST") if publish_at else "")
        with open(gh_out, "a") as f:
            f.write(f"title={checked['title']}\nslug={slug}\nstatus={status}\nwhen={when}\nfile={path.relative_to(ROOT)}\n")
            f.write("summary<<EOF\n" + checked["factcheck"]["summary"] + "\nEOF\n")


if __name__ == "__main__":
    main()
