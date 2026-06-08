---
title: 'Evo-Tactics SPEC-O Mission Template Library (spec piena)'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
review_cycle_days: 30
source_of_truth: false
language: it
tags: [evo-tactics, spec-o, level-design, missions, objective-types, encounter, calibration]
related: ADR-2026-06-07-device-authority-tv-mirror-canon
---

# Evo-Tactics SPEC-O Mission Template Library (spec piena)

Contratto Wave-4 (gap-harvest). Spec piena dello scope-doc omonimo: definisce la libreria
canonica dei 6 tipi-obiettivo come template encounter schema-validi, cosi' che il combat,
il TV Cinematic Director (SPEC-D) ed ERMES (SPEC-I) condividano una grammatica di missione.
Recupera `15-LEVEL_DESIGN` (A-canon). Engine objective gia' LIVE (ADR-2026-04-20).

## 1. Scopo e non-scopo

**Scopo.** Definire i 6 tipi-obiettivo + lo schema encounter/wave riusabile + la copertura
template (6/6) + le estensioni PROPOSTE a SPEC-D (mission_type -> scene grammar) e SPEC-I
(pressione per tipo) + il difficulty profile + il gate di calibrazione full-loop. SPEC-O
ALIMENTA gli engine LIVE (objectiveEvaluator, encounterLoader), non li riscrive.

**Non-scopo (esplicito).**

- SPEC-O NON reimplementa l'objective engine: `objectiveEvaluator.js` (ADR-2026-04-20) +
  `encounterLoader.js` sono LIVE. Qui si forniscono i template + si propone l'estensione.
