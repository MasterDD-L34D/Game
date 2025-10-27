# Scenari critici di playtest

Questa lista evidenzia gli scenari che devono essere eseguiti a ogni ciclo di validazione per ridurre i rischi di regressione su bilanciamento, progressione e eventi speciali. È derivata da `scenari-test.md` ed è aggiornata in base all'andamento dei playtest più recenti.

## Mappa scenari per area di rischio

### Bilanciamento

| Scenario ID | Nome scenario | Priorità | Rischio principale | Owner | Frequenza minima | Ultima esecuzione | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BAL-02 | Boss intermedio | Alta | Picchi di difficoltà non controllati e consumo eccessivo di risorse. | QA Lead (M. Serra) | Ogni build milestone | 2025-02-26 | Richiesti nuovi log di combattimento per confermare tuning stamina. |
| BAL-03 | Horde mode | Alta | Instabilità AI e degrado prestazionale con spawn massivi. | Tech QA (L. Rinaldi) | Ogni release candidata | 2025-02-26 | Presente bug #143 su pathfinding bloccato oltre 35 unità. |
| BAL-05 | Assedio modulare | Media | Possibili exploit sui moltiplicatori di danno e ritmo wave incoerente. | Combat Designer (F. Lodi) | Ogni sessione pilota | Pianificata 2025-11-12 | Nuova telemetria dps richiesta; verificare script `logs/playtests/2025-11-12/damage.json`. |

### Progressione

| Scenario ID | Nome scenario | Priorità | Rischio principale | Owner | Frequenza minima | Ultima esecuzione | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PROG-03 | Gestione risorse hub | Media | Possibile deadlock economico nel quartier generale. | Prod. Assoc. (G. Parodi) | Ogni ciclo bisettimanale | 2025-02-26 | Necessario verificare aggiornamento fogli calcolo auto-sync. |
| PROG-04 | Sblocco moduli nave madre | Alta | Curva XP sfasata e gating missioni secondarie. | Live Ops (E. Zani) | Ogni sessione pilota + post-patch progressione | Pianificata 2025-11-12 | Introdotta checklist XP → verificare export `progression-metrics.csv`. |

### Eventi speciali

| Scenario ID | Nome scenario | Priorità | Rischio principale | Owner | Frequenza minima | Ultima esecuzione | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EVT-01 | Tempesta dimensionale | Alta | Comunicazioni confuse e glitch particellari durante evento. | Design QA (S. Neri) | Ogni patch contenuti evento | 2025-02-27 | Patch DimensionalStorm 2025-02-27 validata: flash eliminato, monitorare bloom build console (#144). |
| EVT-02 | Alleanza inattesa | Media | Ramificazioni narrative incoerenti e flag errati. | Narrative QA (A. Conti) | Ogni sprint narrativa | Pianificata 2025-03-05 | Slot dedicato 2025-03-05 15:00-17:00 CET con A. Conti + writer support (G. Parodi); riferimenti checklist pre-sessione. |
| EVT-03 | Eclissi di frontiera | Alta | Trigger cinematico non sincronizzato e timer evento non resetta. | Event Owner (D. Bellini) | Ogni sessione con build evento | Pianificata 2025-11-12 | Richiede acquisizione video + log particellari (`effects-trace.log`). |

### Checklist pre-sessione EVT-02 (Alleanza inattesa)

- [ ] Confermare build narrativa `branching-v3` aggiornata con le patch dialoghi dedicate a EVT-02.
- [ ] Allineare savegame `story-branch-ev02` al nodo "Accordo provvisorio" con flag cooperativo impostato.
- [ ] Verificare presenza in sala/Teams di A. Conti (Narrative QA lead) e G. Parodi (writer support) + 2 tester co-op.
- [ ] Aggiornare il piano operativo in `docs/playtest/EVT-02-session-plan.md` includendo punti di controllo storyline e log flag.
- [ ] Predisporre cartella `logs/playtests/2025-03-05-evt02/` con sottocartelle `media/` e `flags/` per esport live.

## Criteri di aggiornamento
- **Inserimento**: quando uno scenario produce bug critici ripetuti o copre metriche VC essenziali.
- **Rimozione**: dopo due cicli consecutivi senza issue e con metriche entro le soglie target.
- **Revisione**: eseguita alla chiusura di ogni sessione settimanale, con aggiornamento della colonna "Ultima esecuzione" e delle note.

## Collegamenti utili
- Procedure complete: `docs/playtest/procedura-post-sessione.md`.
- Log e materiali della sessione corrente: `logs/playtests/2025-02-26/`.
- Sessione pilota 2025-11-12: `docs/playtest/SESSION-2025-11-12.md`.
- Report dettagliato precedente: `docs/playtest/SESSION-2025-02-26.md`.
