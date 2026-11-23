---
title: 'Pooled transaction monitoring: lessons from the Dutch shared AML experiment'
slug: pooled-transaction-monitoring-lessons-from-the-dutch-shared
date: '2026-11-23'
category: Data Analytics
status: draft
test_run: false
market: Netherlands
scenario: a mid-sized Dutch retail bank (an illustrative composite, not a real institution)
publish_at: null
review_issue: 11
reminded: false
summary: In 2020 five large Dutch banks set up a shared transaction-monitoring initiative to see what no single bank can see. Here is what it set out to find, where the legal limits sat, and how I'd measure whether the alerts are any better.
hook:
  question: In which year do the EU's new single-rulebook AML rules (the AMLR, which include a framework for information-sharing partnerships) start to apply to Dutch banks?
  min: 2024
  max: 2032
  step: 1
  start: 2026
  unit: year
  answer: 2027
  answer_label: '2027'
  explain: Regulation (EU) 2024/1624 (AMLR) was published in the EU Official Journal on 19 June 2024 and applies from 10 July 2027. It is directly applicable in the Netherlands as an EU member state.
  source_url: https://eur-lex.europa.eu/eli/reg/2024/1624/oj
star:
  situation: A composite mid-sized Dutch bank sees only its own leg of business-client payments, and most monitoring alerts turn out to be noise.
  task: Test whether pooled, pseudonymised signals could improve alert quality without breaching the Wwft or GDPR.
  action: Fix a narrow use case, settle the legal basis first, baseline alert quality, then run pooled and own-rule alerts side by side.
  result: 'Illustrative outcome: false-positive volume falls 15% on the pilot segment and alert-to-report conversion improves, with decisions staying in-house.'
process:
- title: Pick one narrow use case
  detail: Choose a single typology, such as rapid pass-through between business accounts. A tight question keeps the legal case and the measurement simple.
- title: Settle the legal basis
  detail: Complete the DPIA and agree purpose, data fields, pseudonymisation and retention with compliance. Keep decisions and FIU-Nederland reporting inside each bank.
- title: Baseline alert quality
  detail: Measure precision, effort per alert and estimated recall through blind sampling of non-alerted transactions before any change.
- title: Run champion-challenger
  detail: Run pooled-signal scenarios beside your own rules on the same segment. Analysts review both queues blind.
- title: Close the feedback loop
  detail: Feed investigation outcomes back into tuning, validate the model like any other, and report precision and recall together.
calculator:
  title: How many analyst hours could better alert quality give back?
  inputs:
  - id: alerts_month
    label: Alerts per month in the pilot segment
    value: 20000
    min: 1000
    max: 100000
    step: 1000
    unit: alerts
  - id: mins_per_alert
    label: Average review time per alert
    value: 25
    min: 5
    max: 60
    step: 5
    unit: minutes
  - id: fp_cut_pct
    label: Reduction in false-positive alerts
    value: 15
    min: 1
    max: 50
    step: 1
    unit: '%'
  formula: (alerts_month * fp_cut_pct / 100) * mins_per_alert / 60
  result_label: Analyst hours returned per month
  result_unit: hours
  basis: 'Illustrative model: alerts removed = alerts per month × reduction %; hours = alerts removed × minutes per alert ÷ 60. It ignores build and run costs, and assumes removed alerts are genuine false positives.'
roi:
- metric: Analyst hours returned per month
  value: ≈1,250 hours
  basis: 'Illustrative model: 20,000 alerts × 15% reduction × 25 minutes ÷ 60'
- metric: Annual labour value at €60 per hour
  value: ≈€900,000
  basis: 'Illustrative model: 1,250 hours × 12 months × assumed €60 loaded hourly cost'
- metric: Payback on €1.5m one-off and €0.3m annual run cost
  value: ≈30 months
  basis: 'Illustrative model: €1.5m ÷ (€0.9m − €0.3m) = 2.5 years; the costs are assumptions, not benchmarks'
myth_fact:
- statement: If a bank joins a shared monitoring initiative, it can hand over its Wwft duty to report unusual transactions.
  fact: false
  explain: The Wwft duties sit with each institution. Shared monitoring can improve the signals, but each bank remains responsible for assessing and reporting to FIU-Nederland. Under AMLR Article 75, responsibility also stays with the participants.
- statement: Transactie Monitoring Nederland (TMNL) was set up in 2020 by five Dutch banks.
  fact: true
  explain: ABN AMRO, ING, Rabobank, Triodos Bank and de Volksbank formally established TMNL in July 2020 to explore joint transaction monitoring, starting with business clients.
