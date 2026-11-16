---
title: 'Sync handoff parallel sessions — governance follow-ups + D4 merges (2026-05-31)'
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-05-31'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [handoff, sync, parallel-sessions, governance, worldgen, d4]
---

# Sync handoff — sessioni parallele (2026-05-31)

> Da incollare nelle altre sessioni Claude Code aperte (worldgen GAP-C, D4) per allinearle
> al lavoro landato dalla sessione "governance" + farle continuare tenendo conto degli update.
> Self-contained: le altre sessioni non hanno memoria di questa.

## 1. Sync obbligatorio PRIMA di continuare

main e' avanzato a **`94de23e2`**. Aggiorna il tuo branch prima di lavorare:

```bash
git fetch origin main && git rebase origin/main
# oppure, se hai un PR aperto: gh pr update-branch <tuoPR>   (tutti i branch aperti sono BEHIND)
```

> ⚠️ Se ti eri gia' sincronizzato con la versione precedente di questo doc (su `34c4c901`), RIFALLO:
> main e' +3 commit (#2492 OPEN_DECISIONS-gen, #2496 Wave3 Codex fix, #2497 questo doc).

## 2. PR landati su main oggi (puoi dipenderne)

| PR                | Cosa                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| #2489             | governance: `DECISIONS_LOG.md` ora GENERATO da `docs/adr/*.md` (`tools/generate_decisions_log.py`) + gate CI fail-on-diff |
| #2492             | governance: `OPEN_DECISIONS.md` lista "Aperte" ora GENERATA (`tools/generate_open_decisions.py`) + gate CI fail-on-diff   |
| #2493             | governance: nuovo subcommand `tools/docs_governance_migrator.py reconcile` (sync registry↔frontmatter + prune opt-in)     |
| #2485 #2486 #2494 | D4 ecosystem (triage 18 draft + producer proposals + fix count NEW/DEFER)                                                 |
| #2490 #2491 #2496 | Wave3 species canon-reconcile + D7 bestiary (+ fix Codex P2)                                                              |

## 3. Tooling / processo NUOVO da rispettare (chiunque tocchi `docs/` o governance)

1. **NON editare a mano `DECISIONS_LOG.md`** — e' generato. Aggiungi un ADR → l'hook husky rigenera; CI fa fail-on-diff.
2. Se aggiungi/sposti doc e vedi warning **`frontmatter_registry_mismatch`** → NON toccare il registry a mano:
   ```bash
   python tools/docs_governance_migrator.py reconcile            # --dry-run per preview; prune solo con --prune
   ```
3. **LIVE** (PR **#2492 MERGED** `ea3fbe83`): la lista "Aperte" di `OPEN_DECISIONS.md` e' ora GENERATA da commenti
   `<!-- od id=OD-NNN status=open -->` per sezione (gate CI fail-on-diff + husky regen). NON editare a mano la lista:
   per aprire un OD aggiungi la sezione `### [OD-NNN]` + il commento `<!-- od id=OD-NNN status=open -->`; per chiuderlo
   aggiungi `✅` all'heading E `status=resolved resolved_by="..."` nel commento; poi `python tools/generate_open_decisions.py`
   (o lascia fare al pre-commit husky). Ogni heading OD DEVE avere un commento adiacente (gate R7).
4. **MERGE GATE**: prima di mergiare un PR controlla i commenti Codex, **NON solo la CI verde**:
   ```bash
   gh api repos/MasterDD-L34D/Game/pulls/<PR>/comments --jq length
   gh pr view <PR> --json reviews
   ```
   (Lezione oggi: 3 PR mergiati solo su CI-verde, 1 aveva un P2 Codex non letto → fixato dopo con #2494.)

## 4. Continuazione per-sessione

### Qualunque altra sessione

Applica i punti 1-4 sopra + `git rebase origin/main` su `94de23e2`. Poi continua il tuo lavoro.

### Sessione WORLDGEN GAP-C (branch `claude/worldgen-gapc-fase2-*`)

- I tuoi **#2487** (spec fase-2) + **#2488** (ADR fase-2) restano **DRAFT**, gated sul verdict master-dd per le
  arc-conditions (DATA-GATE, schema 2.0→2.1). Nessuno li ha toccati.
- Sei behind: ri-sincronizza su `94de23e2`, poi continua il lavoro fase-2.

### Sessione D4 (branch `claude/d4-ecoyaml`)

- I tuoi **#2485** + **#2486** sono **MERGED**. Il doc `docs/planning/2026-05-31-d4-producer-proposals.md` e' stato
  corretto (#2494): ora **13 NEW / 3 DEFER**, `reef_luminescente` e' NEW-only (era duplicato in DEFER). I 18 draft in
  `docs/planning/ecosystems-draft/` hanno gia' i produttori applicati.
- Prossimo step: **N=40 band-verify** (HC06 `[15-25%]` / HC07 `[30-50%]`) per ecosistema → promote draft →
  `packs/evo_tactics_pack/data/ecosystems/`. `rovine_planari` resta off-limits (D6).

## 5. Stato PR sessione governance (per contesto)

- ✅ MERGED: #2489 (DECISIONS_LOG gen) · #2492 (OPEN_DECISIONS gen) · #2493 (registry reconcile) · #2494 (fix count D4) · #2495 (questo doc)
- Anti-pattern #19 (tracker stale) chiuso end-to-end: DECISIONS_LOG + OPEN_DECISIONS generati, registry reconcile-able.
