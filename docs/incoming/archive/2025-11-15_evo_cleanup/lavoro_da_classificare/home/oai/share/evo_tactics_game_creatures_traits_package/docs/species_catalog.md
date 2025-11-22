# Catalogo delle specie Evo‑Tactics

Questo documento fornisce un riepilogo delle specie presenti nel progetto **Evo‑Tactics**, suddivise per bioma.  Ogni scheda elenca il nome della specie (con ID YAML), il bioma di appartenenza, il ruolo trofico, le flag principali e una breve descrizione basata sui file YAML e sui documenti del repository.

## Bioma: Badlands

| ID / Nome | Ruolo trofico | Flag | Descrizione sintetica |
| --- | --- | --- | --- |
| **dune-stalker** – *Dune Stalker* | Predatore terziario apex【868398707807469†L10-L17】 | `apex=true`【868398707807469†L14-L23】 | Creatura notturna dotata di artigli multiuso e tessuti elastici; caccia lungo la dorsale termale e funge da predatore apicale. |
| **echo-wing** – *Echo Wing* | Dispersore ponte【523858839563614†L10-L14】 | `bridge=true`, `playable_unit=true`【523858839563614†L15-L23】 | Uccello planatore che impollina e disperde semi; possiede ecolocalizzazione e visione infrarosso e può essere giocato come unità. |
| **ferrocolonia-magnetotattica** – *Ferrocolonia Magnetotattica* | Predatore / regolatore simbionte【91302017259064†L10-L14】 | `keystone=true`, `sentient=true`, `playable_unit=true`【91302017259064†L15-L24】 | Colonia radicante con funzioni simbionti; produce secrezioni caustiche e manipola il suolo; rappresenta una specie chiave. |
| **nano-rust-bloom** – *Nano Rust Bloom* | Minaccia microbica【820636074372850†L255-L267】 | `threat=true`【820636074372850†L260-L266】 | Microorganismo patogeno che corrode metalli e sopprime gli scavenger. |
| **rust-scavenger** – *Rust Scavenger* | Ingegnere ecosistema【820636074372850†L270-L280】 | `keystone=true`【820636074372850†L280-L287】 | Detritivoro specializzato nella digestione di ruggine e detriti; stabilizza il ciclo dei nutrienti. |
| **sand-burrower** – *Sand Burrower* | Erbivoro primario【820636074372850†L290-L298】 | Nessuna flag speciale | Scavatore che bruca licheni e arbusti; favorisce il trasferimento di energia nella catena alimentare. |
| **evento-tempesta-ferrosa** – *Tempesta Ferrosa* (evento) | Evento ecologico【165276345784449†L10-L44】 | `event=true`【165276345784449†L14-L21】 | Tempesta magnetica che richiede tratti resistenti a sali e ustioni; rappresenta un pericolo stagionale. |

## Bioma: Foresta Temperata

| ID / Nome | Ruolo trofico | Flag | Descrizione sintetica |
| --- | --- | --- | --- |
| **lupus-temperatus** – *Lupo della Foresta* | Predatore terziario apex【591469412116246†L46-L62】 | `apex=true`, `keystone=true` | Predatore sociale che caccia in branchi; i tratti sociali come empatia coordinativa e tattiche di branco ne fanno una specie chiave. |
| **sentinella-radice** – *Sentinella Radice* | Ingegnere ecosistema【372306137428004†L59-L66】 | `keystone=true`, `bridge=true`, `sentient=true`【372306137428004†L59-L66】 | Pianta senziente che sorveglia la rete miceliale; agisce da ponte fra le trame della foresta e possiede capacità di pianificazione. |
| **blight-micotico** – *Blight Micotico* | Minaccia microbica【252894587761822†L51-L59】 | `threat=true`【252894587761822†L51-L59】 | Patogeno fungino che infetta la fauna; sviluppa spore psichiche e secrezioni caustiche. |
| **evento-seme-uragano** – *Seme d’Uragano* (evento) | Evento ecologico【855554203911473†L51-L57】 | `event=true`【855554203911473†L51-L57】 | Uragano di semi che rigenera la foresta ma aumenta il rischio di incidenti; rilascia pelli fitte come equipaggiamento consigliato. |

## Bioma: Deserto Caldo

