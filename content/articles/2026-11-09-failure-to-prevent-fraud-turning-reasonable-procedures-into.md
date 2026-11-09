---
title: 'Failure to prevent fraud: turning ''reasonable procedures'' into evidence'
slug: failure-to-prevent-fraud-turning-reasonable-procedures-into
date: '2026-11-09'
category: Fraud Risk
status: draft
test_run: false
market: UK
scenario: a mid-sized UK consumer-finance group with around 2,000 staff and a network of broker introducers (illustrative composite, not a real firm)
publish_at: null
review_issue: null
reminded: false
summary: Since 1 September 2025, large UK organisations can be criminally liable when an associated person commits fraud to benefit them, unless they can show reasonable prevention procedures. Here is what that evidence looks like and how fraud analytics and monitoring can produce it.
hook:
  question: UK Finance counted the money stolen through authorised and unauthorised payment fraud in 2025. How many £ millions was it?
  min: 0
  max: 3000
  step: 10
  start: 500
  unit: £m
  answer: 1280
  answer_label: £1.28 billion
  explain: UK Finance's Annual Fraud Report 2026 reported £1.28 billion stolen through payment fraud in 2025, up 4% on 2024. That is the victim-side picture; the new offence looks at the organisation-side one.
  source_url: https://www.ukfinance.org.uk/policy-and-guidance/reports/annual-fraud-report-2026
star:
  situation: A UK consumer-finance group sells through brokers and sales staff; the board asks whether it could defend a failure-to-prevent-fraud charge.
  task: Turn the six Home Office principles into evidence that is repeatable, reviewable and proportionate to the group's actual fraud risks.
  action: Map fraud risks to controls, monitor associated persons with analytics, and log alerts, decisions and fixes in a board-ready evidence pack.
  result: 'Illustrative outcome: evidence assembly drops from weeks to days, and outlier brokers surface months earlier than complaint-led detection.'
process:
- title: Name the fraud scenarios
  detail: List specific ways associated persons could commit fraud for the organisation's benefit, with owners and a likelihood and impact view.
- title: Map controls to risks
  detail: Link each control to a risk, an owner and a test frequency. Record gaps with remediation dates.
- title: Monitor associated persons
  detail: Build peer-group analytics on brokers, agents and staff, with documented and tuned thresholds.
- title: Log every alert outcome
  detail: Record investigation, clearance reason, escalation and action taken, linked to whistleblowing and HR cases.
- title: Report and review quarterly
  detail: Auto-generate a board pack covering KRIs, control tests, cases and model changes, and minute the challenge.
calculator:
  title: How many hours could your team get back each year?
  inputs:
  - id: controls
    label: Controls needing regular evidence
    value: 40
    min: 5
    max: 200
    step: 5
    unit: controls
  - id: hours_per_quarter
    label: Manual hours per control per quarter
    value: 6
    min: 1
    max: 30
    step: 1
    unit: hours
  - id: automated_pct
    label: Share of evidence work automated
    value: 70
    min: 10
    max: 95
    step: 5
    unit: '%'
  formula: controls * hours_per_quarter * 4 * automated_pct / 100
  result_label: Hours returned to the team each year
  result_unit: hours
  basis: 'Illustrative model: controls × manual hours per quarter × 4 quarters × share automated. Inputs are assumptions to replace with your own figures; no external benchmark is implied.'
roi:
- metric: Evidence hours returned per year (40 controls, 6 hrs/quarter, 70% automated)
  value: 672 hours
  basis: 'Illustrative model: 40 × 6 × 4 × 70%'
- metric: Maximum financial penalty for an organisation convicted of the offence
  value: Unlimited fine
  basis: Economic Crime and Corporate Transparency Act 2023, section 199(12) (in force 1 September 2025)
- metric: Time to assemble a regulator-ready evidence pack
  value: Weeks to days
  basis: 'Illustrative model: manual collection versus pack generated from live monitoring systems'
myth_fact:
- statement: Only banks and other financial firms are in scope of the UK failure to prevent fraud offence.
  fact: false
  explain: 'It applies to any large organisation in any sector that meets two of three tests: more than 250 employees, more than £36m turnover, or more than £18m total assets.'
