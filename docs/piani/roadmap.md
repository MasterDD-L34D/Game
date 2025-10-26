# Roadmap Operativa

## Procedura post-ottobre 2025
1. **Sync settimanale (martedì 15:00 CET)** — Importa log telemetrici e note playtest in `docs/chatgpt_changes/sync-<AAAA-MM-GG>.md`, poi aggiorna `docs/chatgpt_sync_status.md` se cambiano fonti o credenziali.【F:docs/README.md†L13-L24】【F:docs/chatgpt_sync_status.md†L1-L40】
2. **Checklist & log** — Spunta lo stato in `docs/checklist/*.md`, collega `logs/playtests/<data>-vc` e registra eventuali nuovi report nel Nido/telemetria.【F:docs/README.md†L15-L24】【F:docs/checklist/milestones.md†L1-L20】
3. **Roadmap & Canvas** — Aggiorna questa roadmap insieme a `docs/Canvas/feature-updates.md`, includendo highlight HUD e riferimenti ai Canvas specializzati (`DesignDoc-Overview`, `Telemetria-VC`, `PI-Pacchetti-Forme`, `SistemaNPG-PF-Mutazioni`, `Mating-Reclutamento-Nido`).【F:docs/README.md†L5-L38】【F:docs/Canvas/feature-updates.md†L1-L40】
4. **Retro Support/QA (martedì 17:00 CET)** — Porta le domande aperte in `docs/faq.md`, assegna owner/stato e nota eventuali registrazioni onboarding nella sezione dedicata.【F:docs/README.md†L31-L33】【F:docs/faq.md†L1-L80】
5. **Pubblicazione estratti** — Deposita screenshot HUD e asset nella cartella Drive (`docs/presentations/`) e cross-link nei Canvas aggiornati.【F:docs/README.md†L23-L31】【F:docs/presentations/2025-02-vc-briefing.md†L1-L20】
6. **Riepilogo PR giornaliero (entro 18:00 CET)** — Esegui `python tools/py/daily_pr_report.py --repo <owner/repo> --date <YYYY-MM-DD>` oppure verifica il workflow `daily-pr-summary`; salva l'output in `docs/chatgpt_changes/` e aggiorna changelog, roadmap, checklist e Canvas.【F:docs/README.md†L33-L38】【F:docs/tool_run_report.md†L1-L40】

## Milestone completate (Ondata 1 — 2025-11-03)
> **Aggiornamento 2025-11-03** — Prima ondata completata: la pipeline Drive Sync per i log VC è attiva, il bilanciamento PI/EMA è allineato con i dataset e gli alert HUD oltre soglia 0.60 guidano il nuovo tuning di "Skydock Siege".

1. **Bilanciamento pacchetti PI e telemetria EMA**
   - `telemetry.pe_economy` espone ora curva e costi completi, sincronizzati con `pi_shop` per tutte le opzioni acquistabili.【F:data/telemetry.yaml†L1-L72】【F:data/packs.yaml†L1-L88】
   - Il middleware `tools/ts/hud_alerts.ts` consuma gli eventi `ema.update`, aggiorna l'HUD e notifica il canale `pi.balance.alerts`, con log missione aggiornati nel dossier di tuning.【F:tools/ts/hud_alerts.ts†L1-L206】【F:data/missions/skydock_siege.yaml†L1-L64】
   - `docs/hooks/ema-metrics.md` descrive gli hook condivisi con il team client e i parametri di smoothing approvati per la build VC.【F:docs/hooks/ema-metrics.md†L1-L52】
2. **Alert HUD Risk & rituning “Skydock Siege”**
   - Il mission file registra i nuovi timer (evacuazione 6 turni, cooldown ridotti) e documenta l'attivazione dell'alert HUD >0.60 durante i retest Delta.【F:data/missions/skydock_siege.yaml†L1-L82】
   - I log missione VC includono le finestre EMA e la cronologia degli alert per l'esportazione Drive.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L79】
3. **Automazione export telemetria VC → Drive**
   - `docs/drive-sync.md` contiene ora la procedura autorizzativa e i trigger cron per Apps Script; i run 2025-10-24 e 2025-11-01 confermano la sincronizzazione fogli/log.【F:docs/drive-sync.md†L17-L57】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L79】

## Milestone attive
> **Fase corrente (Ondata 2)** — Pianificare QA manuale, copertura comunicazione release e follow-up documentali post-playtest.

1. **Preparazione QA manuale**
   - Definire scenari critici e checklist sessioni, archiviandoli in `docs/playtest/` per il sign-off QA.【F:docs/checklist/action-items.md†L1-L47】
   - Pianificare playtest interni, raccogliere report `SESSION-*.md` e aprire ticket per i bug confermati.【F:docs/checklist/action-items.md†L1-L47】
