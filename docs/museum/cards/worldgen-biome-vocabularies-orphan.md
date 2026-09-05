---
title: 'Due vocabolari bioma orfani: 12 biomi reali mai cablati + 21 nomi fabbricati'
museum_id: M-2026-07-14-002
type: dataset
domain: [architecture]
provenance:
  found_at: 'packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml:2-30 + packs/evo_tactics_pack/data/species/'
  git_sha_first: '089b6aa0'
  git_sha_last: '2c5a8942'
  last_modified: '2026-07-14'
  last_author: 'MasterDD-L34D'
  buried_reason: unintegrated
relevance_score: 4
reuse_path: 'data/core/biomes.yaml -- i 2 vocabolari sono materiale grezzo per design bioma futuro; nessuno dei 33 nomi ha contenuto, tutti hanno intento'
related_pillars: [P1, P3, P6]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-07-14
last_verified: 2026-07-14
---

# Due vocabolari bioma orfani: 12 biomi reali mai cablati + 21 nomi fabbricati

## Summary (30s)

- L'ADR su issue #3302 sta per **cancellare** `biome_classes.yaml` (i suoi `koppen_examples` migrano in `data/core/biomes.yaml`) e le 21 directory bioma fabbricate. Dentro ci sono **due liste di nomi bioma** che nessuno ha mai progettato -- e che valgono piu' dei file che le contengono.
- **Vocabolario A** (12 nomi): qualcuno ha costruito una **tassonomia bioma del mondo reale** (taiga, tundra, savanna, reef, macchia mediterranea...) e non l'ha **mai cablata**. Zero regole, zero specie, zero contenuto. Solo nomi in una lista.
- **Vocabolario B** (21 nomi): nomi bioma **evocativi e originali** (`abisso_luminescente`, `cicloni_psionici`, `reti_micorriziche`, `paludi_gas_luminescenti`...) nati come stub `coverage_autogen` -- mai riempiti, ma **nomi buoni**.

**Materiale grezzo per design bioma futuro. Cardato prima della cancellazione.**

## What was buried

### ATTENZIONE: il file NON e' morto -- e' load-bearing OGGI

Prima di tutto, una correzione che deve precedere qualsiasi cancellazione.

`packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` **e' letto a runtime dal gate di copertura**: `tools/py/game_utils/trait_coverage.py:74-95` (`_load_koppen_biomes`) **inverte** i suoi `koppen_examples` in `{koppen_code: [biome_class, ...]}` per **espandere** le regole climatiche `koppen_in` / `koppen_any` sulle biome class che quei codici toccano davvero.

> **Cancellare il file senza prima migrare `koppen_examples` rompe l'espansione koppen introdotta da #3300** -- cioe' esattamente il fix dello strato 3. L'ADR lo prevede (migrazione in `biomes.yaml`); questa card lo mette per iscritto perche' l'ordine delle operazioni e' load-bearing.

> **Correzione di path**: il file **non** sta in `data/core/`. Sta in `packs/evo_tactics_pack/tools/config/registries/`.

### La scomposizione dei 28

`biome_classes.yaml:2-30` elenca **28** `classes`. Scomposte contro `data/core/biomes.yaml` (20 chiavi canoniche):

| gruppo                      | N      | cosa sono                                          |
| --------------------------- | ------ | -------------------------------------------------- |
| duplicati di `biomes.yaml`  | **13** | ridondanza pura                                    |
| **biomi reali mai cablati** | **12** | **Vocabolario A -- vedi sotto**                    |
| risolvibili via alias       | **3**  | `cryosteppe`, `deserto_caldo`, `caverna_risonante` |

I 13 duplicati: `foresta_temperata`, `palude`, `badlands`, `caldera_glaciale`, `foresta_acida`, `pianura_salina_iperarida`, `stratosfera_tempestosa`, `abisso_vulcanico`, `reef_luminescente`, `dorsale_termale_tropicale`, `canopia_ionica`, `steppe_algoritmiche`, `rovine_planari`.

### Vocabolario A -- 12 biomi del mondo reale, mai cablati

Qualcuno ha costruito una tassonomia bioma **realistica** e l'ha lasciata a meta'. Verificato: **zero** di questi 12 compare in `env_traits.json` (tranne 2, vedi nota), **zero** ha specie reali.

