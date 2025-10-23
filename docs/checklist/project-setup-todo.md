# TODO Operativo — Avvio completo del progetto

Questa checklist descrive tutti i passaggi necessari per avere il progetto pienamente funzionante,
dalla configurazione dell'ambiente allo svolgimento dei test manuali e automatici. Aggiornala dopo
ogni esecuzione importante, annotando data, esito e note operative.

## 1. Preparazione ambiente
- [ ] Clonare o estrarre il repository sul sistema di lavoro (`git clone` oppure unzip da Drive).
- [ ] Installare **Node.js 18+** e **npm** (verifica con `node --version`, `npm --version`).
- [ ] Installare **Python 3.10+** e assicurarsi che `pip` sia disponibile (`python3 -m pip --version`).
- [ ] Creare un virtual environment Python dedicato (`python3 -m venv .venv` e attivarlo).
- [ ] Aggiornare gli strumenti base: `npm install -g npm@latest` e `python3 -m pip install --upgrade pip`.

## 2. Dipendenze progetto
- [ ] Dalla radice, installare le dipendenze Node/TypeScript: `cd tools/ts && npm install`.
- [ ] Compilare la CLI TypeScript: `npm run build` (verificare l'output in `tools/ts/dist`).
- [ ] Installare le dipendenze Python richieste per gli script: `pip install -r tools/py/requirements.txt`
      (se il file non è aggiornato, eseguire `pip install requests pyyaml` e trascrivere le versioni).
- [ ] Registrare in `docs/chatgpt_sync_status.md` l'ambiente usato (OS, versioni Node/Python, proxy).

## 3. Validazione dataset
- [ ] Lanciare `python tools/py/validate_datasets.py` e risolvere eventuali errori nei file YAML.
- [ ] Eseguire `npm test` in `tools/ts` se sono presenti test unitari per la CLI.
- [ ] Annotare gli esiti della validazione (OK/errori) in `docs/checklist/action-items.md` o in un log.

## 4. Verifica CLI
- [ ] Eseguire `node dist/roll_pack.js <MBTI> <archetipo> ../../data/packs.yaml` (es. `ENTP invoker`).
- [ ] Avviare `python roll_pack.py <MBTI> <archetipo> ../../data/packs.yaml` e confrontare i risultati.
- [ ] Generare encounter di prova: `python generate_encounter.py <bioma> ../../data/biomes.yaml` per
      ogni bioma disponibile, salvando gli output in `docs/examples/` o nella sezione encounter.
- [ ] Documentare eventuali discrepanze CLI TS/Python e aprire issue se necessarie.

## 5. Interfaccia web di test
- [ ] Avviare un server locale dalla radice: `python -m http.server 8000`.
- [ ] Aprire `http://localhost:8000/docs/test-interface/` e verificare il caricamento dei dataset YAML.
- [ ] Eseguire i test disponibili nell'interfaccia (“Ricarica dati YAML”, “Esegui test”).
- [ ] Annotare eventuali errori del browser (console, rete) e aggiornare la documentazione se servono fix.

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
- [ ] Preparare materiali di comunicazione (slide, demo video, note) in `docs/presentations/`.
- [ ] Coordinarsi con il team marketing/prodotto per pianificare annunci e raccolta feedback.
- [ ] Creare un tag Git (`git tag vX.Y.Z && git push origin vX.Y.Z`) dopo la validazione finale.

## 11. Knowledge sharing e onboarding
- [ ] Aggiornare `docs/README.md` e le guide in `docs/piani/` con le nuove procedure adottate.
- [ ] Documentare le decisioni architetturali in un ADR (`docs/adr/ADR-<numero>-<titolo>.md`) quando necessario.
- [ ] Programmare sessioni di onboarding per nuovi membri e registrare le call per consultazione futura.
- [ ] Creare FAQ interne su `docs/faq.md` con le domande più ricorrenti ricevute dal team.

> Suggerimento: duplica questa checklist ad inizio sprint e spunta i punti completati, aggiungendo nuove
> attività sotto la sezione corrispondente per mantenere una cronologia operativa chiara.
