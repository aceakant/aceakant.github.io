---
title: 'Money mules on UPI: spotting them in the first week'
slug: money-mules-on-upi-spotting-them-in-the-first-week
date: '2026-11-01'
category: Fraud Risk
status: hold
test_run: true
market: India
scenario: a mid-sized Indian private-sector bank (illustrative composite, not a real institution)
publish_at: null
review_issue: null
reminded: false
summary: Most UPI scam money has to land in a mule account first, and the early behaviour of that account is surprisingly readable. Here is the typical pattern, the first-week signals worth scoring, and what catching a mule 14 days earlier could be worth in an illustrative model.
hook:
  question: 'Cyber-fraud losses reported by Indians on the national cybercrime portal in 2025: how many thousand crore rupees?'
  min: 0
  max: 50
  step: 1
  start: 10
  unit: ₹ thousand crore
  answer: 22
  answer_label: about ₹22,495 crore
  explain: The Ministry of Home Affairs (via I4C) gave Parliament a figure of roughly ₹22,495 crore in reported cyber-fraud losses for 2025. That is marginally below the roughly ₹22,845 crore reported for 2024, which was itself more than triple the ₹7,465 crore of 2023. Not every rupee moved over UPI, but online fraud money generally has to land in some account first.
  source_url: https://www.scanmyshadow.com/blog/2026/10/india-cyber-fraud-2021-2025-ncrp-complaints-losses.html
star:
  situation: A composite mid-sized Indian bank finds mule accounts about 21 days after first fraud credit, mostly via victim complaints.
  task: Flag likely mule accounts within seven days of first suspicious activity, without freezing genuine customers.
  action: Score onboarding, device and flow-shape signals daily, apply graded friction, and feed confirmed cases back into the model.
  result: Illustratively, median detection falls from 21 to 7 days, cutting mule-routed flow and victim complaints by about two-thirds.
process:
- title: Capture day-zero context
  detail: Record occupation, income band, device, SIM and location at onboarding and UPI handle creation. These are cheap, stable signals that anchor every later comparison.
- title: Build first-week features
  detail: Track unique senders, one-hour outflow ratio, end-of-day balance, round-amount share and turnover versus declared profile. Refresh them daily.
- title: Add link and device signals
  detail: Connect accounts sharing devices, SIMs or beneficiaries. One confirmed mule should lift the score of its neighbours.
- title: Respond with graded friction
  detail: Monitor low scores, lower limits and call on medium scores, and send high scores to an analyst for restriction and STR consideration.
- title: Close the feedback loop
  detail: Feed confirmed mules and false alarms back into rules and models, and review thresholds monthly with fraud operations.
calculator:
  title: How much mule-routed money could earlier detection keep out of your accounts?
  inputs:
  - id: mule_accounts
    label: Mule accounts found per month
    value: 40
    min: 5
    max: 500
    step: 5
    unit: accounts
  - id: daily_flow
    label: Fraud proceeds passing through each mule per active day
    value: 50000
    min: 5000
    max: 500000
    step: 5000
    unit: ₹
  - id: days_saved
    label: Days earlier the mule is caught
    value: 14
    min: 1
    max: 30
    step: 1
    unit: days
  formula: (mule_accounts * daily_flow * days_saved) / 100000
  result_label: Mule-routed flow avoided each month
  result_unit: ₹ lakh
  basis: 'Illustrative model: accounts × average daily pass-through × days caught earlier, converted to ₹ lakh. It measures flow kept out of the bank''s accounts, most of which is customer money, not bank loss.'
roi:
- metric: Mule-routed flow avoided
  value: ≈ ₹2.8 crore per month
  basis: 'Illustrative model: 40 mules × ₹50,000 per day × 14 days earlier'
- metric: Complaint-handling hours returned
  value: ≈ 1,200 hours per month (≈ ₹6 lakh)
  basis: 'Illustrative model: 20 fewer victim complaints per mule × 40 mules × 1.5 hours, at ₹500 per hour'
