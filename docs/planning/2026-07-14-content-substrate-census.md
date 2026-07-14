---
title: 'Content substrate census -- traits / species / biomes / ecosystems (2026-07-14)'
date: 2026-07-14
type: census
doc_status: active
doc_owner: master-dd
workstream: dataset-pack
last_verified: '2026-07-14'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [evo-tactics, census, traits, species, biomes, ecosystems, baseline, substrate]
---

# Content substrate census (2026-07-14)

> **Cos'e'**: una FOTOGRAFIA, non un piano. Numeri misurati sul repo a `main` @ `586c07ab`,
> non marker, non stime. Serve come **baseline onesta** contro cui valutare qualunque piano
> di contenuto futuro.
>
> **Perche' esiste**: fino a oggi il substrato di contenuto non aveva NESSUN registro. Le
> uniche metriche che lo guardavano erano truccate -- cinque strati di copertura finta,
> rimossi in un solo giorno (#3298, #3300, #3301, #3303; residui documentati in #3302).
> Un piano costruito sui numeri vecchi sarebbe costruito su metriche che mentivano.
>
> **Cosa NON e'**: non e' un allarme e non e' un backlog. Se lo scope target del gioco e'
> ~5 ecosistemi e ~46 specie, allora **non c'e' nessun buco** e questo documento dice solo
> "siamo dimensionati". La domanda che questo censimento NON puo' rispondere -- e che decide
> tutto -- e' **quanto doveva essercene**. Quella risposta e' master-dd.

## Perche' le SPEC A..Q non bastano per questa domanda

Il [residual-gate register](2026-06-23-residual-gate-register.md) e' fatto bene: ground-truth
su git, anti-marker, e i gate SPEC-A..Q sono quasi tutti chiusi **onestamente** (il PE_ratio e'
stato addirittura falsificato e droppato -- #3022 -- che e' scienza vera, non teatro).

Ma quel registro nomina `species` **0 volte** e `ecosistemi` **0 volte**.

**Le SPEC A..Q misurano la MECCANICA, e la meccanica sta bene.** Chi rivede il piano da li'
vede un gioco quasi finito. Non e' falso: e' **incompleto**. Il substrato di contenuto non
compare in nessun gate, ed e' esattamente per questo che la marcescenza e' sopravvissuta
sette mesi.

---

## 1. TRATTI -- 308 in `data/traits/index.json`

Nota: 308 = **307 tratti reali + 1 record meta** (`traits_aggregate`, `famiglia_tipologia:
Meta/Dataset`, un dump per pipeline legacy che finisce contato come tratto).

| stato                               | n       | significato                             |
| ----------------------------------- | ------- | --------------------------------------- |
| prosa autorata **+** meccanica      | **170** | pieni                                   |
| prosa boilerplate **+** meccanica   | 77      | **funzionano**, ma la prosa e' generata |
| prosa autorata, nessuna meccanica   | 22      | lore-only                               |
| boilerplate **e** nessuna meccanica | **39**  | gusci vuoti                             |

- **247/308 hanno `active_effects`** -- la macchina gira. Questo e' il dato che conta per il
  gameplay, ed e' sano.
- **116/308 hanno una descrizione boilerplate** in `glossary.json` -- generata, non autorata.
  Riconoscibile: _"X permette alle squadre di stabilizzare/disperdere/canalizzare..."_ +
  `label_en` non tradotto. E' un marker di design-stub **non tracciato da nessun flag**.
- `completion_flags.design_stub` e' oggi **0/308** (R1 chiuso, #3296) -- ma quel flag misurava
  solo `sinergie` vuote. **Non misura la prosa.** Un tratto puo' avere `design_stub: false`,
  sinergie, i18n... e una descrizione generata a macchina.
- **50/308 hanno i18n curata** (`data/i18n/it|en/traits.json`): 36 da #3247 + 14 da #3292.

### I 39 gusci vuoti

`capsule_paracadute`, `filtri_planctonici`, `ghiandole_fango_coesivo`, `giunti_antitorsione`,
`mucose_barofile`, `chemiorecettori_bromuro`, `cuscinetti_elettrostatici`, `ghiandole_ventosa`,
`linfa_tampone`, `mucose_aderenza_sonica`, `appendici_thermotattiche`, `branchie_solfatiche`,
`circolazione_cooling_loop`, `flagelli_ancoranti`, `camere_anticorrosione`,
`enzimi_metanoossidanti`, `foliaggio_spugna`, `gusci_magnesio`, `mantelli_geotermici`,
`cervelletto_equilibrio_statico`, `echi_risonanti`, `lamine_scudo_silice`,
`camere_nutrienti_vent`, `ciste_salmastre`, `coralli_partner`, `epitelio_fosforescente`,
`lamelle_sincroniche`, `membrane_planata_vectored`, `cartilagini_desertiche`,
`ciste_riduttive`, `colonne_vibromagnetiche`, `ghiaccio_piezoelettrico`,
`membrane_captura_rugiada`, `cisti_iperbariche`, `cromofori_alert_acido`, `branchie_turbina`,
`coda_stabilizzatrice_geiser`, `foliage_fotocatodico`, `luminescenza_hydrotermica`

Nessuno ha meccanica e nessuno ha prosa autorata. Sono **nomi**.

---

## 2. SPECIE -- 105 file, **46 reali** ⚠️ CORRETTO 2026-07-15

> 🛑 **CORREZIONE (2026-07-15)**: i numeri di questa sezione **non riproducono**, e la frase
> "non sono specie incomplete: sono segnaposto" e' **falsa per 10 file su 59**.
> Vedi ADR-2026-07-14 §Addendum 2026-07-15 (Gap C + Gap D).
>
> | questa sezione dice | misurato (main, Decisione 5 come scritta) |
> | ------------------- | ----------------------------------------- |
> | specie vere: **46** | **42** (e **52** dopo il recupero)        |
> | stub: **59**        | **63**                                    |
>
> **10 dei 59 "stub" NON erano segnaposto**: erano le specie di `rovine_planari`, autorate per
> intero il 2025-10-29 (`e83c810c`, 83-103 righe, `author: designer`) e distrutte due giorni dopo
> come danno collaterale di `5a06b64b`, un commit che ha cancellato 302.220 righe. Sono state
> **recuperate** (`aa92afed`). Il loro `notes` lo diceva: _"stub auto-generato per **ripristinare
> inventario**"_ -- e' la cicatrice di un restore parziale, non un segnaposto.
>
> **Il discriminante e' `receipt.source`, non la lunghezza del file.**

|                                                           | n            |
| --------------------------------------------------------- | ------------ |
| file `.yaml` sotto `packs/evo_tactics_pack/data/species/` | 105          |
| **stub auto-generati** (`notes: 'stub auto-generato...'`) | **59 (56%)** |
| **specie vere**                                           | **46**       |

Gli stub sono file di 3 righe, senza `biomes:`, senza `environment_affinity`. Non sono specie
incomplete: sono **segnaposto**. Nati per far quadrare una matrice di coverage (vedi #3302).

---

## 3. BIOMI -- 28 classi canoniche, 49 cartelle, **15 popolate**

|                                               | n      |
| --------------------------------------------- | ------ |
| `biome_class` canonici (`biome_classes.yaml`) | 28     |
| cartelle-bioma sotto `species/`               | 49     |
| **cartelle con almeno 1 specie vera**         | **15** |
| **cartelle vuote** (solo stub)                | **34** |

### Dove vive davvero il gioco

| bioma                                                                                                                                              | specie vere | ecosistema descritto |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------- |
| `badlands`                                                                                                                                         | **11**      | SI                   |
| `foresta_temperata`                                                                                                                                | **7**       | SI                   |
| `tutorial`                                                                                                                                         | 6           | --                   |
| `cryosteppe`                                                                                                                                       | 5           | SI                   |
| `deserto_caldo`                                                                                                                                    | 5           | SI                   |
| `abisso_vulcanico`                                                                                                                                 | 2           | --                   |
| `canopia_ionica`                                                                                                                                   | 2           | --                   |
| `canyons_risonanti` / `caverna` / `caverna_risonante` / `foresta_miceliale` / `palude` / `reef_luminescente` / `savana` / `stratosfera_tempestosa` | 1 ciascuno  | --                   |

**34 delle 46 specie vere (74%) stanno in 5 biomi.** Gli altri 10 biomi popolati hanno 1-2
specie: sono abbozzi, non ambienti.

---

## 4. ECOSISTEMI -- **21**, non 5

> 🔴 **CORREZIONE (2026-07-14, stessa giornata)**: la prima stesura di questa sezione diceva
> **"5 ecosistemi"**. **E' SBAGLIATO.** Contavo i file `*.biome.yaml` (5) credendo fossero i
> descrittori di ecosistema. Gli ecosistemi sono `*.ecosystem.yaml` e sono **21** -- piu' 5
> foodweb (livello 3) e 1 meta-network (livello 4), che questo censimento non aveva nemmeno
> visto. L'errore e' stato scoperto solo consultando il Museum (carta `M-2026-04-26-012`), che
> **aveva previsto testualmente** questo modo di sbagliare. Vedi ADR-2026-07-14.
>
> **Lo stack reale e' a 4 livelli** (SoT §3): `bioma (20) -> ecosistema (21) -> foodweb (5) ->
network + cross-events (1)`. Le sezioni sopra restano valide; questa era sbagliata.

| livello                             | reale  |
| ----------------------------------- | ------ |
| 1 — bioma (`biomes.yaml`)           | **20** |
| 2 — ecosistema (`*.ecosystem.yaml`) | **21** |
| 3 — foodweb (`*_foodweb.yaml`)      | **5**  |
| 4 — network + cross-events          | **1**  |

`cryosteppe` e `deserto_caldo` sono gli **unici 2 ecosistemi su 21** senza entry di livello 1 --
eppure sono nodi della meta-rete (`DESERTO_CALDO` ne e' lo `start_node`) e origini canoniche di
eventi cross-bioma. ADR-2026-07-14 li **promuove** a biomi giocabili (20 -> 22).

### (sezione originale, conservata per onesta')

**5** file `*.biome.yaml` -- una cosa DIVERSA dagli ecosistemi, e quasi tutta `null`:

Solo 5 biomi hanno un `.biome.yaml` (descrittore PTPF v1.1 completo: koppen, NPP, morfologia,
clima, rete trofica, servizi ecosistemici):

`badlands` · `cryosteppe` · `deserto_caldo` · `foresta_temperata` · **`rovine_planari`**

> ~~⚠️ **`rovine_planari` ha l'ecosistema descritto e ZERO specie vere** (10 file, 10 stub).
> E' una classe canonica di prima categoria -- koppen Cfa/Cfb, `.biome.yaml` completo -- con
> una cartella che _sembra_ popolata e non lo e'.~~
>
> ✅ **SMENTITO 2026-07-15.** La cartella _era_ popolata: 10 specie autorate per intero il
> 2025-10-29 (`e83c810c`), distrutte due giorni dopo da `5a06b64b`. **Recuperate** (`aa92afed`).
> L'ecosistema e il foodweb erano sopravvissuti e **nominavano ancora tutte e 10 le specie per
> `id` esatto** -- non era un buco, era l'impronta di dieci abitanti coi corpi vuoti.
> Vedi ADR-2026-07-14 §Addendum 2026-07-15.

Quindi: **28 classi canoniche, 5 descritte, 4 vive.**

---

## 5. Il vocabolario dei biomi e' rotto (dettaglio in #3302)

Quattro vocabolari sovrapposti, e la chiave `biome_class` e' **semanticamente sovraccarica**:

1. `biome_classes.yaml` -- **28** classi fini (su cui scoping-ano le regole env; porta i
   `koppen_examples` da cui dipende il gate coverage post-#3300)
2. `data/core/biomes.yaml` -- **20** istanze... il cui campo `biome_class:` contiene una
   tassonomia **grossolana e diversa** (`geothermal`, `arid`, `canopy`, `wetland`...).
   **Stesso nome di chiave, significato diverso, file diverso.**
3. `config/project_index.json` -> `mappings.biome_classes` -- **33** (hard-gated da
   `validate_registry_naming.py`)
4. I **21 nomi** dell'espansione `controllo_psionico` -- in nessuno dei tre

In piu' `data/core/biome_aliases.yaml` dichiara `badlands -> dorsale_termale_tropicale`,
`deserto_caldo -> abisso_vulcanico`, `cryosteppe -> mezzanotte_orbitale`,
`foresta_temperata -> foresta_miceliale` come `status: migrated` -- su quattro biomi che sono
**classi vive con 11/5/5/7 specie vere**. Chiunque risolva i biomi attraverso quel file mappa
`badlands` su una dorsale tropicale.

---

## 6. Cosa NON dice questo censimento

- **Non dice che il gioco e' rotto.** 247 tratti con meccanica, 46 specie vere, 4 ecosistemi
  vivi e i gate SPEC-A..Q chiusi = un gioco che funziona.
- **Non dice quanto manca.** Non so quale fosse il target. Se il target e' ~5 ecosistemi, siamo
  a posto e questo doc dice solo "dimensionati".
- **Non e' un backlog.** Non propone lavoro. Propone di **decidere il target** prima di
  pianificare, perche' oggi non e' scritto da nessuna parte.

## 7. Ordine raccomandato

1. **MISURA** -- questo documento. Fatto.
2. **MODELLO** -- ADR su #3302: cos'e' un `biome_class`, cos'e' un'istanza di bioma, e **cosa
   puo' essere una "specie"** (oggi il 56% del catalogo e' segnaposto). Non si puo' pianificare
   contenuto senza questo.
3. **TARGET** -- master-dd: quanti ecosistemi/biomi/specie deve avere il gioco. Senza questo
   numero, "quanto manca" e' indefinito.
4. **PIANO** -- solo ora, SPEC nuove o estese, sopra un substrato misurato.
5. **BUILD.**

Invertire questo ordine e' esattamente come e' nata la regola-`coverage_backfill`: qualcuno
doveva far quadrare un numero e non aveva la realta' sotto.

## Riferimenti

- #3302 -- data-model debris (21 cartelle-bioma fabbricate, alias contraddittori, key overload)
- #3299 -- 71 tratti che nessuna regola-bioma suggerisce (triage A/B/C)
- #3298 / #3300 / #3301 / #3303 -- i cinque strati di copertura finta, rimossi
- [`2026-06-23-residual-gate-register.md`](2026-06-23-residual-gate-register.md) -- i gate
  SPEC-A..Q (meccanica; sani, quasi chiusi)
