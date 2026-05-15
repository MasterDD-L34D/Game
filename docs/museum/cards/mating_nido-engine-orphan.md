---
title: Mating Engine D1+D2 Orphan — runtime live ma zero gameplay loop
museum_id: M-2026-04-25-007
type: architecture
domain: mating_nido
provenance:
  found_at: apps/backend/services/metaProgression.js + apps/backend/routes/meta.js
  git_sha_first: ea945a56
  git_sha_last: 3272f844
  last_modified: 2026-04-23
  last_author: MasterDD-L34D
  buried_reason: abandoned
relevance_score: 5
reuse_path: apps/play/* (frontend wire) OR demolish via 410 deprecate
related_pillars: [P2, P3]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# Mating Engine D1+D2 Orphan (469 LOC + 7 endpoint, mai chiamato)

## Summary (30s)

- **OD-001 disinformata** (V3 "deferred no runtime"): engine LIVE da 4 mesi (PR #1435 Design Freeze v0.9 → PR #1679 Prisma adapter). 469 LOC in `metaProgression.js` + 7 endpoint REST in `meta.js` + Prisma schema migrato.
- **Zero frontend integration**: `grep -rn "/api/meta" apps/play/` = 0 hit. Engine = dead path completo.
- **Decisione product P0 needed**: V3 mating sprint **activate** (~12-15h frontend wire) OR **demolish** (~2h, 410 deprecate routes + mark service unused). Status quo = orfano permanente confonde futuri agent.

## What was buried

### Engine `metaProgression.js` (469 LOC)

```js
// Funzioni principali (verificate via grep export):
- canMate(unitA, unitB)      // gate check (cooldown + species + traits)
- rollMating(unitA, unitB, rng)   // d20 vs CD, 4-step flow
- computeMatingRoll(...)     // base + MBTI + Ennea + biome modifiers
- setNest(nestId, config)    // setup nest module
- tickCooldowns(state)       // round-tick post-resolveRound
- recruitFromDefeat(unitId, party)   // recruit ex-nemico nel debrief
```

In-memory state + Prisma adapter `Prisma.UnitProgression` (PR #1679).

### Routes `apps/backend/routes/meta.js` (119 LOC, 7 endpoint REST)

- `POST /api/meta/npg` — submit non-player-character interaction
- `POST /api/meta/affinity` — query affinity matrix
- `POST /api/meta/trust` — adjust trust delta
- `POST /api/meta/recruit` — recruit ex-nemico
- `POST /api/meta/mating` — execute mating roll
- `POST /api/meta/nest` — query nest state
- `POST /api/meta/nest/setup` — initialize nest module

Auth: JWT honored quando configurato. CORS-enabled.

### Prisma adapter

`Prisma.UnitProgression` model + migration `0004_unit_progression.sql` ship 2026-04-23 PR #1679.

## Why it was buried

- **PR #1435 Design Freeze v0.9** introdusse engine come parte di "12 tasks across 5 blocchi" — focus PR era completion freeze, NON gameplay integration
- **PR #1679 Prisma adapter** estese persistence ma routes/services rimase invisibile al frontend
- **OD-001** scritta DOPO entrambi i PR senza verificare runtime (audit-driven, NON code-driven) → claim "deferred no runtime" basato su `apps/play/` survey, non su `apps/backend/` survey
- **Bus factor 1**: solo MasterDD-L34D ha contesto. Codice non è morto ma è invisibile.

## Why it might still matter

- **Pillar P2 Evoluzione 🟢c** + **P3 Specie×Job 🟢c+**: mating + recruit + nest sono LE meccaniche emergent core di "evoluzione Spore-core". Senza wire, P2 resta caudal pillar (form evolution + thought cabinet sufficienti per MVP, ma mating è next-vertical).
- **Skiv Sprint A/B**: NIENTE direct fit (Skiv vagans è loner, mating-blocked). MA recruit ex-nemico debrief flow potrebbe fit "Skiv segue il vincente" narrative.
- **Sunk cost recovery**: 469 + 119 LOC + Prisma migration = ~50-80h shippato già. Demolish = perdita pura. Activate = ROI elevato se UI design confermata utile.
- **OD-001 integrity**: senza correzione, ogni futuro agent leggendo OD-001 farà assunzioni sbagliate su V3 scope. Card serve come correzione record.

## Concrete reuse paths

1. **Activate — Path A (~12-15h, P0 product decision)**

   Sprint mini-M14? con focus debrief panel + nest hub UI:
   - `apps/play/src/debriefPanel.js` extension: post-encounter "recruit ex-nemico" action card (chiama `POST /api/meta/recruit`)
   - `apps/play/src/nestHub.js` (NUOVO) — overlay modale per `setNest` + nest module visualization (mating roll history, gene_slots viewer)
   - Wire `data/core/mating.yaml` (477 LOC canonical) come dataset pool
   - Test: `node --test tests/api/meta.test.js` (regression baseline + nuovi unit test)
   - Output: V3 🟢, P2/P3 🟢 reali (non candidato)

2. **Demolish — Path B (~2h, P0 product decision)**

   Quarantine engine se decision è "V3 truly post-MVP":
   - `apps/backend/routes/meta.js` → ogni endpoint risponde 410 Gone con body `{deprecated: true, see: "OD-001 path B"}`
   - `apps/backend/services/metaProgression.js` → header comment `// QUARANTINED 2026-XX-XX, see ADR-2026-XX-mating-quarantine.md`
   - ADR `docs/adr/ADR-2026-XX-mating-engine-quarantine.md` documenta decisione
   - Update OD-001 → "engine present but quarantined, V3 truly post-MVP"
   - Output: drift docs vs runtime risolto, sunk cost accettato

3. **Hybrid — Path C (~5h)**

   Document API + sandbox endpoint per future-self exploration:
   - Sleep mode: routes attive ma `feature_flag_v3_mating_enabled = false` env var
   - `npm run sandbox:mating-engine` script standalone test
   - Doc generated `apps/backend/routes/meta.openapi.json` per future UI design
   - Output: engine pronto a riattivare senza re-scoping completo

## Sources / provenance trail

- Found at: [apps/backend/services/metaProgression.js:1](../../../apps/backend/services/metaProgression.js) + [apps/backend/routes/meta.js:1](../../../apps/backend/routes/meta.js)
- Git history:
  - `ea945a56` (PR #1435 Design Freeze v0.9, 12 tasks 5 blocchi) — intro
  - `3272f844` (PR #1679 Prisma adapter, 2026-04-23) — last semantic touch
- Bus factor: 1 (MasterDD-L34D)
- Related disinformation source: [OPEN_DECISIONS.md OD-001](../../../OPEN_DECISIONS.md) — "V3 deferred no runtime" (FALSE claim)
- Related canonical doc: [docs/core/Mating-Reclutamento-Nido.md](../../core/Mating-Reclutamento-Nido.md) (canonical V3 design, mai checked vs runtime)
- Related dataset: [data/core/mating.yaml](../../../data/core/mating.yaml) (477 LOC canonical, partial integration `compat_ennea` 3/9)
- Related Prisma: `apps/backend/prisma/migrations/0004_unit_progression.sql`
- Inventory: [docs/museum/excavations/2026-04-25-mating_nido-inventory.md](../excavations/2026-04-25-mating_nido-inventory.md)

## Risks / open questions

- ❓ **User decision GRANDE**: Path A (activate) vs Path B (demolish) vs Path C (sandbox). Non auto-decidere.
- ⚠️ Schema drift parallelo: `data/core/mating.yaml compat_ennea` (3 archetipi) vs `data/core/telemetry.yaml ennea_themes` (6) vs `incoming/Ennagramma/` dataset (9). Path A richiede risoluzione schema unify pre-wire (link OD-009 hybrid).
- ⚠️ Pack drift `packs/evo_tactics_pack/data/mating.yaml` (393 LOC) manca 84 righe `gene_slots` vs canonical (477 LOC). Sync break silenzioso (Card M-mating-pack-drift candidate future).
- ⚠️ `compat_ennea` partial canonical (4 righe stub) → mai popolata 9×9 tabella mating-roll modifier per Ennea archetypes. Path A richiede questo lavoro pre-wire.
- ✅ Engine code clean: `node --check apps/backend/services/metaProgression.js` + `meta.js`. Tests passing su CI.

## Next actions

- **OPEN_DECISIONS.md OD-001 CORRECTION** (P0): mark current text as "based on incomplete audit", add note "engine LIVE per code review 2026-04-25, decisione product Path A/B/C pending"
- **Skiv link weak**: questo card NON sblocca Skiv direct. Path A potrebbe abilitare "recruit ex-nemico nel debrief" come Skiv narrative beat (vagans seguendo vincente)
- **Cross-card link**: M-2026-04-25-008 (Nido Itinerante D-CANVAS) ha details mai migrati che Path A potrebbe usare come content

## 2026-04-25 update — mutation_catalog scope clarification

- `mutation_catalog.yaml` (30 entries shipped 2026-04-25 sprint) **NOT wired to V3 mating** per design semantics. È un framework M14 unit-self post-encounter mutation, separato dal mating offspring genetics.
- Path A faithful M14 implementation: `apps/backend/services/mutations/mutationCatalogLoader.js` + `apps/backend/routes/mutations.js` + plugin wire. 4 REST endpoint live (`/registry`, `/:id`, `/eligible`, `/apply`). PE/PI charging deferred a M13.P3 progression integration.
- Effetto su questo card: il pool D2 mutation_catalog NON è un orfano dello stesso modo che lo è il mating engine — è un framework distinct, additive-only, con runtime entrypoint pulito. Card M-007 resta valido per `metaProgression.js` + `meta.js` (V3 mating engine), ma `mutation_catalog.yaml` esce dallo scope orphan.

## 2026-05-13 update — FULL CLOSURE OD-001 Path A 2026-04-27 (additive)

**Card status**: 🟢 **SUPERSEDED — engine NOW FULL WIRED end-to-end**.

OD-001 Path A "Activate" verdict 2026-04-27 ha shipped frontend wire end-to-end:
- Sprint A nestHub panel + biome_arc unlock — [PR #1876](https://github.com/MasterDD-L34D/Game/pull/1876)
- Sprint C backend mating roll + 3-tier offspring — [PR #1879](https://github.com/MasterDD-L34D/Game/pull/1879)
- Lineage tab UI nestHub — [PR #1911](https://github.com/MasterDD-L34D/Game/pull/1911)
- PR #1877 closed-superseded (51K LOC stale frontend conflict)

**Ground truth verificata 2026-05-13** via grep diretto:
- `apps/backend/services/metaProgression.js` cresciuto 469 → **1053 LOC** (+584 LOC post-2026-04-25)
- `apps/backend/routes/meta.js` cresciuto 119 → **328 LOC** (7 endpoint + sub-route)
- `apps/play/src/api.js:352-390` — 7 fetch helpers wired con comment "OD-001 Path A V3 Mating/Nido — 7 endpoint /api/meta/* (2026-04-26)"
- `apps/play/src/nestHub.js` — squad UI + lista NPC recruited + lineage tab
- `apps/play/src/debriefPanel.js:680` — fetch `/api/meta/compat` graceful fallback
- `apps/play/src/offspringRitualPanel.js` — 6-canonical mutation choice post-mating
- Test coverage: `tests/services/metaProgression.{mating,lineage}.test.js` ~600 LOC

**Pillar impact**:
- P2 Evoluzione emergente 🟡 → 🟢 candidato (mating engine + offspring + recruit fully consumed)
- P3 Identità Specie × Job 🟡 → 🟢 candidato (debrief recruit + lineage tab visibili)

**Anti-pattern killer**: card era canonical case "Engine LIVE Surface DEAD" score 5/5. Ha chiuso pattern via Path A activate. Reference per future agent inventory tasks.

**Card lifecycle**: `excavated → curated → reviewed → revived` (nuovo stato 2026-05-13). Card additive-only protocol mantenuto — testo originale preserved sopra.

**Provenance update**: cross-validation source = ecosystem audit PR #2260 (Layer 6 Mating section verifica) + comment-4444944824 thread.

**Last verified**: 2026-05-13 sera (post audit + cross-validation cascade).
