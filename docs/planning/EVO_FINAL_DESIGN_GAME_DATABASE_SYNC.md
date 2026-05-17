---
title: Evo Final Design — Game Database Sync Plan
doc_status: draft
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-15
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Evo Final Design — Game Database Sync Plan

## 1. Scopo

Questo piano va letto insieme a [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) (regole di risoluzione conflitti) e al [`90-FINAL-DESIGN-FREEZE`](../core/90-FINAL-DESIGN-FREEZE.md) (perimetro di prodotto).

Questo documento traduce l’[ADR-2026-04-14 Game-Database topology](../adr/ADR-2026-04-14-game-database-topology.md) in un piano operativo semplice e robusto per il final design.

Serve a evitare due errori:

1. trattare Game-Database come runtime source of truth durante il freeze;
2. lasciare il sync documentale/import in stato ambiguo.

## 2. Principio guida

| Stato | Task                                   | Dettagli operativi                                                                           |
| ----- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| ☑    | `Game` resta runtime source of truth   | Backend gameplay, generation pipeline, rules engine e cataloghi runtime leggono file locali. |
| ☑    | `Game-Database` resta CMS taxonomy     | Editing, consultazione, REST API e import target.                                            |
| ☑    | Integrazione supportata oggi           | Build-time / manual import Game → Game-Database.                                             |
| ☑    | Integrazione non supportata nel freeze | Game <- HTTP runtime come requisito di gameplay.                                             |

## 3. Dati condivisi e dati esclusivi

### Dati ragionevolmente condivisibili oggi

- trait glossary
- trait reference
- env traits
- catalog data
- species catalog
- ecosystems / biome yaml importabili

### Dati da lasciare runtime-local su Game

- biome pools ricchi
- ecology / hazard / role_templates
- trait catalog ricco con synergies/conflicts/environments/energy_profile/usage_tags
- qualsiasi shape non coperta in modo completo dal Prisma schema del Game-Database

## 4. Flusso operativo consigliato oggi

| Stato | Task                                     | Dettagli operativi                                   |
| ----- | ---------------------------------------- | ---------------------------------------------------- |
| ☑    | Step 1 — aggiornare Game                 | Chiudere dati e documenti nel repo `Game`.           |
| ☑    | Step 2 — rigenerare cataloghi            | Eseguire `npm run sync:evo-pack` lato Game.          |
| ☑    | Step 3 — lanciare import                 | Lato Game-Database eseguire `npm run evo:import`.    |
| ☑    | Step 4 — usare dry-run quando opportuno  | `--dry-run` e `--verbose` per verifiche controllate. |
| ☑    | Step 5 — loggare esiti sul lato corretto | I log import vanno sul Game-Database, non sul Game.  |

## 5. Runbook minimo di sync

### Lato Game

```bash
cd /path/to/Game
npm run sync:evo-pack
```

### Lato Game-Database

```bash
cd /path/to/Game-Database
npm run evo:import --dry-run
npm run evo:import
```

### Varianti utili

```bash
npm run evo:import --verbose
npm run evo:import --repo /path/assoluto/al/repo/Game
```

## 6. Quando sincronizzare

| Stato | Task                                 | Dettagli operativi                                                        |
| ----- | ------------------------------------ | ------------------------------------------------------------------------- |
| ☑    | Dopo chiusura di una slice dati      | Species, trait, biome, glossary o catalog data stabilizzati.              |
| ☑    | Prima di una review cross-repo       | Quando Master DD o maintainer DB devono verificare allineamento taxonomy. |
| ☑    | Prima di una milestone release-ready | Per evitare drift negli strumenti di consultazione.                       |
| ☐     | Non a ogni micro-patch               | Evitare rumore e import inutili durante tuning ancora instabile.          |

## 7. Pattern di automazione

### Pattern attuale

Manuale e intenzionale.

### Pattern raccomandato come primo upgrade

**Pattern B — Cron job lato Game-Database**

Motivi:

- zero secret cross-repo;
- vive interamente sul lato DB;
- apribile e spegnibile facilmente;
- coerente con un maintainer Codex-oriented;
- non impatta il runtime di Game.

### Pattern da tenere in backlog, non ora

- Pattern A repository_dispatch cross-repo
- Pattern C hook locale di pre-push
- integrazione HTTP runtime vera

## 8. Trigger per riaprire le alternative avanzate

### Riaprire alternativa B (HTTP glossary only) se avviene almeno uno

