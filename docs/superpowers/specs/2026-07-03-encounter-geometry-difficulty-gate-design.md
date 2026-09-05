---
title: 'Encounter geometry difficulty gate + big-maps pivot -- design spec'
date: 2026-07-03
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-07-03'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [balance, encounter, xp-budget, geometry, hazard, grid, board-size, descent, spec]
---

# Encounter geometry difficulty gate + big-maps pivot -- design spec

> **Origine**: finding 2026-07-03 -- `computeEncounterBudget` e' GRID-BLIND (nessun termine
> board/diagonale/spawn-distance) -> `auditEncounter` reporta `in_band` anche quando la
> geometria cambia la difficolta' reale. Owner ha ANCHE aperto un pivot di direzione: mappe
> GRANDI stile Descent (hazard + control point + wave + esplorazione + sopravvivenza bioma).
> Questo spec copre entrambi: (A) il GATE di difficolta' geometry-aware -- buildable ora,
> band-neutral flag-OFF; (B) il PIVOT big-maps -- design-scoped qui, implementazione gated su ADR.
> Decisioni = 2 verdetti master-dd (AskUserQuestion 2026-07-03) + ricerca pcg-level-design.
> Feed -> writing-plans. Nessun flag flippato, nessuna griglia ingrandita in questo spec.

## 0. Coordinamento cross-session (parent: "mappe grandi Evo-Tactics")

**QUESTO spec e' downstream** della sessione parent `local_fa7cb1d7` (repo `codemasterdd-ai-station`,
worktree `vigilant-brahmagupta-1ae47d`, PR #585). Il parent ha gia' fatto la ricerca big-map + fatto
RATIFICARE a Eduardo 10 decisioni. Materiale letto (2026-07-03):

- `docs/research/2026-07-03-big-map-tactical-design-reference-evo-tactics.md` -- ricerca big-map
  (Descent/Gloomhaven/XCOM/Frosthaven/IA/Lancer/CoQ...). **La mia ricerca pcg-level-design CONVERGE**
  con questa (stessi donor, stesso verdetto: board-size = lever piu' debole; activation + hazard =
  lever reali; spawn-distance = fairness). Quella del parent e' l'AUTHORITY Eduardo-ratificata.
- `docs/superpowers/specs/2026-07-02-evo-tactics-combat-map-generator-design.md` -- map-generator
  **DEFERRED** (fork-A "mappe brutte" -> il primo passo reale = binario VISIVO, non procgen).
- `docs/research/2026-07-03-lore-driven-triggers-campaign-traits.md` -- addendum D7 (trigger lore-driven).

**Divisione del lavoro** (cross-repo): il parent = design + ricerca + ratifica (in
`codemasterdd-ai-station`); QUESTO spec = **l'implementazione Game-side** (backend balance-authority)
del task che il parent chiama "xpBudget gate-drift" (report parent sez. 5.3). Il codice vive in
`C:\dev\Game` (mio worktree).

**10 decisioni RATIFICATE dal parent (D1-D10, 2026-07-03) -- NON ri-litigare:**

