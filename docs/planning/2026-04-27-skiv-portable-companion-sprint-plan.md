---
title: 'Sprint plan — Skiv portable companion + crossbreeding async cross-player'
workstream: planning
category: sprint-plan
status: draft
owner: master-dd
created: '2026-04-27'
last_verified: '2026-04-27'
authority_level: A3
related:
  - docs/adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md
  - docs/reports/2026-04-27-stat-hybrid-tamagotchi-companion-research.md
  - docs/design/2026-04-27-skiv-companion-worldgen-integration.md
  - docs/skiv/CANONICAL.md
  - apps/backend/services/metaProgression.js
tags: [skiv, sprint-plan, crossbreeding, lineage, portable, async]
---

# Sprint plan — Skiv portable companion + crossbreeding async cross-player (S1 polish)

> **Effort target**: 25-30h, 6 phase sequenziali. Kickoff timing: post sign-off master-dd 5 decision points (vedi ADR §7).
> **Prerequisito**: ✅ OD-001 Path A Nido shipped Sprint A→D, `metaProgression.recordOffspring()` + helpers live (commit `639a90f7`).

## TL;DR

1. Schema portable v0.2.0 + Prisma optional → 2 endpoint share + 4 endpoint crossbreed → UI button export/import + preview modal → 15+ test → privacy review → docs + ADR promotion.
2. Pattern reuse: Sprint D Nido `recordOffspring()` zero refactor. Skiv canonical (Arenavenator vagans INTP) resta override per allenatore originale (B3 ibrido).
3. Risk top 3: DB scalability lineage graph, payload tampering, schema migration `0.1.0→0.2.0`. Mitigation in §Risk register.
4. DoD: AI regression 311/311 verde, format:check verde, ADR `proposed→accepted`, userland smoke test QR scan + crossbreed e2e flow.

---

## Phase 1 — Schema + Persistence (~7h)

**Output**: `skiv_saga.json` v0.2.0 + AJV validator + storage adapter.

| Task                                                                                                                                             | File chiave                                                                                                                          | Effort |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Estendi schema `skiv_saga.json` v0.2.0 (`lineage_id`, `companion_card_signature`, `crossbreed_history[]`, `voice_diary_portable[]`, `share_url`) | [`data/derived/skiv_saga.json`](../../data/derived/skiv_saga.json), [`tools/py/seed_skiv_saga.py`](../../tools/py/seed_skiv_saga.py) | ~2h    |
| AJV schema `packages/contracts/schemas/skiv_companion.schema.json` (additive, schema_version pinned)                                             | `packages/contracts/schemas/`, registra in [`apps/backend/app.js`](../../apps/backend/app.js)                                        | ~1.5h  |
| Reader backward-compat `0.1.0` (sentinel `_notes` lineage_id derivation)                                                                         | `apps/backend/routes/skiv.js` reader helper                                                                                          | ~1h    |
| (Opzionale) Prisma model `SkivCompanionState` + migration 0006                                                                                   | [`apps/backend/prisma/schema.prisma`](../../apps/backend/prisma/schema.prisma)                                                       | ~1.5h  |
| Storage adapter in-memory + Prisma write-through (pattern `formSessionStore`)                                                                    | `apps/backend/services/skiv/skivCompanionStore.js` NEW                                                                               | ~0.5h  |
| Test schema validation: 5 unit (valid v0.2.0, reader 0.1.0, missing field reject, signature stable, schema_version drift)                        | `tests/services/skivCompanionStore.test.js` NEW                                                                                      | ~0.5h  |

**Skip rule**: se Prisma migration scope creep → mantieni in-memory MVP, Prisma deferred a Phase 7.

---

## Phase 2 — Endpoint + Crossbreed Logic (~10h)

**Output**: 6 endpoint REST + gene mix algorithm + lineage chain wire.