| Stato | Task                 | Dettagli operativi                                                     |
| ----- | -------------------- | ---------------------------------------------------------------------- |
| ☐     | Hot reload richiesto | Un editor vuole vedere label aggiornate nel Game senza rebuild.        |
| ☐     | LiveOps reale        | Necessità concreta di aggiornare glossario durante runtime.            |
| ☐     | Performance driver   | Cold-read del catalog troppo lento rispetto a un fetch HTTP cache-ato. |
| ☐     | Domanda ricorrente   | Almeno 3 richieste distinte di sync runtime in 4 settimane.            |

### Riaprire alternativa C (full integration) solo se valgono entrambi

| Stato | Task                        | Dettagli operativi                                                                     |
| ----- | --------------------------- | -------------------------------------------------------------------------------------- |
| ☐     | Use case forte              | Game-Database deve diventare davvero source of truth per dati ricchi, non solo labels. |
| ☐     | Budget cross-repo approvato | Master DD + maintainer DB allineati su effort, release e rollback coordinato.          |

## 9. Task backlog specifici DB sync

| Stato | Task                                   | Dettagli operativi                                                          |
| ----- | -------------------------------------- | --------------------------------------------------------------------------- |
| ☐     | DB-001 - Formalizzare import contract  | Tabella file → dominio → destinazione → owner → frequenza.                  |
| ☐     | DB-002 - Scrivere runbook import       | Passi, dry-run, verbose, repo override, log, fallback.                      |
| ☐     | DB-003 - Definire cadence              | Manuale durante freeze; valutare cron dopo stabilizzazione.                 |
| ☐     | DB-004 - Preparare log policy          | Dove salvare contatori totals/normalized/complete/partial/discarded/errors. |
| ☐     | DB-005 - Documentare non-scope runtime | Richiamare esplicitamente il divieto di dipendenza runtime.                 |
| ☐     | DB-006 - Valutare Pattern B            | Solo dopo G3/G4 o a freeze dati quasi chiuso.                               |

## 10. Criteri di successo del sync plan

| Stato | Task                                              | Dettagli operativi                                                |
| ----- | ------------------------------------------------- | ----------------------------------------------------------------- |
| ☐     | Nessun contributor confonde i ruoli dei repo      | Confine Game vs Game-Database leggibile nei documenti.            |
| ☐     | Import ripetibile                                 | Dry-run e run reale prevedibili, idempotenti e loggabili.         |
| ☐     | Nessuna patch di design dipende dal DB runtime    | Il final design resta attuabile anche senza Game-Database attivo. |
| ☐     | Automazione scelta solo quando porta valore reale | Niente complessità gratuita durante il freeze.                    |

## 11. Nota finale

Durante il final design il Game-Database è un acceleratore editoriale e di consultazione.
Non è il motore del gioco.

Questo principio va protetto fino alla chiusura del freeze.

## 12. Regola di autorita cross-repo

Il Game-Database non va usato per "chiudere" conflitti ancora aperti nel design finale.
Nel freeze corrente:

- `Game` resta la fonte runtime e dati di produzione del gioco;
- `Game-Database` resta CMS/taxonomy e target di import build-time;
- eventuali mismatch di design vanno risolti in [freeze](../core/90-FINAL-DESIGN-FREEZE.md), hub, [ADR](../adr/ADR-2026-04-14-game-database-topology.md) o dati del repo `Game`, non nel DB.

## 13. Documenti correlati

- [`90-FINAL-DESIGN-FREEZE`](../core/90-FINAL-DESIGN-FREEZE.md) — perimetro di prodotto, vincolo architetturale non negoziabile (§5).
- [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) — gerarchia delle fonti; la domanda "Il runtime puo dipendere da Game-Database?" ha risposta canonica qui.
- [`ADR-2026-04-14-game-database-topology`](../adr/ADR-2026-04-14-game-database-topology.md) — ADR che questo piano implementa operativamente.
- [`EVO_FINAL_DESIGN_MASTER_ROADMAP`](EVO_FINAL_DESIGN_MASTER_ROADMAP.md) — `M5 Meta Slice & Cross-Repo` e cross-repo readiness.
- [`EVO_FINAL_DESIGN_BACKLOG_REGISTER`](EVO_FINAL_DESIGN_BACKLOG_REGISTER.md) — `EPIC K — Game <-> Game-Database` con task `FD-100..106`.
