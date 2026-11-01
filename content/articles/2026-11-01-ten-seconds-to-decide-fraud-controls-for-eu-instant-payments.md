---
title: 'Ten seconds to decide: fraud controls for EU instant payments'
slug: ten-seconds-to-decide-fraud-controls-for-eu-instant-payments
date: '2026-11-01'
category: Fraud Risk
status: published
test_run: false
market: EU
scenario: a composite mid-sized euro-area retail bank (illustrative, not a real institution)
publish_at: null
review_issue: 7
reminded: false
summary: Instant payments leave one decision point and no overnight safety net, so only checks that run in-session still work. Here is how a practitioner layers Verification of Payee with payee risk and session signals, and how to weigh friction against fraud prevented in euros.
hook:
  question: Under the EU Instant Payments Regulation, how many seconds does a euro-area bank have to make an instant credit transfer available to the payee?
  min: 0
  max: 60
  step: 1
  start: 30
  unit: seconds
  answer: 10
  answer_label: 10 seconds
  explain: Regulation (EU) 2024/886 (2024) requires funds to be made available to the payee within ten seconds of the payment order being received, 24/7. That is the whole window in which a fraud decision has to fit.
  source_url: https://eur-lex.europa.eu/eli/reg/2024/886/oj
star:
  situation: A composite euro-area retail bank launches instant sending; its fraud controls were built for overnight batches and manual review queues.
  task: Stop manipulation scams inside the ten-second window while keeping customer challenges rare enough that honest payers barely notice.
  action: Feed Verification of Payee outcomes, payee-risk scores and session signals into one real-time decision with tiered, proportionate friction.
  result: 'Illustrative, assumed rather than measured: fraud losses on instant payments fall by about a third while fewer than 1% of payments face any challenge.'
process:
- title: Map the ten-second budget
  detail: Split the window between channel, scoring, VoP call and the receiving bank. Leave the fraud engine a few hundred milliseconds and design everything else around it.
- title: Log VoP outcomes as features
  detail: Record match, close match, no match, unavailable, and whether the payer proceeded. Use them as inputs to the score rather than as a standalone block.
- title: Pre-compute payee and session risk
  detail: Score destination IBANs for mule behaviour ahead of time and read device and call signals in-session so decisions need no slow lookups.
- title: Tier the friction
  detail: Approve most payments silently, give targeted warnings to a few, hold a very small group for a call, and decline only clear cases.
- title: Measure net benefit weekly
  detail: Track fraud stopped, missed fraud in basis points, challenge hit rate and cost per challenge, then tune thresholds with champion-challenger tests.
calculator:
  title: Is your friction paying for itself?
  inputs:
  - id: cases_stopped
    label: Fraud cases stopped per month
    value: 150
    min: 10
    max: 1000
    step: 5
    unit: cases
  - id: avg_loss
    label: Average loss avoided per case
    value: 2500
    min: 200
    max: 20000
    step: 100
    unit: €
  - id: challenged
    label: Payments challenged per month
    value: 60000
    min: 1000
    max: 500000
    step: 1000
    unit: payments
  formula: cases_stopped*avg_loss - challenged*1.5
  result_label: Net monthly benefit of the controls
  result_unit: € per month
  basis: 'Illustrative model: net benefit = fraud cases stopped × average loss avoided, minus challenged payments × an assumed blended friction cost of €1.50 per challenge (support contact, abandonment, goodwill). Replace all inputs and the €1.50 assumption with your own data.'
roi:
- metric: Net monthly benefit of tiered controls
  value: €285,000
  basis: 'Illustrative model: 150 cases × €2,500 = €375,000 prevented, minus 60,000 challenges × €1.50 = €90,000 friction.'
- metric: Challenge hit rate
  value: 1 fraud per 400 challenges (0.25%)
  basis: 'Illustrative model: 150 fraud cases stopped / 60,000 challenged payments.'
- metric: Break-even fraud cases per month
  value: 36 cases
  basis: 'Illustrative model: €90,000 friction cost / €2,500 average loss avoided.'
myth_fact:
- statement: A "match" result in Verification of Payee means the payee is trustworthy.
  fact: false
  explain: VoP only checks that the payee name and IBAN correspond. A genuine account holder, including a mule, can match perfectly, so VoP does not prove good intent.
- statement: Euro-area banks had to start sending instant payments and offering Verification of Payee from 9 October 2025.
  fact: true
  explain: Regulation (EU) 2024/886 set 9 January 2025 for banks to receive and 9 October 2025 to send and offer VoP in the euro area. Non-euro member states follow in 2027.
- statement: Every instant payment in the EU must be sanctions-screened transaction by transaction.
  fact: false
  explain: For instant payments the Regulation replaces per-transaction screening against EU targeted financial sanctions with verification of the bank's own customers at least daily, and after new listings.
