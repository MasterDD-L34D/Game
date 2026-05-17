---
title: 'L7c Promotions ORPHAN claim — discarded post cross-validation 2026-05-13'
museum_id: M-2026-05-13-001
type: discarded_decision_path
domain: ecosystem-audit-false-negative
provenance:
  found_at: docs/reports/2026-05-13-ecosystem-infrastructure-audit.md §Layer 7c (original claim)
  git_sha_first: c157553
  git_sha_last: 825b36b
  last_modified: 2026-05-13
  last_author: claude-code (audit) + claude-code-godot-v2 (cross-validation)
  buried_reason: false_negative_explore_agent_subdir_naming_heuristic
relevance_score: 4
reuse_path: 'Lesson codify per future Explore agent inventory tasks: grep cross sub-dir naming variants + import destrutturati cross routes'
related_pillars: [P2, P3]
related_od: [OD-025]
related_tickets: [TKT-ECO-A2, TKT-ECO-B7]
status: curated
excavated_by: claude-code (post cross-validation reception 2026-05-13 sera)
excavated_on: 2026-05-13
last_verified: 2026-05-13
---

# L7c Promotions ORPHAN claim — discarded post cross-validation 2026-05-13

## Summary (30s)

- **Claim discarded**: audit report 2026-05-13 [report](../../reports/2026-05-13-ecosystem-infrastructure-audit.md) classified L7c Promotions come **❌ ORPHAN COMPLETE** (zero engine, zero routes, zero surface, zero test).
- **Reality**: Promotions è **🟢 FULL WIRED full-stack** — Game/ engine 302 LOC + 2 endpoint REST + Godot v2 PromotionPanel + Postgres tiers JSONB.
- **Discovered via**: cross-session validation flag PR #2260 comment by master-dd, relayed Godot v2 wave 2026-05-13 closure session (`clever-brattain-ce2046` worktree).
- **Root cause**: Explore agent `a78266c567e691c28` ha cercato literal `apps/backend/services/promotions/` sub-dir, missato `apps/backend/services/progression/promotionEngine.js` (sub-dir naming variant). Speed/completeness tradeoff (226s, 51k token).

## What was buried (the false claim)

Audit report originale §Layer 7c affermava:

```
**Layer 7c — Promotions**
- Dataset: data/core/promotions/promotions.yaml (43 LOC) ✅
- Engine runtime: ❌ ZERO. Nessun service in apps/backend/services/promotions/.
- Routes: ❌ ZERO.
- Surface player: ❌ ZERO.
- Test coverage: ❌ ZERO.
- Status: ❌ ORPHAN COMPLETE
- Action: o sandbox header `# STATUS: proposal-only` + ADR, o demolish + remove file.
```

Plan derivato:
- TKT-ECO-A2 — "Promotions sandbox header" (~10 min)
- TKT-ECO-B7 — "Promotions demolish vs implement" (2-15h)
- OD-025 — "Promotions YAML demolish o implement?" default `demolish + sandbox header`

## Ground truth (verified `grep` diretto 2026-05-13 sera)

```
$ ls -la apps/backend/services/progression/
-rw-r--r-- 9494 May 11 19:34 promotionEngine.js
-rw-r--r-- ... progressionApply.js
-rw-r--r-- ... progressionEngine.js
-rw-r--r-- ... progressionLoader.js
-rw-r--r-- ... progressionStore.js

$ wc -l apps/backend/services/progression/promotionEngine.js
302 apps/backend/services/progression/promotionEngine.js

$ grep -n "promotionEngine\|evaluatePromotion\|applyPromotion" apps/backend/routes/session.js
208:const { evaluatePromotion, applyPromotion } = require('../services/progression/promotionEngine');
2670:        ...evaluatePromotion(u, session.events || []),
2699:      const eligibility = evaluatePromotion(unit, session.events || []);
2706:      const result = applyPromotion(unit, targetTier);