- metric: First-year net benefit
  value: ≈ ₹0.7 crore on a ₹1 crore cost
  basis: 'Illustrative model: (₹6 lakh handling + ₹8.4 lakh goodwill at 3% of avoided flow) × 12 months, less assumed ₹1 crore build and run cost'
myth_fact:
- statement: UPI has no transaction limit, so a mule can move any amount in one go.
  fact: false
  explain: NPCI caps general UPI payments at ₹1 lakh per transaction, and person-to-person transfers at ₹1 lakh a day. Higher limits (up to ₹5 lakh per transaction since September 2025) apply only to specified verified-merchant categories, and banks can set lower limits of their own. Moving large sums therefore takes several transfers, which can itself be a detectable pattern.
- statement: RBI's innovation arm has developed an AI/ML tool, MuleHunter.AI, to help banks detect mule accounts.
  fact: true
  explain: RBI announced MuleHunter.AI, built by the Reserve Bank Innovation Hub, in December 2024 as an AI/ML model to help banks spot mule accounts, and encouraged banks to collaborate with the Hub on it.
- statement: Victims can report UPI fraud on the 1930 helpline, and speed of reporting improves the chance of freezing the money.
  fact: true
  explain: The national cyber-fraud helpline 1930 and the cybercrime.gov.in portal are the official reporting routes. The system behind them (CFCFRMS) was set up for immediate reporting so that funds can be stopped before they are siphoned off, so the sooner a victim reports, the better the chance of holding the money.
image: media/money-mules-on-upi-spotting-them-in-the-first-week/star-card.png
factcheck:
  status: needs-review
  summary: '5 corrected, 7 verified · Needs review: The 2025 loss figure (₹22,495 crore) is cited from secondary reports of the MHA Rajya Sabha reply of 11 Feb 2026. A human should swap in the direct PIB/MHA link. Some outlets quote 2024 as ₹22,848 crore in that reply.; The 2025 figure may be provisional. An I4C cheating-related subset is also quoted at ₹19,812 crore, so the exact ''reported on the portal'' definition should be confirmed.; ''Golden hour'' is a widely used term, but no official MHA/I4C document was retrieved that uses it. The wording is softened, and a human may want to confirm or drop it.; FIU-IND/PMLA reporting duty was verified through secondary sources. Cite PMLA Section 12 or the PML Rules directly if a primary link is wanted.; I could not retrieve the NPCI circular on UPI limits directly. The limits are from All India Radio and DD News reports of that circular.'
sources:
- title: 2024 figure verified (₹22,845.73 crore, Lok Sabha). Newer 2025 figure of ₹22,495 crore (MHA Rajya Sabha reply, 11 Feb 2026) now used for the hook, with 2024 kept as comparison.
  url: https://www.scanmyshadow.com/blog/2026/10/india-cyber-fraud-2021-2025-ncrp-complaints-losses.html
- title: 'Telangana Today / Lok Sabha reply: ₹22,845.73 crore in 2024, about 206% above 2023 (₹7,465 crore)'
  url: https://telanganatoday.com/indians-lost-a-whopping-rs-22845-crore-to-cyber-fraud-in-2024-govt
- title: 'PIB/NPCI: FY2024-25 was 18,586.60 crore (about 186 billion), but newer FY2025-26 is 24,161.69 crore (about 242 billion). Updated to FY2025-26.'
  url: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2302657&reg=48&lang=2
- title: 'Business Standard, Dec 2024: RBIH launched MuleHunter.AI; Governor asked banks to collaborate on it'
  url: https://www.business-standard.com/finance/news/what-is-mulehunter-ai-rbi-s-latest-tool-against-financial-fraud-explained-124120600865_1.html
- title: 'AZB: RBI issued separate Master Directions for banks and NBFCs on 15 July 2024'
  url: https://www.azbpartners.com/bank/master-directions-on-fraud-risk-management-in-banks-and-nbfcs/
- title: 'AIR: since 15 Sep 2025 P2M limits in specified categories are ₹5 lakh per transaction (₹10 lakh a day), P2P stays at ₹1 lakh a day. Myth explanation updated.'
  url: https://www.newsonair.gov.in/npci-raises-upi-person-to-merchant-transaction-limit-to-%E2%82%B95-lakh
