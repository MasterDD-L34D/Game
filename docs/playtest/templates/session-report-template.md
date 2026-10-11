---
title: 'Session report template — M11 co-op playtest'
workstream: playtest
category: template
status: draft
owner: master-dd
created: 2026-04-26
tags:
  - playtest
  - session-report
  - template
  - m11
---

# Playtest session — [DATA]

## Meta

- **Data**: YYYY-MM-DD
- **Durata**: Xh Ym
- **Player count**: N (incluso host)
- **Scenari giocati**: `enc_tutorial_XX`, ...
- **Build**: commit `xxxxxxx` su `main`
- **Network**: ngrok tunnel / LAN / localhost

## Flow

### Round count + outcome per scenario

| Scenario        | Round completati | Outcome | Durata | Note   |
| --------------- | :--------------: | :-----: | ------ | ------ |
| enc_tutorial_01 |        5         |   win   | 8m     | smooth |
| ...             |                  |         |        |        |

## Metriche

| Metrica                        | Valore | Target        | Pass |
| ------------------------------ | ------ | ------------- | :--: |
| RTT intent → broadcast p50     | Xms    | <1500ms ngrok | ✓/✗  |
| RTT intent → broadcast p95     | Xms    | <3000ms ngrok | ✓/✗  |
| Reconnect success rate         | X/Y    | ≥90%          | ✓/✗  |
| Host log relay success         | X/Y    | 100%          | ✓/✗  |
| Crash count                    | N      | 0             | ✓/✗  |
| UX confusion questions / round | N      | ≤1            | ✓/✗  |
| Fun rating media (1-5)         | X.X    | ≥4.0          | ✓/✗  |

## Bug trovati

Link bug report per ciascuno in `templates/bug-report-template.md`:

- [ ] TKT-PLAYTEST-01 — P0 — ...
- [ ] TKT-PLAYTEST-02 — P1 — ...
- ...

## UX insights

### Positivi

- ...

### Frustrations

- ...

### Requests

- ...

## Decisions

- [ ] **P5 🟢 bump?** Criteria: 3+ round/scenario + ≥4 player + 0 P0 + fun ≥4/5 → sì/no perché
- [ ] Fix prioritari next sprint
- [ ] Modifiche scope M12/M13/M14

## Follow-up

- [ ] Update `CLAUDE.md` sprint context
- [ ] Update memory `project_playtest_YYYY_MM_DD.md`
- [ ] Open ticket backlog per bug P0/P1
- [ ] Se 🟢 bump: `docs/planning/2026-04-20-pilastri-reality-audit.md` update

## Raw notes

Dump inline note sessione.
