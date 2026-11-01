---
title: What I'd let an LLM agent do in fraud analytics, and what I wouldn't
slug: what-id-let-an-llm-agent-do-in-fraud-analytics-and-what-i
date: '2026-11-01'
category: GenAI
status: hold
publish_at: null
review_issue: 1
reminded: false
summary: An LLM agent can take the repeatable analytics work off a fraud team's plate, but only if its limits are set before its first query. Here is where I think it fits, what it should never touch, and a simple way to count the hours it gives back.
hook:
  question: By what percentage did consumer-reported fraud losses in the US rise in 2024 compared with 2023?
  min: 0
  max: 100
  step: 1
  start: 50
  unit: '%'
  answer: 25
  answer_label: 25%
  explain: The US Federal Trade Commission reported that consumers lost more than $12.5 billion to fraud in 2024, up 25% on the prior year, when reported losses had passed $10 billion for the first time.
  source_url: https://www.ftc.gov/news-events/news/press-releases/2025/03/new-ftc-data-show-big-jump-reported-losses-fraud-125-billion-2024
star:
  situation: Fraud risk at L&T Finance needed a dedicated analytics function of its own.
  task: Build the team and catch fraud earlier in the customer journey.
  action: Built the Fraud Risk Analytics team from scratch, plus an LLM-based agent for routine data analytics, with logging and human review.
  result: Fraud early-detection rose 20%.
process:
- title: List the routine requests
  detail: Write down the recurring analytics asks and how long each takes by hand. This becomes your baseline.
- title: Pick checkable tasks only
  detail: Start with work where a reviewer can tell quickly whether the answer is right, such as standard cuts and recurring MI.
- title: Set the hard limits
  detail: 'Write down what the agent never does: customer decisions, production rule changes, unreviewed regulatory figures.'
- title: Log and review everything
  detail: Record each request, the work run and the reviewer, so any output can be reconstructed and challenged.
- title: Measure net hours back
  detail: Track agent share, turnaround, rework and override rate. Subtract review time and redirect the savings to detection work.
calculator:
  title: How many hours could your team get back each week?
  inputs:
  - id: requests_per_week
    label: Routine analytics requests per week
    value: 40
    min: 1
    max: 200
    step: 1
    unit: requests
  - id: manual_minutes
    label: Average manual time per request
    value: 45
    min: 5
    max: 240
    step: 5
    unit: minutes
  - id: agent_share
    label: Share of requests the agent handles
    value: 50
    min: 0
    max: 100
    step: 5
    unit: '%'
  formula: requests_per_week * (agent_share / 100) * manual_minutes * 0.75 / 60
  result_label: Net analyst hours back per week
  result_unit: hours
  basis: 'Illustrative model: assumes human review of agent output costs 25% of the original manual time, so the net saving per handled request is 75%. It excludes build, tooling and validation costs. Inputs are your own estimates, not L&T Finance figures.'
roi:
- metric: Fraud early-detection uplift at L&T Finance
  value: +20%
  basis: Measured result of the overall programme (team build plus LLM-based analytics agent). Not attributable to the agent alone.
- metric: Net analyst hours back per week (example team)
  value: about 11 hours
  basis: 'Illustrative model: 40 requests x 50% agent share x 45 minutes x 75% net of review / 60 = 11.25 hours. Not an L&T Finance figure.'
- metric: Annual analyst capacity returned (example team)
  value: about 517 hours, or roughly 0.3 FTE
  basis: 'Illustrative model: 11.25 weekly hours x 46 working weeks, divided by an assumed 1,800 hours per FTE-year. Not an L&T Finance figure.'
myth_fact:
- statement: LLMs can produce fluent text that is wrong or unfaithful to its source.
  fact: true
  explain: This is documented as hallucination, for example in Ji et al., 'Survey of Hallucination in Natural Language Generation' (ACM Computing Surveys, vol. 55, no. 12, 2023). It is why human review of agent output matters.
- statement: SR 11-7 is still the current US supervisory guidance on model risk management.
  fact: false
  explain: On 17 April 2026 the Federal Reserve, OCC and FDIC issued revised guidance (SR 26-2) that replaced SR 11-7. It keeps core principles such as effective challenge and independent review.
