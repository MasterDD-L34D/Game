---
title: 'Specie autorate prima del catalogo tratti: 23 riferimenti orfani e il terzo modo di mentire'
museum_id: M-2026-07-15-003
type: artifact
domain: [architecture]
provenance:
  found_at: 'packs/evo_tactics_pack/data/species/rovine_planari/*.yaml -- campo `pending_trait_definitions` + tools/py/build_species_trait_bridge.py:145'
  git_sha_first: 'e83c810c'
  git_sha_last: 'aa92afed'
  last_modified: '2026-07-14'
  last_author: 'Eduardo Scarpelli'
  buried_reason: unintegrated
relevance_score: 4
reuse_path: 'data/core/traits/glossary.json -- i 23 tratti vanno autorati (Species-Curator-gated); poi rientrano in `genetic_traits` dei rispettivi file specie'
related_pillars: [P1, P3]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-07-15
last_verified: 2026-07-15
---

# Specie autorate prima del catalogo tratti: 23 riferimenti orfani

## Summary (30s)

- Le 10 specie `rovine_planari` recuperate ([M-2026-07-15-001](worldgen-rovine-planari-recovery.md)) riferiscono **34 tratti unici**. **23** non hanno voce nel glossario -- e **non l'hanno mai avuta**. Il design pass del 2025-10-29 ha scritto le specie **contro un catalogo tratti che non esisteva ancora**.
- Non e' un dettaglio cosmetico: `build_species_trait_bridge.py:145` fa `trait_index.setdefault(trait_id, {})`. Rigenerare il bridge con quei riferimenti **fabbricherebbe 23 voci tratto nude, senza definizione** -- **esattamente la forma** della coverage fabbricata che il repo ha appena rimosso ([M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md)).
- Risoluzione adottata in `aa92afed`: i 23 sono **preservati, non consumati**, sotto un campo nuovo `pending_trait_definitions:`. Ne' scartati in silenzio, ne' fabbricati in silenzio.

## What was buried

Il pass di autoring di `e83c810c` (2025-10-29) ha scritto 10 specie complete usando un vocabolario di tratti **piu' ricco del catalogo**. I 23 orfani:

```
assenza_respirazione, campo_di_fase, ciclo_vitale_anomalo, ciclo_vitale_completo,
fisiologia_predatoria, fotosintesi_bifase, ghiandole_nettare_memetico,
intangibilita_parziale, lamenti_diradanti, maschera_illusoria, metabolismo_attivo,
metabolismo_sostentato, nodi_micotici, origine_artificiale, proboscide_polifaga,
respirazione_biologica, riflessi_preternaturali, rinforzi_modulari,
secrezioni_antisepsi, sensori_chimici, sinapsi_riflettenti, visione_spettrale,
voce_spettrale
```

Verificato: **0/23** hanno una voce in `data/core/traits/glossary.json` (501 tratti). Verificato via pickaxe: **nessuno** e' mai esistito come file `data/traits/<categoria>/<id>.json`.

Non sono tratti **persi**. Sono tratti **mai scritti**: il designer li ha _nominati_ in una specie, dando per scontato che sarebbero stati definiti dopo. Non e' mai successo.

## Why it was buried

Ordine di lavoro invertito: **prima le creature, poi il vocabolario**. E' un ordine legittimo in fase creativa -- si scrive "questo golem non respira" prima di aver deciso come si chiama e cosa fa il tratto `assenza_respirazione`. Diventa debito nel momento in cui il vocabolario non arriva mai, e nessun gate se ne accorge perche' le specie sono state **cancellate due giorni dopo** (`5a06b64b`) e con esse i riferimenti.

Il recupero le ha riportate. E con loro il debito, intatto, dopo 8 mesi e mezzo.

## Why it might still matter

### Il terzo modo di fabbricare copertura

Il repo ha gia' catalogato due modi di mentire sui numeri:

1. **Fabbricare il falso** -- una regola `when: {}` che dichiara coperto cio' che non lo e' ([M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md)).
2. **Cancellare il vero** -- trattare una cicatrice come uno stub ([M-2026-07-15-002](lesson-receipt-provenance-scar-vs-lie.md)).

Questo e' il **terzo**, ed e' il piu' insidioso perche' **avviene da solo**, senza che nessuno decida niente:

> **Un riferimento a un'entita' inesistente, dato in pasto a un generatore che usa `setdefault`, diventa un'entita' esistente e vuota.**

`tools/py/build_species_trait_bridge.py:145`:

```python
trait_entry = trait_index.setdefault(trait_id, {})
```

Nessuna validazione. Se un file specie nomina `campo_di_fase`, il bridge **crea** `campo_di_fase` -- un tratto senza definizione, senza effetto, senza glossario, ma **presente nell'indice**. E un tratto presente nell'indice **conta**. Bastava un `npm run build:trait-bridge` per aggiungere 23 fantasmi al catalogo, senza che nessun essere umano scrivesse una riga di dati falsi.

### L'invariante reale del repo

Verificato su `origin/main` **e** su questo branch:

