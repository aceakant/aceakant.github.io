---
title: From spreadsheet sprawl to a governed MIS pipeline with lineage
slug: from-spreadsheet-sprawl-to-a-governed-mis-pipeline-with
date: '2026-11-05'
category: Automation
status: published
test_run: false
market: Global
scenario: a composite, internationally active bank (illustrative, not a real institution)
publish_at: null
review_issue: 8
reminded: false
summary: Management reporting built on chained spreadsheets is slow, fragile and hard to evidence. This piece shows how a governed pipeline with BCBS 239-style lineage returns analyst time, and gives a simple ROI model you can rerun with your own numbers.
hook:
  question: How many principles are in the Basel Committee's BCBS 239 standard on risk data aggregation and risk reporting?
  min: 0
  max: 40
  step: 1
  start: 20
  unit: principles
  answer: 14
  answer_label: 14 principles
  explain: 'The Basel Committee on Banking Supervision published BCBS 239 in January 2013 with 14 principles: 11 for banks and 3 for supervisors. Every one of them can be traced back to the question ''can you trust this number, and show me where it came from?'''
  source_url: https://www.bis.org/publ/bcbs239.htm
star:
  situation: A composite international bank produces monthly risk and performance MIS from hundreds of linked spreadsheets owned by individuals.
  task: Cut manual effort and make every reported number traceable to source, in line with BCBS 239 principles.
  action: 'Build a governed pipeline: certified sources, tested transformations, automated lineage, reconciliation controls and one metric layer.'
  result: 'Illustrative outcome: about 60% fewer manual reporting hours, same-day reconciliations and audit evidence produced on request.'
process:
- title: Inventory every recurring report
  detail: List owners, sources, audiences, effort and correction history. Rank by effort and risk to choose the first wave.
- title: Certify sources and owners
  detail: Assign one authoritative source and a named data owner to each critical metric before automating anything.
- title: Build layered, tested pipeline
  detail: Land raw data untouched, apply version-controlled rules, and define each KPI once in a shared metric layer.
- title: Capture lineage and controls
  detail: Record source-to-report lineage and run automated reconciliations and movement checks, with a logged break-and-fix process.
- title: Govern remaining spreadsheets
  detail: Put residual end-user tools under inventory, ownership and review policies, and track hours saved against the business case.
calculator:
  title: How many analyst hours could automation give back each year?
  inputs:
  - id: reports
    label: Recurring MIS reports per month
    value: 45
    min: 5
    max: 300
    step: 5
    unit: reports
  - id: hours
    label: Manual hours per report
    value: 7
    min: 1
    max: 40
    step: 1
    unit: hours
  - id: cut
    label: Share of manual effort removed
    value: 60
    min: 10
    max: 90
    step: 5
    unit: '%'
  formula: reports * hours * 12 * cut / 100
  result_label: Analyst hours returned per year
  result_unit: hours
  basis: 'Illustrative model: reports per month × manual hours per report × 12 months × share of effort removed. Inputs are assumptions to be replaced with your own time-tracking data.'
roi:
- metric: Analyst hours returned per year
  value: About 2,268 hours
  basis: 'Illustrative model: 45 reports × 7 hours × 12 months × 60% reduction'
- metric: Three-year ROI from time saved alone
  value: About 40% (USD 272k saved vs USD 195k cost)
  basis: 'Illustrative model: USD 40 per hour loaded cost, USD 120k build, USD 25k a year to run'
- metric: Payback period
  value: Under 2 years
  basis: 'Illustrative model: USD 120k build divided by about USD 65.7k net annual saving (USD 90.7k less USD 25k running cost)'
myth_fact:
- statement: BCBS 239 bans the use of spreadsheets in risk reporting.
  fact: false
  explain: The principles do not ban desktop tools. Where manual processes and spreadsheets are used, banks are expected to have effective mitigants such as end-user computing policies and consistently applied controls.
- statement: BCBS 239 only applies to global systemically important banks and is irrelevant to anyone else.
  fact: false
  explain: It was first aimed at G-SIBs, but the Basel Committee strongly suggests that national supervisors also apply it to domestic systemically important banks. Its data discipline is useful to any institution.
