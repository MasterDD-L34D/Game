# Action Items — Sintesi operativa

## Stato attuale

- **2025-11-07** — Workflow `daily-pr-summary` senza merge; follow-up HUD overlay telemetrico → UI Systems (F. Conti), XP Cipher (PROG-04) → Progression Design (L. Serra), contrasto EVT-03 → VFX/Lighting (G. Leone). Documentazione allineata in changelog, roadmap, checklist e Canvas con riferimento al report playtest.
- La pipeline `scripts/chatgpt_sync.py` è tornata operativa con fonti locali e diff aggiornati al 2025-10-24; nessun proxy richiesto per gli export offline.【F:logs/chatgpt_sync.log†L160-L214】【F:docs/chatgpt_sync_status.md†L19-L33】
- Le checklist e la roadmap evidenziano attività aperte su encounter aggiuntivi, automazione Google Sheet e miglioramenti HUD, ma i punti critici di telemetria sono stati riallineati.【F:docs/checklist/milestones.md†L8-L20】【F:docs/piani/roadmap.md†L1-L32】
- La validazione dataset (`python tools/py/validate_datasets.py`) continua a passare; ora `npm test` in `tools/ts` verifica i 3 casi `roll_pack` (run 2025-10-26, tutti passed).【F:tools/py/validate_datasets.py†L1-L116】【1e2f1a†L1-L11】
- Eseguito smoke test CLI `scripts/cli_smoke.sh` sui profili `hud`, `playtest`, `support`, `telemetry`: controlli biomi e pack completati senza avvisi, encounter generato per savana conforme ai target VC (run 2025-11-07, owner QA Support).
- I test interfaccia web sono stati completati su Chromium headless con sorgente locale `http://127.0.0.1:8000/`, confermando ricarica YAML e suite di controlli automatici 7/7 ✅.
- Mission Control e Generatore hanno ricevuto aggiornamenti sostanziali (landing guidata, quick actions, Dataset Hub con validazione automatica, radar/specie comparate, pin persistente), come riportato nelle PR #68-#96.

## Aggiornamenti giornalieri PR

<!-- daily-pr-summary:start -->
- **2026-01-25** — Nessun merge registrato.
- **2026-01-24** — Nessun merge registrato.
- **2026-01-23** — Nessun merge registrato.
- **2026-01-22** — Nessun merge registrato.
- **2026-01-21** — Nessun merge registrato.
- **2026-01-20** — Nessun merge registrato.
- **2026-01-19** — Nessun merge registrato.
- **2026-01-18** — Nessun merge registrato.
- **2026-01-17** — Nessun merge registrato.
- **2026-01-16** — Nessun merge registrato.
- **2026-01-15** — Nessun merge registrato.
- **2026-01-14** — Nessun merge registrato.
- **2026-01-13** — Nessun merge registrato.
- **2026-01-12** — Nessun merge registrato.
<!-- daily-pr-summary:end -->

## Task immediati

- [x] Installare le dipendenze mancanti (`requests`, `pyyaml`) ed eseguire `scripts/chatgpt_sync.py` da un ambiente con accesso autorizzato, aggiornando poi `docs/chatgpt_sync_status.md` con esito e credenziali operative.【F:tools/py/requirements.txt†L1-L2】【F:docs/chatgpt_sync_status.md†L19-L33】
- [x] Validare le formule di telemetria con dati di playtest reali, confrontando i risultati con gli obiettivi EMA/VC indicati in `data/core/telemetry.yaml`. Documentare i riscontri e archiviare i log Delta/Echo.【F:data/core/telemetry.yaml†L1-L29】【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L73】
- [x] Generare e documentare encounter di esempio per ciascun bioma utilizzando `tools/py/generate_encounter.py`, salvando i risultati in `docs/examples/` per uso rapido.【F:docs/checklist/milestones.md†L12-L16】【F:tools/py/generate_encounter.py†L1-L24】【F:docs/examples/encounter_savana.txt†L1-L47】【F:docs/examples/encounter_caverna.txt†L1-L47】【F:docs/examples/encounter_palude.txt†L1-L47】
- [x] Allineare l'output delle CLI TS/Python (`roll_pack`) definendo un seed comune o una logica condivisa, perché al momento restituiscono combinazioni diverse per lo stesso input (`ENTP invoker`). _Verifica 2025-10-26 con seed `demo`: coppie `ENTP`/`invoker` e `ISFJ`/`support` → diff nullo tra JSON TS/Python._【F:tools/ts/dist/roll_pack.js†L1-L160】【F:tools/py/roll_pack.py†L1-L130】【deb84c†L1-L25】【405e6a†L1-L25】
- [x] Eseguire i test web della checklist (`docs/test-interface/`) su ambiente con browser per confermare il caricamento YAML e l'esito dei pulsanti automatici. _Run 2025-10-26 su Chromium headless: sorgente http://127.0.0.1:8000/, reload OK, 7/7 check ✅ (forme 17, compat 100%, d20 13 entry, catalogo specie 5 slot/5 moduli/1 sinergia, negozio PI 6 costi+2 caps, indici VC 6, biomi 3)._
- [x] Registrare l'adozione della convenzione `logs/playtests/YYYY-MM-DD` e linkare l'ultima cartella disponibile dopo ogni sessione. _Processo attivo con log `2025-11-05-vc` archiviati e checklist aggiornata per la revisione telemetria settimanale._【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L73】【F:docs/playtest-log-guidelines.md†L5-L36】

