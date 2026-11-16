---
title: Thin file or no file? Spotting synthetic identities before they bust out
slug: thin-file-or-no-file-spotting-synthetic-identities-before
date: '2026-11-16'
category: Fraud Risk
status: draft
test_run: false
market: US
scenario: a mid-sized US regional bank with a credit card and personal loan book
publish_at: null
review_issue: 10
reminded: false
summary: Synthetic identities are built to look like thin-file customers, and traditional fraud models often miss them. This piece sets out the signals that separate a real newcomer to credit from a person who doesn't exist, and what catching them late costs a US lender.
hook:
  question: Of the applicants identified as synthetic identities, what share were not flagged by traditional fraud models, according to an estimate the Federal Reserve cited? Guess the lower end of the range.
  min: 0
  max: 100
  step: 1
  start: 50
  unit: '%'
  answer: 85
  answer_label: 85% (the range is 85-95%)
  explain: The Federal Reserve's July 2019 white paper on synthetic identity fraud cites an ID Analytics estimate that 85-95% of applicants identified as synthetic identities were not flagged as high risk by traditional fraud models. The low end of the range is already uncomfortable.
  source_url: https://fedpaymentsimprovement.org/wp-content/uploads/frs-synthetic-identity-payments-fraud-white-paper-july-2019.pdf
star:
  situation: A composite US regional bank sees card charge-offs from accounts that never answer the phone and never existed.
  task: Separate coherent thin-file customers from hollow synthetic identities at application without declining genuine newcomers to credit.
  action: Verify the SSN core, score cross-source consistency, link shared attributes, then route ambiguous files to step-up checks.
  result: Illustratively, synthetic losses fall by about 40%, and genuine thin-file approvals hold steady.
process:
- title: Verify the identity core
  detail: Check name, SSN and date of birth against the issuing source using consent-based SSA verification. Treat a pass as a first gate, not a verdict.
- title: Score cross-source consistency
  detail: Compare SSN age, phone, email and address tenure against the stated age. Real people leave coherent, long-lived footprints.
- title: Link shared attributes
  detail: Cluster applications by shared device, phone, email or address to expose batch-built identities.
- title: Route, don't just decline
  detail: Send ambiguous thin files to step-up verification so genuine newcomers can still be approved.
- title: Monitor early-life behaviour
  detail: Watch utilisation ramps, limit-increase requests and contact failures, and tag confirmed bust-outs as fraud for model learning.
calculator:
  title: What could earlier detection of synthetic identities be worth each year?
  inputs:
  - id: monthly_apps
    label: Applications per month
    value: 20000
    min: 1000
    max: 200000
    step: 1000
    unit: applications
  - id: synth_rate
    label: Share of applications that are synthetic
    value: 0.3
    min: 0.05
    max: 2
    step: 0.05
    unit: '%'
  - id: avg_loss
    label: Average loss per undetected synthetic account
    value: 9000
    min: 1000
    max: 30000
    step: 500
    unit: US$
  formula: monthly_apps * 12 * (synth_rate / 100) * avg_loss * 0.4
  result_label: Estimated annual loss avoided
  result_unit: US$
  basis: 'Illustrative model: annual applications x synthetic share x average loss per account x an assumed 40% of losses prevented by earlier detection. Excludes vendor, tooling and analyst costs, and is not drawn from any real lender.'
roi:
- metric: Applicants identified as synthetic but not flagged by traditional fraud models
  value: 85-95%
  basis: ID Analytics estimate cited in Federal Reserve, Synthetic Identity Fraud white paper, July 2019
- metric: Annual loss avoided in the worked example
  value: About US$2.6 million
  basis: 'Illustrative model: 240,000 applications x 0.3% x US$9,000 x 40% prevented'
- metric: Consumer-reported fraud losses, all fraud types, 2025
  value: US$15.9 billion
  basis: FTC Consumer Sentinel Network, FTC testimony to the Joint Economic Committee, March 2026 (context, not synthetic-specific)
myth_fact:
- statement: A thin credit file is a reliable sign that an applicant is a synthetic identity.
  fact: false
  explain: Young adults and recent arrivals legitimately have thin files. Better signals are inconsistencies across sources, such as very new contact data or attributes shared with many other applicants.
