---
title: Allineamento tratti PI ↔ Regole ambientali
doc_status: generated
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-14
source_of_truth: false
language: it-en
review_cycle_days: 14
---
# Allineamento tratti PI ↔ Regole ambientali

## Sintesi dati
- **Tratti PI rilevati**: 8 identificatori (`T1`) usati nei pacchetti Forma (`empatia_coordinativa`, `focus_frazionato`, `ghiandola_caustica`, `pathfinder`, `pianificatore`, `random`, `risonanza_di_branco`, `tattiche_di_branco`, `zampe_a_molla`).【F:data/derived/analysis/trait_env_mapping.json†L560-L573】
- **Regole ambientali catalogate**: 210 tratti con suggerimenti ambientali dedicati (nessuna sovrapposizione diretta con i tratti PI → gap strutturale).【F:data/derived/analysis/trait_env_mapping.json†L2-L551】【F:data/derived/analysis/trait_env_mapping.json†L563-L573】
- **Nuovo schema `trait_reference`**: ogni tratto espone ora `tier`, `slot`, `sinergie_pi` e `requisiti_ambientali`, consentendo di collegare i pacchetti PI ai contesti bioma/hazard laddove disponibili.【F:data/traits/index.json†L1-L36】【F:data/traits/index.json†L493-L530】

## Sovrapposizioni e lacune
| Cluster | Conteggio | Note operative |
| --- | --- | --- |
| Tratti PI con contesti documentati | 8 | Tutti Tier 1 e limitati a slot A/B/C nei pacchetti Forma; nessuna dipendenza ambientale diretta, evidenziando necessità di future regole di adattamento.【F:data/derived/analysis/trait_env_mapping.json†L563-L573】【F:data/derived/analysis/trait_env_mapping.json†L574-L640】 |
| Tratti ambientali senza uso PI | 210 | Coprono biomi estremi, hazard e salinità; i nuovi campi `tier` e `requisiti_ambientali` preservano le condizioni originali ma mostrano gap di sinergia PI.【F:data/derived/analysis/trait_env_mapping.json†L2-L551】【F:data/traits/index.json†L1-L36】 |
| Sovrapposizioni attuali | 0 | Nessun tratto compare in entrambe le liste → occorrono mapping manuali o design di conversione futura.【F:data/derived/analysis/trait_env_mapping.json†L563-L573】 |

## Esempi applicativi per le squadre
### pianificatore + slot C controllato
- Composizioni INTJ/ENTJ/ESTJ sfruttano `pianificatore` nello slot C con `sigillo_forma` e `starter_bioma`, mantenendo budget PE equilibrato e garantendo capienza difensiva tramite `guardia_situazionale` negli slot A/B.【F:data/packs.yaml†L32-L110】
- Le telemetrie raccomandano pick-rate equilibrati fra vanguard (22%) e invoker (16%): il tratto supporta le rotazioni per entrambe le classi nelle finestre mid/late (phase weights 0.40).【F:data/core/telemetry.yaml†L5-L41】
- Nota di design: usare `sinergie_pi.combo_totale` per valutare saturazione del tratto — 6 combinazioni già tracciate, suggerendo di limitarne l’accesso in nuove forme finché i target HUD restano stabili.【F:data/traits/index.json†L493-L517】【F:data/derived/analysis/trait_env_mapping.json†L574-L608】

### Focus Frazionato per doppio ingaggio
- Le forme INFJ/INTP/ENTP aprono slot A/C con `focus_frazionato`, sfruttando co-occorrenze con `cap_pt`, `starter_bioma` e `sigillo_forma` per coprire scenari multi-fronta.【F:data/packs.yaml†L41-L90】
- Telemetria: mantenere coesione ≥0.70 e setup bilanciato (indici `cohesion` e `setup`) riduce tilt e consente l’uso del tratto senza penalità — utile quando il team punta agli obiettivi opzionali (explore 0.45/0.30).【F:data/core/telemetry.yaml†L27-L48】
- Nota di design: associare il tratto a squadre con invoker/artificer sopra i target di pick-rate per bilanciare telemetria e distribuire carico mentale; le sinergie PI segnalano 3 combinazioni già validate.【F:data/traits/index.json†L420-L458】【F:data/derived/analysis/trait_env_mapping.json†L591-L610】

### pathfinder e controllo exploro
- `pathfinder` appare nello slot A degli ENFP con `starter_bioma` e `cap_pt`, fornendo mobilità e scouting precoce per missioni con alti punteggi explore.【F:data/packs.yaml†L81-L85】
- L’indice explore (peso 0.45 per nuove caselle, 0.30 per opzionali) e i target HUD sulle classi di supporto evidenziano l’utilità del tratto per rispettare soglie di rischio/aggro durante missioni multi-bioma.【F:data/core/telemetry.yaml†L27-L41】
- Nota di design: integrare log Forma con link telemetria (es. missione `skydock_siege` con finestre rischio) per estendere mapping ambientale futuro, sfruttando il nuovo campo `requisiti_ambientali` come punto di aggancio.【F:data/core/missions/skydock_siege.yaml†L1-L70】【F:data/traits/index.json†L493-L530】

## Prossimi passi suggeriti
1. Derivare regole ambientali PI→bioma partendo dai tratti con co-occorrenze difensive (`pianificatore`, `risonanza_di_branco`) per ridurre il gap di sovrapposizione (0 → X).
2. Estendere la telemetria Forma includendo trigger automatici quando `sinergie_pi.combo_totale` supera soglie definite, così da alimentare design iterativo.
3. Validare nel companion UI: il tooltip aggiornato mostra `Tier`, `Slot PI`, `Combo PI` e count dei `Requisiti ambientali`, aiutando il team a individuare subito lacune di coverage.
