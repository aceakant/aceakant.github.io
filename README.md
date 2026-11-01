# Ajay Kant · Weekly Insights

An interactive personal website plus a team of AI agents that writes one fact-checked,
playful article every week, waits 48 hours for your review, then publishes it to the website
and LinkedIn.

**Website:** https://aceakant.github.io/insights

## The weekly rhythm

| When (IST) | What happens |
|---|---|
| **Monday 09:00** | Agents pick a topic, write the piece, fact-check it with web search, and make the STAR image. You get a GitHub notification: an issue called **"Review: …"** with a **preview link**. |
| **Tuesday 09:00** | Reminder on the same issue: "goes live in 24 hours". |
| **Wednesday 09:00** | It goes live on the website, then LinkedIn a few minutes later. |

### Your controls: reply to the "Review:" issue with one word
- `approve` → publish now
- `hold` → stop it
- `release` → put a held draft back on schedule

If the fact-checker could not verify something, the draft is marked **needs-review** and will
**never publish by itself**. Fix it (or accept it) and reply `approve`.

To change wording: open the article file in `content/articles/` on GitHub, tap the ✏️ pencil,
edit, then **Commit changes**. The preview updates in about a minute.

## Every week's piece has the same fun format
1. **Guess the number** warm-up (slider + reveal, with source)
2. **STAR** tap-through: Situation → Task → Action → Result
3. The article: The problem · What I did · Benefit evaluation · Takeaways
4. **How it runs as a process** (tap-open steps)
5. **ROI calculator**: readers try it on their own numbers
6. **Myth or Fact**: 3 quick taps with a friendly score

## One-time setup checklist
1. **Pages:** repository **Settings → Pages → Source: GitHub Actions**.
2. **Claude API key:** console.anthropic.com → add billing → create key (and make sure web search
   is enabled in the Console). Then **Settings → Secrets and variables → Actions → New repository
   secret**: name `ANTHROPIC_API_KEY`.
3. **LinkedIn:** linkedin.com/developers → create app (linked to a LinkedIn Page) → request
   *Share on LinkedIn* and *Sign In with LinkedIn using OpenID Connect* → generate a token with
   scopes `openid profile w_member_social` → add secret `LINKEDIN_ACCESS_TOKEN`.
   The token lasts ~60 days; renew it with the same steps.
4. **First run:** **Actions → "1 · Weekly article" → Run workflow**.

## Where to change things (no coding)
| I want to… | Edit |
|---|---|
| Add topic ideas | `content/topics.yaml` (add at the top with `status: pending`) |
| Give the writer a real example | a short note in `content/case_notes/` |
| Update profile, numbers, career STAR stories | `content/profile.yaml` |
| Change the fraud game | `content/game.yaml` |
| Review window, LinkedIn on/off, show email | `config.yaml` |

## Honesty rules built in
- Personal results come only from `profile.yaml` and case notes; the agents never invent them.
- Modelled ROI is always labelled "Illustrative model".
- Every external fact, the warm-up answer and every Myth/Fact answer is web-checked.
- Banned clichés (listed in `config.yaml`) are blocked.

## Test without keys
```
pip install -r requirements.txt
DRY_RUN=1 python agents/pipeline.py && python site/build.py   # site appears in _site/
```
