# Telemetria → Vettore Comportamentale (VC)

Eventi, finestre, indici (Aggro/Risk/Cohesion/Setup/Explore/Tilt) e mapping verso layer MBTI-like + Ennea-themes.

- Log eventi: hit, miss, crit, heal, buff, debuff, objective_tick, tile_enter, LOS_gain, formation_time, chat_ping, surrender, tilt triggers, turn_time.
- EMA per turni/fasi/mappe; clipping outlier.
- Output: grafici TV, consigli sblocchi, seed Forme.

## Calendario revisione PI/telemetria

| Ricorrenza | Slot | Focus | Owner |
| --- | --- | --- | --- |
| Settimanale | Martedì 10:00-10:45 CET | Stato PI, anomalie telemetria prioritaria e follow-up su indici Aggro/Risk | Lead Design + PM |
| Settimanale | Giovedì 16:00-16:30 CET | Debrief dati raw dei playtest e triage ticket critici | Analytics + QA |
| Quindicinale (settimana dispari) | Venerdì 15:00-16:00 CET | Retrospettiva VC completa (telemetria → decisioni design) e pianificazione backlog | Design Council + Tech Lead |

- Tutte le sessioni sono registrate nel calendario condiviso `Evo-Tactics / VC Reviews` e hanno ordine del giorno in Notion.
- Materiali e metriche vengono raccolti entro le 18:00 CET dello stesso giorno nella cartella condivisa `telemetria/reports`.
- L'owner della sessione invia riepilogo e azioni in `docs/tool_run_report.md` o, per decisioni strategiche, nei relativi ADR.