- title: 'PIB: National Cyber Crime Data; 1930 operationalised to lodge online cyber complaints'
  url: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2287039&reg=48&lang=2
- title: MHA reply confirms CFCFRMS is for immediate reporting to stop siphoning of funds. 'Golden hour' appears only in non-official sources, so attribution to MHA removed and wording softened.
  url: https://www.mha.gov.in/MHA1/Par2017/pdfs/par2025-pdfs/RS03122025/389.pdf
- title: 'IIBF: banks must escalate suspicious transactions to FIU-IND under PMLA 2002 and the PML Rules'
  url: https://iibf.store/blog/suspicious-transaction-reporting-to-fiu-india-str-rules-for-bankers-2026-20260728
- title: 'PIB: Act enacted 11 Aug 2023; DPDP Rules 2025 notified 14 Nov 2025 with phased compliance (full effect by about May 2027)'
  url: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190655&reg=48&lang=2
linkedin_post: 'Every UPI scam needs a place to land. That place is usually a mule account, and it behaves differently from a normal account in its very first week.


  Three things I''d look at first:


  1. Shape, not size. Many unrelated senders in, money out within minutes, balance back near zero by night.

  2. Fit. Turnover that a student or low-income profile simply cannot explain.

  3. Links. Same device, same SIM, same collector accounts. Mules travel in packs.


  The cost of waiting for a victim complaint is easy to model: every extra day live means more victims and more layers between the money and the original account. In my illustrative bank scenario, catching mules 14 days earlier keeps about ₹2.8 crore a month of fraud proceeds out of its accounts.


  One caution: a genuine wedding-fund account can look suspicious for a day. Nobody''s real account gets forty strangers saying thank-you at 2 a.m., unless the cousins are repaying the trip. So start with friction, not a freeze.


  If you run fraud or payments: how long does it take your team to find a mule, and does the first signal come from your data or from a complaint?'
linkedin_shared: false
---

## The problem

Every UPI scam needs somewhere for the money to land. That somewhere is usually a mule account: a real bank account, opened or rented, whose only job is to receive stolen money and pass it along quickly.

The scale of the pipes matters. NPCI data shows UPI handled about 242 billion transactions in FY2025-26. Against that volume, a mule account is a very quiet doorway. The Ministry of Home Affairs (through I4C) told Parliament that Indians reported roughly ₹22,495 crore in cyber-fraud losses in 2025, close to the roughly ₹22,845 crore reported for 2024. Not all of that went through UPI or through mules, but online fraud money generally has to end up in an account somewhere. Where it landed is where the bank can act.

The typical mule pattern, as I'd describe it to a new analyst:

- **The account.** Either freshly opened with thin KYC and a low-income or student profile, or an older account "rented" from a genuine holder for a small fee. Both exist, so a model that only looks at new accounts misses half the story.
- **The burst.** A sudden run of credits from many unrelated senders, often small and often in round amounts.
- **The relay.** Outflows within minutes or hours, to a handful of collector accounts, wallets, or cash-out points. The end-of-day balance sits near zero.
- **The shape.** Turnover far above anything the customer's stated profile could explain.

