---
title: "Node id MAIUSCOLI: non e' un bug, e' una convenzione che cola"
museum_id: M-2026-07-14-004
type: architecture
domain: [architecture]
provenance:
  found_at: 'packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml:19-56 + cross_events.yaml + packs/evo_tactics_pack/data/species/badlands/echo-wing.yaml:5-9'
  git_sha_first: '8ee399e8'
  git_sha_last: '2c5a8942'
  last_modified: '2026-07-14'
  last_author: 'MasterDD-L34D'
  buried_reason: forgotten
relevance_score: 3
reuse_path: 'packs/evo_tactics_pack/data/species/badlands/echo-wing.yaml:7-9 -- 3 biomi MAIUSCOLI in un campo che vuole slug minuscoli; NON "correggere" abbassando il case'
related_pillars: [P1, P3]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-07-14
last_verified: 2026-07-14
---

# Node id MAIUSCOLI: non e' un bug, e' una convenzione che cola

## Summary (30s)

- Il **livello 4** dello stack worldgen (meta-network) usa **node id MAIUSCOLI**: `DESERTO_CALDO`, `CRYOSTEPPE`, `BADLANDS`. E' una convenzione **deliberata e coerente** dentro il suo livello.
- Una specie l'ha **copiata nel posto sbagliato**: `badlands/echo-wing.yaml:5-9` dichiara `biomes: [badlands, FORESTA_TEMPERATA, DESERTO_CALDO, CRYOSTEPPE]` -- **1 slug minuscolo + 3 node id maiuscoli** nello stesso array.
- Le regole ambientali fanno string-match su slug **minuscoli**. I 3 maiuscoli **non matchano mai**, in silenzio. **Sembra un bug. E' una convenzione che cola da un livello all'altro.**
- **Il prossimo che lo vede non deve "correggerlo" abbassando il case** -- perche' il node id maiuscolo NON e' lo slug del bioma. C'e' un'indirezione.

## What was buried

### La convenzione (corretta, nel suo livello)

`packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml:19-56`:

```yaml
network:
  id: ET_NET_ALPHA
  start_node: DESERTO_CALDO
  nodes:
    - id: BADLANDS
      biome_id: canyons_risonanti # <-- INDIREZIONE
      path: packs/.../badlands.ecosystem.yaml
    - id: FORESTA_TEMPERATA
      biome_id: foresta_miceliale
    - id: DESERTO_CALDO
      biome_id: savana
    - id: CRYOSTEPPE
      biome_id: mezzanotte_orbitale
    - id: ROVINE_PLANARI
      biome_id: rovine_planari
      terminal: true
    - id: ATOLLO_OBSIDIANA
      biome_id: atollo_obsidiana
```

Il `MAIUSCOLO` e' un **node id di grafo** (`ET_NET_ALPHA`, `BADLANDS`), non uno slug di bioma. Il bioma vero e' in `biome_id`, minuscolo. Stessa convenzione in `cross_events.yaml` (`from_nodes: [BADLANDS]`, `to_nodes: [FORESTA_TEMPERATA, DESERTO_CALDO]`).

**Dentro il livello 4 e' consistente e corretto.** Il MAIUSCOLO segnala "sono un nodo, non un bioma".

### La colata (il problema)

`packs/evo_tactics_pack/data/species/badlands/echo-wing.yaml:5-9`:

```yaml
biomes:
  - badlands # slug minuscolo -- matcha
  - FORESTA_TEMPERATA # node id -- NON matcha
  - DESERTO_CALDO # node id -- NON matcha
  - CRYOSTEPPE # node id -- NON matcha
```

Il campo `biomes` di una specie vuole **slug di bioma minuscoli**. `echo-wing` e' una **bridge species** (`flags.bridge: true`, `role_trofico: dispersore_ponte`): il suo autore ha guardato il grafo di rete -- dove i ponti _vivono_ -- e ha copiato i node id da li'. Semanticamente ha ragione: echo-wing **e'** un ponte tra quei nodi. Sintatticamente sta scrivendo in un campo che parla un'altra lingua.

