---
name: parallel-sprint
description: Self-healing parallel sprint pipeline — N tickets fan-out to subagent workers + critic review against 4-gate DoD + auto-retry max 3 rounds, all autonomous
user_invocable: true
---

# Parallel Sprint

Self-healing autonomous sprint runner: orchestra N ticket P0/P1 in parallel via Task subagent, ognuno validato da un critic subagent contro la 4-gate DoD policy, con auto-retry fino a 3 rounds prima di escalate.

Codifica del pattern emerso dalla sessione 2026-04-25 notte (3 illuminator subagent paralleli + main thread) — but generalizzato a sprint completo, non one-off.

Fonte: `/insights` audit 2026-04-25 — opportunità "Self-Healing Autonomous Sprint Pipelines" + workflow validato 8-12 PR/sessione.

## Quando usarlo

- Hai backlog di 3-8 ticket P0/P1 indipendenti (non sequential dependency)
- Ogni ticket è ben-scoped (titolo + acceptance criteria chiari)
- Vuoi una sessione overnight unsupervised che termina con N PR draftati + report
- Hai tempo limitato (max 3-4h) e prefirsci width over depth

## Quando NON usarlo

- Ticket interdipendenti (PR1 deve mergiare prima che PR2 inizi)
- Ticket vagamente specificati (richiede design call mid-execution)
- Modifiche a runtime critico (combat resolver, session orchestrator) — preferisci serial supervised
- <3 ticket disponibili (overhead orchestrator non si paga)

## Argomenti

`<N>` = numero ticket da processare (default 5, max 8). Optional path `<backlog-file>` (default `BACKLOG.md`).

## Step

### 1. Pre-flight + ticket selection

```bash
git status -s  # working tree pulito? altrimenti STOP
git fetch origin main
git log HEAD..origin/main --oneline | head -5  # behind main?
```

Se behind main → `git rebase origin/main` o `git checkout origin/main` come baseline.

Read `BACKLOG.md` (o file specificato). Estrai prime N entry P0/P1 ticket. Per ogni ticket valida:

- Titolo univoco
- Acceptance criteria descritto (≥1 frase concreta)
- Scope ≤ 1 modulo / ≤ 50 LOC stimati
- Dependencies dichiarate (deve essere zero per parallel)

Se <N ticket validi → processa quanti possibile, segnala il gap.

### 2. Spawn N worker subagent in parallel (single message, multiple tool calls)

Per ogni ticket, spawn 1 subagent con prompt strutturato:

```
Agent({
  description: "<ticket-id>: <short scope>",
  subagent_type: "general-purpose",
  prompt: "
    AUTONOMOUS WORKER — Sprint <date> ticket <ticket-id>.

    CONTEXT:
    - Repo: $(pwd)
    - Branch base: origin/main (sha: <main-sha>)
    - Read CLAUDE.md §🔁 Autonomous Execution + §🌳 Worktree + §🔤 Encoding

    TICKET:
    <full ticket body from BACKLOG.md>

    ACCEPTANCE CRITERIA:
    <bullet list extracted>

    CONSTRAINTS (from 4-gate DoD CLAUDE.md):
    1. NON toccare: .github/workflows/, packages/contracts/, services/generation/, migrations/ (segnala se serve)
    2. Trait MUST stay in data/core/traits/active_effects.yaml (no hardcoded resolver)
    3. New npm/pip deps richiedono approval esplicita — listale separatamente, non installare
    4. Test required: aggiungi test per nuova logic. node --test tests/ai/*.test.js DEVE rimanere 307/307 verde
    5. Encoding: open() with encoding='utf-8' + ensure_ascii=False per write JSON multilingua
    6. Format: prettier --write su tutti i file modificati

    DELIVERABLE:
    - Crea branch claude/sprint-<date>-<ticket-id> da origin/main
    - Implementa il ticket
    - Run smoke + format + tests locale
    - **PRE-COMMIT MANDATORY**: salva il delta delle modifiche additivi su
      shared file in `scratch/<ticket-id>_delta.json` come dict
      {entry_id: <full body>}. Necessario per fallback rebase
      (vedi Step 6 conflict resolution).
      Esempio: { "trait_xy": {"tier": "T2", "effect": {...}, ...}, ... }
    - Push branch (NON committare scratch/, è gitignore-style ephemeral)
    - Open draft PR (gh pr create --draft) con titolo, body 'Closes <ticket-id>',
      test plan checklist
    - Return: { branch, pr_number, smoke_pass, tests_pass, format_pass,
                files_changed, delta_path: 'scratch/<ticket-id>_delta.json' }

    DO NOT MERGE. Solo open draft.

    Forbidden patterns (auto-reject by hook + critic):
    - Silent error swallowing: catch{}/except:pass/|| true (eccetto ENOENT documentato)
    - Wrong path edits: edit fuori worktree corrente
    - Mojibake: write JSON/YAML con char Ã (encoding error)
    - Loose tests: assert.ok(true), expect.toBeTruthy() senza specifico

    If blocker reale (missing prereq, ambiguità design): exit con verdict=BLOCKED + descrizione.
    Non auto-creare design plan mancante.

    Max execution: 25 min wall time.
  ",
  run_in_background: true
})
```

