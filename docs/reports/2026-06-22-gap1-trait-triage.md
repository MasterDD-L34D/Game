---
title: 'GAP1 trait triage -- 53 resolver-only traits (Phase 1)'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-22'
source_of_truth: false
review_cycle_days: 90
tags: [trait, triage, gap, salvage]
---

# GAP1 trait triage -- 53 resolver-only traits

Triage of the 53 traits in `active_effects` with no per-trait DB file ([audit](2026-06-22-trait-gate-audit.md)). Master-dd review before authoring.

## DROP -- not traits (16)

All `starter_bioma_<mbti>` = MBTI starter-biome assignments that live in active_effects but are NOT creature traits. Leave in active_effects as starter mappings; do NOT author per-trait DB files.

- `starter_bioma_enfj`
- `starter_bioma_enfp`
- `starter_bioma_entj`
- `starter_bioma_entp`
- `starter_bioma_esfj`
- `starter_bioma_esfp`
- `starter_bioma_estj`
- `starter_bioma_estp`
- `starter_bioma_infj`
- `starter_bioma_infp`
- `starter_bioma_intj`
- `starter_bioma_intp`
- `starter_bioma_isfj`
- `starter_bioma_isfp`
- `starter_bioma_istj`
- `starter_bioma_istp`

## AUTHOR + needs glossary entry (4)

Real (OD-024 interoception, ratified) but missing from the glossary too -> author per-trait DB file AND add a glossary entry.

| id | category |
| --- | --- |
| `equilibrio_vestibolare` | sensoriale |
| `nocicezione` | sensoriale |
| `propriocezione` | sensoriale |
| `termocezione` | sensoriale |

## AUTHOR -- real, full registry data (33)

Have an active_effects mechanic + a glossary label + category -> mechanical per-trait DB file authoring (id + category + label + mechanic ref).

| id | category | label |
| --- | --- | --- |
| `aculei_velenosi` | fisiologico | Aculei Velenosi |
| `arco_voltaico` | traumatico | Arco Voltaico |
| `aura_glaciale` | fisiologico | Aura Glaciale |
| `canto_di_richiamo` | comportamentale | Canto di Richiamo |
| `cervello_predittivo` | mentale | Cervello Predittivo |
| `cuore_in_furia` | fisiologico | Cuore in Furia |
| `denti_seghettati` | fisiologico | Denti Seghettati |
| `ferocia` | comportamentale | Ferocia |
| `intimidatore` | comportamentale | Aura Intimidatoria |
| `legame_di_branco` | comportamentale | Legame di Branco |
| `marchio_predatorio` | comportamentale | Marchio Predatorio |
| `martello_osseo` | traumatico | Martello Osseo |
| `mente_lucida` | mentale | Mente Lucida |
| `midollo_iperattivo` | comportamentale | Midollo Iperattivo |
| `pelle_elastomera` | fisiologico | Pelle Elastomera |
| `pelli_anti_ustione` | fisiologico | Pelli Anti-Ustione |
| `pelli_cave` | difensivo | pelli_cave |
| `pelli_fitte` | fisiologico | Pelli Fitte |
| `pungiglione_paralizzante` | traumatico | Pungiglione Paralizzante |
| `risonanza_magnetica` | neurologico | Risonanza Magnetica |
| `scarica_ionica` | traumatico | Scarica Ionica |
| `senso_magnetico` | sensoriale | Senso Magnetico |
| `sensori_sismici` | fisiologico | Sensori Sismici |
| `sintonia_magnetica` | sensoriale | Sintonia Magnetica |
| `spirito_combattivo` | comportamentale | Spirito Combattivo |
| `spore_paniche` | comportamentale | Spore Paniche |
| `stordimento` | traumatico | Colpo Stordente |
| `sussurro_psichico` | comportamentale | Sussurro Psichico |
| `tela_appiccicosa` | fisiologico | Tela Appiccicosa |
| `tentacoli_uncinati` | fisiologico | Tentacoli Uncinati |
| `voce_imperiosa` | comportamentale | Voce Imperiosa |
| `wounded_perma` | persistente | Ferita Permanente |
| `zampe_radianti` | fisiologico | Zampe Radianti |

## Plan

- DROP 16 starter_bioma_* (confirm: not traits).
- AUTHOR 37 per-trait DB files (33 from full registry data + 4 interoception also needing a glossary entry).
- Then `node scripts/build_trait_index.js` + bridge + guard.
