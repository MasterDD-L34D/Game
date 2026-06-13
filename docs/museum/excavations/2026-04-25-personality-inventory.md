---
title: Excavate inventory — personality (MBTI extended + linkage)
doc_status: draft
doc_owner: agents/repo-archaeologist
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [archaeology, museum, personality, mbti]
---

# Excavate — personality (MBTI extended + cross-MBTI/Ennea linkage)

**Mode**: `excavate --domain personality` · **Run**: 2026-04-25 (session 2) · **Agent**: repo-archaeologist (INTJ-A excavate)

## Summary (3 bullet)

- **8 artifact distinti**, focus su **MBTI extended + linkage** (non duplica enneagramma inventory già scritta). Niente MBTI dataset 16-tipi sepolto: `data/core/forms/mbti_forms.yaml` (16 forme) + `data/core/thoughts/mbti_thoughts.yaml` (18 thoughts) + `apps/backend/services/personalityProjection.js` (`projectForm` wired in `routes/session.js:1919`) + `vcScoring.js` (`computeMbtiAxes`, `computeMbtiAxesIter2`, `computeEnneaArchetypes`) sono canonical attivi. **Sepolto = cross-link MBTI×Ennea + reuse layer Python/TS pack mai importati dal backend Node.**
- **2 ghost MBTI gates** (deleted in history, mai resuscitati): `data/evo-tactics/param-synergy/form/mbti_gates.yaml` + `_dedup/data/mbti_gates.yaml` introdotti da `5c704524 evo-tactics(import): tranche MBTI/Ennea/Economy/SpawnPack` → mai integrati nel `formEvolution.js` engine. Pattern "gate by axis threshold" è esattamente quello proposto da Triangle Strategy research (Proposal C, ~Effort M) ma il file fu cancellato.
- **Skiv link diretto**: `hydrate_profile.py` (4.8KB Python utility) + `personality_module.v1.json` (770 LOC, 9 tipi × triadi × wings × stress/growth) alimentano Skiv Sprint C "voices+diary" perché `basic_fear`, `basic_desire`, `passion`, `virtue` sono **prêt-à-l'emploi** come voci diary. `seed_skiv_saga.py` già consuma `mbti_thoughts.yaml` ma **mai** Ennea schema completo. Reuse path: porta `hydrate_profile.py` logic → Node `apps/backend/services/personalityProjection.js` come `hydrateEnneaProfile(mbtiAxes, enneaArchetypes)`.

---

## Inventory