2. **Rilascio e comunicazione**
   - Redigere il changelog aggiornato, coordinare annunci marketing e preparare materiali HUD finali per il tag `v0.6.0-rc1`.【F:docs/changelog.md†L1-L40】
   - Allineare roadmap e Canvas con le milestone di release, includendo gli screenshot post-QA e collegando le nuove sintesi ai Canvas tematici creati in `docs/`.【F:docs/DesignDoc-Overview.md†L1-L70】【F:docs/Canvas/feature-updates.md†L1-L40】
3. **Esperienze di Mating e Nido**
   - Estendere `compat_forme` alle restanti 14 forme e definire cross-formula per `base_scores`.【F:data/mating.yaml†L1-L120】
   - Prototipare ambienti interattivi per `dune_stalker` ed `echo_morph`, validando risorse e privacy.【F:data/mating.yaml†L121-L180】
4. **Missioni verticali e supporto live**
   - Preparare il playtest di "Skydock Siege" con obiettivi multilivello e timer di evacuazione.【F:data/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
   - Collegare Reattori Aeon, filtro SquadSync e protocolli di soccorso alla pipeline telemetrica co-op.【F:data/chatgpt/2025-10-23/snapshot-20251023T101500Z.json†L1-L6】
   - Applicare il nuovo layout HUD: grafici risk/cohesion sovrapposti e log esportabili in `.yaml` direttamente da Canvas per i vertical slice.【F:docs/Canvas/feature-updates.md†L9-L20】 _Layout completato con radar/timeline aggiornati; alert automatici >0.60 attivi dal tuning del 2025-11-03._
   - Bilanciare i timer di evacuazione in funzione dei picchi `risk.time_low_hp_turns` registrati nelle squadre Bravo e Charlie, mantenendo l'obiettivo di tilt < 0.50; revisione 2025-11-05 documentata in `data/missions/skydock_siege.yaml`.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L19-L36】【F:data/missions/skydock_siege.yaml†L1-L82】 _Monitorare eventuali regressioni nei prossimi playtest QA._

## Prossimi passi
- Documentare esempi di encounter generati (CLI Python) e associarli a test di difficoltà per ciascun bioma.【F:data/biomes.yaml†L1-L13】 _In corso: radar/specie comparate disponibili nella dashboard generator._
- Collegare i log Delta/Echo alla pipeline Google Sheet dopo la stabilizzazione del nuovo metodo `ema_capped_minmax` per assicurare reporting condiviso.【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L73】【F:docs/drive-sync.md†L1-L52】
- Creare script di migrazione per esportare `telemetry` su Google Sheet via `scripts/driveSync.gs`.
- Automatizzare il riepilogo quotidiano delle PR: raccogliere i merge giornalieri, generare report in `docs/chatgpt_changes/` e aggiornare changelog/roadmap/checklist/Canvas entro le 18:00 CET. _Completato via workflow `daily-pr-summary` (report automatici e aggiornamento marker documentazione)._ 
- Aggiornare i canvas principali con screenshot e note del playtest VC. **Completato** tramite pannello HUD e metriche annotate nel Canvas principale.【F:docs/Canvas/feature-updates.md†L9-L20】
- Integrare esportazione client-side dei log VC (`session-metrics.yaml`) direttamente nella pipeline Drive una volta stabilizzato il tuning risk.
- Formalizzare la pipeline di archiviazione presentazioni in `docs/presentations/` collegando milestone e release.【F:docs/presentations/2025-02-vc-briefing.md†L1-L20】

## Riepilogo PR giornaliero
<!-- daily-pr-summary:start -->
<!-- daily-pr-summary:end -->

## Comunicazioni release VC novembre 2025
- **Riunione cross-team (2025-11-06, 10:30 CET)** — Confermata sala VC Bridge + call Meet per telemetria/client/narrativa. Agenda: revisione metriche QA 2025-11-01, readiness tag `v0.6.0-rc1`, canali di annuncio e checklist supporto live.【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L1-L45】
- **Canali di annuncio** — Preparare messaggio principale in `#vc-launch` (Slack) alle 16:00 CET del 2025-11-07 con link a changelog e Canvas aggiornato; replicare su Drive/Briefing entro le 18:00 con estratto metriche e TODO follow-up.【F:docs/changelog.md†L21-L33】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L45】
- **Timeline tag** — Dopo sign-off della riunione, creare il tag `v0.6.0-rc1`, allegare screenshot HUD aggiornati in Canvas e consegnare ai partner esterni entro il 2025-11-08.【F:docs/Canvas/feature-updates.md†L1-L60】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L45】
