---
title: Inscryption Camera Reveal + Meta-Frame Escalating
museum_id: M-2026-04-27-027
type: research
domain: other
provenance:
  found_at: docs/research/2026-04-27-indie-narrative-gameplay.md §4 + docs/research/2026-04-27-indie-concept-rubabili.md §2
  source_game: 'Inscryption — Daniel Mullins Games (2021)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 2
reuse_path: apps/backend/services/narrative/narrativeRoutes.js + objectiveEvaluator.js expose + TKT-09 resolve
related_pillars: [P4, P5]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P4
effort_estimate_h: 6
blast_radius_multiplier: low
trigger_for_revive: Post-MVP playtest dimostra need + TKT-09 ai_intent_distribution resolve
related:
  - docs/research/2026-04-27-indie-narrative-gameplay.md
  - docs/research/2026-04-27-indie-concept-rubabili.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.3.3
  - apps/backend/services/combat/objectiveEvaluator.js
verified: false
---

# Inscryption Camera Reveal + Meta-Frame Escalating

## Summary (30s)

- Il Sistema rivela i propri dati al player progressivamente come "dossier intercettato" — reveal meccanico, non narrativo. Richiede TKT-09 (ai_intent_distribution emessa).
- Deferred: DEFER #1925 post-MVP — TKT-09 prereq + blast radius narrativo. Score 2/5 — post-MVP only.
- Trigger revive: post-MVP playtest dimostra need + TKT-09 resolved.

## What was buried

Pattern estratto da `indie-narrative-gameplay.md §4` + `indie-concept-rubabili.md §2`. Inscryption: il reveal più potente avviene attraverso una meccanica (player trova oggetto che non dovrebbe esistere). Diegetic break come emotional climax.

Per Evo-Tactics: `objectiveEvaluator.js` già live ma non esposto. Pattern concreto:

1. Player completa 3 missioni consecutive vs stesso archetipo nemico.
2. `objectiveEvaluator.js` ha tracciato i pattern AI.
3. Briefing speciale (inkjs knot triggerato da `consecutiveSameArch >= 3`) mostra "dati interni del Sistema": pressure history, spawn pattern, AI intents usati — framed come "dossier intercettato".
4. L'informazione è reale — estratta da runtime, non fabricata.

**Prerequisiti**: `narrativeRoutes.js` live, `objectiveEvaluator.js` live (ma TKT-09: ai_intent_distribution non emessa da `/round/execute`).

## Why it was buried

DEFER #1925: "post-MVP — TKT-09 prereq + blast radius". Due blockers: (1) TKT-09 non risolto (ai_intent non emessa), (2) richiede post-MVP perché il reveal ha più impatto dopo che il player ha già investito nella campagna. Score 2/5 — niche, experimental, post-MVP only.

## Why it might still matter

P5 Co-op vs Sistema: rende il Sistema un antagonista reale che "pensa". Il player non combatte regole — combatte un'entità. P4: narrative reactivity alta se implementato con dati reali runtime.

## Concrete reuse paths

1. **Minimal (~3h, P2)**: `objectiveEvaluator.js` espone `consecutiveSameArch` counter in campaign state. Nessun reveal ancora.
2. **Moderate (~5h, P1, post-TKT-09)**: `narrativeRoutes.js` riceve `aiIntentDistribution` da `/round/execute`. Briefing ink variant `sistema_reveal` triggerato dopo soglia.
3. **Full (~6h + TKT-09 ~4h, P0 post-MVP)**: full reveal knot con dati reali (pressure history + spawn pattern + AI intents + consecutive win check). "Il Sistema nomina il party" milestone di campagna.

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-narrative-gameplay.md §4](../../../docs/research/2026-04-27-indie-narrative-gameplay.md)
- Found at: [docs/research/2026-04-27-indie-concept-rubabili.md §2](../../../docs/research/2026-04-27-indie-concept-rubabili.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.3.3](../../../docs/reports/2026-04-27-indie-research-classification.md)
- TKT-09 reference: BACKLOG.md (ai_intent_distribution non emessa via /round/execute response)

## Risks / open questions

- NON glitch visivo o effetti rotti artificialmente. Budget art zero + rischio sembrare un vero bug. Il reveal avviene attraverso informazione, non estetica.
- NON meta-frame reset completo (Evo-Tactics non ha struttura atto-2 come Inscryption). Solo "rivelazione progressiva interna", non frame break letterale.
- TKT-09 è prerequisito bloccante. Risolvere TKT-09 prima (stima ~4h) poi implementare il reveal. Non implementare in ordine inverso.
- Post-MVP timing: il reveal ha impatto massimo dopo che il player ha investito nella campagna. Implementare too-early riduce l'effetto sorpresa.
