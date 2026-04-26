---
title: Ancestors Phase 2 — apply rename marchio Evo-Tactics + full IT 191 + italianize ID
date: 2026-04-27
doc_status: stable
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-27
source_of_truth: false
language: it
review_cycle_days: 30
---

# Ancestors Phase 2 — apply rename marchio Evo-Tactics + full IT 191 + italianize ID

## TL;DR

- Phase 1 audit (`docs/reports/2026-04-27-ancestors-style-guide-audit.md`) ha proposto rename + 3 decisioni bloccanti. User decisione 2026-04-27 sera (master-dd):
  - **Q1 = b**: convention `_<code_suffix>` (es. `ancestor_autocontrollo_tachipsichia_fr_01`) — marchio Evo-Tactics. NO `_NN`.
  - **Q2 = B**: tutti i 297 entries hanno `label_it` valorizzato (full editorial pass IT, NO top-50 partial).
  - **Q3 = B**: italianize anche l'ID base (`ancestor_autocontrollo_*` invece di `ancestor_self_control_*`).
- **Phase 2 apply COMPLETO**:
  - **Proposal v2**: 297/297 entries IT-full + ID italianized (`data/core/ancestors/ancestors_rename_proposal_v2.yaml`)
  - **active_effects.yaml**: 290 ancestor wirati renamed + injected `label_it`/`label_en`
  - **glossary.json**: 297 entries ancestor (270 update + 27 nuove dal v07 wiki recovery)
  - **tests**: 15 ancestor ID references aggiornati in `tests/services/enemyTagGate.test.js`
- **Tests**: AI baseline 311/311 verde · enemyTagGate 20/20 verde · format:check verde · validate-datasets 0 warnings.
- **Verdict**: `READY`.

## Decisioni applicate

| # | Domanda | User decisione | Implementazione |
| --- | --- | --- | --- |
| Q1 | Convention ID | **b** (suffix codes, marchio Evo-Tactics) | `_<code_suffix>` mantenuto; NO `_NN` |
| Q2 | Italianizzazione | **B** (full pass su 191 untranslated) | Dictionary `NAME_IT_FULL` 154/154 unique names → IT (zero `[TODO_IT]`) |
| Q3 | Lingua canonical id | **B** (italianize ID base) | Branch slug IT (`autocontrollo`, `medicina_preventiva`) + name slug IT |

## Esempi rename

