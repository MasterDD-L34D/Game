---
title: 'Thought Cabinet round-mode adoption check (Sprint 6 +14 days)'
description: 'Empirical adoption check on Sprint 6 Disco Tier S #9 surface. Cold-start flags + P4 status recommendation.'
authors: [claude-code]
created: 2026-05-11
updated: 2026-05-11
status: published
tags: [adoption-check, p4, disco-elysium, thought-cabinet, telemetry]
workstream: ops-qa
---

# Thought Cabinet round-mode adoption check (Sprint 6 +14 days)

**Trigger**: routine `thought-cabinet-adoption-check` (`trig_01JJsMTpGWaEsBfhE51YFNMx`) — 2026-05-11 07:00 UTC.
**Sprint 6 merge**: PR [#1966](https://github.com/MasterDD-L34D/Game/pull/1966) `584c54c2` — 2026-04-27 18:19 UTC.

## TL;DR

**Inconclusive — zero live playtest sessions logged since 2026-04-27.** Engine è LIVE e correttamente wired (confermato da tests 76/76 + smoke E2E), ma nessuna sessione umana ha esercitato la surface post-sprint. P4 status **retrocede da 🟢 def → 🟢 candidato** in attesa di almeno una sessione di playtest live con interazione Thought Cabinet reale.

## Data window

- **Periodo**: 2026-04-27 → 2026-05-11 (14 giorni).
- **Fonti scansionate**:
  - `data/derived/unit_diaries/skiv.jsonl` (38 righe, mod 2026-05-11 — Skiv Monitor)
  - `data/derived/skiv_monitor/feed.jsonl` (19800 righe — PR/workflow events, zero session events)
  - `data/derived/skiv_monitor/state.json`
  - `logs/m4_playtest_enc_tutorial_01_ae96d108.json` (2026-04-18, predates Sprint 6)
  - `reports/playtest/hardcore06_iter*.json|jsonl` (calibration AI sim, nessun thought event)
  - `reports/calibration/*.jsonl` (m6/m7/m9 iter, predates Sprint 6)
  - `logs/qa/dashboard_metrics.jsonl`
  - `docs/reports/2026-05-06-mbti-ennea-audit.md` (audit P4 engine state 2026-05-06)
  - `tests/api/sessionThoughts.test.js`, `tests/api/thoughtCabinet.test.js` (test coverage)
  - `apps/backend/services/thoughts/thoughtCabinet.js` (engine state)
  - `apps/backend/routes/sessionRoundBridge.js` (bridge emission)

## Metrics

| Metrica | Valore | Note |
|---|:-:|---|
| Sessioni umane post-sprint-6 | **0** | Nessun log di sessione reale trovato |
| Chiamate `/thoughts/research` | **0** | Zero nel periodo |
| `thought_internalized` events reali | **0** | Solo 2 events in repo, entrambi `source: "saga_seed_migration"` (2026-04-25, synthetic) |
| Distribuzione `mode` field | N/A | Nessun dato |
| Mediana rounds-to-internalize T1 | N/A | Nessun dato |
| Mediana rounds-to-internalize T2 | N/A | Nessun dato |
| Mediana rounds-to-internalize T3 | N/A | Nessun dato |

### Nota sui dati sintetici

Le 2 occorrenze di `thought_internalized` trovate in `data/derived/unit_diaries/skiv.jsonl`:

```jsonl
{"ts":"2026-04-25T20:00:00Z","event_type":"thought_internalized","source":"saga_seed_migration",...}
{"ts":"2026-04-25T21:00:00Z","event_type":"thought_internalized","source":"saga_seed_migration",...}
```

Entrambe pre-Sprint 6 e con campo `source: "saga_seed_migration"` — dati seed per Skiv saga, non sessioni live.
Il campo `research_cost: 1` nei payload indica formato pre-round-mode (encounters mode legacy).

### AI nightly sim (PR #2153, attivo dal 2026-05-10)

`tools/sim/batch-ai-runner.js` esegue N=40 combattimenti AI×AI via SIS (`declareSistemaIntents.js`).
Non esercita la surface Thought Cabinet — i combattimenti automatizzati non invocano `/thoughts/research`.
**Non è una fonte di dati di adoption per questa feature.**

## Cold-start flags

1. **CRITICO — Zero sessioni post-sprint-6**: nessun dato di playtest umano nel periodo 2026-04-27 → 2026-05-11. Il bottleneck è TKT-M11B-06 (sessione live 4 amici + master-dd), ancora bloccata userland.
2. **UI non esercitata**: non ci sono prove che il bottone 🧠 Mente sia stato cliccato da un player reale. La surface esiste (Gate 5 confermato in PR #1966), ma non è stata testata in condizioni di gioco reale.
3. **Sprint expectation T1→3 round non verificabile**: il claim "T1 internalized in 3 rounds" è confermato dai test automatizzati (76/76 verde), ma non da sessioni con giocatori reali.
4. **Gap T_F thoughts**: rilevato in audit `2026-05-06-mbti-ennea-audit.md` — `mbti_thoughts.yaml` ha 0 thoughts per asse T_F. Non bloccante per round-mode, ma riduce il numero di pensieri disponibili per gli attori con T_F dominante.

## Engine state (confermato LIVE)

| Layer | File | Status |
|---|---|:-:|
| Engine | `apps/backend/services/thoughts/thoughtCabinet.js` | ✅ LIVE |
| Bridge | `apps/backend/routes/sessionRoundBridge.js` | ✅ LIVE — emette `thought_internalized` |
| Routes | `apps/backend/routes/session.js` | ✅ LIVE — `mode='rounds'` default |
| Frontend | `apps/play/src/thoughtsPanel.js` | ✅ LIVE — 8-slot + Assign/Forget + progress bar |
| Tests engine | `tests/api/thoughtCabinet.test.js` | ✅ 59/59 verde |
| Tests routes | `tests/api/sessionThoughts.test.js` | ✅ 17/17 verde |

Engine non è la barriera. La barriera è l'assenza di sessioni live con giocatori reali.

## Recommendation

**P4 status: retrocedere 🟢 def → 🟢 candidato.**

Rationale: la promozione 🟢 def nel sprint handoff era condizionata all'adoption check schedulato oggi. Con zero dati di playtest reale, il pattern "Engine LIVE Surface DEAD" non può essere escluso empiricamente — la surface *esiste* e *funziona* in test, ma l'adozione da giocatori reali è sconosciuta.

**Azioni raccomandate per prossima sessione**:

1. **[BLOCCANTE] TKT-M11B-06 playtest live** — almeno 1 sessione con 2+ giocatori reali, scenario `enc_tutorial_01` o `enc_savana_beta`, con verifica che bottone 🧠 Mente venga cliccato almeno 1 volta e `thought_internalized` appaia nel telemetry log di sessione.
2. **[NICE-TO-HAVE] Telemetry hook**: aggiungere `thought_internalized` a `logs/qa/dashboard_metrics.jsonl` o simile per raccogliere dati automaticamente nelle prossime sessioni (oggi non è tracciato).
3. **[GAP T_F]** Valutare backfill di 3+ thoughts asse T_F in `mbti_thoughts.yaml` per completare copertura a 4/4 assi.

**Sprint candidato**: dopo TKT-M11B-06 pass con ≥1 `thought_internalized` event reale → promuovi P4 a 🟢 def confermato.

---

*Ref*: Sprint 6 handoff [`docs/planning/2026-04-27-sprint-6-thought-cabinet-handoff.md`](../planning/2026-04-27-sprint-6-thought-cabinet-handoff.md) · PR [#1966](https://github.com/MasterDD-L34D/Game/pull/1966) · stato-arte [§B.1.8](2026-04-27-stato-arte-completo-vertical-slice.md) · MBTI/Ennea audit [`2026-05-06-mbti-ennea-audit.md`](2026-05-06-mbti-ennea-audit.md).
