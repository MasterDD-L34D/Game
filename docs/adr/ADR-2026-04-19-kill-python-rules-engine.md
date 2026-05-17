---
title: 'ADR 2026-04-19 — Kill Python rules engine (services/rules/)'
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-04-19'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/architecture/resistance-engine-gap.md'
  - 'docs/adr/ADR-2026-04-13-rules-engine-d20.md'
  - 'docs/adr/ADR-2026-04-19-resistance-convention.md'
---

# ADR-2026-04-19 · Kill Python rules engine (deprecation + removal roadmap)

**Stato**: 🟢 ACCEPTED + Phase 3 closed 2026-05-05
**Trigger**: user direction 2026-04-19 "1 solo gioco online, senza master"
**Supersedes**: `ADR-2026-04-13-rules-engine-d20.md` (porzione Python runtime)

## Contesto

`services/rules/` (Python) è stato sviluppato (sprint 6xxx 2025) come **rules engine canonico** d20, pensato come source-of-truth per:

- Tabletop Master DM (`tools/py/master_dm.py` REPL interactive)
- Demo CLI (`services/rules/demo_cli.py`)
- Worker bridge Node (`services/rules/worker.py`)
- Test suite Python (`tests/test_resolver.py`, `tests/test_hydration.py`, etc.)

**Assunzione originale**: design ibrido tabletop-first + digital companion (`apps/play/` + Mission Console) che condividessero rules canoniche via bridge.

## Realtà 2026-04-19

### 1. Gameplay canonical = digital-only

User direction explicit (sessione 2026-04-19):

> "Il gioco deve essere **senza master**, non devono esistere due giochi ma uno solo, **quello online**."

Implicazione: tabletop DM mode = **feature morta**. Non è roadmap target.

### 2. Node session engine è runtime canonico

- `apps/backend/routes/session.js` + `apps/backend/services/*` = gameplay reale
- 851+602+248+58 LOC session/round/bridge/helpers dedicato
- 189 test Node AI verdi
- Utility AI, round orchestrator, ability executor, VC scoring = tutti Node native
- **Nessun bridge runtime** tra Node e Python rules engine

### 3. Duplicazione confermata dal parallel-agent audit

Audit 2026-04-19 scoprì (documentato in `resistance-engine-gap.md`):

- Python rules ha `resolver.py::apply_resistance` + `merge_resistances` completi
- Node session engine **zero reference** a resistance (gap reale)
- M5 sprint fixò Python ma runtime era Node → fix invisibile al giocatore
- M6-#1 (#1639) **riportò** la logica a Node (native implementation)

Post M6-#1, Python rules engine = **duplicato dead code** rispetto al runtime canonical.

## Costi attuali Python engine

| Asset                                       | Costo mantenimento               |
| ------------------------------------------- | -------------------------------- |
| `services/rules/` ~2500 LOC Python          | high (manutenzione parallela)    |
| `tests/test_resolver.py` 83 test            | medium (run time + drift verify) |
| `tests/test_hydration.py` 28 test           | medium                           |
| `tests/test_round_orchestrator.py` 124 test | high (complex scenarios)         |
| `services/rules/worker.py` bridge           | low (unused in production)       |
| `tools/py/master_dm.py`                     | low (tabletop DM, feature morta) |
| `services/rules/demo_cli.py`                | low (dev tool)                   |
| **Total effort share M5 sprint**            | ~40% di sprint era Python-only   |

## Decisione

**KILL Python rules engine**. Progressive deprecation + removal.

### Convention lock (post kill)

