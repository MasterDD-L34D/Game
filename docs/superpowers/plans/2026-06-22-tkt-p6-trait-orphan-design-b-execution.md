---
title: 'Execution plan -- TKT-P6-TRAIT-ORPHAN-DESIGN-B v4 (re-grounded)'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-22'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [trait, orphan, execution-plan, master-dd-ratified, dataset-pack, re-grounded]
---

# TKT-P6-TRAIT-ORPHAN-DESIGN-B -- Execution Plan v4

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o
> executing-plans. Step = checkbox `- [ ]`.
> **v4 (2026-06-22)**: ricostruito sui dati ri-grounded (correction doc) dopo che v1/v2/v3
> erano NOT-READY. Dati: [reground-correction](../../planning/2026-06-22-tkt-p6-b-reground-correction.md).
> Verdetti master-dd: vedi [istruttoria](../../planning/2026-06-22-tkt-p6-trait-orphan-design-b-istruttoria.md) + i 4 gate R1/R2/R3/R4.

**Goal:** Eseguire i verdetti orphan B-defer eseguibili ORA; isolare il resto come BLOCKED owner-gated.

**Architecture:** Data/PCG. Catalog DERIVED = NON rigenerabile su questo checkout (sorgenti `/tmp`
out-of-repo) -> assegnazioni-a-specie BLOCKED. Trait data model = multi-registro (active_effects +
glossary + `data/traits` DB + biome_pools + pack species + external; mirror DERIVED). PR piccole, no self-merge.

## Eseguibilita' (dai dati corretti)

