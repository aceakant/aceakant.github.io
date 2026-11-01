// Prepares the maker-checker reviews for the three sample files, using exactly the same data check and the same
// instructions as the live service. Runs in GitHub Actions (needs ANTHROPIC_API_KEY). Writes <id>.review.json.
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { runReview } from "../../worker/analyst/src/review.js";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const P = require(path.join(ROOT, "site/static/analyst/profile.js"));
const DIR = path.join(ROOT, "site/static/analyst/samples");
const model = (fs.readFileSync(path.join(ROOT, "config.yaml"), "utf8").match(/^\s*model:\s*"?([\w.-]+)"?/m) || [])[1] || "claude-sonnet-5-5";

if (!process.env.ANTHROPIC_API_KEY) { console.log("No ANTHROPIC_API_KEY, nothing to do."); process.exit(0); }
const only = process.argv[2];
for (const s of JSON.parse(fs.readFileSync(path.join(DIR, "samples.json"), "utf8"))) {
  if (only && only !== s.id) continue;
  const prof = P.profile(P.parseCSV(fs.readFileSync(path.join(DIR, s.file), "utf8")), { name: s.file });
  const summary = P.summaryForAI(prof);
  const t0 = Date.now();
  const result = await runReview(summary, { apiKey: process.env.ANTHROPIC_API_KEY, workspace: process.env.ANTHROPIC_WORKSPACE_ID, model });
  const out = { sample: s.id, generated: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), summary_chars: JSON.stringify(summary).length, ...result };
  fs.writeFileSync(path.join(DIR, `${s.id}.review.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(`[analyst] ${s.id}: ${result.findings.length} final findings, verdicts ${result.reviews.map((r) => r.verdict).join("/")}, ${out.seconds}s`);
}
