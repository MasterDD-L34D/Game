.PHONY: sitemap links report search redirects structured audit \
	evo-tactics-pack dev-stack test-stack ci-stack \
	evo-batch-plan evo-batch-run evo-plan evo-run evo-list evo-lint \
	evo-help

PYTHON ?= python3
EVO_AUTOMATION := $(PYTHON) -m tools.automation.evo_batch_runner
EVO_SCHEMA_LINT := $(PYTHON) -m tools.automation.evo_schema_lint
SITE_AUDIT_CMD := $(PYTHON) ops/site-audit/run_suite.py

EVO_BATCH ?= all
EVO_FLAGS ?=
EVO_TASKS_FILE ?= incoming/lavoro_da_classificare/tasks.yml
EVO_LINT_PATH ?=
SITE_BASE_URL ?=
SITE_AUDIT_MAX_PAGES ?= 2000
SITE_AUDIT_TIMEOUT ?= 10
SITE_AUDIT_CONCURRENCY ?= 10
EVO_VERBOSE ?=
EVO_VERBOSE_FLAG := $(strip $(if $(filter 1 true yes on,$(EVO_VERBOSE)),--verbose,))

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

audit:
	$(SITE_AUDIT_CMD) \
		--repo-root "$(CURDIR)" \
		--base-url "${SITE_BASE_URL}" \
		--max-pages "${SITE_AUDIT_MAX_PAGES}" \
		--timeout "${SITE_AUDIT_TIMEOUT}" \
		--concurrency "${SITE_AUDIT_CONCURRENCY}"

evo-tactics-pack:
	node scripts/build_evo_tactics_pack_dist.mjs

dev-stack:
	npm run dev:stack

test-stack:
	npm run test:stack

ci-stack:
	npm run ci:stack

evo-help:
	@echo "Evo automation targets available:" && \
	echo "  make evo-list            # elenca i batch registrati" && \
	echo "  make evo-plan            # pianifica il batch indicato" && \
	echo "  make evo-run             # esegue il batch indicato" && \
	echo "  make evo-lint            # valida gli schemi JSON" && \
	echo "Variabili supportate: EVO_BATCH, EVO_FLAGS, EVO_TASKS_FILE, EVO_LINT_PATH, EVO_VERBOSE"

evo-list:
	$(EVO_AUTOMATION) --tasks-file "${EVO_TASKS_FILE}" ${EVO_VERBOSE_FLAG} list

evo-plan:
	$(EVO_AUTOMATION) --tasks-file "${EVO_TASKS_FILE}" ${EVO_VERBOSE_FLAG} plan --batch "${EVO_BATCH}"

evo-run:
	$(EVO_AUTOMATION) --tasks-file "${EVO_TASKS_FILE}" ${EVO_VERBOSE_FLAG} run --batch "${EVO_BATCH}" ${EVO_FLAGS}

evo-lint:
	@if [ -n "${EVO_LINT_PATH}" ]; then \
		$(EVO_SCHEMA_LINT) ${EVO_VERBOSE_FLAG} "${EVO_LINT_PATH}"; \
	else \
		$(EVO_SCHEMA_LINT) ${EVO_VERBOSE_FLAG}; \
	fi

evo-batch-plan:
	$(MAKE) --no-print-directory evo-plan EVO_BATCH="${EVO_BATCH}" EVO_TASKS_FILE="${EVO_TASKS_FILE}"

evo-batch-run:
	$(MAKE) --no-print-directory evo-run \
		EVO_BATCH="${EVO_BATCH}" \
		EVO_FLAGS="${EVO_FLAGS}" \
		EVO_TASKS_FILE="${EVO_TASKS_FILE}"
