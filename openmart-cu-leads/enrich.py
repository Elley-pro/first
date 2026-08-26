"""Phase 2: find_people over credit union domains -> people.jsonl.

Runs several find_people batches concurrently, is resumable (domains_done.txt),
and stops once the credit balance reaches the reserve floor.
Only EMAIL is requested, so no phone data is ever fetched.
"""
import json, os, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
from openmart import call, balance, HERE

BRANDS = os.path.join(HERE, "brands.jsonl")
PEOPLE = os.path.join(HERE, "people.jsonl")
DONE = os.path.join(HERE, "domains_done.txt")

TITLE = ("Chief Lending Officer, VP of Lending, Loan Portfolio Manager, "
         "Collections/Recovery Manager, or Chief Financial Officer")
MAX_K = int(os.environ.get("MAX_K", "2"))
BATCH = int(os.environ.get("BATCH", "50"))
WORKERS = int(os.environ.get("WORKERS", "5"))
RESERVE = int(os.environ.get("RESERVE", "120"))
POLL_LIMIT = int(os.environ.get("POLL_LIMIT", "1200"))
LIMIT_DOMAINS = int(sys.argv[1]) if len(sys.argv) > 1 else 100

lock = threading.Lock()
stop = threading.Event()


def log(msg):
    print("[%s] %s" % (time.strftime("%H:%M:%S"), msg), flush=True)


def run_batch(chunk):
    if stop.is_set():
        return 0
    tasks = [{
        "domain": b["domain"],
        "company_name": b["company"],
        "title": TITLE,
        "max_k": MAX_K,
        "info_access": ["EMAIL"],
        "country": "US",
        "tracking_id": b["domain"],
    } for b in chunk]
    try:
        sub = call("POST", "/api/v1/task/batch/find_people", tasks, timeout=300)
    except Exception as e:
        log("submit failed: %s" % e)
        return 0
    bid = sub["batch_id"]
    with lock:
        open(os.path.join(HERE, "batch_ids.txt"), "a").write(bid + "\n")
    log("submitted %s n=%d" % (bid, len(tasks)))

    deadline = time.time() + POLL_LIMIT
    st = {}
    while time.time() < deadline:
        time.sleep(20)
        try:
            st = call("GET", "/api/v1/task/batch/%s/status" % bid)
        except Exception:
            continue
        if st.get("batch_ready"):
            break
    try:
        ids = call("GET", "/api/v1/task/batch/%s/task_ids?status=COMPLETED" % bid)
    except Exception as e:
        log("task_ids failed for %s: %s" % (bid[:8], e))
        return 0
    if isinstance(ids, dict):
        ids = ids.get("data") or ids.get("task_ids") or []

    out, got = [], 0
    for tid in ids:
        try:
            res = call("GET", "/api/v1/task/%s" % tid)
        except Exception:
            continue
        dom = res.get("tracking_id") or ""
        for p in (res.get("data") or []):
            p["_domain"] = dom
            out.append(p)
            got += 1
    with lock:
        with open(PEOPLE, "a") as pf:
            for p in out:
                pf.write(json.dumps(p) + "\n")
        with open(DONE, "a") as df:
            for b in chunk:
                df.write(b["domain"] + "\n")
    log("batch %s done people=%d status=%s" % (bid, got, json.dumps(st)))
    return got


def main():
    done = set(open(DONE).read().split()) if os.path.exists(DONE) else set()
    todo = []
    for line in open(BRANDS):
        b = json.loads(line)
        if b["domain"] not in done:
            todo.append(b)
    todo = todo[:LIMIT_DOMAINS]
    chunks = [todo[i:i + BATCH] for i in range(0, len(todo), BATCH)]
    log("start balance=%d domains=%d batches=%d" % (balance(), len(todo), len(chunks)))

    total = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = []
        for ch in chunks:
            while len(futures) >= WORKERS:
                time.sleep(5)
                futures = [f for f in futures if not f.done()]
            bal = balance()
            if bal < RESERVE:
                log("STOP: balance %d below reserve %d" % (bal, RESERVE))
                stop.set()
                break
            futures.append(ex.submit(run_batch, ch))
            time.sleep(3)
    log("FINISHED people_added=%d balance=%d" % (total, balance()))


main()