| Verdetto | Azione | Blast | Stato |
| --- | --- | --- | --- |
| v2 `mente_lucida` MoS3->5 | active_effects | 9 ref (AE+glossary) | **READY** Phase 1 |
| v4 `sussurro_psichico` disoriented->disorient | active_effects + glossary | 12 ref | **READY** Phase 1 |
| v7 `marchio_predatorio` -> PCG pool predatori | biome_pools | additivo (gia' in ferrimordax) | **READY** Phase 2 |
| v1 `antenne_wideband` MoS3 | active_effects + `data/traits` DB + mirror | **53 ref** | **CARE** Phase 3 (cross-file sync) |
| v8 `biochip_memoria` rename `corteccia_predatoria` + soft co-occ | active_effects+glossary+DB+affinity+mirror | **52 ref** + tier-mismatch | **CARE** Phase 3 (cross-file + risolvi tier prima) |
| v3 `cervello_predittivo` create-species | catalog ETL | -- | **BLOCKED** (sez. catalog) |
| v5 cluster magnetico -> anguis_magnetica | catalog ETL | -- | **BLOCKED** |
| v6 `aura_glaciale`+`tela_appiccicosa` roster-fisso | catalog ETL | gia' PCG-reachable | **BLOCKED** (additivo, basso valore) |
| name-audit (R2b) | tooling esistente | -- | Phase 5 |

---

## Phase 1 -- active_effects puliti (PR #1; READY). Band-neutral (TRUE orphan, 0 assignment).
### Task 1.1 sussurro_psichico (v4)
- [ ] `active_effects.yaml` (`sussurro_psichico` ~9531): `stato: disoriented` -> `disorient`.
- [ ] `glossary.json`: allinea testo SOLO entry `sussurro_psichico` (no global replace).
- [ ] Verify: `grep -rn disoriented apps/backend` = 0; consumer `status?.disorient` session.js:576.
- [ ] FLAG separato (non in scope): 4 altre entry usano ancora `disoriented` (AE 528/9837/9902/10306) -> apri ticket follow-up.
### Task 1.2 mente_lucida (v2)
- [ ] `active_effects.yaml` (`mente_lucida` ~2248): `trigger.min_mos: 3` -> `5`.
- [ ] Band-neutral confirm: `grep -rn mente_lucida data/core/species data/external packs tests | grep -v active_effects` = 0.
### Task 1.3 validate + PR
- [ ] `python3 tools/py/game_cli.py validate-datasets`; `check_docs_governance --strict`; `git checkout -- reports/ logs/`.
- [ ] Branch `fix/trait-orphan-b-active-effects`; trailer ADR-0011; PR flag forbidden-path (verdetti 2/4). Commit `fix(traits): sussurro key disorient + mente_lucida MoS5 (TKT-P6-B v2,4)`.

---

## Phase 2 -- marchio_predatorio -> PCG pool (PR #2; READY, v7)
- [ ] Phase 0.4-check: e' gia' in `ferrimordax-rutilus.yaml` -> verifica se quella specie e' in un oracle party (band).
- [ ] `grep -n "predator\|apex\|imboscata" data/core/traits/biome_pools.json`; aggiungi `marchio_predatorio` a `traits.support`/`preferred_traits` del pool predatorio (JSON valido).
- [ ] `validate-datasets` + `validate-ecosystem-pack`. PR `feat(pcg): marchio_predatorio in biome pool (TKT-P6-B v7)`.

---

## Phase 3 -- cross-file edits (PR #3+#4; CARE -- richiede sync multi-registro)
### Task 3.1 antenne_wideband differenzia (v1, R1=B)
- [ ] **PRE**: enumera i 53 ref. Fonti da editare: `active_effects.yaml:1857` + `data/traits/locomotorio/antenne_wideband.json`. Mirror (`docs/catalog`, `public`) = DERIVED -> rigenerati, NON hand-edit (verifica il regen path mirror).
- [ ] `active_effects.yaml`: `trigger` += `min_mos: 3` + desc "broad scan". Sincronizza `data/traits/locomotorio/antenne_wideband.json` se duplica tier/trigger.
- [ ] biome_pools ref (:47,:80) restano validi. Rigenera i mirror se applicabile. `validate-datasets`. PR `feat(traits): differentiate antenne_wideband MoS3 (TKT-P6-B v1)`.
### Task 3.2 biochip_memoria -> corteccia_predatoria (v8, R2b) -- high-blast
- [ ] **PRE-GATE**: risolvi prima il tier-mismatch (active_effects=T2 vs `data/traits` DB=T1) -- quale canonico? (master-dd/recon).
- [ ] **PRE**: enumera i 52 ref (active_effects, glossary, `data/traits/offensivo/biochip_memoria.json`, `data/traits/index.json`, `species_affinity.json` [DERIVED -> rigenera via build_species_trait_bridge], `data/external/evo/traits/traits_aggregate.json`, locale `locales/it/traits.json`, mirror DERIVED). Distingui SOURCE (edit) da DERIVED (regenerate).
- [ ] Rename key in TUTTE le source: active_effects, glossary, `data/traits/offensivo/<file>` (+ rename file), index.json. Rigenera affinity + mirror. Aggiorna locale.
- [ ] R2: soft co-occ -> (in Phase 2 o qui) aggiungi `corteccia_predatoria` SOLO a pool con un trait bleeding gia' presente; BACKLOG la feature hard-pairing.
- [ ] FULL validate (datasets + ecosystem-pack + trace_hash single-file). PR `refactor(traits): rename biochip_memoria -> corteccia_predatoria + PCG soft co-occ (TKT-P6-B v8)`.

---

## Phase 4 -- Species assignment (v3/v5/v6) -- **BLOCKED owner-gated**
- [ ] **STOP**. Il catalog DERIVED non e' rigenerabile qui (sorgenti `/tmp` out-of-repo: 48/75 specie). Hand-edit = CI-vietato.
- [ ] Owner-action richiesta (uno di): (a) fornire i 3 sorgenti `/tmp`; (b) ripristinare i legacy YAML da `docs/archive/historical-snapshots/2026-05-15_*`; (c) mappare/runnare l'ETL 4-stage completo su una macchina con i sorgenti.
- [ ] Solo DOPO: v5 magnetic->anguis_magnetica (add slug ai trait_refs del source, NON TR codes), v6 aura/tela roster-fisso (basso valore: gia' PCG), v3 create nuova specie apex psionico (GATE C1 identita' master-dd). band-verify HC06/HC07 + N=40.

---

## Phase 5 -- name-audit + closure (PR #5 docs)
### Task 5.1 trait-name style audit (R2b extra) -- riusa tooling
- [ ] Esegui `python tools/py/styleguide_compliance_report.py` + `tools/py/normalize_trait_style.py` (dry-run) per trovare gli outlier (es. i 3 trait magnetic EN, `antenne_tesla` eponimo, ecc.).
- [ ] Brief `docs/planning/2026-06-XX-trait-name-style-audit.md` con outlier + nomi on-style proposti + blast-radius (GATE C3 master-dd, rename batch separato; coordina i magnetic EN->IT con Phase 4 se sbloccata).
### Task 5.2 closure
- [ ] N=40 sugli edit con impatto combat (se assegnati). Registry: registra i nuovi doc in `docs_registry.json` (verifica diff). `BACKLOG.md`: stato reale TKT-P6-B (READY done / BLOCKED). `check_docs_governance --strict` + `format:check`. PR docs.

---

## Self-review
- **Coverage**: v2=T1.2, v4=T1.1, v7=Ph2, v1=T3.1, v8=T3.2, v3/v5/v6=Ph4(BLOCKED), name-audit=T5.1. Tutti.
- **No fabricazione**: nessun "create TR" (gli slug esistono); nessun regen falso (catalog BLOCKED qui); rename biochip = cross-file esplicito 52-ref (non "low-blast"); assegnazioni = BLOCKED owner-gated, non finte-eseguibili.
- **Consistency**: builder catalog = ETL 4-stage; status key = disorient; nuovo nome = corteccia_predatoria; affinity/mirror = DERIVED (regenerate, non edit).
- **Sequencing**: Ph1 (READY) -> Ph2 (READY) -> Ph3 (CARE, risolvi tier biochip prima) -> Ph4 (BLOCKED) -> Ph5.

## Gate aperti master-dd
1. **Catalog regen** (Ph4): owner fornisce sorgenti `/tmp` o autorizza restore legacy -> sblocca v3/v5/v6.
2. **biochip tier** (T3.2): T1 (DB) vs T2 (active_effects) -- quale canonico, prima del rename.
3. **C1 identita' nuova specie** (v3, se sbloccato).
4. **C3 name-audit** ratifica rename (Ph5).
