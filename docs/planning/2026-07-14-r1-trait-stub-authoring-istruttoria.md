---
title: 'Istruttoria R1 -- authoring 46 trait design-stub (grounding + gate + batch-plan)'
date: 2026-07-14
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-07-14'
source_of_truth: false
review_cycle_days: 90
language: it-en
tags:
  [trait, design-stub, authoring, completion-flags, istruttoria, master-dd-gated, no-fabrication]
---

# Istruttoria R1 -- authoring 46 trait design-stub

> **NATURA**: istruttoria (research/prep) READ-ONLY. NON una decisione di design
> ne' un authoring. Tutte le "RACCOMANDAZIONI" sotto sono advisory analyst-side
> (WARN Claude autonomous -- pending master-dd review). L'authoring effettivo dei
> campi design (slot / sinergie / conflitti / prose i18n) e la rimozione del flag
> `completion_flags.design_stub` restano una **decisione master-dd** + PR di
> esecuzione separata e gated. Nessun file dati e' stato modificato.

## 1. Contesto

Recon 2026-07-14: 309 trait DB in `data/traits/`, di cui **46 con
`completion_flags.design_stub: true`** (solo 9 file hanno `design_stub: false`).
Gli stub hanno label/tier/famiglia derivati ma **campi design vuoti**:
`slot`, `sinergie`, `conflitti` = `[]`; `mutazione_indotta` / `uso_funzione` /
`spinta_selettiva` = raw i18n-ref senza prose autorata. Creati via
`tools/py/add_trait_stub.py` (path deterministico anti-fabrication).

## 2. Perche' NON e' un task Jules

- Authoring = creativo, richiede giudizio canon-grounded (effetti + prose).
- Lezione ripetuta (taxonomy reconciliation 2026): un cleanup-task delegato puo'
  divergere in **fabricating-deploy** -- chip #2845 chiuso proprio per balance
  fabbricato su species-stub. Un agente cheap senza grounding riempie i buchi con
  numeri plausibili ma inventati.
- -> R1 resta Claude/human, con gate esplicito. Jules copre solo la fetta hygiene
  meccanica (hub `docs/jules-batch/2026-07-14-trait-hygiene-tasks.md`).

## 3. I 46 stub (per categoria)

- **fisiologico (15)**: aculei_velenosi, adattamento_volo, aura_glaciale,
  cuore_in_furia, denti_seghettati, filtri_bioattivi, membrane_osmotiche,
  pelle_elastomera, pelli_anti_ustione, pelli_fitte, sensori_sismici,
  tela_appiccicosa, tentacoli_uncinati, tessuti_adattivi, zampe_radianti
- **strategia (10)**: canto_di_richiamo, ferocia, intimidatore, legame_di_branco,
  marchio_predatorio, midollo_iperattivo, spirito_combattivo, spore_paniche,
  sussurro_psichico, voce_imperiosa
- **sensoriale (8)**: eco_sismico, equilibrio_vestibolare, nocicezione,
  pigmenti_aurorali, propriocezione, senso_magnetico, sintonia_magnetica,
  termocezione
- **offensivo (4)**: arco_voltaico, martello_osseo, pungiglione_paralizzante,
  scarica_ionica
- **cognitivo (3)**: artigli_psionici, cervello_predittivo, mente_lucida
- **nervoso (3)**: matrice_antimagia, nuclei_di_controllo, risonanza_magnetica
- **difensivo (3)**: corteccia_memetica, pelli_cave, radici_ancora_planare

> Nota: alcuni (es. `eco_sismico`, `adattamento_volo`, `radici_ancora_planare`)
> risultano gia' toccati da PR recenti (#3027, #3018) -- **ground-truth per-file
> prima di authoring**: verificare che lo stub sia ancora aperto (Currency Gate),
> non ereditare questa lista come stato definitivo.

## 4. Approccio authoring (advisory)

1. **Grounding, non invenzione.** Per ogni stub derivare slot/sinergie/conflitti e
   prose da: `docs/combat/trait-mechanics-guide.md`, i trait gia' ratificati della
   **stessa famiglia_tipologia**, e i vicini per effetto. Nessun valore numerico
   inventato -- derivato da analoghi in-band.
2. **Batch per-famiglia** (le 3 grandi = fisiologico 15 + strategia 10 +
   sensoriale 8 = 33/46). Coerenza intra-famiglia > velocita'.
3. **i18n**: autorare la prose IT in `locales/it/traits.json` + EN in
   `locales/en/traits.json`; i file trait tengono solo la i18n-ref (stile enforced
   da `scripts/trait_style_check.js`).
4. **Rimozione flag**: togliere `completion_flags.design_stub` SOLO dopo authoring
   reale + verifica gate.

## 5. Gate (Definition of Done R1)

- HARD: `python tools/lint/trait_schema_gate.py` (schema_version 2.0 + design-block)
  - `python tools/py/trait_template_validator.py` + `node scripts/trait_style_check.js
--fail-on error`.
- Se l'authoring tocca balance (metrics/effetti che entrano in combat) ->
  **AI-playtest batch-sim** N-ladder 10 -> 40, WR/N in-band; mai ratifica a occhio.
- **harsh-reviewer** subagent pre-PR (rischio fabrication = file security/governance-
  class per doctrine).
- Consegna a blocchi (una PR per famiglia), merge master-dd.

## 6. Fuori scope R1

- **R2** wiring meccaniche combat in `active_effects.yaml` (12 PROPOSED #3118 +
  GAP2 residui): behavior-critical + freeze-adjacent, istruttoria separata.
- **R3** fork TR-NNNN vs slug (71 placeholder): decisione SoT-inversion, ADR prima.
- **Content-debt** keeper-stub species (TKT-KEEPER-CONTENT-DEBT) + orphan non-combat
  (TKT-P6): tracciati altrove, non parte di R1.

## 7. Prossimo step

Master-dd ratifica direzione + priorita' famiglie -> PR di esecuzione per-blocco.
Questo doc = istruttoria advisory; nessun dato modificato.
