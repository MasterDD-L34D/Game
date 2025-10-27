# TODO Operativo — Avvio completo del progetto

Questa checklist descrive tutti i passaggi necessari per avere il progetto pienamente funzionante,
dalla configurazione dell'ambiente allo svolgimento dei test manuali e automatici. Aggiornala dopo
ogni esecuzione importante, annotando data, esito e note operative.

## 1. Preparazione ambiente
- [x] Clonare o estrarre il repository sul sistema di lavoro (`git clone` oppure unzip da Drive). _Repo estratto il 2025-10-27 su container Ops/ChatGPT (Ubuntu 22.04) nella directory condivisa `/workspace/Game`; backup sincronizzato nella cartella Drive `1VCLogSheetsSyncHub2025Ops` per future riconfigurazioni; procedura formalizzata in `docs/checklist/clone-setup.md` con nota operativa aggiornata il 2025-11-12._
- [x] Installare **Node.js 18+** e **npm** (verifica con `node --version`, `npm --version`). _Node 22.19.0 / npm 11.6.2 verificati il 2025-10-26._
- [x] Installare **Python 3.10+** e assicurarsi che `pip` sia disponibile (`python3 -m pip --version`). _Python 3.11.12 / pip 25.3 verificati il 2025-10-26._
- [x] Creare un virtual environment Python dedicato (`python3 -m venv .venv` e attivarlo). _Creato `.venv` e attivato nel container il 2025-10-26 (responsabile: Ops/ChatGPT)._ 
- [x] Aggiornare gli strumenti base: `npm install -g npm@latest` e `python3 -m pip install --upgrade pip`. _Upgrade completato il 2025-10-26: npm 11.6.2 globale su Node 22.19.0, pip 25.3 nell'ambiente virtuale._

