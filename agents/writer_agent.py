"""Agent 2 — Writer: drafts the week's piece in the same playful frame every week:
Guess-the-number hook → STAR → article → process steps → ROI calculator → Myth or Fact → takeaways."""
import yaml

from common import DRY_RUN, ROOT, ask_claude, config, extract_json, load_yaml, log, slugify

SYSTEM = """You are the ghost-writer for {author}, a senior risk-analytics leader. You write his weekly piece for his series "{series}"
on an OPEN industry subject: the problem, how a practitioner would solve it, and what it is worth.

VOICE: {voice}
The piece should make a busy professional smile at least once (a light line, a relatable moment),
while staying credible to bank executives and recruiters. No jokes at anyone's expense.
Never use these phrases: {banned}.

STRICT RULES
1. NO EMPLOYERS. Never name or hint at the author's current or past employers or clients,
   and never claim a personal result. Write as an experienced practitioner explaining an approach.
2. STAR = ILLUSTRATIVE SCENARIO. The STAR story describes a realistic, composite organisation
   (e.g. "a mid-sized Indian NBFC", "a UK retail bank"), never a real one. Say so in the text.
3. ONE MARKET. This week's market is: {market}. Every statistic, regulation, example and currency
   must come from that market. (Global = cross-market sources such as BIS, FATF, IMF, World Bank,
   or clearly global studies. UK and EU are separate markets: UK uses FCA/PSR/Bank of England/UK Finance,
   EU uses EBA/ECB/European Commission/Europol.) Never mix markets, e.g. no US figures in an India piece.
4. LATEST DATA. Use the most recent published figure; give its year.
5. Every statistic, the hook answer and every Myth/Fact answer must be checkable online. List each
   in "claims". Modelled ROI must say "Illustrative model" in its basis.

ARTICLE BODY (markdown, these H2 headings in this order, no H1):
## The problem
## How I'd solve it    (the illustrative STAR scenario as a short narrative)
## Benefit evaluation  (ROI, operational gains, automation, analytics value — explain the maths)
## Takeaways           (3-5 bullets)
Length: {words} words."""

PROMPT = """TOPIC: {title}
ANGLE: {angle}
MARKET: {market}

AUTHOR'S AREAS OF EXPERTISE (for depth and tone only; not to be quoted as results):
{expertise}

ANONYMISED NOTES FROM THE AUTHOR (optional; use the ideas, never names or numbers that identify an employer):
{notes}

Return ONLY a JSON object with exactly these keys:
{{
  "title": "headline in sentence case (capital only on the first word, proper nouns and acronyms), max 12 words",
  "category": "one of: Fraud Risk | Credit Risk | Automation | Data Analytics | GenAI | Team & Process",
  "summary": "2 sentences for the Weekly Updates page",
  "scenario": "who the illustrative STAR organisation is, e.g. 'a mid-sized Indian NBFC'",
  "hook": {{"question": "a surprising 'guess the number' question about the problem, in this market",
            "min": 0, "max": 100, "step": 1, "start": 50, "unit": "% or a short unit",
            "answer": 42, "answer_label": "42%", "explain": "1-2 sentences, names the source and year", "source_url": "https://..."}},
  "star": {{"situation": "<=22 words", "task": "<=22 words", "action": "<=22 words", "result": "<=22 words, an illustrative outcome"}},
  "article_markdown": "the body as specified",
  "process": [{{"title": "3-6 words", "detail": "1-2 sentences"}}],
  "calculator": {{"title": "e.g. How many hours could your team get back?",
                  "inputs": [{{"id": "short_snake_case", "label": "...", "value": 6, "min": 1, "max": 50, "step": 1, "unit": "..."}}],
                  "formula": "arithmetic using only input ids, numbers, + - * / ( )",
                  "result_label": "...", "result_unit": "...", "basis": "Illustrative model: ..."}},
  "roi": [{{"metric": "...", "value": "...", "basis": "source + year, or Illustrative model"}}],
  "myth_fact": [{{"statement": "...", "fact": true, "explain": "1-2 sentences"}}],
  "linkedin_post": "120-200 words: a hook line, 3 short insight lines, a light touch of humour, a question to readers. No link, no hashtags, no employer names.",
  "claims": ["each checkable claim, one per item"]
}}
Use 4-5 process steps, 2-3 calculator inputs, 3 ROI rows, exactly 3 myth_fact items (mix of myths and facts).
Use the market's currency in the calculator where money is involved."""


