"""Runs every hour: sends the 24-hour reminder and publishes drafts whose 48-hour window has passed.
Drafts on hold, or marked needs-review without approval, are never published here.
Also releases published articles held off LinkedIn once their `linkedin_release` time arrives
(e.g. linkedin_release: 2026-11-07T13:30:00+05:30); the website deploy then posts them."""
import datetime

from articles import ROOT, config, gh, ist_label, load_all, now_utc, parse_time, save, set_output, urls


def main():
    cfg = config()["review"]
    now, changed = now_utc(), False
    # Workbench tools approved for a launch time: rebuild the site once when that time arrives
    try:
        import yaml
        done_file = ROOT / "content" / "launched.txt"
        done = set(done_file.read_text().split()) if done_file.exists() else set()
        for t in yaml.safe_load((ROOT / "content" / "tools.yaml").read_text())["tools"]:
            when = parse_time(t.get("launch"))
            if t.get("status") != "preview" and when and now >= when and t["id"] not in done:
                with done_file.open("a") as f:
                    f.write(t["id"] + "\n")
                changed = True
                print(f"Workbench launch: {t['id']}")
    except Exception as e:  # a launch problem must never stop article publishing
        print(f"Workbench launch check skipped: {e}")

    for path, meta, body in load_all():
        release = parse_time(meta.get("linkedin_release"))
        if meta.get("status") == "published" and meta.get("linkedin_hold") and not meta.get("linkedin_shared") and release and now >= release:
            meta["linkedin_hold"] = False
            save(path, meta, body)
            changed = True
            print(f"LinkedIn release: {meta['slug']}")
            if meta.get("review_issue"):
                gh("issue", "comment", str(meta["review_issue"]), "--body",
                   f"📣 Scheduled LinkedIn post: this goes out now ({ist_label(release)}).")
            continue
        if meta.get("status") != "draft":
            continue
        when = parse_time(meta.get("publish_at"))
        if not when:
            continue  # needs-review: waits for "approve"
        preview, live = urls(meta)
        issue = meta.get("review_issue")

        if now >= when:
            meta["status"] = "published"
            save(path, meta, body)
            changed = True
            print(f"Published {meta['slug']}")
            if issue:
                note = ("LinkedIn is on hold for this one. Reply `share` when you want it posted." if meta.get("linkedin_hold")
                        else "The LinkedIn post follows in a few minutes.")
                gh("issue", "comment", str(issue), "--body", f"✅ Published: {live}\n\n{note}")
                gh("issue", "close", str(issue))
        elif not meta.get("reminded") and now >= when - datetime.timedelta(hours=cfg["reminder_hours_before"]):
            meta["reminded"] = True
            save(path, meta, body)
            changed = True
            if issue:
                gh("issue", "comment", str(issue), "--body",
                   f"⏰ Reminder: this goes live on **{ist_label(when)}**.\n\nPreview: {preview}\n\nReply `hold` to stop it, or `approve` to publish now.")
    set_output(changed=str(changed).lower())


if __name__ == "__main__":
    main()