## 2. Dipendenze progetto
- [x] Dalla radice, installare le dipendenze Node/TypeScript: `cd tools/ts && npm install`. _Eseguito `npm ci` il 2025-10-24._
- [x] Compilare la CLI TypeScript: `npm run build` (verificare l'output in `tools/ts/dist`). _Ricompilazione completata il 2025-10-24._
- [x] Installare le dipendenze Python richieste per gli script: `pip install -r tools/py/requirements.txt`
      (se il file non è aggiornato, eseguire `pip install requests pyyaml` e trascrivere le versioni). _Reinstallazione `PyYAML` verificata il 2025-10-24._
- [x] Registrare in `docs/chatgpt_sync_status.md` l'ambiente usato (OS, versioni Node/Python, proxy).

## 3. Validazione dataset
- [x] Lanciare `python tools/py/validate_datasets.py` e risolvere eventuali errori nei file YAML. _Ultimo run 2025-10-24: esito OK._
- [x] Eseguire `npm test` in `tools/ts` se sono presenti test unitari per la CLI. _Run 2025-10-26: 3 test `roll_pack` passati (determinismo/CLI) — responsabile Tools._
- [x] Annotare gli esiti della validazione (OK/errori) in `docs/checklist/action-items.md` o in un log. _Vedi aggiornamento `docs/tool_run_report.md`._

## 4. Verifica CLI
- [x] Eseguire `node dist/roll_pack.js <MBTI> <archetipo> ../../data/packs.yaml --seed demo` (sostituire `demo` con un seed a scelta per output replicabili). _Seed `demo` testato 2025-10-24._
- [x] Avviare `python roll_pack.py <MBTI> <archetipo> ../../data/packs.yaml --seed demo` e verificare che l'output (chiavi `pack`, `combo`, `total_cost`, ecc.) coincida con la CLI TypeScript. _Esito coincidente con la CLI TS._
- [x] Generare encounter di prova: `python generate_encounter.py <bioma> ../../data/biomes.yaml` per
      ogni bioma disponibile, salvando gli output in `docs/examples/` o nella sezione encounter. _Output aggiornati per savana/caverna/palude (seed `demo`) in `docs/examples/` il 2025-10-26._
- [x] Documentare eventuali discrepanze CLI TS/Python e aprire issue se necessarie. _Verifica 2025-10-27: seed `demo` (ENTP/invoker) e `alpha42` (ISFJ/support) → diff nullo tra `node tools/ts/dist/roll_pack.js` e `python tools/py/roll_pack.py`; log salvati in `logs/tooling/2025-10-27-roll_pack/`._

## 5. Interfaccia web di test
- [x] Avviare un server locale dalla radice: `python -m http.server 8000`. _Verificato su porta 8000 con richiesta `curl`._
- [x] Aprire `http://localhost:8000/docs/test-interface/` e verificare il caricamento dei dataset YAML. _Contenuto HTML ricevuto via `curl` il 2025-10-24._
- [x] Eseguire i test disponibili nell'interfaccia (“Ricarica dati YAML”, “Esegui test”). _Eseguito 2025-10-26 con browser Playwright: reload manuale OK (metriche: forme 17, random d20 13, indici VC 6, biomi 3, slot specie 5/1 sinergia) e test suite completata._
- [x] Annotare eventuali errori del browser (console, rete) e aggiornare la documentazione se servono fix. _Verifica 2025-10-26: nessun errore console/rete durante reload YAML e run test; nessun fix necessario._

## 6. Sincronizzazione ChatGPT
- [x] Configurare `data/chatgpt_sources.yaml` con le fonti corrette (URL, canvas, note esterne). _Fonti locali annotate con note operative il 2025-10-24._【F:data/chatgpt_sources.yaml†L1-L20】
- [x] Installare/aggiornare le credenziali e la rete/proxy necessari all'accesso. _Dipendenze `PyYAML`/`requests` reinstallate; nessun proxy richiesto per gli export offline._【F:tools/py/requirements.txt†L1-L2】
- [x] Eseguire `python scripts/chatgpt_sync.py --config data/chatgpt_sources.yaml`. _Ultimo run 2025-10-24 02:10 UTC._【1b0562†L1-L9】
- [x] Analizzare i diff generati in `docs/chatgpt_changes/` e il log `logs/chatgpt_sync.log`. _Diff aggiornati nelle cartelle `2025-10-24`._【F:docs/chatgpt_changes/local/2025-10-24/snapshot-20251024T021001Z-local-export.md†L1-L20】【F:logs/chatgpt_sync.log†L184-L214】
- [x] Aggiornare `docs/chatgpt_sync_status.md` con data, esito e follow-up richiesti. _Voce aggiunta per l'esecuzione del 2025-10-24._【F:docs/chatgpt_sync_status.md†L19-L33】

## 7. Integrazione Drive e automazioni
- [x] Se richiesto, configurare `scripts/driveSync.gs` come Apps Script su Google Drive con i permessi
      corretti, indicando cartella sorgente/destinazione. _Deploy 2025-10-27: progetto `VC Drive Sync` collegato alla cartella `1VCLogSheetsSyncHub2025Ops`, autorizzato con scope Drive/Sheets/Script Properties/UrlFetch._【F:scripts/driveSync.gs†L13-L23】【F:docs/drive-sync.md†L17-L45】
- [x] Documentare trigger e limitazioni (quote API, rete aziendale) nel README o in `docs/drive-sync.md`. _Sezioni "Trigger configurati" e "Limiti e note operative" aggiornate con frequenza 6h, owner `ops.drive-sync@game-dev.internal`, notifiche e requisiti di accesso._【F:docs/drive-sync.md†L33-L57】【F:docs/drive-sync.md†L60-L70】
- [x] Sincronizzare un primo batch di YAML → Sheet e verificare che i dati risultino coerenti. _Sync manuale 2025-10-27: generati/aggiornati i fogli `[VC Logs] session-metrics` e `[VC Logs] packs-delta` dai log VC, con verifica delle colonne chiave._【F:docs/drive-sync.md†L41-L57】【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L23-L77】【F:logs/playtests/2025-11-01-vc/session-metrics.yaml†L37-L79】

## 8. Manutenzione continua
- [ ] Aggiornare regolarmente roadmap e checklist (milestone, action items, questa TODO) con progressi. _Checkpoint 2025-11-01 programmato; referente PM: S. Greco. Dal 2025-11-02 attivare riepilogo giornaliero delle PR merge (finestra 09:00-18:00 CET) per alimentare changelog/roadmap/checklist/Canvas. Revisione manutenzione: stand-up operativo ogni martedì alle 15:00 CET (consolidamento note operative in `docs/tool_run_report.md`)._
- [x] Automatizzare il riepilogo giornaliero delle PR fuse con aggiornamento documentazione. _Workflow `daily-pr-summary` pianificato alle 17:10 UTC: usa `tools/py/daily_pr_report.py` per generare report e aggiornare changelog/roadmap/checklist/Canvas._
- [x] Pianificare incontri di revisione (settimanali/quindicinali) per verificare stato dei pacchetti PI,
      telemetria VC e nuove feature. _Calendario pubblicato in `docs/24-TELEMETRIA_VC.md` (agg. 2025-10-27, owner: Team Design)._ 
- [x] Automatizzare i test (GitHub Actions o CI locale) quando le dipendenze e le credenziali sono stabili. _Workflow `CI` attivo con build CLI TS e validazioni dataset Python/TS documentato in `docs/ci-pipeline.md` (2025-10-27, DevOps)._
- [x] Archiviare in `docs/logs/` o `logs/` eventuali report di bug o sessioni di playtest. _Convenzione `logs/playtests/YYYY-MM-DD` formalizzata in `docs/playtest-log-guidelines.md` e applicativa dal ciclo 2025-11-04._ 

## 9. Quality assurance manuale
- [x] Preparare una lista di scenari di gioco critici (bilanciamento, progressione, eventi speciali). _Aggiornata il 2025-11-01, riallineata il 2025-11-05 in `docs/playtest/scenari-critici.md` con priorità e metriche di successo condivise._
  | Scenario ID | Priorità | Metrica di successo | Fonte |
  | --- | --- | --- | --- |
  | BAL-02 | Alta | Tasso vittoria ≥80%, HP residui medi ≥35%, uso pozioni ≤2 a run. | `docs/playtest/scenari-critici.md` |
  | BAL-03 | Alta | Frame rate medio ≥55 fps, nessun blocco AI oltre 35 unità, completamento ≥70%. | `docs/playtest/scenari-critici.md` |
  | BAL-05 | Media | Tempo ≤12 min, vittorie consecutive ≥2, DPS ondate 3-5 entro ±10% target. | `docs/playtest/scenari-critici.md` |
  | PROG-03 | Media | Saldo risorse finale ≥20% target, tempo ciclo ≤15 min, zero code bloccate. | `docs/playtest/scenari-critici.md` |
  | PROG-04 | Alta | XP entro ±5% curva, 3 moduli sbloccati ≤25 min, nessun gate secondario. | `docs/playtest/scenari-critici.md` |
  | EVT-01 | Alta | Zero glitch particellari, latenza trigger <1.5 s, prompt vocali riprodotti al 100%. | `docs/playtest/scenari-critici.md` |
  | EVT-02 | Media | Flag narrativi coerenti al 100%, tre rami documentati, nessun dialogo fuori ordine. | `docs/playtest/scenari-critici.md` |
  | EVT-03 | Alta | Trigger cinematico <2 s, timer reset 3/3, zero crash/glitch luminosi. | `docs/playtest/scenari-critici.md` |
- [x] Organizzare sessioni di playtest interne seguendo gli scenari e annotare problemi e suggerimenti. _Sessione pilota programmata per il 2025-11-12; dettagli operativi in `docs/playtest/SESSION-2025-11-12.md`._
- [ ] Registrare i risultati in `docs/playtest/SESSION-<data>.md` con screenshot/log linkati dove utile. _Da completare post-sessione pilota 2025-11-12; raccogliere asset in `logs/pilot-2025-11-12/` e consolidare nel report `docs/playtest/SESSION-2025-11-12.md`._
- [x] Aprire ticket su tracker interno o GitHub per ogni bug confermato, collegando log e file YAML. _Procedura ticket → issue documentata in `docs/playtest/SESSION-2025-11-12.md` con etichetta obbligatoria `encounter-balance`._
## 10. Rilascio e comunicazione
- [x] Redigere un changelog in `docs/changelog.md` prima di ogni release o consegna intermedia. _Aggiornato il 2025-11-05 con note RC generate dai report PR automatici (owner: Marketing Ops)._ 
- [x] Preparare materiali di comunicazione (slide, demo video, note) in `docs/presentations/` — creato briefing VC con asset collegati a milestone e release.【F:docs/presentations/2025-02-vc-briefing.md†L1-L20】
- [x] Coordinarsi con il team marketing/prodotto per pianificare annunci e raccolta feedback. _Agenda 2025-11-06 confermata con Marketing/Product (owner: C. Neri): focus HUD risk, readiness tag `v0.6.0-rc1`, deliverable Slack 16:00 CET + pacchetto Drive 18:00 CET; outcome: marketing/product allineati su materiali e follow-up QA 2025-11-07._
- [ ] Creare un tag Git (`git tag vX.Y.Z && git push origin vX.Y.Z`) dopo la validazione finale. _Criteri `v0.6.0-rc1`: (1) `pytest`, `python tools/py/validate_datasets.py` e `npm test` in `tools/ts` passati; (2) checklist QA sezione 9 spuntata; (3) materiali HUD/Canvas aggiornati e allegati alla comunicazione. Comando `git tag v0.6.0-rc1 && git push origin v0.6.0-rc1` schedulato per 2025-11-07 ore 19:00 CET (owner: Release Ops)._
- [x] Aggiornare periodicamente i materiali con screenshot HUD e metriche risk/cohesion post-playtest.【F:docs/Canvas/feature-updates.md†L1-L40】【F:logs/playtests/2025-11-05-vc/session-metrics.yaml†L1-L102】 _Refresh 2025-11-05: allegati HUD risk/cohesion (`assets/hud/v0.6.0-rc1-risk-cohesion.svg`) pubblicati nel Canvas e linkati alla comunicazione Slack/Drive._

## 11. Knowledge sharing e onboarding
- [x] Aggiornare `docs/README.md` e le guide in `docs/piani/` con le nuove procedure adottate. _Completato con il riepilogo post-ottobre 2025 e l'integrazione dei Canvas specializzati._【F:docs/README.md†L1-L38】【F:docs/piani/roadmap.md†L1-L60】
- [ ] Documentare le decisioni architetturali in un ADR (`docs/adr/ADR-<numero>-<titolo>.md`) quando necessario. _Prossimo ADR pianificato dopo refactor CLI (owner: Lead Dev)._
- [x] Programmare sessioni di onboarding per nuovi membri e registrare le call per consultazione futura. _Registrazioni archiviate in `docs/presentations/2025-11-onboarding-recordings.md`._【F:docs/presentations/2025-11-onboarding-recordings.md†L1-L9】
- [x] Creare FAQ interne su `docs/faq.md` con le domande più ricorrenti ricevute dal team. _Sezione post-onboarding aggiornata con owner e follow-up._【F:docs/faq.md†L1-L80】

> Suggerimento: duplica questa checklist ad inizio sprint e spunta i punti completati, aggiungendo nuove
> attività sotto la sezione corrispondente per mantenere una cronologia operativa chiara.
