# Roadmap Operativa

## Procedura post-ottobre 2025

1. **Sync settimanale (martedì 15:00 CET)** — Importa log telemetrici e note playtest in `docs/chatgpt_changes/sync-<AAAA-MM-GG>.md`, annota la build `game-cli` utilizzata e aggiorna `docs/chatgpt_sync_status.md` se cambiano fonti, credenziali o profili abilitati.【F:docs/README.md†L11-L30】【F:docs/chatgpt_sync_status.md†L1-L40】
2. **Checklist & log** — Spunta lo stato in `docs/checklist/*.md`, collega `logs/playtests/<data>-vc`, allega i log CLI giornalieri generati da `scripts/cli_smoke.sh` (`logs/cli/smoke-YYYYMMDDTHHMMSSZ.log` o versioni con `--label`/`--log-subdir`) e registra eventuali nuovi report nel Nido/telemetria.【F:docs/README.md†L11-L30】【F:docs/checklist/milestones.md†L1-L20】
3. **Validazione profili CLI** — Confronta le configurazioni in `config/cli/` con i profili attivi, verificando flag obbligatori (`--telemetry-upload`, `--support-escalation`) e documentando gli scostamenti nel blocco `Profili` di `docs/chatgpt_sync_status.md`.【F:docs/README.md†L17-L30】【F:config/cli/support.yaml†L1-L80】
4. **Roadmap & Canvas** — Aggiorna questa roadmap insieme a `docs/Canvas/feature-updates.md`, includendo highlight HUD, riferimenti ai Canvas specializzati (`DesignDoc-Overview`, `Telemetria-VC`, `PI-Pacchetti-Forme`, `SistemaNPG-PF-Mutazioni`, `Mating-Reclutamento-Nido`) e note sulla copertura CLI.【F:docs/README.md†L28-L32】【F:docs/Canvas/feature-updates.md†L1-L40】
5. **Raccolta feedback demo (entro 2h)** — Inviare il modulo Google Form `https://forms.gle/vc-demo-feedback`, salvare l'export CSV in `docs/playtest/tickets/feedback-survey.csv` e popolare il blocco `### Feedback utenti` nel file `INSIGHTS-<YYYY-MM>.md` corrente.【F:docs/playtest/INSIGHTS-2025-11.md†L35-L52】
6. **Retro Support/QA (martedì 17:00 CET)** — Porta le domande aperte in `docs/faq.md`, assegna owner/stato, collega le registrazioni onboarding e pianifica follow-up sulle configurazioni CLI condivise.【F:docs/README.md†L30-L34】【F:docs/faq.md†L1-L120】
7. **Pubblicazione estratti** — Deposita screenshot HUD e asset nella cartella Drive (`docs/presentations/`), citando build CLI e commit di riferimento, quindi cross-link nei Canvas aggiornati.【F:docs/README.md†L28-L32】【F:docs/presentations/2025-02-vc-briefing.md†L1-L20】
8. **Riepilogo PR giornaliero (entro 18:00 CET)** — Esegui `python tools/py/daily_pr_report.py --repo <owner/repo> --date <YYYY-MM-DD>` oppure verifica il workflow `daily-pr-summary`; salva l'output in `docs/chatgpt_changes/` e aggiorna changelog, roadmap, checklist e Canvas includendo le modifiche al refactor CLI.【F:docs/README.md†L32-L38】【F:docs/tool_run_report.md†L1-L40】
9. **Review roadmap & comunicazione** — Ogni martedì 16:30-17:15 CET consolidare gli esiti della review settimanale: aggiornare questa pagina con stato milestone (`RM-*`), elencare bug chiusi o riassegnati e pubblicare riepilogo nel canale `#vc-docs`/Drive per l'allineamento stakeholder.【F:docs/process/qa_reporting_schema.md†L138-L164】

### Tabella di marcia incoming — settimana 2025-11-14

