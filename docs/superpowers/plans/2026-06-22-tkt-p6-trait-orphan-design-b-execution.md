---
title: 'Execution plan -- TKT-P6-TRAIT-ORPHAN-DESIGN-B (8 master-dd verdicts) v2'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-22'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [trait, orphan, execution-plan, master-dd-ratified, dataset-pack, blocker-surfaced]
---

# TKT-P6-TRAIT-ORPHAN-DESIGN-B -- Execution Plan v2

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development o
> superpowers:executing-plans. Step = checkbox `- [ ]`.
> **v2 (2026-06-22)**: ricostruito dopo harsh-review (verdict v1 = NOT-READY). 5 P1 confermati
> via ground-truth -> Phase 3 (assegnazione) e' un BLOCKER recon-gated, NON eseguibile com'era.

**Goal:** Eseguire gli 8 verdetti master-dd dell'istruttoria orphan B-defer
([brief merged](../../planning/2026-06-22-tkt-p6-trait-orphan-design-b-istruttoria.md), PR #2953 `404713e0`).

**Architecture:** Lavoro 100% data/PCG (no codice runtime). Path forbidden ma autorizzati dai
verdetti. Catalog `data/core/species/species_catalog.json` = DERIVED, build via
`tools/etl/merge_pack_v2_species.py --pack-v2 <source> --out ...` (NON `update_evo_pack_catalog.js`,
che e' un mirror downstream -- vedi P1-2). **MAI hand-edit il catalog** (canon-enforcement CI A/B/D).
PR piccole, una per fase, no self-merge.

**Tech Stack:** YAML/JSON; Python ETL (`tools/etl/merge_pack_v2_species.py`); validators
(`trait_audit.py`, `game_cli.py validate-datasets`/`validate-ecosystem-pack`,
`check_docs_governance.py`); combat-oracle (skill `/combat-sim`).

---

## Verdetti ratificati (2026-06-22, una-domanda-alla-volta)

| # | Trait | Verdetto | Tipo | Eseguibile ora? |
| --- | --- | --- | --- | --- |
| 1 | `antenne_wideband` | Differenzia (nicchia distinta) | design (mechanic R1) | Si' (Phase 2, gate R1) |
| 2 | `mente_lucida` | `min_mos` 3 -> 5 | balance | Si' (Phase 1) |
| 3 | `cervello_predittivo` | Tieni T3, assegna a slot esistente | assign | **BLOCKED** (Phase 3) |
| 4 | `sussurro_psichico` | Fix key `disoriented` -> `disorient` | bug-fix | Si' (Phase 1) |
| 5 | cluster magnetico (3) | Assegna bundle a specie atollo_obsidiana | assign | **BLOCKED** (Phase 3) |
| 6 | `aura_glaciale` + `tela_appiccicosa` | Assegna a roster fisso | assign | **BLOCKED** (Phase 3) |
| 7 | `marchio_predatorio` | Aggiungi ai PCG pool | PCG | Si' (Phase 4); NB non-orphan (vedi sotto) |
| 8 | `biochip_memoria` | PCG pool con co-occorrenza bleeding | PCG (feature-gap R2) | Parziale (Phase 4, gate R2) |

## Harsh-review: P1 confermati via ground-truth (perche' v1 era NOT-READY)

1. **Inject mechanism morto.** `scripts/trait_orphan_assign_wave_*.py` usa
   `SPECIES_FILES = [data/core/species.yaml, data/core/species_expansion.yaml]` -- **entrambi
   ELIMINATI** (#2271, 2026-05-15). `glob data/core/species*.yaml` = 0 file. L'inject fa
   silent no-op (`if not fp.exists(): continue` -> "Total injected: 0" come falso successo). Pattern DEPRECATO.
2. **Regen script sbagliato.** `scripts/update_evo_pack_catalog.js` LEGGE `species_catalog.json`
   (input) e scrive mirror downstream (`species-canonical-index.json`); NON costruisce il catalog.
   Il builder reale = `tools/etl/merge_pack_v2_species.py --pack-v2 <source> --out data/core/species/species_catalog.json`.
3. **Specie target senza source in-tree.** `anguis_magnetica` = `source: pack-v2-full-plus`
   (in `data/external/evo/species/species_catalog.json`, trait namespace `TR-NNNN`, non slug).
   `sp_vitricyba_punctata` + `sp_magnetocola_pastoris` = legacy-merge (source = `species.yaml`
   eliminato -> NESSUN source in-tree). ID reali col prefisso `sp_`/underscore (non `vitricyba-punctata`).
4. **Namespace trait mismatch.** Le specie pack-v2 referenziano trait via `TR-NNNN` (mappa in
   `data/external/evo/traits/TR-NNNN.json`), non slug -- non si possono "iniettare" slug nel source pack-v2.
5. **`marchio_predatorio` NON e' orphan.** E' gia' assegnato in
   `packs/evo_tactics_pack/data/species/badlands/ferrimordax-rutilus.yaml:38`. L'istruttoria
   (merged) ha controllato solo il catalog core (`species_catalog.json` trait_refs = 0), NON le
   specie pack-source. **Gap istruttoria limitato a QUESTO 1 trait** (verificato: gli altri 10
   restano orphan anche vs pack species). Verdetto 7 (add a PCG pool) resta valido in se', ma la
   premessa "orphan" era errata per marchio.

## Rischi / gate (post harsh-review)

- **R1 -- antenne_wideband mechanic** non specificato (Task 2.1: A/B/C, default B). Gate master-dd.
- **R2 -- biochip co-occorrenza** = feature-gap (`biome_pools.json` non ha required-pairing). Task 4.2: A soft / B feature. Gate.
- **R3 (BLOCKER) -- assegnazione specie (verdetti 3/5/6).** L'unico path = editare il source
  pack-v2 (`data/external/evo/`, namespace TR-NNNN) + `merge_pack_v2_species.py`, MA: (a) le 2
  specie atollo legacy-merge non hanno source in-tree; (b) il `--pack-v2` source potrebbe essere
  vault out-of-repo. Serve recon (Phase 3.0) + **decisione master-dd** su come ri-homare l'assegnazione.
- **R4 -- slot T3/T4** per cervello_predittivo: se nessuno, defer (verdetto lo consente).
- **R5 -- mente_lucida balance**: band-neutral finche' orphan; N=40 solo post-assegnazione.
- **R6 -- forbidden-path** ogni PR (data/core/traits, biome_pools, data/external/evo, catalog DERIVED): flag + no self-merge.
- **R7 -- trace_hash repo-wide** ([[project_worldgen_gapc_spec]]): se il catalog cambia, NON blanket-run; fix single-file `_stable_digest`.

---

## Phase 0 -- Recon (no PR; risolve R3/R4 + grounding ETL)

- [ ] **0.1 -- source-location per specie target** (grep dir CORRETTE, incluso external):
```bash
grep -rn "anguis_magnetica\|vitricyba\|magnetocola" data/external/evo data/core/species packs/evo_tactics_pack/data 2>/dev/null
python -c "import json;d=json.load(open('data/core/species/species_catalog.json',encoding='utf-8'));sp=d.get('species',d);[print(s['species_id'],s.get('source'),s.get('biome_affinity'),s.get('tier')) for s in sp if isinstance(s,dict)]"
```
Expected: classifica ogni specie per `source` (pack-v2-full-plus | legacy/stub). Le legacy-merge senza source = BLOCKER -> escalation master-dd.

- [ ] **0.2 -- pack-v2 source reale + builder CLI**:
```bash
sed -n '38,110p' tools/etl/merge_pack_v2_species.py   # --pack-v2 / --out / lifecycle inputs
ls -la data/external/evo/species/species_catalog.json   # in-repo pack-v2 mirror?
```
Expected: determinare se il `--pack-v2` autoritativo e' `data/external/evo/...` (in-repo, editabile) o vault out-of-repo (BLOCKER su questo checkout).

- [ ] **0.3 -- TR-NNNN namespace per i trait dei verdetti** (cluster magnetico + aura/tela):
```bash
ls data/external/evo/traits/ | head; grep -rln "magnetic_sensitivity\|rift_attunement\|magnetic_rift_resonance\|aura_glaciale\|tela_appiccicosa" data/external/evo/traits 2>/dev/null
```
Expected: esistono TR-NNNN per questi slug? Se no, l'assegnazione pack-v2 richiede creare nuove TR entry (scope+ratifica).

- [ ] **0.4 -- slot apex T3/T4** (R4) dalla query 0.1. Se 0 -> cervello_predittivo defer.

- [ ] **0.5 -- band-oracle command**: pinna il comando esatto `/combat-sim` HC06/HC07 + verifica se
  `ferrimordax-rutilus` (gia' porta marchio_predatorio) e' in un party oracle (rilevante Phase 4).

**Output Phase 0 = go/no-go per Phase 3** + comandi concreti. Se R3 = vault-only o legacy-no-source
-> Phase 3 STOP, escalation master-dd (non fabbricare).

---

## Phase 1 -- Bug-fix + balance (PR #1; active_effects/glossary). Band-neutral (trait orphan).

### Task 1.1: sussurro_psichico key fix
**Files:** Modify `data/core/traits/active_effects.yaml` (`sussurro_psichico`, riga 9531: `stato`);
Modify `data/core/traits/glossary.json` (SOLO entry key `sussurro_psichico`).
- [ ] **1** Edit `stato: disoriented` -> `stato: disorient` (forma corta canonica; NON esiste
  `disorint` -- termine fantasma, vai diretto a `disorient`). Niente altri campi.
- [ ] **2** Glossary: se la descrizione di `sussurro_psichico` (righe ~3533-3534) cita "disoriented",
  allinea il TESTO. Pin la sola key `sussurro_psichico` (NON global replace: esiste un'altra entry con `disorient` a ~1895).
- [ ] **3** Nota out-of-scope: altre 4 entry usano ancora `stato: disoriented` (active_effects righe
  528, 9837, 9902, 10306). Fuori scope verdetto-4 (sono altri trait orphan); FLAG come bug latente
  separato (non fixare qui). `trait_audit.py` NON valida `stato` vs enum -> il fix e' cosmetico
  finche' il trait resta orphan, ma sblocca la correttezza post-assegnazione.
- [ ] **4** Verify: `grep -rn "disoriented" apps/backend` = 0 consumer; `grep -n "status?.disorient" apps/backend/routes/session.js` = consumer presente.

### Task 1.2: mente_lucida soglia
**Files:** Modify `data/core/traits/active_effects.yaml` (`mente_lucida`, riga 2248).
- [ ] **1** `trigger.min_mos: 3` -> `5`. Panic 2t invariato.
- [ ] **2** Band-neutral check: `grep -rn "mente_lucida" data/core/species data/external/evo packs/evo_tactics_pack/data tests | grep -v active_effects` = 0 (orphan; N=40 deferred R5).

### Task 1.3: validate + PR #1
- [ ] **1** `python3 tools/py/game_cli.py validate-datasets` ; `python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict` ; poi `git checkout -- reports/ logs/ 2>/dev/null` (trait_audit/validate scrivono `reports/schema_validation.json` + `logs/trait_audit.md` tracked).
- [ ] **2** Branch `fix/trait-orphan-b-active-effects`; trailer ADR-0011; PR flag forbidden-path autorizzato verdetti 2/4; no self-merge.
  Commit: `fix(traits): sussurro_psichico key disorient + mente_lucida MoS5 (TKT-P6-B v2,4)`

---

## Phase 2 -- antenne_wideband differentiation (PR #2; GATE R1)
**Files:** Modify `data/core/traits/active_effects.yaml` (`antenne_wideband`, riga 1857).
### Task 2.1: mechanic (master-dd confirm)
- [ ] **1** `antenne_dustsense` (riga ~1384) = T1, `min_mos:5`, +1. `antenne_wideband` attuale = T1,
  no soglia, +1 (strict-upgrade). Proposte:
  - **(A)** wideband -> niche scan: `requires_target_tag` o effetto rilevazione (VERIFICA in 0.3 che il tag sia canonico, altrimenti B).
  - **(B, default)** wideband -> `min_mos: 3` + descrizione "broad scan" (dustsense=precision MoS5). Zero dipendenze, reversibile.
  - **(C)** master-dd: tier/amount diverso.
  **GATE**: non editare senza conferma A/B/C (default B se silenzio).
### Task 2.2: apply + verify
- [ ] **1** Edit per mechanic scelto. **2** `grep -n antenne_wideband data/core/traits/biome_pools.json` (:47 support, :80 keystone) -> ref ancora validi. **3** `validate-datasets`. **4** PR `feat(traits): differentiate antenne_wideband (TKT-P6-B v1)`.

---

## Phase 3 -- Species assignment (verdetti 3/5/6) -- **BLOCKED, recon+master-dd gate**

> NON eseguibile col pattern v1 (P1-1..P1-4). Subordinato a Phase 0 (0.1-0.4). Possibili esiti:

### Task 3.0: esito recon -> uno dei seguenti
- [ ] **Caso A (pack-v2 in-repo editabile)**: se `--pack-v2` = `data/external/evo/...` in-repo E
  esistono/si-creano TR-NNNN per gli slug -> assegna editando `data/external/evo/species/species_catalog.json`
  (`anguis_magnetica.trait_refs += [TR per magnetic cluster]`) + crea TR entry mancanti, poi:
  ```bash
  python tools/etl/merge_pack_v2_species.py --pack-v2 data/external/evo/species/species_catalog.json --out data/core/species/species_catalog.json
  python3 tools/py/game_cli.py validate-datasets && validate-ecosystem-pack --json-out out/validation/v.json --html-out out/validation/v.html
  # trace_hash: NON blanket; fix single-file se serve (R7). band-verify HC06/HC07 (0.5).
  ```
- [ ] **Caso B (legacy-merge senza source -- vitricyba/magnetocola, o pack-v2 vault-only)**:
  **STOP -> escalation master-dd.** Opzioni da presentare: (b1) ripristinare un source YAML legacy
  per le specie atollo legacy; (b2) ri-targettare il bundle magnetico SOLO su `anguis_magnetica`
  (pack-v2, in-repo, tematicamente perfetta) e droppare le 2 legacy; (b3) creare nuove specie
  atollo via il pipeline pack-v2; (b4) defer verdetto 5 finche' esiste un path di authoring specie.
- [ ] **cervello_predittivo (v3)**: se Phase 0.4 trova apex T3/T4 con slot -> assegna come sopra;
  else defer-until-slot (documenta, nessun edit).
- [ ] **aura_glaciale + tela_appiccicosa (v6)**: stesso meccanismo del Caso A sulle specie cryo/web
  target (da 0.1). `aura_glaciale` e' GIA' nel PCG pool cryosteppe (reachable); il roster-fisso e'
  additivo.

PR (se Caso A): `feat(species): assign B-defer traits via pack-v2 ETL (TKT-P6-B v3,5,6)`.
Se Caso B: nessuna PR -> doc di escalation + AskUserQuestion a master-dd.

---

## Phase 4 -- PCG pool (PR #3; biome_pools.json)
### Task 4.1: marchio_predatorio -> pool predatori
- [ ] **1** NB: marchio gia' in `ferrimordax-rutilus` (badlands). Verifica (0.5) se quella specie
  e' in un oracle party prima di assumere band-neutralita'.
- [ ] **2** `grep -n "predator\|apex\|imboscata" data/core/traits/biome_pools.json | head`; aggiungi
  `marchio_predatorio` a `traits.support`/`preferred_traits` del pool predatorio scelto (JSON valido).
- [ ] **3** `validate-datasets` + `validate-ecosystem-pack`.
### Task 4.2: biochip_memoria co-occorrenza (GATE R2)
- [ ] **1** `biome_pools.json` NON ha required-pairing (verificato). Opzioni:
  - **(A, default)** soft: inserisci `biochip_memoria` SOLO in pool il cui core/support contiene
    gia' un trait bleeding (es. `denti_chelatanti`, `aculei_velenosi`, `artigli_acidofagi`). Alta probabilita', no feature.
  - **(B)** feature: estendi schema pool + PCG synthesizer (`services/generation` = forbidden, build grande, gate).
  default A.
- [ ] **2** Applica + validate. PR `feat(pcg): marchio + biochip in biome pools (TKT-P6-B v7,8)`.

---

## Phase 5 -- Validation, N=40, registry, closure (PR #4 docs)
- [ ] **1** N=40 (`/combat-sim`, seed-pinned node 22) sugli encounter toccati da Phase 3 (se eseguita)
  + mente_lucida se assegnato. Evidence -> `docs/reports/2026-06-22-tkt-p6-b-n40-evidence.md`.
- [ ] **2** **Registry**: registra QUESTO plan + l'evidence doc in `docs_registry.json` (CLAUDE.md:
  add atomically). Tool: `tools/docs_governance_migrator.py populate-registry` (NB: bulk -> rivedi
  il diff per non sweepare doc altrui; alt = entry singola da `--dry-run`).
- [ ] **3** `BACKLOG.md`: marca `TKT-P6-TRAIT-ORPHAN-DESIGN-B` con stato reale (verdetti + SHA PR 1-3
  fatte; verdetti 3/5/6 = blocked/escalated se Caso B). `TKT-P6-TRAIT-MECHANICS-SYNC` resta separato.
- [ ] **4** Ground-truth note all'istruttoria mergeata: marchio_predatorio NON-orphan (in
  ferrimordax-rutilus); l'orphan-check andava esteso a pack-source species. (Additive, docs/research).
- [ ] **5** `check_docs_governance --strict` + `npm run format:check`. PR `docs: close/track TKT-P6-B + N=40 + istruttoria correction`.

---

## Self-review (writing-plans checklist)
- **Spec coverage**: v1=Ph2(R1), v2=T1.2, v3=Ph3(R4), v4=T1.1, v5=Ph3(R3 BLOCKER), v6=Ph3, v7=T4.1, v8=T4.2(R2). Tutti mappati; 3/5/6 esplicitamente blocked.
- **Placeholder scan**: nessun id specie hardcoded fabbricato (Phase 3 e' recon-gated; ID reali = `sp_vitricyba_punctata`/`sp_magnetocola_pastoris`/`anguis_magnetica`). Niente comando regen falso (corretto a merge_pack_v2_species.py).
- **Type consistency**: builder = `merge_pack_v2_species.py` (non update_evo_pack_catalog.js); status key = `disorient`; namespace specie pack-v2 = `TR-NNNN`.
- **Sequencing**: Ph0 -> 1 (indip) -> 2 (R1) -> 3 (BLOCKED, dep Ph0 + master-dd) -> 4 (R2) -> 5. PR separate, no self-merge.

## Gate espliciti per master-dd
1. **R3 (BLOCKER)** -- come assegnare le specie atollo legacy-merge senza source in-tree (Phase 3 Caso B: b1/b2/b3/b4). **Decisione richiesta prima di Phase 3.**
2. **R1** -- mechanic antenne_wideband (A/B/C, default B).
3. **R2** -- co-occorrenza biochip (A soft / B feature, default A).
4. **R4** -- cervello_predittivo defer se nessuno slot T3/T4.
