---
name: monitor
description: Design-direction monitor — assess project health against frozen pillars, reference repos, and architectural patterns
user_invocable: true
trigger: "come sto mettendo?", "cosa lavoro adesso?", "sono sulla strada giusta?", "monitor", "design check", "health check progetto", "stato progetto", "dove siamo?"
---

# Evo-Tactics Design Monitor

Comprehensive project health assessment against the 6 design pillars, 7 reference repos, and frozen architectural patterns.

## Reference baseline

Read these (targeted, not full):

- `CLAUDE.md` → grep "Pilastri di design" and "Sprint context" sections
- `docs/core/90-FINAL-DESIGN-FREEZE.md` → first 100 lines for freeze scope
- `docs/guide/external-references.md` → section A "DEEP DIVE" table (lines 20-33) for repo-pillar mapping
- `docs/planning/tactical-architecture-patterns.md` → "Riepilogo priorita" table (lines 22-40) for pattern adoption status

## Steps

### 1. Pillar health with reference-repo lens

For each pillar, assess current state AND alignment with reference patterns:

**P1 — Tattica leggibile (FFT)**
Reference: **wesnoth** (combat prediction, terrain defense), **boardgame.io** (round flow), **Frozen Synapse** (simultaneous turns), **Halfway** (grid readability)

- Check: `services/rules/resolver.py` — does `predict_combat()` exist and work?
- Check: terrain defense modifier implemented? (`grep "terrain_defense\|defense_mod" services/rules/ data/core/`)
- Check: all decision numbers surfaced? (hit%, damage range, MoS thresholds, cooldown — per Halfway lesson)
- Wesnoth pattern W1 (combat prediction): implemented? W4 (terrain defense): implemented?

**P2 — Evoluzione emergente (Spore)**
Reference: **bevy** (ECS composition), **Hades** (progression loop), **Cogmind** (modular components), **Binding of Isaac** (emergent combos)

- Check: trait combo system active? (`grep "combo\|synerg\|PP.*combo\|SG.*surge" apps/backend/`)
- Check: progression transforms gameplay, not just stat bumps? (per Halfway lesson)
- Bevy pattern: species = archetype bundle, job = system set? Check species JSON structure.

**P3 — Identita Specie x Job**
Reference: **OpenRA** (YAML actor-trait composition), **bevy** (bundles + required components)

- Check: `data/core/traits/active_effects.yaml` — traits are data-driven, not hardcoded?
- Check: species have meaningful differentiation beyond stats?
- OpenRA pattern: auto-generated trait docs? (`grep "gen_trait_docs\|gen_trait_types" tools/py/`)

**P4 — Temperamenti MBTI/Ennea**
Reference: **xstate** (personality FSM), **Theory of Fun** (learning patterns)

- Check: `statusEffectsMachine.js` uses xstate? MBTI axes implemented? Ennea themes in YAML?
- Check: `grep "deriveMbtiType\|ennea\|mbti" apps/backend/`

**P5 — Co-op vs Sistema**
Reference: **wesnoth** (AI composite), **boardgame.io** (MCTS bot), **AI War** (threat meter, asymmetry)

- Check: AI policy data-driven? (`data/core/balance/ai_intent_scores.yaml` exists?)
- Check: AI personality variants? (`data/core/balance/ai_profiles.yaml` exists?)
- AI War pattern: threat reattivo? Sistema punisce turtling?
- boardgame.io pattern: MCTS or weighted objectives for Sistema?

**P6 — Fairness**
Reference: **wesnoth** (20yr balance), **Machinations** (economy modeling), **Balatro** (emergent balance), **SpaceChem** (simple rules, emergent complexity)

- Check: resistance matrix implemented? (`grep "resistance\|species_resistance" packs/ data/core/`)
- Check: PT economy allows meaningful choices per turn? (3 PT budget analysis)

### 2. Pattern adoption tracker

From `docs/planning/tactical-architecture-patterns.md`, check which of the 16 patterns are implemented:

```bash
grep -rl "predict_combat" services/rules/ 2>/dev/null && echo "W1 combat prediction: YES" || echo "W1: NO"
grep -rl "terrain_defense" services/rules/ data/core/ 2>/dev/null && echo "W4 terrain defense: YES" || echo "W4: NO"
grep -rl "ai_intent_scores" data/core/ apps/backend/ 2>/dev/null && echo "W3 AI intent registry: YES" || echo "W3: NO"
grep -rl "statusEffectsMachine\|roundStatechart" apps/backend/ 2>/dev/null && echo "X1/X2 xstate FSM: YES" || echo "X1/X2: NO"
grep -rl "sistemaActor" apps/backend/ 2>/dev/null && echo "X3 Sistema actor model: YES" || echo "X3: NO"
grep -rl "movement_profiles" data/core/ packs/ 2>/dev/null && echo "W5 movement profiles: YES" || echo "W5: NO"
grep -rl "pluginLoader" apps/backend/ 2>/dev/null && echo "BEVY plugin modularity: YES" || echo "BEVY: NO"
grep -rl "narrativeEngine\|inkjs\|ink" apps/backend/ 2>/dev/null && echo "INK narrative: YES" || echo "INK: NO"
```

