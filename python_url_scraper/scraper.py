#!/usr/bin/env python3
"""Scrape URLs from a page by auto-scrolling until a target count is reached.

Launches a browser (Selenium/Chrome), scrolls to the bottom repeatedly to
trigger lazy-loaded content, and collects every <a href> it finds. Stops
once the target URL count is hit or the page stops producing new content
(no growth in scroll height / no new links after several consecutive
attempts).

Usage:
    python scraper.py https://example.com --max-urls 10000 --output urls.txt
    python scraper.py https://example.com --same-domain-only --headless false
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("url_scraper")


def build_driver(headless: bool) -> webdriver.Chrome:
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
    return webdriver.Chrome(options=options)


def collect_links(driver: webdriver.Chrome, base_url: str, same_domain_only: bool) -> set[str]:
    base_host = urlparse(base_url).netloc
    found = set()
    for el in driver.find_elements(By.TAG_NAME, "a"):
        href = el.get_attribute("href")
        if not href:
            continue
        href = urljoin(base_url, href).split("#")[0]
        if not href.startswith(("http://", "https://")):
            continue
        if same_domain_only and urlparse(href).netloc != base_host:
            continue
        found.add(href)
    return found


def scrape(
    url: str,
    max_urls: int,
    scroll_pause: float,
    max_stale_scrolls: int,
    same_domain_only: bool,
    headless: bool,
) -> list[str]:
    driver = build_driver(headless)
    urls: set[str] = set()

    try:
        log.info("Opening %s", url)
        driver.get(url)
        time.sleep(scroll_pause)

        urls |= collect_links(driver, url, same_domain_only)
        log.info("Initial links found: %d", len(urls))

        last_height = driver.execute_script("return document.body.scrollHeight")
        stale_scrolls = 0

        while len(urls) < max_urls and stale_scrolls < max_stale_scrolls:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(scroll_pause)

            before = len(urls)
            urls |= collect_links(driver, url, same_domain_only)
            new_height = driver.execute_script("return document.body.scrollHeight")
            gained = len(urls) - before

            if new_height == last_height and gained == 0:
                stale_scrolls += 1
                log.info(
                    "No new content (stale %d/%d) — total: %d",
                    stale_scrolls, max_stale_scrolls, len(urls),
                )
            else:
                stale_scrolls = 0
                log.info("Scrolled — +%d new (total: %d)", gained, len(urls))

            last_height = new_height

        if len(urls) >= max_urls:
            log.info("Reached target of %d URLs.", max_urls)
        else:
            log.info("Page exhausted after %d stale scrolls. Collected %d URLs.", stale_scrolls, len(urls))

    except (TimeoutException, WebDriverException) as exc:
        log.error("Browser error: %s", exc)
    finally:
        driver.quit()

    return sorted(urls)[:max_urls]


def save(urls: list[str], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.suffix == ".json":
        output.write_text(json.dumps(urls, indent=2))
    elif output.suffix == ".csv":
        with output.open("w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["url"])
            writer.writerows([u] for u in urls)
    else:
        output.write_text("\n".join(urls) + "\n")
    log.info("Saved %d URLs to %s", len(urls), output)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("url", help="Page to open and scroll")
    parser.add_argument("--max-urls", type=int, default=10_000, help="Stop once this many URLs are collected (default: 10000)")
    parser.add_argument("--output", type=Path, default=Path("urls.txt"), help="Output file (.txt, .csv, or .json)")
    parser.add_argument("--scroll-pause", type=float, default=1.5, help="Seconds to wait after each scroll for content to load")
    parser.add_argument("--max-stale-scrolls", type=int, default=5, help="Stop early after this many scrolls with no new links/height")
    parser.add_argument("--same-domain-only", action="store_true", help="Only keep URLs on the same domain as the start page")
    parser.add_argument("--headless", type=lambda v: v.lower() != "false", default=True, help="Run headless (default: true; pass --headless false to see the browser)")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    urls = scrape(
        url=args.url,
        max_urls=args.max_urls,
        scroll_pause=args.scroll_pause,
        max_stale_scrolls=args.max_stale_scrolls,
        same_domain_only=args.same_domain_only,
        headless=args.headless,
    )
    save(urls, args.output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