| Slot (CET)             | Focus                                                      | Output atteso                                                                                          | Dipendenze e checklist chiave                                                                                                           |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-11-14 09:30–10:15 | `evo_pacchetto_minimo_v7` — validazioni post-fix unzip     | Log HTML/JSON rigenerati e card spostata in `In validazione` con evidenze aggiornate.                  | Patch `unzip -o` confermata nel maintenance log e checklist triage Pre-sync (`docs/checklist/incoming_triage.md`).                      |
| 2025-11-14 11:00–12:00 | `ancestors_integration_pack_v0_5` — validazione ecosistema | Report JSON/HTML prodotto e smoke CLI `staging_incoming` allegato alla card con nota tuning `AG-Core`. | Dipende dai log dello slot precedente, ruoli caretaker attivi (`docs/process/incoming_triage_pipeline.md`) e checklist Durante la sync. |
| 2025-11-14 15:00–16:00 | `recon_meccaniche.json` — consolidamento insight           | Report investigativo e knowledge base aggiornata con decisione/follow-up.                              | Necessita output dei primi due slot, stime dominio e checklist Post-sync per board/log/archivio.                                        |

La pianificazione dettagliata (comandi/script e log da aggiornare) è disponibile nel backlog agentico (`docs/process/incoming_agent_backlog.md`).

## Mappatura milestone → componenti/feature

| ID    | Milestone                                                  | Componenti / feature principali (`component_tag`)           | Note ticketing                                                                                                            |
| ----- | ---------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| RM-1  | Smart HUD & SquadSync                                      | `hud`, `squadsync`, `telemetry-alerts`, `hud-notifications` | I ticket devono collegare screenshot HUD e log `hud_alert_log`; usare `roadmap_milestone = "RM-1 Smart HUD & SquadSync"`. |
| RM-2  | Export telemetria incrementale                             | `drive-export`, `telemetry-sync`, `schema-validation`       | Allegare esiti script `driveSync.gs` e report conformità; i bug bloccanti vanno segnalati anche in `#support-ops`.        |
| RM-3  | Rilascio e comunicazione                                   | `release-ops`, `marketing-assets`, `visual-regression`      | Collegare diff grafici e materiali marketing; aggiornare checklist comunicazione e pianificare annunci Slack/Drive.       |
| RM-4  | Esperienze di Mating e Nido                                | `nido-experience`, `romance-systems`, `biome-interactions`  | Per bug multi-bioma aprire sotto-task dedicati mantenendo `roadmap_milestone` principale.                                 |
| RM-5  | Missioni verticali e supporto live                         | `mission-design`, `evac-timers`, `squadsync-support`        | Associare log missione e note playtest; i timer evacuazione usano anche `component_tag = mission-design`.                 |
| RM-0  | Bilanciamento pacchetti PI e telemetria EMA _(completata)_ | `pi-balance`, `ema-metrics`, `hud-alerts`                   | Ticket storici rimangono consultabili per regressioni; usare `status = closed` se riaperti come riferimento storico.      |
| RM-0b | Automazione export telemetria VC → Drive _(completata)_    | `drive-export`, `automation`                                | Mantenere collegamento per audit in caso di regressioni o nuove richieste di compliance.                                  |

## Milestone completate (Ondata 1 — 2025-11-03)

> **Aggiornamento 2025-11-03** — Prima ondata completata: la pipeline Drive Sync per i log VC è attiva, il bilanciamento PI/EMA è allineato con i dataset e gli alert HUD oltre soglia 0.60 guidano il nuovo tuning di "Skydock Siege".

1. **Bilanciamento pacchetti PI e telemetria EMA**
   - `telemetry.pe_economy` espone ora curva e costi completi, sincronizzati con `pi_shop` per tutte le opzioni acquistabili.【F:data/core/telemetry.yaml†L1-L72】【F:data/packs.yaml†L1-L88】
   - Il middleware `tools/ts/hud_alerts.ts` consuma gli eventi `ema.update`, aggiorna l'HUD e notifica il canale `pi.balance.alerts`, con log missione aggiornati nel dossier di tuning.【F:tools/ts/hud_alerts.ts†L1-L206】【F:data/core/missions/skydock_siege.yaml†L1-L84】
   - `docs/hooks/ema-metrics.md` descrive gli hook condivisi con il team client, con le finestre EMA aggiornate (0.25/0.35/0.40) e l'idle threshold da 10 s approvato per la build VC.【F:docs/hooks/ema-metrics.md†L1-L52】
2. **Alert HUD Risk & rituning “Skydock Siege”**
   - Il mission file registra il tuning hotfix VC 15/02 (scudi potenziati, medkit anticipati, ack PI in 2 turni) per abbassare `time_low_hp_turns` di Bravo da 11 a <=6.【F:data/core/missions/skydock_siege.yaml†L1-L86】【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L23-L58】
   - I log missione VC includono le finestre EMA e la cronologia degli alert per l'esportazione Drive.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L79】
