---
title: Excavate inventory — species_candidate (10 species + swarm pool)
doc_status: draft
doc_owner: agents/repo-archaeologist
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [archaeology, museum, species_candidate, swarm]
---

# Excavate inventory — species_candidate

Domain: `species_candidate`. Mode: `excavate`. Agent: `repo-archaeologist` (refined post-session-1).
Working dir: `C:/Users/edusc/Desktop/gioco/Game/.claude/worktrees/recursing-sinoussi-03003a`.

## Summary

- **10/10 false positive**. Tutte le specie in `incoming/species/*.json` GIÀ canonical in `data/core/species.yaml` (commit `b1fe7e36` bilingual naming styleguide). Artifacts pre-canonical = archeologia storica, non revival material.
- **Swarm pool secco**: solo `magnetic_rift_resonance.yaml` in `incoming/swarm-candidates/traits/` — già curato come **M-2026-04-25-005**. Zero altri candidate swarm species/traits oltre.
- **Zero candidate revivabili**. P3 (Specie×Job 🟢c+) coperto. Niente museum picks da questo dominio. Skiv lineage check: `terracetus_ambulator` ≠ `dune_stalker` (Skiv) — biome=`terrestre_pianeggiante` vs `dune_cristalline`, clade=Keystone vs cacciatore. No match.

## Inventory table

| #   | ID                        | Path artifact                                                   | Status canonical                     | Clade       | Biome                  | Sentience | M-ID                   | Verdict               |
| --- | ------------------------- | --------------------------------------------------------------- | ------------------------------------ | ----------- | ---------------------- | --------- | ---------------------- | --------------------- |
| 1   | `anguis_magnetica`        | `incoming/species/anguis_magnetica.json`                        | ✅ canonical (line 191 species.yaml) | Bridge      | acquatico_costiero     | T1        | M-2026-04-25-007       | FALSE POSITIVE — skip |
| 2   | `chemnotela_toxica`       | `incoming/species/chemnotela_toxica.json`                       | ✅ canonical                         | Threat      | terrestre_forestale    | T1        | M-2026-04-25-008       | FALSE POSITIVE — skip |
| 3   | `elastovaranus_hydrus`    | `incoming/species/elastovaranus_hydrus.json`                    | ✅ canonical                         | Playable    | terrestre_pianeggiante | T1        | M-2026-04-25-009       | FALSE POSITIVE — skip |
| 4   | `gulogluteus_scutiger`    | `incoming/species/gulogluteus_scutiger.json`                    | ✅ canonical                         | Playable    | terrestre_roccioso     | T1        | M-2026-04-25-010       | FALSE POSITIVE — skip |
| 5   | `perfusuas_pedes`         | `incoming/species/perfusuas_pedes.json`                         | ✅ canonical                         | Bridge      | sotterraneo            | T3        | M-2026-04-25-011       | FALSE POSITIVE — skip |
| 6   | `proteus_plasma`          | `incoming/species/proteus_plasma.json`                          | ✅ canonical                         | Playable    | acquatico_dolce        | T0        | M-2026-04-25-012       | FALSE POSITIVE — skip |
| 7   | `rupicapra_sensoria`      | `incoming/species/rupicapra_sensoria.json`                      | ✅ canonical                         | Keystone    | terrestre_montano      | T2        | M-2026-04-25-013       | FALSE POSITIVE — skip |
| 8   | `soniptera_resonans`      | `incoming/species/soniptera_resonans.json`                      | ✅ canonical                         | Threat      | terrestre_forestale    | T1        | M-2026-04-25-014       | FALSE POSITIVE — skip |
| 9   | `terracetus_ambulator`    | `incoming/species/terracetus_ambulator.json`                    | ✅ canonical (line 415)              | Keystone    | terrestre_pianeggiante | T0        | M-2026-04-25-015       | FALSE POSITIVE — skip |
| 10  | `umbra_alaris`            | `incoming/species/umbra_alaris.json`                            | ✅ canonical (line 443)              | Playable    | terrestre_umido        | T1        | M-2026-04-25-016       | FALSE POSITIVE — skip |
| 11  | `magnetic_rift_resonance` | `incoming/swarm-candidates/traits/magnetic_rift_resonance.yaml` | staging (Dafne swarm)                | n/a (trait) | atollo_ossidiana       | T2        | M-2026-04-25-005 (già) | GIÀ CURATO — skip dup |

## Top 3 candidates (cross-pillar match score)

**N/A — pool secco**. Nessuno candidate revivabile. Tutti gli artifact JSON sono **fossili pre-canonical**: il commit `b1fe7e36` ha già promosso ognuno con bilingual display names + clade_tag + trait_plan + biome_affinity + default_parts. Le copie JSON in `incoming/species/` sono il livello stratigrafico precedente alla canonicalizzazione (formato schema-libero `scientific_name`/`common_names`/`functional_signature`).