| ID               | Title                                          | found_at                                                                                                                                                                                                                                  | last_touch | git_sha (last)                                               | author        | buried_reason   | score                                             | candidate_curation                             |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------ | ------------- | --------------- | ------------------------------------------------- | ---------------------------------------------- |
| M-2026-04-25-007 | Personality module enneagram (root, 770 LOC)   | [incoming/personality_module.v1.json](../../../incoming/personality_module.v1.json)                                                                                                                                                       | 2026-04-16 | `dbf46e44`                                                   | MasterDD-L34D | unintegrated    | 4/5 (age:0.3, pillar:1[P4], reuse:1, mentions:0)  | YES — P4 boost + Skiv Sprint C diary lines     |
| M-2026-04-25-008 | Personality module duplicato (cold archive)    | [incoming/archive_cold/devkit_scripts/2025-11-25/decompressed/evo_enneagram_addon_v1/personality_module.v1.json](../../../incoming/archive_cold/devkit_scripts/2025-11-25/decompressed/evo_enneagram_addon_v1/personality_module.v1.json) | 2026-04-16 | `5a06b64b` / `dbf46e44`                                      | MasterDD-L34D | renamed/forked  | 2/5 (age:0.3, pillar:1[P4], reuse:0, mentions:0)  | NO — duplicato di M-007                        |
| M-2026-04-25-009 | hydrate_profile.py (Python utility orfana)     | [packs/evo_tactics_pack/tools/py/modules/personality/enneagram/hydrate_profile.py](../../../packs/evo_tactics_pack/tools/py/modules/personality/enneagram/hydrate_profile.py)                                                             | 2025-10-29 | `6027b180`                                                   | MasterDD-L34D | unintegrated    | 4/5 (age:0.5, pillar:1[P4], reuse:1, mentions:0)  | YES — port to Node + wire diary                |
| M-2026-04-25-010 | hook_bindings.ts (TS telemetry-bus)            | [packs/evo_tactics_pack/tools/py/modules/personality/enneagram/hook_bindings.ts](../../../packs/evo_tactics_pack/tools/py/modules/personality/enneagram/hook_bindings.ts)                                                                 | 2025-10-29 | `6027b180`                                                   | MasterDD-L34D | unintegrated    | 3/5 (age:0.5, pillar:1[P4], reuse:0, mentions:0)  | MAYBE — synergy event bus                      |
| M-2026-04-25-011 | compat_map.json (stats aliases v0.3.0)         | [packs/evo_tactics_pack/tools/py/modules/personality/enneagram/compat_map.json](../../../packs/evo_tactics_pack/tools/py/modules/personality/enneagram/compat_map.json)                                                                   | 2026-01-29 | `b05dc44b`                                                   | MasterDD-L34D | partial-orphan  | 2/5 (age:0.4, pillar:0, reuse:0, mentions:0)      | NO — alias map only, basso yield               |
| M-2026-04-25-012 | mbti_gates.yaml (ghost, deleted)               | git history only — `data/evo-tactics/param-synergy/form/mbti_gates.yaml` + `data/evo-tactics/param-synergy/archive_from_user/_dedup/data/mbti_gates.yaml`                                                                                 | 2025-10-25 | `5c704524` (intro) → cancellati `7572efec` (triage 286 file) | MasterDD-L34D | deleted         | 4/5 (age:0.5, pillar:1[P4], reuse:1, mentions:0)  | YES — recipe gating engine + Triangle proposal |
| M-2026-04-25-013 | Tranche MBTI/Ennea/Economy/SpawnPack/Story doc | [docs/evo-tactics/tranches/2025-10-25-mbti-ennea-economy-spawnpack-story.md](../../../docs/evo-tactics/tranches/2025-10-25-mbti-ennea-economy-spawnpack-story.md)                                                                         | 2025-10-25 | `5c704524`                                                   | MasterDD-L34D | superseded      | 2/5 (age:0.5, pillar:0, reuse:0, mentions:0)      | NO — tranche import log, no actionable         |
| M-2026-04-25-014 | Triangle Strategy MBTI transfer plan           | [docs/research/triangle-strategy-transfer-plan.md](../../../docs/research/triangle-strategy-transfer-plan.md)                                                                                                                             | unknown    | (active research doc)                                        | MasterDD-L34D | not-prioritized | 5/5 (age:0, pillar:2[P4+P5], reuse:1, mentions:0) | YES — P4 🟡 → 🟢 evidence-based proposals      |

**Totale artifact distinti**: 8 (incoming root + cold archive + pack triple + 2 ghost gates + 1 tranche + 1 research doc).

---

## Probe ausiliarie

