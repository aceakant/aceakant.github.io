// Playground Hall of Fame: monthly top scores per game and overall, plus a count of unique players to date.
// No AI and nothing personal: a nickname the player chooses (filtered), their score, the game, the country
// Cloudflare reports and the date. Players are counted by the same salted hash the tools use; no IP is stored.
// Anti-cheat: a signed start token per game (bound to the visitor), a minimum play time, scores 0-100 only,
// one score per game per visitor per day, and a daily cap on submissions.

const MIN_SECONDS = 8, MAX_AGE = 3 * 3600, BOARD = 10, DAILY_SUBMITS = 300, CACHE_SECONDS = 60;

// Words a nickname may not contain (checked after lower-casing, mapping look-alike digits, and removing
// everything except letters). Includes impersonation of the site owner.
const BLOCKED = ["fuck", "fuk", "fck", "shit", "cunt", "dick", "cock", "pussy", "bitch", "bastard", "whore", "slut", "nigg", "nigr",
  "fag", "rape", "porn", "sex", "nazi", "hitler", "kill", "penis", "vagina", "boob", "anal", "anus", "wank", "twat", "retard", "spastic",
  "chutiy", "chutia", "madarch", "bhenchod", "behenchod", "bhosd", "lund", "lauda", "loda", "gandu", "randi", "harami", "kutta", "kamina", "chod",
  "ajay", "admin", "moderator", "official", "anthropic", "claude", "vertexnode"];

