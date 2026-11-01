---
title: 'Fraud model ROI: look past the detection rate'
slug: fraud-model-roi-look-past-the-detection-rate
date: '2026-11-01'
category: Fraud Risk
status: draft
test_run: false
market: Global
scenario: a mid-sized multi-country retail bank (a composite, not a real institution)
publish_at: null
review_issue: null
reminded: false
summary: A fraud model's detection rate tells you what it caught, not what it cost you. Here is one simple view that puts losses prevented, false-positive cost, customer friction and analyst time on the same page.
hook:
  question: In the Global Anti-Scam Alliance's 2025 global survey of 46,000 adults across 42 markets, what share of adults said they had experienced a scam in the previous 12 months?
  min: 0
  max: 100
  step: 1
  start: 30
  unit: '%'
  answer: 57
  answer_label: 57%
  explain: The Global Anti-Scam Alliance's Global State of Scams 2025 report, a survey of 46,000 adults in 42 markets, found that 57% of adults had experienced a scam in the past 12 months and 23% had lost money. It estimated losses of about USD 442 billion across the surveyed markets.
  source_url: https://gasa.org/knowledge-base/blog/global-scams-on-the-rise-over-half-of-adults-worldwide-report-scam-encounters
star:
  situation: A composite retail bank has a fraud model with a good detection rate, but rising alert queues and angry customers.
  task: Show leadership the model's true net value, including false-positive cost, customer friction and analyst time.
  action: 'Build one monthly view: losses prevented minus all-in false-alert cost minus run cost, then compare challenger and incumbent.'
  result: 'Illustrative: the challenger lifts net value by about USD 240k a month and frees roughly 1,200 analyst hours.'
process:
- title: Score models on same traffic
  detail: Run incumbent and challenger on the same period so differences come from the model, not the data.
- title: Measure losses prevented
  detail: Count fraud value stopped, not only the share of cases caught, so the benefit is in currency.
- title: Price a false alert
  detail: Combine analyst minutes with customer friction (abandonment, calls, attrition) into one all-in cost per false alert.
- title: Net out and add run cost
  detail: Subtract false-alert cost and model run cost from losses prevented to get a monthly net value.
- title: Stress-test and refresh monthly
  detail: Flex the friction cost and fraud mix, then re-run each month so the view tracks drift.
calculator:
  title: What is your fraud model's net monthly value?
  inputs:
  - id: fraud_prevented_k
    label: Fraud losses prevented per month
    value: 1000
    min: 100
    max: 10000
    step: 50
    unit: USD thousand
  - id: false_alerts
    label: False alerts per month
    value: 18000
    min: 1000
    max: 200000
    step: 500
    unit: alerts
  - id: cost_per_alert
    label: All-in cost per false alert (analyst time + customer friction)
    value: 15
    min: 1
    max: 60
    step: 1
    unit: USD
  formula: fraud_prevented_k * 1000 - false_alerts * cost_per_alert
  result_label: Net monthly value before model run cost
  result_unit: USD
  basis: 'Illustrative model: losses prevented minus false alerts multiplied by an assumed all-in cost per alert. Run cost, qualitative brand effects and fraud mix changes are excluded; replace all inputs with your own measured data.'
roi:
- metric: Net monthly gain from challenger over incumbent (after USD 40k extra run cost)
  value: USD 240k
  basis: 'Illustrative model: USD 100k extra fraud stopped plus USD 180k lower false-alert cost, less USD 40k run cost'
- metric: Annualised net gain
  value: about USD 2.9 million
  basis: 'Illustrative model: USD 240k × 12 months, to be shown as a range with sensitivity on friction cost'
- metric: Analyst hours freed per month
  value: about 1,200 hours
  basis: 'Illustrative model: 12,000 fewer false alerts × 6 minutes each'
myth_fact:
- statement: A higher detection rate always means a fraud model delivers better ROI.
  fact: false
  explain: Detection rate (recall) is true positives divided by true positives plus false negatives, so it ignores false positives. A model can catch more fraud and still lose value through alert cost and customer friction.
- statement: More than half of adults surveyed worldwide reported experiencing a scam in the past year (GASA, Global State of Scams 2025).
  fact: true
  explain: The Global Anti-Scam Alliance's Global State of Scams 2025 report, covering 46,000 adults in 42 markets, put the figure at 57% of adults, with 23% reporting they lost money.
