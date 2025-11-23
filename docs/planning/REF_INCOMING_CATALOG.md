# REF_INCOMING_CATALOG – Catalogo incoming/backlog

Versione: 0.1 (bozza)
Data: 2025-11-23
Owner: agente **archivist** (supporto: coordinator)
Stato: DRAFT – struttura per mappare incoming/backlog

---

## Obiettivi

- Catalogare il contenuto di `incoming/**` e `docs/incoming/**` con stato (INTEGRATO / DA_INTEGRARE / STORICO) e priorità di triage.
- Distinguere materiale attivo (buffer) da legacy o archivio, indicando percorso di destinazione o archiviazione.
- Collegare le fonti incoming a patchset/ticket che ne gestiranno l’integrazione nei core o nei pack derivati.

## Stato attuale

- Esistono cartelle `incoming/` e `docs/incoming/` senza una tabella centralizzata di stato e senza owner per fonte.
- Non sono documentate le dipendenze tra materiale incoming e i core/pack già integrati.
- Non è definito un criterio condiviso per spostare i file in `incoming/buffer`, `incoming/legacy` o `incoming/archive_cold`.

## Rischi

- Rumore e duplicati rispetto ai core o ai pack derivati se il materiale non viene etichettato prima dell’uso.
- Incertezza sullo stato di integrazione può portare a reimport multipli o a perdere materiale utile.
- Mancanza di tracciamento verso ticket/patchset rende difficile decidere priorità e responsabili.

## Dipendenze

- `REF_REPO_SOURCES_OF_TRUTH` per confrontare le fonti incoming con i dataset canonici.
- `REF_PACKS_AND_DERIVED` per capire l’impatto del materiale incoming sui pack e sui derived.
- `REF_REPO_MIGRATION_PLAN` per schedulare quando integrare/archiviare ciascuna fonte.
- Supporto di coordinator per priorità e di dev-tooling per eventuali script di import/validazione.

## Prossimi passi

1. Creare una tabella con percorso sorgente, descrizione, stato, owner e link a ticket/patchset previsti.
2. Etichettare le fonti esistenti assegnandole a `buffer`, `legacy` o `archive_cold` in base alla priorità e all’utilizzo.
3. Segnalare le fonti che toccano dati core o pack ufficiali e allinearle con i responsabili di dominio (trait/specie/biomi).
4. Definire regole minime di accettazione (formato, checksum, schema) prima di muovere una fonte da DA_INTEGRARE a INTEGRATO.
5. Integrare la tabella nel flusso di PATCHSET successivi e mantenerla sincronizzata con `docs/incoming/README.md`.

---

## Changelog

- 2025-11-23: struttura iniziale del catalogo incoming (archivist).