| Task                                                                                                                                                                                  | File chiave                                                                                  | Effort |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ |
| `POST /api/skiv/crossbreed` — body partner_card_url\|partner_card_json → fetch+verify→preview offspring                                                                               | [`apps/backend/routes/skiv.js`](../../apps/backend/routes/skiv.js)                           | ~2h    |
| `POST /api/skiv/crossbreed/confirm` — commit offspring proposal → wire `recordOffspring()` Sprint D                                                                                   | [`apps/backend/services/metaProgression.js`](../../apps/backend/services/metaProgression.js) | ~1.5h  |
| `GET /api/skiv/crossbreed/history` — lista eventi crossbreed per `unit_id`                                                                                                            | `apps/backend/routes/skiv.js`                                                                | ~0.5h  |
| `GET /api/skiv/share/:lineage_id` (HTML render) + `?format=qr` (QR PNG) + `?format=json` (whitelist)                                                                                  | `apps/backend/routes/skiv.js`, libreria `qrcode` zero-dep                                    | ~2.5h  |
| Gene mix algorithm `crossbreedEngine.js` — 50/50 species (sentience-tier weighted), MBTI axes mean, mutations union cap=3, env mutation pick from importer biome `starter_trait_pool` | `apps/backend/services/skiv/crossbreedEngine.js` NEW                                         | ~2h    |
| Signature algorithm `cardSignature.js` — sha256 canonicalJson(whitelist) deterministic + verify                                                                                       | `apps/backend/services/skiv/cardSignature.js` NEW                                            | ~1h    |
| Apex exclude guard (clade_tag check pre-crossbreed)                                                                                                                                   | `crossbreedEngine.js`                                                                        | ~0.5h  |

**Wire Nido helpers** (Sprint D):

- `recordOffspring(parentA_unit, parentB_card, newLineageId, envMutation)` → registry append
- `getLineageChain(newLineageId)` → verifica catena include offspring
- `getTribesEmergent()` → ambassador conta verso threshold 3 (tribù implicita cross-player)
- Endpoint `GET /api/meta/lineage/:id` già supporta lookup da nuovo lineage_id

---

## Phase 3 — UI Extension (~5h)

**Output**: button export/import + QR generator + preview crossbreed modal in `skivPanel.js`.

| Task                                                                                                                    | File chiave                                                      | Effort |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| Button "🔁 Esporta Skiv" → fetch `/share/:lineage_id?format=qr` + display QR + copy URL clipboard                       | [`apps/play/src/skivPanel.js`](../../apps/play/src/skivPanel.js) | ~1.5h  |
| Button "📥 Importa altrui Skiv" → upload card / paste URL → POST `/crossbreed` → preview modal                          | `apps/play/src/skivPanel.js` + `apps/play/src/api.js`            | ~1.5h  |
| Preview crossbreed modal — mostra offspring proposal (species, MBTI mix, mutations cap=3, env mutation), confirm/cancel | `apps/play/src/skivPanel.js` (existing overlay pattern)          | ~1h    |
| Animazione crossbreed visual (riusa pattern Sprint C mating tier visual feedback)                                       | `apps/play/src/skivPanel.js` CSS extension                       | ~0.5h  |
| Anti-abuse warning UI ("rate-limit reached, try later", privacy disclosure)                                             | `apps/play/src/skivPanel.js`                                     | ~0.5h  |

**Pattern reuse**: overlay pattern già live (`STATE.overlayEl`, `injectStyles`), confirm modal pattern da `formsPanel.js` (M12 Phase C `080bf3b9`).

---

## Phase 4 — Test Coverage (~4h)

**Output**: 15+ test nuovi (unit + integration + E2E privacy).

