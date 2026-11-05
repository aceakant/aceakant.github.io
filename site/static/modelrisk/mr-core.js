// Model Risk Check: the shared core. The web page and the live service (Cloudflare Worker) both import this file,
// so the questions, the score and the fixed rulebook are always identical in both places.
// The score is worked out here from the answers alone (no AI). The AI only drafts and checks the gaps, and can
// only cite rules from the fixed, dated rulebook below.

export const RULES_AS_OF = "November 2026";

export const MARKETS = [
  { id: "UK", name: "UK", tag: "PRA SS1/23 · Consumer Duty" },
  { id: "EU", name: "EU", tag: "AI Act · EBA loan origination" },
  { id: "US", name: "US", tag: "SR 11-7 · fair lending" },
  { id: "Canada", name: "Canada", tag: "OSFI E-23" },
  { id: "Netherlands", name: "Netherlands", tag: "EU rules + DNB", eu: true },
  { id: "Ireland", name: "Ireland", tag: "EU rules + Central Bank", eu: true },
  { id: "Denmark", name: "Denmark", tag: "EU rules + Finanstilsynet", eu: true },
  { id: "Luxembourg", name: "Luxembourg", tag: "EU rules + CSSF", eu: true },
];

// Each scored answer is worth 2 (in place), 1 (partly) or 0 (gap). null = does not apply, left out of the score.
export const QUESTIONS = [
  { id: "decides", q: "What does the model decide?", area: null, options: [
    { id: "credit", label: "Approves or declines credit" },
    { id: "pricing", label: "Sets limits or prices" },
    { id: "fraud", label: "Flags fraud or financial crime" },
    { id: "assist", label: "Helps staff, decides nothing" } ] },
  { id: "inventory", q: "Is it in your model inventory with a risk rating?", area: "Inventory and risk rating", options: [
    { id: "yes", label: "Yes", pts: 2, note: "Listed and risk-rated" },
    { id: "listed", label: "Listed, not rated", pts: 1, note: "Listed but not risk-rated" },
    { id: "no", label: "No", pts: 0, note: "Not in the model inventory" },
    { id: "unknown", label: "Don't know", pts: 0, note: "Nobody could say if it is listed" } ] },
  { id: "validation", q: "Who validated it before it went live?", area: "Independent validation", options: [
    { id: "independent", label: "An independent team", pts: 2, note: "Validated by an independent team" },
    { id: "external", label: "An outside firm", pts: 2, note: "Validated by an outside firm" },
    { id: "builders", label: "The team that built it", pts: 0, note: "Validated by the team that built it" },
    { id: "none", label: "Not validated", pts: 0, note: "Never validated" } ] },
  { id: "human", q: "Can a person review or overturn its decisions?", area: "Human oversight", options: [
    { id: "always", label: "Always", pts: 2, note: "A person can always review and overturn" },
    { id: "appeal", label: "On appeal or for some cases", pts: 1, note: "Human review only on appeal or for some cases" },
    { id: "no", label: "No, it's fully automatic", pts: 0, note: "Decisions are fully automatic" } ] },
  { id: "data", q: "Was the training data checked for quality and bias across customer groups?", area: "Data and bias testing", options: [
    { id: "documented", label: "Yes, documented", pts: 2, note: "Data and bias checks are documented" },
    { id: "informal", label: "Informally", pts: 1, note: "Checked informally, not documented" },
    { id: "no", label: "Not yet", pts: 0, note: "No documented bias check" },
    { id: "unknown", label: "Don't know", pts: 0, note: "Nobody could say if it was checked" } ] },
  { id: "monitoring", q: "How is its performance monitored?", area: "Monitoring", options: [
    { id: "alerts", label: "Regular report with alert levels", pts: 2, note: "Regular report with alert levels" },
    { id: "adhoc", label: "Now and then", pts: 1, note: "Checked now and then, no alert levels" },
    { id: "none", label: "Not monitored", pts: 0, note: "Performance is not monitored" } ] },
  { id: "docs", q: "Could a new person understand, run and challenge it from the documentation?", area: "Documentation", options: [
    { id: "full", label: "Yes, full and up to date", pts: 2, note: "Full, current documentation" },
    { id: "partial", label: "Partly, or out of date", pts: 1, note: "Documentation is partial or out of date" },
    { id: "none", label: "No real documentation", pts: 0, note: "No real documentation" } ] },
  { id: "explain", q: "Can you explain an individual decision to the customer or to staff?", area: "Explaining decisions", options: [
    { id: "specific", label: "Yes, with specific reasons", pts: 2, note: "Specific reasons for each decision" },
    { id: "generic", label: "Only generic reasons", pts: 1, note: "Reasons given are generic" },
    { id: "no", label: "No", pts: 0, note: "Decisions can't be explained" } ] },
  { id: "change", q: "Do changes go through testing and approval before release?", area: "Change control", options: [
    { id: "formal", label: "Yes, formal sign-off", pts: 2, note: "Tested and signed off before release" },
    { id: "informal", label: "Informally", pts: 1, note: "Changes are approved informally" },
    { id: "no", label: "No", pts: 0, note: "Changes go live without approval" } ] },
  { id: "vendor", q: "Was it built in-house or bought from a vendor?", area: "Third-party oversight", options: [
    { id: "inhouse", label: "Built in-house", pts: null, note: "Built in-house" },
    { id: "tested", label: "Bought, and we test it ourselves", pts: 2, note: "Vendor model, tested by the firm" },
    { id: "trust", label: "Bought, we rely on the vendor", pts: 0, note: "Vendor model, relying on the vendor's word" } ] },
];

