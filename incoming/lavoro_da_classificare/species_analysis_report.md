# Analisi delle specie Evo‑Tactics

Questo report analizza le specie presenti nel repository Evo‑Tactics, basandosi sui file YAML del pack *Evo‑Tactics* e sul **manifest** dei biomi contenuto in `catalog_data.json`【892160884126736†L14-L16】.  Sono state esaminate specie complete e «evento» dei biomi **Badlands**, **Foresta Temperata**, **Deserto Caldo** e **Cryosteppe**.  Ogni voce riporta gli elementi chiave richiesti dal formato del repository: nome, bioma, ruolo trofico, morphotype, flag (apex, keystone, bridge, threat, event), se è giocabile e i tratti suggeriti/opzionali.

## 1 Badlands

| Specie | Ruolo trofico (role_trofico) | Bioma | Flag rilevanti | Tratti suggeriti / optional | Osservazioni |
| --- | --- | --- | --- | --- | --- |
| **Dune Stalker** (`dune-stalker`) | Predatore terziario apex【868398707807469†L10-L17】 | dorsale_termale_tropicale【868398707807469†L8-L12】 | apex = true, keystone = false, playable_unit = false【868398707807469†L14-L23】 | **Suggeriti:** artigli_sette_vie, scheletro_idro_regolante, struttura_elastica_amorfa【868398707807469†L52-L56】; **Opzionali:** coda_frusta_cinetica, sacche_galleggianti_ascensoriali, criostasi_adattiva, olfatto_risonanza_magnetica, respiro_a_scoppio【868398707807469†L57-L62】 | Apex predator terrestre; ha un budget di peso 12 e sfrutta artigli e tessuti elastici per la caccia notturna. |
| **Echo Wing** (`echo-wing`) | Dispersore ponte【523858839563614†L10-L14】 | dorsale_termale_tropicale + multibiome (canyons_risonanti, mezzanotte_orbitale, savana, foresta_miceliale)【523858839563614†L54-L68】 | bridge = true; playable_unit = true【523858839563614†L15-L23】 | **Suggeriti:** eco_interno_riflesso, occhi_infrarosso_composti, sonno_emisferico_alternato【523858839563614†L70-L74】; **Opzionali:** sacche_galleggianti_ascensoriali, lingua_tattile_trama【523858839563614†L75-L98】 | Un uccello planatore che impollina e disperde semi; dotato di eco-riflesso e visione infrarosso. Può essere giocato come unità e funge da ponte fra biomi. |
| **Ferrocolonia Magnetotattica** (`ferrocolonia-magnetotattica`) | Predatore/regolatore simbionte【91302017259064†L10-L14】 | dorsale_termale_tropicale【91302017259064†L8-L15】 | keystone = true, sentient = true (S2), playable_unit = true【91302017259064†L15-L24】 | **Suggeriti:** mimetismo_cromatico_passivo, sangue_piroforico, secrezione_rallentante_palmi【91302017259064†L84-L88】; **Opzionali:** lingua_tattile_trama, ventriglio_gastroliti【91302017259064†L88-L92】 | Ingegnere radicante con funzioni di simbionte; produce secrezioni e può manipolare il suolo. Forte componente sociale e sinergie di accoppiamento. |
| **Nano Rust Bloom** (`nano-rust-bloom`) | Minaccia microbica【820636074372850†L255-L267】 | badlands | threat = true【820636074372850†L260-L266】 | (Tratti non forniti nel manifest: occorre recuperare il file YAML, ma presumibilmente includerà tratti caustici o infettivi) | Microbo patogeno che sopprime gli scavenger. |
| **Rust Scavenger** (`rust-scavenger`) | Ingegnere ecosistema【820636074372850†L270-L280】 | badlands | keystone = true【820636074372850†L280-L287】 | (File da recuperare: tratti legati alla digestione di detriti e al riciclo dei nutrienti) | Detritivoro chiave che regola la decomposizione dei resti organici. |
| **Sand Burrower** (`sand-burrower`) | Erbivoro primario【820636074372850†L290-L298】 | badlands | Nessuna flag speciale【820636074372850†L296-L309】 | (File da recuperare) | Preda scavatrice che bruca arbusti e licheni; importante per il trasferimento di energia. |
| **Evento: Tempesta Ferrosa** (`evento-tempesta-ferrosa`) | Evento ecologico di tipo boss【165276345784449†L10-L44】 | dorsale_termale_tropicale【165276345784449†L8-L13】 | event = true【165276345784449†L14-L21】 | **Suggeriti:** cute_resistente_sali, enzimi_chelanti, pelli_anti_ustione, pigmenti_termici【165276345784449†L56-L61】 | Evento climatico magnetico; presenta alti valori di rischio e tilt. |

