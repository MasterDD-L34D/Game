---
title: Automazioni CI sito statico docs/ (maintenance-mode)
doc_status: draft
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-06-21
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# Automazioni CI sito statico docs/ (maintenance-mode)

> **Maintenance-mode (master-dd 2026-06-21).** Il sito statico GitHub Pages
> (`docs/` "Support Hub") NON e' piu' mantenuto attivamente dopo il pivot al
> client Godot + backend Express. I job di audit sito sopravvivono in
> `.github/workflows/ci.yml` ma girano solo su modifiche ai file del sito e
> sono in larga parte inerti senza la variabile `SITE_BASE_URL`. Doc conservato
> come riferimento alle automazioni residue, non come guida attiva.

## Job residui in `ci.yml`

Il dispatcher `paths-filter` espone l'output `site_audit`; quando file del sito
cambiano partono:

- `site-audit` -- sitemap + link-check via `ops/site-audit/` (script Python +
  target `make audit`), produce report.
- `lighthouse-ci` -- audit prestazioni/accessibilita'. **Inerte**: il config
  `lighthouserc.json` non esiste piu' a root del repo, quindi il job non ha una
  baseline da eseguire anche con `SITE_BASE_URL` impostato.

I test E2E del sito **non** vivono qui: sono nel workflow separato `e2e.yml`
(Playwright, `tests/playwright`, `npx playwright test`).

## Variabile `SITE_BASE_URL`

Impostata in Actions -> Variables/Secrets, abilita link-check + Lighthouse vs un
deploy reale. Senza di essa i job di audit restano no-op. Dato lo stato
maintenance-mode del sito non e' attualmente configurata.

## Se il sito venisse riattivato

1. Ripristinare `lighthouserc.json` a root (baseline Lighthouse).
2. Impostare `SITE_BASE_URL` sul deploy di staging.
3. Verificare i target `ops/site-audit/run_suite.py` + `make audit`.
4. Promuovere questo doc da maintenance-mode ad active.
