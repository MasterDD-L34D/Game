---
title: 'D4 biome-affinity heuristic + ECO-YAML-GEN — design (worldgen foodweb feed)'
workstream: flow
category: planning
doc_status: active
doc_owner: claude-code
last_verified: '2026-05-30'
language: it
tags: [worldgen, biome-affinity, ecosystem, foodweb, heuristic, d4, gap-a, design]
---

# D4 biome-affinity heuristic + ECO-YAML-GEN — design

> Obiettivo (master-dd 2026-05-30): far vivere il **worldgen** legando le specie ai biomi.
> Decisione "entrambi in ordine": **D4** (assegna `biome_affinity` alle 32 specie senza) →
> usa quei dati per **ECO-YAML-GEN** (popola `ecosystem.yaml` → alimenta GAP-A foodweb filter).

## 0. Correzione di rotta verificata (perché D4 da solo NON basta)

Ground-truth nel codice (2026-05-30):

- **GAP-A foodwebFilter** legge `ecosystem.yaml → trofico → species_all` (liste produttori/consumatori
  scritte nei foodweb). **NON** legge `species.biome_affinity`.
- **`biome_affinity`** (campo su species) è consumato da `biomeResonance.js` (bonus P4 "la creatura
  sente l'ambiente"), `mpTracker.js`, `thoughtCabinet.js` — **non** dal foodweb filter.
- Gli `ecosystem.yaml` **non contengono** `biome_affinity` (grep vuoto) → due meccanismi separati.

Conseguenza: assegnare `biome_affinity` (D4) sblocca P4/resonance, **ma non mette le specie nei
foodweb**. Per alimentare GAP-A serve **ECO-YAML-GEN** (popolare il `trofico`). D4 fornisce l'input
non-arbitrario (quale specie → quale bioma) per generare ecosystem.yaml coerenti. Da qui "in ordine".

## 1. Stato dati verificato

- **53 specie canoniche** (`species-canonical-index.json`). **21** hanno `biome_affinity` (stringa =
  1 biome_id top-level, es. `dune_stalker → savana`). **32** non ce l'hanno.
- Campi disponibili sulle 32 per inferenza: `trait_refs` (es. coda_contrappeso, midollo_iperattivo),
  `clade_tag` (Apex/Keystone/Bridge/Threat/Support), `role_tags`, `functional_signature` (PROSA libera),
  `ecology.trophic_tier`. **Nessun campo punta direttamente a un bioma.**
- 20 biomi top-level (`data/core/biomes.yaml`); 5 hanno `ecosystem.yaml` (3 risolvibili per id canonico —
  vedi census #2454). Tool affine: `packs/.../tools/py/derive_crossbiome_traits_v1_0.py` (biome hazards
  → trait, la direzione inversa, riusabile per il mapping).

**Premessa onesta**: i segnali sono **deboli** (prosa + trait, nessun mapping diretto). Le 21 assegnate
lo furono per giudizio editoriale, non regola meccanica. Quindi l'heuristic produce **suggerimenti a
confidenza variabile** → review gate + golden-set gate sono load-bearing, non opzionali.

## 2. Componente 1 — `tools/py/suggest_biome_affinity.py` (heuristic → DRAFT)

Pura proposta, **non tocca il catalogo canonico**.

### Segnali (confidenza pesata)

1. **trait→bioma (primario)**: mapping invertito dai foodweb/ecosystem esistenti + `derive_crossbiome_traits`
   (quali trait compaiono in quali biomi). Per ogni specie, i suoi `trait_refs` votano biomi.
2. **keyword lessicale (secondario)**: match su `functional_signature` + `scientific_name`
   (arena→sabbia/savana, hydro/salina→palude/pianura_salina, ferro/magnet→badlands/atollo, cryo/glaci→caldera_glaciale...).
3. **clade coerenza (tie-break)**: apex/keystone preferiscono biomi dove quel ruolo è già scoperto.

### Output

`docs/planning/2026-05-30-biome-affinity-draft.json` — 32 entry:

```
{ species_id, suggested_biome, confidence (0..1), reasoning, alternatives: [biome, ...top3] }
```

## 3. Quality gate — golden-set (GATE DURO)

Le **21 specie già assegnate** = golden set. L'heuristic gira su di loro (ignorando il biome noto) e
deve ri-predirlo.

- **Soglia: ≥60% top-1 (≥13/21 match esatto).**
- **Sotto soglia → STOP**: riporto accuratezza reale + casi mancati, e si decide tra (a) migliorare i
  segnali, (b) assegnazione manuale master-dd, (c) abbandonare D4. **NON genero le 32 se il gate fallisce**
  (no suggerimenti inaffidabili che inquinano).
- Sopra soglia → genero le 32 con confidenza calibrata sui pesi validati.

Razionale: anti lucky-sample + anti dati-inquinati (CLAUDE.md anti-pattern #14, completionist-preserve).

## 4. Review gate (master-dd)

Il DRAFT non entra nel catalogo da solo. Master-dd rivede i 32 suggerimenti (confidenza + reasoning +
alternatives). Solo le approvate → merge via script separato `tools/py/apply_biome_affinity.py`
(scrive `biome_affinity` + `_provenance` audit trail nel catalogo, encoding UTF-8 esplicito, NON tocca
altri campi). Allineato ADR-2026-05-15 Phase-3 (master-dd review gate su campi heuristic).

## 5. Componente 2 — ECO-YAML-GEN (post-approvazione D4)

Solo dopo che le specie hanno `biome_affinity` approvato:

- Genero/estendo `ecosystem.yaml` per **1-2 biomi gameplay-touched** (YAGNI, NON tutti i 20).
- Raggruppo le specie per `biome_affinity` + le inserisco nelle tier trofiche (`produttori`/
  `consumatori.{primari,secondari,terziari}`/`decompositori`) secondo `role_tags`/`clade_tag`/`trophic_tier`.
- Output DRAFT → review → merge. Questo **alimenta GAP-A** (foodwebFilter ora risolve quei biomi con
  specie reali invece di fallback).
- **Band-safety**: i biomi scelti NON includono rovine_planari (D6: hardcore_06/07 intoccati). Se un
  ecosystem.yaml nuovo tocca uno scenario con reinforcement → band re-verify N=40 (canonical AI-playtest).

## 6. Test

- **Unit heuristic**: input noto (specie con trait/clade definiti) → suggerimento atteso + confidenza.
- **Golden-set validation**: le 21 note → accuratezza top-1 misurata (è il gate §3).
- **ECO-YAML schema**: l'ecosystem.yaml generato valida contro lo schema esistente + `ecosystemResolver`
  lo risolve (species_all non vuoto).
- **Band-neutrality**: se tocca scenari → hardcore_06 [15-25%] / hardcore_07 [30-50%] N=40 invariati.

## 7. Cosa NON fare

- ❌ Auto-merge sul catalogo canonico (review gate obbligatorio).
- ❌ Generare le 32 se il golden-set gate fallisce (<60%).
- ❌ Toccare hardcore_06/07 o rovine_planari (D6).
- ❌ ecosystem.yaml per tutti i 20 biomi (YAGNI — solo gameplay-touched).
- ❌ Inventare biomi non in `biomes.yaml` (valori biome_affinity = i 20 id top-level).

## 8. Sequenza esecuzione

```
D4: suggest_biome_affinity.py --golden-set   (gate 60% top-1)
    └─ pass → genera draft 32 → master-dd review → apply_biome_affinity.py (merge approvate)
       └─ ECO-YAML-GEN: genera ecosystem.yaml 1-2 biomi → review → merge → GAP-A live su quei biomi
    └─ fail → report + STOP + ridiscussione metodo
```

## 9. Coordinamento (altre sessioni)

- D4 è **DEMOTED dal critical-path combat** (plan #2456/#2459) perché non sblocca la combat-usabilità
  (quella è l'adapter D3b/#2457). Questo spec lo recupera per il **worldgen** (P4 resonance + feed
  ecosystem.yaml), che è un asse diverso e legittimo. Nessun conflitto con l'adapter (sistemi ortogonali).
- D6 (rovine_planari) RESOLVED: non toccato qui.

## 10. Fonti (verificate 2026-05-30, sola lettura)

- `packs/evo_tactics_pack/docs/catalog/species-canonical-index.json` (21/53 con biome_affinity)
- `apps/backend/services/worldgen/{foodwebFilter,ecosystemResolver}.js` (GAP-A legge ecosystem.yaml, non biome_affinity)
- `apps/backend/services/combat/biomeResonance.js` (consumer reale di biome_affinity)
- `docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md` (Phase-3 review-gate pattern)
- `packs/evo_tactics_pack/tools/py/derive_crossbiome_traits_v1_0.py` (trait↔biome direzione inversa)
- census #2454 + plan #2456/#2459 (D4 demoted, D6 resolved)
