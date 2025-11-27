.PHONY: sitemap links report search redirects structured audit \
	evo-tactics-pack dev-stack test-stack ci-stack \
	evo-batch-plan evo-batch-run evo-plan evo-run evo-list evo-lint \
	evo-help evo-validate evo-backlog traits-review update-tracker

PYTHON ?= python3
EVO_AUTOMATION := $(PYTHON) -m tools.automation.evo_batch_runner
EVO_TRACKER_UPDATE := $(PYTHON) -m tools.automation.update_tracker_registry
EVO_SCHEMA_LINT := $(PYTHON) -m tools.automation.evo_schema_lint
SITE_AUDIT_CMD := $(PYTHON) ops/site-audit/run_suite.py
EVO_VALIDATE_SCRIPT := incoming/scripts/validate_evo_pack.sh
EVO_VALIDATE_AJV ?= tools/ajv-wrapper.sh
EVO_VALIDATE_TRAITS ?= incoming/traits
EVO_VALIDATE_SPECIES ?= incoming/species
EVO_VALIDATE_TEMPLATES ?= incoming/templates
EVO_BACKLOG_SCRIPT := incoming/scripts/setup_backlog.py
EVO_BACKLOG_FILE ?=
EVO_BACKLOG_REPO ?=
TRAITS_REVIEW_SCRIPT := incoming/scripts/trait_review.py
TRAITS_REVIEW_GLOSSARY ?= data/core/traits/glossary.json
TRAITS_REVIEW_OUTDIR ?= reports/evo
TRAITS_REVIEW_INPUT ?=
TRAITS_REVIEW_BASELINE ?= data/core/traits/glossary.json
TRAITS_REVIEW_OUT ?= reports/evo/traits_review.csv
SPECIES_SUMMARY_SCRIPT := incoming/scripts/species_summary_script.py
SPECIES_SUMMARY_ROOT ?= data/external/evo/species
SPECIES_SUMMARY_OUT ?= reports/evo/species_summary.csv

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
TRACKER_CHECK ?=
TRACKER_CHECK_FLAG := $(strip $(if $(filter 1 true yes on,$(TRACKER_CHECK)),--check,))

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
	echo "  make evo-validate        # valida trait/species incoming con AJV" && \
	echo "  make evo-backlog         # popola il project board GitHub dal backlog YAML" && \
	echo "  make traits-review       # genera report glossario o CSV di revisione" && \
	echo "  make update-tracker      # sincronizza lo stato del tracker con integration_batches.yml" && \
	echo "Variabili supportate: EVO_BATCH, EVO_FLAGS, EVO_TASKS_FILE, EVO_LINT_PATH, EVO_VERBOSE, TRACKER_CHECK"

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

evo-validate:
	@if [ -d "${EVO_VALIDATE_SPECIES}" ]; then \
		bash ${EVO_VALIDATE_SCRIPT} --dataset "${EVO_VALIDATE_SPECIES}" --schema schemas/evo/species.schema.json; \
	else \
		echo "Skipping species validation: directory not found (${EVO_VALIDATE_SPECIES})"; \
	fi
	@if [ -d "${EVO_VALIDATE_TRAITS}" ]; then \
		bash ${EVO_VALIDATE_SCRIPT} --dataset "${EVO_VALIDATE_TRAITS}" --schema schemas/evo/trait.schema.json; \
	else \
		echo "Skipping traits validation: directory not found (${EVO_VALIDATE_TRAITS})"; \
	fi

evo-backlog:
	@if [ -z "${EVO_BACKLOG_FILE}" ]; then \
		echo "Errore: impostare EVO_BACKLOG_FILE=<percorso backlog YAML>."; \
		exit 1; \
	fi
	@if [ -z "${EVO_BACKLOG_REPO}" ]; then \
		echo "Errore: impostare EVO_BACKLOG_REPO=<owner/repo>."; \
		exit 1; \
	fi
	BACKLOG_FILE="${EVO_BACKLOG_FILE}" \
	REPO="${EVO_BACKLOG_REPO}" \
	$(PYTHON) ${EVO_BACKLOG_SCRIPT}

traits-review:
	@if [ -n "${TRAITS_REVIEW_INPUT}" ]; then \
		$(PYTHON) ${TRAITS_REVIEW_SCRIPT} --input "${TRAITS_REVIEW_INPUT}" --baseline "${TRAITS_REVIEW_BASELINE}" --out "${TRAITS_REVIEW_OUT}"; \
	else \
		$(PYTHON) ${TRAITS_REVIEW_SCRIPT} --glossary "${TRAITS_REVIEW_GLOSSARY}" --outdir "${TRAITS_REVIEW_OUTDIR}"; \
	fi
	@if [ -d "${SPECIES_SUMMARY_ROOT}" ]; then \
		$(PYTHON) ${SPECIES_SUMMARY_SCRIPT} --root "${SPECIES_SUMMARY_ROOT}" --output "${SPECIES_SUMMARY_OUT}";\
	else \
		echo "Skipping species summary: directory not found (${SPECIES_SUMMARY_ROOT})"; \
	fi

update-tracker:
	$(EVO_TRACKER_UPDATE) ${EVO_VERBOSE_FLAG} $(TRACKER_CHECK_FLAG) $(if $(BATCH),--batch "${BATCH}",)
