---
title: TKT-BOND-HUD-SURFACE — Frontend handoff
status: pending-frontend-coord
date: 2026-05-10
type: planning
audience: frontend-team
owner: master-dd
related:
  - apps/backend/services/combat/bondReactionTrigger.js
  - apps/backend/routes/session.js (line 746, 932)
  - data/core/companion/creature_bonds.yaml
  - BACKLOG.md TKT-BOND-HUD-SURFACE
---

# TKT-BOND-HUD-SURFACE — Frontend handoff (Tier L2)

## Context

Cross-domain audit 2026-05-10 (creature-aspect-illuminator) Gate 5 violation:

> bondReactionTrigger.js IS wired in session.js (lines 86, 576, 746-757, 932) — bond reactions fire post-attack. **Engine LIVE, surface partial**: `bond_reaction` result is returned in session action response but **no HUD/UI displays it**. Player cannot see that a bond fired.

5 bond pairs definite in `creature_bonds.yaml` (dune_stalker×2, anguis_magnetica, sciame_larve_neurali×polpo, simbionte_corallino×leviatano, chemnotela_toxica×2, gulogluteus×terracetus). 39 species senza bond — separate scope.

## Backend status — LIVE

`apps/backend/routes/session.js:932` ritorna `bond_reaction` field in POST `/api/session/action` response payload:

```json
{
  "session_id": "...",
  "attack_result": {...},
  "bond_reaction": {
    "triggered": true,
    "bond_id": "dune_stalker_pack",
    "actor_id": "unit_1",
    "ally_id": "unit_2",
    "buff_applied": {"stat": "attack_mod", "amount": 1, "duration": 1},
    "log_tag": "bond_reaction_dune_stalker_pack"
  },
  ...
}
```

E `beast_bond_reactions: [...]` array (line 939) per multi-bond stack scenarios.

Schema authoritative source: `bondReactionTrigger.triggerBondReaction()` return shape.

## Frontend gap — DEAD

Mission Console bundle (`docs/mission-console/`) Vue 3 pre-built **NON ha source nel repo Game/** (per CLAUDE.md doc layout). Frontend ticket richiede:

1. **Source repo coord** — master-dd identifica dove vive Mission Console source (separate repo / archived bundle / new build pipeline)
2. **Bond reaction toast component** — Vue component che subscribe a action response → mostra toast notification:
   - Titolo: "Legame attivato"
   - Body: bond label + buff applied summary
   - Icon: bond pair sprite (creature_bonds.yaml metadata)
   - Duration: 2-3s ease-out
3. **Bond log panel** — debrief view: list bond reactions firing during encounter (count + buff cumulative)
4. **Bond pair badge** — combat HUD: small badge next to unit when adjacent ally part of bond pair (visual hint pre-trigger)

## Acceptance criteria

- [ ] Vue component `BondReactionToast.vue` mounted in CombatView
- [ ] Subscribed a action response websocket event (Mission Console `useSessionStore` integration)
- [ ] Toast renders entro 200ms post-bond_reaction.triggered=true
- [ ] Debrief panel mostra `bond_reactions_count` aggregate per session
- [ ] Smoke E2E: utente vede bond fire entro 60s gameplay (Gate 5 compliant)

## Effort estimate

- Vue component + integration: ~2h (assumendo source available)
- Debrief panel extension: ~30min
- Smoke E2E test (Playwright): ~30min
- **Total**: ~3h post source availability

## Out of scope

- Bond pair extension a 39 altre species (TKT-BOND-EXPAND, separate ticket)
- Bond reaction sound design (audio team)
- Bond pair generative discovery (worldgen-driven new bonds)

## Resume trigger

> _"unblock TKT-BOND-HUD-SURFACE — Mission Console source identified at <PATH>, ship Vue toast + debrief panel"_
