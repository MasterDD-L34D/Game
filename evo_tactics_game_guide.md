# Evo Tactics – Guida completa per il Game Repository (v2.1)

## Scopo e contesto

Questa guida raccoglie in un unico documento tutte le informazioni che in precedenza erano distribuite nei pacchetti Evo Tactics. È pensata per il **repository `MasterDD-L34D/Game`**, dove funge da riferimento completo per sviluppatori e manutentori. Il documento sostituisce l’esigenza di scaricare e integrare i pacchetti `.zip`: include le specifiche standard per specie e tratti, le regole di naming, la procedura di migrazione alla versione canonica 2.1, la descrizione di tutte le specie e dei loro tratti, l’elenco degli ecotipi, il funzionamento del catalogo master e le istruzioni operative per l’uso del pacchetto.

## Struttura e regole (sintesi)

### Specifiche v2.1 per specie e tratti

Le schede **Specie** e **Tratti** seguono il JSON Schema Draft 2020‑12. Ogni specie è descritta da: `scientific_name` (binomiale in corsivo), uno o due `common_names` evocativi, `classification` con macro‑classe e habitat, `functional_signature` (1–2 frasi che riassumono cosa fa meglio la creatura), `visual_description` (5–8 righe su morfologia e posture), `risk_profile`, `interactions`, `constraints`, `sentience_index` (scala [T0–T5](docs/README_SENTIENCE.md)), `ecotypes` (etichette delle varianti locali) e `trait_refs` (codici dei tratti associati). Ogni specie deve possedere tra 5 e 9 tratti che coprano tutti gli assi funzionali (locomozione/manipolazione, alimentazione/digestione, sensi, attacco/difesa, metabolismo/termoregolazione, riproduzione/ciclo vitale).

I **Tratti** sono definizioni atomiche riutilizzabili e agnostiche rispetto alle specie (lo schema canonico rimuove i campi `species_*`). Ogni tratto include un `trait_code` univoco (`TR-0001…`), un `label` formato da sostantivo + qualificatore, `famiglia_tipologia` (Macro/Subcluster), `fattore_mantenimento_energetico` (Basso/Medio/Alto), `tier` da T1 a T6, sinergie e conflitti (liste di codici), `metrics` con valori e unità UCUM, `cost_profile`, `trigger`, `limits`, `testability` (observable + scene_prompt), `applicability.envo_terms` con URI ENVO, `version` SemVer, `versioning` con date ISO, e opzionali note, output_effects o requisiti ambientali.

### Naming e stile

Per le specie: utilizzare un binomiale (_Genus species_) con radici greco‑latine coerenti con la firma funzionale e un nome volgare evocativo (es. “Viverna‑Elastico”). Le abbreviazioni specie sono ottenute concatenando le prime tre lettere del Genus e le prime due della specie (es. _Elastovaranus hydrus_ → EHY).

Per i tratti: adottare denominazioni in **Title Case** composte da sostantivo e qualificatore (“Rostro Emostatico‑Litico”, “Coda Prensile Muscolare”, “Scudo Gluteale Cheratinizzato”). La funzione primaria è espressa come verbo + oggetto (“inoculare tossine”, “rilevare vibrazioni”) e deve essere testabile. Nelle descrizioni funzionali includere range realistici con unità UCUM; evitare lirismi.

### Migrazione e convergenza

Il passaggio ai tratti species‑agnostici comporta la rimozione di riferimenti alla specie nei singoli file trait: il binding avviene tramite `trait_refs` nei file delle specie e nel catalogo master. È necessario normalizzare le unità metriche (UCUM), mappare i campi legacy (`level`→`tier`, `compatibility`→`sinergie`/`conflitti`), introdurre il versioning SemVer e, per i tratti sociali/cognitivi, specificare la `sentience_applicability` secondo la Sentience Track T1–T6.

Il catalogo master (`catalog/master.json`) aggrega tutte le specie e i tratti in un unico oggetto JSON, con statistiche e indici. Gli ecotipi sono descritti in file separati nella cartella `ecotypes/`: ogni specie elenca solo le etichette delle varianti locali mentre i dettagli dei delta metrici sono nel file `<genus_species>_ecotypes.json`.

