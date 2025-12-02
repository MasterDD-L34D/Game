---
title: Template PTPF Evo-Tactics
description: Struttura PTPF per mantenere coerenza tattica, drift lock e telemetria nel progetto Evo-Tactics.
tags:
  - evo-tactics
  - template
  - ptpf
archived: true
updated: 2025-12-02
---

# Template — Game Design Structure (PTPF)

> **Nota archivio ROL-03 (2025-12-02):** il template operativo è stato spostato
> in `docs/archive/evo-tactics/guides/` con copia di inventario in
> `docs/incoming/archive/2025-12-19_inventory_cleanup/playbook_template_ptpf.md`.

Questo template fornisce i campi minimi da compilare quando si introdurrà un nuovo
modulo Evo-Tactics (missione, specie, rituale di telemetria). Ogni sezione include
esempi concreti, note di completamento e riferimenti diretti agli asset del pack.

> **Come usarlo**: duplica il file, sostituisci le parti in corsivo e conserva le
> checklist per assicurare la qualità del deliverable. Gli esempi riportati derivano
> dagli asset attivi (`docs/evo-tactics-pack/`) e possono essere copiati come base.

## 1. Vision & Tone

| Campo                 | Descrizione                                                | Esempio                                      |
| --------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| **Tag**               | Identificatore univoco (`@VISION_CORE`, `@MISSION_ARC_X`). | `@VISION_CORE`                               |
| **Setting**           | Contesto narrativo/ambientale.                             | "Recupero di biosfere sintetiche orbitanti"  |
| **Esperienza target** | Sensazioni ricercate dal team.                             | "Pressione costante, collaborazione tattica" |
| **Tone guardrail**    | Elementi da evitare.                                       | "No elementi fantasy, no comic relief"       |

**Checklist**

- [ ] Allineare il tono con `docs/02-PILASTRI.md`.
- [ ] Collegare la missione a un arco esistente nel catalogo (`catalog_data.json`).

## 2. Tactical System

| Campo                 | Descrizione                           | Esempio Evo-Tactics                                                                                                        |
| --------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard anchors** | Widget o viste UI da aggiornare.      | `Encounter Timeline`, `VC Alert Panel`, `Loadout Slots`.                                                                   |
| **Outcome attesi**    | Risultati misurabili.                 | "Ridurre drift medio < 0.16" (ref `reports/trait_balance_summary.md`).                                                     |
| **Vincoli**           | Limiti hard (slot PI, rarità, timer). | "Max 2 trait `@VC_ALERT` per missione", timer 12' (coordinato con `docs/mission-console/data/flow/validators/biome.json`). |
| **Rehydration**       | Processo per reiniettare i dati.      | Pipeline `incoming/docs/bioma_encounters.yaml` → aggiornamento `packs/evo_tactics_pack/data/species.yaml`.                 |

**Checklist**

- [ ] Aggiornare `docs/evo-tactics-pack/ui/elements.ts` con eventuali nuovi componenti o parametri.
- [ ] Documentare i vincoli in `docs/mission-console/data/flow/validators/biome.json` e sincronizzarli con `docs/process/traits_checklist.md`.

## 3. Form & Mutation Management

| Campo             | Descrizione                                     | Esempio Evo-Tactics                                                                                                 |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Packet Types**  | Gruppi di mutazioni coinvolte.                  | `Mutation Pack C` (sinergia Support/Analyst) definito in `packs/evo_tactics_pack/data/species.yaml`.                |
| **Shape Biasing** | Regole per distribuzione delle forme per bioma. | Matrice `biomes/terraforming_bands.yaml` con pesi 0.2/0.35/0.45.                                                    |
| **Visibility**    | Come i giocatori percepiscono i limiti.         | Dashboard `docs/mission-console/index.html` + diagnostica `docs/mission-console/data/flow/traits/diagnostics.json`. |
| **DriftLock**     | Condizioni che invalidano la missione.          | Drift cumulativo > 0.18 → fallback `scripts/drift_check.js`.                                                        |

**Checklist**

- [ ] Inserire i nuovi trait in `packs/evo_tactics_pack/data/species.yaml` e aggiornarne i metadata.
- [ ] Aggiornare la tabella di compatibilità in `docs/evo-tactics-pack/env-traits.json` e validare con `npm run docs:lint`.

## 4. Telemetry & VC Tracking

