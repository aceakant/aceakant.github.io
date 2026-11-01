"""After the weekly agents run: open a GitHub issue with the preview link and the review controls,
and remember its number in the article."""
import sys

from articles import gh, load_all, parse_time, ist_label, save, urls


def main(file_rel):
    for path, meta, body in load_all():
        if not str(path).endswith(file_rel):
            continue
        preview, _ = urls(meta)
        when = parse_time(meta.get("publish_at"))
        verified = meta["factcheck"]["status"] != "needs-review"
        test = meta.get("test_run")
        lines = [
            ("## 🧪 TEST RUN — this draft is on hold and will not publish" if test else "## 📝 This week's draft is ready for review"),
            f"**{meta['title']}**",
            "",
            f"👉 **Preview it here:** {preview}",
            "",
            f"**Fact-check:** {meta['factcheck']['status']} — {meta['factcheck']['summary']}",
            "",
            ("🧪 Test run: reply `approve` only if you want this test article published." if test else
             f"⏰ **Goes live automatically on {ist_label(when)}** (website + LinkedIn) unless you hold it."
             if verified and when else
             "⚠️ **This draft will NOT publish by itself.** Something could not be verified. Check the notes above."),
            "",
            "### LinkedIn post that will go out with it",
            "> " + meta.get("linkedin_post", "").strip().replace("\n", "\n> "),
            "",
            "### Your controls (reply to this issue with one word)",
            "- `approve` → publish now",
            "- `hold` → stop it from publishing",
            "- `release` → put a held draft back on its schedule",
            "",
            f"To change wording: open `{path.relative_to(path.parents[2])}` in GitHub, tap the pencil, edit, and *Commit changes*.",
        ]
        title = f"Review: {'[TEST] ' if test else ''}{meta['title']}"
        url = gh("issue", "create", "--title", title, "--body", "\n".join(lines))
        meta["review_issue"] = int(url.rstrip("/").split("/")[-1])
        save(path, meta, body)
        print(f"Opened review issue {url}")
        return
    sys.exit(f"Article {file_rel} not found")


if __name__ == "__main__":
    main(sys.argv[1])
