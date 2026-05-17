---
title: Excavate inventory — dominio Enneagramma
doc_status: draft
doc_owner: agents/repo-archaeologist
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [archaeology, museum, enneagramma, personality]
---

# Excavate — Enneagramma (2026-04-25)

## Summary (3 bullets)

- **Dataset full-shipped, runtime parziale 6/9**: 6 CSV + 1 JSON + 1 registry template (16 hook stub) sotto `incoming/` (intro 2025-10-29 SHA `6027b180`, last touch 2026-04-16 SHA `dbf46e44` solo bulk Prettier). Canonical `apps/backend/services/vcScoring.js:774` `computeEnneaArchetypes` legge `data/core/telemetry.yaml:55 ennea_themes` e mappa **solo 6 archetipi su 9 tipi** (mancano 1, 4, 6). Zero wing logic, zero triadi computate, zero instinctual variants, zero tritype.
- **Cluster duplicato già curato**: `packs/evo_tactics_pack/tools/py/modules/personality/enneagram/` contiene **stessi 6 CSV** + `enneagramma_schema.json` + `compat_map.json` + `hook_bindings.ts` + `hydrate_profile.py` + `personality_module.v1.json` + README sourced (Wikipedia + Enneagram Institute). Significa che il pack ecosistema ha già processato il dataset ma il backend Node non legge il pack.
- **Orphan `enneaEffects.js`**: `apps/backend/services/enneaEffects.js` (93 LOC, intro 2026-04-16 PR #1433 P4) mappa archetipi a buff combat, ma `grep require/import` ritorna **zero require**. Il modulo è dichiarato in SOURCE-OF-TRUTH §13.4 come "applicato dopo ogni round" ma in realtà nessuno lo importa. Doppia sepoltura: codice canonical scritto e mai wired + dataset full mai integrato.

## Inventory table

| ID              | Title                                                                 | Found at                                                                                                                                  | git_sha_first | last_modified | buried_reason  | score | candidate |
| --------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------- | -------------- | ----- | --------- |
| M-2026-04-25-E1 | Enneagramma master 9 tipi (CSV)                                       | [incoming/Ennagramma/enneagramma_master.csv](../../../incoming/Ennagramma/enneagramma_master.csv)                                         | `6027b180`    | 2026-04-16    | unintegrated   | 4/5   | YES       |
| M-2026-04-25-E2 | Enneagramma dataset JSON canonical (9 types + wings_detail)           | [incoming/Ennagramma/enneagramma_dataset.json](../../../incoming/Ennagramma/enneagramma_dataset.json)                                     | `6027b180`    | 2026-04-16    | unintegrated   | 5/5   | YES       |
| M-2026-04-25-E3 | Enneagramma stackings 6 combinazioni                                  | [incoming/Ennagramma/enneagramma_stackings.csv](../../../incoming/Ennagramma/enneagramma_stackings.csv)                                   | `6027b180`    | 2026-04-16    | unintegrated   | 3/5   | partial   |
| M-2026-04-25-E4 | Enneagramma triadi (Centri + Hornevian + Harmonic + Object Relations) | [incoming/Ennagramma/enneagramma_triadi_complete.csv](../../../incoming/Ennagramma/enneagramma_triadi_complete.csv)                       | `6027b180`    | 2026-04-16    | unintegrated   | 4/5   | YES       |
| M-2026-04-25-E5 | Varianti istintive SP/SO/SX                                           | [incoming/Ennagramma/enneagramma_varianti_istintive.csv](../../../incoming/Ennagramma/enneagramma_varianti_istintive.csv)                 | `6027b180`    | 2026-04-16    | unintegrated   | 3/5   | partial   |
| M-2026-04-25-E6 | Wings 18 combinazioni (1w9/1w2/...)                                   | [incoming/Ennagramma/enneagramma_wings.csv](../../../incoming/Ennagramma/enneagramma_wings.csv)                                           | `6027b180`    | 2026-04-16    | unintegrated   | 4/5   | YES       |
| M-2026-04-25-E7 | Mechanics registry template (16 hook stub)                            | [incoming/enneagramma_mechanics_registry.template.json](../../../incoming/enneagramma_mechanics_registry.template.json)                   | `6027b180`    | 2026-04-16    | unintegrated   | 5/5   | YES       |
| M-2026-04-25-E8 | Pack module duplicato curato (TS+PY+schema)                           | [packs/evo_tactics_pack/tools/py/modules/personality/enneagram/](../../../packs/evo_tactics_pack/tools/py/modules/personality/enneagram/) | unknown       | unknown       | renamed/forked | 4/5   | YES       |
| M-2026-04-25-E9 | Orphan `enneaEffects.js` (mai wired)                                  | [apps/backend/services/enneaEffects.js](../../../apps/backend/services/enneaEffects.js)                                                   | `61b20873`    | 2026-04-16    | abandoned      | 4/5   | YES       |

**Totale artifact distinti**: 9 (7 in `incoming/` + 1 cluster pack + 1 orphan canonical).

## Probe ausiliarie

- `git log -S "enneagramma" --all --oneline` → 20 commit; primo SHA `6027b180` (Add files via upload, 2025-10-29 MasterDD-L34D); ultimo touch dataset `dbf46e44` (bulk Prettier, no semantic change).
- `git log -S "Enneagramma" --all --oneline` → 16 commit, ultimo `8c3f6fd3` (PILLARS_STATUS dashboard, 2026-04 RESEARCH_TODO S1).
- `git log -S "tritype"` → **zero hit**. Tritype concept menzionato in dataset ma mai discusso nei commit message.
- `git log -S "ennea_type"` → **zero hit**.
- `grep -ci "enneagramma" BACKLOG.md OPEN_DECISIONS.md CLAUDE.md` → 0/0/0 (zero menzioni in tracking docs).
- Core docs: `docs/core/00-GDD_MASTER.md` 4 menzioni Ennea, `00-SOURCE-OF-TRUTH.md` 10 menzioni con §13.4 "VC scoring e MBTI/Ennea (P4)" + tabella "Operativo (P4 completo)".
- Canonical mating: `data/core/mating.yaml:361 compat_ennea` ha solo 3 archetipi (Coordinatore/Conquistatore/Esploratore) → drift parallelo.
- Reward pool: `data/core/rewards/reward_pool_mvp.yaml` usa `{ ennea: '8', weight: 0.8 }` per tutti 9 type-id stringa → unico consumatore canonical che già usa numerazione 1-9 completa (signal di intent integrazione futura).

## Top 3 candidate per curation immediata

1. **M-2026-04-25-E7 — Mechanics registry template** (score 5/5).
   - 16 hook ready-to-wire (`triad.core_emotion.rabbia`, `hornevian.obbediente`, ecc.) con eligibility/trigger/effects schema completo (`stat_ops`, `timing`, `scopes`, `duration`).
   - Reuse path Minimal: load JSON in `apps/backend/services/enneaEffects.js` → estendi `ENNEA_EFFECTS` da hook eligibility map (~3h). Risolve gap 9-types coverage in un colpo solo.
   - Alimenta diretto Skiv Sprint C "voices" perché triadi + core_emotion già definiti.

2. **M-2026-04-25-E2 — Enneagramma dataset JSON 9 tipi** (score 5/5).
   - JSON canonical schema 1.0.0 con `id, name_it, center, core_emotion, basic_fear, basic_desire, passion, fixation, virtue, stress_to, growth_to, wings, wings_names_ei, wings_detail{summary}` per ogni 9 tipi.
   - Reuse path Minimal: copia in `data/core/personality/enneagramma_types.yaml` (convert JSON→YAML) + load in `vcScoring.js computeEnneaArchetypes` per coprire i 3 tipi mancanti 1/4/6 (~5h).
   - Critical per "core motivation" Skiv voce diary: `basic_fear` + `basic_desire` + `passion` sono testi prêt-à-l'emploi.

3. **M-2026-04-25-E9 — Orphan `enneaEffects.js`** (score 4/5).
   - 93 LOC scritte 2026-04-16 mai require/import. SOURCE-OF-TRUTH dichiara "Operativo P4 completo" → drift docs vs runtime.
   - Reuse path Minimal: import in `apps/backend/services/sessionRoundBridge.js` end-of-round hook con `vcSnapshot.ennea_archetypes` come input (~2h). Wire del codice già scritto, zero refactor.
   - Sblocca P4 status reale (oggi 🟡, post-wire candidato 🟡+).

## False positives flagged (NON sepolti, già canonical o wireable)

- `apps/backend/services/vcScoring.js:774-893` — `computeEnneaArchetypes` + `ennea_themes` parser **è canonical attivo**. Non sepolto, ma **incompleto** (6/9 archetipi). Da estendere, non da rivivere.
- `data/core/telemetry.yaml:55 ennea_themes` — **canonical config attivo** con 6 archetipi + soglie iter1 calibrate. Da estendere, non da rivivere.
- `data/core/rewards/reward_pool_mvp.yaml` — usa già `ennea` weights su 9 type-id. **NON sepolto**, è il consumatore live più completo.
- `data/core/mating.yaml:361 compat_ennea` — **canonical attivo** (3 archetipi, drift parziale). Da allineare in seconda battuta.
- `packs/evo_tactics_pack/tools/py/modules/personality/enneagram/personality_module.v1.json` — **già processato dal pack ecosystem**, ma backend Node non lo consuma. Stato: forked, non sepolto. Marcato candidate (E8) perché ponte già pronto.

## Skiv `vagans` mapping (deep-link Sprint C voices)

Skiv = `Arenavenator vagans` (dune_stalker, [data/core/species/dune_stalker_lifecycle.yaml](../../../data/core/species/dune_stalker_lifecycle.yaml)). Nome specie `vagans` (lat. "errante, vagabondo"). Personalità body-first INTP (memoria reference [feedback_smoke_test_agents_before_ready.md](~/.claude/projects/C--Users-edusc-Desktop-gioco-Game/memory/feedback_smoke_test_agents_before_ready.md)).

**Match candidati** (senza inventare, solo dataset):

1. **Type 5 — L'Osservatore / Investigatore** (Centro Mentale, paura). `basic_fear: Essere impotenti, incapaci, incompetenti`. `basic_desire: Competenza e comprensione`. `passion: Avarizia` (ritenzione info). Wing `5w4 – The Iconoclast` (più solitario, originale) match `vagans` errante outsider. Voce diary plausibile: stoica, cataloga la duna, accumula intel pre-engage.
2. **Type 7 — L'Ottimista / Entusiasta** (Centro Mentale, paura). `basic_fear: Essere privati, intrappolati nel dolore`. `basic_desire: Essere soddisfatti e appagati`. `passion: Gola/gluttonia`. Wing `7w8 – The Realist` (più tosto, autoritario). Match `vagans` errante che insegue stimoli nuovi, fugge stasi. Voce diary: caotica, name-drop biome, lista loot.

**Sprint C deliverable proposto**: due palette voce distinte per stesso Skiv, switch via `vcSnapshot.ennea_archetypes[0]`. Type 5 voice = sentenze brevi taxonomiche; Type 7 voice = paragrafi ricchi giocosi. Effort ~6h (due voice file YAML + selector).

**NON inventare**: tritype Skiv non determinabile da dataset solo. Richiede telemetry run reale o user decision (escalation `narrative-design-illuminator`).

## Suggested next-step

```
invoke repo-archaeologist --mode curate --id M-2026-04-25-E7 --target incoming/enneagramma_mechanics_registry.template.json
```

Card singola per registry template (artifact con highest reuse leverage). Successive: E2 dataset, E9 orphan. Completa galleria `docs/museum/galleries/enneagramma.md` dopo 3 card stesso domain.

**Escalation parallela suggerita** (NON eseguita autonomously):

- `sot-planner` → ADR proposal "Ennea full 9-archetype runtime integration" (motivo P4 status drift docs vs runtime + Skiv Sprint C dependency).
- `narrative-design-illuminator` → Skiv voice palette type 5 vs 7 a/b test design.

## Provenance trail

- `git log --follow -- "incoming/Ennagramma/enneagramma_master.csv"` → 1 commit `6027b180` (MasterDD-L34D 2025-10-29 15:21 +0100, "Add files via upload"). File mai modificato dopo upload originale.
- `git log -S "enneaEffects" --all` → 4 commit. Intro `61b20873` (PR #1433 "P4 Temperamenti MBTI/Ennea — axes, forms, PF endpoint, effects", 2026-04-16). Successivi solo docs (PILLARS_STATUS dashboard, integrate 5 new docs, GDD canonical refactor, SOURCE-OF-TRUTH v2).
- `git blame` first line `enneagramma_master.csv` → autore `MasterDD-L34D`, 2025-10-29 15:21 (single contributor, bus factor 1).
- ADR chain: zero ADR esiste su Enneagramma. Solo menzioni in `docs/core/00-SOURCE-OF-TRUTH.md §13.4` e `00-GDD_MASTER.md §11`.

## Risks / open questions

- **Schema drift `compat_ennea` mating vs `ennea_themes` telemetry**: 3 archetipi vs 6 archetipi vs 9 type-id. Quale è canonical? → escalation `schema-ripple` agent.
- **Pack module già processato**: rischio doppio-source-of-truth tra `data/core/personality/` (target Minimal) e `packs/evo_tactics_pack/tools/py/modules/personality/enneagram/`. Decisione user needed: pack è auth o backend è auth?
- **Encoding mojibake check**: dataset ha `ù`, `à`, `→` UTF-8 nativi. Spot-check primi 10 righe master csv → clean. Nessun warning hook `Ã` atteso.
- **Bus factor**: tutti dataset toccati solo `MasterDD-L34D`. Conoscenza concentrata → museum card serve come knowledge insurance.

## Sources / cross-reference

- Agent definition: [.claude/agents/repo-archaeologist.md](../../../.claude/agents/repo-archaeologist.md)
- Pillar status: [CLAUDE.md "Pilastri di design"](../../../CLAUDE.md) — P4 Temperamenti MBTI/Ennea **🟡** (T_F full, altri partial)
- SOURCE-OF-TRUTH §13.4: [docs/core/00-SOURCE-OF-TRUTH.md](../../../docs/core/00-SOURCE-OF-TRUTH.md)
- GDD Master §11: [docs/core/00-GDD_MASTER.md](../../../docs/core/00-GDD_MASTER.md)
- Pack module README: [packs/evo_tactics_pack/tools/py/modules/personality/enneagram/README.md](../../../packs/evo_tactics_pack/tools/py/modules/personality/enneagram/README.md)
- Skiv canonical: [data/core/species/dune_stalker_lifecycle.yaml](../../../data/core/species/dune_stalker_lifecycle.yaml)
- Skiv saga: [data/derived/skiv_saga.json](../../../data/derived/skiv_saga.json)

---

**Excavated by**: `repo-archaeologist` (mode `excavate`, domain `enneagramma`).
**Excavated on**: 2026-04-25.
**Budget used**: ~17 min (target 15-20).
