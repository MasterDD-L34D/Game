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

### 2025-10-24 02:19 UTC
- **Esito**: riuscito.
- **Ambiente**: Ubuntu container, Python 3.11.12 (global), pip 25.2, `requests` 2.32.5, `PyYAML` 6.0.3.
- **Fonti eseguite**:
  - `local-export` → diff aggiornato in `docs/chatgpt_changes/local/2025-10-24/snapshot-20251024T021902Z-local-export.*`.
  - `local-notes` → diff aggiornato in `docs/chatgpt_changes/notes/2025-10-24/snapshot-20251024T021902Z-daily-notes.*`.
- **Credenziali/Proxy**: non richiesti (fonti locali; nessuna variabile impostata).
- **Note**: installati/aggiornati `requests` e `PyYAML` globalmente; log riepilogativo archiviato in `logs/chatgpt_sync_last.json`. Nessun follow-up aperto.

### 2025-10-24 02:10 UTC
- **Esito**: riuscito.
- **Ambiente**: Ubuntu container, Node.js 22.19.0, npm 11.4.2, Python 3.11.12 (venv disattivato), pip 25.2, `requests` 2.32.3, `PyYAML` 6.0.2.
- **Fonti eseguite**:
  - `local-export` → diff aggiornato in `docs/chatgpt_changes/local/2025-10-24/`.
  - `local-notes` → diff aggiornato in `docs/chatgpt_changes/notes/2025-10-24/`.
- **Note**: reinstallata la dipendenza `requests` tramite `tools/py/requirements.txt`; verificato che i percorsi export puntino alla cartella `data/exports/`. Nessun proxy richiesto per le fonti locali.【F:logs/chatgpt_sync_last.json†L1-L28】【F:docs/chatgpt_changes/local/2025-10-24/snapshot-20251024T021001Z-local-export.md†L1-L20】

### 2025-10-24 02:05 UTC
- **Esito**: manutenzione ambiente completata.
- **Ambiente**: Ubuntu container, Node.js 22.19.0, npm 11.4.2, Python 3.11.12 (global), pip 25.2.
- **Note**: reinstallate le dipendenze (`npm ci`, `pip install -r tools/py/requirements.txt`), ricompilata la CLI TypeScript e validati i dataset. Le CLI TS/Python producono ora output identici con seed `demo`. Test web manuali rinviati per assenza di browser nell'ambiente corrente.

### 2025-10-23 23:12 UTC
- **Esito**: riuscito dopo correzione configurazione export.
- **Ambiente**: Ubuntu container, Python 3.11.12 (global), pip 25.2, `requests` 2.32.5, `PyYAML` 6.0.3.
- **Fonti eseguite**:
  - `local-export` → diff aggiornato in `docs/chatgpt_changes/local/2025-10-23/`.
  - `local-notes` → diff aggiornato in `docs/chatgpt_changes/notes/2025-10-23/`.
- **Credenziali/Proxy**: non richiesti (fonti locali, nessuna variabile impostata).
- **Note**: aggiornato `data/chatgpt_sources.yaml` per puntare a `data/exports/*`; installati `requests` e `PyYAML` per evitare errori di import; fallimento intermedio dovuto a percorso errato ora risolto.

### 2025-10-23 18:12 UTC
- **Esito**: configurazione ambiente completata (nessuna sincronizzazione eseguita).
- **Ambiente**: Ubuntu container, Node.js 22.19.0, npm 11.4.2, Python 3.11.12 (venv attivo), pip 25.2.
- **Note**: predisposto l'ambiente installando dipendenze TypeScript/Python per consentire un futuro run.

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
