---
title: Excavate inventory — cognitive_traits (sentience + cognitive merge)
doc_status: draft
doc_owner: agents/repo-archaeologist
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [archaeology, museum, cognitive_traits, sentience]
---

# Excavate inventory — cognitive_traits

**Mode**: `--mode excavate --domain cognitive_traits`
**Date**: 2026-04-25
**Agent**: repo-archaeologist (INTJ-A excavate)
**Scope**: sentience tiers T1-T6 + cognitive trait drafts. Trigger user 2026-04-25 (Skiv Sprint C voices+diary unblock).

---

## Summary (30s)

- **2 artifact buried** in `incoming/`. Solo `sentience_traits_v1.0.yaml` ha tier descriptors machine-readable + interoception_traits (4 hooks) zero runtime. `sensienti_traits_v0.1.yaml` = draft v0.1 superseded da v1.0, mapping neuroni esterni con codici da validare.
- **Schema canonical T0-T6 LIVE** in `schemas/core/enums.json` + `schemas/evo/enums.json` (PR del commit `3e1b4f22` 2026-04-16). Ma `data/core/species.yaml` ha **0 species** che usano `sentience_index` → enum esiste, applicazione runtime zero.
- **Skiv link FORTE**: descriptors T3 ("grooming rituale", "attenzione condivisa") + T4 ("divisione del lavoro", "proto-legge") direttamente plug-in per Skiv diary entries Sprint C.

---

## Inventory

| id               | title                                                          | found_at                                                                                       | type    | buried_reason | relevance_score                                           | candidate_for_curation                        |
| ---------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------- | ------------- | --------------------------------------------------------- | --------------------------------------------- |
| M-2026-04-25-001 | Sentience Traits v1.0 — tier scale T1-T6 + interoception hooks | [`incoming/sentience_traits_v1.0.yaml`](../../../incoming/sentience_traits_v1.0.yaml) (99 LOC) | dataset | unintegrated  | **5/5** (age: 6 mesi, pillar: P2+P4, mentions:1, reuse:1) | **YES — top priority Skiv Sprint C**          |
| M-2026-04-25-002 | Sensienti Traits v0.1 — Ancestors neuron mapping draft         | [`incoming/sensienti_traits_v0.1.yaml`](../../../incoming/sensienti_traits_v0.1.yaml) (87 LOC) | dataset | superseded    | 2/5 (age: 6 mesi, pillar: P2+P4, mentions:0, reuse:0)     | partial — usable solo come historical context |

### Provenance trail (real git data)

**M-2026-04-25-001** (`sentience_traits_v1.0.yaml`):

- `git_sha_first`: `f28b3001` (2025-11-02 14:33, MasterDD-L34D, "feat: align sentience rollout references")
- `git_sha_last`: `f28b3001` (un solo commit — file mai più toccato)
- Contesto: sceso con rollout plan + SDK doc nello stesso PR. Doc canonical (README_SENTIENCE.md, sentience_sdk.md, sentience_rollout_plan.md) sono shipped, solo questo YAML è rimasto in `incoming/`.

**M-2026-04-25-002** (`sensienti_traits_v0.1.yaml`):

- `git_sha_first`: `6f730af6` (2025-10-29 15:19, MasterDD-L34D, "Add files via upload")
- `git_sha_last`: `17b7937b` (2026-04-16 18:51, "fix(format): resolve Prettier failures + exclude frozen archives")
- Contesto: draft v0.1 in italiano + mapping neuroni Ancestors (codici "WA 02", "DE 01", ecc.) **da validare**. Sostituito da v1.0 che pulisce schema + adotta sintesi tiers.

---

## Top 3 candidates for curation

### #1 — `M-2026-04-25-001 sentience_traits_v1.0.yaml` (score 5/5)

**Reuse path Minimal (~3h)**: Skiv diary plug-in. Estrarre `tiers[*].descriptors` → tabella reusabile per `narrative-design-illuminator` (Sprint C voices+diary). Skiv attualmente è `sentience_index ~ T2-T3` (proto-sociale → emergente). Descriptor "grooming rituale", "attenzione condivisa" diretto template per diary entries.

