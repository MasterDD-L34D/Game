# Playbook QA - Loadout Dinamici

## Obiettivi
- Validare la generazione dei template stagionali con contenuti corretti per coorte.
- Garantire la consistenza dei dati di progressione in presenza di rollback.
- Misurare l'impatto sulle prestazioni durante la pubblicazione dei loadout.

## Checklist pre-rollout
- [ ] Confermare che il flag `loadoutDynamicTemplates` sia attivo solo per le coorti pilota.
- [ ] Rieseguire la suite `tests/loadout/test_templates.py` con ambiente QA aggiornato.
- [ ] Verificare la presenza di snapshot aggiornati in `data/loadout/templates/*.json`.
- [ ] Sincronizzare con il team Progression Design sul piano di comunicazione (#loadout-updates).

## Checklist monitoraggio
- [ ] Abilitare la dashboard `tools/monitoring/rollout/dashboard.yaml` sezione `loadout-dinamici`.
- [ ] Monitorare `loadout_publish_success_rate` e aprire incidente se sotto 98% per 3 slot.
- [ ] Verificare che gli alert `loadout_build_time_p95` generino ticket automatico in `OPS-LOADOUT`.
- [ ] Registrare ogni rollback manuale in `logs/qa/loadout-rollbacks.csv` con timestamp e responsabile.

## Checklist post-rollout
- [ ] Analizzare i tempi di pubblicazione confrontando i dati esportati da Grafana.
- [ ] Aggiornare la documentazione utente in `docs/loadout/guide.md` se cambiano i flussi.
- [ ] Pianificare retrospettiva con Progression Design e QA (riunione `Retro Loadout`).
