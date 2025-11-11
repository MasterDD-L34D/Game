# Analisi dei tratti

## Serie ripetitive e pattern comuni
Nel file `data/core/traits/glossary.json` i tratti sono organizzati con **prefisso** che descrive il tipo di organo o struttura (es. *antenne*, *artigli*, *branchie*, *cartilagini*, *coda*, *ghiandole*) seguito da un **suffisso** che indica l’ambiente o la funzione. Questo schema genera numerose varianti simili: ad esempio `antenne_microonde_cavernose`, `antenne_flusso_mareale`, `antenne_tesla` ecc. Le descrizioni sono quasi identiche, cambiando soltanto il bioma di riferimento【248646306596590†L338-L342】. Serie analoghe esistono per **artigli**, **branchie**, **cartilagini/lamelle** e **code**【248646306596590†L25-L30】. Queste ripetizioni non sono errori ma rappresentano un pattern di design; sarebbe comunque utile normalizzare il formato e verificare che le descrizioni non siano ridondanti.

## Tratti con anomalie evidenti
Alcune voci presentano nomi insoliti, descrizioni colloquiali o traduzioni incoerenti. Nella tabella seguente sono riportati i tratti principali da correggere:

| Trait ID | label_it | label_en | Problema | Note |
|---|---|---|---|---|
| **nucleo_ovomotore_rotante** | "Uovo rotaia, uovo grande e uova piccole dentro..." | Rotating Ovomotor Core | Nome italiano colloquiale | Il `label_it` contiene una frase scherzosa, non conforme agli altri nomi【248646306596590†L151-L156】. |
| **ventriglio_gastroliti** | "Denti sonci (ciottoli/sassi), ti nutri di tutto" | Gastrolith Grinding Gizzard | Nome colloquiale con refuso | La descrizione italiana usa un linguaggio informale e il termine "sonci" è probabilmente un refuso【248646306596590†L289-L294】. |
| **sonno_emisferico_alternato** | "Dormire con solo metà cervello alla volta" | Unihemispheric Sleep | Nome descrittivo | Il `label_it` è una frase intera invece di un titolo sintetico【248646306596590†L254-L258】. |
| **sangue_piroforico** | "Sangue che prende fuoco a contatto con l'ossigeno" | Pyrophoric Blood | Nome descrittivo | Il nome italiano descrive l’effetto anziché dare una denominazione chiara【248646306596590†L223-L228】. |
| **random** | Trait Random | Trait Random | Placeholder | Sembra un segnaposto per estrarre tratti casuali【248646306596590†L193-L198】. |
| **pathfinder** | Pathfinder | Pathfinder | Placeholder | Nome generico in inglese, probabilmente un segnaposto per abilità esplorativa【248646306596590†L169-L174】. |
| **criostasi_adattiva** | Criostasi | Adaptive Cryostasis | Traduzione incompleta | L’italiano omette l’aggettivo “adattiva” presente nell’inglese【248646306596590†L79-L84】. |
| **artigli_sghiaccio_glaciale** | Artigli Sghiaccio Glaciale | Artigli Sghiaccio Glaciale | Possibile refuso | L’uso di “sghiaccio” potrebbe essere un errore di battitura per “ghiaccio”. |
| **ali_fulminee** | Ali Fulminee | Ali Fulminee | Traduzione mancante | `label_en` replica l’italiano; una traduzione corretta sarebbe “Lightning Wings”【248646306596590†L310-L312】. |

## Suggerimenti di miglioramento
1. **Uniformare la nomenclatura**: scegliere nomi italiani sintetici e relative traduzioni inglesi per tutti i tratti, evitando frasi lunghe nei campi `label_it`/`label_en`.
2. **Correggere i segnaposto**: sostituire `random` e `pathfinder` con nomi coerenti (ad es. *Slot Casuale* e *Esploratore*).
3. **Rivedere le traduzioni**: sistemare refusi (es. “sghiaccio”) e allineare i nomi italiani e inglesi dove presenti differenze (es. `criostasi_adattiva`).
4. **Eliminare descrizioni colloquiali**: adeguare i tratti anomali come `nucleo_ovomotore_rotante` e `ventriglio_gastroliti` utilizzando terminologia tecnica coerente con gli altri.

Questa analisi fornisce una panoramica dei pattern ricorrenti e dei problemi principali; una revisione sistematica del glossario permetterà di uniformare il catalogo e migliorare la leggibilità.
