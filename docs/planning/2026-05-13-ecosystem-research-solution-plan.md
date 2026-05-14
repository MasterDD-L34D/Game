---
title: 'Ecosystem Research & Solution Plan 2026-05-13 — 22 ticket TKT-ECO-XX dal player POV'
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-05-13'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [plan, ecosystem, biome, foodweb, species, mating, forms, mutations, audit-action, gate-5, museum-first, adr-gated]
---

# Ecosystem Research & Solution Plan — 2026-05-13

**Origin**: follow-up [`docs/reports/2026-05-13-ecosystem-infrastructure-audit.md`](../reports/2026-05-13-ecosystem-infrastructure-audit.md). User trigger: _"usa il metodo per preparare un piano approfondito di ricerca e soluzione per tutti i punti trovati e anche altri che ancora mancano"_.

**Metodo**:
1. Museum-first (`docs/museum/galleries/worldgen.md` + 7 card worldgen + Loop Hero + Disco + Hades + Cocoon)
2. 4-gate DoD per ogni ticket (Research → Smoke → Tuning → Optimization)
3. Gate 5 mandatory: *un player vede l'effetto in <60s gameplay?*
4. Completionist-preserve: zero discard silenzioso, ogni opzione → museum card o ADR
5. Anticipated-judgment markup: subjective claim Claude-flagged pending master-dd verdict

**Output**: 22 ticket TKT-ECO-XX in 3 fasi (A autonomous / B master-dd verdict / C ADR+Sprint dedicato) + dependency graph + ADR list + risk register.

---

## 0. Executive summary

| Phase | Effort      | Ticket | Surface gain                                                                                          | Gate     |
| :---: | :---------: | :----: | ----------------------------------------------------------------------------------------------------- | :------: |
| **A** | ~30h tot    | 7      | Smoke test mutations + sentience HUD + bioma pressure + starter trait + 3 anti-rot cleanup            | autonomous |
| **B** | ~38-50h tot | 8      | Mating Ennea 9/9 + Atlas mini-map + Sprite lifecycle transitions + Telemetry ecosystem + 4 altri      | master-dd verdict |
| **C** | ~70-100h    | 7      | Foodweb runtime + cross-events StressWave + bridge species + audio binding + sprite swap full        | ADR + Sprint dedicato |

**Gain totale player POV (se shippato A+B)**: 4/11 strati → 9/11 con surface player-visible. Pillar P3 🟡 → 🟢 candidato confermato. P4 Ennea 6 archetipi → 9. P6 fairness biome-driven.

---

## 1. Findings recap dall'audit 2026-05-13

Riferimento: [report audit](../reports/2026-05-13-ecosystem-infrastructure-audit.md).

11 sub-strati, stato corrente:

- 🟢 FULL WIRED 3/11: Mating (L6) + Forms (L7a) + Skiv (L7d)
- 🟡 PARTIAL 3/11: Bioma (L1) + Specie (L5) + Mutations (L7b)
- ❌ DATASET-ONLY 3/11: Ecosistema (L2) + Foodweb (L3) + Hazard (L4)
- ❌ ORPHAN 2/11: Promotions (L7c) + Ancestors 297 (L5)

---

## 2. NEW gaps identificati post-audit (player POV synthesis)

Audit ha guardato file:line. POV player rivela altri gap che nessun grep mostra:

### 2.1 Mating compat_ennea 3/9 archetipi only

`data/core/mating.yaml:361-364` definisce compatibility solo per 3 archetipi Ennea: Coordinatore(2), Conquistatore(3), Esploratore(7). **Mancano 6**: Riformatore(1), Aiutante/Realizzatore(?), Romantico(4), Investigatore(5), Lealista(6), Sfidante(8), Pacificatore(9). Skiv è candidate Type 5 (Investigatore) OR Type 7 (Esploratore) — Type 7 coperto, Type 5 NO.

Player POV: 2/3 nemici reclutati non producono Ennea modifier nel mating roll. Sembra "engine silenzioso".

### 2.2 Pack drift `mating.yaml` core vs pack -84 LOC

`data/core/mating.yaml` = 477 LOC. `packs/evo_tactics_pack/data/mating.yaml` = 393 LOC. Delta 84 LOC corrisponde a `gene_slots` definitions (museum card M-2026-04-25-007 ha già flag-ato).

Player POV: zero impact diretto, ma sync break silenzioso = catalog pubblicato (Game-Database) divergente dal canonical = wiki / showroom showcase incoerente con runtime.

### 2.3 Sprite lifecycle Skiv: ASCII a dato, transizione runtime zero

`data/core/species/dune_stalker_lifecycle.yaml` definisce 5 fasi vitali con sprite ASCII per ogni fase + tactical correlate. Quando Skiv passa T2 → T3, runtime **non swap-pa lo sprite**. Player vede sempre lo stesso.

Pattern museum: [`creature-wildermyth-battle-scar-portrait`](../museum/cards/creature-wildermyth-battle-scar-portrait.md) (permanente visible change post-evento) — Wildermyth ha layered portraits che cambiano dopo storia. Evo-Tactics ha già il dato, manca swap.

### 2.4 Audio/SFX layer ecosystem-driven = zero

`data/core/` grep audio/sfx/sound → vuoto. Workspace `~/Documents/evo-tactics-refs/` ha 184GB asset Sonniss royalty-free CC0 + recipe Skiv asset class, **zero binding runtime**.

Player POV: il bioma è muto. Tempesta ferrosa (cross-event L4) non ha jingle. Mating success non ha "wind-flute". Mutation apply non ha "synth-stinger". 100% UX silenziosa.

### 2.5 Telemetry ecosystem features = zero metric

`metaProgression.js` ha 1053 LOC + 7 endpoint mating wired, ma `telemetry.recordEvent` chiamato 0 volte. Nessuno sa quanti recruit avvengono per partita, quanti mating roll, quale archetype Ennea è più comune, quale bioma ha più stress events.

Player POV: niente diretto. Master-dd POV: tuning balance cieco. Telemetry-illuminator museum gallery (Tufte sparklines + Grafana dashboards) = pattern non adottato per ecosystem.

### 2.6 Atlas / mini-map ecosistema player-facing = zero

Loop Hero pattern (museum M-2026-04-27-029) ha 5×5 hex mini-map che si popola post-scenario. Evo-Tactics: zero surface "il player vede dove sta nella rete ecologica". 5 biomi + 12 edge + bridge species = meta-game potenzialmente bellissimo, **non esposto**.

Player POV: ogni partita sembra isolata. Niente senso di "sto conquistando il pianeta", "ho aperto un nuovo nodo bioma".

### 2.7 Onboarding reveal "ecosistema vivo" = layered diegetic mancante

Disco Elysium pattern (museum M-2026-04-27-003): info layered, prima si vede generic poi diegetic reveal. Evo-Tactics V1 onboarding 60s shipped PR #1726 (3-stage overlay), ma **non rivela ecosistema strutturale**. Player resta "sto giocando tattica scacchistica" forever.

### 2.8 Mating UI: Ennea modifier non visibili pre-roll

`/api/meta/mating` ritorna roll esito. Frontend `nestHub.js` mostra outcome. **NON mostra preview Ennea modifier** ("Skiv è Type 7, partner è Type 4, +2 likes su `new_biome_entry`"). Player non capisce perché un mating fallisce o riesce.

Pattern: Slay the Spire intent preview (museum, ui-itb-telegraph-deterministic) → telegraph deterministico = trust UX.

### 2.9 Bridge species ambiguity species/resource

`ferrocolonia-magnetotattica` è `species` nel `bridge_species_map` + `resource` nel `badlands_foodweb.yaml`. Schema break silenzioso. Validator non blocca. Risolvere prima di promozione canonical.

### 2.10 Validator Python → Runtime Node gap (ADR-2026-04-19 killed Python)

`tools/py/foodweb.py` + `trophic_roles.py` + `cross_events_validator.py` esistono validator-time. ADR-2026-04-19 ha killed Python rules engine. Path forward: Node-native port (~15-20h). Senza port, runtime ecosystem resterà perpetuamente cieco.

### 2.11 Cross-Game-Database integration ancestors layer

Ancestors 297 entries con CC BY-NC-SA + wiki URL + branch metadata = perfetto candidato per Game-Database trait glossary (HTTP runtime Alt B flag-OFF attuale, OD-004 status quo confermato). **Decisione product**: vale activare flag + propagare 297 entries cross-stack?