export function nicknameProblem(raw) {
  const name = String(raw || "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 14) return "Please use 2 to 14 characters.";
  if (!/^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(name)) return "Letters, numbers, spaces, - and _ only, please.";
  const flat = name.toLowerCase().replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t").replace(/[^a-z]/g, "");
  if (BLOCKED.some((w) => flat.includes(w))) return "Please pick another nickname.";
  return null;
}

const enc = new TextEncoder();
async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function rank(list) {
  return list.sort((a, b) => b.p - a.p || a.s - b.s || (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}
// Insert an entry, keeping each nickname's best score once per game. Returns [newList, position or 0].
function place(list, entry) {
  const same = (x) => x.n.toLowerCase() === entry.n.toLowerCase() && x.g === entry.g;
  const old = list.find(same);
  if (old && (old.p > entry.p || (old.p === entry.p && old.s <= entry.s))) return [list, 0];
  const next = rank(list.filter((x) => !same(x)).concat([entry])).slice(0, BOARD);
  const pos = next.indexOf(entry) + 1;
  return [next, pos];
}

const monthOf = (day) => day.slice(0, 7);
function prevMonth(m) { const [y, mo] = m.split("-").map(Number); return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`; }

async function getJSON(env, key, fallback) { try { return JSON.parse((await env.LIMITS.get(key)) || "null") ?? fallback; } catch { return fallback; } }

async function banned(env) { return new Set((await getJSON(env, "hof:ban", [])).map((s) => String(s).toLowerCase())); }
const show = (list, ban, n) => list.filter((x) => !ban.has(x.n.toLowerCase())).slice(0, n);

// Public read: GET /hof (overall top 5, players to date, last month's top 3) or GET /hof?game=<id> (that game's top 5).
export async function hofRead(request, env, url, json, headers) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  if (cache) { const hit = await cache.match(cacheKey); if (hit) return hit; }
  const day = new Date().toISOString().slice(0, 10), month = monthOf(day), ban = await banned(env);
  const game = url.searchParams.get("game");
  let body;
  if (game && /^[a-z0-9-]{2,40}$/.test(game)) {
    body = { month, game, top: show(await getJSON(env, `hof:b:${month}:${game}`, []), ban, 5) };
  } else {
    const last = prevMonth(month);
    body = { month, players: Number((await env.LIMITS.get("hof:players")) || 0),
      top: show(await getJSON(env, `hof:b:${month}:all`, []), ban, 5),
      last: { month: last, top: show(await getJSON(env, `hof:b:${last}:all`, []), ban, 3) } };
  }
  const res = json(body, 200, { ...headers, "Access-Control-Allow-Origin": "*", "Cache-Control": `public, max-age=${CACHE_SECONDS}` });
  if (cache) await cache.put(cacheKey, res.clone());
  return res;
}

// POST /hof/start {game}: a signed start token, and counts a new player the first time we see them.
export async function hofStart(body, env, visitor, secret, isTest) {
  const game = String(body && body.game || "");
  if (!/^[a-z0-9-]{2,40}$/.test(game)) return { status: 400, body: { error: "bad_request" } };
  const ts = Math.floor(Date.now() / 1000);
  const token = `${game}.${ts}.${await hmacHex(secret, `${game}|${ts}|${visitor}`)}`;
  if (!isTest) try {  // counting must never stop a game; under heavy load this may under-count slightly
    if (!(await env.LIMITS.get(`hof:p:${visitor}`))) {
      await env.LIMITS.put(`hof:p:${visitor}`, "1");
      await env.LIMITS.put("hof:players", String(Number((await env.LIMITS.get("hof:players")) || 0) + 1));
    }
  } catch (e) { /* ignore */ }
  return { status: 200, body: { token } };
}

// POST /hof {game, pct, name, token}: add a score to this month's boards.
export async function hofSubmit(body, env, visitor, secret, country) {
  const game = String(body && body.game || ""), pct = Math.round(Number(body && body.pct));
  const name = String(body && body.name || "").trim().replace(/\s+/g, " ");
  if (!/^[a-z0-9-]{2,40}$/.test(game) || !Number.isFinite(pct) || pct < 0 || pct > 100) return { status: 400, body: { error: "bad_request", message: "That score couldn't be read." } };
  const problem = nicknameProblem(name);
  if (problem) return { status: 400, body: { error: "name", message: problem } };
  if ((await banned(env)).has(name.toLowerCase())) return { status: 400, body: { error: "name", message: "Please pick another nickname." } };

  const [tg, tts, tsig] = String(body.token || "").split(".");
  const now = Math.floor(Date.now() / 1000), age = now - Number(tts);
  if (tg !== game || !tsig || tsig !== await hmacHex(secret, `${game}|${tts}|${visitor}`) || !(age <= MAX_AGE))
    return { status: 400, body: { error: "token", message: "Please play the game again to add a score." } };
  if (age < MIN_SECONDS) return { status: 400, body: { error: "too_fast", message: "That was faster than humanly possible. Play it again?" } };

  const day = new Date().toISOString().slice(0, 10), month = monthOf(day);
  const once = `hof:s:${visitor}:${game}:${day}`;
  if (await env.LIMITS.get(once)) return { status: 429, body: { error: "once", message: "You've already added a score for this game today. Come back tomorrow!" } };
  const dKey = `hof:d:${day}`, today = Number((await env.LIMITS.get(dKey)) || 0);
  if (today >= DAILY_SUBMITS) return { status: 429, body: { error: "daily_cap", message: "The Hall of Fame is full for today. Try again tomorrow." } };

  const entry = { n: name, g: game, p: pct, s: Math.min(age, MAX_AGE), c: /^[A-Z]{2}$/.test(country || "") && !["XX", "T1"].includes(country) ? country : "", d: day };
  const gKey = `hof:b:${month}:${game}`, aKey = `hof:b:${month}:all`;
  const [gList, gPos] = place(await getJSON(env, gKey, []), entry);
  const [aList, aPos] = place(await getJSON(env, aKey, []), { ...entry });
  await env.LIMITS.put(once, "1", { expirationTtl: 2 * 86400 });
  await env.LIMITS.put(dKey, String(today + 1), { expirationTtl: 2 * 86400 });
  if (gPos) await env.LIMITS.put(gKey, JSON.stringify(gList));
  if (aPos) await env.LIMITS.put(aKey, JSON.stringify(aList));
  const ban = await banned(env);
  return { status: 200, body: { ok: true, month, rank_game: gPos <= 5 ? gPos : 0, rank_all: aPos <= 5 ? aPos : 0, top: show(gList, ban, 5) } };
}
