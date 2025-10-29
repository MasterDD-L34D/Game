# Evo Tactics — Documentazione (indice)

- [01 Visione](01-VISIONE.md)
- [02 Pilastri di Design](02-PILASTRI.md)
- [03 Loop di Gioco](03-LOOP.md)

## Sistema
- [10 Sistema Tattico (TV/d20)](10-SISTEMA_TATTICO.md)
- [11 Regole TV/d20 specifiche](11-REGOLE_D20_TV.md)

## Contenuti & Progressione
- [20 Specie & Parti (catalogo + budget)](20-SPECIE_E_PARTI.md)
- [22 Forme Base (16) + pacchetti PI](22-FORME_BASE_16.md)
- [24 Telemetria VC (Aggro/Risk/…)](24-TELEMETRIA_VC.md)
- [25 Regole Sblocco + Economia PE](25-REGOLE_SBLOCCO_PE.md)
- [27 Mating / Nido (reclutamento & riproduzione)](27-MATING_NIDO.md)
- [28 NPG, Biomi, Affissi & Director](28-NPC_BIOMI_SPAWN.md)

## Interfaccia & Produzione
- [30 UI TV — Carta Temperamentale & Albero Evolutivo](30-UI_TV_IDENTITA.md)
- [40 Roadmap / MVP → Alpha](40-ROADMAP.md)

## Dati & Appendici
- `data/species.yaml` (catalogo Specie & Parti)
- `tools/*` (validator Python/TS)
- Appendici: Canvas integrali
  - [A — Canvas originale (testuale)](../appendici/A-CANVAS_ORIGINALE.txt)
  - [C — NPG & Biomi (testuale)](../appendici/C-CANVAS_NPG_BIOMI.txt)
  - [D — Accoppiamento/Mating (testuale)](../appendici/D-CANVAS_ACCOPPIAMENTO.txt)

## Tracker operativi e log

### Operativo (checklist)

| File | Titolo | Scopo | Owner attuale | Ultimo aggiornamento | Percorso |
| --- | --- | --- | --- | --- | --- |
| action-items.md | Action Items — Sintesi operativa | Sintesi quotidiana attività cross-team e follow-up PR giornalieri. | UI Systems · Progression Design · VFX/Lighting · QA Support | 2025-11-07 | `docs/checklist/action-items.md` |
| bug-intake.md | Bug Intake Checklist | Verifica dati obbligatori prima del triage ticket. | N/D | N/D | `docs/checklist/bug-intake.md` |
| clone-setup.md | Procedura di clone e setup iniziale | Istruzioni ambiente standard container /workspace/Game. | Ops/ChatGPT | 2025-11-12 | `docs/checklist/clone-setup.md` |
| demo-release.md | Checklist release demo pubblica | Passi di coordinamento per bundle demo Evo Tactics Pack. | N/D | N/D | `docs/checklist/demo-release.md` |
| milestones.md | Checklist Milestone | Stato avanzamento milestone telemetria/dataset/playtest. | N/D | N/D | `docs/checklist/milestones.md` |
| project-setup-todo.md | TODO Operativo — Avvio completo del progetto | Sequenza end-to-end per rendere operativo il progetto con note storiche. | Ops/ChatGPT · Release Ops · Marketing Ops · Lead Dev Tools | 2025-11-20 | `docs/checklist/project-setup-todo.md` |
| telemetry.md | Checklist — Telemetry Export & QA Filters | Controlli giornalieri/settimanali su export telemetria e filtri QA. | N/D | N/D | `docs/checklist/telemetry.md` |
| vc_playtest_plan.md | Playtest VC Mirati alla Telemetria | Piano sessioni mirate agli indici VC e setup strumentazione. | N/D | N/D | `docs/checklist/vc_playtest_plan.md` |

### Processo