| #      | Decisione                                                                     | Impatto su questo spec                                            |
| ------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| D1     | Per-cella, parti-grande subito                                                | Rimpiazza il mio open-call B2 "raise cap": big e' ratificato      |
| D2     | Reveal-gating ibrido plot-and-parcel                                          | Contesto pivot; non tocca il gate                                 |
| D3     | LOS dentro il primo scope (port hex->square + Godot parity)                   | Sotto-progetto parent, non Game-gate                              |
| D4     | Wave = threat/pressure dial (Imperial Assault)                                | Termine gate futuro: "biome-pressure rate"                        |
| D5     | Survival clock = ENTRAMBI (moving-hazard-front + Frosthaven scaling)          | Termine gate futuro: hazard-scaling                               |
| D6     | Control point = 1-2 anchor + decay                                            | Termine gate futuro: control-point count/decay                    |
| D7     | Objective families = tutte e 4 + lore-trigger                                 | Termine gate futuro: objective-type multiplier                    |
| D8     | MOV trait-driven = tutte e 3 le leve                                          | Tocca reachability -> ratify N=40 (rafforza Task 2)               |
| **D9** | **Gate xpBudget = "WARN poi promuovi"** (warn -> calibra N=40 -> block; SDMG) | **Ruling diretto sul mio Task 1**                                 |
| D10    | Sequenza = slice VISIVO -> poi sistemi BACKEND                                | Sequencing: vedi sez. 9 (il gate warn e' groundwork band-neutral) |

**Conseguenza sul mio design**: (a) le mie open-call "B1-B4" (sez. 5/9) sono SUPERSEDED da D1-D10 --
non le ri-chiedo; (b) il mio Task 1 diventa il **primo slice del gate D9** (warn, staged), NON un gate
bloccante; (c) il termine hazard (Shape 1) + activation (Shape 2) e' un SOTTOINSIEME del term-set che
il parent (sez. 5.2) + l'audit `docs/balance/2026-04-25-encounter-xp-audit.md` identificano (anche:
control-point count/decay, objective-type multiplier, biome-pressure-dial rate, pressure_modifier). Gli
altri termini arrivano quando atterrano i sistemi D4-D7. (d) Il mio Task 2 (re-ratify N=10->N=40) e'
ESATTAMENTE il guardrail che il parent sez. 5.3 impone -- allineato, non nuovo.

## 1. Ground-truth verificato (worktree off origin/main, 2026-07-03)

