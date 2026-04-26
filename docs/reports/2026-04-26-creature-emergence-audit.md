---
title: "Creature Emergence Audit — Form choice → specie spawnata in encounter"
workstream: dataset-pack
status: draft
created: 2026-04-26
author: creature-aspect-illuminator (audit mode)
tags: [species, lifecycle, emergence, spawn, visual-morphology]
---

# Creature Emergence Audit

## TL;DR (5 bullet)

- Catena emergence: 6 step. 2 wired runtime, 1 partial, 3 dato-solo.
- `biomeSpawnBias.js` applica peso biome su pool archetipo (step 4) ma NON legge `biome_affinity` da `species.yaml` — il collegamento specie-bioma e' spezzato: il pool e' scenario-authored, non derivato dall'ecosistema.
- `formPackRecommender.js` raccomanda pack evolutivi (trait/PE) ma NON ha bridge con reinforcement pool — il Form del giocatore non cambia quali specie appaiono in encounter.
- Skiv ha lifecycle YAML (5 fasi) + `skiv_saga.json` + `skivPanel.js` frontend + `/api/skiv/card` backend: la catena narrativa e' piu' avanzata di tutte le altre 44 specie, ma il canvas 2D `render.js` (TV side) non legge `lifecycle_phase` ne' `aspect_token` — il giocatore vede "PRE" (abbrev 3 char) uguale a fase hatchling e fase apex.
- Mating/nido (OD-001) e' backend-live (469 LOC, PR #1679) ma zero-frontend e zero-visual: non emerge nella morfologia della creatura nel canvas.

---

## Mappa Emergence — 6 step

| Step | Descrizione | File chiave | Stato |
|------|-------------|-------------|-------|
| 1 | **Bioma corrente** — il biome_id viene scelto o assegnato dalla campagna | `session.js` L.1049 `biomeIdRaw` | 🟢 wired |
| 2 | **Form del giocatore → pack evolutivi** — `formPackRecommender.js` usa Form + job + d20/d12 → suggerisce pack trait/PE | `apps/backend/services/forms/formPackRecommender.js` | 🟢 wired (pack, non spawn) |
| 3 | **Ecosistema biome → pool trophic** — `data/ecosystems/*.ecosystem.yaml` definisce consumatori primari/secondari/terziari per biome (es. deserto_caldo: thermo-raptor, noctule-termico) | `data/ecosystems/deserto_caldo.ecosystem.yaml` L.37-45 | 🔴 dato-solo |
| 4 | **Spawn pool encounter** — `reinforcementSpawner.js` legge `encounter.reinforcement_pool` (scenario-authored a mano) e applica `biomeSpawnBias.js` (affix/archetype weights) | `apps/backend/services/combat/reinforcementSpawner.js` L.68-98 | 🟡 partial |
| 5 | **Species biome_affinity → spawn eligibility** — `species.yaml` ha `biome_affinity` per ogni specie ma non e' mai letto da spawner o session router per filtrare il pool | `data/core/species.yaml` L.72 `biome_affinity: savana` (dune_stalker) | 🔴 dato-solo |
| 6 | **Form → species visual morph** — il cambiamento visivo post-Form/mutation dovrebbe aggiornare il canvas TV-side con lifecycle_phase + aspect_token | `apps/play/src/render.js` `drawUnit()` L.251 | 🔴 dato-solo |

**Step wired runtime**: 2/6 (step 1, step 2). Step 4 partial (bias affix, pool non ecosistema-derived).

---

## Dettaglio GAP critici

### GAP-1: biome_affinity non letto da spawner

`species.yaml` mappa ogni specie a un `biome_affinity` (es. `dune_stalker → savana`, `leviatano_risonante → frattura_abissale_sinaptica`). `reinforcementSpawner.js` legge solo `encounter.reinforcement_pool` (scritto a mano per scenario), mai `species.yaml`. Risultato: in un biome savana puo' spawnare qualsiasi specie se il pool manuale la include — nessun gate ecologico.

Il bridge mancante: `applyBiomeBias` (L.84 reinforcementSpawner) lavora su `unit.tags/archetype` ma non su `unit.species → species.biome_affinity`. Nessuna funzione in `biomeSpawnBias.js` legge `data/core/species.yaml`.

