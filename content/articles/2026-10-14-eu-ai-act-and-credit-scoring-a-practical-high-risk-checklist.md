---
title: 'EU AI Act and credit scoring: a practical high-risk checklist'
slug: eu-ai-act-and-credit-scoring-a-practical-high-risk-checklist
date: '2026-10-14'
category: Credit Risk
status: published
test_run: false
market: EU
scenario: a mid-sized EU retail bank with a consumer-lending book (an illustrative composite, not a real institution)
publish_at: null
review_issue: 5
reminded: false
summary: Credit scoring of consumers is explicitly listed as high-risk under the EU AI Act. Here is a practical checklist for data, documentation, human oversight and monitoring, and what it could be worth to a risk analytics team.
hook:
  question: Under the EU AI Act, what is the maximum fine, as a share of worldwide annual turnover, for breaching the obligations that apply to high-risk systems such as credit scoring? (For larger firms it is the higher of this share or €15 million.)
  min: 0
  max: 10
  step: 1
  start: 5
  unit: '%'
  answer: 3
  answer_label: 3%
  explain: Article 99(4) of Regulation (EU) 2024/1689 sets fines for most operator obligations at up to €15 million or 3% of worldwide annual turnover, whichever is higher. The 7% tier is reserved for prohibited practices.
  source_url: https://eur-lex.europa.eu/eli/reg/2024/1689/oj
star:
  situation: An illustrative EU retail bank runs twelve consumer-credit models, with documentation built for model-risk reviews rather than the AI Act.
  task: Classify each model, close the gaps against the high-risk requirements, and build one reusable evidence pack before the applicable deadline.
  action: Inventory models, map each Annex III duty to an owner, standardise data and documentation templates, and define override and monitoring rules.
  result: Illustratively, documentation effort falls about 30%, and supervisory evidence requests are answered in days rather than weeks.
process:
- title: Inventory and classify models
  detail: List every model touching a natural person's credit decision. Record provider or deployer role and the reasoning for in-scope or out-of-scope.
- title: Document data per model
  detail: Create a one-page data sheet covering sources, time window, gaps and bias checks, reusing any existing data-lineage documentation.
- title: Build one technical file template
  detail: Use a single template that satisfies Annex IV, model-risk review and CCD2 explanation needs, with decision-level logging.
- title: Define human oversight rules
  detail: Name who can override, on what grounds and with what information. Track override rates as a KRI and train reviewers on automation bias.
- title: Monitor, log and escalate
  detail: Set thresholds for drift, calibration and fairness, write the post-market monitoring plan, and agree incident escalation.
calculator:
  title: How many documentation hours could your team get back each cycle?
  inputs:
  - id: models
    label: Credit models in AI Act scope
    value: 12
    min: 1
    max: 100
    step: 1
    unit: models
  - id: hours_per_model
    label: Hours to document one model from scratch
    value: 120
    min: 20
    max: 400
    step: 10
    unit: hours
  - id: saving_pct
    label: Saving from shared templates and reusable outputs
    value: 30
    min: 5
    max: 60
    step: 5
    unit: '%'
  formula: (models * hours_per_model * saving_pct) / 100
  result_label: Analyst hours saved per documentation cycle
  result_unit: hours
  basis: 'Illustrative model: models x hours per model x assumed percentage saving. The inputs are assumptions to be replaced with your own estimates, not published benchmarks.'
roi:
- metric: Maximum fine for breaching high-risk obligations
  value: Up to €15m or 3% of worldwide turnover, whichever is higher
  basis: Regulation (EU) 2024/1689, Article 99(4), 2024
- metric: Documentation hours saved per cycle
  value: 432 hours (12 models x 120 hours x 30%), about €30k at €70/hour
  basis: 'Illustrative model: assumed model count, effort per model, saving rate and hourly cost'
- metric: Time to answer an evidence request
  value: From about 10 working days to about 2
  basis: 'Illustrative model: assumes one evidence folder per model replaces document hunting'
myth_fact:
- statement: Any AI model a bank uses in the credit and fraud space is automatically high-risk under the EU AI Act.
  fact: false
  explain: Annex III point 5(b) covers creditworthiness evaluation and credit scoring of natural persons, but expressly excludes AI systems used to detect financial fraud.
- statement: AI systems used to evaluate the creditworthiness of natural persons or establish their credit score are listed as high-risk in Annex III of the EU AI Act.
  fact: true
  explain: This is Annex III, point 5(b) of Regulation (EU) 2024/1689. Under the Digital Omnibus (Regulation (EU) 2026/1744), the high-risk requirements for Annex III systems apply from 2 December 2027, not 2 August 2026.
- statement: The AI Act's credit-scoring high-risk category covers corporate rating models just as it covers consumer scorecards.
  fact: false
  explain: Point 5(b) refers to natural persons. Models for legal entities fall outside it, though sole traders and individual borrowers can be in scope.