- statement: BCBS 239 expects risk data to be aggregated largely on an automated basis to reduce the chance of error.
  fact: true
  explain: Principle 3, on accuracy and integrity, says risk data should be aggregated on a largely automated basis to minimise the probability of errors.
image: media/from-spreadsheet-sprawl-to-a-governed-mis-pipeline-with/star-card.png
factcheck:
  status: verified
  summary: 'Agent fact-check plus human review on 5 Nov 2026: BCBS 239 (14 principles, January 2013, 2016 deadline) and the November 2023 progress report (31 G-SIBs, all needing more work) confirmed against BIS sources; an unconfirmed ''end-2022'' detail was removed. ROI figures are a labelled illustrative model.'
  agent_summary: '6 verified, 5 corrected · Needs review: Secondary sources (PwC, Asset Servicing Times) say only 2 of 31 G-SIBs were fully compliant with all principles in the 2023 report. I did not use this figure because I could not open the primary BCBS report (d559). Check it there if you want to add the number.; The ''end-2022'' data date for the 2023 report is supported by secondary sources only (the 2019 to 2022 comparison). Confirm it against the BIS report PDF (bis.org/bcbs/publ/d559.pdf) before publishing.'
sources:
- title: BIS (BCBS), Principles for effective risk data aggregation
  url: https://www.bis.org/publ/bcbs239.htm
- title: BIS (BCBS), BCBS 239 Principles, January 2013
  url: https://www.bis.org/publ/bcbs239.pdf
- title: BIS (BCBS), Progress report press release, March 2017
  url: https://www.bis.org/media-releases/20170328-progress-report-banks-implementation-principles-effective-risk-data-aggregation-and-reporting
- title: BIS (BCBS), Press release 28 November 2023
  url: https://www.bis.org/press/p231128.htm
- title: BIS (BCBS), Media release 28 November 2023
  url: https://www.bis.org/media-releases/20231128-basel-committee-report-implementing-principles-effective-risk-data-aggregation-and-reporting
linkedin_post: 'Every reporting team has a file called MIS_final_v7_REALfinal.xlsx. Nobody knows who made v6.


  This week I wrote about moving monthly MIS from spreadsheet sprawl to a governed data pipeline. Three things stood out:


  1. BCBS 239 does not ban spreadsheets. It asks for automation where it matters and real controls where manual tools remain.


  2. Lineage is the quiet hero. When every number can be traced to its source and its rules, "where did this come from?" becomes a lookup instead of a three-day dig.


  3. The ROI case can stand on analyst time alone. In an illustrative model, 45 monthly reports at seven hours each, with 60% of the effort removed, return about 2,270 hours a year. That is roughly a 40% three-year return before counting fewer restatements or easier audits.


  The humbling part: the Basel Committee''s November 2023 review found banks still at different stages of alignment with these principles, nearly ten years on, with more work needed at all of them. So if your Excel estate feels like a family tree with no records, you are in very large company.


  What is the one report in your organisation you would automate first, and why that one?'
linkedin_shared: false
---

## The problem

Every reporting team has a file with a name like `MIS_final_v7_REALfinal_use-this-one.xlsx`. We laugh because we have all opened it. The laughing stops when a board member asks why two reports show different delinquency numbers, and the honest answer is that someone changed a formula in tab nine.

Spreadsheet sprawl is rarely a decision. It is what happens when reporting demand grows faster than data engineering capacity. One analyst builds a clever workbook, a second links to it, a third copies the values into a deck. Within a few years the monthly MIS is a chain of manual hand-offs, and nobody can say which step is the weakest.

The regulatory benchmark for this problem is old but still the reference point. In January 2013 the Basel Committee published BCBS 239, *Principles for effective risk data aggregation and risk reporting*. It has 14 principles covering governance and infrastructure, aggregation capability, reporting practices and supervisory review. Its core attributes are accuracy and integrity, completeness, timeliness and adaptability. Global systemically important banks (G-SIBs) designated in 2011 and 2012 were expected to comply from January 2016, and later designations get three years. The Committee's progress report, published in November 2023 and covering 31 G-SIBs, found banks still at different stages of alignment, with additional work needed at all of them. If the largest banks, with the largest budgets, are still working on it, a spreadsheet-heavy MIS function is in good company. That is not an excuse, though.