3. **Automazione export telemetria VC → Drive**
   - `docs/drive-sync.md` contiene ora la procedura autorizzativa e i trigger cron per Apps Script; i run 2025-10-24 e 2025-11-01 confermano la sincronizzazione fogli/log.【F:docs/drive-sync.md†L17-L57】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L79】

## Milestone attive

> **Priorità riviste (Ondata 2)** — Alla luce dei dati di novembre 2025, le smart feature (HUD + SquadSync) precedono l'estensione export; la roadmap integra checkpoint di validazione continui.【F:docs/playtest/INSIGHTS-2025-11.md†L3-L26】

1. **Smart HUD & SquadSync** _(priorità alta)_
   - Playtest pilota 2025-11-12 completato: log HUD/telemetria e media archiviati in `logs/pilot-2025-11-12/` con verifica digest SHA-256 e sintesi pubblicata in `docs/playtest/SESSION-2025-11-12.md` (riepilogo condiviso in `#qa-playtest`).
   - Consolidare gli acknowledgment automatici degli alert risk >0.60 e validare che rientrino entro 2 turni medi su due sessioni consecutive (`alpha`, `bravo`).【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L23-L58】【F:docs/playtest/INSIGHTS-2025-11.md†L4-L19】
   - Integrare messaggi contestuali HUD e aggiornare il Canvas dedicato con screenshot e dati di coesione ≥0.78 post-playtest QA.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L9-L37】【F:docs/Canvas/feature-updates.md†L9-L40】
   - **Follow-up 2025-11-07:** overlay HUD telemetrico (Owner: UI Systems — F. Conti), XP Cipher PROG-04 (Owner: Progression Design — L. Serra), contrasto EVT-03 (Owner: VFX/Lighting — G. Leone) tracciati in checklist/milestones e tool run report; contrasto EVT-03 chiuso il 2025-11-08 con gamma dinamico + toggle glow (vedi log smoke test) mentre gli altri item restano in corso.【F:docs/chatgpt_changes/daily-pr-summary-2025-11-07.md†L1-L15】【F:docs/checklist/milestones.md†L13-L18】【F:docs/tool_run_report.md†L23-L31】【F:logs/playtests/2025-11-08-vfx/contrast-smoke.yaml†L1-L35】
   - **Criteri di uscita:** risk index medio ≤0.58 su roster co-op, durata alert ≤1.5 turni e tilt score <0.50 per due build consecutive.【F:docs/playtest/INSIGHTS-2025-11.md†L8-L19】

2. **Rollout pacchetto Evo Traits** _(priorità media)_
   - Automatizzare l’estrazione `trait_code → slug` eseguendo `python tools/audit/evo_trait_diff.py` ad ogni aggiornamento; i CSV generati (`reports/evo/rollout/traits_normalized.csv`, `reports/evo/rollout/traits_gap.csv`) alimentano lo script di ingest e documentano i trait assenti/presenti nei due cataloghi.【F:tools/audit/evo_trait_diff.py†L20-L371】【F:reports/evo/rollout/traits_gap.csv†L1-L4】
   - Preparare una trasformazione per i consumer server/client che converta automaticamente i codici TR-#### nelle slug legacy, sfruttando l’estratto normalizzato per ricostruire sinergie e biomi e colmare i trait segnalati come `missing_in_index` prima del merge definitivo.【F:reports/evo/rollout/traits_normalized.csv†L1-L5】【F:reports/evo/rollout/traits_gap.csv†L2-L5】
   - Introdurre un feature toggle `includeLegacy=false` nelle integrazioni che leggono `TraitRepository`, mantenendo fallback sul dataset storico finché i 174 trait esclusivi del catalogo legacy non vengono migrati o sostituiti, usando il report `traits_gap.csv` per monitorare la copertura.【F:reports/evo/rollout/traits_gap.csv†L1-L7】【F:server/services/traitRepository.js†L1028-L1064】
   - Allineare i conflitti evidenziati nel merge log (es. `TR-1103`, `TR-1303`) ai task di bilanciamento sinergie, incrociando il flag `merge_conflict` del nuovo report con le note in `reports/traits/merge_analysis.md` per definire owner e regression test specifici.【F:reports/evo/rollout/traits_gap.csv†L150-L160】【F:reports/traits/merge_analysis.md†L24-L32】