def read_case_notes(topic_title):
    folder = ROOT / "content" / "case_notes"
    key_words = set(slugify(topic_title).split("-")) - {"a", "an", "the", "to", "of", "and", "in", "with", "for", "off"}
    notes = [f"--- {f.name} ---\n{f.read_text(encoding='utf-8')}"
             for f in folder.glob("*.md") if f.name != "README.md" and key_words & set(f.stem.split("-"))]
    return "\n\n".join(notes) or "None for this topic."


def write(topic):
    if DRY_RUN:
        log("writer", "DRY RUN — using built-in sample draft")
        return SAMPLE
    cfg = config()
    system = SYSTEM.format(
        author=cfg["site"]["author"], voice=cfg["writing_rules"]["voice"],
        banned=", ".join(f'"{p}"' for p in cfg["writing_rules"]["banned_phrases"]),
        words=cfg["agents"]["article_words"], market=topic.get("market", "Global"),
        series=cfg["site"].get("weekly_name", "Weekly"),
    )
    profile = load_yaml("content/profile.yaml")
    prompt = PROMPT.format(
        title=topic["title"], angle=topic.get("angle", ""), market=topic.get("market", "Global"),
        expertise=yaml.safe_dump({"skills": profile["skills"], "regulation": profile["regulation"]}, allow_unicode=True),
        notes=read_case_notes(topic["title"]),
    )
    log("writer", "Drafting with Claude…")
    text, _ = ask_claude(system, prompt, max_tokens=16000)
    draft = extract_json(text)
    draft["market"] = topic.get("market", "Global")
    log("writer", f"Draft ready: {draft['title']}")
    return draft