- statement: US consumer-reported fraud losses fell in 2024 compared with 2023.
  fact: false
  explain: The FTC reported more than $12.5 billion in consumer fraud losses for 2024, a 25% increase over the prior year.
image: media/what-id-let-an-llm-agent-do-in-fraud-analytics-and-what-i/star-card.png
factcheck:
  status: needs-review
  summary: '4 verified, 7 corrected, 3 removed, 1 personal-ok · Needs review: SR 26-2 was verified only through secondary sources (law-firm and vendor summaries). Please check the primary text on federalreserve.gov. Several secondary sources say SR 26-2 may carve generative or agentic AI out of model-risk scope. The article makes no claim either way, so confirm the scope before adding one.; The FTC figure is for 2024. FTC data for 2025 may already have been published (the FTC announced 2025 fraud data in early 2026). Consider whether the hook and opening should use the newer figures.; The four ''should not'' lines and the three LinkedIn rules are now written as recommendations. Ajay Kant should confirm whether they match his actual practice at L&T Finance before wording them as ''I do''.; The ''Ji et al.'' myth/fact is worded in general terms. Check that it matches how the survey defines hallucination before publishing.'
sources:
- title: FTC press release, 10 March 2025. The draft's source URL was malformed (12-5 instead of 125) and has been fixed.
  url: https://www.ftc.gov/news-events/news/press-releases/2025/03/new-ftc-data-show-big-jump-reported-losses-fraud-125-billion-2024
- title: 'FTC: 25% rise, and 2023 was the first year losses topped $10 billion. Wording changed to ''more than $10 billion'' / ''more than $12.5 billion''.'
  url: https://www.ftc.gov/terms/consumer-sentinel-network
- title: ACM Computing Surveys 55(12), Article 248, published online March 2023. The statement was reworded to 'fluent text that is wrong or unfaithful to its source'.
  url: https://dl.acm.org/doi/10.1145/3571730
- title: SR 11-7 was replaced by SR 26-2 on 17 April 2026 (Fed/FDIC/OCC). The article and Myth/Fact item were rewritten. SR 26-2 is described by secondary sources as keeping effective challenge and independent review.
  url: https://www.bakertilly.com/insights/updated-interagency-guidance-on-model-risk-management
- title: 'Replaced with a verifiable item: SR 11-7 was superseded by SR 26-2 on 17 April 2026.'
  url: https://theworldofai.org/ai-compliance/sr-11-7/
- title: Central Bank of Ireland; ESMA also confirms the 17 January 2025 application date.
  url: https://www.centralbank.ie/regulation/digital-operational-resilience-act-dora
linkedin_post: 'Every fraud team seems to have a Monday request that returns each week in a slightly different outfit.


  It is the same cut of the same data, and it eats hours that new fraud patterns need.


  At L&T Finance I built the Fraud Risk Analytics team from scratch, along with an LLM-based agent for routine data analytics. It runs with logging and human review. Early-detection went up 20% across the programme. I would not credit the agent alone, and I will not pretend I have a tidy hours-saved figure to quote.


  Three rules I''d hold to:


  1. The agent gets repeatable, checkable work. It should never make customer decisions or change production rules.

  2. If you cannot reconstruct what it ran and who reviewed it, treat the work as not done.

  3. Count net hours, not gross. Review time is the number that keeps the maths honest.


  The agent has not yet found a way to be late to a meeting, which is more than I can say for most of us. That is a genuine point in its favour.


  If you run a risk or fraud team: which routine task would you hand over first, and which would you never let go?'
linkedin_shared: false
---

## The problem

Fraud keeps growing. The US Federal Trade Commission reported that consumers lost more than $12.5 billion to fraud in 2024, up 25% on the prior year, when reported losses had topped $10 billion for the first time. That is one country's consumer-reported figure, but it is a useful signal of direction.

Analytics capacity is finite, and much of what analysts do each week is not detection work at all. It is the refresh of a monitoring pack, a cut of alerts by channel, a reconciliation between two data sources, or a 'quick look' at why a rule's hit rate moved.

Every fraud team seems to have one request that arrives every Monday wearing a slightly different outfit. It is the same request each time. Nobody minds answering it, but the answering uses up the hours that new fraud patterns need.

So the question I care about is not 'can an LLM do fraud analytics?' It is narrower and more useful: which part of the routine work can an agent carry, and what should stay firmly with people?

## What I did