- statement: The USD 442 billion scam-loss figure in GASA's 2025 report is a count of losses reported by banks.
  fact: false
  explain: It is a survey-based estimate for the 42 markets surveyed, not audited bank-reported losses, so it indicates scale rather than a ledger of fraud.
image: media/fraud-model-roi-look-past-the-detection-rate/star-card.png
factcheck:
  status: needs-review
  summary: '4 corrected, 3 verified · Needs review: GASA appears to have run a 2026 global survey (58,900 respondents, 42 markets), and regional 2026 reports (US, Europe, Asia, Brazil, Spain) have been published. I could not find the 2026 global headline figures (share of adults scammed, total losses). Before publishing, check gasa.org for a Global State of Scams 2026 release and update the 57% and USD 442 billion figures and the year if it is out.; GASA''s 2025 report also gives a broader ''encountered a scam'' measure of about seven in ten adults. The article uses the narrower ''experienced a scam'' figure of 57%, which matches GASA''s headline wording. The full report is member-only, so I checked the figures through GASA''s press release and homepage and not the full PDF.; The scenario inputs (USD 30/hour analyst cost, USD 12 friction cost, 6 minutes per alert, USD 40k run cost, alert volumes) are invented assumptions and are labelled illustrative. They are not benchmarked against any
    external source.'
sources:
- title: GASA, Global State of Scams 2025 press release (Oct 2025)
  url: https://gasa.org/knowledge-base/blog/global-scams-on-the-rise-over-half-of-adults-worldwide-report-scam-encounters
- title: GASA, Global State of Scams Report 2024 press release
  url: https://gasa.org/knowledge-base/blog/global-state-of-scams-report-2024-1-trillion-stolen-in-12-months-gasa-feedzai
- title: GASA, Global Anti-Scam Alliance Policy Agenda 2026
  url: https://gasa.org/knowledge-base/blog/gasa-policy-agenda-2026
- title: GASA, State of Scams Brazil 2025 release (methodology note)
  url: https://gasa.org/knowledge-base/blog/new-report-reveals-brazilians-face-252-scam-encounters-annually-despite-high-confidence-in-spotting
- title: scikit-learn, sklearn.metrics.recall_score documentation
  url: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.recall_score.html
- title: Internal arithmetic check (illustrative model, no external source)
  url: https://gasa.org/
linkedin_post: 'Your fraud model catches 95% of fraud. Great. What did it cost to get there?


  That question usually gets a very thoughtful silence, so I put together a simple view for this week''s VertexNode.


  Three things I''d put on one page:


  1. Losses prevented, in currency, not just a percentage.

  2. The all-in cost of a false alert: analyst minutes plus the customer who abandoned the payment or phoned the contact centre.

  3. Run cost, so the model pays its own way on paper.


  In my illustrative example, a challenger that stops slightly more fraud but raises far fewer false alerts adds about USD 240k a month. Most of that comes from not bothering good customers.


  A model that blocks every transaction has a perfect detection rate and a very short career. The honest number is the net one.


  For context, the Global Anti-Scam Alliance''s 2025 report found 57% of surveyed adults had experienced a scam in the past year, so the pressure to catch more is not going away.


  Which cost is hardest to measure in your world: customer friction, analyst time or something else?'
linkedin_shared: false
---

## The problem

Most fraud teams can recite their detection rate. Ask for the model's *net* value and the room gets quieter, usually followed by someone discovering an urgent call.

The pressure to get this right is global. The Global Anti-Scam Alliance's *Global State of Scams 2025* report, a survey of 46,000 adults across 42 markets, found that 57% of adults had experienced a scam in the previous 12 months. It estimated losses at roughly USD 442 billion across the markets surveyed. That figure is a survey-based estimate, not a ledger of bank-reported fraud, so I treat it as a sense of scale rather than a number to budget against. Still, it helps explain why banks are asked to catch more.

Here is the trap. Detection rate (recall) measures the share of fraud you caught. By definition it is true positives divided by true positives plus false negatives, so it says nothing about how many good customers you disturbed along the way. A model that blocks every transaction has a perfect detection rate and a zero percent chance of being invited back to the budget meeting.

So a model's real cost sits in places the headline metric cannot see:

