# Tutorial rapido · Overlay HUD Smart Alerts (canary)

Attiva e testa l'overlay HUD canary per condividere i log con SquadSync e raccogliere feedback nel canale `#feedback-enhancements`.

## 1. Prerequisiti
- `public/hud/Overlay.tsx` aggiornato dalla branch corrente (include badge SquadSync e callout adaptive).【F:public/hud/Overlay.tsx†L1-L151】
- Configurazione CLI HUD (`config/cli/hud.yaml`) per abilitare il flag `hud.smart_alerts`.【F:config/cli/hud.yaml†L1-L7】
- Accesso Slack al canale `#feedback-enhancements` e permessi per allegare screenshot.

## 2. Avvio overlay in locale
```bash
npm --prefix webapp install
npm --prefix webapp run dev -- --host 0.0.0.0 --port 4173
```
1. Apri `http://localhost:4173/hud/overlay`.
2. Verifica che nella top bar compaia il badge **Canary** e il link rapido "Log feedback".
3. Imposta i filtri risk/cohesion: la timeline deve mostrare i turni 08-12 con le soglie aggiornate del mock (`assets/hud/overlay/mock-timeline.svg`).【F:assets/hud/overlay/mock-timeline.svg†L1-L33】

## 3. Registrare un feedback canary
1. Clicca su **Log feedback** → si apre il form configurato da `tools/feedback/form_config.yaml` con il canale Slack precompilato.【F:tools/feedback/form_config.yaml†L1-L120】
2. Aggiungi il tag `hud_canary` nel campo note o tag dedicato.
3. Compila build, scenario e severità (≥3 se blocco). Invia e attendi il messaggio automatico su `#feedback-enhancements`.

## 4. Monitorare il dashboard canary
- Esegui `python tools/feedback/report_generator.py --output-dir reports/feedback` per rigenerare i digest se servono archivi locali.【F:tools/feedback/report_generator.py†L1-L104】
- Apri `tools/feedback/hud_canary_dashboard.yaml` per verificare quali widget vengono popolati automaticamente e aggiorna eventuali soglie prima dei playtest.【F:tools/feedback/hud_canary_dashboard.yaml†L1-L53】
- Controlla che lo script `scripts/qa/hud_smart_alerts.py` stia producendo i log `hud_alert_log.json` consultati dalla dashboard.【F:scripts/qa/hud_smart_alerts.py†L1-L171】

## 5. Checklist finale
- [ ] Ack rate ≥ 0.82 e nessun spike adaptive senza owner.
- [ ] Screenshot overlay condiviso in `#feedback-enhancements` con riferimento al mock aggiornato.
- [ ] Ticket aperti in `incoming/FEATURE_MAP_EVO_TACTICS.md` per tutti i feedback con severità ≥3.
- [ ] Canvas aggiornato nella sezione [Sync HUD · dicembre 2025](../Canvas/feature-updates.md#sync-hud--dicembre-2025).

> Suggerimento: aggiungi il comando `npm run webapp:deploy` nel tuo workflow locale per verificare che l'overlay resti coerente anche nella build ottimizzata.
