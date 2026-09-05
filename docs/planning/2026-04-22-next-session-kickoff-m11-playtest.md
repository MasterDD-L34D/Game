---
title: 'Next session kickoff — M11 live playtest + Pilastro 5 🟢 close'
workstream: planning
category: handoff
status: draft
owner: master-dd
created: 2026-04-22
tags:
  - kickoff
  - session-handoff
  - m11-phase-d
  - tkt-m11b-06
  - pilastro-5
related:
  - docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md
  - docs/planning/2026-04-21-m11-phase-b-close.md
  - docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md
---

# Next session kickoff — M11 live playtest (Pilastro 5 🟢)

Sessione 2026-04-20 chiude l'intera sprint M11 Phase B → Phase C + TKT-05 host-transfer. **Stack 4 PR mergiati in main**:

| PR                                                       | Commit     | Scope                                                                                                        | Test   |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| [#1682](https://github.com/MasterDD-L34D/Game/pull/1682) | `d35dde92` | M11 Phase B — lobby.html + network.js (LobbyClient + reconnect) + spectator overlay + basic bridge           | 5 e2e  |
| [#1686](https://github.com/MasterDD-L34D/Game/pull/1686) | `d14b2655` | M11 Phase B+ — phone intent UI composer + host relay → `declareIntent` + campaign live-mirror (TKT-01/02/03) | +2 e2e |
| [#1684](https://github.com/MasterDD-L34D/Game/pull/1684) | `583be2a8` | M11 Phase C — host TV roster panel + body role classes + ngrok playbook (TKT-04/06 partial)                  | +1 e2e |
| [#1685](https://github.com/MasterDD-L34D/Game/pull/1685) | `d97eb5f8` | M11 TKT-05 — host-transfer on disconnect, FIFO first-come, backward-compatible `host_transferred` broadcast  | +3 e2e |

**Test totali lobby stack**: 11 e2e + 15 Phase A REST/WS + 307 AI = **333/333**. Format:check verde. Zero nuove deps (ws@8.18.3 pre-installato da Phase A).

## Stato Pilastro 5 (Co-op vs Sistema)

- Pre-M11: 🟡 (zero rete)
- Phase A (2026-04-20): 🟡 beachhead backend
- Phase B/B+/C/TKT-05 (2026-04-20): **🟡 (flow + resilience 100% chiuso)**
- **TKT-M11B-06 playtest live ngrok → 🟢**

Manca solo esecuzione userland. Playbook pronto: [`docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md`](../playtest/2026-04-21-m11-coop-ngrok-playbook.md).

## Prompt next session

### Opzione A — TKT-M11B-06 playtest live (P1, chiude P5 🟢)

```text
Leggi:
- docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md (setup + script)
- docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md (protocollo)

Task: eseguire playtest live M11 co-op.

Setup (prompt aiuta user, NON autonomo):
1. User configura 2 tunnel ngrok (HTTP 3334 + WS 3341)
2. User build frontend con VITE_LOBBY_WS_URL
3. User recluta 2-4 amici via share URL
4. User esegue 3 scenario dal playbook (Tutorial 01 duo → Tutorial 05 quartet → Campaign mirror)

Durante sessione:
- Monitorare backend log per ✖ intent relay / errori WS
- Catturare metriche (RTT, reconnect success rate, fun rating)
- Annotare bug runtime (P0/P1/P2)

Output post-playtest:
- docs/playtest/2026-04-XX-m11-coop-demo-live.md report
- Ticket nuovi per bug trovati
- Se successo: update CLAUDE.md §Pilastri → 🟢
- Se failure: analisi + Phase D plan (persistence / rate-limit / host-transfer tuning)
```

### Opzione B — M12 big rock P2 full Form evoluzione (~35h, Spore-core)

Se user non disponibile per playtest live, big rock successivo:

```text
Leggi:
- docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md §Sprint M12
- docs/planning/2026-04-20-pilastri-reality-audit.md §P2
- docs/core/15-PI-PACK-FORME.md (reference design)

Task: M12 Sprint kickoff — Pilastro 2 full evoluzione ciclo runtime.

Scope: deferito da M10. Richiede Form runtime + evoluzione triggered + PI pack
spender integrato in campaign loop. Pattern Spore (non Wesnoth).

Effort: ~35h, 2-3 sprint. Split:
- M12.A (~12h): Form registry + evoluzione trigger + state machine
- M12.B (~12h): PI pack spender runtime integration + UX
- M12.C (~11h): Visual feedback + tests + playtest
```

### Opzione C — Refactor/polish P2/P3 residuali

- TKT-M11B-04 widescreen TV canvas layout polish (P2, ~3h)
- Prisma room persistence adapter (P3, ~5h) — utile se deploy pubblico post-playtest
- Rate-limit / DoS hardening su wsSession (P3, ~3h)

## Baseline snapshot post-merge

```bash
cd /c/Users/VGit/Desktop/Game
git fetch origin main
git checkout main  # d97eb5f8
node --test tests/ai/*.test.js                                # 307/307 ✓
node --test tests/api/lobbyRoutes.test.js tests/api/lobbyWebSocket.test.js  # 15/15 ✓
node --test tests/e2e/lobbyEndToEnd.test.mjs                  # 11/11 ✓
npm run format:check                                          # verde (salvo drift pre-esistente trait-glossary.json)
```

## Quick start — co-op demo locale (dev)

```bash
# Terminal 1
cd /c/Users/VGit/Desktop/Game
npm run start:api                      # backend :3334 + WS :3341

# Terminal 2
npm run play:dev                       # Vite :5180

# Browser
open http://localhost:5180/lobby.html  # host crea stanza
# phone / altro browser tab usa share URL
open http://localhost:5180/lobby.html?code=XXXX  # player joins
```

## Warning / constraint next session

- **NON toccare `apps/backend/services/network/wsSession.js`** senza ADR addendum — protocollo wire stabile post-TKT-05.
- **NON toccare `apps/play/src/network.js` LobbyClient event schema** — downstream bridge + tests dipendono.
- **NON committare binari** sotto `reports/backups/**` (lint:backups enforcement).
- **Caveman mode attivo** di default per tutte le risposte tecniche.

## Follow-up tracked

- **TKT-M11B-04** canvas TV widescreen polish (P2)
- **TKT-M11B-06** playtest live (P1, questo doc)
- **M12 P2 Spore evo** (big rock, deferred)
- Prisma room persistence (P3)
- Rate-limit (P3)

## Riferimenti utili

- ADR protocollo: [`docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md`](../adr/ADR-2026-04-20-m11-jackbox-phase-a.md)
- Phase B close: [`docs/planning/2026-04-21-m11-phase-b-close.md`](2026-04-21-m11-phase-b-close.md)
- Playbook ngrok: [`docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md`](../playtest/2026-04-21-m11-coop-ngrok-playbook.md)
- Strategy M9-M11: [`docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md`](2026-04-20-strategy-m9-m11-evidence-based.md)
- Pilastri audit: [`docs/planning/2026-04-20-pilastri-reality-audit.md`](2026-04-20-pilastri-reality-audit.md)
