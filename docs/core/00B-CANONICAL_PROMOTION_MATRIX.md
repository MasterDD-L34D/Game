---
title: Canonical Promotion Matrix — Classificazione Sistemi di Design
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-06'
source_of_truth: true
language: it
review_cycle_days: 30
---

# Matrice di Promozione Canonica

Classificazione ufficiale dei 10 sistemi di design di Evo Tactics. Ogni sistema e' valutato rispetto allo stato attuale nel repo, al livello di integrazione con il gameplay, e alla coerenza con il [Final Design Freeze v0.9](90-FINAL-DESIGN-FREEZE.md).

**Decisioni possibili**: `promuovere a core` / `mantenere appendix` / `declassare a research` / `marcare historical`

**Autorita'**: questo documento ha livello **A1** (hub canonico). In caso di conflitto con doc A3+ (freeze), prevalga il freeze.

**Re-verify 2026-06-06**: classificazione ancora valida come mappa di
promozione, ma alcuni sistemi sono avanzati da "solo doc" a live/gated code.
La TV e' mirror/tavolo, non actor interattivo; input e commit passano dai
device. Skiv va letto come prototipo concreto di Custode/companion persistente,
non come template unico.

---

## Matrice

| #   | Blocco                                             | Stato attuale                                                                                                                                                                                            | Decisione                 | Azione richiesta                                                                                                                                                                   | Fonti principali                                                                                                                                                                        |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Foodweb / Ecosistemi / Archetipi ruolo x bioma** | 30+ file attivi: 5 foodweb YAML, 5 ecosystem YAML, network cross-bioma, validatori Python, schema v1.0/v1.1/v2.0. Verificato in SOURCE-OF-TRUTH.                                                         | **promuovere a core**     | Linkare da GDD Master §3 (Worldgen). Risolvere alias ruoli trofici (legacy vs v2.0).                                                                                               | `packs/evo_tactics_pack/data/foodwebs/*`, `packs/evo_tactics_pack/data/ecosystems/*`, `docs/catalog/mockups/foodweb_roles.yaml`, `00-SOURCE-OF-TRUTH.md` §4                             |
| 2   | **Tri-Sorgente / progressione a carte**            | Core design + partial backend/data: overview + QA, engine config YAML, card examples, reward services/routes. Oltre alle 3 carte deve supportare scelte narrative/dottrinali e sedimentazione decisioni. | **promuovere a core**     | Tenere core. Prossimo gate: SPEC-G orchestration device-facing (carte, dottrina, scambio vista/possesso/suggerimento, sedimentazione) senza confondere la TV con un input surface. | `docs/architecture/tri-sorgente/overview.md`, `engine/tri_sorgente/tri_sorgente_config.yaml`, `examples/biomes/dune_ferrose/cards.yaml`, `apps/backend/services/rewards/*`              |
| 3   | **Nido / Recruit / Mating**                        | LIVE_GATED/PARTIAL: doc consolidati, mating YAML, party_rosters, Nido hub/play surface, recruit/offspring ritual. Party select e gruppi sociali restano SPEC-E da chiudere.                              | **promuovere a core**     | Mantenere core. Prossimo gate: SPEC-E Nido Groups/Party Select (creatura principale per player, gruppo sociale fuori combat, 1 creatura + companion/evocazioni in combat).         | `docs/core/27-MATING_NIDO.md`, `docs/core/Mating-Reclutamento-Nido.md`, `data/core/mating.yaml`, `apps/backend/routes/meta.js`, `apps/play/src/nestHub.js`                              |
| 4   | **MBTI / PF gate soft / Enneagramma / Forme**      | 6 doc core active + 7 research draft. 3 servizi backend live (vcScoring, enneaEffects, personalityProjection). 16 Forms YAML. Pipeline: telemetria → VC → assi MBTI → trigger Ennea → buff.              | **promuovere a core**     | **Deduplicare**: `24-TELEMETRIA_VC.md` vs `Telemetria-VC.md`. Centralizzare formula assi MBTI (ora split tra telemetry.yaml e vcScoring.js). Research Ennea resta draft.           | `docs/core/22-FORME_BASE_16.md`, `docs/core/24-TELEMETRIA_VC.md`, `data/core/forms/mbti_forms.yaml`, `apps/backend/services/vcScoring.js`                                               |
| 5   | **Mission Console / HUD / TV mirror**              | Mission Console Vue3 resta frozen in `docs/mission-console/`; la surface attiva e' TV/device web + Godot v2. La TV mostra mirror/recap e piano sequenza, non guida Nido ne' input.                       | **promuovere a core**     | Linkare da GDD Master §10 e dai flow TV/device. Non ripartire da "host drives Nido": host/TV e' tavolo visuale, device sono input authority. XP Cipher resta parked.               | `docs/core/30-UI_TV_IDENTITA.md`, `docs/core/17-SCREEN_FLOW.md`, `docs/mission-console/index.html`, `docs/planning/2026-06-05-evo-tactics-tv-device-campaign-flow-reconstruction.md`    |
| 6   | **Sentience / Sentience Track**                    | 1 guide active (README_SENTIENCE), RFC draft frozen (2025-10), rollout plan draft. Nessun servizio backend. Conflitto naming T0-T5 vs T1-T6 vs slug legacy.                                              | **declassare a research** | Mantenere guide come reference. Risolvere conflitto naming prima di promozione. Nessuna azione core fino a merge RFC.                                                              | `docs/guide/README_SENTIENCE.md`, `docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md`, `docs/process/sentience_rollout_plan.md`                                         |
| 7   | **A.L.I.E.N.A.**                                   | Framework design + runtime hooks gated: generator/world summary, biome/spawn bias, coherence telemetry e enforcement path. Player-facing deve restare diegetico, mai label tecnico "ALIENA".             | **promuovere a core**     | Tenere appendici come metodo, ma promuovere il runtime enforcement a layer core gated/default-off o soft-on per campagna. Allineare a `docs/planning/draft-narrative-lore.md`.     | `docs/appendici/ALIENA_documento_integrato.md`, `apps/backend/services/coop/alienaGenerator.js`, `apps/backend/services/authorial/alienaCoherence.js`, `apps/backend/routes/session.js` |
| 8   | **Sandbox concept**                                | README active in appendici + lore_concepts draft in planning/research. 7 phase logs (pipeline di staging). Meccanismo di gating, non sistema di gameplay.                                                | **mantenere appendix**    | Consolidare: `lore_concepts.md` come reference primario, `sandbox/README.md` come entry point. Fase 7 pipeline gia' documentata altrove.                                           | `docs/appendici/sandbox/README.md`, `docs/planning/research/lore_concepts.md`                                                                                                           |
| 9   | **EchoWake**                                       | 1 doc sostanziale (v2.2) + 2 stub, tutto draft. Framework narrative integrity. Isolato, nessuna integrazione con sistemi attivi.                                                                         | **declassare a research** | Resta in `docs/planning/EchoWake/`. Completare devkit stub o rimuoverlo. Chiarire intento integrazione.                                                                            | `docs/planning/EchoWake/EchoWake_Modules_Expanded_v2_2.md`, `docs/planning/EchoWake/README_DEVKIT.md`                                                                                   |
| 10  | **Snapshot/GDD storici**                           | 3 copie identiche GDD.md in archive/historical-snapshots (cleanup 2025-11 e 2025-12). In `lavoro_da_classificare`.                                                                                       | **marcare historical**    | Consolidare 3 copie in 1. Spostare in `docs/archive/gdd-baseline/` con README che spiega versione/data. Non usare come fonte — superato da SoT v4 e Freeze v0.9.                   | `docs/archive/historical-snapshots/2025-11-15_evo_cleanup/**/GDD.md`, `docs/archive/historical-snapshots/2025-12-19_inventory_cleanup/**/GDD.md`                                        |