# ---------------------------------------------------------------- dry-run sample
SAMPLE = {
    "title": "Taking routine fraud analytics off the risk team's plate",
    "category": "GenAI",
    "market": "Global",
    "scenario": "a mid-sized retail lender (illustrative)",
    "summary": "Fraud analysts lose hours every week to repeat data pulls and MIS. Here is how an LLM-based analytics agent takes over that routine work, safely, and how to measure what it gives back.",
    "hook": {
        "question": "Out of a 40-hour week, how many hours do you think a typical analyst spends on routine data pulls and reports?",
        "min": 0, "max": 40, "step": 1, "start": 10, "unit": "hours",
        "answer": 16, "answer_label": "about 16 hours (sample figure)",
        "explain": "SAMPLE ONLY: in a live run, the fact-checker replaces this with a sourced figure or removes the question.",
        "source_url": "",
    },
    "star": {
        "situation": "Fraud analysts spent a large share of each week on repeat data pulls, MIS refreshes and ad-hoc business queries.",
        "task": "Free analyst time for investigations and model work without weakening data controls or audit trails.",
        "action": "Built an LLM-based agent that runs approved queries, drafts MIS commentary and logs every step for review.",
        "result": "Routine requests answered in minutes; analysts spend the freed time on new fraud patterns (illustrative).",
    },
    "article_markdown": """## The problem

Ask a fraud risk team where its week goes and the honest answer is rarely "catching fraudsters". It goes on refreshing the same dashboards, pulling the same cuts of data for different stakeholders, and explaining (again) why a number moved on Tuesday. Important work, yes. Exciting? Ask anyone who has rebuilt the same pivot table for the ninth Monday in a row.

## How I'd solve it

Picture a mid-sized retail lender (an illustrative example, not a real company).

**Situation.** Its analysts were spending a big part of every week on repeat data pulls, MIS refreshes and one-off questions from business teams.

**Task.** Give that time back to investigation and model work, without loosening data access or losing the audit trail regulators expect.

**Action.** Build an LLM-based agent that works only through approved, read-only query templates. It turns a business question into a query, runs it, sanity-checks the output and drafts a short commentary. Every prompt, query and answer is logged.

**Result.** Routine requests take minutes instead of sitting in a queue, and the team's time goes back to finding new fraud patterns.

## Benefit evaluation

Keep the maths simple and honest. If six analysts each spend five hours a week on routine pulls, that is about 30 hours a week, close to one full-time analyst, returned to higher-value work. Add faster turnaround for business teams and fewer manual errors in MIS. Measure three things before and after: hours on routine requests, turnaround time, and rework rate.

## Takeaways

- Start with the most repeated request, not the hardest one.
- Restrict the agent to approved, read-only queries from day one.
- Keep a human check on anything that leaves the team.
- Log everything; audit and model-risk reviews become easy.
- Measure hours returned and turnaround, not "AI adoption".
""",
    "process": [
        {"title": "Business asks in plain language", "detail": "Requests come through one shared channel instead of emails to individual analysts."},
        {"title": "Agent picks an approved template", "detail": "It can only run read-only queries the team has signed off, so no surprise data access."},
        {"title": "Agent runs, checks and drafts", "detail": "It sanity-checks totals against known control numbers and drafts a short commentary."},
        {"title": "Analyst four-eyes check", "detail": "Anything that leaves the team or feeds a decision gets a human review first."},
        {"title": "Log and improve weekly", "detail": "Every prompt, query and answer is stored; corrected answers become new templates."},
    ],
    "calculator": {
        "title": "How many hours could your team get back each year?",
        "inputs": [
            {"id": "analysts", "label": "Analysts on the team", "value": 6, "min": 1, "max": 50, "step": 1, "unit": "people"},
            {"id": "hours", "label": "Routine hours per analyst, per week", "value": 5, "min": 1, "max": 20, "step": 1, "unit": "hrs"},
            {"id": "share", "label": "Share the agent can take over", "value": 60, "min": 10, "max": 90, "step": 5, "unit": "%"},
        ],
        "formula": "analysts * hours * share / 100 * 46",
        "result_label": "Hours returned per year",
        "result_unit": "hours",
        "basis": "Illustrative model: analysts × routine hours × share automated × 46 working weeks.",
    },
    "roi": [
        {"metric": "Analyst hours returned per week", "value": "~30 hrs", "basis": "Illustrative model: 6 analysts × 5 hrs of routine work"},
        {"metric": "Turnaround on ad-hoc requests", "value": "Days → minutes", "basis": "Illustrative; measure before and after in your setup"},
        {"metric": "Manual MIS errors", "value": "Fewer", "basis": "Illustrative; track rework rate before and after"},
    ],
    "myth_fact": [
        {"statement": "An analytics agent should get full database access so it can answer anything.", "fact": False, "explain": "Myth. Read-only, approved templates keep it safe and auditable. Freedom is not a feature here."},
        {"statement": "Logging every prompt and query makes audits easier, not harder.", "fact": True, "explain": "Fact. A full log answers 'where did this number come from?' in seconds."},
        {"statement": "The best first use case is the hardest problem you have.", "fact": False, "explain": "Myth. Start with the most repeated request; that is where the hours are."},
    ],
    "linkedin_post": "Most fraud teams don't spend their week fighting fraud.\n\nThey spend it rebuilding the same pivot table every Monday. (You know the one.)\n\nWe changed that with an LLM-based analytics agent:\n→ It runs only approved, read-only queries\n→ An analyst checks anything that leaves the team\n→ Every step is logged for audit\n\nRoutine requests now take minutes, and the team's time goes back to finding new fraud patterns.\n\nThis week's piece has a 30-second guessing game and a calculator to see how many hours your team could win back.\n\nWhat's the one report your team rebuilds every single week?",
    "claims": [],
}
