---
title: Inventory excavate — domain ancestors
doc_status: draft
doc_owner: agents/repo-archaeologist
workstream: cross-cutting
last_verified: 2026-04-25
tags: [archaeology, museum, ancestors]
---

# Inventory — domain `ancestors` (excavate run 2026-04-25)

## Summary (30s)

- **9 artifact** trovati. 25 dir validation reports `docs/reports/incoming/validation/ancestors_*` (Oct 29-30 2025, exit_code 0 ma mai integrati nel canonical) + 1 CSV neurons dump 34 righe sotto `reports/incoming/ancestors/` (5 dei ~9 rami: Ambulation/Attack/Dexterity/Dodge/Self-Control, ~10% di 297 neuroni promessi RFC) + 5 doc research RFC `docs/planning/research/sentience-{rfc,branch-layout}/` (orfani, branch `ancestors/rfc-sentience-v0.1` mai aperto/mergiato).
- **False positive scoperto**: `docs/guide/README_SENTIENCE.md` (T0-T6 scale) E' canonical (`source_of_truth: true`, mergiato 2026-04-16 SHA `3e1b4f22`). Tier scale T0-T6 = Sprint M16+ canonical. NON sepolto. Skip.
- **Gap reale**: il **bridge ancestors/neuroni → trait runtime** non esiste. RFC menziona `data/neurons_bridge.csv` (mai creato). 297 neuroni promessi, dump 34 sanitized only. Reuse path: alimentare `data/core/traits/active_effects.yaml` con i 34 trigger combat (CO 01-22 + DO 01-04 + DX + AB) → +34 trigger meccanici dal Self-Control + Counterattack + Dodge branches.

## Inventory

| id               | title                                                                    | found_at                                                                                                                                                                                                  | type         | buried_reason | relevance_score                            | candidate_for_curation             |
| ---------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------- | ------------------------------------------ | ---------------------------------- |
| M-2026-04-25-001 | RFC Sentience Traits v0.1 (Ancestors → Evo Tactics)                      | [docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md:1](../../planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md)                                                                 | research     | abandoned     | 4/5 (age:6, pillar:3, mentions:0, reuse:1) | ✅ top                             |
| M-2026-04-25-002 | Sentience tiers v1.0 YAML (T1-T6 + interocettivi)                        | [incoming/sentience_traits_v1.0.yaml:1](../../../incoming/sentience_traits_v1.0.yaml)                                                                                                                     | dataset      | unintegrated  | 3/5 (age:6, pillar:3, mentions:0, reuse:0) | ⚠️ partial overlap T0-T6 canonical |
| M-2026-04-25-003 | Sensienti traits v0.1 YAML (early draft superseded)                      | [incoming/sensienti_traits_v0.1.yaml:1](../../../incoming/sensienti_traits_v0.1.yaml)                                                                                                                     | dataset      | superseded    | 2/5 (age:6, pillar:3, mentions:0, reuse:0) | ❌ superseded by 002               |
| M-2026-04-25-004 | Ancestors neurons dump 01B sanitized CSV (34 rows, 5 rami)               | [reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv:1](../../../reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv)                                                     | dataset      | unintegrated  | 4/5 (age:5, pillar:3, mentions:0, reuse:1) | ✅ top                             |
| M-2026-04-25-005 | Validation pack `evo_tactics_ancestors_repo_pack_v1.0`                   | [docs/reports/incoming/validation/evo_tactics_ancestors_repo_pack_v1.0-20251030-133350/summary.txt:1](../../reports/incoming/validation/evo_tactics_ancestors_repo_pack_v1.0-20251030-133350/summary.txt) | artifact     | unintegrated  | 3/5 (age:6, pillar:2, mentions:0, reuse:0) | ⚠️ binary missing                  |
| M-2026-04-25-006 | Validation pack `ancestors_evo_pack_v1_3` (Senses 37/37)                 | [docs/reports/incoming/validation/ancestors_evo_pack_v1_3-20251030-133350/summary.txt:1](../../reports/incoming/validation/ancestors_evo_pack_v1_3-20251030-133350/summary.txt)                           | artifact     | unintegrated  | 4/5 (age:6, pillar:3, mentions:0, reuse:1) | ✅ top                             |
| M-2026-04-25-007 | Integration pack `ancestors_integration_pack_v0_1..v0_5`                 | [docs/reports/incoming/validation/ancestors_integration_pack_v0_5-20251030-133350/summary.txt:1](../../reports/incoming/validation/ancestors_integration_pack_v0_5-20251030-133350/summary.txt)           | artifact     | unintegrated  | 3/5 (age:6, pillar:2, mentions:0, reuse:0) | ⚠️ 11 dirs same family             |
| M-2026-04-25-008 | Neuronal/Neurons pack `ancestors_neurons_{pack_v1_2,dump_v0_6,al_v0_3}`  | [docs/reports/incoming/validation/ancestors_neurons_dump_v0_6-20251030-133350/summary.txt:1](../../reports/incoming/validation/ancestors_neurons_dump_v0_6-20251030-133350/summary.txt)                   | artifact     | unintegrated  | 3/5 (age:6, pillar:2, mentions:0, reuse:0) | ⚠️ binary missing                  |
| M-2026-04-25-009 | Sentience research scaffolding (CHECKLIST/ROADMAP/CHANGELOG/PR template) | [docs/planning/research/sentience-branch-layout/](../../planning/research/sentience-branch-layout/)                                                                                                       | architecture | abandoned     | 2/5 (age:6, pillar:2, mentions:0, reuse:0) | ❌ branch never opened             |