Spawn TUTTI in single message (parallel). Annota agent_id per ognuno.

### 3. Wait + collect results

Quando tutti i N agent ritornano (notification), raccogli i N JSON results.

Categorizza:

- ✅ DONE (smoke+test+format pass, draft PR aperto)
- 🟡 PARTIAL (PR aperto ma 1+ check fail)
- 🔴 BLOCKED (nessun PR, escalation testuale)
- ⚠️ TIMEOUT (>25 min, killato)

### 4. Spawn critic subagent per ogni DONE/PARTIAL

> **LESSON 2026-04-25** (prima execuzione live `/parallel-sprint`): 3/3 critic
> subagent failed (1 quota exhaustion + 2 stall a 600s). Recovery via
> main-thread direct Bash verification è 3x più veloce + deterministic.
> Vedi `feedback_critic_subagent_failure_mode.md` per pattern completo.

**Critic prompt budget MANDATORY**:

- Max **30 righe** di prompt (no checklist verbose)
- Output budget esplicito: "Return JSON sotto 50 token"
- Una sola sezione checklist (no nested bullet lists)
- Smoke test 1 comando (non 3-5 step composti)

Per ogni PR aperto, spawn 1 critic subagent (parallel se possibile):

```
Agent({
  description: "Critic review PR <num>",
  subagent_type: "general-purpose",
  prompt: "
    CRITIC <num> — verdict APPROVED|NEEDS-FIX|REJECT.

    Run via Bash (single shell, no narrative):
    1. gh pr diff <num> | head -200 → diff overview
    2. /verify-delegation skill checklist (5 anti-pattern)
    3. Smoke: <single command from ticket spec>
    4. gh pr checks <num> --required → CI status

    Return JSON sotto 50 token:
    { pr: <num>, verdict: 'APPROVED|NEEDS-FIX|REJECT',
      issues: ['file:line: <bug>'], smoke: 'pass|fail' }

    Be adversarial. NO 'looks good'.
  ",
  run_in_background: true
})
```

**Fallback automatic main-thread** (NEW): se 2/3 critic fail (quota OR stall
600s+) → main-thread esegue checklist direttamente via Bash batch. Pattern:

```bash
# Per ogni PR pending main-thread review
cd worktree-X && \
git diff origin/main..HEAD --stat && \
git diff origin/main..HEAD | grep -E "^\+.*(catch|except.*pass|\|\| true)" | head && \
grep -c "Ã" data/core/traits/*.{json,yaml} && \
git diff --name-only origin/main..HEAD | grep -E "^(\.github/|packages/contracts/)" && \
node -e "require('<changed module>'); console.log('smoke ok')" && \
gh pr checks <num> --required
```

Documentare verdetto inline nel sprint report come "APPROVED (manual fallback)".

**Anti-pattern**: NO retry sub-agent dopo 2 fail consecutivi (CLAUDE.md
§📡 "Subagent timeout 2x = stop retry"). Investiga prompt size / tool
config invece, OR vai a fallback main-thread.

### 5. Auto-retry loop (max 3 rounds)

Per ogni PR con verdict NEEDS-FIX o REJECT, re-dispatch worker subagent con:

```
Agent({
  description: "<ticket-id>: retry round <N>",
  subagent_type: "general-purpose",
  prompt: "
    RETRY round <N>/3 for ticket <ticket-id>.

    Previous critic verdict: <verdict>
    Issues found:
    <issues list>
    Suggested fixes:
    <suggested_fix list>

    Apply fixes to existing branch <branch>. Push update. Re-request critic review.

    Original ticket prompt: <original prompt>

    DO NOT widen scope. Only address listed issues.
  "
})
```

Dopo retry, ri-spawn critic. Loop fino:

- APPROVED → mark for merge
- 3 retry round senza APPROVED → escalate (no merge, leave PR draft, log in report)

### 6. Merge approved PRs (sequential)

> **LESSON 2026-04-25**: 3 PR additive su stesso file
> (`data/core/traits/active_effects.yaml`) → 3-way merge conflict ad ogni
> rebase. Naive regex resolve mangia struttura YAML (multi-line description
> blocks). PyYAML accepta MA js-yaml refuta → silent runtime break.
> Vedi `feedback_parallel_sprint_yaml_conflict_pattern.md`.

Per ogni PR APPROVED (sequenziale, NO parallel):

```bash
gh pr ready <num>  # da draft a ready
gh pr merge <num> --squash --delete-branch
```

**Conflict on shared-file additive PRs (3-step manual rebase fallback)**:

