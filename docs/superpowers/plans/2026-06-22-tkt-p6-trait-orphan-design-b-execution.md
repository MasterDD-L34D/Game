---
title: 'Execution plan -- TKT-P6-TRAIT-ORPHAN-DESIGN-B v5 (re-grounded + harsh-reviewed)'
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

# TKT-P6-TRAIT-ORPHAN-DESIGN-B -- Execution Plan v5

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o executing-plans.
> **v5**: convergente. v1-v4 NOT-READY -> ri-grounded -> harsh-review v4 (NEEDS-FIX) applicata.
> Dati: [reground-correction](../../planning/2026-06-22-tkt-p6-b-reground-correction.md). Verdetti: istruttoria + gate R1-R4.

**Goal:** Shippare i verdetti puliti ORA; isolare il resto come BLOCKED con il blocco esatto.

**Architecture:** Data/PCG. Catalog DERIVED non rigenerabile qui (sorgenti `/tmp`). Trait data model
multi-registro (SOURCE: active_effects, glossary, `data/traits/<cat>/<trait>.json`, biome_pools, pack
species, external; HYBRID: `data/traits/index.json`; DERIVED: catalog, species_affinity, mirror, snapshot).

## Eseguibilita' (post harsh-review v4, verificata)

| Verdetto | Azione | Stato |
| --- | --- | --- |
| v2 `mente_lucida` MoS3->5 | active_effects+glossary, 0 altri ref | **READY** Ph1 |
| v4 `sussurro_psichico` disoriented->disorient | active_effects+glossary, 0 altri ref | **READY** Ph1 |
| v1 `antenne_wideband` +min_mos:3 | **solo active_effects** (DB entry = metadata, NO trigger -> no sync) | **READY** Ph1 |
| v7 `marchio_predatorio` -> PCG pool | biome_pools (additivo) | **READY-after-2-micro-decisioni** Ph2 |
| v8 `biochip_memoria` rename `corteccia_predatoria` | 51 ref + 2 snapshot + tier-mismatch + **mirror regen path assente** | **BLOCKED-pending-recon** Ph4 |
| v3/v5/v6 assegnazione-a-specie | catalog ETL | **BLOCKED owner-gated** Ph4 |
| name-audit (R2b) | tooling esistente | Ph5 |

---

## Phase 1 -- clean active_effects edits (PR #1; READY). Band-neutral.
### Task 1.1 sussurro_psichico (v4)
- [ ] `active_effects.yaml` (`sussurro_psichico` ~9531): `stato: disoriented` -> `disorient`.
- [ ] Allinea per coerenza (non-blocking): `log_tag: sussurro_psichico_disoriented` (~9533) + glossary `description_it` prosa "disoriented" (glossary.json ~3533, SOLO entry sussurro).
- [ ] Verify `grep -rn disoriented apps/backend` = 0; consumer `status?.disorient` session.js:576.
- [ ] FLAG follow-up ticket: altre 4 entry (AE 528/9837/9902/10306) usano `stato: disoriented` = STESSO bug dead-key (non-funzionali), non solo stile. Fix-all-5 in un PR e' quasi gratis (valuta).
### Task 1.2 mente_lucida (v2)
- [ ] `active_effects.yaml` (`mente_lucida` ~2255): `trigger.min_mos: 3` -> `5`.
### Task 1.3 antenne_wideband (v1, R1=B)
- [ ] `active_effects.yaml` (`antenne_wideband` ~1857): `trigger` += `min_mos: 3` + desc "broad scan a bassa soglia". **NO sync DB**: `data/traits/locomotorio/antenne_wideband.json` e' metadata-only (verificato: nessun trigger/min_mos). Mirror = docs/derived, non portano il campo.
- [ ] biome_pools ref (:47,:80) restano validi.
### Task 1.4 validate + PR
- [ ] `validate-datasets`; `check_docs_governance --strict`; `git checkout -- reports/ logs/`. Branch `fix/trait-orphan-b-active-effects`; trailer ADR-0011; flag forbidden-path (verdetti 1/2/4). Commit `fix(traits): sussurro disorient + mente_lucida MoS5 + antenne_wideband MoS3 (TKT-P6-B v1,2,4)`.

---