- statement: Having a written anti-fraud policy is, on its own, enough to show reasonable prevention procedures.
  fact: false
  explain: The Home Office guidance is built around six principles, including risk assessment, due diligence, and monitoring and review. A policy with no evidence of operation is unlikely to carry the defence.
- statement: An organisation can be liable even if senior managers did not know about the fraud by an associated person.
  fact: true
  explain: The offence is about the fraud committed by an associated person intending to benefit the organisation. The defence rests on having reasonable procedures, not on what senior managers knew.
image: media/failure-to-prevent-fraud-turning-reasonable-procedures-into/star-card.png
factcheck:
  status: needs-review
  summary: '2 corrected, 9 verified · Needs review: The s.201 size thresholds (250 employees, £36m, £18m) can be amended by regulations. Confirm on legislation.gov.uk that they are unchanged at publication.; One law-firm source says the Home Office guidance was updated on 10 October 2025. Have legal counsel confirm that the six-principle summary matches the current gov.uk version.; The UK Finance £1.28bn figure covers member-reported payment fraud, not all UK fraud. Check the wording against the full Annual Fraud Report 2026 PDF.'
sources:
- title: UK Finance, Annual Fraud Report 2026
  url: https://www.ukfinance.org.uk/policy-and-guidance/reports/annual-fraud-report-2026
- title: legislation.gov.uk, Economic Crime and Corporate Transparency Act 2023 s.199
  url: https://www.legislation.gov.uk/ukpga/2023/56/section/199
- title: The Law Society, Economic Crime and Corporate Transparency Act
  url: https://www.lawsociety.org.uk/topics/anti-money-laundering/economic-crime-and-corporate-transparency-act
- title: Home Office, Guidance on failure to prevent fraud (ECCTA)
  url: https://www.gov.uk/government/publications/offence-of-failure-to-prevent-fraud-introduced-by-eccta
- title: legislation.gov.uk, ECCTA 2023 s.201 (large organisation)
  url: https://www.legislation.gov.uk/ukpga/2023/56/section/201
linkedin_post: 'A policy is not a defence. It''s a bedtime story with a version number.


  Since 1 September 2025, large UK organisations can be criminally liable if an associated person commits fraud intending to benefit them, unless they can show reasonable prevention procedures.


  Three things I''d focus on if I ran the fraud analytics team:


  1. Monitor associated persons, not just customers. Brokers, agents and sales teams are where this offence bites.


  2. Make evidence a by-product. If your proof of monitoring is assembled from screenshots the week before a board meeting, it will show.


  3. Write the gaps down. A known gap with a remediation date reads far better than a spotless register nobody believes.


  I wrote up what this looks like in practice, with an illustrative scenario and a small calculator for the hours you could get back. (And yes, I''m sure there''s a folder somewhere called Final_v7_REALLY_final. We''ve all been there.)


  I''m not a lawyer, so legal counsel should own the interpretation. But the data half of this belongs to us.


  If a regulator asked you tomorrow to show your monitoring of third-party introducers, how long would it take you to assemble the evidence?'
linkedin_shared: false
---

## The problem

I'll start with a confession: many fraud analytics teams are better at catching fraudsters than at proving they were trying. The new UK offence changes who needs that second skill.

The failure to prevent fraud offence, created by the Economic Crime and Corporate Transparency Act 2023, came into force on 1 September 2025. In plain terms, a large organisation can be liable if an "associated person" (an employee, agent, subsidiary or other person providing services for it) commits a specified fraud offence intending to benefit the organisation or its clients. The organisation does not have to have known about it. The defence is that it had reasonable procedures to prevent the fraud, or that it was unreasonable to expect any.

"Large" means meeting two of three tests: more than 250 employees, more than £36m turnover, or more than £18m total assets. The Home Office published its guidance in November 2024, built on six principles: top-level commitment, risk assessment, proportionate procedures, due diligence, communication and training, and monitoring and review.

Notice what is *not* in there: a prescribed list of tools. The guidance is deliberately principles-based and proportionate. That is helpful, but it also means "we have a policy" is a bedtime story, not a defence. If the question is put to you, you will need to show what you did, when, and what you did when something looked wrong. That is an evidence problem, and evidence is data.

