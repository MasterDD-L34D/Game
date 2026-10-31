# Project State Snapshot - 2026-05-04

Questo snapshot e' una fotografia operativa ricavata dall'audit precedente.
Va verificato contro repo locale prima di qualunque modifica.

## Stato concettuale

- `Game` resta fonte canonica per dataset/backend/ADR.
- `Game-Godot-v2` e' il client operativo Godot.
- `evo_tactics_param_synergy_v8_3` e' archivio legacy non canonico.

## Dataset Godot trovati nello snapshot locale

| Dataset                              |              Conteggio |
| ------------------------------------ | ---------------------: |
| `data/traits/active_effects.json`    |              458 trait |
| `data/biomes/biomes.json`            |               20 biomi |
| `data/lifecycle/lifecycles.json`     |    15 lifecycle specie |
| `data/encounters/encounters.json`    |           14 encounter |
| `data/companion/archetype_pool.json` | 5 biome pool companion |

## Stato moderno da considerare

Il progetto moderno include gia' pezzi avanzati: W5.5 cross-repo, CompanionPicker, LineagePropagator, phone composer, Sprint R protocol stack, JSON patch, resume token, JWT auth, ghost cleanup, ledger replay, EncounterRuntime, BiomeModifiers/BiomeResonance/TerrainReactions.

## Implicazione

Il legacy pack non va usato per riempire il progetto da zero. Va usato per scoprire:

- idee non ancora portate;
- identita' job da recuperare;
- sistemi futuri come gear/tag/surge;
- morph non mappati da valutare;
- eventuali regole vecchie da archiviare definitivamente.
