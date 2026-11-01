---
title: 'APP scam reimbursement: where UK banks should now put detection money'
slug: app-scam-reimbursement-where-uk-banks-should-now-put
date: '2026-11-01'
category: Fraud Risk
status: hold
test_run: true
market: UK
scenario: a mid-sized UK retail bank (an illustrative composite, not a real institution)
publish_at: null
review_issue: null
reminded: false
summary: Since October 2024, UK banks must reimburse most APP scam victims, which turns fraud losses into a cost you can model line by line. Here is how the rules shift detection investment toward both sides of the payment, and how to size the impact.
hook:
  question: How much did UK victims lose to authorised push payment (APP) scams in 2025, in £ million?
  min: 0
  max: 1000
  step: 1
  start: 400
  unit: £m
  answer: 576
  answer_label: £576.4m
  explain: UK Finance's Annual Fraud Report 2026 put APP scam losses at £576.4 million for 2025, up 19% on the previous year, within total payment fraud losses of £1.28 billion.
  source_url: https://www.ukfinance.org.uk/news-and-insight/press-release/fraud-report-2026-press-release
star:
  situation: A composite UK retail bank faces mandatory APP reimbursement, with losses booked after the fact and mule detection run separately from outbound controls.
  task: Re-allocate the detection budget so that expected reimbursement cost falls, on both the sending and receiving side of each payment.
  action: Size exposure by leg, add outbound behavioural scoring and inbound mule detection, and build a five-day claims decisioning workflow.
  result: Illustratively, a 10% cut in reimbursable claims saves about £850k a year against a £400k programme cost.
process:
- title: Baseline exposure by leg
  detail: Split APP claims into outbound and inbound. Record count, average value, share reimbursed and share recovered from the other firm.
- title: Rank interventions by pound saved
  detail: Score outbound behavioural controls, inbound mule detection and claims automation on expected saving per pound spent.
- title: Build and tune with friction cost
  detail: Deploy models with proportionate friction and price every false positive so tuning optimises net outcome, not just detection rate.
- title: Design the five-day workflow
  detail: Collect evidence once, pre-fill the assessment and route claims by complexity so decisions meet the reimbursement deadline.
- title: Feed outcomes back
  detail: Use upheld and rejected claims as labels, and track reimbursed value, decision time and inbound mule catches monthly.
calculator:
  title: What could a better APP detection programme save each year?
  inputs:
  - id: claims
    label: Reimbursable APP claims per year
    value: 4000
    min: 500
    max: 50000
    step: 100
    unit: claims
  - id: avg_value
    label: Average claim value
    value: 2500
    min: 500
    max: 10000
    step: 100
    unit: £
  - id: prevent_pct
    label: Share of claims prevented by new controls
    value: 10
    min: 1
    max: 40
    step: 1
    unit: '%'
  formula: claims * avg_value * 0.85 * prevent_pct / 100
  result_label: Estimated annual reimbursement avoided (before programme and friction costs)
  result_unit: £
  basis: 'Illustrative model: assumes 85% of claim value is reimbursed and ignores the 50:50 receiving-firm contribution, programme cost and false-positive cost. All inputs are assumptions for a composite UK bank, not published benchmarks.'
roi:
- metric: Annual reimbursement avoided at a 10% reduction
  value: about £850,000
  basis: 'Illustrative model: 4,000 claims × £2,500 × 85% reimbursed × 10% prevented'
- metric: First-year ROI after £400k programme cost
  value: about 112% (about 88% after £100k friction cost)
  basis: 'Illustrative model: (£850k − £400k) / £400k; friction-adjusted (£850k − £500k) / £400k'
- metric: Payback period
  value: roughly 6 months before friction cost
  basis: 'Illustrative model: £400k cost / (£850k ÷ 12 months)'
myth_fact:
- statement: Under the PSR rules, only the sending bank bears the cost of an APP scam reimbursement.
  fact: false
  explain: The PSR's reimbursement requirement splits the cost 50:50 between the sending and receiving payment firms, which is why inbound mule detection now matters financially.
- statement: The PSR's mandatory reimbursement requirement caps compensation at £85,000 per claim.
  fact: true
  explain: The PSR set the maximum reimbursement level at £85,000 per claim for APP scams on Faster Payments and CHAPS, in force from 7 October 2024.
- statement: The mandatory reimbursement rules cover card payments and Bacs as well as Faster Payments and CHAPS.
  fact: false
  explain: The requirement applies to Faster Payments and CHAPS. Card payments and Bacs are outside its scope.
