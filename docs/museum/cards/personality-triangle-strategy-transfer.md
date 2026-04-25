---
title: Triangle Strategy MBTI Transfer Plan — research doc mai citato in BACKLOG/OD
museum_id: M-2026-04-25-009
type: research
domain: personality
provenance:
  found_at: docs/research/triangle-strategy-transfer-plan.md
  git_sha_first: 1e7bc455
  git_sha_last: 1e7bc455
  last_modified: 2026-04-24
  last_author: MasterDD-L34D
  buried_reason: forgotten
relevance_score: 5
reuse_path: BACKLOG.md (3 ticket P4-MBTI-001/002/003) + OPEN_DECISIONS Q? "MBTI surface vs accrual"
related_pillars: [P4, P5]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# Triangle Strategy MBTI Transfer Plan (research forgotten)

## Summary (30s)

- **3 Proposals concrete** per chiusura P4 🟡 → 🟢 senza nuova matematica: A) phased reveal Disco-Elysium-style, B) dialogue color codes diegetic, C) recruit gating by MBTI thresholds
- **Mai citato in BACKLOG / OPEN_DECISIONS / sprint kickoff doc** (`docs/planning/2026-04-26-next-session-kickoff-p4-mbti-playtest.md` ne ignora esistenza)
- **Hook point precisi**: cita esattamente `vcScoring.js` + `formSessionStore.js` + `mbti_forms.yaml` come integration point. Research-quality high, action-quality ZERO senza promotion a ticket

## What was buried

### Documento 12+ menzioni MBTI con 3 Proposals

```
Proposal A — Phased reveal (Disco Elysium pacing)
  - Hook: vcScoring.js computeMbtiAxes returns confidence_per_axis
  - UI surface: solo axis con confidence > 0.7 mostrato
  - Reveal progressivo durante campaign (T_F prima, S_N dopo, etc.)
  - Effort: M (~6-8h)

Proposal B — Dialogue color codes diegetic
  - Hook: narrativeEngine pickVoice + render.js drawDialogue
  - UI surface: ogni MBTI axis ha color palette (T=red, F=blue, S=green, N=yellow)
  - Diegetic: player vede dialogue color senza menu MBTI esplicito
  - Effort: M (~5-7h)

Proposal C — Recruit gating by MBTI thresholds
  - Hook: metaProgression.recruitFromDefeat (cf M-2026-04-25-007 mating engine)
  - Logic: recruit fails if MBTI distance(player, target) > threshold
  - Threshold tunable per archetype (8 Cacciatore = -3, 9 Stoico = +1)
  - Effort: M (~4-6h)
```

Ogni Proposal ha effort estimate, hook point preciso, ROI assessment.

### Reference Triangle Strategy

Doc cita pattern Triangle Strategy (Square Enix 2022):

- "Conviction" axis system (Utility / Liberty / Morality)
- Companion recruit gating on conviction match
- Phased reveal narrative arc
- Diegetic UI (no character sheet menu)

## Why it was buried