Se forzato a rankare i 3 più "interessanti" come riferimento storico (NON revival):

1. **`perfusuas_pedes` T3 sotterraneo** — sentience più alta del pool (T3 = Sociale), biome unico (solo specie sotterranea nel set). Lore lineage potenziale per future expansion underground biome.
2. **`proteus_plasma` T0 acquatico_dolce** — Protista complesso, "plasticità estrema di forma" → connessione tematica diretta con M12 Form Evolution (P2 🟢c). Scientific_name match con `Proteus` mitologico = forma-shifter.
3. **`umbra_alaris` Aves T1 invisibilità ottica** — uno dei pochi avian Playable, niche scout/recon. Già canonical ma trait_refs `TR-2401..2405` interessanti per archeologia trait-system originale (oggi non ci sono trait_refs numerici, solo slug — schema migration).

## False positives (mandatory cross-check)

**TUTTE 10 false positive verificate**:

```
anguis_magnetica       grep species.yaml=2 species_expansion=0 → canonical line 191
chemnotela_toxica      grep species.yaml=2 species_expansion=0 → canonical
elastovaranus_hydrus   grep species.yaml=2 species_expansion=0 → canonical
gulogluteus_scutiger   grep species.yaml=2 species_expansion=0 → canonical
perfusuas_pedes        grep species.yaml=2 species_expansion=0 → canonical
proteus_plasma         grep species.yaml=2 species_expansion=0 → canonical
rupicapra_sensoria     grep species.yaml=2 species_expansion=0 → canonical
soniptera_resonans     grep species.yaml=2 species_expansion=0 → canonical
terracetus_ambulator   grep species.yaml=2 species_expansion=0 → canonical line 415
umbra_alaris           grep species.yaml=2 species_expansion=0 → canonical line 443
```

`species.yaml` ha 16 entries totali (`grep -c "id: "`). 10/16 sono questi. Schema canonical: `id` + `legacy_slug` + `genus` + `epithet` + `clade_tag` + `display_name_{it,en}` + `weight_budget` + `biome_affinity` + `default_parts` + `trait_plan`. Schema artifact JSON: `scientific_name` + `common_names` + `classification` + `functional_signature` + `risk_profile` + `interactions` + `constraints` + `sentience_index` + `ecotypes` + `trait_refs`. **Schema migration completata in `b1fe7e36`** — JSON artifacts NON più authoritative, sono solo lore reference legacy.

Swarm pool: 1/1 file = `magnetic_rift_resonance.yaml` = M-2026-04-25-005 già esistente. Zero altri trait/species candidate. Cartella `incoming/swarm-candidates/` ha solo subdir `traits/` (no `species/` subdir).

## Suggested next-step

**No museum action required**. Domino `species_candidate` esaurito archeologicamente. Tre opzioni operative:

1. **Cleanup proposal (P3 housekeeping)**: spostare `incoming/species/*.json` → `docs/archive/historical-snapshots/2026-04-25-pre-canonical-species/` (10 file). Justification: già promossi, zero info loss. NO autorimozione (rule no-auto-revive applies anche al delete).

2. **Schema migration trace doc**: scrivere `docs/archive/historical-snapshots/species-canonicalization-trace.md` che documenta JSON-pre-canonical → YAML-canonical transition (commit `b1fe7e36`), per chi in futuro grepperà `trait_refs: TR-XXXX` e si chiederà "perché non esistono?".

3. **Skip — focus su altri domini**. Pool secco. Re-route `repo-archaeologist` su domain **`old_mechanics`** (file inventory `2026-04-25-old_mechanics-inventory.md` esiste già) o **`enneagramma`** o **`cognitive_traits`** o **`ancestors`** (tutti già excavati 2026-04-25 — verificare se hanno top candidate non ancora revived).

Raccomandato: **opzione 3** (skip+reroute). Opzione 1 = cleanup nice-to-have ma non urgente, può essere ticket BACKLOG separato. Opzione 2 = doc archeologica, valore medio.

## Probes log

```bash
ls incoming/species/                      # 10 file JSON
ls incoming/swarm-candidates/traits/      # 1 file (magnetic_rift_resonance.yaml)
grep -c "id: " data/core/species.yaml     # 16 entries
git log -S "anguis_magnetica" --all       # b1fe7e36 promotion + ancestor commits
git log --oneline -- incoming/species/    # f64d6e97 "Add incoming species data"
```

Read sample: `incoming/species/anguis_magnetica.json` (29 LOC) + `terracetus_ambulator.json` (25 LOC). Schema confirmed pre-canonical (no `clade_tag`, no `trait_plan`, no bilingual `display_name`).