| Suite                | File                                        | Test count | Cosa verifica                                                                        |
| -------------------- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| Schema validation    | `tests/services/skivCompanionStore.test.js` | 5          | v0.2.0 valid / v0.1.0 reader / signature stable / schema drift / missing field       |
| Gene mix algorithm   | `tests/services/crossbreedEngine.test.js`   | 4          | 50/50 species pick / MBTI axes mean / mutation cap=3 / Apex exclude reject           |
| Signature algorithm  | `tests/services/cardSignature.test.js`      | 3          | sha256 canonical stable cross-process / tampered payload reject / whitelist enforced |
| Endpoint integration | `tests/api/skivCrossbreed.test.js`          | 4          | export → import → preview → confirm full flow / rate-limit `/share` / QR format      |
| E2E privacy          | `tests/api/skivPrivacy.test.js`             | 3          | no PII leak in JSON / no `session_id` / no `_notes` / blacklist enforced             |
| **Totale**           |                                             | **19**     |                                                                                      |

**Smoke test addizionale userland** (manual, post-Phase 5): phone QR scan import flow, mock 2 player session.

---

## Phase 5 — Privacy + Anti-abuse Review (~2h)

**Output**: review checklist + sanitization layer + rate-limit verified.

| Check                                                              | Effort | Verdict gate                                                    |
| ------------------------------------------------------------------ | ------ | --------------------------------------------------------------- |
| Rate-limit `/api/skiv/share/:lineage_id` per IP (default 10/h)     | ~30min | Express middleware (`express-rate-limit` se non già installato) |
| Schema whitelist enforced server-side (test E2E privacy verde)     | ~30min | Test count 3/3 in `skivPrivacy.test.js`                         |
| Sanitization input crossbreed payload (URL whitelist domain check) | ~30min | Reject URL fuori da `process.env.SKIV_SHARE_BASE_URL`           |
| Signature verify obbligatoria (mismatch → reject 400)              | ~15min | Test `cardSignature.test.js:tampered payload reject` verde      |
| Documentation privacy disclosure UI                                | ~15min | Pattern Pokemon HOME share disclosure                           |

**Anti-abuse register**:

- Enumeration `lineage_id`: UUID-like 160bit entropy → impractical brute force
- Replay attack signature: signature pinned a `lineage_id + schema_version` → no cross-card replay
- DoS endpoint: rate-limit 10/h IP (configurable Q5 ADR §7)

---

## Phase 6 — Docs + ADR promotion (~1-2h)

**Output**: ADR `proposed → accepted`, sprint summary, museum card.

| Task                                                                                 | File                                                                                                                                 | Effort |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Promote ADR `proposed → accepted` post user sign-off 5 decision points               | [`docs/adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md`](../adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md) | ~15min |
| Update `docs/skiv/CANONICAL.md` con sezione "Crossbreeding async cross-player"       | [`docs/skiv/CANONICAL.md`](../skiv/CANONICAL.md)                                                                                     | ~30min |
| Sprint summary doc `docs/process/sprint-2026-MM-DD-skiv-portable-companion-close.md` | `docs/process/`                                                                                                                      | ~30min |
| Museum card nuova M-2026-04-27-019 `skiv-portable-companion-crossbreeding`           | `docs/museum/cards/skiv-portable-companion-crossbreeding.md` (via `repo-archaeologist`)                                              | ~30min |
| Update Museum card M-002 `mating_nido-engine-orphan` status `unintegrated → revived` | `docs/museum/cards/mating_nido-engine-orphan.md`                                                                                     | ~15min |
| Update `BACKLOG.md` con ticket close                                                 | [`BACKLOG.md`](../../BACKLOG.md)                                                                                                     | ~10min |

**ADR promotion gate**: tutti i 5 decision points §7 ADR risolti + sprint DoD §10 verdi.

---

## Risk register

