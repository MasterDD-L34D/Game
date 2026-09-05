---
title: "Governance trackers auto-sync — derive-don't-maintain design (anti-drift)"
workstream: ops-qa
category: spec
doc_status: active
doc_owner: claude-code
last_verified: '2026-05-30'
source_of_truth: false
language: it
review_cycle_days: 60
tags: [governance, auto-sync, anti-drift, decisions-log, registry, roadmap, freshness, ci]
---

# Governance trackers auto-sync — design

> Fix root-cause anti-pattern #19 (stale-tracker): i tracker narrativi driftano perche
> hand-maintained. Evidenza 2026-05-30: DECISIONS_LOG dice "43 ADR" ma su disco ce ne sono
> **67** (24 non-indicizzati); MASTER_ROADMAP fermo 6 settimane (draft); 295 doc stale;
> OPEN_DECISIONS desync. Metodo: research (Protocol 2) -> design (questo) -> harsh-review
> (SDMG falsify) -> build+QG.

## Build status (2026-05-30, post harsh-review SDMG)

**SHIPPED (P1+P2)**: `tools/generate_decisions_log.py` (67 ADR -> tabella tra marker, idempotente,
status normalizzato Accepted/Superseded/Proposed) + DECISIONS_LOG one-time sync (43->67, phantom
ADR-XXX rimosso) + CI fail-on-diff (`--check` in docs-governance.yml, required) + husky regen-on-ADR-change

- MASTER_ROADMAP planning-draft -> superseded (banner -> docs/core/40-ROADMAP.md live).

**Decisione B realizzata via generator-NORMALIZATION, NON editando gli 8 ADR**: la regola progetto
"mai modificare ADR mergiato" (DECISIONS_LOG) vieta di toccarli. Il generatore mappa `status`+`doc_status`
in un vocab uniforme -> output pulito di B SENZA churn sui merged-ADR. Meglio di A (no data-loss: tag-index

- superseded-narrative preservati come prosa fuori-marker) e di B-migrate (no violazione convenzione).

**Harsh-review adottato (3 P0 + 2 P1, "se rigetta adotto non difendo")**:

- DROP freshness error-tier (P0-2: gli stale sono GIA warning, CI gia verde; un error-tier flipperebbe 329 warning in CI-red). Freshness resta warn nightly.
- DROP registry fail-on-diff (P0-3: populate-registry e append-only, 655 entry + campi git-date -> churn). Registry resta append+validate.
- DROP OPEN_DECISIONS projection (P1-1: schema prosa-loose, serve schema-migration spec propria).
- date-fallback per 1 ADR legacy senza giorno (P1-3). Roadmap = file planning-draft disambiguato, NON core/40-ROADMAP active (P1-2).

## Principio (research-backed): DERIVE don't MAINTAIN

Ogni drift ha la stessa causa: un index hand-maintained che **duplica** stato gia presente
nei file-sorgente (front-matter + git + issue-state). Due copie dello stesso fatto = divergono.
Fix universale: il tracker diventa un **artefatto generato** (proiezione del single-source),
guardato da CI **fail-on-diff** (`git diff --exit-code`: se il committato e stale -> PR fallisce).
Primary: adr-log (marker-inject), log4brains (metadata da text+git), dbt freshness (warn/error),
git-diff exit-code. Anti-pattern: hand-index = drift garantito.

## Decisioni LOCKED (master-dd 2026-05-30)

- **Gate posture = FAIL-ON-DIFF** (strict, loud per governance). NO auto-commit-back.
- **MASTER_ROADMAP = SUPERSEDE -> live source** (BACKLOG + MILESTONES_AND_GATES + gap-plan = roadmap-of-record). Kill la roadmap-doc parallela.
- **last_verified = ATTESTAZIONE umana + gate graduato** (warn a review_cycle, fail a 2x). NO auto-bump cieco. git-last-modified (auto) e un fatto DIVERSO, mostrato a parte.

## Build-on (esistente Game — NO duplicato)

| Componente esistente                                                                                        | Riuso                                                    |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `tools/docs_governance_migrator.py` (parse_frontmatter, infer_workstream, classify_tier, populate-registry) | motore parse/gen condiviso                               |
| `tools/check_docs_governance.py` (validate_registry, staleness detect L213-224)                             | promuovere a gate freshness graduato + add fail-on-diff  |
| `.github/workflows/docs-governance.yml` (gia check --strict required + cron lunedi)                         | estendere: generate -> git-diff gate + nightly freshness |
| `.husky/pre-commit`                                                                                         | add step regenerate (backstop = CI)                      |

## Mapping per-tracker (derive-from-source)

