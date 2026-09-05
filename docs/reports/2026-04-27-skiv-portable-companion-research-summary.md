---
title: 'Sprint summary — Skiv portable companion + crossbreeding async cross-player (S1 polish)'
workstream: cross-cutting
category: sprint-summary
doc_status: draft
doc_owner: claude-code
last_verified: '2026-04-27'
tags: [skiv, companion, crossbreeding, lineage, portable, summary]
---

# Sprint summary — Skiv portable companion S1 polish (research+design)

> Output research+design agent 2026-04-27 (read-only mode). Codifica scope crossbreeding async cross-player, riusa Sprint D Nido `recordOffspring()` shipped, aspetta sign-off master-dd 5 decision points per ADR `proposed → accepted`.

---

## TL;DR — 5 bullet

1. **Scope**: S1 polish "perfetto" = wire crossbreeding async cross-player con Skiv come portable creature-ambassador. Player A esporta carta (URL/QR) → Player B importa → endpoint `/crossbreed` propone offspring 3rd-gen 50/50 genes + 1 environmental mutation dal bioma di B → ambassador entra nel Nido di B (non sostituisce Skiv di A, opt-in async). Pattern primary-sourced: Spore Sporepedia + CK3 DNA lineage + Pokemon HOME identity + Wildermyth legacy character.

2. **Verdict**: ADR `proposed` ready ([`docs/adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md`](../adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md)) + sprint plan ([`docs/planning/2026-04-27-skiv-portable-companion-sprint-plan.md`](../planning/2026-04-27-skiv-portable-companion-sprint-plan.md)). Schema additive `0.1.0 → 0.2.0` (zero breaking change). Riusa stretto Sprint D Nido (`recordOffspring()` + `getLineageChain()` + `getTribesEmergent()` shipped commit `639a90f7`).

3. **Effort 25-30h**: Phase 1 schema (~7h) → Phase 2 endpoint+logic (~10h) → Phase 3 UI (~5h) → Phase 4 test 19 nuovi (~4h) → Phase 5 privacy review (~2h) → Phase 6 docs+ADR promotion (~1-2h). Skip rule fast-track export-only ~12-15h se user vuole MVP first.

4. **5 decision points pending master-dd** (ADR §7): privacy boundary share-safe / cap ambassador per Nido / ambassador permanence / crossbreed cooldown / anti-abuse rate-limit. Tutti hanno default raccomandato allineato a pattern industry primary-sourced — master-dd può override singoli punti.

5. **ADR status**: `proposed` (NON accepted). Aspetta sign-off 5 decision points → promote `accepted` → kickoff Sprint S1 polish. Pre-condition Sprint D Nido ✅ già shipped.

---

## Quick links

| Risorsa                                          | Path                                                                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR (proposed)                                   | [`docs/adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md`](../adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md)                       |
| Sprint plan (6 phase)                            | [`docs/planning/2026-04-27-skiv-portable-companion-sprint-plan.md`](../planning/2026-04-27-skiv-portable-companion-sprint-plan.md)                         |
| Research base (M2+S1 verdict)                    | [`docs/reports/2026-04-27-stat-hybrid-tamagotchi-companion-research.md`](2026-04-27-stat-hybrid-tamagotchi-companion-research.md)                          |
| Skiv canonical hub                               | [`docs/skiv/CANONICAL.md`](../skiv/CANONICAL.md)                                                                                                           |
| Companion worldgen integration (B3 ibrido)       | [`docs/design/2026-04-27-skiv-companion-worldgen-integration.md`](../design/2026-04-27-skiv-companion-worldgen-integration.md)                             |
| Nido Sprint D commit (prerequisito)              | `639a90f7` — `recordOffspring()` + `getLineageChain()` + `getTribesEmergent()` live in [`apps/backend/services/metaProgression.js`](../../apps/backend/services/metaProgression.js) |
| WorldState ADR (Phase 7 followup potential)      | [`docs/adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md`](../adr/ADR-2026-04-26-cross-bioma-worldstate-persistence.md)                             |
| Schema baseline                                  | [`data/derived/skiv_saga.json`](../../data/derived/skiv_saga.json) v0.1.0                                                                                   |
| UI panel target                                  | [`apps/play/src/skivPanel.js`](../../apps/play/src/skivPanel.js)                                                                                            |
| Companion pool 8 biomi × 8-12 nomi               | [`data/core/companion/skiv_archetype_pool.yaml`](../../data/core/companion/skiv_archetype_pool.yaml)                                                       |

