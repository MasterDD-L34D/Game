---
title: 'Scollamento Ecologia ↔ Combat: censimento + roadmap di riconnessione'
workstream: flow
category: planning
doc_status: active
doc_owner: claude-code
last_verified: 2026-06-20
language: it
tags: [worldgen, species, biomi, combat, ecologia, ermes, aliena, foodweb, strategy, gap-audit]
---

# Scollamento Ecologia ↔ Combat — censimento + roadmap

> Documento strategico (NO codice). Nasce da una domanda del master-dd durante lo step-2 worldgen:
> _"perché gli scenari hardcoded non sono linkati a specie e biomi esistenti? perché non usiamo il
> materiale che abbiamo (ERMES/ALIENA, specie con trait, biomi) invece di inventarlo?"_
>
> La risposta breve: **esistono due mondi paralleli mai collegati** — un livello _ecologico_
> (specie + trait + biomi + ERMES/ALIENA, ricco ma SENZA numeri di combattimento) e un livello
> _combat_ (scenari che girano su creature inventate inline con hp/mod/dc). Questo doc mappa
> l'intera estensione del buco con numeri verificati e propone una roadmap per ricucirlo.

## 0. TL;DR (per decidere in 30s)

- **0 su 53** specie canoniche hanno stat di combat (hp/mod/dc). Hanno trait + ecologia, non numeri.
- **10 su 14** creature usate dagli scenari sono **orfane pure** (nessun file, nessun catalogo);
  altre 4 esistono solo come dir `tutorial/` (combat-ready ma fuori catalogo canonico + foodweb);
  **1 sola** (pulverator_gregarius) è canonica. Quindi 13/14 fuori dal SOT canonico.
- **3 su 20** biomi _dichiarati top-level_ risolvono un ecosistema/foodweb via `getEcosystem()`
  (badlands, foresta_temperata, rovine_planari). Esistono 5 file `.ecosystem.yaml`, ma 2
  (cryosteppe, deserto_caldo) sono indicizzati su id NON top-level in `biomes.yaml` → **17** biomi
  dichiarati senza ecosistema risolvibile, non 15.
- **1 su 5** biomi-con-ecosistema (`rovine_planari`) ha le specie tutte-stub → ed è proprio il bioma
  degli scenari hardcore. Ecco perché inventano creature: il loro bioma è vuoto.
- Causa radice: **il combat richiede `hp/mod/dc`, che vivono SOLO in 6 specie "tutorial"**; tutto il
  resto del materiale (canone + dir-bioma + ERMES/ALIENA) è privo di quei numeri. Nessun ponte.

## 1. Censimento verificato (2026-05-30, sola lettura)

### 1.1 Specie — tre cataloghi disallineati

| Fonte                                                       | Conteggio | Cosa contiene                                                  | Stat combat?       |
| ----------------------------------------------------------- | --------- | -------------------------------------------------------------- | ------------------ |
| `packs/.../data/species/<bioma>/*.yaml` (dir per bioma)     | 85 file   | ecologia, role_trofico, threat_tier, genetic_traits            | **no**             |
| `packs/.../docs/catalog/species-canonical-index.json` (SOT) | 53 specie | trait_refs (53/53), biome_affinity (21/53), ecology, sentience | **0/53**           |
| `packs/.../data/species/tutorial/*.yaml`                    | 6 file    | hp/mod/dc espliciti                                            | **sì (le uniche)** |

Note:

- I due cataloghi (85 dir vs 53 canon) **non sono allineati 1:1** — vanno riconciliati (alcune dir-specie
  non sono nel SOT e viceversa). Lo confermano gli id che non combaciano.
- Le 6 "tutorial" (apex-predatore, cacciatore-corazzato, guardiano-caverna, guardiano-pozza,
  predone-agile, predoni-nomadi) sono le **uniche combat-ready** → tutti gli scenari le riusano.

### 1.2 Specie per bioma (dir/) — ricchezza disomogenea

