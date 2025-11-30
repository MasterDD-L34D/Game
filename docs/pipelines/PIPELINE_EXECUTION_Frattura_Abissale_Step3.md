# Esecuzione Step 3 (Strict-Mode) – Frattura Abissale Sinaptica

## Titolo step

Modellazione bioma e livelli ambientali – Agente previsto: biome-ecosystem-curator

## Input attesi

- `data/core/biomes.yaml` e `data/core/biome_aliases.yaml` per struttura campi e alias esistenti.
- `config/schemas/biome.schema.yaml` per vincoli formali.
- `biomes/terraforming_bands.yaml` per compatibilità bande/terraforming.
- `data/core/traits/biome_pools.json` per pool ambientali correnti.
- Output Step 2 (hook narrativi e mood dei tre livelli).

## Output attesi

- Scheda bioma con i tre livelli (cresta fotofase, soglia crepuscolare, frattura nera) e relative `biome_tags`/`requisiti_ambientali`.
- Alias e bande di terraformazione allineate alle correnti elettroluminescenti.
- Piano preliminare dei pool ambientali per livello, con note su interazioni correnti.

## Blocklist e vincoli

- **Slug**: non introdurre slug che collidono con biomi esistenti; evitare riuso di slug di eventi generici.
- **Biome_tags**: vietati tag fuori schema (`config/schemas/biome.schema.yaml`); evitare combinazioni duplicate tra livelli.
- **Trait temporanei**: non generare trait in questo step; solo note descrittive per il trait-curator.
- **Affinity**: non dichiarare affinità specie; spostare al passo species-curator.

## Note operative

- Tutte le uscite sono analitiche; nessuna modifica ai file YAML/JSON.
- Annotare dipendenze con i pool esistenti per semplificare la validazione del balancer.