export const SAMPLES = [
  { id: "loan-scorecard", name: "Personal loan scorecard", blurb: "Machine-learning model that approves or declines loan applications",
    answers: { decides: "credit", inventory: "yes", validation: "builders", human: "no", data: "no", monitoring: "alerts", docs: "partial", explain: "generic", change: "formal", vendor: "inhouse" } },
  { id: "card-fraud", name: "Card fraud model", blurb: "Scores every card payment in real time and blocks the riskiest",
    answers: { decides: "fraud", inventory: "listed", validation: "independent", human: "appeal", data: "informal", monitoring: "alerts", docs: "full", explain: "generic", change: "informal", vendor: "trust" } },
  { id: "genai-complaints", name: "GenAI complaints assistant", blurb: "Drafts replies to customer complaints for staff to check and send",
    answers: { decides: "assist", inventory: "no", validation: "none", human: "always", data: "unknown", monitoring: "adhoc", docs: "partial", explain: "no", change: "informal", vendor: "tested" } },
];

export const VERDICT_BANDS = [
  { min: 80, label: "Largely ready", tone: "ok" },
  { min: 50, label: "Partly ready", tone: "part" },
  { min: 0, label: "Not ready yet", tone: "gap" },
];

export function marketById(id) { return MARKETS.find((m) => m.id === id) || null; }

// Check the answers are complete and valid, then work out the areas and the score. Returns null if anything is off.
export function scoreAnswers(answers) {
  if (!answers || typeof answers !== "object") return null;
  const areas = [];
  let got = 0, max = 0;
  for (const q of QUESTIONS) {
    const opt = q.options.find((o) => o.id === answers[q.id]);
    if (!opt) return null;
    if (!q.area || opt.pts === null || opt.pts === undefined) continue;
    got += opt.pts; max += 2;
    areas.push({ id: q.id, area: q.area, status: opt.pts === 2 ? "ready" : opt.pts === 1 ? "partly" : "gap", note: opt.note });
  }
  const score = max ? Math.round((got / max) * 100) : 0;
  const band = VERDICT_BANDS.find((b) => score >= b.min);
  const order = { gap: 0, partly: 1, ready: 2 };
  areas.sort((a, b) => order[a.status] - order[b.status]);
  return { score, verdict: band.label, tone: band.tone, areas };
}

