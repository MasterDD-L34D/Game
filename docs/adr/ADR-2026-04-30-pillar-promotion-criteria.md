---
title: 'ADR-2026-04-30: Pillar promotion criteria — formalize 🟢++/🟢/🟢 candidato/🟡++/🟡 thresholds'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-30
source_of_truth: true
language: it
review_cycle_days: 60
related:
  - docs/planning/2026-04-29-master-execution-plan-v3.md
  - docs/adr/ADR-2026-04-29-pivot-godot-immediate.md
---

# ADR-2026-04-30 — Pillar promotion criteria

## Status

ACCEPTED — 2026-04-30

## Context

Da sprint M3 a Fase 1 closure 2026-04-29, status pillar (🟢++ / 🟢 / 🟢 candidato / 🟡++ / 🟡 / 🔴) usato senza criterio formale. CLAUDE.md sprint context registra evoluzione status PR-by-PR ma threshold "quando promuovere" implicit. Gap audit 2026-04-30 (3 agent paralleli) flag MEDIUM-HIGH: futuro Sprint N gate fa ranking pillar runtime — necessita criterio reproducibile.

Anti-pattern Engine LIVE Surface DEAD (CLAUDE.md Gate 5): 18/61 voci catalogate ship backend ma nessun surface player → quel pillar non è davvero 🟢. Promotion criterio deve riflettere VISIBILITÀ player, NON solo "code shipped".

## Decision

**Tier ladder** (low → high):

| Tier                | Criterio (mandatory all)                                                                                                                    | Esempio referenziato                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 🔴 broken           | Engine assente o test rosso bloccante                                                                                                       | n/a (zero P attualmente)                       |
| 🟡                  | Backend logic implementato + dataset YAML/JSON exist + test verde, MA surface player ZERO                                                   | P4 pre-thoughts ritual UI                      |
| 🟡++                | 🟡 + parziale surface (1 axis su 4, o 1 archetype su 9) + UI overlay/HUD/CLI minimale                                                       | P4 post thought cabinet UI (1/4 axes T_F full) |
| 🟢 candidato        | 🟡++ + surface full + smoke test E2E (utente vede effetto in <60s gameplay) MA playtest live userland NON eseguito                          | P5 post M11 Phase A-C ship (#1680)             |
| 🟢                  | 🟢 candidato + playtest live ≥1 sessione userland verde (rubric ≥3.5/5 + zero score 1)                                                      | P1 Tattica leggibile (FFT)                     |
| 🟢++                | 🟢 + ≥2 enhancement layer shipped (es. CT bar lookahead + ITB telegraph + asset visual upgrade) + multi-source feedback (≥2 tester DIVERSI) | P1 post Sprint G v3 + CT bar #1998             |
| 🟢ⁿ (multi-faceted) | 🟢 + ≥3 system independenti shipped (es. P3: 35 ability r1-r4 + Beast Bond + 4 jobs orfani assigned + ability menu UI)                      | P3 post #1978 + #1976                          |

**Demotion trigger** (mandatory regression):

- Race condition cascade UNRESOLVED userland → demote 🟢 → 🟡 (es. P5 web stack co-op pre-pivot Godot 2026-04-29)
- ADR ACCEPTED supersede engine source canonical → demote tier-based su scope reset
- Asset shipped poi orphan ≥2 sprint senza wire → demote 🟢++ → 🟢 (Gate 5 anti-pattern enforcement)

**Promotion gate Sprint N** (Fase 2 cutover):

Formalizzato `docs/planning/2026-04-29-master-execution-plan-v3.md` §"Gate exit Sprint N" tabella 10 row (5 baseline + GATE 0 + 6 pillar P1-P6). Verdict:

- 10/10 SÌ → cutover Fase 3
- 8-9/10 → re-evaluate
- ≤7/10 → archive Godot R&D

## Anti-pattern guards

- ❌ Promote a 🟢 senza playtest live → "🟢 candidato" è il cap per asset shipped backend+surface
- ❌ Promote a 🟢++ senza ≥2 enhancement DISTINCT layer → singolo PR enhancement = 🟢 stable
- ❌ Skip Gate 5 wire frontend → backend-only ship resta 🟡 (NON 🟢 candidato)
- ❌ Auto-revive deprecated pillar senza ADR + user OK

## Consequences

**Positive**:

- Sprint N gate exit reproducibile + auditable
- Future agent (creature-aspect-illuminator, balance-illuminator, etc.) ha rubric chiara per audit pillar status
- Demotion path esplicito → no silent regression (es. P5 web stack 2026-04-29)
- Memory/CLAUDE.md sprint context update consistent

**Negative**:

- Overhead lieve ogni sprint context update (verifica criterio prima promote)
- Tier `🟢ⁿ` ambiguo — definito "≥3 system independenti" ma threshold soggettivo

**Neutral**:

- Status precedenti (Fase 1 closure 2026-04-29) NON re-audit retroattivo. Forward-only enforcement Sprint M+ onward.

## Alternatives considered

- **Numeric scoring 0-100**: rigetto → soggettivo + falso senso precisione. Tier discrete più oneste.
- **Solo 🟢/🟡/🔴 (no candidato/++)**: rigetto → granularità persa, perdita signal "shipped backend ma playtest pending" vs "shipped+playtest verde".
- **Pillar = % feature complete**: rigetto → feature scope drift, % moving target, no semantic value.

## References

- CLAUDE.md "Gate 5 — Engine wired (dichiarazione 2026-04-27)"
- CLAUDE.md "✅ Verify Before Claim Done (anti-rescue policy 2026-04-25)"
- `docs/planning/2026-04-20-pilastri-reality-audit.md` — origine framework
- `docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md` — gap audit trigger
- `docs/planning/2026-04-29-master-execution-plan-v3.md` §"Gate exit Sprint N"
