---
title: 'Merge plan — 11 PR sessione design 2026-04-26+27'
workstream: planning
category: merge-plan
status: draft
owner: master-dd
created: 2026-04-27
authority_level: A3
tags:
  - merge-plan
  - sprint-close
  - claude-code-handoff
related:
  - docs/planning/2026-04-26-v3-canonical-flow-decisions.md
  - docs/planning/2026-04-26-leviatano-sprint-plan.md
---

# Merge plan — 11 PR sessione design 2026-04-26+27

> **Scopo**: ordine sequenza merge raccomandato per ridurre rischio conflitti + massimizzare evidence-base disponibile a ogni step.

## TL;DR

1. **Wave A (1 PR)**: synthesis evidence FIRST — sblocca museum cards visible per agent successivi
2. **Wave B (4 PR parallel)**: quick wins data wire — indipendenti tra loro
3. **Wave C (1 PR)**: telemetria VC compromesso — dipende da nessuno, può andare con Wave B
4. **Wave D (4 PR sequenced)**: Nido Path A — A → B+D → C (rispetta dipendenze data flow)
5. **Wave E**: post-merge → Boss Leviatano sprint kickoff (~75-90h)

Effort merge: ~30-60min totali con squash + verifica AI regression dopo ogni Wave.

---

## Wave A — Synthesis evidence (1 PR)