- Doc esiste in `docs/research/` (nato 2026-04-24 commit `1e7bc455` Sprint 0+1+2 archivio) ma research-only
- Sprint kickoff doc per P4 (`docs/planning/2026-04-26-next-session-kickoff-p4-mbti-playtest.md`) creato indipendentemente, **non legge research/**
- BACKLOG.md ricerca friendly P4 ticket (TKT-MUSEUM-SKIV-VOICES, TKT-MUSEUM-ENNEA-WIRE) ma **nessuno** referenzia Triangle research
- OPEN_DECISIONS.md tocca P4 (OD-010 Skiv voice) ma non recap research
- Bus factor: probabile nessuno (research drafted by user/Claude in passing, mai promosso)

## Why it might still matter

- **P4 closure path 🟡 → 🟢 senza nuova matematica**: Triangle Proposals usano `vcScoring.js` esistente, no engine refactor. ROI altissimo per effort moderato (6-8h Proposal A unico)
- **Combina con altri card museum**: M-2026-04-25-002 (ennea registry) + M-2026-04-25-003 (ennea dataset) + M-2026-04-25-006 (enneaEffects orphan) coprono ENNEA layer; questa card copre MBTI surface presentation. Insieme = P4 🟢 reale
- **Skiv Sprint C voice palette consequence**: Proposal B (dialogue color codes) è natural fit per Skiv voice rendering — ogni voice palette (Type 5 stoico, Type 7 caotico) ha color tinting derivato da MBTI axis dominance

## Concrete reuse paths

1. **Minimal — promote Proposals to BACKLOG ticket (P0, ~30min)**

   Zero coding, pure organization:
   - `BACKLOG.md` add 3 ticket:
     - `TKT-P4-MBTI-001` Phased reveal (Proposal A, effort M ~6-8h)
     - `TKT-P4-MBTI-002` Dialogue color codes (Proposal B, effort M ~5-7h)
     - `TKT-P4-MBTI-003` Recruit gating (Proposal C, effort M ~4-6h, depends on M-007 mating engine activation)
   - `OPEN_DECISIONS.md` add OD-013 "MBTI surface — phased reveal vs accrual silenzioso vs full upfront" with Proposal A as default
   - Output: research-to-backlog pipeline chiusa, P4 path concreto

2. **Moderate — Proposal A wire (P1, ~6-8h)**

   First Proposal pilot:
   - `apps/backend/services/vcScoring.js` extend output con `confidence_per_axis: { E_I: 0.85, S_N: 0.42, T_F: 0.91, ... }`
   - `apps/backend/routes/session.js debrief` filter axis con confidence > 0.7
   - Frontend `apps/play/src/debriefPanel.js` show only revealed axes
   - Test: regression baseline + nuovi unit test
   - Telemetry: `mbti_axis_revealed_at_round` per balance
   - Output: P4 🟡+ verifiable post-playtest

3. **Full — All 3 Proposals shipped (P2, ~16-20h)**

   Triangle Strategy full transfer:
   - Wire all 3 Proposals (depends on M-007 Path A for Proposal C)
   - Cross-link con Skiv voice palette M-003 + thought cabinet PR #1769
   - ADR `docs/adr/ADR-2026-XX-mbti-disco-elysium-transfer.md` documenta architectural pattern
   - Pass a `narrative-design-illuminator` per voice/diary integration
   - Pillar P4 🟢 candidato definitivo

## Sources / provenance trail

- Found at: [docs/research/triangle-strategy-transfer-plan.md:1](../../research/triangle-strategy-transfer-plan.md)
- Git history: `1e7bc455` (2026-04-24, MasterDD-L34D, Sprint 0+1+2 archivio bootstrap) — single commit
- Bus factor: 1
- Related canonical (P4 engine): [apps/backend/services/vcScoring.js:774](../../../apps/backend/services/vcScoring.js) `computeMbtiAxes` + `computeEnneaArchetypes`
- Related canonical (forms): [apps/backend/services/forms/formEvolution.js](../../../apps/backend/services/forms/formEvolution.js)
- Related cross-card: [M-2026-04-25-002 ennea registry](enneagramma-mechanics-registry.md) + [M-2026-04-25-003 ennea dataset](enneagramma-dataset-9-types.md) + [M-2026-04-25-006 enneaEffects orphan](enneagramma-enneaeffects-orphan.md) — quartet for P4 🟢
- Related disinformation source: [docs/planning/2026-04-26-next-session-kickoff-p4-mbti-playtest.md](../../planning/2026-04-26-next-session-kickoff-p4-mbti-playtest.md) — kickoff senza recap research/
- Industry pattern: Triangle Strategy (Square Enix 2022) Conviction system
- Inventory: [docs/museum/excavations/2026-04-25-personality-inventory.md](../excavations/2026-04-25-personality-inventory.md)

## Risks / open questions

- ❓ Proposal A `confidence_per_axis` requires `vcScoring.js` extend signature. Backwards-compat risk se altri consumer (rewardEconomy / narrative qbnEngine) leggono shape attuale
- ⚠️ Proposal C (recruit gating) depends on M-007 mating engine activate. Se M-007 Path B (demolish) → Proposal C diventa N/A
- ⚠️ Color codes (Proposal B) need accessibility review (WCAG contrast, color-blind support) — link `ui-design-illuminator`
- ⚠️ Triangle Strategy industry research è proprietary game pattern (no code reuse), solo pattern transfer. Conferma legal review se necessario per future commercial release
- ✅ Doc clean, no fabbricazione

## Next actions

- **Sprint promote (P0, 30min)**: 3 ticket BACKLOG + OD-013 OPEN_DECISIONS update
- **Cross-link Skiv**: Proposal B (color codes) integration con Skiv voice palette (M-003) Sprint C
- **P4 quartet**: questa card + M-002 + M-003 + M-006 = 4 cards per P4 closure
