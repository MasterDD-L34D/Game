---
title: Playbook Playtest 90 min — 2026-04-29
workstream: ops-qa
category: playtest
doc_status: active
doc_owner: claude-code
last_verified: '2026-04-25'
source_of_truth: false
language: it
review_cycle_days: 14
tags:
  - playtest
  - playbook
  - co-op
  - 90-min
  - printable
related:
  - docs/playtest/2026-04-26-coop-full-loop-playbook.md
  - docs/playtest/2026-04-26-pre-session-checklist.md
  - docs/playtest/2026-04-29-playbook-90min.html
---

# Playbook Playtest 90 min — 2026-04-29

## TL;DR

Playbook stampabile A4 fronte ×2 per sessione co-op 4-player vs Sistema. Sequenza tempificata 8 phase (setup → briefing → tutorial 01-05 → debrief), 20 friction items checklist, 9 skip rules, materials + pre-session T-30, risk register 5 voci, note+raccolta dati grid.

**File HTML stampabile**: [`2026-04-29-playbook-90min.html`](2026-04-29-playbook-90min.html). Apri Chrome → Ctrl+P → A4 portrait → Background graphics ON → 2 pagine fronte.

## Audit context

**Sessione 2026-04-25 sera**: 17 PR autonomous mergiati main, audit pillar reality:

| Pillar        | Stato verificato                                                | Effort to 🟢  |
| ------------- | --------------------------------------------------------------- | ------------- |
| P1 Tattica    | 🟢 round model + 18/18 ability + 7 status FSM + hex grid        | 0h            |
| P2 Evoluzione | 🟢c+ (V3 Mating engine OD-001 orphan deferrable)                | 12-15h opt    |
| P3 Specie×Job | 🟢 7 jobs + 84 perks + 5 passive tags                           | 0h            |
| P4 MBTI/Ennea | 🟡 enneaEffects.js orphan 93 LOC mai required                   | 6-8h          |
| P5 Co-op      | 🟡 M11 Phase A-C live · TKT-M11B-06 mai eseguito userland       | 2-4h userland |
| P6 Fairness   | 🟢c mission timer + biome bias + SG · HC07 calibration pendente | 1-2h tune     |

**Verdict Wednesday playtest**: 🟡 **AMBER** — GO con scope tutorial 01-05 quartet flow.

## Effort estimate

- **Wednesday-ready** (90-min playbook funzionante): **~6-8h**
- **TUTTO MVP playable end-to-end** (campaign loop closed): ~30-40h (gated user OD-001 decision per ~15h V3 Mating)
- **All pillars 🟢 verified post-playtest**: +2-4h userland

## Top 5 must-fix-by-Wed (~6-8h)

1. **Smoke 90-min sequence end-to-end local** 2-browser Incognito (~1h) — confidence baseline
2. ~~Tutorial 02-05 runtime gap~~ → **falso allarme**: tutorial 02-05 LIVE in `apps/backend/services/tutorialScenario.js` JS service (non YAML). Verificato 2026-04-25.
3. Hardcore 07 N=10 calibration harness run (~1h) — `python tools/py/batch_calibrate_hardcore07.py`
4. F-1 host-transfer round_ready rebroadcast se 4+ player atteso (~1h)
5. Pre-session checklist dry run T-30 esecuzione (vedi sezione E del playbook)

## Skip rules quick ref

- Setup > 12 min ngrok rotto → LAN-only Vite IP locale via WhatsApp
- T01 > 14 min → skip T02 vai T03
- Party wipe < 5 turni → non riprovare, continua
- T03 confonde → spiega 30s + 1 retry max
- T04 > turno 15 senza win → vai T05 o HC
- T05 inizia dopo 1:15 → skip → Debrief
- HC dopo 1:20 → NON iniziare → Debrief
- Backend crash → restart, sessione persa = nuova
- WS reconnect loop > 30s → fallback `LOBBY_WS_ENABLED=false`

## User decisions blocking

Nessuno blocking Wednesday. Deferrable:

- **OD-001 V3 Mating Path A/B/C** (50-80h sunk) — verdict needed PRE-M14, NOT pre-Wed
- **OD-013 MBTI surface A/B/C/skip** — P4 closure deferrable
- **OD-002 V6 polish** — explicitly post-playtest
- **OD-003 Triangle rollout sequence** — post-playtest

## Print instructions

```bash
# Browser
Ctrl+P → A4 portrait → Margins "Default" → Background graphics ON → 2 pagine fronte

# Headless via Chrome (CLI)
chrome --headless --disable-gpu --print-to-pdf=playbook.pdf docs/playtest/2026-04-29-playbook-90min.html
```

## Materials needed

Vedi sezione D del playbook HTML. Highlights:

- 1 laptop host + TV/monitor + HDMI
- 4 phone Chrome / 4 browser su 4 device
- ngrok pre-auth + Node 22 + npm
- 1 copia stampata + penna + timer fisico

## Ref

- Sequence design: pcg-level-design-illuminator agent 2026-04-25
- Audit gap: general-purpose agent 2026-04-25 sera
- Pre-session checklist canonical: [`2026-04-26-pre-session-checklist.md`](2026-04-26-pre-session-checklist.md)
- Co-op full loop: [`2026-04-26-coop-full-loop-playbook.md`](2026-04-26-coop-full-loop-playbook.md)
- Bug report template: [`templates/bug-report-template.md`](templates/bug-report-template.md)
- Session report template: [`templates/session-report-template.md`](templates/session-report-template.md)
