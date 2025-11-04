.PHONY: sitemap links report audit search redirects structured

sitemap:
	python ops/site-audit/build_sitemap.py --repo-root . --duplicate-to-public

links:
	python ops/site-audit/check_links.py --start-url "$${SITE_BASE_URL}" --max-pages 2000 --timeout 10 --out ops/site-audit/_out/link_report.csv

report:
	python ops/site-audit/report_links.py --site "$${SITE_BASE_URL}"

search:
	python ops/site-audit/generate_search_index.py --repo-root .

redirects:
	python ops/site-audit/build_redirects.py --repo-root .

structured:
	python ops/site-audit/generate_structured_data.py --base-url "$${SITE_BASE_URL}"

audit: sitemap links report search redirects structured
