# Python URL Scraper (Auto-Scroll)

Opens a page in a real browser, scrolls down automatically to trigger
lazy-loaded/infinite-scroll content, and collects every link it finds —
stopping once it hits a target count (default 10,000) or the page stops
producing new content.

## Setup

```bash
pip install -r requirements.txt
```

Requires Chrome/Chromium installed locally; Selenium 4.20+ manages the
matching chromedriver automatically (Selenium Manager).

## Usage

```bash
python scraper.py https://example.com

# Custom limit and output format
python scraper.py https://example.com --max-urls 5000 --output urls.json

# Only keep links on the same domain, show the browser window
python scraper.py https://example.com --same-domain-only --headless false
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--max-urls` | 10000 | Stop once this many unique URLs are collected |
| `--output` | urls.txt | Output file; extension picks the format (`.txt`, `.csv`, `.json`) |
| `--scroll-pause` | 1.5 | Seconds to wait after each scroll for content to load |
| `--max-stale-scrolls` | 5 | Stop early after this many scrolls with no new links or height change |
| `--same-domain-only` | off | Restrict collected URLs to the start page's domain |
| `--headless` | true | Set `--headless false` to watch the browser scroll |

## How it works

1. Loads the page, grabs the initial set of `<a href>` links.
2. Scrolls to `document.body.scrollHeight`, waits for content to load, then
   re-scans for links.
3. Repeats until either `--max-urls` is reached, or the page stops growing
   (height unchanged and no new links) for `--max-stale-scrolls` scrolls in
   a row — this prevents an infinite loop on pages with a fixed amount of
   content.
