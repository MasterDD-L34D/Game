---
name: handoff
description: Generate end-of-session handoff doc with PR list, blockers, next entry point, and memory dump
user_invocable: true
---

# Handoff

Codifica del rituale ricorrente "fine sessione → handoff doc per next session". Nasce da insights audit 2026-04-25 (pattern PR-merge-and-handoff ripetuto 8-12x/sessione, sprint compaction).

## Quando usarlo

- Fine sessione con ≥3 PR mergiati o ≥1 milestone chiusa
- Prima di `/clear` se vuoi continuità nella prossima sessione
- Dopo un blocco / decisione architetturale che next session deve sapere

## Argomenti

Optional: titolo sprint o milestone (es. `M14-D` o `vision-gap-V8`). Se omesso, infer da branch + commit recenti.

## Step

### 1. Identifica scope sessione

```bash
git log --oneline --since="6 hours ago" | head -20
gh pr list --state merged --search "merged:>$(date -u -d '6 hours ago' +%Y-%m-%dT%H:%M:%SZ)" --limit 20 --json number,title,mergedAt,mergeCommit 2>/dev/null || echo "no gh / fallback to git log"
```

### 2. Scrape PR closure data

Per ogni PR mergiato in finestra:

- numero + titolo
- SHA merge commit
- 1-line summary del cambio (NON copiare PR body intero)
- test impact (test count delta, suite affected)

### 3. Identifica blockers / residual

Cerca segnali nel branch + memoria conversazione:

- `TODO`, `FIXME`, `HACK` aggiunti net (post-sessione)
- Test skippati
- File `docs/blockers/*` creati
- Decisioni rimandate ("deferred", "next session")

### 4. Identifica next entry point

Cosa deve fare la prossima sessione:

- File:line specifico del prossimo edit (se sai dove)
- Comando da rieseguire (es. calibration harness N=10)
- Docs da leggere prima (handoff, ADR, planning)

### 5. Memory dump check

Se sessione ha prodotto pattern riutilizzabili:

- Nuovo workflow validato → propose `feedback_*.md` save
- Decisione progetto durevole → propose `project_*.md` save
- Path/system esterno scoperto → propose `reference_*.md` save

NON salvare auto. Lista candidati, chiedi conferma user.

### 6. Genera handoff doc

Path: `docs/planning/$(date +%Y-%m-%d)-<slug>-handoff.md` o `docs/process/sprint-$(date +%Y-%m-%d)-<slug>.md`

Template:

```markdown
---
title: Handoff <slug>
date: YYYY-MM-DD
sprint: <Mxx / vision-gap / etc>
doc_status: active
workstream: cross-cutting
last_verified: YYYY-MM-DD
source_of_truth: false
language: it
---

# Handoff <slug> — YYYY-MM-DD

## TL;DR (gamer recap pattern, opzionale)

3-5 bullet, what shipped + pillars moved + next unblock.

## PR mergiati (N)

| PR    | Scope  | SHA    | Test    |
| ----- | ------ | ------ | ------- |
| #XXXX | titolo | abc123 | +X test |

## Pillar / milestone delta

| # | Before | After | Note |

## Blockers residui

- [ ] <ticket>: descrizione + path:line se noto
- [ ] ...

## Next entry point

1. **First action**: <comando o file:line>
2. **Reference**: <docs da leggere>
3. **Estimated effort**: <h>

## Memory candidates

- [ ] feedback\_<slug>: <pattern emerso>
- [ ] project\_<slug>: <stato durevole>
- [ ] reference\_<slug>: <sistema esterno>
```

### 7. Update CLAUDE.md sprint context

Aggiungi block "Sessione YYYY-MM-DD <slug>" in sezione "Sprint context" di CLAUDE.md. Usa pattern già presente nei block precedenti (PR table + bullet milestone). NON cancellare block precedenti — append cronologico.

### 8. Commit handoff

```bash
git add docs/planning/<file>.md CLAUDE.md
git commit -m "docs(handoff): <slug> — <N> PR closure + next entry"
```

## Output finale

```
✅ Handoff scritto: docs/planning/<file>.md
✅ CLAUDE.md sprint context aggiornato
✅ N memory candidate (chiedi conferma per save)
📌 Next session entry: <first action>
```

Caveman compatible. Tabelle inline OK fino a ~10 righe, oltre → file solo.
