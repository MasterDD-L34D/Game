# Modello dati

Il catalogo dei trait segue lo schema JSON canonico `config/schemas/trait.schema.json`, che definisce campi obbligatori, vincoli e sezioni opzionali modulari. La tabella seguente riassume i blocchi fondamentali richiesti da tutti i trait.

## Campi obbligatori

| Campo | Tipo | Vincoli chiave | Scopo |
| --- | --- | --- | --- |
| `id` | stringa | slug `^[a-z0-9_]+$` | Identificatore univoco e nome file della voce.【F:config/schemas/trait.schema.json†L8-L25】 |
| `label` | stringa | riferimento `i18n:` o stringa ripulita | Nome localizzato mostrato in UI e report.【F:config/schemas/trait.schema.json†L26-L29】 |
| `famiglia_tipologia` | stringa | formato `<Macro>/<Sotto>` | Cluster funzionale di appartenenza.【F:config/schemas/trait.schema.json†L30-L35】 |
| `fattore_mantenimento_energetico` | stringa | `i18n:` o stringa ripulita | Costo narrativo/energetico del tratto.【F:config/schemas/trait.schema.json†L36-L39】 |
| `tier` | stringa | `T1`–`T6` | Gradino di progressione e gating di accesso.【F:config/schemas/trait.schema.json†L40-L44】 |
| `slot` | array[string] | lettere maiuscole uniche | Slot occupati, può essere vuoto.【F:config/schemas/trait.schema.json†L45-L52】 |
| `sinergie` | array[string] | slug normalizzati | Lista di trait compatibili.【F:config/schemas/trait.schema.json†L56-L63】 |
| `conflitti` | array[string] | slug normalizzati | Lista di trait incompatibili.【F:config/schemas/trait.schema.json†L64-L71】 |
| `mutazione_indotta` | stringa | `i18n:` o stringa ripulita | Descrizione sintetica dell'adattamento.【F:config/schemas/trait.schema.json†L87-L90】 |
| `uso_funzione` | stringa | `i18n:` o stringa ripulita | Funzione principale in gioco.【F:config/schemas/trait.schema.json†L91-L94】 |
| `spinta_selettiva` | stringa | `i18n:` o stringa ripulita | Motivazione evolutiva/tattica.【F:config/schemas/trait.schema.json†L95-L98】 |

## Moduli opzionali

Lo schema consente blocchi aggiuntivi che arricchiscono le descrizioni e collegano i trait ad altri dataset. I più rilevanti sono:

- **Profilo slot** (`slot_profile`), per descrivere specializzazioni core/complementari.【F:config/schemas/trait.schema.json†L53-L55】【F:config/schemas/trait.schema.json†L337-L348】
- **Requisiti ambientali** (`requisiti_ambientali`), con condizioni di bioma, fonti e metadati di espansione.【F:config/schemas/trait.schema.json†L80-L85】【F:config/schemas/trait.schema.json†L350-L391】
- **Tag tattici** (`usage_tags`) e **origine dati** (`data_origin`), fondamentali per filtri, audit e tracciamento delle fonti editoriali.【F:config/schemas/trait.schema.json†L113-L124】
- **Flag di completezza** (`completion_flags`) per monitorare copertura biomi/specie e altre check editoriali.【F:config/schemas/trait.schema.json†L125-L143】
- **Affinità specie** (`species_affinity`) e sinergie PI per integrazione con le matrici di specie e pianificazione pacchetti.【F:config/schemas/trait.schema.json†L99-L112】【F:config/schemas/trait.schema.json†L393-L400】
- **Metriche quantitative**, costi energetici e campi di versioning che supportano strumenti analitici e tracciamento storico.【F:config/schemas/trait.schema.json†L161-L282】

## Slot, tier, sinergie e conflitti

Il catalogo attuale include 174 trait nel file `data/traits/index.json`. La distribuzione dei tier è concentrata sui gradini iniziali: 151 trait T1, 17 T2 e 6 T3, a indicare che il manuale deve coprire soprattutto scenari di onboarding e mid-game.【661b50†L14-L15】【ead201†L1-L13】

Gli slot sono spesso multipli: molte voci occupano combinazioni `A`/`B`/`C`, mentre i tratti jolly mantengono lo slot vuoto (es. `ali_fulminee`).【533d62†L1-L12】【F:data/traits/index.json†L5-L34】 Tutti i trait elencano sinergie reciproche (solo 6 non le usano) e definiscono conflitti espliciti dove necessario; la quasi totalità possiede almeno una sinergia per supportare la costruzione di combo e pacchetti.【c14400†L1-L12】

## Usage tags e spinta tattica

I tag d'uso forniscono una tassonomia tattica condivisa con telemetria e UI. I più frequenti sono `support` (70 trait), `scout` e `tank` (47 ciascuno), seguiti da `sustain`, `breaker` e `controller`. Queste etichette sono richieste dalle checklist di processo e alimentano filtri automatici nelle dashboard.【4d514f†L1-L7】【F:docs/process/trait_data_reference.md†L17-L71】

## Flag di completezza

Tutte le voci hanno flag di completezza compilati; in particolare `has_species_link`, `has_usage_tags` e `has_data_origin` sono impostati a `true` per il 100% del catalogo, mentre `has_biome` evidenzia ancora 11 trait senza associazione ambientale specifica.【dd62fe†L19-L21】 Questo consente di isolare rapidamente le lacune durante gli audit o quando si pianificano nuove espansioni ambientali.

## Esempio aggregato

Il tratto `ali_fulminee` mostra una voce completa con origine dati, sinergie, requisiti ambientali e note di espansione, fungendo da riferimento per le compilazioni sensorali.【F:data/traits/index.json†L5-L35】 Utilizzare esempi reali dal catalogo aiuta a mantenere coerenza con i pattern approvati e facilita l'onboarding dei nuovi autori.
