---
title: 'ADR 2026-04-17 — XP Cipher: Official Park'
doc_status: active
doc_owner: governance
workstream: cross-cutting
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# ADR-2026-04-17 · XP Cipher Official Park

**Stato**: 🟢 ACCEPTED — Master DD 2026-04-17 (Q-001 T2.1)
**Branch**: `explore/open-questions-triage` (Q-001)
**Risolve**: G1.1 audit gap implementativo 2026-04-17

## Contesto

"XP Cipher" appare in 4+ doc del repository come **promoted core gap** (FD-058) nel backlog Final Design:

- `docs/core/00B-CANONICAL_PROMOTION_MATRIX.md` — marcato "XP Cipher non trovato — rimuovere riferimento o chiarire"
- `docs/core/00C-WHERE_TO_USE_WHAT.md` §4.8 — tabella UI TV / HUD lo elenca come "promoted core gap"
- `docs/planning/EVO_FINAL_DESIGN_BACKLOG_REGISTER.md` FD-058 — "Trattare il gap storico o formalizzarne l'uscita dallo scope"
- `docs/planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md` — gate "Legacy gaps chiusi: HUD overlay + XP Cipher"
- `docs/planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md` §5 + §110
- `docs/planning/roadmap_operativa.md`
- `docs/process/action-items.md`
- `config/tracker_registry.yaml`

**Problema**: nessuna definizione operativa esistente. Nessuno schema, nessun codice, nessun endpoint, nessun YAML. Solo references cross-doc che indicano un placeholder da "chiudere" senza specificare cosa debba fare.

Ricerca in repo (`grep -r "XP.*Cipher"`): 12 file, tutti documentali, zero implementazione.

## Decisione proposta

**OFFICIAL PARK** — rimuovere XP Cipher dal backlog attivo e dichiararlo **out of scope del lancio**.

Razionale:

1. **Zero definizione operativa** — nessun doc specifica input, output, formula, UX, o integrazione. Il "gap" è la spec mancante, non un'implementazione incompleta.
2. **Meccaniche XP-like già coperte**:
   - Progressione creature → `data/core/jobs.yaml` + trait unlock
   - Meta-progressione Nido → `data/core/mating.yaml` gene_slots
   - VC scoring → `services/vcScoring.js` traccia identità giocatore
   - PE/PI/Seed/PP/SG → economy freeze (roadmap §M2)
3. **Costo implementazione sconosciuto** — senza spec, stima impossibile. Ship-without-spec = rischio tech debt.
4. **Pattern "legacy dimenticato"** — termine non menzionato in nessun playtest, in nessun sprint 001-019, in nessun commit implementativo. Residuo concettuale pre-canonical refactor.

## Alternative considerate

### A. Ship (implement now)

- **Pro**: risolve gap definitivamente
- **Contro**: richiede 2-4 settimane design + dev senza chiaro problema da risolvere
- **Verdetto**: rigetto — ship senza spec = anti-pattern

### B. Park indefinitamente senza ADR

- **Pro**: zero effort
- **Contro**: doc cross-refs rimangono sporche, audit futuri riproducono gap
- **Verdetto**: rigetto — non risolve problema doc hygiene

### C. **Official park con cleanup** (raccomandato)

- **Pro**: chiude gap ufficialmente, pulisce cross-refs, sblocca gate M6
- **Contro**: se in futuro emergerà bisogno, ADR dovrà essere superseded
- **Verdetto**: accettato come default

## Azioni post-approvazione

Se Master DD approva:

1. Aggiornare `docs/core/00B-CANONICAL_PROMOTION_MATRIX.md` riga 30 → "XP Cipher parked via ADR-2026-04-17"
2. Aggiornare `docs/core/00C-WHERE_TO_USE_WHAT.md` §4.8 → rimuovere riga "XP Cipher" o marcarla "Parked (ADR-2026-04-17)"
3. Aggiornare `docs/planning/EVO_FINAL_DESIGN_BACKLOG_REGISTER.md` FD-058 → spuntare ☐ → ☑ con ref ADR
4. Aggiornare `docs/planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md` gate "Legacy gaps chiusi" → XP Cipher resolved via park
5. Aggiornare `docs/planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md` §5+§112
6. Aggiornare `config/tracker_registry.yaml` se contiene row XP Cipher
7. Chiudere issue/todo correlati

## Conseguenze

- **Gate M6 (Freeze)**: XP Cipher non bloccherà più il gate — sbloccabile post-decisione
- **Audit futuri**: `grep XP Cipher` restituirà solo questo ADR + cross-refs storici cleaned
- **Reversibilità**: se in futuro emergerà necessità di XP system dedicato (non coperto da VC/Nido/Jobs), nuovo ADR con spec completa.

## Decisione Master DD (2026-04-17) — Q-001 T2.1

- Alternativa scelta: **C** (Official park + cleanup)
- Cleanup 8 cross-refs: **ORA** nello stesso branch Q-001

**Cleanup eseguito nei commit successivi a questo ADR.** Riferimenti aggiornati in:

1. docs/core/00B-CANONICAL_PROMOTION_MATRIX.md
2. docs/core/00C-WHERE_TO_USE_WHAT.md
3. docs/planning/EVO_FINAL_DESIGN_BACKLOG_REGISTER.md (FD-058)
4. docs/planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md
5. docs/planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md
6. docs/planning/roadmap_operativa.md
7. docs/process/action-items.md
8. config/tracker_registry.yaml
