# Esecuzione Step 7 (Strict-Mode) – Frattura Abissale Sinaptica

## Titolo step

Validazione cross-dataset – Agente previsto: coordinator

## Input attesi

- Output Step 3–6 (bioma, pool/trait, specie, tuning numerico).
- `data/core/traits/biome_pools.json`, `data/core/species.yaml`, `data/core/biomes.yaml` per confronto formale.

## Output attesi

- Report di coerenza tra pool ambientali e trait_plan specie con evidenza di duplicati/conflitti.
- Lista patch proposta per dataset globali (species, pools, traits) con priorità e owner.
- Verifica preliminare contro gli schemi (senza applicare modifiche) e note per CI.

## Blocklist e vincoli

- **Slug**: non introdurre nuovi slug; verificare collisioni e segnalarle nel report.
- **Biome_tags**: non modificare i tag; segnalare solo mismatch o assenze.
- **Trait temporanei**: non creare/alterare trait; limitarsi a segnalarne lo stato di approvazione.
- **Affinity**: non aggiornare `species_affinity.json`; solo evidenziare cambi richiesti.

## Note operative

- Output in forma di checklist o tabella di conformità.
- Allegare rischi residui e dipendenze per il piano esecutivo finale (step 10).
