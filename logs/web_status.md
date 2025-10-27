# Stato verifica bundle web

## 2025-10-27 · run_deploy_checks.sh
- **Esito script**: ✅ `scripts/run_deploy_checks.sh`
  - `npm test` (tools/ts) · 6 test superati.
  - `pytest` (tools/py) · 20 test superati.
  - Bundle statico generato in `dist.40aPFD` con mirror di `docs/test-interface` e `data/`.
- **Smoke test HTTP**: server Python su `http://127.0.0.1:50505/`.
  - Log richieste:
    - `GET /index.html` → 200 OK.
    - `GET /test-interface/index.html` → 200 OK.
  - Nessun asset mancante o errore 4xx/5xx rilevato.
- **Note**:
  - Validare anche asset referenziati (`styles.css`, `vendor/jszip.min.js`, `app.js`, viste fetch) in una run successiva per copertura completa.

