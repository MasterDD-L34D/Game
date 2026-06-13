---
title: 'Full-loop fase-1b-3a -- recruit -> combat stat-resolution (faithful)'
date: 2026-06-02
workstream: ops-qa
category: spec
doc_status: active
doc_owner: master-dd
language: it
review_cycle_days: 30
tags: [ai-playtest, meta-loop, recruit, combat, stat-resolution, full-loop]
---

# Full-loop fase-1b-3a -- recruit -> combat (stat-resolution faithful)

> Slice di [`2026-06-02-full-loop-ai-playtest-runner-design.md`](2026-06-02-full-loop-ai-playtest-runner-design.md)
> (spec #2559). Continua fase-1b-2 (#2563): l'NPC reclutato finiva in `party_rosters`/Nido
> ma NON combatteva. Qui chiudiamo il loop **recruit -> combat**: il reclutato combatte
> la missione successiva (attrition replacement, XCOM-LW2). Zero engine change (solo
> `tools/sim/`) -> band-safe; Gate-5 eccezione methodology-tooling.

## Design-call risolto (approvato master-dd)

Come trasformare un NPC reclutato (solo `id`) in unita' di combattimento? Tre opzioni:

1. **`deriveCombatStats` (faithful) -- SCELTA.** Riusa la derivazione canonica
   `ecologyCombatAdapter.deriveCombatStats()` da YAML specie REALE (la stessa che usano
   il pilota badlands e lo scaling nemici di fase-2). Nessun numero di balance inventato.
2. Baseline template (stat-block fisso in `tools/sim`) -- zero coupling ma stat inventate
   = band-unfaithful per le unita' reclutate.
3. Clone archetipo roster -- stat plausibili ma non specie-specifiche.

**Perche' (1):** e' un AI-_playtest_, la fedelta' e' lo scopo. La stessa derivazione
serve i nemici scaled di fase-2 -> recruit e nemici misurati sulla stessa canon. La
funzione e' tollerante (soft-default di ogni campo ecologia mancante, non lancia).

## Componenti (`tools/sim/`, zero engine change)

- **`greedy-policy.js`** -- `chooseRecruits({step})` ora ritorna `[{npcId, speciesId}]`.
  La specie cicla deterministicamente nel pool canonico badlands (`RECRUIT_SPECIES_POOL`,
  5 specie reali, role_class diversi: APEX/HAZARD/PREDATOR/PREY/SUPPORT).
- **`recruit-resolver.js`** (NUOVO) -- `resolveRecruitUnit({npcId, speciesId, position})`:
  `deriveCombatStats(loadBadlandsSpecies(speciesId))` -> unita' PLAYER (mirror
  dell'assembly di `badlandsPilotScenario`, `controlled_by:'player'`, `max_hp=hp`,
  `job: stats.job || 'vanguard'`). Riusa il loader badlands gia' testato.
- **`full-loop-runner.js`** -- il roster CRESCE (starters U recruits): su capitolo chiuso
  (`adv.status===200 && victory`, gate Codex #2563 P2) ogni recruit risolto entra in
  roster + `aliveIds` -> combatte la missione dopo. Il set di id "noti" passato a
  `checkInvariants` si allarga a (starters U recruited) cosi' un reclutato sopravvissuto
  non e' un falso "foreign survivor". Ogni capitolo registra `rosterIds` (chi ha
  combattuto) per provare la chiusura del loop.

## Invariante (identity, allargata)

`survivors subset (starters U recruited-so-far)`. Nessun cambio alla funzione
`checkInvariants`: il runner passa l'universo-id che cresce. Semantica invariata
("nessun combattente fantasma"), universo legittimamente crescente coi recruit.

## Test (TDD, `node --test tests/sim/*.test.js` = 16/16)

- `recruitResolver.test.js` (2): stat canoniche fedeli (no zeri inventati) + determinismo.
- `greedyPolicy.test.js` (3): forma `{npcId,speciesId}` + id distinti + ciclo pool (wrap).
- `fullLoopRunner.test.js`: e2e asserisce che `recruit_s1` (reclutato dopo cap.1) ha
  combattuto un capitolo successivo (loop recruit->combat chiuso) + invariants clean
  nonostante il roster cresca; mantiene il guard Codex #2563 P2.

## Fuori scope (fase successive)

- **fase-1b-3b**: `chooseMatings`/`chooseAffinity` nel greedy-policy (mating via
  `/api/meta/mating` + `/api/meta/mating/roll`).
- **fase-2**: pool specie generale (oltre badlands), nemici scaled (encounter YAML),
  band-metriche meta (completion 40-70% XCOM-LW2, attrition, economia PE->PI), `mbtiPolicy`,
  routing GAP-C test-context (`META_NETWORK_ROUTING=true`), N=40 (L-069 ratify).
