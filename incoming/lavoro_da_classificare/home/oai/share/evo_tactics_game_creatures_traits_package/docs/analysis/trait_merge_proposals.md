# Proposte di unificazione e revisione dei tratti

Questo documento propone la fusione di tratti che svolgono funzioni quasi identiche ma sono attualmente duplicati nel glossario.  L'obiettivo è ridurre la ridondanza e semplificare la manutenzione, mantenendo la varietà ambientale come parametro della stessa base di tratto (ad es. tramite attributi secondari o varianti).  Per ogni serie si suggerisce un nome generico e si elencano le varianti che dovrebbero diventare parametri, oltre alle motivazioni della scelta.

## Antenne

**Tratti interessati:** tutte le voci che iniziano con `antenne_` (es. `antenne_plasmatiche_tempesta`, `antenne_microonde_cavernose`, `antenne_flusso_mareale`, `antenne_tesla`, `antenne_waveguide`).  Questi tratti rappresentano antenne sensoriali adattate a vari biomi.  Le descrizioni sono quasi identiche e differiscono solo per l’ambiente【248646306596590†L338-L342】.

**Proposta di fusione:** introdurre un tratto unico `antenne_sinaptiche` con varianti di ambiente come attributo (`ambiente: tempesta`, `caverne`, `maree`, ecc.).  Le antenne mantengono la funzione di captare segnali e onde, mentre l'ambiente determina la resistenza specifica.

**Motivazione:** semplifica il catalogo e permette di espandere a nuovi biomi senza creare nuove entry.

## Artigli

**Tratti interessati:** `artigli_sette_vie`, `artigli_induzione`, `artigli_radice`, `artigli_vetrificati` e altri.  Ogni voce descrive artigli adattati a foreste acide, canopie ioniche, mangrovieti, ecc.【248646306596590†L392-L404】.

**Proposta di fusione:** creare un tratto base `artigli_adattativi` con parametri per tipo di terreno (radici, induzione, vetrificati, ecc.) e per numero di dita/ramificazioni.  L'effetto di potenza, ferimento o arrampicata varia con i parametri.

## Branchie

**Tratti interessati:** `branchie_osmotiche_salmastra`, `branchie_dual_mode`, `branchie_eoliche`, `branchie_solfatiche`, `branchie_turbina`, ecc.  Tutte permettono al portatore di respirare in condizioni speciali (acqua salmastra, aria rarefatta, gas sulfurei)【248646306596590†L25-L30】【248646306596590†L488-L498】.

**Proposta di fusione:** sostituire tutte le varianti con un tratto `branchie_specializzate` che accetta parametri di ambiente (salmastra, aeriforme, solfureo) e modalità (turbina, dual mode, eolica).  L’effetto rimane la capacità di respirare in ambienti diversi.

## Cartilagini, Lamelle e Laminae

**Tratti interessati:** serie come `cartilagini_desertiche`, `cartilagini_flessoacustiche`, `lamelle_termoforetiche`, `lamelle_sincroniche` e `lamine_filtranti_aeree`.  Sono tutte varianti di tessuti flessibili o lamellari che filtrano o dissipano energia【248646306596590†L559-L563】.

**Proposta di fusione:** unire in un unico tratto `tessuti_lamellari` con parametri su funzione (filtrante, termoforetica, acustica) e ambiente (desertico, aereo, subacqueo).  Le varianti diventano modificatori che determinano il tipo di filtraggio o di dissipazione.

## Code

**Tratti interessati:** `coda_contrappeso`, `coda_coppia_retroattiva`, `coda_stabilizzatrice_vortex` e simili【248646306596590†L638-L666】.

**Proposta di fusione:** introdurre un tratto generico `coda_stabilizzatrice` con parametri per tipo di controllo (contrappeso, coppia retroattiva, vortex) e ambiente (volo, corsa, nuoto).  Le varianti descrivono diversi tipi di movimento ma l’effetto principale è la stabilizzazione.

## Ghiandole

**Tratti interessati:** numerose voci come `ghiandole_condensa_ozono`, `ghiandole_eco_mappanti`, `ghiandole_minerali`, `ghiandole_nebbia_acida`, `ghiandole_ventosa`【248646306596590†L842-L912】.

**Proposta di fusione:** creare un tratto base `ghiandole_secretorie` con parametri su sostanza secreta (condensa ozono, nebbia acida, minerali, ventosa) e su funzione (difesa, comunicazione, mappatura).  Se necessario, alcuni tipi di secrezione particolarmente distintivi possono rimanere separati, ma la maggior parte può essere unificata.

## Standardizzazione delle nomenclature

* Evitare nomi descrittivi o colloquiali nei campi `label_it`/`label_en`.  Ad esempio, `nucleo_ovomotore_rotante` contiene una descrizione umoristica【248646306596590†L151-L156】; andrebbe rinominato a “nucleo_cinetico_ovoidale” con una descrizione separata.
* Sostituire `random` e `pathfinder` con nomi coerenti (es. `slot_casuale` e `rilevatore_percorso`) e completare traduzioni mancanti.【248646306596590†L169-L174】
* Correggere refusi come “sghiaccio” -> “ghiaccio”, “sonci” -> “sonici”, e riformulare descrizioni troppo lunghe【248646306596590†L289-L294】.

La fusione di questi gruppi non comporta la perdita di varietà: le varianti diventano parametri o sottotipi del tratto, riducendo il numero di entry e mantenendo la flessibilità necessaria per la generazione procedurale.