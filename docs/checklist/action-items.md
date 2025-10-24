# Action Items — Sintesi operativa

## Stato attuale
- La pipeline `scripts/chatgpt_sync.py` è tornata operativa con fonti locali e diff aggiornati al 2025-10-24; nessun proxy richiesto per gli export offline.【F:logs/chatgpt_sync.log†L160-L214】【F:docs/chatgpt_sync_status.md†L19-L33】
- Le checklist e la roadmap evidenziano attività aperte su encounter aggiuntivi, automazione Google Sheet e miglioramenti HUD, ma i punti critici di telemetria sono stati riallineati.【F:docs/checklist/milestones.md†L8-L20】【F:docs/piani/roadmap.md†L1-L32】
- La validazione dataset (`python tools/py/validate_datasets.py`) continua a passare; resta assente uno script `npm test` per la CLI TypeScript.【F:tools/py/validate_datasets.py†L1-L116】【414bb7†L1-L2】
- I test interfaccia web restano in sospeso: il server locale risponde, ma l'ambiente headless non dispone di browser per azionare i pulsanti “Ricarica dati YAML” e “Esegui test”.

## Task immediati
- [x] Installare le dipendenze mancanti (`requests`, `pyyaml`) ed eseguire `scripts/chatgpt_sync.py` da un ambiente con accesso autorizzato, aggiornando poi `docs/chatgpt_sync_status.md` con esito e credenziali operative.【F:tools/py/requirements.txt†L1-L2】【F:docs/chatgpt_sync_status.md†L19-L33】
- [x] Validare le formule di telemetria con dati di playtest reali, confrontando i risultati con gli obiettivi EMA/VC indicati in `data/telemetry.yaml`. Documentare i riscontri e archiviare i log Delta/Echo.【F:data/telemetry.yaml†L1-L29】【F:logs/playtests/2025-10-24-vc/session-metrics.yaml†L1-L73】
- [x] Generare e documentare encounter di esempio per ciascun bioma utilizzando `tools/py/generate_encounter.py`, salvando i risultati in `docs/examples/` per uso rapido.【F:docs/checklist/milestones.md†L12-L16】【F:tools/py/generate_encounter.py†L1-L24】【F:docs/examples/encounter_savana.txt†L1-L21】【F:docs/examples/encounter_caverna.txt†L1-L21】【F:docs/examples/encounter_palude.txt†L1-L21】
- [x] Allineare l'output delle CLI TS/Python (`roll_pack`) definendo un seed comune o una logica condivisa, perché al momento restituiscono combinazioni diverse per lo stesso input (`ENTP invoker`). _Verifica 2025-10-24 con seed `demo`: JSON coincidenti._【F:tools/ts/dist/roll_pack.js†L1-L160】【F:tools/py/roll_pack.py†L1-L130】【deb84c†L1-L25】【405e6a†L1-L25】
- [ ] Eseguire i test web della checklist (`docs/test-interface/`) su ambiente con browser per confermare il caricamento YAML e l'esito dei pulsanti automatici.

## Step successivi
- [ ] Collegare l'export automatizzato dei log VC a Google Sheet tramite `scripts/driveSync.gs`, includendo istruzioni aggiornate su trigger/permessi nel README o nella documentazione dedicata.【F:docs/checklist/milestones.md†L16-L18】【F:scripts/driveSync.gs†L1-L40】
- [x] Aggiornare i Canvas principali con le nuove feature CLI e con gli insight emersi dal bilanciamento PI e dalla telemetria, seguendo le priorità della roadmap.【F:docs/checklist/milestones.md†L18-L20】【F:docs/Canvas/feature-updates.md†L9-L20】【F:docs/piani/roadmap.md†L1-L28】
- [ ] Bilanciare i pacchetti PI rispetto alla curva PE (`pe_economy`) e integrare le finestre EMA nel client, verificando la coerenza con i dataset YAML coinvolti.【F:docs/piani/roadmap.md†L4-L14】【F:data/packs.yaml†L1-L88】【F:data/telemetry.yaml†L1-L29】
- [ ] Implementare alert HUD automatici per il superamento del `risk.weighted_index` > 0.60 durante i vertical slice, notificando al team bilanciamento PI.【F:docs/piani/roadmap.md†L6-L13】【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L61-L77】
- [ ] Aggiornare i timer di evacuazione di "Skydock Siege" usando i trend `time_low_hp_turns` e mantenendo tilt < 0.50 nelle squadre testate.【F:docs/piani/roadmap.md†L21-L25】【F:logs/playtests/2025-02-15-vc/session-metrics.yaml†L61-L121】
