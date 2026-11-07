---
title: 'docs_registry reconcile pass — append+validate+reconcile (NO fail-on-diff) — follow-up #2489'
workstream: ops-qa
category: spec
doc_status: active
doc_owner: claude-code
last_verified: '2026-05-31'
source_of_truth: false
language: it
review_cycle_days: 60
tags: [governance, registry, reconcile, anti-drift, ci, follow-up-2489]
---

# docs_registry reconcile — design

> Follow-up 2 di #2489 (harsh-review P0-3 DEFERRED: "populate-registry e' append-only, 655 entry +
> campi git-date -> un naive full-gen + git-diff gate CHURNA ad ogni PR"). Metodo: research-lite
> (shape verificato sui file reali) → questo spec → harsh-review SDMG → build → QG.

## Harsh-review adottato (critic 4-pass, 2026-05-31 — "se rigetta adotto, non difendo")

VERDICT critic = ACCEPT-WITH-FIXES (3 must-fix). Tutti adottati — il critic ha SIMULATO la reconcile
"as-written" e misurato un **diff da 758 righe** (= ESATTAMENTE il churn P0-3 che lo spec vuole evitare):

1. **Sync SCOPED a `source_of_truth: True`** (Pri-1, era 🔴): la mia Sync era unscoped (tutte le 651
   entry → 666 field-change). Ground-truth: `check_docs_governance.validate_registry:230` emette
   `frontmatter_registry_mismatch` SOLO dentro `if entry.get("source_of_truth") is True`. Quindi le
   uniche entry che possono driftare sono le **52 SoT=True**; scopare la sync lì = ESATTAMENTE i 2
   mismatch odierni, zero churn sulle altre 603.
2. **NO re-sort** (Pri-2, era 🔴): il registry NON e' path-sorted oggi (**196/655 posizioni fuori
   ordine**); `save_registry:244` ri-ordina sempre → anche una sync corretta a 2 campi produrrebbe un
   diff di reorder. Fix: reconcile scrive **preservando l'ordine corrente** (NON usa `save_registry`),
   stesso formato (`json.dumps(indent=2, ensure_ascii=False)+"\n"`) → diff = solo i 2 valori.
3. **Prune OPT-IN (`--prune`, default OFF)** + rationale-reuse corretta (Pri-3, era 🟡): il check
   NON auto-rimuove di proposito (`:226-228` solo ERROR) = safety; il prune la inverte (un doc assente
   su un branch perderebbe curation `primary`/`track`). Default OFF (0 prune oggi → costo zero). E il
   riuso del parser-del-check e' un **guard di robustezza** (per i 104 file con date quotate), NON cio'
   che fa funzionare i 2 fix odierni (entrambi hanno `last_verified` NON quotato → i due parser concordano).

## Ground-truth (MISURATO 2026-05-31, non asserito)

- `docs_registry.json`: **655 entry** (dict, chiave `entries`), **52 con `source_of_truth: True`**,
  **NON path-sorted** (196 posizioni off), `path_missing=0`.
- `docs_governance_migrator.py:390 cmd_populate_registry` = **append-only** (skip se esiste, append,
  mai rimuove/ri-sincronizza; `last_verified` nuovo = `today_str()` → campo git-date-ish).
- `check_docs_governance.py:230`: mismatch-compare **gated su `source_of_truth is True`**;
  `path_missing` = ERROR (mai rimuove); `frontmatter_registry_mismatch` = WARNING su ogni
  `DEFAULT_REQUIRED_FIELDS` (doc_status, doc_owner, workstream, last_verified, source_of_truth,
  language, review_cycle_days), `str(fm[f]) != str(entry[f])`; parser **strippa quote** + tipizza bool/int.
- Live: **errors=0, warnings=329** = 327 stale + **2 frontmatter_registry_mismatch** + 0 path_missing.

I 2 mismatch (entrambi SoT=True, entrambi `last_verified`):

| Doc                                                    | frontmatter | registry   | git-truth                                                    |
| ------------------------------------------------------ | ----------- | ---------- | ------------------------------------------------------------ |
| `docs/adr/ADR-2026-04-30-pillar-promotion-criteria.md` | 2026-04-30  | 2026-05-07 | reg 05-07 = batch-bump senza commit file → fm e' verita'     |
| `docs/combat/combat-canon.md`                          | 2026-05-18  | 2026-05-06 | reg 05-06 STALE; fm 05-18 = edit reale (commit) → fm verita' |

## Decisione (c): registry STAYS append+validate+RECONCILE — NO deterministic fail-on-diff

Ratificata da harsh-review #2489 P0-3, ri-verificata qui (e ri-confermata dal critic): un full-gen +
`git diff --exit-code` sul registry **NON va bene** perche' (1) append-only + `last_verified=today()`
per nuovi → churn data-dipendente; (2) il registry mescola fatti-da-frontmatter (sincronizzabili) con
fatti-curati (`primary`, `track`, ordine) che un full-gen distruggerebbe. Modello: **append (nuovi) +
validate (warning su drift) + RECONCILE (fixer idempotente on-demand)**. Reconcile NON e' un gate.

## Reconcile — contratto (`docs_governance_migrator.py reconcile`)

Nuovo subcommand `reconcile`:

- **Sync (default ON, SAFE)**: SOLO le entry `source_of_truth is True` (= superficie warning del check).
  Per ogni campo in `DEFAULT_REQUIRED_FIELDS` presente nel frontmatter dove `str(fm[f]) != str(entry[f])`
  → `entry[f] = fm[f]`. **frontmatter = verita'** (attestazione umana, #2489). Oggi = 2 cambi.