---

## 5 user decision points (default + impact)

### Q1 — Privacy boundary share-safe

**Default raccomandato**: whitelist subset `skiv_saga.json` (campi §D ADR), no telemetria, no email, no IP. Signature SHA256 obbligatoria server-verify.

**Whitelist**: `unit_id`, `species_id`, `biome_id`, `mbti_axes`, `progression.level/job/picked_perks`, `mutations[]`, `aspect.lifecycle_phase/label_it/sprite_ascii`, `lineage_id`, `companion_card_signature`, `voice_diary_portable[]` (max 5 entries).

**Blacklist**: `session_id`, `hp_current`, `sg_current`, `pressure_tier`, `_notes`, IP, email, `crossbreed_history[].partner_card_url` (lineage_id sì, URL no — anti-tracking cross-player).

**Impact se diverso**:

- Più permissive (diary full) → tracking risk, leak comportamentale
- Più strict (solo lineage_id) → perde valore narrativo, solo "stemma di famiglia" senza storia

### Q2 — Cap ambassador per Nido

**Default raccomandato**: **10**.

**Rationale**: aligned a Pokemon storage box gen 1-3 (varianti tipiche per pet game). Bilancia social uptake vs DB scaling.

**Impact se diverso**:

- 5 (austero) → social uptake basso, ambassador "rari" come collezione esclusiva
- Unlimited → DB scaling concern (registry process-scoped potrebbe gonfiarsi). Mitigation: TTL job + UI "ambassador svanito" (+3h scope creep)

### Q3 — Ambassador permanence

**Default raccomandato**: **Permanent** (Pokemon HOME identity stretto).

**Rationale**: aligned a research base §2.2 — il companion vive nell'identity persistente, non nel ciclo run-to-run. Attachment narrativo richiede stabilità.

**Impact se diverso**: expire dopo N campagne → richiede TTL job + UI "ambassador svanito" → +3h scope. Trade-off: meno DB pressure, ma narrative loss.

### Q4 — Crossbreed cooldown

**Default raccomandato**: **1 per campaign** (allineato a CK3 lifestyle trait cap, research §1.3).

**Rationale**: prevents power creep, mantiene "evento speciale" narrativo. Ogni campaign = 1 ambassador inbound.

**Impact se diverso**:

- Unlimited → power creep (Skiv ultra-statted via repeated crossbreed)
- 1 per session → poco social use, friction UX (player aspetta sessione pulita per import)

### Q5 — Anti-abuse rate-limit `/share` per IP

**Default raccomandato**: **10/h**.

**Rationale**: bilancia legitimate phone scan retry (slow connection, QR lettura imperfetta) vs enumeration attack.

**Impact se diverso**:

- 100/h (loose) → enumeration attack easier
- 1/h (strict) → blocca legitimate retry phone scan

---

## Risk register top 3

| #   | Risk                                                                  | Probability | Impact | Mitigation                                                                                                                              |
| --- | --------------------------------------------------------------------- | ----------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | DB scalability lineage_id graph cross-player                          | Medium      | High   | Cap ambassador 10/Nido (Q2 default). Registry in-memory process-scoped resta pattern Sprint D. Prisma optional Phase 1 (skip rule).     |
| R2  | Crossbreed payload tampering (player B injecta Skiv ultra-statted)    | Medium      | High   | Signature `sha256(canonicalJson(whitelist))` server-verify obbligatorio. Mismatch → reject 400. Test `cardSignature.test.js` 3 case.     |
| R3  | Privacy leak telemetria personale (session_id, IP, email)             | Low         | High   | Schema whitelist enforced server-side. Test E2E `skivPrivacy.test.js` 3 case. Signature ricalcolato post-sanitization, non client-side. |