## Phase 2 -- marchio_predatorio -> PCG pool (PR #2; v7, R7) -- 2 decisioni prima
- [ ] **D-1 (master-dd micro): quale pool.** Non esiste un "pool predatorio"; ci sono 8 pool per-bioma. ferrimordax (che gia' porta marchio) e' **badlands** -> default tematico `magnetar_badlands`; alternativa: un pool con apex `imboscata` (cryosteppe_convergence/aerial_canopy/crepuscolo_synapse_bloom). master-dd sceglie il/i pool target.
- [ ] **D-2 (band): neutralita'.** ferrimordax e' in scenari sim (`tests/ai/badlandsCalibScenarios.test.js`, `tests/sim/specIGatesProbe.test.js`). Verifica che quegli scenari usino roster FISSI (non PCG-dal-pool-editato). Se PCG-dal-pool -> band-verify HC06/HC07 su v7.
- [ ] Aggiungi `marchio_predatorio` a `traits.support`/`preferred_traits` del pool scelto (JSON valido). `validate-datasets` + `validate-ecosystem-pack`. PR `feat(pcg): marchio_predatorio in <pool> (TKT-P6-B v7)`.

---

## Phase 3 -- (vuota: nessun verdetto "CARE" resta; v1 promosso a Ph1, v8 demosso a Ph4)

---

## Phase 4 -- BLOCKED (recon/owner prima di toccare)
### v8 biochip_memoria -> corteccia_predatoria (BLOCKED-pending-recon)
- [ ] **PRE-RECON-1**: trova il generatore di `packs/evo_tactics_pack/docs/catalog/trait_reference.json` + `trait_glossary.json` (l'harsh-review NON l'ha trovato: `sync_evo_pack_assets.js` copia FROM pack-catalog TO public, NON rigenera il pack-catalog da `data/core`). Senza questo, "rigenera i mirror" e' non-azionabile -> il rename lascerebbe drift derivato. Se i pack-catalog sono hand-maintained -> aggiungili all'edit-list esplicita.
- [ ] **PRE-RECON-2**: tier-mismatch (active_effects T2 vs DB T1) -- quale canonico (master-dd).
- [ ] **Edit-list completa** (quando sbloccato): SOURCE = active_effects.yaml + glossary.json + `data/traits/offensivo/biochip_memoria.json` (rename file+id) + locale `locales/it/traits.json`. HYBRID = rigenera `data/traits/index.json` + `species_affinity.json` via `build_species_trait_bridge.py` (NON hand-edit). SNAPSHOT = `tests/snapshots/species_builder_predatore.json` + `apps/mission-console/tests/__snapshots__/GenerationFlow.spec.ts.snap` (rigenera, non hand-edit). DERIVED = mirror via il generatore di PRE-RECON-1. + R2 soft co-occ in biome_pools.
### v3/v5/v6 species assignment (BLOCKED owner-gated)
- [ ] Catalog non rigenerabile qui (source_provenance: 3 path `/tmp`, 48/75 specie). Owner: fornire i `/tmp` o restore legacy YAML da `docs/archive/historical-snapshots/2026-05-15_*` + mappare ETL 4-stage. Poi v5 (anguis, add SLUG non TR), v6 (basso valore: gia' PCG), v3 (create specie, GATE C1 identita').

---

## Phase 5 -- name-audit + closure (PR #3 docs)
- [ ] **name-audit (R2b)**: esegui `python tools/py/styleguide_compliance_report.py` + `tools/py/normalize_trait_style.py` (dry-run) per gli outlier (magnetic EN, antenne_tesla, ecc.). Brief `docs/planning/2026-06-XX-trait-name-style-audit.md` + nomi on-style proposti + blast-radius. **GATE C3** master-dd (rename batch separato, coordina magnetic EN->IT con Ph4 se sbloccata).
- [ ] Registry: registra i doc nuovi in `docs_registry.json` (verifica diff). `BACKLOG.md`: stato reale TKT-P6-B (READY done / BLOCKED). N=40 se edit combat-impacting. governance + format. PR docs.

---

## Self-review
- **Coverage**: v1/v2/v4=Ph1, v7=Ph2, v8+v3/v5/v6=Ph4(BLOCKED), name-audit=Ph5. Tutti.
- **No fabricazione** (harsh-review applicata): v1 NON e' high-blast (DB metadata-only); v8 NON e' CARE-shippabile (manca il regen path mirror + 2 snapshot) -> BLOCKED-pending-recon; index.json = HYBRID (rinomina nel per-trait + bridge, non hand-edit); assegnazioni = BLOCKED owner-gated.
- **Consistency**: status key=disorient; nuovo nome=corteccia_predatoria; affinity/index/mirror/snapshot=DERIVED-o-HYBRID (regenerate).
- **Sequencing**: Ph1 (3 edit puliti, shippa subito) -> Ph2 (2 micro-decisioni) -> Ph4 (recon/owner) -> Ph5.

## Gate aperti master-dd
1. **D-1** quale biome pool per marchio (Ph2).
2. **biochip mirror regen path** + **tier T1/T2** (Ph4) prima del rename.
3. **Catalog regen** owner (Ph4) -> sblocca v3/v5/v6.
4. **C3** name-audit ratifica (Ph5).