| ID old (PR #1813/#1817) | ID new (Phase 2) | label_it | label_en |
| --- | --- | --- | --- |
| `ancestor_self_control_tachypsychia` | `ancestor_autocontrollo_tachipsichia_fr_01` | Tachipsichia | Tachypsychia |
| `ancestor_attack_fight_response` | `ancestor_attacco_risposta_di_combattimento_co_01` | Risposta di Combattimento | Fight Response |
| `ancestor_dodge_flee_response` | `ancestor_schivata_risposta_di_fuga_do_01` | Risposta di Fuga | Flee Response |
| `ancestor_attack_counter_predator` | `ancestor_attacco_contromanovra_co_04` | Contromanovra | Counter Maneuver |
| `ancestor_ambulation_endurance_01` | `ancestor_deambulazione_resistenza_ab_01` | Resistenza | Endurance |
| `ancestor_ardipithecus_cognitive_inhibition_03` | `ancestor_ardipithecus_ramidus_inibizione_cognitiva_dp_03` | Inibizione Cognitiva | Cognitive Inhibition |

## Counter aggregati

- **Ancestor traits in active_effects.yaml**: 290 (290 renamed Phase 2)
- **Ancestor entries in glossary.json**: 0 → **297** (+297, +270 update + 27 new wiki recovery)
- **Branch IT mapping**: 18/18 branches mappati (latin scientific names preservati: `ardipithecus_ramidus`, `australopithecus_afarensis`, `orrorin_tugenensis`)
- **Untranslated label_it**: 0/297 (zero residual IT pending)
- **Test references aggiornati**: 15 (`tests/services/enemyTagGate.test.js`)
- **Mojibake check**: 0 occorrenze `Ã` su tutti i file modificati

## File modificati

| File | Tipo | Cambio |
| --- | --- | --- |
| `data/core/ancestors/ancestors_rename_proposal_v2.yaml` | NEW | 297 entries v2 (Phase 2 proposal) |
| `tools/py/ancestors_style_guide_proposal_v2.py` | NEW | Generator script v2 (Q1+Q2+Q3 applied) |
| `tools/py/ancestors_apply_phase2.py` | NEW | Apply script (rename + glossary + test refs) |
| `data/core/traits/active_effects.yaml` | MOD | 290 keys renamed + 290 label_it/en injected |
| `data/core/traits/glossary.json` | MOD | +297 ancestor entries (additive) |
| `tests/services/enemyTagGate.test.js` | MOD | 15 ancestor ID references aggiornati |
| `docs/reports/2026-04-27-ancestors-phase-2-apply-summary.md` | NEW | Questo file |

## DoD passed

- [x] `ancestors_rename_proposal_v2.yaml` (297/297 full IT + italianize ID)
- [x] `active_effects.yaml` 290 ancestors renamed + label_it/label_en added
- [x] `glossary.json` 297 entries (additive)
- [x] Test references updated (15 in enemyTagGate.test.js)
- [x] AI 311/311 verde (`node --test tests/ai/*.test.js`)
- [x] enemyTagGate 20/20 verde (specific regression test)
- [x] format:check verde
- [x] validate-datasets 0 warnings
- [x] Encoding UTF-8 esplicito (zero mojibake `Ã`)

## Verifiche eseguite

```bash
# 1. AI baseline (mai regressione)
node --test tests/ai/*.test.js
# tests 311 / pass 311 / fail 0

# 2. Regression specifico enemyTagGate (riferimenti ancestor renames)
node --test tests/services/enemyTagGate.test.js
# tests 20 / pass 20 / fail 0
# include "regression: ancestor_attacco_risposta_di_combattimento_co_01 (no tag gate) fires on melee hit"

# 3. YAML parse + dataset validate
python3 tools/py/game_cli.py validate-datasets
# 14 controlli eseguiti, 0 avvisi

# 4. Format check
npm run format:check
# All matched files use Prettier code style!

# 5. Mojibake sweep
grep -c "Ã" data/core/traits/active_effects.yaml data/core/traits/glossary.json
# 0
```

## Note pre-esistenti (non bloccanti)

- `tests/services/diaryStore.test.js::ALLOWED_EVENT_TYPES: 8 entries` falliva PRIMA di Phase 2 (count è 12 vs 8 expected). Verificato con `git stash` baseline. Issue separato, fuori scope.

## Future work — ancestors funzionamenti adattati Stadi

User flag 2026-04-27: in sprint successivo, gli ancestors triggers/effects da rivedere per integrazione con sistema **Stadio I-IX** canonical (in shipping via Stadio Phase A sprint parallelo).

**Scope future** (NON in scope ora — solo flagged):

- Come uno Stadio promotion può sbloccare/modificare ancestors triggers (es. "A Stadio V sblocca `ancestor_autocontrollo_tachipsichia_fr_01`").
- Mapping Stadio → ancestors families (Stadio I-III base, Stadio IV-VI medio, Stadio VII-IX apex).
- Gating progressivo: alcuni ancestors solo a Stadio specifico (era prerequisito wiki: livelli neuronali sequenziali).
- Status engine extension (P0 audit 2026-04-25): 68/267 ancestors usano status `linked`/`fed`/`healing`/`attuned`/`sensed`/`telepatic_link`/`frenzy` non consumati da `policy.js`/`resolver.py`. Fix richiesto in M-future status-system extension.
- 220 dead-loop entries in evaluator (passive/movement traits non-attack-action) — analytics noise.

**Effort stimato**: ~6-8h status engine + ~4-6h Stadio gating wire = **~10-14h next-sprint**.

## Riferimenti

- Phase 1 audit: [docs/reports/2026-04-27-ancestors-style-guide-audit.md](2026-04-27-ancestors-style-guide-audit.md)
- Phase 2 proposal: [data/core/ancestors/ancestors_rename_proposal_v2.yaml](../../data/core/ancestors/ancestors_rename_proposal_v2.yaml)
- Source CSV: [reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv](../../reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv) (immutable)
- Style guide: [docs/core/00E-NAMING_STYLEGUIDE.md](../core/00E-NAMING_STYLEGUIDE.md)
- Active effects: [data/core/traits/active_effects.yaml](../../data/core/traits/active_effects.yaml)
- Glossary canonical: [data/core/traits/glossary.json](../../data/core/traits/glossary.json)
- Generator v2: [tools/py/ancestors_style_guide_proposal_v2.py](../../tools/py/ancestors_style_guide_proposal_v2.py)
- Apply script: [tools/py/ancestors_apply_phase2.py](../../tools/py/ancestors_apply_phase2.py)