image: media/eu-ai-act-and-credit-scoring-a-practical-high-risk-checklist/star-card.png
factcheck:
  status: verified
  summary: 'Agent fact-check plus human review on 1 Nov 2026: Digital Omnibus on AI (Regulation (EU) 2026/1744) and the 2 December 2027 Annex III date confirmed; AI Act article references and the CCD2 date of 20 November 2026 checked. Savings figures are a labelled illustrative model.'
  agent_summary: '11 verified, 8 corrected · Needs review: Article numbers 11, 13, 14, 15, 72 and 73 were not re-checked one by one against the EUR-Lex text in this review. Articles 11, 12, 14 and 27 were supported indirectly. A human should confirm that the Omnibus did not renumber or reword Articles 72, 73 and 15.; The sole-trader point is a legal inference (sole traders are natural persons), not a quoted rule. A human should confirm the wording is acceptable.; Under Article 99(6), SMEs and small mid-caps pay the lower of the two ceilings, and the Omnibus widened this to small mid-caps. The hook and penalty text assume a larger firm. A human may want to note this for smaller readers.; CCD2 applies from 20 November 2026, about three weeks after this review (1 November 2026). National transposition varies by Member State, so confirm the status in the target jurisdiction before publishing.'
sources:
- title: Regulation (EU) 2024/1689, the AI Act (EUR-Lex)
  url: https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- title: Regulation (EU) 2026/1744, Digital Omnibus on AI (EUR-Lex)
  url: https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng
- title: Regulation (EU) 2026/1744, Official Journal text
  url: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ%3AL_202601744
- title: RegulatoryAI.eu, AI in creditworthiness assessment
  url: https://www.regulatoryai.eu/ai-creditworthiness/
- title: European Commission AI Act Service Desk, Article 26
  url: https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-26
- title: Covington, Commission guidelines on the AI system definition
  url: https://www.insideprivacy.com/artificial-intelligence/european-commission-guidelines-on-the-definition-of-an-ai-system/
- title: Library of Congress, CJEU ruling on credit scoring (SCHUFA)
  url: https://www.loc.gov/item/global-legal-monitor/2024-01-10/european-union-court-of-justice-rules-credit-scoring-constitutes-automated-individual-decision-making-under-gdpr/
- title: EUR-Lex summary, Consumer Credit Directive (EU) 2023/2225
  url: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=LEGISSUM:4707402
- title: EBA, Guidelines on loan origination and monitoring
  url: https://www.eba.europa.eu/activities/single-rulebook/regulatory-activities/credit-risk/guidelines-loan-origination-and-monitoring
- title: vdf.ai, EU AI Act fines and penalties
  url: https://vdf.ai/blog/eu-ai-act-fines-penalties/
linkedin_post: 'Credit scoring is officially "high-risk" under the EU AI Act. Not a rumour, not a draft: it is Annex III, point 5(b).


  Three things I''d tell any risk analytics team:


  1. Scope carefully. Consumer and individual credit scoring is in. Fraud detection is carved out. Corporate-only models are not caught by that point.


  2. Build one evidence pack per model. Data sheet, technical file, logs, override rules and monitoring plan can serve the AI Act, GDPR Article 22, the new Consumer Credit Directive and EBA expectations at once.


  3. Human oversight means named people with the power to say no. If your override rate is zero, that is not confidence, it is a rubber stamp with a nice interface.


  The fine ceiling is up to €15m or 3% of worldwide turnover, but the bigger prize is never again hunting for "final_v7_REAL.pdf" during an audit.


  How far along is your model inventory: tidy spreadsheet, or archaeological dig?'
linkedin_shared: false
linkedin_hold: true
---

## The problem

I have yet to meet a risk analyst who woke up hoping to read Annex III of a regulation. But Annex III is where credit scoring lives now, so here we are.

Regulation (EU) 2024/1689, the AI Act, entered into force on 1 August 2024. Annex III, point 5(b), lists AI systems used to evaluate the creditworthiness of natural persons or to establish their credit score as high-risk. The one carve-out is AI used to detect financial fraud. The high-risk requirements were due to apply from 2 August 2026. The Digital Omnibus on AI, Regulation (EU) 2026/1744, entered into force on 27 July 2026 and moved the date for Annex III systems to 2 December 2027. The classification itself did not change. I would treat the extra runway as time to build evidence, not as a reason to relax.

Three scoping points trip teams up:

- **Natural persons only.** A corporate rating model is not caught by 5(b). Sole traders and other individual borrowers can be, so check your SME segments carefully.
- **Fraud is different.** Fraud-detection models sit outside this point. Do not let that make you relax about your application scorecards.
- **"Is my scorecard even AI?"** The Commission's February 2025 guidelines on the definition of an AI system exclude some simple prediction systems, and they name linear and logistic regression methods among the examples that can fall outside. I would still not rest a model inventory on "it's just a logistic regression". Write down your reasoning and have someone senior sign it.

