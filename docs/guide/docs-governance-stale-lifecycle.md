---
title: Docs-governance stale-doc lifecycle -- standard di settore + metodo Evo-Tactics
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: '2026-06-22'
source_of_truth: true
language: it
review_cycle_days: 180
related:
  - docs/governance/docs_registry.json
  - docs/guide/procedural-lore-generation.md
---

# Docs-governance stale-doc lifecycle -- standard di settore + metodo Evo-Tactics

Guida canonica (SoT) per **gestire il ciclo di vita dei documenti governati e
smaltire i `stale_document` warning senza treadmill**. Riusabile cross-repo
(Game / Game-Database / Game-Godot-v2): il metodo, gli status di lifecycle, la
cadenza tiered e gli script-pattern sono indipendenti dal contenuto del repo.

Distillato dalla campagna "stale burn-down" su Game (stale_document **397 ->
0**, 2026-06; campagna COMPLETA, issue #2914 CLOSED 36/36, tracking #2614).

## Il problema

Un repo docs-governato fa scattare un warning `stale_document` quando
`last_verified + review_cycle_days < oggi`. A scala (centinaia di doc) due
fallimenti opposti si presentano insieme:

1. **Doc-rot**: doc vivi che puntano a infra rimossa, mai aggiornati.
2. **Treadmill**: doc accurati ma con `review_cycle_days` troppo corto (es.
   14g) che **ri-scadono ogni 2 settimane** -- ri-bumparli a mano e' rumore,
   non segnale.

Lo standard di settore risolve entrambi: cadenza giusta (uccide il treadmill) +
disposizione esplicita del terminale (uccide il rot).

## Standard di settore (cosa fanno gli altri)

Pattern proven docs-as-code 2024-2026:

- **Cadenza tiered** -- _monthly quick-scan + quarterly/semi-annual deep
  review_, non cicli bi-settimanali. I cicli sotto il mese generano rumore.
  ([Google docguide best_practices](https://github.com/google/styleguide/blob/gh-pages/docguide/best_practices.md),
  [docs-as-code 2026](https://docs.gitscrum.com/en/best-practices/documentation-as-code)).
- **Ownership** -- ogni doc ha un owner + un ciclo di review; lo stale e' un
  segnale, non un task automatico.
- **Archive-the-terminal** -- "meglio un set piccolo e fresco che doc sparse in
  vari stati di disrepair"; cancella/archivia cio' che e' morto, non lasciarlo
  churnare. ([syntaxscribe -- Stale vs No Documentation](https://syntaxscribe.com/blog/stale-vs-no-documentation)).
- **Freshness come segnale in CI** -- rendi l'aging visibile (SLA), ma solo per
  i doc vivi. ([dosu -- Score Docs Freshness in CI](https://dosu.dev/blog/score-documentation-freshness-in-ci)).

## Il modello (lifecycle + cadenza)

### Status di lifecycle (enum in `docs_metadata.schema.json`)

`active` / `draft` / `review_needed` / `legacy_active` = **vivi** (soggetti a
stale-cycle). `superseded` / `historical_ref` / `generated` (+ `deprecated` /
`archived` se aggiunti all'enum) = **terminali, esenti** dal cycle.

> Nota Game: l'enum attuale **NON** contiene `archived`/`deprecated` -- per un
> terminale usa `historical_ref` (record datato) o `superseded` (rimpiazzato da
> doc X). Verifica l'enum del TUO repo prima.

### Cadenza tiered (raise-only)

| tier | cadenza            | ambito                                                                                                                          |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 30g  | monthly quick-scan | reference/operativi: guide, tutorials, ops, ci, process, frontend, pipelines, architecture, hubs, governance, public, audio, qa |
| 90g  | quarterly          | spec/design/dataset/planning/research/playtest/museum/skiv/pitch + tutti i `draft`                                              |
| 180g | semi-annual deep   | canon: core, adr, combat, pillar, `source_of_truth: true`                                                                       |

**Raise-only**: si alza, mai si accorcia (strettamente piu' sicuro). I doc gia'
al tier (o sopra) restano invariati.

### Come il check legge lo stale (gotcha load-bearing)

Il check legge `review_cycle_days` + `last_verified` dal **REGISTRY**, non dal
frontmatter. Per i `source_of_truth: true` gira anche un
`frontmatter_registry_mismatch` (frontmatter deve combaciare col registry) ->
per quei doc bisogna toccare **entrambi**; per i non-SoT basta il registry.

### Altri check dello stesso validator (contesto)

Lo stesso `check_docs_governance.py` emette anche:

- **`unregistered_document`** (warning) -- un `.md` sotto `docs/` presente su
  disco ma assente dal registry. Burn-down 2026-06-10 (246 doc legacy
  bulk-registrati).
- **`broken_doc_pin`** (warning) -- un path `docs/` citato da codice/config/workflow o
  da un `.md` fuori `docs/` che non esiste piu' su disco. Baseline decrescente
  `docs/governance/doc_pins_baseline.json`. La reverse-map completa (`doc_pins` nel drift
  report) e' la pin-map consultabile PRIMA di un reorg: dice quale doc e' pinnato e da chi.
  Flip a gate duro = `--pins-strict` (owner). Distinto da `check_site_links.py` (link
  DENTRO `docs/`).

## Workflow (il metodo burn-down)

Ordine: **prima fixa la cadenza (root), poi disponi il terminale, poi bumpa i
vivi**. NON ribumpare in loop.

### Fase 0 -- root-cause check

Prima di "ancora un batch di bump", **conta i `review_cycle_days` nel registry**.
Se molti sono sub-mensili (7/14g), il treadmill e' la cadenza, non i bump.
Fixa quello per primo (Fase 1).

### Fase 1 -- cadence tiering (mechanical, raise-only)

Applica la tier-map (sopra) a tutti i doc con `cycle < target` -> alza il
`review_cycle_days` nel registry (+ frontmatter per i SoT). Effetto immediato:
i doc accurati ma sotto-cadenzati rientrano in-window. Zero giudizio, reversibile.

### Fase 2 -- classify + bump per cluster (per i veri DRIFTED/record)

Per ogni dir-cluster (~15-40 doc):

1. **Fan-out 3 agent read-only** (Agent-tool, NON Workflow ad alto fan-out --
   vedi appendix rate-limit) -> verdetto per-doc: `CURRENT` /
   `DRIFTED` / `SUPERSEDED(successore)` / `NEEDS-HUMAN`.
2. **Verify-first TU STESSO** ogni verdetto `CURRENT` e ogni driver `DRIFTED`
   (anti-pattern #8): grep/glob i ref citati esistono davvero. Le MISS sono
   spesso path-guess sbagliati dell'agente, non il doc.
3. **Bump SOLO i `CURRENT`** (frontmatter `last_verified` + registry).
4. **Residue** (DRIFTED/SUPERSEDED/NEEDS-HUMAN) -> ticket raggruppati per
   _drift-driver_, NON fixare inline, NON flippare `doc_status` (owner-gated).

**Rubrica record-vs-living** (decisiva): un doc DATATO (handoff/closure/log/
audit/research-note) e' `CURRENT-as-record` se coerente per la sua data (ref
storici OK) -> bump + nota archive-candidate. Solo i doc-reference VIVI
(roadmap/spec/tutorial da seguire ORA) ancorati a infra rimossa = `DRIFTED`. Un
plan rimpiazzato da un successivo = `SUPERSEDED` (verifica che il successore
esista). `source_of_truth: true` = SEMPRE owner-gated (mai auto-bump).

### Fase 3 -- terminal-reclassify (disposizione owner-gated)

I record-terminali (dated-record che non vanno piu' rivisti; dead-subject che
non rivivra' mai) -> `historical_ref`; i plan/spec rimpiazzati con successore ->
`superseded`. Questo li **esenta** dal cycle in modo permanente. NON
reclassificare canon/ADR/spec VIVI (per quelli = cadenza, Fase 1).

### Fase 4 -- residuo = owner decision

Cio' che resta (DRIFTED-rewrite dove il sistema esiste ma il doc e' obsoleto;
SoT da verdire) NON e' auto-risolvibile. Aprilo come issue verdict-ready
(checkbox per gruppo: retire / rewrite / keep+bump) e esegui sul verdetto.

## Script-pattern (riusabili)

- **Registry text-surgical, MAI json round-trip**: trova `"path": "<p>"`, poi
  entro la finestra dell'entry sostituisci il valore di `review_cycle_days` /
  `last_verified` / `doc_status`. Il round-trip `json.load/dump` riformatta gli
  inline `tags` = churn enorme. (`last_verified` ha lunghezza fissa YYYY-MM-DD =
  zero offset.)
- **Scrivi LF**: `open(path,'w',encoding='utf-8',newline='\n')` (Windows CRLF
  rompe prettier/governance).
- **BOM-tolerant**: il `﻿---` iniziale inganna `txt.startswith('---')` ->
  per i regex frontmatter gestisci il BOM (preserva-lo in scrittura).
- **Raise-only cadence**: `new = target if target > current else skip`.
- **Restore del report tracked**: `reports/docs/governance_drift_report.json` e'
  rigenerato dal check ma e' tracked -> `git checkout --` prima del commit.

## Adozione cross-repo

1. Verifica che il repo abbia un `check_docs_governance` equivalente + un
   `docs_registry.json` (o lo schema metadata). Game-Godot-v2 / Game-Database:
   adottare lo stesso check o un port.
2. Aggiungi gli status terminali (`historical_ref`/`superseded`) all'enum e
   all'esenzione-stale del check.
3. Applica la tier-map cadenza (Fase 1) raise-only -> uccide il treadmill.
4. Per i batch usa il metodo classify+verify-first (Fase 2-4).

Il **tier-map** (workstream -> 30/90/180) e' un default di settore tunabile per
repo; i valori 30/90/180 sono ratificati master-dd 2026-06-20.

## Appendix -- lessons & gotchas (risparmiano tempo a chi riusa)

- **Classify-by-agent + verify-by-TE** > verify-by-agent: il verify a fan-out
  alto (48 agent in un Workflow) e' stato **rate-limited dal server** 2 volte
  ("Server is temporarily limiting requests (not your usage limit)"); il
  re-check nel main-thread (no spawn) NON throttla **e** ha catturato 4 errori
  del classifier (over/under-flag DRIFTED). Per il classify usa il fan-out
  leggero a 3 agent (Agent-tool), per il verify usa te stesso.
- **`frontmatter_registry_mismatch` gira SOLO per `source_of_truth: true`** ->
  per i non-SoT il cambio registry-only e' safe.
- **`archived`/`deprecated` NON sono nell'enum** (Game) -> usa
  `historical_ref`/`superseded` o l'`invalid_doc_status` error blocca il check.
- **NON reclassificare canon/ADR vivi -> historical_ref** (sbagliato): per i
  vivi-stale = cadenza; reclassify SOLO dead-subject/record.
- **Glob brace `{a,b}/**/\*.md`\*\* matcha 0 file silenziosamente (false-negative)
  -- usa path per-dir.
- **`git commit -m $multiline` si rompe in PowerShell** -> usa `git commit -F file`.
- **Worktree node_modules-locked**: `git worktree remove --force` fallisce su
  "dir not empty"; `git worktree prune` deregistra, poi rimuovi la dir.

## Refs

- Campagna burn-down: tracking #2614; batch B7-B10 (#2899/#2900/#2903/#2905);
  cadence #2909; factual-sync #2910; lifecycle-normalization #2913. **Closeout
  #2914** (owner-gated dispositions dei 36 DRIFTED residui): #2923 D+E keep+bump
  / #2929 A retire+salvage (9 -> historical_ref, salvage portato, sentience_sdk
  vaporware-hazard neutralizzato) / #2931 B rewrite (vs split `ci.yml`) / #2933
  C rewrite + Urban_Flood retire / #2934 close. **stale_document 397 -> 0, issue
  #2914 CLOSED 36/36.** Stato e ticket per-driver: `BACKLOG.md` sezione campagna.
- Tool: `tools/check_docs_governance.py`; schema:
  `docs/governance/docs_metadata.schema.json`; registry (SoT):
  `docs/governance/docs_registry.json`.
- Pattern doc-fonte (gemello cross-cutting): `docs/guide/procedural-lore-generation.md`.