// What the answers say in words, for the AI (never anything typed by the visitor except the model's name).
export function answersInWords(answers) {
  return QUESTIONS.map((q) => `${q.q} → ${(q.options.find((o) => o.id === answers[q.id]) || {}).label || "?"}`);
}

// ---------------------------------------------------------------------------------------------------------------
// The fixed rulebook. Each entry: a short citation label (the only citations the AI may use) and what it requires.
// Written as plain summaries, not legal text. Dated: see RULES_AS_OF.
const EU_CORE = [
  { cite: "EU AI Act · scope (Annex III)", text: "AI systems used to evaluate the creditworthiness of individuals or set their credit score are high-risk (Annex III 5(b)); so is risk assessment and pricing for life and health insurance (5(c)). AI used to detect financial fraud is expressly NOT high-risk under 5(b). Under the AI Omnibus (Regulation (EU) 2026/1744) the high-risk duties for Annex III systems apply from 2 December 2027, not August 2026. A traditional statistical scorecard may fall outside the Act's definition of an AI system; machine-learning models usually fall inside it." },
  { cite: "EU AI Act · Art. 9 risk management", text: "High-risk systems need a documented risk-management process across the whole life of the system: identify and test foreseeable risks, including to fundamental rights, and adopt measures to reduce them." },
  { cite: "EU AI Act · Art. 10 data governance", text: "Training, validation and test data for high-risk systems must follow data-governance practices: relevant, representative, checked for errors, and examined for possible biases that could lead to discrimination, with measures to detect and reduce them." },
  { cite: "EU AI Act · Art. 11 technical documentation", text: "Providers of high-risk systems must keep technical documentation (Annex IV) showing how the system meets the requirements, kept up to date." },
  { cite: "EU AI Act · Art. 12 record-keeping", text: "High-risk systems must automatically log events so their operation can be traced; deployers keep the logs they control for at least six months." },
  { cite: "EU AI Act · Art. 14 human oversight", text: "High-risk systems must be designed so trained people can oversee them: understand their limits, avoid over-relying on them, and decide not to use, override or reverse an output." },
  { cite: "EU AI Act · Art. 15 accuracy and robustness", text: "High-risk systems must reach and keep an appropriate level of accuracy, robustness and cybersecurity, declared in the instructions for use, throughout their life." },
  { cite: "EU AI Act · Art. 26-27 deployer duties", text: "Firms that use a high-risk system must use it as instructed, assign competent human oversight, monitor it and keep logs. Deployers of credit-scoring systems must also carry out a fundamental-rights impact assessment before first use." },
  { cite: "EU AI Act · Art. 43 conformity assessment", text: "Credit-scoring systems (Annex III point 5) are assessed through the provider's own internal control procedure (Annex VI). No outside notified body is needed." },
  { cite: "EU AI Act · Art. 50 transparency", text: "From 2 August 2026, people must be told when they are interacting with an AI system such as a chatbot, and certain AI-generated content must be marked. This applies whether or not the system is high-risk." },
  { cite: "EU AI Act · Art. 86 right to explanation", text: "A person affected by a decision based on a high-risk Annex III system's output can ask the deployer for a clear explanation of the AI's role and the main elements of the decision." },
  { cite: "GDPR · Art. 22 automated decisions", text: "People have the right not to be subject to a decision based solely on automated processing that significantly affects them, unless an exception applies; even then they must be able to get human intervention, give their view and contest it. The EU Court of Justice (SCHUFA, 2023) held that a credit score can itself be such a decision when a lender relies on it heavily." },
  { cite: "Consumer Credit Directive (EU) 2023/2225", text: "Applies from 20 November 2026. Creditworthiness assessments must be based on relevant, accurate information; where automated processing is used, the consumer can ask for human intervention, an explanation of the assessment and its logic, and to contest the decision." },
  { cite: "EBA loan origination guidelines · automated models", text: "EBA/GL/2020/06 (section 4.3.4): lenders using automated models for creditworthiness and credit decisions must understand the model and its limits, control data quality, be able to explain outputs, guard against bias, document the model, monitor performance regularly and keep human expertise to challenge it." },
  { cite: "DORA · ICT third-party risk", text: "The Digital Operational Resilience Act (applies from January 2025) requires financial entities to manage risk from ICT third-party providers, including due diligence, contract terms, a register of arrangements and exit plans." },
  { cite: "Model risk good practice", text: "Widely expected by supervisors: an inventory of all models with a risk rating; validation by people independent of the builders; documented change control; performance monitoring with thresholds; vendor models held to the same standard as in-house ones." },
];