3. **Export telemetria incrementale** _(priorità media)_
   - Limitare l'export automatico ai log `session-metrics.yaml` già normalizzati, rinviando gli snapshot bulk finché la milestone Smart HUD non è chiusa.【F:docs/playtest/INSIGHTS-2025-11.md†L22-L25】【F:docs/drive-sync.md†L17-L57】
   - Preparare script di validazione schema e lista di distribuzione Drive, con smoke test su dataset 24/10 → 05/11 per evitare regressioni nei campi risk/cohesion.【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L8-L73】【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L8-L91】
   - **Criteri di uscita:** export schedulato che copre ≥90% dei campi Fase 0 e report di conformità approvato dal team Analytics.
4. **Rilascio e comunicazione** _(priorità media)_
   - Redigere il changelog aggiornato, coordinare annunci marketing e preparare materiali HUD finali per il tag `v0.6.0-rc1`.【F:docs/changelog.md†L1-L40】
   - Allineare roadmap e Canvas con le milestone di release, includendo gli screenshot post-QA e collegando le nuove sintesi ai Canvas tematici creati in `docs/`.【F:docs/DesignDoc-Overview.md†L1-L70】【F:docs/Canvas/feature-updates.md†L1-L40】
   - **Criteri di uscita:** materiali di comunicazione approvati, post Slack programmato e repository Canvas aggiornato con i dati VC novembre 2025.【F:docs/playtest/INSIGHTS-2025-11.md†L3-L19】
5. **Esperienze di Mating e Nido** _(priorità bassa, monitorare)_
   - Estendere `compat_forme` alle restanti 14 forme e definire cross-formula per `base_scores`.【F:data/core/mating.yaml†L1-L120】
   - Prototipare ambienti interattivi per `dune_stalker` ed `echo_morph`, validando risorse e privacy.【F:data/core/mating.yaml†L121-L180】
   - **Checkpoint:** riesaminare la priorità dopo la chiusura di Smart HUD per evitare conflitti di risorse con i playtest VC.

## Milestone in coda

> **Ripianificazione post-Smart HUD** — Gli elementi seguenti restano aperti ma vengono accodati fino al completamento delle priorità Smart HUD/SquadSync.【F:docs/playtest/INSIGHTS-2025-11.md†L3-L26】

1. **Missioni verticali e supporto live** _(in coda)_
   - Preparare il playtest di "Skydock Siege" con obiettivi multilivello e timer di evacuazione.【F:data/external/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
   - Collegare Reattori Aeon, filtro SquadSync e protocolli di soccorso alla pipeline telemetrica co-op.【F:data/external/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
   - Applicare il nuovo layout HUD: grafici risk/cohesion sovrapposti e log esportabili in `.yaml` direttamente da Canvas per i vertical slice.【F:docs/Canvas/feature-updates.md†L9-L20】 _Layout completato con radar/timeline aggiornati; alert automatici >0.60 attivi dal tuning del 2025-11-03._
   - Bilanciare i timer di evacuazione in funzione dei picchi `risk.time_low_hp_turns` registrati nelle squadre Bravo e Charlie, mantenendo l'obiettivo di tilt < 0.50; hotfix VC 15/02 documentato in `data/core/missions/skydock_siege.yaml`.【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L23-L94】【F:data/core/missions/skydock*siege.yaml†L1-L91】 \_Monitorare eventuali regressioni nei prossimi playtest QA.*

## Allineamento stakeholder e checkpoint

- **Retro settimanale VC (martedì 17:00 CET)** — PM, Analytics, QA: revisione alert HUD, aggiornamento metriche risk/cohesion e decisioni di follow-up smart feature.【F:docs/playtest/INSIGHTS-2025-11.md†L22-L26】
- **Review feedback demo (lunedì 17:30 CET)** — Sessione calendario `vc-demo-feedback`: discutere survey Google Form, instradare ticket `hud-feedback`/`analytics-squadsync` e aggiornare roadmap/Canvas con gli insight principali.【F:docs/playtest/INSIGHTS-2025-11.md†L35-L52】
- **Demo quindicinale (venerdì settimana dispari, 15:00 CET)** — Mostrare riduzione alert duration e stato export incrementale a Design Council + Tech Lead; registrare decisioni in `docs/tool_run_report.md`.【F:docs/playtest/INSIGHTS-2025-11.md†L22-L26】【F:docs/tool_run_report.md†L1-L40】
- **Checkpoint roadmap mensile** — Aggiornare questa pagina e `docs/Canvas/feature-updates.md` dopo ogni ciclo di demo per confermare priorità e criteri di uscita.【F:docs/Canvas/feature-updates.md†L1-L40】
- **Review settimanale roadmap & quality (martedì 16:30 CET)** — Consolidare esiti della review: aggiornare tabella mappatura milestone, chiudere o riassegnare bug nel tracker con `roadmap_milestone` coerente e comunicare highlight in `#vc-docs`.【F:docs/process/qa_reporting_schema.md†L138-L164】

