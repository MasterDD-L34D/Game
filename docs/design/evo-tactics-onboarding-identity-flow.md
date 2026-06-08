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
`51-ONBOARDING-60S` + ADR-2026-04-21b. Stato reale = DESIGN/PARTIAL (backend
form_pulse + initial_trait_choice LIVE; manca la UX device + Godot char-creation; vedi
Stato runtime).

## Obiettivo

Definire i primi ~60s del giocatore (pre-Act-0) come catena device-driven di
scelte identitarie che seedano Forma, bioma e Custode -- sostituendo lo slider
MVP/debug con un onboarding diegetico.

## Deve coprire

- 3 scelte identitarie pre-Act-0 (ADR-2026-04-21b): 3 opzioni + timer + auto-select A.
- Form Pulse: 5 micro-scenari swipe (~15s) -> assi creature-themed (NON test
  psicologico; sposta i pesi VC, non li fissa). Authority/visibilita' = SPEC-B sez. 3.2
  (tier) + F1 (TV = radar aggregato di default; per-player opt-in, mai imposto). SPEC-M
  esegue, non ridecide.
- Biome-form affinity landing (V3 B4): atterri nel bioma piu' affine alla Forma;
  specie iniziale = istanza role_template del bioma.
- Social/clan ritual test (V3 B5): prima interazione ecologica (help/hinder/ignore),
  3 esiti che spostano la Forma del party.
- Mapping verso VC / MBTI / Ennea / Conviction (riusa il device ledger SPEC-A).
- Device authority: nessun input da TV; TV = splash/mirror dell'identita' emergente.
- Public/private: ratificato in SPEC-B F6 (3 scelte identitarie = `private` + opt-in,
  specchio F1). SPEC-M esegue, non ridecide.

## Dipendenze

- SPEC-A (device ledger deve accettare `initial_trait_choice` + `form_pulse_submit`).
- SPEC-K (surface Godot char-creation device-driven, sostituisce slider/host-driven).
- SPEC-B (split pubblico/privato dell'onboarding).

## Stato runtime (git-verify 2026-06-08)

DESIGN/PARTIAL (NON design-only -- correzione retro-review):

- **form_pulse: backend LIVE** -- `coopOrchestrator.js` ha `formPulses` Map +
  `submitFormPulse` (axes per-player, store, broadcast `form_pulse_list`, ready-gate;
  phone smoke W4/W7). Manca solo la UX micro-scenario swipe in Godot.
- **initial_trait_choice: backend LIVE** -- `POST /api/campaign/start` accetta
  `initial_trait_choice` (option_a/b/c) e applica `acquiredTraits[]` al branco
  (`routes/campaign.js`:150). Le 3 trait sono in `active_effects.yaml` (definizioni
  `zampe_a_molla`/`pelle_elastomera`/`denti_seghettati`) + `default_campaign_mvp.yaml`
  (sezione `onboarding:`).
- **VC axes + MBTI/Conviction scoring: LIVE** (`vcScoring.js`, `convictionEngine.js`).
- **DEBT host-only**: `coopOrchestrator.submitOnboardingChoice` ha guard `host_only`
  residuo (L25 + enforcement) -- da estendere a tutti i device prima della surface
  device-driven SPEC-K.
- DESIGN-ONLY resta solo: la UX device (swipe micro-scenari + social/clan ritual) + il
  Godot char-creation device-driven (sostituzione slider).

## Output consigliato

Questo documento (scope) -> spec piena -> ticket Godot phone onboarding + backend
event-type whitelist.