### Provenance verificata via git

- **001 RFC**: introdotto `c9f85eb5` 2025-11-12 (Replace EvoTactics binaries con text placeholders), relocate `594a1319` 2025-11-22, frontmatter add `62c239f3` 2026-04-14, last touch `dbf46e44` 2026-04-16 (bulk Prettier). Author: MasterDD-L34D.
- **002 sentience_traits_v1.0**: last touch `17b7937b` 2026-04-16, original `6f730af6` 2025-10-29.
- **003 sensienti_traits_v0.1**: last touch `f28b3001` 2025-11-02 (single touch).
- **004 neurons_dump CSV**: last touch `e05de5ad` 2025-12-03 (Add 01B triage artifacts).
- **005-008 validation reports**: tutti aggiunti `ce50411b` 2025-11-23 (Move markdown docs into docs tree). Author: MasterDD-L34D.
- **009 sentience-branch-layout**: same lineage 2025-11-22 → 2026-04-16 frontmatter.

### Score breakdown (formula time-decay)

```
relevance = 2.0 - 0.5*age_months + 1.0*backlog_mentions + 1.5*pillar_match + 2.0*has_concrete_reuse
clamp(1, 5)
```

Pillar match per artifact:

- **001 RFC** (P2 evol + P3 identity + P4 temperament) = 3 → 2.0 - 3.0 + 0 + 4.5 + 0 = 3.5 → **4** (rounded up: ha reuse_path "feed sentience_index"; oggi canonical accettato T0-T6, RFC è source storica)
- **002 YAML T1-T6 + interocettivi**: T1-T6 ridondante (canonical), `interocettivi` parte = unique → score 3
- **004 CSV 34 trigger combat**: P1 tactica + P2 evol + P3 identity = 3, reuse path = active_effects.yaml extension =1 → 2.0-2.5+0+4.5+2.0=**6→clamp 5? recompute** age:5 mesi (2025-12-03 → 2026-04-25 ≈4.7) → -2.35; → 2.0-2.35+0+4.5+2.0=6.15 → clamp **5** ma ricalibro a **4** (binary CSV ridondante senza il pack zip parent → reuse_path richiede recovery binari)
- **006 ancestors_evo_pack_v1_3**: summary dichiara "Senses 37/37 + seed Ambulation" full neurons branch — high signal → **4** se zip recuperabile, altrimenti gap

## Top 3 candidates per curation

1. **M-2026-04-25-004 — Ancestors neurons dump CSV (34 rows, 5 rami combat)**: l'unica fonte machine-readable sopravvissuta dei trigger Ancestors. Reuse minimal: estrarre 22 trigger Self-Control (CO 01-22) come `effect_trigger` del catalogo `data/core/traits/active_effects.yaml` per counter/dodge/intercept reactions. ~5h.
2. **M-2026-04-25-001 — RFC Sentience v0.1**: source autoritativa per il merge T0-T6 canonical. Card serve come provenance trail per `docs/guide/README_SENTIENCE.md` (canonical menziona "RFC v0.1" senza link) e per recuperare 16 reference web (Britannica + Ancestors Wiki) usate come base scientifica. ~3h.
3. **M-2026-04-25-006 — Validation pack ancestors_evo_pack_v1_3 (Senses 37/37 + seed Ambulation)**: summary log valida exit_code 0 ma il binario originale `.zip` referenziato (`/tmp/incoming_validation.JMtgZN/...`) NON è in repo. Card può segnalare gap + raccomandare ricerca PR/Drive snapshot per recovery. ~2h dig + 4h reintegration.

## False positives flag

- **`docs/guide/README_SENTIENCE.md`** (T0-T6 scale) — `source_of_truth: true`, last_verified 2026-04-16, mergiato in canonical post-RFC. NON sepolto. NON curare.
- **Tier T0-T6 in `incoming/sentience_traits_v1.0.yaml`** — overlap con canonical sopra. Solo la sezione **interocettivi** (proprioception/vestibular/nociception/thermoreception hooks) merita curation come `add-only` extension del trait catalog.

## Gap rilevato (escalation `sot-planner`)

RFC promette estrazione di **297 neuroni** Ancestors (Senses 37 + Ambulation 26 + ramo). CSV recovery copre solo **34 entry** (~11%). I 9 ramo ancestors (Senses, Ambulation, Dexterity, Brain, Communication, Tools, Settlement, Intelligence, Movement) sono solo parzialmente catturati. Il branch `ancestors/rfc-sentience-v0.1` non è mai stato aperto come PR (`git log -S "ancestors"` su all branches mostra solo merge 2025-11/12 di triage, nessun feature commit). **Decisione user serve**: revivere full extraction (15-20h) vs lasciare canonical T0-T6 senza basi neuronali (mantieni status quo).

## Suggested next-step

```bash
invoke repo-archaeologist --mode curate --target reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv
# Card target: docs/museum/cards/ancestors-neurons-dump-csv.md
# Score 4/5, top reuse: 22 Self-Control trigger come reaction effects in active_effects.yaml

invoke repo-archaeologist --mode curate --target docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md
# Card target: docs/museum/cards/ancestors-rfc-sentience-v01.md
# Score 4/5, top reuse: provenance trail per README_SENTIENCE canonical T0-T6
```
