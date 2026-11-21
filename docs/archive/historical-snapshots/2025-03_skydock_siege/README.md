---
title: Skydock Siege Historical Playtest Capsule (2025-03)
workstream: ops-qa
category: archive
doc_status: archived
doc_owner: claude-code
last_verified: '2026-04-25'
source_of_truth: false
language: it
tags:
  - archive
  - playtest
  - historical
  - skydock-siege
  - 2025-03
related:
  - docs/archive/historical-snapshots/2025-11-15_evo_cleanup
  - data/derived/skydock_siege/
---

# Skydock Siege Historical Playtest Capsule

## Status: ARCHIVED 2026-04-25

**Origin**: `data/core/missions/skydock_siege.yaml` (`revision: 2025-03-05-helix-cipher`).

**Decision** (user verdict 2026-04-25 OD-D3 archeologist excavate): **Opzione B archive** — preserva reference storico, libera attention dal core path.

**Reason**: capsule contiene aggregato risk/tilt da 3 sessioni alpha/bravo/charlie 2025-03 ma:

- Mission encounter spec mancante (zero `encounter_id` derivato)
- Zero campaign loader integration
- Zero recent reference in BACKLOG/CLAUDE.md (>13 mesi inactivity)
- Originale era POC pre-M-series sprint structure

## Content preserved

- `skydock_siege.yaml` — raw revision 2025-03-05-helix-cipher con session_logs (alpha/bravo/charlie) + targets/risk/tilt thresholds + verdict notes

## Revival path (se necessario)

Per riattivare:

1. User content design: nuovo encounter spec basato su risk/tilt thresholds storici
2. Wire campaign loader (richiede `data/core/campaign/` chain entry)
3. Calibration N=10 harness pre-merge (vedi `tools/py/batch_calibrate_*.py` patterns)
4. ADR per design decision pre-spec

Effort revival completo: ~10-15h content design + ~5h wire + ~3h calibration.

## NON usare come

- ❌ Active mission spec (zero runtime consumer)
- ❌ Calibration baseline (data 13 mesi vecchio, pre-balance pivot)
- ❌ Reference per nuovi encounter (usa hardcore 06/07 baseline più recente)

## Cross-link

- Original location: `data/core/missions/skydock_siege.yaml` (now archived)
- Derived data: `data/derived/skydock_siege/` (XP profile CSV preservati)
- Excavate report: archeologist 2026-04-25 sera Section A item B6
