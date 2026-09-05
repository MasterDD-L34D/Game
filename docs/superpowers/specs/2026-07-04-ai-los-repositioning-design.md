---
title: 'AI LOS-repositioning: passo per riaprire la linea di vista (flag-dormant) -- design spec'
date: 2026-07-04
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-07-04'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [combat, ai, los, repositioning, ratify, sdmg, spec]
---

# AI LOS-repositioning: passo per riaprire la linea di vista (flag-dormant)

> **Origine**: la ratify direzione N=10 di `COMBAT_LOS_ENABLED` (PR #3207,
> `tools/sim/los-n-probe.js`) ha misurato WR flag-ON 0.70 vs OFF 1.00 (delta -0.30, +3 timeout)
> su una mappa dove il positive-control conferma 5/5 linee di tiro LOS-bloccate. Il calo e' in
> parte un GAP AI reale, non puro balance: quando tutti i target in-range sono LOS-bloccati, il
> player-proxy sim (`combat-policy.selectPlayerAction`) ricade su `stepToward(nearest)` e il
> Sistema AI prod (`declareSistemaIntents`, downgrade attack->approach) avanza verso il target --
> **nessuno dei due si riposiziona per riaprire la linea**. Sotto un muro di blocker l'attaccante
> cammina dritto e stalla -> timeout. Questo spec progetta il riposizionamento LOS-aware, cosi'
> la ratify misuri il balance-terreno reale e non il pathing stupido.

## 1. Contesto e obiettivo

Il flip di `COMBAT_LOS_ENABLED` e' owner-gated post N=40 (SDMG). La ratify e' inaffidabile finche'
l'AI resta cieca al riposizionamento: il delta WR e' confuso tra "il terreno cambia il balance"
e "l'AI non sa aggirare il blocker". Obiettivo: un passo di riposizionamento **greedy, deterministico,
condiviso** che, quando un'unita' vuole attaccare ma non ha LOS su nessun target in-range, muove
verso una cella adiacente che riapre una linea di tiro -- altrimenti ricade sul comportamento
attuale (mai peggio di oggi). Flag-dormant: raggiunto solo con `COMBAT_LOS_ENABLED` ON.

## 2. Decisioni ratificate (brainstorming 2026-07-04)

| Asse        | Scelta                                                                                                                                                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope       | **Player-proxy sim (`combat-policy`) + Sistema AI prod (`declareSistemaIntents`) insieme** -- stessa regola su entrambi = parita' AI preservata (il ratify misura la stessa AI della produzione). Cambio comportamentale di PRODUZIONE -> governance pesante (sez. 8). |
| Euristica   | **Greedy one-tile step-to-LOS con fallback grazioso**: prova ad aprire la linea in un passo; se nessun passo la apre, avanza come oggi.                                                                                                                                |
| Vicinato    | **4-neighbor ortogonale** (coerente col movimento reale: `moveCost.js` Dijkstra 4-neighbor + `stepToward` a singolo asse). Le diagonali NON sono mosse legali del combat.                                                                                              |
| Flag        | Raggiunto solo sul branch LOS-bloccato -> `COMBAT_LOS_ENABLED` OFF = byte-identico. Nessun nuovo flag.                                                                                                                                                                 |
| Blocker LOS | Terrain-only (3-arg `losClearOnGrid`, come lo slice-1). Unit-blocking (`units_block_los`) resta un asse separato/dormiente.                                                                                                                                            |

## 3. Vincoli e non-scope

**Vincoli:**

- **Determinismo**: helper puro, nessun `Math.random`/`Date`, tie-break deterministico (x poi y).
  Il ratify gira seedato; il riposizionamento non deve introdurre non-determinismo.
- **Flag OFF byte-identico** su ENTRAMBI i consumer (regression dedicata): con flag OFF il branch
  LOS-bloccato non esiste, quindi `stepToRegainLos` non e' mai chiamato.
- **Mai peggio di oggi**: se nessun passo apre LOS, il fallback e' l'esatto comportamento attuale
  (`stepToward(nearest)` sim / approach prod). Il riposizionamento non puo' far stallare un'unita'
  che oggi avanzerebbe.
