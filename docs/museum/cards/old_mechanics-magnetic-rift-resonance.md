---
title: Magnetic Rift Resonance — swarm trait T2 con biome telepatic_link
museum_id: M-2026-04-25-005
type: artifact
domain: old_mechanics
provenance:
  found_at: incoming/swarm-candidates/traits/magnetic_rift_resonance.yaml
  git_sha_first: aa82d67f
  git_sha_last: aa82d67f
  last_modified: 2026-04-24
  last_author: MasterDD-L34D
  buried_reason: deferred
relevance_score: 4
reuse_path: apps/backend/services/combat/biomeResonance.js (tier T2 extension)
related_pillars: [P3, P6]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# Magnetic Rift Resonance — swarm trait T2

## Summary (30s)

- **Trait T2 swarm-staging**: PR #1720 first integration staging — MAI promosso a `data/core/`. Schema completo: tier + trigger biome + effect telepatic_link 5 turni + narrative hook
- **Skiv Sprint A direct fit**: plug-in in `biomeResonance.js` (PR #1785 shipped) come tier-extension — ~2h reuse
- **Bonus Sprint B**: pattern trait swarm = template per altre swarm-trait + sinergia con biome resonance

## What was buried

YAML structured per swarm-trait spec:

```yaml
id: magnetic_rift_resonance
tier: T2
biome_affinity: atollo_ossidiana
trigger:
  on: ability_used
  ability_filter: telepatic
  biome_check: required
effect:
  type: status_apply
  status: telepatic_link
  duration: 5
  scope: ally_in_range
requires_traits:
  - magnetic_sensitivity
  - rift_attunement
narrative_hook: 'La risonanza magnetica del rift ossidiano apre un canale...'
testability:
  cases:
    - name: 'attivazione su atollo_ossidiana'
      expected: status_apply telepatic_link
    - name: 'attivazione su biome diverso'
      expected: no_effect
```

Schema completo per integration: tier + biome trigger + effect status + requires + narrative + test cases.

## Why it was buried

- PR #1720 era `feat(swarm): first integration staging` — staging = work-in-progress NON promoted to canonical
- Stagemerge in `aa82d67f` 2026-04-24 (recente) ma never followup → deferred (NON abandonato, ma in pausa)
- BACKLOG.md / OPEN_DECISIONS.md = 0 menzioni swarm trait integration
- Skiv Sprint B (synergy + defy ~11h) ancora pending, swarm system blocked by waiting for Skiv-first

## Why it might still matter

- **Pillar P3 Specie×Job 🟢c+**: swarm trait categoria mancante in glossary attivo. T2 = mid-tier, plug-in low-risk
- **Pillar P6 Fairness 🟢c**: biome-affinity trait è leverage per balance asimmetrico (player con `magnetic_sensitivity` su atollo_ossidiana = +tactical option)
- **Skiv Sprint A**: il sistema `biomeResonance.js` (PR #1785) supporta tier ladder. Aggiungere T2 = primo tier-extension reale, valida architecture
- **Biome `atollo_ossidiana` placeholder**: NON esiste in `data/core/biomes.yaml`. Card serve come trigger per content bootstrap nuovo biome

## Concrete reuse paths

1. **Minimal — biome stub + trait reference (P0, ~2h)**
   - Aggiungi biome `atollo_ossidiana` placeholder in `data/core/biomes.yaml` con `magnetic_field_strength: 1.0` flag
   - Aggiungi trait `magnetic_rift_resonance` in `data/core/traits/active_effects.yaml`
   - Map T2 → `biomeResonance.js` tier_2 ladder
   - Test: `pytest tests/test_biome_synthesizer.py`

2. **Moderate — full swarm trait set (P1, ~6h)**
   - Stub 2 trait base mancanti: `magnetic_sensitivity` + `rift_attunement` (in glossary)
   - Implement `requires_traits` validation in trait apply
   - Wire `narrative_hook` in `narrativeEngine.js` — hook on status_apply
   - Pass a `creature-aspect-illuminator` per swarm visual signature

3. **Full — generic biome-affinity trait framework (P2, ~14h)**
   - Pattern trait swarm-T2 generalizzato (15-20 candidate swarm trait su schema simile)
   - `data/core/swarms/swarm_catalog.yaml` (nuovo)
   - UI HUD biome-affinity hint (XCOM-style telegraph)
   - Pass a `pcg-level-design-illuminator` per encounter design biome-aware

## Sources / provenance trail

- Found at: [incoming/swarm-candidates/traits/magnetic_rift_resonance.yaml:1](../../../incoming/swarm-candidates/traits/magnetic_rift_resonance.yaml)
- Git history: `aa82d67f` (2026-04-24, MasterDD-L34D, PR #1720 staging) — single recent commit
- Bus factor: 1
- Related canonical (target): [apps/backend/services/combat/biomeResonance.js](../../../apps/backend/services/combat/biomeResonance.js) (PR #1785 shipped)
- Related canonical: [data/core/traits/active_effects.yaml](../../../data/core/traits/active_effects.yaml) (extension target)
- Related canonical: [data/core/biomes.yaml](../../../data/core/biomes.yaml) (atollo_ossidiana mancante)
- Related staging: [incoming/swarm-candidates/README.md](../../../incoming/swarm-candidates/README.md)
- Inventory: [docs/museum/excavations/2026-04-25-old_mechanics-inventory.md](../excavations/2026-04-25-old_mechanics-inventory.md)

## Risks / open questions

- ❓ Biome `atollo_ossidiana` non documentato in `docs/biomes/`. User decision: creare placeholder o ridenominare a biome esistente (es. `costa_specchio_lunare` se affine)?
- ⚠️ `requires_traits` sono 2 trait mai catalogati (`magnetic_sensitivity` + `rift_attunement`). Decision: stub ora o scope-down trait self-contained
- ⚠️ Status `telepatic_link` non esiste in status registry. Add-only o map a status esistente (`linked` / `coordinated`)?
- ⚠️ PR #1720 staging branch potrebbe avere altri 5-10 swarm-trait candidates pending (verifica via `git log feat/swarm-staging`)
- ✅ YAML schema clean, validabile

## Next actions

- **Sprint A Skiv kickoff**: dopo biomeResonance.js extension, applica magnetic_rift come primo tier T2 reale
- **Cross-link M-2026-04-25-002 registry hooks**: status_apply event può emit via ennea_hook trigger
- **OPEN_DECISIONS**: OD-012 ✅ RISOLTA 2026-04-25 — verdict A (single-shot magnetic_rift Sprint A, batch deferred post-validation)