| PR                                                       | Titolo                                         | Conflitti possibili  | Note                                                                                 |
| -------------------------------------------------------- | ---------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| [#1866](https://github.com/MasterDD-L34D/Game/pull/1866) | docs(synthesis): worldgen + design v3 evidence | Nessuno (solo docs/) | Merge FIRST — sblocca 7 museum cards + 9 reports + 3 ADR + v3 doc per altri PR/agent |

**Verifica post-merge**:

- `git fetch origin main && git log --oneline -3` su altri worktree
- Museum cards `docs/museum/cards/worldgen-*.md` accessible

---

## Wave B — Quick wins data wire (4 PR, parallel safe)

| PR                                                       | Titolo                                | File chiave                                                                  | Test nuovi |
| -------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| [#1862](https://github.com/MasterDD-L34D/Game/pull/1862) | role_templates → biomeSpawnBias       | `apps/backend/services/combat/biomeSpawnBias.js` + `biomePoolLoader.js` NEW  | 26         |
| [#1863](https://github.com/MasterDD-L34D/Game/pull/1863) | Skiv lifecycle + aspect_token visible | `apps/play/src/render.js`                                                    | 23         |
| [#1864](https://github.com/MasterDD-L34D/Game/pull/1864) | bioma diff_base → pressure runtime    | `apps/backend/services/combat/biomeModifiers.js` NEW + `routes/session.js`   | 12         |
| [#1865](https://github.com/MasterDD-L34D/Game/pull/1865) | 16 starter_bioma trait + endpoint     | `data/core/traits/active_effects.yaml` + `glossary.json` + `routes/forms.js` | 24         |

**Conflitti tra PR B**:

- #1862 + #1864: entrambi toccano `apps/backend/routes/session.js`. Verifica conflict prima di merge.
- #1863 isolato (frontend render.js)
- #1865 isolato (forms + traits)

**Suggestion ordine merge B**:

1. #1865 (isolato) → #1863 (isolato) → #1862 (route session diff additive) → #1864 (route session diff additive)
2. Dopo ogni merge: `npm run test:api` su main aggiornato

---

## Wave C — Telemetria VC compromesso (1 PR)

| PR                                                       | Titolo                             | Conflitti          | Note                                                                                             |
| -------------------------------------------------------- | ---------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| [#1868](https://github.com/MasterDD-L34D/Game/pull/1868) | Telemetria VC compromesso (5 task) | Nessuno con Wave B | Può andare con Wave B (file separati: `vcScoring.js`, `mbtiSurface.js`, `characterPanel.js` NEW) |

**Verifica post-merge**:

- `node --test tests/services/vcScoring*.test.js` su main → 68/68 verde
- AI regression 311/311 verde

---

## Wave D — Nido Path A (4 PR, sequenced)

⚠️ Rispettare ordine — dipendenze data flow.

### D.1 Sprint A — Hub + unlock

| PR                                                       | Titolo                                      | File chiave                                                          | Note             |
| -------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- | ---------------- |
| [#1876](https://github.com/MasterDD-L34D/Game/pull/1876) | Sprint A — nestHub panel + biome_arc unlock | `apps/play/src/nestHub.js` NEW + `sessionHelpers.js` checkNidoUnlock | Crea scaffold UI |

**Merge first**: gli altri 3 sprint Nido (B/C/D) dipendono dalla esistenza di `nestHub.js` (placeholder Mating tab + Lineage tab). Append-only pattern usato dai successivi.

### D.2 Sprint B + Sprint D (parallel safe)

| PR                                                       | Titolo                                    | File chiave                                                                          | Note                                 |
| -------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------ |
| [#1875](https://github.com/MasterDD-L34D/Game/pull/1875) | Sprint B — debrief recruit wire           | `apps/play/src/debriefPanel.js` + `routes/meta.js` extension                         | Indipendente da C/D                  |
| [#1874](https://github.com/MasterDD-L34D/Game/pull/1874) | Sprint D — lineage chain + tribe emergent | `metaProgression.js` append + `routes/meta.js` 3 endpoint + nestHub Lineage tab fill | Append-only pattern, no break su A/C |

**Conflitti possibili**:

- #1875 + #1874: entrambi toccano `routes/meta.js`. Append additive — verifica conflict, risolvi se necessario.
- #1875 + #1874: entrambi toccano `metaProgression.js`. #1874 dichiara append-only (recordOffspring + getLineageChain + getTribesEmergent + getTribeForUnit). #1875 dichiara `metaProgression.js` READ-ONLY. Zero conflict atteso.

### D.3 Sprint C — Mating + visual tier

| PR                                                       | Titolo                                          | File chiave                                                                                        | Note                 |
| -------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------- |
| [#1877](https://github.com/MasterDD-L34D/Game/pull/1877) | Sprint C — mating roll + 3-tier visual feedback | `metaProgression.js` rollMating + `routes/meta.js` mating endpoints + `nestHub.js` Mating tab fill | Merge LAST in Wave D |

**Conflitti possibili con D**:

- `metaProgression.js`: Sprint C aggiunge `rollMatingOffspring`. Sprint D aggiunge `recordOffspring + getLineageChain + ...`. Append-only protetto. Schema offspring atteso da Sprint D = `{unit_id, lineage_id, parents:[a,b], born_at_session, born_at_biome}` — Sprint C deve produrre questo schema.
- Sprint D fornisce **adapter fallback** se schema diverso (`parents=[]`, lineage_id fallback unit_id). Quindi merge order C→D possibile, ma D→C più safe (D ha fallback, C no).

**Verifica post-Wave D**:

- `node --test tests/services/metaProgression*.test.js` → 89 nuovi totali (14+18+25+32) verde
- `node --test tests/api/meta*.test.js` → tutti endpoint verdi
- AI regression 311/311 verde

---

## Wave E — Post-merge actions

### E.1 Promote v3 doc → SoT v6

`docs/planning/2026-04-26-v3-canonical-flow-decisions.md` (A3) → `docs/core/00-SOURCE-OF-TRUTH.md` v6 (A2). Comporta:

- Rewrite SoT v5 incorporating decisions
- Patch §13 stato implementativo con new wires
- Update §3-§5 con worldgen runtime status
- Chiusura v3 doc come superseded

Effort: ~3-4h doc work.

### E.2 Boss Leviatano sprint kickoff

ADR signed (3 ADR `accepted`). Sprint A → B → C sequenziali (~75-90h totali). Vedi [docs/planning/2026-04-26-leviatano-sprint-plan.md](2026-04-26-leviatano-sprint-plan.md).

Pre-requisites:

- ✅ Wave D merged (Nido lineage chain provides offspring lineage_id schema for environmental mutation Sprint C)
- ✅ ADR `accepted` (done 2026-04-27)
- ✅ Vertical slice acceptance criterion (2128 LOC HTML reference)

### E.3 Open follow-up sprints

Da specs ready:

1. **Forme 10-stadi Phase A** (~7h): naming `Stadio` + lifecycle YAML extension Skiv + style guide patch
2. **Skiv worldgen-aware companion wire** (~3h): companionService.js + skivPanel.js wire pool
3. **5-axes UI mapping wire** (~9h): formule Agile + Memoria + 3-axes vs 5-axes UI decision pending
4. **Wiki Codex Wave 9** (~13.5h): 6-dim schema + Skiv-instance note + QBN unlock
5. **Mutagen events handler** (~14-16h): 4 eventi wire + handler + counterplay logic

---

## Risk register

| Rischio                                                     | Mitigation                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Merge conflict #1862+#1864 routes/session.js                | Verifica diff prima merge, append additive                                            |
| #1875+#1874+#1877 routes/meta.js triple conflict            | Append-only pattern, sequence merge B→D→C                                             |
| Sprint D adapter fallback nasconde Sprint C schema mismatch | Verifica post-merge: `getTribesEmergent()` ritorna tribe non-empty con offspring veri |
| Worktree branch agent obsolete post-merge                   | Cleanup worktree directories `agent-*` post merge                                     |
| Governance docs failure post merge                          | Run `python tools/check_docs_governance.py --strict` post ogni merge                  |

---

## Effort totale stima

- Wave A merge: ~5min
- Wave B merge (4 PR): ~15min
- Wave C merge: ~5min
- Wave D merge (4 PR sequenced): ~20min
- Verifica AI regression post-Wave: ~5min × 4 = 20min
- **Totale ~60min con verifica completa**

---

## Authority

A3 sintesi merge plan. Esegue master-dd o Claude su autorizzazione esplicita. Squash merge raccomandato (mantiene history pulita).