| Bioma              | Specie | Piene (>70 righe) | Stub (3 righe)         |
| ------------------ | ------ | ----------------- | ---------------------- |
| badlands           | 10     | 7                 | 0 (+3 magre ~19 righe) |
| cryosteppe         | 7      | 5                 | 0 (+2 magre)           |
| deserto_caldo      | 5      | 5                 | 0                      |
| foresta_temperata  | 6      | 4                 | 0 (+2 magre)           |
| **rovine_planari** | 10     | **0**             | **10 (tutte stub)**    |
| tutorial           | 6      | 6                 | 0                      |

`rovine_planari` è l'**unico bioma-con-ecosistema completamente stub**, e per coincidenza è il bioma di
`hardcore_06`, `hardcore_07`, `enc_hardcore_reinf_01`. Da qui l'uso forzato di creature inline.

### 1.3 Creature usate dagli scenari — 10/14 orfane pure (13/14 fuori SOT canonico)

Referenziate da `hardcoreScenario.js` + `docs/planning/encounters/*.yaml`:

| Creatura                                                                                                                                                                                         | Stato                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| pulverator_gregarius                                                                                                                                                                             | ✅ CANON (nel SOT)                                                                                                                             |
| apex_predatore, cacciatore_corazzato, predone_agile, predoni_nomadi                                                                                                                              | ⚠️ esistono solo come dir `tutorial/` (combat-ready ma fuori catalogo canonico + fuori foodweb)                                                |
| predoni_nomadi_elite, araldi_fotofase, bracconieri_echomantici, cartografi_subsonici, cori_voidsong, custode_basalto, custodi_coralli, guardiani_risonanza, leviatani_risonanti, sciami_memetici | ❌ ORFANE pure (inventate inline, nessun file, nessun catalogo). `predoni_nomadi_elite` appare solo nei dati encounter — NON ha file tutorial. |

### 1.4 Biomi — 5/20 con ecosistema

- **Dichiarati** (`data/core/biomes.yaml`): **20** (abisso_vulcanico, atollo_obsidiana, badlands, caldera_glaciale,
  canopia_ionica, canyons_risonanti, caverna, palude, dorsale_termale_tropicale, foresta_acida,
  foresta_miceliale, foresta_temperata, stratosfera_tempestosa, mezzanotte_orbitale,
  pianura_salina_iperarida, reef_luminescente, savana, steppe_algoritmiche, rovine_planari,
  frattura_abissale_sinaptica).
- **File ecosistema/foodweb** (`*.ecosystem.yaml`): **5** (badlands, cryosteppe, deserto_caldo,
  foresta_temperata, rovine_planari). MA `ecosystemResolver.getEcosystem()` indicizza per
  `biome_id` esatto **senza normalizzazione alias**: `cryosteppe` e `deserto_caldo` NON sono id
  top-level in `biomes.yaml` (vi appaiono solo come alias/figli, righe 68 + 548). Quindi, per i
  **20 id dichiarati top-level**, ne risolvono solo **3** (badlands, foresta_temperata,
  rovine_planari) → **17 biomi dichiarati SENZA ecosistema risolvibile**. (Nota secondaria:
  la mancata normalizzazione alias è essa stessa un mini-buco — cryosteppe/deserto_caldo hanno
  dati foodweb ma non sono raggiungibili dagli id canonici.)
- **Referenziati da scenari senza ecosistema**: savana, caverna, frattura_abissale_sinaptica →
  qui GAP-A (foodweb filter) non ha dati su cui lavorare (cade in `no_ecosystem`, passthrough).

### 1.5 ERMES e ALIENA — cosa sono DAVVERO (smontare l'aspettativa)

- **ALIENA** (`coop/alienaGenerator.js`): genera il **riassunto narrativo del mondo** per il player
  (testo per-bioma, es. _"Calanchi ferromagnetici: il ferro nel terreno tira ogni movimento..."_).
  NON produce creature giocabili né stat. È regia/atmosfera.
- **ERMES** (`ermes/ermesRunner.js` + `ermesDebriefInput.js`): bridge **post-partita/diagnostico** —
  reverse-index trait→pool, eco_pressure report, suggerimenti JSON-Patch discreti. NON genera creature.
