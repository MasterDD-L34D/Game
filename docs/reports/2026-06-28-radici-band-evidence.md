---
title: 'radici_ancora_planare -- band evidence (carrier-vs-non-carrier)'
date: 2026-06-28
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-28'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [combat, movement, radici, anchor, substrate, band, evidence]
---

# radici_ancora_planare -- band evidence

> **Scopo**: misurare l'impatto sul win-rate dell'ancora DR2 di `radici_ancora_planare`. radici e'
> **always-on** (flag-independent) -> la sua banda NON e' una domanda flip ON/OFF, ma **carrier vs
> non-carrier**. Io misuro, master-dd ratifica.

## 1. Metodo

- In-process (`supertest` `createApp`, NO prod), node 22, paired-seed (stesso seed con-trait vs senza ->
  l'unica differenza e' `radici_ancora_planare`). Harness `tools/sim/radici-band-probe.js` ->
  `combat-adapter.runEncounter`. Outcome = eliminazione.
- Roster difensivo: 3 carrier sessili che TENGONO (attack_range 3 -> combattono senza muoversi -> l'ancora
  resta su) mentre i nemici avanzano e li attaccano.

## 2. Risultati

- **N=8 (scale 1.0 e 2.0): nessuna differenza misurabile** con/senza radici (vittorie/timeout/survivor
  IDENTICI nei due bracci; `wr_delta 0`, `survivors_delta 0`).
- **Mechanic VERIFICATO** (controllo boxed): un'unita' radici incassata in un angolo (NON puo' muoversi),
  attaccata da nemici adiacenti -> `status.ancorato = 2` settato a inizio round + `anchor_dr_last = 2` dopo
  l'attacco nemico = la DR2 MORDE (riduce 2 danni) sul percorso enemy->player. La meccanica funziona.

## 3. Interpretazione (load-bearing)

🔑 **In gioco AI-driven la banda radici e' ~0 perche' la policy MUOVE le unita'** (avvicinamento/
riposizionamento) -> ogni round `breakAnchor` rompe l'ancora prima che l'unita' venga attaccata -> la DR2
non si applica quasi mai. La DR2 morde SOLO quando l'unita' NON si muove quel round (controllo boxed) --
una **scelta tattica del giocatore (tenere la posizione)**, che la AI greedy non fa.

Quindi radici **non e' uno shifter passivo del WR**: e' una leva tattica "tieni-per-la-DR". Il suo impatto
banda dipende dal comportamento del giocatore, non dalla presenza del trait. In gioco mobile/aggressivo ~0.

## 4. Raccomandazione (master-dd ratifica)

- **radici e' band-neutral in gioco tipico** (la AI/giocatore-mobile non beneficia) -> nessun rischio-banda
  dall'avere carrier radici vivi. La DR2 e' un upside condizionale per chi sceglie di tenere la posizione.
- DR2 resta **PROPOSED** (ri-valida col playtest umano: un giocatore che TIENE deliberatamente potrebbe
  estrarre piu' valore di una AI greedy).
- radici e' **always-on** (NON gated sul flip terrain-cost): la sua attivazione e' indipendente da
  `MOVE_TERRAIN_COST_ENABLED`.

## 5. Boundary

Io ho misurato (mechanic + banda AI-driven); master-dd ratifica. La banda "tieni-deliberatamente" e'
meglio catturata da playtest umano che da una AI greedy.
