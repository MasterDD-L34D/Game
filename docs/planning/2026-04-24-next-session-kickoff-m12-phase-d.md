---
title: 'Next session kickoff — M12 Phase D (Pilastro 2 🟢 close) / TKT-M11B-06 playtest / Prisma P3'
workstream: planning
category: handoff
status: draft
owner: master-dd
created: 2026-04-24
tags:
  - kickoff
  - session-handoff
  - m12-phase-d
  - pilastro-2
  - m11-phase-d
related:
  - docs/adr/ADR-2026-04-23-m12-phase-a-form-evolution.md
  - docs/core/PI-Pacchetti-Forme.md
  - docs/planning/2026-04-20-pilastri-reality-audit.md
  - docs/planning/2026-04-22-next-session-kickoff-m11-playtest.md
---

# Next session kickoff — post M12 Phase C close

Sessione 2026-04-23 chiude M11 full stack merge (handoff precedente) + **M12 Phase A+B+C**. Pilastro 2 resta 🟡++ (engine + persistence + pack roller + frontend UI live).

## Stack PR mergiati M12 (sessione 2026-04-23)

| PR                                                       | Commit     | Phase | Scope                                                | Test |
| -------------------------------------------------------- | ---------- | ----- | ---------------------------------------------------- | ---- |
| [#1689](https://github.com/MasterDD-L34D/Game/pull/1689) | `0d26ca6a` | A     | `FormEvolutionEngine` + 5 endpoint + 5 regole gating | 25   |
| [#1690](https://github.com/MasterDD-L34D/Game/pull/1690) | `578e1cc9` | B     | `formSessionStore` + `packRoller` + 7 endpoint       | 27   |
| [#1691](https://github.com/MasterDD-L34D/Game/pull/1691) | `080bf3b9` | C     | `formsPanel.js` + `api.js` client + 🧬 Evo button    | 5    |

**Test totali M12 suite**: **57 test** (16 engine unit + 9 route + 6 store + 11 pack + 10 session+pack route + 5 panel). Grand total main post-merge: **390/390** verde.

## Stato Pilastro 2 (Evoluzione emergente)

- Pre-M12: 🔴 (dataset shipped, zero runtime)
- **Phase A** (2026-04-23): 🔴 → 🟡 (engine + endpoint REST)
- **Phase B** (2026-04-23): 🟡 → 🟡+ (session persistence + PI pack roller)
- **Phase C** (2026-04-23): 🟡+ → **🟡++** (frontend panel UI discoverable)
- **Phase D next** (~4-6h): 🟡++ → 🟢 candidato

## Prompt next session

### Opzione A — M12 Phase D (P2 🟢 close, ~4-6h autonomous) ⭐ raccomandato

```text
Leggi:
- docs/adr/ADR-2026-04-23-m12-phase-a-form-evolution.md (scope + fuori scope)
- apps/backend/services/forms/formEvolution.js (engine)
- apps/backend/services/forms/formSessionStore.js (store + _prisma slot reserved)
- apps/backend/routes/campaign.js (/advance endpoint → hook point)
- apps/backend/services/vcScoring.js (vc_snapshot shape)
- apps/play/src/formsPanel.js (panel UI)

Task: M12 Phase D — chiudi Pilastro 2 (🟢).

Scope Phase D (~4-6h):
1. Campaign advance trigger: estendere /api/campaign/advance response
   con campo additivo { evolve_opportunity: true } su
   outcome === 'victory' AND pe_earned >= 8.
   Wire in formsPanel: openFormsPanel automatico post-advance se flag set.
2. VC snapshot live pipe: main.js legge /api/session/:id/vc dopo
   commitRound, salva in state.world.vc_snapshot. formsPanel
   getVcSnapshot callback ora restituisce dati reali (non fallback 0.5).
3. Animated form transition: on evolve success, render toast + sprite
   flash su PG (riusa anim.js flashUnit). Durata ~1s, non bloccante.
4. Prisma adapter formSessionStore._prisma: wire seed/get/update via
   tabella FormSessionState (nuovo schema migration).

Pattern file esistenti:
- apps/backend/services/metaProgression.js (Prisma adapter con fallback)
- apps/backend/routes/session.js /vc endpoint già esistente
- apps/play/src/anim.js flashUnit + pushPopup

Non toccare:
- apps/backend/routes/session.js (guardrail)
- apps/backend/services/network/wsSession.js (protocollo stabile)
- data/core/forms/mbti_forms.yaml (spec canonico)

Effort: ~4-6h. Branch: feat/m12-phase-d-trigger-vc-anim-prisma.

Output:
- Campaign advance trigger + wire panel (~1h)
- VC pipe + state sync (~1h)
- Evolve animation + toast (~1h)
- Prisma adapter + migration + tests (~2h)
- Baseline preserve 390/390 → 400+ totale
- ADR addendum in ADR-2026-04-23-m12-phase-a
```

### Opzione B — TKT-M11B-06 playtest live (userland, chiude P5 🟢)

Non-autonomo. Richiede user + 2-4 amici + setup ngrok.

```text
Leggi:
- docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md (setup + script)
- docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md (protocollo)

Task: eseguire playtest live M11 co-op.

Setup userland:
1. User configura 2 tunnel ngrok (HTTP 3334 + WS 3341)
2. User build frontend con VITE_LOBBY_WS_URL=wss://...
3. User recluta 2-4 amici via share URL
4. User esegue 3 scenario dal playbook

AI-side: monitorare backend log + catturare metriche + annotare bug.

Output: docs/playtest/2026-04-XX-m11-coop-demo-live.md report.
Se success → bump P5 🟢 + update CLAUDE.md §Pilastri.
```

### Opzione C — Prisma P3 adapter (~5h autonomous)

Production-ready persistence per forms + lobby rooms:

```text
Task: wire Prisma backend per formSessionStore._prisma slot + lobby.

Scope:
1. Schema migration FormSessionState + LobbyRoom tables
2. formSessionStore Prisma adapter con fallback in-memory (pattern
   metaProgression.js)
3. wsSession Room persistence optional (env LOBBY_PRISMA_ENABLED)
4. Migration tests + smoke test deploy

Effort: ~5h.
```

## Backlog globale residuo

| Item                                                         | Priorità |  Autonomo?  |
| ------------------------------------------------------------ | :------: | :---------: |
| **M12 Phase D** — campaign trigger + VC pipe + anim + Prisma |    P1    |     ✅      |
| **TKT-M11B-06** playtest live ngrok                          |    P1    | ❌ userland |
| **Prisma P3** persistence adapter (forms + lobby)            |    P2    |     ✅      |
| M13+ big rock next (P3 progression / P4 MBTI / P6 hardcore)  |    P2    |     ✅      |

## Baseline snapshot post-sessione

```bash
cd /c/Users/VGit/Desktop/Game
git fetch origin main
git checkout main  # 080bf3b9 (HEAD post-M12.C)
node --test tests/ai/*.test.js                                # 307/307 ✓
node --test tests/api/lobbyRoutes.test.js tests/api/lobbyWebSocket.test.js  # 15/15 ✓
node --test tests/e2e/lobbyEndToEnd.test.mjs                  # 11/11 ✓
node --test tests/api/formEvolution.test.js tests/api/formsRoutes.test.js tests/api/formSessionStore.test.js tests/api/packRoller.test.js tests/api/formsRoutesSessionPack.test.js tests/api/formsPanelInfer.test.js  # 57/57 ✓
npm run format:check                                          # verde (solo trait-glossary.json drift pre-esistente)
```

## Quick start — forms demo locale

```bash
# Terminal 1
npm run start:api         # backend :3334

# Terminal 2
npm run play:dev          # Vite :5180

# Browser
open http://localhost:5180
# click PG → click 🧬 Evo header → overlay con 16 form cards
# seleziona form eligibile → click "Evolvi" → state aggiornato
# click "🎲 Roll pack" → d20/d12/SCELTA combo preview
```

## Pilastri stato live post-M12.C

|  #  | Pilastro                |            Stato            |
| :-: | ----------------------- | :-------------------------: |
|  1  | Tattica leggibile       |             🟢              |
|  2  | Evoluzione emergente    | **🟡++** (3/4 fasi shipped) |
|  3  | Identità Specie × Job   |             🟡              |
|  4  | Temperamenti MBTI/Ennea |             🟡              |
|  5  | Co-op vs Sistema        |    🟡 (playtest pending)    |
|  6  | Fairness                |             🟡              |

**Score**: 1/6 🟢 + 5/6 🟡 (nessun 🔴). P2 e P5 candidati 🟢 next session.

## Warning / constraint next session

- **NON toccare** `apps/backend/routes/session.js` (guardrail 851 LOC, owner-lock)
- **NON toccare** `apps/backend/services/network/wsSession.js` senza ADR addendum (protocollo M11 stabile)
- **NON committare** binari sotto `reports/backups/**` (lint:backups enforcement)
- **Schema M12 stabile**: `FormSessionState` shape è caller-supplied, Prisma adapter deve mappare senza breaking changes a api client
- **Caveman mode attivo** default

## Follow-up tracked

- **M12 Phase D** — campaign trigger + VC pipe + anim + Prisma (P1, questo doc)
- **TKT-M11B-06** playtest live (P1, userland)
- **Prisma P3** adapter forms + lobby (P2)
- **M13 big rock** — P3 character progression / P4 MBTI completamento / P6 hardcore fix (P2)

## Riferimenti utili

- ADR M12.A: [`docs/adr/ADR-2026-04-23-m12-phase-a-form-evolution.md`](../adr/ADR-2026-04-23-m12-phase-a-form-evolution.md)
- Canvas B design: [`docs/core/PI-Pacchetti-Forme.md`](../core/PI-Pacchetti-Forme.md)
- Handoff M11: [`docs/planning/2026-04-22-next-session-kickoff-m11-playtest.md`](2026-04-22-next-session-kickoff-m11-playtest.md)
- Playbook ngrok (per Opzione B): [`docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md`](../playtest/2026-04-21-m11-coop-ngrok-playbook.md)
- Pilastri audit: [`docs/planning/2026-04-20-pilastri-reality-audit.md`](2026-04-20-pilastri-reality-audit.md)
- Strategy M9-M12: [`docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md`](2026-04-20-strategy-m9-m11-evidence-based.md)
