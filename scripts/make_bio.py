"""Builds the one-page bio PDF (site/static/bio/Ajay-Kant-bio.pdf) from the same data as the website.
Run locally after changing profile.yaml or leadership.yaml (needs Playwright + Chrome):
    python scripts/make_bio.py
"""
import base64
import pathlib
import sys

import yaml
from jinja2 import Environment, FileSystemLoader

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    from playwright.sync_api import sync_playwright
    load = lambda p: yaml.safe_load((ROOT / p).read_text())
    profile, leadership, config = load("content/profile.yaml"), load("content/leadership.yaml"), load("config.yaml")
    avatar = ROOT / "site" / profile["avatar"]
    uri = "data:image/jpeg;base64," + base64.b64encode(avatar.read_bytes()).decode()
    html = Environment(loader=FileSystemLoader(ROOT / "site" / "bio")).get_template("bio.html").render(
        profile=profile, leadership=leadership, site=config["site"], avatar_uri=uri)
    out = ROOT / "site" / "static" / "bio" / "Ajay-Kant-bio.pdf"
    out.parent.mkdir(parents=True, exist_ok=True)
    chrome = sys.argv[1] if len(sys.argv) > 1 else None
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome) if chrome else p.chromium.launch()
        page = b.new_page()
        page.set_content(html, wait_until="load")
        page.pdf(path=str(out), format="A4", print_background=True, margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        b.close()
    print(f"Bio written to {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