### 2.12 Trait orphan ASSIGN-A residue 56/91

PR #2210 (2026-05-10) ha shipped 35/91 traits player-visible. 56 residue waves 5-6 + `species_expansion` schema mismatch. Sprint Q+ candidate.

---

## 3. Research questions (open) per layer

Domande aperte che richiedono ricerca prima di implementazione:

### Layer 1 Bioma

- **RQ-L1-1**: `hazard.stress_modifiers` schema → numerici (StressWave +N HP) o categorical (`light/medium/heavy`)? Pattern Frostpunk (intensity bracket) vs Pathologic (continuous gauge)?
- **RQ-L1-2**: `starter_bioma` pack content = trait fondatore singolo (Skiv = `dustsense`) o pacchetto 3-trait + 1 ability?
- **RQ-L1-3**: bioma color palette canonical: già definita in ADR-2026-04-18 art direction o serve aggiunta campo YAML?

### Layer 2-4 Ecosistema/Foodweb/Hazard

- **RQ-L234-1**: `cross_events.yaml` 3 eventi attuali (tempesta ferrosa + 2) sono sufficienti per pilot o servono +5? Pattern AI War (pack unlock progression)?
- **RQ-L234-2**: bridge species → enemy type / NPC ambientale / encounter event? ADR pre-promotion.
- **RQ-L234-3**: trophic_role resolver Node port: full alias map o subset core (predator/prey/decomposer)?

### Layer 5 Specie + Ancestors + Sentience

- **RQ-L5-1**: Sentience backfill heuristic? Mappare via `intelligence` stat range + `social_traits` count? Auto-genera draft, master-dd review.
- **RQ-L5-2**: Ancestors Path B biome_pool seeder mapping branch → biome:
  - AB (Ambulation) + SW (Swim) + MT (Metabolism) → terrain biomes (desert/cryosteppe/foresta)?
  - CM (Communication) + IN (Intelligence) → social biomes (rovine planari)?
  - SE (Senses) + DX (Dexterity) + AT (Attack) → predator biomes (badlands)?
  - Già proposto in museum card M-2026-05-10-001 Path B — confermare con master-dd Q1.
- **RQ-L5-3**: Ancestors → Game-Database cross-repo OD-004 reopen?

### Layer 6 Mating

- **RQ-L6-1**: compat_ennea 3 → 9 archetipi: definire likes/dislike action per Type 1/4/5/6/8/9. Disco-style internal voice o catalog enum?
- **RQ-L6-2**: Ennea modifier preview pre-roll UI: panel modal pre-mating o tooltip on hover su NPG?
- **RQ-L6-3**: Pack drift mating.yaml resolve: sync core → pack additive (autoritativo core) o merge?

### Layer 7 Forms/Mutations/Promotions/Skiv

- **RQ-L7-1**: Mutations surface location: smoke live verifica esistenza o nuovo modal?
- **RQ-L7-2**: Promotions: demolish + 410 Gone o sandbox header proposal-only?
- **RQ-L7-3**: Skiv ASCII sprite lifecycle transition: pre-rendered 5 fasi static swap o procedural morph?
- **RQ-L7-4**: Sentience tier HUD: dedicated badge o inline lifecycle phase label?

### Cross-cutting

- **RQ-X-1**: Audio binding ecosystem: dedicated `audioRouter.js` service o inline in `biomeSpawnBias`?
- **RQ-X-2**: Atlas mini-map: diegetic (item in-world) vs HUD overlay (Loop Hero D5 pending) — gate decision.
- **RQ-X-3**: Telemetry ecosystem: schema `event_type` per `recruit_success`, `mating_roll`, `mutation_applied`, `bioma_pressure_trigger`?

---

## 4. Ticket catalog — 22 ticket TKT-ECO-XX

Format per ticket: ID + Layer + Effort + Blast multiplier + Gate-5 surface + ADR? + Dependencies + Provenance museum card.

### Phase A — Autonomous (master-dd verdict NOT required, ~30h tot)

#### TKT-ECO-A1 — Smoke test Mutations UI surface (~30 min)
- **Layer**: 7b
- **Effort**: 0.5h
- **Blast**: ×1.0 (read-only verify)
- **Gate-5 surface**: identifica esistenza UI o flagga gap
- **ADR**: NO
- **Deps**: backend up + frontend bundle
- **Actions**: avvia stack, apply mutation via `/api/v1/mutations/apply`, verifica overlay/log/debrief field in <60s
- **Output**: PASS → L7b 🟢; FAIL → ticket TKT-ECO-B5 (~4-8h frontend wire)
- **Provenance**: audit report §Layer 7b

#### TKT-ECO-A2 — ~~Promotions sandbox header~~ → **VERIFY-ONLY smoke** (~30 min)
- **Layer**: 7c
- **Effort**: 0.5h (REVISED post cross-validation 2026-05-13)
- **Blast**: ×1.0 (verify-only)
- **Gate-5 surface**: confirms wired, no new surface
- **ADR**: NO
- **Deps**: backend up + DATABASE_URL set
- **Actions** (REVISED):
  1. Boot backend with `DATABASE_URL` set
  2. `POST /api/session/:id/promote` with valid tier → expect 200
  3. Confirm Godot v2 `PromotionPanel.tscn` runtime fires same flow (smoke cross-stack)
  4. Update audit report §Layer 7c with verify result + bump museum card if any
- **Outcome**: L7c row already corrected to 🟢 WIRED in audit doc. Smoke confirms surface live.
- **Provenance**: cross-validation flag PR #2260 comment by master-dd (Godot v2 wave 2026-05-13 closure) + audit report §Layer 7c CORRECTED
- **Note**: ticket originale "sandbox header" CANCELLED — file `promotions.yaml` è data canonical consumed da `promotionEngine.js`, NON proposal-only. Cancellare header sarebbe disinformazione.

#### TKT-ECO-A3 — Museum card M-007 post-script (~30 min)
- **Layer**: meta
- **Effort**: 0.5h
- **Blast**: ×1.0
- **Gate-5 surface**: zero (additive museum update)
- **ADR**: NO
- **Deps**: nessuna
- **Actions**: additive update `docs/museum/cards/mating_nido-engine-orphan.md` con post-script "FULL CLOSURE 2026-04-27 via OD-001 Path A" + bump `last_verified: 2026-05-13`. Card additive-only per protocol museum.
- **Provenance**: audit report §Layer 6

#### TKT-ECO-A4 — Sentience tier backfill 45 specie (~5-6h, revised hybrid 2026-05-14)
- **Layer**: 5
- **Effort**: ~5-6h (REVISED da 8h post vault citation backing — hybrid auto/manual ratio reduces manual workload)
- **Blast**: ×1.3 (data + lifecycle resolver consumer)
- **Gate-5 surface**: Skiv info-panel mostra "T2 — emergente". Altre 44 specie hanno tier visibile in debrief/wiki
- **ADR**: NO (heuristic + hybrid manual, master-dd review post-fact)
- **Deps**: nessuna (vault RFC sentience v0.1 da ingest cross-stack se OD-029 ✅)
- **Actions hybrid** (Claude-vault-proposed 2026-05-14 ratio):
  1. **AUTO baseline** ~30-35 specie: T1-T2 animal types Pack v2 base species via heuristic (`intelligence` stat + `social_traits` count + `clade_tag`)
  2. **MANUAL override** ~10-15 specie: T3-T4 Custode/Skiv classes + T5-T6 specie senzienti rare
  3. Master-dd review draft (~20-30 min, hybrid riduce da 45 manual → ~10-15)
  4. Apply `sentience_index: T<n>` a `data/core/species.yaml` + `species_expansion.yaml`
  5. Frontend chip in `apps/play/src/speciesNames.js` o info-panel debrief
- **Vault citation backing** (Claude-vault-proposed pending master-dd verdict): `Cards/evo-tactics-sentience-tiers-canonical/` 10 cards atomized T1-T6 + 4 traits interocettivi (Propriocezione, Equilibrio, Nocicezione, Termocezione) + `traits_sensienza.yaml` data structure + `neurons_bridge.csv` 13 entries Ancestors mapping. Source: vault `docs/decisions/OD-024-031-game-pr-2260-vault-verdict-template.md`.
- **Provenance**: museum card `cognitive_traits-sentience-tiers-v1.md` + OD-008 RISOLTA 2026-04-25
- **Note**: hybrid auto+manual approach = Claude-vault-proposed soft markup `(⚠️ pending master-dd verdict OD-024 per ratio auto/manual + ingest RFC vault)`

