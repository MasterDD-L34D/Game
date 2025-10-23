# Action Items — Sintesi operativa

## Stato attuale
- L'ultimo run di `scripts/chatgpt_sync.py` ha fallito prima per l'assenza di `requests` e poi per un `ProxyError 403`, quindi la pipeline di sincronizzazione è ferma in attesa di credenziali/rete valide.【F:logs/chatgpt_sync.log†L1-L46】
- Le checklist e la roadmap evidenziano attività aperte su telemetria, encounter, integrazione Google Sheet e aggiornamenti dei Canvas principali.【F:docs/checklist/milestones.md†L8-L20】【F:docs/piani/roadmap.md†L1-L24】
- La validazione dataset (`python tools/py/validate_datasets.py`) è passata; la CLI TypeScript non espone uno script `npm test`, quindi la verifica automatica non è disponibile.【F:tools/py/validate_datasets.py†L1-L116】【d8bc76†L1-L8】

## Task immediati
- [ ] Installare le dipendenze mancanti (`requests`, `pyyaml`) ed eseguire `scripts/chatgpt_sync.py` da un ambiente con accesso autorizzato, aggiornando poi `docs/chatgpt_sync_status.md` con esito e credenziali operative.【F:logs/chatgpt_sync.log†L1-L46】
- [ ] Validare le formule di telemetria con dati di playtest reali, confrontando i risultati con gli obiettivi EMA/VC indicati in `data/telemetry.yaml`. Documentare i riscontri in `docs/chatgpt_sync_status.md` o in una nota dedicata.【F:docs/checklist/milestones.md†L8-L12】【F:data/telemetry.yaml†L1-L25】
- [x] Generare e documentare encounter di esempio per ciascun bioma utilizzando `tools/py/generate_encounter.py`, salvando i risultati in `docs/examples/` per uso rapido.【F:docs/checklist/milestones.md†L12-L16】【F:tools/py/generate_encounter.py†L1-L24】【F:docs/examples/encounter_savana.txt†L1-L21】【F:docs/examples/encounter_caverna.txt†L1-L21】【F:docs/examples/encounter_palude.txt†L1-L21】
- [ ] Allineare l'output delle CLI TS/Python (`roll_pack`) definendo un seed comune o una logica condivisa, perché al momento restituiscono combinazioni diverse per lo stesso input (`ENTP invoker`).【F:tools/ts/dist/roll_pack.js†L1-L2】【F:tools/py/roll_pack.py†L1-L130】【5e6c05†L1-L11】【f7446d†L1-L12】

## Step successivi
- [ ] Collegare l'export automatizzato dei log VC a Google Sheet tramite `scripts/driveSync.gs`, includendo istruzioni aggiornate su trigger/permessi nel README o nella documentazione dedicata.【F:docs/checklist/milestones.md†L16-L18】【F:scripts/driveSync.gs†L1-L40】
- [ ] Aggiornare i Canvas principali con le nuove feature CLI e con gli insight emersi dal bilanciamento PI e dalla telemetria, seguendo le priorità della roadmap.【F:docs/checklist/milestones.md†L18-L20】【F:docs/piani/roadmap.md†L1-L24】
- [ ] Bilanciare i pacchetti PI rispetto alla curva PE (`pe_economy`) e integrare le finestre EMA nel client, verificando la coerenza con i dataset YAML coinvolti.【F:docs/piani/roadmap.md†L4-L14】【F:data/packs.yaml†L1-L88】【F:data/telemetry.yaml†L1-L29】
