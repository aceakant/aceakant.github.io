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


def market_rule(market):
    """The ONE-MARKET rule for an article, from config.yaml (international markets only)."""
    t = config().get("topics") or {}
    markets = t.get("markets") or {}
    if market in (t.get("excluded_markets") or []) or (markets and market not in markets):
        raise RuntimeError(f"Market '{market}' is not covered by VertexNode (allowed: {', '.join(markets)})")
    member = market in ("Netherlands", "Ireland", "Denmark", "Luxembourg")
    return (f"This article's market is {market}. Every statistic, regulation, example and currency must come from {market}"
            f" (sources: {markets.get(market, 'that market')})"
            + (". As an EU member state, EU-wide rules and EU sources that apply there are allowed too" if member else "")
            + ". Global = cross-market sources only. UK, EU, US and Canada are separate markets. Never mix markets,"
              " e.g. no US figures in a UK piece.")


def log(agent, msg):
    print(f"[{agent}] {msg}", flush=True)


LAST_USAGE = {}  # token usage of the most recent ask_claude call (for logs and the API check)


def auth_styles(key):
    """Console API keys (sk-ant-api…) are sent as x-api-key; other token types as a Bearer header.
    Both styles are returned, preferred first, so a 401 can retry once with the other."""
    key = (key or "").strip()
    xkey, bearer = {"x-api-key": key}, {"Authorization": f"Bearer {key}"}
    return [xkey, bearer] if key.startswith("sk-ant-api") else [bearer, xkey]


def ask_claude(system, prompt, web_search=False, max_tokens=12000, cache=None):
    """Call Claude and return (text, sources). Optional live web search for fact-checking.

    Prompt caching (cache_control) is on for web-search calls by default: a long search pauses and is
    continued several times, and each continuation re-sends the draft and every search result so far.
    With caching, that repeated part is read from cache at a fraction of the price. One-off calls are not
    cached by default, because a cache write costs a little extra and would never be read back."""
    cfg = config()["agents"]
    main, backup = os.environ["ANTHROPIC_API_KEY"].strip(), os.environ.get("ANTHROPIC_API_KEY_BACKUP", "").strip()
    styles = auth_styles(main) + (auth_styles(backup) if backup and backup != main else [])
    headers = dict(styles[0], **{"anthropic-version": "2023-06-01", "content-type": "application/json"})
    if os.environ.get("ANTHROPIC_WORKSPACE_ID"):  # only needed for keys not tied to a workspace
        headers["anthropic-workspace-id"] = os.environ["ANTHROPIC_WORKSPACE_ID"]
    if cache is None:
        cache = web_search
    cache = cache and cfg.get("prompt_cache", True)
    body = {
        "model": cfg["model"],
        "max_tokens": max_tokens,
        "system": [{"type": "text", "text": system}],
        "messages": [{"role": "user", "content": prompt}],
    }
    if cache:
        # 1) the tools + standing instructions; 2) automatic breakpoint that moves to the newest block,
        # so each continuation reads everything already sent (draft, search results) from cache.
        body["system"][0]["cache_control"] = {"type": "ephemeral"}
        body["cache_control"] = {"type": "ephemeral"}
    if web_search:
        body["tools"] = [{"type": "web_search_20250305", "name": "web_search", "max_uses": cfg["max_searches"]}]

    text_parts, sources = [], {}
    used = {"input_tokens": 0, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0, "output_tokens": 0}
    for _ in range(6):  # long searches can pause; continue up to 6 times
        r = requests.post(API_URL, headers=headers, json=body, timeout=600)
        while r.status_code == 401 and len(styles) > 1:  # rejected: try the other style, then the backup key
            styles.pop(0)
            if len(styles) == 2:
                log("claude", "main key rejected; using the backup key")
            for k in ("x-api-key", "Authorization"):
                headers.pop(k, None)
            headers.update(styles[0])
            r = requests.post(API_URL, headers=headers, json=body, timeout=600)
        if r.status_code != 200:
            raise RuntimeError(f"Claude API error {r.status_code}: {r.text[:500]}")
        data = r.json()
        for k in used:
            used[k] += (data.get("usage") or {}).get(k) or 0
        for block in data["content"]:
            if block["type"] == "text":
                text_parts.append(block["text"])
                for c in block.get("citations") or []:
                    if c.get("url"):
                        sources[c["url"]] = c.get("title") or c["url"]
        if data.get("stop_reason") != "pause_turn":
            break
        body["messages"] = body["messages"] + [{"role": "assistant", "content": data["content"]}]
    LAST_USAGE.clear(); LAST_USAGE.update(used)
    total_in = used["input_tokens"] + used["cache_creation_input_tokens"] + used["cache_read_input_tokens"]
    log("claude", f"tokens in {total_in:,} (cache read {used['cache_read_input_tokens']:,}, cache write "
                  f"{used['cache_creation_input_tokens']:,}, uncached {used['input_tokens']:,}) · out {used['output_tokens']:,}")
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
