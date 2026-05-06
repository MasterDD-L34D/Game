---
title: 'World Gen Audit 2026-05-06 — pipeline canonical vs shipped + Q3 onboarding'
doc_status: active
doc_owner: pcg-level-design-illuminator
workstream: dataset-pack
last_verified: '2026-05-06'
source_of_truth: false
language: it-en
review_cycle_days: 30
tags: [pcg, world-gen, audit, onboarding, biome, ermes, aliena]
---

# World Gen Audit — 2026-05-06

**Trigger**: master-dd Q3 onboarding port — "come viene generato il mondo? mondo muta da scelta onboarding?"

**Scope**: tutti i layer world generation — biome selection, scenario seed, encounter scaffold, worldEnricher, ERMES, ALIENA, tri-sorgente/foodweb, mondo-muta hooks.

**Museum consulted first**: MUSEUM.md §worldgen — 6 card trovate (M-2026-04-26-012 score 5/5, M-2026-04-26-018 score 5/5 + 4 correlate). Provenance verificata.

---

## Canonical vision (doc)

SoT §3 (`docs/core/00-SOURCE-OF-TRUTH.md:110-169`) e GDD MASTER §3 dichiarano:

> "Il mondo non è modellato come semplice elenco di mappe. È una **rete di ecosistemi collegati** con regole ecologiche, propagazioni e validatori."

**Formula canonica**: `bioma → ecosistema → foodweb → specie/ruoli → network fra biomi → eventi propagati → encounter e pressioni di gioco`

**4 livelli** attesi:

| Livello | Fonte dati | Contenuto |
|---------|-----------|-----------|
| L1 Bioma | `data/core/biomes.yaml` (30+ biomi) | difficulty, affixes, hazard, StressWave, npc_archetypes, tono, hooks |
| L2 Ecosistema | `packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml` (5 file) | struttura trofica, link specie, link foodweb, ruoli minimi |
| L3 Meta-network | `packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml` | 5 nodi, 12 edge tipizzati, bridge_species_map |
| L4 Cross-eventi | `packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml` | 3 eventi propagati fra biomi con effetti gameplay |

**Onboarding canonical** (`docs/core/51-ONBOARDING-60S.md`): scelta identitaria 60s (opzione A/B/C) → trait permanente shared branco. Nessun piano esplicito che questa scelta influenzi *selezione bioma* o *scenario seed*. La scelta è **puramente trait-assegnazione**, non world-gen.

**ERMES canonical**: eco-pressure framework (prototype lab `prototypes/ermes_lab/`). Vision: pressione ecologica dinamica per bioma. Deliverable spec: `eco_pressure_score` + `bias` + `role_gap`.

**ALIENA canonical**: coherence framework invisibile. Produce `aliena_summary_it` player-facing, deterministico per bioma (template_v1) o LLM-driven (Phase B).

---

## Shipped runtime

### Layer 1 — Biome selection

**Shipped**: bioma selezionato via `confirmWorld({ biomeId })` in `coopOrchestrator.js:257`. Caller (Godot `world_setup_state.gd` o host WS intent) passa `biome_id` hardcoded o da lista statica. **Nessuna logica PCG** di selezione bioma nel backend — il biome_id è sempre un input esterno.

`biomeAdapter.js` consuma `data/core/biomes.yaml` → produce shape W5:
```
{ biome_id, biome_label_it, pressure, hazards }
```
Consuma di biomes.yaml: `diff_base`, `hazard.severity` (→ pressure bucket), `hazard.description`, `affixes` (→ hazards list), `display_name_it`. **NON consuma**: `StressWave`, `hazard.stress_modifiers`, `npc_archetypes`, `narrative.hooks`.

### Layer 2 — World enrichment

**Shipped**: `worldEnricher.js:enrichWorld()` — pure function con 4 service injection:

| Service | Input from | Output |
|---------|-----------|--------|
| biomeAdapter | biomeId | `world: {biome_id, pressure, hazards}` |
| ermesExporter | biomeId, party[] | `ermes: {eco_pressure_score, bias, role_gap}` |
| alienaGenerator | biomeId | `aliena_summary_it`, `aliena_version` |
| companionPicker | biomeId, formAxes, runSeed, trainerCanonical | `custode: {display_name, species_id, voice_it, ...}` |

**formAxes** (party MBTI `{T,F,N,S}`) passa a `companionPicker` — influenza solo selezione Custode, NON bioma né scenario.

**`onboardingChoice`** (`{option_key, trait_id}`) è stored in `coopOrchestrator.onboardingChoice` ma **NON viene passato a `enrichWorld()`** né a `confirmWorld()`. Il `confirmWorld()` riceve `{scenarioId, biomeId, formAxes, runSeed, trainerCanonical}` — nessun campo `onboardingTrait` o `onboardingChoice`.

