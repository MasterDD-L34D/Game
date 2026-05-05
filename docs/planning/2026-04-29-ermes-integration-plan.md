---
title: ERMES Integration Plan — Ecosystem Research, Measurement & Evolution System
doc_status: draft
doc_owner: master-dd
workstream: planning
last_verified: 2026-04-29
source_of_truth: false
language: it
review_cycle_days: 14
related:
  - docs/core/90-FINAL-DESIGN-FREEZE.md
  - docs/reports/2026-04-26-worldgen-pcg-audit.md
  - docs/planning/2026-04-28-master-execution-plan.md
  - docs/planning/EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md
---

# ERMES Integration Plan

## Nome

**E.R.M.E.S. — Ecosystem Research, Measurement & Evolution System**

ERMES assorbe il precedente progetto Evolution Sim e lo inserisce nel repo Evo Tactics come modulo di ricerca, misurazione e simulazione ecosistemica.

## Decisione

ERMES non è un nuovo gioco autonomo.

ERMES è:

1. laboratorio locale;
2. dashboard di analisi;
3. exporter JSON;
4. tuning harness;
5. futuro ponte verso encounter bias, mutation bias, debrief e worldgen constraints.

## Principio guida

> ERMES misura e suggerisce. Evo Tactics decide e gioca.

## Perimetro immediato

### In scope

- `prototypes/ermes_lab/`
- simulazione aggregata specie/bioma;
- CLI fallback;
- test deterministici;
- dashboard opzionale Streamlit;
- export `outputs/latest_eco_pressure_report.json`;
- experiment loop locale.

### Out of scope

- modifiche combat runtime;
- modifiche `apps/backend/`;
- modifiche `apps/play/`;
- modifica dataset canonici;
- integrazione diretta Game-Database;
- full foodweb runtime simulation;
- mappe tattiche procedurali.

## Target output

```json
{
  "biome_id": "badlands",
  "eco_pressure": 0.52,
  "encounter_bias": { "ambush": 0.12, "scavenger": 0.08 },
  "mutation_bias": { "heat_resistance": 0.1 },
  "debrief_notes": ["Il bioma mostra pressione ecosistemica moderata."]
}
```

## Roadmap

| Stato | Fase | Task                     | Output                            |
| ----- | ---- | ------------------------ | --------------------------------- |
| ☐→☑  | E0   | Doc integration          | questo file                       |
| ☐→☑  | E1   | Prototype isolated       | `prototypes/ermes_lab/`           |
| ☐     | E2   | CLI + deterministic sim  | `ermes_sim.py`                    |
| ☐     | E3   | Dashboard optional       | `ermes_dashboard.py`              |
| ☐     | E4   | JSON export              | `latest_eco_pressure_report.json` |
| ☐     | E5   | Experiment loop          | `scoring.py`                      |
| ☐     | E6   | Codex validation         | tests + README                    |
| ☐     | E7   | Future runtime candidate | crossEventEngine design only      |
| ☐     | E8   | Future foodweb candidate | ecosystemLoader design only       |

## Runtime gate futuro

Runtime integration solo dopo playtest gate, ADR dedicata e test regression.
