# Canonical Source Map

## Gerarchia fonti

| Fonte                                 | Ruolo                                                                                                     | Fiducia                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `MasterDD-L34D/Game`                  | Fonte canonica per backend, dataset YAML, servizi Express/WS, ADR, session/combat/AI e logica cross-stack | Alta                                       |
| `MasterDD-L34D/Game-Godot-v2`         | Client Godot operativo: UI, runtime GDScript, phone composer, GUT, port dei dataset                       | Alta per client/runtime                    |
| `evo_tactics_param_synergy_v8_3`      | Archivio legacy di idee, YAML, prototipi, regole playtest e spawn pack                                    | Media come ispirazione, bassa come runtime |
| `EvoTactics_FullRepo_v1.0.zip` locale | Non risulta copia utile di `Game` aggiornato; contiene prompt/devkit/telemetry                            | Bassa per questo task                      |

## Regola di promozione

Un elemento legacy puo' entrare nel progetto vivo solo se passa questi gate:

1. Identificazione: quale file legacy propone l'idea?
2. Confronto: esiste gia' in `Game` o `Game-Godot-v2`?
3. Classificazione: gia' assorbito, parziale, non mappato, superato, design reference.
4. Design review: vale ancora? E' coerente con 6 Pilastri?
5. Canonizzazione: se valido, prima proposta in `Game` come dataset/spec/ADR.
6. Port/sync: solo dopo, adattamento in `Game-Godot-v2`.
7. Test: backend test / GUT / snapshot parity dove applicabile.

## Anti-drift

- Non fidarti di un solo README se PR e CLAUDE.md sono piu' aggiornati.
- Prima di agire, leggi stato repo locale.
- Tratta i documenti vecchi come segnali, non come verita' assoluta.
- Se trovi disallineamento tra docs e codice, apri nota drift invece di correggere alla cieca.
