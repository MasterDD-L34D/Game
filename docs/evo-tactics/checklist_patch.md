# Checklist Patch — Evo Tactics

- [ ] Esegui apply_patch.py (prima dry‑run, poi apply) con i due ZIP originali
- [ ] Verifica albero inserito in data/evo-tactics/param-synergy/ e modules/evo-tactics/core/
- [ ] Esegui gli script in tools/build/ per generare i monoliti data/*.yaml
- [ ] Aggiorna riferimenti nel codice/scene a nuovi percorsi (specie, morph, rules, pack)
- [ ] Depreca/archivia duplicati in archive_from_user/_dedup/**
- [ ] Aggiorna docs/evo-tactics/schemas.md con nuove top‑level keys
- [ ] Aggiorna docs/evo-tactics/migration_notes.md con import/skipped/compat
- [ ] CI lint/validate OK
