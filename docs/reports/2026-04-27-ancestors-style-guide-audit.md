---
title: Ancestors 297 neuroni — style guide compliance audit + rename proposal
date: 2026-04-27
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-27
source_of_truth: false
language: it
review_cycle_days: 30
---

# Ancestors 297 neuroni — style guide compliance audit + rename proposal

## TL;DR

- **297/297 neuroni wiki recovery (v07) auditati** contro `docs/core/00E-NAMING_STYLEGUIDE.md`. Zero conformi al modello canonico bilingue (codice EN + display IT/EN); fonte Fandom = solo English label + sigla `CO 01`/`BB SX 01-2`.
- **Rename proposal generato**: 297 entries in `data/core/ancestors/ancestors_rename_proposal_v1.yaml` con `id_new` snake_case + `label_it` + `label_en` + `description_it/en` + `legacy_code` + flag `genetic` + license attribution preservata.
- **270/297 (91%) gia' wirati** in `data/core/traits/active_effects.yaml` (PR #1815/#1817). Convention attuale `ancestor_<branch>_<name>_<NN>` diverge da proposal (che usa `_<code_suffix>` es. `ab_01`/`bb_ab_01`). Decisione user: **convention A** (mantieni `_NN`) o **convention B** (proposal `_<code_suffix>` traceable).
- **Gap glossary.json**: 0 entries `ancestor_*` in `data/core/traits/glossary.json`. Tutti i 270 wired sono runtime-only senza player-facing layer. Style guide §00E richiede `label_it`/`label_en` + `description_it/en`.
- **Verdict**: `NEEDS_USER_DECISION` su 3 punti (convention ID, italianizzazione 191/297 names, lingua canonical IT vs ASCII). Sprint plan 4 phases (~9-12h totali).

## Style guide rules estratte (applicabili a 297 neuroni)

Source of truth: `docs/core/00E-NAMING_STYLEGUIDE.md` rev 2026-04-16.

### Modello a doppio livello (00E §"Modello a doppio livello")

> "Codice in inglese, display primario in italiano, display alternativo in inglese."

Ogni entry deve avere:

1. **Layer canonico (codice)**: stabile, ASCII-only, machine-readable
   - `id` (slug snake_case con prefix dominio)
   - `slug` (kebab-case alternativo, opzionale per ancestors)
2. **Layer player-facing (display)**: localizzato, UI/HUD-first
   - `label_it` (italiano Title Case, 2-4 parole)
   - `label_en` (inglese Title Case, alternato)
   - `description_it` / `description_en` (prose breve)

### Encoding (00E §"Diacritici e translitterazione")

- Campi canonici (id, slug) = **ASCII-only**.
- Campi display = UTF-8 con diacritici se necessari.
- Mai mojibake (`Ã`, doppia codifica). CLAUDE.md §"Encoding Discipline" enforce.

### Slug pattern (00E §"slug")

- **kebab-case** ASCII per slug specie/biomi.
- **snake_case** ASCII per `morph_slots`/codice runtime (vedi §"Morph slots").
- Ancestors traits seguono `data/core/traits/active_effects.yaml` esistente: **snake_case** prefix `ancestor_<branch>_<name>`.

### Bilingue convention (00E §"Terminologia canonica generale")

- `label_it` Title Case italiano.
- `label_en` mantiene wiki-canonical English (preserve provenance).
- `description_it` italiano natural-prose; `description_en` mirror EN.
- Branch slug: snake_case (es. `self_control`, `preventive_medication`).

### Pattern `trait` esistenti (cross-check con traits canonici)

Verificato in `data/core/traits/active_effects.yaml`:

- `cervello_a_bassa_latenza` — full italiano snake_case (cervello, bassa, latenza)
- `denti_seghettati` — italiano descrittivo
- `cuore_multicamera_bassa_pressione` — full italiano

vs. ancestors path B wire:

