---
title: 'Coverage fabbricata: 5 strati impilati e il metodo che li ha scoperti'
museum_id: M-2026-07-14-001
type: decision
domain: [architecture]
provenance:
  found_at: 'packs/evo_tactics_pack/docs/catalog/env_traits.json + tools/py/game_utils/trait_coverage.py + packs/evo_tactics_pack/data/species/'
  git_sha_first: '089b6aa0'
  git_sha_last: '2c5a8942'
  last_modified: '2026-07-14'
  last_author: 'MasterDD-L34D'
  buried_reason: superseded
relevance_score: 5
reuse_path: 'tools/py/game_utils/trait_coverage.py:197-210 -- il guard che rifiuta il pattern alla sorgente; riusabile come template per QUALSIASI gate di copertura futuro'
related_pillars: [P1, P3, P6]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-07-14
last_verified: 2026-07-14
---

# Coverage fabbricata: 5 strati impilati e il metodo che li ha scoperti

## Summary (30s)

- Per **7 mesi** (2025-12-03 -> 2026-07-14) il gate di copertura trait di Evo-Tactics ha misurato **zero**. Il numero onesto era **9**. Cinque strati indipendenti di dati fabbricati tenevano su quello zero, ognuno che copriva il buco lasciato dal precedente.
- Nessuno degli strati era un bug. Ognuno era un artefatto **deliberato** che faceva contare come "coperto" cio' che non lo era. Il generatore runtime li ignorava tutti: erano dati morti che gonfiavano solo la metrica.
- **Il metodo che ha funzionato** (e che vale piu' dei 5 strati): quando un fix di completezza "smaschera debito", prima **RIMUOVI** l'artefatto sospetto e **ri-misura**. Una regola metric-gaming puo' fabbricare esattamente il debito che stai per congelare in un gate.

## What was buried

Cinque strati, dal piu' superficiale al piu' profondo. Ognuno verificato su git in questa sessione.

### Strato 1 -- la regola `when: {}` (rimosso in #3298)

`packs/evo_tactics_pack/docs/catalog/env_traits.json` conteneva una regola:

```json
{
  "when": {},
  "meta": {
    "category": "coverage_backfill",
    "description": "Rule di copertura automatica per i trait non ancora coperti (report 2025-12-03)",
    "cohort": "trait_gap_fill_20251203"
  },
  "suggest": { "traits": ["...107 trait alla nascita, 105 alla rimozione..."] }
}
```

Nata in `b893b91a` (2025-12-03, "Add coverage backfill rule for missing traits"). Un `when` vuoto fa contare come _coperti_ tutti i trait elencati.

**Runtime-INERTE**: `docs/evo-tactics-pack/generator.js:3802-3803` fa

```js
const classId = rule.when?.biome_class;
if (!classId) return;
```

Il generatore la saltava del tutto. Zero effetto sul gioco, effetto pieno sulla metrica. Rimossa in `2359a848` (#3298).

### Strato 2 -- il backfill `species_affinity` (rimosso in #3300)

`tools/py/game_utils/trait_coverage.py` iniettava **ogni** specie presente in `species_affinity` dentro **qualsiasi** combo di regola non coperta, **senza alcun ancoraggio al bioma**. Una specie che non vive nel bioma "copriva" comunque quel bioma.

L'amplificatore: `tools/py/report_trait_coverage.py:48-53` mette `--species-affinity` in **default** (`default=Path("data/traits/species_affinity.json")`). La CI (`.github/workflows/ci.yml:565`) non passa mai il flag -- quindi lo riceveva **in silenzio** da argparse. Nessuno lo aveva scritto nel workflow; nessuno poteva vederlo leggendo il workflow.

Il commento che oggi marca la rimozione (`trait_coverage.py:349-356`) e' esso stesso la fonte primaria: _"it is the same trick as the `coverage_backfill` env rule removed in #3298, one layer down"_.

### Strato 3 -- le regole koppen insoddisfacibili (corretto in #3300)

Le regole con scope climatico (`koppen_in` / `koppen_any`) non dichiarano `biome_class`. Collassavano quindi sulla combo degenere `(biome=None, morphotype=None)` -- **insoddisfacibile per costruzione**: le specie sono indicizzate su `(biome, morphotype)` e ogni specie ha almeno un bioma, quindi nessuna combo di specie porta mai `biome=None`.

Domanda strutturalmente senza risposta -> veniva "coperta" da uno stub keeper senza bioma (`global-trait-keeper`). Oggi (`trait_coverage.py:212-225`) la regola viene **espansa** sulle biome class i cui codice koppen canonici corrispondono, via `koppen_examples`. La domanda torna reale.

Regole koppen oggi in `env_traits.json`: **3**, tutte senza `biome_class`.

### Strato 4 -- 21 directory bioma fabbricate

`packs/evo_tactics_pack/data/species/<biome>/` contiene **30** directory il cui unico file e' un `*-trait-keeper.yaml`. Di queste, **21 sono stub da 3 righe con ZERO specie**:

```yaml
id: tundra-risonante-trait-keeper
notes: 'stub auto-generato per ripristinare inventario: sostituire con specifica completa.'
```

Ciclo di vita verificato su git:

1. **`089b6aa0`** (2025-10-29, "Add coverage trait keepers for Evo Tactics biomes") -- nascono **38** keeper completi (~51-73 righe), ognuno con
   ```yaml
   receipt:
     source: coverage_autogen
     author: automation
     date: '2025-10-29'
     trace_hash: to-fill
   ```
   La ricevuta lo dice a voce alta: `coverage_autogen`, `author: automation`.
2. **`7c62b510`** (2025-11-30, "Enhance Evo pack pipeline and derived outputs") -- i 38 keeper vengono **cancellati**.
3. **`9acadc69`** (2025-12-09, "Restore Evo Tactics species inventory resources") -- i 38 vengono **ri-aggiunti come gusci vuoti** da 2-3 righe. Il "restore" ha ripristinato l'inventario, non il contenuto.

> **Correzione al racconto corrente**: i keeper non sono stati "svuotati sul posto" in `9acadc69`. Sono stati **cancellati** in `7c62b510` e **resuscitati come gusci** in `9acadc69`. Il ciclo delete-then-restore-as-hollow-shell e' il dettaglio che conta: un commit chiamato "Restore" ha reintrodotto 38 file la cui unica funzione era esistere.

### Strato 5 -- 4 alias di migrazione semanticamente assurdi

`data/core/biome_aliases.yaml:12-27` marca `status: migrated`:

| alias               | canonical                   | assurdita'                            | specie reali vive oggi |
| ------------------- | --------------------------- | ------------------------------------- | ---------------------- |
| `foresta_temperata` | `foresta_miceliale`         | --                                    | **7**                  |
| `badlands`          | `dorsale_termale_tropicale` | badlands != dorsale termale tropicale | **11**                 |
| `deserto_caldo`     | `abisso_vulcanico`          | deserto != abisso vulcanico           | **5**                  |
| `cryosteppe`        | `mezzanotte_orbitale`       | steppa gelata != stazione orbitale    | **5**                  |

Tutti e quattro gli slug "migrati" sono **ancora vivi con specie reali**. E' una migrazione **che non e' mai avvenuta**: l'alias e' stato scritto, la migrazione no.

### Il censimento che ne esce

- **59 / 105** file specie sono stub autogenerati (**56%**).
- `rovine_planari`: **10 file, 10 stub, 0 specie reali**. Un bioma intero fatto di niente.

## Why it was buried

Non e' stato sepolto: e' stato **costruito**, strato su strato, ognuno in buona fede per far tornare verde un gate.

La dinamica e' quella classica del metric-gaming: un report dice "N trait scoperti" -> qualcuno aggiunge un artefatto che li fa contare come coperti -> il gate torna verde -> il debito reale resta, invisibile, e ora e' anche _protetto_ dal gate stesso. Ripetuto 5 volte, con 5 meccanismi diversi, il debito diventa strutturalmente inosservabile.

Il generatore runtime non e' mai stato ingannato. Solo la metrica.

## Why it might still matter

**Questa e' la lezione, non l'artefatto.** Gli artefatti li cancella l'ADR (issue #3302). Il metodo va conservato.

### Il metodo che ha funzionato -- REMOVE-THEN-REMEASURE

> Quando un fix di completezza "smaschera debito", **prima prova a RIMUOVERE l'artefatto sospetto e ri-misura**. Una regola metric-gaming puo' fabbricare esattamente il debito che stai per congelare in un gate.

Caso concreto di questa sessione: dopo il primo fix affiorava `max_missing = 73`. Stava per essere **baselineato in CI come debito reale**. Era invece **interamente prodotto dallo strato 1**: rimossa la regola, il numero e' andato a **0** (non a 73 meno qualcosa -- a zero). Poi, tolti anche gli strati 2-3, il numero **onesto** e' emerso: **9**. E, a differenza del 73 fantasma, ognuno dei 9 era una claim concreta e verificabile:

> _"la regola dice che il clima BSk produce `pelli_cave`; badlands E' un bioma BSk; nessuna specie badlands porta `pelli_cave`."_

`#3301` ne ha chiusi 4 scrivendo link specie-trait **reali**. Gate onesto oggi: **5**.

**Il 73 era un numero fantasma. Congelarlo in un gate avrebbe cementato la fabbricazione dentro il sistema di difesa contro la fabbricazione.**

### Il guard riusabile

`tools/py/game_utils/trait_coverage.py:197-210` rifiuta oggi il pattern **alla sorgente**:

```python
if traits and not conditions:
    raise ValueError(
        f"env_traits rule[{index}] suggests {len(traits)} trait(s) with an empty "
        "`when` -- an unconditioned rule fakes coverage without producing anything "
        "at runtime. ..."
    )
```

Questo e' il template per qualsiasi gate di copertura futuro: **una regola che suggerisce N cose e non vincola nulla e' un backfill travestito**. Rifiutala nel parser, non nella code review.

### I due ratchet

`.github/workflows/ci.yml:585-595` documenta l'asimmetria che ha permesso tutto:

- Il **floor** (`min_traits`) stava a **27** mentre il valore reale era **189**: 162 trait potevano perdere ogni link a specie con la CI ancora verde.
- Un **ceiling** che ratchetta solo verso il basso **non vale nulla** accanto a un **floor** che non ratchetta mai verso l'alto.

Oggi: floor 189 (ratchet UP only), ceiling 5 (ratchet DOWN only).

## Concrete reuse paths

1. **Minimal** (P0, ~0h -- gia' fatto): il guard `trait_coverage.py:197-210` e' in tree. Nessuna azione.
2. **Moderate** (P1, ~2h): estendi il pattern REMOVE-THEN-REMEASURE a **ogni altro gate derivato** del repo. Candidati: `data/derived/analysis/trait_baseline.yaml`, i coverage report `data/analysis/*`. Domanda da porre a ciascuno: _esiste un artefatto la cui unica funzione e' far salire questo numero?_
3. **Full** (P2, ~4h): promuovi la coppia **floor-che-ratchetta-su + ceiling-che-ratchetta-giu** a policy esplicita per ogni gate numerico in `ci.yml`. Oggi e' un commento in un solo workflow.

## Sources / provenance trail

- Regola strato 1: [packs/evo_tactics_pack/docs/catalog/env_traits.json](../../../packs/evo_tactics_pack/docs/catalog/env_traits.json) -- oggi **0** regole con `when` vuoto
- Guard runtime: [docs/evo-tactics-pack/generator.js:3802](../../evo-tactics-pack/generator.js) -- `const classId = rule.when?.biome_class; if (!classId) return;`
- Backfill strato 2 + commenti di rimozione: [tools/py/game_utils/trait_coverage.py:197-225,349-356](../../../tools/py/game_utils/trait_coverage.py)
- Default silenzioso: [tools/py/report_trait_coverage.py:48-53](../../../tools/py/report_trait_coverage.py)
- Narrativa CI (fonte primaria): [.github/workflows/ci.yml:565-600](../../../.github/workflows/ci.yml)
- Alias mai migrati: [data/core/biome_aliases.yaml:12-27](../../../data/core/biome_aliases.yaml)

Git history verificata:

| SHA        | data       | messaggio                                                      | ruolo                                 |
| ---------- | ---------- | -------------------------------------------------------------- | ------------------------------------- |
| `089b6aa0` | 2025-10-29 | Add coverage trait keepers for Evo Tactics biomes              | nascita 38 keeper `coverage_autogen`  |
| `7c62b510` | 2025-11-30 | Enhance Evo pack pipeline and derived outputs                  | cancella i 38 keeper                  |
| `b893b91a` | 2025-12-03 | Add coverage backfill rule for missing traits                  | nascita regola `when: {}` (107 trait) |
| `9acadc69` | 2025-12-09 | Restore Evo Tactics species inventory resources                | ri-aggiunge i 38 come stub 3-righe    |
| `2359a848` | 2026-07-14 | drop synthetic coverage_backfill rule (#3298)                  | rimuove strato 1                      |
| `2e33142c` | 2026-07-14 | model koppen rules, kill the species-affinity backfill (#3300) | rimuove strati 2-3                    |
| `f7d491ab` | 2026-07-14 | author 4 real species-trait links, gate 9 -> 5 (#3301)         | debito reale ridotto                  |

PR / issue: [#3298](https://github.com/MasterDD-L34D/Game/pull/3298) MERGED - [#3300](https://github.com/MasterDD-L34D/Game/pull/3300) MERGED - [#3301](https://github.com/MasterDD-L34D/Game/pull/3301) MERGED - [#3299](https://github.com/MasterDD-L34D/Game/issues/3299) OPEN (71 trait senza regola) - [#3302](https://github.com/MasterDD-L34D/Game/issues/3302) OPEN (ADR biome/species data model) - [#3304](https://github.com/MasterDD-L34D/Game/pull/3304) MERGED (censimento).

Censimento: [docs/planning/2026-07-14-content-substrate-census.md](../../planning/2026-07-14-content-substrate-census.md)

## Risks / open questions

- **Schema drift severity: HIGH.** Il concetto "bioma" ha oggi **4 fonti** disallineate: `data/core/biomes.yaml` (20 chiavi canoniche), `biome_classes.yaml` (28 identita'), `biome_aliases.yaml` (18 alias di cui 4 contraddittori), `data/species/<biome>/` (49 directory). Vedi card [M-2026-07-14-002](worldgen-biome-vocabularies-orphan.md) e [M-2026-07-14-003](worldgen-biome-class-key-overload.md).
- **#3299 resta aperta**: 71 trait che nessuna regola bioma suggerisce mai. E' il debito **reale** smascherato -- non ripetere l'errore: **non backfillarlo**.
- **56% del catalogo specie e' stub.** L'ADR cancella i 21 stub-only. Restano 38 stub dentro directory che hanno anche specie reali: quelli **non** sono coperti dall'ADR. Verificare separatamente.
- **Domanda aperta**: perche' `7c62b510` cancello' i 38 keeper e perche' `9acadc69` li "ripristino'" vuoti? Nessun ADR copre quei due commit. Il movente resta ignoto.

## Cross-links

- [M-2026-07-14-002 -- Due vocabolari bioma orfani](worldgen-biome-vocabularies-orphan.md)
- [M-2026-07-14-003 -- `biome_class`: una chiave, due significati](worldgen-biome-class-key-overload.md)
- [M-2026-07-14-004 -- Node id MAIUSCOLI: convention leak](worldgen-network-node-id-uppercase-leak.md)
- [M-2026-04-26-012 -- Worldgen Stack 4-livelli](worldgen-bioma-ecosistema-foodweb-network-stack.md) -- **aveva predetto questo fallimento**
