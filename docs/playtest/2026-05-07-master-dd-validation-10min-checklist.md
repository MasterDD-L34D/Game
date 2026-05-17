---
title: 'Master-dd 10min validation checklist — phone smoke retry post-harness'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-07
source_of_truth: false
language: it
review_cycle_days: 7
related:
  - docs/playtest/2026-05-07-phone-smoke-harness-automated-coverage.md
  - docs/playtest/2026-05-05-phone-smoke-results.md
  - docs/playtest/2026-05-05-phone-smoke-step-by-step.md
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/godot-v2/deploy-quickstart.md
tags: [playtest, phone, smoke, validation, master-dd, checklist, cutover, godot-v2]
---

# Master-dd validation checklist 10min — phone smoke retry

Post-harness shipped 2026-05-07 (17 test automated covering B5+B2+5R+airplane regression). Master-dd hands-on residue ridotto a **3 item physical-only** non automatable. Eseguire prima di ADR-2026-05-05 status swap PROPOSED → ACCEPTED Phase A.

## Pre-flight (60s, no phone)

```bash
# Game/ harness
cd C:/Users/VGit/Desktop/Game/.claude/worktrees/dazzling-mirzakhani-20117a
node --test tests/api/phaseChangeBroadcast.test.js tests/api/airplaneReconnect.test.js
# Expect: 11/11 pass

# Godot v2 harness
cd C:/Users/VGit/Desktop/Game-Godot-v2
/c/Users/VGit/AppData/Local/Godot/Godot_v4.6.2-stable_win64_console.exe \
  --headless -s addons/gut/gut_cmdln.gd \
  -gtest=res://tests/integration/test_combat_5round_p95.gd -gexit
# Expect: 6/6 pass
```

**STOP se rosso**: harness deve essere verde prima di phone validation. Investigate fail prima di procedere.

## Deploy (~30s, terminal aperto, no phone)

```bash
cd C:/Users/VGit/Desktop/Game-Godot-v2
./tools/deploy/deploy-quick.sh
```

**Output atteso**: stampa `https://<random>.trycloudflare.com` URL ephemeral. Lasciare terminal aperto.

URL phone: `https://<random>.trycloudflare.com/phone/`

## Item 1 — Cross-device real RTT (~3min, 2 phone)

**Why manual**: WAN RTT >50ms via Cloudflare geographic non simulabile Node.

**Steps**:

1. Phone A (Android Chrome): apri `https://<random>.trycloudflare.com/phone/` → tap **Crea Stanza** → screen mostra codice 4-lettere XXXX
2. Phone B (iOS Safari): apri `https://<random>.trycloudflare.com/phone/?room=XXXX` → tap **Entra** → vede "Connesso come <name>"
3. Phone A (host): tap **Inizia mondo (host)** → entrambi phone advance fuori da MODE_WAITING
4. Browser DevTools (laptop): apri `https://<random>.trycloudflare.com/api/lobby/list` → verify lobby attiva con 2 player

**Pass criteria**:

- ✅ Phase advance entrambi phone <2s post-tap host (B5 phase_change runtime live)
- ✅ Codice visibile post-Create (B1 fix preserved)
- ✅ Deep-link `?room=XXXX` pre-compila code (B4 reproduced)

**Fail criteria**:

- ❌ Phase advance >5s o solo 1 phone (B5 regression)
- ❌ Codice non mostrato post-Create (B1 regression)

## Item 2 — Combat 5 round + p95 reading (~4min, 2 phone)

**Why manual**: real-device input latency (touch → render → WS → backend) non simulabile harness GUT.

**Steps**:

1. Continuando da Item 1, host tap **Inizia combat** (assume world_setup → combat phase wired)
2. Run 5 round combat con azioni reali su entrambi phone (attack, move, ability)
3. Apri Godot console fallback (browser DevTools console su phone host) → cerca log `[telemetry] p95_ms=<N>` post-round 5
4. Annota p95 + verdict label

**Pass criteria**:

