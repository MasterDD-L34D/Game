---
title: 'Next session kickoff — 3 sprint prompt pronti (C → B → A)'
workstream: planning
category: handoff
status: draft
owner: master-dd
created: 2026-04-21
tags:
  - kickoff
  - session-handoff
  - sprint-prep
  - token-optimization
related:
  - docs/planning/2026-04-20-integrated-design-map.md
  - docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md
---

# Next session kickoff — 3 sprint pronti

Session 2026-04-20/21 chiuso con 15+ PR merged + 5/5 P0 closed. Questo doc contiene **3 prompt ready-to-paste** ottimizzati per Claude Code next session(s). Sequenza raccomandata: **C → B → A** (warm-up → medium → big rock).

## Quick stats session chiusa

| Item                   |                          Valore |
| ---------------------- | ------------------------------: |
| PR merged today        |                              15 |
| Lines changed          |                           ~22k+ |
| Issues aperte          | 2 (#1673 parked, #1674 pending) |
| P0 gap closed          |                             5/5 |
| Prerequisites Prompt 4 |                     ✅ verified |

## Sessione strategy — perché multi-session

**Sequential 1-per-volta** è best practice:

- Branch indipendenti → zero merge conflict
- Context window Claude Code fresco per sprint (compaction-safe)
- Token burn ammortizzato (session che supera 500k tok su stesso task = ridotto ROI)

Soglia **kill-60 intra-session**: se un singolo task supera 3-4h wall-clock → ferma, WIP commit, nuova session continua.

## Branch naming convention (preparato)

Incolla i prompt su branch preesistenti o lascia Claude Code auto-crearli:

- Prompt C: `feat/trait-env-costs-pilot` (issue #1674)
- Prompt B: `feat/meta-prisma-persistence` (Prompt 4)
- Prompt A: `feat/m11-jackbox-network-phase-a` (M11 big rock)

---

## Prompt C — Costo ambientale trait pilot (~6-8h, START HERE)

**Scope**: chiude issue #1674. Pattern proven. Warm-up per verifica flow.

```text
Leggi:
- docs/planning/2026-04-21-triage-exploration-notes.md §Issue Draft 2
- GitHub issue #1674
- packs/evo_tactics_pack/data/balance/trait_mechanics.yaml
- data/core/balance/damage_curves.yaml (pattern schema reference)
- apps/backend/services/traitEffects.js (target wire)

Task: ship pilot 4 trait × 3 biomi.
- 4 trait shipping: thermal_armor, zampe_a_molla, pelle_elastomera, denti_seghettati
- 3 biomi shipping: savana, caverna_risonante, rovine_planari
- Matrix 12 cell stat modifier ±1/±2

Deliverable atomici:
1. data/core/balance/trait_environmental_costs.yaml NEW — schema v1.0 + 12 cell
2. apps/backend/services/traitEffects.js — nuovo hook biome penalty su session init
3. tests/ai/traitEnvironmentalCosts.test.js — 4 scenari (trait × biome applica delta)
4. docs/adr/ADR-2026-04-21c-trait-environmental-costs.md — ACCEPTED con scope
   pilot limit
5. docs/governance/docs_registry.json — registra ADR
6. Close GitHub issue #1674 al merge

Scope creep guard STRICT:
- NO generalizzare oltre 4×3 pre-playtest validation
- NO nuovo economy channel (solo stat_delta runtime)
- NO Prisma persistence (trait costs sono session-scoped compute)

Effort target: ~6-8h single session.
```

**Perché prima**: effort contenuto, pattern YAML-driven già proven (damage_curves), test-first easy. Verifica che Claude Code aggancia GitHub issue correttamente.

---

## Prompt B — Prisma persistence metaProgression (~11h)

**Scope**: chiude L06 parziale. Prereq verificati + baseline test shippato in questo PR (`tests/ai/metaProgression.test.js` 37/37 verdi).

```text
Leggi:
- docs/planning/2026-04-20-integrated-design-map.md §3 L06 + §5 Prompt 4
- apps/backend/services/metaProgression.js (194 LOC, 11 funzioni in-memory)
- apps/backend/routes/meta.js (7 endpoint, NON 6 come diceva integrated-map)
- apps/backend/prisma/schema.prisma (ha già 4 model M10: Campaign, Chapter,
  PartyRoster, SaveSnapshot)
- tests/ai/metaProgression.test.js (baseline 37/37 safety net — NON rompere)

Task: progetta persistence Prisma per metaProgression.

Schema proposto (RENAME per evitare collision con PartyRoster):
- NpcRelation (NON "SquadMember", evita confusion con PartyRoster PG-controlled)
- AffinityLog (audit trail delta affinity)
- TrustLog (audit trail delta trust)
- NestState (nest level + biome + requirements)
- MatingEvent (roll history + outcome + offspring traits)

Migration strategy:
1. Baseline test (shipped): 37/37 verdi. Mantenere verdi end-to-end.
2. Adapter pattern: metaProgression.js wrappa Prisma client + fallback
   in-memory se DATABASE_URL non set (dev demo ngrok compat).
3. routes/meta.js NON cambia shape API (7 endpoint backward-compat).
4. Migration file generate via `prisma migrate dev --name add_meta_progression`.

Warning pre-impl:
- Datasource schema.prisma attualmente postgresql (line 9). ADR-04-21 diceva
  SQLite. Decidere: swap o keep?
- Contract test: POST /api/meta/affinity + GET /api/meta/npg post-swap
  deve returnare stessa shape JSON.

NON implementare:
- PI pack spender runtime (task successivo, ADR dedicata)
- UI Nido panel (M11-adjacent)
- Cross-session Prisma seed automatic (manual seed OK MVP)

Effort target: ~11h (schema 2h + migration 3h + adapter 3h + contract test 3h).

Output PR:
- ADR-202X-meta-progression-prisma
- schema.prisma extended + migration file
- services/metaProgression.js adapter
- tests baseline 37/37 verdi + nuovi contract test (~5 test post-swap)
```

**Perché seconda**: hi-value P2 closure (L06 part), prerequisiti verified, baseline test pronto. Rischio regression ridotto dal safety net.

---

## Prompt A — M11 Jackbox co-op TV (~20h, big rock)

**Scope**: chiude Pilastro 5 network multi-client. Spezza in 2 sub-session se serve.

```text
Leggi:
- docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md §Sprint M11
- docs/planning/2026-04-20-integrated-design-map.md §3 L07
- memory reference_external_repos.md §Tier Jackbox/Colyseus
- apps/backend/app.js (wire router pattern esistente)

Task: M11 Phase A — Jackbox room-code WebSocket backend.

Scope Phase A (~8-10h):
- services/network/wsSession.js NEW: WebSocket server + 4-letter room code
  generator + host-authoritative state
- routes/lobby.js NEW: POST /api/lobby/create, POST /api/lobby/join,
  POST /api/lobby/close, GET /api/lobby/state
- Integration con campaign engine esistente (host fa choice vincolante)
- Tests integration 4-player sync + reconnect edge cases

Pattern proven (3 OSS clones):
- hammre/party-box (WebSocket + 4-letter code)
- axlan/jill_box (React+Python WS server)
- InvoxiPlayGames/johnbox (Jackbox reimpl)

Fallback Colyseus (tier 2 se Jackbox pattern insufficient):
- docs/adr/ADR-2026-04-14-networking-colyseus.md già proposed
- Adattivo: keep Jackbox se 4-player funziona OK

Non toccare:
- Demo :3334 backend fino a merge + deploy finale (user restart ngrok autonomo)
- Frontend lobby UI (Phase B next session)
- Campaign engine (già shipped M10, reuse routes esistenti)

Warning:
- WebSocket ports Windows: 3334 demo + 5180 Vite + 3340 calibration riservati.
  Scegli 3341 o 8080 per WS.
- Phase B UI frontend: ~6-10h next session dopo Phase A merge.

Effort Phase A: ~8-10h. Se finisce in 1 session, open PR draft +
next session Phase B UI picker frontend.

Output PR:
- ADR-202X-m11-jackbox-phase-a (network architecture + room-code spec)
- services/network/wsSession.js + routes/lobby.js
- tests/api/lobbyRoutes.test.js (4-player + reconnect)
- app.js wire
```

**Perché ultima**: big rock 20h totale. Best attention unbroken. Spezzabile in A1 (backend ~10h) + A2 (frontend ~10h) se serve.

---

## Ottimizzazioni cross-session

### Ridurre token burn

1. **Skip markdown playtest per-iter** (Flint kill-ceremony applicato). Solo commit msg + INDEX.md 1-line per calibration runs.
2. **Non pre-write ADR stub** per tutti e 3 — troppo presuntuoso. Scriverai al momento.
3. **Reuse test pattern** da campaignRoutes.test.js (Phase B M10) — già proven HTTP integration.
4. **No deep audit inside single sprint** — if audit needed, spawn separate session.

### Session-startup optimization

Apertura Claude Code in terminale:

```bash
cd /c/Users/VGit/Desktop/Game
claude
```

Prima linea conversazione: **incolla UN solo prompt** sopra. Claude Code:

- Crea branch da origin/main fresh
- Legge i file indicati
- Execute task + test + commit + push + PR
- Close GitHub issue se applicabile

### Warning comuni

1. **Codex P2 bot review** inevitable. Fix piccolo + push. Non saltare.
2. **Prettier pre-commit hook** autoformats. File show come modificato post-commit = linter, non tuo.
3. **Replace_all safety hook** triggera su `state/action/turn/player` rename massive. Controllato, puoi ignorare warning se replace_all non usato intenzionalmente.
4. **Docs governance registry**: ogni nuovo canonical doc (`source_of_truth: true`) DEVE essere registrato. Imparato da Codex review #1676.

### Demo :3334 ngrok

Demo frozen post-sessione. Per riavviare:

```bash
cd /c/Users/VGit/Desktop/Game
PORT=3334 nohup node apps/backend/index.js > /tmp/demo-backend.log 2>&1 &
cd apps/play
nohup npx vite --host 0.0.0.0 --port 5180 > /tmp/demo-vite.log 2>&1 &
# ngrok http 5180 (in altro terminale)
```

Note: ngrok serve `vite` porta 5180, che fa proxy `/api` → backend 3334 via `vite.config.js` esistente.

---

## Session-startup checklist

Copia-incolla ogni volta:

1. [ ] `cd /c/Users/VGit/Desktop/Game`
2. [ ] `git fetch origin main && git status` — verify working tree pulito
3. [ ] Apri Claude Code
4. [ ] Incolla UN solo prompt (C o B o A)
5. [ ] Attendi Claude completi task + PR aperta
6. [ ] Review Codex bot comments (P2/P1 se presenti)
7. [ ] Fix + push se Codex warning
8. [ ] Merge PR quando CI verde
9. [ ] (Se issue legata) verify GitHub issue chiusa
10. [ ] Chiudi sessione, log riposo

## Metadati sessione 2026-04-20/21 (reference)

### PR merged (15)

`#1657, #1658, #1659, #1660, #1661, #1662, #1663, #1664, #1665, #1666, #1667, #1668, #1669, #1670, #1671, #1672, #1676`

### Issues

- #1673 BiomeMemory — parked M12+
- #1674 Costo ambientale trait — **pending Prompt C**
- #1675 Onboarding 60s — **closed by #1676**

### Ultimo sprint

M10 Campaign cluster COMPLETO (A-E), P6 turn_limit_defeat validated (iter8 win IN BAND), concept material tracked (47 file), Prompt 1+2+3 integrated-map executed, L05 P0 Onboarding closed.

## Reminders cross-session

1. **M11 Jackbox LOCKED** dopo M10 per strategy
2. **Prompt 4 prerequisites** ✅ verified (L02+L03 closed)
3. **Baseline test metaProgression** 37/37 verdi shipped
4. **Playtest M3 human** pending user schedule (T04/T05 FRICTION #5/#6/#7)
5. **Issue #1674** P0 pilot, start Prompt C

## Autori

- Master DD (next-session prep request)
- Claude Opus 4.7 (kickoff doc + baseline tests)
- Flint advisor (kill-60 multi-session discipline)
