"""Runs after each website deploy: shares any published article not yet on LinkedIn,
then marks it as shared so it is never posted twice."""
import pathlib
import sys

import yaml

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "agents"))
import linkedin_agent  # noqa: E402
from common import ROOT, config, log  # noqa: E402


def main():
    cfg = config()
    if not cfg["linkedin"]["enabled"]:
        log("share", "LinkedIn sharing is switched off in config.yaml")
        return
    base = cfg["site"]["base_url"].rstrip("/")
    for path in sorted((ROOT / "content" / "articles").glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        _, front, body = raw.split("---", 2)
        meta = yaml.safe_load(front)
        if meta.get("linkedin_shared") or meta.get("status", "published") != "published":
            continue
        url = f"{base}/articles/{meta['slug']}.html"
        result = linkedin_agent.share(meta, url)
        if result != "dry-run":
            meta["linkedin_shared"] = True
            meta["linkedin_post_id"] = result
            path.write_text("---\n" + yaml.safe_dump(meta, sort_keys=False, allow_unicode=True, width=1000) + "---" + body,
                            encoding="utf-8")


if __name__ == "__main__":
    main()
