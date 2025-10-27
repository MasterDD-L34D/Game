# Manifest Biomi

Questo documento elenca i biomi menzionati nei canvas progettuali, nei dataset delle specie e negli esempi di encounter, fornendo un identificatore canonico da utilizzare in `data/biomes.yaml` e nelle integrazioni future.

## Convenzioni
- **ID canonico**: chiave snake_case utilizzata nei dataset YAML.
- **Alias**: varianti già presenti nei dataset legacy (per esempio classi o chiavi storiche).
- **Fonti**: file che menzionano esplicitamente il bioma.
- I campi introdotti nella nuova struttura YAML possono temporaneamente contenere i placeholder `TODO` / `TBD` finché non vengono definiti contenuti finali.

## Indice canonico

| ID | Nome di riferimento | Alias | Fonti principali | Note |
| --- | --- | --- | --- | --- |
| `savana` | Savana ionizzata | – | `data/biomes.yaml`, `docs/examples/encounter_savana.txt` | Bioma già integrato nel generatore encounter.【F:data/biomes.yaml†L3-L26】【F:docs/examples/encounter_savana.txt†L1-L47】 |
| `caverna` | Caverna risonante | `caverna_risonante` | `data/biomes.yaml`, `data/species.yaml`, `docs/examples/encounter_caverna.txt` | Canonico per i piani ambientali della forma Dune Stalker.【F:data/biomes.yaml†L27-L52】【F:data/species.yaml†L58-L87】【F:docs/examples/encounter_caverna.txt†L1-L47】 |
| `palude` | Palude tossica | – | `data/biomes.yaml`, `docs/examples/encounter_palude.txt` | Già presente negli esempi encounter generati.【F:data/biomes.yaml†L53-L76】【F:docs/examples/encounter_palude.txt†L1-L47】 |
| `canyons_risonanti` | Canyons Risonanti | – | `appendici/C-CANVAS_NPG_BIOMI.txt` | Canvas NPG con StressWave +0.05 per turno scoperto.【F:appendici/C-CANVAS_NPG_BIOMI.txt†L19-L38】 |
| `foresta_miceliale` | Foresta Miceliale | – | `appendici/C-CANVAS_NPG_BIOMI.txt` | Canvas NPG con affissi Spore Bloom / Myco Link.【F:appendici/C-CANVAS_NPG_BIOMI.txt†L39-L47】 |
| `atollo_obsidiana` | Atollo Obsidiana | – | `appendici/C-CANVAS_NPG_BIOMI.txt` | Canvas NPG con maree magnetiche e shard storm.【F:appendici/C-CANVAS_NPG_BIOMI.txt†L48-L56】 |
| `mezzanotte_orbitale` | Mezzanotte Orbitale (Stazione) | – | `appendici/C-CANVAS_NPG_BIOMI.txt` | Canvas stazione orbitale Zero-G Flux / Alarm Cascade.【F:appendici/C-CANVAS_NPG_BIOMI.txt†L57-L65】 |
| `aurora_grove` | Bosco Aurora (fixture) | – | `data/test-fixtures/minimal/data/biomes.yaml` | Bioma di test per le fixture minimal del validatore.【F:data/test-fixtures/minimal/data/biomes.yaml†L1-L8】 |

## Sorgenti verificate
- Canvas C — NPG Reattivi, Biomi & Director.【F:appendici/C-CANVAS_NPG_BIOMI.txt†L1-L65】
- Dataset specie (`data/species.yaml`).【F:data/species.yaml†L1-L87】
- Dataset biomi (`data/biomes.yaml`) e fixture minimal correlate.【F:data/biomes.yaml†L1-L76】【F:data/test-fixtures/minimal/data/biomes.yaml†L1-L8】
- Esempi di encounter generati in `docs/examples/`.【F:docs/examples/encounter_savana.txt†L1-L47】【F:docs/examples/encounter_caverna.txt†L1-L47】【F:docs/examples/encounter_palude.txt†L1-L47】

Questo manifesto va aggiornato ogni volta che nuovi biomi vengono introdotti in canvas, dataset o script di generazione.
