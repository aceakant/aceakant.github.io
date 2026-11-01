"""Shared helpers for all agents: settings, Claude API calls, JSON parsing."""
import json
import os
import pathlib
import re

import requests
import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
API_URL = "https://api.anthropic.com/v1/messages"

# Dry run = no API keys used, sample content instead. On automatically when no key is set.
DRY_RUN = os.environ.get("DRY_RUN") == "1" or not os.environ.get("ANTHROPIC_API_KEY")


def load_yaml(rel_path):
    return yaml.safe_load((ROOT / rel_path).read_text(encoding="utf-8"))


def config():
    return load_yaml("config.yaml")


def log(agent, msg):
    print(f"[{agent}] {msg}", flush=True)


def ask_claude(system, prompt, web_search=False, max_tokens=12000):
    """Call Claude and return (text, sources). Optional live web search for fact-checking."""
    cfg = config()["agents"]
    headers = {
        "x-api-key": os.environ["ANTHROPIC_API_KEY"],
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": cfg["model"],
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": prompt}],
    }
    if web_search:
        body["tools"] = [{"type": "web_search_20250305", "name": "web_search", "max_uses": cfg["max_searches"]}]

    text_parts, sources = [], {}
    for _ in range(6):  # long searches can pause; continue up to 6 times
        r = requests.post(API_URL, headers=headers, json=body, timeout=600)
        if r.status_code != 200:
            raise RuntimeError(f"Claude API error {r.status_code}: {r.text[:500]}")
        data = r.json()
        for block in data["content"]:
            if block["type"] == "text":
                text_parts.append(block["text"])
                for c in block.get("citations") or []:
                    if c.get("url"):
                        sources[c["url"]] = c.get("title") or c["url"]
        if data.get("stop_reason") != "pause_turn":
            break
        body["messages"] = body["messages"] + [{"role": "assistant", "content": data["content"]}]
    return "".join(text_parts), [{"title": t, "url": u} for u, t in sources.items()]


def extract_json(text):
    """Pull the JSON object out of a model reply (handles ```json fences)."""
    m = re.search(r"```json\s*(\{.*\})\s*```", text, re.S)
    raw = m.group(1) if m else text[text.find("{"): text.rfind("}") + 1]
    return json.loads(raw)


def slugify(title):
    words = re.sub(r"[^a-z0-9]+", " ", title.lower().replace("'", "")).split()
    slug = ""
    for w in words:
        if len(slug) + len(w) + 1 > 60:
            break
        slug = f"{slug}-{w}" if slug else w
    return slug