Correzioni vs framing del finding (anti-pattern #19, marker != git):

1. **Finding CONFERMATO**: `apps/backend/services/balance/xpBudget.js:82` `computeEncounterBudget`
   = `budget_base * party_size_modifier`, ZERO geometria. `auditEncounter:97` somma stat-mass
   nemica (XP Pathfinder-donor) vs quel budget. Nessun termine board/spawn/hazard/objective.
   Il consumer runtime (`session.js:2733`) e' un **warn-log best-effort** (soft gate), non un
   hard block. Anche `tools/py/batch_calibrate_*` + agent balance-illuminator lo usano.
2. **Piu' grosso del finding**: il `grid_size` autorato NEGLI YAML e' `fase-2c`-UNWIRED sia a
   runtime sia in sim. `session.js:2406` e `tools/sim/scenario-enemies.js:41` dimensionano la
   board via `gridSizeFor(deployedCount)` (`services/party/loader.js:55` + `party.yaml:25`
   `grid_scaling`), NON via l'YAML. Il sim clampa gli spawn autorati a `GRID_SAFE_MAX=5`. Quindi
   **"ridimensionare un encounter" oggi NON e' raggiungibile** -- editare `grid_size` non cambia
   la board giocata. -> il termine-geometria deve leggere la board GIOCATA, e il pivot big-maps
   richiede prima di ricablare la derivazione grid (fase-2c). BUILD-AUDIT: `15-LEVEL_DESIGN.md`
   cita l'override esplicito hardcore-06 (`grid_size: 10`) come funzionante -- verificare in quale
   path runtime l'override e' onorato vs dove `gridSizeFor` vince (non risolto qui).
3. **Substrate hazard GIA' COSTRUITO** (build-on-existing, spec `2026-06-29-hazard-terrain-
encounter-volo-exercise-design.md` + PR #3061): `encounter.schema.json` ha gia' il blocco
   additivo `grid:{width,height,terrain_features:[{x,y,type,defense_mod}]}` (type enum =
   movement_profiles + radura); `grid.terrain_features` e' ingerito a `/start` (`session.js:2417`);
   `enc_deserto_caldo_bocche_vulcaniche_01.yaml` autora GIA' un muro lava+roccia. Costi terreno in
   `movement_profiles.yaml`; movimento gia' creature-relativo (`movementResolver.js` light/heavy +
   `applyVoloGrade` g1/g2/g3). Il flag `MOVE_TERRAIN_COST_ENABLED` resta OFF.
4. **`waves[].units[]` = RINFORZI, non roster iniziale**: il roster di partenza viene da
   `req.body.units` / scenario JS, NON dall'YAML. Lo schema wave-unit e' `additionalProperties:false`.
   -> l'activation-count STATICO da YAML vede solo le wave di rinforzo, non i nemici iniziali:
   Shape 2 statico e' un'APPROSSIMAZIONE (nota sotto). L'attuale `auditEncounter` somma comunque
   solo `waves[].units[]` + reinforcement_pool -- stessa limitazione, gia' presente.
5. **Task 3 blast-radius**: `estimated_turns` NON e' unreferenced. Nessun GATE lo legge, ma e'
   validato/emesso da `author_encounter.py:148` (+ `tests/test_author_encounter.py`), settato da 5
   scenario builder (`{tutorial,hardcore,forestaPilot,badlandsPilot,ultimaCaccia}Scenario.js`, 12
   ref), e nello schema (`encounter.schema.json:237`). Drop = ~20 file, non 21 righe. Turn-pressure
   NON persa: `turn_limit_defeat` (hardcore=25/boss=20) + `loss_conditions.time_limit` la portano gia'.
6. **Macchinario re-ratify (Task 2)**: `tools/sim/full-loop-batch.js --runs N --branch <chain>
--seed-base <n>` -> JSONL+summary+report con provenance (seed+commit+policy+flags). Bande
   PROVISIONAL finche' master-dd non ratifica post-N=40 (L-069). Author-guard da mirrorare:
   `tools/js/validate_encounter_difficulty.js` (wired in `run-test-api.cjs`).
7. **Canon**: ADR-2026-04-16 (hex) + ADR-2026-04-17 (coop-scaling) cappano board a 10x10 +
   auto-derivano da party size. Big-maps = pivot che tocca questo -> ADR via `sot-planner`.

## 2. Ricerca (pcg-level-design-illuminator, 2026-07-03) -- verdetto sui lever

Report completo consegnato in sessione (game-source-index museum-first: dominio Descent NON
catalogato -> ricerca giustificata). Sintesi ranked dei lever di difficolta':

- **Board size RAW = lever PIU' DEBOLE**. Nessun donor (PF2e, 5e, Frosthaven, Lancer, Descent,
  Zombicide, Wesnoth) mette grid-area in una formula difficolta'. Wesnoth tratta le mappe grandi
  come RISCHIO da mitigare (fog + objective), non fonte di difficolta'. -> NON mettere grid_size/area
  in `computeEncounterBudget`.
- **#1 lever = activation count simultaneo** (Lancer ~1.5x party; XCOM pod-swarm). L'audit somma
  stat-mass, non conta MAI le attivazioni concorrenti (1 boss vs 6 minion = stesso XP, pressione
  diversa). Termine nuovo piu' difendibile.
- **#2 lever = hazard coverage x scalar difficolta'** (Frosthaven accoppia danno hazard al
  scenario-level, riusa UNA manopola). Piu' economico, riusa `encounter_class`.
- **Spawn-distance = vincolo di FAIRNESS, non difficolta'** (refuta l'istinto iniziale
  spawn-distance-discount). Wave count/timing = reale ma gia' correttamente disaccoppiato dalla
  board size (`reinforcement_policy.cooldown_rounds`). Control-point count = non formalizzato come
  budget input in nessun donor.
- **Canon de-scoping**: override per-encounter di `grid_size` GIA' esiste (hardcore-06) + max
  `grid_size` gia' 20 (genre-precedent: 20x20 e' gia' "grande"). Pivot = DENSITA' (hazard/objective/
  wave authoring) + rendere l'override il default per una nuova classe, NON riscrivere la coppia ADR
  ne' alzare il cap.

## 3. Decisioni (2 verdetti master-dd 2026-07-03)

- **Q1 Shapes**: **Shape 1 GATE + Shape 2 PASSIVE**. Il termine hazard-coupled diventa gate reale
  (band-neutral su 20/21 encounter senza hazard; morde solo `enc_deserto_caldo_*` flag-ON);
  l'activation-pressure e' CALCOLATO + reportato nell'output audit + loggato, ma NON cambia lo
  `status` finche' non ratificato N=40. Shape 3 (mobility-normalized) -> backlog.
- **Q2 Scope**: **Gate + scope del pivot**. Questo spec progetta ANCHE il fase-2c grid-wiring
  (reconcile `grid_size` autorato vs `gridSizeFor`) + nuova classe/flag board_scale + densita'
  hazard/fog. L'implementazione del pivot resta gated su ADR (sez. 5).
- (sessione precedente) Task 3 = **drop `estimated_turns`**. Task 2 = **doc + author-guard warn**.

## 4. Architettura A -- il GATE (buildable ora, unita' isolate)

### A1. xpBudget geometry term (Task 1)

`apps/backend/services/balance/xpBudget.js` -- flag `XP_BUDGET_GEOMETRY_ENABLED` (default OFF via
env, come `PRESSURE_TIER_FLOOR_ENABLED`/`LETHAL_MISSIONS_ENABLED`). Config in
`data/core/balance/xp_budget.yaml` (nuova sezione `geometry`, valori PROPOSED).

- **Shape 1 (hazard-coupled, gate)**: nuovo helper puro `hazardBudgetContribution(encounter,
classScalar)` = `sum over grid.terrain_features where type in HAZARD_SET of (hazard_xp[type] *
class_scalar)`. `HAZARD_SET` + `hazard_xp` in config (default: lava/acqua_profonda pesano,
  roccia/sabbia/radura = 0). `class_scalar` = riusa l'asse `encounter_class` (mapping in config,
  default 1.0..2.0 coerente con `15-LEVEL_DESIGN.md`). Il contributo si somma a `used` in
  `auditEncounter` SOLO se il flag e' ON. Flag-OFF = byte-identical (band-neutral totale).
- **Shape 2 (activation-pressure, PASSIVE)**: helper puro `activationPressure(encounter, partySize)`
  = `max over turn_trigger of (cumulative unit_count spawned by that turn) / partySize`
  (worst-case statico: assume nessuno morto). Aggiunge al return di `auditEncounter` i campi
  `activation_ratio` + `activation_status` ('under'/'in_band'/'over' su banda [1.0,2.0] da config).
  **SEMPRE calcolato + reportato, indipendente dal flag** (lo scopo e' l'osservazione PRE-flip: se
  gatasse dietro il flag non si vedrebbe divergere da Shape 1 prima di flippare). `activation_status`
  NON entra MAI nel calcolo di `status` (il gate resta lo XP ratio) -> band-neutrality del VERDETTO
  preservata; e' additivo, i consumer destrutturano chiavi specifiche. Loggato nel warn di
  `session.js` come metrica osservativa. NOTA: statico vede solo le wave di rinforzo (roster iniziale
  = payload) -> documentato come approssimazione; la versione dinamica (hook sim) = backlog.
- Il return di `auditEncounter` resta backward-compatible (campi aggiunti, nessuno rimosso) -> i
  consumer esistenti non si rompono.
- **TDD**: `tests/services/xpBudget.test.js` estende -- (a) flag-OFF = identico all'attuale
  (regression), (b) flag-ON hazard term muove `used` su un fixture con terrain_features, (c)
  activation_ratio corretto su fixture multi-wave, (d) activation_status non altera `status`.

**Allineamento D9 + due implementazioni xpBudget (ground-truth dal parent + audit):**

- **D9 = "warn poi promuovi"**: il flag E' il meccanismo di staging. Flag OFF = solo il warn-log
  attuale (`session.js:2734-2749`, status quo, band-neutral). Calibra N=40. Poi il flip del flag =
  "promuovi". Nessun hard-block introdotto ora -- coerente con D9.
- **Due modelli xpBudget divergenti** (verificato): il RUNTIME Node
  `apps/backend/services/balance/xpBudget.js` (target Task 1, wire al warn `session.js`) =
  `budget_base * party_mod`; il Python `tools/py/encounter_xp_budget.py` (genera l'audit
  `docs/balance/2026-04-25-encounter-xp-audit.md`) = `party_power * difficulty_multiplier`. Formule
  diverse. Task 1 tocca il Node (il gate live). Convergenza dei due = follow-up (loggato, non in PR 1).
- **Shape 2 e' GIA' raccomandato dall'audit**: l'audit propone `enemy_power *= (1 + 0.1 *
max(0, party_size - enemy_count))` (action-economy/concentrazione) -- semanticamente == il mio
  activation_ratio (Lancer lever del parent). L'audit mostra il modello sotto-predice sistematicamente
  (6/8 too_easy) -> il gate e' gia' noto-rotto; Shape 1/2 e' il primo passo del fix, non un capriccio.
- **Term-set futuro (slice D4-D7)**: control-point count/decay (D6), objective-type multiplier (D7),
  biome-pressure-dial rate (D4), hazard-scaling col clock (D5), pressure_modifier (audit). Arrivano
  quando atterrano i sistemi; Shape 1 (hazard) + Shape 2 (activation) = il primo slice buildabile ora.

### A2. Author-guard re-ratify (Task 2)

- `tools/js/validate_encounter_grid_ratify.js` (mirror di `validate_encounter_difficulty.js`,
  location `tools/js` = no forbidden-path): baseline UNICO = registry `data/core/balance/
grid_ratify_baseline.json` (map `enc_id -> { grid_size, evidence_ref, ratified_at }`). Per ogni
  `enc_*.yaml`: se il `grid_size` corrente != `baseline[enc_id].grid_size` E `evidence_ref` non
  punta a un report piu' recente della modifica, emette WARN non-bloccante. Il baseline si aggiorna
  (grid_size + evidence_ref + ratified_at) quando l'evidence N=40 e' registrata. Encounter assente
  dal baseline = WARN "unratified grid" (nuovo encounter va ratificato). Wired in `run-test-api.cjs`
  (advisory), come il difficulty validator.
- **Regola codificata** (doc, non solo tooling): `CLAUDE.md` guardrail sprint + `docs/core/
15-LEVEL_DESIGN.md` -> "ANY encounter il cui grid cambia DEVE ri-eseguire N=10-probe ->
  N=40-ratify (`tools/sim/full-loop-batch.js`, L-069). La ratifica esistente NON si trasferisce a
  una nuova taglia." Questo spec = la fonte della regola.
- **TDD**: `tests/js/validate_encounter_grid_ratify.test.js` -- grid invariato = 0 warn; grid
  cambiato senza evidence = 1 warn; grid cambiato con evidence = 0 warn.

### A3. Drop estimated_turns (Task 3)

Rimozione completa (~20 file): `encounter.schema.json:237`, i 21 YAML in `docs/planning/
encounters*`, `author_encounter.py:148-152` (+ `tests/test_author_encounter.py:58/61`), i 5
scenario builder (12 ref). Turn-pressure preservata da `turn_limit_defeat`/`loss_conditions.
time_limit` (nessun mechanic perso). **TDD**: `test_author_encounter.py` aggiornato (no piu'
estimated_turns), `encounterSchema.test.js` verde su tutti gli YAML senza il campo,
`validate-datasets` verde.

## 5. Architettura B -- il PIVOT big-maps (design-scoped, implementazione gated su ADR)

> B NON si costruisce in questo spec. **AGGIORNAMENTO post-coordinamento (sez. 0)**: il pivot big-maps
> e' l'ARCO DEL PARENT (`codemasterdd-ai-station`, D1-D10 ratificati). I marker `[OWNER-REVIEW B1-B4]`
> qui sotto sono SUPERSEDED da D1-D10 e restano solo come vista Game-side / ground-truth del wiring --
> le decisioni sono del parent, non ri-aperte qui. L'ADR big-maps = via `sot-planner` nell'arco parent.

### B1. fase-2c grid-wiring (reconcile authored grid_size vs gridSizeFor)

Problema (sez. 1.2): la board giocata = `gridSizeFor(deployed)`, l'YAML `grid_size` e' decorativo.
Proposta: `gridSizeFor(deployedCount, boardScale)` -- quando `boardScale === 'authored'` ritorna il
`grid_size` dell'encounter; altrimenti il comportamento fill-ratio attuale. + rimuovere/alzare il
clamp `GRID_SAFE_MAX=5` nel sim per le board authored (`scenario-enemies.js`). Reconcile con la
legibilita': `party.yaml grid_scaling` e' un vincolo di LEGGIBILITA' (fill < 25%) per roster fisso,
non un cap di difficolta' -- una board authored grande a fill basso resta leggibile se la densita'
viene da terrain/objective, non da unita'. **[OWNER-REVIEW B1]**: onorare authored grid solo per
board_scale=authored (retro-compatibile) vs cambiare la derivazione di default.

### B2. Come si dichiara una board grande -- flag vs class

- **Opzione flag (raccomandata, ricerca sez.4)**: `board_scale: authored|auto` ortogonale, riusa
  l'escape-hatch override gia' esistente (hardcore-06). Basso attrito, combinabile con ogni classe.
- **Opzione class**: nuovo `encounter_class` (`exploration`/`expedition`) -> coupling piu' pulito
  con lo scalar Shape 1, ma allarga l'enum + i mapping.
- **[OWNER-REVIEW B2]**: flag vs class. Raccomandazione = flag `board_scale` (meno invasivo);
  `grid_size` max resta 20 (nessun cambio cap -- Q2 NON ha scelto "raise cap").

### B3. Densita' anti-dead-time (il "come" della ricerca sez.A)

Le mappe grandi diventano interessanti NON con piu' terreno ma con: (1) info parziale che rende il
movimento una scommessa (`fog_of_war` gia' nell'enum conditions ma runtime-depth non verificata ->
build-audit) stile XCOM concealment/reveal-triggers-consequence; (2) spawn-zone curate (Descent/
Imperial Assault) -- `reinforcement_entry_tiles` gia' Manhattan-gated implementa questo; (3) pochi
nodi difendibili (BG3/DOS2 verticalita'+chokepoint); (4) objective/event density autorata per
riempire lo spazio (doctrine Wesnoth). Hazard coupling (Shape 1) accoppia il danno hazard allo
scalar classe (Frosthaven) -- prerequisito: `terrain_features` oggi porta solo `defense_mod`, serve
il coupling difficolta'. **[OWNER-REVIEW B3]**: min-zone-autorate obbligatorie per board grandi?
`fog_of_war` -> concealment vero o resta FOV-limiter?

### B4. ADR routing

Big-maps tocca la coppia ADR-04-16/04-17 + party auto-grid. Per CLAUDE.md le decisioni ADR-level
escalano a `sot-planner`. Proposta ricerca: **nuovo ADR** che documenta "manual grid_size override =
path sancito per classi non-legibility-constrained", senza riscrivere gli originali. **[OWNER-REVIEW
B4]**: nuovo ADR vs emendare i due. Instradare via `sot-planner`, NON deciso qui.

## 6. Band-neutrality + flag matrix

| componente           | flag                         | default        | effetto flag-OFF                                                     | effetto flag-ON                                                   |
| -------------------- | ---------------------------- | -------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Shape 1 hazard term  | `XP_BUDGET_GEOMETRY_ENABLED` | OFF            | byte-identical                                                       | muove `used` solo su encounter con hazard (oggi 1: deserto_caldo) |
| Shape 2 activation   | nessuno (sempre on, passive) | n/a            | campi `activation_*` sempre reportati, NON gate (verdetto invariato) | idem                                                              |
| author-guard grid    | advisory                     | on (warn-only) | n/a                                                                  | WARN se grid cambia senza evidence                                |
| drop estimated_turns | --                           | --             | rimozione secca, nessun mechanic perso                               | --                                                                |
| pivot B              | --                           | design-only    | non costruito                                                        | gated su ADR                                                      |

## 7. Fasi (TDD) -- decomposizione

- **PR 1 (il GATE, buildable ora)**: A1 xpBudget geometry (Shape1 gate + Shape2 passive, flag OFF,
  config) + A2 author-guard + doc-regola + A3 drop estimated_turns. Band-neutral, no ADR, no
  forbidden-path eccetto `encounter.schema.json` (drop di una property = additivo-inverso, additive-
  safe ma tocca `schemas/evo` -> master-dd merge-gate) e la rimozione dal campo. Shippable.
- **PR 2+ (il PIVOT, post-ADR)**: B1 grid-wiring + B2 flag/class + B3 densita' + B4 ADR. Gated su
  sot-planner + owner. NON in PR 1.

**Nota decomposizione**: se PR 1 si rivela troppo grande (drop estimated_turns ~20 file + geometry
term), splittare A3 (drop, meccanico) da A1/A2 (feature) in due PR. Deciso in writing-plans.

## 8. Definition of Done (PR 1)

- `node --test tests/services/xpBudget.test.js` verde (regression flag-OFF + nuovi casi flag-ON).
- `node --test tests/ai/*.test.js` verde (baseline AI preservata).
- `node tools/js/validate_encounter_grid_ratify.js` gira (warn-only, 0 falsi-warn sul set attuale).
- `python3 tools/py/game_cli.py validate-datasets` + `encounterSchema.test.js` verdi post-drop.
- `npm run format:check` + `python tools/check_docs_governance.py --strict` verdi.
- Flag `XP_BUDGET_GEOMETRY_ENABLED` resta OFF (band-neutral). Flip = owner-gated post N=40.
- Commit ADR-0011 (`Coding-Agent:` + `Trace-Id:`), no `Co-Authored-By:`.
- Guardrail segnalati: `schemas/evo/encounter.schema.json` (drop estimated_turns) -> master-dd
  merge-gate. Nessuna nuova dep.

## 9. Open design-calls (owner-review, riassunto)

- **[B1-B4] SUPERSEDED da D1-D10** (parent, sez. 0). NON ri-litigare: big/per-cella = D1; reveal =
  D2; LOS = D3 (sotto-progetto parent, non Game-gate); ADR big-maps = arco parent, non questo spec.
- **[S1] GENUINO -- sequencing sotto D10**: D10 = "slice VISIVO -> poi sistemi BACKEND". Il gate xpBudget
  di Task 1 e' warn-only + band-neutral + non tocca il render -> e' groundwork balance-authority che
  NON viola il visual-first ed E' il prerequisito che il parent (sez. 5.3) impone prima di dichiarare
  "bilanciata" qualsiasi mappa grande. **Domanda a Eduardo**: PR 1 (gate warn + author-guard + drop
  estimated_turns) procede ORA come groundwork, o si mette in coda dietro lo slice visivo?
- **[S2] Task 1 valori PROPOSED** `hazard_xp`/`HAZARD_SET`/banda activation in `xp_budget.yaml` = SDMG
  -> ratify N=40 (D9), non magic-constant ora.

## 10. Entry point implementazione

writing-plans -> piano dettagliato file-by-file TDD per PR 1 (il gate). PR 2+ (pivot) = spec
separato post-ADR. Worktree off origin/main, deps installati.