- statement: Synthetic identities often mix real and fictitious information, such as a genuine SSN with an invented name.
  fact: true
  explain: 'This is how the Federal Reserve describes synthetic identity fraud: fictitious and sometimes real information, such as names and SSNs, combined into a new identity. The mix of real and fake details is what lets these identities pass simple checks.'
- statement: You can still judge whether an SSN is plausible by reading its first three digits for the state of issue.
  fact: false
  explain: The SSA moved to randomised SSN assignment on June 25, 2011, so prefix-based geographic logic does not work for newer numbers.
image: media/thin-file-or-no-file-spotting-synthetic-identities-before/star-card.png
factcheck:
  status: needs-review
  summary: '3 corrected, 6 verified · Needs review: Please confirm the exact wording of the Federal Reserve''s definition of synthetic identity fraud against the Fed''s 2020 paper ''Mitigating Synthetic Identity Fraud in the U.S. Payment System''. I saw it only as quoted by a secondary source.; The hook''s earlier source URL (fedpaymentsimprovement.org/synthetic-identity-fraud/) could not be confirmed, so it was replaced with the July 2019 white paper PDF.; The article uses UK-style spellings (utilisation, randomised, authorised). Consider switching to US spellings for a US audience.'
sources:
- title: 'Federal Reserve, Payments Fraud Insights: Synthetic Identity Fraud, July 2019'
  url: https://fedpaymentsimprovement.org/wp-content/uploads/frs-synthetic-identity-payments-fraud-white-paper-july-2019.pdf
- title: FTC, Prepared Statement to the Joint Economic Committee, March 2026
  url: https://search.ftc.gov/system/files/ftc_gov/pdf/ftc-testimony-jec-hearing-on-the-rising-scam-economy.pdf
- title: SSA, Social Security Number Randomization FAQs
  url: https://www.ssa.gov/employer/randomizationfaqs.html
- title: SSA, eCBSV Home
  url: https://www.ssa.gov/dataexchange/eCBSV/
- title: Cornell LII, 12 CFR 1002.9 (Regulation B) Notifications
  url: https://www.law.cornell.edu/cfr/text/12/1002.9
- title: 'Federal Reserve, Payments Fraud Insights: Detecting Synthetic Identity Fraud, Oct 2019'
  url: https://fedpaymentsimprovement.org/wp-content/uploads/frs-synthetic-identity-payments-fraud-white-paper-october-2019.pdf
linkedin_post: '85-95%. That is the share of applicants identified as synthetic identities that traditional fraud models did not flag, according to an estimate the Federal Reserve cited in its 2019 white paper.


  The awkward part is that these applicants are built to look like the thin-file customers we actually want to lend to.


  Three things I''d look at:


  1. Does the story agree across sources? Real people leave a boring, consistent footprint. Fabricated ones look great in exactly one place.


  2. Who else shares this phone, device or address? Two roommates is life. Fourteen is a committee.


  3. Can an ambiguous file go to step-up checks instead of a flat decline? That is how you protect genuine newcomers to credit.


  A 34-year-old with a two-week-old email and a three-day-old phone is either very private or very new. Worth a second look either way.


  One more thing: if bust-outs are booked as credit losses, your fraud dashboard looks calm while your credit models learn from bad labels.


  How does your team tell a thin-file customer from a thin-air customer?'
linkedin_shared: false
---

## The problem

The Federal Reserve describes synthetic identity fraud as a crime in which perpetrators combine fictitious and sometimes real information, such as SSNs and names, to create new identities to defraud financial institutions. The key word is *new*. There is no victim, so nobody calls to say "that isn't me". The identity is nurtured with small credit lines and piggybacked tradelines, then it "busts out" with maximum utilisation and silence.

A 2019 Federal Reserve white paper cites an ID Analytics estimate that 85-95% of applicants identified as synthetic identities were not flagged as high risk by traditional fraud models. That makes sense when you think about how those models are built. They look for a real person whose details were stolen. A synthetic identity has no such history to contradict it, and it often looks like a young adult or a recent arrival with a thin file.

That is the uncomfortable part. Thin-file genuine customers are people we want to lend to. Tighten the rules and we decline them. Loosen the rules and we fund ghosts.

The loss also hides well. A bust-out often gets booked as a credit charge-off, not as fraud, so the problem shows up in the credit numbers while the fraud dashboard stays calm. For context on the wider picture, the FTC reported that consumers lost US$15.9 billion to fraud in 2025, up from US$12.5 billion in 2024. That figure covers all fraud types, not just synthetic, but it shows the scale of the environment lenders operate in.