Risultato: le regole ambientali che fanno string-match su `biomes` vedono **un solo bioma valido** (`badlands`) invece di quattro. Gli altri tre sono no-op silenziosi.

### Perche' NON si corregge abbassando il case

L'indirezione `id -> biome_id` **non e' l'identita'**:

| node id             | `biome_id` reale      | lowercase ingenuo   | corretto? |
| ------------------- | --------------------- | ------------------- | --------- |
| `FORESTA_TEMPERATA` | `foresta_miceliale`   | `foresta_temperata` | **NO**    |
| `DESERTO_CALDO`     | `savana`              | `deserto_caldo`     | **NO**    |
| `CRYOSTEPPE`        | `mezzanotte_orbitale` | `cryosteppe`        | **NO**    |
| `BADLANDS`          | `canyons_risonanti`   | `badlands`          | **NO**    |

**Zero su quattro.** Un `.lower()` produrrebbe 4 slug che _esistono_ come directory specie ma che **non sono i biomi a cui il nodo punta**. Il fix "ovvio" e' sbagliato in tutti e quattro i casi -- e sbagliato **in silenzio**, perche' gli slug lowercase esistono davvero e matcherebbero qualcosa.

**Il fix corretto e' risolvere via `biome_id`, non via case.**

### Il terzo strato di confusione

Gli stessi 4 slug lowercase (`foresta_temperata`, `badlands`, `deserto_caldo`, `cryosteppe`) sono **esattamente i 4 alias `status: migrated`** di `data/core/biome_aliases.yaml:12-27` -- e le mappature **non concordano** con il network:

| slug                | `biome_aliases.yaml` dice      | `meta_network_alpha.yaml` dice | concordano? |
| ------------------- | ------------------------------ | ------------------------------ | ----------- |
| `foresta_temperata` | -> `foresta_miceliale`         | -> `foresta_miceliale`         | **si'**     |
| `cryosteppe`        | -> `mezzanotte_orbitale`       | -> `mezzanotte_orbitale`       | **si'**     |
| `badlands`          | -> `dorsale_termale_tropicale` | -> `canyons_risonanti`         | **NO**      |
| `deserto_caldo`     | -> `abisso_vulcanico`          | -> `savana`                    | **NO**      |

**Due fonti di verita' per la stessa risoluzione, in disaccordo su 2 casi su 4.** E tutti e 4 gli slug hanno comunque specie reali vive (vedi [M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md)).

## Why it was buried

Il MAIUSCOLO e' nato con il meta-network (`8ee399e8`, receipt `PTPF.v1.0`, 2025-10-25) come convenzione **interna al livello 4**, dove e' sensata: distingue nodi di grafo da biomi.

Non e' mai stata scritta da nessuna parte come convenzione **di livello**. Non c'e' schema, non c'e' validator, non c'e' commento che dica "MAIUSCOLO = node id, minuscolo = biome slug". Quindi ha **colato** verso il basso appena un autore ha guardato il grafo per capire dove vive la sua bridge species.

Un solo caso noto (`echo-wing`). Ma il meccanismo che l'ha prodotto e' ancora attivo.

## Why it might still matter

- **Trappola per il prossimo**: chiunque veda `FORESTA_TEMPERATA` in un campo `biomes` pensera' "typo, abbasso il case". Produrrebbe **4 mapping sbagliati su 4**, silenziosamente. Questa card esiste soprattutto per **impedire quel fix**.
- **Famiglia di difetti nota**: e' lo stesso pattern degli strati 1-3 della saga coverage -- **string-match che fallisce in silenzio invece di esplodere** ([M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md)). La cura e' la stessa: **validare al parser**.
- **L'ADR #3302 tocca proprio questo strato** (modello dati biome/species). E' il momento giusto per decidere la convenzione, non dopo.
- `echo-wing` e' una bridge species: e' esattamente il tipo di entita' che il cross-bioma event propagation ([M-2026-04-26-014](worldgen-cross-bioma-events-propagation.md)) dovrebbe consumare. Finche' 3 dei suoi 4 biomi non matchano, e' un ponte **rotto**.

