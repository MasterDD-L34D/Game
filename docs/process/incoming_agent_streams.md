# Schede operative stream agentici — Incoming

Questo documento sintetizza i flussi di lavoro per gli stream agentici che gestiscono la cartella `incoming/`, integrando le note presenti nel playbook e nei pacchetti di riferimento.

## Triage — `AG-Orchestrator`
### Responsabilità principali
- Programmare ed eseguire il ciclo settimanale "Incoming Review", assicurando che il comando `./scripts/report_incoming.sh` sia lanciato in anticipo e che il Support Hub mostri follow-up chiusi.【F:docs/process/incoming_triage_pipeline.md†L26-L44】【F:docs/checklist/incoming_triage.md†L3-L9】
- Pubblicare i report HTML/JSON nel canale `#incoming-triage-agenti`, menzionando i caretaker e coordinando la categorizzazione degli asset con le etichette condivise.【F:docs/process/incoming_triage_pipeline.md†L37-L44】【F:docs/checklist/incoming_triage.md†L6-L16】
- Consolidare decisioni, spostamento file e aggiornamenti di board/knowledge base entro 24 ore dalla sync.【F:docs/process/incoming_triage_pipeline.md†L42-L74】【F:docs/checklist/incoming_triage.md†L18-L24】

### Output attesi
- Report di sessione registrato in `docs/process/incoming_review_log.md` con data aggiornata e link al materiale pubblicato.【F:docs/process/incoming_triage_pipeline.md†L41-L44】【F:docs/checklist/incoming_triage.md†L23-L24】
- Board Kanban allineata con card spostate nelle colonne corrette e owner/due date aggiornati.【F:docs/process/incoming_triage_pipeline.md†L46-L58】【F:docs/checklist/incoming_triage.md†L9-L24】
- Knowledge base interna (Support Hub/log) sincronizzata con le decisioni e i follow-up definiti durante il triage.【F:docs/process/incoming_triage_pipeline.md†L94-L112】

### Dipendenze chiave
- Support Hub `docs/index.html` e widget "Ultimo report triage" per innescare il ciclo operativo.【F:docs/process/incoming_triage_pipeline.md†L18-L44】
- Script `scripts/report_incoming.sh` e log generati in `reports/incoming/` per alimentare le analisi successive.【F:docs/process/incoming_triage_pipeline.md†L18-L44】【F:incoming/README.md†L5-L28】
- Template/checklist ufficiali (`docs/templates/incoming_triage_meeting.md`, `docs/checklist/incoming_triage.md`) per standardizzare note e azioni.【F:docs/process/incoming_triage_pipeline.md†L108-L112】

## Validazione — `AG-Validation`
### Responsabilità principali
- Eseguire e monitorare i comandi di validazione (`tools/py/game_cli.py`, `tools/ts/validate_species.ts`) generati dal triage, segnalando regressioni critiche e completando la colonna `In validazione` con log allegati.【F:docs/process/incoming_triage_pipeline.md†L12-L57】【F:incoming/README.md†L16-L28】
- Fornire viste filtrate del report durante la sync e contribuire alla classificazione degli asset con i caretaker di dominio.【F:docs/checklist/incoming_triage.md†L11-L16】【F:docs/process/incoming_triage_pipeline.md†L38-L41】
- Validare patch/tooling forniti da `AG-Toolsmith`, certificando la chiusura delle attività di manutenzione.【F:docs/process/tooling_maintenance_log.md†L7-L14】

### Output attesi
- Log di validazione consolidati in `reports/incoming/validation/` e allegati alle card Kanban per asset in analisi.【F:docs/process/incoming_triage_pipeline.md†L46-L56】【F:incoming/README.md†L16-L24】
- Sintesi delle anomalie o dei blocchi tecnici per il registro di triage e per i follow-up di dominio.【F:docs/process/incoming_triage_pipeline.md†L39-L44】
- Conferme di verifica sulle attività tooling annotate nel maintenance log.【F:docs/process/tooling_maintenance_log.md†L7-L14】

### Dipendenze chiave
- Script CLI Python/TypeScript e dataset `incoming/` estratti dal triage per riprodurre i test.【F:docs/process/incoming_triage_pipeline.md†L12-L57】【F:incoming/README.md†L5-L28】
- Board Kanban e report condivisi per registrare esiti e avanzamento.【F:docs/process/incoming_triage_pipeline.md†L46-L58】
- Collaborazione stretta con `AG-Toolsmith` per chiusura dei fix infrastrutturali.【F:docs/process/incoming_triage_pipeline.md†L82-L124】【F:docs/process/tooling_maintenance_log.md†L7-L14】

## Biomi — `AG-Biome`
### Responsabilità principali
- Revisionare i pacchetti specie/biomi emergenti dal triage e proporre follow-up ambientali o tuning basati sui manifest aggiornati.【F:docs/process/incoming_triage_pipeline.md†L14-L63】【F:docs/biomes/manifest.md†L1-L45】
- Allineare le decisioni di integrazione con i caretaker Core, assicurando che i biomi siano tracciati con ID canonici e alias aggiornati.【F:docs/process/incoming_triage_pipeline.md†L76-L82】【F:docs/biomes/manifest.md†L11-L45】
- Evidenziare l'impatto dei biomi sulle specie, morph e encounter condivisi nel Feature Map EVO Tactics.【F:incoming/FEATURE_MAP_EVO_TACTICS.md†L55-L76】【F:incoming/FEATURE_MAP_EVO_TACTICS.md†L86-L94】