- `git log -S "MBTI" --all --oneline` → 5 commit canonical (#1707 P4 axes iter2, sprint-003 vcScoring intro, kill-60 flint, museum bootstrap). No deleted commits MBTI-specific.
- `git log -S "personality_module" --all --oneline` → 1 commit (`5a06b64b docs(tri_sorgente)`). Mai modificato semanticamente.
- `git log -S "temperament" --all --oneline` → 1 commit (museum bootstrap). **Zero MBTI temperaments-side computed code mai esistito** (Keirsey 4-temperament model assente).
- `git log --diff-filter=D` su pattern `*personality*|*mbti*|*temper*` → conferma 2 ghost gates `mbti_gates.yaml` cancellati nel triage `7572efec` (PR #1406, 286 file deleted). Recuperabili via `git show 5c704524:data/evo-tactics/param-synergy/form/mbti_gates.yaml`.
- `grep -ci "MBTI\|personality"` → BACKLOG.md=2, OPEN_DECISIONS.md=8, CLAUDE.md=6. **MBTI tracked nei 3 doc operativi** ma `triangle-strategy-transfer-plan.md` non citato in nessuno.
- Canonical wiring confirmed:
  - `apps/backend/services/personalityProjection.js` → wired `apps/backend/routes/session.js:1919` (`computePfSession`).
  - `apps/backend/services/forms/formEvolution.js:29` → require `projectForm`.
  - `apps/backend/services/vcScoring.js` → `computeMbtiAxes` + `computeMbtiAxesIter2` + `computeEnneaArchetypes` exported.
  - `tools/py/seed_skiv_saga.py:78 SKIV_MBTI_AXES` legge `mbti_thoughts.yaml` ma NON Ennea schema.
- Tranche commit `5c704524` (2025-10-25) importò: 1 dataset + 1 yaml `mbti_gates.yaml` + 1 ghost `_dedup` copy + tranche doc. Stesso giorno commit dataset enneagram cold archive (`6027b180` upload). Pattern: bulk import never followed-up.

---

## Top 3 candidati per curation immediata

### 🥇 #M-2026-04-25-014 — Triangle Strategy MBTI transfer plan (score 5/5)

**Reason**: research doc 12+ MBTI mentions con 3 Proposals concrete (A: phased reveal Disco Elysium pacing, B: dialogue color codes diegetic, C: recruit gating on MBTI thresholds). Esplicita closure path P4 🟡 → 🟢 senza nuova matematica (ROI: high). Cita esattamente `vcScoring.js` + `formSessionStore.js` + `mbti_forms.yaml` come hook point. **Doc esiste, mai linkato in BACKLOG/OPEN_DECISIONS**, mai citato in `docs/planning/2026-04-26-next-session-kickoff-p4-mbti-playtest.md` che è il kickoff P4. Sepolta perché research-only.

**Reuse path Minimal (~2-3h)**: aggiungi link a `BACKLOG.md` come ticket "P4-MBTI-001 phased reveal" + `OPEN_DECISIONS.md` Q? "MBTI surface vs accrual silenzioso" con default proposta A. Card museum cita `triangle-strategy-transfer-plan.md` §"Proposals" come reference primario.

**Risk**: research-driven; richiede playtest validazione (non automated). Chiusura P4 🟢 dipende da TKT-M11B-06 playtest live. Ma la **proposta concreta riduce ambiguità decisionale** subito.

### 🥈 #M-2026-04-25-007 — Personality module enneagram v1.0 (root, score 4/5)

**Reason**: già citato in old_mechanics inventory #2 (score 4/5). Confermato qui per completezza dominio personality. JSON 770 LOC schema 1.0.0-draft, 9 tipi × wings × center × passion × virtue × stress_to/growth_to. **Skiv Sprint C "voices+diary" gold mine**: `basic_fear` "Essere indesiderati, indegni di amore" (tipo 2) e `basic_desire` "Sentirsi amati" sono diary lines pronte. `passion`/`virtue` sono lessico narrativo diretto.

**Reuse path Minimal (~3h)**: copia `incoming/personality_module.v1.json` → `data/core/personality/enneagramma_module.yaml` (JSON→YAML conversion via `tools/py/json_to_yaml.py` se esiste, altrimenti manuale). Leggi in `vcScoring.js computeEnneaArchetypes` per coprire 1/4/6 mancanti. Boost diretto Skiv `dune_stalker_lifecycle.yaml` voice phase su Sprint C.

**Risk**: serve linkage MBTI×Ennea (es. INTJ-5w4 vs INTJ-1w9). `compat_map.json` (M-011) è inadeguato per quel mapping. Out-of-scope MVP ma boost P4.

### 🥉 #M-2026-04-25-012 — mbti_gates.yaml ghost (score 4/5)

**Reason**: 2 file deleted da PR #1406 (triage 286 file), ma il **concept "gate forma MBTI by axis threshold"** è esattamente Proposal C in Triangle research e M12 Phase A `formEvolution.js` confidence-gating model. Recupero da git: `git show 5c704524:data/evo-tactics/param-synergy/form/mbti_gates.yaml`. Pattern reuse: trasforma in `requires.mbti.{axis}.{min|max}` schema dentro `data/core/forms/mbti_forms.yaml` (già esistente, aggiungi requires section per cards INTJ_visionary, ESFP_performer, etc.).

**Reuse path Minimal (~2h)**: `git show 5c704524:data/evo-tactics/param-synergy/form/mbti_gates.yaml > /tmp/mbti_gates.yaml` → estrai gating rules → mapping in `forms/mbti_forms.yaml` come `requires:` block per ogni forma. `formSessionStore.js` valida pre-evolve.

**Risk**: file ghost = schema unverified; `git show` può rivelare format incompatibile con `mbti_forms.yaml`. Pre-curation: `git show` content check obbligatorio.

---

## False positives flagged (NON curare)

| Item                                                                             | Reason skip                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/services/personalityProjection.js`                                 | **CANONICAL ATTIVO** — wired in `routes/session.js:1919`, base di `formEvolution.js:29`. NON sepolto, NON curare.                                                                               |
| `apps/backend/services/vcScoring.js` (`computeMbti*`, `computeEnneaArchetypes`)  | **CANONICAL ATTIVO** — 2 funzioni MBTI + 1 Ennea esportate. Iter2 axes (`E_I + S_N + concrete_action + action_switch`) shipped PR #1707. NON sepolto, è l'engine di P4.                         |
| `data/core/forms/mbti_forms.yaml` + `mbti_thoughts.yaml` + `form_pack_bias.yaml` | **CANONICAL ATTIVO** — 16 forme + 18 thoughts + 16×3 pack bias machine-readable. Letti da `personalityProjection.js`/`formPackRecommender.js`/`thought_cabinet`. Spina dorsale P4. NON sepolto. |
| `tools/py/seed_skiv_saga.py` (`SKIV_MBTI_AXES`)                                  | **CANONICAL ATTIVO** — produttore Skiv canonical card. NON sepolto. **Ma NON consuma personality_module Ennea** → opportunity gap (vedi Top #2).                                                |
| `apps/backend/services/enneaEffects.js`                                          | **GIÀ CURATO** in enneagramma inventory #M-2026-04-25-E9 (score 4/5). Skip duplicate.                                                                                                           |
| `incoming/Ennagramma/*` (CSV + JSON dataset)                                     | **GIÀ CURATO** in enneagramma inventory #M-2026-04-25-E1..E6. Skip duplicate.                                                                                                                   |
| `incoming/enneagramma_mechanics_registry.template.json`                          | **GIÀ CURATO** in enneagramma inventory #M-2026-04-25-E7 (score 5/5). Skip duplicate.                                                                                                           |
| `tools/py/game_cli.py:133` (form ENTP default)                                   | Reference operativo di scelta default form, NON sepolto.                                                                                                                                        |

**Cross-check canonical complete**:

- `grep -rn personality_module apps/backend/ services/ tools/ scripts/` → **zero match runtime**. Confermato che root JSON + cold archive + pack mirror sono tutti orfani lato runtime canonical.
- `grep -rn hydrate_profile apps/backend/` → **zero**. Conferma orfanità pack Python.
- `grep -rn hook_bindings apps/backend/` → **zero**. Conferma orfanità pack TypeScript.
- `data/core/forms/` contiene SOLO 2 file canonical (`mbti_forms.yaml`, `form_pack_bias.yaml`) — nessuno `mbti_gates.yaml`. Conferma ghost-status M-012.

---

## Skiv link

`packs/.../personality/enneagram/hydrate_profile.py` (M-009) + `personality_module.v1.json` (M-007) → **Sprint C "voices+diary"** in [`data/core/species/dune_stalker_lifecycle.yaml`](../../../data/core/species/dune_stalker_lifecycle.yaml). I tipi enneagram offrono 9 × (`basic_fear`, `basic_desire`, `passion`, `fixation`, `virtue`) = **45 diary line stems** auto-genrabili. Hydrate logic Python (4.8KB) → port a Node via `personalityProjection.js` extension `hydrateEnneaProfile()`.

Combina con thought cabinet Phase 2 (PR #1769 internalize → passive stats applied) per "internalize fear" → applicazione passiva (es. INTP type-5 fear "essere ignoranti/incapaci" → buff `+1 INT pickup` su exploration). Skiv saga continuation Sprint C PR target.

---

## Suggested next-step

1. **Curate top 3** (M-014 + M-007 + M-012) come museum cards individuali in `docs/museum/cards/` con frontmatter pattern session 1. Card M-014 priorità: research doc unblock decisionale immediato.
2. **Run `git show 5c704524:data/evo-tactics/param-synergy/form/mbti_gates.yaml`** prima di card M-012 per verificare schema reale (pre-curation sanity check, evitare card su file ghost incompatibile).
3. **Skip duplicates**: M-008 (cold archive personality_module duplicato di M-007), M-011 (compat_map basso yield), M-013 (tranche import log no actionable).
4. **OPEN_DECISIONS update suggerito**: nuova ambiguità Q? "MBTI surface diegetico vs accrual silenzioso" con default = Triangle Strategy Proposal A (phased reveal one axis per chapter). Cita `triangle-strategy-transfer-plan.md` come reference.
5. **BACKLOG ticket creation**: "P4-MBTI-001 phased reveal axes (Disco Elysium pacing)" + "P4-MBTI-002 recruit gating on MBTI thresholds" + "P4-ENNEA-001 hydrate profile port to Node + diary lines Skiv Sprint C". Tutti citano `triangle-strategy-transfer-plan.md` + `personality_module.v1.json`.
6. **Defer**: M-008 + M-010 + M-011 (cold archive duplicates + low-yield pack assets). Non curare salvo Skiv Sprint C trigger esplicito.

---

**Score totale dominio personality**: 5 score≥4 (M-007/M-009/M-012/M-014 = 4-5/5) + 3 score<4 (skip).
**Curation pipeline raccomandata**: 3 card (M-014 + M-007 + M-012) per session 2 batch, ~6-8h totali.