- **False positives:** genuine transactions declined or held.
- **Customer friction:** step-up challenges, abandoned payments, calls to the contact centre, and the customer who quietly moves their spending to another card.
- **Analyst time:** every alert someone has to open, read and close.
- **Run cost:** data, compute, monitoring and model governance.

If these sit in four different reports owned by four different teams, nobody sees the whole picture, and the model gets judged on whichever number is most flattering.

## How I'd solve it

This is an **illustrative scenario**: a composite mid-sized retail bank, not a real institution. All figures are in US dollars and are invented to show the mechanics.

The bank runs an incumbent model and has built a challenger. Both are scored against the same month of traffic. Fraud attempts in the period total about USD 1.5 million.

I would build a single view with one line per model and four steps.

**Step 1: Losses prevented.** The incumbent stops USD 900k, a 60% detection rate. The challenger stops USD 1.0 million, about 67%. That is the number everyone already quotes.

**Step 2: Price a false alert honestly.** This is the step teams skip. I would split the cost into two parts:

- *Analyst time:* about 6 minutes per alert at an all-in cost of USD 30 an hour is roughly USD 3.
- *Customer friction:* a share of alerts lead to an abandoned payment, a contact-centre call or a lost card relationship. Assume USD 12 on average across all false alerts.

That gives an all-in cost of about **USD 15 per false alert**. Both inputs are assumptions, which is why I would measure them from the bank's own data (call logs, abandonment rates, handling times) before trusting the view.

**Step 3: Count the false alerts.** The incumbent raises 30,000 a month. The challenger raises 18,000.

**Step 4: Net it out.**

| | Incumbent | Challenger |
|---|---|---|
| Losses prevented | USD 900k | USD 1,000k |
| False alerts | 30,000 | 18,000 |
| False-alert cost (at USD 15) | USD 450k | USD 270k |
| **Net value before run cost** | **USD 450k** | **USD 730k** |

The challenger is better on catching fraud, but the bigger story is the false-alert line. Most of the gain comes from *not* bothering good customers.

I would then subtract the extra run cost of the challenger (assume USD 40k a month for added data and monitoring) and show the result with a simple range, not a single point. If the friction cost per alert is half my estimate, does the challenger still win? If it is double, how much better does it look? A view that survives those questions is one a finance partner will actually sign.

Two practical habits help. First, keep one owner for the view, usually the fraud strategy lead, with finance validating the unit costs. Second, refresh it monthly, because fraud mix and customer behaviour drift, and a model's net value drifts with them.

## Benefit evaluation

Here is the maths from the scenario, shown plainly.

**Monthly uplift.** Challenger net value of USD 730k minus incumbent net value of USD 450k is USD 280k. Subtract USD 40k of added run cost and the net monthly gain is **USD 240k**.

**Annualised.** USD 240k × 12 is about **USD 2.9 million** a year. This is an illustrative model, so I would present it as a range and not a promise.

**Where it comes from.**

- Extra fraud stopped: USD 100k a month.
- Lower false-alert cost: USD 180k a month (12,000 fewer alerts × USD 15).
- Less the USD 40k run cost.

**Operational gain.** 12,000 fewer false alerts × 6 minutes is 72,000 minutes, or about **1,200 analyst hours a month**. I would not count all of that as headcount savings. The more realistic use is redeploying those hours to complex cases, such as authorised push payment scams, where human judgement matters most.

**Automation value.** If the cleanest low-risk alerts can be auto-closed or auto-released under agreed rules, analyst time per alert falls further. That should be modelled as a separate scenario with its own controls, not folded quietly into the base case.

**What this view will not capture.** Long-term customer trust, brand damage after a high-profile incident and regulatory consequences are real but hard to price. I would list them beside the number as qualitative notes. Pretending they are zero is as misleading as inventing a precise value for them.

The point of the exercise is not a prettier ROI slide. It is that the team can now answer the question "is this model worth what it costs us?" in one page, using the same numbers across fraud, operations, customer experience and finance.

## Takeaways

- Detection rate is necessary but not sufficient. Always pair it with false-positive volume and cost.
- Price a false alert in full: analyst minutes plus customer friction, using your own data.
- Put losses prevented, false-alert cost, analyst hours and run cost in one monthly view with one owner.
- Show sensitivity, not a single number. If the answer holds when friction costs double or halve, it is credible.
- Redeploy analyst hours to the cases where people add the most value, instead of simply counting them as savings.