Two misconceptions make the problem harder than it needs to be. The first is that BCBS 239 bans spreadsheets. It does not. It asks that where manual processes and desktop tools are used, there are effective mitigants such as end-user computing policies and consistently applied controls. It also expects risk data to be aggregated on a largely automated basis to reduce the chance of error. The second is that the standard is only for the biggest banks. The Committee strongly suggests that national supervisors also apply it to domestic systemically important banks, and the discipline is useful to any institution that wants numbers it can defend.

## How I'd solve it

This is an illustrative scenario about a composite international bank, not any real organisation. Picture a bank that produces about 45 recurring MIS packs a month: credit portfolio, fraud, collections, liquidity and management dashboards. Each pack takes roughly seven analyst-hours of extracting, pasting, reconciling and formatting. The people doing it are skilled, and most of their time goes on moving numbers instead of analysing them.

I would not start with a tool. I would start with an inventory. List every recurring report, its owner, its sources, its audience and how often someone has had to correct it. This usually shows that a small share of the reports consume most of the effort and carry most of the risk. Those go first.

Next, fix the sources. Each critical metric, such as exposure, days past due or loss, gets one certified source and one named data owner. Without this, automation just produces wrong numbers faster.

Then build the pipeline in layers. Raw data lands untouched. A transformation layer applies business rules as version-controlled, tested code instead of buried cell formulas. A metric layer defines each KPI once, so "90+ days past due rate" means the same thing on every page. Reports read from that layer and nowhere else.

Lineage is what makes this BCBS 239-style rather than simply tidier. For every number in a pack, the pipeline records which source fields fed it, which rules transformed it, when it ran and who approved the change. When someone asks where a figure came from, the answer is a lookup, not a three-day archaeology project. Add automated controls on top: row-count and balance reconciliations to the general ledger, threshold checks on period-on-period movements, and a clear break-and-fix log.

Finally, keep a sensible home for the spreadsheets that remain. Ad hoc analysis will always exist, and a good analyst will always want to try something quickly. Put those files under an end-user computing policy, with inventory, ownership and review. Nobody gets forbidden from using Excel. They just stop feeding the board pack from it.

In the illustrative case, I would expect manual effort per pack to fall by about 60% once the first wave of reports is migrated. The more lasting gain is trust: the numbers reconcile, and someone can show why.

## Benefit evaluation

Here is a simple model. It is illustrative, so treat every input as a placeholder for your own data.

**Time returned.** 45 reports a month × 7 hours = 315 hours a month, or 3,780 hours a year. A 60% reduction returns about 2,268 hours a year. At an assumed loaded cost of USD 40 an hour, that is roughly USD 90,700 of capacity a year.

**Costs.** Assume a one-off build of USD 120,000 (data engineering, tooling set-up, controls design) and USD 25,000 a year to run and maintain.

**Return.** Over three years the time saved is about USD 272,000 against costs of about USD 195,000 (120,000 + 3 × 25,000). That is a net gain of roughly USD 77,000, or about 40% ROI, from analyst time alone, with payback in under two years.

I deliberately leave out the harder-to-price benefits so the case survives a sceptical finance partner. They are still real:

- **Fewer restatements.** Every corrected report costs rework and some credibility.
- **Faster close.** MIS available earlier means decisions made earlier.
- **Audit and supervisory readiness.** Lineage turns evidence requests from a scramble into a query.
- **Analytics value.** Hours freed from copy-and-paste go into the work that changes outcomes, such as early-warning signals, segmentation and root-cause analysis of fraud or delinquency.

There is also a caution. Automation does not remove the need for judgement. A pipeline that faithfully reproduces a flawed definition is still wrong. Budget time for data owners to agree on definitions, because that is where most of these programmes succeed or stall.

## Takeaways

- Start with an inventory of reports, owners and error history. A few reports usually carry most of the effort and risk.
- BCBS 239 does not ban spreadsheets. It expects automation where it matters and controls where manual tools remain.
- Lineage, one metric definition and automated reconciliations are what turn a tidy report into a defensible one.
- Build the ROI case on analyst time alone, then treat fewer restatements, a faster close and audit readiness as upside.
- Fix definitions and ownership before you automate, or you will simply produce the wrong number faster.
