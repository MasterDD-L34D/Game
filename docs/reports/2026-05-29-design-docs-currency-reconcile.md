---
title: "Design docs currency reconcile -- 6 doc apr-2026 vs shipped state (2026-05-29)"
workstream: cross-cutting
category: report
doc_status: active
doc_owner: claude-code
last_verified: "2026-05-29"
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
  aperti), creature-emergence (P0 visual-emergence aperto), lore-redig (verdetto
  valido, candidati parz. wired).
- **1 doc = destinazione, non sorgente**: `MUSEUM.md` e la knowledgebase stessa
  (curata solo da `repo-archaeologist`).

## Metodo -- segnali ground-truth verificati

| Segnale | Comando/path | Esito |
|---|---|---|
| Mutation engine shipped | `apps/backend/services/mutations/{mutationEngine,mutationCatalogLoader,mpTracker}.js` | ESISTE |
| Mutation auto-trigger | `apps/backend/services/combat/mutationTriggerEvaluator.js` + `docs/adr/ADR-2026-05-10-mutation-auto-trigger-evaluator.md` (accepted) | ESISTE |
| Nido frontend shipped | `apps/play/src/nestHub.js` | ESISTE |
| Worldgen runtime | `biomeResonance.js` + `biomeSpawnBias.js` + `biomePoolLoader.js` live; nessun `foodwebFilter`/`crossEventEngine`/`ecosystemLoader` | PARZIALE |
| Creature visual-emergence P0 | grep `drawLifecycleRing`/`drawMutationDots` in `apps/play/src` | ASSENTE (gap aperto) |
| Lore candidati | `eco_lucido`/`strappo_planare` in `data/core/events/mutagen_events.yaml` | PARZIALE (wired qui, non in active_effects) |
| Curazione museum | `MUSEUM.md` cards M-007/M-008/M-012..M-018 + gallery worldgen | GIA CURATO |

## Verdetto per doc

| Doc | Stato | Verdetto | Azione |
|---|---|---|---|
| `reports/2026-04-26-worldgen-pcg-audit` | content in museum M-012..M-018 + gallery; GAP-A/B/C non shipped | **USABILE** (gap-roadmap) | annotato `reconcile_note` + `last_verified` |
| `reports/2026-04-26-creature-emergence-audit` | P0 drawLifecycleRing/drawMutationDots non shipped; biome_affinity spawn-filter aperto | **USABILE** (gap P0) | annotato |
| `reports/2026-04-26-lore-alien-event-swarm-redig` | verdetto "no alien-event" valido; eco_lucido/strappo_planare parz. wired; Leviatano canonical | **REFERENCE valida** | annotato |
| `reports/2026-04-26-nido-pokopia-housing-pattern` | nestHub.js shipped + M-007 revived (OD-001 Path A, PR #1876/#1879/#1911) | **STORICO/eseguito** | annotato (historical) |
| `planning/2026-04-25-mutation-system-design` | mutationEngine + catalogLoader + triggerEvaluator shipped + ADR-2026-05-10 | **SUPERSEDED** | `doc_status: superseded` + `superseded_by` + registry sync |
| `museum/MUSEUM.md` | index KB attivo (last verified 2026-05-20) | **non target recovery** -- e la destinazione | nessuna modifica (curator-gated a repo-archaeologist) |

## Residuo ancora aperto (usabile = vivo)

1. **Worldgen GAP-A** foodweb -> spawn composition (~8-10h). Card museum gia
   presente: `worldgen-species-emergence-from-ecosystem` (M-013) +
   `worldgen-trophic-roles-validator-not-runtime` (M-016).
2. **Worldgen GAP-B** cross-events -> pressure modifier (~12h). Card:
   `worldgen-cross-bioma-events-propagation` (M-014).
3. **Worldgen GAP-C** meta-network -> campaign routing (~30-40h, post-MVP).
4. **Creature-emergence P0** `drawLifecycleRing`/`drawMutationDots` in `render.js`
   (~5h). Gap confermato in card `evolution_genetics-voidling-bound-patterns`
   (visual_swap_it P0). **NON ha card dedicata** -> candidato museum (handoff sotto).
5. **Lore** trait `eco_lucido`/`strappo_planare`: parz. in `mutagen_events.yaml`,
   non ancora in `active_effects.yaml`/`glossary.json` come da Candidate 1 del doc.

## Handoff museum (per sessione Game, curatore = repo-archaeologist)

`docs/museum/` e scrivibile SOLO da `repo-archaeologist` (convenzione MUSEUM.md).
Da questa sessione codemasterdd quell'agent non e nel registry, quindi NON tocco il
museum. Follow-up da eseguire in una sessione Claude Code dentro `C:/dev/Game`:

- [ ] Valutare card dedicata per **creature-emergence visual-emergence P0**
  (`drawLifecycleRing` + `drawMutationDots`), oggi solo coperto di sponda da
  `evolution_genetics-voidling-bound-patterns`.
- [ ] Bump `MUSEUM.md` "Last verified" con nota: worldgen GAP-A/B/C ancora open al
  2026-05-29; nido M-007 confermato revived/shipped.

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
