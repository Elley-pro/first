# Company Profile Framework

Automated company intelligence profiler. Input: company name + primary domain. Output: a structured profile covering digital footprint, traffic, channel mix, SEO, paid search, social presence, and ad strategy.

## Setup

```bash
npm install
```

## Usage

```bash
node src/index.js "<Company Name>" <domain>

# Save as text report
node src/index.js "Stripe" stripe.com --out=stripe-profile.txt

# Output raw JSON
node src/index.js "Stripe" stripe.com --json

# Save JSON
node src/index.js "Stripe" stripe.com --json --out=stripe-profile.json
```

## Phases

| Phase | What it does | Data source |
|-------|-------------|-------------|
| 0 | Map footprint: subdomains, regional sites, sibling brands | Ahrefs + crt.sh |
| 1 | Traffic volume + trend (12-month) | Ahrefs Site Explorer |
| 2 | Channel mix: direct / organic / paid / social / referral / email / display | Ahrefs |
| 3 | Top organic keywords & pages; paid keywords, landing pages, spend signal | Ahrefs |
| 4 | Social inventory: handle, followers, growth, ad library links | Social Blade + HEAD checks |
| 5 | Active ad creatives, formats, copy samples, longest-running ads | Meta Ad Library API |
| 6 | Synthesized one-page profile | All of the above |

## Output format

```
════════════════════════════════════════════════════════════
  COMPANY PROFILE: STRIPE
  Domain: stripe.com   |   Generated: 2026-06-29
════════════════════════════════════════════════════════════

── SUMMARY ──────────────────────────────────────────────
  Est. monthly traffic   ~4.2M/mo (growing)
  Dominant channel       organic_search (62%)
  SEO focus topics       payments, stripe, api
  Paid spend signal      active
  Primary social         linkedin — @stripe (850K followers)
  Ad strategy            12 active Meta ads. formats: video, static...
  Apparent goal          acquisition (mixed)
...
```

## Configuration

API token is set in `src/config.js`. To rotate it, update `AHREFS_API_TOKEN`.

## Notes

- Google Ads Transparency Center and LinkedIn ad library require manual browser review — the tool outputs pre-filled URLs for each.
- Social follower counts depend on Social Blade availability; the tool degrades gracefully if blocked.
- Errors in any phase are caught and logged as warnings — the report is always produced with available data.