The AI Act also does not arrive alone. GDPR Article 22 already limits solely automated decisions, and the CJEU's SCHUFA ruling (C-634/21, December 2023) said a score can itself count as an automated decision when a lender leans on it heavily. The revised Consumer Credit Directive (EU) 2023/2225 applies from 20 November 2026, which is before the AI Act's Annex III date, with its own rules on creditworthiness assessment, explanations and human intervention. The EBA Guidelines on loan origination and monitoring already set expectations on data and model governance. So the real task is not building a new compliance programme. It is knitting four or five overlapping ones into one.

## How I'd solve it

Let me walk through an illustrative scenario. It is a composite, not a real bank: a mid-sized EU retail bank with twelve consumer-credit models across application scoring, limit management and pricing. The models are well validated, but the documentation was written for internal model-risk review and the supervisor, not for the AI Act's technical file.

Here is the checklist I would work through, in this order.

**1. Inventory and classify first.** I would list every model that touches a natural person's credit decision, mark whether the bank is the provider (it built the model), the deployer (it uses a vendor's), or both, and record the classification reasoning. Vendor scores matter here: deployers have their own duties under Article 26.

**2. Data (Article 10).** Training, validation and test data must be relevant, sufficiently representative and, as far as possible, free of errors and complete. I would add a one-page data sheet per model: sources, time window, exclusions, known gaps, and bias checks on the groups you can lawfully examine. The AI Act now has a dedicated legal basis for processing special-category data to detect and correct bias, under strict safeguards. It is Article 4a, which replaced the former Article 10(5), and it is a permission, not an obligation. Involve the DPO early. If you already have data-lineage documentation, for example from BCBS 239-style work, reuse it here.

**3. Documentation and logging (Articles 11, 12, 13).** Annex IV sets out the technical file: purpose, design choices, performance metrics and limitations. Article 13 adds instructions for use for deployers. I would build one template that serves model risk, the AI Act and CCD2 explanations, instead of three documents that drift apart. Add event logging so a single decision can be reconstructed. Deployers must keep the logs they control for at least six months, and financial institutions can fold this into their existing record-keeping.

**4. Human oversight (Article 14).** "A human clicks approve" is not oversight. I would define who can override, on what grounds, with what information, and how often overrides are reviewed. I would also track override rates as a KRI. If they are near zero, people are probably rubber-stamping the model. If they are very high, the model is not doing its job. Reviewers also need training on automation bias. The AI literacy duty has applied since February 2025, and the Omnibus softened it in July 2026 to taking measures to support literacy.

**5. Accuracy, monitoring and incidents (Articles 15, 72, 73).** I would declare the accuracy and robustness metrics in the documentation and monitor them against thresholds: discrimination, calibration, stability, drift and outcome fairness. I would write a post-market monitoring plan that reuses the portfolio-monitoring pack you already produce, and agree who escalates a serious incident and how fast.

**6. Deployer extras.** For credit scoring of natural persons, deployers must also complete a fundamental rights impact assessment (Article 27) and tell affected people that a high-risk system is being used. Put both on the same calendar as model validation.

A rule of thumb worth adopting: one owner per article, one evidence folder per model, one review calendar for all of them.

## Benefit evaluation

Let me be clear that these numbers come from an illustrative model, not from a real programme.

**Penalty exposure.** This is the ceiling, not a forecast. For most operator obligations, fines can reach €15 million or 3% of worldwide annual turnover, whichever is higher. For a bank with €2 billion of turnover, 3% is €60 million. Nobody should budget on being fined. The point is that exposure is large relative to the cost of preparation.

**Documentation effort.** Suppose the bank has 12 in-scope models and each would take about 120 analyst-hours to document from scratch for AI Act purposes. If a shared template, one data-sheet format and reusable monitoring outputs cut that by 30%, the saving is 12 × 120 × 30% = 432 hours per documentation cycle. At a loaded cost of €70 an hour, that is roughly €30,000. It is small next to the exposure, but it recurs every revalidation cycle and frees analysts for actual analysis.

**Speed of evidence.** If the evidence for each model sits in one place, answering a supervisory or internal-audit request could drop, in this illustration, from ten working days to two. Much of the time saved is the hunt for the latest version of a PDF, a hunt every analyst has sworn to end.

**Analytics value.** Override-rate KRIs, drift monitoring and bias checks are not only compliance outputs. They tell you when a model is ageing, when a segment is being declined for the wrong reasons, and where manual review is wasted effort.

## Takeaways

- Credit scoring of natural persons is high-risk under Annex III 5(b). Fraud detection is carved out, and corporate-only models are not caught.
- Plan to the 2 December 2027 legal date set by Regulation (EU) 2026/1744, and note that CCD2 bites earlier, on 20 November 2026. Use the extra runway to build evidence, not to postpone it.
- Build one evidence pack per model that serves the AI Act, GDPR Article 22, CCD2 and EBA loan-origination expectations together.
- Human oversight needs named people, override rules and a KRI, not just a button.
- Monitoring you already do is half the job. The other half is writing it down and keeping the logs.
