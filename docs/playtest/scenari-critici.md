# Scenari critici di playtest

Questa lista evidenzia gli scenari che devono essere eseguiti a ogni ciclo di validazione per ridurre i rischi di regressione sul bilanciamento, la progressione e gli eventi speciali. È derivata da `scenari-test.md` ed è aggiornata in base all'andamento dei playtest più recenti.

## Priorità e responsabilità

| Scenario ID | Nome scenario | Priorità | Rischio principale | Owner | Frequenza minima | Ultima esecuzione | Note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BAL-02 | Boss intermedio | Alta | Picchi di difficoltà non controllati e consumo eccessivo di risorse. | QA Lead (M. Serra) | Ogni build milestone | 2025-02-26 | Richiesti nuovi log di combattimento per confermare tuning stamina. |
| BAL-03 | Horde mode | Alta | Instabilità AI e degrado prestazionale con spawn massivi. | Tech QA (L. Rinaldi) | Ogni release candidata | 2025-02-26 | Presente bug #143 su pathfinding bloccato oltre 35 unità. |
| PROG-03 | Gestione risorse hub | Media | Possibile deadlock economico nel quartier generale. | Prod. Assoc. (G. Parodi) | Ogni ciclo bisettimanale | 2025-02-26 | Necessario verificare aggiornamento fogli calcolo auto-sync. |
| EVT-01 | Tempesta dimensionale | Alta | Comunicazioni confuse e glitch particellari durante evento. | Design QA (S. Neri) | Ogni patch contenuti evento | 2025-02-26 | VFX fix parziale, monitorare bug #144 su shader. |
| EVT-02 | Alleanza inattesa | Media | Ramificazioni narrative incoerenti e flag errati. | Narrative QA (A. Conti) | Ogni sprint narrativa | 2025-02-20 | Scenario non eseguito nella sessione corrente, mantenere follow-up. |

## Criteri di aggiornamento
- **Inserimento**: quando uno scenario produce bug critici ripetuti o copre metriche VC essenziali.
- **Rimozione**: dopo due cicli consecutivi senza issue e con metriche entro le soglie target.
- **Revisione**: eseguita alla chiusura di ogni sessione settimanale, con aggiornamento della colonna "Ultima esecuzione" e delle note.

## Collegamenti utili
- Procedure complete: `docs/playtest/procedura-post-sessione.md`.
- Log e materiali della sessione corrente: `logs/playtests/2025-02-26/`.
- Report dettagliato: `docs/playtest/SESSION-2025-02-26.md`.
