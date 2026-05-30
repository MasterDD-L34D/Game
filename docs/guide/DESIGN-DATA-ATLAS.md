---
title: 'Evo-Tactics Design-Data Atlas — master index 8 sistemi (cross-referenced)'
workstream: cross-cutting
category: guide
doc_status: active
doc_owner: claude-code
last_verified: '2026-05-30'
source_of_truth: false
language: it
review_cycle_days: 60
tags:
  [
    atlas,
    design-data,
    index,
    ecosystems,
    creatures,
    species,
    traits,
    jobs,
    mbti,
    ennea,
    abilities,
    lore,
    cross-reference,
  ]
---

# Evo-Tactics Design-Data Atlas

> **Scope**: indice unico cross-referenziato degli 8 sistemi di contenuto del gioco
> (ecosistemi · creature · specie · trait · job · rete MBTI/Ennea · abilita/capacita ·
> lore/campagna). Per ogni sistema: dove vive il dato (path + conteggi), recap di
> cosa fa + perche creato, e gap (cosa manca + a cosa servirebbe).
>
> **NON e la SoT del dato** (quella sono i file dati). E la **mappa navigabile** +
> il cross-reference + lo stato di wiring. Catalogo-giochi-fonte = doc separato
> [`games-source-index.md`](games-source-index.md); questo = catalogo-contenuto.
>
> **Metodo**: 8 inventory-sweep paralleli 2026-05-30 (ground-truth da file/conteggi).
> Numeri verificati su disco; dove diversi tra fonti = drift segnalato (vedi §0.3).

---

## 0. Meta-findings (5 pattern cross-cutting)

Emergono da TUTTI gli 8 sistemi. Sono la diagnosi reale dello stato design-data.

### 0.1 Engine-LIVE / Surface-DEAD (la malattia dominante)

