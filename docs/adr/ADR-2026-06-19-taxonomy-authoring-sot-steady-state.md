---
title: 'ADR-2026-06-19 -- taxonomy authoring SoT steady-state (RFC #4 S3 NO-GO)'
date: 2026-06-19
type: adr
workstream: dataset-pack
owner: master-dd
status: accepted
proposed_by: claude-code (RFC#4 S3 falsification workflow, sessione hub)
accepted_by: master-dd (verdict 2026-06-19 -- NO_GO_STEADY_STATE, AskUserQuestion)
verdict_date: 2026-06-19
related_files:
  - data/core/species/species_catalog.json
  - packs/evo_tactics_pack/data/ecosystems/*.biome.yaml
  - scripts/update_evo_pack_catalog.js
related_adr:
  - docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md
related_rfc:
  - 'Game-Database docs/rfc/2026-06-11-bidirectional-sync.md (RFC #4)'
  - 'Game-Database docs/rfc/2026-06-18-s3-db-as-sot-scoping.md (#228)'
language: it
---

# ADR-2026-06-19 -- Taxonomy authoring SoT steady-state (RFC #4 S3 NO-GO)

## Status

**ACCEPTED** 2026-06-19 -- master-dd verdict **NO_GO_STEADY_STATE** (confidence high).

Chiude **RFC #4 S3** (DB-as-SoT authoring) come NO-GO allo scope proposto. Ratifica
l'architettura attuale come equilibrio di lungo termine, NON un compromesso S2 temporaneo.
Porta lasciata aperta a un'opzione GO_NARROW futura dietro trigger espliciti (sotto).

## Contesto

RFC #4 (ratificato 2026-06-11, ladder S0->S3) puntava a rendere il Game-Database il
source-of-truth per l'authoring della taxonomy. S2 si e' chiuso su tutti e 4 gli entity
(traits export-shipped, species fidelity-shadow, biome/eco import-only). L'unica ambizione
residua era S3 ("export-only: import retired, DB single SoT, Game pack catalog = build
artifact"). Il brief di scoping #228 (read-only recon) ha framato la decisione come co-design
Game-led e ha raccomandato di NON migrare (ipotesi single-recon, SDMG-flagged).

Questa sessione ha eseguito una **falsificazione esterna** (workflow fan-out: 3 verify
ground-truth, steelman PRO vs red-team NO-GO, synthesis) per non trattare una reco
single-recon come decisione. Sweep committed e uncommitted (branch/stash/worktree/PR
all-state) confermato: nessuna implementazione RFC#4-S3 in-flight; l'infra DB-authoring
gia' shippata (dashboard, version-mgmt, audit, provenance/snapshot) e' ladder S1/S2
(DB-as-shadow), non il flip-a-SoT.

## Decisione

Mantenere lo steady-state: **file-first authoring** (`species_catalog.json`, `*.biome.yaml`,
`*.ecosystem.yaml`), **DB downstream-shadow** (species fidelity-shadow, biome/eco
import-only), e **DB-trait-export** (l'unico entity che gia' shippa dal DB). Nessun lavoro
di schema-expansion, exporter o YAML-emitter ora.

## Razionale (fatti verificati, non il brief)

- **F1 schema gap (confermato, rinforzato)**: il DB e' una proiezione thin gameplay-typed
  -- 32 col scalari species / 16 biome / 9 ecosystem -- di sorgenti ben piu' ricche (59 / 122
  / 35 leaf-path). Biome ed Ecosystem non hanno nemmeno un `sourceExtras` catch-all: il DB
  oggi non puo' contenere ecology/morfologia/composizione_aria/trofico/gruppi_funzionali/
  servizi_ecosistemici/pressioni/provenance.
- **F2 blast radius (confermato)**: ~12-14 load-point backend-JS runtime e ~10-18 tool Python,
  ognuno con path-resolution e cache proprie, species con fallback chain primary/legacy, nessun
  endpoint unificato. Nota: i `*.biome.yaml` non hanno NESSUN reader runtime (ricchezza biome
  fuori dall'hot-path).
- **F3 macchina mancante (confermato)**: zero biome/eco exporter, zero YAML emitter (0 hit
  first-party per `yaml.dump`/`stringify`). `sync:evo-pack` e' il generatore file-first che una
  migrazione dovrebbe invertire. Superset 75 species, 22 active-roster (il "21" del brief =
  off-by-one).
- **SDMG e YAGNI (decisivi)**: "DB-as-SoT" e' premessa self-designed (ipotesi alto-errore). Il
  pain piu' forte del caso PRO (saga 5-ghost dangling-FK) e' GIA' risolto file-side (#2850
  honest-stub, Phase B cross-ref CI) -> retrospettivo, non blocker vivo. Per un solo-dev
  file-first AI-driven, senza 2o editor umano ne' content-tool live, la migrazione risolve
  SoT-purity (ideale architetturale), non un problema reale.

## Opzione preservata -- GO_NARROW (il dissent)

Il caso PRO ha esposto l'unico punto debole del brief: lo scope ucciso era il MASSIMALISTA
(DB possiede tutti i 60/122/35 campi). Un **GO_NARROW** -- DB autore solo del subset
gameplay-typed che gia' modella, **generando FORWARD** nel file-snapshot che i consumer gia'
leggono (`catalog_data.json`, per-file species), senza export-back, senza YAML-emitter per
i campi biome ricchi (restano nei file) -- non ha SoT-inversion (un solo generatore DB->file)
e riusa l'infra DB-authoring GIA' shippata (dashboard React/CRUD, AuditLog, Version-snapshot,
versioned reads). Resta valido come mossa futura, NON come lavoro da iniziare ora: anche il
path narrow paga prima il costo (generatore DB->file inesistente, hosting Postgres,
inversione sync:evo-pack) di ogni beneficio -- il primo incremento e' la rampa.

## Trigger di riattivazione (falsificabili)

Rivisitare GO_NARROW solo se si materializza uno di:

1. Entra un **secondo editor umano** sulla taxonomy.
2. Serve un **content-tool live-service** (authoring a runtime).
3. Lo scaffolding integrity file-side (Phase A/B/D CI, honest-stub baseline) inizia a costare
   piu' manutenzione di un pilot DB 1-entita'.

## Conseguenze

- Nessun lavoro di schema/exporter/YAML-emitter; consumer invariati; Postgres resta opzionale
  (lo `speciesBiomes` router degrada a 501 senza prisma -- accettabile da shadow, fatale da SoT).
- RFC #4 S3 va stampato CLOSED (NO-GO-at-scope) sull'RFC#4 in Game-Database, con pointer a
  questo ADR (PR appaiato).
- L'equilibrio fa match value-vs-costo per entity (traits HIGH, species MEDIUM, biome/eco LOW).

## Riferimenti

- RFC #4: `Game-Database docs/rfc/2026-06-11-bidirectional-sync.md`; brief S3
  `2026-06-18-s3-db-as-sot-scoping.md` (#228).
- ADR-2026-05-15 (species catalog schema fork; `species_catalog.json` v0.4.x = authored SoT).
- Falsification workflow run `wf_e8d9bf91-f80` (3 verify, 2 adversarial, synthesis).
- codemasterdd memory: `project_rfc4_species_s2`, `project_taxonomy_reconciliation`.
