---
title: Site Automation — No-Proxy Pack (stdlib)
doc_status: draft
doc_owner: incoming-archivist
workstream: incoming
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Site Automation — No-Proxy Pack (stdlib)

Questo pack evita dipendenze esterne (niente `pip install`).
Comandi:

```bash
export SITE_BASE_URL="https://tuo-dominio.tld"

make sitemap       # genera sitemap.xml, robots.txt, routes.csv
make links         # crawling same-origin (urllib) → link_report.csv
make report        # report sintetico
make search        # search_index.json
make redirects     # redirects.txt, netlify.toml, vercel.json, nginx.conf.sample
make structured    # public/structured-data.json
make audit         # tutto in sequenza
```

Configura le sezioni in `ops/site-audit/route_mapping.json`.
