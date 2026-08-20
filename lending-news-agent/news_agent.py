#!/usr/bin/env python3
"""Consumer-lending news agent.

Fetches curated RSS feeds, asks Claude to write a brief on the most
impactful US consumer-lending / collections story in the lookback window,
and posts it to Telegram. Runs Mondays and Thursdays via GitHub Actions.

Usage:
    python news_agent.py               # normal run (needs all 3 env vars)
    python news_agent.py --dry-run     # fetch feeds and print the item list;
                                       # no API call, no Telegram message
    python news_agent.py --test-empty  # use a 1-hour window to exercise the
                                       # "no news" path end to end
"""

import argparse
import html
import os
import re
import sys
import time
from datetime import datetime, timedelta, timezone

import feedparser
import requests

MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2000
MAX_ITEMS = 250
SUMMARY_CHARS = 400
FEED_TIMEOUT = 25
TELEGRAM_MAX_LEN = 4096

HERE = os.path.dirname(os.path.abspath(__file__))


def log(msg: str) -> None:
    print(f"[news-agent] {msg}", flush=True)


def lookback_hours(now_utc: datetime) -> int:
    # Monday covers everything since Thursday's brief (96h); Thursday covers
    # everything since Monday's (72h). Any other day is a manual test run.
    weekday = now_utc.weekday()  # Monday == 0, Thursday == 3
    if weekday == 3:
        return 72
    return 96


def read_feeds() -> list[str]:
    path = os.path.join(HERE, "feeds.txt")
    feeds = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                feeds.append(line)
    return feeds


def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def entry_time(entry) -> datetime | None:
    for attr in ("published_parsed", "updated_parsed"):
        parsed = getattr(entry, attr, None)
        if parsed:
            # feedparser normalizes struct_time to UTC; assume UTC when the
            # feed gave no timezone.
            return datetime.fromtimestamp(time.mktime(parsed), tz=timezone.utc)
    return None


def fetch_items(feeds: list[str], cutoff: datetime) -> tuple[list[dict], int]:
    items = []
    ok_feeds = 0
    for url in feeds:
        try:
            resp = requests.get(
                url,
                timeout=FEED_TIMEOUT,
                headers={"User-Agent": "Mozilla/5.0 (lending-news-agent RSS reader)"},
            )
            resp.raise_for_status()
            parsed = feedparser.parse(resp.content)
        except Exception as exc:  # a broken feed must not crash the run
            log(f"WARN feed failed, skipping: {url} ({exc})")
            continue
        if parsed.bozo and not parsed.entries:
            log(f"WARN feed unparseable, skipping: {url}")
            continue
        ok_feeds += 1
        source = strip_html(parsed.feed.get("title", "")) or url
        for entry in parsed.entries:
            published = entry_time(entry)
            if published is None or published < cutoff:
                continue
            link = getattr(entry, "link", "") or ""
            title = strip_html(getattr(entry, "title", ""))
            if not title or not link:
                continue
            summary = strip_html(getattr(entry, "summary", ""))[:SUMMARY_CHARS]
            items.append(
                {
                    "title": title,
                    "summary": summary,
                    "source": source,
                    "link": link,
                    "published": published,
                }
            )
    # Deduplicate by link (query feeds and section feeds overlap).
    seen = set()
    unique = []
    for item in sorted(items, key=lambda i: i["published"], reverse=True):
        if item["link"] in seen:
            continue
        seen.add(item["link"])
        unique.append(item)
    return unique[:MAX_ITEMS], ok_feeds


def build_item_list(items: list[dict]) -> str:
    lines = []
    for n, item in enumerate(items, 1):
        lines.append(
            f"{n}. {item['title']}\n"
            f"   Summary: {item['summary'] or '(none)'}\n"
            f"   Source: {item['source']}\n"
            f"   Link: {item['link']}\n"
            f"   Published: {item['published'].strftime('%Y-%m-%d %H:%M UTC')}"
        )
    return "\n".join(lines)


def call_claude(system_prompt: str, item_list: str) -> str:
    import anthropic

    client = anthropic.Anthropic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system_prompt,
        messages=[{"role": "user", "content": item_list}],
    )
    return "".join(b.text for b in response.content if b.type == "text").strip()


def send_telegram(token: str, chat_id: str, text: str, parse_html: bool = True) -> bool:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text[:TELEGRAM_MAX_LEN]}
    if parse_html:
        payload["parse_mode"] = "HTML"
    resp = requests.post(url, json=payload, timeout=30)
    if resp.ok:
        return True
    log(f"WARN Telegram rejected message ({resp.status_code}): {resp.text[:200]}")
    if parse_html:
        log("Retrying without parse_mode so the text still arrives")
        return send_telegram(token, chat_id, text, parse_html=False)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true",
                        help="fetch feeds and print items; no API call, no Telegram")
    parser.add_argument("--test-empty", action="store_true",
                        help="use a 1-hour lookback window to test the no-news path")
    args = parser.parse_args()

    if not args.dry_run:
        missing = [v for v in ("TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "ANTHROPIC_API_KEY")
                   if not os.environ.get(v)]
        if missing:
            log(f"ERROR missing environment variables: {', '.join(missing)}")
            return 1

    now = datetime.now(timezone.utc)
    hours = 1 if args.test_empty else lookback_hours(now)
    cutoff = now - timedelta(hours=hours)
    log(f"Lookback window: {hours}h (since {cutoff.strftime('%Y-%m-%d %H:%M UTC')})")

    feeds = read_feeds()
    log(f"Fetching {len(feeds)} feeds...")
    items, ok_feeds = fetch_items(feeds, cutoff)
    log(f"Feeds fetched OK: {ok_feeds}/{len(feeds)}; items in window: {len(items)}")

    if args.dry_run:
        print(build_item_list(items) or "(no items in window)")
        log("Dry run complete — no API call, no Telegram message sent.")
        return 0

    token = os.environ["TELEGRAM_BOT_TOKEN"]
    chat_id = os.environ["TELEGRAM_CHAT_ID"]

    if not items:
        text = (f"⚪ No new items from monitored sources since the last brief "
                f"(checked {ok_feeds} feeds).")
        sent = send_telegram(token, chat_id, text)
        log(f"Sent empty-window notice: {sent}")
        return 0 if sent else 1

    with open(os.path.join(HERE, "prompt.txt"), encoding="utf-8") as f:
        system_prompt = f.read()

    log(f"Calling Claude ({MODEL}) with {len(items)} items...")
    try:
        reply = call_claude(system_prompt, build_item_list(items))
    except Exception as exc:
        log(f"ERROR Claude API call failed: {exc}")
        return 1

    if reply == "NO_NEWS":
        text = (f"⚪ No significant US consumer-lending news since the last "
                f"brief. Checked {ok_feeds} feeds / {len(items)} items.")
        sent = send_telegram(token, chat_id, text)
        log(f"Sent NO_NEWS notice: {sent}")
        return 0 if sent else 1

    sent = send_telegram(token, chat_id, reply)
    log(f"Sent brief ({len(reply)} chars): {sent}")
    return 0 if sent else 1


if __name__ == "__main__":
    sys.exit(main())
