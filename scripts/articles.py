"""Small helpers used by the review scripts: read/write article front matter, talk to GitHub."""
import datetime
import os
import pathlib
import subprocess

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
ARTICLES = ROOT / "content" / "articles"
IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


def config():
    return yaml.safe_load((ROOT / "config.yaml").read_text())


def load_all():
    items = []
    for path in sorted(ARTICLES.glob("*.md")):
        _, front, body = path.read_text(encoding="utf-8").split("---", 2)
        items.append((path, yaml.safe_load(front), body))
    return items


def save(path, meta, body):
    path.write_text("---\n" + yaml.safe_dump(meta, sort_keys=False, allow_unicode=True, width=1000) + "---" + body,
                    encoding="utf-8")


def now_utc():
    return datetime.datetime.now(datetime.timezone.utc)


def parse_time(value):
    return datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00")) if value else None


def ist_label(dt):
    return dt.astimezone(IST).strftime("%a %d %b, %I:%M %p IST")


def urls(meta):
    base = config()["site"]["base_url"].rstrip("/")
    return f"{base}/drafts/{meta['slug']}.html", f"{base}/articles/{meta['slug']}.html"


def gh(*args):
    """Run the GitHub CLI (available inside GitHub Actions)."""
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout.strip()


def set_output(**kw):
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a") as f:
            for k, v in kw.items():
                f.write(f"{k}={v}\n")