- statement: The EU's new Anti-Money Laundering Authority (AMLA) is based in Frankfurt.
  fact: true
  explain: Frankfurt was chosen as the seat of AMLA in a joint Council–Parliament vote on 22 February 2024. As an EU body, it matters to Dutch banks as well.
image: media/pooled-transaction-monitoring-lessons-from-the-dutch-shared/star-card.png
factcheck:
  status: needs-review
  summary: '8 verified, 3 corrected · Needs review: TMNL''s status after the 2024 wind-down (any restructured or smaller form in 2025–2026) was not verified. A human should check tmnl.nl for the latest position before publishing.; EDPB/AMLA joint guidelines on Article 75 partnerships are reportedly due for consultation in H1 2027. Check whether they have been published, and whether the Netherlands has designated national arrangements for Article 75 partnerships.; The LinkedIn post names ''VertexNode''. This is not on the employer list, but the author should confirm that reference is intended.'
sources:
- title: TMNL, assessment of new European AML legislation
  url: https://tmnl.nl/en/article/tmnl-assesses-the-opportunities-of-new-european-anti-money-laundering-legislation/
- title: Autoriteit Persoonsgegevens, Data Processing by Partnerships Act
  url: https://www.autoriteitpersoonsgegevens.nl/en/themes/police-and-judicial-authorities/the-fight-against-subversive-crime/data-processing-by-partnerships-act
- title: Taxence, Wet plan van aanpak witwassen gepubliceerd
  url: https://www.taxence.nl/nieuws/wet-plan-van-aanpak-witwassen-gepubliceerd/
- title: NOS, Banken bouwen gezamenlijk antiwitwasproject af
  url: https://nos.nl/l/2526940
- title: Raad van State, advies Wet plan van aanpak witwassen
  url: https://www.raadvanstate.nl/@122774/w06-20-0354-iii/
- title: EUR-Lex, Regulation (EU) 2024/1624 (AMLR)
  url: https://eur-lex.europa.eu/eli/reg/2024/1624/oj/eng
- title: Council of the EU, Frankfurt to host AMLA, 22 Feb 2024
  url: https://www.consilium.europa.eu/en/press/press-releases/2024/02/22/frankfurt-to-host-the-eus-new-anti-money-laundering-authority-amla/