#### TKT-ECO-A5 — Bioma diff_base + hazard → pressure modifier (~3h)
- **Layer**: 1
- **Effort**: 3h
- **Blast**: ×1.3 (session helpers + biome data consumer)
- **Gate-5 surface**: Cryosteppe vs Foresta differenza tangibile — HP enemy +N%, StressWave iniziale higher
- **ADR**: NO (knob-tuning, additive)
- **Deps**: nessuna
- **Actions**:
  1. `apps/backend/services/sessionHelpers.js` legge `biomes.yaml.hazard.stress_modifiers` + `diff_base`
  2. Apply HP enemy scaling + StressWave initial floor
  3. Debrief expose "pressure rating" chip
- **Test**: AI sim sweep 3 biomi × N=20 → completion floor preserved
- **Provenance**: museum gallery worldgen reuse path Tier 1.1

#### TKT-ECO-A6 — starter_bioma trait definition (~3h)
- **Layer**: 1 + 7a
- **Effort**: 3h
- **Blast**: ×1.3
- **Gate-5 surface**: character creation mostra "Bioma di origine: Badlands → trait fondatore: Scavenger"
- **ADR**: NO
- **Deps**: nessuna
- **Actions**:
  1. Definisci per ogni bioma slug `starter_bioma_trait` in `data/core/biomes.yaml` o `forms/form_pack_bias.yaml`
  2. `formPackRecommender.js:242 resolveStarterBioma()` lo risolve in pack roll
  3. Character creation UI label esposto
- **Provenance**: museum gallery worldgen reuse path Tier 1.2 + RQ-L1-2

#### TKT-ECO-A7 — Pack drift `mating.yaml` resolve (~2h)
- **Layer**: 6
- **Effort**: 2h
- **Blast**: ×1.5 (catalog sync + Game-Database publish)
- **Gate-5 surface**: zero (anti-drift)
- **ADR**: NO
- **Deps**: nessuna
- **Actions**:
  1. Diff `data/core/mating.yaml` vs `packs/evo_tactics_pack/data/mating.yaml`
  2. Apply 84 LOC `gene_slots` da core → pack
  3. Re-run `npm run sync:evo-pack` per refresh catalog
  4. Verify `python tools/py/game_cli.py validate-datasets` verde
- **Provenance**: museum card M-2026-04-25-007 §Risks §3

**Phase A subtotal**: 0.5 + 0.2 + 0.5 + 8 + 3 + 3 + 2 = **17.2h**. Gate-5 surface gain: **2 strati 🟡 → 🟢** (L5 sentience + L7b verified).

### Phase B — Master-dd verdict required (~38-50h tot)

#### TKT-ECO-B1 — Mating compat_ennea expansion 3 → 9 archetipi (~10h)
- **Layer**: 6 + P4
- **Effort**: 10h
- **Blast**: ×1.5 (canonical data + roll modifier + UI surface)
- **Gate-5 surface**: mating roll preview mostra Ennea modifier per ogni archetipo
- **ADR**: NO (additive data + roll formula no break)
- **Deps**: TKT-ECO-A4 sentience (correlato) + master-dd Ennea 9-canon verdict
- **Actions**:
  1. Definisci `likes` / `dislike` action per 6 archetipi mancanti (Riformatore 1, Aiutante 2 già, Realizzatore 3 già, Romantico 4, Investigatore 5, Lealista 6, Esploratore 7 già, Sfidante 8, Pacificatore 9)
  2. Estendi `actions_appeal` map se needed
  3. Mating UI preview Ennea modifier pre-roll (gate TKT-ECO-B2)
  4. Test: `tests/services/metaProgression.mating.test.js` extension N=20 case
- **Provenance**: audit §2.1 + OD-009 Ennea canonical RISOLTA 2026-04-25 + museum card `enneagramma-dataset-9-types`
- **Note**: master-dd verdict needed: usare `data/core/personality/enneagramma/` (already 9 archetypes shipped Wave 6) come authoritative o re-spec compat_ennea? Pattern Disco internal voice (M-2026-04-27-003).

#### TKT-ECO-B2 — Mating UI Ennea modifier preview pre-roll (~5h)
- **Layer**: 6 + P4
- **Effort**: 5h
- **Blast**: ×1.3 (frontend only)
- **Gate-5 surface**: `nestHub.js` mostra panel "Mating roll preview: Skiv Type 7 + Partner Type 4 → +1 modifier (new_biome_entry like overlap)"
- **ADR**: NO
- **Deps**: TKT-ECO-B1 (compat_ennea 9/9)
- **Actions**: estendi `apps/play/src/nestHub.js` con preview modal pre-roll (telegraph pattern)
- **Provenance**: audit §2.8 + museum card `ui-itb-telegraph-deterministic`

#### TKT-ECO-B3 — Ancestors → biome_pool seeder Path B (~3h)
- **Layer**: 5
- **Effort**: 3h
- **Blast**: ×1.2 (data service only)
- **Gate-5 surface**: encounter pool genera enemy con trait branch-coerente al bioma (es. Badlands → AT/SE branch traits)
- **ADR**: NO
- **Deps**: master-dd Q1 verdict da [`docs/planning/2026-05-10-tkt-ancestors-consumer-research.md`](2026-05-10-tkt-ancestors-consumer-research.md)
- **Actions**: read `ancestors_rename_proposal_v2.yaml:branch` → assign branch-grouped trait_id lists a `biome_pools.json`
- **Provenance**: museum card M-2026-05-10-001 Path B
- **Note**: gate ESPLICITO master-dd Q1 — non auto-procedere

#### TKT-ECO-B4 — Atlas mini-map 5x5 hex (Loop Hero pattern, ~6-9h)
- **Layer**: meta + 2
- **Effort**: 6h moderate / 9h full diegetic
- **Blast**: ×1.4
- **Gate-5 surface**: briefing panel mostra mini-map 5×5 hex, post-scenario 1-3 hex si illuminano color bioma
- **ADR**: NO ma decisione D5 (diegetic vs HUD) gating
- **Deps**: master-dd D5 verdict + bioma color palette ADR-2026-04-18 verifica
- **Actions**:
  1. `campaign advance` popola `hex_revealed[]` array nel campaign state
  2. HTML/CSS mini-map hex 5×5 nel briefing panel
  3. (Full path D5 diegetic) item "mappa tattica" in briefing
- **Provenance**: museum card M-2026-04-27-029 Loop Hero
- **Note**: NON rendere interattiva nella prima implementazione (scope creep)

#### TKT-ECO-B5 — Mutations surface wire frontend (~4-8h, conditional su TKT-ECO-A1 FAIL)
- **Layer**: 7b
- **Effort**: 4h minimal / 8h full modal
- **Blast**: ×1.3
- **Gate-5 surface**: post-encounter modal "Skiv ha mutato — nuovo slot attivato: occhi_termici" con highlight bingo
- **ADR**: NO
- **Deps**: TKT-ECO-A1 verdict (FAIL trigger)
- **Actions**: nuovo `apps/play/src/mutationsPanel.js` (pattern formsPanel.js) o estensione inline `debriefPanel.js`
- **Provenance**: audit §Layer 7b + Gate 5 policy

#### TKT-ECO-B6 — Telemetry ecosystem features wire (~5h)
- **Layer**: cross-cutting
- **Effort**: 5h
- **Blast**: ×1.4 (telemetry pipeline + service hooks)
- **Gate-5 surface**: zero player (master-dd dashboard)
- **ADR**: NO
- **Deps**: nessuna
- **Actions**:
  1. Schema `telemetry.yaml` aggiungi event types: `recruit_success`, `mating_roll`, `mutation_applied`, `bioma_pressure_trigger`, `form_evolve`
  2. Hook in `metaProgression.js`, `mutationEngine.js`, `formEvolution.js`
  3. Aggregation in `services/telemetry/telemetryStore.js` (verify exists)
  4. Dashboard surface in `atlas` workstream
- **Provenance**: audit §2.5 + museum card `telemetry-duckdb-stockfish-llm-critic-quick-wins`

