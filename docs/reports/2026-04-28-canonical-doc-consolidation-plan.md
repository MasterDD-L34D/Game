---
title: 'Piano consolidamento doc canonical — 2026-04-28'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-28'
source_of_truth: false
language: it
review_cycle_days: 14
---

# Piano consolidamento doc canonical — 2026-04-28

Input: [`2026-04-28-canonical-doc-drift-audit.md`](2026-04-28-canonical-doc-drift-audit.md)
(4 HIGH + 4 MEDIUM drift trovati). Proposta: NON modifica file esistenti da solo —
ogni cambio richiede PR esplicita + user OK per doc Tier 1.

---

## §A — Single Source of Truth canonical map

Per ogni question game-defining, unico doc canonical SOT. Tutti gli altri devono citare
il SOT + bump `last_verified` quando verificano allineamento.

| Question | SOT canonical | Altri doc (devono citare SOT) |
|----------|--------------|-------------------------------|
| "Cosa è Evo-Tactics?" (identità) | `docs/core/01-VISIONE.md` | PROJECT_BRIEF.md, COMPACT_CONTEXT.md, 00-GDD_MASTER.md |
| "Quali sono i 6 pilastri?" | `docs/core/02-PILASTRI.md` | SoT, COMPACT_CONTEXT, CLAUDE.md top sprint, situation-report |
| "Stato runtime pilastri?" | `docs/reports/2026-04-27-situation-report-late.md` → **diventa stale; serve doc "pillar-live-status"** | COMPACT_CONTEXT, CLAUDE.md |
| "Come funziona il combat?" | `docs/hubs/combat.md` (aggiornato + DEPRECATED note) | SoT §6-§9, 11-REGOLE_D20_TV, sprint context |
| "Networking/Co-op architettura?" | `docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md` | SoT §16, combat.md, CLAUDE.md |
| "What's next sprint?" | `COMPACT_CONTEXT.md` top section | CLAUDE.md sprint context top-1 only |
| "Quali doc esistono?" | `docs/governance/docs_registry.json` | Nessun doc deve replicare lista completa |
| "Regole d20 mechanics?" | `docs/core/11-REGOLE_D20_TV.md` | SoT §6, combat.md |
| "16 Forme MBTI?" | `docs/core/22-FORME_BASE_16.md` | SoT §11, 02-PILASTRI §P2 |
| "Economy SF/PE/Seed?" | `docs/core/26-ECONOMY_CANONICAL.md` | SoT §12, sprint context |

**Decisione critica pending** (user): chi mantiene "stato runtime pilastri"?
- Opzione A: `02-PILASTRI.md` con score table aggiornata ad ogni PR merge
- Opzione B: `docs/reports/PILLAR-LIVE-STATUS.md` dedicato (singola responsabilità,
  aggiornato da agent autonomo)
- **Raccomandato**: Opzione B — `02-PILASTRI.md` è identity, non runtime dashboard.

---

## §B — Tabella consolidamento