---

## Legenda stati

- **core**: sistema di gameplay attivo, integrato nel codice, referenziato dal Freeze. Deve avere doc in `docs/core/` o hub linkato.
- **appendix**: framework metodologico o strumento di staging. Utile ma non gameplay-facing. Resta in `docs/appendici/` o `docs/planning/`.
- **research**: lavoro esplorativo non ancora integrato. Resta draft in `docs/planning/research/`.
- **historical**: snapshot congelato superato da fonti piu' recenti. Resta in `docs/archive/`.

## TODO aperti post-matrice

1. [x] Consolidare duplicati Nido — `27-MATING_NIDO.md` ora redirect a `Mating-Reclutamento-Nido.md`
2. [x] Deduplicare Telemetria — `24-TELEMETRIA_VC.md` ora redirect a `Telemetria-VC.md`
3. [x] Risolvere naming Sentience — canonicizzato T0-T6 (merge README T0 + RFC T1-T6). Schema core aggiornato
4. [x] Consolidare GDD snapshot — 3 copie → 1 in `docs/archive/gdd-baseline/GDD_v1_baseline.md`
5. [x] Documentare pipeline rebuild Mission Console — source perso, documentato in ADR. Rebuild from scratch se serve
6. [x] Chiarire XP Cipher — **Parked** via [ADR-2026-04-17](../adr/ADR-2026-04-17-xp-cipher-official-park.md) (2026-04-17, Q-001 T2.1). FD-058 chiuso come "out of scope": meccaniche XP-like coperte da jobs/mating/VC/economy.
7. [x] Completare gene slot in mating.yaml — aggiunto `gene_slots` con 3 categorie (struttura/funzione/memorie), mutation_tiers T0-T2
8. [x] Convertire canvas .txt A.L.I.E.N.A. in .md con frontmatter — fatto (A, C, D convertiti)
9. [x] Reclassificare ALIENA runtime come enforcement gated — doc/core aggiornati 2026-06-06, default runtime ancora da decidere per campagna/gate.
10. [ ] Chiudere SPEC-E Nido Groups/Party Select e SPEC-G Tri-Sorgente orchestration.

---

_Creato 2026-04-16. Prossima revisione entro 30 giorni._