- **Movimento 4-neighbor legale**: le celle candidate devono essere mosse valide (in-bounds, non
  occupate da unita' viva) -- altrimenti il backend le rifiuta (`session.js` "casella occupata").
- Zero nuove dipendenze prod. ASCII-first; Conventional Commits; trailer ADR-0011.

**Non-scope**: unit-blocking repositioning (terrain-only qui); pathfinding multi-tile / A\* (one-tile
greedy soltanto); diagonali; il flip del flag (owner-gated, post N=40 + falsificazione esterna);
riposizionamento per intent non-attacco (retreat/kite restano invariati).

## 4. Architettura

### 4.1 Helper condiviso `apps/backend/services/combat/losReposition.js`

```
stepToRegainLos(actor, enemies, grid, opts) -> {x, y} | null
```

- `actor`: `{position:{x,y}, attack_range}`.
- `enemies`: array di unita' nemiche vive `{position:{x,y}, hp}`.
- `grid`: `{terrain_features, width, height}` (per `losClearOnGrid` + bounds).
- `opts`: `{ occupied?: Set<"x,y"> }` (celle occupate da altre unita' vive, per escludere mosse illegali).

Algoritmo (puro, integer, deterministico):

1. Candidate = i 4 vicini ortogonali `(x+1,y),(x-1,y),(x,y+1),(x,y-1)` di `actor.position` che
   sono in-bounds (0..width-1 / 0..height-1) e NON in `opts.occupied`.
2. Per ogni candidate `c` (ordine deterministico: x crescente poi y crescente): trova gli enemy che
   da `c` sarebbero (a) in `attack_range` (Manhattan) E (b) LOS-clear
   (`losClearOnGrid(grid, c, enemy.position)` === true). Se >=1 -> `c` e' un candidate valido, con
   metrica = distanza Manhattan al nemico LOS-clear piu' vicino.
3. Ritorna il candidate valido con metrica minima (tie-break: x poi y). Nessun candidate valido -> `null`.

Nota LOS: `stepToRegainLos` usa `losClearOnGrid` con `COMBAT_LOS_ENABLED` gia' ON (e' chiamato solo
in quel branch), quindi il predicato riflette il terreno reale. Endpoints esclusi da `squareLos`.

### 4.2 Wiring dei due consumer (flag-dormant)

**(A) Sim player-proxy -- `tools/sim/combat-policy.js selectPlayerAction`.** Oggi: se
`pickInRangeTarget(... losFn)` ritorna null (tutti i target LOS-bloccati o fuori range) -> `stepToward(nearest)`.
Nuovo: PRIMA del fallback, se il flag e' ON e c'e' >=1 nemico in-range-ma-LOS-bloccato, prova
`stepToRegainLos(actor, enemies, grid-da-opts, {occupied})`; se ritorna una tile -> `move` li';
altrimenti `stepToward(nearest)` (invariato). Il `grid` arriva da `opts.terrainFeatures` (gia'
threadato da `combat-adapter`). Flag OFF -> `losFn` no-op -> il target non e' mai LOS-bloccato ->
branch mai raggiunto.

**(B) Sistema AI prod -- `apps/backend/services/ai/declareSistemaIntents.js`.** Oggi: il downgrade
`attack->approach` (LOS-bloccato, gia' shippato) produce `intent:'approach'` e il movimento risolve
verso il target. Nuovo: quando il downgrade scatta, calcola la destinazione via
`stepToRegainLos(actor, enemies, session.grid, {occupied})`; se apre LOS -> approach verso quella
cella; altrimenti l'approach attuale (verso il target). Solo `attack->approach` LOS-bloccato; gli
altri intent (retreat/kite/skip) invariati. Flag OFF -> nessun downgrade -> branch mai raggiunto.

## 5. Data flow (path B, produzione)

```
declareSistemaIntents: policy.intent === 'attack' && !losClearForAi(...) (downgrade gia' shippato)
   | flag ON + LOS-bloccato
   dest = stepToRegainLos(actor, enemies, session.grid, {occupied})
   | dest != null -> intent 'approach' verso dest (riapre la linea al prossimo turno)
   | dest == null -> approach attuale verso il target (fallback invariato)
```

## 6. Testing e Definition of Done

Casa test: `tests/services/losReposition.test.js` (helper puro) + estensione
`tests/sim/combatPolicy.test.js` (path A) + `tests/services/aiLosDowngrade.test.js` o
`declareSistemaIntents.test.js` (path B).

- **Smoke**: `stepToRegainLos` apre LOS quando un passo laterale libera la linea (muro con un varco
  a una cella); ritorna `null` quando nessun passo la apre (muro pieno); esclude celle occupate /
  off-board; determinismo (stesso input -> stessa tile, tie-break x poi y).
- **Ricerca (>=3 edge)**: nemico in-range-dopo-il-passo ma non prima; due candidate che aprono LOS
  su nemici diversi (tie-break); tutti i candidate occupati -> null; nemico gia' LOS-clear -> il
  branch non e' nemmeno raggiunto (no-op).
- **Regression flag-OFF**: con `COMBAT_LOS_ENABLED` unset, `combat-policy` e `declareSistemaIntents`
  byte-identici a oggi (il branch LOS-bloccato non esiste) -- suite sim + AI verdi, conteggi invariati.
- **Validazione ratify**: ri-esegui `tools/sim/los-n-probe.js 10` -> atteso che il gap WR -0.30 si
  **restringa** (il player-proxy ora aggira il muro). Registra il nuovo delta before/after.
- **DoD**: `node --test` verde (output mostrato) + Prettier + zero TODO/stub + determinismo verificato
  - spec/commit ADR-0011.

## 7. Balance / ratify

Il riposizionamento **non flippa nulla**: e' band-neutral con flag OFF. Il suo scopo e' rendere la
ratify N=40 (owner-gated) misura del balance-terreno reale e non del pathing. Sequenza post-merge:
re-probe N=10 (gap atteso in calo) -> se il delta residuo e' piccolo/accettabile -> N=40 su
`full-loop-batch` + `los-n-probe` -> falsificazione esterna (sez. 8) -> decisione flip di Eduardo.

## 8. SDMG / governance (load-bearing)

L'euristica greedy step-to-LOS e la sua soglia (4-neighbor, metrica advance-mentre-apri) sono
**self-designed = ipotesi ad alto errore**, e questo e' un cambio COMPORTAMENTALE di PRODUZIONE
(il Sistema AI gioca diversamente). Pre-ratifica del rollout prod:

- **Falsificazione esterna**: `harsh-reviewer` sul metodo (l'euristica e' misurabile/corretta? il
  fallback e' davvero mai-peggio-di-oggi? il determinismo regge?) + `game-design-validator` sul
  comportamento (un Sistema che flanka e' coerente col design / non degenera in kiting infinito?).
- **Adozione narrow**: flag-dormant (nessun impatto finche' `COMBAT_LOS_ENABLED` OFF).
- **Decider = Eduardo**, non l'euristica: il flip resta owner-gated post N=40.

## 9. Rischi / caveat

- **R1 one-tile miope**: un muro largo puo' richiedere piu' passi per aggirare; il greedy one-tile
  apre solo se un singolo passo basta. Mitigazione: fallback grazioso (avanza comunque) -> nel giro
  di piu' turni l'unita' progredisce; multi-tile pathfinding = non-scope (YAGNI finche' il re-probe
  non lo richiede).
- **R2 loop/oscillazione**: due unita' che si riposizionano potrebbero oscillare. Mitigazione:
  determinismo + il commit-window guard esistente (`declareSistemaIntents` K4) gia' anti-flip;
  verificare nel re-probe che i timeout calino (non aumentino).
- **R3 parita' sim<->prod**: se i due consumer wirano l'helper in modo diverso, il ratify diverge.
  Mitigazione: stessa `stepToRegainLos`, stessa semantica "apri-LOS-o-fallback"; test di parita'.
- **R4 SDMG**: euristica ipotesi -> sez. 8 (falsificazione esterna pre-flip).

## 10. Riferimenti

- Ratify probe: `tools/sim/los-n-probe.js` (PR #3207); risultato N=10 nel report di sessione.
- Regola LOS condivisa: `apps/backend/services/combat/losForGrid.js` (`losClearOnGrid`).
- Downgrade AI gia' shippato: `apps/backend/services/ai/declareSistemaIntents.js` (attack->approach).
- Sim player-proxy: `tools/sim/combat-policy.js` (`selectPlayerAction`, `stepToward`).
- Movimento 4-neighbor: `apps/backend/services/combat/moveCost.js` (Dijkstra).
- Slice-1 design + gap noti: `docs/superpowers/specs/2026-07-03-combat-los-slice1-design.md`.
