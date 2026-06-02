---
title: GAP-C fase-3/4 autonomous build — discarded (gated POST-MVP)
museum_id: M-2026-06-02-001
type: discarded_decision_path
domain: worldgen-meta-network-gap-c
provenance:
  found_at: docs/planning/2026-06-02-gapc-fase3-4-build-vs-gate.md
  git_sha_first: TBD
  git_sha_last: TBD
  last_modified: 2026-06-02
  last_author: claude-opus-4.8-design-closure
  buried_reason: residuo GAP-C (Godot choice-UI + generative grammar + arc-data) gated POST-MVP -- flag OFF + cross-repo + Gate-5 fail per build-now
relevance_score: 4
reuse_path: docs/planning/2026-06-02-gapc-fase3-4-build-vs-gate.md (Pattern, build-vs-gate worldgen routing UI/grammar)
related_pillars: [P5]
related_od: []
status: curated
excavated_by: claude-opus-4.8 design-closure 2026-06-02 (goal Fase-1 H1, repo-archaeologist non in registry sessione codemasterdd -> card autorata in formato canonico)
excavated_on: 2026-06-02
last_verified: 2026-06-02
---

# GAP-C fase-3/4 autonomous build — discarded (gated POST-MVP)

## Summary (30s)

- Nel GOAL design-closure (Fase-1 H1) la frontiera di build candidata era **GAP-C fase-3/4** (worldgen
  meta-network routing): fase-3 Godot choice-UI + fase-4 generative grammar + arc-conditions data
  ulteriore.
- **Scartato come build autonomo** in favore di **GATE / POST-MVP**: lo Stage-1 (#2483) + fase-2
  arc-conditions (#2509) sono gia LIVE flag-OFF come fondazione; il residuo tocca una decisione di
  flow/flag (attivare `META_NETWORK_ROUTING`) che e' master-dd (STOP §6).
- **Reuse value**: quando master-dd attiva il flag, questa card + il brainstorm sono il next-build plan
  (Into-the-Breach preview UI + Dormans grammar).

## What was discarded

### Build-now mechanics (le 3 opzioni rinviate)

1. **fase-3 Godot choice-UI** (opzione A): schermata di scelta rotta in Game-Godot-v2 che consuma
   `GET /api/campaign/meta-network/next`, preview Into-the-Breach per nodo.
2. **arc-conditions data ulteriore** (opzione C): aggiungere `conditions:` (season/prior_node_cleared) a
   piu' edge del meta_network yaml, flag-OFF.
3. **fase-4 generative grammar** (opzione D): grammar Dormans che genera il graph proceduralmente.

### Why discarded (gate, non over-caution)

| Criterio        | Esito | Rationale                                                                      |
| --------------- | :---: | ------------------------------------------------------------------------------ |
| Scope-repo      | fail  | fase-3 = cross-repo Game-Godot-v2, fuori dallo scope `C:/dev/Game` del goal    |
| Flag discipline | fail  | `META_NETWORK_ROUTING` OFF-default; flag-ON = decisione master-dd (STOP §6)    |
| Gate-5          | fail  | flag OFF -> il player non VEDE nulla (solo diagnostic endpoint); arc-data idem |
| Design-call     | fail  | arc-conditions authoring (quali bridge/season) = design, non buco tecnico      |
| Effort/urgenza  | fail  | fase-4 grammar = XL senza urgenza (Stage-1 hand-authored copre l'MVP)          |

### Cosa NON e' stato scartato

Lo **Stage-1 + fase-2** restano la fondazione LIVE (flag-OFF). Le opzioni A/C/D sono **rinviate**, non
respinte: se master-dd attiva il flag, A = next-build, C = authoring-content, D = visione long-term.

## Reuse paths

1. **Next-build plan**: quando master-dd greenlighta il flag -> spec fase-3 UI Into-the-Breach (preview
   per nodo, DoD Gate-5 player-vede-<60s) consumando `selectNextNodes.preview`.
2. **Reference-game lock**: Into the Breach (full-information route choice) per la UI; Dormans
   mission/space grammar per la fase-4. Anti-reference = roguelike map-RNG opaco (viola P1 leggibilita').
3. **Pattern**: "feature flag-OFF foundation -> gate la surface finche' il flag non e' una decisione
   owner" (riusabile per altri sistemi flag-gated).

## Lifecycle

- **Status**: `curated` (provenance + opzioni + scoring documentati; brainstorm sibling
  `2026-06-02-gapc-fase3-4-build-vs-gate.md`).
- **Reuse**: pendente decisione master-dd su `META_NETWORK_ROUTING` flag.
- **Decommission**: se master-dd attiva il flag + builda fase-3 -> la card diventa training-evidence del
  build-vs-gate (revived), non si elimina.

## Related

- Brainstorm: `docs/planning/2026-06-02-gapc-fase3-4-build-vs-gate.md` (opzioni A/B/C/D + verdetto GATE)
- Report: `docs/reports/2026-06-02-design-closure.md` §H1
- Memory: `project_worldgen_gapc_spec` ("fase 2-4 GATED master-dd")
- Games source index: `docs/guide/games-source-index.md` (P5 -> Into the Breach + Dormans)
