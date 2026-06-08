---
title: 'Evo-Tactics SPEC-M Onboarding Identity Flow'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, spec-m, onboarding, device-driven, identity]
related: docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md
---

# SPEC-M: Onboarding Identity Flow

Origine: harvest 2026-06-08 (`docs/planning/2026-06-08-spec-a-l-gap-harvest.md`,
cluster "Onboarding & identita'"). Recupera idee dal flow V3 (B1/B4/B5) +
`51-ONBOARDING-60S` + ADR-2026-04-21b, oggi DESIGN-ONLY (0 hit `formPulse`,
slider = MVP/debug per roadmap sez. 2).

## Obiettivo

Definire i primi ~60s del giocatore (pre-Act-0) come catena device-driven di
scelte identitarie che seedano Forma, bioma e Custode -- sostituendo lo slider
MVP/debug con un onboarding diegetico.

## Deve coprire

- 3 scelte identitarie pre-Act-0 (ADR-2026-04-21b): 3 opzioni + timer + auto-select A.
- Form Pulse: 5 micro-scenari swipe (~15s) -> assi creature-themed (NON test
  psicologico; sposta i pesi VC, non li fissa).
- Biome-form affinity landing (V3 B4): atterri nel bioma piu' affine alla Forma;
  specie iniziale = istanza role_template del bioma.
- Social/clan ritual test (V3 B5): prima interazione ecologica (help/hinder/ignore),
  3 esiti che spostano la Forma del party.
- Mapping verso VC / MBTI / Ennea / Conviction (riusa il device ledger SPEC-A).
- Device authority: nessun input da TV; TV = splash/mirror dell'identita' emergente.
- Public/private: cosa appare su TV (recap identita') vs cosa resta sul device.

## Dipendenze

- SPEC-A (device ledger deve accettare `initial_trait_choice` + `form_pulse_submit`).
- SPEC-K (surface Godot char-creation device-driven, sostituisce slider/host-driven).
- SPEC-B (split pubblico/privato dell'onboarding).

## Stato runtime (git-verify 2026-06-08)

DESIGN-ONLY: 0 hit per `formPulse`/`form_pulse`; VC axes engine + MBTI scoring
live ma la UX micro-scenario non esiste. Le 3 trait-choice esistono gia' in
`active_effects.yaml`.

## Output consigliato

Questo documento (scope) -> spec piena -> ticket Godot phone onboarding + backend
event-type whitelist.
