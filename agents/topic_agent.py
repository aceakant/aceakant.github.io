"""Agent 1 — Topic: picks this week's topic from the backlog, or proposes new ones when it runs out."""
import yaml

from common import DRY_RUN, ROOT, ask_claude, config, extract_json, load_yaml, log

TOPICS_FILE = ROOT / "content" / "topics.yaml"
HEADER = ("# Topic backlog. The Topic agent picks the first \"pending\" topic each week (international markets only;\n"
          "# see topics.markets in config.yaml). Add your own ideas anywhere; order = publishing order.\n"
          "# When the list runs out, the agent proposes new ones itself.\n\n")


def save(data):
    TOPICS_FILE.write_text(HEADER + yaml.safe_dump(data, sort_keys=False, allow_unicode=True), encoding="utf-8")


def pick_topic():
    data = load_yaml("content/topics.yaml")
    t_cfg = config().get("topics") or {}
    allowed = set(t_cfg.get("markets") or {}) - set(t_cfg.get("excluded_markets") or [])
    pending = [t for t in data["topics"] if t.get("status") == "pending" and (not allowed or t.get("market") in allowed)]
    if pending:
        log("topic", f"Picked from backlog: {pending[0]['title']}")
        return pending[0]
    if DRY_RUN:
        raise RuntimeError("Backlog empty — add topics to content/topics.yaml")

    log("topic", "Backlog empty — asking Claude for fresh topics")
    profile = {k: load_yaml("content/profile.yaml")[k] for k in ("skills", "regulation")}
    done = [t["title"] for t in data["topics"]]
    text, _ = ask_claude(
        system="You plan a weekly professional article series. Reply with JSON only.",
        prompt=(
            f"Author profile:\n{yaml.safe_dump(profile)}\n\nAlready covered:\n- " + "\n- ".join(done) +
            "\n\nPropose 5 new OPEN topics (industry problems, not about any employer). Each must be a real "
            "organisational problem in banking/fintech risk, operations or analytics, solvable with analytics, "
            f"automation or AI, with measurable ROI. Give each exactly one market from: {', '.join(sorted(allowed))}. "
            f"Never India. Spread the mix in this priority order: {', '.join(t_cfg.get('market_focus') or sorted(allowed))}, "
            "and don't use the same market twice in a row. "
            'Return {"topics":[{"title":"...","angle":"...","market":"UK"}]}'
        ),
    )
    new = [{**t, "status": "pending"} for t in extract_json(text)["topics"] if not allowed or t.get("market") in allowed]
    if not new:
        raise RuntimeError("No usable topics proposed")
    data["topics"].extend(new)
    save(data)
    return new[0]


def mark_used(title, date):
    data = load_yaml("content/topics.yaml")
    for t in data["topics"]:
        if t["title"] == title:
            t["status"] = f"used {date}"
    save(data)
