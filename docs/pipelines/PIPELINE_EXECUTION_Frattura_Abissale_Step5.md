# Esecuzione Step 5 (Strict-Mode) – Frattura Abissale Sinaptica

## Titolo step

Specie collegate e trait_plan – Agente previsto: species-curator

## Input attesi

- `data/core/species.yaml` e `data/core/species/aliases.json` per struttura e alias esistenti.
- `data/traits/species_affinity.json` per stato attuale delle affinità.
- `docs/20-SPECIE_E_PARTI.md` per linee guida narrative e anatomiche.
- Output Step 2 (hook narrativi per specie) e Step 3–4 (requisiti ambientali, pool e trait proposti).

## Output attesi

- Trait_plan proposto per Polpo Araldo Sinaptico, Sciame di Larve Neurali, Leviatano Risonante e Simbionte Corallino Riflesso.
- Biome_affinity allineate ai tre livelli, con note su sinergie/conflitti e prerequisiti.
- Indicazioni su trasformazioni di forma (Leviatano) e comportamenti condizionati dalle correnti.

## Blocklist e vincoli

- **Slug**: non creare nuovi slug specie; utilizzare denominazioni coerenti con `data/core/species.yaml` e alias esistenti.
- **Biome_tags**: non introdurre tag non validati nello step 3; referenziare solo quelli confermati.
- **Trait temporanei**: non assegnare trait non approvati nello step 4; marcali come `proposti` se necessari.
- **Affinity**: evitare modifiche dirette a `species_affinity.json`; fornire solo mapping proposti per review.

## Note operative

- Nessuna modifica ai dataset; fornire schede per review del balancer e del coordinator.
- Evidenziare eventuali requisiti di asset o storytelling che influenzano le future card (step 8).