- ✅ p95 < 100ms → verdict PASS
- 🟡 p95 100-200ms → verdict CONDITIONAL (accettabile per demo Phase A)

**Fail criteria**:

- ❌ p95 > 200ms → verdict ABORT (Phase A blocker, investigare hot path)
- ❌ Sample count <5 (combat aborted) → INSUFFICIENT_DATA, retry

## Item 3 — Airplane mode 5s reconnect (~2min, 1 phone)

**Why manual**: mobile browser tab background WS pause behavior browser-specific, non Node-emulable.

**Steps**:

1. Phone A (host) durante combat: attiva **Airplane Mode** (notification panel → toggle airplane)
2. Conta **30 secondi** (silent)
3. Disattiva airplane mode → riprende rete → phone retry WS reconnect automatico
4. Verify session preserved: vede stessa room + stesso ruolo + stato combat round corrente

**Pass criteria**:

- ✅ Reconnect <10s post-airplane-off
- ✅ Session preserved (host preserved, no transfer fired in <90s grace window)
- ✅ State combat ledger replayed (round + intent visible)

**Fail criteria**:

- ❌ Reconnect timeout >30s
- ❌ Session perduta (`room_closed` toast) — possibile B2 grace regression
- ❌ Host transferred a player B prematuramente

## Aggregate verdict

Compila tabella post-3-item:

| Item                 | Pass / Fail / Conditional | Note                   |
| -------------------- | :-----------------------: | ---------------------- |
| 1 Cross-device RTT   |                           |                        |
| 2 Combat 5R p95      |                           | p95=\_\_\_ ms, verdict |
| 3 Airplane reconnect |                           |                        |

**Decision tree**:

- **3/3 PASS** → ADR-2026-05-05 swap a `ACCEPTED Phase A 2026-05-XX`. Esegui §"ADR transition commands" sotto.
- **2/3 PASS + 1/3 CONDITIONAL** (item 2 p95 100-200ms) → ADR ACCEPTED Phase A con monitoring 7gg + caveat in plan v3.
- **2/3 PASS + 1/3 FAIL** → ADR resta PROPOSED, investigate root cause failed item, retry post-fix.
- **<2/3 PASS** → ADR resta PROPOSED, considera scenario downgrade (Scenario 2 web-only delay).

## ADR transition commands (post 3/3 PASS)

```bash
cd C:/Users/VGit/Desktop/Game/.claude/worktrees/dazzling-mirzakhani-20117a

# 1. Apply ADR ACCEPTED patch
# Edit docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md per:
#   - frontmatter doc_status: draft → active
#   - Stato: PROPOSED → ACCEPTED Phase A 2026-05-XX
#   - §2 row C3: 🟡 CONDITIONAL → 🟢 PASS
#   - §3 trigger §3 row 3: 🟡 → 🟢

# 2. Update CLAUDE.md sprint context entrambi repo
# Game/CLAUDE.md → Sprint context aggiornato post-cutover Phase A
# Game-Godot-v2/CLAUDE.md → primary frontend confirmed

# 3. Update plan v3
# docs/planning/2026-04-29-master-execution-plan-v3.md → Fase 3 Phase A LIVE

# 4. Commit + PR
git add docs/adr/ADR-2026-05-05-* docs/playtest/2026-05-07-* CLAUDE.md docs/planning/*
git commit -m "docs(adr): cutover Fase 3 Phase A ACCEPTED post-validation 2026-05-XX"
gh pr create --title "docs(cutover): ADR-2026-05-05 ACCEPTED Phase A" --body "..."
```

## Anti-pattern preserved

- **Verify before claim done** (CLAUDE.md): ogni item ha pass/fail criteria esplicite + numeric threshold
- **No manual test when automatable**: harness 17 test catch B5+B2+5R+airplane → master-dd 3 item solo physical-only residue
- **Engine LIVE Surface DEAD**: Item 2 includes "p95 reading via console" — ogni test surface debt accepted with explicit fallback (Godot console no UI yet HUD widget pending Sprint M.7)