| #   | Risk                                                                      | Probability | Impact | Mitigation                                                                                                                                           |
| --- | ------------------------------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | DB scalability lineage_id graph cross-player                              | Medium      | High   | Cap ambassador 10/Nido (Q2 default). Registry in-memory process-scoped resta pattern, Prisma optional Phase 1.                                       |
| R2  | Crossbreed payload tampering (player B injecta Skiv ultra-statted)        | Medium      | High   | Signature `sha256(canonicalJson(whitelist))` server-verify obbligatorio. Mismatch → reject 400. Test `cardSignature.test.js`.                        |
| R3  | Privacy leak telemetria personale (session_id, IP, email)                 | Low         | High   | Schema whitelist enforced server-side. Test E2E `skivPrivacy.test.js` 3 case. Signature ricalcolato post-sanitization, non client-side.              |
| R4  | Schema breaking change `skiv_saga.json` 0.1.0 → 0.2.0                     | Low         | Medium | Reader backward-compat (sentinel `_notes` lineage_id derive). `seed_skiv_saga.py` aggiornato a generare 0.2.0 default.                               |
| R5  | Endpoint `/share` enumeration attack (lineage_id scraping)                | Low         | Medium | Rate-limit 10/h IP (Q5 default). UUID 160bit entropy → impractical brute force. Audit log su pattern abuse-suspicious.                               |
| R6  | Skiv canonical (`Arenavenator vagans` INTP savana) sostituito accidentale | Low         | High   | B3 ibrido design rule guard (vedi `docs/design/2026-04-27-skiv-companion-worldgen-integration.md:107`). Trainer canonical override resta hard-coded. |
| R7  | Apex species sneak in via crossbreed (clade_tag check missing)            | Low         | High   | `crossbreedEngine.js` Apex exclude guard pre-mix. Test `crossbreedEngine.test.js:Apex exclude reject`.                                               |

**Top 3 (by Probability × Impact)**:

1. **R1 DB scalability** — cap 10/Nido + registry in-memory mitigation. Monitor Phase 7 followup.
2. **R2 Payload tampering** — signature verify obbligatorio, test verde.
3. **R3 Privacy leak** — whitelist enforced server-side, test E2E verde.

---

## DoD per sprint

1. ✅ AI regression 311/311 verde post-merge ogni Phase
2. ✅ `npm run format:check` verde
3. ✅ 15+ test nuovi (target 19, vedi Phase 4)
4. ✅ ADR `proposed → accepted` post sign-off master-dd
5. ✅ Sprint summary doc `docs/process/sprint-YYYY-MM-DD-skiv-portable-companion-close.md`
6. ✅ Userland smoke test (QR scan phone + crossbreed e2e flow → 1 ambassador in Nido di B)
7. ✅ Museum card M-2026-04-27-019 nuova + M-002 `revived`
8. ✅ BACKLOG ticket close + nuovi residui aperti (es. Phase 7 cloud sync, expire ambassador TTL)
9. ✅ Privacy review checklist tutti verdi (rate-limit + whitelist + signature + sanitization)
10. ✅ B3 ibrido invariant: Skiv canonical resta `Arenavenator vagans` INTP savana per `canonical_trainer_id`

---

## Sequencing + dipendenze

```
Phase 1 (schema+persist) → Phase 2 (endpoint+logic) → Phase 3 (UI) → Phase 4 (test) → Phase 5 (privacy review) → Phase 6 (docs+promote)
   |                            |                       |                |                |                          |
   schema additive         wire Sprint D            pattern overlay   target 19 test    rate-limit middleware    ADR accepted gate
   v0.1.0 → 0.2.0          recordOffspring          formsPanel reuse  + E2E privacy      + sanitization
```

**Parallel-safe**:

- Phase 4 test può iniziare insieme a Phase 2 endpoint (TDD pattern)
- Phase 6 docs può iniziare insieme a Phase 5 privacy review

**Blocker**:

- Phase 2 dipende STRETTO da Sprint D Nido `recordOffspring()` shipped — verificato HEAD `639a90f7`
- Phase 6 ADR promotion blocca su master-dd 5 decision points §7

---

## Skip rules / fast-track

Se user vuole **shippare MVP first** prima di crossbreeding full:

