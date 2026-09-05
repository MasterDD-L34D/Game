---
title: 'ADR 2026-04-19 — Resistance convention (species 100-neutral + trait delta)'
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: 2026-04-19
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/adr/ADR-2026-04-13-rules-engine-d20.md'
  - 'docs/hubs/combat.md'
  - 'packs/evo_tactics_pack/data/balance/species_resistances.yaml'
  - 'packs/evo_tactics_pack/data/balance/trait_mechanics.yaml'
---

# ADR-2026-04-19 · Resistance convention

**Stato**: 🟢 ACCEPTED
**Trigger**: parallel-agent audit 2026-04-19 (balance-auditor + sot-planner + species-reviewer) ha rivelato convention mismatch + wire absence tra `species_resistances.yaml` e `trait_mechanics.yaml`.

## Contesto

Il rules engine d20 applica la resistenza di canale al damage step via `services/rules/resolver.py::apply_resistance(damage, resistances, channel)`. Il dataset di bilanciamento contiene **due convenzioni numeriche diverse** per esprimere resistenza/vulnerabilità:

| Fonte                                                       | Convention      | Significato                                         |
| ----------------------------------------------------------- | --------------- | --------------------------------------------------- |
| `species_resistances.yaml`                                  | **100-neutral** | `80` = 20% resist, `100` = neutro, `120` = 20% vuln |
| `trait_mechanics.yaml` (trait `resistances[].modifier_pct`) | **delta**       | `+20` = 20% resist, `0` = neutro, `-20` = 20% vuln  |

La funzione `merge_resistances(trait_resistances, species_resistances)` (resolver.py:202) converte il formato species→delta via `merged[ch] = 100 - pct` (80→+20, 120→-20), poi somma le trait resistances al baseline. Il risultato `[{channel, modifier_pct}]` è in formato **delta** ed è quello accettato da `apply_resistance`.

**Audit finding (2026-04-19)**:

1. **Wire absence**. `merge_resistances` esiste ma **zero caller**. `hydration.py::aggregate_resistances` somma solo trait resistances e non carica `species_resistances.yaml`. Ogni unità istanziata ha `resistances = trait-only` — il baseline species è invisibile al resolver.
2. **Convention ambiguity**. Nessuna documentazione lockava la convention. Il balance-auditor ha simulato un scenario dove `pct=120` (species scale) fluiva grezzo ad `apply_resistance` → `factor = (100 - 120) / 100 = -0.20` → damage clamp a 0. È lo scenario che si verifica se un futuro caller passasse species data bypassando `merge_resistances`.
3. **Data integrity risk**. Sim hardcore-06 N=13 ha dato 84.6% win rate (target 15-25%). La vulnerability mai applicata (species → trait pipeline non wired) è una delle cause identificate. Richiede calibration iter2 post-wire.

## Decisione

**Convention A (lock)**:

- `species_resistances.yaml` **rimane in 100-neutral scale** (`80` = resist, `100` = neutro, `120` = vuln). Human-readable + canonical per documentation + dataset authoring.
- `trait_mechanics.yaml` trait `resistances[].modifier_pct` **rimane in delta scale** (`+20` = resist, `-20` = vuln). Compone additivamente.
- `services/rules/resolver.py::merge_resistances()` è l'**unico convertitore** 100-neutral → delta. Firma: `merge_resistances(trait_resistances, species_resistances=None) -> List[{channel, modifier_pct}]` (delta).
- `services/rules/resolver.py::apply_resistance(damage, resistances, channel)` **accetta solo delta**. La formula `factor = (100 - pct) / 100` è corretta per il formato delta: `pct=+20` → factor=0.8 (resist), `pct=-20` → factor=1.2 (vuln), `pct=+100` → factor=0.0 (immune), `pct=-100` → factor=2.0 (double damage).

**Invariante di pipeline**:

```
species_resistances.yaml (100-neutral)
    │
    └─► merge_resistances(trait_list, species_dict)
              │
              ▼
      resistances: List[{channel, modifier_pct}]  (delta format)
              │
              └─► apply_resistance(damage, resistances, channel)
                        │
                        ▼
                  reduced_damage (int)
```

Qualunque caller che passa dati species grezzi (100-neutral) direttamente ad `apply_resistance` è un **bug**. `merge_resistances` deve essere il checkpoint.

## Conseguenze

**Positive**:

- Convention lock documentata. Future modifiche dataset non rompono silenziosamente.
- Formula `apply_resistance` resta invariata (nessun break di test esistenti 17 di regressione verdi).
- Data authoring più leggibile: designer scrive `psionico.fisico: 120` per dichiarare vulnerabilità fisica (intuitivo) piuttosto che `-20` (meno leggibile).
- `merge_resistances` come single point of conversion è più facile da testare.

**Negative**:

- Convention split richiede disciplina: 2 scale diverse nello stesso dominio è superficie di bug per nuovi contributor. Mitigato da: (a) questo ADR come reference, (b) commento in `species_resistances.yaml` che già documenta la scala, (c) docstring aggiornato in `merge_resistances` che linka a questo ADR, (d) test di regressione end-to-end (vedi sotto).
- `merge_resistances` non è ancora chiamato dalla pipeline hydration. Fix wire è in PR follow-up **M5-#1b** (`hydration.py::build_*_unit` accetta `species_archetype` param + loader `load_species_resistances`). Questo ADR è docs+test only.

## Test di regressione (M5-#1a)

Nuovo test in `tests/test_resolver.py` aggiunge:

- `test_merge_resistances_species_only` — species dict solo, zero trait: verifica che `psionico.fisico: 120` → `{channel: fisico, modifier_pct: -20}` (amplify).
- `test_merge_resistances_trait_only` — trait list solo, zero species: verifica che sia pass-through.
- `test_merge_resistances_species_plus_trait_stack` — species + trait stack: `corazzato.psionico: 120` + trait `psionico +30` → somma `-20 + 30 = +10` (resist 10%).
- `test_species_vulnerability_end_to_end_smoking_gun` — pipeline completa: species `psionico.fisico: 120` via `merge_resistances`, poi `apply_resistance(10, result, 'fisico')` → 12 damage (20% amplify). Regression guard contro scenario balance-auditor.
- `test_merge_resistances_clamp_range` — somma extreme (species 120 + trait -200 = -100) clamp a min delta range (opzionale, TBD in wire PR).

Test esistenti rimangono verdi. Lint: `PYTHONPATH=services/rules pytest tests/test_resolver.py` deve passare 17→21+ test.

## Migration path

- **M5-#1a (questo PR)**: docs + test. Zero code change in `services/rules/` o `hydration.py`. Ship safe.
- **M5-#1b (next PR)**: `hydration.py` load species*resistances.yaml + wire `build*_\_unit(species_archetype=...)`→`merge_resistances`. Per-species archetype mapping (via `data/core/species/_.yaml`field`resistance_archetype`, default `adattivo`) è prerequisito — coordinato con species-reviewer P1-species-02.
- **M5-#1c (follow-up)**: re-run calibration iter2 hardcore-06 post-wire (target 15-25% win rate). Harness `tools/py/batch_calibrate_hardcore06.py`.

## Rollback

PR-level revert del test file. Zero impatto runtime poiché questo PR non tocca logica.

## Autori

- Agent session-debugger + balance-auditor + sot-planner (audit 2026-04-19)
- Master DD (approval convention A via sessione 2026-04-19)
