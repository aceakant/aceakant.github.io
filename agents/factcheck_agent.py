"""Agent 3 — Fact-check: verifies every claim (including the hook answer and Myth/Fact answers)
with live web search, fixes or removes what it cannot verify, checks personal claims against the
profile, enforces banned phrases, and validates the interactive blocks.

Outcome:
  verified      -> auto-publishes after the 48-hour review window
  needs-review  -> waits for a human "approve"; never auto-publishes
"""
import json
import re

import yaml

from common import DRY_RUN, ask_claude, config, extract_json, load_yaml, log

SYSTEM = """You are a strict fact-checker for a professional article published under a real person's name.
Use web search to verify every external factual claim, the hook question's answer and every Myth/Fact
answer. Prefer primary sources (regulators, central banks, company filings, major research firms).

Rules:
- A claim about the AUTHOR is valid only if it appears in the PROFILE. Otherwise remove it.
- Wrong external claim: correct it and cite the source. Unverifiable: remove or soften it.
- If the hook answer cannot be verified, replace the hook with one you CAN verify (same JSON shape)
  and set its source_url.
- Every Myth/Fact item must have a correct "fact" value; rewrite any item you cannot support.
- Do not add new claims. Keep the author's voice, the light humour and the H2 structure.
- ROI rows and the calculator basis must be honest (measured, sourced, or "Illustrative model").
Reply with JSON only."""

PROMPT = """PROFILE (the only allowed personal facts):
{profile}

DRAFT (JSON):
{draft}

Return the full corrected draft as JSON with the same keys as the DRAFT, plus:
  "checks": [{{"claim": "...", "status": "verified|corrected|removed|personal-ok", "source_url": "...", "note": "short source title"}}],
  "unresolved": ["anything a human must look at; empty list if none"]"""

REQUIRED = ["title", "category", "summary", "hook", "star", "article_markdown", "process",
            "calculator", "roi", "myth_fact", "linkedin_post"]


def problems(d):
    """Structural checks so the interactive blocks always work on the website."""
    out = [f"missing '{k}'" for k in REQUIRED if not d.get(k)]
    if out:
        return out
    if set(d["star"]) != {"situation", "task", "action", "result"}:
        out.append("STAR must have situation, task, action, result")
    h = d["hook"]
    try:
        if not float(h["min"]) <= float(h["answer"]) <= float(h["max"]):
            out.append("hook answer outside slider range")
    except (KeyError, TypeError, ValueError):
        out.append("hook numbers missing")
    calc = d["calculator"]
    ids = [i["id"] for i in calc.get("inputs", [])]
    expr = calc.get("formula", "")
    for i in sorted(ids, key=len, reverse=True):
        expr = re.sub(rf"\b{re.escape(i)}\b", "1", expr)
    if not re.fullmatch(r"[\d\s+\-*/().]+", expr or "x"):
        out.append("calculator formula uses unknown names")
    if len(d["myth_fact"]) != 3:
        out.append("need exactly 3 Myth/Fact items")
    return out


def banned_hits(text):
    low = text.lower()
    return [p for p in config()["writing_rules"]["banned_phrases"] if p.lower() in low]


def check(draft):
    if DRY_RUN:
        log("fact-check", "DRY RUN — no web search; draft marked as sample")
        result = dict(draft, sources=[])
        issues = problems(result)
        result["factcheck"] = {"status": "dry-run" if not issues else "needs-review",
                               "summary": "Sample content from a dry run. Live runs verify every claim with web search." +
                                          (" Structure issues: " + "; ".join(issues) if issues else ""),
                               "checks": []}
        return result

    log("fact-check", "Verifying claims with live web search…")
    profile = yaml.safe_dump(load_yaml("content/profile.yaml"), allow_unicode=True)
    text, sources = ask_claude(SYSTEM, PROMPT.format(profile=profile, draft=json.dumps(draft, ensure_ascii=False)),
                               web_search=True, max_tokens=16000)
    fc = extract_json(text)

    result = dict(draft)
    for key in REQUIRED:
        if fc.get(key):
            result[key] = fc[key]

    unresolved = list(fc.get("unresolved") or [])
    unresolved += problems(result)
    hits = banned_hits(result["article_markdown"] + result["linkedin_post"])
    if hits:
        unresolved.append("banned phrases present: " + ", ".join(hits))

    counts = {}
    for c in fc.get("checks", []):
        counts[c["status"]] = counts.get(c["status"], 0) + 1
        if c.get("source_url") and c["source_url"] not in [s["url"] for s in sources]:
            sources.append({"title": c.get("note") or c["source_url"], "url": c["source_url"]})

    status = "needs-review" if unresolved else "verified"
    summary = ", ".join(f"{v} {k}" for k, v in counts.items()) or "No external claims"
    if unresolved:
        summary += " · Needs review: " + "; ".join(unresolved)
    result["factcheck"] = {"status": status, "summary": summary, "checks": fc.get("checks", [])}
    result["sources"] = sources
    log("fact-check", f"Status: {status} ({summary})")
    return result
