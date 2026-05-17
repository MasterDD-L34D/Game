---
title: Canonical Promotion Matrix — Classificazione Sistemi di Design
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-28'
source_of_truth: true
language: it
review_cycle_days: 30
---

# Matrice di Promozione Canonica

Classificazione ufficiale dei 10 sistemi di design di Evo Tactics. Ogni sistema e' valutato rispetto allo stato attuale nel repo, al livello di integrazione con il gameplay, e alla coerenza con il [Final Design Freeze v0.9](90-FINAL-DESIGN-FREEZE.md).

**Decisioni possibili**: `promuovere a core` / `mantenere appendix` / `declassare a research` / `marcare historical`

**Autorita'**: questo documento ha livello **A1** (hub canonico). In caso di conflitto con doc A3+ (freeze), prevalga il freeze.

---

## Matrice

| #   | Blocco                                             | Stato attuale                                                                                                                                                                               | Decisione                 | Azione richiesta                                                                                                                                                                               | Fonti principali                                                                                                                                                       |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Foodweb / Ecosistemi / Archetipi ruolo x bioma** | 30+ file attivi: 5 foodweb YAML, 5 ecosystem YAML, network cross-bioma, validatori Python, schema v1.0/v1.1/v2.0. Verificato in SOURCE-OF-TRUTH.                                            | **promuovere a core**     | Linkare da GDD Master §3 (Worldgen). Risolvere alias ruoli trofici (legacy vs v2.0).                                                                                                           | `packs/evo_tactics_pack/data/foodwebs/*`, `packs/evo_tactics_pack/data/ecosystems/*`, `docs/catalog/mockups/foodweb_roles.yaml`, `00-SOURCE-OF-TRUTH.md` §4            |
| 2   | **Tri-Sorgente / progressione a carte**            | 2 doc active (overview + QA), engine config YAML, card examples. Pipeline: 3 sorgenti (Roll/Personalita'/Azioni) → scoring → softmax → 3 carte + Skip.                                      | **promuovere a core**     | Linkare da GDD Master §7. Gia' nel workstream cross-cutting.                                                                                                                                   | `docs/architecture/tri-sorgente/overview.md`, `engine/tri_sorgente/tri_sorgente_config.yaml`, `examples/biomes/dune_ferrose/cards.yaml`                                |
| 3   | **Nido / Recruit / Mating**                        | 2 doc active (27-MATING_NIDO + Mating-Reclutamento-Nido), 1 YAML (mating.yaml), canvas appendici. Freeze lo include come "meta-slice controllata".                                          | **promuovere a core**     | **Consolidare**: 27-MATING_NIDO.md (sintesi) e Mating-Reclutamento-Nido.md (dettaglio) → decidere un doc canonico. Completare gene slot in mating.yaml.                                        | `docs/core/27-MATING_NIDO.md`, `docs/core/Mating-Reclutamento-Nido.md`, `data/core/mating.yaml`, `docs/appendici/D-CANVAS_ACCOPPIAMENTO.txt`                           |
| 4   | **MBTI / PF gate soft / Enneagramma / Forme**      | 6 doc core active + 7 research draft. 3 servizi backend live (vcScoring, enneaEffects, personalityProjection). 16 Forms YAML. Pipeline: telemetria → VC → assi MBTI → trigger Ennea → buff. | **promuovere a core**     | **Deduplicare**: `24-TELEMETRIA_VC.md` vs `Telemetria-VC.md`. Centralizzare formula assi MBTI (ora split tra telemetry.yaml e vcScoring.js). Research Ennea resta draft.                       | `docs/core/22-FORME_BASE_16.md`, `docs/core/24-TELEMETRIA_VC.md`, `data/core/forms/mbti_forms.yaml`, `apps/backend/services/vcScoring.js`                              |
| 5   | **Mission Console / HUD**                          | Bundle Vue3 frozen in `docs/mission-console/` (funzionale, deployato). No source nel repo. ADR superseded. `apps/dashboard/` scaffold rimosso (#1343).                                      | **promuovere a core**     | Linkare da GDD Master §10 (boundary HUD/Console/telemetry). Documentare pipeline rebuild esterna. XP Cipher **parked** via [ADR-2026-04-17](../adr/ADR-2026-04-17-xp-cipher-official-park.md). | `docs/core/30-UI_TV_IDENTITA.md`, `docs/core/17-SCREEN_FLOW.md`, `docs/mission-console/index.html`, `docs/adr/ADR-2026-04-14-dashboard-scaffold-vs-mission-console.md` |
| 6   | **Sentience / Sentience Track**                    | 1 guide active (README_SENTIENCE), RFC draft frozen (2025-10), rollout plan draft. Nessun servizio backend. Conflitto naming T0-T5 vs T1-T6 vs slug legacy.                                 | **declassare a research** | Mantenere guide come reference. Risolvere conflitto naming prima di promozione. Nessuna azione core fino a merge RFC.                                                                          | `docs/guide/README_SENTIENCE.md`, `docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md`, `docs/process/sentience_rollout_plan.md`                        |
| 7   | **A.L.I.E.N.A.**                                   | 1 doc active in appendici (framework design specie). 3 canvas .txt legacy. Metodologia educativa/design, non sistema di gameplay.                                                           | **mantenere appendix**    | Resta in `docs/appendici/`. Aggiungere frontmatter ai canvas .txt o convertirli a .md. Linkare da GDD Master come "metodologia di design" (non sistema gameplay).                              | `docs/appendici/ALIENA_documento_integrato.md`, `docs/appendici/A-CANVAS_ORIGINALE.txt`                                                                                |
| 8   | **Sandbox concept**                                | README active in appendici + lore_concepts draft in planning/research. 7 phase logs (pipeline di staging). Meccanismo di gating, non sistema di gameplay.                                   | **mantenere appendix**    | Consolidare: `lore_concepts.md` come reference primario, `sandbox/README.md` come entry point. Fase 7 pipeline gia' documentata altrove.                                                       | `docs/appendici/sandbox/README.md`, `docs/planning/research/lore_concepts.md`                                                                                          |
| 9   | **EchoWake**                                       | 1 doc sostanziale (v2.2) + 2 stub, tutto draft. Framework narrative integrity. Isolato, nessuna integrazione con sistemi attivi.                                                            | **declassare a research** | Resta in `docs/planning/EchoWake/`. Completare devkit stub o rimuoverlo. Chiarire intento integrazione.                                                                                        | `docs/planning/EchoWake/EchoWake_Modules_Expanded_v2_2.md`, `docs/planning/EchoWake/README_DEVKIT.md`                                                                  |
| 10  | **Snapshot/GDD storici**                           | 3 copie identiche GDD.md in archive/historical-snapshots (cleanup 2025-11 e 2025-12). In `lavoro_da_classificare`.                                                                          | **marcare historical**    | Consolidare 3 copie in 1. Spostare in `docs/archive/gdd-baseline/` con README che spiega versione/data. Non usare come fonte — superato da SoT v4 e Freeze v0.9.                               | `docs/archive/historical-snapshots/2025-11-15_evo_cleanup/**/GDD.md`, `docs/archive/historical-snapshots/2025-12-19_inventory_cleanup/**/GDD.md`                       |

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

---

_Creato 2026-04-16. Prossima revisione entro 30 giorni._
