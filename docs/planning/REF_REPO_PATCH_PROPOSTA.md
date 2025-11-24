# REF_REPO_PATCH_PROPOSTA – Applicazione iniziale dello scope

Versione: 0.4 (design allineato, 01A–03B pronti a partire)
Data: 2025-11-23
Owner: Laura B. (coordination con coordinator/dev-tooling)
Stato: PROPOSTA – PATCHSET-00 pronta per approvazione ed esecuzione guidata 01A–03B

---

## Stato attuale

- Il design di PATCHSET-00 è completato (versione 0.2 → 0.4) e resta in attesa di approvazione per eseguire la sequenza 01A–03B.
- Il perimetro di PATCHSET-00 è limitato a documentazione e mappature: nessuna modifica a `data/core/**`, `packs/**` o tooling.
- Numerazione bloccata: PATCHSET-00 copre la preparazione, mentre le fasi operative future sono etichettate come 01A–03B (richiedono citazione esplicita, es. “01A approvata”).
- Prerequisiti di governance: ogni PATCHSET deve partire da branch dedicato, con logging in `logs/agent_activity.md` e owner umano dichiarato.

## Obiettivo

Tradurre `REF_REPO_SCOPE` in un primo patchset operativo (PATCHSET-00) che prepara la struttura per i refactor successivi senza alterare i dati core.

## Ambito del patchset

- Documentazione: mantenere e completare gli output di pianificazione elencati in `REF_REPO_SCOPE` (§6.1).
- Incoming/backlog: censimento iniziale delle cartelle `incoming/` e `docs/incoming/` con README di stato.
- Nessuna modifica a `data/core/**`, `packs/**` o tooling esistente (compatibilità Golden Path).

## Deliverable

1. Documenti di pianificazione (stato DRAFT):
   - `docs/planning/REF_REPO_SOURCES_OF_TRUTH.md`
   - `docs/planning/REF_INCOMING_CATALOG.md`
   - `docs/planning/REF_PACKS_AND_DERIVED.md`
   - `docs/planning/REF_TOOLING_AND_CI.md`
   - `docs/planning/REF_REPO_MIGRATION_PLAN.md`
2. Indicizzazione incoming/backlog:
   - `incoming/README.md` con tabella INTEGRATO / DA_INTEGRARE / STORICO.
   - `docs/incoming/README.md` con schema coerente e link alle fonti note.

## Prerequisiti e governance

- Branch dedicato per ogni PATCHSET (01A–03B inclusi).
- Logging centralizzato in `logs/agent_activity.md` per ogni avanzamento.
- Owner umano esplicito su ogni documento di pianificazione (Laura B.).
- Gate incrociati prima di eseguire patch operative: conferma formale della fase (es. 01A, 01B, 02A).

## Passi successivi suggeriti

- Validare formalmente PATCHSET-00 e approvare la struttura dei sei documenti (owner: Laura B., riferimento 01A).
- Popolare `REF_INCOMING_CATALOG` con tabella di stato per `incoming/` e `docs/incoming/` e collegare alle fasi 01B/02A (pronto per 01A in v0.4).
- Collegare `REF_REPO_SOURCES_OF_TRUTH` e `REF_PACKS_AND_DERIVED` ai percorsi canonici e criteri di derivazione (allineamento 02B).
- Allineare `REF_TOOLING_AND_CI` sugli impatti nulli di PATCHSET-00 e preparare checklist per PATCHSET-01 (riferimento 03A).
- Aggiornare `REF_REPO_MIGRATION_PLAN` con exit/entry criteria e trigger di passaggio da PATCHSET-00 a PATCHSET-01/02 (sequenza 01A–03B) e avviare branch dedicati.

## Changelog

- v0.4 – Stato PROPOSTA confermato per avvio 01A–03B; governance e logging ribaditi; inventario 01A pronto (link ai README e catalogo aggiornato).
- v0.3 – Allineamento al report 0.2: PATCHSET-00 design completato, governance esplicitata (branch dedicati, logging, owner Laura B.), stato PROPOSTA in attesa di approvazione 01A–03B.
- v0.2 – Design completato, numerazione PATCHSET-00 allineata a 01A–03B.
- v0.1 – Bozza iniziale del patchset.
