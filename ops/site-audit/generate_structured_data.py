
#!/usr/bin/env python3
import os, json, argparse
from pathlib import Path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-name", default="Gioco Evo Tactics")
    ap.add_argument("--base-url", default=os.getenv("SITE_BASE_URL","https://tuo-dominio.tld"))
    ap.add_argument("--search-path", default="/cerca?q={query}")
    args = ap.parse_args()

    data = [
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
    out_dir = repo / "public"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "structured-data.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[structured-data] wrote {out_dir/'structured-data.json'}")

if __name__ == "__main__":
    main()
