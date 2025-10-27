# Telemetria → Vettore Comportamentale (VC)

Eventi, finestre, indici (Aggro/Risk/Cohesion/Setup/Explore/Tilt) e mapping verso layer MBTI-like + Ennea-themes.

- Log eventi: hit, miss, crit, heal, buff, debuff, objective_tick, tile_enter, LOS_gain, formation_time, chat_ping, surrender, tilt triggers, turn_time.
- EMA per turni/fasi/mappe; clipping outlier.
- Output: grafici TV, consigli sblocchi, seed Forme.

## Calendario revisione PI/telemetria

| Ricorrenza | Slot | Focus principale | Owner | Deliverable |
| --- | --- | --- | --- | --- |
| Settimanale | Martedì · 10:00-10:45 CET | Stato pacchetti PI, anomalie sugli indici Aggro/Risk e follow-up delle azioni correttive | Lead Design · PM | Note sintetiche + flag su ticket aperti |
| Settimanale | Giovedì · 16:00-16:30 CET | Debrief dati raw dei playtest, verifica log depositati e triage ticket critici | Analytics · QA | Aggiornamento `logs/playtests/` + elenco bug prioritari |
| Quindicinale (settimana dispari) | Venerdì · 15:00-16:00 CET | Retrospettiva VC completa (telemetria → decisioni design) e pianificazione backlog | Design Council · Tech Lead | Decision log + aggiornamento roadmap |

- Tutte le sessioni sono registrate nel calendario condiviso `Evo-Tactics / VC Reviews` con promemoria 24h prima e agenda allegata in Notion.
- Materiali e metriche vengono raccolti entro le 18:00 CET dello stesso giorno nella cartella condivisa `telemetria/reports`.
- L'owner della sessione aggiorna i punti rilevanti in `docs/tool_run_report.md` o, per decisioni strategiche, apre/integra i relativi ADR.
- Quando emergono impatti sui playtest, il PM verifica che la cartella `logs/playtests/YYYY-MM-DD` contenga i log dell'ultima sessione prima di chiudere la riunione.
