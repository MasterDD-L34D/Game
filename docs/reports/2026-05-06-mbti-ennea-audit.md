---
title: "MBTI + Ennea System Audit — 2026-05-06"
workstream: cross-cutting
category: report
doc_status: draft
tags: [narrative, audit, P4, MBTI, Enneagramma, pillar-4]
created: 2026-05-06
---

# MBTI + Ennea Audit — 2026-05-06

**Trigger**: master-dd sospetta discrepancies design originale vs shipped per P4 (MBTI + Ennea).
**Scope**: 2 sistemi interconnessi. 12 fonti lette direttamente. Output: drift matrix + reality check P4 pillar status.

---

## Canonical vision per layer

### MBTI (4 axis)

Canonical design (da `docs/core/`, `mbti_forms.yaml`, `telemetry.yaml`):

- **4 axis gameplay-derivati**: E_I (sociale), S_N (percezione), T_F (decisione), J_P (stile)
- **16 form**: `mbti_forms.yaml` — label IT + job affinities + soft-gate penalties per form
- **Phased reveal** (Disco Elysium pattern): solo assi con confidence > 0.7 mostrati al player
- **Dialogue color codes** (Triangle Strategy pattern): 8 colori WCAG AA per 8 lettere
- **Conviction badges**: shift significativo = badge color-coded per player
- **Recruit gating** (TKT-P4-MBTI-003): recruit fallisce se MBTI distance > threshold — NON SHIPPED

### Ennea (9 archetype)

Canonical design (da `enneagramma-mechanics-registry.md` museum card, `enneagramma_master.yaml`):

- **9 archetype** ciascuno con: voice palette, combat effect, trigger telemetria, descrizione
- **Voice palette** per beat (attack/defense/exploration/low_hp/victory/defeat/idle)
- **Behavior modifier**: buff/debuff automatico a fine round quando archetype triggered
- **Trigger**: basato su raw metrics derivate da vcScoring (setup_ratio, attack_hit_rate, etc.)
- **9/9 coverage**: intero cast di archetypes

---

## Shipped runtime — layer-by-layer

### MBTI: asse derivazione (vcScoring.js)

**4/4 assi computati** ma con qualità diversa:

| Asse | Formula | Coverage | Stato |
|------|---------|---------|-------|
| T_F | `utility_actions` + `support_bias` | `full` | SHIPPED iter1 (2026-04-17) |
| J_P | `setup_ratio` + `time_to_commit` | `partial` | SHIPPED iter1 |
| E_I | `close_engage` + `support_bias` + `time_to_commit` | `full`/`partial` | SHIPPED iter2 (2026-04-26) |
| S_N | `new_tiles` + `setup_ratio` + `evasion_ratio` | `full`/`partial` | SHIPPED iter2 |

iter2 (`computeMbtiAxesIter2`) è opt-in via env `VC_AXES_ITER=2` o `telemetryConfig.use_axes_iter2`. Default = iter1.

**Finding**: 4/4 assi derivati SONO computati. iter1 aveva T_F full + J_P partial. iter2 porta tutti e 4 a full quando raw metric disponibile. La claim storica "solo T_F FULL" era corretta per iter1 ma **obsoleta da 2026-04-26**.

### MBTI: phased reveal (TKT-P4-MBTI-001 — SHIPPED)

`apps/backend/services/mbtiSurface.js` — shipped PR feat/d1a-mbti-phased-reveal:

- `computeRevealedAxes(actorVc, opts)` — confidence = coverage_factor × decisiveness
- `buildMbtiRevealedMap(vcSnapshot)` — per-actor map {revealed[], hidden[]}
- Threshold default 0.7 (env `MBTI_REVEAL_THRESHOLD` A/B testabile)
- Short-session boost: se events_count < 30 → threshold 0.6 automatico
- **Wired in** `GET /:id/vc` e `GET /:id/pf` (additive, lazy-import try/catch)
- **Wired in** `debriefPanel.js` sezione `#db-mbti-section` + CSS `.db-mbti-*`
- Gate 5 check: player vede 4 axis card con confidence bar nel debrief

