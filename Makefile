.PHONY: sitemap links report search redirects structured audit \
        evo-tactics-pack dev-stack test-stack ci-stack \
        evo-batch-plan evo-batch-run evo-plan evo-run evo-list evo-lint

batch ?= all
flags ?=
EVO_TASKS_FILE ?= incoming/lavoro_da_classificare/tasks.yml
EVO_LINT_PATH ?=

sitemap:
	python ops/site-audit/build_sitemap.py

links:
	python ops/site-audit/check_links.py --start-url "${SITE_BASE_URL}" --max-pages 2000 --timeout 10 --out ops/site-audit/_out/link_report.csv

report:
	python ops/site-audit/report_links.py --site "${SITE_BASE_URL}"

search:
	python ops/site-audit/generate_search_index.py --repo-root .

redirects:
	python ops/site-audit/build_redirects.py

structured:
	python ops/site-audit/generate_structured_data.py --base-url "${SITE_BASE_URL}"

audit: sitemap links report search redirects structured

evo-tactics-pack:
	node scripts/build_evo_tactics_pack_dist.mjs

dev-stack:
	npm run dev:stack

test-stack:
	npm run test:stack

ci-stack:
	npm run ci:stack

evo-list:
        python tools/automation/evo_batch_runner.py --tasks-file "${EVO_TASKS_FILE}" list

evo-plan:
        python tools/automation/evo_batch_runner.py --tasks-file "${EVO_TASKS_FILE}" plan --batch "${batch}"

evo-run:
        python tools/automation/evo_batch_runner.py --tasks-file "${EVO_TASKS_FILE}" run --batch "${batch}" ${flags}

evo-lint:
        @if [ -n "${EVO_LINT_PATH}" ]; then \
                python tools/automation/evo_schema_lint.py "${EVO_LINT_PATH}"; \
        else \
                python tools/automation/evo_schema_lint.py; \
        fi

evo-batch-plan:
	$(MAKE) --no-print-directory evo-plan batch="${batch}" EVO_TASKS_FILE="${EVO_TASKS_FILE}"

evo-batch-run:
	$(MAKE) --no-print-directory evo-run batch="${batch}" flags="${flags}" EVO_TASKS_FILE="${EVO_TASKS_FILE}"
