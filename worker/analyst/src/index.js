// The live AI tools on Ajay's website (Cloudflare Worker): Analyst on Call (/review) and Model Risk Check (/model-risk).
// It only answers Ajay's website, never receives raw data (a statistics summary, or answers to fixed questions),
// keeps the Claude key out of the browser, and limits use: a few free uses per visitor per tool, plus a daily cap
// per tool that protects the budget. Visitors are counted by a salted hash of their IP address; the IP is never stored.
import { runReview, VERSION } from "./review.js";
import { MR_VERSION, parseRequest, runModelRisk } from "./modelrisk.js";
import { hofRead, hofStart, hofSubmit } from "./hof.js";

const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const TOOLS = {
  review: { prefix: "", stats: "stats", noun: "reviews", paused: "Live reviews are paused for now. The three samples still work, or message Ajay for a review." },
  "model-risk": { prefix: "mr", stats: "stats_mr", noun: "checks", paused: "Live checks are paused for now. Your score above still stands; message Ajay for a full review." },
};

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || "https://aceakant.github.io").split(",").map((s) => s.trim());
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return json({ ok: true, service: "analyst-on-call", version: VERSION, model_risk: MR_VERSION }, 200, cors);
    // Public accountability tally for the Pulse page: totals only, nothing about any file, model or visitor.
    if (request.method === "GET" && url.pathname === "/stats") {
      const st = env.LIMITS ? JSON.parse((await env.LIMITS.get("stats")) || "null") : null;
      const mr = env.LIMITS ? JSON.parse((await env.LIMITS.get("stats_mr")) || "null") : null;
      return json({ ...(st || { reviews: 0 }), model_risk: mr || { checks: 0 } }, 200, { ...cors, "Access-Control-Allow-Origin": "*" });
    }
    // Playground Hall of Fame: public read; scores only from Ajay's website.
    if (request.method === "GET" && url.pathname === "/hof" && env.LIMITS) return hofRead(request, env, url, json, cors);
    if (!allowed.includes(origin)) return json({ error: "origin", message: "This service only answers Ajay Kant's website." }, 403, cors);
    if (!env.LIMITS || !env.ANTHROPIC_API_KEY) return json({ error: "not_ready", message: "The live service is not switched on yet." }, 503, cors);
    if (request.method === "POST" && (url.pathname === "/hof" || url.pathname === "/hof/start")) {
      const raw = await request.text();
      if (raw.length > 2000) return json({ error: "too_big" }, 413, cors);
      let body; try { body = JSON.parse(raw); } catch { body = null; }
      const salt = (await sha256("salt:" + env.ANTHROPIC_API_KEY)).slice(0, 24);
      const visitor = await sha256(salt + (request.headers.get("CF-Connecting-IP") || "unknown"));
      const secret = await sha256("hof:" + env.ANTHROPIC_API_KEY);
      const r = url.pathname === "/hof/start" ? await hofStart(body, env, visitor, secret, request.headers.get("X-Analyst-Test") === "1")
        : await hofSubmit(body, env, visitor, secret, (request.cf && request.cf.country) || request.headers.get("CF-IPCountry") || "");
      return json(r.body, r.status, cors);
    }

    const toolName = url.pathname === "/model-risk" || url.searchParams.get("tool") === "model-risk" ? "model-risk" : "review";
    const tool = TOOLS[toolName];
    const perVisitor = Number(env.FREE_PER_VISITOR || 5);
    const windowDays = Number(env.VISITOR_WINDOW_DAYS || 30);
    const dailyCap = Number(env.DAILY_CAP || 60);
    const day = new Date().toISOString().slice(0, 10);
    const salt = (await sha256("salt:" + env.ANTHROPIC_API_KEY)).slice(0, 24);
    const visitor = await sha256(salt + (request.headers.get("CF-Connecting-IP") || "unknown"));
    const vKey = `${tool.prefix ? tool.prefix + ":" : ""}v:${visitor}`, dKey = `${tool.prefix ? tool.prefix + ":" : ""}d:${day}`;
    const used = Number((await env.LIMITS.get(vKey)) || 0);
    const today = Number((await env.LIMITS.get(dKey)) || 0);

    if (request.method === "GET" && url.pathname === "/status")
      return json({ free: perVisitor, used, remaining: Math.max(0, perVisitor - used), open_today: today < dailyCap }, 200, cors);
    if (request.method !== "POST" || !["/review", "/model-risk"].includes(url.pathname)) return json({ error: "not_found" }, 404, cors);

    if (used >= perVisitor) return json({ error: "visitor_limit", remaining: 0, message: `You've used your ${perVisitor} free ${tool.noun}.` }, 429, cors);
    if (today >= dailyCap) return json({ error: "daily_cap", remaining: perVisitor - used, message: `Today's free ${tool.noun} have all been used. Please try again tomorrow.` }, 429, cors);

    const raw = await request.text();
    if (raw.length > 24000) return json({ error: "too_big", message: "The request is too large." }, 413, cors);
    let body;
    try { body = JSON.parse(raw); } catch { body = null; }

    let job;
    if (toolName === "review") {
      const summary = body && body.summary;
      if (!summary || typeof summary !== "object" || !summary.file || !Array.isArray(summary.columns))
        return json({ error: "bad_request", message: "Expected a statistics summary." }, 400, cors);
      job = (opts) => runReview(summary, opts);
    } else {
      const req = parseRequest(body);
      if (!req) return json({ error: "bad_request", message: "Please answer all 10 questions and pick a market." }, 400, cors);
      job = (opts) => runModelRisk(req, opts);
    }

    let result;
    const started = Date.now();
    try {
      result = await job({ apiKey: env.ANTHROPIC_API_KEY, backupKey: env.ANTHROPIC_API_KEY_BACKUP, workspace: env.ANTHROPIC_WORKSPACE_ID, model: env.MODEL || "claude-sonnet-5-5" });
    } catch (e) {
      if (/usage limits|enforced_spend_limit/i.test(String(e && e.message))) return json({ error: "paused", message: tool.paused }, 503, cors);
      // reason = the error type only (e.g. "Claude API 529"), never keys or data; helps the deploy check explain failures
      return json({ error: "upstream", message: "That didn't finish. Please try again in a minute.", reason: String(e && e.message || e).slice(0, 160) }, 502, cors);
    }
    await env.LIMITS.put(vKey, String(used + 1), { expirationTtl: windowDays * 86400 });
    await env.LIMITS.put(dKey, String(today + 1), { expirationTtl: 2 * 86400 });
    if (request.headers.get("X-Analyst-Test") !== "1") {  // the deploy job's own test isn't counted
      const blank = toolName === "review" ? { reviews: 0, findings: 0 } : { checks: 0, gaps: 0, markets: {} };
      const st = JSON.parse((await env.LIMITS.get(tool.stats)) || "null") || { since: day, ...blank, seconds: 0, verdicts: { confirmed: 0, corrected: 0, removed: 0, added: 0 } };
      if (toolName === "review") { st.reviews += 1; st.findings += result.findings.length; }
      else { st.checks += 1; st.gaps += result.gaps.length; st.markets[result.market] = (st.markets[result.market] || 0) + 1; }
      st.seconds += Math.round((Date.now() - started) / 1000);
      (result.reviews || []).forEach((r) => { if (r.verdict in st.verdicts) st.verdicts[r.verdict] += 1; });
      st.last = day;
      await env.LIMITS.put(tool.stats, JSON.stringify(st));
    }
    return json({ ...result, remaining: Math.max(0, perVisitor - used - 1), free: perVisitor }, 200, cors);
  },
};
