"""Phase 1: page Openmart brand search for US credit unions -> brands.jsonl (deduped by domain)."""
import json, os, re, sys, time
from openmart import call, balance, HERE

OUT = os.path.join(HERE, "brands.jsonl")
STATE = os.path.join(HERE, "brands_cursor.txt")
TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 1000

BAD_DOMAIN = re.compile(r"(facebook|yelp|google|linkedin|instagram|twitter|mapquest|yellowpages)\.", re.I)


def norm(d):
    d = (d or "").strip().lower()
    d = re.sub(r"^https?://", "", d).split("/")[0]
    d = re.sub(r"^www\.", "", d)
    return d if ("." in d and "@" not in d and not BAD_DOMAIN.search(d)) else ""


seen = set()
if os.path.exists(OUT):
    for line in open(OUT):
        seen.add(json.loads(line)["domain"])
cursor = open(STATE).read().strip() if os.path.exists(STATE) else ""

added = 0
with open(OUT, "a") as fh:
    while added < TARGET:
        pag = {"limit": 100}
        if cursor:
            pag["encoded_cursor"] = cursor
        resp = call("POST", "/api/v2/brands/search", {
            "search_param": {"search_term": "credit union", "location": [{"country": "US"}]},
            "pagination": pag,
            "estimate_total": False,
        })
        rows = resp.get("data") or []
        cursor = resp.get("encoded_cursor") or ""
        if not rows:
            print("no more results")
            break
        for r in rows:
            dom = norm(r.get("domain_ident") or r.get("website_url"))
            btype = (r.get("business_type") or "")
            name = r.get("business_name") or ""
            # keep only actual credit unions
            blob = (name + " " + btype + " " + " ".join(r.get("business_keywords") or [])).lower()
            if "credit union" not in blob:
                continue
            if not dom or dom in seen:
                continue
            seen.add(dom)
            li = (r.get("social_media_links") or {}).get("LINKEDIN") or []
            fh.write(json.dumps({
                "brand_id": r.get("brand_id"),
                "company": name,
                "domain": dom,
                "website": r.get("website_url"),
                "num_stores": r.get("num_stores"),
                "company_linkedin": li[0] if li else "",
            }) + "\n")
            added += 1
        fh.flush()
        open(STATE, "w").write(cursor)
        print("page done: kept=%d total_new=%d balance=%d" % (len(rows), added, balance()), flush=True)
        if not cursor:
            break
print("DONE new=%d unique_total=%d" % (added, len(seen)))