**Reuse path Moderate (~8h)**: backfill `sentience_index` per le ~45 species canonical in `data/core/species.yaml` + species_expansion.yaml usando milestone gating (T1 = "Senses core" ecc.). Ferma il drift schema-vs-runtime: enum LIVE ma uso ZERO.

**Reuse path Full (~15h)**: implementare `interoception_traits` (proprioception/vestibular/nociception/thermoception) come 4 active_effects in `data/core/traits/active_effects.yaml`. Hook concreti già scritti nel YAML (es. proprioception "+1 step equilibrio/posizione, -1 stack fatica sprint" → mapping diretto a stat_buff/debuff esistenti). Pillar match P2 (Evoluzione) + P4 (MBTI/personality).

### #2 — `M-2026-04-25-002 sensienti_traits_v0.1.yaml` (score 2/5)

**Reuse path Minimal (~1h)**: estrarre comments "verificare codice" come TKT in BACKLOG.md per validare codici neuroni Ancestors (WA 02, DE 01, ecc.). Storia + driver per RFC.

**NON revivere intero**: superseded. Lascia in incoming come historical reference, evita duplicare card v1.0.

### #3 — bonus link: cross-doc audit

**Non un artifact ma gap evidente**: `docs/process/sentience_rollout_plan.md` è `doc_status: draft` da 2026-04-14 con TODO esplicito ("rinfrescare cataloghi" + "applicare migration script"). Suggested next-step: handoff a `sot-planner` per ADR + integration plan post-Skiv-Sprint-C.

---

## False positives (NOT buried, già canonical)

- ✅ `docs/guide/README_SENTIENCE.md` — `doc_status: active`, `source_of_truth: true`. Tassonomia T0-T6 canonical. **Skip**.
- ✅ `schemas/core/enums.json` + `schemas/evo/enums.json` — enum T0-T6 live. **Skip**.
- ✅ `docs/public/sentience_sdk.md` — SDK reference shipped (draft ma referenced). **Skip**.
- ✅ `docs/process/sentience_rollout_plan.md` — ops plan, draft ma in canonical workspace. **Skip from museum**, ma flag per follow-up sot-planner.
- ✅ `docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md` — RFC archived, già citato da README. Reference utile.
- ✅ `data/core/species/dune_stalker_lifecycle.yaml` (Skiv canonical) — species già live, niente excavate.

**NOTA cognitive_traits**: zero artifact con stringa "cognitive" / "tratti_cogniti" trovato in `incoming/` o `docs/archive/`. Il dominio è effettivamente **solo sentience** post-merge naming. Cognitive ≡ sentience descriptor layer.

---

## Suggested next-step

**Esegui curate immediato top-1**:

```
invoke repo-archaeologist --mode curate --id M-2026-04-25-001 --target incoming/sentience_traits_v1.0.yaml
```

Output atteso:

- `docs/museum/cards/cognitive_traits-sentience-tiers-v1.md` (Dublin Core card score 5/5)
- `docs/museum/MUSEUM.md` index aggiornato (sezione Cognitive traits + Top relevance)
- 3 reuse path concreti (Minimal Skiv-diary 3h / Moderate species backfill 8h / Full interoception traits 15h)

**Poi handoff**:

- `narrative-design-illuminator` per Skiv Sprint C diary descriptor reuse (Minimal path)
- `sot-planner` per ADR `interoception_traits → active_effects.yaml` (Full path)
- `creature-aspect-illuminator` per backfill `sentience_index` species canonical (Moderate path)

---

## Risks / open questions

- ❓ User decision: vuoi backfillare `sentience_index` su tutte le 45 species esistenti, o aggiungere solo per nuove species da Sprint C in poi? (**OPEN_DECISIONS** candidate, non auto-decidere)
- ⚠️ `sensienti_traits_v0.1.yaml` ha mapping codici neuroni Ancestors esterni con TODO "verificare" inline. Validare codici prima di qualunque revive parziale.
- ⚠️ Schema-runtime drift: enum T0-T6 esiste in 2 schemi (`core/` + `evo/`) ma 0 species lo usano. Drift silenzioso da 6 mesi. Flag per `coop-phase-validator` o nuovo `schema-ripple` agent.
