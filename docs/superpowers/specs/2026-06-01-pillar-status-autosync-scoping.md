---
title: 'Pillar-status auto-sync — scoping (follow-up #2489, 3rd governance target)'
workstream: ops-qa
category: spec
doc_status: draft
doc_owner: claude-code
last_verified: '2026-06-01'
source_of_truth: false
language: it
review_cycle_days: 60
tags: [governance, anti-drift, pillar-status, scoping, follow-up-2489, sprint-context]
---

# Pillar-status auto-sync — scoping (NON ancora build)

> Terzo target anti-pattern #19, dopo DECISIONS_LOG (#2489), OPEN_DECISIONS (#2492), registry-reconcile
> (#2493). **Questo e' SOLO scoping** — il build richiede harsh-review SDMG prima (come la famiglia #2489).
> Stato: `draft` finche' master-dd non sceglie target di proiezione + non passa harsh-review.

## Ground-truth (MISURATO 2026-06-01, non asserito)

- **Definizione** pilastri P1-P6 = `docs/core/02-PILASTRI.md` (canonical, stabile).
- **Status** pilastri (🟢/🟡/🔴 + qualifier `candidato`/`confirmed`/`hard`) = **prosa sparsa in `CLAUDE.md`**:
  ~88 menzioni P1-P6 distribuite su **12 sezioni `## 🎮 Sprint context`** (ogni sessione ne appende una
  nuova; le vecchie marcate `[SUPERSEDED]` ma NON rimosse → CLAUDE.md gonfia).
- **Nessuna sorgente machine-readable** per lo status (grep `data/`/`packs/` = 0 file pillar-status; gli hit
  sono substring non correlati). Lo status e' un **giudizio soggettivo di design**, non un conteggio.

## Problema (doppio)

1. **Drift #19**: pillar-status hand-maintained su 12 sezioni → l'ultima vince ma le vecchie restano,
   nessun single-source → un lettore non sa quale e' "the truth" senza scorrere 12 blocchi.
2. **Bloat**: 12 sezioni sprint-context accumulate gonfiano `CLAUDE.md` (caricato ogni sessione = costo token).

## Caveat ONESTO (la crux — perche' NON e' un clone di DECISIONS_LOG)

DECISIONS_LOG si genera da un FATTO (ADR frontmatter `status`). OPEN_DECISIONS da un campo (`status=open`).
**Pillar status NON e' un fatto derivabile**: "P6 🟢 candidato" e' un **giudizio umano** (quanto evidence basta
per 🟢? candidato vs confirmed = call soggettiva). Quindi **"derive-don't-maintain" puro NON si applica**.
Il fit realistico = **single-source attestation + projection** (come `last_verified`: l'umano attesta, una
sola sorgente, proiettata ovunque) — NON auto-derivazione da test/git.

## Approccio proposto (opzioni)

- **A — single-source YAML + projection (RACCOMANDATO)**. `data/derived/pillar_status.yaml` (o blocco marker in
  `02-PILASTRI.md`): per P1-P6 → `status` + `qualifier` + `evidence` (PR#/test refs) + `last_updated` (attestazione
  umana). Generatore `tools/generate_pillar_status.py` proietta in un blocco `<!-- gen:pillar-status -->` (target
  da decidere, vedi sotto) + CI fail-on-diff. Status resta human-attested → uccide il 12-section drift, NON finge
  auto-derivazione. Riusa il pattern marker-inject + `--check` di `generate_decisions_log.py`.
- **B — derive-from-evidence (RIGETTATO come primario)**. Mappare pillar→test/PR e auto-settare status: fragile
  (mapping arbitrario, candidato-vs-confirmed = giudizio). Al massimo come **segnale advisory** ("evidence
  suggerisce P6 stale, verifica") accanto allo status attestato, MAI come setter.

## Decisioni pending (master-dd, gate pre-build)

1. **Dove vive la sorgente**: `data/derived/pillar_status.yaml` vs blocco marker in `02-PILASTRI.md`.
2. **Dove vive la proiezione**: nuovo `PILLAR_STATUS.md` root (come BACKLOG/OPEN_DECISIONS) vs blocco generato
   dentro `02-PILASTRI.md` vs blocco nella sprint-context corrente di `CLAUDE.md`.
3. **Sprint-context bloat** (sub-problema separato): archiviare le 11 sezioni `[SUPERSEDED]` in un
   `docs/planning/sprint-context-history.md` lasciando solo la corrente in `CLAUDE.md`. Bundle o PR separato.

## Build plan (GATED — non ora)

Quando ripreso: research-lite (ri-verifica sorgenti) → harsh-review SDMG di questo scoping (falsify-before-build,
come #2492/#2493 — il critic li ha salvati entrambi) → build (schema + migrate 6 pillar dalle 12 sezioni +
generatore + `--check` + CI/husky) → QG (idempotenza + fail-on-diff + governance errors=0). Effort stimato medio.

## Anti-pattern guard (SDMG)

- Status resta **human-attested** (no falsa auto-derivazione di un giudizio soggettivo).
- Single-source (uccide il 12-section drift) + marker-inject + fail-on-diff (riuso pattern #2489).
- Sprint-context bloat = problema DISTINTO, non confonderlo con lo status-sync.
- NON buildare senza harsh-review (la famiglia #2489 ha 3/3 spec migliorati dal critic; questo non e' eccezione).

## Riferimenti

- Famiglia #2489: `2026-05-30-governance-auto-sync-design.md`, `2026-05-31-open-decisions-projection-design.md`,
  `2026-05-31-docs-registry-reconcile-design.md`. Guida roadmap: `docs/guide/roadmap-intervention.md`.
- Sorgenti: `docs/core/02-PILASTRI.md` (def), `CLAUDE.md` sprint-context (status, 12 sezioni), `docs/planning/2026-04-20-pilastri-reality-audit.md`.
