---
title: Drift Audit 2026-04-27
date: 2026-04-27
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-04-27
source_of_truth: false
language: it
---

# Drift Audit — 2026-04-27

## TL;DR

| Categoria | Totale | P0 | P1 | P2 |
|---|---|---|---|---|
| STALE_TICKET | 0 | — | — | — |
| DORMANT_TICKET | 0 | — | — | — |
| STALE_ADR | 0 | — | — | — |
| ADR_NO_FRONTMATTER | 41/43 | — | — | ✅ |
| GOVERNANCE_ERRORS | 0 | — | — | — |
| SPRINT_STALE | 0 | — | — | — |
| CI_RED | 0 | — | — | — |
| HANDOFF_STALE | 0 | — | — | — |
| PR_ROT | 0 | — | — | — |
| BRANCH_STALE | 8+ | — | ✅ | — |
| **Auto-fix eseguiti** | **0** | — | — | — |

**Severity totale**: P1×1, P2×1. Nessun P0. Nessun auto-fix applicato.
**PR aperta**: verrà linkato al termine.

---

## Findings P1

### BRANCH_STALE — 8+ branch `codex/*` da Ott-Nov 2025, no open PR

Molti branch `codex/*` (era Codex pre-sprint) hanno ultimo commit >175 giorni fa e nessuna PR aperta. Top 10 per età (decrescente):

| # | Branch | Ultimo commit | Età (gg) |
|---|---|---|---|
| 1 | `codex/create-complete-website-with-stable-url` | 2025-10-24 | 185 |
| 2 | `biome/badlands-ptpf-it` | 2025-10-25 | 184 |
| 3 | `codex/add-idea-categories-configuration-and-documentation` | 2025-10-29 | 180 |
| 4 | `codex/propose-simplified-directory-structure` | 2025-10-29 | 180 |
| 5 | `codex/mappa-struttura-tratti-nel-catalogo` | 2025-10-29 | 180 |
| 6 | `codex/integrate-changelog-hud-in-readme-and-canvas` | 2025-11-01 | 177 |
| 7 | `codex/create-load-test-orchestrator-script` | 2025-11-02 | 176 |
| 8 | `codex/allineare-file-di-inventario-tratti` | 2025-11-03 | 175 |

> Nota: i branch `codex/*` da Ott 2025 sono residui dell'era pre-sprint (PR #54–#501). Pattern sistematico: tutti già mergiati su main (commit message mostra `Merge pull request #XXX`). Branch non cancellati post-merge. Nessuna PR aperta su questi branch.
>
> Non auto-fixabili (policy: no branch delete autonomo). Richiede azione manuale.

**Suggested action**: `git push origin --delete <branch>` per ognuno, oppure batch via GitHub UI → Branches → "Stale branches". Bulk sweep stimato ~10 min.

---

## Findings P2

### ADR_NO_FRONTMATTER — 41/43 ADR privi di frontmatter YAML

`ls docs/adr/*.md` rileva 43 file. Solo 2 hanno frontmatter con `status:`:

| File | Status |
|---|---|
| `ADR-2026-04-26-hosting-stack-decision.md` | accepted |
| `ADR-2026-04-26-m15-coop-ui-redesign.md` | accepted |

Gli altri 41 usano intestazione Markdown senza blocco `---`. La governance tool (`check_docs_governance.py`) non li valida (percorso `docs/adr/` escluso da ADR-specific rules — exit 0). Il tracker ADR formale è `DECISIONS_LOG.md`.

**Impatto**: la regola STALE_ADR (flag se `Proposed AND mtime >14 giorni`) non può essere applicata meccanicamente. In pratica: 0 ADR "Proposed" rilevabili = 0 falsi negativi noti, ma gap di osservabilità strutturale se futuri ADR sono Proposed.

**Suggested action (non urgente)**: definire template frontmatter per `docs/adr/*.md` con campi minimi `status: proposed|accepted|superseded|rejected` + `date`. Applicabile in batch con `tools/docs_governance_migrator.py` in un singolo PR dedicato ~2h.