### Layer 3 — ERMES

**Shipped** (partial): `ermesExporter.js` legge `prototypes/ermes_lab/outputs/latest_eco_pressure_report.json` se esiste, altrimenti usa `STATIC_FALLBACKS` per 5 biomi (savana, caverna, atollo_obsidiana, foresta_temperata, badlands). `computeRoleGap(party, biomeId)` shipped W5.5: compara `job_id` della party vs `BIOME_ROLE_DEMANDS` hardcoded per 12 biomi.

ERMES lab prototype (`prototypes/ermes_lab/`) è **isolato** — non eseguito a runtime durante sessione. Report JSON è generato offline (manuale o CI).

### Layer 4 — Tri-sorgente / foodweb / meta-network

**NON shipped a runtime**. Dati esistono e validano (`ecosistema.schema.v2.0.yaml` OK), ma zero consumer runtime. `biomeSpawnBias.js` (unico consumer) legge solo `affixes` da biomes.yaml, non i file ecosistema L2-L4.

### Layer 5 — Scenario seed / encounter scaffold

**Shipped**: scenario stack hardcoded in `startRun()` / `startOnboarding()` come `['enc_tutorial_01']` default, oppure passato da caller. `default_campaign_mvp.yaml` definisce sequenza fissa di encounter ID (`enc_tutorial_01` → `enc_tutorial_02` → ... → `enc_tutorial_06_hardcore`). **Nessun seed deviation PCG** — encounter stack è una lista ordinata hand-crafted.

### Layer 6 — Onboarding → campaign

**Shipped**: `POST /api/campaign/start` accetta `initial_trait_choice` (`option_a|b|c`) → `campaignLoader.resolveOnboardingTrait()` → `trait_id` → salvato in `campaign.acquiredTraits[]`. Trait viene applicato al roster. Funziona via campaign route (REST). Via coop route (`coopOrchestrator`): `submitOnboardingChoice()` → `this.onboardingChoice = {...}` ma non propagato a `enrichWorld` (vedi gap GAP-003).

---

## Drift matrix

| Layer | Canonical doc | Shipped runtime | Severity |
|-------|--------------|-----------------|----------|
| L1 Bioma — selezione | Non specificata (PCG vs hand?) | External input da caller (host/Godot) — zero backend logic | MEDIUM — nessun algoritmo selezione, bioma dipende da UI |
| L1 Bioma — package consumption | 7/7 campi usati (diff, affixes, hazard, StressWave, npc, tono, hooks) | 2/7 campi usati (affixes, hazard.severity/description) | HIGH — 5 campi caricati ma ignorati |
| L2 Ecosistema | Struttura trofica influenza spawn pool | Zero consumo runtime | HIGH — dati validi, zero wire |
| L3 Meta-network | Biomi non isolati, eventi cross-bioma | Zero consumo runtime | HIGH — zero wire |
| L4 Cross-eventi | 3 eventi propagati con effetti gameplay | Zero consumo runtime | HIGH — zero wire |
| ERMES | Pressione ecologica dinamica real-time | File-based fallback statico (5 biomi), prototype isolato | MEDIUM — funziona ma non dinamico |
| ALIENA | LLM-driven Phase B | Template statico `template_v1` (deterministic per biome) | LOW — degraded mode accettato MVP |
| Onboarding → trait | Trait permanente shared branco (OK) | Shipped via `/api/campaign/start` + `onboardingChoice` in orchestrator | OK (MVP compliant) |
| Onboarding → world muta | **Non specificata canonical** | **Non implementata** — onboardingChoice non passa a enrichWorld | GAP-003 (vedi Q3) |
| Scenario seed deviation | Non specificata canonical | Non implementata — encounter stack fisso | N/A — non in scope MVP |
| PCG mission grammar | Deferred (M10+ spec) | Non implementata | OK — fuori MVP |
| Foodweb runtime | Influenza encounter e bilancio | Zero runtime | HIGH — dati completi, zero wire |

---

## Q3 answer — "Come canonical vorrebbe il mondo muta da scelta onboarding?"

### Verdetto

**Opzione E — MONDO STATICO. La scelta onboarding NON muta il mondo nel MVP canonical.**

Analisi delle 5 opzioni:

