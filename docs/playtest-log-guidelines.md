# Convenzione archiviazione log di playtest

Per uniformare la raccolta dei risultati dei playtest, utilizzare la seguente struttura nella directory `logs/playtests/`.

## Struttura directory

```
logs/
  playtests/
    YYYY-MM-DD/
      README.md          # riepilogo breve della sessione
      session-metrics.yaml
      raw/
        <export>.json
        <screenshot>.png
```

- La cartella radice deve essere nominata con la data ISO (`YYYY-MM-DD`).
- Aggiungere un suffisso descrittivo opzionale (es. `-vc`, `-alpha`) solo se necessario a distinguere sessioni nello stesso giorno.
- I file principali da includere sono `session-metrics.yaml` e un `README.md` con partecipanti, seed utilizzati e link al calendario.
- I log raw (esportazioni CSV/JSON, screenshot) vanno inseriti in una sottocartella `raw/`.

## Procedura operativa

1. Dopo ogni playtest, creare la directory corrispondente alla data corrente.
2. Salvare nella cartella il seed usato (campo `seed:` nel README) e collegare eventuali board esterne.
3. Aggiornare `docs/tool_run_report.md` o il documento di sintesi dello sprint con le evidenze principali.
4. Quando un processo automatizzato produce log aggiuntivi, allegare nel README la pipeline o il comando utilizzato.

Questa convenzione è considerata attiva a partire dal ciclo di playtest 2025-11-04.
