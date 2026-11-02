---
title: Drift Audit 2026-11-02
date: 2026-11-02
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-11-02
source_of_truth: false
language: it
---

# Drift Audit 2026-11-02

## TL;DR

| Categoria | Totale |
|-----------|--------|
| P1        | 2      |
| P2        | 6      |
| Auto-fix  | 0 (nessun item triviale entro limit 5-commit) |
| PR        | questo report (audit-only) |

Repo in **ibernazione** dal 2026-07-14: nessun commit su main da 111 giorni. CI verde ma stale. Sprint context obsoleto. 15 drift-audit PR passati mai mergiati/chiusi — pattern da rompere.

---

## Findings P1

| ID | Tipo | Descrizione |
|----|------|-------------|
| F-01 | `SPRINT_STALE` | CLAUDE.md sprint context punta a 2026-07-04 — **121 giorni fa**. Nessun aggiornamento da allora. |
| F-02 | `PR_ROT_ACCUMULATION` | 15 draft PR di drift-audit (#3308–#3322) aperti e mai chiusi/mergiati (2026-07-20 → 2026-10-26). Ogni run crea un nuovo PR senza chiudere il precedente. Processo rotto. |

---

## Findings P2

### STALE_ADR (2 voci)

| File | Status | Età (giorni) |
|------|--------|-------------|
| `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` | PROPOSED | ~115 |
| `docs/adr/ADR-2026-07-14-worldgen-data-model.md` | PROPOSED | ~111 |

Entrambi hanno avuto l'ultimo commit il 2026-07-14. Nessuna decisione master-dd da allora. → Richiedono decisione esplicita (accept / supersede / withdraw).

### PR_ROT (#3306)

| PR | Titolo | Ultimo aggiornamento |
|----|--------|---------------------|
| #3306 | fix(species): recover rovine_planari | 2026-07-14 (111 giorni fa) |

PR substantivo (non audit), aperto da 111 giorni senza merge o close.

### HANDOFF_STALE (89 file)

Tutti i 89 file `docs/planning/*handoff*.md` sono >`45 giorni` (ultimo commit su main 2026-07-14, min 111 giorni). Esempio prime 10:

| File | Età stimata |
|------|-------------|
| `docs/planning/2026-06-09-reconstruction-residuals-closure-handoff.md` | ~146g |
| `docs/planning/2026-06-10-mega-session-closure-handoff.md` | ~145g |
| `docs/planning/2026-06-14-issue-2746-coop-ws-closure-handoff.md` | ~141g |
| `docs/planning/2026-06-16-session-handoff.md` | ~139g |
| `docs/planning/2026-06-17-session-handoff.md` | ~138g |
| `docs/planning/2026-06-17-session-handoff-continuation.md` | ~138g |
| `docs/planning/2026-06-18-session-handoff.md` | ~137g |
| `docs/planning/2026-06-20-session-handoff.md` | ~135g |
| `docs/planning/2026-06-22-session-handoff.md` | ~133g |
| `docs/planning/2026-06-29-session-handoff.md` | ~126g |

**Perché non auto-fix**: 89 file × (git mv + registry update) supera il limit 5-commit. Archiviazione = workstream dedicato.

### CI_STALE (info)

Ultimo CI run su main: **2026-07-14** (111 giorni fa). Conclusione: `success`. Non è `CI_RED` ma il repo è in stasi.

### BRANCH_STALE (top 10, >30 giorni, nessun PR aperto)

Tutti i branch sotto risalgono al ciclo giugno-luglio 2026 (>30 giorni senza commit attivi, nessun PR aperto corrispondente):

| Branch | Prefisso |
|--------|---------|
| `aa01/cap-02-tracking-commit` | aa01/ |
| `aa01/cap-07-terrain-reactions-wire` | aa01/ |
| `autoresearch/coop-broadcast-debrief-payload` | autoresearch/ |
| `autoresearch/coop-broadcast-debrief-payload-v2` | autoresearch/ |
| `biome/badlands-ptpf-it` | biome/ |
| `canon/orphan-biomes-map` | canon/ |
| `canon-5biomi` | canon/ |
| `claude/aa01-d7-tendency-prose` | claude/ |
| `claude/aisim-aggressive-rebaseline` | claude/ |
| `claude/catalog-biome-wire` | claude/ |

Totale branch stale stimato: >50 (aa01: 13, autoresearch: 2, biome: 1, canon: 2, claude: 30+, chore stale: 10+).

---

## Auto-fix changelog

Nessun auto-fix eseguito in questo run.

- **Handoff archive (89 file)**: fuori scope per il limit 5-commit; richiedono anche aggiornamento `docs_registry.json`.
- **last_verified bump**: governance check `errors=0 warnings=660`; nessun errore bloccante. Bump batch = workstream separato.
- **ADR status, BACKLOG delete, PR close, branch delete**: fuori dal perimetro auto-fix per policy.

---

## Suggested next actions

| Priorità | Azione | Owner |
|----------|--------|-------|
| P1 | Chiudi/mergia i 15 drift-audit PR (#3308–#3322) o aggiorna il cron per farlo automaticamente | master-dd |
| P1 | Aggiorna CLAUDE.md sprint context con lo stato attuale del repo | master-dd |
| P2 | Decidi su ADR-2026-07-10 e ADR-2026-07-14 (accept / supersede / withdraw) | master-dd |
| P2 | Revisiona o chiudi PR #3306 (111 giorni aperto) | master-dd |
| P2 | Archivia batch handoff docs >45g: `git mv docs/planning/*handoff* docs/archive/historical-snapshots/` + update registry | automation |
| P2 | Branch cleanup: elimina o mergia i 50+ branch stale (aa01/*, autoresearch/*, claude/*, canon/*, biome/*) | master-dd |
| info | Governance warnings 660 → batch bump `last_verified` su doc >90g | automation |