- `ancestor_ambulation_endurance_01` — **EN-only** (ambulation/endurance NON italianizzati)
- `ancestor_self_control_tachypsychia` — EN-only (Path A 22 trigger)

**Drift osservata**: ancestors traits usano EN-base nell'`id` mentre il resto del catalogo trait italianizza. Questo era una scelta di **provenance preservation** (ancestor.fandom.com source EN) ma **collide** con principio 00E "codice in inglese, display in italiano" se interpretato restrittivamente.

**Resolution candidate** (proposal v1): mantieni `id` snake_case con base EN (provenance), aggiungi `label_it` italiano (player-facing). 00E compliant: codice EN ASCII + display IT.

## Audit 297 neuroni v07 — distribuzione e conformita'

Verifica `awk -F',' 'NR>6 {print $2}' ancestors_neurons_dump_v07_wiki_recovery.csv | sort | uniq -c`:

| Branch                    | Count |     ID prefix CSV     | Conformita' attuale style guide              |
| ------------------------- | :---: | :-------------------: | -------------------------------------------- |
| Senses                    |  37   |    SO/SS/AN/HA/AL     | violazione: spazio in `SO 01`, no label_it   |
| Dexterity                 |  33   |     WH/SX/IT/HB       | idem                                         |
| Preventive Medication     |  30   |        ST/SI          | idem                                         |
| Ambulation                |  26   |        AB             | idem                                         |
| Therapeutic Medication    |  24   |     CB/CI/CT          | idem                                         |
| Motricity                 |  20   |        MS             | idem                                         |
| Communication             |  20   |     CM/BI/SE/IN       | idem                                         |
| Intelligence              |  14   |     DP/NE/ME/LF       | idem                                         |
| Ardipithecus Ramidus      |  13   |       CC/DP           | idem                                         |
| Australopithecus Afarensis|  12   |        TH             | idem                                         |
| Self-Control              |  12   |        FR             | idem                                         |
| Omnivore                  |  11   |        OM             | idem                                         |
| Settlement                |  10   |        NE             | idem                                         |
| Dodge                     |  10   |        DO             | idem                                         |
| Orrorin Tugenensis        |   8   |        ZO             | idem                                         |
| Attack                    |   8   |        CO             | idem                                         |
| Swim                      |   5   |        SW             | idem                                         |
| Metabolism                |   4   |        ME             | idem                                         |

**Totale**: 297. **89 genetic** (`BB <code>` prefix), **208 regular**.

### Violazioni style guide (sistematiche, 100%)

1. **ID con spazio**: `CO 01`, `BB SX 01-2` non e' `^[a-z][a-z0-9_]*$`. Richiede slugify.
2. **No label_it**: 297/297 neuroni hanno solo `name` EN. Style guide 00E richiede `label_it` player-facing.
3. **No label_en separato**: name EN c'e' ma non come campo distinto.
4. **No description_it**: solo `effect_short` EN.
5. **Branch label IT mancante**: "Self-Control" non ha "Autocontrollo" in alcun mapping.
6. **Encoding**: spot-check OK (verificato `head -10` 2026-04-27, no `Ã` mojibake).

### Non-violazioni (gia' OK)

- Encoding UTF-8 verificato (manifest SHA256 `3e133990...` valido).
- Provenance attribution preservata (`sources` column con permalink wiki).
- License `CC BY-NC-SA 3.0` documentata in manifest + da preservare.

## Cross-check con 270 ancestors gia' wired (PR #1815/#1817)

Verifica `grep -cE "^\s+ancestor_" data/core/traits/active_effects.yaml` = **290** (270 v07 + 20 da 01B).

### Convention attuale (Path A 22 + Path B wire 268)