> **Ogni tratto nel bridge (`data/traits/index.json`, 308 voci) ha una voce nel glossario. 308/308. Zero mancanti.**

E' la vera invariante, ed e' intatta. (Un tratto **puo'** invece non avere un file DB per-tratto: quella tolleranza esiste ed e' documentata.) I 23 orfani, se consumati, l'avrebbero **rotta per la prima volta**.

### La risoluzione adottata

`aa92afed` non li scarta e non li fabbrica. Li **parcheggia**, con il perche' scritto accanto, in ognuno dei 10 file specie:

```yaml
# Tratti autorati nel design originale (e83c810c, 2025-10-29) ma MAI definiti nel
# glossario. Preservati qui, fuori dalle liste consumate, per non fabbricare voci nel
# trait-bridge. Vanno autorati (Species-Curator-gated) e poi rimessi in genetic_traits.
pending_trait_definitions:
  - assenza_respirazione
  - campo_di_fase
  - ...
```

Il campo **non e' letto da nulla**. E' un'informazione conservata fuori dal circuito delle metriche -- lo stesso posto in cui `receipt` e' sopravvissuto sette mesi di fabbricazione.

## Concrete reuse paths

1. **Minimal** (P0, ~0h -- gia' fatto): i 23 sono preservati e inerti in `aa92afed`. Nessuna azione. **Non** rigenerare il bridge aspettandosi che li ignori: li ignora **perche'** sono fuori da `genetic_traits`, non per virtu' dello script.
2. **Moderate** (P1, ~6h): autora i 23 tratti nel glossario (Species-Curator-gated) e rimettili in `genetic_traits` delle rispettive specie. Alcuni sono ovvi e a costo quasi zero (`respirazione_biologica`, `metabolismo_attivo`, `sensori_chimici`); altri sono **design vero** (`campo_di_fase`, `intangibilita_parziale`, `ghiandole_nettare_memetico`). Blast radius x1.0 (data YAML) -> ~6h.
3. **Full** (P2, ~3h): chiudi il buco alla sorgente. Sostituisci il `setdefault` a `build_species_trait_bridge.py:145` con un **fail esplicito**: un tratto riferito da una specie e assente dal glossario deve **rompere la build con l'id e il file**, non essere creato. E' lo stesso guard-alla-sorgente di `trait_coverage.py:197-210` ([M-2026-07-14-001](lesson-coverage-fabrication-five-layers.md), reuse path 1), applicato al secondo generatore. **Rifiuta nel parser, non nella code review.**

## Sources / provenance trail

- Riferimenti orfani: [packs/evo_tactics_pack/data/species/rovine_planari/\*.yaml](../../../packs/evo_tactics_pack/data/species/rovine_planari/) -- campo `pending_trait_definitions`
- Il `setdefault` che fabbricherebbe: [tools/py/build_species_trait_bridge.py:145](../../../tools/py/build_species_trait_bridge.py)
- Glossario canonico: [data/core/traits/glossary.json](../../../data/core/traits/glossary.json) -- 501 tratti; **0/23** presenti
- Bridge: [data/traits/index.json](../../../data/traits/index.json) -- 308 voci, **308/308** con voce nel glossario (verificato su `origin/main` e su `HEAD`)
- Guard gemello gia' in tree: [tools/py/game_utils/trait_coverage.py:197-210](../../../tools/py/game_utils/trait_coverage.py)

| SHA        | data       | messaggio                                                 | ruolo                                        |
| ---------- | ---------- | --------------------------------------------------------- | -------------------------------------------- |
| `e83c810c` | 2025-10-29 | Add Pathfinder planar ruins biome with translated species | autora le specie contro tratti mai definiti  |
| `aa92afed` | 2026-07-14 | feat(species): recover 10 rovine_planari species          | preserva i 23 in `pending_trait_definitions` |

## Risks / open questions

- **Il `setdefault` e' ancora li'.** Finche' non diventa un fail, qualunque futura specie che nomini un tratto inesistente lo **creera'** in silenzio. I 23 di oggi sono disinnescati; il meccanismo no.
- **Chi autora i 23?** Il gate e' Species-Curator. Finche' non lo fanno, le 10 specie recuperate sono **complete come creature ma incomplete come dati**: `genetic_traits` porta 11 tratti su 34 riferiti dal design originale.
- **Quanti altri?** Questa sessione ha controllato **solo** le 10 specie di `rovine_planari`. Nessuno ha verificato se altre specie del catalogo riferiscano tratti fuori dal glossario. Il bridge dice **308/308 puliti** oggi -- ma dice solo cio' che e' **consumato**, non cio' che e' **scritto**.

## Cross-links

- [M-2026-07-15-001 -- rovine_planari: una cicatrice, non un buco](worldgen-rovine-planari-recovery.md) -- le specie che portano questi 23 tratti
- [M-2026-07-15-002 -- `receipt.source` e' il discriminante](lesson-receipt-provenance-scar-vs-lie.md)
- [M-2026-07-14-001 -- Coverage fabbricata: 5 strati impilati](lesson-coverage-fabrication-five-layers.md) -- il guard-alla-sorgente da replicare
