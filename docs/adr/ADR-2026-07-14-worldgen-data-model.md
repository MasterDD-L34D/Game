---
title: "ADR-2026-07-14 — Worldgen data model: cos'e' un bioma, cos'e' una specie"
status: proposed
doc_status: active
doc_owner: master-dd
workstream: dataset-pack
last_verified: '2026-07-14'
source_of_truth: true
language: it
review_cycle_days: 90
---

# ADR-2026-07-14 — Worldgen data model (bioma / biome_class / ecosistema / specie)

Status: **PROPOSED** (decider: master-dd; il MERGE di questo ADR ratifica la direzione,
la migrazione e' un arco di PR distinto)

Arco evidence: issue #3302 (data-model debris) | #3299 (71 tratti senza regola) |
censimento #3304 | i cinque strati rimossi #3298 #3300 #3301 #3303 |
carte museum `M-2026-07-14-001..004` + `M-2026-04-26-012` (revived).

## TL;DR

Il modello del mondo **esiste gia' ed e' canonico** (SoT §3): uno stack a 4 livelli
`bioma -> ecosistema -> foodweb -> network/eventi`. Non va inventato: va **fatto rispettare**.

Quello che manca non e' il modello. E' che **nessun file dichiara di appartenergli**, e nei
vuoti sono cresciuti quattro vocabolari di biomi, tre mappature contraddittorie e un catalogo
specie per il 56% fatto di segnaposto.

Questo ADR **non aggiunge un modello**: sceglie quale dei file esistenti e' autoritativo per
ciascun livello, cancella i doppioni, e mette i guard perche' i vuoti non si riaprano.

## Contesto: perche' e' marcito

Il substrato di contenuto non aveva **nessun registro** e **nessun guard**. Le uniche metriche
che lo guardavano erano truccate -- cinque strati, uno sotto l'altro, ognuno che nascondeva il
successivo, per ~7 mesi (carta `M-2026-07-14-001`).

La carta museum `M-2026-04-26-012` (2026-04-26) aveva **previsto testualmente** questo esito:

> _"Rischio: sessioni future di Claude descrivono il gioco come 'rotazione di mappe' ignorando
> 3 livelli profondi gia' documentati e validati."_

E' esattamente accaduto, in questa stessa sessione: contando `*.biome.yaml` (5) invece di
`*.ecosystem.yaml` (21) ho quasi fuso via `cryosteppe` e `deserto_caldo`, che sono nodi di
livello 4. **Il Museum va consultato PRIMA dello scavo, non dopo.**

## Decisione 1 — Il modello e' lo stack a 4 livelli (SoT §3). Autorita' per livello

| livello                  | cos'e'                                                                                                 | file AUTORITATIVO                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| **1 — bioma**            | pacchetto gameplay+fiction: hazard, npc_archetypes, difficolta', affixes, StressWave, tono, **koppen** | `data/core/biomes.yaml`                                                |
| **2 — ecosistema**       | clima, abiotico, struttura trofica, ruoli minimi (`apex`/`keystone`/`bridge`/`threat`/`event`)         | `packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml` (21)         |
| **3 — foodweb**          | rete trofica                                                                                           | `packs/evo_tactics_pack/data/foodwebs/*_foodweb.yaml` (5)              |
| **4 — network + eventi** | nodi, `corridor`/`seasonal_bridge`/`trophic_spillover`, eventi cross-bioma                             | `.../ecosystems/network/meta_network_alpha.yaml` + `cross_events.yaml` |

**`biome_class` NON e' un livello.** E' un **campo** del livello 1: la famiglia ecologica
grossolana, dominio chiuso di 10 valori (`arid`, `geothermal`, `canopy`, `littoral`, `wetland`,
`subterranean`, `clastic`, `salt`, `upland`, `deltaic`).

## Decisione 2 — `biome_classes.yaml` si scioglie

`packs/evo_tactics_pack/tools/config/registries/biome_classes.yaml` (28 entry) non e' nessuno
dei 4 livelli. E' un cassetto: 13 duplicano `biomes.yaml`, 12 sono biomi-Terra di riferimento
**mai cablati** (`taiga`, `tundra`, `savanna`, `reef`, `costa_rocciosa`, `foresta_boreale`,
`macchia_mediterranea`, `prateria_temperata`, `deserto_freddo`, `laguna_bioreattiva`,
`mangrovieto_cinetico`, `caverne`), 3 sono solo-alias.

- I `koppen_examples` **migrano come campo dentro `biomes.yaml`** (il koppen e' una proprieta'
  del bioma).
- I 12 nomi-Terra sono **preservati nella carta museum `M-2026-07-14-002`** e cancellati dal codice.
- Il file e' **eliminato**.

> ⚠️ **ORDINE LOAD-BEARING (P1)**: `tools/py/game_utils/trait_coverage.py:_load_koppen_biomes`
> inverte oggi `koppen_examples` per espandere le regole climatiche -- **e' il fix del layer 3
> (#3300)**. Cancellare il file **prima** di aver migrato i koppen **re-introduce il layer 3**.
> Koppen prima. Sempre.

## Decisione 3 — `cryosteppe` e `deserto_caldo` sono biomi, e vanno PROMOSSI

Sono gli **unici 2 ecosistemi su 21** senza entry in `biomes.yaml`. Ma sono load-bearing su
**3 livelli su 4**:

|                 | cryosteppe / deserto_caldo                                                  |
| --------------- | --------------------------------------------------------------------------- |
| L1 bioma        | ❌ **manca solo questo**                                                    |
| L2 ecosistema   | ✅ (`.ecosystem.yaml`, pari a `badlands` per profondita')                   |
| L3 foodweb      | ✅ (sono 2 dei soli 5 foodweb esistenti)                                    |
| L4 network      | ✅ nodi; **`DESERTO_CALDO` e' lo `start_node` della meta-rete**             |
| L4 cross-events | ✅ origini canoniche, **nominate nella SoT** (_"brinastorm da cryosteppe"_) |

Fonderli come varianti avrebbe rotto la meta-rete **dal suo nodo di partenza**. Si scrive la
riga L1 mancante (hazard/npc/difficolta'/narrativa). **Giocabili 20 -> 22.** Zero contenuto
perso, zero rete rotta.

> **Debito narrativo aperto (registrato, non nascosto)**: il koppen e la finzione dissentono
> su questi due (`deserto_caldo` BWh/BSh vs una `savana` il cui summary dice _"dune fotoniche"_).
> La promozione **non lo risolve**, lo rende solo esplicito.

## Decisione 4 — Le mappature fabbricate si cancellano

**Tre** sorgenti mappano i biomi, e **si contraddicono a vicenda**:

| slug                | `biome_aliases.yaml` dice   | `meta_network_alpha.yaml` dice | verita'                              |
| ------------------- | --------------------------- | ------------------------------ | ------------------------------------ |
| `badlands`          | `dorsale_termale_tropicale` | `canyons_risonanti`            | **e' `badlands`**, 11 specie         |
| `deserto_caldo`     | `abisso_vulcanico`          | `savana`                       | **e' `deserto_caldo`**, 5 specie     |
| `cryosteppe`        | `mezzanotte_orbitale`       | —                              | **e' `cryosteppe`**, 5 specie        |
| `foresta_temperata` | `foresta_miceliale`         | `foresta_miceliale`            | **e' `foresta_temperata`**, 7 specie |

- I 4 alias `status: migrated` sono **cancellati**: descrivono una migrazione **mai avvenuta**.
- Il campo `biome_id` dei nodi di rete e' **cancellato**: e' rumore. `id` + `path` sono corretti
  e bastano.
- **NB**: `id` dei nodi e' MAIUSCOLO (`DESERTO_CALDO`). E' una **convenzione**, non un bug
  (carta `M-2026-07-14-004`). Le specie che la copiano (`echo-wing`) vanno normalizzate a
  lowercase **verso i biomi**, non "corrette" a caso.

## Decisione 5 — Cos'e' una specie

> **Una specie e' un'entita' con `biomes`, `role_trofico` e almeno un tratto.**
> Tutto il resto non e' una specie e non puo' vivere nel catalogo specie.

Oggi **59 file su 105 (56%)** non lo sono: sono stub autogen da 3 righe, nati per far quadrare
una matrice di coverage (`receipt: {source: coverage_autogen, author: automation}`).

- **I 52 stub puri sono cancellati** (con le 34 cartelle-bioma vuote). Non codificano nulla che
  il registro dei biomi non abbia gia'. **Sono la trappola**: sono l'unico "abitante" di quei
  biomi, quindi chiunque insegua un contatore puo' appiccicargli tratti e azzerarlo.
- **I 7 con `role_trofico: evento_ecologico`** NON sono rumore: `event` e' un **ruolo minimo
  canonico del livello 2**. Vanno ricondotti al modello degli eventi (L4), non cancellati.
- Catalogo onesto: **46 specie**, non 105.

## Decisione 6 — I guard (perche' non ricresca)

Ogni guard con **negative control** (un guard non testato e' un guard vacuo -- L-041):

1. **Definizione-specie**: un file nel catalogo specie che non soddisfa la Decisione 5 -> **FAIL**.
   Uccide la trappola alla radice.
2. **`biome_class` a dominio chiuso**: solo i 10 valori ecologici -> **FAIL** altrimenti.
3. **Bioma referenziato inesistente**: qualsiasi `biomes:` / `biome_class` / nodo che non
   risolve su `biomes.yaml` -> **FAIL**. Oggi 4 vocabolari; domani uno.
4. **Regola env senza scoping** (`when: {}`) -> gia' attivo (#3300). E' il guard che impedisce
   al layer 1 di rinascere.

## Ordine di migrazione (l'ordine E' la decisione)

1. **Koppen -> `biomes.yaml`** + aggiorna `trait_coverage.py` (**P1**: prima di tutto, o si
   re-introduce il layer 3).
2. Promuovi `cryosteppe` + `deserto_caldo` -> riga L1.
3. Cancella i 4 alias `migrated` + il campo `biome_id` dei nodi.
4. Cancella i 52 stub + le 34 cartelle vuote; riconduci i 7 eventi al modello L4.
5. Elimina `biome_classes.yaml`.
6. Accendi i 4 guard (con negative control).
7. **Ratchet del gate coverage** (oggi `max_missing=5`, `min_traits=189`).

## Cosa questo ADR NON risolve (esplicito, non nascosto)

1. **Il debito narrativo koppen-vs-fiction** su `cryosteppe`/`deserto_caldo`/`savana`.
2. **Quale delle due semantiche di `biome_class`** intendano le 33 regole in `env_traits.json`
   (le 3 koppen non ne portano nessuna; le altre 30 vanno controllate una per una).
3. **Quale `cross_events.yaml` e' autoritativo**: ce ne sono **due**
   (`data/ecosystems/network/` e `data/ecosistemi/` -- cartella italiana sorella duplicata).
4. **Il TARGET di scope**: quanti biomi/specie/ecosistemi deve avere il gioco. Non e' scritto
   da nessuna parte -> "quanto manca" resta **indefinito**. Senza questo numero, pianificare
   contenuto e' costruire sul vuoto. **Questa e' la prossima decisione, ed e' master-dd.**

## Conseguenze

**Positive**: un solo vocabolario di biomi; il catalogo specie dice la verita' (46, non 105);
lo stack a 4 livelli passa da _documentato-e-ignorato_ a _fatto rispettare_; la trappola del
metric-gaming e' rimossa alla radice, non tappata.

**Negative**: 20 -> 22 biomi giocabili significa scrivere 2 righe L1 che non esistono; i 52 stub
cancellati faranno **scendere** metriche che oggi sembrano piu' alte di quanto siano (e' il
punto); il debito narrativo resta aperto.

**Rischio principale**: eseguire i passi fuori ordine. Il punto 1 e' load-bearing -- lo dice il
codice, non l'opinione.

## Riferimenti

- SoT §3 `docs/core/00-SOURCE-OF-TRUTH.md:118-170` -- il modello a 4 livelli, canonico
- Museum: `M-2026-04-26-012` (revived, aveva previsto questo esito), `M-2026-04-26-018`,
  `M-2026-07-14-001` (la saga dei 5 strati + il metodo _remove-then-remeasure_),
  `M-2026-07-14-002` (i vocabolari orfani, preservati), `M-2026-07-14-003` (key overload),
  `M-2026-07-14-004` (convenzione maiuscole)
- Censimento `docs/planning/2026-07-14-content-substrate-census.md` (#3304)
  — ⚠️ **da correggere**: dice "5 ecosistemi", sono **21** (contava `.biome.yaml`)
- Issue #3302, #3299
