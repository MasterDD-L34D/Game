---
title: Ops and QA Hub
description: Hub canonico per quality gate, CI e osservabilita'.
tags: [ops, qa, ci]
doc_status: active
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-06-06
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

- [CI pipeline](../pipelines/ci-pipeline.md)
- [CI details](../pipelines/ci.md)
- [Observability](../ops/observability.md)
- [Canonical AI-driven playtest — SoT metodo](../process/CANONICAL-AI-PLAYTEST.md) + [suite manifest](../playtest/canonical-suite.yaml)

## Gate principali

- quality checks definiti in `.github/workflows/ci.yml`
- `python tools/check_site_links.py docs`
- `python tools/check_docs_governance.py`
- **Playtest AI-driven canonico** (multi-policy, WR in-band a N=40) = balance gate riproducibile; playtest umano = conferma opzionale. SoT: `docs/process/CANONICAL-AI-PLAYTEST.md`
