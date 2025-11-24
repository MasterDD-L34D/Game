# REF_TOOLING_AND_CI – PATCHSET-00

Versione: 0.5 (riallineato al repo aggiornato; checklist 02A/03A confermata post-conflitto)
Data: 2025-11-23
Owner: Laura B. (supporto: dev-tooling)
Stato: DRAFT – ready per checklist 02A/03A

---

## Scopo

Mappare workflow CI, validatori e script che toccano core/pack, definendo la checklist di validazione prevista per le fasi 02A/03A, senza modificare tooling in PATCHSET-00.

## Stato attuale

- PATCHSET-00 non introduce modifiche a CI/tooling; impatto nullo sui workflow esistenti.
- Workflow da mappare: `.github/workflows/**`.
- Validatori/schema: `tools/`, `scripts/`, `config/`, `schemas/`, `jsonschema/` (inventario dettagliato da completare in 02A).

## Checklist proposta per 02A/03A

- Validazione schema core (trait/specie/biomi) contro schemi in `schemas/**`.
- Lint dati / coerenza slug (comandi da identificare nei tool esistenti).
- Rigenerazione pack/fixture simulata (nessuna scrittura su core, solo verifica) usando gli script censiti in 02A/02B.
- Report unificato e logging in `logs/agent_activity.md` per ogni esecuzione.
- Branch dedicati e gate incrociati prima di esecuzioni che toccano pack/derived.

## Prossime azioni (02A)

- Elencare workflow CI effettivi e i job che devono essere mantenuti invariati durante le prove 02A.
- Identificare i validatori già presenti nel repository (es. `engine_events.schema.json`, `scan_engine_idents.py`) e mapparli ai dati core.
- Definire comandi esatti da lanciare in dry-run per 03A (senza scritture), con output registrato in `logs/agent_activity.md`.

## Changelog

- v0.5 – Riallineamento post-conflitto con repo aggiornato; checklist 02A/03A confermata e governance (branch/log) ribadita.
- v0.4 – Checklist arricchita con branch/gate, riferimenti a script noti e logging per 02A/03A.
- v0.3 – Stato CI/tooling esplicitato, checklist proposta per 02A/03A, governance ribadita.
- v0.2 – Design completato, in attesa approvazione PATCHSET-00.
- v0.1 – Stub iniziale.