| Campo                | Descrizione                | Esempio Evo-Tactics                                                                                                              |
| -------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Input**            | Fonti dati operative.      | Export `reports/trait_progress.md`, dataset `reports/pathfinder_trait_gap.csv`.                                                  |
| **Output**           | Report o trigger generati. | Ticket `QA-VC-214` + diff `reports/daily_tracker_summary.json`.                                                                  |
| **Alert Thresholds** | Valori soglia e azioni.    | Drift > 0.18 → attivare `scripts/api/telemetry_alerts.py`; adozione trait < 55% → aggiornare `reports/trait_balance_summary.md`. |
| **Review Mode**      | Strumenti di analisi.      | Dashboard `analytics/dashboards/campaignProgress.vue`, CLI `incoming/docs/yaml_validator.py`.                                    |

**Checklist**

- [ ] Validare i dataset con `incoming/docs/yaml_validator.py` e registrare l'esito in `docs/playtest/`.
- [ ] Aggiornare gli script di analisi in `analytics/` e sincronizzare i report in `reports/trait_progress.md`.

## 5. Encounter & Biome Engine

| Campo                  | Descrizione                              | Esempio Evo-Tactics                                                                                     |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Generator**          | Algoritmo o script usato.                | `docs/mission-console/data/flow/generation/species.json` (seed `mission-helix-023`).                    |
| **Spotlight**          | Focus meccanico.                         | Scontro "Cavitation Rift" che premia mutazioni Aquatic Support.                                         |
| **Compatibilità MBTI** | Mappatura missione ↔ profili giocatore. | Vanguard → ENTJ, Support → INFJ (ref `docs/evo-tactics-pack/species-index.json`).                       |
| **Load**               | Come vengono caricati gli encounter.     | Precompilati via `docs/mission-console/data/flow/generation/species-preview.json` con fallback runtime. |

**Checklist**

- [ ] Sincronizzare `incoming/docs/bioma_encounters.yaml` con gli aggiornamenti e rigenerare `catalog_data.json`.
- [ ] Verificare la difficoltà con due run QA registrate in `docs/playtest/SESSION-*/`.

## 6. Playtest Loop

| Campo                 | Descrizione                          | Esempio Evo-Tactics                                                                                                                 |
| --------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Iteration Tracker** | Parametri registrati.                | Loop `PT-EVO-019`, `stress_level: 0.63`, `mutation_stability: 0.78`.                                                                |
| **Routine**           | Sequenza di test automatici/manuali. | `npm run docs:lint`, `scripts/run_playtest_ci.sh`, sessione manuale 30'.                                                            |
| **Entry Criteria**    | Requisiti iniziali.                  | Catalogo sincronizzato (`docs/evo-tactics-pack/catalog_data.json`) e seed `docs/mission-console/data/flow/generation/species.json`. |
| **Exit Criteria**     | Condizioni di chiusura.              | Zero blocker, drift < 0.18, esiti QA caricati in `docs/playtest/SESSION-2025-11-12/feedback/README.md`.                             |

**Checklist**

- [ ] Registrare gli esiti in `docs/playtest/` seguendo la guida dedicata e allegare i log telemetrici pertinenti.
- [ ] Aggiornare il tracker `docs/qa-checklist.md` con i risultati del ciclo.

## 7. Linking & Traceability

- **Anchor Map**: elenca le relazioni principali (`@VISION_CORE ↔ @TACTICS_CORE`) citando gli ID missione da `catalog_data.json`.
- **Receipts**: link a commit, issue tracker o report QA e registra il riferimento in `docs/archive/evo-tactics/integration-log.md` con tag `DOC-XX`.
- **Altre note**: strumenti usati, esperimenti non adottati, follow-up (es. link a `incoming/lavoro_da_classificare/security.yml`).

## 8. Drift Guards

| Guardrail      | Descrizione                                              | Azione correttiva                               |
| -------------- | -------------------------------------------------------- | ----------------------------------------------- |
| Tone Lock      | Evitare deviazioni da techno-biologico.                  | Rieseguire sessione di review con narrativa.    |
| Structure Lock | Garantire moduli packetizzati (no freeform).             | Applicare `scripts/drift_check.js`.             |
| Telemetry Lock | Ogni variazione deve essere YAML-valid e receipt-tagged. | Bloccare merge finché la validazione non passa. |

## 9. Repo Tools & Extensions

- `/tools/obsidian-template.md` — per vault locale condiviso.
- `/scripts/yaml_validator.py` — validatore di dataset.
- `/hooks/drift_check.js` — pre-commit check per delta drift.
- `/docs/structure_overview.md` — mappa generale per cross-repo linking.
- `/docs/evo-tactics-pack/README.md` — riepilogo degli asset sincronizzati.
- `/incoming/lavoro_da_classificare/init_security_checks.sh` — audit sicurezza per i deploy Evo-Tactics.

**[END TEMPLATE — Evo-Tactics PTPF Seed · v1.1]**
