---
title: 'ADR-2026-07-03 -- board_scale: onorare grid_size autorato per-encounter (opt-in)'
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: 2026-07-03
source_of_truth: false
language: it
review_cycle_days: 90
proposed_by: claude-code (fase-2c grid-wiring, sot-planner)
owner: master-dd
related_adr:
  - docs/adr/ADR-2026-04-17-coop-scaling-4to8.md
  - docs/adr/ADR-2026-04-16-grid-type-hex-axial.md
  - docs/adr/ADR-2026-04-28-grid-type-square-final.md
related_spec:
  - docs/superpowers/specs/2026-07-03-fase2c-grid-wiring-design.md
related_files:
  - schemas/evo/encounter.schema.json
  - services/party/loader.js
  - apps/backend/routes/session.js
  - tools/sim/scenario-enemies.js
  - docs/core/15-LEVEL_DESIGN.md
---

# ADR-2026-07-03 -- board_scale: onorare grid_size autorato per-encounter (opt-in)

## Status

**SIGNED-OFF** owner 2026-07-03 (opzione 1; naming ratificato `party_sized`/`grid_sized`). Il campo
`doc_status` resta `draft` finche' il build-PR non atterra (flip -> `active` al land, scelta owner).
Draft prodotto da `sot-planner`. Il BUILD (implementazione + N=40 re-ratify se/quando un encounter
opta `grid_sized`) e' partito su go-signal esplicito owner nella sessione fresca (vedi Sequencing).

## Contesto

Il campo `encounter.grid_size` (`[w, h]`, array 2 interi, schema `schemas/evo/encounter.schema.json`)
e' **autorato ma inerte a runtime**. La dimensione della board effettivamente giocata e' decisa da
`gridSizeFor(deployedCount)` (`services/party/loader.js:55`), guidata da `data/core/party.yaml
grid_scaling` (6x6 / 8x8 / 10x10 per fascia di PG schierati, derivazione ratificata da
ADR-2026-04-17 "co-op scaling 4->8"). `apps/backend/routes/session.js:2396-2410` chiama
`gridSizeFor(deployedCount)` direttamente per calcolare `gridW`/`gridH`; `encounter.grid_size` non
viene letto in nessun punto del path di dimensionamento board. Il simulatore
(`tools/sim/scenario-enemies.js:41`) segue lo stesso schema: dimensiona da `gridSizeFor` e clampa
gli spawn autorati a `GRID_SAFE_MAX=5`, con un commento nel codice che marca esplicitamente
"authored per-encounter grid e' fase-2c".

Un mito documentale rinforza la confusione: `docs/core/15-LEVEL_DESIGN.md:122` afferma che
l'encounter `hardcore-06` usa un "override esplicito 10x10 via `grid_size: 10`" -- affermazione
FALSA/fuorviante verificata contro il codice: quel 10x10 e' prodotto dalla modulation a 8 PG
(`gridSizeFor` fascia `deployed_7_8`), non da un campo YAML. Il documento va corretto nel BUILD
(fuori scope qui).

Il vincolo di fill-ratio in `party.yaml grid_scaling` (mantenere fill < 25% a roster fisso) e' un
vincolo di **leggibilita' tattica**, non un cap di difficolta' -- e' cosi che l'ha inquadrato la
ricerca del big-maps arc padre (D1 ratificato: "per-cella, board grandi subito"): una board grande a
fill basso resta leggibile se la densita' viene da terrain/objective invece che da conteggio unita'.
Questo e' il motivo per cui onorare il grid autorato non e' semplicemente "rendere il campo YAML
funzionante", ma richiede una decisione ADR-level che si posiziona rispetto alla derivazione
party-grid gia' governata da ADR-2026-04-16 (hex axial, superseded) e ADR-2026-04-17 (coop-scaling
4->8, la derivazione attualmente vigente).

Ground-truth verificato origin/main 2026-07-03, post-merge #3197 (xpBudget geometry gate, flag OFF,
author-guard grid-ratify + baseline). Dettaglio completo in
`docs/superpowers/specs/2026-07-03-fase2c-grid-wiring-design.md`.

## Decisione

**La board autorata per-encounter (`encounter.grid_size`) e' il path sancito per gli encounter che
optano esplicitamente `board_scale: grid_sized`** (board non vincolate dalla leggibilita' a
roster-fisso). **`gridSizeFor` (derivazione party fill-ratio, ADR-2026-04-17) resta il default per
`board_scale: party_sized`.**

Meccanismo (opt-in, band-neutral di default):

- Nuovo campo encounter `board_scale: party_sized | grid_sized`, default `party_sized`.
- `party_sized` (default, tutti i 21 encounter esistenti): comportamento attuale, byte-identical --
  `gridSizeFor(deployedCount)` decide la board, `encounter.grid_size` resta ignorato per quell'
  encounter.
- `grid_sized`: la board usa `encounter.grid_size` cosi come autorato, bypassando `gridSizeFor`.
- `gridSizeFor` e la derivazione ADR-2026-04-17 restano **invariati** -- questa decisione e'
  un'estensione opt-in, non una riscrittura della derivazione party-grid esistente.
