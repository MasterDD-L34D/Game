---
title: 'ADR-2026-04-27 — Skiv portable companion + crossbreeding async cross-player'
doc_status: accepted
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 90
related:
  - docs/reports/2026-04-27-stat-hybrid-tamagotchi-companion-research.md
  - docs/skiv/CANONICAL.md
  - docs/design/2026-04-27-skiv-companion-worldgen-integration.md
  - docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md
  - data/derived/skiv_saga.json
  - apps/backend/routes/skiv.js
  - apps/backend/services/metaProgression.js
tags: [skiv, companion, crossbreeding, lineage, portable, async, social]
---

# ADR-2026-04-27 — Skiv portable companion + crossbreeding async cross-player

**Status**: accepted (sign-off master-dd 2026-04-27 sera, defaults Q4-Q8 confirmed: privacy whitelist subset, cap 10 ambassador per Nido, permanent ambassador, cooldown 1/campagna, rate-limit 10/h IP. Phase 1 schema + persistence shipped in this PR)
**Decision date**: 2026-04-27
**Accepted date**: 2026-04-27
**Effort impl**: 25-30h (Sprint S1-polish, 6 phase). Phase 1 ~7h shipped; Phase 2-6 pending.
**Prerequisites**: OD-001 Path A Nido shipped (Sprint A→D, 4 PR `9d1182ae`/`9efccc26`/`b7f4fff5`/`639a90f7`), `metaProgression.js:recordOffspring()` + `getLineageChain()` + `getTribesEmergent()` live in main.

## Context

