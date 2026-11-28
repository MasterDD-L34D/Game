---
title: Cross-stack test fixtures
doc_status: draft
doc_owner: claude-code
workstream: ai-station-test-infra
last_verified: 2026-05-14
language: it
---

# Cross-stack test fixtures

Snapshot di file Godot v2 canonici embedded in Game/ tests/ per evitare
skip-when-sibling-absent in CI single-repo clones.

## Inventory

| Fixture                           | Mirror of                                        | Last sync  |
| --------------------------------- | ------------------------------------------------ | ---------- |
| `godot-v2-promotions-v0.2.0.json` | `Game-Godot-v2:data/progression/promotions.json` | 2026-05-14 |

## Update flow (drift detection)

Quando Godot v2 ships a bump (es. v0.2.0 → v0.3.0):

```bash
# 1. Pull Godot v2 main
cd ../Game-Godot-v2 && git pull origin main

# 2. Copy canonical mirror
cp data/progression/promotions.json \
   ../Game/tests/fixtures/godot-v2-promotions-v<version>.json

# 3. Update GODOT_V2_FIXTURE_PATH in test file
# tests/api/promotion-fallback-cross-stack-parity.test.js → bump filename

# 4. Bump version assertion + run tests
node --test tests/api/promotion-fallback-cross-stack-parity.test.js
```

## Resolution priority

Cross-stack tests resolve Godot v2 JSON via candidates ordered:

1. **`GODOT_V2_REPO` env var** — CI matrix builds con sibling checkout (live drift surface)
2. **Sibling repo on Desktop layout** — local dev with both repos checked out
3. **Bundled fixture** — final fallback, ALWAYS present → tests never skip

## Why bundled fixture wins

Pre-fixture (2026-05-14): single-repo CI clone skipped 4 cross-stack tests
(no sibling Game-Godot-v2/ → tests gracefully skip). Drift could land
unnoticed when local dev had sibling out-of-date.

Post-fixture: fixture = canonical snapshot Godot v2 mainline. CI matches
Game/ FALLBACK_CONFIG against this snapshot byte-shape. Any drift either
side fires test. Update flow manual but auditable.

## Cross-link

- `tests/api/promotion-fallback-cross-stack-parity.test.js`
- ai-station re-analisi: `vault docs/decisions/OD-024-031-aistation-reanalysis-2026-05-14.md`
- Cross-stack drift original fix: PR #2263