- Nessun cambio al cap dello schema (`grid_size` max resta 20).

## Conseguenze

### Positive

- **Band-neutral per costruzione**: con `board_scale: party_sized` come default su tutti i 21
  encounter attuali, `resolveBoardSize == gridSizeFor` -> board identica -> zero cambio di
  difficolta'/sim. Solo un encounter che opta esplicitamente `grid_sized` cambia board.
- Sblocca il D1 del big-maps arc padre ("per-cella, board grandi subito") senza toccare il default
  ne' richiedere un re-balance di massa sui 21 encounter esistenti.
- Coerente con D10 (visual-first) del padre: il wiring e' backend/opt-in, non ingrandisce nulla di
  default, non tocca il render/Godot.

### Negative / rischi

- **Introduce un secondo path di dimensionamento board** (party-derived vs grid_sized) -- superficie
  di manutenzione aggiuntiva in `services/party/loader.js` e nei consumer (`session.js`,
  `tools/sim/scenario-enemies.js`). Mitigazione: un solo helper puro (`resolveBoardSize`) come
  unico punto di decisione, entrambi i path lo attraversano.
- Ogni encounter che passa a `grid_sized` con una board ridimensionata **deve** ripassare il ciclo
  N=10 probe -> N=40 ratify (vedi Sequencing) -- non e' un flip gratuito.
- Board `grid_sized` grandi a fill basso sono ora **accettate per design** (non piu' un anti-pattern
  da evitare) -- la review balance deve giudicare la leggibilita' su terrain/objective density
  invece che sul rapporto unita'/tile. Questo e' un cambio di criterio di review, non solo di
  codice.

### Neutral

- Il mito hardcore-06 in `docs/core/15-LEVEL_DESIGN.md:122` va corretto (fuori scope in questo ADR,
  parte del BUILD).

## Alternative considerate

### A. Riscrivere ADR-2026-04-17 per rendere il grid autorato il default

**Rigettata.** Romperebbe la band-neutrality sui 21 encounter esistenti (tutti verrebbero
riletti come "grid_sized" o richiederebbero una migrazione dati esplicita) e violerebbe D10
(visual-first: nessun cambio di board non richiesto). Il default fill-ratio party-derived resta
corretto per il contenuto non-autorato -- non c'e' evidenza che vada sostituito ovunque, solo che
serva un'via di fuga opt-in per encounter specifici.

### B. Override scalare `grid_size: 10` (il "mito" hardcore-06)

**Rigettata.** Non rappresentabile nello schema attuale: `grid_size` richiede un array `[w, h]`, non
uno scalare. Inoltre il comportamento che il mito descrive (10x10 su hardcore-06) e' gia' prodotto
oggi dalla modulation a 8 giocatori (`gridSizeFor` fascia `deployed_7_8`), non da un campo YAML --
quindi anche se lo schema accettasse uno scalare, non risolverebbe il problema reale (grid_size
autorato inerte), risolverebbe solo un sintomo gia' spiegato da un meccanismo diverso.

## Sequencing

Ordine di dipendenza tra questo ADR, il gate di geometria gia' mergiato, e il flip finale:

1. **#3197 (merged, main `879c11864` e successivi)** -- xpBudget geometry gate (flag OFF) +
   author-guard grid-ratify (`tools/js/validate_encounter_grid_ratify.js`) + regola L-069 codificata
   (cambio `grid_size` -> re-run N=10 probe -> N=40 ratify; la ratifica non si trasferisce tra
   resize). Questo e' il **prerequisito di safety**: rende gate-safe qualunque resize futuro prima
   che il wiring lo renda possibile.
2. **Questo ADR + wiring fase-2c (sessione fresca, BUILD)** -- implementa `board_scale` +
   `resolveBoardSize` + wire in `session.js` + parity in `tools/sim/scenario-enemies.js` + doc
   correction. Band-neutral: nessun encounter esistente cambia board (tutti restano `party_sized`).
3. **Autorare >=1 encounter `board_scale: grid_sized`** con un `grid_size` ridimensionato --
   attiva l'obbligo di re-ratify.
4. **N=10 probe -> N=40 ratify** sull'encounter `grid_sized` (author-guard #3197 lo richiede).
5. **Flip del gate geometria** (xpBudget hazard/activation, oggi flag OFF) post-N=40, quando si
   vuole misurare hazard/activation sul board reale autorato.

Il wiring di questo ADR **abilita** il resize che #3197 rende gate-safe; non lo sostituisce e non
salta la sequenza di ratifica.

## Decisioni owner (2026-07-03, risolte)

- Naming: **RATIFICATO** `board_scale` (`party_sized`/`grid_sized`) -- owner sign-off 2026-07-03.
- `doc_status`: resta `draft` fino al merge del build-PR, poi flip -> `active` (scelta owner).
- Accettazione != start-build automatico per design; il build e' partito su go-signal esplicito
  ("parti col build") nella stessa sessione.
