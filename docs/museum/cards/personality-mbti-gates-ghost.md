---
title: MBTI Gates Ghost — 2 deleted file recoverable via git show
museum_id: M-2026-04-25-010
type: dataset
domain: personality
provenance:
  found_at: GHOST — git history only (data/evo-tactics/param-synergy/form/mbti_gates.yaml + _dedup variant)
  git_sha_first: 5c704524
  git_sha_last: 7572efec
  last_modified: 2025-10-25
  last_author: MasterDD-L34D
  buried_reason: deleted
relevance_score: 4
reuse_path: data/core/forms/mbti_forms.yaml (extend per-form `requires:` block)
related_pillars: [P4]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# MBTI Gates Ghost — recoverable via git history

## Summary (30s)

- **2 file deleted** in PR #1406 (triage 286 file 7572efec): `data/evo-tactics/param-synergy/form/mbti_gates.yaml` + `data/evo-tactics/param-synergy/archive_from_user/_dedup/data/mbti_gates.yaml`
- **Recoverable via** `git show 5c704524:data/evo-tactics/param-synergy/form/mbti_gates.yaml`
- **Pattern "gate forma MBTI by axis threshold"** = esattamente Proposal C in Triangle Strategy research (M-2026-04-25-009) + M12 Phase A `formEvolution.js` confidence-gating

## What was buried

### Recovery command

```bash
git show 5c704524:data/evo-tactics/param-synergy/form/mbti_gates.yaml
```

Schema atteso (da inferire fino a recovery):

```yaml
gates:
  - form_id: INTJ_visionary
    requires:
      mbti:
        N: { min: 0.6 }
        T: { min: 0.5 }
  - form_id: ESFP_performer
    requires:
      mbti:
        E: { min: 0.7 }
        S: { min: 0.5 }
        F: { min: 0.4 }
```

Pattern: per ogni `form_id` (16 forme MBTI canonical), gate threshold per ogni asse.

### Tranche import context (commit `5c704524`)

```
2025-10-25 15:25:58 +0200 — evo-tactics(import): tranche MBTI/Ennea/Economy/SpawnPack + Story core
```

Bulk import: dataset enneagram + mbti_gates.yaml + tranche doc + economy + spawn pack. Mai integrato canonical, deleted in triage.

### Trigger triage delete (commit `7572efec` PR #1406)

286 file deleted come parte di repo cleanup. mbti_gates.yaml fu collateral damage del bulk delete.

## Why it was buried

- **Tranche import never followed-up**: pattern `5c704524` "Add files via upload" segue di altri commit silent — bulk import senza integration plan
- **Triage 286 file PR #1406**: cleanup periodico su `data/evo-tactics/` aggressive (tutto file inutilizzato → delete). mbti_gates.yaml era unused da `formEvolution.js` o altro engine → deleted
- **Pattern preservato MA file no**: il concept "MBTI gating" è VIVO in `formEvolution.js` Phase A (confidence-gating) ma usa schema diverso (`vcSnapshot` distance-to-form invece di per-axis threshold). Ghost file aveva approccio più esplicito + reusabile

## Why it might still matter

- **Triangle Proposal C (M-009)**: recruit gating by MBTI thresholds usa esattamente questo pattern. Recovery del ghost file = base immediata
- **M12 Phase A confidence-gating**: ha approccio simile ma più astratto. Ghost schema più esplicito (per-axis min/max) → leggibile da designer non-engineer
- **`mbti_forms.yaml` extension target**: 16 forme canonical attualmente NON hanno `requires:` block. Aggiungerlo = feature parity con Caves of Qud morphotype gating (pattern P0 in creature-aspect-illuminator agent)
- **Pillar P4 🟡 → 🟡+ candidato**: gating + Triangle Proposals = chiusura coerent surface

## Concrete reuse paths

1. **Minimal — recover + verify schema (P0, ~30min)**

   Pre-card + decision:

   ```bash
   git show 5c704524:data/evo-tactics/param-synergy/form/mbti_gates.yaml \
     > /tmp/mbti_gates.yaml
   cat /tmp/mbti_gates.yaml | head -100
   git show 5c704524:data/evo-tactics/param-synergy/archive_from_user/_dedup/data/mbti_gates.yaml \
     > /tmp/mbti_gates_dedup.yaml
   diff /tmp/mbti_gates.yaml /tmp/mbti_gates_dedup.yaml
   ```

   Output: schema reale, gate count, dedup overlap %. Se schema mismatch con `mbti_forms.yaml` → stop + decision sopra. Se compatibile → proceed Moderate.

2. **Moderate — extend `mbti_forms.yaml` con requires block (P1, ~2-3h)**

   Migrate ghost schema → canonical:
   - `data/core/forms/mbti_forms.yaml` extend per-form `requires:` block (16 forme)
   - `apps/backend/services/forms/formEvolution.js` validate `requires` pre-evolve (additive, default permissive se assente)
   - Test: `node --test tests/api/formEvolution.test.js` (regression + new gate test)
   - Output: 16 form gated by MBTI thresholds, P4 surface más espresso

3. **Full — UI surface (P2, ~6-8h)**

   Diegetic gating UI (link Triangle Proposal B color codes):
   - `apps/play/src/formsPanel.js` show eligibility per form via `requires` check
   - Color-coded indicator (green=gate met, yellow=close, red=blocked) — diegetic narrative cue
   - Telemetry `form_eligibility_check_count` per balance
   - Cross-card link: Triangle Proposal B (M-009) per color palette

## Sources / provenance trail

- Found at: GHOST — `git show 5c704524:<path>` only. NO live file.
- Git history:
  - `5c704524` (2025-10-25 15:25:58 +0200, MasterDD-L34D, "evo-tactics(import): tranche MBTI/Ennea/Economy/SpawnPack + Story core") — intro
  - `7572efec` (PR #1406 triage 286 file) — deletion
- Bus factor: 1 (MasterDD-L34D)
- Related canonical (target): [data/core/forms/mbti_forms.yaml](../../../data/core/forms/mbti_forms.yaml) (16 forme canonical, `requires:` block missing)
- Related canonical (engine): [apps/backend/services/forms/formEvolution.js](../../../apps/backend/services/forms/formEvolution.js)
- Related cross-card: [M-2026-04-25-009 Triangle Strategy](personality-triangle-strategy-transfer.md) Proposal C
- Related cross-card: M12 Phase A confidence-gating (PR #1689)
- Inventory: [docs/museum/excavations/2026-04-25-personality-inventory.md](../excavations/2026-04-25-personality-inventory.md)

## Risks / open questions

- ❓ **Schema unverified**: ghost file schema può essere incompatibile con `mbti_forms.yaml`. Pre-curation `git show` content check OBBLIGATORIO prima di Moderate path
- ⚠️ Ghost = git only, no `ls`-able. Ogni reuse_path richiede `git show` come step 1
- ⚠️ Tranche import format era pre-canonicalizzazione naming styleguide. Possibili `form_id` inconsistencies con bilingual canonical (45 specie + 40 biomi PR #1447-1471)
- ⚠️ `_dedup` variant potrebbe essere identica O variante (es. typo fix). Diff check before merge
- ✅ Recovery pattern documentato (git show)

## Next actions

- **Pre-card recovery (P0, 5min)**: `git show 5c704524:data/evo-tactics/param-synergy/form/mbti_gates.yaml > /tmp/mbti_gates.yaml` per verificare schema reale
- **Cross-link Triangle**: questa card + M-009 = base concreta per Proposal C wire
- **Cross-link M12**: confidence-gating evolve verso per-axis threshold più esplicito