$ grep -n "promotion-eligibility\|/promote" apps/backend/routes/session.js
2656: GET /api/session/:id/promotion-eligibility
2658: POST /api/session/:id/promote
2663: router.get('/:id/promotion-eligibility', ...)
2681: router.post('/:id/promote', ...)
```

**Cross-stack live (Godot v2 + Postgres confirmed da Godot session)**:
- Godot v2 engine `promotion_engine.gd` (PR #226)
- Godot v2 UI `PromotionPanel.tscn` (PR #243)
- Godot v2 caller wire E3 (PR #252)
- D2-C Postgres `promotion_tiers` JSONB (PR #2259 + #253 + #254 + #256)

**Conclusion**: Promotions è tra i pillar cross-stack più completi del progetto.

## Why it was buried (root cause analysis)

**Pattern miss #1 — sub-dir naming heuristic literal**:

Explore agent in T1 audit task ha ricevuto prompt:
> "**Layer 7 Creature giocabili + Evoluzioni**: ... `apps/backend/services/` cerca `form*.js`, `mutation*.js`, `promotion*.js`, `evolution*.js`, `dynamicEvents*`"

Agent ha eseguito approssimativamente:
```bash
ls apps/backend/services/ | grep -iE "form|mutation|promotion|evolution"
```

Restituendo solo top-level dirs/files. Il pattern `progression/promotionEngine.js` è **2 livelli sotto** + naming non literal (`promotion` vs `progression/promotion*`).

**Pattern miss #2 — import destrutturato non literal**:

Routes `session.js:208`:
```js
const { evaluatePromotion, applyPromotion } = require('../services/progression/promotionEngine');
```

Greppato literal "promotion" in `routes/` avrebbe trovato. Ma agent ha greppato literal sub-dir name `promotions/`, non function name.

**Pattern miss #3 — speed/completeness tradeoff**:

Subagent `Explore` ha task profile "fast read-only search" con `medium` breadth default. 226s execution + 51k token + 85 tool uses → trovato 80% dei layer correttamente, missato 1 false negative su 11 strati.

**Pattern miss #4 — museum-first protocol blind spot**:

Museum non aveva card per L7c Promotions (nessuna card promotion-related). Assenza card ≠ assenza wire. Museum-first protocol ottimo per "ho già visto questo dominio" ma blind spot per "domini mai catalogati".

## Why it might still matter (lessons codified)

### Lesson 1 — Future Explore agent inventory pattern

**Pattern do**: per "engine inventory cross-domain", grep cross varianti naming:
```bash
# DON'T (literal sub-dir):
ls apps/backend/services/ | grep "promotion"

# DO (cross sub-dir variants):
find apps/backend/services -name "*promot*" -o -name "*progress*"
grep -rn "Promotion\|promotion" apps/backend/services apps/backend/routes \
  --include="*.js" --include="*.ts" -l
