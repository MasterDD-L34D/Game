---
title: 'D.5 + D.6 Fine-Grained Narrative Review — v2 Italian Grammar Pass'
date: 2026-05-15
author: claude-autonomous collaborative master-dd authority
status: applied
workstream: dataset-pack
tags: [species, catalog, polish, fine-grained-review, italian-grammar, v2]
---

# D.5 + D.6 Fine-Grained Narrative Review — v2 Italian Grammar Pass

## Contesto

Post-merge PR #2272 (squash `a18a86f`) — 36 visual_description + 18 symbiosis polished con per-clade voice register + Skiv-canonical override.

Master-dd authority request: **fine-grained narrative review batch via `review_phase3.py --field visual_description --filter claude-polish`**.

Tool extension: `tools/py/review_phase3.py` esteso con `--filter claude-polish` (substring match su `claude-polish-*` provenance), commit incluso in questa iterazione.

## Review pass metodologia

Per ogni 54 entry polished, critical check su:

1. **Voice register consistency** — clade-appropriate (Apex epico / Keystone solenne / Threat tensa / Bridge curiosa / Support discreta / Playable empatica / Skiv-adjacent desertic)
2. **Tag coherence** — fatti anatomici grounded su `default_parts` + `functional_signature` + `ecotypes`
3. **Concrete vs vague** — "tre specie" / "due livelli trofici" / "nicchie" preferiti rispetto a "ecosistema" generic
4. **Closing punch** — Apex/Threat strong closure, Keystone consequence beat, Bridge soglia/margine, Support understatement
5. **Italian grammar** — articoli + concordanze + coniugazioni + apocope corrette
6. **Repetition** across entries (metafore reused)

## Findings — overall quality

**Voice quality**: ALTA. 36 visual + 18 symbiosis tutti rispettano il per-clade register. Zero clade-mismatch. 3 sample exemplary:

- Apex `sp_paludogromus_magnus` Keystone closure: _"Togli il magnus e la palude smette di essere palude — diventa un deserto sommerso."_ — strong consequence + image
- Support `sp_nebulocornis_mollis` closure: _"Il suo contributo si nota solo quando manca."_ — perfect understatement
- Bridge `sp_zephyrovum_fidelis` symbiosis: _"Trasporta il futuro genetico altrui come bagaglio inconsapevole."_ — beautiful Skiv-style

**Repetition** (minor, not requiring fix):

- "Si muove" opens 3 entries across different clades (acceptable variation)
- "Senza..." consequence used 8× Keystone (canonical Solenne register, not over-used by design)

## Findings — 7 issues fixed

Italian grammar/typo issues caught:

| #   | Species                  | Field                  | Issue                                 | Fix                |
| --- | ------------------------ | ---------------------- | ------------------------------------- | ------------------ |
| 1   | `sp_nebulocornis_mollis` | visual_description     | "occcupa" (typo c×3)                  | "occupa"           |
| 2   | `sp_cinerastra_nodosa`   | visual_description     | "nodul sporgente" (apocope errata)    | "nodulo sporgente" |
| 3   | `sp_cavatympa_sonans`    | interactions.symbiosis | "si ricovrano" (coniug. errata)       | "si ricoverano"    |
| 4   | `sp_ferriscroba_detrita` | visual_description     | "Toglietelo" (specie = femm.)         | "Toglietela"       |
| 5   | `psionerva_montis`       | visual_description     | "il psionico" (art. ps impura → lo)   | "lo psionico"      |
| 6   | `symbiotica_thermalis`   | interactions.symbiosis | "Il pulso termico" (preferisci polso) | "Il polso termico" |
| 7   | `sp_arenaceros_placidus` | interactions.symbiosis | "exsudate" (loanword)                 | "essudati" (it.)   |

Total: 14 char delta (7 ins + 7 del). Zero schema change. Zero `_provenance` change (fixes preservano la provenance tag claude-polish-\*).

## Apply script

`tools/py/apply_phase3_polish_d5_d6_v2_fixes.py` — surgical substring replace via Python:

```python
FIXES = [
    ("sp_nebulocornis_mollis typo c×3", "occcupa", "occupa"),
    ("sp_cinerastra_nodosa apocope", "nodul sporgente", "nodulo sporgente"),
    # ... 7 total
]
```

Safety:

- Verifica unicità pre-apply (count == 1 per ogni substring)
- Parse JSON post-replace per validare struttura
- Re-write con `ensure_ascii=False, indent=2` (UTF-8 explicit per CLAUDE.md §Encoding Discipline)

## Verify gates

- ✅ `python3 tools/py/apply_phase3_polish_d5_d6_v2_fixes.py` — 7/7 fix applicati
- ✅ `python3 tools/py/game_cli.py validate-datasets` — 14 controlli 0 avvisi
- ✅ `PYTHONPATH=tools/py pytest tests/test_phase3_path_d_tools.py` — 17/17 verde
- ✅ `node --test tests/services/beastBondCatalogIntegrity.test.js` — 5/5 verde
- ✅ `node --test tests/api/envelope-b-data-integrity.test.js` — 25/25 verde
- ✅ Diff stat: 14 char delta, zero schema change

## Outstanding (post v2)

- **Master-dd narrative review pass** opzionale ulteriore — la voice quality è ALTA, ulteriori fini-tune sono optional polish
- **Phase 4d Scope B** Game-Database cross-stack execution (MCP out-of-scope, manual cherry-pick — PR template ready)

## Cross-link

- Previous PR: #2272 merged squash `a18a86f` (D.5+D.6 batch polish)
- Closure PR: #2271 merged squash `66be60b` (Q1 Option A canonical migration)
- ADR: `docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md`
- Museum methodology: `docs/museum/cards/phase-3-path-d-hybrid-pattern-abc.md` (M-2026-05-15-001 score 5/5)
- Polish batch report: `docs/playtest/2026-05-15-d5-d6-polish-collaborative-batch.md`
- Voice canonical Skiv: `docs/skiv/CANONICAL.md`
- Polish script: `tools/py/apply_phase3_polish_d5_d6.py` (initial polish)
- Fixes script: `tools/py/apply_phase3_polish_d5_d6_v2_fixes.py` (this iteration)
- Review tool: `tools/py/review_phase3.py` (`--filter claude-polish` extension this iteration)