Molti sistemi sono **costruiti ma non collegati al player**. Conferme cross-sistema:
mating engine (shipped, poi wired #1876+), morale.js / cumulativeStateTracker.js /
woundedPerma.js (combat orphan, BACKLOG TKT-ORPHAN-\*), ennea voice (796 righe +
endpoint, **zero frontend consumer**), dialogue-colors MBTI (helper shipped, pipeline
non auto-wired), worldgen GAP-A/B (appena chiusi #2447). Leva piu alta = wirare il
surface, non costruire nuovo engine.

### 0.2 Data-rich / runtime-thin

Dato vastissimo, frazione wired: **5/38** biomi con ecosystem.yaml completo; **502/606**
trait con meccanica; **15/53** specie con lifecycle YAML; **32/53** specie senza
biome_affinity; **1211** creature Pathfinder importate ma **0 integrate** nei foodweb;
**24** passive-tag job-expansion senza handler (Phase C).

### 0.3 Catalog drift (conteggi non allineati tra fonti)

glossary 606 vs active_effects 502 (104 senza meccanica); tassonomia trait doc dice 57
famiglie, dato reale 106; species roster "45" (stale) vs **53** reale (species_catalog
v0.4.1); ennea schema 3 vs 6 vs 9 archetipi (ora 9/9). Sintomo: i tracker laggano lo
shipped (anti-pattern #19 ricorrente).

### 0.4 MBTI/Ennea = la spina dorsale connettiva

Il sistema personalita e il tessuto che lega tutto: VC-axes -> MBTI form -> job affinity

- pack + starter-biome + innata-trait; MBTI/Ennea -> mutation alignment + mating compat
- narrative voice. Toccare qui ha blast-radius su 4+ sistemi.

### 0.5 Lore greenfield sopra L1 (gated da AI-playtest)

Modello DF L0-L5: L0 (eventi) + L1 (identita) shipped; L2 (memoria-mondo = SistemaState)
parziale; L3 (artefatti/codex) + L4 (narrativa surface) + L5 ("losing is fun") greenfield.
Premessa macro DRAFT, non ancora canon in docs/core. Gate = playtest AI-driven canonico.

---

## 1. ECOSISTEMI

| Cosa                              | Conteggio                | Path                                                                                                                               |
| --------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Biomi definiti                    | **38**                   | `data/core/biomes.yaml`                                                                                                            |
| Ecosystem.yaml completi (trofico) | **5**                    | `packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml` (badlands, cryosteppe, deserto_caldo, foresta_temperata, rovine_planari) |
| Foodweb.yaml                      | 5                        | `packs/.../data/foodwebs/*_foodweb.yaml`                                                                                           |
| Meta-network                      | 5 nodi / 11 archi        | `packs/.../ecosystems/network/meta_network_alpha.yaml`                                                                             |
| Cross-events                      | 3 (autumn/summer/winter) | `packs/.../ecosystems/network/cross_events.yaml`                                                                                   |
| Consumer runtime                  | 6 servizi                | foodwebFilter · ecosystemResolver · crossEventEngine · biomeResonance · biomeSpawnBias · reinforcementSpawner                      |

**Recap**: ogni ecosistema definisce gerarchia trofica (produttori/consumatori/decompositori)
-> `species_all`. Runtime (appena wired #2447): foodwebFilter filtra il pool spawn al
foodweb del bioma (whitelist Caves-of-Qud, band-safe fallback); crossEventEngine applica
pressure flat stagionale (Rimworld-offset). biomeResonance (affinita = sconto ricerca) +
biomeSpawnBias (peso spawn da affix) gia live. **Perche**: chiudere Engine-LIVE/Surface-DEAD
del worldgen (dato c'era, nessun consumer).

**Gap**: **33/38 biomi data-only** (no ecosystem.yaml -> foodwebFilter passthrough). Meta-network
copre solo 5 nodi (GAP-C routing campagna = post-MVP, Dormans grammar). Cross-events solo 3.
Servirebbe: generare ecosystem.yaml per top biomi (stratosfera/palude/atollo/frattura...) +
espandere network. Vedi BACKLOG TKT-WORLDGEN-GAPC.

---

## 2. CREATURE (storiche · inserite · dimenticate · importate)

| Status                  | Conteggio                                   | Path                                                                                        | Integrazione                            |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------- |
| Canonical inserite      | **53**                                      | `data/core/species/species_catalog.json` (v0.4.1)                                           | live                                    |
| Pathfinder 1e import    | **1211**                                    | `data/external/pathfinder_bestiary_1e.json` + `tools/importers/pathfinder_bestiary.py`      | ingerite, **NON integrate** nei foodweb |
| Pack public roster      | 21                                          | `docs/evo-tactics-pack/species-index.json`                                                  | live (player-facing, subset)            |
| Ancestors (dimenticate) | ~297 promesse (34 recuperate)               | `docs/museum/excavations/2026-04-25-ancestors-inventory.md` + `reports/incoming/ancestors/` | parziale                                |
| Deprecated legacy       | 53                                          | `docs/archive/historical-snapshots/2026-05-15_species-deprecation/`                         | snapshot only                           |
| Swarm-distilled         | ~50 (8 hallucinated + 2 redundant scartate) | `docs/museum/cards/evo-swarm-run-5-discarded-claims.md`                                     | dormant/archive                         |

**Recap**: la creatura canonica vive in `species_catalog.json` (53, merge pack-v2 + stub +
legacy). Il **Pathfinder bestiary** (1211 normalizzate su 9 assi trait + genetic_traits +
visual + biology IT) e il serbatoio per popolare encounter/ecosistemi — le specie di
`rovine_planari` SONO Pathfinder-translated (treant-portale, bulette-fase, balor-fission...).
**Perche Pathfinder**: evitare design-fatigue, seed taxonomico per biomi.

**Gap (le "dimenticate")**: Pathfinder 1211 = **0 integrate** nei foodweb canonici (servirebbe
pass designer per seedare 30-50/bioma). Ancestors: 263/297 neuronal branch persi (binari temp
non persistiti). Servirebbero come bridge trait-reaction (counter/intercept/parry) in
active_effects. Swarm = training-set anti-hallucination (OD-022), non revive.

---

## 3. SPECIE (sistema canonico: schema, lifecycle, sentience, clade)

| Cosa                 | Valore                                                                |
| -------------------- | --------------------------------------------------------------------- |
| Roster canonico      | **53** (`species_catalog.json` v0.4.1)                                |
| Con lifecycle YAML   | **15** (dune_stalker=Skiv exemplar, leviatano_risonante, ecc.)        |
| Senza lifecycle      | 38 (gap 72%)                                                          |
| Senza biome_affinity | 32/53 (60%)                                                           |
| Sentience T0-T6      | T0:1 T1:22 T2:16 T3:6 T4:5 T5:3 **T6:0**                              |
| Clade                | Threat 13 · Keystone 11 · Bridge 10 · Apex 7 · Playable 7 · Support 5 |

**Recap**: specie = record ricco (genus/epithet, clade*tag, sentience_index T0-T6, biome_affinity,
trait_plan core/optional, default_parts). Naming bilingue stratificato (id sp*\* / slug / display
IT+EN / legacy_slug), regole fonotattiche (ferro-xeno vs bio-liminale), valid pipeline + A.L.I.E.N.A.
semantic check. Sentience canonical in `README_SENTIENCE.md`. Sync verso Game-Database CMS
(`npm run evo:import`). **Perche**: tassonomia coerente + tracciabile, identita specie x job.

**Gap**: **38/53 senza lifecycle YAML** (no phase-gating/aspect/diary; tool stub `seed_lifecycle_stubs.py`
pronto, OD-008 = backfill incrementale). **32/53 senza biome_affinity** (sp\_\* stub mai assegnati ->
ecosystem/spawn incompleto). T6 vuoto. ecology/pack_size null. Servirebbe: assegnazione biome
(heuristic Phase-3 ADR-2026-05-15) + lifecycle backfill.

---

## 4. TRAIT

| Sorgente                                        | Conteggio                               | Ruolo                                                      |
| ----------------------------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| `glossary.json`                                 | **606** ID (297 ancestor + 309 regular) | registro label/descrizione (SoT label)                     |
| `active_effects.yaml`                           | **502** wired (104 senza meccanica)     | meccaniche runtime (trigger+effect, tier T1-T3)            |
| ancestors (`ancestors_rename_proposal_v2.yaml`) | 297 (18 branch, 290 wired)              | provenienza + branch taxonomy + CC attribution             |
| `data/traits/index.json`                        | 254 full-metadata                       | slot/famiglia/sinergie/cost/metrics                        |
| `mutation_catalog.yaml`                         | **36** mutazioni                        | trait-swap T2+ (aspect_token, mbti_alignment, biome boost) |
| `trait_environmental_costs.yaml`                | 4 trait x 3 biomi = 12                  | pilot biome-cost (M11)                                     |
| famiglie tassonomia                             | doc 57 / reale **106**                  | clustering balance/UI                                      |

**Recap**: sistema multi-layer — descrittivo (glossary) disaccoppiato da meccanico (active_effects),

- tassonomia famiglie, + interazione bioma, + evoluzione (mutation trait-swap), + ancestry (297 da
  Ancestors:Humankind con attribution per-riga). i18n via sync workflow. **Perche**: codex genetico
  modulare, biome-aware, evolutivo, localizzabile, legalmente pulito.

**Gap**: **104 trait in glossary senza meccanica** (silent no-op a runtime); 18 branch ancestors
non consumati (servirebbero per biome-pool seeder ~3h); tassonomia doc stale (57 vs 106);
env-costs solo pilot 12 celle (M12+ post-playtest); mutazioni solo per ancestor/T1->T2 (no path
per trait regolari). Drift glossary<->active_effects = il rischio principale.

---

## 5. JOB

| Cosa          | Valore                                                              |
| ------------- | ------------------------------------------------------------------- |
| Job           | **11** (7 base + 4 expansion)                                       |
| Base          | skirmisher, vanguard, warden, artificer, invoker, ranger, harvester |
| Expansion     | stalker, symbiont, beastmaster, aberrant                            |
| Perk          | **132** (84 base + 48 expansion) — 6 livelli x 2 perk/job           |
| Abilita job   | 55 (11x5: R1x2/R2/R3/R4) + ~36 trait_native + ~39 trait_abilities   |
| Resource pool | 6 (PP · PT · SG · PI · PE · Seed)                                   |
| Design doc    | `docs/planning/2026-04-25-jobs-expansion-design.md`                 |

**Recap**: framework classe tattico (XCOM2-heritage): role + economia-risorse + signature-pattern +
progressione (7 livelli, 6 scelte perk, hybrid-path Skiv 5PI@50%) + synergy-matrix + MBTI-mapping.
progressionEngine.js (M13.P3) gestisce XP/level/perk/effectiveStats. `trait_native` pseudo-job =
abilita derivate da trait. **Perche**: profondita squad-RPG + replayability + leggibilita ruoli.

**Gap**: **24 passive-tag expansion senza handler** (Phase C ~12h: apex_first_strike, dual_bond,
minion_resurrect, perfect_mutation...). **SPECIES_BY_JOB mapping mancante** (quale specie sblocca
quali job — servirebbe `species_job_affinity.yaml`). Job-picker UI expansion mancante. Form-evolution
MBTI->job = concept non wired (M15).

---

## 6. RETE MBTI + ENNEA

| Componente      | Conteggio           | Stato                                               |
| --------------- | ------------------- | --------------------------------------------------- |
| MBTI forms      | 16                  | `mbti_forms.yaml`, wired (form-evolution euclidean) |
| VC axes         | 4 (E_I/S_N/T_F/J_P) | `vcScoring.js`, iter2 opt-in                        |
| Ennea types     | 9 canonical         | `enneagramma_master.yaml` (+ wings/triadi/varianti) |
| enneaEffects    | 9/9 archetipi       | wired (buff/debuff end-round)                       |
| Ennea voice     | 9x7 = 796 righe     | endpoint live, **0 frontend**                       |
| Thought Cabinet | 18 thought (3 assi) | wired (T_F escluso by-design)                       |
| Inner Voices    | 24                  | wired                                               |
| File totali     | ~80                 | core+data+test+docs                                 |

**Recap**: doppio-asse personalita. Telemetria (VC) -> 4 MBTI axes + 9 Ennea archetipi -> form
classification -> job/pack/biome bias + innata-trait; Ennea -> combat effect + voce diegetica.
Surface: phased-reveal (Disco Elysium), conviction badge (Triangle Strategy), Thought Cabinet
(internalizzazione), Inner Voice. **Perche**: "come giochi modella cio che diventi" (P4 pilastro) —
personalita emergente dal gameplay, non scelta menu.

**Gap (P4 = 🟡++, non 🟢)**: backend 95%, **surface 60%**. Ennea-voice endpoint = dead surface (P0,
~4h FE). Dialogue-colors non auto-wired (P1, ~2h). T_F senza thought (gap narrativo). iter2 non-default.
Mating MBTI-compat senza gating (TKT-P4-MBTI-003). Ennea master dataset (9 tipi) caricato ma non
consumato runtime. Mechanics-registry (16 hook) template-only.

---

## 7. ABILITA + CAPACITA

| Cosa           | Valore                                                            |
| -------------- | ----------------------------------------------------------------- |
| Effect-type    | **18/18** implementati (`abilityExecutor.js`)                     |
| Abilita uniche | ~75 job (55 core + 20 R3/R4) / ~171 con trait-derived             |
| Servizi combat | **34** (`apps/backend/services/combat/`) — 30 wired, **4 orphan** |
| Status effect  | 12 live + 3 roadmap                                               |

**Servizi orphan (BACKLOG TKT-ORPHAN-\*)**: `morale.js` (shipped #1959, mai wired a roundOrchestrator) ·
`cumulativeStateTracker.js` (Phase-7 TODO, 0 caller) · `woundedPerma.js` (write-path morto, read live) ·
`vcSnapshotToDebriefPayload.js` (test-only, Godot mirror).

**Recap**: ogni abilita risolve via 1 di 18 executor (move_attack, drain_attack, surge_aoe, reaction...);
channel-aware (resistanceEngine). 34 servizi orchestrano: modificatori attacco (elevation/archetype/
time-of-day/biome/defender-adv), tattiche (pin/bravado/interrupt/defy), status (decay loop universale),
resistenza, reveal (echo/telepatic), ecosistema. **Perche**: modulare/componibile/estensibile via dato
(nuova abilita = entry YAML, no codice) + seed-RNG per playtest deterministico (#2448).

**Gap**: 4 orphan da wire-or-remove (morale P6 = il piu impattante). terrainReactions = helper senza
tile-state consumer (POST-MVP). synergyDetector = logging-only (no delta gameplay). 29 abilita ancora
"damage/apply_status" legacy (da migrare a effect_type proprio).

---

## 8. LORE + STORIA CAMPAGNA

| Artefatto                           | Path                                               | Canon                            |
| ----------------------------------- | -------------------------------------------------- | -------------------------------- |
| Premessa macro (Il Sistema)         | `docs/planning/draft-narrative-lore.md`            | **DRAFT** (non ancora docs/core) |
| Arco flagship Frattura/Leviatano    | `docs/biomes/Frattura_Abissale_Sinaptica_lore.md`  | DRAFT (Step 2)                   |
| A.L.I.E.N.A. (metodo design specie) | `docs/appendici/ALIENA_documento_integrato.md`     | active                           |
| Campagna MVP                        | `data/core/campaign/default_campaign_mvp.yaml`     | canonical (2 atti)               |
| Campaign engine                     | `apps/backend/services/campaign/campaignEngine.js` | live                             |
| SistemaState (memoria AI)           | `sistemaStateStore.js` + ADR-2026-05-18-sistema    | Option B shipped (L2 parziale)   |
| Narrative engine (ink/QBN)          | `narrativeEngine.js` + skiv_storylets.yaml         | base shipped                     |
| Lore vault (sovereign)              | `vault/Atlas/evo-tactics-*-moc.md`                 | reference A5                     |

**Recap**: mondo = **test ecologico**, no magia, no dei — solo pressione+adattamento. **Il Sistema**
(Director AI) = forza selettiva che forgia (non malvagio; "non sei testato, sei addestrato"). Tono
70% serio / 30% meraviglia, bio-plausibile, intimo, suggerito. Struttura 3-tier: briefing/debrief
per-encounter -> arco ecologico per-bioma -> meta-narrativa campagna. 5 fazioni (Alveare Sinaptico,
Custodi Basalto, Filatori d'Abisso, Radici Erranti, Corte Zefiri) = nemici O alleati. Arco flagship =
Leviatano Risonante / Frattura Abissale (3 esiti ACCORDO/RITIRATA/COMBATTIMENTO). **Perche**: narrativa
emergente dal gameplay (no cutscene), DF-levels L0-L5 come profondita.

**Gap**: premessa macro non promossa a canon (docs/core); **4 specie Frattura non in `species.yaml`**
(~18h); ~20 briefing da scrivere (writer bottleneck); codex vuoto (schema c'e, 0 entry); L3-L5
greenfield (artefatti/chronicle/losing-is-fun); lineage-narrative UI mancante. Tutto L2-L5 gated da
playtest AI-driven canonico (CANONICAL-AI-PLAYTEST.md).

---

## 9. Cross-reference — la spina (come gli 8 si connettono)

```
                         VC telemetry (gameplay)
                                  |
                          vcScoring.js
                          /            \
                  MBTI 4-axis        Ennea 9-archetype
                     |                     |
              form (16) ----+        enneaEffects (combat) + voice
                |           |
   job affinity + pack + starter-biome + innata-trait + mutation mbti_alignment + mating compat
                |
            SPECIE (53) --clade/sentience--> ruolo encounter
              |   \--biome_affinity--> ECOSISTEMA (foodweb) --foodwebFilter--> spawn pool
              |   \--trait_plan--> TRAIT (606) --active_effects--> ABILITA/effect-type (18)
              |                                  \--mutation_catalog (36 swap, aspect_token)
            lifecycle (15/53) --phase/diary--> narrative beat (Skiv saga)
                                                      |
   BIOMA --narrative hooks + cross-events--> pressure --> CAMPAGNA (atti/encounter/briefing)
                                                              |
                                              SistemaState "Il Sistema ricorda" (L2)
                                                              |
                                                       LORE (Sistema = test)
```

Connessioni chiave:

- **Specie e l'hub**: clade+sentience -> ruolo/encounter; biome_affinity -> ecosistema/spawn;
  trait_plan -> trait -> abilita; lifecycle -> narrative.
- **MBTI/Ennea e la spina trasversale**: deriva da VC, alimenta job/pack/mutation/mating/voce.
- **Bioma collega ecosistema (foodweb) + lore (hooks/cross-events) + campagna (pressure)**.
- **Pathfinder 1211 = serbatoio non-collegato** che dovrebbe alimentare specie/ecosistemi.

---

## 10. Gap consolidati (prioritizzati, cross-sistema)

| #   | Gap                                                                | Sistema    | Effort    | Nota                                      |
| --- | ------------------------------------------------------------------ | ---------- | --------- | ----------------------------------------- |
| 1   | 4 orphan combat (morale/cumstate/woundperma/vcsnap) wire-or-remove | abilita    | 2-4h cad  | BACKLOG TKT-ORPHAN-\*, decision master-dd |
| 2   | Ennea-voice frontend + dialogue-colors pipeline                    | mbti/ennea | 4h+2h     | sblocca P4 -> 🟢 (surface dead)           |
| 3   | 24 passive-tag job-expansion handler (Phase C)                     | job        | ~12h      | perk expansion inerti finche non wired    |
| 4   | 33/38 biomi senza ecosystem.yaml                                   | ecosistema | ~Nh/bioma | foodwebFilter passthrough; GAP-C post-MVP |
| 5   | 104 trait glossary senza meccanica + drift                         | trait      | audit     | silent no-op runtime                      |
| 6   | 38/53 specie senza lifecycle + 32/53 senza biome                   | specie     | backfill  | OD-008 incrementale                       |
| 7   | Pathfinder 1211 -> seed foodweb (0 integrate)                      | creature   | 30-50h    | designer pass per-bioma                   |
| 8   | 4 specie Frattura non in canon + ~20 briefing                      | lore       | 18h+12h   | writer bottleneck; arco flagship          |
| 9   | premessa macro DRAFT -> docs/core canon                            | lore       | 2-4h      | + L2-L5 gated playtest                    |
| 10  | SPECIES_BY_JOB mapping mancante                                    | job/specie | ~3h       | quale specie -> quali job                 |

---

## 11. Dashboard conteggi

| Sistema    | Headline                                                                    |
| ---------- | --------------------------------------------------------------------------- |
| Ecosistemi | 38 biomi · 5 ecosystem wired · 5 nodi-network · 6 consumer                  |
| Creature   | 53 canonical · 1211 Pathfinder · 21 public · ~297 ancestors · 53 deprecated |
| Specie     | 53 roster · 15 lifecycle · T0-T5 (T6=0) · 6 clade                           |
| Trait      | 606 glossary · 502 wired · 297 ancestors · 36 mutation · 106 famiglie       |
| Job        | 11 (7+4) · 132 perk · 18/18 effect-type · 6 resource                        |
| MBTI/Ennea | 16 form · 4 axes · 9 ennea · ~80 file · P4 🟡++                             |
| Abilita    | 18/18 effect-type · 34 servizi (30 wired/4 orphan) · 12 status              |
| Lore       | premessa DRAFT · L0-L1 shipped · L2 parziale · L3-L5 greenfield             |

---

## Sources (file dati = SoT reale; questo doc = indice)

- Ecosistemi: `data/core/biomes.yaml`, `packs/evo_tactics_pack/data/ecosystems/`, `apps/backend/services/worldgen/`
- Creature: `data/core/species/species_catalog.json`, `data/external/pathfinder_bestiary_1e.json`, `docs/museum/`
- Specie: `species_catalog.json`, `data/core/species/*_lifecycle.yaml`, `docs/guide/README_SENTIENCE.md`, `docs/core/00E-NAMING_STYLEGUIDE.md`
- Trait: `data/core/traits/{glossary.json,active_effects.yaml}`, `data/core/ancestors/`, `data/core/mutations/mutation_catalog.yaml`
- Job: `data/core/{jobs.yaml,jobs_expansion.yaml,progression/perks.yaml}`, `progressionEngine.js`
- MBTI/Ennea: `data/core/forms/`, `data/core/personality/`, `vcScoring.js`, `data/external/psychometrics/enneagramma/`, `enneaEffects.js`
- Abilita: `apps/backend/services/abilityExecutor.js`, `apps/backend/services/combat/`
- Lore: `docs/planning/draft-narrative-lore.md`, `docs/biomes/`, `data/core/campaign/`, `apps/backend/services/{campaign,narrative,ai}/`, `vault/Atlas/evo-tactics-*-moc.md`
- Metodo doc: 8 inventory-sweep paralleli 2026-05-30. Cross-ref: `games-source-index.md`, `BACKLOG.md`, ADR-2026-05-18-df-levels.