image: media/ten-seconds-to-decide-fraud-controls-for-eu-instant-payments/star-card.png
factcheck:
  status: verified
  summary: 'Agent fact-check plus human review on 1 Nov 2026: Instant Payments Regulation (EU) 2024/886 ten-second rule and the 9 January / 9 October 2025 dates confirmed; the EBA/ECB December 2025 report is the latest edition; PSR adoption is correctly described as pending. Benefit figures are a labelled illustrative model.'
  agent_summary: '7 verified, 4 corrected · Needs review: PSD3/PSR formal adoption status: the Council published its first-reading texts on 21 October 2026 and adoption in the Official Journal was still pending in late October 2026. Re-check before publication and update the wording if the PSR is adopted.; Check whether a 2026 edition of the joint EBA/ECB payment fraud report has been published since the 15 December 2025 edition. I found no newer edition.; I could not open the operative text of Article 5a of Regulation (EU) 2024/886 in the search tool. The ten-second rule is confirmed by multiple secondary sources, including a Spanish consumer portal and legal summaries. A human should confirm the exact wording against EUR-Lex if citing the article number.; The STAR ''about a third'' fraud reduction and the ''fewer than 1% challenged'' figure are assumptions. Keep them labelled as illustrative.'
sources:
- title: EUR-Lex, Regulation (EU) 2024/886 (Instant Payments Regulation)
  url: https://eur-lex.europa.eu/eli/reg/2024/886/oj
- title: European Central Bank, Instant Payments Regulation
  url: https://www.ecb.europa.eu/paym/retail/instant_payments/html/instant_payments_regulation.en.html
- title: Central Bank of Cyprus, Application of the Instant Payments Regulation
  url: https://www.centralbank.cy/en/announcements/application-of-instant-payments-regulation-eu-2024-886-10-12-2024
- title: European Payments Council, Verification of Payee scheme rulebook
  url: https://www.europeanpaymentscouncil.eu/document-library/rulebooks/verification-payee-scheme-rulebook
- title: EBA and ECB, joint report on payment fraud (December 2025)
  url: https://www.bde.es/f/webbe/GAP/Secciones/SalaPrensa/ComunicadosBCE/NotasInformativasBCE/25/presbce2025-151en.pdf
- title: EUR-Lex, Regulation (EU) 2022/2554 (DORA)
  url: https://eur-lex.europa.eu/eli/reg/2022/2554/oj
- title: Norton Rose Fulbright, PSD3 and PSR, from provisional agreement to 2026
  url: https://www.nortonrosefulbright.com/en/knowledge/publications/cedd39c6/psd3-and-psr-from-provisional-agreement-to-2026-readiness
linkedin_post: 'Ten seconds. That is how long a euro-area bank now has to make an instant payment available to the payee, and it is roughly how long my laptop needs to decide it urgently needs an update.


  For fraud teams, the overnight batch, the review queue and the recall request have all quietly left the building. What is left is one decision at authorisation.


  Three things I keep coming back to:


  1. Verification of Payee is a strong signal, not a verdict. It catches the wrong-IBAN scam, not the coached customer paying a real mule.

  2. Payee risk and session signals (a call in progress, a remote-access tool) can be ready before the customer taps send.

  3. Friction needs a price tag: fraud stopped minus challenges multiplied by cost per challenge, plus the break-even point.


  On my illustrative numbers, the break-even is surprisingly low. The real work is making sure honest customers never notice the controls, because a warning everyone clicks through is just wallpaper with ambition.


  How does your team measure the cost of a challenge today: in euros, or in gut feel?'
linkedin_shared: false
linkedin_hold: true
---

## The problem

Instant payments are wonderful right up until you are the person paid to stop a bad one. Under Regulation (EU) 2024/886, euro-area payment service providers must make funds available to the payee within ten seconds, any hour of any day. For euro-area banks, receiving became mandatory on 9 January 2025. Sending, together with Verification of Payee (VoP), followed on 9 October 2025. Payment and e-money institutions have a later date of 9 April 2027, and non-euro member states come later still, in 2027. Ten seconds is roughly how long my laptop takes to decide it urgently needs an update, and that is the entire window for a fraud decision.

Most fraud toolkits quietly assumed time. There was the overnight batch, the analyst queue, the callback the next morning and the recall request. Instant settlement removes all of them. What remains is one decision at authorisation, made with whatever information is already in hand.

Two things make it harder.

**First, the fraud mix has moved from stolen credentials to manipulation.** The customer logs in, passes strong customer authentication under PSD2, and pays willingly because a very convincing "bank officer" asked them to. The joint EBA/ECB report on payment fraud (2025 edition, covering 2022 to 2024) found that manipulation of the payer accounted for more than half of the total value of fraudulent credit transfers. The same report finds that SCA clearly reduces fraud for card payments, but for credit transfers the protective effect is less clear. SCA is necessary, but it does not stop a customer who is being coached.

