# Checklist Milestone

## Setup iniziale
- [x] Caricati dataset YAML di base (biomi, pacchetti PI, mating, telemetria).【F:data/core/biomes.yaml†L1-L17】【F:data/packs.yaml†L1-L88】【F:data/core/mating.yaml†L1-L32】【F:data/core/telemetry.yaml†L1-L29】
- [x] Pubblicati script CLI per roll pack e encounter (`tools/ts`, `tools/py`).

## In corso
- [x] Espandere `compat_forme` per coprire tutte le 16 forme MBTI.【F:data/core/mating.yaml†L1-L32】
- [x] Validare le formule di telemetria con dati di playtest reali.【F:data/core/telemetry.yaml†L1-L29】
  - [x] Pianificate ed eseguite sessioni Alpha/Bravo/Charlie con logging coerente con gli indici VC definiti.【F:docs/checklist/vc_playtest_plan.md†L1-L33】【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L1-L125】
  - [x] Confrontati gli indici con le soglie EMA: Bravo supera risk 0.60, richiesta revisione timer scudi; Alpha vicino al limite Enneagram Conquistatore.【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L23-L58】【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L59-L94】
  - [x] Aggiornate le formule di normalizzazione (`ema_capped_minmax`) e introdotti eventi `overcap_guard` per attenuare i picchi multipli, verificando i risultati nelle sessioni Delta/Echo.【F:data/core/telemetry.yaml†L2-L25】【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L73】
  - [x] Sessione pilota 2025-11-12 chiusa: screenshot/video e telemetria verificati con digest SHA-256, feedback consolidato e riepilogo notificato in `#qa-playtest`.【F:logs/pilot-2025-11-12/telemetry/damage.json†L1-L19】【F:docs/playtest/SESSION-2025-11-12.md†L16-L54】
- [x] Creare esempi di encounter documentati per ciascun bioma.【F:data/core/biomes.yaml†L1-L13】 _Aggiornati file in `docs/examples/encounter_*.txt` con seed `demo` (2025-10-26)._
- [ ] Implementare overlay HUD telemetrico per mostrare soglie risk/cohesion durante i playtest, come richiesto dal report 2025-11-12. _Owner: UI Systems (F. Conti) · Stato: in corso, mock aggiornato atteso per 2025-11-09._【F:docs/playtest/SESSION-2025-11-12.md†L36-L49】
- [ ] Ribilanciare l'XP del profilo Cipher nello scenario PROG-04 per eliminare il gap -3.7% osservato nel playtest pilota. _Owner: Progression Design (L. Serra) · Stato: in corso, analisi telemetrica programmata entro 2025-11-08._【F:docs/playtest/SESSION-2025-11-12.md†L24-L40】
- [ ] Migliorare il contrasto dell'evento EVT-03 durante l'eclissi, mitigando il feedback QA sul basso contrasto ai minuti 2-3. _Owner: VFX/Lighting (G. Leone) · Stato: assegnato, primo pass shader entro 2025-11-09._【F:docs/playtest/SESSION-2025-11-12.md†L24-L40】

## Completare prossimamente
- [x] Collegare esport automatizzato dei log VC a Google Sheet (`scripts/driveSync.gs`).
  - Fogli di riferimento: [VC Telemetry Sync](https://docs.google.com/spreadsheets/d/1VCExampleTelemetrySync/edit) · [PI Packs Sync](https://docs.google.com/spreadsheets/d/1PIExamplePacksSync/edit)
  - 2025-10-27 · ✅ Esecuzione validata su Apps Script: trigger ogni 6h attivo, fogli `[VC Logs] session-metrics`/`packs-delta` aggiornati senza duplicati, verificati contro i log VC recenti.【F:docs/drive-sync.md†L33-L57】【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L23-L77】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L79】
- [x] Aggiornare i Canvas principali con note sulle nuove feature CLI.【F:docs/Canvas/feature-updates.md†L3-L40】

## Milestone Web
- [ ] Eseguire `scripts/run_deploy_checks.sh` per validare bundle statico (docs/test-interface, data) · 2025-10-27 fallito (HTTP 403 download Chromium Playwright dal mirror AzureEdge, dataset `data/derived/mock/prod_snapshot`).
  - ❌ Installazione browser Playwright bloccata da `Domain forbidden` durante `npx playwright install chromium` (retry con `--with-deps` incluso) → suite TypeScript/Playwright e `pytest` non avviate.
  - ⏳ Ripetere la validazione dopo aver predisposto mirror/caching Playwright o pacchetto offline in artefatti CI.
  - [ ] Ampliare smoke test includendo asset statici (`styles.css`, `vendor/jszip.min.js`, `app.js`, pagine fetch) per copertura completa.
  - [x] Strumentare la dashboard con metriche di rendering leggere (console + report JSON) e fissare soglia < 60 ms sui dataset baseline, con avvisi oltre 80 ms su footprint >700 nodi.
- [x] Convalidare smoke test Playwright sul dataset minimale (`npm --prefix tools/ts run test:web`).【F:logs/web_status.md†L27-L34】
- [x] Raggiungere i KPI Lighthouse per il bundle `docs/test-interface` (Performance ≥80, Accessibilità 100).【F:logs/web_status.md†L35-L38】