| File | Titolo | Scopo | Owner attuale | Ultimo aggiornamento | Percorso |
| --- | --- | --- | --- | --- | --- |
| incident_reporting_table.md | Registro Segnalazioni Cross-Team — Implementazione Operativa | Configurazione tabella Airtable e permessi per segnalazioni condivise. | N/D | N/D | `docs/process/incident_reporting_table.md` |
| qa_hud.md | QA — HUD Smart Alerts | Metriche e pipeline QA per monitorare ack/filter ratio degli alert HUD. | QA lead | N/D | `docs/process/qa_hud.md` |
| qa_reporting_schema.md | QA Telemetry & Segnalazioni — Schema condiviso | Panorama fonti dati QA, campi disponibili e gap di reporting. | N/D | N/D | `docs/process/qa_reporting_schema.md` |
| telemetry_ingestion_pipeline.md | Pipeline Dati Telemetria → Tabella QA/Design | Flusso di ingestione telemetria, snapshot visuali e modulo QA manuale. | N/D | N/D | `docs/process/telemetry_ingestion_pipeline.md` |
| traits_checklist.md | Checklist iterativa tratti | Step incrementali per aggiungere/revisionare tratti con controlli dati. | N/D | N/D | `docs/process/traits_checklist.md` |
| web_handoff.md | Web Handoff · Foodweb Archetypes 2025-11-05 | Nota di consegna verso team web/UI con archetipi ruolo×bioma aggiornati. | N/D | 2025-11-05 | `docs/process/web_handoff.md` |
| web_pipeline.md | Pipeline web · Procedura di rilascio | Processo end-to-end per promuovere la web experience su GitHub Pages. | N/D | N/D | `docs/process/web_pipeline.md` |

### Log & metriche

| File | Titolo | Scopo | Owner attuale | Ultimo aggiornamento | Percorso |
| --- | --- | --- | --- | --- | --- |
| chatgpt_sync.log | Log sincronizzazione ChatGPT | Cronologia esecuzioni `scripts/chatgpt_sync.py` e diff generati. | N/D | 2025-10-24 | `logs/chatgpt_sync.log` |
| chatgpt_sync_last.json | Snapshot ultima sincronizzazione ChatGPT | Esito strutturato dell'ultima run con percorsi export/diff. | N/D | 2025-10-24 | `logs/chatgpt_sync_last.json` |
| drive/2025-11-XX-dryrun.json | Drive sync dry-run | Stato dry-run `convertYamlToSheetsDryRun()` e azioni suggerite. | N/D | 2025-11-XX | `logs/drive/2025-11-XX-dryrun.json` |
| exports/2025-11-08-filter-selections.md | Telemetry Export — Log interazioni filtri | Audit settimanale applicazione filtri export (Analytics/Support). | Analytics · Support | 2025-11-08 | `logs/exports/2025-11-08-filter-selections.md` |
| traits_tracking.md | Monitoraggio inventario trait | Aggiornamenti periodici copertura trait/specie e risultati validator. | N/D | 2025-11-16 | `logs/traits_tracking.md` |
| trait_audit.md | Trait Data Audit | Stato errori/warning dataset trait. | N/D | N/D | `logs/trait_audit.md` |
| web_status.md | Programmazione riesami sito web | Agenda e checklist riesami settimanali sito con azioni QA. | N/D | N/D | `logs/web_status.md` |
| qa/latest-dashboard-metrics.json | Dashboard & generator metrics snapshot | Metriche più recenti per dashboard/generator con audit accessibilità. | N/D | 2025-10-27 | `logs/qa/latest-dashboard-metrics.json` |
| qa/dashboard_metrics.jsonl | Storico metriche dashboard | Append log JSONL con run successive e confronti visual regression. | N/D | 2025-10-27 | `logs/qa/dashboard_metrics.jsonl` |
| tooling/2025-10-24-tooling.md | 2025-10-24 — Verifica ambiente & toolchain | Verifica versioni e operazioni tooling (npm, pip, CLI). | N/D | 2025-10-24 | `logs/tooling/2025-10-24-tooling.md` |

### Pianificazione

| File | Titolo | Scopo | Owner attuale | Ultimo aggiornamento | Percorso |
| --- | --- | --- | --- | --- | --- |
| roadmap.md | Roadmap Operativa | Procedura settimanale post-ottobre 2025 con milestone e follow-up. | N/D | N/D | `docs/piani/roadmap.md` |

### Appendici di stato

| File | Titolo | Scopo | Owner attuale | Ultimo aggiornamento | Percorso |
| --- | --- | --- | --- | --- | --- |
| A-CANVAS_ORIGINALE.txt | Canvas A — Originale | Visione principale con note telemetria/Resonance Shards. | N/D | 2025-10-23 | `appendici/A-CANVAS_ORIGINALE.txt` |
| C-CANVAS_NPG_BIOMI.txt | Canvas C — NPG & Biomi | Canvas NPG reattivi, biomi e protocolli soccorso. | N/D | 2025-10-23 | `appendici/C-CANVAS_NPG_BIOMI.txt` |
| D-CANVAS_ACCOPPIAMENTO.txt | Canvas D — Mating, Reclutamento & Nido | Canvas sistemi attrazione, nido e ereditarietà parti. | N/D | 2025-10-23 | `appendici/D-CANVAS_ACCOPPIAMENTO.txt` |
