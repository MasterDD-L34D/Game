# Sessione pilota 12 novembre 2025

## Obiettivi
- Validare gli scenari di bilanciamento `BAL-01` e `BAL-02`, la progressione `PROG-01` e l'evento speciale `EVT-01`.
- Verificare il flusso di raccolta feedback e la procedura post-sessione.
- Allineare team di design, QA e narrativa sulle priorità di rilascio di novembre 2025.

## Partecipanti
| Ruolo | Nome | Responsabilità |
| --- | --- | --- |
| Facilitatrice | Marta Bianchi | Conduzione della sessione, gestione tempi, moderazione Q&A. |
| QA Lead | Luca Ferretti | Tracking bug, verifica prerequisiti tecnici, coordinamento logging. |
| Game Designer | Elisa Conti | Valutazione bilanciamento, raccolta feedback qualitativo. |
| Narrative Designer | Paolo Riva | Monitoraggio coerenza narrativa durante EVT-01. |
| Osservatori esterni | 3 tester esperti | Partecipazione al playtest e compilazione template feedback. |

## Calendario
- **09:30-10:00** — Setup postazioni, verifica build `alpha-balancing` e savegame dedicati.
- **10:00-10:20** — Briefing introduttivo e reminder sulle regole di feedback.
- **10:20-11:10** — Esecuzione scenario `BAL-01` (registrazione video + telemetria).
- **11:10-11:20** — Break tecnico.
- **11:20-12:10** — Esecuzione scenario `BAL-02` e `PROG-01`.
- **12:10-12:30** — Discussione guidata sull'evento `EVT-01` e raccolta feedback immediato.
- **12:30-13:00** — Compilazione template feedback individuale e consolidamento note.
- **13:00-13:15** — Debrief operativo (QA + design) e definizione follow-up.

## Materiali e preparazione
- Build `alpha-balancing` installata su 5 postazioni con controller e tastiera.
- Savegame "Pilot-Nov2025" con progressione fino al capitolo 4.
- Accesso a `docs/playtest/scenari-test.md` e ai prerequisiti segnalati.
- Cartella condivisa `logs/pilot-2025-11-12/` per video, log e screenshot (creare prima della sessione).
- Copie stampate o digitali del `feedback-template.md` per ogni partecipante.
- Foglio di calcolo telemetrico collegato a `telemetry/pilot-session-2025-11-12.xlsx`.
- Link stanza virtuale di supporto (Teams "Playtest Ops") per emergenze tecniche.
- Check-list hardware (periferiche, cuffie, microfoni) completata e firmata da QA Lead entro il 11/11.

## Deliverable post-sessione
1. Compilare `docs/playtest/SESSION-2025-11-12.md` seguendo la procedura descritta in `procedura-post-sessione.md`.
2. Archiviare log, screenshot e registrazioni nella cartella `logs/pilot-2025-11-12/` con naming coerente.
3. Aprire issue su tracker con etichetta `encounter-balance` per ogni bug confermato e collegarle al documento della sessione.
4. Pianificare eventuali sessioni di follow-up sulla base delle criticità emerse e documentare le decisioni nella sezione "Azioni successive" del report.