- title: Illustrative model (author's assumptions, no external source)
  url: https://eur-lex.europa.eu/eli/reg/2024/1624/oj
linkedin_post: 'In 2020, five large Dutch banks asked a simple question: what if we looked at business-client transactions together instead of each bank seeing only its own leg?


  Three things I take from that experiment:


  1. Criminals move money across banks. Monitoring that stops at the front door sees one piece of the puzzle.

  2. The legal duty to monitor and report stays with each bank. Pooling can sharpen the signal, but it cannot outsource accountability. GDPR and the Wwft shape what you can share.

  3. Alert quality needs more than a shorter queue. Track precision and estimated recall together, or you may just be blind faster.


  I have yet to meet an analyst who said, "What a shame, only 40,000 alerts this month." Fewer false alarms is a perfectly respectable goal.


  In my latest VertexNode piece I walk through an illustrative pilot, with the maths, including a payback of about 30 months that I''d rather state than hide.


  If you could pool one data signal across banks tomorrow, which would you pick, and what would legal say?'
linkedin_shared: false
---

## The problem

Criminal money does not respect the walls between banks, but transaction monitoring does. Each Dutch bank sees its own customers' payments, which is only one leg of the journey. Funds can enter at one bank, hop to a second, split across a third and land somewhere unremarkable. Each bank's rules see a payment that looks perfectly ordinary.

Meanwhile, every bank has a legal duty under the Wwft (the Dutch Anti-Money Laundering and Anti-Terrorist Financing Act) to monitor customers and report unusual transactions to FIU-Nederland. The result is a familiar picture: big alert queues, mostly noise, and analysts who spend their days confirming that a plumber really does pay his supplier. I have yet to meet an analyst who said, "What a shame, only 40,000 alerts this month."

That is the gap the Netherlands tried to close in 2020, when five large banks (ABN AMRO, ING, Rabobank, Triodos Bank and de Volksbank) set up Transactie Monitoring Nederland (TMNL). As I understand it, the aim was to start with business clients and ask a simple question: if you look at transaction patterns across banks together, can you find networks and typologies that no single bank can see, and with fewer false alarms?

The interesting part for practitioners is where it ran into limits.

**1. The duty stays with each bank.** The Wwft obligations sit with each institution. A shared utility can sharpen the signal, but it cannot take over the bank's responsibility to assess, decide and report.

**2. Data protection.** Pooling payment data is personal data processing at scale, even for business clients, because sole traders, directors and ultimate beneficial owners are natural persons. Purpose limitation, data minimisation and proportionality under the GDPR (AVG in Dutch) apply, and the Dutch Data Protection Authority (Autoriteit Persoonsgegevens) takes a close interest.

**3. The legal basis did not arrive in the form the banks needed.** The Dutch bill known as the Wet plan van aanpak witwassen originally contained a basis for joint transaction monitoring by banks, but those parts were dropped before it was enacted, because of the coming EU rules. The law entered into force on 1 January 2026, centred on the cash-payment limit. The separate Wgs (the Dutch act on data processing by partnerships), in force since 1 March 2025, gives a statutory basis to four existing partnerships (FEC, iCOV, the RIECs and the Care and Safety Houses). It is not a basis for bank-to-bank transaction monitoring. In mid-2024 TMNL announced that it would wind down its activities in their then-current form, because of the AMLR. From 10 July 2027 the AMLR offers a framework for information-sharing partnerships (Article 75), under which responsibility for compliance stays with the participants. Read the latest status before you design anything. The experiment ran ahead of the law, which is exactly why it is such a useful case study.

## How I'd solve it

Here is how I'd approach it as a practitioner. The story below is an **illustrative scenario**: a composite mid-sized Dutch retail bank, not a real institution, and the numbers are modelled.

**Start with one narrow question.** Not "find all money laundering", but something like "detect rapid pass-through of funds between business accounts at different banks." A narrow use case makes the legal case easier and the results easier to measure.

**Do the legal work first.** I'd run a data protection impact assessment, agree the legal basis with compliance and counsel, and limit what is shared. That means pseudonymised identifiers, minimal fields and short retention. Alerts, investigations and reports to FIU-Nederland stay inside each bank.

**Baseline alert quality before changing anything.** Three measures matter:

- *Precision*: the share of alerts that end up as unusual-transaction reports.
- *Recall (estimated)*: sample transactions that did not alert, review them blind, and see how many a reviewer would have flagged. This is the "below-the-line" test, and it is the one people skip.
- *Effort*: average analyst minutes per alert, from open to decision.

**Run champion-challenger.** For the same business-client segment, the bank's own rules (the champion) run alongside the pooled-signal scenarios (the challenger). Analysts review both queues without knowing which is which. That keeps the comparison honest.

**Close the loop.** Investigators' outcomes feed back into scenario tuning, and model validation treats the pooled scenario like any other model. In the illustrative case, the pilot cuts false-positive volume by 15% on that segment, and alert-to-report conversion rises. The bank keeps full responsibility for every decision.

## Benefit evaluation

I'd judge a pooled-monitoring pilot on two things: what it saves and what it finds. Savings are easier to model, so I start there.

**Operational gains (illustrative model).** Assume the pilot segment produces 20,000 alerts a month, each takes 25 minutes to review, and pooled signals remove 15% of the false positives.

- Alerts removed: 20,000 × 15% = 3,000 per month
- Hours returned: 3,000 × 25 ÷ 60 = **1,250 hours per month**
- At an assumed loaded cost of €60 per hour: 1,250 × €60 = **€75,000 per month, about €900,000 per year**

**Costs.** Suppose one-off legal, data and integration work of €1.5 million and €300,000 a year to run. Net annual benefit is about €600,000, so payback is around 2.5 years, or roughly 30 months. That is not instant, and I'd rather say so than hide it. Costs shared between banks would improve it.

**Automation value.** Pooled signals work best with automated triage: pre-populated case files, auto-closure of low-risk repeats, and a clear audit trail. The hours saved are only real if the workflow changes, not just the model.

**Analytics value, the part that is harder to price.** Better recall means finding networks that were invisible before. I'd track alert-to-report conversion, estimated recall from blind sampling, time to decision, and the share of cases that involve counterparties at other banks. Feedback from FIU-Nederland on report usefulness is a good quality signal too.

One caution: if precision improves but recall falls, you have made the queue shorter and the bank blinder. Always report both.

## Takeaways

- Pooling data can show what one bank cannot: cross-bank networks and typologies. The legal duty to monitor and report stays with each bank.
- Settle the legal basis (GDPR, the Wwft and the AMLR's Article 75 partnership rules from July 2027) before building models, not after. TMNL's wind-down shows what happens when the basis is missing.
- Measure alert quality with precision, estimated recall and effort per alert. A shorter queue alone proves nothing.
- Run pooled scenarios against your own rules on the same population, with blind review.
- Model the maths openly, including the costs. A 30-month payback is a credible story, and a made-up one-year payback is not.