| ID / Nome | Ruolo trofico | Flag | Descrizione sintetica |
| --- | --- | --- | --- |
| **thermo-raptor** – *Thermo Raptor* | Predatore terziario apex【572820202518723†L1-L10】 | `apex=true`【572820202518723†L9-L16】 | Creatura adattata al calore; usa pigmenti aurorali, cuticole cerose e reti capillari radici per sopravvivere nell’abisso vulcanico. |
| **cactus-weaver** – *Cactus Weaver* | Ingegnere ecosistema【820636074372850†L538-L549】 | `keystone=true`【820636074372850†L550-L558】 | Costruttore che intreccia cactus per creare ripari e magazzini d’acqua; considerato specie chiave. |
| **noctule-termico** – *Noctule Termico* | Dispersore ponte【820636074372850†L581-L591】 | `bridge=true`【820636074372850†L592-L599】 | Pipistrello che impollina e disperde polline notturno; probabilmente usa sonar e tratti termici. |
| **silica-bloom** – *Silica Bloom* | Minaccia microbica【820636074372850†L603-L615】 | `threat=true`【820636074372850†L612-L618】 | Microrganismo che secerne acidi silicati; può formare colonie su rocce e carcasse. |
| **evento-ondata-termica** – *Ondata Termica Ionica* (evento) | Evento ecologico【820636074372850†L561-L579】 | `event=true`【820636074372850†L571-L576】 | Ondata di calore e particelle ioniche che richiede protezioni anti‑calore; rappresenta un evento climatico estremo. |

## Bioma: Cryosteppe

| ID / Nome | Ruolo trofico | Flag | Descrizione sintetica |
| --- | --- | --- | --- |
| **cryo-lynx** – *Cryo Lynx* | Predatore terziario apex【820636074372850†L752-L760】 | `apex=true`【820636074372850†L762-L769】 | Felino adattato ai climi glaciali; probabilmente possiede mimetismo e resistenza al freddo. |
| **steppe-bison-mini** – *Bisonte Nano della Steppa* | Ingegnere ecosistema / preda【820636074372850†L793-L804】 | `keystone=true`【820636074372850†L804-L810】 | Megaerbivoro ridotto che compatta il terreno e distribuisce nutrienti; importante per la stabilità della steppa. |
| **aurora-gull** – *Gabbiano d’Aurora* | Dispersore ponte【820636074372850†L731-L740】 | `bridge=true`【820636074372850†L741-L748】 | Uccello planatore che disperde semi durante l’aurora boreale; funge da ponte tra biomi artici e temperati. |
| **thaw-rot** – *Thaw Rot* | Minaccia microbica【820636074372850†L815-L823】 | `threat=true`【820636074372850†L825-L831】 | Marciume che cresce su detriti e carcasse dopo il disgelo; riduce la salute del suolo. |
| **evento-brinastorm** – *Brina Tempestosa* (evento) | Evento ecologico【881005064092343†L1-L14】 | `event=true`【881005064092343†L9-L15】 | Tempesta di ghiaccio che scende dalla mezzanotte orbitale; richiede tratti termici per sopravvivere【881005064092343†L52-L58】. |

## Specie incomplete, storiche o incoming

Oltre alle specie citate sopra, il repository contiene un enorme bestiario esterno (`incoming/pathfinder/bestiary1e_index.csv`) che elenca oltre 1 200 creature con tipi, sottotipi, ambienti e challenge rating.  Queste creature non sono ancora integrate negli ecosistemi di Evo‑Tactics ma possono servire come fonti di ispirazione per nuovi archetipi (predatori anfibi, simbionti miceliali, erbivori volanti, ecc.).

Per integrare correttamente queste creature, occorre:

1. Selezionare le specie coerenti con la cosmologia di Evo‑Tactics (biomi, ruoli e morphotype) e creare una scheda YAML seguendo il formato standard (ID, `display_name`, `biomes`, `role_trofico`, `flags`, `derived_from_environment` per tratti suggeriti/opzionali).
2. Verificare che i tratti richiesti siano presenti nel glossario; in caso contrario, crearli a partire dalle proposte in `new_traits_proposals.yaml`.
3. Aggiornare il manifest `catalog_data.json` affinché includa le nuove specie nei rispettivi biomi.
