---
title: Visione & Struttura Concettuale Evo-Tactics
description: Guida alla mappa concettuale drift-locked e alle raccomandazioni PrimeTalk per Evo-Tactics.
tags:
  - evo-tactics
  - visione
  - struttura
updated: 2025-11-12
---

# Evo-Tactics · Visione & Struttura Concettuale

Questa guida descrive la visione condivisa del progetto Evo-Tactics e la struttura
che governa i flussi di gioco, dalla generazione delle missioni fino alla
telemetria di ritorno. I contenuti sostituiscono il precedente schema
"placeholder" con indicazioni concrete basate sul catalogo pack e sugli obiettivi
PTPF.

## 1. Visione di prodotto

| Elemento | Descrizione |
| --- | --- |
| **Premessa** | Squadre ibride di esploratori bio-tecnologici recuperano ecosistemi instabili attraverso missioni rapide e ripetibili. |
| **Esperienza giocatore** | Decisioni tattiche veloci, feedback leggibili sulle mutazioni equipaggiate e senso di progressione condivisa del team. |
| **Tone guide** | Techno-biologico, tensione scientifica, linguaggio operativo (evitare elementi fantasy o tono comico). |
| **Deliverable chiave** | Catalogo missioni, registri trait, dashboard telemetria, kit di onboarding per nuovi designer. |

## 2. Pilastri tattici

1. **Adattamento progressivo** — ogni missione aggiorna il profilo mutazione del
   team. Le carte specie disponibili dipendono dal drift cumulativo registrato in
   `catalog_data.json`.
2. **Leggibilità delle scelte** — dashboard UI (vedi `docs/evo-tactics-pack/ui/`)
   mostra sempre rarià, costo e compatibilità VC delle forme selezionate.
3. **Sinergia di squadra** — ruoli complementari (Support, Vanguard, Analyst)
   condividono pool di risorse. I pacchetti loadout definiscono trigger combinati
   e condizioni di fallimento.
4. **Telemetria attuabile** — il sistema VC genera alert quando il tasso di
   utilizzo di un trait scende sotto soglia o quando il drift supera 0.18;
   l'alert produce ticket nel registro playtest.

## 3. Struttura ad anello (loop principali)

| Loop | Input | Output | Note |
| --- | --- | --- | --- |
| **Strategic Loop** | Briefing missione + stato ecosistema | Obiettivi dinamici e vincoli PI | Aggiorna la tabella `mission-console/strategic.md`. |
| **Mutation Loop** | Trait equipaggiati + log telemetria | Nuove forme/limitazioni | Sincronizzato con `packs/evo_tactics_pack/traits/`. |
| **Encounter Loop** | Seed bioma + modulatore difficoltà | Sequenza incontri adattiva | Basato su `incoming/docs/bioma_encounters.yaml`. |
| **Review Loop** | Dati post-missione | Report delta drift + suggerimenti bilanciamento | Alimenta il canale QA e `reports/` del pack. |

## 4. Trasversalità team

- **Design ↔ Data**: ogni nuova missione deve includere ID e tag per l'estrazione
  automatica (`mission_id`, `biome_id`, `mutation_focus`).
- **Design ↔ Engineering**: utilizzare `scripts/update_evo_pack_catalog.js` per
  rigenerare gli asset quando vengono introdotte specie o hazard.
- **Design ↔ QA**: registrare nel Playtest Loop (vedi sezione successiva) le
  condizioni riprodotte e gli esiti, allegando gli hash delle versioni esportate.

## 5. Playtest & Metriche

- **Playtest Loop**
  - Identificatore: `PT-EVO-<numero>` con link a `docs/playtest/`.
  - Parametri da tracciare: `stress_level`, `mutation_stability`, `encounter_delta`.
  - Checklist: replicare almeno due missioni per livello di difficoltà, verificare
    la presenza di tutorial inline per nuove specie.
- **Metriche operative**
  - `Drift Index`: media ponderata delle mutazioni adottate, target 0.12 ±0.03.
  - `Engagement Session`: durata mediana di 22 minuti per missione completa.
  - `Trait Adoption`: almeno 65% di varianti utilizzate entro tre sessioni.

## 6. Workflow suggerito

1. **Ingestione** — importare nuovi materiali in `incoming/docs/` e registrarli in
   `incoming/lavoro_da_classificare/tasks.yml`.
2. **Normalizzazione** — convertire i file con `pandoc`, applicare il frontmatter
   e verificare i link con `npm run docs:lint`.
3. **Validazione** — aggiornare il catalogo tramite gli script in `scripts/` e
   verificare le metriche con i tool in `analytics/`.
4. **Pubblicazione** — sincronizzare gli asset statici (`scripts/sync_evo_pack_assets.js`) e
   aggiornare l'indice generale (`docs/INDEX.md`).

## 7. Risorse di supporto

- `docs/evo-tactics-pack/README.md` — panoramica degli asset distribuiti con il pack.
- `docs/playtest-log-guidelines.md` — formato unico per i log di playtest.
- `tools/drift-check/` — utilità per calcolare rapidamente il drift index su file JSON.

**[END: Visione & Struttura · Evo-Tactics]**
