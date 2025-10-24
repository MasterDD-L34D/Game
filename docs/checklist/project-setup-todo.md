# TODO Operativo — Avvio completo del progetto

Questa checklist descrive tutti i passaggi necessari per avere il progetto pienamente funzionante,
dalla configurazione dell'ambiente allo svolgimento dei test manuali e automatici. Aggiornala dopo
ogni esecuzione importante, annotando data, esito e note operative.

## 1. Preparazione ambiente
- [ ] Clonare o estrarre il repository sul sistema di lavoro (`git clone` oppure unzip da Drive).
- [x] Installare **Node.js 18+** e **npm** (verifica con `node --version`, `npm --version`). _Node 22.19.0 / npm 11.4.2 verificati il 2025-10-24._
- [x] Installare **Python 3.10+** e assicurarsi che `pip` sia disponibile (`python3 -m pip --version`). _Python 3.11.12 / pip 25.2 verificati il 2025-10-24._
- [ ] Creare un virtual environment Python dedicato (`python3 -m venv .venv` e attivarlo).
- [ ] Aggiornare gli strumenti base: `npm install -g npm@latest` e `python3 -m pip install --upgrade pip`.

## 2. Dipendenze progetto
- [x] Dalla radice, installare le dipendenze Node/TypeScript: `cd tools/ts && npm install`. _Eseguito `npm ci` il 2025-10-24._
- [x] Compilare la CLI TypeScript: `npm run build` (verificare l'output in `tools/ts/dist`). _Ricompilazione completata il 2025-10-24._
- [x] Installare le dipendenze Python richieste per gli script: `pip install -r tools/py/requirements.txt`
      (se il file non è aggiornato, eseguire `pip install requests pyyaml` e trascrivere le versioni). _Reinstallazione `PyYAML` verificata il 2025-10-24._
- [x] Registrare in `docs/chatgpt_sync_status.md` l'ambiente usato (OS, versioni Node/Python, proxy).

## 3. Validazione dataset
- [x] Lanciare `python tools/py/validate_datasets.py` e risolvere eventuali errori nei file YAML. _Ultimo run 2025-10-24: esito OK._
- [ ] Eseguire `npm test` in `tools/ts` se sono presenti test unitari per la CLI. _Non disponibile: nessun test definito._
- [x] Annotare gli esiti della validazione (OK/errori) in `docs/checklist/action-items.md` o in un log. _Vedi aggiornamento `docs/tool_run_report.md`._

## 4. Verifica CLI
- [x] Eseguire `node dist/roll_pack.js <MBTI> <archetipo> ../../data/packs.yaml --seed demo` (sostituire `demo` con un seed a scelta per output replicabili). _Seed `demo` testato 2025-10-24._
- [x] Avviare `python roll_pack.py <MBTI> <archetipo> ../../data/packs.yaml --seed demo` e verificare che l'output (chiavi `pack`, `combo`, `total_cost`, ecc.) coincida con la CLI TypeScript. _Esito coincidente con la CLI TS._
- [ ] Generare encounter di prova: `python generate_encounter.py <bioma> ../../data/biomes.yaml` per
      ogni bioma disponibile, salvando gli output in `docs/examples/` o nella sezione encounter.
- [ ] Documentare eventuali discrepanze CLI TS/Python e aprire issue se necessarie.

## 5. Interfaccia web di test
- [x] Avviare un server locale dalla radice: `python -m http.server 8000`. _Verificato su porta 8000 con richiesta `curl`._
- [x] Aprire `http://localhost:8000/docs/test-interface/` e verificare il caricamento dei dataset YAML. _Contenuto HTML ricevuto via `curl` il 2025-10-24._
- [ ] Eseguire i test disponibili nell'interfaccia (“Ricarica dati YAML”, “Esegui test”). _Bloccato: ambiente headless privo di browser._
- [ ] Annotare eventuali errori del browser (console, rete) e aggiornare la documentazione se servono fix. _In attesa di esecuzione manuale su ambiente con browser._

## 6. Sincronizzazione ChatGPT
- [ ] Configurare `data/chatgpt_sources.yaml` con le fonti corrette (URL, canvas, note esterne).
- [ ] Installare/aggiornare le credenziali e la rete/proxy necessari all'accesso.
- [ ] Eseguire `python scripts/chatgpt_sync.py --config data/chatgpt_sources.yaml`.
- [ ] Analizzare i diff generati in `docs/chatgpt_changes/` e il log `logs/chatgpt_sync.log`.
- [ ] Aggiornare `docs/chatgpt_sync_status.md` con data, esito e follow-up richiesti.

## 7. Integrazione Drive e automazioni
- [ ] Se richiesto, configurare `scripts/driveSync.gs` come Apps Script su Google Drive con i permessi
      corretti, indicando cartella sorgente/destinazione.
- [ ] Documentare trigger e limitazioni (quote API, rete aziendale) nel README o in `docs/drive-sync.md`.
- [ ] Sincronizzare un primo batch di YAML → Sheet e verificare che i dati risultino coerenti.

## 8. Manutenzione continua
- [ ] Aggiornare regolarmente roadmap e checklist (milestone, action items, questa TODO) con progressi.
- [ ] Pianificare incontri di revisione (settimanali/quindicinali) per verificare stato dei pacchetti PI,
      telemetria VC e nuove feature.
- [ ] Automatizzare i test (GitHub Actions o CI locale) quando le dipendenze e le credenziali sono stabili.
- [ ] Archiviare in `docs/logs/` o `logs/` eventuali report di bug o sessioni di playtest.

## 9. Quality assurance manuale
- [ ] Preparare una lista di scenari di gioco critici (bilanciamento, progressione, eventi speciali).
- [ ] Organizzare sessioni di playtest interne seguendo gli scenari e annotare problemi e suggerimenti.
- [ ] Registrare i risultati in `docs/playtest/SESSION-<data>.md` con screenshot/log linkati dove utile.
- [ ] Aprire ticket su tracker interno o GitHub per ogni bug confermato, collegando log e file YAML.

## 10. Rilascio e comunicazione
- [ ] Redigere un changelog in `docs/changelog.md` prima di ogni release o consegna intermedia.
- [x] Preparare materiali di comunicazione (slide, demo video, note) in `docs/presentations/` — creato briefing VC con asset collegati a milestone e release.【F:docs/presentations/2025-02-vc-briefing.md†L1-L20】
- [ ] Coordinarsi con il team marketing/prodotto per pianificare annunci e raccolta feedback.
- [ ] Creare un tag Git (`git tag vX.Y.Z && git push origin vX.Y.Z`) dopo la validazione finale.
- [ ] Aggiornare periodicamente i materiali con screenshot HUD e metriche risk/cohesion post-playtest.【F:docs/Canvas/feature-updates.md†L9-L20】【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L33-L122】

## 11. Knowledge sharing e onboarding
- [ ] Aggiornare `docs/README.md` e le guide in `docs/piani/` con le nuove procedure adottate.
- [ ] Documentare le decisioni architetturali in un ADR (`docs/adr/ADR-<numero>-<titolo>.md`) quando necessario.
- [ ] Programmare sessioni di onboarding per nuovi membri e registrare le call per consultazione futura.
- [ ] Creare FAQ interne su `docs/faq.md` con le domande più ricorrenti ricevute dal team.

> Suggerimento: duplica questa checklist ad inizio sprint e spunta i punti completati, aggiungendo nuove
> attività sotto la sezione corrispondente per mantenere una cronologia operativa chiara.
