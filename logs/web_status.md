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

## 2025-10-27T02:16:24Z · run_deploy_checks.sh
- **Esito script**: ✅ `scripts/run_deploy_checks.sh`
  - `npm test` (tools/ts) · suite TypeScript + Playwright completata.
    - Playwright · 2 test totali, 2 passati, 0 falliti.
      - ✅ tests/web/interface.spec.ts › dashboard carica il dataset minimo senza errori
      - ✅ tests/web/interface.spec.ts › workspace manuale mette in coda il payload da packs.yaml
  - `pytest` (tools/py) · 20 test superati.
  - Bundle statico generato in `dist.AFU8Fq` con fixture `data/test-fixtures/minimal`.
- **Smoke test HTTP**: server Python su `http://127.0.0.1:34623/`.
  - Richieste principali completate senza errori (index.html e dashboard).
- **Note**:
  - Report Playwright elaborato tramite `tools/ts/scripts/collect_playwright_summary.js`.