- **worldEnricher** (`coop/worldEnricher.js`): facade che combina biomeAdapter + ALIENA + ERMES +
  companionPicker → payload ricco per Godot v2 (world+ermes+aliena_summary+custode). È il punto
  dove bioma→narrazione già si lega; **non** dove bioma→creature-combat si lega (quel ponte manca).

Conclusione: ERMES/ALIENA danno **coerenza narrativa e regia del bioma**, non i nemici-con-numeri.
L'aspettativa "ALIENA/ERMES ci danno specie con trait precisi pronte al combat" non è soddisfatta
dall'architettura attuale.

## 2. Causa radice (un'unica frase)

> Il **combat** vuole `hp/mod/dc`; quei numeri esistono solo in 6 specie tutorial. Tutto il
> materiale ecologico ricco (53 canon + dir-bioma + ERMES/ALIENA) vive **senza** quei numeri.
> Manca un **adapter** che derivi le stat di combat dall'ecologia (threat_tier / role_trofico /
> trait). Senza quel ponte, gli scenari devono inventare creature.

## 3. I 5 buchi distinti (da non confondere)

1. **Buco-stat**: ecologia senza hp/mod/dc (0/53 canon). → serve adapter ecologia→combat.
2. **Buco-rovine_planari**: 10 specie tutte stub in un bioma attivo negli scenari. → riempire o ri-ambientare.
3. **Buco-orfani**: 13 creature inventate inline negli scenari, fuori da ogni catalogo. → censire e ricondurre.
4. **Buco-bioma-ecosistema**: 15/20 biomi senza foodweb. → GAP-A inerte lì.
5. **Buco-cataloghi**: 85 dir vs 53 canon non allineati. → riconciliazione SOT.

## 4. Roadmap proposta (incrementale, gated, NON parto senza OK)

Ordine per valore/rischio. Ogni fase è un progetto a sé (spec→plan→impl), tocca le bande → ricalibrazione.

### Fase 1 — Adapter ecologia→combat (pilota 1 bioma) ⭐ raccomandata come primo passo

Derivare `hp/mod/dc` deterministici da `threat_tier`/`role_trofico` (+ trait modifier) per le specie
ecologiche di **badlands** (7 piene, già nel foodweb, già colpito da cross-event ondata-termica/brinastorm).
Ri-ambientare UNO scenario in badlands usando specie reali → GAP-A _accetta_ i rinforzi (non fallback)
e GAP-B applica pressione stagionale vera. Pilota verticale completo su materiale esistente.
Effort stimato: medio. Output player-visibile reale. Tocca bande → N=40 ricalibra.

### Fase 2 — Censimento + ricondotta orfani

Mappare le 13 creature orfane: quali diventano specie canoniche, quali restano "NPC di scenario"
documentati. Allineare i due cataloghi (85 dir ↔ 53 SOT). Nessun combat change, solo data hygiene.

### Fase 3 — Riempire rovine_planari (o deprecarlo)

Decisione master-dd: o si scrivono le 10 specie reali di rovine_planari (lavoro autoriale +
bilancio), oppure si ri-ambientano gli scenari hardcore in biomi già ricchi e si marca
rovine_planari come "bioma narrativo non-combat" finché non c'è budget.

### Fase 4 — Estendere ecosistemi ai biomi mancanti (15/20)

Solo per i biomi che servono davvero al gameplay corrente. Non tutti i 20 — YAGNI.

### Fase 5 — Step-2 worldgen surface (HUD/log) — il punto di partenza originale

Una volta che gli scenari girano su specie reali (Fase 1), rendere visibile in HUD/log il filtro
foodweb (GAP-A) e la pressione stagionale (GAP-B). Ora avrebbe senso, prima no.

## 5. Cosa NON fare (anti-pattern)

- ❌ Rinominare creature-scenario con id di specie-stub vuote (avrei legato a fantasmi — scartato).
- ❌ Inventare nuove creature inline (peggiora il buco-orfani).
- ❌ Riempire tutti i 20 biomi / tutte le 85 specie "per completezza" (YAGNI; solo ciò che il gameplay tocca).
- ❌ Toccare hardcore_06/07 senza ricalibrazione N=40 (bande ratificate 15-25% / 30-50%).

