---
title: 'Disco Elysium — Thought Cabinet + Internal Voice + Day Pacing (P4 diegetic surfacing)'
museum_id: M-2026-04-27-003
type: research
domain: narrative_personality
provenance:
  found_at: docs/research/2026-04-26-tier-s-extraction-matrix.md#9-disco-elysium-zaum-2019--p4-thought-cabinet
  git_sha_first: c4a0a4d5
  git_sha_last: 6480e025
  last_modified: 2026-04-26
  last_author: docs-team
  buried_reason: unintegrated
relevance_score: 5
reuse_path: 'Minimal: MBTI tag debrief shipped #1897 + day pacing flavor (~2h) / Moderate: Thought Cabinet UI panel + cooldown (~8h) / Full: 4-MBTI internal voice + skill check popup (~24h)'
related_pillars: [P4]
status: curated
excavated_by: claude-code (deep extraction pass-2 2026-04-27)
excavated_on: 2026-04-27
last_verified: 2026-04-27
---

# Disco Elysium — Thought Cabinet + Internal Voice (P4 diegetic surfacing)

## Summary (30s)

- **5/5 score** — Disco Elysium è il donor canonical Pillar 4 (MBTI/Ennea diegetic surfacing). MBTI tag debrief color-coded shipped PR #1897 (primo pezzo).
- **4 pattern residui**: Thought Cabinet UI panel + cooldown round-based (~8h, **P0 residuo synthesis**), Internal voice 4-MBTI axes (~10h), Skill check passive→active popup (~4h), Day/time pacing flavor (~2h cosmetic).
- **V1 onboarding 60s shipped** (PR #1726) ha già adoption parziale 3-stage Disco overlay.

## What was buried

Tier S matrix categorizza Disco Elysium come donor primario P4. 5 cosa-prendere:

- ✅ **Color-coded MBTI tag debrief** — shipped PR #1897 `feat(narrative): Disco MBTI tag debrief insights`
- 🔴 **Thought Cabinet diegetic reveal** — slot mentali equip-per-N-round → unlock effetto. P0 residuo synthesis.
- 🔴 **Internal voice skill checks** — Inland Empire/Authority/Volition voce-per-axis MBTI durante combat
- 🔴 **Skill check passive vs active popup** — surface trigger via popup notification
- 🔴 **Day/time pacing flavor copy** — "Giorno N di Aurora" cosmetic
- ⏸️ **Tutti 24 axes** — anti-pattern (overhead), tieni 4 MBTI only
- ⏸️ **Pure walking sim no-combat** — scope completamente fuori
- ⏸️ **Lengthy dialogues 5-page scroll** — anti-co-op (player offline aspetta)

## Why it might still matter

### Pillar match

- **P4 MBTI/Ennea 🟡+ → 🟢 candidato**: Disco MBTI debrief shipped, Thought Cabinet panel chiuderebbe gap surface principale. P4 è il pillar più "freddo" del set — Disco è la sorgente che lo riscalda.
- **Convergenza thought-cabinet pattern** (cross-tier): Wildermyth (Tier S) + Disco + Voidling Bound terminal Spliced — pattern "equip slots → permanent identity shift" emerge da 3 fonti.

### File targets

- VC scoring backend: [`apps/backend/services/vcScoring.js`](../../../apps/backend/services/vcScoring.js) — MBTI accrual live
- MBTI surface: [`apps/backend/services/mbtiSurface.js`](../../../apps/backend/services/mbtiSurface.js) — 5-axes UI surface
- MBTI insights debrief: [`apps/backend/services/narrative/mbtiInsights.js`](../../../apps/backend/services/narrative/mbtiInsights.js) (NEW shipped #1897)
- Thoughts content: [`data/core/thought_cabinet/`](../../../data/core/thought_cabinet/) — 18 thoughts catalogati
- UI surface: [`apps/play/src/onboardingPanel.js`](../../../apps/play/src/onboardingPanel.js) — V1 base pattern

### Cross-card relations

- M-2026-04-25-009 [Triangle Strategy MBTI Transfer](personality-triangle-strategy-transfer.md) — P4 closure path orthogonal
- M-2026-04-25-010 [Personality MBTI Gates Ghost](personality-mbti-gates-ghost.md) — recoverable via git show
- M-2026-04-26-001 [Voidling Bound](evolution_genetics-voidling-bound-patterns.md) — Spliced terminal endpoint analog "thought permanent equip"

## Concrete reuse paths

### Minimal — Day pacing + tag debrief (~2h, partial shipped)

✅ MBTI tag shipped #1897.

1. `apps/backend/routes/campaign.js /advance` — flavor copy `dayN: "Giorno N di Aurora"` in response payload
2. UI render flavor in debrief panel header
3. Total: ~2h flavor authoring + wire

### Moderate — Thought Cabinet UI panel (~8h, P0 residuo)

1. **Schema** (~1h): `data/core/thought_cabinet/thought_slots.yaml` — 4 slot config
2. **Engine** (~2h): `apps/backend/services/narrative/thoughtCabinet.js` (NEW) — equip/cooldown/unlock logic
3. **Endpoint** (~1h): `POST /api/session/:id/thought/equip` + `unequip` + `state`
4. **UI panel** (~3h): `apps/play/src/thoughtCabinetPanel.js` (clone formsPanel pattern) — overlay modale 4 slot + cooldown round counter
5. **Tests** (~1h): 5 unit + 3 integration

### Full — Internal voice + skill check popup (~24h)

1. **4-MBTI internal voice** (~10h): `services/narrative/internalVoice.js` — 4 voci basic (E_I/S_N/T_F/J_P) trigger durante combat hint via narrative log
2. **Skill check passive→active popup** (~4h): `passesBasicTriggers` + ancestors trigger system → popup notification UI
3. **Authoring 18 thoughts `reveal_text_it`** (~10h): 18 × 30min content writing (P0 residuo synthesis)

## Tickets proposed

- [`TKT-UI-DISCO-THOUGHT-CABINET`](../../../data/core/tickets/proposed/TKT-UI-DISCO-THOUGHT-CABINET.json) (8h, ui-design-illuminator) — **P0 residuo**
- [`TKT-NARRATIVE-DISCO-INTERNAL-VOICE`](../../../data/core/tickets/proposed/TKT-NARRATIVE-DISCO-INTERNAL-VOICE.json) (10h)
- [`TKT-NARRATIVE-DISCO-SKILL-CHECK-POPUP`](../../../data/core/tickets/proposed/TKT-NARRATIVE-DISCO-SKILL-CHECK-POPUP.json) (4h)
- [`TKT-NARRATIVE-DISCO-DAY-PACING`](../../../data/core/tickets/proposed/TKT-NARRATIVE-DISCO-DAY-PACING.json) (2h) — quick win

## Sources / provenance trail

- Source matrix: [`docs/research/2026-04-26-tier-s-extraction-matrix.md`](../../research/2026-04-26-tier-s-extraction-matrix.md) §9
- Disco Elysium (ZA/UM 2019) — lead Robert Kurvitz, Aleksander Rostov
- GDC postmortems / Inkjs adoption: V1 onboarding 60s reference
- PR shipped: [#1897 408e23f0](https://github.com/MasterDD-L34D/Game/pull/1897)
- Stato arte: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B.1.8

## Risks / open questions

- **18 thought authoring debt**: `reveal_text_it` mancante in 18 entries — autoring batch ~10h. Senza, panel UI ha contenuto vuoto.
- **T_F axis 0 thoughts**: deep-analysis residuo gaps — `tilt` window EMA non implementato → Stoico(9) unreachable. Wire prima di Thought Cabinet panel ship.
- **Conflict 24-axes overhead**: tieni 4 MBTI only, NON copiare Disco 24-skill voice.
- **Co-op safety**: dialoghi long-form anti-pattern player offline. Cap thought reveal text < 3 frasi.

## Anti-pattern guard

- ❌ NON skill point spending grind
- ❌ NON tutti 24 skill voice (DE 24-skill overhead, tieni 4 MBTI)
- ❌ NON pure walking sim no-combat
- ❌ NON dialoghi 5-pagine scroll (player offline aspetta)
- ✅ DO color-code MBTI axis tag (shipped #1897)
- ✅ DO equip/cooldown round-based (no time real)
