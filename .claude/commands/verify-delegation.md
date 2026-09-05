---
name: verify-delegation
description: Post-delegation validation gate — diff review + constraint checklist + smoke test before commit (Aider/sub-agent rescue pattern)
user_invocable: true
---

# Verify Delegation

Validation gate da eseguire DOPO che un sub-tool (Aider, subagent, codex, esterno) ha prodotto codice e PRIMA di committare. Codifica del rescue pattern emerso da `/insights` audit 2026-04-25 ("Aider delegation produced code with 5 constraint violations including a silent-fail bug, requiring manual rescue").

## Quando usarlo

- Subito dopo che Aider / un agent / un tool esterno ha completato la sua passata
- Prima di `git add`/`git commit` su file toccati da delegation
- Quando hai un sospetto su silent-fail / bias / constraint violations

## Argomenti

Optional: `<glob>` di file modificati da verificare (es. `apps/backend/services/**`). Se omesso, infer da `git diff --name-only`.

## Step

### 1. Identifica delta di delegation

```bash
git status --short
git diff --stat
git diff --name-only
```

Lista file toccati. Se >10 file → chiedi user conferma scope (potrebbe essere over-delegation).

### 2. Diff review vs constraint checklist

Per ogni file modificato, controlla i 5 anti-pattern noti:

#### 2.1 Silent error swallowing (CRITICO)

Cerca pattern di catch-and-ignore che mascherano fallimenti:

```bash
git diff -- '*.js' '*.ts' '*.py' | grep -E "^\+.*(catch.*\{[^}]*\}|except.*pass|\.catch\(\(\) => \{\}\)|\|\| true|\|\| null|2>/dev/null)" | head -20
```

Per ogni hit:

- È un legitimate fallback (es. ENOENT su optional config) o silent swallow?
- Errore loggato? Telemetry emessa?
- Cloud/fallback branch ha behavior diverso da happy path?

Verdict: ✅ legitimate / 🔴 silent-fail bug / 🟡 needs review

#### 2.2 Cross-platform encoding violations

```bash
git diff -- '*.json' '*.yaml' '*.md' '*.py' | grep -E "^\+" | grep -c "Ã" || echo 0
```

Se >0 → warn (auto-detected anche dal post-edit hook ma double-check).

```bash
git diff -- '*.py' | grep -E "^\+.*open\(" | grep -vE "encoding\s*=" | head -5
```

Se hits → 🟡 missing explicit encoding; 🔴 se è un file write su content multilingua.

#### 2.3 Forbidden directory edits

```bash
git diff --name-only | grep -E "^(\.github/workflows/|packages/contracts/|services/generation/|migrations/)" | head
```

Se hits → 🔴 STOP. Guardrail violato (CLAUDE.md). Verifica se intent legittimo + signal user.

#### 2.4 Test coverage regression

```bash
git diff -- 'tests/**' | head -30
```

- Test aggiunti per nuova logica? Conta `^+test(` / `^+def test_`.
- Test esistenti modificati? Verifica che non sia loose (`assert.ok(true)`, `expect(x).toBeTruthy()` invece di assert specifici).
- Skip aggiunti? `@skip`/`it.skip`/`xtest` → 🔴 inserire issue tracker.

#### 2.5 Tag/passive/effect_type drift

Per repo Evo-Tactics specifically:

```bash
git diff -- 'data/core/**.yaml' | grep -E "^\+.*effect_type:" | sort -u
```

Verifica ogni nuovo effect_type vs `apps/backend/services/combat/abilityExecutor.js` registry. Stesso per `passive.tag` vs `progressionEngine.js listPassives()`.

```bash
git diff -- 'data/core/traits/**' | grep -E "^\+.*kind:" | sort -u
```

Verifica `effect.kind` vs supportati `apply_status|extra_damage|damage_reduction` in `traitEffects.js`.

### 3. Smoke test changed code path

Identifica entry point del cambiamento:

- Se backend route → `node -e "const r = require('./apps/backend/routes/<route>.js'); ..."`
- Se trait/balance YAML → `node -e "const {loadActiveTraitRegistry} = require('./apps/backend/services/traitEffects.js'); console.log(Object.keys(loadActiveTraitRegistry()).length);"`
- Se Python module → `python3 -c "from <module> import <fn>; <fn>(<sample_input>)"`
- Se schema/validator → run schema lint (`npm run schema:lint`, `python3 tools/check_docs_governance.py --strict`)

Se non hai smoke point ovvio → run il test suite più vicino:

```bash
node --test tests/ai/*.test.js 2>&1 | tail -5
```

### 4. Adversarial review prompt (opzionale ma consigliato per LARGE delegation)

Se delegation ha >50 LOC nuove o tocca runtime critico, spawn un subagent critic:

```
Agent({
  description: "Adversarial review of delegated changes",
  subagent_type: "general-purpose",
  prompt: "Review git diff of <branch> with adversarial mindset. List 3-5 concrete bugs/risks WITH file:line references. Do NOT just summarize what changed — find what's broken. Specifically check: silent error swallowing, off-by-one in loops, forgotten await, missing null checks, race conditions. Report under 200 words."
})
```

### 5. Verdict + decisione

Stendi 1 verdict per file modificato. Aggrega in 3 categorie:

- ✅ **READY**: clean, smoke pass, no anti-pattern → procedi al commit
- 🟡 **NEEDS-FIX**: 1-3 issue minori → fix inline THEN commit
- 🔴 **REWRITE**: silent-fail / forbidden dir / >5 issue → STOP, segnala user, considera revert

NON committare se anche un solo file è 🔴.

### 6. Output finale

```
✅ Verify Delegation Report
File toccati: N
Verdict: READY=X, NEEDS-FIX=Y, REWRITE=Z

[Se NEEDS-FIX]
Fix inline:
- file:line: <action>
...

[Se REWRITE]
🔴 STOP. Issue trovati:
- file:line: <bug specifico>
...
Action: revert delegation OR re-prompt sub-tool con failure report appended
```

## Anti-pattern blocklist

- ❌ NON skippare smoke test per "ho fiducia nel sub-tool" — la fiducia è cosa che VERIFICHI
- ❌ NON committare anche solo 1 file 🔴 sperando "lo sistemiamo dopo"
- ❌ NON loosen-up un test esistente per farlo passare (è il sintomo, non la cura)
- ❌ NON aggiungere `try/except: pass` come "fix rapido" (= silent-fail bug)

## Cross-references

- `docs/adr/ADR-0008-aider-delegation.md` (se esiste — pattern documentato)
- `CLAUDE.md` §🔁 Autonomous Execution "Verify config changes" (3-step pattern)
- `CLAUDE.md` §🔤 Encoding Discipline (auto-detect via post-edit hook)
- `.claude/hooks/post-edit-validate.sh` (auto JSON/YAML lint + mojibake)
- `/insights` audit 2026-04-25 — friction "buggy_code 23 incidenti"