image: media/app-scam-reimbursement-where-uk-banks-should-now-put/star-card.png
factcheck:
  status: needs-review
  summary: '5 corrected, 8 verified · Needs review: The PSR plans a formal consultation on changes to the APP reimbursement policy in December 2026. The day-35 limit, investment-scam returns, data and consistency are all on the roadmap. The PSR is also being folded into the FCA under the Financial Services and Markets Bill 2026. Re-check the £85,000 cap, the 50:50 split and the scope before publication.; UK Finance''s 2025 growth rates (APP +19%, total +4%) imply that 2024 figures were restated upward from the originally published £450.7m and £1.17bn. The draft therefore uses 2025 figures only. A human should confirm against the UK Finance 2026 PDF.; The 85% ''share reimbursed'' is an illustrative assumption. The PSR dashboard reports about 88-89% of in-scope claimed losses refunded, and UK Finance reports 61% across all APP losses. Consider whether the author wants to align the assumption with one of these.; ''VertexNode'' appears in the LinkedIn post. It is not on the employer list, but
    confirm it is the correct publication name.; The hook answer is stored as an integer (576) for the slider. The label shows £576.4m.'
sources:
- title: 'UK Finance Annual Fraud Report 2026 (June 2026): APP losses £576.4m in 2025, up 19%. The hook was updated to this newer year. The 2024 comparator appears to have been restated, so it was dropped.'
  url: https://www.ukfinance.org.uk/news-and-insight/press-release/fraud-report-2026-press-release
- title: PSR PS25/5 consolidated policy statement
  url: https://www.psr.org.uk/media/rhelv4op/ps25-5-app-scams-reimbursement-consolidated-policy-statement-may-2025.pdf
- title: PSR PS24/7 (the Bank of England set the same limit for CHAPS)
  url: https://www.psr.org.uk/publications/policy-statements/ps247-faster-payments-app-scams-reimbursement-requirement-confirming-the-maximum-level-of-reimbursement/
- title: Farrer summary of PSR/Pay.UK rules; also PSR evaluation coverage, July 2026
  url: https://www.farrer.co.uk/news-and-insights/authorised-push-payment-fraud-and-mandatory-reimbursement/
- title: 'PSR consumer page: no reimbursement if complicit or grossly negligent; the exception does not apply to vulnerable consumers'
  url: https://www.psr.org.uk/information-for-consumers/app-fraud-reimbursement-protections/
- title: 'Take Five / UK Finance guide: covered are Faster Payments and CHAPS; card payments are not covered. Bratby Law lists Bacs credit as outside scope.'
  url: https://www.takefive-stopfraud.org.uk/protect-yourself/app-guide/
- title: 'FCA: open products and services from 31 July 2023 (date made exact in claims list)'
  url: https://www.fca.org.uk/firms/consumer-duty/information-firms
linkedin_post: 'UK Finance members reported £576.4 million of APP scam losses in 2025, up 19%. Since October 2024, a large share of that has a bank''s name on the bill.


  This week''s VertexNode piece is about what that does to a fraud analytics roadmap.


  Three things I''d look at first:


  1. The 50:50 split between sending and receiving firms makes mule-account detection a P&L topic, not just a compliance one.


  2. The five-day reimbursement window means claims handling is part of the fraud system. If triage is manual, the clock is the first thing to lose.


  3. Every claim decision is a labelled data point. Feed it back into your models and it pays you twice.


  I also sketch a simple sizing model: claims × average value × share reimbursed × prevention rate. It fits on one slide, which in banking counts as a minor miracle.


  Sizing is the easy part of the work. The hard part is pricing false positives honestly.


  If you run fraud analytics: which has moved up your roadmap most since October 2024, outbound scoring, inbound mule detection or claims automation?'
linkedin_shared: false
---

## The problem

For years, APP fraud was a customer-experience problem with a loss line attached. Reimbursement depended on a voluntary code, and outcomes varied between firms. Since 7 October 2024, that has changed. The Payment Systems Regulator's (PSR) rules make reimbursement mandatory for APP scams on Faster Payments and CHAPS. The headline features are:

- a maximum of £85,000 per claim;
- reimbursement generally due within five business days (the clock can be paused in defined circumstances);
- the cost split 50:50 between the sending and receiving firm;
- a limited exception for customers who acted with gross negligence.

The scale explains why this matters. UK Finance reported £576.4 million in APP scam losses for 2025, up 19% on the previous year, inside total payment fraud losses of £1.28 billion. Banks reimbursed £354.3 million of APP losses in 2025, around 61% by UK Finance's measure. A large share of every scam pound is now, in principle, a cost to banks.

For a fraud analytics team, three things shift at once.

