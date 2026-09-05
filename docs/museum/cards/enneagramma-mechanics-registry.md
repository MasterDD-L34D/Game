---
title: Enneagramma Mechanics Registry — 16 hook stub ready-to-wire
museum_id: M-2026-04-25-002
type: dataset
domain: enneagramma
provenance:
  found_at: incoming/enneagramma_mechanics_registry.template.json
  git_sha_first: 6027b180
  git_sha_last: dbf46e44
  last_modified: 2026-04-16
  last_author: MasterDD-L34D
  buried_reason: unintegrated
relevance_score: 5
reuse_path: apps/backend/services/enneaEffects.js (extend ENNEA_EFFECTS table)
related_pillars: [P4]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# Enneagramma Mechanics Registry — 16 hook stub

## Summary (30s)

- **16 hook stub** ready-to-wire (`triad.core_emotion.rabbia`, `hornevian.obbediente`, ecc.) con eligibility/trigger/effects schema completo
- **Plug-in diretto in `enneaEffects.js`** (orphan canonical 93 LOC mai wired) → estendi `ENNEA_EFFECTS` da hook eligibility map
- **Skiv Sprint C unblock**: triadi + core_emotion già definiti per voice routing — skip 2h research

## What was buried

JSON template canonical schema 1.0.0 con 16 hook entry. Ogni hook:

```json
{
  "id": "ennea_hook_triad_core_emotion_rabbia",
  "eligibility": { "triad.core_emotion": "rabbia" },
  "trigger": { "timing": "round_end", "scope": "self" },
  "effects": [{ "stat_ops": { "attack_mod": "+1" }, "duration": 2 }],
  "narrative_cue": "<text>"
}
```

Categorie hook coperte:

- **Triadi core emotion** (rabbia / paura / ansia) — 3 hook
- **Hornevian** (obbediente / aggressivo / ritirato) — 3 hook
- **Harmonic** (positive / competente / reattivo) — 3 hook
- **Object Relations** (frustration / rejection / attachment) — 3 hook
- **Centri** (mentale / emotivo / istintivo) — 3 hook + 1 wing-bias

Schema completo: `eligibility` (read da `vcSnapshot`), `trigger` (timing + scope), `effects` (stat_ops + duration), `narrative_cue` (testo).

## Why it was buried

- Intro `6027b180` 2025-10-29 ("Add files via upload") da MasterDD-L34D — bulk dataset Enneagramma
- Ultimo touch `dbf46e44` 2026-04-16 (bulk Prettier, no semantic change)
- **Nessun PR ha mai aperto issue di integrazione**: BACKLOG.md / OPEN_DECISIONS.md / CLAUDE.md = 0 menzioni Enneagramma
- `apps/backend/services/enneaEffects.js` (PR #1433 2026-04-16) ha implementato 6 archetipi hardcoded MA non legge questo registry — opportunità mancata

## Why it might still matter

- **Pillar P4 MBTI/Ennea 🟡 → 🟡+ candidato**: registry coverage 16 hook + 9 archetipi base = drop-in chiusura "Operativo P4 completo" (oggi falso da SOURCE-OF-TRUTH §13.4)
- **Skiv Sprint C voice routing**: triadi `core_emotion` (rabbia / paura / ansia) + hornevian (obbediente / aggressivo / ritirato) → 9 voce palette derivate naturalmente da type+wing
- **`enneaEffects.js` orphan (M-2026-04-25-006)**: registry è il "missing piece" che lo trasforma da dead code a runtime live

## Concrete reuse paths

1. **Minimal — load registry in `enneaEffects.js` (P0, ~3h)**

   ```js
   const registry = require('../../incoming/enneagramma_mechanics_registry.template.json');
   ENNEA_EFFECTS = registry.hooks.reduce((acc, h) => ({ ...acc, [h.id]: h }), {});
   ```

   - Wire in `sessionRoundBridge.js` `onRoundEnd` hook
   - Coverage 6 archetipi → 9 archetipi + 16 trait hook in un colpo solo
   - Sblocca M-2026-04-25-006 (enneaEffects orphan)

2. **Moderate — convert template to `data/core/personality/ennea_hooks.yaml` (P1, ~5h)**
   - Sposta da `incoming/` a `data/core/personality/` (canonical)
   - YAML format coerente con altri data files
   - Aggiunge `affordance_id` cross-ref a `data/core/affordances.yaml`
   - Pass a `sot-planner` per ADR "Ennea full integration"

3. **Full — runtime hook framework + UI badge (P2, ~12h)**
   - Generic event hook system (Skiv synergy + biome resonance + ennea = same emit pattern)
   - UI HUD badge (ennea_archetype + active_hook visible)
   - Telemetry emit `hook_fired_count_by_archetype` per balance
   - Pass a `economy-design-illuminator` per reward weighting

## Sources / provenance trail

- Found at: [incoming/enneagramma_mechanics_registry.template.json:1](../../../incoming/enneagramma_mechanics_registry.template.json)
- Git history: `6027b180` (2025-10-29, intro), `dbf46e44` (2026-04-16, Prettier-only)
- Bus factor: 1 (MasterDD-L34D)
- Related orphan: [apps/backend/services/enneaEffects.js](../../../apps/backend/services/enneaEffects.js) (M-2026-04-25-006 — never imported)
- Related canonical incomplete: [apps/backend/services/vcScoring.js:774](../../../apps/backend/services/vcScoring.js) `computeEnneaArchetypes` (6/9 archetipi)
- Related dataset full: [incoming/Ennagramma/enneagramma_dataset.json](../../../incoming/Ennagramma/enneagramma_dataset.json) (M-2026-04-25-003)
- Inventory: [docs/museum/excavations/2026-04-25-enneagramma-inventory.md](../excavations/2026-04-25-enneagramma-inventory.md)

## Risks / open questions

- ❓ **Schema drift `compat_ennea` mating vs `ennea_themes` telemetry**: 3 vs 6 vs 9 archetipi. Quale canonical? Decision needed prima di full wire
- ⚠️ Registry è `template.json` (file sentinel). Convert necessario prima di production load
- ⚠️ Pack module `packs/evo_tactics_pack/tools/py/modules/personality/enneagram/` ha già processato registry indipendentemente. Potential dual source of truth
- ✅ JSON validato (jq parse) — no syntax error

## Next actions

- **Sprint C kickoff**: load registry in `enneaEffects.js` + wire `onRoundEnd` (Minimal path 3h)
- **Cross-card link**: M-2026-04-25-003 (dataset 9 tipi) + M-2026-04-25-006 (orphan) sono trio integrato
- **Open decision**: OD-009 "Ennea source canonical" ✅ RISOLTA proposed (Option 3 hybrid: pack encyclopedia + data/core/ runtime + sync script)
