# Consumer-Lending News Agent

A scheduled pipeline that posts a Telegram brief on US consumer-lending and
debt-collection news **every Monday and Thursday at 12:00 UTC** (≈ 8:00 New
York time).

How it works, in one line each:

1. **GitHub Actions** (free) wakes the script up on schedule — no server needed.
2. `news_agent.py` fetches every RSS feed in `feeds.txt` and keeps only items
   published in the lookback window (Monday run: 96 hours, covering everything
   since Thursday; Thursday run: 72 hours, covering everything since Monday —
   the two windows tile the week with no gaps and no overlap).
3. It sends that item list to the Claude API with `prompt.txt` as the
   instructions. Claude may **only** use the fetched items — it picks the one
   most impactful story, writes a short brief with facts and analysis kept
   separate, and links every claim. If nothing qualifies, it answers `NO_NEWS`.
4. The result is posted to your Telegram chat by your bot.

If nothing happened, you still get a message saying so — silence always means
"the run failed", never "there was no news".

## One-time setup

### 1. Create the Telegram bot (~10 min, no code)

1. In Telegram, open **@BotFather** → send `/newbot` → follow the prompts →
   copy the **bot token** (looks like `123456789:AAF...`).
2. Open a chat with your new bot, press **Start**, and send it any message
   (required — bots can't message you first).
3. In a browser open
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   and find `"chat":{"id":123456789...}` — that number is your **chat ID**.

### 2. Get an Anthropic API key

Create one at https://console.anthropic.com and add a small credit (e.g. $5).
Two runs a week cost cents.

### 3. Add the three repository secrets

In this GitHub repo: **Settings → Secrets and variables → Actions →
New repository secret**, add:

| Secret name | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | the token from BotFather |
| `TELEGRAM_CHAT_ID` | the chat ID from getUpdates |
| `ANTHROPIC_API_KEY` | your Anthropic key |

### 4. Test it

Go to the **Actions** tab → **Consumer-lending news brief** → **Run
workflow**. Within a couple of minutes the brief should arrive in Telegram.
Open the links in the message and confirm they match the story — do this
spot-check on every brief for the first two weeks.

## Running locally

```bash
cd lending-news-agent
pip install -r requirements.txt

# Full run (posts to Telegram):
export TELEGRAM_BOT_TOKEN="123456789:AAF..."
export TELEGRAM_CHAT_ID="123456789"
export ANTHROPIC_API_KEY="sk-ant-..."
python news_agent.py

# Preview what the model would see — no API call, no Telegram, no keys needed:
python news_agent.py --dry-run

# Verify the "nothing happened" path (uses a 1-hour window):
python news_agent.py --test-empty
```

## Tuning (no code changes needed)

| Symptom | Fix |
|---|---|
| Too much noise / irrelevant picks | Tighten RELEVANT TOPICS in `prompt.txt`; add an explicit "IGNORE:" list (e.g. crypto, non-US banks) |
| Missed a story you saw elsewhere | Add that source or a Google News query feed to `feeds.txt` (one line) |
| Analysis too shallow | Raise the character limit and expand the "why it matters" instructions in `prompt.txt` |
| Lead story repeats the previous brief | Add a prompt rule: "If the lead story was the lead of the previous brief and nothing material changed, choose the next most impactful story." |
| Want a third day or an extra run | Add another `cron:` line in `.github/workflows/news.yml`, or press **Run workflow** anytime |

## Files

| File | Purpose |
|---|---|
| `news_agent.py` | The whole pipeline: fetch → filter → analyze → post |
| `feeds.txt` | The monitored sources (verified RSS URLs, one per line) |
| `prompt.txt` | The analyst instructions — the anti-hallucination rules live here |
| `requirements.txt` | Pinned Python dependencies |
| `../.github/workflows/news.yml` | The Monday/Thursday schedule |

## Honest limits

- WSJ/Bloomberg full articles are paywalled — the agent works from public
  headlines/summaries and links you to the original.
- RSS feeds have short memories; the regulator and trade-press feeds plus the
  Google News query feeds are what keep big stories from slipping through.
- A language model can misread a headline — that's why every claim carries
  its link. Spot-check early on.