### MBTI: dialogue color codes (TKT-P4-MBTI-002 — SHIPPED)

`apps/backend/services/mbtiPalette.js` + `data/core/personality/mbti_axis_palette.yaml`:

- 8 colori WCAG AA ≥5.02:1 (amber-700/blue-800/green-700/violet-700/cyan-700/pink-700/yellow-800/sky-700)
- `mbtiTaggedLine(text, letters)` → `<mbti axis="X">...</mbti>` inline tags
- `wcagContrastRatio(fg, bg)` utility per test deterministici
- Reveal-gated: colore solo se `mbtiRevealed.revealed[]` contiene l'asse
- `buildConvictionBadges(actorVc, opts)` — badge per shift significativi (threshold 0.75, delta_min 0.08)
- **Gate 5 status**: helper shipped, integration in `narrativeEngine` + `render.js` **PENDENTE**. Frontend `dialogueRender.js` esiste per rendering, ma pipeline narrative non produce `<mbti>` tagged lines in-session automaticamente. Player non vede colori nei dialoghi runtime senza trigger esplicito.

### MBTI: conviction badges (v3.5 — SHIPPED)

`mbtiSurface.js` `buildConvictionBadges` / `buildConvictionBadgesMap`:

- Badge color-coded per ogni shift VC ad alta confidence (≥0.75) + delta ≥0.08
- Triangle Strategy "Conviction" pattern (label > numero)
- Integrato in `GET /:id/vc` e `GET /:id/pf` response
- **Gate 5**: i badge tornano nel payload JSON ma nessun frontend li renderizza dedicatamente (debriefPanel mostra mbti_revealed, non i conviction badges separatamente).

### MBTI: recruit gating (TKT-P4-MBTI-003 — OPEN)

- **Non shipped**. BACKLOG ticket aperto con pre-req: M-007 mating engine activate (OD-001 Path A)
- `debriefPanel.js` mostra tag `MBTI ${mbtiLabel}` su recruits (display only, zero gating)
- `nestHub.js` mostra `MBTI: X` chip su unità (display only)

### MBTI × Form binding (personalityProjection.js)

`apps/backend/services/personalityProjection.js` + `apps/backend/services/forms/formEvolution.js`:

- `projectForm(mbtiAxes, forms)` → calcola distanza euclidea asse per asse vs 16 form targets
- Form più vicina = MBTI type classificato (con confidence = 1 - normalized_distance)
- `data/core/forms/mbti_forms.yaml` 16 form con `axes: {E_I, S_N, T_F, J_P}` target + `job_affinities` + `job_penalties`
- **form_id naming** `istj_custode`: il nome `Custode` = label form INFJ (non ISTJ). Il naming `form_id` contiene il tipo MBTI come prefisso + label italiano (es. INFJ → "Custode"). Binding reale.
- `requires:` block per gate forma: **MANCANTE in mbti_forms.yaml** (museum card M-010 ghost gate). Museum card documenta ghost YAML via `git show 5c704524:data/evo-tactics/param-synergy/form/mbti_gates.yaml`.

### Thought Cabinet (SHIPPED — Phase 1+2)

`apps/backend/services/thoughts/thoughtCabinet.js` + `data/core/thoughts/mbti_thoughts.yaml`:

- **18 thoughts**: 3 assi × 2 direzioni × 3 soglie (E_I + S_N + J_P; T_F escluso — già surfacato via job_affinities)
- Phase 1: unlock progressivo a threshold crossing, cumulativo per-session
- Phase 2: research mode (rounds/encounters) → internalization → passive bonus/malus permanente
- `GET /:id/thoughts` + `POST /:id/thoughts/research` + `DELETE /:id/thoughts/forget`
- `thoughtsPanel.js`: 8-slot grid + progress bar + Assign/Forget buttons
- Round tick via `sessionRoundBridge.applyEndOfRoundSideEffects`
- Gate 5: **SHIPPED**. Player vede panel, interagisce con slot, vede countdown
- **Gap**: T_F axis ha 0 thoughts in `mbti_thoughts.yaml` — axis computata ma non produce pensieri Thought Cabinet. `inner_voices.yaml` copre T_F via inner voices (24 voci), non via thoughts cabinet.

