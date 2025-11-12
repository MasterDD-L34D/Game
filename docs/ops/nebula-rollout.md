# Nebula Atlas Aggregator Rollout Runbook

## Contesto

Il rollout dell'aggregatore Nebula Atlas è controllato dal flag `featureFlags.rollout.nebulaAtlasAggregator` definito in `config/featureFlags.json`. Il flag è in fase _canary_, richiede lo stage gate `nebula-pilot-go` e abilita i soli cohort `nebula-alpha`, `nebula-beta` e `qa-delta`. Il rollout porta in produzione il controller `atlasController` con l'aggregatore `nebulaTelemetryAggregator`, introducendo:

- Header di risposta `x-nebula-rollout-*` per tracciare lo stato (enabled/disabled, motivo, stage gate, cohort).
- Logging dedicato (`[atlas-controller]` e `[nebula-aggregator]`) per validare fallback e fonti mancanti.
- Metriche operative per verificare successo, fallback e latenza (vedi sezione [Metriche](#metriche-da-monitorare)).

## Prerequisiti

1. Stage gate `nebula-pilot-go` approvato e comunicato alle squadre coinvolte.
2. Telemetria QA aggiornata (`data/derived/exports/qa-telemetry-export.json`) e profilo generatore (`logs/tooling/generator_run_profile.json`).
3. Cartella log orchestrator con file `*.jsonl` accessibile (configurazione in `nebulaTelemetryAggregator`).
4. Pipeline `nebula-atlas-rollout` pronta (config: `config/jobs/nebula-atlas-rollout.yaml`).
5. Squadre `nebula-ops` e `qa-insights` reperibili su Slack (`#nebula-ops`, `#nebula-rollout`).

## Procedura di Rollout

1. **Baseline**
   - Eseguire `curl` (o Postman) su `/nebula/atlas?cohort=nebula-alpha&stageGate=nebula-pilot-go` dall'ambiente canary.
   - Verificare header `x-nebula-rollout-state: enabled` e motivo `cohort_enabled`.
   - Controllare i log applicativi per assicurarsi che non compaiano warning `[nebula-aggregator] ... fallback`.
2. **Monitoraggio iniziale (15 minuti)**
   - Tracciare le metriche (success rate ≥99%, fallback ratio ≤5%, latency p95 ≤4500 ms).
   - Validare che la metrica `nebula_atlas_fallback_ratio` resti sotto soglia; in caso contrario analizzare i log di fallback.
3. **Estensione cohort**
   - Abilitare progressivamente `nebula-beta` e poi `qa-delta` coordinando i client: assicurarsi che gli endpoint includano `stageGate=nebula-pilot-go` e il cohort appropriato.
   - Dopo ogni estensione ripetere il punto 2 per almeno un ciclo di raccolta dati.
4. **Stabilizzazione**
   - Quando tutte le metriche sono stabili per ≥24h, pianificare l'eventuale passaggio a GA impostando `default: true` nel flag (previa approvazione).

## Metriche da monitorare

| Metrica                                | Soglia | Finestra | Canale allerta    |
| -------------------------------------- | ------ | -------- | ----------------- |
| `nebula_atlas_aggregator_success_rate` | ≥ 0.99 | 1h       | `ops-oncall`      |
| `nebula_atlas_fallback_ratio`          | ≤ 0.05 | 1h       | `#nebula-rollout` |
| `nebula_atlas_latency_p95_ms`          | ≤ 4500 | 30m      | `observability`   |

## Verifiche manuali

- **Header**: ogni risposta deve riportare `x-nebula-rollout-state` e `x-nebula-rollout-reason`. In caso di fallback atteso si osserva `stage_gate_required` o `cohort_not_authorized`.
- **Logging**:
  - `[atlas-controller] rollout Nebula disabilitato (...)` indica fallback deciso dal flag.
  - `[nebula-aggregator] telemetria/orchestrator ... uso valori di fallback` segnala sorgenti mancanti.
- **API**: quando il flag è disabilitato, `/nebula/atlas/orchestrator` restituisce `404 Telemetria orchestrator non disponibile per rollout Nebula`.

## Piano di Fallback

1. Rimuovere lo stage gate dalle chiamate client o impostare un cohort non autorizzato per forzare subito il ritorno al dataset statico.
2. Se necessario, impostare temporaneamente `default: false` o rimuovere i cohort dal flag in `config/featureFlags.json` e ridistribuire.
3. Monitorare che i log `[atlas-controller]` confermino lo stato `disabled` e che il traffico ritorni alle sorgenti statiche (assenza di log `[nebula-aggregator]` con errori gravi).
4. Segnalare l'esito su `#nebula-ops` e aggiornare la checklist QA.

## Ripartenza dopo fallback

- Ripulire eventuali cache chiamando `invalidateCache()` sull'aggregatore (se esposto) o riavviando l'istanza.
- Ripristinare i cohort nel flag e ripetere la procedura a partire dal punto 1 (Baseline).

## Contatti

- **Owner**: team `nebula-ops` (`nebula-ops@gamestudio.local`)
- **Supporto QA**: `qa-insights@gamestudio.local`
- **Canali Slack**: `#nebula-ops`, `#nebula-rollout`
