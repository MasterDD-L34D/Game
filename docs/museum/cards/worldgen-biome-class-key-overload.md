---
title: '`biome_class`: una chiave, due significati, due file'
museum_id: M-2026-07-14-003
type: architecture
domain: [architecture]
provenance:
  found_at: 'packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml:2-30 + data/core/biomes.yaml (campo biome_class)'
  git_sha_first: 'unknown'
  git_sha_last: '2c5a8942'
  last_modified: '2026-07-14'
  last_author: 'MasterDD-L34D'
  buried_reason: forgotten
relevance_score: 3
reuse_path: "docs/evo-tactics-pack/generator.js:3802 + tools/py/game_utils/trait_coverage.py:193 -- entrambi leggono `rule.when.biome_class`; quale dei due significati intendano non e' mai stato deciso"
related_pillars: [P1, P3]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-07-14
last_verified: 2026-07-14
---

# `biome_class`: una chiave, due significati, due file

## Summary (30s)

- `biome_class` significa **due cose diverse** in due file diversi, e nessuno dei due lo dichiara.
- In `biome_classes.yaml` nomina **28 IDENTITA' bioma** (`badlands`, `rovine_planari`, `taiga`...). In `data/core/biomes.yaml` e' un **campo** che porta una **tassonomia ECOLOGICA grossolana a ~10 valori** (`arid`, `geothermal`, `canopy`, `littoral`, `wetland`, `subterranean`, `clastic`, `salt`, `upland`, `deltaic`).
- Stessa chiave. Un file dice _"quale bioma"_, l'altro dice _"che tipo di bioma"_. Le regole in `env_traits.json` usano `when.biome_class` -- e **non e' mai stato deciso quale dei due intendano**.

## What was buried

### Significato 1 -- `biome_class` = identita' del bioma

`packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml:2-30`:

```yaml
schema_version: '1.0'
classes:
  - foresta_temperata
  - foresta_boreale
  - taiga
  - tundra
  - cryosteppe
# ... 28 totali
```

Qui una "biome class" **e'** un bioma. `taiga` e' una class. `rovine_planari` e' una class. Cardinalita': **28**.

### Significato 2 -- `biome_class` = tipo ecologico del bioma

`data/core/biomes.yaml`, campo dentro ogni bioma:

```yaml
biomes:
  badlands:
    biome_class: clastic # <-- non "badlands"
    display_name_it: ...
    hazard: ...
    npc_archetypes: ...
```

Qui una "biome class" e' una **categoria ecologica**. Distribuzione reale sui 20 biomi canonici (verificata):

| valore         | biomi |
| -------------- | ----- |
| `canopy`       | 4     |
| `arid`         | 3     |
| `upland`       | 3     |
| `geothermal`   | 2     |
| `littoral`     | 2     |
| `clastic`      | 2     |
| `subterranean` | 1     |
| `wetland`      | 1     |
| `salt`         | 1     |
| `deltaic`      | 1     |

Cardinalita': **10**. Nessuno di questi 10 valori compare nella lista `classes` di `biome_classes.yaml`. **I due insiemi sono disgiunti.**

### Il punto di collisione

Le regole in `packs/evo_tactics_pack/docs/catalog/env_traits.json` sono scritte come:

```json
{ "when": { "biome_class": "..." }, "suggest": { "traits": [...] } }
```

E vengono lette da **due consumatori indipendenti**:

- **Runtime**: `docs/evo-tactics-pack/generator.js:3802` -- `const classId = rule.when?.biome_class;`
- **Gate di copertura**: `tools/py/game_utils/trait_coverage.py:193` -- `biome = conditions.get("biome_class")`

Nessuno dei due valida il valore contro un registro. Nessuno dei due dichiara quale dei due significati si aspetta. Una regola che scrive `biome_class: arid` e una che scrive `biome_class: badlands` sono **entrambe accettate** e trattate come chiavi opache.

**Il matching e' string-match su una chiave che ha due domini di valori legittimi e disgiunti.**

## Why it was buried

Non e' stato sepolto: e' **collassato**. Due registri sono nati per scopi diversi (`biome_classes.yaml` = tassonomia ecologica koppen-based; `biomes.yaml` = biomi di gioco) e hanno finito per riusare lo stesso identificatore per concetti diversi -- probabilmente perche' nel design originale _le classi ecologiche erano i biomi_ (taiga, tundra, savanna **sono** insieme identita' e tipo ecologico nel mondo reale).

Quando `biomes.yaml` ha virato su biomi esotici (`mezzanotte_orbitale`, `rovine_planari`, `steppe_algoritmiche`), il campo `biome_class` e' stato **rideclinato** come tassonomia astratta a 10 valori per continuare a raggruppare biomi che non condividevano piu' nomi reali. Il vecchio registro non e' stato ne' aggiornato ne' cancellato.

