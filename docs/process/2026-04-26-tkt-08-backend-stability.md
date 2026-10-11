---
title: 'TKT-08 — Backend stability under batch (diagnosis + fix)'
date: 2026-04-26
workstream: ops-qa
status: closed
authors:
  - Claude (Opus 4.7)
related:
  - BACKLOG.md TKT-08
  - PR #1551 (harness probe addendum)
  - PR #1559 (TKT-09 ai_intent fix)
  - branch fix/tkt-08-batch-harness-stability
---

# TKT-08 — Backend stability under batch

## Contesto

Sessione 2026-04-18 batch N=30 hardcore-06 morì a run #14. PR #1551/#1559 introdussero
`probe_one` + retry exponential backoff in `batch_calibrate_hardcore06.py` ma il root
cause backend lato server non era stato investigato. `batch_calibrate_hardcore07.py`
shipped 2026-04-24 era bare urlopen senza alcun pattern di resilience.

## Diagnosi

Audit ha rilevato **due cause concorrenti**, una server-side, una client-side.

### Cause #1 — server-side: `planningTimers` Map orphan

`apps/backend/routes/sessionRoundBridge.js` definisce `planningTimers = new Map()` per
tracciare auto-commit `setTimeout` su round-planning timeout. Il timer è cancellato
solo nei seguenti percorsi:

- `commitRound` esplicito (`/commit-round` route, line 1520)
- callback del timer stesso quando scatta (line 1344)

NON è cancellato in `/end`. Quando una sessione termina con planning ancora attivo
(es. `defeat` mid-round in batch harness), il timer rimane in queue Node con closure
ref alla session. Il guard `if (session.roundState && session.roundState.round_phase === PHASE_PLANNING)`
fa no-op a fire (la session è stata `sessions.delete()`d), ma il timer non è cleared
dalla event loop. Su batch N×30 potenzialmente N timers accumulati → memory growth +
event loop pressure crescente.

Severity: **bassa per N=30**, alta per batch >100 o run server long-lived.

### Cause #2 — client-side: hardcore07 bare urlopen

`tools/py/batch_calibrate_hardcore07.py` mancava completamente il pattern di
resilience già consolidato in hardcore06:

- no `_retry` exponential backoff
- no `/api/health` probe fail-fast pre-batch
- no inter-run cooldown (TCP port exhaustion Windows risk)
- no JSONL incremental write (perdita totale on crash mid-batch)
- no periodic health re-check ogni N run (auto-abort on backend death)

Severity: **alta** — singolo glitch transient → crash N=10 batch.

## Decisione (A vs B)

**Combo A+B**: root cause fix server-side + harness hardening client-side. Entrambi
ADDITIVE, zero breaking change. Effort totale ~80 LOC.

Rationale: Cause #1 è cheap fix (~10 LOC) con beneficio long-term. Cause #2 è il
P0 effettivo per Wednesday playtest pre-req (calibration hardcore07 reliable).

## Implementazione

### Server fix (Cause #1)

`apps/backend/routes/sessionRoundBridge.js`:

- Esposto `cancelPlanningTimer` dal `createRoundBridge` factory return.

`apps/backend/routes/session.js`:

- `/end` chiama `roundBridge.cancelPlanningTimer(session.session_id)` prima di
  `sessions.delete()`, in try/catch defensive.

LOC delta: +12 (5 export + 7 chiamata con guard).

### Harness fix (Cause #2)

`tools/py/batch_calibrate_hardcore07.py`:

- Aggiunto `_retry(fn, retries=5, backoff_base=0.5)` helper (parity hardcore06).
- `post`/`get` ora wrap `_retry`, fallback `(0, error_dict)` su connection refused.
- `health_check(host)` probe `/api/health`.
- `main()` esteso:
  - `--jsonl` (incremental write per-run)
  - `--cooldown` (default 0.5s, mitiga TCP port exhaustion Windows)
  - `--skip-health` (opt-out probe)
  - Fail-fast su health check pre-batch (return 1).
  - Periodic health re-check ogni 10 run con retry-once + abort on persistent failure.
  - `failures` counter in summary.

LOC delta: +80 (45 helper + 35 main wiring).

## Test verification

| Suite                                                                      | Result     |
| -------------------------------------------------------------------------- | ---------- |
| `node --test tests/ai/*.test.js`                                           | 311/311 ✅ |
| `node --test tests/api/session*.test.js`                                   | 77/77 ✅   |
| `npx prettier --check apps/backend/routes/{session,sessionRoundBridge}.js` | verde      |
| `python -m py_compile tools/py/batch_calibrate_hardcore07.py`              | OK         |
| `python tools/py/batch_calibrate_hardcore07.py --help`                     | wires OK   |

Smoke live (eseguibile manualmente con backend up):

```bash
npm run start:api &
P6_HOST=http://localhost:3334 python tools/py/batch_calibrate_hardcore07.py \
  --n 10 --cooldown 0.3 --jsonl out/h07-smoke.jsonl --out out/h07-smoke.json
```

Atteso: 10/10 run completi, JSONL append-only, no crash, summary verdetto
in/out band per win 30-50%.

## Files modificati

```
apps/backend/routes/sessionRoundBridge.js  (+5  -1 ) export cancelPlanningTimer
apps/backend/routes/session.js             (+11 -1 ) call cancelPlanningTimer at /end
tools/py/batch_calibrate_hardcore07.py     (+72 -10) retry/health/cooldown/jsonl
BACKLOG.md                                 (+1  -1 ) TKT-08 mark closed
docs/process/2026-04-26-tkt-08-backend-stability.md  (NEW) this doc
```

Total: ~95 LOC additive.

## Uncertainty flags

- **Cause #1 severity not measured**: il leak orphan timer è teorico — non c'è
  evidenza diretta che fosse il driver del crash run #14. Più probabile Cause #2
  (transient connection refused durante session/end I/O) era il colpevole reale.
  Server fix è preventivo, non curativo.
- **Live N=30 smoke non eseguito in questa sessione**: backend non avviato per
  evitare interferenza con altre sessioni. Smoke command sopra è da eseguire in
  ambiente clean prima di Wednesday playtest.
- **`hardcore06_quartet.py` non toccato**: stesso pattern bare urlopen presente,
  out-of-scope (TKT-08 specifica hardcore-06/07). Follow-up se mai usato in batch.

## Follow-up suggerito

- Smoke live N=30 hardcore-07 + verifica `failures: 0` in summary.
- Considerare pattern `_retry` come helper condiviso in `tools/py/batch_runner_lib.py`
  (DRY tra hardcore06/07/quartet) — stimato ~30 LOC consolidation.