**Second, VoP is useful but narrow.** The payer's bank checks the payee name against the IBAN and returns a match, close match or no match. Under the European Payments Council scheme, "verification check not possible" is also a defined outcome. VoP kills misdirection fraud, such as the invoice-redirect where one digit of the IBAN changed. It does not stop a scam where the victim sends money to a mule whose real name matches what the scammer said. A name can be genuine while the intent is not. Warning fatigue is also real: if "close match" appears too often, people click through it the way they click "accept cookies".

So the question is not whether to use VoP. It is which checks still work at instant speed, and how to prove the friction is paying for itself.

## How I'd solve it

Here is the approach in an **illustrative scenario**: a composite mid-sized euro-area retail bank, not a real institution. It has just switched on instant sending. Its rules run in overnight batches and a manual queue clears alerts within hours.

**What no longer works:** next-day rules, manual review before release, and recall as a primary control. For instant payments, the Regulation also replaces transaction-by-transaction screening against EU targeted financial sanctions with screening of the bank's own customers at least daily. That is a design hint: do the heavy work before the payment, not during it.

**What still works, in layers:**

1. **VoP as a signal, not a gate.** I'd log every outcome (match, close match, no match, unavailable) and whether the payer proceeded anyway. "No match" plus a new payee plus an unusual amount deserves a stronger intervention than "match" on a payee paid monthly.
2. **Payee-risk scores computed in advance.** Mule risk is mostly knowable before the payment: how new the account is, how many unrelated payers it receives from, how quickly funds leave. For the bank's own accounts this is first-hand data. For other banks' IBANs it comes from consortium or shared intelligence, where the law allows. The Payment Services Regulation, proposed by the Commission in June 2023 and politically agreed in November 2025, points towards more structured fraud-data sharing between payment service providers. Formal adoption was still pending at the time of writing, but it is worth building for now.
3. **Session and behaviour signals.** These include a remote-access tool running, a call in progress during the payment, a new device, a pasted IBAN, or unusual hesitation. They are cheap to compute in-session and strongly tied to coached payments.
4. **Tiered friction.** Most payments are approved silently. A smaller group gets a specific warning, such as "Has someone asked you to move money to a safe account?", rather than a generic banner. A very small group gets a hold and a call. A tiny group is declined. Precision matters more than severity.
5. **Receiving-side controls.** Inbound instant payments to new or dormant accounts trigger outbound limits until the pattern looks normal. Stopping the mule's exit often saves the victim.
6. **Resilience.** Real-time scoring is now a critical dependency. DORA, applicable since 17 January 2025, is a reason for the fraud engine to have tested failover. A sensible default is a conservative rule set that keeps working if the model is unavailable.

The design target I'd suggest is a scoring budget of a few hundred milliseconds, well inside the ten seconds, with the rest left for the receiving bank and the network. That figure is my own design choice, not a regulatory number.

**Measuring friction against fraud prevented.** I'd track six numbers weekly: fraud value stopped, fraud value missed (in basis points of instant volume), challenge rate, the hit rate of challenges (one fraud per how many challenges), abandonment after a challenge, and cost per challenge, including support calls. Then I'd run champion-challenger tests on lower-risk segments to compare warning wordings and thresholds. I'd never leave high-risk flows unprotected for the sake of a clean experiment.

## Benefit evaluation

Here is the arithmetic on illustrative numbers. Treat it as a template, not a result.

- Step-up and hold controls stop **150 fraud cases a month** at an average avoided loss of **€2,500**. That is **€375,000** prevented.
- The controls challenge **60,000 payments a month**. At a blended friction cost of **€1.50** per challenge (support contact, abandoned payment, goodwill), that is **€90,000**.
- **Net benefit: €375,000 − €90,000 = €285,000 a month.**

Two derived figures keep me honest. The hit rate is 150 / 60,000 = 0.25%, or one fraud per 400 challenges. Break-even is €90,000 / €2,500 = 36 cases a month, so the controls pay for themselves if they stop about a quarter of the assumed cases. If the friction cost were €5 instead of €1.50, friction would total €300,000 and the net benefit would still be €75,000. That sensitivity tells you where to tune: cut unnecessary challenges before you chase marginal fraud.

The operational gains are real but should be stated modestly. Automated in-session decisions mean analysts handle exceptions rather than a queue, and a manual review that happens after the money has gone is of limited use anyway. The analytics value is the feedback loop: each confirmed mule or scam typology sharpens the payee and session features over time.

One caution. VoP and any regulatory-driven changes have costs of their own, and the benefits above are *modelled*, not measured. Replace every input with your own data before quoting a figure to anyone.

## Takeaways

- At instant speed, only checks that complete before authorisation count: VoP, payee risk, session signals, limits, and receiving-side controls.
- Treat VoP as one strong signal. It stops wrong-IBAN fraud and does little against a coached customer paying a real mule.
- Measure friction in euros: fraud stopped minus (challenges × cost per challenge), plus the hit rate and break-even cases.
- Tailor warnings to the scam type, and track whether people heed them. A warning everyone ignores is just decoration.
- Plan for resilience and for the regulatory direction. DORA covers the engine, and the forthcoming Payment Services Regulation points towards more fraud-data sharing.