## Prossimi passi

- Documentare esempi di encounter generati (CLI Python) e associarli a test di difficoltà per ciascun bioma.【F:data/core/biomes.yaml†L1-L13】 _In corso: radar/specie comparate disponibili nella dashboard generator._
- Collegare i log Delta/Echo alla pipeline Google Sheet dopo la stabilizzazione del nuovo metodo `ema_capped_minmax` per assicurare reporting condiviso.【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L73】【F:docs/drive-sync.md†L1-L52】
- Creare script di migrazione per esportare `telemetry` su Google Sheet via `scripts/driveSync.gs`.
- Automatizzare il riepilogo quotidiano delle PR: raccogliere i merge giornalieri, generare report in `docs/chatgpt_changes/` e aggiornare changelog/roadmap/checklist/Canvas entro le 18:00 CET. _Completato via workflow `daily-pr-summary` (report automatici e aggiornamento marker documentazione)._
- Aggiornare i canvas principali con screenshot e note del playtest VC. **Completato** tramite pannello HUD e metriche annotate nel Canvas principale.【F:docs/Canvas/feature-updates.md†L9-L20】
- Integrare esportazione client-side dei log VC (`session-metrics.yaml`) direttamente nella pipeline Drive una volta stabilizzato il tuning risk.
- Formalizzare la pipeline di archiviazione presentazioni in `docs/presentations/` collegando milestone e release.【F:docs/presentations/2025-02-vc-briefing.md†L1-L20】
- Pubblicare entro le 18:00 CET il riepilogo della review settimanale con link ai ticket chiusi/riassegnati e sezione "Delta roadmap" per il team cross-funzionale (Slack `#vc-docs`, cartella Drive `reports/roadmap/`).【F:docs/process/qa_reporting_schema.md†L138-L164】

## Riepilogo PR giornaliero

<!-- daily-pr-summary:start -->
- **2026-01-15** — Nessun merge registrato.
- **2026-01-14** — Nessun merge registrato.
- **2026-01-13** — Nessun merge registrato.
- **2026-01-12** — Nessun merge registrato.
- **2026-01-11** — Nessun merge registrato.
- **2026-01-10** — Nessun merge registrato.
- **2026-01-09** — Nessun merge registrato.
- **2026-01-08** — Nessun merge registrato.
- **2026-01-07** — Nessun merge registrato.
- **2026-01-06** — Nessun merge registrato.
- **2026-01-05** — Nessun merge registrato.
- **2026-01-04** — Nessun merge registrato.
- **2026-01-03** — Nessun merge registrato.
- **2026-01-02** — Nessun merge registrato.
<!-- daily-pr-summary:end -->

## Comunicazioni release VC novembre 2025

- **Riunione cross-team (2025-11-06, 10:30 CET)** — Confermata sala VC Bridge + call Meet per telemetria/client/narrativa. Agenda: revisione metriche QA 2025-11-05, readiness tag `v0.6.0-rc1`, canali di annuncio e checklist supporto live.【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L102】
- **Canali di annuncio** — Preparare messaggio principale in `#vc-launch` (Slack) alle 16:00 CET del 2025-11-07 con link a changelog e Canvas aggiornato; replicare su Drive/Briefing entro le 18:00 con estratto metriche (risk Delta 0.59, Echo 0.54; coesione 0.72/0.80) e TODO follow-up.【F:docs/changelog.md†L66-L79】【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L88】
- **Timeline tag** — Dopo sign-off della riunione, creare il tag `v0.6.0-rc1`, allegare screenshot HUD aggiornati in Canvas e consegnare ai partner esterni entro il 2025-11-08.【F:docs/Canvas/feature-updates.md†L1-L60】【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L102】