---

## Checklist completa

### 1. BACKLOG.md drift

Verificati tutti i ticket aperti `[ ]` in `BACKLOG.md`:

| Ticket | Stato | Note |
|---|---|---|
| TKT-M11B-06 | Open (userland) | Dipende da playtest live — non autonomabile |
| Playtest round 2 | Open (userland) | Post PR #1730 |
| TKT-07 | Open | Non >30gg (sprint 17-18/04) |
| TKT-10 | Open (parziale) | Non >30gg |
| TKT-P4-MBTI-003 | Open | Bloccato da OD-001 |
| Test gaps coop (5 item) | Open | Non >30gg |
| M14-B | Open | Sequenza M14-A→B |
| M15 | Open | Sequenza M14→M15 |
| TKT-MUTATION-P6-VISUAL | Open | ~1h autonomous |
| TKT-MUSEUM-SKIV-VOICES | Open | Pre-req shipped |
| Sprint 3 archivio (master orch.) | Open | Deferred |
| P1 skills, cherry-pick, balance skill | Open | Research/userland |
| Deferred post-MVP (V3/V6/M12+) | Open | Intentional |
| Tech debt long-term (4 item) | Open | Intentional |

**Risultato**: 0 STALE_TICKET, 0 DORMANT (nessun ticket >30gg senza commit ref).

Nota: TKT-08 e TKT-11 chiusi via branch ref (no PR# esplicito). Accettabile — branch esistono e commit SHA tracciabili.

### 2. ADR Proposed staleness

0 ADR con `status: proposed` — non applicabile. Vedi P2 sopra per gap strutturale.

### 3. Frontmatter governance

```
python3 tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict
→ errors=0 warnings=0 exit=0
```

**Risultato**: CLEAN. Nessun auto-fix necessario.

### 4. CLAUDE.md sprint context

```
Sprint context (aggiornato: 2026-04-27 — cross-PC absorption + deep extraction pass 2 + 73 pattern residui catalogati)
```

Data: 2026-04-27 (oggi). Distanza: 0 giorni. **Risultato**: NOT SPRINT_STALE.

CI status non controllato via workflow run (strumento `gh run list` non disponibile nel contesto MCP corrente). Nessun segnale CI_RED da sprint context o BACKLOG.

### 5. Stale handoff docs

Tutti i handoff in `docs/planning/` datano 2026-04-24 → 2026-04-26 (3 giorni). Nessuno >45 giorni. **Risultato**: 0 HANDOFF_STALE.

### 6. Open PR rot

| PR | Titolo | Ultimo aggiornamento | Età |
|---|---|---|---|
| #1877 | feat(nido): Sprint C — mating roll + 3-tier visual | 2026-04-26 | 1 giorno |

1 sola PR aperta, aggiornata ieri. **Risultato**: 0 PR_ROT.

### 7. Stale remote branches

Campionati 13 branch su 300+ totali. Tutti i `claude/*` recenti (2026-04-24/25). Branch `codex/*` da Ott-Nov 2025: 8 confermati stale. Vedi P1 sopra.

---

## Auto-fix changelog

Nessun auto-fix applicato in questa sessione.

- Frontmatter governance: 0 errori → nessun `last_verified` da bumplare
- Handoff docs: nessuno >45gg → nessun `git mv`
- Registry path typos: 0 rilevati

---

## Suggested next actions

| Priorità | Azione | Effort |
|---|---|---|
| P1 | Bulk delete branch stale `codex/*` Ott-Nov 2025 (8+ branch) | ~10 min |
| P2 | Template frontmatter ADR + batch migration `docs/adr/*.md` | ~2h |
| P2 | Attivare CI run status check in prossimo drift audit (via `gh run list`) | ~30 min |
| P2 | TKT-MUTATION-P6-VISUAL (autonomous, ~1h, P0 nel backlog) | ~1h |
