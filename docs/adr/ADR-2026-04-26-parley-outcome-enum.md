---
title: 'ADR-2026-04-26 — Parley/accordo outcome enum extension'
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 180
related:
  - apps/backend/routes/session.js
  - apps/backend/services/combat/objectiveEvaluator.js
  - services/narrative/narrativeEngine.js
  - docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html
---

# ADR-2026-04-26 — Parley/accordo outcome enum

**Status**: proposed
**Decision date**: 2026-04-26
**Effort impl**: 20-25h (Sprint B)

## Context

Outcome runtime enum oggi è binario-tactical:

- `apps/backend/routes/session.js:2009-2012` → `win | wipe | draw | abandon`
- `apps/backend/services/combat/objectiveEvaluator.js:13` JSDoc → `win | wipe | timeout | objective_failed`

Lore biome `frattura_abissale_sinaptica` cita testualmente (vedi `data/core/traits/biome_pools.json:482-485` apex Leviatano + Canto dello Strappo) la possibilità di **accordarsi con il Leviatano Risonante**. Vertical slice (`docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html:1990-2062`) implementa esplicitamente 3 outcome:

```js
// linee 2031-2061 vertical slice
const OUTCOMES = {
  good: { title: 'Debrief ecologico · Accordo', esito: 'ACCORDO CON IL LEVIATANO' },
  neutral: { title: 'Debrief ecologico · Ritirata', esito: 'RITIRATA CONTROLLATA' },
  bad: { title: 'Debrief ecologico · Frattura', esito: 'COMBATTIMENTO / FRATTURA' },
};
```

Il design canonical promette **non-binary, non-violent resolution** — il runtime non lo supporta.

## Decision

Estendi outcome enum con 2 valori nuovi:

| Outcome            | Stamp     | Trigger condition (esempio Leviatano fase 3)                                               |
| ------------------ | --------- | ------------------------------------------------------------------------------------------ |
| `win`              | VITTORIA  | apex eliminato (combat path)                                                               |
| `parley`           | SINCRO    | ≥5 azioni `symbiosis_action` / `communication_action` durante phase finale + apex HP > 30% |
| `retreat`          | RITIRO    | tutti player exit zona `escape_target` durante phase ≥2 + apex HP > 50%                    |
| `wipe`             | KO        | tutti player KO                                                                            |
| `timeout`          | TIMEOUT   | turn_count > limit                                                                         |
| `objective_failed` | FAIL      | objective fallito esplicitamente                                                           |
| `draw` / `abandon` | unchanged | edge cases                                                                                 |

**Action type tag** (additive, opzionale su trait/ability YAML):

```yaml
# data/core/traits/active_effects.yaml — nuovo campo opzionale
- id: canto_di_richiamo
  effect_type: communication_action
  parley_weight: 2
  ...
- id: ritirata_strategica
  effect_type: escape_action
  ...
```

Trigger logic (Sprint B impl in `apps/backend/services/combat/parleyEvaluator.js` nuovo):

```js
// pseudocode
function evaluateParley(session, encounter) {
  if (encounter.phases?.[encounter.current_phase]?.allow_parley !== true) return null;
  const parleyActions = session.events.filter(
    (e) =>
      ['symbiosis_action', 'communication_action', 'scout_action'].includes(e.action_class) &&
      e.turn >= encounter.phase_started_at,
  );
  if (parleyActions.length >= 5 && apexHpPct() > 0.3) {
    return { outcome: 'parley', narrative_branch: 'accordo' };
  }
  // retreat / etc
}
```

`narrativeEngine.js` (qbnEngine + briefingVariations) deve gestire **4-6 debrief variants**:

- `parley_accordo_full` (5+ actions + low aggression)
- `parley_partial` (3-4 actions, mid aggression)
- `retreat_clean` (escape no losses)
- `retreat_costly` (escape ≥2 losses)
- `combat_win_pyrrhic`
- `combat_win_decisive`

## Consequences

**Positive**:

- Sblocca lore canonical `frattura_abissale_sinaptica`
- Pillar P4 (MBTI temperamenti) più coerente: F-types (Feeling) hanno path significativo
- Sblocca QBN engine multi-outcome branching (scaffolded ma sotto-utilizzato)
- Riusabile per ogni boss apex futuro con lore non-binary

**Negative**:

- Outcome enum espande → `vcScoring.js`, telemetry events, debrief panel UI tutti da aggiornare
- Test surface +25-40 cases (5 outcome × 5-8 trigger paths)
- Risk balance: parley troppo facile → trivializza boss; troppo difficile → feature ghost
- Dipendenza forte da Sprint A (multi-stage): parley ha senso solo come phase-3 trigger

## Alternatives considered

- **A) `parley` come custom hook in encounter YAML invece di enum**: meno strutturato, debrief variants hard, scartato.
- **B) Tag azioni come `peaceful: true` boolean**: troppo grossolano, perde sfumature symbiosis vs communication, scartato.
- **C) Hardcode per Leviatano solo**: non riusabile, viola SoT data-driven, scartato.

## DoD

1. Outcome enum esteso in `session.js` + `objectiveEvaluator.js`
2. `parleyEvaluator.js` nuovo + plugin wire
3. Action class tag su `active_effects.yaml` schema (opzionale, additive)
4. `narrativeEngine.js` 4-6 debrief variants per outcome × narrative_branch
5. Frontend `debriefPanel.js` outcome rendering (stamp + headline + flint variants)
6. Test: ≥15 unit (trigger evaluator) + ≥5 integration (full path each outcome)
7. Balance: N=10 sim per ogni outcome reachable senza degenerate strategy
8. Userland playtest live richiesto post-impl (boss in 4-8p co-op)

## References

- `apps/backend/routes/session.js:2006-2037` — outcome assignment runtime
- `apps/backend/services/combat/objectiveEvaluator.js:13` — outcome enum JSDoc
- `data/core/traits/biome_pools.json:482-485` — apex Leviatano + Canto dello Strappo events
- `docs/archive/concept-explorations/2026-04/Vertical Slice - Risveglio del Leviatano.html:1990-2062` — 3-outcome design canonical
- `services/narrative/narrativeEngine.js` — engine narrative inkjs (riuso target)
- ADR-2026-04-26 multi-stage-encounter-schema (prerequisito)

## Sequencing

**Dipende da** Sprint A (multi-stage). Phase 3 = trigger window per parley evaluation.
**Userland playtest** richiesto prima di mark `accepted` definitivo.