Nessun ADR copre il pivot. Vedi [M-2026-07-14-002](worldgen-biome-vocabularies-orphan.md).

## Why it might still matter

**L'ADR (#3302) sta per cancellare `biome_classes.yaml`, il che risolve meta' del problema per sottrazione -- ma NON risolve l'ambiguita' della chiave.**

Dopo la cancellazione resta comunque vero che:

- `env_traits.json` continua a usare `when.biome_class`;
- `generator.js` e `trait_coverage.py` continuano a leggerla come chiave opaca senza validazione;
- il campo `biome_class` in `biomes.yaml` continua a portare i 10 valori ecologici.

**Il rischio concreto**: qualcuno scrive una regola `when: {biome_class: "rovine_planari"}` (identita') aspettandosi che matchi, mentre il resto del sistema si sta muovendo verso i 10 valori ecologici -- o viceversa. La regola non fallisce: **non matcha e basta**, silenziosamente. E' esattamente la classe di silent-no-match che ha prodotto gli strati 1-3 della saga di fabbricazione ([M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md)).

Questa card esiste perche' **il prossimo che tocca `biome_class` deve sapere che la chiave e' un campo minato**, anche dopo che il file sara' sparito.

## Concrete reuse paths

1. **Minimal** (P0, ~1h): **rinomina per disambiguare**. Nell'ADR, scegli un nome per ciascun concetto e rendilo esplicito: `biome_id` (identita') vs `biome_class` (tassonomia ecologica a 10 valori), oppure `biome_class` vs `eco_class`. Il costo e' un rename meccanico in `env_traits.json` + 2 consumatori. **Fallo nell'ADR, non dopo**: e' l'unico momento in cui il blast radius e' gia' accettato.
2. **Moderate** (P1, ~2-3h): aggiungi **validazione al parser**. `trait_coverage.py` ha gia' il precedente giusto (`:197-210` rifiuta il `when` vuoto). Stesso pattern: rifiuta un `biome_class` che non appartiene all'enum atteso. Un valore fuori dominio deve **esplodere**, non fare silent-no-match. Blast radius x1.0 (validator).
3. **Full** (P2, ~5h): promuovi i 10 valori ecologici a **enum canonico versionato** in `data/core/` con schema, e fai referenziare l'enum sia a `biomes.yaml` sia alle regole `env_traits`. Blast radius x2.0 (schema-changing, tocca `packages/contracts/`).

**Raccomandazione**: opzione 1 + 2 dentro l'ADR. L'opzione 3 e' post-ADR.

## Sources / provenance trail

- Significato 1: [packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml:2-30](../../../packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml) -- 28 identita'
- Significato 2: [data/core/biomes.yaml](../../../data/core/biomes.yaml) -- campo `biome_class`, 10 valori ecologici su 20 biomi
- Consumatore runtime: [docs/evo-tactics-pack/generator.js:3802](../../evo-tactics-pack/generator.js)
- Consumatore gate: [tools/py/game_utils/trait_coverage.py:193](../../../tools/py/game_utils/trait_coverage.py)
- Precedente di validazione da imitare: [tools/py/game_utils/trait_coverage.py:197-210](../../../tools/py/game_utils/trait_coverage.py)

Issue: [#3302](https://github.com/MasterDD-L34D/Game/issues/3302) OPEN -- il titolo nomina esplicitamente `biome_class key overload`.

## Risks / open questions

- **Schema drift severity: HIGH** (3+ fonti, conteggi diversi: 28 vs 10 vs 20). Per la policy dell'agente questo richiederebbe escalation a `sot-planner` per un ADR -- **l'ADR e' gia' in corso** (#3302), quindi l'escalation e' soddisfatta. Questa card e' l'input.
- **Non verificato**: quale dei due significati intendano _davvero_ le 33 regole attuali di `env_traits.json`. Le 3 regole koppen non hanno `biome_class` del tutto; le altre 30 andrebbero controllate una per una contro entrambi i domini. **Non l'ho fatto** -- e' lavoro per l'ADR, non per una card.
- `git_sha_first: unknown` -- non ho isolato il commit che ha introdotto la doppia semantica; e' una divergenza graduale, non un singolo commit.

## Cross-links

- [M-2026-07-14-001 -- Coverage fabbricata: 5 strati](lesson-coverage-fabrication-five-layers.md)
- [M-2026-07-14-002 -- Due vocabolari bioma orfani](worldgen-biome-vocabularies-orphan.md)
- [M-2026-07-14-004 -- Node id MAIUSCOLI: convention leak](worldgen-network-node-id-uppercase-leak.md) -- stessa famiglia: string-match che fallisce in silenzio