**1. Loss becomes a budget line.** When most of the loss lands on the bank, the value of every prevented scam can be written down in pounds. That is good news. Business cases for detection stop being arguments about "customer harm" and start being arguments about expected cost.

**2. The receiving side now has skin in the game.** The 50:50 split means the bank holding a mule account pays for scams it never saw leave a customer's account. Inbound detection (mule accounts, rapid pass-through of funds, new accounts receiving many unrelated payers) used to be a financial-crime topic. It is now a direct P&L topic.

**3. Time becomes a control.** A five-day decision window means claims handling is part of the fraud system. Slow, manual triage is a cost, not just an inconvenience. Some analytics teams will find the work they inherit is queue management with a model attached. It's less glamorous than building a model, but it moves the number.

## How I'd solve it

Here is the approach I'd take, told through an illustrative scenario: a composite UK retail bank, not a real one, with a few million customers and a mix of app and online banking.

**Start with exposure by leg.** I would split the baseline into outbound claims (our customer was scammed) and inbound claims (our account received the money). For each leg I'd record claim count, average value, the share reimbursed, and the share recovered from the other firm. This data often sits in several places at once. If it takes three teams and two spreadsheets to produce it, fixing that comes first.

**Re-point detection to where the pound is cheapest to save.** With the exposure view in hand, I'd rank interventions by expected pounds saved per pound spent:

- *Outbound:* behavioural scoring on first-time payees, unusual amounts, session anomalies (a customer on a call while paying) and payment-purpose signals, with proportionate friction such as a warning or a short hold on the riskiest payments.
- *Inbound:* mule-account models using account age, payer diversity, velocity and pass-through behaviour, feeding restriction and investigation queues.
- *Operations:* a claims workflow that gathers evidence once, pre-fills the assessment and routes by complexity, so the five-day window is a design target, not a scramble.

**Price the friction honestly.** Every intervention has a cost: false positives, abandoned payments, calls to contact centres, and customer goodwill. Under the FCA's Consumer Duty, firms are expected to deliver good outcomes for customers, so over-blocking is not free. I'd put a cost on each false positive and test the models on the net result, not on detection rate alone.

**Close the loop.** Reimbursement decisions are labelled data. Every upheld or rejected claim should flow back into model training and rule tuning. Alongside that, I'd track a short set of KPIs: reimbursed value per £1m of payments, time to decision, inbound mule hits caught before first payout, and false-positive rate on interventions.

In this illustrative scenario, the bank sees around 4,000 reimbursable APP claims a year at an average of £2,500. Aiming to prevent 10% of them through better outbound and inbound controls is the assumption used here for a team starting from rules-only detection. I'd treat it as a hypothesis to test, not a promise.

## Benefit evaluation

Here is the maths, kept deliberately simple so a finance partner can challenge every line.

**Gross exposure** = claims × average value × share reimbursed. Using the illustrative numbers and assuming 85% of claim value is reimbursed: 4,000 × £2,500 × 0.85 = £8.5 million a year.

**Benefit of a 10% reduction** = £8.5m × 10% = **£850,000** a year. This is a simplification. Because of the 50:50 split, the net cost of an outbound claim can be lower after the receiving firm contributes. Likewise, the bank takes on a share of inbound claims it did not originate. For a team that has both legs, the two roughly offset in sizing, but you should model them separately before you trust the total.

**Cost side.** Suppose the programme costs £400,000 in year one: data engineering, model build, investigator capacity and tooling. Net benefit is £450,000, an ROI of about 112%, with payback in roughly six months. Include friction cost in that figure. If extra false positives add £100,000 of handling and lost-payment cost, net benefit falls to £350,000 and ROI to about 88%. It's still positive, but the honest figure is the one that survives a CFO's questions.

**Operational gains.** Automating evidence gathering and case routing reduces handling time per claim. That helps you meet the five-day expectation without adding headcount in proportion to volume. It is harder to put an exact figure on, so I'd measure it in a pilot rather than assume it.

**Analytics value.** Labelled reimbursement outcomes improve every later model. This is the benefit most business cases leave out, and it compounds.

The calculator below lets you change the claim volume, average value and prevention rate to see how sensitive the answer is. The prevention rate is the least certain input and has the widest plausible range, which is why it deserves the most scrutiny.

## Takeaways

- Mandatory reimbursement turns APP losses into a modelled cost, so detection investment can be ranked by expected pounds saved.
- The 50:50 split makes inbound mule detection a P&L priority, not only a financial-crime one.
- Size exposure separately for the sending and receiving legs before you add them together.
- Price false positives and customer friction into the business case, or the first audit of it will do so for you.
- Treat reimbursement decisions as labelled data and feed them back into models.
