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
- Il job `site-audit` installa le dipendenze di `ops/site-audit/` ed esegue
  `make audit`, caricando gli artifact prodotti per la consultazione Ops.
- Il job `lighthouse-ci` riusa la configurazione condivisa (`lighthouserc.json`)
  e lancia LHCI su push/PR quando sono coinvolte modifiche front-end.
- Altri workflow schedulati coprono aspetti specifici: `lighthouse.yml` esegue
  audit periodici delle metriche web con LHCI, mentre `schema-validate.yml`
  verifica gli schemi JSON in maniera autonoma.

## Gap individuati

1. **Strumenti di automazione Evo isolati** – gli script in
   `tools/automation/` (es. batch runner, lint schemi) sono ora coperti da
   target Make uniformi (`evo-list`, `evo-plan`, `evo-run`, `evo-lint`), ma non
   è ancora presente un job CI dedicato alla loro esecuzione programmata.
2. **Segnalazione centralizzata dei risultati** – gli artifact di site audit e
   Lighthouse vengono pubblicati automaticamente; resta da valutare
   l'integrazione di un bucket o dashboard unico per la consultazione storica.

## Raccomandazioni

1. Definire un job dedicato che riutilizzi i target `evo-*` per validare i
   workflow Evo direttamente in CI o su base schedulata.
2. Valutare una piattaforma di archiviazione/reportistica condivisa che raccolga
   automaticamente gli artifact generati da site audit e Lighthouse.
