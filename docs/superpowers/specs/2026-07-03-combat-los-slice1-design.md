# Design spec -- Combat LOS slice 1 (backend square-grid line-of-sight, flag-gated)

Data: 2026-07-03 (rev.2 post adversarial review) -- Stato: DRAFT in review (brainstorming Fase 2).
HARD-GATE: nessun codice prima di approvazione spec + implementation plan.
Arco padre: "big-map Descent-style" (codemasterdd
`docs/research/2026-07-03-big-map-tactical-design-reference-evo-tactics.md`, 10 decisioni sez.8).
Foundation coordinata: Game #3197 MERGED (D9 geometry gate warn-only) -- stessa disciplina flag-gated qui.

> **rev.2**: la meta' WIRING della rev.1 puntava a un file inventato (`apps/backend/services/ai/combat-policy.js`)
> e a un helper SIM-only (`tools/sim/combat-policy.js pickInRangeTarget`, non-exported). Corretto con il seam
> di produzione reale (verificato su codice da review adversarial harsh + ground-truth). Algoritmo + governance
> della rev.1 erano sani.

---

## 1. Contesto e obiettivo

Il redesign big-map assume la **line-of-sight** come PREREQUISITO (fog=permesso-spawn, cover, ambush).
Ground-truth verificato: il backend ha `getLineOfSight(from,to,blocksLosFn)` in
`apps/backend/services/grid/hexGrid.js:175` ma e' **HEX-native** (coord cube/axial q,r, interpolazione
float + `cubeRound`), con **zero chiamanti** di produzione, testato in `tests/ai/hexGrid.test.js`, SoT-green
come PRIMITIVA (non wired come meccanica). Il combat e' su **griglia QUADRATA intera** (`sessionConstants.js:12`
`GRID_SIZE=6`, posizioni `{x,y}` intere, distanza Manhattan). `resolveAttack({actor,target,rng})`
(`sessionHelpers.js:270`) **non ha geometria** negli input. Godot NON ha LOS.

Questo slice = il PRIMO taglio buildabile: LOS square-grid **intera nuova** (NON la hex float esistente),
wired nel seam di produzione, dietro flag OFF di default. Parita' Godot = slice successivo (stesso
algoritmo + stessi golden-vector in GDScript).

## 2. Decisioni ratificate (brainstorming)

| Asse                  | Scelta                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Primo slice dell'arco | **LOS** (prerequisito)                                                                      |
| Scope cross-repo      | **Backend-first**; parita' Godot = slice successivo (golden-vector fixture condivisa)       |
| Comportamento (ON)    | **Hard-block tiri a distanza + filtro bersagli LOS-clear (umano E AI)**                     |
| Algoritmo             | **Integer DDA supercover** (intero puro, corner-rule pinned -> parita'-safe, simmetrico)    |
| Flag                  | `COMBAT_LOS_ENABLED` **OFF di default** (band-neutral, mirror `XP_BUDGET_GEOMETRY_ENABLED`) |
| Blocker               | **Solo terreno** in slice 1 (`units_block_los:false`) -- interim DEGRADATO NOTO (vedi 2.1)  |

### 2.1 Gap noti dichiarati (non "future" vago, flaggati nel deliverable)

- **Unit-blocking assente** (`units_block_los:false`): con endpoint-esclusi, un'unita' interposta NON blocca
  -> **shoot-through-allies** e' un comportamento degradato NOTO di slice 1, documentato nel deliverable +
  QUALITY.md. Unit-blocking = follow-up immediato.
- **Reaction/bond/intercept/terrain-burst damage** (`session.js:1001` reactionEngine, `:1011`
  bondReactionTrigger, `:1309` terrainReactTile) **bypassano il gate LOS** in slice 1 -> known-gap
  flaggato, follow-up. Slice 1 gate = **solo attacchi diretti a distanza** (umano + AI).

## 3. Vincoli e non-scope

**Vincoli:**

- Flag OFF = **byte-identico** sul path di PRODUZIONE (`session.js` attack-handler + `performAttack`),
  regression test dedicato (NON sul sim helper).
- Algoritmo **integer-only** (no `/` divisione, no float, no `Math.hypot`) + corner-rule pinned ->
  risultati identici backend e futuro port Godot via golden-vector.
- `resolveAttack` e `performAttack` **NON toccati internamente**: il gate LOS vive come check ADDIZIONALE
  nell'attack-handler (che ha gia' posizioni + range-gate) PRIMA della risoluzione.