| Opzione | Canonical spec dice? | Shipped? | Verdict |
|---------|---------------------|----------|---------|
| A: biome forced da onboarding | No — scelta = trait solo | No | NON canonical |
| B: seed deviation PCG | No — encounter stack fisso | No | NON canonical |
| C: encounter variant select | No — stack fisso, no varianti | No | NON canonical |
| D: enrichWorld riceve onboarding payload + branches | No spec esplicita — GAP identificato | No | PENDENTE (vedi sotto) |
| E: mondo statico, onboarding = trait only | Sì — canonical doc 51-ONBOARDING-60S.md §Impact runtime dice "acquiredTraits[]" solo | Parzialmente (REST) | CANONICAL MVP |

**Rationale**: `docs/core/51-ONBOARDING-60S.md` §Impact runtime è esplicito:

> "Scelta salvata in `PartyRoster.acquired_traits[]` pre-session via `/api/campaign/start` body field `initial_trait_choice`"
> "Trait applicato a TUTTI i PG del roster (identità condivisa di branco, non singolo)"

Nessuna menzione di modifica biome_id, scenario seed, enrichedWorld, o ERMES pressure. Quindi **la scelta onboarding cambia il BRANCO (trait permanente), non il MONDO**.

### Il mondo come muta (via canonical)?

Il mondo muta per fattori ortogonali alla scelta onboarding:

1. **Bioma selezionato** (da host a world_setup phase) → `enrichWorld(biomeId)` → `world.pressure`, `ermes.eco_pressure_score`, `aliena_summary_it`, `custode` diversi per bioma.
2. **Party composition** → `ermes.role_gap` (se party ha job mancanti per bioma richiesto).
3. **runSeed** → `custode` deterministico ma diverso per seed.
4. **Branch story** (cave_path vs ruins_path in Act 1) → encounter diversi, narrative diversa.

La scelta onboarding non tocca nessuno di questi 4 assi.

### GAP-003 — Architectural opportunity (non regression)

Un collegamento **non-canonical ma sensato design** esiste come gap aperto: l'`onboardingChoice.trait_id` (`zampe_a_molla` = mobilità, `pelle_elastomera` = difesa, `denti_seghettati` = bleeding) potrebbe influenzare il bioma suggerito o l'ALIENA summary. Esempio:

- Scelta A (veloce) → ALIENA tende a biomi aperti (savana, pianura) → formAxes con N alto
- Scelta C (letale) → ERMES eco_pressure_score alto → bioma ad alta pressione

Effort stimato per implementare questo bridge: ~3-4h (Minimal path).

**Raccomandazione**: non implementare ora (fuori MVP scope). Documentare come OD candidate. Se master-dd vuole "mondo muta da onboarding", serve ADR esplicita e design decision su quale asse muta (biome suggestion / ALIENA tone / ERMES bias).

---

## Design space matrix — worldgen axes

| Asse | Variazione possibile | Coverage shipped | Coverage doc |
|------|---------------------|-----------------|--------------|
| Bioma selection | 30+ biomi in biomes.yaml | External input, no PCG | No PCG spec |
| Bioma package depth | 7 campi (diff/hazard/StressWave/npc/tono) | 2/7 | Full (SoT §3) |
| Ecosistema L2 | 5 file ecosystem.yaml | 0/5 | Full (SoT §3) |
| Meta-network L3 | 12 edge, 5 nodi | 0 | Full (SoT §3) |
| Cross-eventi L4 | 3 eventi propagati | 0 | Full (SoT §3) |
| ERMES eco-pressure | Dynamic float [0,1] per bioma | Static fallback only | Spec completo |
| ALIENA summary | LLM-generated (Phase B) | Template_v1 (13 biomi) | Phase B deferred OK |
| Onboarding → trait | 3 opzioni × 3 trait | Shipped REST + Orchestrator | OK canonical |
| Onboarding → world | Non specced | Non shipped | GAP-003 (opportunity) |
| Scenario seed PCG | Non specced (ITB hand-made pattern) | Hand stack | N/A MVP |
| formAxes → world | MBTI party → Custode | Shipped (companionPicker) | Partial |
| Campaign branching | 1 binary choice Act 1 | Shipped | OK |

---

## PCG pattern assessment per gap

### Gap principale: L2-L4 ecosystem zero runtime

**Pattern raccomandato**: P0 — **ITB hand-made + random elements** (NON full PCG).

- Livelli L2/L4 hanno dati eccellenti ma WFC o grammar sarebbero overkill per 5-12 biomi.
- Minima effort: estendere `biomeSpawnBias.js` per leggere `role_templates` da `biome_pools.json` (già 489 righe, commit 2025-10-29). Museum card M-2026-04-26-012 stima ~3h minimal.
- Non serve PCG engine — serve solo un loader service che esponga L2 come spawn constraint.

