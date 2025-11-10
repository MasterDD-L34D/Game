#!/usr/bin/env python3
import sys, time, queue, threading, requests, urllib.parse
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urldefrag

start_url = sys.argv[1] if len(sys.argv) > 1 else "https://giocoevo.tactics/"
max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 500
timeout = float(sys.argv[3]) if len(sys.argv) > 3 else 10.0

seen = set()
q = queue.Queue()
q.put(start_url)
lock = threading.Lock()
results = []

def worker():
    while True:
        try:
            url = q.get(timeout=1)
        except queue.Empty:
            return
        if url in seen:
            q.task_done()
            continue
        seen.add(url)
        try:
            r = requests.get(url, timeout=timeout, headers={"User-Agent":"EvoTacticsLinkChecker/1.0"})
            status = r.status_code
            ctype = r.headers.get("Content-Type","")
            with lock:
                results.append((url, status, ctype))
            # Parse HTML for links if OK
            if status == 200 and "text/html" in ctype:
                soup = BeautifulSoup(r.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    # Keep same-origin links only
                    next_url = urljoin(url, href)
                    next_url, _ = urldefrag(next_url)
                    if next_url.startswith(start_url.split('/',3)[:3][0] + "//" + start_url.split('/',3)[2] if "://" in start_url else start_url):
                        if next_url not in seen and len(seen) < max_pages:
                            q.put(next_url)
        except Exception as e:
            with lock:
                results.append((url, f"ERROR: {e}", ""))
        finally:
            q.task_done()

threads = [threading.Thread(target=worker, daemon=True) for _ in range(10)]
for t in threads: t.start()
q.join()

# Output CSV
print("url,status,content_type")
for url, status, ctype in results:
    s = str(status).replace(","," ")
    c = ctype.replace(","," ")
    print(f"{url},{s},{c}")
