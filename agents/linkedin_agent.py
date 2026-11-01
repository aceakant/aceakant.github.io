"""Agent 5b — LinkedIn: shares each newly published article on Ajay's LinkedIn profile
(STAR card image + post text + link), using LinkedIn's official API. Runs after the website deploys."""
import os
import re

import requests

from common import ROOT, config, log

API = "https://api.linkedin.com"


def escape(text):
    """LinkedIn 'little text' format: these characters must be escaped in post commentary."""
    return re.sub(r"([\\|{}@\[\]()<>#*_~])", r"\\\1", text)


def build_commentary(article, url):
    tags = config()["linkedin"]["hashtags"]
    body = escape(article["linkedin_post"].strip())
    body += "\n\n" + escape("Full article, STAR video and sources: ") + url
    if tags:
        body += "\n\n" + " ".join("{hashtag|\\#|%s}" % t for t in tags)
    return body


def preview_text(article, url):
    tags = " ".join("#" + t for t in config()["linkedin"]["hashtags"])
    return f"{article['linkedin_post'].strip()}\n\nFull article, STAR video and sources: {url}\n\n{tags}"


def _headers(token, version, json_body=True):
    h = {"Authorization": f"Bearer {token}", "LinkedIn-Version": version, "X-Restli-Protocol-Version": "2.0.0"}
    if json_body:
        h["Content-Type"] = "application/json"
    return h


def share(article, url):
    cfg = config()["linkedin"]
    if os.environ.get("DRY_RUN") == "1" or not os.environ.get("LINKEDIN_ACCESS_TOKEN"):
        out = ROOT / "content" / "media" / article["slug"] / "linkedin-preview.txt"
        out.write_text(preview_text(article, url), encoding="utf-8")
        log("linkedin", f"DRY RUN — post not sent. Preview saved to {out.relative_to(ROOT)}")
        return "dry-run"

    token, version = os.environ["LINKEDIN_ACCESS_TOKEN"], cfg["api_version"]

    me = requests.get(f"{API}/v2/userinfo", headers={"Authorization": f"Bearer {token}"}, timeout=30)
    me.raise_for_status()
    author = f"urn:li:person:{me.json()['sub']}"

    init = requests.post(f"{API}/rest/images?action=initializeUpload", headers=_headers(token, version),
                         json={"initializeUploadRequest": {"owner": author}}, timeout=30)
    init.raise_for_status()
    upload_url, image_urn = init.json()["value"]["uploadUrl"], init.json()["value"]["image"]
    with open(ROOT / "content" / article["image"], "rb") as f:
        up = requests.put(upload_url, data=f.read(), headers={"Authorization": f"Bearer {token}"}, timeout=120)
    up.raise_for_status()

    post = {
        "author": author,
        "commentary": build_commentary(article, url),
        "visibility": "PUBLIC",
        "distribution": {"feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": []},
        "content": {"media": {"id": image_urn, "altText": f"STAR summary: {article['title']}"}},
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }
    r = requests.post(f"{API}/rest/posts", headers=_headers(token, version), json=post, timeout=30)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"LinkedIn post failed {r.status_code}: {r.text[:400]}")
    post_id = r.headers.get("x-restli-id", "posted")
    log("linkedin", f"Shared on LinkedIn: {post_id}")
    return post_id