### GAP-2: ecosistema trofico non connesso a spawn

`data/ecosystems/deserto_caldo.ecosystem.yaml` definisce `trofico.consumatori.terziari: [thermo-raptor]`. Questi slug non appaiono in nessun `encounter.reinforcement_pool` ne' in `biomeSpawnBias.js`'s `AFFIX_TAG_AFFINITIES`. Il file ecosistema esiste come lore-document, non come dato computazionale.

### GAP-3: Form choice non influenza specie in encounter

`formPackRecommender.js` (V4, wired) influenza quali trait/pack il giocatore acquisisce — non chi incontra. Non esiste bridge `Form → spawn_pool_filter`. Un INTP e un ESFJ vedono gli stessi nemici, anche se la vision gap V4 promette "biome-aware spawn bias" derivato dal Form.

### GAP-4: render.js cieco al lifecycle

`drawUnit()` (L.251 `render.js`) legge `unit.job`, `unit.species`, `unit.hp`. Non legge `unit.lifecycle_phase`, `unit.aspect_token`, `unit.mutations`, `unit.mbti_correlates`. Tutti questi campi esistono in `skiv_saga.json` e in `dune_stalker_lifecycle.yaml` ma non fluiscono al canvas. Il giocatore TV-side vede "PRE" uguale dalla fase hatchling all'apex.

### GAP-5: encounter pool scenario-authored, non ecosistema-derived

`enc_tutorial_01.yaml` L.31: `species: predoni_nomadi` hardcoded. Non e' derivato da un lookup `biome_id=savana → species.biome_affinity=savana`. Il sistema correcto dovrebbe essere: biome_id → filtra species.yaml per biome_affinity match → ordina per clade_tag (Threat prima, poi Keystone, Apex come boss) → pool candidati. Attualmente e' assenza totale di questo step.

---

## Skiv Lifecycle Audit

### Cosa e' visible

- `skivPanel.js`: overlay frontend con lifecycle bar a 5 fasi colorate (past/current/future), voice, sprite ASCII, feed eventi. Accessibile via button HUD.
- `skiv.js` route: `/api/skiv/card` testo ASCII pre-renderizzato con sprite phase-aware (L.150-154 renderAsciiCard).
- `data/derived/skiv_saga.json`: stato completo — `aspect.lifecycle_phase=mature`, `aspect.mutation_morphology.visual_swap_it`, `mbti_correlates[4]`. Fonte di verita' derivata.
- `dune_stalker_lifecycle.yaml`: 5 fasi con gating rules (level+mutations+thoughts_internalized), `aspect_it`, `sprite_ascii`, `tactical_signature`, `warning_zone_it`, `mbti_aspect_correlates`.

### Cosa e' invisible (gap)

- **Canvas TV-side (`render.js`)**: `drawUnit()` non legge lifecycle_phase ne' aspect_token. Skiv in fase mature con `claws_glass` appare identico a Skiv hatchling: stessa forma geometrica job-based, stesso colore, stessa abbrev "PRE".
- **Mutation visiva in-encounter**: `mutation_morphology.visual_swap_it` esiste solo in YAML/JSON. Non esiste codice che al momento della mutation_acquired cambi lo sprite o overlay canvas.
- **MBTI posture overlay**: `mbti_aspect_correlates` (I_high → "orecchie verso interno") e' testo, zero canvas. Pattern previsto da `creature-aspect-illuminator` agent ma non implementato.
- **Lifecycle ring `drawLifecycleRing()`**: funzione citata nell'agent come target (`apps/play/src/render.js drawUnit()`) ma non esiste nel file (grep conferma: 0 hit per `drawLifecycleRing`).
- **Mating/nido visivo**: mating engine (469 LOC, `apps/backend/services/mating/`) e' backend-live ma zero visual. La creatura prodotta da mating non ha portrait, non ha lifecycle phase, non ha canvas representation.
- **44 specie senza lifecycle file**: solo `dune_stalker_lifecycle.yaml` esiste sotto `data/core/species/`. Le altre 44 specie hanno `biome_affinity` + `clade_tag` + `trait_plan` ma zero visual phase data.