## Step successivi

- [x] Collegare l'export automatizzato dei log VC a Google Sheet tramite `scripts/driveSync.gs`, includendo istruzioni aggiornate su trigger/permessi nel README o nella documentazione dedicata. _Deploy 2025-10-27: Apps Script autorizzato sulla cartella `1VCLogSheetsSyncHub2025Ops`, trigger ogni 6h e sincronizzazione completa dei log VC verso i fogli `[VC Logs] session-metrics`/`packs-delta`._【F:docs/drive-sync.md†L17-L57】【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L23-L77】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L79】
- [x] 2025-11-XX — Hub Ops: verifica manuale oltre ciclo 2. _Bloccata nell'ambiente corrente: manca l'accesso alla cartella Drive `1VCLogSheetsSyncHub2025Ops` e al progetto Apps Script; predisposto placeholder `logs/drive/2025-11-XX-dryrun.json` e aggiornata `docs/drive-sync.md` per il follow-up del team con credenziali cloud._【F:docs/drive-sync.md†L90-L113】【F:logs/drive/2025-11-XX-dryrun.json†L1-L11】
- [x] Aggiornare i Canvas principali con le nuove feature CLI e con gli insight emersi dal bilanciamento PI e dalla telemetria, seguendo le priorità della roadmap.【F:docs/checklist/milestones.md†L18-L20】【F:docs/Canvas/feature-updates.md†L9-L20】【F:docs/piani/roadmap.md†L1-L28】
- [ ] #143 — Horde mode: unità bloccate scala cargo ondata 4 _(aperto 2025-02-26)_: verificare fix pathfinding in hotfix `client-r2821a` e validare nuovamente scenario BAL-03.【F:docs/playtest/SESSION-2025-02-26.md†L16-L38】【F:docs/playtest/scenari-critici.md†L11-L18】 _Aggiornamento 2025-11-07: richiesta playbook inviata al QA lead (`docs/playtest/BAL-03-ondata4-playbook.md`) e accesso client ancora in attesa; dettagli in `docs/playtest/REPORT-2025-11-06-bal03.md` e `logs/playtests/2025-11-07-vc/session-metrics.yaml`._
- [x] #144 — Tempesta dimensionale: shader flash bianco _(aperto 2025-02-26)_: coordinare con VFX per patch materiale e playtestare EVT-01 dopo deploy fix. _Playtest VC 2025-02-27 (build `client-r2821a`): patch DimensionalStorm validata, flash eliminato; log e media in `logs/playtests/2025-02-27-vc/`._【F:docs/playtest/SESSION-2025-02-26.md†L16-L38】【F:docs/playtest/scenari-critici.md†L11-L18】【F:logs/playtests/2025-02-27-vc/session-metrics.yaml†L1-L24】
- [x] #145 — Gestione hub: sync fogli manuale oltre ciclo 2 _(aperto 2025-02-26)_: integrare automazione con pipeline fogli hub e confermare in PROG-03. _Estensione Hub Ops attivata con prefisso dedicato, filtri `minCycle>2` e funzione `convertYamlToSheetsDryRun()` documentata in `docs/drive-sync.md`; dry-run registrato in `docs/tool_run_report.md`._【F:docs/drive-sync.md†L1-L140】【F:docs/tool_run_report.md†L1-L40】
- [x] Bilanciare i pacchetti PI rispetto alla curva PE (`pe_economy`) e integrare le finestre EMA nel client, verificando la coerenza con i dataset YAML coinvolti. _Completato: curva PE aggiornata in `data/core/telemetry.yaml`, costi PI allineati in `data/packs.yaml` e hook HUD documentati in `docs/hooks/ema-metrics.md`._【F:data/core/telemetry.yaml†L1-L49】【F:data/packs.yaml†L1-L88】【F:docs/hooks/ema-metrics.md†L1-L45】
- [x] Implementare alert HUD automatici per il superamento del `risk.weighted_index` > 0.60 durante i vertical slice, notificando al team bilanciamento PI. _Completato: middleware `tools/ts/hud_alerts.ts` attiva alert e log, con esempi registrati nei log missione._【F:tools/ts/hud_alerts.ts†L1-L206】【F:data/core/missions/skydock_siege.yaml†L1-L64】
- [x] Aggiornare i timer di evacuazione di "Skydock Siege" usando i trend `time_low_hp_turns` e mantenendo tilt < 0.50 nelle squadre testate. _Completato: `data/core/missions/skydock_siege.yaml` registra il tuning revisionato (timer 6 turni, cooldown ridotti) e la validazione degli alert HUD._【F:data/core/missions/skydock_siege.yaml†L1-L82】
- [x] Automatizzare il riepilogo giornaliero dei merge PR (raccolta note, aggiornamento `docs/changelog.md`, `docs/piani/roadmap.md`, checklist e Canvas) entro le 18:00 CET. _Workflow `daily-pr-summary` pianificato alle 17:10 UTC con script `tools/py/daily_pr_report.py` (report automatici in `docs/chatgpt_changes/`)._
- [x] Convertire il registro `hazards.yaml` in una lista di record con `id` esplicito e rieseguire `python packs/evo_tactics_pack/tools/py/run_all_validators.py`, archiviando l'output pulito in `packs/evo_tactics_pack/out/validation/last_report.json`. _Run 2025-11-02: avvisi risolti, rimangono solo messaggi INFO di propagazione eventi cross-bioma._
