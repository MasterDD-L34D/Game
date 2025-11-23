# Esecuzione Step 1 (Strict-Mode) – Frattura Abissale Sinaptica

## Scopo

Eseguire lo Step 1 "Kickoff e vincoli cross-dataset" della pipeline SPECIE+BIOMI in modalità analitica, senza applicare modifiche ai dataset. L’obiettivo è produrre un perimetro condiviso e una mappa di dipendenze per gli step successivi.

## Piano operativo

1. **Allineamento template**: leggere il template PIPELINE_SPECIE_BIOMA e la pipeline istanziata per confermare scope, agenti e output attesi.
2. **Mappatura dataset core**: ispezionare i file di riferimento (biomi, specie, trait, biome pools) per identificare dove potrebbero avvenire future modifiche e conflitti.
3. **Perimetro feature**: delineare i tre livelli del bioma e le quattro specie collegate, collegando ciascun ambito ai dataset interessati e ai requisiti di output dei passi successivi.
4. **Checklist impatti**: redigere una checklist di impatti e rischi su specie/bioma/trait da validare negli step successivi (senza cambiare i dati attuali).

## Input (file reali da consultare)

- `docs/PIPELINE_TEMPLATES.md` (per conferma struttura step e deliverable)
- `docs/pipelines/PIPELINE_SPECIE_BIOMA_Frattura_Abissale_Sinaptica.md` (pipeline istanziata)
- `agent_constitution.md` (vincoli di collaborazione agenti)
- `data/core/biomes.yaml` (biomi esistenti e requisiti)
- `data/core/species.yaml` (specie esistenti per allineamenti)
- `data/core/traits/biome_pools.json` (pool ambientali attuali)
- `docs/trait_reference_manual.md` (glossario e requisiti trait)

## Output atteso (nessuna scrittura su dataset)

- **Perimetro feature**: elenco chiaro di componenti bioma/livelli e specie collegate con relazioni ai dataset.
- **Mappa dipendenze**: tabella o bullet delle dipendenze tra specie, bioma, trait/pool e regole tattiche rilevanti.
- **Checklist impatti**: punti di controllo per i dataset globali (species, pool, traits) da validare negli step 3–7.

## Output elaborati (strict-mode)

### Perimetro feature

- **Bioma “Frattura Abissale Sinaptica”**
  - Livelli: `cresta fotofase` (luce residua, correnti leggere), `soglia crepuscolare` (correnti intermittenti, visibilità media), `frattura nera` (assenza luce, correnti forti e instabili).
  - Correnti elettroluminescenti: eventi ambientali temporanei che modulano `biome_tags`/`requisiti_ambientali` e forzano swap temporanei di trait ambientali (scope da modellare in `data/core/traits/biome_pools.json`).
- **Specie collegate**
  - Polpo Araldo Sinaptico (support, buff/debuff ambientali; sinergia con correnti per alterare slot supporto).
  - Sciame di Larve Neurali (swarm; manipolazione trait avversari tramite condizioni di livello bioma).
  - Leviatano Risonante (boss dinamico; varia forma in base al livello bioma, agganciare a script/flag in `data/core/species.yaml`).
  - Simbionte Corallino Riflesso (ibrido; copia parziale trait ambientali degli alleati/bioma, richiede definizione di `trait_plan` e `biome_affinity`).

### Mappa dipendenze (file/attributi reali)

- **Bioma** → `data/core/biomes.yaml`: tre livelli con `biome_tags`, `requisiti_ambientali`, eventuali hook a `biomes/terraforming_bands.yaml` per bande di terraformazione.
- **Pool ambientali** → `data/core/traits/biome_pools.json`: pool dedicati per ciascun livello (inclusi nuovi trait per correnti elettroluminescenti); mantenere coerenza con `data/core/traits/glossary.json` e `docs/trait_reference_manual.md`.
- **Specie** → `data/core/species.yaml` + `data/core/species/aliases.json`: ogni specie necessita di `trait_plan`, `biome_affinity`, eventuali alias e flag di forma dinamica per il Leviatano Risonante.
- **Affinità/specie-trait** → `data/traits/species_affinity.json`: aggiornare per ancorare i trait ambientali condivisi (soprattutto per Simbionte e Polpo Araldo).
- **Regole tattiche** → `docs/10-SISTEMA_TATTICO.md`, `docs/11-REGOLE_D20_TV.md`: verificare compatibilità di buff/debuff temporanei e trasformazioni di forma con stack di status/azioni.

### Checklist impatti (da validare negli step successivi)

- **Coerenza pool**: per ogni livello bioma, verificare che i pool ambientali non riutilizzino slug già assegnati ad altri biomi e rispettino i vincoli di rarità/slot (`data/core/traits/biome_pools.json`).
- **Trait nuovi vs glossary**: qualsiasi nuovo trait per correnti deve essere aggiunto in `data/core/traits/glossary.json` e documentato in `docs/trait_reference_manual.md` con effetti chiari su durata e interazione slot.
- **Specie**: controllare che i nuovi trait ambientali compaiano nei `trait_plan` senza violare requisiti di allineamento o costi; assicurare `biome_affinity` coerenti con i tre livelli e con eventuali alias.
- **Forma dinamica (Leviatano)**: definire campi/flag per transizioni di forma e assicurare che i valori (HP/danni/slot) rispettino le curve in `data/core/game_functions.yaml`.
- **Compatibilità terraformazione**: se il bioma richiede bande dedicate, aggiornare `biomes/terraforming_bands.yaml` mantenendo compatibilità con banding esistente.
- **Documentazione e asset**: pianificare aggiornamenti in `docs/biomes.md`, `docs/trait_reference_manual.md`, `docs/catalog/` e naming asset in `assets/` per tutte le unità coinvolte.

## File da leggere / (non) scrivere

- **Da leggere**: `docs/PIPELINE_TEMPLATES.md`, `docs/pipelines/PIPELINE_SPECIE_BIOMA_Frattura_Abissale_Sinaptica.md`, `agent_constitution.md`, `data/core/biomes.yaml`, `data/core/species.yaml`, `data/core/traits/biome_pools.json`, `docs/trait_reference_manual.md`.
- **Da scrivere**: nessuno (strict-mode, analisi soltanto).

## Self-critique

- L’esecuzione è solo concettuale: non produce ancora artefatti verificabili né valida coerenza formale con gli schemi YAML/JSON.
- La checklist andrà integrata con eventuali alias bioma/specie e con i constraint di terraformazione (biomes/terraforming_bands.yaml) negli step successivi.
- Mancano ancora i riferimenti a eventuali trait/glossary nuovi: saranno emersi solo allo step trait-curator (Step 4) e richiederanno revisione della mappa dipendenze.
