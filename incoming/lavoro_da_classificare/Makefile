
.PHONY: sitemap links report search redirects structured audit

sitemap:
\tpython ops/site-audit/build_sitemap.py

links:
\tpython ops/site-audit/check_links.py --start-url "$${SITE_BASE_URL}" --max-pages 2000 --timeout 10 --out ops/site-audit/_out/link_report.csv

report:
\tpython ops/site-audit/report_links.py --site "$${SITE_BASE_URL}"

search:
\tpython ops/site-audit/generate_search_index.py --repo-root .

redirects:
\tpython ops/site-audit/build_redirects.py

structured:
\tpython ops/site-audit/generate_structured_data.py --base-url "$${SITE_BASE_URL}"

audit: sitemap links report search redirects structured
