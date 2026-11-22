"""Agent 5b — LinkedIn: shares each newly published article on Ajay's LinkedIn profile
(short hook + link card with the STAR picture, tracked link), using LinkedIn's official API. Runs after the website deploys."""
import os
import re

import requests

from common import ROOT, config, log

API = "https://api.linkedin.com"


def escape(text):
    """LinkedIn 'little text' format: these characters must be escaped in post commentary."""
    return re.sub(r"([\\|{}@\[\]()<>#*_~])", r"\\\1", text)


def short_text(article):
    """The Saturday post is short, like the teasers: the opening line of the article's post and its closing question.
    An article can set `linkedin_short` to choose the text itself."""
    if article.get("linkedin_short"):
        return article["linkedin_short"].strip()
    paras = [p.strip() for p in article["linkedin_post"].strip().split("\n\n") if p.strip()]
    if len(paras) > 1 and paras[-1].endswith("?"):
        return paras[0] + "\n\n" + paras[-1]
    return paras[0]


def tracked(article, url):
    """The article link carries ?ln=a-<slug>, so the readers this post brings are counted like every other post."""
    return url + "?ln=" + ("a-" + article["slug"])[:40]


def read_line(article, name):
    return f"New on {name} today" + (", with a calculator to try" if article.get("calculator") else "") + " 👉 "


def build_commentary(article, url):
    tags = config()["linkedin"]["hashtags"]
    name = config()["site"].get("weekly_name", "the full article")
    body = escape(short_text(article)) + "\n\n" + escape(read_line(article, name)) + url
    if tags:
        body += "\n\n" + " ".join("{hashtag|\\#|%s}" % t for t in tags)
    return body


def preview_text(article, url):
    tags = " ".join("#" + t for t in config()["linkedin"]["hashtags"])
    name = config()["site"].get("weekly_name", "the full article")
    return f"{short_text(article)}\n\n{read_line(article, name)}{url}\n\n{tags}"


def _headers(token, version, json_body=True):
    h = {"Authorization": f"Bearer {token}", "LinkedIn-Version": version, "X-Restli-Protocol-Version": "2.0.0"}
    if json_body:
        h["Content-Type"] = "application/json"
    return h


def share(article, url):
    cfg = config()["linkedin"]
    url = tracked(article, url)
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

    def send(content):
        post = {
            "author": author,
            "commentary": build_commentary(article, url),
            "visibility": "PUBLIC",
            "distribution": {"feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": []},
            "content": content,
            "lifecycleState": "PUBLISHED",
            "isReshareDisabledByAuthor": False,
        }
        return requests.post(f"{API}/rest/posts", headers=_headers(token, version), json=post, timeout=30)

    # a link card with the STAR picture (the whole card opens the article), like the teasers;
    # if LinkedIn refuses that, the same picture as an image post
    r = send({"article": {"source": url, "title": article["title"], "description": article.get("summary", "")[:250], "thumbnail": image_urn}})
    if r.status_code not in (200, 201):
        log("linkedin", f"Link card refused ({r.status_code}), posting as a picture instead")
        r = send({"media": {"id": image_urn, "altText": f"STAR summary: {article['title']}"}})
    if r.status_code not in (200, 201):
        raise RuntimeError(f"LinkedIn post failed {r.status_code}: {r.text[:400]}")
    post_id = r.headers.get("x-restli-id", "posted")
    log("linkedin", f"Shared on LinkedIn: {post_id}")
    return post_id
