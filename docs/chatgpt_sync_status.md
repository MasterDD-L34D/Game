# Stato sincronizzazione ChatGPT

Questo file riepiloga l'ultima esecuzione degli script di sincronizzazione.

- Script principale: `scripts/chatgpt_sync.py`
- Configurazione di esempio: `data/chatgpt_sources.yaml`
- Riepilogo ultima esecuzione: `logs/chatgpt_sync.log`
- Diff generati: `docs/chatgpt_changes/<namespace>/<YYYY-MM-DD>/`

> Nota: i valori `namespace` vengono convertiti automaticamente in *slug*
(es. `Canvas Principale` → `canvas-principale`) prima di creare le cartelle.

Aggiorna questo file con note operative (es. nuove fonti, credenziali aggiornate,
problemi riscontrati) dopo ogni modifica sostanziale al flusso di sincronizzazione.

## Ultimo tentativo (2025-10-23)
- **Esito**: fallito.
- **Blocco 1**: libreria `requests` non installata → installare `pip install requests` insieme a `pyyaml` prima di rieseguire.【F:logs/chatgpt_sync.log†L1-L11】
- **Blocco 2**: `ProxyError 403 Forbidden` verso `chatgpt.com` nonostante l'installazione di `requests` → verificare credenziali, proxy o rete consentita prima di un nuovo run.【F:logs/chatgpt_sync.log†L12-L46】
- **Prossimi passi**: riprovare una volta risolti i blocchi sopra e aggiornare questo log con l'esito e il percorso del diff generato.