## 2 Foresta Temperata

| Specie | Ruolo trofico | Bioma | Flag | Tratti suggeriti / optional | Osservazioni |
| --- | --- | --- | --- | --- | --- |
| **Lupo della Foresta** (`lupus-temperatus`) | Predatore terziario apex【591469412116246†L46-L62】 | foresta_temperata | apex = true, keystone = true【592??????†???】 | **Suggeriti:** empatia_coordinativa, tattiche_di_branco, risonanza_di_branco【591469412116246†L46-L62】; **Opzionali:** focus_frazionato, occhi_infrarosso_composti【591469412116246†L46-L62】 | Predatore di branchi con tratti sociali; funge da specie chiave. |
| **Sentinella Radice** (`sentinella-radice`) | Ingegnere ecosistema【372306137428004†L59-L66】 | foresta_temperata | keystone = true, bridge = true, sentient【372306137428004†L59-L66】 | **Suggeriti:** focus_frazionato, pathfinder, pianificatore【372306137428004†L59-L66】; **Opzionali:** random, empatia_coordinativa | Pianta senziente che difende la rete miceliale; funge da ponte tra trame del bosco. |
| **Blight Micotico** (`blight-micotico`) | Minaccia microbica【252894587761822†L51-L59】 | foresta_temperata | threat = true【252894587761822†L51-L59】 | **Suggeriti:** spore_psichiche_silenziate, lingua_tattile_trama, ghiandola_caustica【252894587761822†L51-L59】; **Opzionali:** mimetismo_cromatico_passivo, filamenti_digestivi_compattanti【252894587761822†L51-L59】 | Patogeno fungino che attacca la fauna locale; non è giocabile. |
| **Evento: Seme d’Uragano** (`evento-seme-uragano`) | Evento ecologico【855554203911473†L51-L57】 | foresta_temperata | event = true【855554203911473†L51-L57】 | **Suggeriti:** pelli_fitte【855554203911473†L51-L57】 | Evento che simula un uragano di semi; aumenta la rigenerazione della foresta ma presenta rischi. |

## 3 Deserto Caldo

| Specie | Ruolo trofico | Bioma | Flag | Tratti suggeriti / optional | Osservazioni |
| --- | --- | --- | --- | --- | --- |
| **Thermo Raptor** (`thermo-raptor`) | Predatore terziario apex【572820202518723†L1-L10】 | abisso_vulcanico【572820202518723†L1-L4】 | apex = true【572820202518723†L9-L16】 | **Suggeriti:** cuticole_cerose, grassi_termici, pelli_cave, pigmenti_aurorali, proteine_shock_termico, reti_capillari_radici【572820202518723†L47-L54】 | Predatore notturno adattato al calore con protezioni termiche e pigmenti aurorali. |
| **Cactus Weaver** (`cactus-weaver`) | Ingegnere ecosistema【820636074372850†L538-L549】 | deserto_caldo | keystone = true【820636074372850†L550-L558】 | (File da recuperare) | Costruisce strutture viventi usando cactus; funge da detritivoro e ingegnere. |
| **Noctule Termico** (`noctule-termico`) | Dispersore ponte【820636074372850†L581-L591】 | deserto_caldo | bridge = true【820636074372850†L592-L599】 | (File da recuperare) | Chirottero impollinatore/dispersione; probabilmente dotato di ali termiche e sonar. |
| **Silica Bloom** (`silica-bloom`) | Minaccia microbica【820636074372850†L603-L615】 | deserto_caldo | threat = true【820636074372850†L612-L618】 | (File da recuperare) | Microrganismo patogeno; potrebbe secernere acidi silicati. |
| **Evento: Ondata Termica Ionica** (`evento-ondata-termica`) | Evento ecologico【820636074372850†L561-L579】 | deserto_caldo | event = true【820636074372850†L571-L576】 | (File da recuperare) | Evento climatico estremo di calore e ioni; richiede equipaggiamento anti-calore. |

## 4 Cryosteppe

