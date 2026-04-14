---
title: Catalogo dei tratti Evo‑Tactics
doc_status: draft
doc_owner: incoming-archivist
workstream: incoming
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 14
---
# Catalogo dei tratti Evo‑Tactics

Questo documento offre una panoramica del **glossario dei tratti** utilizzato nel progetto Evo‑Tactics, evidenziandone le principali categorie, le ridondanze individuate e le proposte di miglioramento.  I tratti rappresentano abilità, organi, tessuti o capacità che possono essere assegnati alle Forme e alle specie durante le missioni o tramite la meccanica Tri‑Sorgente.  Sono organizzati in tier (T1, T2, T3) in base alla potenza e disponibili per certe famiglie di job e ruoli trofici.

## Categorie e serie di tratti

Molti tratti del glossario appartengono a **serie** che seguono uno schema comune: un prefisso indica il tipo di organo/struttura e il suffisso specifica l’ambiente o la funzione.  Di seguito sono riportate le serie principali con alcuni esempi:

| Serie | Esempi | Funzione |
| --- | --- | --- |
| **Antenne** | `antenne_plasmatiche_tempesta`, `antenne_microonde_cavernose`, `antenne_flusso_mareale` | Recettori sensoriali che interpretano segnali elettrici o chimici; variano per bioma (tempeste, caverne, maree)【248646306596590†L338-L342】. |
| **Artigli** | `artigli_sette_vie`, `artigli_induzione`, `artigli_radice` | Strumenti di attacco o scavo; differiscono per materiale e terreno【248646306596590†L392-L404】. |
| **Branchie** | `branchie_osmotiche_salmastra`, `branchie_dual_mode`, `branchie_eoliche` | Organi respiratori che si adattano a acqua salmastra, aria o vento【248646306596590†L25-L30】【248646306596590†L488-L498】. |
| **Cartilagini/Lamelle/Laminae** | `cartilagini_desertiche`, `lamelle_termoforetiche`, `lamine_filtranti_aeree` | Tessuti di supporto o filtranti; permettono di dissipare calore o filtrare sostanze【248646306596590†L559-L563】. |
| **Code** | `coda_contrappeso`, `coda_coppia_retroattiva`, `coda_stabilizzatrice_vortex` | Organi di equilibrio; conferiscono stabilità su diversi terreni【248646306596590†L638-L666】. |
| **Ghiandole** | `ghiandole_condensa_ozono`, `ghiandole_eco_mappanti`, `ghiandole_nebbia_acida` | Secrezioni che rilasciano sostanze (vapore, feromoni, acidi); variano per bioma【248646306596590†L842-L912】. |
| **Tessuti lamellari** | `lamelle_sincroniche`, `lamelle_singhiozzate` | Lamelle per vibrare, filtrare o scaldare; spesso presenti nelle specie acquatiche o aeree. |

Le serie sopra non sono errori: rappresentano varianti ambientali dello stesso concetto.  Tuttavia, la presenza di dozzine di varianti con descrizioni quasi identiche complica il bilanciamento.  Per questo nel documento `trait_merge_proposals.md` si propone di **unificare le serie** in tratti base parametrizzati (es. `antenne_sinaptiche`, `artigli_adattativi`, `branchie_specializzate`, `tessuti_lamellari`) e di indicare il bioma o la funzione attraverso parametri.

## Tratti con anomalie o placeholder

L’analisi automatica e manuale ha evidenziato diversi tratti con problemi di naming o descrizione:

| Trait ID | Problema | Suggerimento |
| --- | --- | --- |
| **nucleo_ovomotore_rotante** | `label_it` contiene una frase colloquiale (“Uovo rotaia...”), poco coerente con lo stile【248646306596590†L151-L156】. | Rinominare con un termine sintetico (es. `nucleo_rotante`) e spostare la spiegazione nella descrizione. |
| **ventriglio_gastroliti** | Descrizione italiana usa “denti sonci”, un refuso【248646306596590†L289-L294】. | Correggere in “denti sonici” o usare un termine tecnico. |
| **sonno_emisferico_alternato** | `label_it` è una frase intera (“Dormire con metà cervello...”); non un nome sintetico【248646306596590†L254-L258】. | Usare “sonno_emisferico” come nome e spostare la spiegazione nella descrizione. |
| **sangue_piroforico** | `label_it` descrive l’effetto; manca un nome sintetico【248646306596590†L223-L228】. | Proporre un nome (“sangue_incendiario”) e descrivere l’accensione nella descrizione. |
| **random**, **pathfinder** | Tratti con nome inglese generico senza traduzione【248646306596590†L169-L174】. | Sostituire con “slot_casuale” e “esploratore” o termini più specifici. |
| **criostasi_adattiva** | `label_it` incompleto rispetto all’inglese (“Adaptive Cryostasis”)【248646306596590†L79-L84】. | Ampliare in “criostasi_adattiva”. |
| **artigli_sghiaccio_glaciale** | Refuso “sghiaccio” al posto di “ghiaccio”. | Correggere in `artigli_ghiaccio_glaciale`. |

Correggere queste anomalie migliorerà la coerenza e la professionalità del glossario.

## Nuovi tratti proposti

Per colmare le lacune identificate negli archetipi del foodweb (ad esempio predatori acquatici, erbivori volanti, simbionti miceliali, detritivori arboricoli), sono stati proposti nuovi tratti nel file `new_traits_proposals.yaml`.  Alcuni esempi:

* **olfatto_ipersensibile** – consente di fiutare prede o pericoli a grande distanza.
* **mandibola_falce** – mascella armata di lame ricurve per tagliare carapaci e radici.
* **adrenalina_sovraccarico** – secrezione che aumenta temporaneamente forza e velocità.
* **radici_simbionti** – connessioni mutualistiche con funghi o piante che forniscono nutrienti.
* **ali_membranose** – ali per planare a lungo raggio, utili ai dispersori volanti.
* **stomaco_acido_estremo** – capacità di dissolvere materiali duri; adatta ai detritivori.
* **antenne_termiche** – recettori di temperatura che permettono di individuare fonti di calore.

Questi tratti ampliano la varietà delle abilità disponibili e consentono di progettare nuove specie che riempiono i ruoli ecologici non ancora coperti.

## Raccomandazioni per la revisione

1. **Parametrizzare le serie**: introdurre versioni base dei tratti serie (antenne, artigli, branchie, cartilagini, ghiandole, code) con campi YAML che definiscono il bioma o la funzione.  Questo semplifica l’equilibrio e riduce le duplicazioni.
2. **Correggere i nomi problematici**: applicare le correzioni suggerite per i tratti con anomalie o segnaposto; aggiornare la traduzione inglese e italiana per uniformità.
3. **Aggiornare le specie**: assicurarsi che le specie utilizzino i tratti consolidati.  Per esempio, sostituire `artigli_sette_vie` e `artigli_induzione` con `artigli_adattativi` nel file YAML della specie.
4. **Integrare i nuovi tratti**: selezionare, tra le proposte, quelli che completano gli archetipi mancanti (erbivori volanti, predatori acquatici, simbionti miceliali) e includerli nel glossario e nelle specie di nuova introduzione.