#### TKT-ECO-B7 — ~~Promotions design decision~~ → **CANCELLED post cross-validation 2026-05-13**
- **Status**: CANCELLED — premise FALSE post audit correction
- **Reason**: Promotions è già FULL WIRED full-stack (Game/ engine 302 LOC + 2 endpoint + Godot v2 PromotionPanel + Postgres tiers JSONB)
- **Replacement**: rolled into TKT-ECO-A2 verify-only smoke
- **Original framing preserved**: museum discard card [M-2026-05-13-001](../museum/cards/promotions-orphan-claim-discarded.md) per completionist-preserve protocol
- **Effort saved**: 2-15h originally budgeted

#### TKT-ECO-B8 — Skiv ASCII sprite lifecycle transitions (~5h)
- **Layer**: 7d
- **Effort**: 5h
- **Blast**: ×1.3
- **Gate-5 surface**: quando Skiv passa T2 → T3 lifecycle phase, sprite ASCII swap visibile in info-panel + diary
- **ADR**: NO
- **Deps**: TKT-ECO-A4 sentience backfill (correlato)
- **Actions**:
  1. `dune_stalker_lifecycle.yaml` ha già 5 sprite ASCII per fase
  2. Frontend `speciesNames.js` o info-panel: consuma `lifecycle.phase` + render sprite
  3. Trigger transition on level threshold o sentience tier advance
- **Provenance**: audit §2.3 + museum card `creature-wildermyth-battle-scar-portrait`

**Phase B subtotal effort**: 10 + 5 + 3 + 6-9 + 4-8 + 5 + 2-15 + 5 = **40-60h**. Gate-5 surface gain: **3 strati 🟡 → 🟢** (L6 Ennea 9/9 + L7b mutations + L7d Skiv lifecycle visible).

### Phase C — ADR + Sprint dedicato (~70-100h tot)

#### TKT-ECO-C1 — ADR-2026-XX-worldgen-runtime-integration (~3h drafting)
- **Layer**: meta
- **Effort**: 3h ADR drafting
- **Gate-5 surface**: zero (governance)
- **ADR**: YES (CREATE this ADR)
- **Deps**: Phase A + B complete (evidence-driven)
- **Actions**: draft ADR copre L2/L3/L4 Phase 1 wire scope, decision criteria, rollback plan
- **Provenance**: museum gallery worldgen reuse path Tier 3 + audit §6

#### TKT-ECO-C2 — Trophic role resolver Node-native port (~15h, gated TKT-ECO-C1)
- **Layer**: 3 + P3
- **Effort**: 15h
- **Blast**: ×1.6 (new core service)
- **Gate-5 surface**: spawn enemy con role ecologico coerente bioma (predator high-stress, scavenger low-stress)
- **ADR**: gated TKT-ECO-C1
- **Deps**: TKT-ECO-C1 accepted
- **Actions**: port `tools/py/trophic_roles.py` alias map → `apps/backend/services/ecosystem/trophicRoleResolver.js` + constraint wave generation
- **Provenance**: museum card `worldgen-trophic-roles-validator-not-runtime`

#### TKT-ECO-C3 — Cross-event StressWave modifier runtime (~12h, gated TKT-ECO-C1)
- **Layer**: 4 + P6
- **Effort**: 12h
- **Blast**: ×1.5
- **Gate-5 surface**: "Tempesta ferrosa attiva — visibilità ridotta 30%, gear metallico stress +N"
- **ADR**: gated TKT-ECO-C1
- **Deps**: TKT-ECO-C1 accepted + quantification design decision (descrizione narrativa YAML → numeri)
- **Actions**:
  1. Quantify 3 cross-events: numerici stress modifier + duration round
  2. `crossEventService.js` random roll inizio sessione
  3. Surface telegraph banner + StressWave modifier active
- **Provenance**: museum card `worldgen-cross-bioma-events-propagation`

#### TKT-ECO-C4 — Bridge species canonicalization (~10h, gated ADR-bridge-species)
- **Layer**: 4-5
- **Effort**: 10h
- **Blast**: ×1.5
- **Gate-5 surface**: bridge species (echo-wing, ferrocolonia, archon-solare) spawn in encounter cross-bioma
- **ADR**: YES (`ADR-2026-XX-bridge-species-type`)
- **Deps**: ADR su type (enemy/NPC/event)
- **Actions**:
  1. ADR decision: bridge species type
  2. Resolve `ferrocolonia-magnetotattica` species/resource ambiguity
  3. Promote 3 bridge species a `data/core/species.yaml`
  4. Encounter event trigger
- **Provenance**: museum card `worldgen-bridge-species-network-glue`

#### TKT-ECO-C5 — Audio binding ecosystem (~15-20h, NUOVO scope)
- **Layer**: cross-cutting (audio absent)
- **Effort**: 15h minimal / 20h full
- **Blast**: ×1.7 (new audio pipeline)
- **Gate-5 surface**: ambient SFX bioma + jingle cross-event + stinger mating/mutation
- **ADR**: YES (`ADR-2026-XX-audio-pipeline`)
- **Deps**: asset workflow refs (184GB CC0 Sonniss disponibile)
- **Actions**:
  1. `audioRouter.js` service + frontend Web Audio API integration
  2. Asset binding `biome_id → ambient.ogg` + `cross_event_id → stinger.ogg`
  3. Recipe `~/Documents/evo-tactics-refs/SKIV_REFS_EXTRACTED.md` (esistente)
- **Provenance**: audit §2.4 + asset workflow doc

#### TKT-ECO-C6 — Sprite lifecycle full procedural morph (~10-15h, scope extension)
- **Layer**: 7d + asset
- **Effort**: 10-15h
- **Blast**: ×1.5
- **Gate-5 surface**: Skiv visual change cross-fase con animazione
- **ADR**: NO (asset extension)
- **Deps**: TKT-ECO-B8 (static swap shipped first)
- **Actions**: asset workflow path 1 Kenney + modify per 5 fasi Skiv + animation curve
- **Provenance**: audit §2.3 evoluzione full

#### TKT-ECO-C7 — Meta-network full wire + cross-bioma propagation (~34-42h, Sprint dedicato)
- **Layer**: 2-4 (meta-network completo)
- **Effort**: 34h core / 42h full
- **Blast**: ×1.8
- **Gate-5 surface**: player vede dipendenza cross-bioma (es. action in Badlands genera event in Foresta dopo 3 round)
- **ADR**: gated TKT-ECO-C1 + Sprint dedicato approval
- **Deps**: TKT-ECO-C2 + C3 + C4 complete
- **Actions**:
  1. 5 nodi + 12 edge consumati da session bridge
  2. Cross-bioma event propagation runtime
  3. Player telegraph "Foresta status: stable / agitated / corrupted"
- **Provenance**: museum gallery worldgen reuse path Tier 3.7

**Phase C subtotal effort**: 3 + 15 + 12 + 10 + 15-20 + 10-15 + 34-42 = **99-117h**. Sprint dedicato candidate (Sprint M14-C o Sprint Q+ ecosystem-wave).

### Backlog / Out-of-scope ma flagged

