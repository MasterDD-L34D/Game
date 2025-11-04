
#!/usr/bin/env python3
from __future__ import annotations
import csv, argparse, os
from collections import Counter

def parse_status(s):
    try:
        return int(s)
    except Exception:
        return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--link-report", default="ops/site-audit/_out/link_report.csv")
    ap.add_argument("--out", default="ops/site-audit/REPORT_site_audit.md")
    ap.add_argument("--site", default=os.getenv("SITE_BASE_URL",""))
    args = ap.parse_args()

    rows = []
    if not os.path.exists(args.link_report):
        with open(args.out,"w",encoding="utf-8") as fo:
            fo.write("# Site Audit Report\n\n_Nessun link_report.csv trovato. Hai saltato il check dei link?_\n")
        print("[site-audit] no link_report.csv; wrote empty report")
        return

    with open(args.link_report, encoding="utf-8") as f:
        cr = csv.DictReader(f)
        rows = list(cr)

    counts = Counter(); broken = []
    for r in rows:
        status = parse_status(r["status"])
        if status is None:
            counts["ERROR"] += 1; broken.append(r)
        else:
            counts[f"{status//100}xx"] += 1
            if status >= 400:
                broken.append(r)

    md = []
    md.append("# Site Audit Report\n")
    if args.site: md.append(f"**Sito**: {args.site}\n")
    md.append(f"**Link scansionati**: {len(rows)}\n")
    md.append("\n## Breakdown per status\n")
    for key in ("2xx","3xx","4xx","5xx","ERROR"):
        md.append(f"- {key}: {counts.get(key,0)}\n")
    md.append("\n## Errori / Broken links (top 50)\n")
    for r in broken[:50]:
        md.append(f"- `{r['url']}` → {r['status']} {r['content_type']}\n")

    with open(args.out,"w",encoding="utf-8") as fo:
        fo.write("\n".join(md))

    print(f"[site-audit] wrote {args.out} (broken: {len(broken)}/{len(rows)})")

if __name__ == "__main__":
    main()
