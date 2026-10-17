# Redirect smoke / rollback / validator – riconciliazione log vs note ticket (2026-09-12)

## Evidenze log estratte
- **Smoke redirect 2026-09-08T1200Z (dev-tooling)** – esito **ERROR** Connection refused su `http://localhost:8000`; report allegato a #1204 (attivazione) e #1206 (rollback baseline). Riferimento: `[REDIR-SMOKE-2026-09-08T1200Z]` in `logs/agent_activity.md` (righe 24–26).
- **Smoke redirect 2026-09-08T1200Z rerun (archivist)** – esito **PASS** su `http://localhost:8000`; report `reports/redirects/redirect-smoke-staging.json` collegato a #1204/#1206 come baseline aggiornata. Riferimento: `[REDIR-SMOKE-2026-09-08T1200Z]` (righe 29–30).
- **Rollback simulation 2026-09-07T1200Z (coordinator)** – dry-run restore + checksum manifest core/derived/incoming **PASS** con smoke post-restore **PASS** su `http://localhost:8000`; ticket #1206 marcato Ready. Riferimento: `[ROLLBACK-SIM-2026-09-07T1200Z]` (righe 35–36).
- **Validator 02A schema-only 2026-07-24 (archivist)** – 14 controlli **PASS** su branch 03A (`logs/ci_runs/freezer_validator_2026-07-24.log`) usati come prerequisito 03A/03B. Riferimento: `[FREEZE-03A03B-2026-07-24T0730Z]` (riga 107).

## Mismatch tra log e note ticket
- **Baseline smoke nei reference** – `REF_REPO_MIGRATION_PLAN.md` e `REF_REDIRECT_PLAN_STAGING.md` riportavano ancora la baseline 2025-12-08 **PASS** come ultimo smoke Ready/Approved, ma il log più recente è il doppio run 2026-09-08 (ERROR → PASS) su `http://localhost:8000`. Le pagine sono state riallineate alla sequenza 2026-09-08 con stato finale **PASS** e nota dell’errore iniziale.
- **Stato mapping/tabella redirect** – la tabella mapping in `REF_REDIRECT_PLAN_STAGING.md` indicava ultimo smoke 2026-09-08 in **ERROR**, in contrasto con il rerun **PASS** nello stesso slot. La tabella ora esplicita che l’ultimo esito è **PASS** e conserva il riferimento al blocco Connection refused come storico.

## Finestre QA e fallback
- Finestra QA documentale vincolante per i gate #1204/#1205: **2025-12-01T09:00Z → 2025-12-08T18:00Z** con slot di fallback **2025-12-09T09:00Z → 2025-12-09T18:00Z** (già indicata in `REF_REDIRECT_PLAN_STAGING.md`).
- Il rerun smoke 2026-09-08 e la simulazione rollback 2026-09-07 restano ancorati a queste finestre; ulteriori rerun devono mantenere la stessa finestra QA o riaprirla nei ticket.

## Azioni proposte
- Usare il report `reports/redirects/redirect-smoke-staging.json` del rerun **PASS** 2026-09-08 come baseline di attivazione/rollback (#1204/#1206) e archiviare l’ERROR iniziale come storico.
- In caso di nuovi rerun, loggare in `logs/agent_activity.md` con host/timestamp e aggiornare i ticket mantenendo le finestre QA e il fallback 2025-12-09.