- **TKT-ECO-Z1** — Onboarding diegetic reveal "ecosistema vivo" (~8h, museum Disco pattern M-2026-04-27-003) — depend TKT-ECO-B4 atlas
- **TKT-ECO-Z2** — Trait orphan ASSIGN-A waves 5-6 + species_expansion schema mismatch (~10-15h) — Sprint Q+ residue
- **TKT-ECO-Z3** — Cross-Game-Database ancestors integration (~6h) — OD-004 reopen needed
- **TKT-ECO-Z4** — Trait Editor ecosystem layer support (~12h) — Trait Editor app extension, deferred Sprint S+
- **TKT-ECO-Z5** — Vault repo Pathfinder bestiari import (~6-10h) — **NEW 2026-05-13 sera** post cross-session integration:
  - Source: [vault PR #1](https://github.com/MasterDD-L34D/vault/pull/1) — 50 cards atomizzate Bestiary 1 bio subset (30 animali + 15 parassiti + 5 vegetali) + reusable script `pathfinder_bestiary_atomize.py` (379 LOC stdlib-only)
  - **NOT audit-flagged** (audit 2026-05-13 commit `c157553` + `5ca3c07` did NOT mention Pathfinder — verified via grep) — cross-session integration scope only
  - Reuse path: evaluate import 50 cards Bestiary 1 + 226 Bestiary 2 + 185 Bestiary 3 = ~461 candidate species → `data/core/species_candidates/` con licensing review
  - Gate: master-dd verdict OD-XXX (new): vault → Game/ data flow direction (additive species pool? selective import? reference-only?)
  - License gate: Pathfinder Open Game License (Paizo) compatibility check pre-import
  - Out-of-scope this audit/plan; tracked for visibility

---

## 5. Dependency graph

```
TKT-ECO-A1 (smoke mutations)
     ├─ PASS ──→ no action
     └─ FAIL ──→ TKT-ECO-B5 (mutations wire)

TKT-ECO-A4 (sentience backfill 45 species)
     ├──→ TKT-ECO-B8 (Skiv ASCII sprite lifecycle)
     └──→ TKT-ECO-B1 (mating Ennea 9/9 — correlato Skiv Type 5/7 candidate)

TKT-ECO-B1 (mating Ennea 9/9)
     └──→ TKT-ECO-B2 (mating UI preview pre-roll)

TKT-ECO-B3 (ancestors biome_pool seeder)
     └─ master-dd Q1 verdict gate (planning doc 2026-05-10)

TKT-ECO-B4 (atlas mini-map)
     ├─ master-dd D5 verdict gate (diegetic vs HUD)
     └──→ TKT-ECO-Z1 (onboarding diegetic reveal)

TKT-ECO-C1 (ADR worldgen runtime integration)
     ├──→ TKT-ECO-C2 (trophic role resolver Node)
     ├──→ TKT-ECO-C3 (cross-event StressWave)
     └──→ TKT-ECO-C7 (meta-network full wire)

TKT-ECO-C4 (bridge species canonical)
     └─ ADR-bridge-species-type gate

TKT-ECO-C5 (audio binding)
     └─ ADR-audio-pipeline gate

TKT-ECO-A2 / A3 / A5 / A6 / A7 — independent, autonomous
TKT-ECO-B6 (telemetry) — independent
TKT-ECO-B7 (promotions decision) — independent
```

**Critical path Phase A**: TKT-ECO-A1 + A4 + A5 in parallelo (~8h day-1). TKT-ECO-A2 + A3 + A6 + A7 fill (~5.5h day-2). Total Phase A: ~13.5h calendar (1.5 giornate dev).

**Critical path Phase B**: TKT-ECO-B1 + B2 sequential (15h). TKT-ECO-B3 + B6 + B8 parallel (13h). Atlas B4 isolated (6-9h). Total Phase B: ~28h calendar.

---

## 6. Decision gates (master-dd verdict needed)

Aggiungere a `OPEN_DECISIONS.md`:

| OD ID | Domanda                                                                                          | Default proposed                              | Vault citation backing (Claude-vault-proposed 2026-05-14) | Effort gate |
| :---: | ------------------------------------------------------------------------------------------------ | --------------------------------------------- | ---- | :---------: |
| OD-024 | Sentience tier backfill 45 species — auto-heuristic Claude o master-dd manual?                  | auto-heuristic + master-dd review draft (~30 min) | ✅ AUTO+manual hybrid (`Cards/evo-tactics-sentience-tiers-canonical/` 10 cards T1-T6 + 4 traits interocettivi RFC v0.1) | TKT-ECO-A4 |
| OD-025 | ~~Promotions YAML — demolish o implement?~~ **CANCELLED 2026-05-13 sera** — premise FALSE post cross-validation. Already FULL WIRED. | N/A — verify-only smoke remaining (TKT-ECO-A2 revised) | ❌ REJECT framing (engine LIVE confirmed) | n/a |
| OD-026 | Atlas mini-map decisione D5 — diegetic (in-world item) vs HUD overlay?                          | HUD overlay (faster ROI)                      | ✅ HUD overlay (FINAL-DESIGN-FREEZE §16+§17 atomized) | TKT-ECO-B4 |
| OD-027 | Bridge species type — enemy / NPC ambientale / encounter event?                                 | encounter event (low blast radius)            | ✅ encounter event (GAME_DATABASE_SYNC source ingested) | TKT-ECO-C4 |
| OD-028 | Audio pipeline ADR — Web Audio API direct o middleware (Howler.js, etc.)?                        | Web Audio API direct (zero new dep)           | ✅ Web Audio direct (GDD §10 audio terziario verified) | TKT-ECO-C5 |
| OD-029 | Ancestors Path B biome_pool seeder — Q1 verdict planning doc 2026-05-10?                        | proceed Path B con branch mapping default      | ✅ proceed mapping (RFC sentience §2+§5 + neurons_bridge.csv 13 entries ready) | TKT-ECO-B3 |
| OD-030 | Cross-Game-Database ancestors integration — OD-004 reopen?                                       | NO status quo flag-OFF                        | ✅ NO flag-OFF (sync source + backend flag default verified) | TKT-ECO-Z3 |
| OD-031 | Pack drift policy — sync core → pack autoritativo o merge?                                       | core autoritativo (additive)                  | ✅ core autoritativo (pack-v2-full-plus + authority_map atomized) | TKT-ECO-A7 |

**Note**: tutti i default + vault citation backing sono _Claude-proposed pending master-dd verdict_ — markup soft canonical (vault verdict ≠ master-dd verdict actual). Vault enrichment 2026-05-14 fornisce citation backing convergente con 7/8 default Claude (1/8 OD-025 already cancelled da cross-validation L7c). Source: [vault docs/decisions/OD-024-031-game-pr-2260-vault-verdict-template.md](https://github.com/MasterDD-L34D/vault/blob/main/docs/decisions/OD-024-031-game-pr-2260-vault-verdict-template.md).

### 6.1 ai-station re-analysis 2026-05-14 (master-dd direction "finish work, not conservative")

Master-dd feedback 2026-05-14 PR #2260 comment: _"verdetto vault precedente era troppo conservativo, ci costringe a non finire il lavoro ma a integrare solo in parte"_. ai-station session ribalta 6/8 verdetti verso scope full-completion. Source: [vault docs/decisions/OD-024-031-aistation-reanalysis-2026-05-14.md](https://github.com/MasterDD-L34D/vault/blob/main/docs/decisions/OD-024-031-aistation-reanalysis-2026-05-14.md) (vault PR #5).

| OD | Vault verdict (precedente) | ai-station re-analysis 2026-05-14 | Envelope | Effort delta | Status verify |
|---|---|---|:--:|:--:|---|
| 024 | AUTO+manual hybrid (~5-6h) | **Full RFC T1-T6 + 4 traits 45/45** | B | +3-4h → ~9h | ✅ no claim conflict |
| 025 | REJECT framing | REJECT (invariato) + Phase B2 catalog expansion | A+B | +3-4h → ~3.5h | ✅ no claim conflict |
| 026 | HUD overlay | **Diegetic TV + Phone overlay** (FDF §16) | C | +3-4h → ~9-12h | ✅ no claim conflict (verify FDF §16) |
| 027 | encounter event | **Full Species type + ecotypes** | B | +5-7h → ~15-17h | ✅ no claim conflict |
| 028 | Web Audio direct | **Howler.js middleware 5KB MIT** | A | ~2h | ⚠️ **NEW NPM DEP — CLAUDE.md §guardrail "nuove dipendenze approvazione esplicita richiesta"** |
| 029 | 13 entries baseline | **neurons_bridge 13→50 (Senses+Dexterity)** | B | +2h → ~5h | ✅ no claim conflict |
| 030 | NO flag-OFF | **flag-ON** (D2-C #2259 già merged) | A | ~0.5h | ❌ **CATEGORY ERROR — verified false claim** |
| 031 | additive only | **Merge core+plus consolidato** | B | +1h → ~3h | ✅ no claim conflict |

**Effort cumulativo re-analysis**: ~46-52h (Phase A+B core) vs ~14-15h vault precedente. Master-dd direction-aligned ma commitment ~3x.

### 6.2 ⚠️ Concerns verified pre re-analysis acceptance

**❌ OD-030 — CATEGORY ERROR FALSE CLAIM**: ai-station claim "NO flag-OFF contraddice D2-C cross-stack pipeline LIVE (#2259)" è verified FALSE via grep diretto:
- `#2259 e5a10c0` scope = `TKT-D2-C Godot v2 CampaignState cross-stack sync` = Prisma migration 0010 `godot_v2_campaign_states` JSONB table **interno** a Game/ backend
- `GAME_DATABASE_ENABLED` env flag scope = **trait glossary HTTP integration con sibling repo Game-Database** (ADR-2026-04-14-game-database-topology). Default OFF.
- I 2 sistemi sono **scope-disjoint**: D2-C non tocca trait glossary HTTP runtime. Flag-OFF di GAME_DATABASE_ENABLED non blocca D2-C.
- Evidence: `apps/backend/index.js:21-28` (env flag scope explicit) + `git show e5a10c0` (Prisma migration scope explicit)
- **OD-030 verdict pre-correction stays valid**: NO flag-OFF default (OD-004 RISOLTA confermata 2026-05-11). Riapertura richiede separate ADR su Game-Database HTTP integration con scope distinto da D2-C.

**⚠️ OD-028 — NEW NPM DEP gate**: ai-station propone Howler.js 5KB MIT. CLAUDE.md §"Guardrail sprint":
> Nuove dipendenze npm/pip: approvazione esplicita richiesta.
Anche dep piccola richiede master-dd explicit approval. Default Web Audio API direct (Claude precedente) era zero new dep — safer. Master-dd verdict explicit required pre TKT-ECO-C5 implementation.

### 6.3 Decision matrix post re-analysis (pending master-dd actual verdict)

| OD | Default vault (≤5-6h Phase A) | ai-station full (~9-17h Phase B) | Recommendation Claude |
|---|---|---|---|
| 024 | hybrid ratio | Full RFC | ai-station IF Phase B time budget |
| 025 | smoke verify | + Phase B2 catalog | smoke verify first, defer catalog Phase C |
| 026 | HUD overlay | Diegetic TV+Phone | ai-station IF FDF §16 verified |
| 027 | encounter event | Full Species type | ai-station IF ecotypes scope clear |
| 028 | Web Audio direct | Howler.js | **Web Audio direct** unless explicit master-dd dep approval |
| 029 | 13 baseline | 13→50 mapping | ai-station |
| 030 | NO flag-OFF | flag-ON | **NO flag-OFF** (category error in claim) |
| 031 | additive | Merge consolidato | ai-station IF audit confirms 0 break post-merge |

**Net**: 5/8 ai-station accept (024, 026 conditional, 027 conditional, 029, 031 conditional), 1/8 hybrid (025), 2/8 REJECT/concern (028 dep, 030 category error).

### 6.4 Envelope A SHIPPED — PR #2261 verification 2026-05-14

Master-dd ha shipped Envelope A bundle in [PR #2261](https://github.com/MasterDD-L34D/Game/pull/2261) (3 OD, 16/16 tests passing, ~3h delivery). Stato post-ship verify:

| OD  | Shipped status | Claude concern resolution                                                                       |
|:---:|----------------|------------------------------------------------------------------------------------------------|
| 030 | ✅ flag-ON default (`apps/backend/index.js:30`) + `deploy-min-checklist.md` Min explicit OFF | ⚠️ **Persistent concern justification**: comment block ripete claim "D2-C godot_v2_campaign_states makes Game-Database canonical persistence layer" — D2-C è tabella Prisma **interna** Game/, NON sibling Game-Database HTTP. Decisione master-dd is functionally reversible (`=false` override), ma justification accuracy resta category error. Non blocker. |
| 025 | ✅ `tests/api/promotions-cross-stack-smoke.test.js` 153 LOC + 5 tests + route wire validation | ✅ **PERFECTLY MATCHES** TKT-ECO-A2 revised recommendation. Smoke locks engine 302 LOC + 7-export surface + happy path applyPromotion FALLBACK_CONFIG. Drift detection robust. |
| 028 | ✅ `apps/play/src/audio.js` 141 LOC middleware facade + `howler-middleware-OD-028.md` 131 LOC doc + `audio-middleware.test.js` 135 LOC 8 tests | ✅ **CDN OPT-IN PATTERN RESOLVE CONCERN**: master-dd ha shipped Howler.js come CDN lazy-load opt-in (graceful no-op se `window.Howl` absent), NOT npm install. PR body explicit "Zero npm dep added". CLAUDE.md guardrail "approvazione esplicita richiesta" sidesteppato elegantemente — Howler.js è opt-in middleware runtime, package.json invariato. |

**Ticket impact**:
- TKT-ECO-A2 (verify-only smoke) → SHIPPED via PR #2261 (no autonomous follow-up needed)
- TKT-ECO-C5 (audio binding) → ai-station Howler middleware preferred path (Web Audio direct sostituito da facade)
- TKT-ECO-B7 (promotions design decision) → CANCELLED (già confermato post L7c cross-validation 2026-05-13)

**Phase A status post-PR-2261**: 3/7 ticket Phase A shipped (A2 + ~equivalent A1 verify embedded in promote smoke + audio middleware). 4 ticket residue: A3 museum post-script (~0.5h), A4 sentience backfill (~5-6h), A5 bioma pressure (~3h), A6 starter_bioma (~3h), A7 pack drift (~2h) — **gated Envelope B confirm OD-024 + OD-031 master-dd**.

### 6.5 Envelope B SHIPPED — PR #2262 verification 2026-05-14

Master-dd ha shipped Envelope B bundle in [PR #2262](https://github.com/MasterDD-L34D/Game/pull/2262) (5 OD, 24/24 tests passing, ~17h delivery). Stato post-ship verify diff:

| OD | Shipped status | Claude verify findings |
|:---:|---|---|
| 031 | ✅ `tools/etl/merge_pack_v2_species.py` 201 LOC + `data/core/species/species_catalog.json` (649 LOC, 15 species, 10 Pack v2-plus + 5 stubs) | ⚠️ **Mating.yaml pack drift separato** — TKT-ECO-A7 originale era su `data/core/mating.yaml` (477 LOC) vs `packs/.../mating.yaml` (393 LOC) -84 LOC `gene_slots`. PR #2262 addressa species pack drift, NON mating pack drift. TKT-ECO-A7 RESTA PENDING. |
| 027 | ✅ `species_catalog.json` schema v0.2.0 single SOT (15 keys per entry: scientific_name + classification + functional_signature + visual_description + risk_profile + interactions + constraints + sentience_index + ecotypes + trait_refs + lifecycle_yaml + source + merged_at) | ⚠️ **SCHEMA FORK risk**: `data/core/species.yaml` (45 species canonical) **NON modificato** + nuovo `species_catalog.json` (15 species rich schema). Dual SOT temporaneo. 30 species in species.yaml NOT migrated. Governance question: catalog è eventual canonical e species.yaml deprecato, o coesistono? |
| 024 | ✅ Sentience 15/15 species T0-T3 (T0:2, T1:7, T2:4, T3:2) + 4 traits interocettivi shipped `active_effects.yaml` (propriocezione + equilibrio_vestibolare + nocicezione + termocezione) | ✅ **Scope clarification honest**: ai-station promised "45/45" ma 45 era da species.yaml legacy. PR delivery 15/15 species nel **nuovo catalog** è onesto subset post-OD-031 ETL (gli stessi 15 con `data/core/species/*_lifecycle.yaml`). I 30 species residue species.yaml senza lifecycle restano without sentience (TKT-ECO-A4 follow-up scope). |
| 029 | ✅ `data/core/ancestors/neurons_bridge.csv` 51 entries (vs 13 RFC v0.1 = 3.9× expansion). Branch coverage Senses 28 + Dexterity 9 + Ambulation 9 + Memorie 5. Tier T1-T6 complete | ✅ Expansion ai-station promised "13→50 Senses+Dexterity"; delivery 51 entries con 4 branch (Senses+Dexterity+Ambulation+Memorie) supera scope. Positive over-delivery. |
| 025-B2 | ✅ `data/core/promotions/promotions.yaml` v0.2.0 — 5-tier ladder (base→veteran→captain→**elite**→**master**) + `job_archetype_bias` schema anchor | ⚠️ **Engine Phase B3 reserved fields**: `defense_mod_bonus` (NEW Elite reward) + `crit_chance_bonus` (NEW Master reward) **shipped data schema MA engine `promotionEngine.js` non ancora consume** questi field. PR esplicito: "schema anchor only — engine extension Phase B3 reserved". Potenziale **Gate 5 anti-pattern Engine LIVE Surface DEAD** se Phase B3 deferred indefinito. Tracking: TKT-ECO-A7-NEW promotions engine extension Phase B3 (~3-4h, prima di Envelope C). |

**Ticket impact**:
- TKT-ECO-A4 (sentience backfill 45 specie) → PARTIAL via PR #2262 (15/15 lifecycle subset shipped). Follow-up 30 species residue species.yaml → ~3-4h ridotto (no Pack v2-plus rich data, solo heuristic baseline T1-T2)
- TKT-ECO-A7 (pack drift mating.yaml) → STILL PENDING (different scope from species pack)
- TKT-ECO-B3 (ancestors biome_pool seeder) → ENHANCED via PR #2262 neurons_bridge 51 entries (era 13 baseline)
- TKT-ECO-C4 (bridge species canonicalization) → MIGRATABLE PATH via species_catalog.json schema (es. bridge species come ecotypes entries)
- **NEW TKT-ECO-A8 (promotions engine Phase B3 extension)** — gated Envelope B post-merge, ~3-4h, consume NEW reward fields per Gate 5 closure

### 6.6 Cumulative session 2026-05-14 cross-stack — FINAL CLOSURE

| Channel | PR | Status | Effort | Tests | Concerns |
|---|---|:--:|---|:--:|---|
| Vault | PR #5 ai-station re-analisi | open | (design) | docs | — |
| Game/ | PR #2261 Envelope A (3 OD) | open mergeable_state:blocked | ~3h | 16/16 | OD-030 justification accuracy persistent (non blocker) |
| Game/ | PR #2262 Envelope B (5 OD) | open mergeable_state:blocked | ~17h | 24/24 | Schema fork + B3 reserved fields + mating drift |
| Godot v2 | PR #259 Envelope B cross-stack mirror | shipped 2026-05-14 | (Godot side) | 60/60 | (out-of-scope GitHub MCP) |
| Godot v2 | PR #260 Envelope C scaffold OD-026 | shipped 2026-05-14 | ~6h | 18/18 | TV diegetic + Phone overlay scaffold pre-asset |

**Cumulative tests cross-stack**: **118/118** ai-station Envelope A+B+C execution (16+24+60+18).

**Audit OD coverage**: **8/8 CLOSED** cross-stack (incluso OD-026 Atlas scaffold shipped Godot v2 #260).

### 6.7 Final closure declaration — master-dd 2026-05-14

> _"Pure-code autonomous Envelope A+B+C execution CLOSED end-to-end cross-stack"_

**8/8 OD audit PR #2260 ai-station re-analysis CLOSED** in single session 2026-05-14:

| OD | Status | Cross-stack channel |
|:--:|---|---|
| 024 Sentience full | ✅ | Game/ #2262 (15/15 lifecycle subset) |
| 025 Promotions REJECT framing | ✅ | Game/ #2261 smoke + audit correction |
| 025-B2 catalog +elite/+master | ✅ | Game/ #2262 schema + Godot v2 #259 FALLBACK_CONFIG |
| 026 Diegetic Atlas scaffold | ✅ | Godot v2 #260 (TV + Phone variants pre-asset) |
| 027 Species type + ecotypes | ✅ | Game/ #2262 catalog + Godot v2 #259 SpeciesCatalog Resource |
| 028 Howler middleware | ✅ | Game/ #2261 CDN opt-in |
| 029 neurons 13→51 | ✅ | Game/ #2262 + Godot v2 #259 NeuronsBridgeCatalog Resource |
| 030 flag-ON Game-Database | ✅ | Game/ #2261 default flip |
| 031 Pack merge | ✅ | Game/ #2262 ETL + species_catalog.json (species pack scope only, mating drift separate) |

### 6.8 Residual master-dd manual + Phase A autonomous

**Master-dd manual residue**:
1. Review + merge 5 PR aperti (vault #5 + Game/ #2261 + #2262 + Godot v2 #259 + #260)
2. Asset commission Wildermyth biome silhouettes (OD-026 visual polish post-scaffold)
3. Skiv pulse caller wire combat phase integration (~1-2h, ~1 PR)
4. Playtest #2 userland — 🟢-cand → 🟢 hard promotion P3+P4+P6

**Phase A residue autonomous** (3 governance questions Q1+Q2+Q3 still open, audit-derived, NOT addressed dal cross-stack closure):

| TKT | Effort | Gate | Status post-closure |
|:--:|:--:|---|---|
| A1 smoke mutations UI (L7b ≠ promotions) | 0.5h | autonomous | pending |
| A3 museum card M-007 post-script "FULL CLOSURE 2026-04-27" | 0.5h | autonomous | pending |
| A4 residue 30 species senza lifecycle (heuristic T1-T2) | ~3-4h | gated Q1 (schema fork resolve) | partial-shipped 15/45 via #2262 |
| A5 bioma diff_base + hazard pressure modifier | ~3h | autonomous | pending P6 driver |
| A6 starter_bioma trait definition | ~3h | autonomous | pending completionist |
| A7 mating.yaml pack drift (-84 LOC gene_slots) | ~2h | gated Q2 master-dd autonomous greenlight | pending (DIVERSO da OD-031 species pack) |
| ~~A8 NEW promotions engine Phase B3~~ | ~~~3-4h~~ | ~~gated Q3~~ | ✅ **SHIPPED via PR #2264** (`feat(ai-station): Phase B3 — PromotionEngine job_archetype_bias + vc_scoring sentience fold`) |

**Phase A residue total post-merge-cascade**: ~9-10h (era ~12-14h, **A8 shipped autonomously by master-dd via #2264**, riduce di ~3-4h).

### 6.9 Merge cascade 2026-05-14 sera — branch sync to main

Verifica `git log origin/claude/analyze-ecosystem-infrastructure-W4Lyf` 2026-05-14 sera:

| Commit  | PR    | Topic                                                                                          |
|---------|-------|------------------------------------------------------------------------------------------------|
| `f2244c8` | #2261 | Envelope A bundle OD-025 + OD-028 + OD-030 (3 OD shipped)                                      |
| `4c07c4d` | #2262 | Envelope B bundle OD-024 + OD-025-B2 + OD-027 + OD-029 + OD-031                                |
| `dee2e86` | #2263 | **fix(promotion): JS FALLBACK_CONFIG cross-stack parity drift** (OD-025-B2 follow-up parity)    |
| `ad6081b` | #2264 | **feat(ai-station): Phase B3 — PromotionEngine job_archetype_bias + vc_scoring sentience fold** |
| `1dcfbfa` | merge | Merge branch 'main' into claude/analyze-ecosystem-infrastructure-W4Lyf                          |

**Status post-cascade**:
- 4 PR merged to main (#2261 + #2262 + #2263 + #2264)
- Branch sync via merge commit (preserves audit + plan history on `claude/analyze-ecosystem-infrastructure-W4Lyf`)
- **TKT-ECO-A8 NEW PROMOTIONS ENGINE PHASE B3** (proposed reply [comment-4451508839](https://github.com/MasterDD-L34D/Game/pull/2260#issuecomment-4451508839) post-Envelope-B verification) → **SHIPPED via #2264** before I could ship it
- **#2263 proactive parity drift fix** — JS FALLBACK_CONFIG cross-stack parity caught by master-dd review (excellent CI/test discipline)
- Gate 5 anti-pattern Engine LIVE Surface DEAD risk **CLOSED** (#2264 consume new reward fields runtime)

**Pillar status post-cascade**:
- P3 Identità: 🟢-cand → **🟢 candidato HARD** (PromotionEngine elite+master + job_archetype_bias + sentience fold)
- P4 Temperamenti: 🟢-cand → **🟢 candidato HARD** (sentience 15/15 + 4 traits + 51 neurons + vc_scoring fold)
- 🟢 hard final promotion ancora gated Playtest #2 userland

**Note governance**: master-dd ha prioritizzato execution speed (8 OD shipped in 1 session) sopra dialog OD-by-OD. Legittima trade-off — direction "finish work, not conservative" applicata coerentemente. Residue 3 questions Phase A possono essere risolte retroactively o batched in nuovo OD aggregate.

### 6.7 Residual Phase A items (NOT covered Envelope A+B)

Items dal mio piano originale NON inclusi in PR #2261 + #2262:

- **TKT-ECO-A1** (smoke mutations UI) — pending, ~0.5h. **L7b mutations** ≠ promotions, smoke distinto richiesto
- **TKT-ECO-A3** (museum card M-007 post-script "FULL CLOSURE 2026-04-27") — pending, ~0.5h
- **TKT-ECO-A4 residue** — 30 species species.yaml senza lifecycle ancora senza sentience. ~3-4h ridotto
- **TKT-ECO-A5** (bioma diff_base + hazard pressure modifier) — pending, ~3h, **P6 driver**
- **TKT-ECO-A6** (starter_bioma trait definition) — pending, ~3h
- **TKT-ECO-A7** (mating.yaml pack drift -84 LOC) — pending, ~2h. **DIVERSO da OD-031 species pack drift**
- **TKT-ECO-A8 NEW** (promotions engine Phase B3 — consume defense_mod_bonus + crit_chance_bonus) — proposed, ~3-4h, **Gate 5 closure**

**Phase A residue effort**: ~12-14h totali. Possibile autonomous post-Envelope-merge.

---

## 7. ADR roster (3 nuovi ADR needed)

1. **ADR-2026-XX-worldgen-runtime-integration** — copre Phase C scope L2/L3/L4 wire. Gates TKT-ECO-C2, C3, C7.
2. **ADR-2026-XX-bridge-species-type** — decision species type. Gates TKT-ECO-C4.
3. **ADR-2026-XX-audio-pipeline** — Web Audio API decision + asset pipeline. Gates TKT-ECO-C5.

(Opzionale: **ADR-2026-XX-promotions-runtime** se Path Implement scelto per TKT-ECO-B7.)

---

## 8. Risk register

| Rischio                                                                                           | Probabilità | Impatto | Mitigazione                                                                   |
| ------------------------------------------------------------------------------------------------- | :---------: | :-----: | ----------------------------------------------------------------------------- |
| Sentience heuristic master-dd reject → riassegnazione manuale 45 species (~8h extra)              |     M       |    M    | Markup soft canonical pending review, draft prima di apply                    |
| Atlas mini-map D5 verdict diegetic → blast radius +50% (~9h vs 6h)                                |     M       |    L    | Default HUD overlay, escalate solo se master-dd preferenza                    |
| Foodweb Node-native port C2 scope creep → 15h → 25h                                               |     M       |    M    | ADR-2026-XX-worldgen scope minimal core (predator/prey/decomposer) only       |
| Bridge species ambiguity species/resource non risolta pre-promote                                 |     L       |    M    | ADR-2026-XX-bridge-species-type explicit + validator update                   |
| Audio binding pipeline asset license verify gap                                                   |     L       |    H    | Workflow doc esiste, 184GB CC0 100% license-classified — check pre-commit     |
| Game-Database OD-004 reopen drift Game ↔ Game-Database schema cross-stack                          |     M       |    M    | Status quo flag-OFF default mantenuto, defer Z3                               |
| Mating Ennea 9/9 vs `data/core/personality/enneagramma/` schema diverge                            |     M       |    M    | Use existing 9-canon source autoritativo, mating.yaml extends only            |
| Phase A TKT-ECO-A4 + A5 + A6 over-stack 1 dev day → bug rescue cycle                              |     M       |    L    | Verify-before-claim policy + smoke test per ticket prima di next               |
| **Explore agent sub-dir naming heuristic miss** (false negative L7c promotions 2026-05-13)        |     M       |    H    | Future audit: grep cross variant naming `*<topic>*` cross `services/*/` + import destrutturati |

---

## 9. Success metrics + smoke test sequence

### Quantitative

- **Pre-plan baseline (corrected 2026-05-13 sera)**: **4/11** strati 🟢 FULL WIRED (Mating, Forms, Skiv, **Promotions**).
- **Post Phase A target**: 6/11 (+L5 sentience, +L7b mutations verified).
- **Post Phase B target**: 9/11 (+L6 Ennea 9/9, +L7d sprite lifecycle, +L2 atlas, +L1 pressure).
- **Post Phase C target**: 11/11 (+L3 foodweb, +L4 cross-events runtime).
- **L7c Promotions**: ~~out-of-scope demolish~~ → ALREADY 🟢 WIRED. Verify-only smoke TKT-ECO-A2.

### Qualitative smoke test sequence (master-dd 60s gameplay)

Post Phase A:
1. ✅ Skiv info-panel mostra "T2-T3 — emergente"
2. ✅ Character creation mostra "Bioma origine: Badlands → trait Scavenger"
3. ✅ Cryosteppe encounter HP enemy +20% vs Foresta (sensorialmente diverso)
4. ✅ Mutation apply post-encounter visibile (overlay/log/debrief)

Post Phase B:
5. ✅ Mating roll preview Ennea modifier pre-confirm
6. ✅ Briefing panel mini-map 5×5 hex (1-3 illuminati post-scenario)
7. ✅ Skiv lifecycle transition T2 → T3 → sprite ASCII swap visibile
8. ✅ Encounter pool genera enemy con trait branch-coerente al bioma (ancestors seed)

Post Phase C:
9. ✅ Cross-event "Tempesta ferrosa attiva" telegraph + modifier visible
10. ✅ Ambient SFX bioma + jingle cross-event
11. ✅ Spawn enemy con role ecologico (predator high-stress, scavenger low-stress)
12. ✅ Player vede dipendenza cross-bioma in atlas

### AI sim baseline preservation

- AI 393/393 verde mantenere durante TUTTE le fasi
- Sweep aggressive vs new biome pressure: WR drop ≤ 10pp accettabile, > 10pp → rollback ticket
- Phase A Bioma pressure (TKT-ECO-A5): re-baseline N=40 × 3 profile

### Telemetry sanity (post TKT-ECO-B6)

- `recruit_success` event count > 0 in test session
- `mating_roll` distribution mostra 9 archetipi Ennea (post B1)
- `bioma_pressure_trigger` count correlato a difficoltà encounter

---

## 10. Provenance trail

- Audit report: [`docs/reports/2026-05-13-ecosystem-infrastructure-audit.md`](../reports/2026-05-13-ecosystem-infrastructure-audit.md)
- Museum gallery: [`docs/museum/galleries/worldgen.md`](../museum/galleries/worldgen.md)
- Museum cards consultate (10):
  - `worldgen-bioma-ecosistema-foodweb-network-stack` (5/5)
  - `worldgen-biome-as-gameplay-fiction-package` (5/5)
  - `worldgen-species-emergence-from-ecosystem` (4/5)
  - `worldgen-cross-bioma-events-propagation` (4/5)
  - `worldgen-bridge-species-network-glue` (3/5)
  - `worldgen-trophic-roles-validator-not-runtime` (4/5)
  - `worldgen-forme-mbti-as-evolutionary-seed` (4/5)
  - `mating_nido-engine-orphan` (5/5, NOW SUPERSEDED)
  - `ancestors-297-orphan-2026-05-10` (3/5)
  - `cognitive_traits-sentience-tiers-v1`
  - `narrative-disco-thought-cabinet-diegetic` (5/5)
  - `indie-loop-hero-minimap-visual-emergence` (3/5)
  - `creature-wildermyth-battle-scar-portrait`
  - `ui-itb-telegraph-deterministic`
  - `telemetry-duckdb-stockfish-llm-critic-quick-wins`
  - `enneagramma-dataset-9-types`
- OPEN_DECISIONS reference: OD-001 (FULL CLOSURE 2026-04-27), OD-004 (Game-Database flag-OFF), OD-008 (sentience scope), OD-009 (Ennea canonical), OD-010 (Skiv voice), OD-011 (ancestors)
- Cross-check: BACKLOG.md (trait orphan ASSIGN-A 35/91 shipped) + CLAUDE.md pillar reality post-2026-05-07 audit

**Token budget plan generation**: ~30k consumati (audit references + museum reads targeted + Explore agent prior + grep verify + Bash inspect).

---

## 11. Next action (post-plan-merge)

1. **Master-dd review** plan + verdict 8 OD entries (OD-024 → OD-031)
2. **Autonomous Phase A start** post-verdict OD-024 + OD-031 (sentience heuristic + pack drift policy)
3. **Phase A ETA**: 1.5 dev-day calendar (autonomous, no master-dd block per ticket A1/A2/A3/A5/A6/A7)
4. **Phase B kickoff**: post-Phase-A complete + master-dd verdict OD-025 + OD-026 + OD-029
5. **Phase C ADR drafting**: post-Phase-B evidence + Sprint dedicato approval (Sprint M14-C o Sprint Q+ ecosystem-wave candidate)

*Sabbia segue.*