| Doc | Azione | Rationale |
|-----|--------|-----------|
| `docs/core/02-PILASTRI.md` | **KEEP canonical** — bump score post-sprint | A3 authority. Solo aggiornare score table (A.1 drift fix). |
| `docs/core/00-SOURCE-OF-TRUTH.md` | **KEEP canonical** — patch §16 + §pilastri | 1341 LOC, ancora utile per narrative context + system map. Patch specifica: §16 → cita ADR Jackbox + stato LIVE; §pilastri → redirect a 02-PILASTRI. |
| `docs/core/01-VISIONE.md` | **KEEP canonical** — update last_verified | 14 LOC, frozen stable. Solo last_verified bump. |
| `docs/core/11-REGOLE_D20_TV.md` | **KEEP canonical** | d20 rules stable. last_verified bump. |
| `docs/hubs/combat.md` | **KEEP canonical** — patch DEPRECATED note | Aggiungere sezione "⚠ Python rules engine DEPRECATED (ADR-2026-04-19)" + ref Node canonical path. |
| `docs/hubs/flow.md` | **KEEP** — update last_verified + patch mock:generate rimosso | Stale ma scope stable. Patch: rimuovere ref `npm run mock:generate` (rimosso PR #1343). |
| `docs/hubs/atlas.md` | **KEEP** — update last_verified | Stale. Mission Console architecture note. |
| `docs/hubs/backend.md` | **KEEP** — update last_verified + session split note | Stale. Session split 4 moduli. |
| `docs/hubs/dataset-pack.md` | **KEEP** — update last_verified | Stale ma schema stable. |
| `docs/core/90-FINAL-DESIGN-FREEZE.md` | **UPDATE doc_status: active** | Già usato come reference. draft mai risolto. |
| `docs/reports/2026-04-26-design-corpus-catalog.md` | **ARCHIVE** | Superseded da V2. |
| `docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md` | **KEEP** — nota "partial stale §B-§C post sprint α/β" | Doc proposto, non SOT. §B-§C non più current ma §A/§G/§H ancora utili. Non archivire — contiene historical decision context. |
| `COMPACT_CONTEXT.md` | **KEEP** — top section only, prune old sections | Responsabilità: "30s kickoff". Target: ≤1 TL;DR section + ref handoff + ref stato-arte. |
| `CLAUDE.md` sprint context sections | **PRUNE** — keep top 3, archive rest | 23 sezioni → 3 max. Sezioni 4-23 → `docs/archive/historical-snapshots/2026-04-28-pre-consolidation/CLAUDE-sprint-context-archive.md`. |
| `docs/core/00-GDD_MASTER.md` | **KEEP** — update last_verified | Index entry point. Cross-link to 02-PILASTRI. |
| `docs/core/27-MATING_NIDO.md` | **KEEP** — update last_verified | 18 LOC stub. OD-001 blocking. Non archivire. |
| `docs/reports/2026-04-26-deep-analysis-SYNTHESIS.md` | **KEEP** | still relevant per 9-domain residual. |
| `docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md` | **KEEP** | Sprint spec. Non archive finché sprint β/γ/δ active. |
| `docs/reports/2026-04-27-situation-report-late.md` | **KEEP** — designa come "pillar-live-status" transitorio | Finché non si crea doc dedicato. |

**Summary**: 0 doc da cancellare · 1 da ARCHIVE (corpus-catalog v1) · 5 da PATCH
(SoT, combat.md, flow.md, 90-FINAL-DESIGN-FREEZE status) · 17 da last_verified BUMP.
CLAUDE.md sprint context: PRUNE 20 sezioni.

---

## §C — Pattern operativo upkeep (concrete rules)

### C.1 — `last_verified` mandatory bump

**Regola**: ogni agent/developer che LEGGE un doc Tier 1-3 per prendere una decisione
tecnica → bump `last_verified` al giorno corrente SE il contenuto è confermato corretto.
Se trova drift → flag in OPEN_DECISIONS e NON bumpa.

**Come**: edit frontmatter `last_verified: 'YYYY-MM-DD'` + commit nel PR corrente.
Overhead: 2 min per doc. Payoff: agente successivo sa cosa è stato verificato.

### C.2 — Auto-deprecate doc stale ≥ 30d senza touch

**Regola**: CI check weekly (o pre-PR) su doc Tier 1-3 con `last_verified` > 30 giorni
→ apre GitHub Issue automatica "Doc stale: needs verification bump or archive".

**Implementazione suggerita**: `tools/check_docs_governance.py` già esiste — aggiungere
check `--stale-threshold 30` che emette warning (non error) per aging/stale doc.
Effort: ~2h Python. Può essere Gate 1 di un futuro sprint.

### C.3 — Sprint context CLAUDE.md max 3 sezioni

**Regola permanente**:

```
# CLAUDE.md sprint context policy
- Sezione 1 (TOP): current sprint — aggiornato ogni sessione
- Sezione 2: precedente immediato (labeled "precedente")
- Sezione 3: anchor session (es. "2026-04-27 baseline sprint α/β") — mai più di 1
- Sezioni 4+: VIETATE. Archiviate in:
  docs/archive/historical-snapshots/YYYY-MM-DD-pre-consolidation/CLAUDE-sprint-context-archive.md
```

**Perché 3**: ogni nuovo agent legge CLAUDE.md per onboarding. 23 sezioni = context
overflow + contradictions. 3 sezioni = current + immediate past + milestone anchor.

### C.4 — Cross-link mandatory per claim game-defining

**Regola**: qualunque doc che afferma uno stato P1-P6 DEVE linkare il SOT canonical
(`docs/core/02-PILASTRI.md` per identity, `situation-report-late.md` / futuro
`PILLAR-LIVE-STATUS.md` per runtime stato). Claim senza link = soft-warning governance.

**Implementazione**: aggiungere rule in `docs/governance/workstream_matrix.json`
campo `cross_link_required: ["docs/core/02-PILASTRI.md"]` per workstream cross-cutting.

### C.5 — Pre-PR check anti-contradiction

**Regola**: prima di ogni PR che tocca Tier 1-3 doc, eseguire:
```bash
grep -r "pilast\|P[1-6] 🟢\|P[1-6] 🟡" docs/core/02-PILASTRI.md \
  docs/reports/*situation*.md CLAUDE.md | head -20
```
Verificare visualmente che nessun claim nel PR sia in contraddizione con SOT canonical.
Non automatizzato — 3 min manual check. Aggiungere a Definition of Done sprint.

---

## §D — Implementation roadmap (4 PR ranked)

### PR-1 — Archive snapshot pre-consolidation (no breaking, ~1h)

**Branch**: `feat/doc-consolidation-archive-snapshot-2026-04-28`
**Files**:
- `docs/archive/historical-snapshots/2026-04-28-pre-consolidation/CLAUDE-sprint-context-archive.md`
  — copia sezioni 4-23 CLAUDE.md PRIMA di pruning (provenance trail)
- `docs/archive/historical-snapshots/2026-04-28-pre-consolidation/corpus-catalog-v1-archive.md`
  — copia `design-corpus-catalog.md` v1 (superseded)
- Registry entries per entrambi i nuovi file archivio

**Zero impatto runtime**: solo aggiunta file. Non tocca code, schema, canonical doc.

### PR-2 — Single SOT designation + patch HIGH drifts (~2h)

**Branch**: `feat/doc-consolidation-sot-patch-2026-04-28`
**Files**:
1. `docs/core/00-SOURCE-OF-TRUTH.md`:
   - §16 Networking: sostituire "ADR Colyseus (proposto), 🟡 non implementato" con
     "M11 Jackbox WS LIVE (ADR-2026-04-20), porta 3341, Phase A+B+C shipped"
   - §pilastri: aggiungere nota "Per P1-P6 canonical vedi docs/core/02-PILASTRI.md (ADR-2026-04-27)"
   - `last_verified: '2026-04-28'`
2. `docs/hubs/combat.md`:
   - Aggiungere sezione `## ⚠ Stato deprecation Python rules engine`
     citando ADR-2026-04-19 + Node canonical path `apps/backend/services/combat/`
   - `last_verified: '2026-04-28'`
3. `docs/core/90-FINAL-DESIGN-FREEZE.md`:
   - `doc_status: draft` → `doc_status: active`
   - `last_verified: '2026-04-28'`
4. `docs/core/02-PILASTRI.md`:
   - Score table: aggiornare P1→P6 a stato post-sprint α/β (score 5/6 🟢 def + 1/6 🟡++)
   - Aggiungere nota "Stato aggiornato post sprint α/β/γ/δ (2026-04-27-28)"
   - `last_verified: '2026-04-28'`
5. Registry bump per 4 file modificati

### PR-3 — Prune CLAUDE.md sprint context + deprecate corpus v1 (~1h)

**Branch**: `feat/doc-consolidation-prune-sprint-context-2026-04-28`
**Files**:
1. `CLAUDE.md`: rimuovere sezioni 4-23 (20 sezioni, ~1400+ righe). Lasciare 3:
   - Top (2026-04-28 Skiv Personal Sprint)
   - Sezione 2 (2026-04-27 late situation report)
   - Sezione 3 (2026-04-27 Sprint α/β/γ/δ baseline anchor)
   - Aggiungere commento `<!-- Sprint context: policy max 3 sections. Archivio in docs/archive/historical-snapshots/2026-04-28-pre-consolidation/ -->`
2. `docs/reports/2026-04-26-design-corpus-catalog.md`: bump `doc_status: superseded`
   aggiungere redirect header `> **SUPERSEDED** da [V2](2026-04-26-design-corpus-catalog-V2.md)`

### PR-4 — Stale last_verified sweep (hubs + core) (~1h)

**Branch**: `feat/doc-consolidation-staleness-sweep-2026-04-28`
**Files**: bump `last_verified: '2026-04-28'` in tutti i doc verificati-come-correct:
- `docs/core/01-VISIONE.md`, `03-LOOP.md`, `10-SISTEMA_TATTICO.md`, `20-SPECIE_E_PARTI.md`
- `docs/core/22-FORME_BASE_16.md`, `25-REGOLE_SBLOCCO_PE.md`, `DesignDoc-Overview.md`
- `docs/hubs/flow.md` (+ patch mock:generate note), `atlas.md`, `backend.md`, `dataset-pack.md`
- `docs/core/00-GDD_MASTER.md`, `00B-CANONICAL_PROMOTION_MATRIX.md`, `00C-WHERE_TO_USE_WHAT.md`

Nota: bump SOLO se content verificato come corretto al 2026-04-28. Non bumpa
`27-MATING_NIDO.md` (OD-001 pending) senza user decision.

---

## §E — Note implementation

- **PR-1 è prerequisito PR-3**: archivio sprint context prima di pruning.
- **PR-2 e PR-4 indipendenti**: possono mergiare in qualsiasi ordine post-PR-1.
- **PR-3** è la più impattante per context size: rimuove ~1400 righe CLAUDE.md.
  Verificare con `git diff --stat` che non tocchi sezioni policy (guardrail, DoD, etc).
- **Effort totale**: ~5h. Nessuna rottura runtime (solo docs + CLAUDE.md).
- **Governance**: ogni PR deve superare `python tools/check_docs_governance.py --strict`
  + docs registry aggiornato atomicamente.

---

*Generato: repo-archaeologist curate mode · 2026-04-28*
*Input: drift audit 4 HIGH + 4 MEDIUM. Proposta conservative (no delete, no major rewrite).*
