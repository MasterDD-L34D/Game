# Esecuzione Step 4 (Strict-Mode) – Frattura Abissale Sinaptica

## Titolo step

Trait ambientali e correnti elettroluminescenti – Agente previsto: trait-curator

## Input attesi

- `data/core/traits/biome_pools.json` per stato attuale dei pool ambientali.
- `data/core/traits/glossary.json` e `docs/trait_reference_manual.md` per definizioni e convenzioni.
- `data/traits/index.json` e `data/traits/species_affinity.json` per coerenza slug/affinity.
- `Trait Editor/docs/howto-author-trait.md` per requisiti editoriali.
- Output Step 3 (scheda bioma e piano pool per livello).

## Output attesi

- Elenco trait ambientali/temporanei per ogni livello, inclusi eventuali nuovi slug proposti con descrizione sintetica.
- Aggiornamento proposto dei pool per cresta fotofase, soglia crepuscolare e frattura nera.
- Note su mapping glossary per correnti elettroluminescenti e interazioni con slot/trait esistenti.

## Blocklist e vincoli

- **Slug**: evitare duplicati con slug presenti in `data/core/traits/glossary.json` e `data/traits/index.json`.
- **Biome_tags**: non modificare tag definiti nello step 3; solo referenziarli.
- **Trait temporanei**: vietato riutilizzare slug segnaposto generici (es. `temp_*`); nominare in modo coerente con glossario.
- **Affinity**: non impostare affinity specie definitive; limitarsi a suggerire compatibilità generali.

## Note operative

- Non applicare patch ai JSON; produrre solo proposte strutturate e verificabili.
- Evidenziare per livello quali trait sono gating o opzionali per il balancer (step 6).
