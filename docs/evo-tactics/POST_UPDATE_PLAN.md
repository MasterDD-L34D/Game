# 🚀 Target Post-Aggiornamento (Phase 2)

## Layout
- `modules/evo-tactics/core/…` — contenuti/logica da FullRepo
- `data/evo-tactics/param-synergy/…` — parametri/dati v8.3
- `docs/evo-tactics/…` — schemi, note migrazione, changelog

## Merge Policy (estratto)
- Parametri: **param-synergy** è autorevole
- Codice: centralizzato in core
- Asset: namespace `evo-` per evitare collisioni
- Rimozioni: via deprecazione, no delete hard

## Piano operativo
1. Copia ordinata nelle destinazioni sopra (mantenendo struttura).
2. Risoluzione conflitti secondo policy.
3. Validazione schema + smoke tests (CI).
4. Changelog e note migrazione aggiornati.
