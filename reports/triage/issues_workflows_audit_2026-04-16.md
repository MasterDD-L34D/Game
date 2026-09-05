---
title: Issues + Workflows Triage Report (2026-04-16)
doc_status: draft
doc_owner: ops-qa-team
workstream: ops-qa
last_verified: 2026-04-16
source_of_truth: false
---

# Issues + Workflows Triage Report — 2026-04-16

Audit completo post-merge PR #1390. 33 issue aperte, 28 workflow GitHub Actions. Obiettivo: ridurre noise + accelerare CI.

## 1. Issue triage

### 1.1 Numero totale

**33 issue aperte**. Divisione:

- **23 bot-generated "Evo docs blocking diffs"** (#698, #807, #1029, #1167, #1207, #1277..#1294) — generate automaticamente da workflow `evo-doc-backfill.yml` quando rileva divergenze. Tutte stale (prima del 2026-04-14 restructuring).
- **10 issue umane** (#1338..#1348) create il 2026-04-14 dal Master DD post-audit.

### 1.2 Issue bot — 23 da bulk-close

| # | Data | Titolo |
|---|---|---|
| #698 | 2025-11-17 | Evo docs blocking diffs detected on 2025-11-17 |
| #807 | 2025-11-24 | Evo docs blocking diffs detected on 2025-11-24 |
| #1029 | 2025-12-01 | Evo docs blocking diffs detected on 2025-12-01 |
| #1167 | 2025-12-05 | ... |
| #1207..#1294 | 2025-12-08..2026-04-13 | (19 altre) |

**Raccomandazione**: **BULK CLOSE** tutte con commento standard (post-restructuring non piu' rilevanti). Il workflow generator deve essere **fixato** per non ri-crearle o **disabilitato**.

### 1.3 Issue umane — triage individuale

| # | Priorita' | Label | Titolo breve | Raccomandazione |
|---|:-:|---|---|---|
| **#1338** | media | bug | glossary.json/index.json replacement char Unicode | **Fixare presto**. Bug reale, impatta dataset. Quick win. |
| **#1339** | media | bug | /api/v1/generation/snapshot + /api/v1/atlas/ ritornano 500 | **Fixare presto**. Atlas schema drift. Potrebbe bloccare dashboard. |
| **#1341** | alta | bug | side-effect dataset live durante test:api (atlas-snapshot, status.json, qa-changelog) | **Alta prio**. Test non idempotenti mutano dataset reali. Issue severo. |
| **#1342** | alta | bug | ORCHESTRATOR_AUTOCLOSE_MS friction (live vs test defaults) | **Alta prio**. DX friction documentata. Legata a #1341. |
| **#1343** | media | — | decisione rimuovere apps/dashboard + packages/angular* | **Decisione** (non bug). Gia' documentato in ADR-2026-04-14-dashboard-scaffold. Richiede confirmation umana per proceed. |
| **#1344** | media | documentation | triage contenuto incoming/ (69 file, 6.6MB) | **Backlog**. Lavoro grosso, parzialmente fatto nelle sessioni docs-restructuring. |
| **#1345** | media | documentation | triage 7 file pseudo-archive in reports/ | **Quick win**. 30min. |
| **#1346** | bassa | — | rinomina "apps/trait-editor/" → apps/trait-editor/ | **Backlog**. Cosmetico. Blast radius medio (symlink, imports). |
| **#1347** | bassa | — | housekeeping untracked + .gitignore | **Quick win**. 15min. |
| **#1348** | bassa | — | dx(husky): lint-staged auto-fix Prettier | **Backlog**. DX improvement. Blast radius basso. |

### 1.4 Piano issue

1. **Immediato**: bulk-close 23 issue bot
2. **Quick wins** (1 sprint): #1338, #1345, #1347
3. **Alta prio** (1 sprint dedicato): #1341 + #1342 (correlate, stesso fix)
4. **Medium term**: #1339 (richiede combat team review)
5. **Backlog**: #1343, #1344, #1346, #1348

## 2. Workflow triage

### 2.1 Inventario completo (28 workflow)

Stats aggregate dagli ultimi 1000 run:

| Workflow | Run tot | Success | Failure | Cancelled | Ultimo run | Health |
|---|---:|---:|---:|---:|---|:-:|
| **CI** | 330 | 314 | 16 | 0 | 2026-04-15 | 🟢 95% |
| **Docs Governance** | 287 | 287 | 0 | 0 | 2026-04-15 | 🟢 100% |
| **Deploy site** (deploy-test-interface) | 202 | 56 | 79 | 67 | 2026-04-15 | 🔴 28% |
| **Deploy to GitHub Pages** (gh-pages) | 47 | **0** | 28 | 19 | 2026-04-15 | ⚫ **DEAD** |
| **qa-reports** | 35 | 32 | 3 | 0 | 2026-04-15 | 🟢 91% |
| **Data audit and validation** (data-quality) | 13 | 13 | 0 | 0 | 2026-04-15 | 🟢 100% |
| **ChatGPT Sync** | 10 | 10 | 0 | 0 | 2026-04-15 | 🟢 100% |
| **Daily PR Summary** | 10 | 8 | 2 | 0 | 2026-04-15 | 🟡 80% |
| **Daily tracker refresh** | 10 | **0** | 10 | 0 | 2026-04-15 | ⚫ **DEAD** |
| **E2E Tests** | 10 | 10 | 0 | 0 | 2026-04-15 | 🟢 100% |
| **Validate Trait Catalog** | 10 | 10 | 0 | 0 | 2026-04-14 | 🟢 100% |
| **Lighthouse CI** (standalone) | 9 | 9 | 0 | 0 | 2026-04-15 | 🟢 100% |
| **Incoming CLI smoke** | 6 | **0** | 6 | 0 | 2026-04-14 | ⚫ **DEAD** |
| **Derived checksum audit** | 5 | 5 | 0 | 0 | 2026-04-13 | 🟢 100% |
| **telemetry-export** | 4 | 4 | 0 | 0 | 2026-04-14 | 🟢 100% |
| **Validate JSON Schemas** | 3 | 3 | 0 | 0 | 2026-04-14 | 🟢 100% |
| **Evo rollout status sync** | 2 | 2 | 0 | 0 | 2026-04-13 | 🟢 100% |
| **Idea Intake Index** | 2 | 1 | 1 | 0 | 2026-04-14 | 🟡 50% |
| **Sync Evo traits glossary** | 2 | 2 | 0 | 0 | 2026-04-13 | 🟢 100% |
| **Evo documentation archive sync** (evo-doc-backfill) | 1 | 1 | 0 | 0 | 2026-04-13 | 🟢 ma crea issue spam |
| **Log harvester** | 1 | **0** | 1 | 0 | 2026-04-13 | ⚫ **DEAD** |
| **QA export manual** | 1 | 1 | 0 | 0 | 2026-04-14 | 🟢 manual-only |
| **Evo Batch** | <5 | 0 | 1 | 0 | 2025-12-08 | 🟡 stale |
| **HUD Canary** | <5 | 1 | 0 | 0 | 2025-12-05 | 🟡 stale |
| **QA KPI & Visual Monitor** | <5 | 1 | 0 | 0 | 2026-04-01 | 🟢 monthly |
| **Build Search Index** | <5 | 1 | 0 | 0 | 2025-12-05 | 🟡 stale |
| **Traits Monthly Maintenance** | <5 | 1 | 0 | 0 | 2026-04-01 | 🟢 monthly |
| **Validate registry naming** | <5 | 1 | 0 | 0 | 2025-12-09 | 🟡 stale |

### 2.2 Workflow DEAD (4, da fixare o rimuovere subito)

**Tutti con 0% success rate e broken noto**:

1. **gh-pages.yml** (`Deploy to GitHub Pages`) — **0 su 47 runs success**
   - **Causa**: `Cannot find module 'js-yaml'` in `scripts/update_evo_pack_catalog.js`
   - **Fix**: aggiungere `npm ci` prima dello step sync
   - **Alternativa**: rimuovere se `deploy-test-interface.yml` copre gia' il deploy (che ha 56/202 success, meno broken)

2. **daily-tracker-refresh.yml** — **0 su 10 runs success**
   - **Causa**: `FileNotFoundError: docs/checklist/milestones.md` — path stale post-restructuring (moved to `docs/process/milestones.md`)
   - **Fix**: aggiornare `scripts/daily_tracker_refresh.py` per nuovo path
   - **Alternativa**: rimuovere se il tracker index non e' piu' usato

3. **incoming-smoke.yml** — **0 su 6 runs success**
   - **Causa**: exit code 1 (dettagli troncati nei log, probabilmente anche post-restructuring docs/incoming/ narrowed)
   - **Fix**: investigare con `gh run view --log-failed` completo
   - **Alternativa**: rimuovere dopo cleanup completo di `docs/incoming/`

4. **log-harvester.yml** — **0 su 1 run success**
   - **Causa**: non investigata (1 solo run)
   - **Azione**: candidato rimozione (usato mai)

### 2.3 Workflow REDONDANTI (da merge/rimuovere)

1. **lighthouse.yml** (standalone) vs **ci.yml lighthouse-ci job**
   - Standalone: scheduled 3:43 UTC + dispatch, 9 run totali
   - ci.yml lighthouse-ci: job in CI, runs su PR (paths-filter)
   - **Raccomandazione**: REMOVE `lighthouse.yml` standalone. ci.yml gia' copre PR + main push.

2. **data-quality.yml** vs **validate_traits.yml** vs **ci.yml dataset-checks**
   - 3 workflow che validano dataset+traits in overlap
   - **Raccomandazione**: consolidare in 1 solo (ci.yml dataset-checks job), promuoverlo a source of truth. Rimuovere standalone.

3. **Deploy site (deploy-test-interface.yml) + Deploy to GitHub Pages (gh-pages.yml)**
   - Entrambi deployano static content su pages
   - deploy-test-interface: 28% success, pesante (165 righe, Playwright)
   - gh-pages: 0% success
   - **Raccomandazione**: decidere quale tenere. Fixare uno solo, rimuovere l'altro.

### 2.4 Workflow STALE (ultima run 2025, valutare rimozione)

| Workflow | Ultimo run | Note |
|---|---|---|
| **evo-batch.yml** | 2025-12-08 | Manual-only, mai usato da dicembre. **Candidato rimozione**. |
| **hud.yml** | 2025-12-05 | Trigger su path specifici (tools/ts/hud_alerts.ts + data/core/hud/**). Nessuna modifica a quei path da dicembre. **Candidato rimozione**. |
| **search-index.yml** | 2025-12-05 | Push su main + ops/site-audit/**. Raramente trigger. **Candidato rimozione o manual-only**. |
| **validate-naming.yml** | 2025-12-09 | Trigger su patch branch. Nessuna attivita' dal 2025. **Candidato rimozione**. |

### 2.5 Workflow SCHEDULED (verificare frequenza)

| Workflow | Schedule | Utilita' | Decisione |
|---|---|---|---|
| **chatgpt_sync.yml** | Daily 5:30 UTC | Sync ChatGPT snapshots | Valutare: serve ancora? |
| **daily-pr-summary.yml** | Daily 17:10 UTC | PR summary report (80% success) | Quick win: fix il 20% failure |
| **daily-tracker-refresh.yml** | Daily 12 UTC | 🔴 **DEAD** | **Fix o remove** |
| **evo-doc-backfill.yml** | Mon 4:30 UTC | **Genera le 23 issue bot** | **Fix il generator** per non spam-mare |
| **evo-rollout-status.yml** | Mon 6 UTC | Weekly rollout snapshot | Utile, tenere |
| **lighthouse.yml** | Daily 3:43 UTC | Lighthouse audit (redundant con ci.yml) | **REMOVE** |
| **log-harvester.yml** | Mon 3 UTC | 🔴 **DEAD** | **Remove** |
| **qa-kpi-monitor.yml** | 1st month 6 UTC | Monthly KPI + visual regression | Tenere (monthly) |
| **traits-monthly-maintenance.yml** | 1st month 6 UTC | Monthly trait audit | Tenere |
| **traits-sync.yml** | Mon 6 UTC | Weekly traits sync | Tenere |

### 2.6 Workflow HEALTHY + CORE (non toccare)

| Workflow | Note |
|---|---|
| **ci.yml** | Core. 95% success. 330 run. 10 job. DO NOT TOUCH, solo ottimizzare internamente. |
| **docs-governance.yml** | 100% success, 287 run. DO NOT TOUCH. |
| **derived_checksum.yml** | Non-blocking advisory. OK. |
| **schema-validate.yml** | Lightweight PR-blocking su `/schemas`. OK. |
| **validate_traits.yml** | PR-blocking su trait paths. OK (overlap con data-quality da valutare). |
| **telemetry-export.yml** | PR-blocking su path specifici. OK. |
| **qa-reports.yml** | 91% success. PR-blocking. OK. |
| **e2e.yml** | Scheduled Playwright. 100% success. OK. |

## 3. Raccomandazioni aggregate

### 3.1 Quick wins (singola PR, doc-free)

| # | Azione | Impatto | Effort |
|---|---|---|---|
| 1 | **Bulk close 23 issue bot** Evo docs blocking diffs | -23 issue, tracker pulito | 5 min |
| 2 | **Remove** `lighthouse.yml` (standalone) | -1 workflow, CI piu' leggero | 2 min |
| 3 | **Remove** `log-harvester.yml` (0% success, 1 run) | -1 workflow | 2 min |
| 4 | **Remove** `evo-batch.yml` (stale da dic 2025, mai mergiato con success) | -1 workflow | 2 min |
| 5 | **Remove** `hud.yml` + `search-index.yml` + `validate-naming.yml` (tutti stale) | -3 workflow | 5 min |

**Totale quick wins**: rimozione di ~6 workflow + 23 issue chiuse in ~15 minuti. CI piu' pulita, tracker deobbuso.

### 3.2 Medium priority fixes

| # | Azione | Impatto | Effort |
|---|---|---|---|
| 6 | **Fix** `daily-tracker-refresh.yml` path stale (`docs/checklist/milestones.md` → `docs/process/milestones.md`) | Tracker funzionante | 10 min |
| 7 | **Fix** `gh-pages.yml` mancato `npm ci` step | Deploy pages funzionante | 10 min |
| 8 | **Fix o remove** `incoming-smoke.yml` (0% success) | -1 workflow broken | 15 min |
| 9 | **Fix** `evo-doc-backfill.yml` stop issue spam | -1 fonte di 23 issue/anno | 30 min |

### 3.3 Strategic decisions (richiede input umano)

| # | Decisione | Alternative |
|---|---|---|
| 10 | **Consolidare** `data-quality.yml` + `validate_traits.yml` in `ci.yml` dataset-checks | a) merge in ci.yml e rimuovere standalone; b) tenere separati con paths chiari |
| 11 | **Decidere** quale deploy workflow tenere: `deploy-test-interface.yml` o `gh-pages.yml` | a) tenere deploy-test-interface (28% success), fixare; b) tenere gh-pages (dopo fix js-yaml) |
| 12 | **Valutare** rimozione `chatgpt_sync.yml` | Serve ancora la sync ChatGPT? Se no, rimuovere |

## 4. Piano di esecuzione suggerito

### Fase 1 — Noise reduction (15 min, 1 PR doc-free)

- Bulk close 23 issue bot
- Rimuovere 6 workflow stale/redundant (lighthouse, log-harvester, evo-batch, hud, search-index, validate-naming)

### Fase 2 — Fix dei broken (30 min, 1 PR)

- Fix path in `daily-tracker-refresh.py`
- Fix `gh-pages.yml` (npm ci)
- Fix o rimuovi `incoming-smoke.yml`
- Fix generator `evo-doc-backfill.yml` (smettere di creare issue spam)

### Fase 3 — Consolidation (1-2 PR, richiede testing)

- Valutare merge di `data-quality.yml` + `validate_traits.yml` in ci.yml
- Decidere strategia deploy (1 workflow solo)
- Optional: consolidare schedule jobs (chatgpt_sync + daily-pr-summary + traits-sync + evo-doc-backfill in un singolo workflow scheduled diario con job array)

### Fase 4 — Issue fix (lavoro di codice)

Ordine suggerito per le 10 issue umane:

1. **#1341 + #1342** (insieme): test side-effects + orchestrator autoclose — alta prio, stesso fix
2. **#1338**: glossary/index unicode — quick win
3. **#1345** + **#1347**: housekeeping reports/ + gitignore — quick wins
4. **#1339**: /api/v1/atlas 500 — combat team review
5. **#1343**: dashboard removal decision — richiede ADR
6. **#1344**: incoming/ triage — lavoro grosso backlog
7. **#1346**: rename apps/trait-editor/ — backlog
8. **#1348**: husky auto-fix — backlog

## 5. Metriche attese post-cleanup

| Metric | Pre | Post | Delta |
|---|---:|---:|---:|
| Workflow totali | 28 | ~20 | **-8** |
| Workflow broken (0% success) | 4 | 0 | **-4** |
| Issue aperte | 33 | 10 | **-23** |
| CI critical path job count | 10 (ci.yml) | 10 | invariato |
| CI tempo medio | ~2m | ~1m30s | **-25%** (stima) |
| Tracker noise | alto | basso | ✅ |

## 6. Note architetturali

Il repository ha subito un re-structuring docs massivo nel 2026-04-14 (commit precedenti alla sessione attuale). Molti workflow sono rotti per **path stale** che puntano a file spostati. Il pattern comune:

- Workflow runs su `docs/**` path
- Script Python/Node legge `docs/X/foo.md` che e' stato spostato a `docs/Y/foo.md`
- FileNotFoundError → exit 1 → workflow failure

**Soluzione sistemica**: un governance check (esiste gia' come `docs-governance.yml`) potrebbe aggregare **anche** la validazione dei path citati da script di automazione. Fuori scope di questo triage ma candidabile come follow-up.

## 7. Riferimenti

- [`ADR-2026-04-16-session-engine-round-migration.md`](../../docs/adr/ADR-2026-04-16-session-engine-round-migration.md)
- [`docs/governance/docs_registry.json`](../../docs/governance/docs_registry.json)
- Recent run logs: https://github.com/MasterDD-L34D/Game/actions
- Issue list: https://github.com/MasterDD-L34D/Game/issues
