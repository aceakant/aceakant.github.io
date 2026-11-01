"""Runs every hour: sends the 24-hour reminder and publishes drafts whose 48-hour window has passed.
Drafts on hold, or marked needs-review without approval, are never published here."""
import datetime

from articles import config, gh, ist_label, load_all, now_utc, parse_time, save, set_output, urls


def main():
    cfg = config()["review"]
    now, changed = now_utc(), False
    for path, meta, body in load_all():
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
