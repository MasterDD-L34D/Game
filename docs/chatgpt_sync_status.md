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

## Cronologia esecuzioni recenti

### 2025-10-23 17:48 UTC
- **Esito**: riuscito.
- **Fonti eseguite**:
  - `local-export` (modalità export) → diff generato in `docs/chatgpt_changes/local/2025-10-23/`.
  - `local-notes` (modalità export) → primo snapshot, nessun diff precedente disponibile.
- **Note**: la configurazione aggiornata monitora due export locali e registra i percorsi
  nello snapshot e nel riepilogo JSON.【F:logs/chatgpt_sync_last.json†L1-L32】【F:docs/chatgpt_changes/local/2025-10-23/snapshot-20251023T174852Z-local-export.md†L1-L18】

### 2025-10-23 02:47 UTC
- **Esito**: fallito.
- **Blocco 1**: libreria `requests` non installata → installare `pip install requests`
  insieme a `pyyaml` prima di rieseguire.
- **Blocco 2**: `ProxyError 403 Forbidden` verso fonti web → verificare credenziali, proxy
  o rete consentita prima di un nuovo run.【F:logs/chatgpt_sync.log†L1-L90】