---

## Pattern industry primary-sourced

### 1. Wildermyth permanent visible change (P0 proven)
**Fonte**: [Wildermyth Story Inputs wiki](https://wildermyth.com/wiki/Story_Inputs_and_Outputs). Chapter beat → layer body-part replacement (wolf arm, stone eye) PRIMA del flavor text. Player vede cambiamento → poi legge.
**Applicabilita'**: `mutation_morphology.visual_swap_it` esiste gia' in `dune_stalker_lifecycle.yaml` per 4 mutations. Serve `drawMutationDots(ctx, unit, cx, cy)` in `render.js` che legge `unit.mutations.length` → N punti visibili sulla unit TV-side. Sforzo: ~2h.

### 2. Caves of Qud morphotype pool gating (P0 proven)
**Fonte**: [Caves of Qud Mutations wiki](https://wiki.cavesofqud.com/wiki/Mutations) + [Modding:Genotypes](https://wiki.cavesofqud.com/wiki/Modding:Genotypes_and_Subtypes). Morphotype (Chimera/Esper) gate il pool di mutazioni offerte. Physical mutations solo a Chimera, mental solo a Esper.
**Applicabilita'**: MBTI axes gia' live in vcScoring. Bridge: `T_F axis → physical mutation pool`, `N_S → sensorial pool`. `mutation_catalog.yaml` dovrebbe aggiungere `mbti_pool: [T_high]` per filtrare offerta. Lo schema campo e' citato in `dune_stalker_lifecycle.yaml` L.30 come "future schema" ma non implementato.

### 3. Subnautica habitat lifecycle — biome migration (P1)
**Fonte**: [Subnautica Ghost Leviathan wiki](https://subnautica.fandom.com/wiki/Ghost_Leviathan). Juvenile spawn-locked Lost River, adult migra biomi diversi, comportamento age-driven.
**Applicabilita'**: `dune_stalker_lifecycle.yaml` ha `biome_affinity: savana` per hatchling/juvenile e `environment_focus.biome_class: caverna` in `trait_plan` per mature. Il bridge runtime (spawn-lock per fase) non esiste: `reinforcementSpawner.js` non legge lifecycle_phase della creatura player.

### 4. Monster Hunter Stories gene grid (P0)
**Fonte**: [MHST Kiranico Gene db](https://mhst.kiranico.com/gene). 3x3 grid mutation slot, 3 allineati stesso tipo = bingo bonus. Visual + mechanic.
**Applicabilita'**: con 4 mutation in `dune_stalker_lifecycle.yaml` (artigli_grip_to_glass, artigli_freeze_to_glacier, scheletro_bio_camo, echolocation_3d) si puo' creare mini-grid 2x2. Bingo: 2 `claws_*` mutations = synergy bonus. UI panel pattern gia' in `formsPanel.js`.

### 5. Disco Elysium Thought Cabinet portrait correlate (P0)
**Fonte**: [Thought Cabinet wiki.gg](https://discoelysium.wiki.gg/wiki/Thought_Cabinet). Thought internalizzato → overlay portrait permanente.
**Applicabilita'**: `skiv_saga.json` L.47 ha `internalized: [i_osservatore, n_intuizione_terrena]`. `mbti_aspect_correlates` in `dune_stalker_lifecycle.yaml` mappa ogni polarity a prose visiva. Serve solo che `drawUnit()` legga `unit.cabinet?.internalized.length` e applichi un dot/ring overlay. Pattern esatto descritto in agent `creature-aspect-illuminator` come `drawLifecycleRing` ma non implementato.

---

## Proposta corretta: come emerge una specie dalla prospettiva del giocatore

### Momento sbagliato (come Claude descriveva prima)

> "Sistema sceglie un encounter da pool tutorial 01-05"

Questo e' incompleto: ignora ecosistema, ignora biome_affinity, tratta le specie come pool intercambiabile di "mostri generici".

### Beat corretti (TV-side + phone-side)

**Beat 1 — Campaign start (biome selection)**
TV: il biome_id viene impostato (`enc_tutorial_01.yaml: biome_id=savana`). Dovrebbe triggerare: lookup `data/ecosystems/savana.ecosystem.yaml` → estrai consumatori terziari (apex) + secondari (threat). Questo e' il pool ecologico candidato. ATTUALE: non avviene.

**Beat 2 — Encounter load (spawn pool filtro)**
TV: il pool di spawn dovrebbe derivare da: `biome_id → species.yaml filtra biome_affinity=savana → ordina per clade_tag (Threat base, Keystone support, Apex boss) → pool candidati`. ATTUALE: `enc_tutorial_01.yaml` ha `species: predoni_nomadi` hardcoded, nessun lookup dinamico.

**Beat 3 — Form player → spawn bias**
Phone: il giocatore ha scelto Form INTP (I_high, T_high). DOVREBBE: Form T_high bias-a verso specie con clade_tag=Threat o sentience_tier basso (T0-T2) nei pool encounter. ATTUALE: `formPackRecommender.js` influenza solo pack evolutivi, non spawn.

**Beat 4 — Specie entra in campo (TV)**
TV: il nome e abbrev 3-char appaiono sulla unit. DOVREBBE aggiungere: lifecycle_phase della specie nemica (se applicable), clade_tag visivo (piccolo badge colore: Apex=rosso, Keystone=verde, Threat=arancio). ATTUALE: solo abbrev monocromatica.

**Beat 5 — Mutation/evolution del player character (phone + TV)**
Phone: il giocatore acquista mutation `artigli_grip_to_glass`. DOVREBBE: canvas TV aggiorna sprite Skiv con dot/overlay "claws_glass" aspect_token. Wildermyth pattern: cambio visible PRIMA del flavor text. ATTUALE: solo testo in narrative log, nessun canvas change.

**Beat 6 — Lifecycle transition (TV + Skiv panel)**
TV + panel: Skiv raggiunge Lv 6 + 2 mutations + 3 thoughts. Lifecycle bar nel `skivPanel.js` avanza da "Maturo" a "Apex". DOVREBBE: `drawUnit()` in `render.js` applicare `drawLifecycleRing()` con variant visiva. ATTUALE: lifecycle bar esiste nel panel (phone-side) ma il canvas TV non cambia.

---

## Anti-pattern da evitare

- **Pool specie hardcoded per scenario** — ogni enc_tutorial_NN ha `species: X` a mano. Sistema emergente vero richiede lookup ecosistema. Pericolo: 45 specie × N encounter = O(N) manutenzione.
- **Specie generica "predoni_nomadi"** — slug che non esiste in `data/core/species.yaml` (verificato: grep zero hit). Anti-pattern "invented species" — violare cross-reference tra encounter pool e species catalog.
- **Lifecycle decoupled da progression Lv** — fase 3 deve richiedere Lv 4 + mutations + thoughts (come in `dune_stalker_lifecycle.yaml`). Non usare phase advancement basato solo su XP.
- **Visual cosmetic-only senza tactical correlate** — ogni mutation deve avere `tactical_signature` (come in lifecycle YAML) + visual change. Un mutation che cambia solo prose e' invisible al giocatore TV.
- **clade_tag come categoria interna** — Apex/Keystone/Bridge/Threat esistono in `species.yaml` ma non sono mai tradotti in visual badge, spawn priority o encounter role nel runtime corrente.

---

## Priorita' 3 fix + effort

| Priorita' | Fix | Effort | Dipendenze |
|-----------|-----|--------|------------|
| P0 | Wire `species.biome_affinity` → `reinforcementSpawner.js` pool filter: funzione `filterPoolByBiome(pool, biome_id, speciesYaml)` che esclude specie con biome_affinity disallineato | ~3h | step 3+5 |
| P0 | `drawLifecycleRing(ctx, unit, cx, cy)` in `render.js`: legge `unit.lifecycle_phase` + `unit.mutations.length` → ring variant + N mutation dot | ~2h | step 6, nessuna dipendenza dati |
| P1 | `mutation_catalog.yaml`: aggiungere `mbti_pool: [...]` field + linter check in `tools/py/lint_mutations.py` (NEW) per Caves of Qud morphotype gating | ~4h | mutation_catalog non letto (verifica separata) |

**Effort totale P0**: ~5h. Sblocca visual emergence minimo viable.
