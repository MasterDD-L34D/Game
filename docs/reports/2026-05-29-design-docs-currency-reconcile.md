---
title: "Design docs currency reconcile -- 6 doc apr-2026 vs shipped state (2026-05-29)"
workstream: cross-cutting
category: report
doc_status: active
doc_owner: claude-code
last_verified: 2026-06-20
source_of_truth: false
language: it
tags: [currency, reconcile, audit, governance, worldgen, mutation, nido, lore]
---

# Design docs currency reconcile (2026-05-29)

Audit di currency su 6 doc di design/audit Evo-Tactics prodotti il 25-26 apr 2026
(PR #1776 + #1866). Domanda: **sono ancora usati e usabili?** Metodo: ground-truth
contro lo stato shipped (codice runtime + ADR + museum + registry), non contro la
narrativa del doc. Riferimento metodo: anti-pattern #19 (stale tracker lag shipped
work) + Currency Gate.

## TL;DR

- **~80% gia processato**: i 6 doc sono in larga parte gia curati nel museum
  (`docs/museum/`) o gia shipped a runtime. Non sono materiale "perso da recuperare".
- **2 doc = storico/eseguito**: nido (Path A shipped) + mutation-system-design
  (engine shipped + ADR-2026-05-10). Marcati di conseguenza.
- **3 doc = ancora usabili come gap-roadmap o reference**: worldgen (GAP-A/B/C
  aperti), creature-emergence (P0 visual-emergence **SHIPPED** -- resta solo
  spawn-filter; vedi correzione ground-truth sotto), lore-redig (verdetto valido,
  candidati data-only non ancora runtime).
- **1 doc = destinazione, non sorgente**: `MUSEUM.md` e la knowledgebase stessa
  (curata solo da `repo-archaeologist`).

## Metodo -- segnali ground-truth verificati

| Segnale | Comando/path | Esito |
|---|---|---|
| Mutation engine shipped | `apps/backend/services/mutations/{mutationEngine,mutationCatalogLoader,mpTracker}.js` | ESISTE |
| Mutation auto-trigger | `apps/backend/services/combat/mutationTriggerEvaluator.js` + `docs/adr/ADR-2026-05-10-mutation-auto-trigger-evaluator.md` (accepted) | ESISTE |
| Nido frontend shipped | `apps/play/src/nestHub.js` | ESISTE |
| Worldgen runtime | `biomeResonance.js` + `biomeSpawnBias.js` + `biomePoolLoader.js` live; nessun `foodwebFilter`/`crossEventEngine`/`ecosystemLoader` | PARZIALE |
| Creature visual-emergence P0 | `render.js` `resolveUnitVisualStyle` + `getAspectTokenOverlay` + `drawLifecycleBadge` (drawUnit L982/L1249); 10-stadi spec 2026-04-27 | SHIPPED (grep name-based `drawLifecycleRing` = falso-negativo, impl con nomi diversi) |
| Creature biome stat | `apps/backend/services/species/biomeAffinity.js` wired (session.js:506) | SHIPPED (stat-mod Subnautica; non spawn-filter) |
| Lore candidati | `eco_lucido`/`strappo_planare` in `data/core/events/mutagen_events.yaml`; nessun consumer backend | DATA-ONLY (non runtime) |
| Seasonal/cross-event | `services/campaign/seasonalEngine.js` Phase-A wired (campaign.js:50); `cross_events.yaml` nessun consumer | PARZIALE (scaffold, GAP-B aperto) |
| Curazione museum | `MUSEUM.md` cards M-007/M-008/M-012..M-018 + gallery worldgen | GIA CURATO |

## Verdetto per doc