### Output attesi
- Note di integrazione/archiviazione per biomi e specie collegate nel registro triage e nella board.【F:docs/process/incoming_triage_pipeline.md†L39-L74】
- Aggiornamenti proposti per `docs/biomes/manifest.md` o file correlati quando emergono nuovi ambienti o alias.【F:docs/biomes/manifest.md†L5-L51】
- Raccolta di insight su hazard, preferenze e hook ambientali da condividere con gli stream Core/Validation.【F:incoming/FEATURE_MAP_EVO_TACTICS.md†L55-L76】

### Dipendenze chiave
- Manifest e dataset biomi (`docs/biomes/manifest.md`, `data/core/biomes.yaml`, registries) per garantire coerenza nomenclativa.【F:docs/biomes/manifest.md†L5-L51】
- Report di triage e script di validazione per verificare che i pacchetti bioma superino i controlli automatizzati.【F:docs/process/incoming_triage_pipeline.md†L36-L56】
- Coordinamento con `AG-Orchestrator` e `AG-Core` per definire priorità e sprint tematici legati ai biomi.【F:docs/process/incoming_triage_pipeline.md†L76-L107】

## Personality — `AG-Personality`
### Responsabilità principali
- Gestire i moduli Enneagramma/MBTI, assicurando che dataset, compat map e registry siano sincronizzati con le istruzioni di integrazione meccanica.【F:docs/process/incoming_triage_pipeline.md†L15-L92】【F:incoming/README_INTEGRAZIONE_MECCANICHE.md†L5-L14】
- Validare gli hook e le mappe stat/eventi contro il repository principale seguendo il flusso di scanning e binding fornito negli asset incoming.【F:incoming/GAME_COMPAT_README.md†L6-L18】【F:incoming/README_SCAN_STAT_EVENTI.md†L4-L17】
- Fornire agli altri stream esempi di binding e limiti di stacking per evitare regressioni durante l'integrazione.【F:incoming/GAME_COMPAT_README.md†L14-L18】【F:incoming/hook_bindings.ts†L1-L38】

### Output attesi
- Checklist di compatibilità aggiornata con hook abilitati e test smoke sui 108 profili indicati.【F:incoming/GAME_COMPAT_README.md†L14-L18】
- Aggiornamenti a `compat_map.json`/`personality_module.v1.json` con alias e limiti confermati in fase di triage.【F:incoming/README_INTEGRAZIONE_MECCANICHE.md†L5-L14】
- Note di bilanciamento e vincoli condivise con `AG-Orchestrator` per la knowledge base.【F:docs/process/incoming_triage_pipeline.md†L88-L112】

### Dipendenze chiave
- Pacchetto Personality (`compat_map.json`, `personality_module.v1.json`, `hook_bindings.ts`) e dataset temi per garantire coerenza tra script e engine.【F:incoming/FEATURE_MAP_EVO_TACTICS.md†L32-L43】【F:incoming/hook_bindings.ts†L1-L38】
- Scanner `scan_engine_idents.py` e workflow di validazione repo per allineare naming STAT/EVENTI.【F:incoming/README_SCAN_STAT_EVENTI.md†L4-L17】
- Supporto di `AG-Core` per armonizzare i limiti con le statistiche canoniche (baseline conservativa).【F:incoming/README_INTEGRAZIONE_MECCANICHE.md†L3-L14】【F:docs/process/incoming_triage_pipeline.md†L76-L82】

## Tooling — `AG-Toolsmith`
### Responsabilità principali
- Manutenere `scripts/report_incoming.sh`, validatori e pipeline collegate, programmando micro-sprint mensili dedicati alla toolchain.【F:docs/process/incoming_triage_pipeline.md†L18-L124】【F:docs/process/tooling_maintenance_log.md†L1-L14】
- Garantire che gli script di validazione e i workflow CI siano aggiornati e documentati nei report tooling condivisi.【F:docs/tool_run_report.md†L3-L52】
- Collaborare con `AG-Validation` per chiudere incidenti (es. unzip) e confermare le patch attraverso test dedicati.【F:docs/process/incoming_triage_pipeline.md†L82-L124】【F:docs/process/tooling_maintenance_log.md†L7-L14】

### Output attesi
- Log manutenzione aggiornato con task, stato e link a PR/commit, corredato dalla conferma QA di `AG-Validation`.【F:docs/process/tooling_maintenance_log.md†L5-L14】
- Report periodici delle esecuzioni tooling (CLI parity, smoke test, workflow automatizzati) pubblicati in `docs/tool_run_report.md`.【F:docs/tool_run_report.md†L3-L52】
- Script e configurazioni aggiornati per assicurare estrazione non interattiva, validazioni schema e sincronizzazione addon.【F:docs/process/incoming_triage_pipeline.md†L18-L124】【F:incoming/README.md†L5-L28】

### Dipendenze chiave
- Repertorio script `tools/py/`, `tools/ts/` e `scripts/` del repository, inclusi log generati dai test parity e smoke.【F:docs/tool_run_report.md†L19-L76】
- Pipeline CI e checklist di manutenzione coordinate con il Support Hub e gli stream di triage.【F:docs/process/incoming_triage_pipeline.md†L18-L132】
- Collaborazione continua con `AG-Validation` e `AG-Orchestrator` per pianificare fix e pubblicare aggiornamenti nel canale operativo.【F:docs/checklist/incoming_triage.md†L6-L24】【F:docs/process/incoming_triage_pipeline.md†L37-L44】