### 3. Technical health

```bash
node --test tests/ai/*.test.js 2>&1 | tail -5
npm run format:check 2>&1 | tail -3
git status --short
git log --oneline -10
```

### 4. Guardrail check

```bash
git log --oneline --name-only -10 | grep -E "(\.github/workflows/|packages/contracts/|services/generation/|migrations/)" || echo "No guardrail touches"
```

Hardcoded trait check:

```bash
grep -rn "artigli_sette_vie\|coda_frusta_cinetica\|scheletro_idro_regolante" services/rules/ apps/backend/routes/session*.js --include="*.js" --include="*.py" | grep -v "fallback\|test\|#\|//" | head -5
```

### 5. Game-Database sync check

```bash
git log --oneline -1 -- packs/evo_tactics_pack/docs/catalog/
```

Compare timestamp with last known evo:import run.

### 6. Produce scorecard

```
## Evo-Tactics Health Scorecard

### Design pillars
| # | Pilastro | Status | Reference alignment | Gap |
|---|----------|--------|-------------------|-----|
| 1 | Tattica leggibile | 🟢/🟡/🔴 | wesnoth W1/W4: YES/NO | ... |
| 2 | Evoluzione emergente | 🟢/🟡/🔴 | bevy ECS: YES/NO | ... |
| 3 | Identita Specie×Job | 🟢/🟡/🔴 | OpenRA YAML comp: YES/NO | ... |
| 4 | Temperamenti MBTI/Ennea | 🟢/🟡/🔴 | xstate FSM: YES/NO | ... |
| 5 | Co-op vs Sistema | 🟢/🟡/🔴 | AI War threat: YES/NO | ... |
| 6 | Fairness | 🟢/🟡/🔴 | wesnoth resistance: YES/NO | ... |

### Pattern adoption (from tactical-architecture-patterns.md)
| Pattern | Source | Implemented | File |
|---------|--------|:-----------:|------|
| W1 combat prediction | wesnoth | ✅/❌ | ... |
| W2 damage type matrix | wesnoth | ✅/❌ | ... |
| W3 AI intent registry | wesnoth | ✅/❌ | ... |
| W4 terrain defense | wesnoth | ✅/❌ | ... |
| B1 auto phase transitions | boardgame.io | ✅/❌ | ... |
| B2 centralized validation | boardgame.io | ✅/❌ | ... |
| X1 status effects FSM | xstate | ✅/❌ | ... |
| X2 round statechart | xstate | ✅/❌ | ... |
| X3 Sistema actor model | xstate | ✅/❌ | ... |
| INK narrative engine | ink | ✅/❌ | ... |
| BEVY plugin modularity | bevy | ✅/❌ | ... |

### Technical health
| Check | Status | Detail |
|-------|--------|--------|
| AI tests | 🟢/🔴 | X/45 pass |
| Format | 🟢/🔴 | ... |
| Working tree | 🟢/🟡 | clean / N files |
| Guardrails | 🟢/🔴 | ... |
| Hardcoded traits | 🟢/🔴 | ... |
| Game-Database sync | 🟢/🟡 | last catalog: <date> |

### Postmortem lessons check
| Lesson | Source | Status |
|--------|--------|--------|
| All decision numbers surfaced | Halfway | 🟢/🟡 |
| Enemy variety via AI personality | Halfway + AI War | 🟢/🟡 |
| Progression transforms gameplay | Halfway + Hades | 🟢/🟡 |
| Threat reattivo (no turtling) | AI War | 🟢/🟡 |
| Sistema response leggibile | AI War | 🟢/🟡 |
```

### 7. Suggest next steps

Priority order:

1. 🔴 items (broken/missing)
2. Unimplemented high-impact patterns from tactical-architecture-patterns.md
3. Postmortem lessons not yet addressed
4. Next milestone from Final Design Freeze roadmap

For each suggestion, cite the reference repo/postmortem that motivates it.

### 8. Authority reminder

If any finding contradicts freeze:

- A1 (ADR/hubs) > A3 (freeze) for boundary definitions
- A2 (data/contracts) > A3 for mechanical truth
- A3 > A5 for shipping scope

## Output

Caveman-compatible. Tables first, prose only for actionable gaps. Each gap cites reference repo or postmortem.
