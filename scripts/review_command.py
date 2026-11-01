"""Handles the owner's one-word replies on a review issue: approve, hold, release, share."""
import datetime
import os

from articles import gh, ist_label, load_all, now_utc, parse_time, save, set_output, urls


def main():
    issue = int(os.environ["ISSUE_NUMBER"])
    words = os.environ.get("COMMENT_BODY", "").strip().lower().split()
    cmd = words[0].strip(".!`") if words else ""
    if cmd not in ("approve", "publish", "hold", "release", "share"):
        set_output(changed="false")
        return

    for path, meta, body in load_all():
        if meta.get("review_issue") != issue:
            continue
        preview, live = urls(meta)
        if cmd == "share":
            if meta.get("linkedin_shared"):
                reply = "This article is already on LinkedIn."
            elif meta.get("status") != "published":
                reply = "This article isn't published yet. Reply `approve` first, then `share`."
            else:
                meta["linkedin_hold"] = False
                reply = "📣 Sharing on LinkedIn now. The post goes out in a few minutes."
        elif cmd in ("approve", "publish"):
            meta["status"] = "published"
            reply = f"✅ Approved and publishing now: {live}\n\n" + (
                "LinkedIn is on hold for this one. Reply `share` when you want it posted." if meta.get("linkedin_hold")
                else "The LinkedIn post follows in a few minutes.")
        elif cmd == "hold":
            meta["status"] = "hold"
            reply = "⏸️ On hold. It will not publish. Reply `release` to put it back on schedule, or `approve` to publish now."
        else:
            meta["status"] = "draft"
            when = parse_time(meta.get("publish_at"))
            if not when or when < now_utc():
                when = now_utc() + datetime.timedelta(hours=1)
                meta["publish_at"] = when.replace(second=0, microsecond=0).isoformat().replace("+00:00", "Z")
            reply = f"▶️ Released. It goes live on **{ist_label(when)}**. Preview: {preview}"
        save(path, meta, body)
        gh("issue", "comment", str(issue), "--body", reply)
        if meta["status"] == "published" and cmd != "share":
            gh("issue", "close", str(issue))
        set_output(changed="true")
        return
    gh("issue", "comment", str(issue), "--body", "I couldn't find a draft linked to this issue.")
    set_output(changed="false")


if __name__ == "__main__":
    main()
