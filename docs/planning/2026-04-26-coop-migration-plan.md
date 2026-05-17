---
title: 'Co-op migration plan — sprint M16-M20 sequenza + effort + rollback'
workstream: cross-cutting
category: migration
status: draft
owner: master-dd
created: 2026-04-26
tags:
  - migration
  - plan
  - coop
  - m16
  - m17
  - m18
  - m19
  - m20
  - sprint
related:
  - docs/planning/2026-04-26-coop-truths.md
  - docs/planning/2026-04-26-coop-mvp-spec.md
---

# Co-op migration plan — da ora a mockup demo-ready

Da filosofia `03 §Decisione strategica sulla migrazione`:

> _"Quando rifattorizzare / quando estrarre core nuovo / quando ricostruire."_

**Decisione per Evo-Tactics co-op**: **rifattorizzare incrementalmente**. Tutti i moduli core (session, roundOrchestrator, forms, progression) esistono e sono stati validati. Serve:

1. Nuovo layer orchestrazione sopra (`coopOrchestrator`)
2. UI fasi mancanti (character / world / debrief)
3. Fix gap M15 P0 (mapping PG, round clear, phase transitions)

**NO** ricostruzione da zero. **NO** nuovo repo. **NO** rewrite core game logic.

---

## 1. Sintesi piano

5 sprint sequenziali, ~4-6h ciascuno. Totale autonomous ~22-30h. Ogni sprint = 1-2 PR focused. Ogni PR mergeable indipendentemente + rollback 1-click.

Demo-ready amici dopo M18. Polish + persistenza M19-M20.

## 2. Struttura operativa

### M16 — Fix P0 shipped M15 + coopOrchestrator skeleton (~4h)

**Sblocca**: gioco esistente non crasha dopo round 1.

| Task                                                                         | Effort | File                             |
| ---------------------------------------------------------------------------- | ------ | -------------------------------- |
| Bug fix: `/session/start` accetta `characters` param → unità con `owner_id`  | 1h     | `apps/backend/routes/session.js` |
| Bug fix: `main.js` host chiama `sendRoundClear` post `/round/execute`        | 0.5h   | `apps/play/src/main.js`          |
| Bug fix: server auto-transition phase `planning → ready` quando `all_ready`  | 1h     | `wsSession.js`                   |
| Nuovo: `services/coopOrchestrator.js` skeleton (class + phase machine vuota) | 1h     | new                              |
| Test: verifica `owner_id` in units, phase transitions                        | 0.5h   | `tests/api/`                     |

**PR #1**: `feat(coop-m16): P0 fixes + coopOrchestrator skeleton`

**Deliverable**: 2-browser smoke senza bug fase 1.

---

### M17 — Character Creation UI + REST (~6h)

**Sblocca**: player sceglie PG.

| Task                                                                                | Effort | File                          |
| ----------------------------------------------------------------------------------- | ------ | ----------------------------- |
| REST `POST /api/coop/run/start` (host) + `POST /api/coop/character/create` (player) | 1.5h   | `routes/coop.js` new          |
| Server-side validation: form_id in pool, species in pool, nome not empty            | 0.5h   | `coopOrchestrator.js`         |
| UI phone `characterCreation.js` + CSS (card swipeable 16 form + species grid)       | 3h     | `apps/play/src/` new          |
| UI TV: roster `character_ready_list` visualizzato (riuso roster panel)              | 0.5h   | `lobbyBridge.js`              |
| WS msg `phase_change`, `character_submit`, `character_ready_list`                   | 0.5h   | `wsSession.js` + `network.js` |

**PR #2**: `feat(coop-m17): character creation phase (phone pick form + TV roster)`

**Deliverable**: 4 amici creano PG diversi visibili su TV + phone. Host forza inizio combat.

---

### M18 — World Setup + Combat integration + demo-ready (~6h)

**Sblocca**: run completa 1 scenario.

| Task                                                                         | Effort | File                  |
| ---------------------------------------------------------------------------- | ------ | --------------------- |
| REST `POST /api/coop/world/vote` + `POST /api/coop/world/confirm` (host)     | 1h     | `routes/coop.js`      |
| UI phone `worldSetup.js` + CSS (card proposta + vote buttons)                | 2h     | `apps/play/src/` new  |
| UI TV: world setup panel con proposta attiva + tally voti                    | 1h     | `lobbyBridge.js`      |
| Wire `coopOrchestrator.startCombat(scenario, characters)` → `/session/start` | 1h     | `coopOrchestrator.js` |
| Timer world setup 60s auto-default                                           | 0.5h   | server timer          |
| Test E2E: run lobby→character→world→combat fino fine scenario                | 0.5h   | `tests/e2e/`          |

**PR #3**: `feat(coop-m18): world setup + combat loop integration (MVP demo-ready)`

**Deliverable**: **🟢 Playtest live amici possibile**. 2-4 amici completano enc_tutorial_01 end-to-end.

---

### M19 — Debrief UI + form evolve + narrative log (~4h)

**Sblocca**: progressione post-round + feedback narrativo.

