---
title: 'P0 8 batched decisions — user response 20min unblocks M9-M11'
workstream: planning
category: decision
status: pending-user
owner: master-dd
created: 2026-04-20
tags:
  - decision-batch
  - p0-blocker
  - flint-kill-60
---

# P0 batched decisions — rispondi qui in 20min

Flint verdict 2026-04-20: **audit loop va chiuso**. 8 P0 Q batched con opzioni + mia rec. User risponde inline, sblocca M9-M11.

**Format**: scegli opzione (A/B/C) o scrivi altro. Commento opzionale solo se design intent ≠ default.

---

## Q46 Save persistence storage

Dove vive save game cross-session?

- **A** SQLite locale (single-player friendly, zero server deps) ← **MIA REC** (coerente demo ngrok local)
- **B** Prisma Postgres (campagna multi-device, richiede auth)
- **C** JSON file flat (simplest, no schema enforcement)

Impatta: M10 party persistence, M11 network sync.

**Risposta**: `Q46: A`

---

## Q47 Campaign branching model

Struttura campagna:

- **A** Lineare 3 atti × 5-8 mission, 0 scelte (Wesnoth classic)
- **B** Lineare + 1-2 scelte binarie per atto (Descent pattern) ← **MIA REC** (low-complexity, high-player-agency)
- **C** Full DAG aperto post-tutorial (Into the Breach style)

Impatta: M10 campaign spec, narrative arc, level design effort.

**Risposta**: `Q47: B`

---

## Q50 Encounter unlock flow

Come giocatore naviga encounter:

- **A** Sequenziale rigido post-tutorial (chapter 1 encounter 1 → 2 → 3 ...) ← **MIA REC** per MVP
- **B** Open-world dal tutorial (tutti encounter tier-adeguato disponibili)
- **C** Hub centrale + 3-5 encounter per bioma, completa bioma → next bioma (sandbox-ish)

Impatta: M9-M11 encounter auth order, tutorial→campaign transition.

**Risposta**: `Q50: A`

---

## Q11 Affinity/Trust scale canonical (recruit/mating system)

Due scale divergenti oggi nei doc:

- **A** `Mating-doc` canvas D: Affinità -3..+3, Fiducia -3..+3
- **B** `Freeze §20`: Affinity -2..+2, Trust 0..5 ← **MIA REC** (code già allineato `metaProgression.js`)
- **C** Nuova unified: Affinity 0-10, Trust 0-10 (rewrite both docs)

Impatta: M10 Nido persistence, recruitment gates.

**Risposta**: `Q11: B`

---

## Q54 PP (Power Pool) max cap + Ultimate cost

Contraddizione:

- **A** PP max=3 (Freeze §7.2), Ultimate costa 3 (consume all) ← **MIA REC** (coerente con cap)
- **B** PP max=10, Ultimate ≥10 (combat.md:117 corretto, Freeze error)
- **C** PP max=3 scale → Ultimate ≥10 = accumula 3 turni + spend all (temporal gating)

Impatta: combat balance Ultimate ability, PP earning rate.

**Risposta**: `Q54: A`

---

## Q51 PT (Punti Tecnica) reset cadence

Round-model canonical richiede disambiguo:

- **A** Per-turn reset (ogni PG reset PT a inizio turn) — scala player-centric
- **B** Per-round reset (tutti reset a new round) ← **MIA REC** (coerente round-model ADR-04-15)
- **C** No reset (accumula fino encounter end)

Impatta: combat pacing, PT-spend windows.

**Risposta**: `Q51: B`

---

## Q56 Tier advancement (base→veteran→elite→mythic)

Costo avanzamento:

- **A** PE amount (es. 20/40/80/160) ← **MIA REC** (simple linear)
- **B** Kill count (10/25/50/100 encounter wins)
- **C** Mission count (5/10/20/40 mission completate)
- **D** Mixed: PE + milestone narrative (Descent-inspired quest trigger)

Impatta: M10 progression spec, tier advancement UX.

**Risposta**: `Q56: A`

---

## Q58 Level cap MVP shipping

Tier massimo giocabile in release Alpha/Beta:

- **A** Base + veteran (2 tier) — minimum viable progression
- **B** Base + veteran + elite (3 tier) ← **MIA REC** (arc completo ma mythic deferred)
- **C** Full 4 tier including mythic (all-in MVP)

Impatta: M10 content budget, mythic content post-release gating.

**Risposta**: `Q58: B`

---

## Batched response format (copy-paste)

```
Q46: A
Q47: B
Q50: A
Q11: B
Q54: A
Q51: B
Q56: A
Q58: B
```

**Se tutti default mie rec**: scrivi solo `"tutti default"`.

**Se vuoi modifiche**: sovrascrivi solo quelle.

## Post-risposta azioni immediate

1. Scrivo ADR-2026-04-21-campaign-save-persistence (Q46+Q47+Q50)
2. Aggiorno `Mating-Reclutamento-Nido.md` scale (Q11)
3. Aggiorno `combat.md` PP semantics (Q54)
4. Aggiorno `00-SoT §13.2` PT reset (Q51)
5. Creo `26-ECONOMY_CANONICAL.md` merge (Q56)
6. Aggiorno `40-ROADMAP.md` level cap MVP (Q58)

Totale 1-2h post-response. Sblocca M10 implementation fase 1.

## Non-answer path

Se non rispondi:

- M9 continua solo P6 (shipped) + P4 axes + P3 XP proof (non-blocked)
- M10 blocked (P2 PI pack needs Q54+Q56)
- M11 blocked scope (Jackbox richiede Q46 save model sync)
- 51 Q P2 defer next audit cycle

Session può continuare su M9 P4+P3 (~14h). M10+ pausa fino risposta.
