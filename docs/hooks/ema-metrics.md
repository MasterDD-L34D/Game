# Hook — Trasmissione Metriche EMA & Alert Risk HUD

## Contesto
- Dataset sorgente: `data/telemetry.yaml` (`ema_alpha`, `windows.phase_weights`, normalizzazione `ema_capped_minmax`).
- Mission tuning: `data/missions/skydock_siege.yaml` definisce target `risk.time_low_hp_turns` e l'alert HUD >0.60 come azione di monitoraggio condivisa.
- Playtest di riferimento: log VC `logs/playtests/2025-02-15-vc/session-metrics.yaml` (sessioni Alpha/Bravo/Charlie).

## Flusso di trasmissione
1. **Motore client → Telemetria**
   ```ts
   telemetryBus.emit("ema.update", {
     missionId: context.missionId,
     turn: state.turn,
     ema: state.ema, // alpha 0.3, pesi fase 0.25/0.35/0.40
     indices: state.indices,
   });
   ```
   - L'oggetto `state.ema` espone `window` (turno) e frame `phase_weights` aggiornati.
   - `indices` include `risk.weighted_index` e `risk.time_low_hp_turns` per confronto diretto con i target del tuning.

2. **Middleware VC (client)**
   ```ts
   telemetryBus.on("ema.update", (payload) => {
     hudLayer.updateTrend("risk", payload.indices.risk);
     if (payload.indices.risk.weighted_index >= 0.60) {
       hudLayer.raiseAlert({
         id: "risk-high",
         severity: "warning",
         message: "Risk EMA oltre soglia 0.60",
         metadata: {
           weightedIndex: payload.indices.risk.weighted_index,
           timeLowHp: payload.indices.risk.time_low_hp_turns,
         },
       });
       commandBus.emit("pi.balance.alert", payload);
     }
   });
   ```
   - L'alert HUD usa colore giallo (warning) e si auto-disarma quando la media scende sotto 0.58 per due tick consecutivi.
   - `commandBus.emit` notifica il canale PI balance per follow-up immediato.

3. **Persistenza & export**
   - In coda missione, il client salva un frammento YAML con l'ultima finestra EMA e i momenti di attivazione dell'alert.
   - Il file confluisce nella pipeline Drive/Canvas insieme alle metriche dei log VC.

## Hook documentati
| Hook ID | Origine | Destinazione | Payload | Note |
| --- | --- | --- | --- | --- |
| `telemetry.ema.update` | Motore → Telemetria | Middleware VC | `{ missionId, turn, ema, indices }` | Frequenza: a fine turno (debounce 200 ms). |
| `hud.alert.risk-high` | Middleware VC | HUD overlay | `{ id, severity, message, metadata }` | Soglia ingresso 0.60, uscita 0.58 (isteresi). |
| `pi.balance.alert` | Middleware VC | Notifica PI | `{ missionId, roster, indices }` | Smista su Slack/Teams per revisione bilanciamento. |

## Next steps condivisi con team client
- Validare in staging la latenza dell'alert rispetto agli eventi `aeon_overload` (target: <250 ms post-evento).
- Aggiornare documentazione HUD con screenshot dei nuovi banner e relativo log export.
- Integrare la sincronizzazione automatica dei frammenti YAML nel workflow `deploy-test-interface` per review rapida.
