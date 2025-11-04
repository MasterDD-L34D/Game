
#!/usr/bin/env python3
from __future__ import annotations
import argparse, threading, queue, csv
from urllib.parse import urlparse, urljoin, urldefrag
from urllib.request import Request, urlopen
from html.parser import HTMLParser

class LinkExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            for k,v in attrs:
                if k.lower() == "href" and v:
                    self.links.append(v)

def same_origin(u1, u2):
    p1, p2 = urlparse(u1), urlparse(u2)
    return (p1.scheme, p1.netloc) == (p2.scheme, p2.netloc)

def fetch(url, timeout=10.0):
    try:
        req = Request(url, headers={"User-Agent":"EvoTacticsLinkChecker/0.2"})
        with urlopen(req, timeout=timeout) as r:
            status = getattr(r, "status", 200)
            ctype = r.headers.get("Content-Type","")
            body = r.read().decode("utf-8", errors="ignore")
            return status, ctype, body
    except Exception as e:
        return f"ERROR: {e}", "" , ""

def worker(start_url, timeout, results, seen, q, lock, max_pages):
    while True:
        try:
            url = q.get(timeout=1)
        except queue.Empty:
            return
        if url in seen:
            q.task_done()
            continue
        seen.add(url)
        status, ctype, body = fetch(url, timeout=timeout)
        with lock:
            results.append((url, status, ctype))
        if status == 200 and "text/html" in ctype:
            parser = LinkExtractor()
            parser.feed(body)
            for href in parser.links:
                next_url = urljoin(url, href)
                next_url, _ = urldefrag(next_url)
                if same_origin(start_url, next_url):
                    if next_url not in seen and len(seen) < max_pages:
                        q.put(next_url)
        q.task_done()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start-url", required=True)
    ap.add_argument("--max-pages", type=int, default=2000)
    ap.add_argument("--timeout", type=float, default=10.0)
    ap.add_argument("--concurrency", type=int, default=10)
    ap.add_argument("--out", default="ops/site-audit/_out/link_report.csv")
    args = ap.parse_args()

    q = queue.Queue(); q.put(args.start_url)
    results = []; seen = set(); lock = threading.Lock()
    threads = [threading.Thread(target=worker, args=(args.start_url,args.timeout,results,seen,q,lock,args.max_pages), daemon=True) for _ in range(args.concurrency)]
    for t in threads: t.start()
    q.join()

    out = Path(args.out); out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="") as fo:
        cw = csv.writer(fo); cw.writerow(["url","status","content_type"]); cw.writerows(results)
    print(f"[site-audit] wrote {out} (rows={len(results)})")

if __name__ == "__main__":
    from pathlib import Path
    main()
