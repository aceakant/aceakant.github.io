// "Talk to Ajay about this result": a visitor can choose to share their tool result with Ajay as a private link.
// Only genuine results can be shared: the service signs every result it returns, and /share checks that signature,
// so nobody can store a made-up "result" under Ajay's name. Saved results hold no files, names or contact details,
// and are deleted automatically after 30 days.

const DAYS = 30, PER_VISITOR_DAY = 20, DAILY = 300;
const TOOLS = ["model-risk", "review"];
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";  // no 0/O, 1/I/L

const enc = new TextEncoder();
export async function sign(secret, tool, payload) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(tool + "|" + JSON.stringify(payload)));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

function newId() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  const s = [...b].map((x) => ALPHABET[x % ALPHABET.length]).join("");
  return s.slice(0, 4) + "-" + s.slice(4);
}

// POST /share {tool, payload, sig}
export async function shareCreate(body, env, visitor, secret) {
  const tool = body && body.tool, payload = body && body.payload;
  if (!TOOLS.includes(tool) || !payload || typeof payload !== "object") return { status: 400, body: { error: "bad_request" } };
  if (!body.sig || body.sig !== await sign(secret, tool, payload)) return { status: 400, body: { error: "sig", message: "Only results made by the tool itself can be shared." } };
  const day = new Date().toISOString().slice(0, 10);
  const vKey = `share:v:${visitor}:${day}`, dKey = `share:d:${day}`;
  const mine = Number((await env.LIMITS.get(vKey)) || 0), today = Number((await env.LIMITS.get(dKey)) || 0);
  if (mine >= PER_VISITOR_DAY || today >= DAILY) return { status: 429, body: { error: "limit", message: "Too many shared results today. Your message can still be sent without the link." } };
  let id;
  for (let i = 0; i < 3 && !id; i++) { const c = newId(); if (!(await env.LIMITS.get(`share:${c}`))) id = c; }
  if (!id) return { status: 503, body: { error: "busy" } };
  const expires = new Date(Date.now() + DAYS * 86400000).toISOString().slice(0, 10);
  await env.LIMITS.put(`share:${id}`, JSON.stringify({ tool, payload, created: day, expires }), { expirationTtl: DAYS * 86400 });
  await env.LIMITS.put(vKey, String(mine + 1), { expirationTtl: 2 * 86400 });
  await env.LIMITS.put(dKey, String(today + 1), { expirationTtl: 2 * 86400 });
  return { status: 200, body: { id, expires } };
}

// GET /share?id=XXXX-XXXX
export async function shareRead(url, env) {
  const id = String(url.searchParams.get("id") || "").toUpperCase();
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(id)) return { status: 404, body: { error: "not_found" } };
  const raw = await env.LIMITS.get(`share:${id}`);
  if (!raw) return { status: 404, body: { error: "not_found" } };
  return { status: 200, body: JSON.parse(raw) };
}
