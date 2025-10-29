# Hook — Trasmissione Metriche EMA & Alert Risk HUD

## Contesto
- Dataset sorgente: `data/core/telemetry.yaml` (`ema_alpha`, `windows.phase_weights`, normalizzazione `ema_capped_minmax`).
- Mission tuning: `data/core/missions/skydock_siege.yaml` definisce target `risk.time_low_hp_turns` e l'alert HUD >0.60 come azione di monitoraggio condivisa.
- Playtest di riferimento: log VC `logs/playtests/2025-02-15-vc/session-metrics.yaml` (sessioni Alpha/Bravo/Charlie).

## Flusso di trasmissione
1. **Motore client → Telemetria**
   ```ts
   telemetryBus.emit("ema.update", {
     missionId: context.missionId,
     turn: state.turn,
     ema: state.ema, // alpha 0.3, pesi fase 0.25/0.35/0.40
     indices: state.indices,
     idleThreshold: 10,
   });
   ```
   - L'oggetto `state.ema` espone `window` (turno) e frame `phase_weights` aggiornati.
   - `indices` include `risk.weighted_index` e `risk.time_low_hp_turns` per confronto diretto con i target del tuning.

2. **Middleware VC (client)** — implementato in `tools/ts/hud_alerts.ts` per gli scenari di test
   ```ts
   registerRiskHudAlertSystem({
     telemetryBus,
     hudLayer,
     commandBus,
     telemetryRecorder,
     options: {
       threshold: 0.60,
       clearThreshold: 0.58,
       consecutiveBelowThreshold: 2,
       filters: [
         (payload) => payload.missionId !== 'training-ground',
         (payload) => payload.indices?.risk?.weighted_index != null,
       ],
       missionTags: {
         'alpha-01': 'deep-watch',
         'bravo-02': 'gamma-net',
       },
     },
   });
    ```
    - I filtri permettono di escludere stream di telemetria non validi o missioni training; `missionTags` sincronizza l'etichetta
      missione nel metadata degli alert e nei log telemetrici.
    - L'alert HUD resta warning (giallo) e si auto-disarma quando la media scende sotto 0.58 per due tick consecutivi grazie al
      contatore `consecutiveBelowThreshold`.
    - L'endpoint `telemetry.alert_context` (`scripts/api/telemetry_alerts.py`) riceve il metadata arricchito e lo serializza in
      forma compressa per la dashboard canary.
    - La finestra `idleThreshold` aggiornata (10 s) assicura coerenza tra dataset e log VC 2025-02-15.
    - `commandBus.emit` notifica il canale PI balance per follow-up immediato.
    - Il recorder telemetrico archivia l'evento in `hud_alert_log` (vedi `logs/playtests/2025-11-05-vc/session-metrics.yaml`).

3. **Persistenza & export**
   - In coda missione, il client salva un frammento YAML con l'ultima finestra EMA e i momenti di attivazione dell'alert.
   - Il file confluisce nella pipeline Drive/Canvas insieme alle metriche dei log VC.

## Hook documentati
| Hook ID | Origine | Destinazione | Payload | Note |
| --- | --- | --- | --- | --- |
| `telemetry.ema.update` | Motore → Telemetria | Middleware VC | `{ missionId, turn, ema, indices }` | Frequenza: a fine turno (debounce 200 ms). |
| `hud.alert.risk-high` | Middleware VC | HUD overlay | `{ id, severity, message, metadata }` | Soglia ingresso 0.60, uscita 0.58 (isteresi). |
| `pi.balance.alerts` | Middleware VC | Notifica PI | `{ missionId, roster, indices }` | Smista su Slack/Teams per revisione bilanciamento. |

## Next steps condivisi con team client
- Validare in staging la latenza dell'alert rispetto agli eventi `aeon_overload` (target: <250 ms post-evento).
- Aggiornare documentazione HUD con screenshot dei nuovi banner e relativo log export.
- Integrare la sincronizzazione automatica dei frammenti YAML nel workflow `deploy-test-interface` per review rapida.
