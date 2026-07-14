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
riga L1 mancante (hazard/npc/difficolta'/narrativa). Zero contenuto perso, zero rete rotta.

**Giocabili: 20 + 2 (questi) - 1 (`savana`, fusa in `deserto_caldo` -> Decisione 9) = 21.**

> Il debito narrativo koppen-vs-fiction che qui sembrava aperto **e' risolto dalla Decisione 9**:
> non era sistemico, era **un solo bioma** (`savana`), e si chiude fondendolo.

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

Oggi **63 file su 105** non lo sono. _(L'Addendum 2026-07-15 corregge i conteggi di questa
sezione: erano 59, e la descrizione del receipt era sbagliata.)_

> 🛑 **ATTENZIONE -- questa decisione, eseguita alla lettera, distrugge contenuto autorato.**
> **10 dei "52 stub puri" sono le specie di `rovine_planari`**, che NON sono stub: erano specie
> complete, cancellate per errore, e la loro cicatrice dice cosi' testualmente
> (`notes: 'stub auto-generato per **ripristinare inventario**'`). Sono state **recuperate**
> (`aa92afed`). Vedi Addendum. **Il numero di stub cancellabili scende da 52 a 42.**

- **I 42 stub puri restanti sono cancellati** (con le cartelle-bioma vuote). Non codificano nulla
  che il registro dei biomi non abbia gia'. **Sono la trappola**: sono l'unico "abitante" di quei
  biomi, quindi chiunque insegua un contatore puo' appiccicargli tratti e azzerarlo.
  **Prima di cancellare, passare ogni file al test di provenienza** (vedi Addendum): un file il
  cui `receipt` dice `author: designer` non e' uno stub, e' una cicatrice.
- **I `role_trofico: evento_ecologico`** NON sono rumore: `event` e' un **ruolo minimo canonico
  del livello 2**. Vanno ricondotti al modello degli eventi (L4), non cancellati.
  _(Sono 11 sul main misurato, non 7.)_
- Catalogo onesto: **42 specie** sul main _(non 46)_; **52 dopo il recupero di `rovine_planari`**.

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
   **3b. (NUOVO, load-bearing)** I 4 alias vivono anche in `environment_affinity.biome_class` di
   **21 specie** -- e sono le specie dei 4 biomi profondi del nucleo. Vanno ripuntati sul bioma
   reale **nello stesso passo**, o il guard #3 le fa fallire tutte. Vedi Addendum, Gap A.
4. ~~Cancella i 52 stub~~ -> **RECUPERA i 10 di `rovine_planari`** (fatto: `aa92afed`), poi
   cancella i **42** restanti + le cartelle vuote; riconduci gli eventi al modello L4.
   **Passa ogni file al test di provenienza prima di cancellarlo** (Addendum, Gap C).
5. Elimina `biome_classes.yaml`.
6. Accendi i 4 guard (con negative control).
   **6b. (NUOVO)** Aggiungi il **guard di provenienza**: un file specie non puo' essere cancellato
   da automazione se il suo `receipt.author` e' `designer`. Vedi Addendum, Gap C.
7. **Ratchet del gate coverage**. Il recupero l'ha gia' alzato: `min_traits` **189 -> 191**
   (`max_missing` resta 5).

## Decisione 7 — `when.biome_class` significa IDENTITA' DI BIOMA. Il campo va rinominato

Misurato sulle 33 regole di `env_traits.json`:

| cosa usano                                                   | n      |
| ------------------------------------------------------------ | ------ |
| un'**identita' di bioma** (chiave di `biomes.yaml`)          | **19** |
| nessun `biome_class` (scoped su koppen / hazard / salinita') | 8      |
| un valore che **non risolve** su `biomes.yaml`               | **6**  |
| la **famiglia ecologica** (`arid`/`geothermal`/...)          | **0**  |

**Zero regole usano la famiglia grossolana.** L'overload non e' un'ambiguita' semantica: e' solo
un **nome sbagliato in due posti**. Si chiude rinominando:

- nelle regole: `when.biome_class` -> **`when.biome`** (e' un'identita')
- in `biomes.yaml`: il campo `biome_class` -> **`ecological_family`** (dominio chiuso, 10 valori)

**Le 6 regole orfane** (`caverna_risonante`, `laguna_bioreattiva`, `mangrovieto_cinetico` + i 3
alias psionici `status: expansion`) puntano a biomi che non esistono nel registro. Il guard #3
le farebbe fallire -> **vanno risolte nella migrazione**, non dopo.

## Decisione 8 — `cross_events.yaml`: autoritativo e' quello della network

Ce ne sono due, e **il pack pubblica quello stale**:

| file                                        | righe | ultimo commit           | letto da                         |
| ------------------------------------------- | ----- | ----------------------- | -------------------------------- |
| `data/ecosystems/network/cross_events.yaml` | 43    | **2026-05-30**          | `export_biodiversity_bundle.py`  |
| `data/ecosistemi/cross_events.yaml`         | 31    | 2025-10-27 (**9 mesi**) | `pack_manifest.yaml` + report UI |

**Autoritativo: `data/ecosystems/network/cross_events.yaml`** -- e' piu' fresco, piu' completo,
sta col network a cui appartiene (livello 4), ed e' **il path che la SoT §3 nomina**.
La copia in `data/ecosistemi/` e' **cancellata**; `pack_manifest.yaml` e il report UI vengono
ripuntati.

> ⚠️ **NON cancellare `data/ecosistemi/meta_ecosistema_alpha.yaml`**: NON e' un duplicato di
> `meta_network_alpha.yaml` (chiave `ecosistema` vs `network` -- sono cose diverse) ed e'
> **letto da `update_evo_pack_catalog.js`**, cioe' dalla catena `sync:evo-pack`.

## Decisione 9 — `savana` si fonde in `deserto_caldo`

Il debito narrativo **non e' sistemico**: 19 biomi su 20 hanno nome e summary coerenti. L'unico
che stona e' `savana` -- summary _"**Dune fotoniche** con branchi adattivi"_, affix `sabbia`,
famiglia `arid`, e affixes **copia-incollati identici** da `abisso_vulcanico`. E' un deserto col
nome sbagliato, mezzo costruito, e occupa lo slot che `deserto_caldo` riempie davvero.

**`savana` e' cancellata, la sua 1 specie migra in `deserto_caldo`.** Il conflitto koppen-vs-
fiction sparisce alla radice invece di essere gestito.

Giocabili: **20 - 1 (savana) + 2 (cryosteppe, deserto_caldo) = 21**.

## Decisione 10 — Il TARGET: nucleo-8, profondo. E "quanto manca" e' 35

Il gioco oggi e' **largo e sottile**: 20 biomi giocabili, ma solo 5 con vera profondita' (34
delle 46 specie). Gli altri 15 hanno 0-2 specie: sono abbozzi.

**Il nucleo non va inventato: era gia' scritto nei dati**, in due posti indipendenti.

- **Foodweb (livello 3)** -- ne esistono **5**, e solo 5: `badlands`, `foresta_temperata`,
  `cryosteppe`, `deserto_caldo`, `rovine_planari`.
- **Meta-rete (livello 4, la piu' recente)** -- ha **6 nodi**: quei 5 **+ `atollo_obsidiana`**.

Chi ha costruito questo gioco aveva **gia' scelto un nucleo**, e ha autorato lo stack profondo
solo per quello.

**TARGET = 8 biomi, ~8 specie ciascuno, con ecosistema + foodweb completi.**

> ⚠️ **La tabella qui sotto e' CORRETTA dall'Addendum 2026-07-15** (in fondo al documento):
> `rovine_planari` non era un buco, era un **recupero**, ed e' stato recuperato. Il gap totale
> scende da ~35 a **~27**. Le righe corrette sono marcate.

| #   | bioma               | famiglia         | perche' (dato, non gusto)                                                                                                        | specie               | mancano |
| --- | ------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------- |
| 1   | `badlands`          | arid             | foodweb + nodo                                                                                                                   | 12 _(misurato)_      | ✅      |
| 2   | `foresta_temperata` | canopy           | foodweb + nodo                                                                                                                   | 7                    | +1      |
| 3   | `deserto_caldo`     | arid             | foodweb + **`start_node`** della meta-rete                                                                                       | 5 +1 (savana)        | +2      |
| 4   | `cryosteppe`        | arid             | foodweb + nodo                                                                                                                   | 5                    | +3      |
| 5   | `rovine_planari`    | clastic          | foodweb + eco completi; **le 10 specie erano state cancellate, sono state RECUPERATE** (Addendum)                                | **10** _(#aa92afed)_ | **✅**  |
| 6   | `atollo_obsidiana`  | **littoral**     | **gia' nodo della meta-rete**; unica famiglia acquatica. Buco VERO (verificato: mai autorate)                                    | 0                    | +8      |
| 7   | `abisso_vulcanico`  | **geothermal**   | piu' specie di ogni non-core; il nucleo non ha **nessun** bioma caldo                                                            | 2                    | +6      |
| 8   | `caverna`           | **subterranean** | assorbe `caverna_risonante` -> **risolve 1 delle 6 regole orfane** e recupera **21 tratti suggeriti** che oggi puntano nel vuoto | 1 +1                 | +7      |

> Il nucleo-5 copriva solo `arid`/`canopy`/`clastic`: **niente acqua, niente calore, niente
> sottosuolo**. Il nucleo-8 copre **6 famiglie ecologiche su 10**.

### QUANTO MANCA (il numero che finora non esisteva)

> **≈ 27 specie da autorare + 3 foodweb + 2 nodi di rete.** _(era ~35 + 3 + 3; corretto
> dall'Addendum 2026-07-15)_
> `rovine_planari` **non e' piu' nel conto**: le sue 10 specie non erano da autorare, erano da
> **recuperare** -- erano state autorate il 2025-10-29 e distrutte due giorni dopo. Il nodo di
> rete ce l'ha gia'.

**Il gap non e' "27 specie generiche". E' quali RUOLI mancano in quale bioma** (i ruoli minimi
del livello 2 -- `apex`/`keystone`/`bridge`/`threat`/`event`):

| bioma              | specie vere | eco | foodweb | nodo | **ruoli mancanti**                        |
| ------------------ | ----------- | --- | ------- | ---- | ----------------------------------------- |
| `atollo_obsidiana` | 0           | ✅  | ❌      | ✅   | **apex, keystone, bridge, threat, event** |
| `abisso_vulcanico` | 2           | ✅  | ❌      | ❌   | **keystone, bridge, event**               |
| `caverna`          | 1           | ✅  | ❌      | ❌   | **apex, keystone, bridge, event**         |

`foresta_temperata` (+1), `deserto_caldo` (+2) e `cryosteppe` (+3) hanno gia' **tutti e cinque**
i ruoli minimi coperti: il loro gap e' **profondita'**, non copertura. Vanno dopo, non prima.

**I 13 biomi fuori dal nucleo vengono ARCHIVIATI** (museum card, **non** cancellati): escono dal
gioco e dalle metriche, restano nel Museum come idee. Il catalogo smette di promettere un mondo
che non esiste.

## Cosa questo ADR NON risolve

Nulla di quanto era aperto alla prima stesura: le 4 domande residue (debito narrativo, semantica
di `biome_class`, `cross_events` autoritativo, TARGET) sono state **risolte dai dati** e sono
sopra, come Decisioni 7-10.

Resta **una sola** domanda genuinamente aperta, e non e' di modello ma di contenuto:
**chi autora le ~35 specie.** E' lavoro Species-Curator-gated, e non e' una decisione: e' un
piano. Va fatto **per bioma**, mai tutto in una volta.

## Conseguenze

**Positive**: un solo vocabolario di biomi; il catalogo specie dice la verita' (46, non 105);
lo stack a 4 livelli passa da _documentato-e-ignorato_ a _fatto rispettare_; la trappola del
metric-gaming e' rimossa alla radice, non tappata.

**Negative**: 20 -> 21 biomi giocabili significa scrivere 2 righe L1 che non esistono; i 52 stub
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

---

## Addendum 2026-07-15 — `rovine_planari` era un RECUPERO. E i conteggi non riproducevano

> Sessione di indagine (nessuna specie autorata). Ogni numero qui sotto e' **misurato** contro
> file e git. Le correzioni ai numeri sono gia' applicate inline sopra; qui c'e' il perche' e i
> gap che l'ADR non vedeva.

### Il fatto principale: `rovine_planari` non era un buco

L'ADR lo dava a **`0` abitanti, `+8`, il singolo buco piu' grande del gioco**. Era falso.

| quando         | commit     | cosa                                                                                             |
| -------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| **2025-10-29** | `e83c810c` | crea `rovine_planari` **completo**: 10 specie autorate (83-103 righe, `author: designer`)        |
| **2025-10-31** | `5a06b64b` | _"docs(tri_sorgente): introduce variant docs"_ -- cancella **302.220 righe su 932 file**         |
| **2025-12-09** | `9acadc69` | _"Restore ... species inventory"_ -- recupera `badlands`, ma di `rovine_planari` solo i **nomi** |
| **2026-07-15** | `aa92afed` | **RECUPERO**: le 10 specie tornano, gate verdi                                                   |

Le specie erano **danno collaterale** di una cancellazione di massa travestita da commit di
documentazione. Il "restore" del 2025-12-09 e' riuscito a meta': ha recuperato l'inventario dei
nomi, non i corpi -- e lo ha **detto**, nella nota che ha lasciato nei file:
`notes: 'stub auto-generato per **ripristinare inventario**: sostituire con specifica completa.'`

**Ecosistema e foodweb sono sopravvissuti e nominano ancora tutte e 10 le specie per `id` esatto**
(`.ecosystem.yaml` -> produttori/consumatori/decompositori; `_foodweb.yaml` -> 14 nodi, di cui
**10 `kind: species`**, e **23 archi**). Il bioma non aveva zero abitanti: aveva **l'impronta di
dieci abitanti in ogni livello dello stack, e i corpi vuoti**.

Le 10 recuperate soddisfano **da sole tutte e cinque** le `rules.at_least` del proprio ecosistema.
Il requisito e' **`>= 1` per ciascuno** dei cinque ruoli; il set recuperato **consegna** apex 1,
keystone 2, bridge 2, threat 3, event 1. E **tutte e 10 passano la Decisione 5**.

**Controllo negativo** (e' cio' che rende il finding affidabile): lo stesso metodo **falsifica** il
recupero per `atollo_obsidiana`. Il suo ecosystem nomina 3 specie (`anguis-magnetica`,
`vitricyba-punctata`, `magnetocola-pastoris`) e **nessuna e' mai esistita come file in git**.
`atollo_obsidiana` e' un **buco vero**. Il metodo discrimina: non dice "recupero" a tutto.

---

### Gap A (P1, load-bearing) — `biome_class` ha un TERZO posto, e l'ADR ne vede due

La Decisione 7 misura l'overload su `env_traits.json` (le regole) e su `biomes.yaml` (il campo).
Ne manca uno: **`environment_affinity.biome_class` dentro i file specie**.

Misurato: **0 su 16** valori distinti usano la famiglia ecologica. Sono **tutti** identita' di
bioma -- la stessa identica patologia, in un posto che l'ADR non nomina.

Peggio: **21 specie ci portano dentro i 4 alias fabbricati** che la Decisione 4 vuole cancellare.
E non sono specie qualsiasi: sono **tutte e sole quelle dei 4 biomi profondi del nucleo**.

| alias fabbricato            | usato da                           | specie |
| --------------------------- | ---------------------------------- | ------ |
| `dorsale_termale_tropicale` | le 7 specie di `badlands`          | 7      |
| `mezzanotte_orbitale`       | le 5 specie di `cryosteppe`        | 5      |
| `abisso_vulcanico` (!)      | le 5 specie di `deserto_caldo`     | 5      |
| `foresta_miceliale`         | le 4 specie di `foresta_temperata` | 4      |

**Conseguenza**: cancellare i 4 alias (Decisione 4) **senza** ripuntare queste 21 specie fa
fallire il **guard #3** (bioma referenziato inesistente) su tutto il nucleo del gioco.
-> Aggiunto come **passo 3b** dell'ordine di migrazione.

---

### Gap B (P1) — le specie di `rovine_planari` referenziano 23 tratti MAI definiti

Le 10 specie recuperate referenziano **53 tratti**, di cui **23 non hanno voce in
`data/core/traits/glossary.json`** -- e non l'hanno mai avuta (verificato: **0 su 24** sono mai
esistiti come file `data/traits/*/*.json`). **Le specie erano state autorate in anticipo sul
catalogo tratti.** Il recupero e' quindi **meta' recupero**: la meta' specie e' sopravvissuta, la
meta' tratti non e' mai stata scritta.

Questo e' un **vettore di fabbricazione**, non un dettaglio: `build_species_trait_bridge.py:145`
fa `trait_index.setdefault(trait_id, {})`. Rigenerare il bridge con quei 23 riferimenti avrebbe
creato **23 voci di tratto nude, senza definizione** -- esattamente la forma della copertura finta
che questo repo ha appena passato un giorno a smontare.

> **L'invariante vero del repo e' il glossario**, non il per-trait DB: **203 su 203** tratti del
> bridge hanno una voce nel glossario (zero eccezioni); solo 3 non hanno un file per-trait, e
> quello **e' tollerato**. Chi tocca il bridge deve difendere il glossario, non il DB.

**Risoluzione adottata in `aa92afed`**: i 23 riferimenti orfani sono **preservati, non consumati**,
sotto un campo `pending_trait_definitions:` in ogni specie (con commento). Non cancellati in
silenzio, non fabbricati in silenzio. **Vanno autorati (Species-Curator-gated).**

I 23: `assenza_respirazione`, `campo_di_fase`, `ciclo_vitale_anomalo`, `ciclo_vitale_completo`,
`fisiologia_predatoria`, `fotosintesi_bifase`, `ghiandole_nettare_memetico`,
`intangibilita_parziale`, `lamenti_diradanti`, `maschera_illusoria`, `metabolismo_attivo`,
`metabolismo_sostentato`, `nodi_micotici`, `origine_artificiale`, `proboscide_polifaga`,
`respirazione_biologica`, `riflessi_preternaturali`, `rinforzi_modulari`, `secrezioni_antisepsi`,
`sensori_chimici`, `sinapsi_riflettenti`, `visione_spettrale`, `voce_spettrale`.

---

### Gap C (P1) — la Decisione 5, eseguita alla lettera, ricancella il contenuto recuperato

Il passo 4 diceva _"cancella i 52 stub puri"_. **10 di quei 52 erano `rovine_planari`.**
L'automazione avrebbe distrutto lo stesso contenuto **una seconda volta**, e stavolta
definitivamente rispetto al modello.

**Il discriminante non e' la dimensione del file. E' `receipt.source`.**

| `receipt`                                         | cos'e'         | esempio                         |
| ------------------------------------------------- | -------------- | ------------------------------- |
| `author: designer` + fonte reale                  | **autorato**   | `PF1E.Bestiary.v1`, `PTPF.v1.0` |
| `author: automation` + `source: coverage_autogen` | **fabbricato** | i `*-trait-keeper.yaml`         |
| _(nessun receipt)_                                | **stub**       | i 42 stub puri restanti         |

Un grep ingenuo _"recupera ogni stub che un tempo aveva contenuto"_ restituisce **34 file**. **21**
di questi sono `*-trait-keeper.yaml` con **59 righe** di contenuto -- sembrano ricchi. Ma il loro
`receipt` dice `coverage_autogen`: recuperarli **reintroduce la malattia**. Solo **13** sono
contenuto vero (i 10 di `rovine_planari` + 3 fuori dal nucleo: `psionic-canopy-scout`,
`magnet-fathom-surveyor`, `orbital-ascendant`, `PTPF.v1.0`, ~84 righe -- preservati in git, i loro
biomi sono archiviati dall'ADR).

-> **Guard di provenienza** aggiunto come passo **6b**: nessuna automazione cancella un file specie
il cui `receipt.author` e' `designer`.

---

### Gap D — i conteggi della Decisione 5 non riproducono

Misurato sul `main` pre-recupero, applicando la Decisione 5 **come e' scritta**
(`biomes` + `role_trofico` + >=1 tratto):

| l'ADR dice                                         | misurato                     |
| -------------------------------------------------- | ---------------------------- |
| catalogo onesto: **46 specie**                     | **42**                       |
| **59** file non-specie                             | **63**                       |
| **7** con `role_trofico: evento_ecologico`         | **11**                       |
| i 52 stub hanno `receipt.source: coverage_autogen` | **falso: non hanno receipt** |

La causa del delta: **11 file portano un receipt** (quindi l'ADR li conta fra i "veri") ma hanno
**zero tratti** -- falliscono la Decisione 5. Sei di questi stanno **nei biomi del nucleo**:

- `receipt: runtime-generator`, 0 tratti -> `magneto-ridge-hunter`, `slag-veil-ambusher`
  (badlands) · `aurora-bridge-runner`, `zephyr-spore-courier` (cryosteppe) ·
  `glowcap-weaver`, `myco-spire-warden` (foresta_temperata)
- `receipt: M5-#3.stub` / `M13-P6.stub`, 0 tratti -> 5 specie del bioma `tutorial`

**Post-recupero il catalogo onesto e' 52.** Non e' un miglioramento cosmetico: sono 10 specie vere
in piu' e 4 numeri che ora si possono verificare.

---

### Evidenza dei gate (misurata prima/dopo, non asserita)

| gate                                   | prima (main) | dopo (`aa92afed`)   | soglia    |
| -------------------------------------- | ------------ | ------------------- | --------- |
| `traits_with_species`                  | 189          | **191**             | min 189   |
| `rules_missing_species_total`          | 5            | 5                   | max 5     |
| `check_derived_reproducible.py --deep` | 3/3 OK       | **3/3 OK**          | enforcing |
| `validate_datasets.py`                 | valid        | valid               | —         |
| `trait_audit.py --check`               | no regress.  | no regress.         | —         |
| trait-bridge: trait-id                 | 203          | 204 (+1, 0 rimossi) | —         |

Il `+1` e' `eco_sismico`, **definito nel glossario**. Nessuna voce fabbricata.

> Il valore del recupero **non e' il contatore** (+2 tratti coperti). Sono le **10 specie**.

### Riferimenti aggiunti

- Carte museum `M-2026-07-15-*` (recupero + la lezione della provenienza)
- Commit del recupero: `aa92afed`
