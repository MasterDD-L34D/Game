# Tassonomia e famiglie funzionali

Il catalogo 2.0 censisce 57 famiglie funzionali (`famiglia_tipologia`), derivate dal campo `<Macro>/<Sotto>` definito nello schema. Le macro più rappresentate sono Tegumentario/Difensivo, Strategico/Tattico, Sensoriale/Analitico, Locomotorio/Mobilità e Digestivo/Metabolico: ciascuna supera la dozzina di trait e determina i principali cluster di bilanciamento.【4c8626†L24-L33】

## Panoramica delle famiglie principali

| Famiglia (Macro/Sub) | Conteggio trait | Trait di riferimento | Descrizione sintetica |
| --- | --- | --- | --- |
| Tegumentario/Difensivo | 17 | `armatura_pietra_planare` | Cristallizza il dermascheletro con runiche difensive, ottimizzato per scenari planari ad alta pressione.【4c8626†L24-L33】【F:data/traits/index.json†L858-L889】 |
| Strategico/Tattico | 15 | `pathfinder` | Specializzazioni di coordinamento e controllo mappe multi-bioma (vedi tabella esempi nel template).【4c8626†L24-L33】【F:docs/traits_template.md†L159-L175】 |
| Sensoriale/Analitico | 14 | `ali_fulminee` | Amplifica percezioni multispettrali per scouting in stratosfera tempestosa.【4c8626†L24-L33】【F:data/traits/index.json†L5-L35】 |
| Locomotorio/Mobilità | 14 | `zampe_a_molla` | Abilita dash esplosivi per ingaggio o disimpegno rapido nelle missioni verticali.【4c8626†L24-L33】【F:docs/traits_template.md†L165-L177】 |
| Supporto/Logistico | 13 | `antenne_eco_turbina` | Intreccia canali cooperativi per distribuire risorse e modulazioni ritmiche condivise.【4c8626†L24-L33】【F:data/traits/index.json†L246-L288】 |
| Offensivo/Assalto | 13 | `antenne_flusso_mareale` | Aumenta burst e penetrazione durante finestre di vulnerabilità controllate.【4c8626†L24-L33】【F:docs/traits_template.md†L165-L178】 |
| Simbiotico/Cooperativo | 13 | `antenne_reagenti` | Stabilizza reti simbiotiche ed enzimo-transfer condivisi per supporto di lungo periodo.【4c8626†L24-L33】【F:docs/traits_template.md†L165-L182】 |

> **Suggerimento:** il report `reports/trait_fields_by_type.json` (rigenerabile con `python tools/py/collect_trait_fields.py`) espone per ogni famiglia l'elenco dei campi attivi, utile per verificare quando nuove proprietà vengono introdotte in un solo cluster.【F:docs/traits_template.md†L118-L157】

## Famiglie rare e specializzate

Alcune famiglie hanno un numero limitato di trait, spesso dedicati a pacchetti narrativi specifici (es. Sensoriale/Nervoso con 2 voci). Questi casi richiedono maggiore attenzione per mantenere sinergie e conflitti reciproci allineati quando si aggiungono nuove abilità.

Utilizzare la tassonomia come guida permette di bilanciare le pipeline di design: nuove proposte dovrebbero mantenere proporzioni simili fra macro-tipologie o colmare lacune identificate nei report di coverage, documentati nella sezione finale del manuale.