### Sentience Track e gating

La **Sentience Track** definisce il livello di consapevolezza cognitiva su una scala da T1 a T6. Alcuni tratti (comunicazione, pianificazione, empatia) richiedono un livello minimo di senzienza per essere sbloccati. I tratti devono indicare in `sentience_applicability` il livello minimo necessario. I gate di sentienza sono definiti in `sentience_track.json` e gestiti nel catalogo master.

## Descrizione delle specie e dei tratti (panoramica)

Il pacchetto definisce dieci specie principali (Viverna‑Elastico, Ghiotton‑Scudo, Zannapiedi, Megattera Terrestre, Aracnide Alchemico, Mutaforma Cellulare, Libellula Sonica, Anguilla Geomagnetica, Uccello Ombra, Camoscio Psionico), ciascuna con 5 tratti essenziali o funzionali. La guida completa contiene una sezione dedicata a ogni specie con una descrizione sintetica dell’habitat, della firma funzionale, dell’aspetto e dell’elenco dei tratti. Per ciascun tratto sono riportati struttura morfologica e funzione primaria (vedi file associato `evo_tactics_guide.md` per i dettagli completi).

## Ecotipi

Ogni specie può manifestare varianti ecologiche (ecotipi) che modificano i valori di alcune metriche dei tratti per adattarsi a biomi differenti. Gli ecotipi sono elencati nel campo `ecotypes` delle specie e descritti nel file `ecotypes/<genus_species>_ecotypes.json`. Ad esempio, _Elastovaranus hydrus_ ha ecotipi “Gole Ventose” e “Letti Fluviali”, mentre _Gulogluteus scutiger_ include “Chioma Umida” e “Forre Umide”.

## Integrazione nel repository `Game`

Per integrare questa guida nel repo `MasterDD-L34D/Game` si consiglia di:

1. **Creare il file** `docs/evo-tactics-pack/full-guide.md` (o un nome simile) e inserirvi il contenuto di questo documento. Questo file fungerà da guida monolitica per chi utilizza il pacchetto e sostituirà la necessità di scaricare lo zip.
2. **Aggiornare il `README.md`** in `docs/evo-tactics-pack` per includere un riferimento esplicito alla guida completa, indicando che il pacchetto statico può essere ricostruito o consultato via doc. Specificare che la guida descrive la procedura di override, la struttura del catalogo master e i passaggi per rigenerare il pack (es. esecuzione di `scripts/update_evo_pack_catalog.js`).
3. **Verificare la coerenza** tra `db-schema.md` e la presente guida: se le strutture della base dati (tabella specie, tratti, ecotipi) differiscono dalle specifiche, pianificare una migrazione per allineare i campi (ad esempio aggiungendo `sentience_index` o normalizzando `trait_refs`). Per il campo di senzienza, fare riferimento alla [scala T0–T5](docs/README_SENTIENCE.md) condivisa.
4. **Documentare gli script**: se sono presenti script come `build_evo_tactics_pack_dist.mjs` o `update_evo_pack_catalog.js`, integrare brevi descrizioni nel corpo della guida o nel `deploy.md`, indicando come rigenerano il pack a partire dalla SSoT. Accertarsi che la guida includa note su come impostare le variabili d’ambiente (`EVO_PACK_ROOT`, `EVO_PACK_REMOTE`, ecc.).

## Conclusione e prossimi passi

Questa guida funge da single‑source‑of‑truth per sviluppatori, designer e narrative designer all’interno del repository `Game`. Integrandola nella cartella `docs/` e mantenendola aggiornata, si garantisce che chiunque possa consultare facilmente le specifiche del mondo Evo Tactics, contribuire con nuove specie o tratti, eseguire migrazioni e comprendere la logica dei generatori e delle build. Per una comprensione completa, consultare anche la **Guida completa ai Trait** (`traits_reference.md`), il **Manuale autore di trait** (`README_HOWTO_AUTHOR_TRAIT.md`), la **Guida alla Track di Senzienza** e le note sui **Neuroni/Ancestors** una volta disponibili.
