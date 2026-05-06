---
title: Ops and QA Hub
description: Hub canonico per quality gate, CI e osservabilita'.
tags: [ops, qa, ci]
doc_status: active
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-05-06
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Ops and QA Hub

## Scope

- Workflow CI: `.github/workflows/`
- Site audit e reportistica ops: `ops/site-audit/`
- Report periodici: `docs/reports/` (generated)

## Documenti live

- [CI pipeline](../ci-pipeline.md)
- [CI details](../ci.md)
- [Observability](../observability.md)

## Gate principali

- quality checks definiti in `ci.yml`
- `python tools/check_site_links.py docs`
- `python tools/check_docs_governance.py`