I'm not a lawyer, and your legal counsel should own the interpretation. But the data and monitoring half of this belongs to us.

## How I'd solve it

Here is an **illustrative scenario**, a composite and not a real firm. Picture a mid-sized UK consumer-finance group with about 2,000 staff and a network of broker introducers. Its headcount clears the employee test, and at that scale we assume turnover or assets clear a second one. Its fraud exposure is not mainly external attackers. It is the people and partners who are paid to bring in business.

**Step 1: Risk assessment that names real scenarios.** Instead of a generic "fraud risk" line, the team lists specific ways an associated person could commit fraud for the group's benefit. Examples: a broker inflating applicant income to push deals through, a sales colleague misrepresenting terms to hit targets, or a finance team member misstating figures. Each gets an owner, a likelihood and impact view, and the controls that address it.

**Step 2: Control library mapped to risks.** Every control is linked to the risk it mitigates, with a named owner and a test frequency. Gaps are written down rather than hidden. A documented gap with a remediation date reads far better than a pristine register nobody believes.

**Step 3: Analytics on associated persons.** This is where our craft comes in. The team builds monitoring at broker and staff level: gap between stated and verified income, document tamper flags, early-payment-default rates, unusual approval patterns, commission-to-quality ratios, and complaint themes. Thresholds are set, tuned and documented. Peer-group comparison matters more than absolute numbers, because the question is "who is behaving unlike similar partners?"

**Step 4: Escalation with a paper trail.** Every alert has a disposition: investigated, cleared with reason, escalated, or action taken (retraining, suspension, termination of agency). Whistleblowing reports and HR cases are linked to the same view. Auditors love this part, and so does anyone who has ever hunted for a decision made nine months ago.

**Step 5: Review and board reporting.** Quarterly, the team produces a short pack: risk assessment changes, KRIs against appetite, control test results, notable cases and lessons. It also records model governance, covering what changed in the rules or models and who approved it. The board sees it, challenges it, and the minutes show that it did.

A practical caution: do not let the evidence pack become a second job. If it is assembled by hand from screenshots, it will be late, inconsistent and quietly abandoned. Generate it from the same systems that run the monitoring, so that evidence is a by-product of the work.

In this illustrative case, the group ends up able to answer the three questions a prosecutor or regulator would ask: what did you think could go wrong, what did you do about it, and how did you know it was working?

## Benefit evaluation

Let me be honest about what can and cannot be priced. The biggest benefit, avoiding a prosecution and an unlimited fine plus the reputational damage, is real but not forecastable. I won't put a made-up probability on it. What I can model is the operational side.

**Illustrative model: evidence effort.** Suppose the group has 40 monitored controls. Manually collecting and formatting evidence for each takes about 6 hours per quarter. That is 40 × 6 × 4 = 960 hours a year. If 70% of that is automated through generated reports from the monitoring systems, about 672 hours a year come back to the team, roughly 0.4 of a full-time role (assuming about 1,650 working hours a year). You can change the inputs in the calculator to match your own numbers.

**Analytics value.** Peer-group monitoring of brokers and sales staff can surface outliers earlier than complaints do. Even in an illustrative sense, catching a problem broker a quarter sooner means fewer bad accounts booked, fewer customer remediation cases, and a cleaner story if questions arrive. I'd treat this as upside rather than a headline ROI figure.

**Automation value.** Scheduled evidence packs also cut the "who has the latest version?" tax. I have yet to meet a team that misses the folder called *Final_v7_REALLY_final*.

The cost side is the monitoring build, data feeds from broker and HR systems, and ongoing tuning. Proportionality cuts both ways: a smaller in-scope firm needs less than a large bank, and the guidance expects that.

## Takeaways

- The offence has applied since 1 September 2025 to large organisations, and not only to banks. Check the size tests early.
- "Reasonable procedures" is a question of evidence, so build the trail as you build the controls.
- Monitor associated persons, not just customers. Brokers, agents and sales teams are where this offence bites.
- Generate the evidence pack from live systems so it stays current and cheap to produce.
- Work with legal counsel on interpretation, and keep your documented gaps honest. A known gap with a plan beats a perfect-looking register.