## How I'd solve it

Here is an illustrative scenario. It is a composite, not a real institution: a mid-sized US regional bank with a card and personal loan book, taking around 20,000 applications a month. Its fraud team sees accounts that were well-behaved for eight months, then maxed out and disappeared.

The approach I'd take has five parts.

**1. Verify the identity core.** Check name, SSN and date of birth against the issuing source. The Social Security Administration's electronic Consent Based SSN Verification (eCBSV) service exists for this purpose. It is a fee-based service for permitted entities (financial institutions and their service providers) and works with the applicant's consent. A failed match is a strong signal. A pass is only the first check, because a real SSN can be paired with the wrong person.

**2. Score consistency across independent sources.** A real person leaves traces in many places, and those traces tend to agree. A fabricated one tends to look good in one place only. I'd look at:

- Age of the SSN against date of birth. An SSN first appearing in credit data decades after the stated birth year needs an explanation. Newcomers and children's SSNs have legitimate explanations, so this is a flag, not a verdict.
- Tenure of phone, email and address against the applicant's stated age. A 34-year-old with a two-week-old email and a three-day-old phone is either very private or very new.
- Whether the story is coherent. Genuine thin-file customers usually have a plain, boring footprint: one employer, one address history, one bank account that has existed for a while.

One caution. Since June 2011 the SSA has randomised SSN assignment, so the old trick of reading the number's prefix to infer where and roughly when it was issued no longer works for newer numbers. Any rule built on that logic needs retiring.

**3. Link attributes across applications.** Synthetic identities are manufactured in batches. Look for one phone number, device, address or email shared by several "different" applicants. A shared apartment explains two or three. It does not explain fourteen, unless the roommates are very committed.

**4. Separate thin-but-coherent from thin-and-hollow.** This is the step that protects growth. A thin file with consistent, long-lived contact data and verified income goes through. A thin file with young contact data, shared attributes and authorised-user tradelines goes to step-up verification, not an automatic decline.

**5. Keep watching after booking.** Early-life signals include rapid limit-increase requests, utilisation ramps, and no contact response. Where a decline is the outcome, adverse action notices under ECOA/Regulation B still apply, so the reasons need to be documented and defensible.

In the scenario, the bank pilots this on new-to-credit applicants first. Ambiguous files go to a small review queue rather than a blanket decline, and the illustrative result is a meaningful drop in bust-out losses with genuine thin-file approvals broadly unchanged.

## Benefit evaluation

The maths below is an illustrative model, not a result from any real lender.

- Applications: 20,000 a month, or 240,000 a year.
- Suspected synthetic rate: 0.3%, which is 720 accounts a year.
- Average loss per undetected synthetic account: US$9,000. That gives US$6.48 million a year.
- If earlier detection prevents 40% of that, the avoided loss is about US$2.6 million a year.

The 40% is an assumption, so treat it as a dial rather than a promise. I have not netted off verification fees, tooling or analyst time, and those would come out of the figure. They are usually a fraction of the avoided loss, but they are not zero.

The operational gains come from catching the problem at the door. A decline at application costs one review. A bust-out costs the whole credit line, collections effort and a charge-off that muddies the portfolio data. Routing only ambiguous files to review also keeps the queue small, so analysts spend time on the files that need a human.

The cost on the other side is false positives. Every genuine newcomer wrongly declined is lost lifetime revenue, plus a customer who may not come back. That is why step 4 matters as much as the detection itself. A model that catches ghosts by turning away real people has just moved the loss somewhere else.

There is also an analytics benefit that rarely makes the business case. Once synthetic losses are tagged as fraud instead of credit, the credit models stop learning from bad labels. Credit performance data gets cleaner, and the next scorecard is built on a more honest picture of who actually defaults.

## Takeaways

- Synthetic identities are designed to look like thin-file customers, so a thin file alone is not a signal. Inconsistency across sources is.
- Verify the identity core first, then test whether phone, email, address and SSN tell the same story.
- Link applications by shared attributes. Synthetic identities are made in batches, and the batch is where they get caught.
- Route ambiguous files to step-up checks instead of declining outright. Protect the genuine newcomers.
- Tag bust-outs as fraud, not just credit loss, so both the fraud and credit models learn the right lesson.
