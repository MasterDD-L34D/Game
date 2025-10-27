# Piano sessione dedicata — EVT-02 "Alleanza inattesa"

## Sintesi coordinamento
- **Finestra confermata:** 2025-03-05, 15:00-17:00 CET.
- **Modalità:** QA Lab Torino (2 postazioni co-op) + stanza Teams "Narrative EVT-02".
- **Responsabile QA:** Andrea Conti (Narrative QA lead).
- **Supporto narrativa:** Giulia Parodi (writer support) — cura dialoghi e gestione branching.
- **Tester confermati:** Marco Esposito, Lina Wu (co-op), backup remoto: Elisa Conti.
- **Obiettivi principali:**
  1. Validare ramificazioni cooperative post-patto, con verifica linee "Accordo provvisorio" e "Rinegoziazione".
  2. Controllare sincronizzazione flag narrativi `evt02_alliance_state` e `evt02_reputation_delta`.
  3. Registrare log decisioni e flag tramite export automatico + note osservatore.

## Agenda dettagliata
| Orario | Attività | Owner | Note |
| --- | --- | --- | --- |
| 15:00-15:10 | Setup postazioni, verifica build `branching-v3` e save `story-branch-ev02`. | A. Conti | Confermare hotfix dialoghi applicato.
| 15:10-15:20 | Brief narrativo + ripasso flow chart. | G. Parodi | Utilizzare schema `docs/playtest/EVT-02-session-plan.md#flow-chart`.
| 15:20-16:00 | Run 1 percorso cooperativo completo. | Tester co-op | Registrare clip OBS + esport flag automatico.
| 16:00-16:10 | Debrief rapido, revisione log flag. | A. Conti + G. Parodi | Annotare incongruenze in tabella issue.
| 16:10-16:40 | Run 2 con deviazioni su scelta opzionale "Richiedi tributo". | Tester co-op | Monitorare reazione NPC e gating reputazione.
| 16:40-16:55 | Debrief finale + definizione follow-up. | Tutti | Identificare fix owner e priorità.
| 16:55-17:00 | Upload log e aggiornamento report. | A. Conti | Salvare in `logs/playtests/2025-03-05-evt02/`.

## Flow chart di riferimento
```
Nodo iniziale → Dialogo negoziazione → Scelta:
  - Cooperare → Flag `evt02_alliance_state = cooperative`
      → Check reputazione >= 2 → Dialogo "Accordo provvisorio" → Evento supporto in missione successiva.
  - Rifiutare → Flag `evt02_alliance_state = refused`
      → Avvio combattimento → Trigger EVT-02 fallback.
```

## Deliverable sessione
- Aggiornare `docs/playtest/SESSION-2025-11-12.md` (sezione scenari) con stato EVT-02.
- Compilare tabella incongruenze in `docs/playtest/tickets/EVT-02-event-special.md`.
- Condividere recap nel canale `#qa-playtest` entro 18:00 con link a log e note.

## Dipendenze aperte
| Tipo | Descrizione | Owner | ETA |
| --- | --- | --- | --- |
| Build | Applicare hotfix dialoghi `evt02_coop_fix` (branch narrativa). | Team Narrative Tools | 2025-03-01 |
| Tooling | Script export flag (CLI `scripts/playtest/export_evt_flags.sh`). | QA Tools | 2025-03-03 |
| Localizzazione | Revisione linee coop EN/IT. | Localization | 2025-03-04 |

## Contatti rapidi
- Narrative QA: `andrea.conti@example.com`
- Writer support: `giulia.parodi@example.com`
- QA Tools: `qatools@example.com`
