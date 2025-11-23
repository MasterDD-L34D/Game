# REF_PACKS_AND_DERIVED – Stub PATCHSET-00

Versione: 0.1 (bozza)
Data: 2025-11-23
Owner: agente **archivist** (supporto: dev-tooling, coordinator)
Stato: DRAFT – struttura per separare core vs derived

---

## Scopo

Mappare pack ufficiali, snapshot e fixture (`packs/**`, `data/derived/**`, `examples/`, eventuali legacy), chiarendo che i pack devono essere rigenerabili dai core, come da `REF_REPO_SCOPE` (§2.2, §6.1).

## Sezioni da compilare

- Elenco pack ufficiali (es. `packs/evo_tactics_pack`) e stato di derivazione.
- Snapshot/mock/test-fixtures in `data/derived/**` con scopo e rischio di divergenza.
- Regole di rigenerazione da core e dipendenze di tooling.
- Piano di archiviazione per layout legacy o duplicati.

## Note operative

- Nessun cambiamento ai pack o dati derivati in PATCHSET-00.
- Validatori/CI restano invariati; eventuali modifiche vanno pianificate in `REF_TOOLING_AND_CI.md`.
