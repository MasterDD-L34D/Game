#!/usr/bin/env python3
"""
Genera JSON-LD di base:
- WebSite + SearchAction
- Organization (placeholder)
Scrive in public/structured-data.json se public/ esiste, altrimenti in ops/site-audit/_out/
"""
from __future__ import annotations
import os, json, argparse
from pathlib import Path
from datetime import date

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-name", default="Gioco Evo Tactics")
    ap.add_argument("--base-url", default=os.getenv("SITE_BASE_URL","https://example.com"))
    ap.add_argument("--search-path", default="/cerca?q={query}")
    args = ap.parse_args()

    j = [
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "url": args.base_url,
            "name": args.site_name,
            "potentialAction": {
              "@type": "SearchAction",
              "target": f"{args.base_url.rstrip('/')}{args.search_path}",
              "query-input": "required name=query"
            }
        },
        {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": args.site_name,
            "url": args.base_url
        }
    ]
    repo = Path(".").resolve()
    pub = repo / "public"
    out = pub / "structured-data.json" if pub.exists() else (repo / "ops/site-audit/_out" / "structured-data.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(j, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[structured-data] wrote {out}")

if __name__ == "__main__":
    main()