At L&T Finance, fraud risk needed an analytics function of its own. The task was to build that team and catch fraud earlier in the customer journey.

I built the Fraud Risk Analytics team from scratch. Alongside it, I built an LLM-based agent that handles routine data analytics work. It runs with logging and human review.

The result I can stand behind is that fraud early-detection went up 20%. I want to be careful about how I read that number. It came from the whole programme: the team, the data, the strategies and the agent. I would not credit the agent alone, and there is no measured hours-saved figure behind this article. What follows is how I would reason about the agent's place, and how I would measure what it gives back.

**Where an agent fits.** The best candidates are tasks that are repeatable, well defined and easy to check. Examples are standard portfolio and alert cuts, recurring management information, first-pass exploration of a metric that moved, and writing down definitions so the next analyst does not rediscover them. In each case a person can look at the output and tell quickly whether it is right.

**Where it should not go.** I would keep four lines clear:

- It does not make approve, decline or block decisions on customers or transactions. Those stay with rules, models and people who are accountable for them.
- It does not change rules, thresholds or models in production.
- It is not the only source for a number that goes to a regulator or a board without someone checking it.
- It does not run unlogged. If you cannot reconstruct what was asked, what was run and who reviewed it, treat the work as not done.

These lines are not about distrust of the technology. LLMs can produce fluent output that is wrong, a behaviour documented in the research literature as hallucination. A tidy paragraph with a wrong figure in it is worse than no paragraph, because it looks finished. Human review is how you catch that.

The governance side matters too. US model risk guidance has just moved on: the Federal Reserve, OCC and FDIC replaced SR 11-7 with SR 26-2 in April 2026, keeping effective challenge and independent review as core principles. Check with your model risk team how an analytics agent is treated under your own framework, and do not assume it sits outside it. In the EU, DORA, which has applied since 17 January 2025, covers ICT risk and third-party providers. Under any of these, a logged, reviewed agent is far easier to defend than an invisible one.

## Benefit evaluation

I would not measure an agent by how impressive its answers look. I would measure it by hours given back, net of the checking it creates.

The simple model is:

**hours back per week = requests per week × share the agent handles × manual minutes per request × (1 − review overhead) ÷ 60**

Here is an illustrative example. These are not L&T Finance figures. Say a team gets 40 routine analytics requests a week, and each takes 45 minutes by hand. Suppose the agent handles half of them. Reviewing its output costs about a quarter of the original effort, so the net saving per handled request is 75% of the manual time.

That gives 40 × 0.5 × 45 × 0.75 ÷ 60, which is about 11 hours a week. Over 46 working weeks that is roughly 517 hours, or about 0.3 of a full-time analyst at 1,800 hours a year. In 40-hour weeks, that is about 13 weeks of one analyst's time. It is not a headcount cut. It is a few months of analyst time per year, moved from re-running familiar work to investigating new fraud patterns.

The review overhead is the number people skip, and it is the one that keeps the model honest. If reviewing takes as long as doing the work, the benefit is zero. If the agent's share is small because the requests are messy, the benefit is small too. The model shows you which of those is happening.

There are other gains that are harder to put a price on:

- **Faster turnaround.** A routine question answered in minutes means decisions are made on fresher data.
- **Consistency.** The same definitions get applied every time, rather than varying by who picked up the request.
- **A trail.** Logging gives you an audit record that ad hoc spreadsheets rarely do.

The costs belong in the same ledger: build effort, tooling, validation and the reviewers' time.

To track whether it is working, I would watch four things: share of requests the agent handles, turnaround time, rework rate, and how often reviewers override or correct the output. A rising override rate is an early warning, and it is much cheaper to catch than a wrong number in a board pack.

The real prize is what the freed time should buy. At L&T Finance the aim was to catch fraud earlier in the customer journey, and the 20% improvement in early detection is the programme-level result of that effort.

## Takeaways

- Give an agent the repeatable, checkable analytics work, and keep decisions, production changes and regulatory sign-off with people.
- Design logging and human review in at the start. They are what make the agent defensible to model risk, audit and regulators.
- Measure net hours, not gross. Subtract the review time, or the maths flatters you.
- Track the override rate. It tells you early when the agent is drifting.
- Decide in advance what the freed hours are for. Better and earlier detection is the point, and faster Monday reports are only a side effect.
