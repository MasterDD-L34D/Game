# Sessione pilota 12 novembre 2025

> **Nota di allineamento (aggiornamento 2025-02-18):** questo piano sostituisce le indicazioni scenario precedenti ed è sincronizzato con la scheda `docs/playtest/SESSION-2025-11-12.md`.

## Obiettivi
- Validare gli scenari di bilanciamento `BAL-05`, la progressione `PROG-04` e l'evento speciale `EVT-03` come definito in `docs/playtest/SESSION-2025-11-12.md`.
- Verificare il flusso di raccolta feedback e la procedura post-sessione.
- Allineare team di design, QA e narrativa sulle priorità di rilascio di novembre 2025.

## Partecipanti
| Ruolo | Nome | Responsabilità |
| --- | --- | --- |
| Facilitatrice | Marta Bianchi | Conduzione della sessione, gestione tempi, moderazione Q&A. |
| QA Lead | Luca Ferretti | Tracking bug, verifica prerequisiti tecnici, coordinamento logging. |
| Game Designer | Elisa Conti | Valutazione bilanciamento, raccolta feedback qualitativo. |
| Narrative Designer | Paolo Riva | Monitoraggio coerenza narrativa durante EVT-03. |
| Osservatori esterni | 3 tester esperti | Partecipazione al playtest e compilazione template feedback. |

## Calendario
- **09:30-10:00** — Setup postazioni, verifica build `alpha-balancing` e seed `siege-042` per `BAL-05`.
- **10:00-10:20** — Briefing introduttivo e reminder sulle regole di feedback.
- **10:20-11:10** — Esecuzione scenario `BAL-05` con registrazione video e raccolta telemetria `damage.json`.
- **11:10-11:20** — Break tecnico.
- **11:20-12:10** — Esecuzione scenario `PROG-04` con export `progression-metrics.csv`.
- **12:10-12:30** — Discussione guidata sull'evento `EVT-03` e raccolta log `effects-trace.log`.
- **12:30-13:00** — Compilazione template feedback individuale e consolidamento note.
- **13:00-13:15** — Debrief operativo (QA + design) e definizione follow-up.

## Materiali e preparazione
- Build `alpha-balancing` installata su 5 postazioni con controller e tastiera.
- Savegame "Pilot-Nov2025" con progressione fino al capitolo 4.
- Accesso a `docs/playtest/scenari-test.md` e ai prerequisiti segnalati.
- Cartella condivisa `logs/pilot-2025-11-12/` per video, log e screenshot (creare prima della sessione) allineata ai percorsi in `docs/playtest/SESSION-2025-11-12.md`.
- Copie stampate o digitali del `feedback-template.md` per ogni partecipante.
- Foglio di calcolo telemetrico collegato a `telemetry/pilot-session-2025-11-12.xlsx`.
- Link stanza virtuale di supporto (Teams "Playtest Ops") per emergenze tecniche.
- Check-list hardware (periferiche, cuffie, microfoni) completata e firmata da QA Lead entro il 11/11.

## Deliverable post-sessione
1. Compilare e aggiornare `docs/playtest/SESSION-2025-11-12.md` (scenario `BAL-05`, `PROG-04`, `EVT-03`) seguendo la procedura descritta in `procedura-post-sessione.md`.
2. Archiviare log, screenshot e registrazioni nella cartella `logs/pilot-2025-11-12/` con naming coerente, includendo `damage.json`, `progression-metrics.csv` ed `effects-trace.log`.
3. Aprire issue su tracker con etichetta `encounter-balance` per ogni bug confermato e collegarle al documento della sessione.
4. Pianificare eventuali sessioni di follow-up sulla base delle criticità emerse e documentare le decisioni nella sezione "Azioni successive" del report.