- Phase 1 + Phase 2 (solo `/share`) + Phase 3 (solo button export) + Phase 4 (5 test) + Phase 5 (privacy review) + Phase 6 promote
- Effort: ~12-15h (export-only, no crossbreed import)
- Risk: -R1, -R2, -R7 (no crossbreed = no offspring, no tampering surface)
- Trade-off: perde async cross-player innovation, ma sblocca QR share immediato per smoke test userland

**Decision gate**: user può richiedere fast-track post Phase 1 se schema validato verde.

---

## Test gating per Phase merge

| Phase | Test gate                                                        | Run command                                              |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| 1     | Schema validation 5/5                                            | `node --test tests/services/skivCompanionStore.test.js`  |
| 2     | Gene mix 4/4 + signature 3/3 + endpoint integration 4/4          | `node --test tests/api/skivCrossbreed.test.js`           |
| 3     | UI smoke test manual (button visible, QR display, modal preview) | userland browser inspect                                 |
| 4     | Test suite total 15-19 verdi                                     | `npm run test:api`                                       |
| 5     | Privacy 3/3 + rate-limit verified manual curl                    | `node --test tests/api/skivPrivacy.test.js` + curl probe |
| 6     | format:check + AI regression 311/311                             | `npm run format:check && node --test tests/ai/*.test.js` |

---

## File touched (impact map)

**NEW**:

- `apps/backend/services/skiv/skivCompanionStore.js`
- `apps/backend/services/skiv/crossbreedEngine.js`
- `apps/backend/services/skiv/cardSignature.js`
- `packages/contracts/schemas/skiv_companion.schema.json`
- `tests/services/skivCompanionStore.test.js`
- `tests/services/crossbreedEngine.test.js`
- `tests/services/cardSignature.test.js`
- `tests/api/skivCrossbreed.test.js`
- `tests/api/skivPrivacy.test.js`
- `docs/process/sprint-2026-MM-DD-skiv-portable-companion-close.md`
- `docs/museum/cards/skiv-portable-companion-crossbreeding.md`

**EDIT (additive)**:

- `apps/backend/routes/skiv.js` — +6 endpoint
- `apps/backend/services/metaProgression.js` — wire `recordOffspring()` da Sprint D (zero refactor)
- `apps/backend/app.js` — register AJV schema
- `apps/play/src/skivPanel.js` — +button + modal
- `apps/play/src/api.js` — +client method
- `data/derived/skiv_saga.json` — bump v0.2.0 + add fields
- `tools/py/seed_skiv_saga.py` — generate v0.2.0 default
- `docs/skiv/CANONICAL.md` — +section crossbreeding
- `docs/museum/cards/mating_nido-engine-orphan.md` — status `revived`
- `docs/adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md` — `proposed → accepted`
- `BACKLOG.md` — close ticket

**Optional Phase 1**:

- `apps/backend/prisma/schema.prisma` — +`SkivCompanionState` model
- `apps/backend/prisma/migrations/0006_skiv_companion/migration.sql`

---

## Kickoff timing

**Pre-conditions** (gating):

1. ✅ Sprint D Nido shipped (`639a90f7` `metaProgression.recordOffspring()` live)
2. 🟡 Master-dd sign-off 5 decision points ADR §7
3. ✅ AI regression baseline 311/311 verde
4. ✅ Worktree pulito + branch dedicato `feat/skiv-s1-polish-crossbreeding`

**Recommended kickoff**: post sign-off ADR + post merge plan PR #1862-#1868 (Wave A-D `docs/planning/2026-04-27-merge-plan-11-pr-session.md`). Crossbreeding non blocca quei merge ma ci si appoggia sopra (museum cards `worldgen-*` consumate).

**Sequence con altri sprint pending**:

- Boss Leviatano (~75-90h) — indipendente, può andare prima/dopo
- WorldState ADR-2026-04-26 — Phase 7 followup (post-MVP), può attendere

---

_Generato 2026-04-27 da research+design agent. NO codice impl. Aspetta sign-off ADR §7 per kickoff._