The cost of catching it late is mostly arithmetic. Each extra day a mule is live means more victims, more layers between the money and the original account, and a freeze request that lands on an empty shell. The 1930 helpline and the national cybercrime portal (cybercrime.gov.in) exist for immediate reporting, so that funds can be stopped before they are siphoned off. Practitioners call that early window the "golden hour", and speed is the whole game. For the bank, late detection also means complaint handling, regulatory scrutiny (suspicious transaction reporting to FIU-IND, and RBI's July 2024 Master Directions on fraud risk management), and goodwill spent on customers who were scammed through the bank's rails.

## How I'd solve it

Here is an illustrative scenario. It is a composite, not a real organisation: a mid-sized Indian private-sector bank that finds roughly 40 mule accounts a month, typically about 21 days after the first fraud credit. Most are found because a victim complained, which means the bank learns about the problem after the money has already moved on.

**Situation:** detection is complaint-led and slow.

**Task:** flag likely mules within seven days, with minimal friction for genuine customers.

**Action:** I'd build it in layers rather than one clever model.

1. **Day-zero context.** At onboarding, capture the things that are cheap and stable: stated occupation and income band, device, SIM and location at account opening, and UPI handle creation timing.
2. **First-week behaviour features.** Count unique senders per day, the ratio of outflow to inflow within one hour, residual balance at day end, share of round-amount credits, and the gap between actual turnover and the declared profile.
3. **Link signals.** Several accounts on one device, shared beneficiaries, or one SIM tied to multiple handles. Mules tend to travel in groups, and one confirmed case should raise the score of its neighbours.
4. **Graded response.** Not every flag is a freeze. A low score gets monitoring. A medium score gets a lower UPI limit or a short hold on outgoing transfers plus a call. A high score goes to an analyst for restriction and, where warranted, an STR.
5. **Feedback loop.** Every confirmed mule, and every false alarm, goes back into the rules and model. RBI's innovation arm (the Reserve Bank Innovation Hub) announced MuleHunter.AI in December 2024 for exactly this problem, which tells me the industry direction is clear. A bank can use such a tool or build its own, but the loop matters either way.

One governance point I'd insist on: document the purpose and data minimisation for all of this under the DPDP Act, 2023 (and the DPDP Rules, 2025, as their obligations phase in), so the fraud team is not improvising its legal basis later.

A small reality check on false positives. A genuine account can look like a mule for a day. A wedding fund, a society collection, a Diwali cousin-repayment spree. Nobody's real account receives forty "thank you" payments from strangers at 2 a.m., except the one organising the family trip. That is why I score the shape of the week, not any single number, and why the first response is friction, not a freeze.

**Result (illustrative):** median detection moves from 21 days to 7 days, and the mule's active window shrinks accordingly.

## Benefit evaluation

Everything below is an **illustrative model**, not a reported result. Change the inputs to match your own book.

**Assumptions.** 40 mule accounts a month. About ₹50,000 of fraud proceeds passing through each account per active day. Detection 14 days earlier.

**Flow exposure avoided.** 40 × ₹50,000 × 14 = ₹2.8 crore a month of fraud proceeds that no longer pass through the bank's accounts. Most of that is customers' money rather than the bank's, so I don't count it as bank savings.

**What does land on the bank:**

- **Complaint handling.** Suppose a mule live for 21 days generates about 30 victim complaints, and one live for 7 days about 10. That is 20 fewer per mule, or 800 a month. At 1.5 hours each, that is 1,200 analyst and branch hours back every month. At ₹500 an hour fully loaded, that is about ₹6 lakh a month.
- **Goodwill and ex-gratia.** If the bank ends up absorbing even 3% of the avoided flow through goodwill gestures, that is about ₹8.4 lakh a month.

**Total:** about ₹14.4 lakh a month, or roughly ₹1.7 crore a year. Against an assumed first-year build and run cost of ₹1 crore, that is a net of about ₹0.7 crore. On these assumptions the first-year return is about 70%, and it improves from year two as the build cost falls away. These numbers are sensitive to your mule volume and complaint rate, which is why the calculator exists.

**Automation and analytics value.** The biggest operational gain is that analysts review a ranked queue instead of working complaint by complaint. The analytics gain compounds: each confirmed case sharpens the link signals for the next one.

The benefits that don't fit in a spreadsheet are real too: fewer reportable incidents, a better story for the regulator, and fewer customers who lose money through accounts the bank opened.

## Takeaways

- A mule account is a relay, not a savings account. Look for many-in, fast-out, near-zero balance, and turnover that does not fit the profile.
- The first seven days carry most of the signal. Do not wait for a victim complaint to start looking.
- Score shape and links, not single transactions. Mules travel in groups and share devices, SIMs and beneficiaries.
- Respond with graded friction first. Limits and a call beat a blanket freeze, and genuine customers will thank you for it.
- Build the feedback loop on day one, and keep the data use documented under the DPDP Act, 2023.