| Tracker                     | Source-of-truth                                                                                             | Generatore                                                                                                                                        | Gate                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| **DECISIONS_LOG.md**        | `docs/adr/*.md` front-matter (title/doc_status/date-da-filename/superseded_by) — schema uniforme verificato | NEW `tools/generate_decisions_log.py` (riusa migrator.parse_frontmatter) -> tabella tra marker `<!-- gen:decisions -->...<!-- /gen:decisions -->` | fail-on-diff                                                                               |
| **docs_registry.json**      | tutto front-matter + git                                                                                    | `migrator populate-registry` reso **deterministico** (sort stabile) + full-gen mode                                                               | fail-on-diff                                                                               |
| **OPEN_DECISIONS.md**       | front-matter/marker `status: open                                                                           | proposed`+`docs/governance/open-decisions/`                                                                                                       | proiezione (entry il cui ADR/ref e `accepted` -> drop dalla lista aperte)                  | fail-on-diff + check "open ma ref-accepted = drift" |
| **MASTER_ROADMAP**          | n/a (SUPERSEDED)                                                                                            | nessuno                                                                                                                                           | doc_status: superseded + banner -> live source; staleness-gate non si applica (superseded) |
| **last_verified freshness** | front-matter (attestazione) + git last-content-change                                                       | git-last-modified mostrato (filtra whitespace-only commit); NO auto-bump                                                                          | gate graduato dbt-style: warn(now-lv > review_cycle), fail(> 2x review_cycle)              |

## Mechanismi

1. **Generate-from-source + fail-on-diff** (load-bearing): CI rigenera il tracker + `git diff --exit-code <tracker>`; diff != 0 -> PR fallisce ("rigenera+committa"). Generatori deterministici (sort stabile -> diff puliti). Pre-commit rigenera localmente (CI = backstop; `pre-commit run --all-files` in Actions perche hook locali non scattano su web-UI commit).
2. **Marker-injection** (`<!-- gen:X -->...<!-- /gen:X -->`): prosa hand-written FUORI dai marker, tabella generata DENTRO -> autore e generatore non litigano sulle stesse righe.
3. **Staleness gate graduato** (dbt warn_after/error_after applicato a last_verified vs review_cycle): warn = annotation, fail = CI red oltre 2x. Su PR (doc toccati) + nightly cron (sweep completo -> rot emerge senza PR).
4. **git-last-modified != last_verified**: il primo = "quando il contenuto e cambiato" (auto da `git log -1 --format=%cs`); il secondo = "quando un umano ha confermato vero" (esplicito). Distinti.

## Build plan (fasi, smoke-gated, locale python+git — NO game backend)

- **P1 DECISIONS_LOG** [keystone, drift #1]: `generate_decisions_log.py` (67 ADR -> tabella ordinata tra marker) + step CI fail-on-diff + **one-time regen** (sync: indicizza i 24 ADR mancanti, incl. DF #2444/S7/playtest). Smoke: `python generate_decisions_log.py && git diff DECISIONS_LOG.md` (deve produrre il log corrente-corretto).
- **P2 MASTER_ROADMAP supersede** [decided]: front-matter `doc_status: superseded` + `superseded_by` + banner -> BACKLOG/MILESTONES/gap-plan. Trivial.
- **P3 freshness gate graduato**: estendi `check_docs_governance.py` -> warn vs error su last_verified (2x review_cycle). I 295 stale -> warn (non rompe CI), surface loud. Smoke: `python tools/check_docs_governance.py` (warn count visibile, errors=0).
- **P4 docs_registry deterministico + fail-on-diff**: migrator full-gen sort-stabile + CI git-diff. Smoke: regen -> git-diff registry clean.
- **P5 OPEN_DECISIONS projection** [piu loose, follow-up]: convention status front-matter + proiezione + drift-check (open ma ref-accepted).
- **CI wiring**: estendi `docs-governance.yml` — job che (a) rigenera DECISIONS_LOG + registry, (b) `git diff --exit-code` fail-on-diff, (c) freshness graduato (PR + nightly).
- **husky**: step regenerate DECISIONS_LOG + registry pre-commit (warn se diff, CI = hard gate).

## QG (smoke obbligatorio per fase)

- Generatori deterministici: 2 run -> output bit-identico (idempotenza).
- `git diff --exit-code` post-regen = 0 dopo commit (gate verde quando sincronizzato).
- `check_docs_governance.py --strict` errors=0 (freshness = warn, non error, per gli stale esistenti).
- One-time sync: DECISIONS_LOG rigenerato = 67 ADR (non piu 43).

## Anti-pattern guard (SDMG)

- NON duplicare migrator/check (riusa parse_frontmatter). NON fail-CI sui 295 stale esistenti (warn, non error -> non blocca lavoro; rot loud ma non hard-block legacy). Generatori deterministici (diff puliti, no churn). Marker-injection (no fight prosa/gen).

## Riferimenti

- Research interna+esterna: questa sessione (Protocol 2). Esterni: adr-log, log4brains, dbt-freshness, git-diff --exit-code, GitHub Projects.
- Esistente: `tools/{docs_governance_migrator,check_docs_governance,docs_status_promotion}.py` + `.github/workflows/docs-governance.yml` + `.husky/pre-commit`.
- Atlas/gap-plan: `docs/guide/DESIGN-DATA-ATLAS.md`, `docs/planning/2026-05-30-design-data-gap-resolution-plan.md`.