**Anti-pattern**: NON wirare L3 meta-network runtime senza ADR. Bridge species (`echo-wing`, `ferrocolonia-magnetotattica`) non in `data/core/species.yaml` — conflict non risolto.

### Gap: bioma selection no logic

**Pattern raccomandato**: P1 — **Pathfinder XP budget** adattato: seleziona bioma in base a `party.level` (APL) + `campaign.currentChapter`. Deterministico, no randomness.

- Effort: ~2h (lookup table `chapter_idx → biome_id_pool`, host sceglie da pool ristretto).
- Oppure: campaign YAML aggiunge `biome_id` per ogni encounter entry (hand-crafted, ITB-style).

### Gap: ERMES non dinamico

**Pattern raccomandato**: P2 — wire `prototypes/ermes_lab/` come service chiamato a `confirmWorld()` invece di file-based read. Effort: ~4-6h (prototype → service extraction). Blocked finché master-dd decide se ERMES deve essere real-time o batch.

---

## Open architectural questions (per master-dd)

**Q1** — **Biome selection locus**: Chi decide `biome_id` a runtime? Oggi = host phone o Godot WorldSetupState. Vuoi che campaign YAML specifichi bioma per encounter, oppure host vota/sceglie liberamente?

**Q2** — **Onboarding → world bridge**: Vuoi che la scelta onboarding influenzi qualcosa nel mondo (bioma suggerito, ALIENA tone, ERMES bias)? Attualmente NO per spec canonical. Se sì → ADR + design decision.

**Q3 (resolved)** — Il mondo NON muta da onboarding nel canonical MVP. Scelta = trait branco only.

**Q4** — **L2 ecosistema rollout priority**: I 5 file ecosystem.yaml sono completi e validati. Wire minimal (spawn role_templates) è ~3h. È P0 per prossimo sprint?

**Q5** — **StressWave naming clash**: `biomes.yaml` usa `stresswave.baseline` (vedi `abisso_vulcanico`), session engine usa `pressure`. Stessa cosa? Serve ADR per unificare naming prima del wire.

**Q6** — **ERMES real-time vs batch**: Prototype lab genera report offline. Vuoi eco_pressure_score calcolato live a ogni `confirmWorld()` o pre-generato batch e file-read? Impatto su latenza world_setup phase.

---

## Proposed tickets

```
TKT-P1-BIOME-PACKAGE-WIRE: 3h — estendi biomeSpawnBias.js per leggere
  role_templates da biome_pools.json (Minimal path museum M-2026-04-26-012)

TKT-P1-STRESSWAVE-ADR: 1h — ADR unifica naming StressWave (biomes.yaml)
  vs pressure (session engine) prima del wire StressWave baseline

TKT-P1-CAMPAIGN-BIOME-EXPLICIT: 2h — aggiunge biome_id field per ogni
  encounter entry in default_campaign_mvp.yaml (ITB hand-made pattern,
  elimina ambiguità host-input)

TKT-P6-ERMES-REALTIME: 5h — estrai prototypes/ermes_lab come service
  injectable in ermesExporter (replace file-based read con compute live)

TKT-P2-ONBOARDING-WORLD-BRIDGE: 3h (conditional, requires ADR) — passa
  onboardingChoice.trait_id a enrichWorld, branch ALIENA summary tone +
  ERMES bias per opzione identitaria (Opzione D implementazione)
```

---

## Sources

- `docs/core/00-SOURCE-OF-TRUTH.md:110-169` — worldgen canonical 4-livelli
- `docs/core/00-GDD_MASTER.md §3` — 4 livelli ecologici + onboarding spec
- `docs/core/51-ONBOARDING-60S.md` — scelta identitaria canonical, impact runtime esplicito
- `data/core/campaign/default_campaign_mvp.yaml` — scenario stack, onboarding YAML
- `apps/backend/services/coop/worldEnricher.js` — enrichWorld() pure fn
- `apps/backend/services/coop/coopOrchestrator.js` — phase machine, confirmWorld(), submitOnboardingChoice()
- `apps/backend/services/coop/biomeAdapter.js` — biome package consumer (2/7 fields)
- `apps/backend/services/coop/ermesExporter.js` — eco_pressure static fallback
- `apps/backend/services/coop/alienaGenerator.js` — template_v1 static summaries
- `apps/backend/routes/campaign.js` — /campaign/start initial_trait_choice handler
- `data/core/biomes.yaml` — 30+ biomi, 7 field structure (2 consumed)
- Museum cards: M-2026-04-26-012 (worldgen 4-livelli, score 5/5), M-2026-04-26-018 (biome package, score 5/5)
- PCG pattern sources: ITB hand-made (P0), Pathfinder XP budget (P1) — per recommendation rationale
