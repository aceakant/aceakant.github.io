// Analyst on Call: the live service (Cloudflare Worker).
// It only answers Ajay's website, only accepts a statistics summary (never raw data), keeps the Claude key
// out of the browser, and limits use: a few free reviews per visitor, plus a daily cap that protects the budget.
// Visitors are counted by a salted hash of their IP address; the IP itself is never stored.
import { runReview, VERSION } from "./review.js";

const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
    if (request.method === "GET" && url.pathname === "/") return json({ ok: true, service: "analyst-on-call", version: VERSION }, 200, cors);
    if (!allowed.includes(origin)) return json({ error: "origin", message: "This service only answers Ajay Kant's website." }, 403, cors);
    if (!env.LIMITS || !env.ANTHROPIC_API_KEY) return json({ error: "not_ready", message: "The live analyst is not switched on yet." }, 503, cors);

    const perVisitor = Number(env.FREE_PER_VISITOR || 5);
    const windowDays = Number(env.VISITOR_WINDOW_DAYS || 30);
    const dailyCap = Number(env.DAILY_CAP || 60);
    const day = new Date().toISOString().slice(0, 10);
    const salt = (await sha256("salt:" + env.ANTHROPIC_API_KEY)).slice(0, 24);
    const visitor = await sha256(salt + (request.headers.get("CF-Connecting-IP") || "unknown"));
    const vKey = `v:${visitor}`, dKey = `d:${day}`;
    const used = Number((await env.LIMITS.get(vKey)) || 0);
    const today = Number((await env.LIMITS.get(dKey)) || 0);

    if (request.method === "GET" && url.pathname === "/status")
      return json({ free: perVisitor, used, remaining: Math.max(0, perVisitor - used), open_today: today < dailyCap }, 200, cors);
    if (request.method !== "POST" || url.pathname !== "/review") return json({ error: "not_found" }, 404, cors);

    if (used >= perVisitor) return json({ error: "visitor_limit", remaining: 0, message: `You've used your ${perVisitor} free reviews.` }, 429, cors);
    if (today >= dailyCap) return json({ error: "daily_cap", remaining: perVisitor - used, message: "Today's free reviews have all been used. Please try again tomorrow." }, 429, cors);

    const raw = await request.text();
    if (raw.length > 24000) return json({ error: "too_big", message: "The summary is too large." }, 413, cors);
    let summary;
    try { summary = JSON.parse(raw).summary; } catch { summary = null; }
    if (!summary || typeof summary !== "object" || !summary.file || !Array.isArray(summary.columns))
      return json({ error: "bad_request", message: "Expected a statistics summary." }, 400, cors);

    let result;
    try {
      result = await runReview(summary, { apiKey: env.ANTHROPIC_API_KEY, workspace: env.ANTHROPIC_WORKSPACE_ID, model: env.MODEL || "claude-sonnet-5-5" });
    } catch (e) {
      return json({ error: "upstream", message: "The analyst couldn't finish this one. Please try again in a minute." }, 502, cors);
    }
    await env.LIMITS.put(vKey, String(used + 1), { expirationTtl: windowDays * 86400 });
    await env.LIMITS.put(dKey, String(today + 1), { expirationTtl: 2 * 86400 });
    return json({ ...result, remaining: Math.max(0, perVisitor - used - 1), free: perVisitor }, 200, cors);
  },
};