- Path A (PR #1813, 22 trait): `ancestor_<branch>_<name>` (no code suffix).
  - Esempi: `ancestor_self_control_tachypsychia`, `ancestor_attack_counter_predator`.
- Path B Wire (PR #1817, ~268 trait): `ancestor_<branch>_<name>_<NN>` (numerico semplice).
  - Esempi: `ancestor_ambulation_endurance_01`, `ancestor_ambulation_climb_speed_bb_06` (genetic con `bb_<NN>`).

### Convention proposal v1 (questo audit)

- `ancestor_<branch_slug>_<name_slug>_<code_suffix>` con code suffix che preserva intera sigla wiki.
  - Esempi: `ancestor_ambulation_endurance_ab_01`, `ancestor_attack_counter_irascible_bb_co_01`.
  - **Razionale**: traceability completa (CSV `code` -> ID runtime), zero ambiguita' nel reverse-lookup.

### Decision matrix

| Aspetto                        | Convention A (esistente)   | Convention B (proposal)              |
| ------------------------------ | -------------------------- | ------------------------------------ |
| Lunghezza media ID             | ~35 char                   | ~42 char                             |
| Reverse-lookup CSV ↔ runtime   | richiede provenance.code   | implicito da ID                      |
| Cost migration 270 wired       | 0 (no rename)              | rename 270 + tests refactor (~3-4h)  |
| Compliance 00E §slug           | OK                         | OK                                   |
| Genetic flag visibilita'       | `bb_<NN>` suffix           | `bb_ab_01` con codice integrato      |
| Collision risk con Path A 22   | medio (ricalcolo offset)   | basso (suffix unique)                |

**Raccomandazione**: **Convention A** se priorita' = zero churn esistente; **Convention B** se priorita' = leggibilita'/traceability + audit-friendly. Decisione utente.

### Gap (270 wired vs 297 wiki)

27 entries v07 mancanti dall'integrazione PR #1817. Da audit `grep -cE "source: ancestors_csv_v07_wiki"` = 270. Identificazione precisa demandata a Phase 2 (cross-check `code` column CSV vs `provenance.code` YAML).

### Glossary.json gap (CRITICO per style guide)

`grep -c '"ancestor_' data/core/traits/glossary.json` = **0**. Nessun ancestor entry ha player-facing layer. 00E compliance richiede entry shape:

```json
"ancestor_ambulation_endurance_ab_01": {
  "label_it": "Resistenza",
  "label_en": "Endurance",
  "description_it": "Muoversi richiede molta meno energia.",
  "description_en": "Moving requires a lot less energy."
}
```

Phase 2-3 deve emettere ~290-297 entries verso `glossary.json` (additive, no schema break).

## Rename proposal sample (15 esempi rappresentativi)

Estratto da `data/core/ancestors/ancestors_rename_proposal_v1.yaml` (297 entries totali). Branches diversi + mix regular/genetic + samples con/senza dictionary translation.

| id_old      | id_new                                           | branch                | label_it                   | label_en                  | genetic |
| ----------- | ------------------------------------------------ | --------------------- | -------------------------- | ------------------------- | :-----: |
| `AB 01`     | `ancestor_ambulation_endurance_ab_01`            | ambulation            | Resistenza                 | Endurance                 |  false  |
| `BB AB 14`  | `ancestor_ambulation_pain_threshold_bb_ab_14`    | ambulation            | Soglia del Dolore          | Pain Threshold            |  true   |
| `CO 01`     | `ancestor_attack_fight_response_co_01`           | attack                | Risposta di Combattimento  | Fight Response            |  false  |
| `BB CO 01`  | `ancestor_attack_counter_irascible_bb_co_01`     | attack                | Contrattacco (Irascibili)  | Counterattack (Irascible) |  true   |
| `DO 01`     | `ancestor_dodge_flee_response_do_01`             | dodge                 | Risposta di Fuga           | Flee Response             |  false  |
| `FR 01`     | `ancestor_self_control_tachypsychia_fr_01`       | self_control          | Tachipsichia               | Tachypsychia              |  false  |
| `BB FR 01`  | `ancestor_self_control_determination_bb_fr_01`   | self_control          | Determinazione             | Determination             |  true   |
| `SO 01`     | `ancestor_senses_auditory_stimuli_so_01`         | senses                | Stimoli Uditivi            | Auditory Stimuli          |  false  |
| `WH 04`     | `ancestor_dexterity_thrusting_aim_wh_04`         | dexterity             | Thrusting Aim*             | Thrusting Aim             |  false  |
| `CM 01`     | `ancestor_communication_babbling_cm_01`          | communication         | Vocalizzazione Balbettata  | Babbling Vocalization     |  false  |
| `DP 05`     | `ancestor_ardipithecus_ramidus_mesolimbic_dp_05` | ardipithecus_ramidus  | Via Mesolimbica            | Mesolimbic Pathway        |  false  |
| `ST 01`     | `ancestor_preventive_medication_x_st_01`         | preventive_medication | (untranslated)*            | (wiki name)               |  false  |
| `CT 04`     | `ancestor_therapeutic_medication_venom_ct_04`    | therapeutic_medication| Eliminazione del Veleno    | Venom Elimination         |  false  |
| `SW 01`     | `ancestor_swim_aquatic_locomotion_sw_01`         | swim                  | Locomozione Acquatica      | Aquatic Locomotion        |  false  |
| `NE 01-3`   | `ancestor_settlement_sleep_healing_bb_ne_01_3`   | settlement            | Sonno - Efficienza Curativa| Sleep - Healing Efficiency|  true   |

\* Dictionary `NAME_IT_DICT` in `tools/py/ancestors_style_guide_proposal.py` copre 106/297 names. **191 untranslated** marcate `italianize_label_partial` per editorial pass Phase 2.

## Sprint plan — 4 phases

### Phase 1 — Audit + proposal generation (THIS DELIVERABLE)

- **Effort**: 1.5h (DONE)
- **Output**: `data/core/ancestors/ancestors_rename_proposal_v1.yaml` (297 entries) + this report
- **Risk**: zero (no runtime change)
- **DoD**: YAML parse-clean (verified with PyYAML), 297 entries match manifest count, encoding UTF-8

### Phase 2 — Editorial pass + decisione convention

- **Effort**: 3-4h
- **Tasks**:
  1. User decisione: **Convention A vs B** (vedi decision matrix)
  2. User editorial pass su 191 untranslated `label_it` (curare dictionary o accettare residual EN)
  3. Generare patch script `tools/py/apply_ancestors_proposal.py` che:
     - Se Convention A: emette **solo** `glossary.json` entries (270 + 27 nuove) + skip rename in `active_effects.yaml`
     - Se Convention B: rename 270 wired + emette glossary entries + aggiunge 27 mancanti
- **Risk**: medium (touch active_effects.yaml = runtime)
- **DoD**: dry-run script, diff review, no schema break

### Phase 3 — Apply + regression test

- **Effort**: 2-3h
- **Tasks**:
  1. Apply patch script (write `active_effects.yaml` + `glossary.json`)
  2. Run `python3 tools/py/game_cli.py validate-datasets` (must pass 0 warnings)
  3. Run `node --test tests/ai/*.test.js` (must stay green: 311/311)
  4. Run regression sui 22 Path A trigger (PR #1813) — devono restare green
  5. `python tools/check_docs_governance.py --strict`
  6. `npm run format:check`
- **Risk**: medium (regression sui 22 Path A trigger)
- **DoD**: tutti i test green, `git diff` review pulito, format:check ok

### Phase 4 — Ship OD-011 wire 297 final

- **Effort**: 2-3h
- **Tasks**:
  1. PR titolo: `feat(ancestors): style-guide-compliant rename + glossary 297 neurons`
  2. Body: link a questo report + ADR per scelta convention
  3. Update museum card `ancestors-neurons-dump-csv.md` con status `integrated_styled`
  4. Update `BACKLOG.md`: chiudi ANCESTORS-RECOVERY + apri ANCESTORS-WIRE-FULL chiusura definitiva
  5. Update CLAUDE.md sprint context con counter `297/297 styled`
- **Risk**: low (additive PR)
- **DoD**: PR mergiato, baseline AI 311/311, museum card aggiornata, BACKLOG drift 0

**Total effort estimate**: ~9-12h (Phase 1 done, Phase 2-4 = 7-10h).

## Domande per master-dd (BLOCKER user input)

1. **Convention ID**: Convention A (mantieni `_NN`/`_bb_NN`, zero migration) oppure Convention B (proposal `_<code_suffix>` traceable, ~3-4h migration)? **Default raccomandato**: A (minimal churn, 270 entries gia' OK).

2. **Italianizzazione `label_it`**: 191/297 names privi di traduzione canonical (Thrusting Aim, Stoneknapping Skill, etc.). Tre opzioni:
   - **A**: keep EN as label_it (zero editorial, label_it == label_en for those)
   - **B**: italian editorial pass on all 191 (~2h editorial)
   - **C**: italianizza solo top 50 high-frequency (mid-effort ~30min)
   **Default raccomandato**: C (pragmatico, copre i piu' visibili).

3. **Lingua canonical id**: 00E ammette inglese ASCII per `id`. Confermi pattern `ancestor_<branch_en>_<name_en>` o vuoi italianizzare anche l'id (`ancestor_autocontrollo_tachipsichia`)? **Default raccomandato**: keep EN id (provenance preservation + match esistente 270 wired + 00E compliant).

## Vincoli rispettati

- ✅ CSV originali wiki-recovery non modificati (immutable provenance)
- ✅ Rename proposal in file separato (`data/core/ancestors/`, NEW dir)
- ✅ UTF-8 esplicito (`encoding='utf-8'` + `ensure_ascii=False`-equivalent in YAML)
- ✅ License attribution preservata in ogni entry (`CC BY-NC-SA 3.0` + permalink)
- ✅ Cross-check `awk`/`head -1` pre-claim (memory `feedback_data_grounded_expert_pattern`)
- ✅ Museum consultato (`MUSEUM.md` + card `ancestors-neurons-dump-csv.md`)
- ✅ Italian voice mantenuta in doc + comments script
- ✅ NO scrittura a `data/core/traits/active_effects.yaml` o `glossary.json` (Phase 2-3 work)

## Verdict

**`NEEDS_USER_DECISION`** su 3 punti (Convention ID + italianizzazione strategy + lingua canonical id). Phase 1 deliverable PRONTO (proposal YAML + report). Sprint plan 4 phase definito, effort ~9-12h totali con userland editorial input ~30min-2h.

## Riferimenti

- Source CSV: [reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv](../../reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv) (immutable, 297 entries, SHA256 `3e133990343181c546eced4e3f480eb27d3d0829cf6faca8d037e53890b6e65f`)
- Manifest: [reports/incoming/ancestors/ancestors_neurons_manifest_v07.json](../../reports/incoming/ancestors/ancestors_neurons_manifest_v07.json)
- Style guide: [docs/core/00E-NAMING_STYLEGUIDE.md](../core/00E-NAMING_STYLEGUIDE.md)
- Museum card: [docs/museum/cards/ancestors-neurons-dump-csv.md](../museum/cards/ancestors-neurons-dump-csv.md)
- Workspace audit handoff: [docs/planning/2026-04-25-workspace-audit-drift-fixes-handoff.md](../planning/2026-04-25-workspace-audit-drift-fixes-handoff.md)
- Active effects (target wire): [data/core/traits/active_effects.yaml:2734](../../data/core/traits/active_effects.yaml) (Path A start), [:3247](../../data/core/traits/active_effects.yaml) (Path B Wire start)
- Glossary canonical: [data/core/traits/glossary.json](../../data/core/traits/glossary.json)
- Generator script: [tools/py/ancestors_style_guide_proposal.py](../../tools/py/ancestors_style_guide_proposal.py)
- Proposal output: [data/core/ancestors/ancestors_rename_proposal_v1.yaml](../../data/core/ancestors/ancestors_rename_proposal_v1.yaml)