**Risk register completo** (7 rischi totali con R4-R7) in [`docs/planning/2026-04-27-skiv-portable-companion-sprint-plan.md#risk-register`](../planning/2026-04-27-skiv-portable-companion-sprint-plan.md#risk-register).

---

## Recommendation kickoff timing

**Pre-conditions checklist**:

1. ✅ **Sprint D Nido shipped** — commit `639a90f7` con `metaProgression.recordOffspring()` + `getLineageChain()` + `getTribesEmergent()` live in main. Verificato via `git log --oneline | grep nido`.
2. 🟡 **Master-dd sign-off 5 decision points** ADR §7 — pending. **GATE BLOCKER**.
3. ✅ **AI regression baseline 311/311** — verde post sessione 2026-04-26.
4. 🟡 **Worktree branch dedicato** — da creare `feat/skiv-s1-polish-crossbreeding` (non blocking, fattibile post sign-off).

**Recommended kickoff sequence**:

1. Master-dd review ADR proposed + risponde 5 decision points (~30min lettura)
2. Promote ADR `proposed → accepted` + commit
3. Open branch `feat/skiv-s1-polish-crossbreeding`
4. Phase 1 Schema + Persistence (~7h, smoke test schema validation)
5. Phase 2-6 sequenced (vedi sprint plan)

**Coordination con altri sprint pending**:

- **Boss Leviatano** (~75-90h) — indipendente, può andare prima/dopo. Nessun conflitto file.
- **Merge plan 11 PR** (`docs/planning/2026-04-27-merge-plan-11-pr-session.md` Wave A-D) — Crossbreeding non blocca quei merge, ma ci si appoggia sopra (museum cards `worldgen-*` consumate da `crossbreedEngine` env mutation lookup).
- **WorldState ADR-2026-04-26** — Phase 7 followup post-MVP. Crossbreed events potenziale feedback in `spillover_log`, non blocking.

**Fast-track skip rule**: se user vuole MVP first (export-only, no crossbreed import) → ~12-15h scope, sblocca QR share immediato per smoke test userland. Decision gate post Phase 1.

---

## Coerenza con CLAUDE.md guidelines verificate

- ✅ **Skiv canonical persona preservata** — B3 ibrido design rule (`docs/design/2026-04-27-skiv-companion-worldgen-integration.md:107`) mantiene `Arenavenator vagans` INTP savana per allenatore originale.
- ✅ **OD-001 Path A coerente** — Sprint D shipped è prerequisito esplicito, riuso `recordOffspring()` zero refactor.
- ✅ **M2+S1 research raccomandazione** — research base §3.5 line 292-296 raccomanda esattamente questo pattern (CK3 DNA + Wildermyth legacy combo, "il tuo Skiv contribuisce biologicamente al Skiv di un altro player").
- ✅ **UTF-8 esplicito** — tutti i file MD/YAML scritti con encoding UTF-8 (verifica post-write nessun `Ã` mojibake).
- ✅ **Worktree path discipline** — file scritti in `cranky-easley-606ae0` worktree, non main repo (verificato `pwd` initial).
- ✅ **Museum cards consultati** — M-002 `mating_nido-engine-orphan` (Sprint D unblock), M-014 `cross_bioma_worldstate` (Phase 7 followup potential), M-001 `sentience_tiers` (potential weighted species pick).
- ✅ **Don't reinvent rule Skiv** — ADR esplicita che canonical resta override per `canonical_trainer_id`, B3 ibrido invariant.

---

## Anti-pattern guards (esplicit)

- ❌ **NON sostituire Skiv canonical** — B3 hybrid: `canonical_trainer_id` → Skiv `Arenavenator vagans` INTP savana invariant. Altri trainer → generative pool.
- ❌ **NON inventare data** — gene mix algorithm legge species/traits da `data/core/species.yaml` + `data/core/traits/active_effects.yaml`. Apex exclude guard verifica `clade_tag` reale.
- ❌ **NON shippare crossbreed senza signature verify** — payload tampering = security non negotiable.
- ❌ **NON esportare campaign-state** (hp_current, sg_current, session_id) — sono effimeri (anti-pattern guard research base line 384).
- ❌ **NON care simulation** (feed/play/sleep) — Skiv cresce solo in campagna, mantiene research §2.7 lesson.
- ❌ **NON shippare prima di sign-off ADR §7** — 5 decision points sono blocker, non flavor.

---

## Output deliverables (3 file)

1. **ADR** — `docs/adr/ADR-2026-04-27-skiv-portable-companion-crossbreeding.md` (status: proposed)
2. **Sprint plan** — `docs/planning/2026-04-27-skiv-portable-companion-sprint-plan.md` (6 phase, 25-30h, risk register, DoD)
3. **Sprint summary** — questo file (TL;DR + 5 decision points + risk top 3 + kickoff timing)

**Verdict**: **ADR_PROPOSED_READY**. Ready per master-dd review 5 decision points → promote `accepted` → kickoff Sprint S1 polish.

---

*Generato 2026-04-27 da research+design agent (read-only mode, NO codice impl). Italiano, file:line per claim, museum-aware.*
