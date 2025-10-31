# Playbook QA - Moderazione Assistita

## Obiettivi
- Validare la qualità dei suggerimenti ML nel pannello di moderazione assistita.
- Garantire la riduzione del tempo di triage per i casi critici.
- Assicurare il rispetto delle policy di sicurezza dati durante l'esecuzione.

## Checklist pre-rollout
- [ ] Verificare che il flag `moderazioneAssistedOps` sia attivo sulle code `moderation-core` e `moderation-emea`.
- [ ] Eseguire test di regressione `tests/moderation/test_assisted_flows.py` in ambiente staging.
- [ ] Coordinare con Security per il controllo log accessi in `logs/moderation/audit/`.
- [ ] Aggiornare la knowledge base interna con la nuova guida operativa (`KB-Moderazione-Assistita`).

## Checklist monitoraggio
- [ ] Abilitare la dashboard `tools/monitoring/rollout/dashboard.yaml` sezione `moderazione-assistita`.
- [ ] Monitorare `moderation_assist_accept_rate` e notificare se sotto soglia per 2 finestre.
- [ ] Controllare `moderation_triage_latency_p95` confrontando i dati con baseline storica.
- [ ] Registrare gli `moderation_manual_escalations` in `reports/moderation/escalations.xlsx`.

## Checklist post-rollout
- [ ] Analizzare il sentiment degli operatori tramite survey `forms/moderation_feedback`.
- [ ] Aggiornare le policy in `rules/moderation/` se emergono nuove casistiche.
- [ ] Organizzare retrospettiva con i referenti regionali e definire follow-up.
