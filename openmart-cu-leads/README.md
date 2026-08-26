# Credit Union Portfolio Decision Makers (Openmart)

Pipeline that builds a deduplicated list of decision makers responsible for loan
portfolio sales and portfolio management at US credit unions, using the
[Openmart API](https://app.openmart.com/api-docs).

## Output

`credit_union_portfolio_decision_makers.csv`

| Column | Notes |
|--------|-------|
| first_name, last_name | Contact name |
| title | Role as reported by Openmart |
| email | Work email |
| email_verified | `yes` when Openmart marked the address verified |
| linkedin_url | Personal LinkedIn profile |
| company, company_domain, company_website | Credit union |
| company_linkedin | Company page (not a personal profile) |
| branches | Number of branch locations |
| country | USA |

**Phone numbers are deliberately excluded.** The enrichment requests
`info_access: ["EMAIL"]` only, so no phone data is fetched, stored, or exported.

## Pipeline

| Step | Script | Endpoint |
|------|--------|----------|
| 1. Company list | `fetch_brands.py` | `POST /api/v2/brands/search` (brand-level, one row per credit union) |
| 2. Decision makers | `enrich.py` | `POST /api/v1/task/batch/find_people` + batch/task polling |
| 3. Dedupe + export | `build_csv.py` | – |

```bash
export OPENMART_API_KEY=...            # never commit the key
python3 fetch_brands.py 700            # append up to 700 new credit union domains
python3 enrich.py 400                  # enrich up to 400 not-yet-done domains
python3 build_csv.py                   # write the deduplicated CSV
```

Both fetch and enrich are resumable: `brands_cursor.txt` stores the search
cursor and `domains_done.txt` records enriched domains, so re-running never
re-spends credits on the same company.

## Targeting

`enrich.py` asks Openmart for: *Chief Lending Officer, VP of Lending, Loan
Portfolio Manager, Collections/Recovery Manager, or Chief Financial Officer* —
the roles that own loan portfolio sales, purchases, and management decisions at
a credit union. Rows are sorted so C-level lending/credit/finance titles come
first.

## Deduplication

`build_csv.py` drops a contact when any of these already appeared:
email address, normalized LinkedIn URL, or first+last name at the same domain.
Contacts with neither an email nor a LinkedIn URL are dropped entirely.

## Credit accounting

- Brand search: ~0.3 credits per company row
- `find_people`: names/titles/LinkedIn free, 3 credits per email returned
  (phones would be 8 credits each — not requested)
- `enrich.py` checks `GET /api/v2/credit-balance` before every batch and stops
  at the `RESERVE` floor (default 120 credits).