## Concrete reuse paths

1. **Minimal** (P0, ~0.5h): **valida al parser**. Il campo `biomes` di una specie rifiuta qualsiasi valore non-lowercase con un errore esplicito che dice _"i node id del meta-network non sono biome slug -- risolvi via `biome_id`"_. Stesso pattern di `trait_coverage.py:197-210`. Blast radius x1.0.
2. **Moderate** (P1, ~1-2h): **ripara `echo-wing`** risolvendo i 3 node id via `biome_id` (-> `foresta_miceliale`, `savana`, `mezzanotte_orbitale`) **e non via lowercase**. Prima pero' va sciolto il disaccordo network-vs-aliases su `badlands`/`deserto_caldo` (vedi Risks). Blast radius x1.0 (data YAML), ma **gated** su una decisione di design.
3. **Full** (P2, ~3-4h): **documenta la convenzione di livello** nello schema (`packs/evo_tactics_pack/docs/ecosystem.schema.v1.1.yaml`): MAIUSCOLO = node id livello 4, minuscolo = biome slug livelli 1-3. Aggiungi il validator. Blast radius x1.2.

## Sources / provenance trail

- Convenzione: [packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml:19-56](../../../packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml) -- `start_node: DESERTO_CALDO`, 6 nodi con indirezione `biome_id`
- Convenzione (2): [packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml](../../../packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml) -- `from_nodes` / `to_nodes` MAIUSCOLI, 3 eventi
- La colata: [packs/evo_tactics_pack/data/species/badlands/echo-wing.yaml:5-9](../../../packs/evo_tactics_pack/data/species/badlands/echo-wing.yaml)
- Il disaccordo: [data/core/biome_aliases.yaml:12-27](../../../data/core/biome_aliases.yaml)
- Origine convenzione: `8ee399e8` -- receipt `source: PTPF.v1.0, author: designer, date: 2025-10-25`

## Risks / open questions

- **DUPLICATO NON RISOLTO**: esiste un **secondo** `cross_events.yaml` in `packs/evo_tactics_pack/data/ecosistemi/cross_events.yaml` (directory con nome **italiano** `ecosistemi/`, accanto a quella inglese `ecosystems/`). Anch'esso usa i node id MAIUSCOLI. **Non ho determinato quale sia autoritativo.** Va risolto nell'ADR -- due file con lo stesso nome e contenuto simile in due directory che differiscono solo per lingua sono un incidente in attesa.
- **Disaccordo network-vs-aliases su 2/4 slug** (`badlands`, `deserto_caldo`): prima di riparare `echo-wing` bisogna decidere **quale fonte vince**. Non e' una domanda di implementazione, e' una domanda di design. **Non riparare `echo-wing` finche' non e' decisa.**
- **Un solo caso noto** di colata (`echo-wing`). Non ho fatto uno sweep completo su tutti i 105 file specie per altri valori MAIUSCOLI nel campo `biomes` -- **da fare** prima di chiudere l'ADR.

## Cross-links

- [M-2026-07-14-001 -- Coverage fabbricata: 5 strati](lesson-coverage-fabrication-five-layers.md) -- stessa famiglia: silent-no-match
- [M-2026-07-14-003 -- `biome_class`: una chiave, due significati](worldgen-biome-class-key-overload.md)
- [M-2026-04-26-014 -- Cross-bioma event propagation](worldgen-cross-bioma-events-propagation.md) -- il consumatore che `echo-wing` dovrebbe servire
- [M-2026-04-26-012 -- Worldgen Stack 4-livelli](worldgen-bioma-ecosistema-foodweb-network-stack.md) -- il livello 4 da cui cola la convenzione
