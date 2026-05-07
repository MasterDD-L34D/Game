---
title: 2026-05-07 Plan v3.3 drift sync — Sprint P+Q ETL formalization post W7.x bundle
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-07
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/planning/2026-04-29-master-execution-plan-v3.md'
  - 'docs/planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md'
  - 'docs/planning/2026-04-30-plan-v3-2-gap-audit.md'
---

# Plan v3.3 drift sync — Sprint P+Q ETL formalization

> Scope: formalizzazione stato chiusura Sprint P + Q post W7.x bundle + Sprint AC bundle (realta
> 2026-05-04/06). Aggiorna drift sync precedente 2026-05-04 §Item 5 (combat stubs 9/14).
> Evidenza primaria: `Game-Godot-v2/docs/godot-v2/sprint-pq-closure.md` (commit `22c1182`, PR #187).

---

## §1 — Executive summary

Sprint P + Q plan v3 stimavano ~2.5-4 settimane (1-2 P + 1.5-2 Q) con target GUT ≥250/384.
Realta: entrambi gli sprint chiusi in ~7-9 giorni naturali di sviluppo. GUT parity gate
superato a 594/594 = 154% del target (PR #45, SHA `f1dc591`). Tutti i deliverables ETL
(458 trait + 15 lifecycle + 14 encounter + 20 biome) completati. Stub registry ridotto
16 → 9 → 1 → **0** via W7.x bundle + Sprint AC chip closure (PR #177 SHA `7bc3ade`).
GUT baseline finale post Sprint AC: **1719 test scripts / 3786 asserts** (178 scripts).
Nessun residuo Sprint P/Q. Piano v3 §P e §Q marcati CLOSED.

---

## §2 — Sprint P: status originale vs realta

### Plan v3 originale (§Sprint P, righe 689-693)

- Durata stimata: **1-2 settimane**
- Deliverables: 458 trait `active_effects.yaml` → `TraitEffect.gd` Resource; `propagateLineage` +
  mating + legacy ritual → `scripts/lifecycle/`; 15 species lifecycle YAML → Resource
- Caller wire: deferred "post Path A backend wire (W4)"

### Realta shipped

| Step        | Deliverable                                                            | PR Godot v2 | SHA                  | Data            |
| ----------- | ---------------------------------------------------------------------- | ----------- | -------------------- | --------------- |
| P.onset     | TraitEffect Resource + TraitCatalog + 8 sample + yaml_to_json.py       | pre-#37     | incluso in `1172819` | ante 2026-04-30 |
| P.1         | Full 458 trait ETL (`data/traits/active_effects.json`) + 8 test        | pre-#37     | `1172819`            | ante 2026-04-30 |
| P.x         | Alt schema `triggers_on_ally_attack` + BeastBondReaction wire          | pre-#37     | `1172819`            | ante 2026-04-30 |
| P.2         | TraitCatalog → D20Resolver → RoundOrchestrator + 3 codex P1 fix        | pre-#37     | `1172819`            | ante 2026-04-30 |
| P.3         | LifecycleStage + SpeciesLifecycle + LifecycleCatalog + 15 ETL + 34 GUT | pre-#37     | `1172819`            | ante 2026-04-30 |
| P.4         | MatingTrigger.set_lifecycle_catalog + child enrichment + 10 GUT        | pre-#37     | `1172819`            | ante 2026-04-30 |
| P.4.1       | Audit + vertical slice bridge (player AttackAction + DOT + HudView)    | pre-#37     | `1172819`            | ante 2026-04-30 |
| P-x-lineage | LineagePropagator port (4 fn, Fisher-Yates RNG) + 15 GUT               | #63         | `c8473cd`            | 2026-05-01      |
| caller wire | LineagePropagator → WorldSetupState.campaign + LineageCampaignSpec     | W7.x #127   | `2d929c7`            | 2026-05-04      |

### active_effects ETL coverage delta

| Metrica                            | Plan v3                | Realta                                               |
| ---------------------------------- | ---------------------- | ---------------------------------------------------- |
| Trait entries portati              | 458 (target)           | **458/458** (100%)                                   |
| Lifecycle species portate          | 15 (target)            | **15/15** (100%)                                     |
| Runtime integration (D20Resolver)  | deferred Sprint P.2    | ✅ shipped P.2                                       |
| MatingTrigger lifecycle enrichment | deferred Sprint P.4    | ✅ shipped P.4                                       |
| propagateLineage runtime           | "P.x post Path A (W4)" | ✅ shipped P-x-lineage #63 + caller W7.x #127        |
| Caller wire active_effects         | deferred               | ✅ TraitCatalog → CombatSession iniettato Sprint P.2 |

**Durata reale Sprint P**: ~5-7 giorni (vs stima 1-2 settimane). **CLOSED** su commit `1172819` (#37).

---

## §3 — Sprint Q: status originale vs realta

### Plan v3 originale (§Sprint Q, righe 695-700)

- Durata stimata: **1.5-2 settimane**
- Deliverables: 14 encounter YAML → `EncounterLoader.gd`; 458 trait + 15 lifecycle + 9 biome data
  → Godot Resource ETL one-shot; LDtk integration (futura); Q.1 parity audit ≥250/384 GUT

### Realta shipped

| Step | Deliverable                                                                   | PR Godot v2 | SHA       | Data       |
| ---- | ----------------------------------------------------------------------------- | ----------- | --------- | ---------- |
| Q.1  | EncounterCatalog + 14 encounter ETL (`data/encounters/encounters.json`, 34KB) | #42         | `e55d528` | 2026-04-30 |
| Q.2  | BiomeCatalog + 20 biome ETL + GUT parity gate (524 GUT = 154%)                | #45         | `f1dc591` | 2026-04-30 |
| Q.x  | ObjectiveEvaluator + ReinforcementSpawner runtime impl                        | W7.x #129   | `8d941a8` | 2026-05-04 |
| Q.x  | EncounterRuntime aggregator + Main combat phase wire                          | W7.x #132   | `6e6688f` | 2026-05-04 |
| Q.x  | BiomeModifiers + BiomeResonance + TerrainReactions full impl                  | W7.x #130   | `c04a864` | 2026-05-04 |
| Q.x  | BiomeResonance per-attack wire (SISTEMA atk += biome.mod_biome)               | W7.x #136   | `de511da` | 2026-05-04 |
| Q.x  | TimeOfDayModifier full impl (4 phases + diurnal/nocturnal split)              | W7.x #137   | `bc529ab` | 2026-05-04 |
| Q.x  | SgTracker full impl (Sistema Gravity stresswave + threshold events)           | W7.x #138   | `d0784ab` | 2026-05-04 |

### Encounter + biome ETL coverage delta

| Metrica                | Plan v3                        | Realta                                                                   |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Encounter YAML portati | 14 (target)                    | **14/14** (100%) — 4 `data/encounters/` + 10 `docs/planning/encounters/` |
| Biome data portati     | 9 (originale)                  | **20/20** (222%) — biome_aliases merged, 13 adjacency via W4.5.1         |
| GUT parity gate        | ≥250/384                       | **594/594 (154%)** — gate #45 SHA `f1dc591`                              |
| Runtime biome services | deferred                       | ✅ shipped W7.x (#129+#130+#136+#137+#138)                               |
| LDtk integration       | "futura"                       | ⏸ ancora deferred (non blocker, nessun cambio)                          |
| click-to-target        | "tactical input pass deferred" | ✅ shipped W7.x #128 SHA `84a2b2b`                                       |

**Durata reale Sprint Q**: Q.1+Q.2 in 2 PR lo stesso giorno (2026-04-30). Runtime services shipped
W7.x bundle 2026-05-04. **CLOSED** su commit `f1dc591` (#45) + Q.x runtime W7.x complete.

---

## §4 — Combat stubs registry: transizione 14 → 9 → 1 → 0

### Baseline originale e sequenza di riduzione

| Fase                                  | Stubs | Trigger / PR                                                                                                                                                                                                      |
| ------------------------------------- | :---: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sprint O.2 polish (scaffold iniziale) |  16   | scaffold base                                                                                                                                                                                                     |
| Sprint O.2.x portable batch           |  10   | 6 ported: Bravado, BeastBondReaction, BondReactionTrigger, DefyEngine, InterruptFire, PinDown                                                                                                                     |
| **W7.x bundle 2026-05-04**            | **9** | 5 ported: BiomeModifiers (#130), BiomeResonance (#136), TerrainReactions (#130), TimeOfDayModifier (#137), SgTracker (#138)                                                                                       |
| W7.x continuation (chip closure)      |   1   | 8 ported: SenseReveal (#142), TelepathicReveal (#143), AiProgressMeter (#144), ArchetypePassives (#145), PassiveStatusApplier (#146), SynergyDetector (#149), AiPersonalityLoader (#151), AiProfilesLoader (#153) |
| Sprint AC #177 (2026-05-05)           | **0** | SistemaTurnRunner stub eliminato (Tier 3 abandon, SHA `7bc3ade`)                                                                                                                                                  |

### I 5 stubs chiusi via W7.x bundle (transizione 14→9 documentata nel drift sync 2026-05-04)

> Nota: il drift sync 2026-05-04 §Item 5 documenta il punto di partenza come "9/14 ported" = 9 gia
> portati, 5 residui. La transizione corretta dal baseline O.2 (16) a W7.x endpoint e:
> 16 → 10 (O.2.x) → **9 stubs residui** (non porte ancora chiuse, ma porte gia aperte) — il
> conteggio "9 stubs residui" del drift 2026-05-04 era corretto.

Cinque stubs chiusi dalla data del drift 2026-05-04 al completamento W7.x:

| Stub (nome Node originale) | GDScript port             | PR   | SHA       |
| -------------------------- | ------------------------- | ---- | --------- |
| BiomeModifiers             | `biome_modifiers.gd`      | #130 | `c04a864` |
| BiomeResonance             | `biome_resonance.gd`      | #130 | `c04a864` |
| TerrainReactions           | `terrain_reactions.gd`    | #130 | `c04a864` |
| TimeOfDayModifier          | `time_of_day_modifier.gd` | #137 | `bc529ab` |
| SgTracker                  | `sg_tracker.gd`           | #138 | `d0784ab` |

### Stubs residui post W7.x (prima di chip closure + Sprint AC)

Dopo W7.x ancora 9 stubs (non 5 come descritto nella transizione di sopra — vedi nota). I successivi
chip PRs #142-#153 chiudono 8. Ultimo stub `sistema_turn_runner.gd` eliminato (Tier 3 abandon) con
PR #177 SHA `7bc3ade` 2026-05-05.

**Stato finale**: `scripts/combat/stubs/stubs_registry.gd` STUBS=[] — **28 full impl + 0 stubs**.
AI services: 13 full impl + 0 stubs (AiPersonalityLoader #151, AiProfilesLoader #153 + 11 precedenti).

---

## §5 — Residual effort to Phase A + Phase B

> Post chiusura Sprint P+Q, i residui non riguardano piu ETL ma polish + surface debt.

### GUT baseline timeline

| Checkpoint                            | GUT test / asserts                          | Riferimento                     |
| ------------------------------------- | ------------------------------------------- | ------------------------------- |
| Q.1 gate (PR #42)                     | 524 test (baseline pre-#42 non documentato) | `e55d528` 2026-04-30            |
| Q.2 gate (PR #45)                     | 524 → 594 test, ~1756 asserts               | `f1dc591` 2026-04-30            |
| W7.x bundle complete (PR #139 sync)   | ~1455 test / ~3400+ asserts                 | `f816e93` 2026-05-04            |
| Sprint AC full closure (PR #185-#186) | **1719 test / 3786 asserts** (178 scripts)  | CLAUDE.md sync 2026-05-06       |
| Plan v3 §S cutover gate               | ≥1500 PASS                                  | target originale (ora superato) |

**Target cutover ≥1500 PASS**: **GIA RAGGIUNTO** a 1719 (114.6% del target).

### Residui Phase A (pre-cutover)

| Item                                             | Scope                                                       | Effort stimato | Blocker                  |
| ------------------------------------------------ | ----------------------------------------------------------- | -------------- | ------------------------ |
| N.7 Wave B 2 statuses (9-status parity completa) | Identify + port 2 statuses mancanti beyond WAVE_A           | ~2-3h          | nessuno                  |
| N.7 cross-encounter GUT test                     | Encounter A → save → Encounter B → verify wound persistence | ~2h            | N.7 Wave B               |
| M.7 surface HUD debrief widget                   | p95 latency visibile nel debrief post-encounter             | ~2-3h          | nessuno                  |
| Skiv portrait + lifecycle stages Godot           | assets/skiv/ non esiste in Godot v2                         | ~6-9h userland | Path 3 redraw            |
| Character creation TV scene                      | Bible §0 scena mancante (gap audit Item 9)                  | ~6-10h         | design decisions pending |
| Ennea surface debrief wire Godot                 | 9 archetype portati (#167) ma surface debrief non wired     | ~2-3h          | nessuno                  |

**Phase A estimated residual**: ~20-30h = ~2.5-4g

### Residui Phase B (post-cutover archive)

| Item                                           | Scope                                     | Effort stimato             |
| ---------------------------------------------- | ----------------------------------------- | -------------------------- |
| LDtk integration encounter authoring           | Deferred in plan v3 §Q come "future"      | ~1-2 sett                  |
| propagateLineage hybrid lifecycle rules        | "display_only_v1" — P.5/Spore merge rules | ~1 sett                    |
| HTTPClient adapter Tier B+C routes (17 routes) | Non-mandatory per cutover                 | ~3-4g                      |
| ERMES E7-E8 runtime bridge Godot               | Deferred POST-CUTOVER — corretto          | ~3-5g                      |
| Sprint J Visual Map Obsidian                   | Decision pending (raccomanda defer)       | DATA GAP — master-dd input |
| Web v1 archive branch + tag                    | Sprint S checklist item                   | ~1-2h                      |
| Mission Console deprecation                    | Sprint S checklist item                   | ~2-3h                      |

### Gantt-style sequencing (Phase A path critico)

```
Week 1 (2026-05-07/09) — Phase A polish (no blockers)
  [N.7 Wave B 2 statuses ~2-3h] ──┐
  [N.7 cross-encounter GUT ~2h]  ──┤──→ N.7 FULL 5/5 close
  [M.7 HUD debrief widget ~2h]   ──┘
  [Ennea surface wire ~2h]

Week 1-2 (2026-05-09/14) — Asset + scene (userland + design)
  [Skiv portrait Path 3 ~6-9h userland]
  [Character creation TV §0 ~6-10h] ← design decisions needed

Sprint S trigger (post assets + N.7/M.7 close)
  [Web v1 archive ~1-2h]
  [Mission Console deprecation ~2-3h]
  [cutover formal ~10min userland + 1-2h ADR] ← ADR-2026-05-05 ACCEPTED Phase A pending
```

---

## §6 — Raccomandazioni: keep / extend / kill per Sprint P+Q residual scope

### Sprint P — KEEP AS CLOSED

**Verdict**: KEEP CLOSED. Tutti i deliverables shipped inclusi caller wire deferred originalmente.
`propagateLineage` runtime portato (#63, caller wire W7.x #127). Nessun debt residuo.

Azione: aggiornare `docs/planning/2026-04-29-master-execution-plan-v3.md` §Sprint P con
close-mark "CLOSED `1172819` (#37), P-x-lineage #63, caller W7.x #127".

### Sprint Q — KEEP AS CLOSED

**Verdict**: KEEP CLOSED. ETL + runtime services + GUT gate tutti superati.
GUT ≥250/384 raggiunto a 594 (154%) poi cresciuto a 1719 (360% del target).
LDtk integration resta deferred correttamente (Phase B, non blocker).

Azione: aggiornare `docs/planning/2026-04-29-master-execution-plan-v3.md` §Sprint Q con
close-mark "CLOSED `f1dc591` (#45), runtime Q.x W7.x bundle 2026-05-04".

### Combat stubs registry — KILL TRACKING (gia closed)

**Verdict**: sezione stubs_registry non necessita piu tracking attivo. STUBS=[] permanente
dal PR #177 (`7bc3ade`). Riferimento storico in `sprint-pq-closure.md`.

### Sprint P/Q residual — NESSUN EXTEND

**Verdict**: nessun scope extend raccomandato. I soli item residui sono:

1. Surface debt N.7 Wave B (2 statuses) — appartiene a Sprint N cleanup, non Sprint P/Q
2. LDtk — correttamente Phase B post-cutover
3. propagateLineage hybrid rules — correttamente Phase B (P.5/Spore)
