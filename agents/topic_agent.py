"""Agent 1 — Topic: picks this week's topic from the backlog, or proposes new ones when it runs out."""
import yaml

from common import DRY_RUN, ROOT, ask_claude, extract_json, load_yaml, log

TOPICS_FILE = ROOT / "content" / "topics.yaml"
HEADER = ("# Topic backlog. The Topic agent picks the first \"pending\" topic each week.\n"
          "# Add your own ideas at the top. When the list runs out, the agent proposes new ones itself.\n\n")


def save(data):
    TOPICS_FILE.write_text(HEADER + yaml.safe_dump(data, sort_keys=False, allow_unicode=True), encoding="utf-8")


def pick_topic():
    data = load_yaml("content/topics.yaml")
    pending = [t for t in data["topics"] if t.get("status") == "pending"]
    if pending:
        log("topic", f"Picked from backlog: {pending[0]['title']}")
        return pending[0]
    if DRY_RUN:
        raise RuntimeError("Backlog empty — add topics to content/topics.yaml")

    log("topic", "Backlog empty — asking Claude for fresh topics")
    profile = load_yaml("content/profile.yaml")
    done = [t["title"] for t in data["topics"]]
    text, _ = ask_claude(
        system="You plan a weekly professional article series. Reply with JSON only.",
        prompt=(
            f"Author profile:\n{yaml.safe_dump(profile)}\n\nAlready covered:\n- " + "\n- ".join(done) +
            "\n\nPropose 5 new topics. Each must be a real organisational problem in banking/fintech risk, "
            "operations or analytics that the author could solve with analytics, automation or AI, "
            "and where ROI or operational gain can be measured. "
            'Return {"topics":[{"title":"...","angle":"..."}]}'
        ),
    )
    new = [{**t, "status": "pending"} for t in extract_json(text)["topics"]]
    data["topics"].extend(new)
    save(data)
    return new[0]


def mark_used(title, date):
    data = load_yaml("content/topics.yaml")
    for t in data["topics"]:
        if t["title"] == title:
            t["status"] = f"used {date}"
    save(data)
