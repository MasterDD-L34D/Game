---
doc_status: review_needed
doc_owner: master-dd
workstream: dataset-pack
last_verified: '2026-05-31'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [d4, worldgen, ecosystem, produttori, producer, triage, master-dd]
---

# D4 — Proposta produttori per 16 habitat senza base trofica

> **Scopo**: colmare il gap sistemico segnalato in [PR #2485](https://github.com/MasterDD-L34D/Game/pull/2485).
> 17/18 draft ecosystem non hanno produttori (piante / alghe / funghi alla base
> della catena alimentare). Questo doc propone i produttori habitat per habitat.
>
> **Niente di canonical modificato.** E' solo una proposta testuale — master-dd
> sceglie cosa approvare, poi i produttori vengono aggiunti manualmente ai draft
> YAML prima del band-verify.
>
> **Fonti usate** (reuse-first, zero invenzione):
>
> - **A** = produttori gia' presenti nei canonical esistenti (riuso verbatim)
> - **B** = ispirazione da Pathfinder plant-type bestiary (43 creature, `incoming/pathfinder/bestiary1e_index.csv`), adattati in naming Evo-Tactics
> - **C** = flora tematica nuova coerente col setting (dove A+B non coprono)

## Legenda colonne

| colonna             | significato                                                         |
| ------------------- | ------------------------------------------------------------------- |
| produttori proposti | nomi da aggiungere a `ecosistema.trofico.produttori` nel draft YAML |
| fonte               | A / B(Pathfinder) / C(nuovo tematico)                               |
| confidenza          | alta / media / bassa                                                |
| note                | contesto o alternativa                                              |

---

## 0. Esito ricerca reuse-first nel SoT

> Risposta a "cerca se ci sono riferimenti gia' pronti nell'ingest Pathfinder o negli ultimi approfondimenti".

**Finding onesto: NON esiste un pool di specie-produttore dedicate.** Le 53 creature del catalogo + gli ingest (`incoming/species/`, `data/external/evo/`) sono TUTTE animali/consumatori (0 produttori, eccetto `sp_arenaceros_placidus` con `membrane_eliofiltranti`). Nel gioco i produttori sono **flora ambientale** (voci semplici negli ecosystem), non creature giocabili. Il riuso reale e' di 3 tipi:

**(A) Vocabolario flora canonical** — riuso verbatim da `packs/.../ecosystems/`: `cianobatteri`, `alghe`, `alghe_cryofile`, `licheni_termocromici`, `muschi_permafrost`, `arbusti_xerofili`, `crostoni_criptofite`, `arbusti_pioneer`, `cactus-weaver`, `piante_superiori`.

**(B) Pathfinder plant-type bestiary** (`incoming/pathfinder/bestiary1e_index.csv`, 43 creature plant-type) — mapping per ambiente (env tag -> bioma):

| bioma                                | candidati Pathfinder (nome reale)                                                |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| caverna                              | Basidirond, Myceloid, Violet Fungus, Phycomid, Vegepygmy (env=underground)       |
| palude                               | Fungus Leshy, Shambling Mound, Giant Flytrap, Viper Vine (env=swamp)             |
| foresta_temperata                    | Mandragora, Alraune, Quickwood, Tendriculos (env=temperate forest)               |
| foresta_acida                        | Yellow Musk Creeper, Weedwhip, Tendriculos (env=forest+underground)              |
| savana                               | Gourd Leshy, Jack-O'-Lantern, Leaf Leshy (env=hills+plains+forest)               |
| pianura_salina_iperarida             | Saguaroi (env=warm deserts)                                                      |
| reef_luminescente / atollo_obsidiana | Seaweed Leshy, Sargassum Fiend (env=ocean+coastline)                             |
| frattura_abissale_sinaptica          | **Cerebric Fungus** (tema neurale perfetto), Mu Spore, Mindslaver Mold (env=any) |
| canyons_risonanti                    | Jinmenju (env=hills+mountains)                                                   |
| qualsiasi                            | Living Topiary, Moonflower, Irminsul (env=any land)                              |

**(C) Concept-catalog flora** — `docs/planning/2026-04-25-creature-concept-catalog.md` (gli "ultimi approfondimenti": entita' progettate, non ancora promosse a catalogo). Sono creature da combattimento, ma 3 hanno natura autotrofa riusabile come produttore-tier:

| concept id                             | bioma (gia' assegnato)            | tipo                | uso produttore                                                 |
| -------------------------------------- | --------------------------------- | ------------------- | -------------------------------------------------------------- |
| `lichene_emette` (Emitter Lichen)      | caverna                           | lichene statico     | SI — rimpiazza l'inventato `licheni_cavernicoli`               |
| `ifa_psichedelica` (Psychedelic Hypha) | foresta_acida / foresta_miceliale | fungo statico       | SI — rimpiazza l'inventato `muschio_corrosivo` / `fungo_acido` |
| `coralluna_palustre` (Marsh Coralmoon) | palude                            | corallo sessile     | parziale — affianca `canneti_palustri` (simbiosi algale)       |
| trait `batteri_endosimbionti_chemio`   | abisso_vulcanico / frattura       | trait chemiosintesi | base concettuale per i produttori chemiosintetici proposti     |

**Conclusione**: dove le tabelle sotto avevano pick "C (nuovo tematico)" a bassa confidenza, ora ci sono riferimenti reali (Pathfinder o concept-catalog) — vedi soprattutto `caverna`, `foresta_acida`, `palude`, `frattura_abissale_sinaptica`. Resta vero che il grosso della base trofica = vocabolario flora ambientale semplice (categoria A), coerente con come i canonical esistenti trattano i produttori.

---

## ✅ SELEZIONE APPLICATA (Claude, autonoma — pending master-dd review)

> User: "spunta i migliori da usare da solo". Ho scelto i produttori migliori
> (reuse-first) e li ho **gia' applicati ai 18 draft YAML** (`docs/planning/ecosystems-draft/`).
> ⚠️ Scelta autonoma Claude: master-dd puo' modificare prima del band-verify. Nessun
> file canonical (`packs/.../ecosystems/`) toccato. I draft restano draft.

| bioma                       | produttori applicati                                             | fonte                                   |
| --------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| badlands (MERGE)            | arbusti_xerofili, crostoni_criptofite, cianobatteri              | A canonical verbatim                    |
| foresta_temperata (MERGE)   | piante_superiori, alghe, cianobatteri                            | A canonical verbatim                    |
| savana                      | arbusti_xerofili, cianobatteri (+ arenaceros-placidus → primari) | A canonical                             |
| caldera_glaciale            | alghe_cryofile, muschi_permafrost                                | A 100% canonical (cryosteppe)           |
| canyons_risonanti           | licheni_termocromici, arbusti_xerofili                           | A 100% canonical                        |
| pianura_salina_iperarida    | crostoni_criptofite, cianobatteri                                | A 100% canonical                        |
| atollo_obsidiana            | alghe, cianobatteri                                              | A 100% canonical                        |
| canopia_ionica              | piante_superiori, alghe                                          | A 100% canonical                        |
| palude                      | canneti_palustri, alghe                                          | A (alghe) + reed                        |
| dorsale_termale_tropicale   | cianobatteri, alghe_termali                                      | A (cianobatteri) + real                 |
| caverna                     | lichene_emette, funghi_chemiosintetici                           | C concept-catalog + real                |
| foresta_acida               | ifa_psichedelica, funghi_acidofili                               | C concept-catalog + real                |
| abisso_vulcanico            | batteri_chemiosintetici, alghe_termofile                         | real chemo/photo                        |
| frattura_abissale_sinaptica | batteri_chemiosintetici, alghe_bioluminescenti                   | real chemo/biolum                       |
| reef_luminescente           | alghe, coralli_simbiotici                                        | A (alghe) + real reef base              |
| stratosfera_tempestosa      | aeroplancton_fotosintetico                                       | ⚠️ real aerobiologia                    |
| mezzanotte_orbitale         | funghi_melanici_radiotrofi                                       | ⚠️ real (funghi radiotrofi)             |
| steppe_algoritmiche         | cianobatteri, licheni_termocromici                               | ⚠️ A canonical (placeholder lore-gated) |

Esito: **18/18 draft ora hanno una base produttori** (food web non piu' rotto). 11/18 usano produttori canonical verbatim/pattern. I 3 ⚠️ (orbitale / stratosfera / steppe) restano lore-gated: pick difendibile real-science, ma master-dd conferma il senso nel setting.

---

## 1. MERGE-into-canonical (2) — produttori GIA' presenti

Non serve proporre niente: questi habitat hanno gia' un canonical ricco.
**Azione**: aggiungere solo le nuove creature consumer ai tier esistenti.

| habitat           | produttori esistenti (canonical)                    | consumer da aggiungere (draft)                             |
| ----------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| badlands          | arbusti_xerofili, crostoni_criptofite, cianobatteri | ferriscroba-detrita, ferrimordax-rutilus, rubrospina-velox |
| foresta_temperata | piante_superiori, alghe, cianobatteri               | nebulocornis-mollis, arboryxis-lenis                       |

---

## 2. NEW con produttori proposti (13)

### savana _(gia' 1 produttore — completare)_

| produttori proposti | fonte                          | confidenza | note                                   |
| ------------------- | ------------------------------ | ---------- | -------------------------------------- |
| arbusti_savana      | A (pattern badlands)           | alta       | adattamento xerofilo, gia' nel setting |
| cianobatteri        | A (universale, in 3 canonical) | alta       | base universale fotosintesi            |

Consumer gia' presenti nel draft: arenaceros-placidus (ha `membrane_eliofiltranti` = produttore secondario), plus apex.

---

### palude

| produttori proposti | fonte                                             | confidenza | note                                           |
| ------------------- | ------------------------------------------------- | ---------- | ---------------------------------------------- |
| canneti_palustri    | C                                                 | alta       | vegetazione iconica palude                     |
| alghe_palustri      | A (pattern foresta_temp.)                         | alta       | alghe = universale acquatico                   |
| mucchio_strisciante | B (Shambling Mound, env=temperate forest+marshes) | media      | pianta carnivora semi-animata, adatta al bioma |

---

### caverna

| produttori proposti    | fonte                              | confidenza | note                                                             |
| ---------------------- | ---------------------------------- | ---------- | ---------------------------------------------------------------- |
| funghi_chemiosintetici | C                                  | alta       | produttori senza luce = chemiosintesi, scientificamente corretto |
| licheni_cavernicoli    | A (pattern cryosteppe: licheni)    | alta       | licheni = pioneer su roccia, vivono in grotta                    |
| fungo_violetto         | B (Violet Fungus, env=underground) | media      | nome adattato; in Pathfinder e' predatore ma e' un fungo         |

---

### abisso_vulcanico

| produttori proposti     | fonte                                             | confidenza | note                                                            |
| ----------------------- | ------------------------------------------------- | ---------- | --------------------------------------------------------------- |
| batteri_chemiosintetici | C                                                 | alta       | fumarole vulcaniche = chemiosintesi (ecosistemi deep-sea reali) |
| alghe_termofili         | C                                                 | alta       | alghe resistenti al calore, fonti termali                       |
| cianobatteri_solforosi  | A+C (cianobatteri canonical + tematica vulcanica) | media      | variante del cianobatteri canonical                             |

---

### dorsale_termale_tropicale

| produttori proposti | fonte          | confidenza | note                                        |
| ------------------- | -------------- | ---------- | ------------------------------------------- |
| alghe_termali       | C              | alta       | flora termale tropicale reale               |
| piante_idrotermali  | C              | media      | vegetazione lussureggiante su dorsale calda |
| cianobatteri        | A (universale) | alta       | base sempre valida                          |

---

### caldera_glaciale

| produttori proposti | fonte                                       | confidenza | note             |
| ------------------- | ------------------------------------------- | ---------- | ---------------- |
| alghe_cryofile      | A (riuso verbatim da cryosteppe canonical)  | alta       | gia' nel setting |
| muschi_glaciali     | A (pattern muschi_permafrost da cryosteppe) | alta       | gia' nel setting |

---

### atollo_obsidiana

| produttori proposti | fonte                                             | confidenza | note                                             |
| ------------------- | ------------------------------------------------- | ---------- | ------------------------------------------------ |
| alghe_ossidianiche  | C                                                 | alta       | alghe adattate a roccia vulcanica nera, costiera |
| kelp_ossidianico    | B (Seaweed Leshy, env=ocean+coastline → adattato) | media      | kelp = alga marina gigante, coerente con atollo  |

---

### canyons_risonanti

| produttori proposti | fonte                                | confidenza | note                                                         |
| ------------------- | ------------------------------------ | ---------- | ------------------------------------------------------------ |
| licheni_risonanti   | C                                    | alta       | licheni su roccia = bioma canyon; "risonanti" dal nome bioma |
| arbusti_rupestri    | A (pattern arbusti_xerofili/pioneer) | alta       | canyon = arido+roccioso                                      |
| zucca_leshy         | B (Gourd Leshy, env=hills+plains)    | bassa      | creatura-pianta Pathfinder; naming da adattare               |

---

### pianura_salina_iperarida

| produttori proposti   | fonte                                                | confidenza | note                                                |
| --------------------- | ---------------------------------------------------- | ---------- | --------------------------------------------------- |
| crosta_cianobatterica | A+C (cianobatteri canonical + sali)                  | alta       | croste biologiche su sale = reale (Great Salt Lake) |
| alofite_pioneere      | C                                                    | alta       | piante alofite = specializzate su suolo salato      |
| saguaroi_salino       | B (Saguaroi Pathfinder, env=warm deserts → adattato) | media      | cactus del deserto, resistente ad arsura+sale       |

---

### reef_luminescente

| produttori proposti   | fonte                              | confidenza | note                                                    |
| --------------------- | ---------------------------------- | ---------- | ------------------------------------------------------- |
| alghe_bioluminescenti | C                                  | alta       | alghe luminescenti = dinoflagellati reali               |
| coralli_simbiotici    | C                                  | alta       | corallo = animale+alga simbiotica, base di tutti i reef |
| seaweed_luminoso      | B (Seaweed Leshy ocean → adattato) | media      | alga marina animata, gia' nel Pathfinder bestiary       |

> ⚠️ `reef_luminescente` = SINGLETON (1 sola specie). Opzione: aggiungere altre specie al bioma oppure fold in `atollo_obsidiana`.

---

### foresta_acida

| produttori proposti     | fonte                                                      | confidenza | note                                               |
| ----------------------- | ---------------------------------------------------------- | ---------- | -------------------------------------------------- |
| piante_acido_resistenti | C                                                          | media      | vegetazione resistente a pH basso                  |
| fungo_acido             | B (Yellow Musk Creeper env=forests+underground → adattato) | media      | fungo-pianta; in Pathfinder e' parassita ma flora  |
| muschio_corrosivo       | C                                                          | bassa      | ⚠️ inventivo; potrebbe non avere senso nel setting |

> ⚠️ `foresta_acida` = SINGLETON (1 sola specie), valutare defer.

---

### canopia_ionica

| produttori proposti        | fonte                                                          | confidenza | note                                                   |
| -------------------------- | -------------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| piante_elettro-conduttrici | C                                                              | media      | vegetazione adattata a scariche ioniche                |
| alghe_ioniche              | C                                                              | media      | alghe conduttrici, adatte a foresta ionica             |
| treant_ionico              | B (Treant Pathfinder, env=any forest → adattato tematicamente) | bassa      | treant = albero-animato; "ionico" e' aggiunta tematica |

---

### frattura_abissale_sinaptica

| produttori proposti     | fonte                                                                      | confidenza | note                                                   |
| ----------------------- | -------------------------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| funghi_cerebrici        | B (**Cerebric Fungus Pathfinder**, env=any — tema PERFETTO: fungo+neurali) | alta       | il nome suggerisce rete neurale, calza con "sinaptica" |
| alghe_sinaptic          | C                                                                          | media      | alghe bioluminescenti con proprietà neurali            |
| batteri_chemiosintetici | C (stesso pattern abisso_vulcanico)                                        | alta       | abisso = no luce, chemiosintesi                        |

---

## 3. DEFER — habitat troppo esotici o sottili (3)

Questi 3 non hanno produttori naturali evidenti.
Consiglio: aspettare design intent master-dd prima di proporre flora.

| habitat                    | problema                                                                           | opzione                                                  |
| -------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **mezzanotte_orbitale**    | Nessuna pianta esiste senza luce/gravita. Produttori = cristalli? energia cosmica? | Design call: chemiosintesi da radiazioni, oppure defer   |
| **stratosfera_tempestosa** | Flora aerea = concetto non standard. Niente in Pathfinder o canonical.             | Design call: licheni_volanti / alghe_aeree, oppure defer |
| **steppe_algoritmiche**    | "Algoritmiche" = setting non-naturale? Flora = cristalli silicei?                  | Design call: cosa vuol dire questo bioma nel lore?       |

---

## Riepilogo azioni per master-dd

1. **Conferma / scarti / modifica** la tabella sopra (spunta le voci ok, X quelle da cambiare).
2. **Decidi i 3 DEFER** (mezzanotte_orbitale, stratosfera_tempestosa, steppe_algoritmiche) — lore question.
3. Una volta approvate le proposte, io aggiungo i produttori ai 16 draft YAML (`docs/planning/ecosystems-draft/`).
4. Poi: **N=40 band-verify** (HC06 / HC07) per ogni habitat che tocca scenario reinforcement.
5. Solo dopo band-verify in banda → promuovere in `packs/evo_tactics_pack/data/ecosystems/` (tu).
6. `rovine_planari` resta off-limits (D6).

---

## Provenienza

- Bestiary: `incoming/pathfinder/bestiary1e_index.csv` (1212 creature, 43 plant-type).
- Canonical producers: `packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml`.
- Catalog produttori: solo `sp_arenaceros_placidus` (trait `membrane_eliofiltranti`) tra le 53 creature.
- ⚠️ Proposta autonoma Claude — tutti i pick confidenza=bassa/media richiedono review master-dd.
