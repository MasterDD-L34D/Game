# Calendario editoriale publishing

Il calendario editoriale coordina il rilascio dei contenuti nei diversi pacchetti, allineando QA, approvazioni e
milestone di pubblicazione. Ogni riga rappresenta una finestra di pubblicazione pianificata; aggiorna il file in PR per
mantenere traccia dell'approvazione finale e delle note QA condivise.

## Come usarlo

- Aggiorna la tabella quando viene pianificato un nuovo contenuto o quando cambia la data di rilascio.
- Usa il campo **QA notes** per linkare evidenze (`logs/trait_audit.md`, report validator, screenshot) o riassumere i test.
- Imposta lo stato su `Ready` solo dopo che la pipeline dati ha superato audit e validazioni (`data-quality` workflow).
- Mantieni le approvazioni aggiornate elencando ruoli o persone che hanno dato il via libera finale.

## Pianificazioni

| Data target | Pacchetto | Contenuto / focus | Owner contenuto | QA owner | Approvazioni richieste | QA notes | Stato |
|-------------|-----------|-------------------|-----------------|----------|------------------------|----------|-------|
| 2025-11-14  | badlands  | Aggiornamento eventi meteo estremi e patch "Magneto Storm" | Narrative Ops | QA Core | Creative Lead, Gameplay Lead | Audit trait #134, smoke CLI esito ✅ | In QA |
| 2025-11-21  | cryosteppe | Nuove missioni "Rescue Capsule" + bilanciamento predator | Gameplay Systems | QA Core | Creative Lead | Validazione ecosistemi `run_all_validators.py` (log 2025-11-10), diff patch approvato | Ready |
| 2025-11-28  | network   | Release kit comunicazione e index multibioma | Publishing Ops | QA Live | Marketing Lead, Release Ops | QA manuale HUD, verifica accessibilità AA, screenshot aggiornati | Draft |

### Registro approvazioni rapide

- **2025-11-10** — `cryosteppe` approvato dal Creative Lead (link: `services/publishing/workflowState.json`).
- **2025-11-08** — QA Core segnala nessuna regressione nel trait audit (`logs/trait_audit.md`).
- **2025-11-06** — Publishing Ops conferma asset web aggiornati (`packs/evo_tactics_pack/out/staging/site_manifest.json`).