- Zero nuove dipendenze prod. Ratify come #3197: flip flag = owner-gated post N=40.
- ASCII-first; Conventional Commits; trailer ADR-0011.

**Non-scope:** parita' Godot (slice successivo); unit-blocking (2.1); reaction-path gating (2.1);
corner-to-corner permissive; fog/reveal/shadowcasting; elevation-as-blocker; hazard trasparenti.

## 4. Architettura (unita')

### 4.1 `squareLos.js` (puro, unit-tested) -- `apps/backend/services/grid/`

`lineOfSightClear(from, to, blocksCellFn) -> bool`; `from`/`to` = `{x,y}` celle intere; `blocksCellFn(x,y)->bool`.

**Integer-only DDA supercover** (aritmetica intera pura -- VIETATI `/`, float, `Math.hypot`; usa termini
di errore interi `2*dx`/`2*dy` alla Bresenham-supercover + step interi):

- Enumera le celle attraversate dal segmento A->B; ritorna `false` se una cella **strettamente
  intermedia** (endpoint ESCLUSI) blocca.
- **Corner-rule PINNED (la decisione piu' sensibile -- SDMG, testata):** quando il raggio passa
  esattamente per un vertice reticolare (grazing d'angolo), il raggio **NON entra** nelle due celle
  diagonali che condividono solo quel vertice (corner-cross = pass-through), **ECCETTO** se ENTRAMBE
  quelle celle diagonali sono blocker -> allora blocca ("strict diagonal squeeze"). Quindi:
  single-diagonal-blocker su corner-grazing = NON blocca; due diagonali blocker = blocca. Deterministico,
  pinnato da golden-vector espliciti di corner-grazing.
- Endpoint esclusi (bersaglio adiacente-a-blocker o SU cella-blocker resta targetabile; `from==to` =
  zero celle intermedie = sempre clear -> abilita' self/range-0 mai bloccate).
- **Simmetrico** (`clear(A,B)==clear(B,A)`), garantito dall'algoritmo intero + corner-rule.
- **Range coord garantito**: golden-vector coprono `|x|,|y|` in `[0, GRID_MAX=64]` (oltre = fuori dal
  combat); in quel range nessun overflow (JS Number 53-bit / GDScript int 64-bit coincidono su interi
  piccoli, purche' zero float intermedi).

### 4.2 Predicato blocker + config

`terrainBlocksLos(type) -> bool`: legge `los.blocker_terrain_types` da `data/core/balance/` (config
canonica, master-dd-ratificata; fonte UNICA -> il futuro port Godot legge la stessa lista). Slice 1
blocker = `roccia`, `vegetazione_densa`, `obstacle`. NON `elevation` (blocca move non vista), NON hazard
trasparenti (`lava`, `acqua_profonda`). `units_block_los:false`.
Lookup (API CORRETTA -- `terrainAtFromFeatures(features)` e' un **factory -> `Map<"x,y",type>`**,
`moveCost.js:10`):

```
const terrainAt = terrainAtFromFeatures(session.grid?.terrain_features || []) // Map<"x,y",type>
const blocksFn = (x, y) => { const t = terrainAt.get(`${x},${y}`); return t != null && terrainBlocksLos(t) }
```

(cella vuota -> `t == null` -> non blocca.) Riuso del precedente flag-gated `MOVE_TERRAIN_COST_ENABLED`
(`moveCost.js:76`) come pattern.

### 4.3 Wiring flag-gated (`COMBAT_LOS_ENABLED`, default OFF) -- IL SEAM REALE

Tre wire, ognuno esplicito:

- **(A) Path UMANO -- `session.js` attack-handler (~:2907)** [seam di produzione]. E' dove gia' si
  calcola `manhattanDistance(actor.position, target.position)` e si applica il range-gate
  (`if (attackDist > range) return 400`, ~:2913-2916). Aggiungi, quando flag ON, un gate LOS ADDIZIONALE
  subito dopo il range-gate e PRIMA di `performAttack`: costruisci `terrainAt` da
  `session.grid.terrain_features` (oggi NON caricato in questo path -> va aggiunto qui) e se
  `!lineOfSightClear(actor.position, target.position, blocksFn)` -> **reject** (stesso 400/invalid del
  range-gate). `resolveAttack` (:270) e `performAttack` (:683) INVARIATI internamente.
- **(B) Path AI -- `services/ai/policy.js` (~:128)** [seam di produzione]. La target/intent selection SIS
  (`manhattanDistance`, intent `attack`/`approach`, kite) quando flag ON filtra i candidati a LOS-clear
  (stesso `lineOfSightClear`). Senza questo il gate e' **one-sided** (l'AI sparerebbe oltre-muro).
- **(C) Parita' SIM -- `tools/sim/combat-policy.js` (`selectPlayerAction`/`pickInRangeTarget` ~:106)**
  [NON produzione]. Wire PARALLELO sim-side cosi' la batch-sim/ratify misura la STESSA regola LOS.
  Esplicitamente separato dai path (A)/(B): e' un helper SIM-only non-exported, mai chiamato dalla combat
  HTTP. Serve solo a far coincidere il ratify col comportamento reale.

Melee (adiacente) = LOS-clear banale. Flag OFF = nessuna chiamata LOS -> byte-identico su (A) (regression
test sul path di produzione, non sul sim).

## 5. Data flow (path A, produzione)

```
session.js attack-handler (~:2907): ha actor.position, target.position, session.grid
   range-gate Manhattan (esistente)  -> se fuori range: 400
   | (flag COMBAT_LOS_ENABLED ON)
   terrainAt = terrainAtFromFeatures(session.grid?.terrain_features || [])   // Map
   ok = lineOfSightClear(actor.position, target.position,
                         (x,y) => { const t=terrainAt.get(`${x},${y}`); return t!=null && terrainBlocksLos(t) })
   | ok=false -> reject (400/invalid) + warn-log++
   | ok=true  -> performAttack -> resolveAttack (INVARIATI)
```

Path (B) AI: stesso `lineOfSightClear` come filtro-candidati in policy.js. Path (C) sim: idem in
selectPlayerAction.

## 6. Testing e Definition of Done

Casa test: `tests/services/squareLos.test.js` + `tests/services/losWiring.test.js` (path A produzione) +
estensione `tests/sim/combatPolicy.test.js` (path C). `node --test`.

- **Step 1 Smoke**: `lineOfSightClear` linea libera / bloccata-terreno / adiacente-clear / endpoint-esclusi
  / `from==to`-clear / simmetria A-B==B-A / **corner-grazing single-blocker=clear** / **strict-diagonal
  two-blockers=blocked**. Golden-vectors caricati e verdi.
- **Step 2 Ricerca (>=3 edge)**: sgusciamento-diagonale, linea lungo bordo, blocker su endpoint
  (targetabile), grid 1xN, coord al bound (0 e 63).
- **Step 3 Tuning (>=1 delta)**: taratura `blocker_terrain_types` con metrica "% tiri bloccati" su un
  encounter **che contiene blocker terrain** (vedi 7), before/after.
- **Regression flag-OFF**: con `COMBAT_LOS_ENABLED` unset, output del **`session.js` attack-handler +
  performAttack** byte-identici a oggi (test dedicato sul path di PRODUZIONE).
- **Determinismo**: `lineOfSightClear` e' puro (nessun Math.random/Date). Il path attacco e'
  seed-controllable via harness seedato (`runWithSeed`); default unseeded = `Math.random`. Il ratify gira
  su batch seedato.
- **DoD**: `node --test` verde (output mostrato) + Prettier/lint + zero TODO/stub + `QUALITY.md` (3 step +
  i 2 gap noti di 2.1 esplicitati) + warn-log wired. Forbidden-path: `data/core/balance/los*` (config
  canonica) e/o `schemas/evo/*.schema.json` -> **master-dd sign-off** (come #3197).

## 7. Balance / ratify (disciplina D9/#3197) -- con PREREQ verificato

`COMBAT_LOS_ENABLED` OFF al merge = band-neutral. LOS-ON cambia il balance ranged -> flip = owner-gated
**post N=40** (N=10 probe -> N=40 ratify su `tools/sim/full-loop-batch.js`).

**PREREQ load-bearing (dal review):** la metrica "% tiri bloccati" e' rumore se gli encounter del corpus
di ratify **non hanno blocker terrain** (`moveCost.js:7-8` documenta: all-default-terrain -> band-neutral
anche flag-ON finche' una mappa non porta terreno tipizzato). Quindi PRIMA del ratify: **verifica che gli
encounter di `full-loop-batch` contengano `terrain_features` con blocker types**; se no, **autora blocker
terrain in >=1 encounter di ratify** (altrimenti N=40 gira su mappe vuote -> "0% bloccato -> safe-to-flip"
falso). Questo va nel plan come task-zero del blocco ratify.

SDMG: il set blocker + la corner-rule + le soglie sono self-designed = ipotesi -> falsificazione esterna
(harsh-reviewer + game-design-validator) prima di promuovere il flag.

## 8. Rischi / caveat

- **R1 corner-rule (SDMG, load-bearing)**: la regola corner-grazing/strict-diagonal (4.1) e' la decisione
  piu' sensibile; pinnata + testata con golden-vector dedicati, ma resta ipotesi -> falsificare.
- **R2 parita' integer JS<->GDScript**: "integer" da solo NON garantisce identita' (JS 53-bit vs GDScript
  64-bit, `/` float, `%` su negativi). Mitigazione: SOLO ops intere esplicite (no `/`, no float), bound
  coord `[0,64]`, golden-vector che coprono corner-cases + negativi + bordi. Un vettore che diverge nel
  port = bug del port, catturato dai golden-vector.
- **R3 shoot-through-allies** (terrain-only, 2.1): interim degradato NOTO, flaggato nel deliverable;
  follow-up = unit-blocking.
- **R4 reaction/bond/intercept ungated** (2.1): known-gap slice 1, flaggato; follow-up = estendere il gate
  a quei path o accettarli esplicitamente.
- **R5 corpus ratify vuoto** (7): se non verifichi il terreno-blocker nel corpus, il ratify e' teatro ->
  task-zero prima di N=40.

## 9. Metodi applicati (governance)

| Metodo                        | Dove                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Refresh-verify / ground-truth | seam LOS verificato su codice; **rev.2 dopo review adversarial** (il mio seam rev.1 era su file inventato -> corretto).       |
| Adversarial-verify (SDMG)     | harsh-reviewer + ground-truth su questo spec -> RETHINK wiring, corner-rule/API/AI-path/reaction-path/ratify-corpus corretti. |
| Agent-scanner                 | riuso harsh-reviewer + general-purpose; nessun nuovo agent.                                                                   |
| Coordinamento                 | allineato a #3197 (flag-gated warn-only + ratify N=40 + `data/core/balance/` config).                                         |
| Quality Gate 3-step           | sez. 6 + i 2 gap noti in QUALITY.md.                                                                                          |

## 10. Riferimenti (path VERIFICATI)

- Arco: `codemasterdd docs/research/2026-07-03-big-map-tactical-design-reference-evo-tactics.md` (sez.8).
- Foundation: Game #3197 + `docs/superpowers/specs/2026-07-03-encounter-geometry-difficulty-gate-design.md`.
- **Seam produzione UMANO**: `apps/backend/routes/session.js:2907` (attack-handler, manhattan+range-gate) +
  `:683` (`resolveAttack` call, invariato).
- **Seam produzione AI**: `apps/backend/services/ai/policy.js:128` (target/intent selection).
- **Sim (parita', NON produzione)**: `tools/sim/combat-policy.js:106` (`pickInRangeTarget`, non-exported;
  entry `selectPlayerAction`).
- LOS hex esistente (float, wrong-shape): `apps/backend/services/grid/hexGrid.js:175`.
- `resolveAttack` (geometry-free): `apps/backend/routes/sessionHelpers.js:270`.
- Terrain lookup (factory->Map): `apps/backend/services/combat/moveCost.js:10`; precedente flag-gated:
  `:76` (`MOVE_TERRAIN_COST_ENABLED`).
- Flag pattern: `apps/backend/services/balance/xpBudget.js:205` (`XP_BUDGET_GEOMETRY_ENABLED === 'true'`).
- Config home (master-dd-gated): `data/core/balance/`.
- Reaction/bond/terrain-burst (out-of-scope, flaggati): `apps/backend/routes/session.js:1001,1011,1309`.