Sessione 2026-04-26 sera batch 2: user conferma "S1 polish perfetto" → wire crossbreeding async cross-player con Skiv come **portable creature-ambassador**. Pattern target NON Tamagotchi 1996 care-simulation (vedi research base [`docs/reports/2026-04-27-stat-hybrid-tamagotchi-companion-research.md:23`](../reports/2026-04-27-stat-hybrid-tamagotchi-companion-research.md#L23)).

**Distinzione concettuale chiave** (research base §3, line 240-296):

- **Skiv-archetype** = pattern narratore+compagno, persona canonical (`Arenavenator vagans`, INTP, savana, "Sabbia segue.")
- **Skiv-instance** = istanza generativa per run, da `data/core/companion/skiv_archetype_pool.yaml:1` (8 biomi × 8-12 nomi × 2-3 specie)
- **B3 ibrido** (decisione user 2026-04-26): Skiv canonical override solo per allenatore originale; altri run/co-op partner generano da pool

**S1 MVP** (~5h, già autorizzato come additive):

- Endpoint `GET /api/skiv/card?format=share` (HTML card + QR + JSON download)
- File `skiv_saga.json` come export portabile (8 diary entries, MBTI axes, mutations, progression — vedi [`data/derived/skiv_saga.json:1`](../../data/derived/skiv_saga.json))

**S1 polish** (~25-30h, questo ADR): crossbreeding async cross-player. Player A esporta carta → Player B importa → endpoint `/crossbreed` propone offspring 3rd-gen con lineage misto, environmental mutation dal bioma di B.

**Pattern reference primary-sourced** (research base §2):

- **Spore Sporepedia** ([Chris Hecker Liner Notes](https://chrishecker.com/My_Liner_Notes_for_Spore)) — recipe compatta cross-community share, NPC del tuo creature appare nel mondo altrui
- **CK3 DNA string + legacy character** ([CK3 wiki Characters modding](https://ck3.paradoxwikis.com/index.php?title=Characters_modding)) — congenital traits trasmissibili, lineage chain multi-generazionale
- **Pokemon HOME** ([home.pokemon.com](https://home.pokemon.com/)) — identity persistente cross-game, "Visit" status, NO care simulation in storage layer
- **Wildermyth legacy character** ([Wildermyth wiki Theme](https://wildermyth.com/wiki/Theme)) — personaggio "legato" passa scars + transformation a capitolo successivo

**Convergence**: i 4 sistemi storici concordano su: identità portabile + recipe compatta + lineage trasmissibile + NO care simulation puro. Questo ADR codifica quel pattern per Skiv.

**Prerequisito Nido shipped**: Sprint D (`639a90f7`) ha esposto:

- `metaProgression.recordOffspring(parentA, parentB, lineageId, env)` → registry process-scoped append-only
- `getLineageChain(lineageId)` → catena multi-generazionale ordinata
- `getTribesEmergent(threshold=3)` → tribù implicite (≥3 unit stesso lineage)
- Endpoint `GET /api/meta/lineage/:id`, `/api/meta/tribes`, `/api/meta/tribe/unit/:id`

Crossbreed S1 polish è **estensione naturale**: invece di parent A + parent B locali, parent B arriva via card import (URL/QR scan).

## Decision

Estendi schema portable Skiv state + endpoint REST + UI per supportare async cross-player crossbreeding, riusando registry `metaProgression` Sprint D.

### A. Schema extension `skiv_saga.json` (additive)

```json
{
  "schema_version": "0.2.0",
  "lineage_id": "skiv-alpha-2026-0425-<run_seed>",
  "companion_card_signature": "<sha256 deterministic hash dei campi share-safe>",
  "crossbreed_history": [
    {
      "ts": "2026-04-28T12:00:00Z",
      "role": "parent_a | parent_b | offspring",
      "partner_lineage_id": "skiv-beta-2026-0428-...",
      "partner_card_signature": "<sha256>",
      "offspring_lineage_id": "skiv-gamma-2026-0428-...",
      "biome_environmental_mutation": "<trait_id from importer biome>",
      "session_id": null
    }
  ],
  "voice_diary_portable": [
    {
      "ts": "...",
      "phase": "mature",
      "voice_line": "Sabbia segue.",
      "trigger_event": "synergy_triggered"
    }
  ],
  "share_url": "https://[host]/api/skiv/share/<lineage_id>"
}
```

**Campi esistenti preservati** ([`data/derived/skiv_saga.json:1-227`](../../data/derived/skiv_saga.json)): `unit_id`, `species_id`, `biome_id`, `mbti_axes`, `progression`, `cabinet`, `mutations`, `aspect`, `diary`. Nessun breaking change.

**Schema versioning**: bump `0.1.0 → 0.2.0`. Reader backward-compat (`schema_version<0.2.0` → no `crossbreed_history`, no `lineage_id` esplicito → derive da `_notes`).

### B. Endpoint REST extension `apps/backend/routes/skiv.js`

| Endpoint                                      | Metodo | Scope        | Note                                                                                   |
| --------------------------------------------- | ------ | ------------ | -------------------------------------------------------------------------------------- |
| `POST /api/skiv/crossbreed`                   | POST   | session+meta | Body: `{ partner_card_url \| partner_card_json }` → ritorna offspring proposal preview |
| `POST /api/skiv/crossbreed/confirm`           | POST   | session+meta | Body: `{ offspring_proposal_id }` → commit, append a `crossbreed_history` + Nido       |
| `GET /api/skiv/crossbreed/history`            | GET    | session      | Lista eventi crossbreed per `unit_id` corrente                                         |
| `GET /api/skiv/share/:lineage_id`             | GET    | public       | URL pubblico share-safe HTML card (no auth, rate-limited)                              |
| `GET /api/skiv/share/:lineage_id?format=qr`   | GET    | public       | QR code PNG che incapsula `share_url`                                                  |
| `GET /api/skiv/share/:lineage_id?format=json` | GET    | public       | JSON portable subset (whitelist `companion_card_signature` verified)                   |

**Riuso `metaProgression`**:

- `POST /crossbreed/confirm` chiama `recordOffspring(localUnit, importedCard, newLineageId, envMutation)` (Sprint D shipped).
- Offspring entra in registry → `getLineageChain(newLineageId)` lo include automatico → `getTribesEmergent()` lo conta verso threshold tribù.

### C. Crossbreed mechanics — gene mix algorithm

```
input:
  cardA = local skiv_saga.json (parent locale)
  cardB = imported card (parent ambassador via URL/QR import)
  importer_biome = biome_id corrente sessione

output:
  offspring = {
    unit_id: f"{cardA.unit_id}-x-{cardB.lineage_id_short}-{run_seed}",
    species_id: pick_50_50(cardA.species_id, cardB.species_id),  // weighted by sentience_tier
    biome_id: importer_biome,                                     // sempre dal Nido di B
    mbti_axes: average_axes(cardA.mbti_axes, cardB.mbti_axes),    // arithmetic mean
    mutations: union_capped(cardA.mutations, cardB.mutations, cap=3),
    diary: [
      { event_type: 'crossbreed_origin',
        payload: { parent_a_lineage, parent_b_lineage, partner_card_signature } }
    ],
    lineage_id: f"skiv-{importer_biome}-{epoch}-{run_seed}",
    parent_lineage_ids: [cardA.lineage_id, cardB.lineage_id],
    biome_environmental_mutation: pick_trait_from(importer_biome.starter_trait_pool)
  }
```

**Vincoli**:

1. **Apex exclude**: se `cardA` o `cardB` ha `clade_tag: Apex` → reject. Coerente con `docs/design/2026-04-27-skiv-companion-worldgen-integration.md:67` design rule.
2. **Species fallback**: se species mix non valida (e.g. specie non più in `species.yaml`) → fallback a `dune_stalker` archetype.
3. **Cap mutations**: max 3 mutation slots per offspring (allineato a Pokemon EV cap 3-stat principle, research §1.1).
4. **Environmental mutation = importer biome only**: design intent — l'offspring "nasce" nel Nido di chi importa, eredita il bioma di B (non di A).

### D. Privacy boundary — share-safe whitelist

**Whitelist** campi esportabili in `?format=json` o QR encode:

- `schema_version`, `unit_id`, `species_id`, `biome_id`
- `mbti_axes` (numerical only, no narrative leak)
- `progression.level`, `progression.job`, `progression.picked_perks` (perk_id references)
- `mutations[]`, `aspect.lifecycle_phase`, `aspect.label_it`, `aspect.sprite_ascii`
- `lineage_id`, `companion_card_signature`
- `voice_diary_portable[]` (subset diary, max 5 entries più recenti, voice_line + phase only)

**Blacklist** (NON esportato, server-side only):

- `session_id`, `hp_current`, `sg_current`, `pressure_tier`, `ap_current`
- `_notes`, IP origine, user email/username
- `crossbreed_history[].partner_card_url` (lineage_id sì, URL no — anti-tracking cross-player)
- `diary[]` full (solo subset filtrato in `voice_diary_portable`)

**Tamper detection**: `companion_card_signature` = `sha256(canonicalJson(whitelist_fields))`. Server verifica signature al `/crossbreed` import. Mismatch → reject 400.

### E. Lifecycle endpoint flow

```
Player A (host):
  GET /api/skiv/share/<lineage_id>?format=qr
  → QR code PNG con URL https://[host]/api/skiv/share/<lineage_id>

Player B (importer):
  scan QR phone → URL → web preview HTML card
  copy/share URL nel proprio client
  → POST /api/skiv/crossbreed { partner_card_url: "..." }
  → server fetch URL → verify signature → propose offspring (preview)
  → returns { offspring_proposal_id, preview: {...} }
  user UI mostra preview → confirm
  → POST /api/skiv/crossbreed/confirm { offspring_proposal_id }
  → recordOffspring() → metaProgression registry append
  → offspring entra come "ambassador" nel Nido di Player B
  → broadcast event a session di B (non a A — async, A non sa)

Player A (eventuale visita futura):
  GET /api/skiv/crossbreed/history (mio unit_id)
  → vede ricevuti dei crossbreed dove la sua card è stata partner_b
  (solo se importatore ha esplicitamente "comunicato indietro" — opt-in default OFF)
```

## Consequences

### Positive

- **Cross-player social emergence senza chat/trade**: pattern Spore Sporepedia portato in Evo-Tactics. Il social di Skiv non è messaggi, è genetics.
- **Riuso completo Sprint D Nido**: `recordOffspring()` + `getLineageChain()` + `getTribesEmergent()` zero refactor. Tribù emergenti possono includere ambassador cross-player automatic.
- **Pattern museum reuse**: M-001 (sentience_tiers), M-002 (mating_engine_orphan), M-014 (cross_bioma_worldstate) tutti consumati nello stesso flow → reuse-density alta.
- **Schema additive**: `0.1.0 → 0.2.0` reader backward-compat. Skiv canonical (`Arenavenator vagans` INTP) resta override per allenatore originale (B3 ibrido design rule).
- **No new dependency**: usa `crypto` (built-in) per signature, `qrcode` npm già zero-dep. Octokit già loaded in `routes/skiv.js`.

### Negative

- **DB scalability lineage_id graph cross-player**: se ambassador unbounded → registry process-scoped potrebbe gonfiarsi. **Mitigation**: cap configurabile (default 10 ambassador per Nido, decision Q2 §7).
- **Privacy attack surface**: endpoint `/share/:lineage_id` pubblico no-auth → enumeration risk. **Mitigation**: rate-limit (default 10/h per IP, decision Q5), `lineage_id` UUID-like (160bit entropy), no PII whitelist enforced server-side.
- **Crossbreed payload tampering**: import URL → server fetch + signature verify obbligatoria. **Mitigation**: signature check `sha256(canonicalJson)` lato server, mismatch reject.
- **Test surface cross-process**: simulazione 2 player richiede 2 mock server o multiplexing in-memory. **Mitigation**: integration test usa singolo backend con 2 unit_id, simula export A → import B same process.
- **Schema migration vincolo**: skiv_saga.json `0.1.0` esistente in `data/derived/` deve avere fallback reader. **Mitigation**: `tools/py/seed_skiv_saga.py` aggiornato a generare `0.2.0` di default, lettura `0.1.0` con sentinel logic.
- **Coordinazione con `WorldState` ADR-2026-04-26**: crossbreed events dovrebbero feedback in `spillover_log`? Non blocking ma da considerare in Phase 2. **Mitigation**: ADR followup Phase 7 post-MVP.

## Alternatives considered

- **A) Solo local-file export, no endpoint share pubblico**: privacy maximal, ma rompe il pattern "async cross-player" — l'innovazione differenziante. **Scartato**: contraddice user direction "S1 polish perfetto crossbreeding cross-player".
- **B) Cloud account-based (Pokemon HOME pattern stretto)**: richiede auth service + DB account. ~+15h scope creep, non in budget S1 polish 25-30h. **Deferred a S2** (post-MVP se uptake validation).
- **C) Direct WebSocket cross-session live (Jackbox-like)**: Player A e B online sincroni. Tecnicamente riuso M11 lobby WS. Ma cambia da "async" a "sync" → non target user, non scalabile a friend-not-online. **Scartato** — perde valore async.
- **D) Signature-less import (trust client)**: ~-2h impl. Ma apre tampering massivo (player B inietta Skiv ultra-statted). **Scartato** — security non negotiable.
- **E) Permanent ambassador no expire (default, vedi Q3)** vs **expire dopo N campagne**: design choice, non architettura. Default permanent allinea a Pokemon HOME identity persistence.

## DoD

1. ADR `proposed → accepted` post sign-off master-dd (5 decision points §7).
2. Schema `skiv_saga.json` v0.2.0 + AJV validator (`packages/contracts/schemas/skiv_companion.schema.json`).
3. Endpoint REST 6 nuovi (vedi tabella §B), tutti AJV-validated.
4. `companion_card_signature` algorithm deterministic + 5 unit test (canonical JSON serialization, sha256 stable cross-process).
5. Crossbreed flow E2E test: export A → import B → recordOffspring → registry append → tribe lookup ambassador.
6. UI extension `skivPanel.js`: button "🔁 Esporta Skiv" + button "📥 Importa Skiv altrui" + preview crossbreed modal.
7. Privacy/anti-abuse review checklist (rate-limit verified, schema whitelist verified, no PII leak).
8. Test suite: ≥15 nuovi (unit + integration + E2E privacy).
9. AI regression baseline 311/311 verde post-merge.
10. Museum card update: M-002 (mating_engine_orphan) `revived`, nuova card M-2026-04-27-019 `skiv-portable-companion-crossbreeding`.

## References

- [`docs/reports/2026-04-27-stat-hybrid-tamagotchi-companion-research.md`](../reports/2026-04-27-stat-hybrid-tamagotchi-companion-research.md) — research base S1 verdict + 5 decision points
- [`docs/skiv/CANONICAL.md`](../skiv/CANONICAL.md) — Skiv canonical hub (don't reinvent rule)
- [`docs/design/2026-04-27-skiv-companion-worldgen-integration.md`](../design/2026-04-27-skiv-companion-worldgen-integration.md) — generative schema (B3 hybrid)
- [`docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md`](ADR-2026-04-26-cross-bioma-worldstate-persistence.md) — WorldState pattern (potenziale Phase 7 followup)
- [`apps/backend/routes/skiv.js`](../../apps/backend/routes/skiv.js) — Skiv route esistente
- [`apps/backend/services/metaProgression.js`](../../apps/backend/services/metaProgression.js) — `recordOffspring()` Sprint D shipped (commit `639a90f7`)
- [`data/derived/skiv_saga.json`](../../data/derived/skiv_saga.json) — schema v0.1.0 baseline
- [`data/core/companion/skiv_archetype_pool.yaml`](../../data/core/companion/skiv_archetype_pool.yaml) — pool 8 biomi × 8-12 nomi
- [Museum card M-002 mating_engine_orphan](../museum/cards/mating_nido-engine-orphan.md) — Sprint D unblocked
- [Museum card M-2026-04-26-014 cross_bioma_worldstate](../museum/cards/worldgen-cross-bioma-events-propagation.md) — pattern reuse Phase 7

## §7 — 5 decision points pending master-dd (proposed → accepted gate)

| #   | Domanda                               | Default raccomandato                                                                                            | Impact se diverso                                                                                                   |
| --- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Q1  | Privacy boundary share-safe           | Whitelist subset `skiv_saga.json` (solo §D campi), no telemetria/no email/no IP. Signature SHA256 obbligatoria. | Più permissive (e.g. include diary full) → tracking risk; più strict (es. solo lineage_id) → perde valore narrativo |
| Q2  | Cap ambassador per Nido               | **10**                                                                                                          | 5 (austero, perde social uptake) / unlimited (DB scaling concern, fix con TTL?)                                     |
| Q3  | Ambassador permanence                 | **Permanent** (Pokemon HOME identity stretto)                                                                   | Expire dopo N campagne → richiede TTL job + UI "ambassador svanito" → +3h scope                                     |
| Q4  | Crossbreed cooldown                   | **1 per campaign** (allineato a CK3 lifestyle trait cap)                                                        | Unlimited → power creep / 1 per session → poco social use                                                           |
| Q5  | Anti-abuse rate-limit `/share` per IP | **10/h**                                                                                                        | 100/h (loose, enumeration easier) / 1/h (strict, blocca legitimate phone scan retry)                                |

**Default rationale**: tutti allineati a pattern industry primary-sourced (vedi research base §2). Master-dd può override singoli punti senza ridiscutere ADR architettura.

**Effort breakdown 25-30h** (vedi sprint plan [`docs/planning/2026-04-27-skiv-portable-companion-sprint-plan.md`](../planning/2026-04-27-skiv-portable-companion-sprint-plan.md)):

| Phase                                 | Effort     |
| ------------------------------------- | ---------- |
| 1. Schema design + persistence        | ~6h        |
| 2. Endpoint REST + crossbreed logic   | ~10h       |
| 3. UI extension `skivPanel.js`        | ~5h        |
| 4. Test coverage (unit + integration) | ~4h        |
| 5. Privacy/anti-abuse review          | ~2h        |
| 6. Documentation + ADR promotion      | ~1-2h      |
| **Totale**                            | **25-30h** |

---

_Generato 2026-04-27 da research+design agent (read-only mode). NO codice impl. Aspetta sign-off master-dd 5 decision points §7 per accepted gate._