## 6. Raccomandazione

Partire da **Fase 1** (adapter + pilota badlands): è l'unico passo che usa _davvero_ il materiale
esistente (la tua richiesta), produce un effetto visibile, ed è circoscritto a un bioma. Le altre
fasi diventano decisioni informate una volta visto il pilota. **GAP-C (mondo a inizio partita)
resta POST-MVP** e ortogonale a tutto questo.

## 6bis. Riconciliazione con ATLAS + gap-resolution-plan (2026-05-30)

Questo census **alimenta** due doc preesistenti più ampi (NON li sostituisce):

- `docs/guide/DESIGN-DATA-ATLAS.md` (mappa madre 8 sistemi, PR #2452 merged)
- `docs/planning/2026-05-30-design-data-gap-resolution-plan.md` (4 wave, PR #2453 merged) +
  reframe `claude/plan-reframe-adapter-first-2026-05-30` (worktree, non ancora su main) che cita
  questo census come trigger dello switch **adapter-first** (la mia Fase 1 = la loro keystone Wave 3).

**Allineamento concettuale: PIENO.** Adapter ecologia→combat è la keystone di entrambi. Le mie
Fasi 1-5 mappano sulle Wave 1-4 del plan (la mia Fase 1 = Wave 3 adapter-first ristrutturata).

**Discrepanze numeriche da risolvere PRIMA di eseguire le wave (ground-truth verificato qui):**

| Metrica                                | ATLAS / plan dice | Census verificato qui                                | Nota                                                                                                            |
| -------------------------------------- | ----------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Biomi totali (`data/core/biomes.yaml`) | **38**            | **20 top-level** (29 incl. figli)                    | né 20 né 29 = 38; il "38" NON è verificabile dalla struttura reale → ATLAS da correggere o citare fonte diversa |
| Biomi con ecosystem risolvibile        | 5/38              | **3/20** top-level (5 file, ma 2 su id non-canonici) | resolver non normalizza alias (vedi §1.4)                                                                       |
| Biomi senza ecosystem                  | 33/38             | **17/20** (per id top-level)                         | denominatore diverso → ricalcolare su fonte unica                                                               |
| Specie senza biome_affinity            | 32/53             | **32/53** ✅                                         | concorda                                                                                                        |
| Specie senza lifecycle                 | 38/53             | non misurato qui                                     | dato ATLAS, plausibile                                                                                          |
| Specie senza hp/mod/dc                 | (implicito)       | **53/53** (0 hanno stat)                             | il dato che ha innescato il reframe adapter-first                                                               |

**Azione di riconciliazione raccomandata** (prima di Wave 3/4):

1. Stabilire la **fonte unica di verità** per il conteggio biomi (biomes.yaml top-level = 20? include figli? altra fonte per 38?). Correggere ATLAS/plan di conseguenza.
2. Propagare le correzioni di questo census (3/20, gap 17, elite-orphan) — vedi PR #2455.
3. Il **gate D4** (heuristic biome-assignment) del plan resta il vero sblocco della mia Fase 1: non
   parte finché D4 non è deciso dal master-dd.

## 7. Fonti (verificate sola-lettura 2026-05-30)

- `packs/evo_tactics_pack/docs/catalog/species-canonical-index.json` (53 specie, 0 con hp, 21 con biome_affinity)
- `packs/evo_tactics_pack/data/species/<bioma>/*.yaml` (85 file; conteggio piene/stub per bioma §1.2)
- `apps/backend/services/hardcoreScenario.js` + `docs/planning/encounters/enc_hardcore_reinf_01.yaml` (creature §1.3)
- `data/core/biomes.yaml` (20 biomi) vs `packs/.../ecosystems/*.ecosystem.yaml` (5 ecosistemi)
- `apps/backend/services/coop/alienaGenerator.js`, `worldEnricher.js`, `ermes/ermesRunner.js` (§1.5)
- `apps/backend/services/worldgen/{foodwebFilter,ecosystemResolver,crossEventEngine}.js` (GAP-A/B shipped #2447)
