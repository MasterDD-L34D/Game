# Elenco scenari di test

Questo documento riassume gli scenari di playtest programmati per verificare bilanciamento, progressione e reazioni agli eventi speciali.
Ogni scenario è progettato per essere eseguito in autonomia o all'interno di una sessione pilota più ampia.
Gli scenari che ricadono nel perimetro critico vengono tracciati con priorità e frequenza dedicate in `scenari-critici.md`.

Per ogni scenario sono riportati gli obiettivi chiave, le metriche da raccogliere, i prerequisiti tecnici e la cadenza consigliata con cui
ripetere il test nel corso delle iterazioni. Le cadenze sono suggerite dal team di design e QA per garantire che ognuna delle aree di verifica
riceva attenzione costante.

## 1. Bilanciamento degli incontri

| ID | Scenario | Obiettivi | Metriche principali | Prerequisiti | Cadenza |
| --- | --- | --- | --- | --- | --- |
| BAL-01 | "Campo di battaglia iniziale" | Verificare la difficoltà percepita del primo incontro multi-unità. | Tasso di vittoria, danno medio subito, tempo per completare lo scontro. | Build `alpha-balancing` con configurazioni standard dei personaggi livello 1. | Ad ogni build settimanale. |
| BAL-02 | "Boss intermedio" | Validare la curva di difficoltà al passaggio dalla mid-campaign. | Numero di tentativi prima della vittoria, consumo risorse, feedback qualitativo sul pattern del boss. | Savegame capitolo 4, equipaggiamento livello 12, accesso a log di combattimento. | Ogni milestone narrativa. |
| BAL-03 | "Horde mode" | Stress test della gestione spawn massivi e prestazioni AI. | Frame rate minimo, tempo di risoluzione turno, segnalazioni di comportamenti erratici. | Modalità horde attiva da configurazione `configs/horde_balancing.json`. | Fine sprint tecnico. |

## 2. Progressione

| ID | Scenario | Obiettivi | Metriche principali | Prerequisiti | Cadenza |
| --- | --- | --- | --- | --- | --- |
| PROG-01 | "Percorso tutorial" | Misurare la comprensione delle meccaniche base dopo il tutorial. | Step completati senza aiuto, domande frequenti, tempo totale. | Build di onboarding, checklist di onboarding stampata. | Ogni volta che vengono introdotte nuove meccaniche. |
| PROG-02 | "Sblocco abilità ramo esploratore" | Valutare chiarezza dei requisiti e soddisfazione ricompense. | Numero di tentativi, scelta dei perk, feedback narrativo. | Profilo giocatore livello 8, feature flag `explorer_branch` attivo. | Ogni sprint di progressione (mensile). |
| PROG-03 | "Gestione risorse hub" | Testare economia e ritmo di upgrade del quartier generale. | Bilancio risorse dopo 3 cicli, percentuale di upgrade completati, momenti di stallo. | Save hub con progressione media, foglio di calcolo per tracciamento risorse. | Inizio e fine di ogni ciclo trimestrale. |

## 3. Eventi speciali

| ID | Scenario | Obiettivi | Metriche principali | Prerequisiti | Cadenza |
| --- | --- | --- | --- | --- | --- |
| EVT-01 | "Tempesta dimensionale" | Valutare chiarezza comunicazioni e reazioni del team. | Decisioni prese dai giocatori, tempo di risposta, bug grafici. | Script evento `event_dimensional_storm.json`, effetti particellari aggiornati. | Ogni rilascio di VFX o UI d'allerta. |
| EVT-02 | "Alleanza inattesa" | Testare ramificazioni narrative in caso di scelta cooperativa. | Percentuale di scelta cooperativa, coerenza dialoghi, flag narrativi corretti. | Build narrativa `branching-v3`, foglio storyline aggiornato. | Revisioni narrative bimestrali. |
| EVT-03 | "Anomalia reliquia" | Controllare puzzle e ricompense legate agli artefatti. | Tasso di completamento, numero di tentativi puzzle, feedback sulla ricompensa. | Puzzle pack `relic_omega`, accesso a log puzzle. | Quando vengono introdotti nuovi artefatti. |

## Modalità di esecuzione

1. Preparare l'ambiente di test secondo i prerequisiti indicati.
2. Registrare gameplay (video o log) e annotare metriche quantitative.
3. Raccogliere feedback qualitativo immediato tramite il template predisposto (`feedback-template.md`).
4. Archiviare i risultati nella cartella della sessione corrispondente (vedere `procedura-post-sessione.md`).
5. Verificare che eventuali bug relativi agli incontri siano tracciati con issue etichettate `encounter-balance`.

Aggiornare questo documento quando vengono aggiunti nuovi scenari o varianti significative.