| Doc | Stato | Verdetto | Azione |
|---|---|---|---|
| `reports/2026-04-26-worldgen-pcg-audit` | content in museum M-012..M-018 + gallery; GAP-A/B/C non shipped | **USABILE** (gap-roadmap) | annotato `reconcile_note` + `last_verified` |
| `reports/2026-04-26-creature-emergence-audit` | P0 visual-emergence **SHIPPED** (render.js resolveUnitVisualStyle + getAspectTokenOverlay + drawLifecycleBadge); biomeAffinity stat-mod wired; resta solo foodweb spawn-filter (= GAP-A) | **PARZIALE** (gran parte shipped) | annotato + correzione |
| `reports/2026-04-26-lore-alien-event-swarm-redig` | verdetto "no alien-event" valido; eco_lucido/strappo_planare parz. wired; Leviatano canonical | **REFERENCE valida** | annotato |
| `reports/2026-04-26-nido-pokopia-housing-pattern` | nestHub.js shipped + M-007 revived (OD-001 Path A, PR #1876/#1879/#1911) | **STORICO/eseguito** | annotato (historical) |
| `planning/2026-04-25-mutation-system-design` | mutationEngine + catalogLoader + triggerEvaluator shipped + ADR-2026-05-10 | **SUPERSEDED** | `doc_status: superseded` + `superseded_by` + registry sync |
| `museum/MUSEUM.md` | index KB attivo (last verified 2026-05-20) | **non target recovery** -- e la destinazione | nessuna modifica (curator-gated a repo-archaeologist) |

## Residuo ancora aperto (usabile = vivo)

1. **Worldgen GAP-A** foodweb -> spawn composition (~8-10h). NON chiuso:
   `biomeAffinity.js` e stat-modifier (Subnautica), non spawn-pool filter;
   `reinforcementSpawner.js` non filtra per foodweb/biome_affinity. Card museum:
   `worldgen-species-emergence-from-ecosystem` (M-013) +
   `worldgen-trophic-roles-validator-not-runtime` (M-016).
2. **Worldgen GAP-B** cross-events -> pressure modifier (~12h). Parziale:
   `seasonalEngine.js` Phase-A (scaffold ciclico, wired campaign.js:50) esiste, ma
   `cross_events.yaml` resta senza consumer runtime. Card:
   `worldgen-cross-bioma-events-propagation` (M-014).
3. **Worldgen GAP-C** meta-network -> campaign routing (~30-40h, post-MVP).
4. **Lore** trait `eco_lucido`/`strappo_planare`: presenti in
   `data/core/events/mutagen_events.yaml` ma DATA-ONLY (nessun consumer backend),
   non ancora in `active_effects.yaml`/`glossary.json`.

> **CHIUSO** (era erroneamente listato aperto): creature-emergence P0
> visual-emergence -- shipped in `render.js`. Vedi correzione ground-truth sotto.

## Handoff museum (per sessione Game, curatore = repo-archaeologist)

`docs/museum/` e scrivibile SOLO da `repo-archaeologist` (convenzione MUSEUM.md).
Da questa sessione codemasterdd quell'agent non e nel registry, quindi NON tocco il
museum. Follow-up opzionale in una sessione Claude Code dentro `C:/dev/Game`:

- [x] ~~Card creature-emergence visual P0~~ -- **non serve**: gap gia shipped
  (render.js). Una card sarebbe false-positive (curare canonical attivo, vietato
  da repo-archaeologist DO-NOT).
- [ ] (Opzionale) Bump `MUSEUM.md` "Last verified" con nota: worldgen GAP-A/B/C
  ancora open al 2026-05-29; nido M-007 + creature visual-emergence shipped.

## Correzione ground-truth (2026-05-29, post #2440)

Verifica approfondita post-merge: la riga creature-emergence "P0 non shipped" era
**falso-negativo name-based** (L-038 family). Il grep cercava i nomi letterali
`drawLifecycleRing`/`drawMutationDots`, assenti -- ma la funzionalita E shipped
sotto altri nomi: `render.js` `drawUnit` usa `resolveUnitVisualStyle` (stadio 1-10
+ lifecycle_phase fallback), `drawLifecycleBadge`, e
`getAspectTokenOverlay(unit.aspect_token)` (mutation_catalog.yaml 36 aspect_token).
La 10-stadi naming spec (2026-04-27) ha superseduto il modello 5-fasi.

Lezione: verificare per COMPORTAMENTO/simbolo equivalente, non per nome-funzione
atteso. Ground-truth > euristica-di-grep.

## Mirror sovereign (vault)

Sintesi di questo reconcile mirrorata in `C:/dev/vault`
(`Spaces/Dev/Evo-Tactics/`) come reference-by-source (OD-055): 1 nota digest che
linka i 6 doc + i loro card museum + le MOC Atlas esistenti
(`evo-tactics-frattura-abissale-moc`). Branch+PR, merge Eduardo-only.

## Sources

- Game runtime: `apps/backend/services/mutations/*`, `apps/backend/services/combat/*`,
  `apps/play/src/nestHub.js`
- ADR: `docs/adr/ADR-2026-05-10-mutation-auto-trigger-evaluator.md`
- Museum: `docs/museum/MUSEUM.md` (cards M-007/M-008/M-012..M-018)
- Governance: `docs/governance/docs_registry.json` + `tools/check_docs_governance.py`
  + `tools/docs_status_promotion.py`
- I 6 doc auditati (front-matter annotati con `reconcile_note` salvo MUSEUM.md)
