---
title: Ancestors Neurons Dump 01B Sanitized — 34 trigger combat (5 rami)
museum_id: M-2026-04-25-004
type: dataset
domain: ancestors
provenance:
  found_at: reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv
  git_sha_first: e05de5ad
  git_sha_last: e05de5ad
  last_modified: 2025-12-03
  last_author: MasterDD-L34D
  buried_reason: unintegrated
relevance_score: 4
reuse_path: data/core/traits/active_effects.yaml (22 trait shipped PR #1813, 5 rami)
related_pillars: [P1, P2, P3]
status: integrated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# Ancestors Neurons Dump 01B Sanitized — 34 trigger combat (integrated 2026-04-25)

> **Reality check 2026-04-25**: card originale conteneva multipli drift (numbers + esempi codici inventati). Fix applicato in PR drift-fix dopo verifica `awk` reale su CSV. Plus PR #1813 ha shipped Path A (22 trait collapsed da 34 entry) + PR #1815 ha shipped Path B (recovery 297/297 neurons via wiki Fandom MediaWiki API).

## Summary (30s)

- **34 entry CSV 01B** sanitized, 5 rami coperti (Self-Control / Dodge / Attack / Ambulation / Dexterity), ~11% di 297 neuroni promessi RFC v0.1
- **Path A SHIPPED 2026-04-25 PR #1813 (`59dc7195`)**: 22 trait `ancestor_*` in `data/core/traits/active_effects.yaml` (BB-prefixed genetic variants collapsed: 8 SC + 6 Attack + 7 Dodge + 1 Released_Strength)
- **Path B SHIPPED 2026-04-25 PR #1815 (`73bbab3e`)**: recovery 297/297 neuroni via Fandom wiki MediaWiki API. File `reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv` + manifest. RFC v0.1 promise CHIUSA.

## What was buried (drift fixed)

CSV 01B 34 righe, columns reali (verificato `head -1` 2026-04-25): `code`, `branch`, `name`, `genetic`, `effect_short`, `unlock_trigger_hint`, `sources`, `notes`.

Distribuzione rami (verificato `awk -F',' '{print $2}' | sort | uniq -c` 2026-04-25):

| Ramo         | Count | Tipo neuron                                   |
| ------------ | ----- | --------------------------------------------- |
| Self-Control | 12    | Timing window / time dilation / determination |
| Dodge        | 10    | Reaction trigger (evasion, withdrawal)        |
| Attack       | 8     | Counterattack preparation speed               |
| Ambulation   | 3     | Movement modifier (sprint, climb, carry)      |
| Dexterity    | 1     | Aim/equilibrium                               |

Esempi reali Self-Control (FR codes, NON CO — CO è Attack branch):

```csv
FR 01,Self-Control,Tachypsychia,No,Larger timing window during attacks (more time allowed).,Engage in combat to trigger time-slow effects.,Combat; turn14search0,
FR 05,Self-Control,Perceptual Time Dilation,No,Faster reactions when responding to threats.,Repeated threat encounters; practice dodging/counterattacking.,Counterattack; turn14search1; Dodge; turn14search2,
BB FR 01,Self-Control,Determination,Yes,Less dopamine needed when responding to threats.,Combat encounters; repeat responses to threats.,Combat; turn12search0,
```

## Why it was buried

- RFC Sentience v0.1 (2025-11-12) prometteva 297 neuroni Ancestors estratti
- Solo 34 sono stati sanitized ed esportati — il resto (263) sono in binary `.zip` referenziati da validation reports MA assenti dal repo
- Branch `ancestors/rfc-sentience-v0.1` mai aperto come PR (`git log -S "ancestors"` --diff-filter=A su feature branches → 0 hit)
- Triage commit `e05de5ad` 2025-12-03 ha aggiunto questa CSV come "01B triage artifacts" → snapshot parziale, mai completato
- Bus factor 1 (solo MasterDD-L34D) + autore non più working su Ancestors

## Why it might still matter

- **Pillar P1 Tattica 🟢**: 22 trait `ancestor_*` in `active_effects.yaml` dopo PR #1813 sono extension naturale del sistema reaction (intercept + overwatch_shot). Depth tactical aumentato.
- **Pillar P2 Evoluzione 🟢c**: trait neuroni heritable (BB-prefixed genetic) = base genetica per Spore-core. Path B 297 entries riflette completezza dataset.
- **Pillar P3 Specie×Job 🟢c+**: rami Ancestors mappabili a job archetypes (Self-Control → Reformer/Tank, Dexterity → Skirmisher).
- **Sprint B Skiv synergy + defy ~11h**: `ancestor_dodge_*` (7) + `ancestor_attack_counter_*` (3) coverage diretta per `defy` counter pattern.

## Concrete reuse paths

1. **✅ DONE — Path A: 22 trait `ancestor_*` da CSV 01B (PR #1813 `59dc7195` 2026-04-25)**
   - 22 trait in `active_effects.yaml` con prefix `ancestor_<ramo>_<name>`. BB-prefixed genetic variants collapsed (Determination ×4 → 1 entry, Released_Strength ×2 → 1 entry).
   - Effect kind: `extra_damage amount: 1` per impatto runtime concreto.
   - Test: `node --test tests/ai/*.test.js` 311/311 verde + `validate-datasets` 14 controlli 0 avvisi.

2. **✅ DONE — Path B: recovery 297/297 neurons via wiki Fandom (PR #1815 `73bbab3e` 2026-04-25)**
   - Ricostruito CSV completo via MediaWiki API bypass Cloudflare (`action=query&prop=revisions&rvslots=main` + custom UA).
   - File: `reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv` (76KB, 297 entries) + manifest `ancestors_neurons_manifest_v07.json` SHA256.
   - Branches: Senses 37 + Ambulation 26 + Dexterity 33 + Attack 8 + Dodge 10 + Self-Control 12 + 7 bonus rami (Communication 20, Intelligence 14, Motricity 20, Omnivore 11, Settlement 10, Swim 5, Metabolism 4, Preventive 30, Therapeutic 24, Hominid lineages 33).
   - License: CC BY-NC-SA 3.0 con attribution preserved. RFC v0.1 promise CHIUSA.

3. **🟡 OPEN — Wire 263 nuove entries v07 in `active_effects.yaml` (~5-10h)**
   - Differenziale: 297 v07 - 34 v01B = 263 nuove entries da wirare
   - Pattern: stesso di PR #1813 (collapse genetic variants + ancestor*<ramo>*<name>).
   - Effort proietto: ~5-10h batch agent generation.

## Sources / provenance trail

- Found at: [reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv:1](../../../reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv)
- Git history: `e05de5ad` (2025-12-03, MasterDD-L34D, "Add 01B triage artifacts") — single commit
- Bus factor: 1
- Related RFC source: [docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md](../../planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md) (Card M-2026-04-25-005 candidate)
- Related canonical: [data/core/traits/active_effects.yaml](../../../data/core/traits/active_effects.yaml) (extension target)
- Related validation reports: 30+ `docs/reports/incoming/validation/evo_tactics_ancestors_*` + `ancestors_neurons_*` + `ancestors_integration_pack_*` (Oct/Nov 2025)
- Related canonical (false positive): [docs/guide/README_SENTIENCE.md](../../guide/README_SENTIENCE.md) (T0-T6 ≠ neurons)
- Inventory: [docs/museum/excavations/2026-04-25-ancestors-inventory.md](../excavations/2026-04-25-ancestors-inventory.md)

## Risks / open questions

- ✅ ~~**User decision GRANDE**: revivere full Ancestors~~ → CHIUSO PR #1815 Path B 297/297 wiki recovery
- ⚠️ Schema CSV column reale `effect_short` + `unlock_trigger_hint` (non `trigger_combat`/`effetto_proposto` come card originale claim). Path A mapping manuale completato in PR #1813.
- ✅ ~~Codici Self-Control collisione `affordances.yaml`~~ → naming `ancestor_<ramo>_<name>` evita collision (verificato PR #1813)
- ✅ ~~Binary `.zip` recovery~~ → bypass via wiki API (PR #1815)
- ✅ CSV utf-8 clean spot-check

## Next actions

- ~~Sprint A/B Skiv kickoff~~ → Sprint A SHIPPED (PR #1772/#1773/#1774/#1779 Skiv mega-session)
- ~~OD-011 Path A wire~~ → SHIPPED PR #1813
- ~~OD-011 Path B recovery~~ → SHIPPED PR #1815
- 🟡 **Open**: wire 263 v07 nuove entries in `active_effects.yaml` (~5-10h, pattern PR #1813)
- 🟡 **Open**: glossary.json entries per i 22 `ancestor_*` shipped (drift secondary, non-bloccante)