| nome                   | in `biomes.yaml`? | `koppen_examples`? | alias?                 | dir specie? | specie reali   |
| ---------------------- | ----------------- | ------------------ | ---------------------- | ----------- | -------------- |
| `taiga`                | no                | no                 | no                     | no          | **0**          |
| `tundra`               | no                | no                 | no                     | no          | **0**          |
| `reef`                 | no                | no                 | no                     | no          | **0**          |
| `costa_rocciosa`       | no                | no                 | no                     | no          | **0**          |
| `foresta_boreale`      | no                | no                 | no                     | no          | **0**          |
| `macchia_mediterranea` | no                | no                 | no                     | no          | **0**          |
| `prateria_temperata`   | no                | no                 | no                     | no          | **0**          |
| `deserto_freddo`       | no                | no                 | no                     | no          | **0**          |
| `caverne`              | no                | no                 | no                     | no          | **0**          |
| `savanna`              | no                | no                 | -> `savana`            | no          | **0**          |
| `laguna_bioreattiva`   | no                | **si'** (Af, Am)   | -> `reef_luminescente` | si'         | **0** (1 stub) |
| `mangrovieto_cinetico` | no                | **si'** (Am)       | -> `palude`            | si'         | **0** (1 stub) |

**9 sono orfani totali** (nessun bioma canonico, nessun koppen, nessun alias, nessuna specie, nessuna directory): `taiga`, `tundra`, `reef`, `costa_rocciosa`, `foresta_boreale`, `macchia_mediterranea`, `prateria_temperata`, `deserto_freddo`, `caverne`.

`savanna` e' solo una forma inglese aliasata su `savana`. `laguna_bioreattiva` e `mangrovieto_cinetico` sono gli unici due con _qualche_ aggancio (koppen + alias `expansion`) ma **zero specie reali**.

**Questa e' una tassonomia bioma del mondo reale, progettata e mai collegata a nulla.** Nove nomi di biomi terrestri classici che Evo-Tactics non ha.

### Vocabolario B -- 21 nomi fabbricati, mai riempiti

Le 21 directory in `packs/evo_tactics_pack/data/species/` il cui unico file e' uno stub `*-trait-keeper.yaml` da 3 righe, **zero specie**. Nate `coverage_autogen` in `089b6aa0`, svuotate nel ciclo `7c62b510` -> `9acadc69` (vedi [M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md)).

I nomi -- che sono la parte che vale:

```
abisso_luminescente          gole_ventose
altipiani_solari             laghi_alcalini
barriere_coralline_psioniche mangrovie_risonanti
calotte_glaciali             paludi_gas_luminescenti
canopie_sospese              permafrost_psionico
cicloni_psionici             pianure_magnetiche
delta_salmastri              picchi_cristallini
dune_cristalline             reti_micorriziche
foreste_nubose               sorgenti_geotermiche
                             steppe_risonanti
                             stratosfera_portante
                             tundra_risonante
```

Sono nomi **coerenti col tono di Evo-Tactics** (psionico, risonante, cristallino, luminescente) e in buona parte **ecologicamente sensati** (`delta_salmastri`, `laghi_alcalini`, `sorgenti_geotermiche`, `reti_micorriziche`, `foreste_nubose` sono biomi reali con un twist). Nessuno e' mai stato progettato: hanno solo un nome e uno stub.

**Un designer ha immaginato 21 biomi e li ha lasciati come cartelle vuote.**

## Why it was buried

Due sepolture diverse, stesso movente.

- **Vocabolario A**: qualcuno ha impostato `biome_classes.yaml` come registro di _biome class_ (tassonomia ecologica del mondo reale) mentre `biomes.yaml` cresceva come registro di _biomi di gioco_ (fantasy/sci-fi). I due registri hanno divergito, il primo si e' fossilizzato. Nessun ADR copre la divergenza. Vedi card [M-2026-07-14-003](worldgen-biome-class-key-overload.md) per il danno semantico che ne e' seguito.
- **Vocabolario B**: le 21 directory non sono state progettate -- sono state **generate** per far quadrare una metrica (`receipt.source: coverage_autogen`, `author: automation`). I nomi sono l'unico output umano/di design sopravvissuto al processo; il contenuto non e' mai esistito.

## Why it might still matter

**L'ADR li cancella. I nomi no.**

- Evo-Tactics oggi ha **20 biomi canonici** in `biomes.yaml` e **6 nodi** nel meta-network. Il gioco e' _biome-poor_ rispetto alla sua stessa ambizione (lo stack 4-livelli di [M-2026-04-26-012](worldgen-bioma-ecosistema-foodweb-network-stack.md)).
- Qui ci sono **33 nomi bioma gia' pensati** (12 + 21), zero dei quali richiede un ADR per essere riusato: sono vocabolario, non decisioni.
- Il Vocabolario A copre un **buco reale**: Evo-Tactics non ha nessun bioma **temperato/boreale classico** (taiga, tundra, foresta boreale, prateria, macchia mediterranea). Tutti i 20 canonici sono estremi o esotici. Se serve un bioma "normale" come contrasto tonale, la lista e' gia' scritta.
- Il Vocabolario B copre il buco opposto: nomi **gia' allineati al tono** per espansioni bioma senza dover inventare naming.