export const RULEBOOK = {
  UK: [
    { cite: "PRA SS1/23 · scope", text: "PRA Supervisory Statement SS1/23 (model risk management principles, effective 17 May 2024) applies directly to UK banks and building societies with approval to use internal models for regulatory capital; the PRA expects other firms to use it as good practice. It covers all models, including AI and machine learning, and post-model adjustments." },
    { cite: "PRA SS1/23 · P1 model identification and risk classification", text: "Keep an inventory of all models with a risk tier based on materiality and complexity, which sets how much validation and oversight each model gets." },
    { cite: "PRA SS1/23 · P2 governance", text: "A board-approved model risk policy, clear roles, and a named senior manager accountable for the model risk framework." },
    { cite: "PRA SS1/23 · P3 development, implementation and use", text: "Documented development with sound data, testing and clear limits on use; documentation good enough for an independent party to understand and challenge the model." },
    { cite: "PRA SS1/23 · P4 independent validation", text: "Validation by people independent of development, before use and periodically after, plus ongoing performance monitoring against thresholds." },
    { cite: "PRA SS1/23 · P5 model risk mitigants", text: "Controls when models are weak or uncertain: post-model adjustments, restrictions on use, escalation and remediation tracking." },
    { cite: "FCA Consumer Duty", text: "Firms must act to deliver good outcomes for retail customers, avoid foreseeable harm, and monitor outcomes across groups of customers, including those with characteristics of vulnerability. Applies to how models shape products, prices, understanding and support." },
    { cite: "UK GDPR · automated decisions", text: "UK data protection law (UK GDPR, as amended by the Data (Use and Access) Act 2025): people subject to significant decisions made solely by automated means must be told, and be able to make representations, obtain human intervention and contest the decision." },
    { cite: "Equality Act 2010", text: "Firms must not discriminate, directly or indirectly, on protected characteristics such as age, sex, race or disability, including through a model's outcomes." },
    { cite: "Operational resilience · third parties", text: "PRA and FCA outsourcing and third-party risk rules (PRA SS2/21): firms remain responsible for services and models bought from vendors and must oversee them." },
  ],
  EU: EU_CORE,
  US: [
    { cite: "SR 11-7 · model risk management", text: "Federal Reserve SR 11-7 / OCC Bulletin 2011-12 (adopted by the FDIC in 2017): supervisory guidance on model risk management, applied in proportion to a bank's size and complexity. Covers any quantitative model, including machine learning and AI." },
    { cite: "SR 11-7 · development, implementation and use", text: "Sound design and data, testing, documentation detailed enough for someone unfamiliar with the model to understand how it works, its limits and assumptions." },
    { cite: "SR 11-7 · validation and effective challenge", text: "Validation by staff independent of development with the authority to challenge: conceptual soundness, ongoing monitoring and outcomes analysis such as back-testing." },
    { cite: "SR 11-7 · governance and inventory", text: "Board and senior management oversight, written policies, a firm-wide model inventory, and controls over model changes." },
    { cite: "SR 11-7 · vendor models", text: "Vendor and third-party models are subject to the same principles; banks must understand and validate them as far as possible." },
    { cite: "ECOA / Regulation B · adverse action reasons", text: "Creditors must give applicants who are denied credit the specific principal reasons for the decision; using a complex or AI model does not remove this duty." },
    { cite: "ECOA · fair lending", text: "The Equal Credit Opportunity Act prohibits discrimination in any aspect of a credit transaction on a prohibited basis such as race, sex, age or marital status. Testing model outcomes across groups is expected good practice." },
    { cite: "Interagency third-party guidance (2023)", text: "The 2023 interagency guidance on third-party relationships expects banks to manage the risk of vendors across the whole life of the relationship: due diligence, contracts, ongoing monitoring and exit." },
  ],
  Canada: [
    { cite: "OSFI E-23 · scope and timing", text: "OSFI Guideline E-23 (Model Risk Management, final September 2025, effective 1 May 2027) applies to federally regulated financial institutions: banks, insurers, and trust and loan companies. It is principles-based, technology-neutral and covers AI and machine-learning models across the whole enterprise." },
    { cite: "OSFI E-23 · inventory and risk rating", text: "Keep an inventory of all models with a risk rating based on quantitative and qualitative criteria. The rating drives the depth of review, monitoring, documentation, approval authority and controls." },
    { cite: "OSFI E-23 · lifecycle governance", text: "Risk-based policies covering the full lifecycle: rationale, data, development, review, approval, deployment, monitoring and decommissioning, with clear accountability." },
    { cite: "OSFI E-23 · review and monitoring", text: "Models are reviewed before use with independence proportionate to their risk, and monitored on an ongoing basis at a frequency set by the risk rating." },
    { cite: "OSFI B-10 · third-party models", text: "Models and data from vendors or other external sources are in scope and must be managed under Guideline B-10 (Third-Party Risk Management)." },
    { cite: "Quebec Law 25 · automated decisions", text: "In Quebec, a business that makes a decision about a person based exclusively on automated processing must tell them, and on request explain the main factors and let them submit observations to someone who can review the decision." },
    { cite: "Fair treatment and human rights", text: "The federal Financial Consumer Protection Framework expects fair treatment of customers, and human rights law prohibits discrimination on protected grounds, including through a model's outcomes." },
  ],
  Netherlands: [
    { cite: "DNB · general principles for AI", text: "De Nederlandsche Bank's general principles for the use of AI in the financial sector (SAFEST): soundness, accountability, fairness, ethics, skills and transparency." },
    { cite: "AFM · fair customer treatment", text: "The Dutch conduct supervisor AFM expects automated advice and decisions to treat customers fairly and to be explainable." },
  ],
  Ireland: [
    { cite: "Central Bank of Ireland · Consumer Protection Code", text: "The revised Consumer Protection Code (applies from 24 March 2026) requires firms to act in customers' best interests, with stronger expectations on digitalisation, informing customers effectively and supporting customers in vulnerable circumstances." },
  ],
  Denmark: [
    { cite: "Finanstilsynet · supervision", text: "The Danish Financial Supervisory Authority supervises Danish banks and lenders and applies EU rules on governance, credit and model risk; the Danish Data Protection Agency oversees automated decisions under the GDPR." },
  ],
  Luxembourg: [
    { cite: "CSSF Circular 22/806 · outsourcing", text: "CSSF Circular 22/806 sets requirements for outsourcing, including ICT and cloud services: due diligence, contracts, oversight and exit strategies. Relevant to vendor models." },
    { cite: "CSSF · supervision", text: "The CSSF supervises Luxembourg banks, investment firms and funds and applies EU rules on governance, credit and model risk." },
  ],
};

// The full rulebook for a market: EU members get the EU rules plus their local supervisor.
export function rulebookFor(marketId) {
  const m = marketById(marketId);
  if (!m) return null;
  if (m.id === "EU") return EU_CORE;
  if (m.eu) return [...EU_CORE, ...(RULEBOOK[m.id] || [])];
  return [...RULEBOOK[m.id], { cite: "Model risk good practice", text: EU_CORE[EU_CORE.length - 1].text }];
}
