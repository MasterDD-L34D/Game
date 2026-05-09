---
title: 'Status Effects v2 Phase A — Design call 2026-05-09'
date: 2026-05-09
doc_status: active
doc_owner: claude-code
workstream: combat
last_verified: '2026-05-09'
source_of_truth: false
language: it
review_cycle_days: 14
---

# Status Effects v2 Phase A — Design call 2026-05-09

> Complemento all'audit `2026-05-09-status-effects-phase-a-audit.md`.
> Phase A runtime già completo. Questa sessione copre i 2 gap backendabili:
> PR-A (glossary) e PR-B (policy AI).

## PR-A — Glossary sync (5 trait Phase A)

### Scope

Aggiungere 5 entry a `data/core/traits/glossary.json` per i trait produttori
Phase A. Attualmente assenti (grep 0 match), bloccano `trait-lint` CI check.

### Entry da aggiungere

| Trait ID             | label_it                   | label_en              | Stato      |
| -------------------- | -------------------------- | --------------------- | ---------- |
| `tela_appiccicosa`   | Tela Appiccicosa           | Sticky Web            | slowed     |
| `marchio_predatorio` | Marchio Predatorio         | Predatory Mark        | marked     |
| `respiro_acido`      | Respiro Acido              | Acid Breath           | burning    |
| `aura_glaciale`      | Aura Glaciale              | Glacial Aura          | chilled    |
| `sussurro_psichico`  | Sussurro Psichico          | Psychic Whisper       | disoriented|

### Description strategy

Derivato da `description_it` in `active_effects.yaml` (linee 9399–9487).
Format identico agli entry esistenti: `{ label_it, label_en, description_it, description_en }`.

### Hook point

`data/core/traits/glossary.json` — append prima della chiusura `}`.
**LOC**: +35 (5 × 7 righe). **Rischio**: zero. **Test**: nessuno da aggiungere
(test esistenti non toccano glossary entries individuali).

### Anti-pattern guard

- NON modificare `active_effects.yaml` in questo PR (solo glossary.json)
- Encoding UTF-8 esplicito su scrittura (CLAUDE.md §🔤)
- Verify: `grep -c "tela_appiccicosa" data/core/traits/glossary.json` → 1

---

## PR-B — policy.js AI status-awareness

### Scope

Rendere l'AI del Sistema consapevole dei 5 nuovi stati per decisioni di
targeting. Due modifiche additive, nessuna modifica al resolver.

### 1. `DEFAULT_OBJECTIVES` — nuovo obiettivo `attack_debuffed_target`

**File**: `apps/backend/services/ai/policy.js`
**Dopo**: linea 244 (`maintain_range` objective)

```javascript
attack_debuffed_target: {
  checker: (actor, target) => {
    const s = target?.status;
    if (!s) return false;
    return (
      Number(s.slowed) > 0 ||
      Number(s.disoriented) > 0 ||
      Number(s.chilled) > 0 ||
      Number(s.marked) > 0
    );
  },
  weight: 0.5,
},
```

**Rationale**: peso 0.5 < 0.6 (protect_low_hp) = debuffed è preferenza soft,
non override. L'AI preferisce target debuffati a parità di HP.

**Effetto**: solo su `selectAiPolicyUtility` (utility brain path). Base policy
non usa `scoreObjectives` direttamente.

### 2. `pickTargetExcluding` — debuff tie-break

**File**: `apps/backend/services/ai/declareSistemaIntents.js`
**Funzione**: `pickTargetExcluding` (inline line ~153)

Attualmente: puro lowest-HP. Modifica: a parità di HP (±2 PT), preferisce
target con stato debilitante (slowed/disoriented/chilled/marked).

```javascript
function hasDebuffStatus(unit) {
  const s = unit?.status;
  if (!s) return false;
  return (
    Number(s.slowed) > 0 ||
    Number(s.disoriented) > 0 ||
    Number(s.chilled) > 0 ||
    Number(s.marked) > 0
  );
}
```

Modificare `reduce` in `pickTargetExcluding`:
```javascript
return candidates.reduce((best, c) => {
  if (!best) return c;
  const hpDiff = c.hp - best.hp;
  if (Math.abs(hpDiff) > 2) return hpDiff < 0 ? c : best;
  // tie-break: prefer debuffed
  if (hasDebuffStatus(c) && !hasDebuffStatus(best)) return c;
  if (!hasDebuffStatus(c) && hasDebuffStatus(best)) return best;
  return hpDiff < 0 ? c : best;
}, null);
```

**Rationale**: `±2 PT` tie-break evita che l'AI ignori un target a 1 HP per
inseguire un target a 3 HP con debuff. Solo a parità stretta il debuff conta.

**LOC totale PR-B**: ~25 LOC (15 policy.js + 10 declareSistemaIntents.js).
**Rischio**: basso. Non tocca resolver, schema, contracts.

### Test PR-B (2 nuovi in test/ai/statusEffectsPhaseA.test.js)

1. `hasDebuffStatus: slowed/disoriented/chilled/marked → true` (spec locale)
2. `attack_debuffed_target objective: fires when target has debuff` (scoreObjectives spec)

---

## Deferred (not this session)

### Gate 5 HUD surface — burning/chilled/slowed icons

- **Where**: Godot v2 `unit_info_panel.gd` + combat log
- **Effort**: ~3-4h frontend
- **Trigger**: prima sessione Godot v2 post-Day 7

### Phase B stati — interazioni

- `burning` + `chilled` cancel → reward +1 PT (design call pendente master-dd)
- `chilled` → `frozen` upgrade su doppia applicazione
- `burning` resistenza specie acquatiche

### policy.js burning-awareness

Potenziale: AI con unit burning su target non insegue (DoT fa lavoro) →
risparmia AP. Deferred: richiede HP-prediction logic (quanto il DoT uccide?).
Medium complexity, basso ROI immediato.

---

## Stop criteria sessione

- 5/5 test status effects pass (baseline invariata 42/42)
- `grep` verify glossary 5 entries presenti
- PR-A merged → PR-B starts da main aggiornato
- AI test totale: 220 pass, 10 fail infrastructure (invariato — no regression)