```

### Lesson 2 — Import destrutturato detection

Cerca cross-pattern import:
```bash
grep -rn "require.*progression\|require.*promotion" apps/backend/routes/
grep -rn "from.*progression\|from.*promotion" apps/backend/routes/
```

### Lesson 3 — Cross-validation prima di "ORPHAN" claim

Anti-pattern killer: prima di dichiarare uno strato "ORPHAN COMPLETE", chiedere subagent secondario indipendente verify (10-min cost) o smoke test live (POST endpoint → expected response). 30 min cost vs ~5h falso plan ticket budget.

### Lesson 4 — Schedule completionist-preserve audit

Quando audit produce TL;DR table per pillar/strato status, riservare 10 min smoke test per ogni "ORPHAN" claim prima di shipping report. Promote pattern: "ORPHAN = pending live verify (vedere TKT-VERIFY)" invece di "ORPHAN = confirmed".

### Pillar match

- **P2 Evoluzione 🟢++**: Promotions è meccanica core P2 (Spore-style tier advance). Discoperta wire stack chiude gap perceived "Forms only".
- **P3 Identità Specie × Job 🟢ⁿ**: tier promotion sblocca varianti job (Stalker → Stalker Élite) — meccanica di identity development.

## Concrete reuse paths (corrections applied)

1. **Audit report fix** (~5 min): §Layer 7c rewritten with ground truth + correction note + provenance trail. ✅ APPLIED PR #2260
2. **Plan TKT-ECO-A2 revised** (~5 min): "sandbox header" → "verify-only smoke" 0.5h. Surface preserve. ✅ APPLIED
3. **Plan TKT-ECO-B7 cancelled** (~5 min): "demolish vs implement" → cancelled, premise FALSE. Effort saved 2-15h. ✅ APPLIED
4. **OD-025 cancelled** (~5 min): "Promotions demolish o implement?" → CANCELLED. ✅ APPLIED
5. **Plan §risk register addition** (~5 min): "Explore agent sub-dir naming heuristic miss" + mitigation. ✅ APPLIED
6. **TKT-ECO-A2 verify-only smoke execution** (~30 min, autonomous): boot backend + POST /api/session/:id/promote + cross-stack Godot v2 fire same flow. **PENDING**.

## Sources / provenance trail

- **Cross-validation flag**: PR #2260 comment by master-dd 2026-05-13, content originated from Godot v2 wave 2026-05-13 closure session (`clever-brattain-ce2046` worktree)
- **Audit report**: [docs/reports/2026-05-13-ecosystem-infrastructure-audit.md](../../reports/2026-05-13-ecosystem-infrastructure-audit.md) §Layer 7c CORRECTED
- **Plan**: [docs/planning/2026-05-13-ecosystem-research-solution-plan.md](../../planning/2026-05-13-ecosystem-research-solution-plan.md) TKT-ECO-A2/B7 revised
- **Game/ ground truth files**:
  - `apps/backend/services/progression/promotionEngine.js:1` (302 LOC)
  - `apps/backend/routes/session.js:208,2656,2663,2670,2681,2699,2706`
  - `data/core/promotions/promotions.yaml` (43 LOC)
- **Godot v2 cross-stack PR trail**: #226 (engine) + #243 (UI) + #252 (caller wire E3) + #2259/253/254/256 (Postgres D2-C JSONB tiers)
- **Explore agent execution**: `a78266c567e691c28` (audit task 2026-05-13, 226s, 51k token, 85 tool uses)

## Risks / open questions

- ⚠️ **Other false negatives in audit?** L2/L3/L4 "DATASET-ONLY" claims potrebbero essere false negative simili. Mitigation: smoke test endpoint sample per layer + master-dd cross-check Godot v2 side.
- ⚠️ **Pattern systemic Explore agent**: questo è il primo false negative documentato per Explore agent. Se ripetuto, aggiornare prompt template Explore con esempio sub-dir variant grep.
- ✅ **Discard preserved (NOT silent)**: museum card additive-only protocol applicato. Future Claude reading audit non perde contesto del falso claim — può imparare dal pattern miss.

## Anti-pattern reinforcement

Aggiungere a CLAUDE.md §Verify Before Claim Done:

> **Anti-pattern audit (2026-05-13 lesson)**: prima di dichiarare uno strato "ORPHAN COMPLETE" in audit report, eseguire 1 smoke test live (POST endpoint o grep cross sub-dir naming variants). Cost ~10 min, evita 2-15h wasted ticket budget.

## Next actions

- [x] Audit report §Layer 7c corrected (this commit)
- [x] Plan TKT-ECO-A2/B7 revised (this commit)
- [x] OD-025 cancelled (this commit)
- [x] Risk register updated (this commit)
- [x] Museum discard card created (this file)
- [ ] PR #2260 reply comment to master-dd (next step)
- [ ] TKT-ECO-A2 verify-only smoke execution (P0 autonomous follow-up)
- [ ] CLAUDE.md anti-pattern reinforcement update (defer to closure session)
