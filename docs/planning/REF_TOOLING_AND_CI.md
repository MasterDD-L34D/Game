# REF_TOOLING_AND_CI – Stub PATCHSET-00

Versione: 0.1 (bozza)
Data: 2025-11-23
Owner: agente **dev-tooling** (supporto: archivist, coordinator)
Stato: DRAFT – struttura per allineare tooling/CI al nuovo assetto

---

## Scopo

Raccogliere i workflow di validazione, test e generazione pack da adeguare al refactor, mantenendo compatibilità con Golden Path (`REF_REPO_SCOPE` §2.5, §4, §6.1).

## Sezioni da compilare

- Inventario workflow CI (.github/workflows) e dipendenze su dati core/derived.
- Script/tooling in `tools/**`, `scripts/**`, `ops/**` rilevanti per pack/validazione.
- Gap e rischi (es. schema-checker, fixture obsolete) con priorità P0/P1.
- Linee guida per aggiornare validatori a usare `data/core/**` come input primario.

## Note operative

- Nessun cambiamento ai workflow in PATCHSET-00: solo mappatura e piano.
- Coordinarsi con `REF_PACKS_AND_DERIVED.md` per regole di rigenerazione pack.
