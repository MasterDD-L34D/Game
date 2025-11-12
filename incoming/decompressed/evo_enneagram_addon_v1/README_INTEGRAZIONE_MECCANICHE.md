# Personality Enneagram — Mechanical Integration (Draft)

Questa bozza unifica **dataset**, **registry meccanico** e una **mappa di compatibilità** (stats/eventi/limiti).

## File
- `personality_module.v1.json` — **modulo unico** pronto per l’import nel tuo engine.
- `compat_map.json` — alias per **stat** e **eventi** + regole di stacking/limiti.

## Come usarlo
1. Parser della Scheda PG → leggi `personality.enneagram`.
2. Adapter → risolvi `stats/events` reali usando `compat_map.json` (alias).
3. Engine → attiva gli hook in `mechanics_registry.hooks` rispettando i limiti.

> Nota: valori conservativi (baseline) fino al bilanciamento con le tue statistiche canoniche.
