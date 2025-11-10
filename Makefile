
.PHONY: sitemap links report search redirects structured audit evo-tactics-pack dev-stack test-stack ci-stack evo-batch-plan evo-batch-run

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

evo-tactics-pack:
node scripts/build_evo_tactics_pack_dist.mjs

dev-stack:
npm run dev:stack

test-stack:
npm run test:stack

ci-stack:
npm run ci:stack

evo-batch-plan:
	python tools/automation/evo_batch_runner.py plan --batch "$(batch)"

evo-batch-run:
	python tools/automation/evo_batch_runner.py run --batch "$(batch)" $(flags)
