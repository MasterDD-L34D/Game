# Processo interno — Valutazione trait Evo

Questa pagina riassume il flusso interno per verificare il glossario trait senza
attivare la pubblicazione esterna verso i partner. La pipeline GitHub e gli
script locali condividono gli stessi parametri così da produrre report coerenti
fra loro.

## Workflow GitHub `traits-sync`

Il workflow pianificato/avviabile manualmente esegue i passaggi nell'ordine
seguente:

1. Aggiorna il glossario legacy con `tools/traits/sync_missing_index.py` e
   rigenera l'export partner (`reports/evo/rollout/traits_external_sync.csv`).
2. Avvia la valutazione interna con `tools/traits/evaluate_internal.py` e
   produce due report archiviati in `reports/evo/internal/traits_evaluation/`:
   - `<run_id>.json` – dettaglio punteggi, verdetti e motivazioni aggregati.
   - `<run_id>.csv` – versione tabellare con motivazioni concatenate.
3. Carica gli output come artifact GitHub:
   - `traits-external-sync-<run_id>` (export partner).
   - `traits-internal-evaluation-<run_id>` (report JSON/CSV interni).
4. Opzionalmente pubblica l'export su S3 se l'input `publish_external` è attivo
   e i segreti AWS sono configurati.

Per eseguire soltanto la valutazione interna, avvia il workflow manualmente da
GitHub Actions impostando `publish_external` su `false`.

## Esecuzione manuale

Replica l'intera pipeline locale tramite:

```bash
python tools/traits/publish_partner_export.py \
  --source reports/evo/rollout/traits_gap.csv \
  --dest data/core/traits/glossary.json \
  --export reports/evo/rollout/traits_external_sync.csv \
  --evaluation-output reports/evo/internal/traits_evaluation/manual_$(date -u +%Y%m%dT%H%M%SZ) \
  --no-upload
```

Lo script:

- Sincronizza il glossario e genera l'export partner locale.
- Produce i report interni JSON/CSV nel percorso indicato (crea la cartella se
  assente).
- Stampa i comandi equivalenti usati nella pipeline GitHub, utili per audit e
  runbook.

Per rieseguire soltanto l'analisi, dopo aver sincronizzato i dati lancia
esplicitamente il validatore:

```bash
python tools/traits/evaluate_internal.py \
  --gap-report reports/evo/rollout/traits_gap.csv \
  --glossary data/core/traits/glossary.json \
  --output reports/evo/internal/traits_evaluation/manual_<timestamp>
```

Aggiungi `--incoming-matrix <percorso.csv>` (ripetibile) se vuoi includere
segnali di moderazione aggiuntivi nelle valutazioni.
