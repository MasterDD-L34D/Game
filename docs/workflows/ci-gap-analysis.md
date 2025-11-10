# CI gap analysis (OPS-01)

Questa analisi sintetizza lo stato attuale dei workflow CI e identifica le aree
scoperte rispetto agli obiettivi Ops.

## Copertura attuale

- `ci.yml` esegue un filtro sui percorsi e attiva job dedicati per stack web,
  CLI, dataset e test Python/TypeScript in base alle modifiche introdotte
  (`paths-filter`).
- Il job `webapp-quality` si concentra su lint, test e build della webapp
  principale, mentre `stack-quality` replica l'intero pacchetto full-stack.
- Pipeline ausiliarie gestiscono CLI (`cli-checks`), validazioni Python
  (`python-tests`) e dataset (`dataset-checks`), garantendo la coerenza delle
  fonti dati.
- Altri workflow schedulati coprono aspetti specifici: `lighthouse.yml` esegue
  audit periodici delle metriche web con LHCI, mentre `schema-validate.yml`
  verifica gli schemi JSON in maniera autonoma.

## Gap individuati

1. **Site audit non integrato in CI** – gli script in `ops/site-audit/` sono
   richiamati manualmente via `make audit` e non c'è un job dedicato in
   `ci.yml`.
2. **Lighthouse confinato alla schedule** – le metriche Lighthouse girano solo
   sul workflow pianificato; non esiste un controllo automatico su PR o
   modifiche front-end critiche.
3. **Strumenti di automazione Evo isolati** – gli script in
   `tools/automation/` (es. batch runner, lint schemi) non sono coperti da job
   CI o target Make condivisi, creando disallineamenti operativi.
4. **Segnalazione centralizzata dei risultati** – non vengono raccolti artefatti
   standardizzati per audit/Lighthouse che possano alimentare reportistica o QA
   (download manuale richiesto dagli artifact quando disponibili).

## Raccomandazioni

1. Aggiungere un job `site-audit` in `ci.yml` che installi le dipendenze
   richieste e lanci `make audit`, caricando in artifact l'output generato.
2. Collegare Lighthouse al workflow principale (con guard condizionale su
   `SITE_BASE_URL`) riutilizzando la configurazione `lighthouserc.json`.
3. Normalizzare gli script Evo (naming + logging) e pubblicare target Make
   unificati per pianificazione/esecuzione/lint degli asset.
4. Consolidare la pubblicazione di artifact per i controlli web (site audit e
   Lighthouse) così da alimentare automaticamente i report Ops.
