# REF_REPO_PATCH_PROPOSTA – Applicazione iniziale dello scope

Versione: 0.1 (bozza)
Data: 2025-11-23
Owner: agente **archivist** (coordinamento con coordinator/dev-tooling)
Stato: PROPOSTA – patch da validare

---

## Obiettivo

Tradurre il documento `REF_REPO_SCOPE` in un primo patchset operativo (PATCHSET-00) che non altera ancora i dati core ma prepara la struttura per i refactor successivi.

## Ambito del patchset

- Documentazione: creare gli output di pianificazione elencati in `REF_REPO_SCOPE` (section 6.1), vuoti ma con scheletro condiviso.
- Incoming/backlog: mappatura iniziale delle cartelle `incoming/` e `docs/incoming/` con README di stato.
- Nessuna modifica a `data/core/**`, `packs/**` o tooling esistente (compatibilità Golden Path).

## Deliverable proposti (PATCHSET-00)

1. Stub dei documenti di pianificazione:
   - `docs/planning/REF_REPO_SOURCES_OF_TRUTH.md`
   - `docs/planning/REF_INCOMING_CATALOG.md`
   - `docs/planning/REF_PACKS_AND_DERIVED.md`
   - `docs/planning/REF_TOOLING_AND_CI.md`
   - `docs/planning/REF_REPO_MIGRATION_PLAN.md`
     Ogni file include: scopo, owner, stato (DRAFT), elenco sezioni da riempire.

2. Indicizzazione incoming/backlog:
   - `incoming/README.md` con tabella INTEGRATO / DA_INTEGRARE / STORICO.
   - `docs/incoming/README.md` con lo stesso schema e link alle fonti note.

## Motivazione

- Rende espliciti gli output attesi (REF_REPO_SCOPE §6.1) prima di toccare dati o pack.
- Crea un perimetro chiaro per il triage di incoming e derived senza introdurre regressioni.
- Mantiene allineamento con STRICT MODE: tutto è preparato come patch proposta e può essere applicato/esteso in patchset successivi.

## Passi successivi suggeriti

- Approvare PATCHSET-00 come change-set neutrale (solo documentazione/stub).
- Pianificare PATCHSET-01 per il censimento di `data/derived/**` e fixture test.
- Pianificare PATCHSET-02 per la rigenerazione di `packs/evo_tactics_pack` a partire dai core.

---

## Changelog

- 2025-11-23: prima proposta di patch basata su `REF_REPO_SCOPE` (archivist).
