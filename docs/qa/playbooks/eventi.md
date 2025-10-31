# Playbook QA - Eventi Live Orchestration

## Obiettivi
- Garantire che ogni shard riceva i segnali di sincronizzazione entro la finestra prevista.
- Validare la continuità dell'esperienza evento anche durante i picchi di traffico.
- Monitorare la regressione su metriche di coinvolgimento durante l'orchestrazione.

## Checklist pre-rollout
- [ ] Verificare che il flag `eventiLiveOrchestration` sia configurato su ambiente di staging.
- [ ] Eseguire test di carico simulando almeno 3 ondate simultanee usando `tools/loadtests/eventi.lua`.
- [ ] Confermare la disponibilità del canale Slack `#eventi-control-room` con turni assegnati.
- [ ] Validare l'allineamento delle schedule con il team Live Ops (documento `calendar_eventi.ics`).

## Checklist monitoraggio
- [ ] Attivare la dashboard `tools/monitoring/rollout/dashboard.yaml` sezione `eventi-live`.
- [ ] Tracciare `eventi_active_instances` e aprire ticket se sotto soglia per 2 slot consecutivi.
- [ ] Confermare che gli allarmi Ops su `eventi_sync_drift_ms` siano instradati a PagerDuty `ops-oncall`.
- [ ] Annotare eventuali anomalie su `eventi_player_drop_rate` nel registro `logs/qa/eventi-drop.log`.

## Checklist post-rollout
- [ ] Raccolta feedback da canale #eventi-control-room e archivio retrospettiva.
- [ ] Aggiornare il documento KPI in `reports/eventi/summary.md` con i grafici esportati.
- [ ] Redigere action items e assegnarli via Jira board `LIVEOPS-QA`.
