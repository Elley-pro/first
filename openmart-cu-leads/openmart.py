"""Shared Openmart API helpers."""
import json, os, time, urllib.request, urllib.error

BASE = "https://api.openmart.ai"
KEY = os.environ.get("OPENMART_API_KEY", "")
HERE = os.path.dirname(os.path.abspath(__file__))


def call(method, path, body=None, timeout=180):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Authorization", "Bearer " + KEY)
    req.add_header("Accept", "application/json")
    if data:
        req.add_header("Content-Type", "application/json")
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            payload = e.read().decode()[:300]
            if e.code in (429, 500, 502, 503, 504) and attempt < 4:
                time.sleep(2 ** attempt * 2)
                continue
            raise RuntimeError("HTTP %s %s %s" % (e.code, path, payload))
        except Exception:
            if attempt < 4:
                time.sleep(2 ** attempt * 2)
                continue
            raise
    raise RuntimeError("unreachable")


def balance():
    return call("GET", "/api/v2/credit-balance")["balance"]