```bash
# 1. Reset working tree to main baseline (post-prev merge)
git checkout --ours <conflict-file>

# 2. Programmatic append delta only
#    (worker output should pre-save delta as JSON in scratch/ — see Step 2 below)
python3 -c "
import json, yaml
delta = json.load(open('scratch/<ticket>_delta.json'))
text = open('<conflict-file>').read()
for tid, body in delta.items():
    rendered = yaml.dump({tid: body}, allow_unicode=True, default_flow_style=False, sort_keys=False)
    indented = '\n'.join('  ' + L for L in rendered.splitlines())
    text += '\n' + indented + '\n'
open('<conflict-file>', 'w', encoding='utf-8', newline='\n').write(text)
"

# 3. Mark resolved + continue rebase
git add <conflict-file>
GIT_EDITOR=true git rebase --continue
git push --force-with-lease origin <branch>
```

**Validate post-rebase**: `node -e "require('<loader>').load()"` MUST succeed
e count = baseline + delta atteso. PyYAML success ≠ js-yaml success.

**Pre-spawn requirement** (NEW, see Step 2): chiedere a ogni worker di
salvare il delta come JSON deliverable in `scratch/<ticket>_delta.json`
(es. `{trait_id: {tier:..., effect:...}, ...}`). Pre-rebase extraction
zero-cost; senza, è quasi impossibile ricostruire il delta da diff
testuale di YAML multi-line.

**Alternative root fix** (recommended se ticket family > 3 su stesso file):
split target file per family in directory:

- `data/core/traits/active_effects/sensori.yaml`
- `data/core/traits/active_effects/mente.yaml`
- ...
- Loader: directory walk `*.yaml` → unified registry

Beneficio: zero conflict, zero rebase, ogni PR tocca un file distinto.

### 7. Generate sprint report

Path: `docs/process/sprint-$(date +%Y-%m-%d)-parallel-<slug>.md`

Template:

```markdown
---
title: Parallel Sprint <slug> — <date>
doc_status: active
workstream: cross-cutting
---

# Parallel Sprint <slug> — <date>

## Stats

- Tickets dispatched: <N>
- DONE first round: <X>
- NEEDS-FIX → APPROVED: <Y>
- BLOCKED/TIMEOUT/REJECT after 3 rounds: <Z>
- Merged: <Y_merged>
- Wall time: <h>

## Per-ticket outcome

| Ticket | PR  | Verdict | Rounds | Merged |
| ------ | --- | ------- | ------ | ------ |

## Escalations (require human)

- <ticket-id>: <reason>
- ...

## Lessons / patterns

- <pattern emerso>
```

### 8. Final output

```
✅ Parallel Sprint complete
Dispatched: N | Merged: M | Escalated: E
Report: docs/process/sprint-YYYY-MM-DD-parallel-<slug>.md

[If escalations]
🔴 Manual action needed:
- <ticket-id>: <reason>
```

## Anti-pattern blocklist

- ❌ NON spawnare worker se prereq missing — usa BLOCKED verdict invece
- ❌ NON merge senza critic APPROVED — anche se "ovvio è ok"
- ❌ NON >3 retry round — significa che il ticket è mal-scoped
- ❌ NON spawnare worker se backlog ticket non ha acceptance criteria
- ❌ NON usare per ticket sequential — overhead non vale, vai serial
- ❌ NON retry sub-agent dopo 2 fail consecutivi (quota / stall) — vai a fallback main-thread (CLAUDE.md §📡)
- ❌ NON usare regex naive per auto-resolve YAML conflict — rompe multi-line description block (PyYAML accept, js-yaml reject = silent runtime break)
- ❌ NON spawnare worker senza richiedere `scratch/<ticket>_delta.json` come deliverable — pre-rebase extraction è zero-cost MA recupero post-rebase è quasi impossibile

## Cross-references

- `CLAUDE.md` §🔁 Autonomous Execution
- `CLAUDE.md` §🌳 Worktree & Path Discipline (ogni worker rispetta)
- `CLAUDE.md` §🔤 Encoding Discipline (auto-detect via post-edit hook)
- `CLAUDE.md` §📡 System Notification Handling (subagent timeout 2x = stop)
- `.claude/commands/verify-delegation.md` (critic checklist)
- `.claude/commands/handoff.md` (run after parallel-sprint chiude)
- `BACKLOG.md` (default ticket source)
- `/insights` audit 2026-04-25 — opportunità "Self-Healing Autonomous Sprint Pipelines"
- `feedback_critic_subagent_failure_mode.md` (memory) — main-thread fallback pattern
- `feedback_parallel_sprint_yaml_conflict_pattern.md` (memory) — 3-step rebase fallback
- `docs/process/sprint-2026-04-25-parallel-validation.md` — first live validation report (3/3 worker DONE, 3/3 critic FAILED, 3/3 manual recovery, 3/3 merged with rebase fallback)

## Smoke test (dry-run before first real use)

Quando provi questa skill la prima volta, run con `<N>=1` e ticket fittizio "scrivi un comment in CHANGELOG.md sotto data odierna". Verifica:

- Worker subagent spawn OK
- Worker ritorna JSON con branch + pr_number
- Critic spawn OK
- Critic ritorna APPROVED (banale)
- Auto-merge OK
- Report generato correttamente

Se dry-run pass → safe per N=3-5 ticket reali.
