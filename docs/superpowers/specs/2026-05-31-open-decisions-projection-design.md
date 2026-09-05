---
title: "OPEN_DECISIONS auto-projection — schema-migration + derive-don't-maintain (follow-up #2489)"
workstream: ops-qa
category: spec
doc_status: active
doc_owner: claude-code
last_verified: '2026-05-31'
source_of_truth: false
language: it
review_cycle_days: 60
tags: [governance, auto-sync, anti-drift, open-decisions, schema-migration, projection, ci]
---

# OPEN_DECISIONS auto-projection — design

> Follow-up 1 di #2489 (harsh-review P1-1 DEFERRED: "schema prosa-loose, serve schema-migration
> spec propria"). Stesso root-cause anti-pattern #19: la lista "Aperte" e' hand-maintained →
> drifta. Metodo: research-lite → questo spec → harsh-review SDMG falsify → build → QG. Pattern di
> riferimento: `tools/generate_decisions_log.py` (#2489).

## Harsh-review adottato (critic 4-pass, 2026-05-31 — "se rigetta adotto, non difendo")

VERDICT critic = ACCEPT-WITH-FIXES (6 must-fix). Tutti adottati in questa rev:

1. **Ground-truth riderivata dal file reale** (EMPIRICA-1, era materialmente sbagliata): NON 30
   sotto Aperte ma **27** (i 3 OD-016/006/007 sono sotto `## Risolte`); NON 1 solo no-✅ ma **6**
   (OD-023 + 5 `-original-archive`). Tabella sotto = misurata, non asserita.
2. **R2 era inerte → demoted + riparato** (LOGICA-1/Pri-2): il drift-killer e' la **proiezione +
   R1 fail-on-diff**, NON R2. R2 riscritto per leggere `governed_by` sulle entry `open` (non
   `resolved_by`, che le open non hanno mai), tier WARN, false-positive-safe.
3. **Regola migrazione = 3-way ordinata in UN posto** + R6 (archive⟺archived) + **doppia-copia
   risolta**: il comment e' l'unica sorgente machine; l'heading `✅` e' decorazione NON letta dal
   generatore (Pri-3, Alt-Persp-2).
4. **Parse delimitato** alla prossima `### [OD-`; `—` se Livello/ref assenti (OD-032 + OD-024..031
   non hanno `- **Livello**:`) (LOGICA-3).
5. **NIENTE reorg strutturale**: blocco generato iniettato in cima a `## Aperte`, `## Risolte`
   intatta, comment in-place (Alt-Persp-1, churn minimo come precedente DECISIONS_LOG).
6. **Prettier resta ON** su OPEN_DECISIONS.md: blocco generato reso prettier-stabile + `prettier
--check` in QG; `.prettierignore` solo fallback se il blocco si dimostra instabile (VALORI-1).
   - HOWTO contributor + husky auto-regen (VALORI-2).

## Ground-truth (MISURATO su file reale 2026-05-31 — `python` parse, non asserito)

| Fatto                                     | Valore                                                         |
| ----------------------------------------- | -------------------------------------------------------------- |
| Heading OD totali (`### [OD-`)            | 30                                                             |
| sotto `## Aperte` (L10–451)               | **27**                                                         |
| sotto `## Risolte` (L452+)                | 3 (OD-016, OD-006, OD-007 — tutti `✅`)                        |
| no-`✅` sotto Aperte                      | **6** = OD-023 + 5 `-original-archive`                         |
| con `✅` (tutti i 30)                     | 24                                                             |
| `-original-archive` (storici PRE-VERDICT) | 5 (OD-017/018/019/020/021-original-archive)                    |
| range entry                               | OD-024..031 (8 OD in un heading, `✅ 8/8 SHIPPED`)             |
| status encoding oggi                      | **prosa libera nell'heading** (`✅ RISOLTA …`) — non parsabile |
| `docs/governance/open-decisions/`         | 2 soli file archivio, NON per-OD                               |

**Esito regola di migrazione 3-way ordinata** (archive → `✅`-resolved → open) sui 30:
**24 resolved + 5 archived + 1 open (OD-023)**. (La regola NAIVE solo-`✅` darebbe 6 open: i 5
archive non hanno `✅` → e' per questo che `archive` deve venire PRIMA.) Lista "Aperte" generata
post-migrazione = **1 riga (OD-023)** vs 27 sezioni stale oggi.

**Conseguenza design**: NON esiste un per-OD file (come gli ADR per DECISIONS_LOG) → il
source-of-truth machine deve vivere **inline** in `OPEN_DECISIONS.md`.

## Principio (eredita #2489): DERIVE don't MAINTAIN

La lista "Aperte" diventa un **artefatto generato** (proiezione del campo machine per-OD), guardata
da CI **fail-on-diff**. Marker-injection: prosa hand FUORI dai marker, indice generato DENTRO.

## Drift-killer = proiezione + R1 (NON R2)

Il drift osservato (27 sezioni risolte ancora sotto "Aperte") e' ucciso dalla **proiezione stessa**:
una sezione con `status=resolved` nel suo comment e' automaticamente esclusa dall'indice generato →
**non puoi piu' lasciarla "in Aperte"**, perche' "Aperte" e' generato e R1 fail-on-diff impedisce
edit manuali della lista. R2 (sotto) e' un check semantico SECONDARIO opzionale, non il meccanismo
principale. (Nota onesta cost/benefit: l'open-set oggi e' minuscolo (1); il valore non e' gestire
volume ma **prevenire la ricomparsa del 27-stale** — anti-pattern #19.)

## Decisione architetturale (la crux)

- **A — sidecar registry**: duplica i metadati → **stesso 2-copy-drift che combattiamo**. RIGETTATA.
- **B — file per-OD**: non esiste (solo 2 archivio); 30+ file nuovi = churn enorme. RIGETTATA.
- **C — comment HTML inline per sezione** (SCELTA): single-source co-locato, zero file nuovi, render
  invariato, parsing banale, coerente con marker-injection. **Il comment e' l'UNICA sorgente machine.**

### Schema (lo "small schema" richiesto)

Un commento HTML per sezione OD, subito sotto l'heading:

```
<!-- od id=OD-023 status=open governed_by="ADR-2026-05-05" -->
<!-- od id=OD-032 status=resolved resolved_by="master-dd 2026-05-21 (A+C)" -->
<!-- od id=OD-017-original-archive status=archived -->
```

| Campo         | Obbligo                        | Forma                                                                                 |
| ------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| `id`          | sempre                         | `OD-NNN`; range verbatim (`OD-024..031`); `-original-archive` per storici             |
| `status`      | sempre                         | `open` \| `resolved` \| `archived`                                                    |
| `resolved_by` | richiesto se `status=resolved` | testo libero (puo' contenere `ADR-…`/`PR #…`)                                         |
| `governed_by` | **opzionale, solo `open`**     | `ADR-NNN` dell'ADR che, se accepted, _risolverebbe_ l'OD (≠ ADR citato come contesto) |

`archived` = i 5 companion storici (esclusi da proiezione + check semantici, ma **renderizzati
verbatim nel body** — zero info-lost, audit trail preservato).

### Doppia-copia status (comment vs heading `✅`) — risolta

Il **comment e' l'unica sorgente letta dal generatore**. L'heading `✅` resta come decorazione
umana a colpo d'occhio, **NON letta**. Niente 2ª sorgente che guida l'output → niente 2-copy-drift
sul dato che conta. Un check di sola coerenza cosmetica (R5, WARN) segnala se divergono, ma **non
incide sull'indice** (per questo WARN, non ERROR: una divergenza heading/comment e' cosmetica e
l'unico drift che conta — la lista Aperte — e' gia blindato da R1). Divergenza deliberata dal
suggerimento critic "R5=ERROR": un ERROR costringerebbe doppio-edit-o-CI-rossa (VALORI-2 friction)
per un dato non load-bearing; risolto a favore di minor attrito + husky auto-regen.

## Struttura file post-migrazione (churn minimo — NO reorg)

Adotta Alt-Persp-1: **nessuna sezione spostata**. Solo:

1. Inietta il blocco generato subito dopo l'heading `## Aperte` (prima della prima `### [OD-`):

```
## Aperte

<!-- gen:od-open -->
_Generato da `tools/generate_open_decisions.py`. NON editare a mano: edita i comment `<!-- od … -->` e rigenera._
| OD | Titolo | Livello | Ref |
| --- | --- | --- | --- |
| [OD-023](#od-023-…) | Phase B execution date verdict | workflow | ADR-2026-05-05 §5 |
<!-- /gen:od-open -->

> _Le sezioni dettagliate sotto includono anche decisioni risolte/archiviate; lo stato canonico e' nel comment `<!-- od -->` di ogni sezione — la lista sopra e' la proiezione delle sole `open`._

### [OD-032] … ✅ RISOLTA …
<!-- od id=OD-032 status=resolved resolved_by="master-dd 2026-05-21 (A+C)" -->
… prosa hand invariata …
```

2. Inietta `<!-- od … -->` sotto ciascuna delle 30 heading (27 Aperte + 3 Risolte).
3. `## Risolte`, `## Regola pratica`, `## Ref` **invariate**. La prosa NON viene riscritta.

Diff = 30 comment + 1 blocco + 1 nota + 1 HOWTO. Mechanical, low-churn (come inject DECISIONS_LOG
sotto `## Index per data`, `generate_decisions_log.py:141-148`).

### HOWTO contributor (iniettato in cima al file)

```
<!-- HOWTO: aprire un OD = nuova sezione ### [OD-NNN] + comment <!-- od id=OD-NNN status=open -->.
     chiudere = aggiungi ✅ all'heading E status=resolved resolved_by="..." nel comment, poi
     `python tools/generate_open_decisions.py` (o lascia fare al pre-commit husky). -->
```

## Generatore — contratto (`tools/generate_open_decisions.py`)

Mirror di `generate_decisions_log.py`:

- Read `utf-8-sig`. Per ogni `<!-- od … -->`: associa l'heading `### [OD-…]` immediatamente sopra
  (titolo) + parse campi del comment.
- **"Sezione" delimitata** dal comment fino alla prossima `### [OD-` (LOGICA-3): Livello = primo
  `- **Livello**:` in-bound, else `—`; Ref = primo `ADR-…`/`PR #…` in-bound o in `resolved_by`/
  `governed_by`, else `—`. **Mai** oltre il confine.
- Proiezione = righe `status=open`, sort per intero `OD-(\d+)` asc (range/suffix dopo).
- Inietta tra `<!-- gen:od-open -->` … `<!-- /gen:od-open -->`. Prosa fuori-marker verbatim.
- Deterministico (sort stabile) + idempotente (2 run identici).
- `--check`: exit 1 se out-of-sync. Default: riscrive in place.
- **Riuso**: importa `adr_status` + `STATUS_MAP` da `generate_decisions_log.py` (no duplicazione).
  Stdlib only (`re`/`pathlib`/`argparse`) — **niente nuove dipendenze**.

## Check — regole falsificabili

- **R1 fail-on-diff** (ERROR): blocco "Aperte" rigenerato ≠ committato → exit 1. **Drift-killer primario.**
- **R4 integrita id** (ERROR): id duplicato; id malformato (non shape `OD-…`); comment id ≠ heading id (un typo `id=oops` sotto `### [OD-100]` non deve diventare riga canonica); comment senza heading sopra.
- **R6 archive coherence** (ERROR): id finisce `-original-archive` ⟺ `status=archived` (bidirezionale).
- **R7 heading-senza-comment** (ERROR, Codex #2492): una heading `### [OD-NNN]` senza `<!-- od ... -->` adiacente → il loop (che scansiona solo i commenti) la salta, `--check` passerebbe e l'OD aperta sparirebbe dall'indice = il drift che il gate previene. Ora ERROR.
- **R2 semantico** (WARN, opzionale): per `status=open` con `governed_by=ADR-NNN`, se `adr_status`
  di quell'ADR ∈ {Accepted, Superseded} → WARN "OD aperto ma l'ADR governante e' accepted — verifica
  se di fatto risolto". Tier WARN perche' potrebbe essere governing-not-resolving. **NON inerte**
  (fira appena un'open dichiara `governed_by` di un ADR risolto) ma **dormiente sui dati correnti**:
  NON setto `governed_by` su OD-023 (il suo ADR-2026-05-05 e' _governing_, non _risolutore_ — settarlo
  darebbe falso-positivo). R2 e' una capability per il pattern futuro "OD open con ADR risolutore linkato".
- **R3 igiene** (WARN): `status=resolved` senza `resolved_by`. La migrazione pre-popola `resolved_by`
  per tutte le 24 resolved dalla prosa esistente → target QG = 0 WARN R3.
- **R5 coerenza marker** (WARN, cosmetico): `status` vs presenza `✅` nell'heading (vedi doppia-copia).

R2 NON e' l'euristica larga "open + qualsiasi ADR in prosa = drift" (falso-positivo su OD-023 che
cita ADR-2026-05-05 come _contesto_). Solo `governed_by` (campo intenzionale) attiva R2.

## CI + husky + prettier

| Componente                              | Modifica                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/docs-governance.yml` | step (required) `python tools/generate_open_decisions.py --check` accanto al DECISIONS_LOG check                                                                                                                                                                                                                                                  |
| `.husky/pre-commit`                     | step regen quando `OPEN_DECISIONS.md` staged (mirror righe 49-56 DECISIONS_LOG): `python tools/generate_open_decisions.py && git add OPEN_DECISIONS.md` (warn-only; CI = hard gate)                                                                                                                                                               |
| **prettier**                            | **resta ON** (VALORI-1). Tuning: il generatore emette tabella prettier-stabile (4-col md, no padding manuale). QG: `npx prettier --check OPEN_DECISIONS.md` pulito post-regen. **Fallback**: solo se il blocco si rivela prettier-instabile dopo tuning → aggiungi `OPEN_DECISIONS.md` a `.prettierignore` (come `DECISIONS_LOG.md`) + documenta. |

## Build plan (smoke-gated, locale python+git — NO game backend)

1. **Migrazione**: 30 comment + 5 archive + blocco + nota + HOWTO. Regola 3-way ordinata.
   Smoke: parse → **1 open (OD-023) + 24 resolved + 5 archived**.
2. **Generatore** `generate_open_decisions.py` + one-time regen blocco. Smoke: `python … && git diff` = solo blocco.
3. **Prettier-stability**: `npx prettier --write OPEN_DECISIONS.md` → ri-`--check` → re-run generatore → diff 0. Se instabile → .prettierignore fallback.
4. **Check R1-R6**: introduci contraddizione fittizia (es. archive con status=open) → R6 ERROR; pulisci → verde. Open+governed_by-accepted fittizio → R2 WARN.
5. **CI + husky** wiring.
6. **QG**.

## QG (smoke obbligatorio)

- Idempotenza: 2 run → bit-identico.
- `git diff --exit-code OPEN_DECISIONS.md` = 0 post-commit (sync).
- `--check` in-sync → 0; tabella edit manuale → 1.
- `npx prettier --check OPEN_DECISIONS.md` pulito (o `.prettierignore` fallback documentato).
- `python tools/check_docs_governance.py --strict` errors=0 invariato.
- Conteggio: indice generato = **1 open (OD-023)**; classificazione = 24 resolved + 5 archived.
- R6 falsifica (archive+open → ERROR); R3 = 0 WARN (resolved_by pre-popolato).

## Anti-pattern guard (SDMG)

- Comment inline = single-source (no sidecar 2-copy). Heading `✅` decorazione non-letta (no doppia-sorgente sul dato che conta).
- Regola migrazione 3-way ordinata in UN posto + R6 enforce.
- R2 non-inerte ma onesto (WARN, dormiente, false-positive-safe) — NON brandito come drift-killer.
- Parse delimitato (no scan oltre confine → diff stabili).
- Prettier ON + blocco stabile (no fight prettier/fail-on-diff). .prettierignore solo fallback.
- Generatore deterministico. Riuso `adr_status`/`STATUS_MAP`. Niente nuove dipendenze.
- Zero-info-lost: archived renderizzati verbatim; OD-022 (`✅ IMPLICIT ACCEPT` ma body "CANDIDATE-RIPE")
  - OD-013 (resolved ma integrazione "pendente") → nota inline "human puo' ri-aprire/verificare".
- HOWTO + husky auto-regen (contributor non-tecnico non intrappolato da CI rossa su comment invisibile).

## Scope OUT

- NON tocca la prosa-verdetto (solo inietta comment + blocco + nota/HOWTO).
- NON il registry docs (follow-up 2 separato).
- NON file-per-OD (rigettato). NON reorg sezioni (Alt-Persp-1).
- NON auto-risolve/auto-apre OD (proietta + flagga; lo status lo attesta l'umano).

## Riferimenti

- Pattern: `tools/generate_decisions_log.py` (#2489). Spec madre: `docs/superpowers/specs/2026-05-30-governance-auto-sync-design.md` (§P5).
- Esistente: `tools/check_docs_governance.py`, `.github/workflows/docs-governance.yml`, `.husky/pre-commit` (49-56), `.prettierignore` (6).
- Target: `OPEN_DECISIONS.md`, `docs/governance/open-decisions/`.
- Harsh-review: ARCHON critic 4-pass, 2026-05-31 (ACCEPT-WITH-FIXES, 6/6 adottati).
