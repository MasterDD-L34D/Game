# Evo Tactics — Param Synergy v8.3 (Dati/Parametri)

Questa cartella ospita **parametri e dataset** provenienti da *evo_tactics_param_synergy_v8_3.zip*.

## Regole
- In caso di conflitto con valori presenti altrove, **questi parametri sono autorevoli**.
- Ogni file deve passare la validazione **YAML/JSON** e (se applicabile) lo **schema** in `docs/evo-tactics/schemas/`.
- Aggiornare `CHANGELOG` e `migration_notes.md` quando cambiano gli schemi.

## Struttura suggerita
- `tables/` tabelle e mapping
- `rules/` config delle regole
- `metadata/` versioni, compat, note