| Task                                                                    | Effort | File                                |
| ----------------------------------------------------------------------- | ------ | ----------------------------------- |
| REST `POST /api/coop/debrief/choice` (player pick perk/evolve)          | 0.5h   | `routes/coop.js`                    |
| UI phone `debriefPanel.js` + CSS (level up + perk pair + evolve option) | 2h     | `apps/play/src/` new                |
| Wire `progression.applyXp` + `forms.evolve` + `formEvolution.evaluate`  | 1h     | `coopOrchestrator.js`               |
| Narrative log generation da `log[]` eventi combat → testo italiano      | 0.5h   | `services/narrative.js` (riuso ink) |

**PR #4**: `feat(coop-m19): debrief phase + form evolve + narrative log post-round`

**Deliverable**: run multi-scenario con progressione PG.

---

### M20 — Persistenza + polish + playtest tooling (~4h)

**Sblocca**: resilienza + telemetria.

| Task                                                                          | Effort | File                               |
| ----------------------------------------------------------------------------- | ------ | ---------------------------------- |
| Prisma model `CoopRun` + `CoopCharacter` (opt-in `LOBBY_PRISMA_ENABLED=true`) | 2h     | `prisma/schema.prisma` + migration |
| Timer UI pozz phone (countdown planning 30s)                                  | 0.5h   | `phoneComposerV2.js`               |
| Bug report inline phone (screenshot consent + short text)                     | 1h     | `apps/play/src/feedback.js`        |
| Playtest session report template auto-populated                               | 0.5h   | `docs/playtest/templates/`         |

**PR #5**: `feat(coop-m20): Prisma persist + playtest tooling + polish`

**Deliverable**: demo stabile, restart-resilient, telemetria minima.

---

## 3. Gantt visualizzato

```
M16 (4h)  █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  P0 fixes
M17 (6h)  ░░░█████░░░░░░░░░░░░░░░░░░░░░░  Character
M18 (6h)  ░░░░░░░░░█████░░░░░░░░░░░░░░░░  World + Combat
M19 (4h)  ░░░░░░░░░░░░░░░█████░░░░░░░░░░  Debrief
M20 (4h)  ░░░░░░░░░░░░░░░░░░░░█████░░░░░  Persist + polish
                   ↑                    ↑
           demo-ready               polished demo
           (post-M18)               (post-M20)
```

## 4. Rischi + mitigation

| Rischio                                       | Probab     | Impact | Mitigation                                                                    |
| --------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------- |
| Gap trovati in M16 che richiedono altro M16.5 | alta       | medio  | Time-box 5h; se sborda, split in M16.A + M16.B PR separate                    |
| User non soddisfatto dopo M18 demo            | media      | alto   | Playtest con 1 amico vero dopo ogni M16-M20; feedback loop corto              |
| Drift specifiche durante execution            | media      | medio  | Ritorno a `coop-mvp-spec.md` prima di ogni PR; immutabile salvo user override |
| Forms pool (16 MBTI) troppe scelte paralisi   | bassa      | basso  | MVP espone solo 4 forms base (ISTJ/ESFP/ENTJ/INFP); altre post-playtest       |
| PI/PE progression rompe balance               | bassa      | basso  | MVP deferrer PI; solo level-up XP                                             |
| Chat abuse                                    | bassissima | basso  | MVP no moderazione; alpha solo amici fidati                                   |

## 5. Rollback

| Layer          | Rollback                                                                    |
| -------------- | --------------------------------------------------------------------------- |
| Ogni PR        | `git revert <sha>` + redeploy/rebuild, <5 min                               |
| M16-M20 intero | `git revert` commits sequenza; back a M15 UI + gap P0 noti                  |
| Back a pre-M15 | Feature flag `UI_V2_ENABLED=false` già previsto ADR M15; script .bat legacy |
| Full uninstall | `rm -rf Game/apps/play/dist` + `git checkout main`                          |

## 6. Criteri accettazione ogni PR

1. `npm run test:backend` verde (no regression)
2. Nuovo test E2E per feature shippata
3. `npm run format:check` verde
4. Spec in doc: tutte le user story toccate checked off
5. Smoke manuale 2-browser documentato

## 7. Handoff post-M20

Quando M20 merged:

- [ ] Update `CLAUDE.md` sprint context con M16-M20 completi
- [ ] Scrivere `docs/process/sprint-2026-XX-M16-M20-close.md`
- [ ] Playtest live 4 amici → report in `docs/playtest/2026-XX-coop-mockup-live.md`
- [ ] Se report positivo → bump P5 🟢 definitivo + celebrazione
- [ ] Se report negativo → pivot spec / nuovo doc truths iterazione 2

## 8. Prossimi passi immediati

1. **User review** 3 doc (`coop-truths` + `coop-mvp-spec` + `coop-migration-plan`)
2. User approva/modifica. Se modifica scope → aggiorno doc in place.
3. User conferma avvio M16 → execution autonomous.
4. M16 PR in ~4h. Smoke test 2-browser. User prova.
5. Continua fino M18 = demo-ready. Inviti amici.
6. Playtest reale. Feedback. M19-M20 polish.

## Riferimenti

- Doc 1: [coop-truths.md](2026-04-26-coop-truths.md)
- Doc 2: [coop-mvp-spec.md](2026-04-26-coop-mvp-spec.md)
- Filosofia: `02_LIBRARY/03_First_Principles_Repo_Game_Claude_Code.md` §Piano di migrazione
- Registry docs: dovrà essere aggiornato in PR #1 M16
