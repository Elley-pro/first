"""Phase 3: dedupe people.jsonl -> credit_union_portfolio_decision_makers.csv (no phone numbers)."""
import csv, json, os, re, sys
from openmart import HERE

PEOPLE = os.path.join(HERE, "people.jsonl")
BRANDS = os.path.join(HERE, "brands.jsonl")
OUT = os.path.join(HERE, "credit_union_portfolio_decision_makers.csv")

# Title relevance for portfolio sales / portfolio management decisions
TIER1 = re.compile(r"chief lending|chief credit|chief financial|\bcfo\b|\bclo\b|\bcco\b|"
                   r"chief executive|\bceo\b|president|chief operating|\bcoo\b|chief risk", re.I)
TIER2 = re.compile(r"lending|loan|credit|collection|recovery|portfolio|asset|risk|"
                   r"finance|financial|treasur|underwrit|charge.?off|delinquen", re.I)


def norm_li(u):
    u = (u or "").strip()
    if not u:
        return ""
    u = u.split("?")[0].rstrip("/")
    u = re.sub(r"^http://", "https://", u)
    if u.startswith("www."):
        u = "https://" + u
    if not u.startswith("http"):
        u = "https://" + u
    return u


def tier(t):
    if TIER1.search(t or ""):
        return 1
    if TIER2.search(t or ""):
        return 2
    return 3


brands = {}
if os.path.exists(BRANDS):
    for line in open(BRANDS):
        b = json.loads(line)
        brands[b["domain"]] = b

rows, seen_email, seen_li, seen_person = [], set(), set(), set()
dupes = 0
for line in open(PEOPLE):
    p = json.loads(line)
    dom = p.get("_domain") or ""
    em = ((p.get("email") or {}) or {})
    email = (em.get("email") or "").strip().lower() if isinstance(em, dict) else str(em or "").lower()
    verified = bool(em.get("verified")) if isinstance(em, dict) else False
    li = norm_li(p.get("linkedin_url"))
    first = (p.get("first_name") or "").strip()
    last = (p.get("last_name") or "").strip()
    title = (p.get("title") or "").strip()
    if not email and not li:
        continue
    pk = (first.lower(), last.lower(), dom)
    if (email and email in seen_email) or (li and li in seen_li) or (first and last and pk in seen_person):
        dupes += 1
        continue
    if email:
        seen_email.add(email)
    if li:
        seen_li.add(li)
    if first and last:
        seen_person.add(pk)
    b = brands.get(dom, {})
    rows.append({
        "first_name": first,
        "last_name": last,
        "title": title,
        "email": email,
        "email_verified": "yes" if verified else "no",
        "linkedin_url": li,
        "company": p.get("_company") or b.get("company") or "",
        "company_domain": dom,
        "company_website": b.get("website") or "",
        "company_linkedin": b.get("company_linkedin") or "",
        "branches": b.get("num_stores") or "",
        "country": "USA",
        "_tier": tier(title),
    })

rows.sort(key=lambda r: (r["_tier"], r["company"].lower(), r["last_name"].lower()))
cols = ["first_name", "last_name", "title", "email", "email_verified", "linkedin_url",
        "company", "company_domain", "company_website", "company_linkedin", "branches", "country"]
with open(OUT, "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow(r)

print("rows=%d duplicates_removed=%d with_email=%d with_linkedin=%d companies=%d"
      % (len(rows), dupes, sum(1 for r in rows if r["email"]),
         sum(1 for r in rows if r["linkedin_url"]), len({r["company_domain"] for r in rows})))
