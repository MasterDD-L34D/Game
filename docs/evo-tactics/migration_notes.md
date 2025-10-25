# Note di Migrazione — Evo Tactics → Game (aggiornamento)

## Regole applicate
- **Parametri/Dati**: prevale *param-synergy* in caso di conflitto.
- **Codice/Script**: centralizzato in `modules/evo-tactics/core`.
- **Asset**: prefisso `evo-`/namespace in caso di collisione.

## File importati in questa ondata
- `data/evo-tactics/param-synergy/species/*.yaml` (espansione)
- `data/evo-tactics/param-synergy/morph/*.yaml` (espansione)
- `data/evo-tactics/param-synergy/manifest.json` + report correlati
- `modules/evo-tactics/core/` (doc aggiuntiva)

## File da trattare in seguito (campione)
- Binari o >400KB → referenziati come asset o rinominati in namespace dedicati.

## Compatibilità
- Le nuove chiavi introdotte in `param-synergy` saranno aggiunte allo schema.
- Qualsiasi rimozione avverrà via **deprecazione** documentata nel CHANGELOG.
