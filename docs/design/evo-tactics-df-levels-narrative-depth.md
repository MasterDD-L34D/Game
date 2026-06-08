---
title: 'Evo-Tactics SPEC-Q DF-Levels Narrative and Simulation Depth'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, spec-q, df-levels, narrative, reference-games, chronicle, identity]
related: docs/planning/2026-06-08-game-reference-gap-harvest.md
---

# SPEC-Q: DF-Levels Narrative and Simulation Depth

Origine: ultimo controllo game-reference 2026-06-08
(`docs/planning/2026-06-08-game-reference-gap-harvest.md`). Harvest da
`RECONCILIATION-MASTER.md` (A5 vault, 31 giochi -> DF-levels L0-L5) +
`docs/adr/ADR-2026-05-18-df-levels-integration-direction.md` (Game, ground-truth),
git-verificato.

## Blind-spot

Le Spec A..P coprono SUPERFICI device/TV. Il reframe device-driven ha saltato come
blocco la PROFONDITA' narrativa/simulativa dei reference-game (DF-levels L1-L5): cio'
che fa EMERGERE storie, non come il player interagisce. SPEC-Q recupera quel layer.

## Obiettivo

Portare la profondita' DF-levels mancante: identita' guadagnata (L1), eredita'
tangibile (L3), cronaca cross-session (L4), intelligenza Sistema leggibile (L2/P5).
Authority origine = A5 vault (research, non-governing) -> qui design contract Game.

## Deve coprire (L-level + gioco + gap-id)

### L4 -- Chronicle / Memory-mode (M-7, keystone)

- Event-store narrativo cross-session SOPRA il combat event-log gia' live
  (`sessionRoundBridge` = per-round, non cronaca). NON ricostruire il combat-log.
- Chronicle viewer + Memory-mode home (Loop Hero visual emergence, Slay-the-Princess
  branching-state memory, DF template parametrici non-LLM via QBN/inkjs gia' live).
- Contratto: `POST /api/v1/session/:id/chronicle-event` + `GET .../chronicle`.
- Keystone: A3 (failure-as-lore) e A13 (biome-wound cross-run) ci dipendono.

### L1 -- Identity-earned (M-2, Wildermyth/Triangle Strategy)

- Name emergence da lifecycle trigger: Hatchling anonima -> Juvenile nome -> Apex
  nome+MBTI reveal -> Legacy figura storica.
- Portrait/sprite overlay da evento formativo (cicatrice visibile, non solo stat).
- Scar-as-stat-malus = SPEC-J `woundedPerma` (riusa); qui = il LAYER identita' narrativa.
- `services/identity` = 404 greenfield; museum card `creature-wildermyth-battle-scar-portrait.md`
  ha reuse-path (portrait overlay da evento formativo).

### L3 -- Legacy artifacts (M-1 FFT + M-3 Wildermyth)

- M-1: named heirlooms/artefatti con provenienza tracciata (lignaggio -> oggetto).
- M-3: named-mutation lineage -- contratto Game-side (endpoint + schema) per il draft
  Godot-v2 `named-mutations-l3-wildermyth-design.md` (`LineagePropagator._pool_meta`).
- Cronaca entry-type per heirloom/mutazione-con-storia.

### L2/P5 -- Sistema legibility (M-4, Invisible Inc / AI War)

- Enemy abilities nascoste/evolventi rivelate a soglia (es. 3 usi tattica -> reveal
  diegetico via ALIENA). Tensione: telegraph P1 (tutto visibile, ItB) vs Sistema-impara
  (AI War, info nascosta). Regola in `declareSistemaIntents.js` + addendum SPEC-H.

### P3 -- Job-identity constraint (M-5, Dicey Dungeons)

- Vincolo design: ogni job risponde a UNA domanda core (Predator = "e se attacchi
  sempre?", Symbiont = "e se l'HP e' condiviso?"). Anti feature-accumulation sui
  job-expansion (gap C6). Nota design in SPEC-E o doc sibling.

### P2 -- Visual-swap verify (M-6, Spore)

- Verify-gate: `mutation_catalog.yaml` `derived_ability_id` null -> visual-swap su
  mutazione likely 0-runtime. Confermare; se Godot-surface -> SPEC-K.

## Dipendenze

SPEC-J (scar->identity), SPEC-P (failure usa chronicle), SPEC-D (cinematic legge
event-log), SPEC-E (job-identity + lineage surface), SPEC-H (ALIENA reveal), SPEC-K (visual).

## Stato runtime (git-verify 2026-06-08)

DESIGN-ONLY: `services/{identity,eventlog,chronicle}` = 404; named-weapon/artifact = 0
hit; hidden-ability = 0 design. LIVE da riusare (non ricostruire): combat event-log
(`sessionRoundBridge`), `woundedPerma` scar (SPEC-J), mating/lineage (`LineagePropagator`),
QBN/inkjs (`skiv_qbn.py`/narrativeEngine), sentience_tier data (#1808).

## Non-scopo

Combat-round event-log (gia' live). Scar-as-stat (SPEC-J). Surface device/TV (Spec A..P).
L0 deferred-ok (Citizen Sleeper needs, Cocoon biome-rules) restano POST-MVP gated.

## Output consigliato

Spec piena L4 (chronicle service + viewer) -> L1 (identity) -> L3 (legacy) -> Sistema
legibility. Gate kill-60 prima del build. M-7 chronicle = primo (dependency fan-out).
