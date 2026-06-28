---
title: 'Volo/radici pilot-creature assignment -- proposal (substrate activation)'
date: 2026-06-28
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-28'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [combat, movement, terrain-cost, volo, radici, species, creature-kit, proposal, n40]
---

# Volo/radici pilot-creature assignment -- proposal

> **Scopo**: il move terrain-cost substrate (fasi 0-3 + gap-fix grade per-creatura, tutte MERGED) e'
> band-neutral perche' **nessuna creatura viva porta `adattamento_volo` / `radici_ancora_planare`**.
> Questo doc PROPONE a quali creature canoniche assegnare i 2 trait + i gradi volo, per sbloccare la
> fase 4 (N=40) e la fase 5 (flip). **Io propongo, master-dd ratifica** (valori grado = SDMG; l'edit
> dati/catalog = owner-gated). NESSUN edit qui ai dati/catalog derivato.

## 1. Ground-truth (canonical, `data/core/species/species_catalog.json`, 75 specie)

I nomi nel kit-proposal (`docs/planning/2026-06-22-missing-kit-traits-proposal.md`: archon/balor/banshee/
couatl per volo, treant per radici) sono **nomi-sorgente D&D**, NON id canonici. I carrier reali per
morfotipo:

- **volo** -> morfotipo `volatore_planatore` (3 specie): `echo_wing` (Echopterus pollinifer),
  `aurora_gull` (Glacilarus borealis), `noctule_termico` (Thermonoctus vagans).
- **radici** -> morfotipo `ingegnere_radicante` (2 specie sessili): `ferrocolonia_magnetotattica`,
  `cactus_weaver` (Cactotextor hydrophorus). + `sentinella_radice` (apex_neutral SESSILE gia' nel pilot
  encounter `enc_foresta_temperata_radici`).

## 2. Proposta volo -- gradi ecology-grounded (g1/g2/g3)

Semantica grado (spec substrate sez.2.D): g1 libera terreno normale; g2 dimezza hazard; g3 hazard-free
(lava/acqua_profonda). Proposta ancorata all'ecologia (`functional_signature` + habitat):

| Specie (id)       | Ecologia                                                                   | Grado proposto | Razionale                                                                                            |
| ----------------- | -------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `echo_wing`       | planatore eco-orientato, impollinatore dei calanchi (badlands)             | **g1**         | planatore "normale": libera il terreno difficile, niente specializzazione hazard.                    |
| `aurora_gull`     | migratore di lunga distanza su ponti di ghiaccio / permafrost (cryosteppe) | **g2**         | attraversa gradienti d'acqua/ghiaccio -> dimezza il costo hazard (acqua_profonda), non lo annulla.   |
| `noctule_termico` | volatore notturno che sfrutta le **termiche** del deserto caldo            | **g3**         | cavalca le correnti termiche -> sorvola gli hazard caldi (lava) -> hazard-free. Fit ecologico forte. |

Spread g1/g2/g3 sui 3 carrier = copre tutta la gamma del mechanic + e' falsificabile in N=40.

## 3. Proposta radici (binario, nessun grado)

`radici_ancora_planare` = ancora difensiva DR2 da fermo (nessun grado). Carrier sessili/radicanti:
`ferrocolonia_magnetotattica`, `cactus_weaver`, `sentinella_radice`. Tutti "molto tanky da fermo" per
ecologia (colonie radicanti, immobili). DR2 = valore PROPOSED (ri-valida al primo carrier vivo).

## 4. Come il grado raggiunge l'unita' (mechanism gia' costruito)

`evaluateVoloGrade` legge `unit.volo_grade` (clamp [1,3]); il campo sopravvive al session-start
(`normaliseUnit` whitelist, PR #3020). Due path per popolarlo:

- **Path A (canonical, owner-gated)**: la specie porta `adattamento_volo` nei `genetic_traits` + un
  `volo_grade` per-specie; il roster-builder lo propaga a `unit.volo_grade`. RICHIEDE: (a) edit dati
  specie + **re-baseline del catalog derivato = owner-gated** (MAI hand-edit del derivato; rigenera);
  (b) un piccolo **wire** specie->unita' per `volo_grade` (oggi il builder roster NON setta il campo --
  da verificare/costruire).
- **Path B (pilot, lighter, per il solo N=40)**: aggiungi i carrier al roster del pilot encounter
  (`enc_foresta_temperata_radici.yaml`) con `volo_grade` settato direttamente sull'unita' (dato encounter,
  NON catalog derivato; `normaliseUnit` lo preserva). Sblocca il N=40 senza il re-baseline catalog.
  Da verificare: che il builder dei `groups` dell'encounter passi i campi per-unita' a `normaliseUnit`.

**Raccomandazione**: Path B per il pilot/N=40 (sblocco rapido, reversibile, evidenza), Path A per il
rollout canonico post-ratifica.

## 5. Caveat + boundary

- I **gradi sono PROPOSED** (SDMG, alto-errore): ratifica master-dd prima dell'uso. L'ecologia li ancora
  ma non li decide.
- **Band-affecting**: assegnare i trait cambia la reachability -> il N=40 (fase 4) e' gate obbligatorio
  PRIMA del flip (fase 5).
- **Owner-gated**: l'edit specie + re-baseline catalog (Path A) li fa master-dd/owner; io non tocco il
  derivato. Path B (encounter) e' dato authored ratificabile su PR.
- **Boundary**: io ho fatto il ground-truth + la proposta; master-dd ratifica (carrier + gradi + path) e
  poi parte l'assegnazione (owner) -> N=40 -> flip.

## 6. Next step (post-ratifica)

1. master-dd ratifica: carrier volo (echo_wing/aurora_gull/noctule_termico + gradi), carrier radici, path.
2. Assegnazione (Path A owner-gated re-baseline, o Path B encounter pilot).
3. Verifica/wire `volo_grade` specie->unita' se Path A.
4. Fase 4 N=40 (paired-seed, in-process, node 22, pilot encounter) -> ratifica banda.
5. Fase 5 flip `MOVE_TERRAIN_COST_ENABLED=true` (post-banda + Gate-5 Godot telegraph).
