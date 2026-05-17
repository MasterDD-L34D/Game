---
title: Excavate inventory — mating_nido (V3 deferred system)
doc_status: draft
doc_owner: agents/repo-archaeologist
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [archaeology, museum, mating_nido, deferred]
---

# Excavate — mating_nido

## Summary

- **Dominio NON green-field**: contrariamente a OD-001 (V3 "deferred post-MVP, no runtime"), `apps/backend/services/metaProgression.js` (469 LOC) include già engine D1+D2 completo (recruit, trust, mating roll d20, nest setup) + routes REST `/api/meta/{npg,affinity,trust,recruit,mating,nest,nest/setup}` + Prisma adapter (PR #1679). Runtime esiste ma non è esposto al gameplay loop.
- **Drift dataset critico**: `data/core/mating.yaml` (477 LOC) e `packs/evo_tactics_pack/data/mating.yaml` (393 LOC) divergono di 84 righe. Pack copy MANCA tutta sezione `gene_slots` (struttura/funzione/memorie + inheritance_rules) introdotta da commit `3e1b4f22` (TODO 7 — sentience T0-T6). Pack desincronizzato.
- **Buried genuine**: `docs/appendici/D-CANVAS_ACCOPPIAMENTO.md` (95 LOC, legacy 2025-10-23 ChatGPT export) contiene scala Affinità/Fiducia originaria -3..+3 ora **deprecata** (canonical doc usa -2..+2 / 0..5 post P0 Q11), ma include dettagli mai migrati (nido itinerante con 2 Anchor, raid Security Rating, rituali coesione spendono Legami).

## Inventory

| ID               | Path                                                       | Tipo             | LOC | Origine (commit/PR)                                | Provenance verdict | Note                                                                                                                |
| ---------------- | ---------------------------------------------------------- | ---------------- | --- | -------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| M-2026-04-25-007 | `docs/appendici/D-CANVAS_ACCOPPIAMENTO.md`                 | Canvas legacy    | 95  | `d6bc3a03` Restore approved canvas archives        | LEGACY-DRAFT       | Snapshot ChatGPT 2025-10-23. Scala -3..+3 deprecata (P0 Q11). Detail nido itinerante + Security Rating non migrati. |
| M-2026-04-25-008 | `packs/evo_tactics_pack/data/mating.yaml`                  | Dataset pack     | 393 | bulk pack import (pre-3e1b4f22)                    | DRIFT-STALE        | Manca 84 righe `gene_slots` (struttura/funzione/memorie). Diverge da `data/core/mating.yaml` canonical.             |
| M-2026-04-25-009 | `packs/evo_tactics_pack/docs/mating.md`                    | Bozza pack       | 28  | `5a06b64b` (tri_sorgente variants)                 | DRAFT              | Bozza "Sistema Accoppiamento" con CD 12 base + flusso 4-step + modificatori MBTI/Ennea. Non integrata canonical.    |
| M-2026-04-25-010 | `data/derived/mock/prod_snapshot/mating.yaml`              | Mock snapshot    | n/a | derived (mock generator)                           | AUTOGEN            | Generato da `npm run mock:generate`. Non excavate.                                                                  |
| M-2026-04-25-011 | `data/derived/mock/prod_snapshot/data/core/mating.yaml`    | Mock snapshot    | n/a | derived                                            | AUTOGEN            | Stesso. Skip.                                                                                                       |
| M-2026-04-25-012 | `data/derived/test-fixtures/minimal/data/core/mating.yaml` | Test fixture     | n/a | test fixture                                       | AUTOGEN            | Skip.                                                                                                               |
| M-2026-04-25-013 | `data/core/mating.yaml` (sezione `compat_ennea`)           | Schema partial   | 4   | `3e1b4f22` + `2254b355` P0 Q batch                 | PARTIAL-CANONICAL  | Solo header `compat_ennea:` + 4 righe `actions_appeal`. Tabella 9×9 Ennea NON popolata. Stub.                       |
| M-2026-04-25-014 | `apps/backend/services/metaProgression.js` (D1+D2)         | Runtime engine   | 469 | `ea945a56` Design Freeze v0.9 + `3272f844` (#1679) | RUNTIME-LIVE       | Engine funzionante: `canMate`, `rollMating`, `computeMatingRoll`, `setNest`, `tickCooldowns`. Non in gameplay loop. |
| M-2026-04-25-015 | `apps/backend/routes/meta.js` (7 endpoints)                | REST API         | 119 | `ea945a56` + #1679                                 | RUNTIME-LIVE       | `/api/meta/{npg,affinity,trust,recruit,mating,nest,nest/setup}`. Mai chiamato da frontend.                          |
| M-2026-04-25-016 | `incoming/lavoro_da_classificare/proposed_sitemap.xml:68`  | Reference orfana | 1   | bulk import incoming/                              | ORPHAN-REF         | Sitemap menziona URL `/regole/mating-biome-links` che non esiste. False trail.                                      |

## Top 3 candidates for curation

### 1. M-2026-04-25-014/015 — Runtime mating engine (metaProgression D1+D2)

**Verdict**: SUPER-BURIED (runtime live ma invisibile al gameplay).

**Razionale**: 469 LOC engine + 7 endpoint REST + Prisma adapter shipped 4 mesi fa, **ZERO chiamate dal frontend** (`apps/play/`), zero integration in session/campaign loop. OD-001 traccia V3 come "deferred no runtime" — disinformazione. Codice esiste ma è dead path.

**Curation suggerita**: museum card "Mating Engine — buried runtime" che documenti API surface + state in-memory + Prisma model + lacuna integration. NON revive automatico — decisione product se attivare V3 sprint o demolire (sub-attivazione: route 410 deprecate).

### 2. M-2026-04-25-008 — Pack mating.yaml drift

**Verdict**: DRIFT-STALE (sync break).

**Razionale**: Pack version manca 84 righe `gene_slots` introdotte da `3e1b4f22` (TODO 7 sentience). `npm run sync:evo-pack` non rebuilda dataset core → pack. Bug silenzioso: validator pack passa ma contenuto stale.

**Curation suggerita**: museum card "Pack mating.yaml stale gene_slots" + ticket TKT a sincronizzare via sync script o aggiornamento manuale + verifica `npm run sync:evo-pack` policy.

### 3. M-2026-04-25-007 — D-CANVAS legacy detail

**Verdict**: BURIED-DETAIL.

**Razionale**: Canvas legacy ha 3 meccaniche mai migrate canonical: (1) **nido itinerante** (2 Resonance Anchor, sposta ogni 3 turni campagna), (2) **Security Rating vs minaccia bioma** (calcolo raid), (3) **rituali coesione** spendono `Legami` per ridurre StressWave. Skiv vagans hint: "wandering loner" potrebbe interagire con nido itinerante (no static nest, anchor-driven). Worth indexing prima di shippare V3 senza queste idee.

**Curation suggerita**: museum card "Nido itinerante + Security Rating" con quote esatte canvas + nota Skiv-relevance.

## False positives (NOT buried, intentional canonical)

- `docs/core/Mating-Reclutamento-Nido.md` — Canvas D **canonical attivo** post P0 Q11 (rev 2026-04-20 scala -2..+2 / 0..5). Non excavate.
- `docs/core/27-MATING_NIDO.md` — index pointer al canonical. Non excavate.
- `data/core/mating.yaml` — dataset canonical (477 LOC). Sezione `compat_ennea` partial (TKT-008 enneagramma) è gap noto, non burial.
- `data/core/game_functions.yaml` riga 5 (`mating_nido` listed) — tag canonical sistema, intenzionale.

## Suggested next-step

1. **Decisione product (P0)**: V3 mating engine già live ma orfano → due path:
   - **Path A — activate**: aprire mini-sprint M14? collegare `/api/meta/*` al frontend (debrief panel "recruit ex-nemico" + nest hub UI). ~12-15h.
   - **Path B — demolish**: deprecare `apps/backend/routes/meta.js` con 410, marker `services/metaProgression.js` come unused, aggiornare OD-001 → "engine present but quarantined, V3 truly post-MVP". ~2h.
2. **Sync drift (P1, autonomous)**: rebuild `packs/evo_tactics_pack/data/mating.yaml` da `data/core/mating.yaml` (~15 min) + verifica `sync:evo-pack` script copre dataset core → pack mating.
3. **Curation (P2, agent autonomous)**: scrivere 3 museum card sopra elencate, spawn task da agente museum-curator.
4. **Skiv link (P3, opzionale)**: se path A attivato → considerare canvas D "nido itinerante" come perfect fit per Skiv vagans (anchor-based, no fixed nest), Skiv mating MBTI-blocked (loner ESTP/ISTP rolls penalty su nest_module_min ≥ 2).

**Costo total path A+sync+curation**: ~18h (1 sprint week). Path B+sync+curation: ~7h.