- **Prune (OPT-IN `--prune`, default OFF)**: rimuove le entry il cui `path` non esiste su disco. Senza
  `--prune`, in dry-run le STAMPA come "would prune" ma NON rimuove (il check non auto-rimuove di
  proposito → safety; prune opt-in evita perdita curation su doc branch-assenti). 0 oggi.
- **NO re-sort**: scrive preservando l'ordine corrente delle entry (NON `save_registry`, che ri-ordina),
  con `json.dumps(registry, indent=2, ensure_ascii=False) + "\n"` (stesso formato) → diff = solo i campi cambiati.
- **Riuso**: `parse_frontmatter` + `DEFAULT_REQUIRED_FIELDS` da `check_docs_governance.py` (parser
  autoritativo: strippa quote + tipizza). Guard di robustezza per le date quotate (104 file); per i 2
  fix odierni i due parser concordano comunque (date non quotate). Import locale (entrambi in `tools/`).
- `--dry-run`: stampa sync (+ would-prune) senza scrivere. Default: scrive. Stdlib only, no nuove dipendenze.
- Idempotente: 2ª run = 0 sync, 0 prune.

## Effetto sui 2 mismatch + delta stale (MISURATO, onesto)

`reconcile` → registry `last_verified` sincronizzato al frontmatter:

- ADR-pillar: 2026-05-07 → **2026-04-30**. git: il 05-07 era un batch-bump senza commit-file → fm e'
  l'attestazione reale. cycle=60 → due 2026-06-29 > oggi → **resta fresh** (nessun nuovo stale).
- combat-canon: 2026-05-06 → **2026-05-18**. git: il 05-18 e' un edit reale post-batch. Il 05-06 era
  **stale oggi** (due 05-20 < 05-31) → la sync **rimuove 1 stale** (due → 06-01 > oggi).

**Delta netto QG**: 2 `frontmatter_registry_mismatch` → 0; **stale 327 → 326** (combat-canon si chiude,
ADR non ne crea). errors=0. (NON regressione: stale smascherato = verita'.)

## NO CI wiring + alternativa hand-edit (onesto su scope/valore)

Reconcile NON wired in `.github/workflows/` (forbidden-path) in questo PR → resta on-demand, PR
auto-merge-eligible. **Onesto**: i 2 fix odierni si potrebbero fare a mano (2 valori JSON). Il tool si
giustifica come **infra preventiva** (655 entry in crescita; colma il gap prune che il check NON ha — il
check solo ERRORs su path_missing) + idempotente + 1-comando. Wiring futuro warn-only `reconcile
--dry-run` nel cron lunedi di docs-governance.yml = **deferred, master-dd-gated** (forbidden-path),
tracked così il tool non resta shelfware.

## Build plan (smoke-gated, locale python+git — NO game backend)

1. `cmd_reconcile` (sync SoT-scoped, write order-preserving, `--prune` opt-in, `--dry-run`) + parser + dispatch `main()`.
2. `reconcile --dry-run` → ESATTAMENTE 2 sync (i 2 last_verified) + 0 would-prune.
3. `reconcile` (apply) → `git diff docs_registry.json` = **solo 2 valori** (nessun reorder).
4. Prune testato su orphan fittizio: senza `--prune` → "would prune" report, entry RESTA; con `--prune` → rimossa.
5. Idempotenza: 2ª `reconcile --dry-run` → 0 sync, 0 prune.
6. QG.

## QG (smoke obbligatorio)

- `reconcile --dry-run` = 2 sync + 0 prune (pre-apply).
- post-apply: `git diff docs_registry.json` = 2 righe valore (NO reorder); JSON valido.
- `python tools/check_docs_governance.py --strict` → **0 frontmatter_registry_mismatch**, errors=0, stale 327→326.
- idempotente (2ª run 0 change).
- prune opt-in verificato su fixture orphan (default OFF non rimuove; `--prune` rimuove).

## Anti-pattern guard (SDMG)

- Sync SCOPED a SoT=True (= superficie warning) → no churn 603 entry. NO re-sort → no reorder churn (196 off).
- NO full-gen fail-on-diff (P0-3). Reconcile = fixer idempotente, non gate.
- Prune opt-in default-OFF (non inverte la safety del check; no perdita curation branch-assente).
- Riuso parser del CHECK (quote-strip+typing). frontmatter=verita' (stale smascherato = onesto).
- Write order-preserving same-format (diff pulito). No nuove dipendenze. No forbidden-path (CI deferred).

## Scope OUT

- NON wira reconcile in CI (forbidden-path, deferred master-dd-gated). NON generatore deterministico (rifiutato).
- NON tocca `primary`/`track`/ordine/entry non-SoT. NON fabbrica frontmatter mancante.
- NON il follow-up 1 (OPEN_DECISIONS, PR #2492 separato).

## Riferimenti

- Spec madre #2489: `docs/superpowers/specs/2026-05-30-governance-auto-sync-design.md` (§P4 + DROP registry fail-on-diff).
- Esistente: `tools/docs_governance_migrator.py` (cmd_populate_registry append-only :390, load/save_registry :237), `tools/check_docs_governance.py` (parse_frontmatter quote-strip :91, validate_registry SoT-gate :230, DEFAULT_REQUIRED_FIELDS :15).
- Target: `docs/governance/docs_registry.json` (655 entry, 52 SoT).
- Harsh-review: ARCHON critic 4-pass 2026-05-31 (ACCEPT-WITH-FIXES, 3/3 adottati; 758-line churn bug intercettato pre-build).