| Specie | Ruolo trofico | Bioma | Flag | Tratti suggeriti / optional | Osservazioni |
| --- | --- | --- | --- | --- | --- |
| **Cryo Lynx** (`cryo-lynx`) | Predatore terziario apex【820636074372850†L752-L760】 | cryosteppe | apex = true【820636074372850†L762-L769】 | (File da recuperare) | Felino adattato al gelo; probabili tratti di mimetismo bianco e resistenza al freddo. |
| **Bisonte Nano della Steppa** (`steppe-bison-mini`) | Ingegnere ecosistema & preda【820636074372850†L793-L804】 | cryosteppe | keystone = true【820636074372850†L804-L810】 | (File da recuperare) | Megaerbivoro ridotto; stabilizza il terreno e fornisce risorse alimentari. |
| **Gabbiano d’Aurora** (`aurora-gull`) | Dispersore ponte【820636074372850†L731-L740】 | cryosteppe | bridge = true【820636074372850†L741-L748】 | (File da recuperare) | Uccello che disperde semi e impollina durante l’aurora; dotato di ali plananti. |
| **Thaw Rot** (`thaw-rot`) | Minaccia microbica【820636074372850†L815-L823】 | cryosteppe | threat = true【820636074372850†L825-L831】 | (File da recuperare) | Marciume che cresce dopo il disgelo; colonizza detriti e carcasse. |
| **Evento: Brina Tempestosa** (`evento-brinastorm`) | Evento ecologico【881005064092343†L1-L14】 | mezzanotte_orbitale (parte del meta-bioma cryosteppe)【881005064092343†L1-L4】 | event = true【881005064092343†L9-L15】 | **Suggeriti:** cuticole_cerose, grassi_termici, pelli_cave, pigmenti_aurorali, proteine_shock_termico, reti_capillari_radici【881005064092343†L52-L58】 | Evento di tempesta di ghiaccio; simile a un whiteout ionico. |

## 5 Specie incomplete, storiche o incoming

Il repository contiene anche migliaia di creature del *Pathfinder Bestiary* (cartella `incoming/pathfinder`) e dati di prototipazione non ancora integrati. Queste specie non sono formalmente codificate negli ecosistemi ma possono servire come riferimento per nuovi archetipi. Ad esempio, il file CSV `incoming/pathfinder/bestiary1e_index.csv` elenca oltre 1 200 creature con tipi, sottotipi, ambienti e capacità speciali.  Per integrarle occorrerebbe:

1. Identificare quali archetipi del foodweb sono scoperti dai dati attuali (e.g., erbivori volanti, predatori anfibi).  L’analisi del manifest mostra che mancano specie che coprano ruoli come **erbivoro volante**, **predatore acquatico** e **simbionte miceliale**.
2. Selezionare alcune creature del bestiario che corrispondano a tali ruoli e adattarle alla cosmologia Evo‑Tactics (ad esempio, un *Aboleth* come patogeno acquatico, un *Ankheg* come scavatrice, ecc.).
3. Creare schede YAML di prova seguendo i canoni del repository (ID, display_name, biomi, ruolo trofico, morphotype, flags, tratti suggeriti/opzionali, parametri VC, ecc.).

## 6 Osservazioni generali

- **Copertura dei tratti**: molte specie condividono gli stessi tratti, come i tessuti di protezione termica (`cuticole_cerose`, `grassi_termici`, `pelli_cave`) o i sensori (`echolocate`, `occhi_infrarosso_composti`).  È consigliabile consolidare questi tratti generici in moduli parametrizzati e verificare se esistono tratti mancanti per ruoli ancora scoperti (per esempio, tratti per la respirazione anfibia o per la produzione di sostanze nutritive).
- **Specie mancanti**: secondo le guide del foodweb, mancano archetipi come il **predatore acquatico**, il **detritivoro volante**, il **simbionte miceliale** e l’**erbivoro arboricolo**.  Nuovi tratti e specie proposti nel file `new_traits_proposals.yaml` possono essere usati per colmare queste lacune.
- **Eventi ecologici**: ogni bioma ha almeno un evento (Tempesta Ferrosa, Seme d’Uragano, Ondata Termica, Brina Tempestosa).  Sarebbe utile diversificare ulteriormente gli eventi (es. pestilenze, eruzioni, migrazioni di massa) per arricchire le dinamiche ecologiche.

## 7 Prossimi passi per la revisione

1. **Recuperare e analizzare i file YAML mancanti** per specie non ancora esaminate (e.g., `rust-scavenger.yaml`, `sand-burrower.yaml`, `cactus-weaver.yaml`, `noctule-termico.yaml`, `silica-bloom.yaml`, `aurora-gull.yaml`, `cryo-lynx.yaml`, `steppe-bison-mini.yaml`, `thaw-rot.yaml`).  Applicare lo script `species_summary_script.py` per generare un CSV completo.
2. **Unificare i tratti ripetitivi** come già proposto nel documento `trait_merge_proposals.md` e aggiornare le specie affinché utilizzino le versioni consolidate.
3. **Definire nuove specie** per coprire gli archetipi mancanti del foodweb, utilizzando le proposte in `new_traits_proposals.yaml` e ispirandosi al bestiario *Pathfinder*.
4. **Integrare il pacchetto completo** nel repository e aggiornare i manifest per riflettere le nuove specie e i tratti corretti.

---
