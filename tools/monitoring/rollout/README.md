# Dashboard Mission Control Rollout

La configurazione `dashboard.yaml` definisce la dashboard di monitoraggio dedicata alle fasi di rollout dei flag QA per eventi live, loadout dinamici e moderazione assistita.

## Utilizzo
1. Importare il file in Mission Control tramite `mc dashboards import --file tools/monitoring/rollout/dashboard.yaml`.
2. Verificare che le datasource `mission-control-prod` e `mission-control-preview` siano disponibili nell'ambiente selezionato.
3. Associare i canali di notifica indicati nella sezione `alerts` agli on-call correnti.

## Convenzioni
- Le metriche sono allineate ai flag definiti in `config/featureFlags.json`.
- Ogni pannello include soglie `warning` e `critical` coerenti con i playbook QA.
- Gli aggiornamenti devono essere tracciati nel changelog `reports/monitoring/rollout-dashboard.md`.