## Concrete reuse paths

1. **Minimal** (P0, ~0.5h): **preserva le due liste** (questa card lo fa). Nell'ADR, cita questa card come destinazione dei nomi prima del `git rm`. Costo zero, perdita evitata.
2. **Moderate** (P1, ~4-6h): scegli **1** nome dal Vocabolario A come **bioma di contrasto tonale** (raccomandato: `foresta_boreale` o `prateria_temperata` -- i piu' "normali", massimo contrasto con l'attuale roster esotico) e progettalo davvero: entry in `data/core/biomes.yaml` (con `biome_class` corretto, vedi M-2026-07-14-003) + `koppen_examples` + 3-4 specie reali. Blast radius x1.0 (pure data YAML).
3. **Full** (P2, ~20-30h): usa il Vocabolario B come **backlog di espansione bioma**. 21 nomi -> seleziona 5, progetta lo stack 4-livelli completo per ognuno (biome + ecosystem + foodweb + nodo network). Blast radius x1.2 (service layer: `biomeSpawnBias.js`, `catalog.js`). **Prerequisito**: l'ADR #3302 deve prima chiudere il modello dati, altrimenti si costruisce sopra la stessa ambiguita'.

## Sources / provenance trail

- Registro classi: [packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml:2-30](../../../packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml) -- 28 `classes`, 16 `koppen_examples`
- Consumatore load-bearing: [tools/py/game_utils/trait_coverage.py:74-95](../../../tools/py/game_utils/trait_coverage.py) -- `_load_koppen_biomes`
- Biomi canonici: [data/core/biomes.yaml](../../../data/core/biomes.yaml) -- 20 chiavi
- Directory fabbricate: `packs/evo_tactics_pack/data/species/<biome>/` -- 49 dir, 30 con solo keeper, **21 con keeper da 3 righe**
- Nascita: `089b6aa0` (2025-10-29) `receipt: {source: coverage_autogen, author: automation}`
- Svuotamento: `7c62b510` (2025-11-30, delete) -> `9acadc69` (2025-12-09, restore-as-stub)

Issue / PR: [#3302](https://github.com/MasterDD-L34D/Game/issues/3302) OPEN -- _"21 fabricated biome dirs (coverage_autogen) + 4 contradictory aliases + biome_class key overload"_. Censimento: [#3304](https://github.com/MasterDD-L34D/Game/pull/3304) MERGED.

## Risks / open questions

- **ORDINE DI OPERAZIONI (P1)**: `koppen_examples` deve migrare in `biomes.yaml` **prima** che `biome_classes.yaml` venga cancellato, altrimenti `_load_koppen_biomes` restituisce `{}` e le 3 regole koppen ricollassano sulla combo insoddisfacibile `(None, None)` -- reintroducendo lo strato 3.
- **Solo 16 dei 28** `classes` hanno `koppen_examples`. La migrazione copre 16 mapping; per i 12 senza koppen non c'e' nulla da migrare (sono i nomi nudi del Vocabolario A).
- **Domanda aperta**: il Vocabolario A e' un residuo di un design _scientifico_ (koppen-based, mondo reale) poi abbandonato per un design _esotico_? Nessun ADR documenta il pivot. Se qualcuno lo ricorda, va scritto -- e' l'unica traccia rimasta di una direzione di design intera.
- **Non confondere** i 21 stub-only con i **38 stub totali dentro directory che hanno anche specie reali**: quelli non sono coperti dall'ADR e restano debito aperto (59/105 = 56% del catalogo e' stub).

## Cross-links

- [M-2026-07-14-001 -- Coverage fabbricata: 5 strati](lesson-coverage-fabrication-five-layers.md)
- [M-2026-07-14-003 -- `biome_class`: una chiave, due significati](worldgen-biome-class-key-overload.md)
- [M-2026-04-26-018 -- Bioma come pacchetto gameplay+fiction](worldgen-biome-as-gameplay-fiction-package.md) -- cosa serve per rendere _reale_ un nome bioma
- [M-2026-04-26-012 -- Worldgen Stack 4-livelli](worldgen-bioma-ecosistema-foodweb-network-stack.md)