### Inner Voices (SHIPPED — 24 voci)

`data/core/thoughts/inner_voices.yaml` + `apps/backend/services/narrative/innerVoice.js`:

- 24 voci: 4 assi × 2 direzioni × 3 soglie
- Copertura completa T_F (incluso, a differenza di `mbti_thoughts.yaml`)
- `evaluateVoiceTriggers(axes, voicesHeard)` — cumulative once-heard
- Wired in `GET /:id/thoughts` response: `voices_heard[]` + `newly_heard[]` per actor
- Wired in Thought Cabinet ritual panel: voice line preview quando si sceglie thought (PR #1945 pattern)
- Gate 5: **PARTIAL**. Backend fires e payload include voices. Frontend `thoughtsPanel.js` mostra preview voice line durante ritual. **Non mostrate in-combat o in-debrief dedicate** — solo durante ritual choice.

---

### Ennea: voice palette 9/9 (SHIPPED)

`data/core/narrative/ennea_voices/type_{1-9}.yaml` + `apps/backend/services/narrative/enneaVoice.js`:

- 9 file YAML × 7 beat = ~189 linee totali
- Beat supportati: `combat_attack_committed`, `combat_defense_braced`, `exploration_new_tile`, `low_hp_warning`, `victory_solo`, `defeat_critical`, `idle_round_start`
- `selectEnneaVoice(enneaArchetypes, beatId, opts)` — selector con RNG deterministico + priority ordering
- `GET /api/session/:id/voice?actor=&beat=` endpoint live
- Telemetry: `ennea_voice_type_used` event pushed in session.events
- Gate 5 status: **ENGINE LIVE, SURFACE DEAD**. Endpoint esiste, nessun frontend chiama `GET /:id/voice` automaticamente durante gameplay. Le linee non appaiono al player durante combat/esplorazione. Endpoint fruibile solo via tool esterno o smoke CLI.

### Ennea: combat effects 9/9 (SHIPPED)

`apps/backend/services/enneaEffects.js`:

- 9 archetypes con buff: `attack_mod`, `defense_mod`, `move_bonus`, `stress_reduction`, `evasion_bonus`
- 5/5 stat `STAT_RUNTIME_KIND.mechanical` — tutti consumati live (attack_mod/defense_mod/evasion_bonus/move_bonus/stress_reduction)
- `applyEnneaToStatus(actor, effects)` → mutat actor status in-place
- Wired in `sessionRoundBridge.applyEndOfRoundSideEffects` post round 1 (lazy-require + try/catch)
- Gate 5: `ennea_effects` action_type in session.events — surface = log telemetria. In-combat HUD panel per visualizzazione deferred.

### Ennea: debrief surface (SHIPPED)

`apps/play/src/debriefPanel.js` sezione `#db-ennea-section`:

- 9 archetype badge grid (`triggered` = bold/highlight)
- Wired in `phaseCoordinator.js` → `vc_summary.per_actor[playerId].ennea_archetypes`
- Gate 5: **SHIPPED**. Player vede nel debrief quali archetipi Ennea sono triggerati. Triggered = badge highlighted. Icon + label + desc per ciascuno.

---

## Drift matrix

| Feature | Canonical vision | Shipped | Gap severity |
|---------|-----------------|---------|-------------|
| MBTI E_I derivation | gameplay-derivato | FULL (iter2 opt-in) | Minor — iter2 non è default |
| MBTI S_N derivation | gameplay-derivato | FULL (iter2 opt-in) | Minor — iter2 non è default |
| MBTI T_F derivation | gameplay-derivato | FULL (iter1 default) | None |
| MBTI J_P derivation | gameplay-derivato | PARTIAL (iter1/iter2) | Minor |
| MBTI phased reveal | Disco-style progressivo | SHIPPED (surface live) | None |
| MBTI dialogue colors | diegetic color code | Helper SHIPPED, pipeline NON wired | **Moderate** — player non vede colori dialogo auto |
| MBTI conviction badges | badge per shift | Backend SHIPPED, frontend no render dedicato | Minor |
| MBTI recruit gating | threshold gate su recruit | NOT SHIPPED (pre-req OD-001) | **Open** — BACKLOG TKT-P4-MBTI-003 |
| MBTI × Form binding | form_id MBTI prefix real | SHIPPED (projectForm) | None |
| MBTI × Form `requires:` | gate forma su axis | NOT SHIPPED (ghost YAML) | **Open** — M-010 museum card |
| Thought Cabinet (3 assi) | 18 thoughts E_I+S_N+J_P | SHIPPED Phase 1+2 | None |
| Thought Cabinet T_F | T_F thoughts | 0 thoughts T_F in YAML | **Moderate** — T_F axis esclusa by-design ma gap documentato |
| Inner voices (4 assi) | 24 voci diegetiche | SHIPPED (backend+ritual preview) | Minor — non in-combat display |
| Ennea voice palette 9/9 | voice line per beat | ENGINE SHIPPED, SURFACE DEAD | **Major** — frontend non chiama endpoint |
| Ennea combat effects 9/9 | buff/debuff mechanical | SHIPPED (sessionRoundBridge) | None — Gate 5 exempt (telemetria) |
| Ennea debrief badge | 9 archetype visible | SHIPPED (debriefPanel) | None |
| Ennea in-combat HUD | HUD panel effetti | NOT SHIPPED (deferred P4 sprint) | **Open** — enneaEffects.js comment nota |

---

## P4 Pillar status — reality check

**Claim pre-audit**: P4 🟡 → 🟢 candidato post Sprint 2026-05-05 (PR #2061 + #2062).

### Cosa supporta 🟢 candidato

1. Ennea 9/9 voice palette SHIPPED (data + selector + endpoint) — PR #2062
2. Ennea combat effects 9/9 mechanical — PR #1825-1830 + extension
3. Ennea debrief badge surface live (player vede archetipi triggerati)
4. MBTI phased reveal live (player vede assi nel debrief)
5. Thought Cabinet Phase 1+2 live (player interagisce con slot, internalization funziona)
6. MBTI colour palette helper shipped (WCAG AA conforme)
7. Inner voices 24 voci shipped (backend + ritual preview)
8. QBN debrief beats shipped (PR #1914 + render #sprint-10)

### Cosa contradice 🟢 candidato (argomento per 🟡++)

**Anti-Gate-5 critico**:

- **Ennea voice endpoint = dead surface**: `GET /:id/voice` esiste, nessun frontend lo chiama. Player non sente mai una linea di voice ennea durante gameplay normale. BACKLOG TKT-MUSEUM-SKIV-VOICES era marcato CHIUSO 2026-05-05 ma il gate "player vede in 60s di gameplay" è FAIL per questa feature. La chiusura del ticket era basata su endpoint live, non su surface player.
- **Dialogue color codes**: `mbtiTaggedLine` helper shipped, ma i dialoghi runtime (briefing, debrief, ennea voice lines) non producono `<mbti axis>` tagged text automaticamente. Il renderer `dialogueRender.js` è pronto ma non riceve mai tagged input dalla pipeline.
- **T_F esclusa da Thought Cabinet**: `mbti_thoughts.yaml` nota esplicitamente "T_F escluso: già surfacato via job_affinities nei Forms". Ma player non vede questo collegamento esplicito. Gap narrativo: T_F è l'asse più stabile e usato ma ha zero thoughts diegetici propri.
- **iter2 non è default**: E_I e S_N full coverage richiede `VC_AXES_ITER=2`. Default iter1 → E_I e S_N spesso `partial` o null in sessioni standard. Player classification incompleta.

**Verdict reale**:

> P4 = **🟡++ (non 🟢 candidato)**. Backend robusto, surfaces parziali. Il salto da 🟡++ a 🟢 candidato richiede: (A) ennea voice frontend wire, (B) iter2 come default o scope-limited playtest, (C) dialogue color pipeline wire.

La claim 🟢 candidato post-PR #2062 era **aspirational**, non verificata da Gate 5 audit. Ennea voice è l'anti-pattern "Engine LIVE Surface DEAD" più critico rimasto.

---

## Cross-layer con Forme + Job

### MBTI × Form binding

`data/core/forms/mbti_forms.yaml` 16 forme con `job_affinities` + `job_penalties`:
- Form INFJ ("Custode") ha `job_affinities: [guaritore, controllore]` e `job_penalties: [assaltatore]`
- `personalityProjection.js` computa distanza euclidea asse per asse → classifica form
- La classificazione informa `formEvolution.js` per evoluzione
- **Binding reale**: form_id `INFJ` + label "Custode" = il nome del form nel sistema. Non è coincidenza — 16 forme MBTI named in italiano

### MBTI × Job

- `mbti_forms.yaml` ha `job_affinities` + `job_penalties` per form
- `formEvolution.js` usa distanza form per gate evoluzione
- `requires:` block per threshold gate esplicito: **GHOST** (museum M-010). Senza quel block, le affinità sono soft (narrative label), non hard gate.

### Ennea × Specie

- Nessun binding diretto specie → archetype nel dataset
- vcScoring trigger gli archetipi da behaviour metrics (non da species_id)
- Trigger dipende da gameplay pattern, non da trait specie. Coerente con design — ennea è player-emergente

### MBTI × Recruit

- `debriefPanel.js` e `nestHub.js` mostrano label MBTI sui recruit (display only)
- Nessun gate attivo. TKT-P4-MBTI-003 = OPEN, pre-req OD-001 Path A

---

## Q per onboarding port (cross-ref Q1-Q5 sessione 2026-05-06)

Domanda: MBTI/Ennea informa onboarding choice → trait pre-assigned?

**Risposta da audit**:

- **Onboarding panel** (`apps/play/src/onboardingPanel.js`) ha Disco Elysium-style overlay (shipped PR #1726 V1) ma non usa le 4 axis MBTI come input
- Il Thought Cabinet si popola via gameplay metrics post-onboarding, non da scelta iniziale
- Il form (MBTI type) è **classificato** da comportamento, non pre-assegnato
- **Implication per onboarding port**: se vuoi MBTI/Ennea → trait pre-assign, serve un "seed choice" diegetic (es. 3 domande stile Disco Elysium → seed E_I/T_F/S_N/J_P parziale prima della prima sessione). Questo non esiste ora.
- **Rischio**: pre-assegnare MBTI da onboarding rompe il modello "MBTI emerge dal gameplay" che è l'intero premise del sistema. L'onboarding può mostrare il Thought Cabinet come UI affordance (già fatto) senza vincolare gli assi.

---

## Open architectural questions

1. **iter2 come default**: iter1 ha E_I e S_N spesso null/partial. Switch iter2 a default? Rischio: backward compat vcScoring consumers (mating, narrative qbn). Decision: ADR-level. Suggerito: A/B test via `VC_AXES_ITER=2` in playtest session config.

2. **Ennea voice frontend wire**: quale trigger? Opzioni: (A) post-action automatic (troppo frequente), (B) post-round summary (leggero), (C) debrief dedicated section (least disruptive). La (C) è la più sicura: mostra voce linea nel debrief per archetype triggered, analog a debrief ennea badge section già live.

3. **T_F esclusione da Thought Cabinet**: by-design perché "già surfacato via job_affinities". Ma player non vede questa connessione. Considerare: 1 thought T_F tier-1 per lato per completezza narrativa (minor effort ~30min authoring).

4. **Dialogue color pipeline**: `mbtiTaggedLine` helper ready. Chi emette i tag? Ennea voice lines + inner voices sono i candidati naturali (hanno already "tono narrativo" per-asse). Wire in `enneaVoice.js` + `innerVoice.js` output = low effort (<2h).

5. **MBTI ghost gate `requires:`**: museum M-010. Recovery via `git show 5c704524:...`. Vale ~3h per aggiungere hard gate per form evolution (vs attuale soft-affinity). Pre-req: decidere se P4 "gating" deve essere hard o soft per demo.

---

## Proposed tickets

```
TKT-P4-ENNEA-VOICE-FRONTEND: 4h — wire selectEnneaVoice in debrief panel (post-session voce per archetype triggered, analog ennea badge section)
TKT-P4-DIALOGUE-COLOR-PIPELINE: 2h — add mbtiTaggedLine wrap in enneaVoice.js + innerVoice.js output + verify dialogueRender.js receives tagged text
TKT-P4-ITER2-DEFAULT: 3h — promuovi iter2 a default + backward compat audit + test regression
TKT-P4-TF-THOUGHT: 2h — aggiungi 6 thoughts T_F in mbti_thoughts.yaml (tier 1+2+3 × 2 direzioni) per completezza narrativa Cabinet
TKT-P4-MBTI-003: 4-6h — recruit gating thresholds (Proposal C, pre-req OD-001 Path A)
TKT-P4-FORM-GATE-GHOST: 3h — recover mbti_gates.yaml ghost + add requires: block in mbti_forms.yaml + formEvolution.js validate
```

**Effort totale**: ~18-20h per chiudere P4 🟡++ → 🟢 def.

**P0 critico** (Gate 5 fail più grave): `TKT-P4-ENNEA-VOICE-FRONTEND` (4h). Ennea voice è il sistema più completo backend-side e completamente invisibile al player. È l'anti-pattern "Engine LIVE Surface DEAD" esemplare per P4.

---

## Sources lette (audit path)

1. `docs/museum/MUSEUM.md` — museum cards P4: M-009/M-010/M-027 (personality + narrative-disco)
2. `data/core/personality/mbti_axis_palette.yaml` — 8 colori WCAG AA
3. `data/core/narrative/ennea_voices/type_1.yaml` + `type_9.yaml` — voice palette canonical
4. `data/core/thoughts/inner_voices.yaml` — 24 inner voices 4 assi
5. `data/core/thoughts/mbti_thoughts.yaml` — 18 thoughts 3 assi (T_F escluso)
6. `data/core/forms/mbti_forms.yaml` — 16 form MBTI con affinities (40+ LOC letti)
7. `apps/backend/services/vcScoring.js` §523-681 — computeMbtiAxes iter1+iter2 + computeEnneaArchetypes
8. `apps/backend/services/mbtiSurface.js` — phased reveal + conviction badges
9. `apps/backend/services/mbtiPalette.js` — palette loader + dialogue tags
10. `apps/backend/services/enneaEffects.js` — 9 archetype mechanical effects
11. `apps/backend/services/narrative/enneaVoice.js` — voice selector 9/9
12. `apps/backend/services/thoughts/thoughtCabinet.js` — Thought Cabinet engine
13. `apps/backend/routes/session.js` §2650-2860 — P4 endpoints (/vc, /voice, /thoughts, /pf)
14. `apps/backend/routes/sessionRoundBridge.js` §895-958 — ennea effects wire
15. `apps/play/src/debriefPanel.js` — ennea badge + mbti section surface
16. `BACKLOG.md` §P4 section — ticket status TKT-P4-MBTI-001/002/003 + TKT-MUSEUM-ENNEA-WIRE/SKIV-VOICES