- SPEC-O NON ridefinisce lo schema encounter: `schemas/evo/encounter.schema.json` esiste
  (6 tipi nell'enum); i template vi si conformano.
- SPEC-O NON e' un re-design hand-crafted-vs-procedurale: `15-LEVEL_DESIGN` ha gia' deciso
  hand-crafted dentro i biomi (derivato, non fork); i template sono seed-dati, non output di
  un generatore.
- SPEC-O NON possiede l'authority di SPEC-D/I: propone l'estensione `mission_type`, non la
  ratifica al posto loro (OA1).

## 2. Baseline LIVE (verificato 2026-06-08, non ricostruire)

| Engine / artefatto                                        | Ruolo / stato                                                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/combat/objectiveEvaluator.js` (ADR-2026-04-20)  | Registry LIVE di TUTTI e 6 i tipi (elimination/capture_point/escort/sabotage/survival/escape) -> {completed,failed,outcome}.                      |
| `services/combat/encounterLoader.js`                      | Carica encounter schema-validi da `docs/planning/encounters/` (+ `encounters-draft/` in graphMode).                                               |
| `schemas/evo/encounter.schema.json`                       | Schema encounter: `objective.type` enum (6 tipi), `waves`, `player_spawn`, `grid_size`, `difficulty_rating`, `tags` (enum).                       |
| `tools/py/author_encounter.py`                            | Authoring + validazione struttura vs schema; `tests/scripts/encounterSchema.test.js` valida tutti i template (AJV).                               |
| `docs/planning/encounters/*.yaml`                         | **12 template schema-validi** (post-SPEC-O): 6/6 tipi coperti (vedi sez. 5).                                                                      |
| `data/core/missions/skydock_siege.yaml`                   | TUNE-LOG (formato `groups`/`party_vc`, NON schema-encounter) -- distinto dai template.                                                            |
| `tools/sim/full-loop-runner.js`                           | Runner full-loop; `completion_rate`. OA2 LIVE: mission-type-aware via `combat-adapter` objective-outcome + `combat-policy` zone-pursuit (sez. 9). |
| difficulty: `difficulty_rating` (schema 1-5) + class mult | `hardcoreScenario`/`tutorialScenario` moltiplicatore per classe. NESSUN modulo DifficultyCalculator (OA3).                                        |

Invarianti ereditate:

- **ADR-2026-04-20 (objective parametrizzato + damage curves):** difficolta' come FEATURE,
  non tuning; objective evaluator pluggable; loss_conditions decouplate dalle win conditions.
- **15-LEVEL_DESIGN (A-canon):** 6 tipi-obiettivo; encounter hand-crafted dentro i biomi.
- **Tags enum (schema):** `tutorial/standard/boss/survival/escort/puzzle/timed/night/storm`
  -- NIENTE tag custom (verificato: il test rifiuta tag fuori enum).
- **Gate-5 / 50-righe / kill-60:** i template sono DATA (`docs/planning/encounters/`, fuori
  apps/backend/); il content-production e' autorizzato esplicitamente (Eduardo 2026-06-08).

## 3. I 6 tipi-obiettivo

Ogni tipo ha un evaluator LIVE (`objectiveEvaluator.js`) + campi `objective.*` nello schema:

| Tipo            | Campi `objective`                                                           | Win / evaluator                                                                       |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `elimination`   | (default; nessun campo extra)                                               | SIS HP=0 (fallback)                                                                   |
| `capture_point` | `target_zone`, `hold_turns`, `min_units_in_zone`                            | PG in zona per N turni consecutivi                                                    |
| `escort`        | `escort_target`, `target_zone` (extract)                                    | escort_target vivo + in extract_zone                                                  |
| `sabotage`      | `target_zone`, `sabotage_turns_required`, `time_limit`, `min_units_in_zone` | PG (>= `min_units_in_zone`, default 1) in zona N turni CUMULATIVI entro il time_limit |
| `survival`      | `survive_turns`                                                             | player vivo AND turn >= survive_turns                                                 |
| `escape`        | `target_zone`, `time_limit`                                                 | TUTTI i PG in target_zone entro il time_limit                                         |

- `loss_conditions` (ADR-2026-04-20) decouplano la sconfitta: `time_limit` + `player_wipe`.
- Il fallimento di un obiettivo emette outcome (`objective_failed`/`wipe`/`timeout`) = trigger
  run-fail per SPEC-P sez. 3.

## 4. Schema encounter + wave config

Contratto template (`schemas/evo/encounter.schema.json`):

- Required: `encounter_id` (`^enc_[a-z0-9_]+$`), `name`, `biome_id`, `grid_size`,
  `objective`, `player_spawn`, `waves`, `difficulty_rating` (1-5).
- `waves[]`: `wave_id`, `turn_trigger`, `spawn_points`, `units[]` (`species`, `count`,
  `tier` base/elite/apex, `ai_profile`, `affixes`).
- `conditions[]` opzionali: fog_of_war / stress_wave / terrain_collapse /
  allied_reinforcement / environmental_mutation.
- `tags`: solo enum (sez. 2). `encounter_class`: standard/hardcore/tutorial (moltiplicatore).
- Validazione: `author_encounter.py` + `encounterSchema.test.js` (AJV, fail-on-invalid).

## 5. Copertura template 6/6

Dopo SPEC-O, `docs/planning/encounters/` copre tutti i 6 tipi (12 template schema-validi):

| Tipo          | Template (esempi)                                                                       | Stato                      |
| ------------- | --------------------------------------------------------------------------------------- | -------------------------- |
| elimination   | `enc_tutorial_01`, `enc_savana_01`, `enc_hardcore_reinf_01`                             | pre-esistenti              |
| capture_point | `enc_capture_01`, `enc_caverna_02`                                                      | pre-esistenti              |
| escort        | `enc_escort_01`                                                                         | pre-esistente              |
| survival      | `enc_survival_01`, `enc_frattura_03`, `enc_tutorial_02`, `enc_savana_skiv_solo_vs_pack` | pre-esistenti              |
| **sabotage**  | `enc_sabotage_01` (Detonazione nel Cuore)                                               | **+ SPEC-O #2640 (DRAFT)** |
| **escape**    | `enc_escape_01` (Fuga dalla Faglia)                                                     | **+ SPEC-O #2640 (DRAFT)** |

- I 2 nuovi sono schema-validi (15/15 test) ma **NON calibrati** (roster/wave provvisori,
  mirror degli esistenti); NB l'AI-profile `aggressive` va rivisto in calibrazione (es.
  escape: il nemico dovrebbe INSEGUIRE, non presidiare). Calibrazione = sez. 9.

## 6. Integrazione SPEC-D (mission_type -> scene grammar) [PROPOSTA]

- INTENTO: `mission_type` come context del Director -> grammatica scene/camera beats (es. un
  escape ha beats diversi da un'eliminazione).
- **Stato reale (verificato):** SPEC-D e' round-scoped; NON ha hook `mission_type`. Questa e'
  una ESTENSIONE DA PROPORRE, non un contratto esistente. Ownership = OA1.

## 7. Integrazione SPEC-I (pressione per tipo) [PROPOSTA]

- INTENTO: la pressione ERMES scala col tipo-obiettivo (es. survival alza la pressione nel
  tempo).
- **Stato reale (verificato):** SPEC-I e' per-bioma (low/med/high band); NON ha hook
  `objective_type`. ESTENSIONE DA PROPORRE entro il cap ER2. Ownership = OA1.

## 8. Difficulty profile

- LIVE: `difficulty_rating` (schema 1-5) + moltiplicatore per `encounter_class`
  (tutorial 1.0x / hardcore 1.4x+enrage). Difficolta'-come-feature (ADR-2026-04-20).
- NON esiste un modulo `DifficultyCalculator` (vedi `difficulty-integration.md`: "da
  creare"). Se costruirlo (profilo difficolta' per template) = fork OA3.

## 9. Calibrazione full-loop

- Metrica: `completion_rate` target **0.40-0.70** per template (mirror band full-loop).
- **OA2 LIVE (2026-06-08): la calibrazione non-elimination e' ora possibile.** (a)
  `SUPPORTED_OBJECTIVES` esteso a tutti e 6 i tipi (`scenario-enemies.js`); (b) DRIVER
  objective-aware (`combat-policy` zone-pursuit + hold: i PG vanno verso `target_zone` e
  tengono la zona) + objective-OUTCOME (`combat-adapter` legge l'evaluation: completed->victory
  / failed->defeat, NON solo elimination); (c) il runner e' mission-type-aware. Verificato:
  `enc_sabotage_01` completa via objective con un nemico immortale (hp300) = NON elimination.
  Elimination resta a costo-zero (poll evaluation solo per non-elim -> nessuna regressione/flake).
  Residuo: tuning `completion_rate` N=40 + traversal multi-unit con `min_units_in_zone>1`.
- Gate di promozione: un template passa da DRAFT a "ratificato" solo con `completion_rate`
  in banda su N=40 (mirror SPEC-I/ERMES gate), senza regressione fuori banda.

## 10. Visibilita' (eredita SPEC-B)

| Dato mission                              | Tier     | Razionale                                                                                                                                                         |
| ----------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipo-obiettivo + obiettivo della missione | `public` | il tavolo sa cosa fa la missione (TV). NB: SPEC-B non ha riga esplicita per objective-type/difficulty -> SPEC-O la PROPONE (addendum SPEC-B, come SPEC-I sez. 9). |
| Wave / roster nemico (pre-spawn)          | `secret` | non si rivela il roster futuro (sorpresa tattica); engine-side.                                                                                                   |
| Stato obiettivo (progress, hold count)    | `public` | parte del combat condiviso (TV), via event-log.                                                                                                                   |
| `difficulty_rating` del template          | `public` | leggibilita' (stelle 1-5).                                                                                                                                        |

## 11. Relazione con altre spec

- **SPEC-D** (TV director): consuma l'event-log; l'estensione `mission_type` (sez. 6) e'
  proposta, soggetta a review SPEC-D (OA1).
- **SPEC-I** (ERMES): l'estensione pressione-per-tipo (sez. 7) e' proposta, entro il cap ER2
  (OA1).
- **SPEC-P** (failure-as-lore): i fallimenti obiettivo (timeout/wipe/objective_failed) sono
  trigger run-fail (SPEC-P sez. 3).
- **SPEC-B/A**: visibilita' (sez. 10) + tier.
- **SPEC-L**: traccia lo stato (engine 6/6 LIVE; template 6/6 schema-validi; calibrazione +
  integrazioni D/I = pending).

## 12. Decisioni

Fork etichetta `OA#` (anti-clash con F/G/H/E/FC/TS/J/HA/ER/QA/PA/MA).

**Ratificate (Eduardo 2026-06-08):**

| Fork | Esito ratificato (2026-06-08)                                                           |
| ---- | --------------------------------------------------------------------------------------- |
| OA1  | SPEC-O dichiara `mission_type` (= objective.type); SPEC-D/SPEC-I aprono addendum loro   |
| OA2  | Un solo runner + param `mission_type` (estende SUPPORTED_OBJECTIVES + driver objective) |
| OA3  | Resta `difficulty_rating` + moltiplicatore classe (MVP); DifficultyCalculator deferito  |

Sotto: opzioni/rationale originali di ogni fork (storia della decisione).

### OA1 -- Ownership dell'integrazione mission_type (SPEC-D + SPEC-I)

SPEC-O propone `mission_type` come hook per Director (scene grammar) + ERMES (pressione per
tipo). Chi possiede il contratto?

- **Opzione A -- SPEC-O definisce il campo, SPEC-D/I lo consumano (raccomandata).** SPEC-O
  dichiara `mission_type` sul template (gia' = `objective.type`); SPEC-D/SPEC-I aprono un
  addendum per consumarlo (review loro). Tradeoff: SPEC-O non si blocca; D/I decidono il
  proprio uso. Mirror del pattern MA2 -> SPEC-K.
- **Opzione B -- SPEC-D/I ownano tutto.** SPEC-O fornisce solo i template; le integrazioni
  sono interamente in SPEC-D/I. Tradeoff: confine pulito, ma SPEC-O perde la "grammatica
  condivisa" dichiarata nell'obiettivo.
- **Raccomandazione:** A (il campo esiste gia' come `objective.type`; D/I aprono addendum).

### OA2 -- Come rendere il full-loop-runner mission-type-aware

Per calibrare `completion_rate` per tipo serve estendere il runner.

- **Opzione A -- parametro `mission_type` sul runner (raccomandata).** Un solo runner che
  carica il template (encounterLoader) + applica l'objective evaluator del tipo. **Scope reale
  (verificato):** include (1) estendere `SUPPORTED_OBJECTIVES` in `scenario-enemies.js` (oggi
  solo elimination), (2) un driver objective non-elim nel loop sim (hold/escape/escort
  survival), oltre al param. Tradeoff: riusa l'engine objective LIVE; un solo harness.
- **Opzione B -- scenari per-template dedicati.** Uno scenario sim per ogni tipo. Tradeoff:
  piu' controllo per-tipo, ma 6 harness da mantenere.
- **Raccomandazione:** A (carica il template reale, niente duplicazione).

### OA3 -- DifficultyCalculator: costruirlo o restare su field + class-mult?

- **Opzione A -- restare su field + class-mult (raccomandata MVP).** `difficulty_rating` +
  moltiplicatore per classe bastano per i template draft. Tradeoff: zero nuovo modulo;
  difficolta' meno granulare.
- **Opzione B -- costruire DifficultyCalculator** (profilo per template). Tradeoff: piu'
  granularita', ma nuovo modulo + tuning (difficulty-integration.md).
- **Raccomandazione:** A ora; B se la calibrazione (sez. 9) lo richiede.

## 13. Acceptance

SPEC-O e' implementabile/chiudibile quando:

1. i 6 tipi-obiettivo (sez. 3) hanno ciascuno >=1 template schema-valido in
   `docs/planning/encounters/` (FATTO: 6/6, `encounterSchema.test.js` verde);
2. OA2 e' risolto+implementato (LIVE: `SUPPORTED_OBJECTIVES` esteso + driver zone-pursuit
   (`combat-policy`) + objective-outcome (`combat-adapter`)); resta la CALIBRAZIONE dei template
   sabotage/escape (`completion_rate` 0.40-0.70 su N=40 col ROSTER REALE) + traversal
   `min_units_in_zone>1` -- oggi DRAFT;
3. l'integrazione `mission_type` con SPEC-D (scene grammar) + SPEC-I (pressione per tipo) e'
   contrattualizzata secondo l'ownership OA1 (addendum D/I);
4. il difficulty profile (OA3) e' deciso (field+mult vs DifficultyCalculator);
5. la visibilita' (sez. 10) e' coerente con SPEC-B (tipo/obiettivo `public`, roster `secret`);
6. OA1-OA3 sono ratificati da Eduardo; il flip `review_needed` -> `accepted` al merge resta a
   lui (`source_of_truth:false`).
