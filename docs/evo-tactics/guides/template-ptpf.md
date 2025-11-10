---
title: Template PTPF Evo-Tactics
description: Struttura PTPF per mantenere coerenza tattica, drift lock e telemetria nel progetto Evo-Tactics.
tags:
  - evo-tactics
  - template
  - ptpf
updated: 2025-11-12
---

# Template — Game Design Structure (PTPF)

Questo template fornisce i campi minimi da compilare quando si introdurrà un nuovo
modulo Evo-Tactics (missione, specie, rituale di telemetria). Ogni sezione include
esempi, note di completamento e riferimenti diretti agli asset del pack.

> **Come usarlo**: duplica il file, sostituisci le parti in corsivo e conserva le
> checklist per assicurare la qualità del deliverable.

## 1. Vision & Tone

| Campo | Descrizione | Esempio |
| --- | --- | --- |
| **Tag** | Identificatore univoco (`@VISION_CORE`, `@MISSION_ARC_X`). | `@VISION_CORE` |
| **Setting** | Contesto narrativo/ambientale. | "Recupero di biosfere sintetiche orbitanti" |
| **Esperienza target** | Sensazioni ricercate dal team. | "Pressione costante, collaborazione tattica" |
| **Tone guardrail** | Elementi da evitare. | "No elementi fantasy, no comic relief" |

**Checklist**
- [ ] Allineare il tono con `docs/02-PILASTRI.md`.
- [ ] Collegare la missione a un arco esistente nel catalogo (`catalog_data.json`).

## 2. Tactical System

| Campo | Descrizione |
| --- | --- |
| **Dashboard anchors** | Widget o viste UI da aggiornare (es. `Loadout Slots`, `Encounter Timeline`). |
| **Outcome attesi** | Risultati misurabili (es. "ridurre drift > 0.20"). |
| **Vincoli** | Limiti hard (slot PI, rarità, timer). |
| **Rehydration** | Processo per reiniettare i dati in telemetria o sessioni successive. |

**Checklist**
- [ ] Aggiornare `docs/evo-tactics-pack/ui/` se servono nuovi componenti.
- [ ] Documentare i vincoli in `mission-console/strategic.md`.

## 3. Form & Mutation Management

| Campo | Descrizione |
| --- | --- |
| **Packet Types** | Gruppi di mutazioni coinvolte (`Mutation Pack A/B/C`). |
| **Shape Biasing** | Regole per distribuzione delle forme per bioma. |
| **Visibility** | Come i giocatori percepiscono i limiti (UI, log, tooltip). |
| **DriftLock** | Condizioni che invalidano la missione se superate. |

**Checklist**
- [ ] Inserire i nuovi trait in `packs/evo_tactics_pack/traits/*.json`.
- [ ] Aggiornare la tabella di compatibilità in `docs/evo-tactics-pack/env-traits.json`.

## 4. Telemetry & VC Tracking

| Campo | Descrizione |
| --- | --- |
| **Input** | Fonti dati (log scelte, trend lanci dadi, ecc.). |
| **Output** | Report o trigger generati. |
| **Alert Thresholds** | Valori soglia e azioni conseguenti. |
| **Review Mode** | Strumenti di analisi (`analytics/`, dashboard esterne). |

**Checklist**
- [ ] Validare i dataset con `incoming/docs/yaml_validator.py`.
- [ ] Aggiornare le pipeline VC in `services/telemetry-vc/` se presenti impatti server.

## 5. Encounter & Biome Engine

| Campo | Descrizione |
| --- | --- |
| **Generator** | Algoritmo o script usato (`bioma roll`, `mission seeds`). |
| **Spotlight** | Focus meccanico (mutazioni vs ambiente, puzzle, ecc.). |
| **Compatibilità MBTI** | Mappatura missione ↔ profili giocatore. |
| **Load** | Come vengono caricati gli encounter (runtime vs precompilati). |

**Checklist**
- [ ] Sincronizzare `incoming/docs/bioma_encounters.yaml` con gli aggiornamenti.
- [ ] Verificare la difficoltà attraverso almeno due run QA.

## 6. Playtest Loop

| Campo | Descrizione |
| --- | --- |
| **Iteration Tracker** | Parametri registrati (Loop ID, Stress Level, Mutation Stability). |
| **Routine** | Sequenza di test automatici/manuali. |
| **Entry Criteria** | Requisiti per iniziare il playtest. |
| **Exit Criteria** | Condizioni per chiudere il ciclo. |

**Checklist**
- [ ] Registrare gli esiti in `docs/playtest/` seguendo la guida dedicata.
- [ ] Allegare i log telemetrici pertinenti.

## 7. Linking & Traceability

- **Anchor Map**: elenca le relazioni principali (`@VISION_CORE ↔ @TACTICS_CORE`).
- **Receipts**: link a commit, issue tracker o report QA.
- **Altre note**: strumenti usati, esperimenti non adottati, follow-up.

## 8. Drift Guards

| Guardrail | Descrizione | Azione correttiva |
| --- | --- | --- |
| Tone Lock | Evitare deviazioni da techno-biologico. | Rieseguire sessione di review con narrativa. |
| Structure Lock | Garantire moduli packetizzati (no freeform). | Applicare `scripts/drift_check.js`. |
| Telemetry Lock | Ogni variazione deve essere YAML-valid e receipt-tagged. | Bloccare merge finché la validazione non passa. |

## 9. Repo Tools & Extensions

- `/tools/obsidian-template.md` — per vault locale condiviso.
- `/scripts/yaml_validator.py` — validatore di dataset.
- `/hooks/drift_check.js` — pre-commit check per delta drift.
- `/docs/structure_overview.md` — mappa generale per cross-repo linking.
- `/docs/evo-tactics-pack/README.md` — riepilogo degli asset sincronizzati.

**[END TEMPLATE — Evo-Tactics PTPF Seed · v1.1]**
