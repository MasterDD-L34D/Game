---
title: 'radici_ancora_planare -- band evidence (carrier-vs-non-carrier)'
date: 2026-06-28
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-29'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [combat, movement, radici, anchor, substrate, band, evidence]
---

# radici_ancora_planare -- band evidence

> **Scopo**: misurare l'impatto sul win-rate dell'ancora DR2 di `radici_ancora_planare`. radici e'
> **always-on** (flag-independent) -> la sua banda NON e' una domanda flip ON/OFF, ma **carrier vs
> non-carrier**. Io misuro, master-dd ratifica.

## 1. Metodo (corretto 2026-06-29 -- fix bug Codex P1)

- In-process (`supertest` `createApp`, NO prod), node 22, paired-seed (stesso seed con-trait vs senza ->
  l'unica differenza e' `radici_ancora_planare`). Harness `tools/sim/radici-band-probe.js` ->
  `combat-adapter.runEncounter`. Outcome = eliminazione.
- **Fix Codex P1**: il probe originale posizionava i nemici agli angoli (distanza Manhattan 4+ dai carrier)
  con `attack_range: 3`. La policy `selectPlayerAction` muoveva ogni carrier al primo turno (nemico fuori
  range) -> `breakAnchor` cancellava lo stato `ancorato` prima che il nemico potesse colpire. Il risultato
  "band-neutral" era un artefatto del movimento, NON una misura reale della DR2 tenuta.
- **Fix**: nemici spostati a distanza 2 (posizioni cardinali) dai carrier -> il nemico piu' vicino e' gia'
  dentro `attack_range 3` al turno 1 -> la policy spara ATTACK (nessun MOVE) -> l'ancora rimane su ->
  DR2 morde quando i nemici raggiungono i carrier.
- Roster difensivo: 3 carrier sessili (attack_range 3) in posizioni (2,2),(3,2),(2,3); 4 nemici a
  (0,2),(5,2),(2,0),(2,5) (distanza 2 dal carrier piu' vicino).
- **Verifica invariante (Step 0)**: prima del loop N-seed, si eseguono 2 sessioni paired (stesso seed 42)
  con carrier singolo vs enemy adiacente. DR2 confermato se il carrier WITH radici subisce meno danni totali
  del carrier WITHOUT radici in 5 round identici (ROUNDS con enemy AI che spara `turn/end` immediato ->
  `handleTurnEndViaRound` -> `performAttack` -> DR2 riduce danno sull'anchored carrier).

## 2. Risultati N=40 (2026-06-29, node v22.22.3)

### Step 0 -- invariante DR2 (verifica mecanica)

```json
{
  "anchor_applied": true,
  "damage_with_radici": 33,
  "damage_without_radici": 43,
  "dr2_confirmed": true,
  "note": "DR2 biting confirmed: anchored carrier took 10 less damage than non-carrier (honest measurement)"
}
```

5 round x DR2=2 = 10 danni ridotti. **La meccanica funziona.**

### N=40 scale=1.0

```json
{
  "N": 40,
  "enemyScale": 1,
  "with_radici":    { "wins": 10, "defeats": 0, "timeouts": 30, "win_rate": 0.25, "avg_survivors": 2.98 },
  "without_radici": { "wins": 10, "defeats": 0, "timeouts": 30, "win_rate": 0.25, "avg_survivors": 2.98 },
  "wr_delta": 0,
  "survivors_delta": 0,
  "node": "v22.22.3"
}
```

### N=20 scale=2.0

```json
{
  "N": 20,
  "enemyScale": 2,
  "with_radici":    { "wins": 0, "defeats": 0, "timeouts": 20, "win_rate": 0, "avg_survivors": 2.7 },
  "without_radici": { "wins": 0, "defeats": 0, "timeouts": 20, "win_rate": 0, "avg_survivors": 2.7 },
  "wr_delta": 0,
  "survivors_delta": 0,
  "node": "v22.22.3"
}
```

## 3. Interpretazione (load-bearing)

**DR2 morde (meccanica verificata)**: carrier con radici tenuto fermo subisce 10 danni in meno rispetto a
carrier senza radici in 5 round di attacchi identici (`5 * DR2=2 = 10`). La riduzione e' esatta e
deterministica.

**Band-neutral in gioco AI-driven (N=40)**: nonostante la DR2 si applichi colpo per colpo, `wr_delta=0` e
`survivors_delta=0`. Perche'? I nemici con `attack_range 1` devono avanzare 2 tile prima di colpire;
durante quell'avvicinamento i carrier attaccano liberamente. La riduzione cumulativa (DR2 per colpo) non
cambia l'esito (10 vittorie, 30 timeout, 0 sconfitte in entrambi i bracci) entro N=40.

**radici non e' uno shifter passivo del WR**: e' una leva tattica "tieni-per-la-DR". Il suo impatto banda
in gioco mobile/aggressivo tipico e' ~0. La DR2 ha valore per un giocatore che sceglie deliberatamente di
tenere la posizione -- un upside condizionale che una AI greedy non coglie.

## 4. Raccomandazione (master-dd ratifica)

- **radici e' band-neutral in gioco AI-driven** (N=40 confermato con metodologia corretta) -> nessun
  rischio-banda dall'avere carrier radici vivi. La DR2 e' un upside condizionale per chi sceglie di tenere.
- DR2 resta **PROPOSED** (ri-valida col playtest umano: un giocatore che TIENE deliberatamente coglie piu'
  valore della AI greedy -- la banda "hold-for-DR" e' catturata meglio da playtest umano).
- radici e' **always-on** (NON gated sul flip terrain-cost): attivazione indipendente da
  `MOVE_TERRAIN_COST_ENABLED`.

## 5. Boundary

Io ho misurato (mechanic + banda AI-driven con metodologia corretta); master-dd ratifica. La banda
"tieni-deliberatamente" e' meglio catturata da playtest umano che da una AI greedy.