- **Runtime canonical**: Node (`apps/backend/`)
- **Rules logic**: `apps/backend/services/combat/*.js` + `apps/backend/routes/session.js`
- **Resistance engine**: `apps/backend/services/combat/resistanceEngine.js` (M6-#1)
- **Round orchestrator**: `apps/backend/services/roundOrchestrator.js`
- **Ability executor**: `apps/backend/services/abilityExecutor.js`
- **ADR convention** (ADR-2026-04-19 resistance-convention) rimane valida, applicata solo lato Node

### Deprecation path (3 phases)

**Phase 1 — Deprecation mark (questo ADR + stub comments)** — ~1h

- Aggiungi header `@deprecated` + link a questo ADR a ogni file `services/rules/*.py`
- Mark `tools/py/master_dm.py`, `services/rules/demo_cli.py` come "tabletop-only, not canonical"
- Update `CLAUDE.md` architecture note

**Phase 2 — Feature freeze** — immediate post Phase 1

- No new features/fixes a Python rules engine
- Nuove regole combat solo in Node
- Python tests rimangono CI ma solo as regression safety net finché Phase 3

**Phase 3 — Remove** — closed 2026-05-05 (PR `chore/services-rules-phase-3-removal`)

- ✅ Deleted `services/rules/` subdir (8 file Python + DEPRECATED.md)
- ✅ Deleted Python tests: `test_resolver.py`, `test_hydration.py`, `test_round_orchestrator.py`, `test_trait_effects.py`, `test_demo_cli.py`, `test_grid.py`, `test_master_dm_parser.py`
- ✅ Deleted `tools/py/master_dm.py`, `tools/py/mark_python_rules_deprecated.py`
- ✅ Deleted `tests/server/rules-bridge.spec.js` (worker bridge spawn integration test)
- ✅ Patched `tools/py/gen_trait_types.py` (dropped Python dataclass codegen, mantenuto TS + JSON Schema)
- ✅ Aggiornati commenti YAML (`action_speed.yaml`, `trait_mechanics.yaml`) → consumer Node
- ✅ Aggiornato `CLAUDE.md` (rimosso bullet repository layout + Rules engine tests + Combat pipeline pointer aggiornato a Node canonical)
- ✅ Aggiornato `docs/hubs/combat.md` (sezione "Phase 3 removal completata" + Comandi demo riallineati a Node)
- Retention: git history preserva codice per ref futuro

### Alternative considerate

**A. Keep Python, fix bridge**: portare Node session engine ad usare Python rules via IPC — ~20h effort, **rifiutata** (user direction digital-only + Flint "M6 trap").

**B. Maintain parity Node↔Python forever**: doppio effort ogni feature, drift inevitable — **rifiutata** (costo compound).

**C. Kill Python** (questo ADR): dedica effort a 1 engine solido → meno debito, più velocità.

## Conseguenze

### Positive

- **-40% effort sprint** residuo M6+ (no Python tests + no parity concerns)
- Focus mentale + codebase su 1 engine
- Eliminata confusion Node vs Python discovery pattern (bug M5 audit)
- Git history preserva codice Python se serve reference futuro
- test suite più veloce (Python tests removal)

### Negative

- Tabletop DM mode **morto** per sempre (già non roadmap)
- Balance author deve ora editare dataset senza Python demo_cli tool
  - Mitigazione: build similar CLI tool su Node (`tools/js/demo_cli.js`) se serve, Phase 4
- Python rules `apply_resistance` formula + `merge_resistances` **parità semantic test persa** (era contract ref M6-#1)
  - Mitigazione: test suite M6-#1 `tests/ai/resistanceEngine.test.js` 21 test preserva logic

### Rollback

- Phase 1 (deprecation): docs-only, instant revert via git revert
- Phase 2 (freeze): no code change, rollback = riattiva dev su Python
- Phase 3 (removal): git revert subdir. Git preserva codice.

## Migration path cross-stack

Post M6-#1 + M6-#2:

- Resistance: **Node native** (tests/ai/resistanceEngine.test.js 21)
- Round orchestrator: **Node native** (tests/ai/\*.test.js 168+)
- Ability executor: **Node native** (tests/ai/abilityExecutor.test.js)
- VC scoring: **Node native** (apps/backend/services/vcScoring.js)
- Hydration: **N/A** (Node session engine ha session init diretto, no hydrate_encounter)

Tutto runtime critico = Node. Python rules = pure dead weight.

## Autori

- Master DD (user direction 2026-04-19)
- Flint advisor review (ROI analysis)
- Agent session 2026-04-19 (architectural discovery post parallel-agent audit)
