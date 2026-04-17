---
title: Audit Gap Implementativo Docs 2026-04-15 → 2026-04-17
doc_status: active
doc_owner: governance
workstream: cross-cutting
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# Audit Gap Implementativo Docs (2026-04-15 → 2026-04-17)

Report generato dal branch `explore/open-questions-triage` (Q-001). Audit automatico di tutti i docs nuovi o pesantemente modificati nelle ultime 48h per identificare gap fra descrizione e implementazione reale in codice/dati/test.

## Sommario

- **Docs analizzati**: 22 core + 3 ADR + appendici
- **Gap critici (G1) confermati**: 2
- **Gap significativi (G2) confermati**: 2 (G2.2 falso positivo verificato)
- **Gap minori (G3) confermati**: 1 (G3.1, G3.3, G3.4 falsi positivi)
- **Zero gap**: 13 + 4 falsi positivi

### Falsi positivi rettificati (verifica 2026-04-17)

- **G3.1 Sentience naming**: `docs/guide/README_SENTIENCE.md` già canonico T0-T6 (v3 del 2026-04-16), nessun conflitto.
- **G3.3 Appendici frontmatter**: A-CANVAS, C-CANVAS, D-CANVAS **hanno** frontmatter completi (doc_status, last_verified, workstream).
- **G3.4 Glossary schema**: solo `packages/contracts/schemas/glossary.schema.json` presente (Game side). Nessun duplicato nel repo Game — lo schema Game-Database è nell'altro repo ed è la sincronizzazione attesa.
- **G2.2 Mating gene_slots**: `data/core/mating.yaml` riga 388+ contiene `gene_slots` completo con 3 categorie (struttura/funzione/memorie) + mutation_tiers T0/T1/T2. Nessun TODO rilevato nel file.

---

## Gap Registry

### G1 · Critici

#### G1.1 — XP Cipher (`docs/core/00B-CANONICAL_PROMOTION_MATRIX.md` riga 30)

- **Claim**: "XP Cipher non trovato — rimuovere riferimento o chiarire"
- **Realtà**: XP Cipher referenziato in 4 doc (00C-WHERE_TO_USE_WHAT, 17-SCREEN_FLOW, planning/EVO_FINAL_DESIGN_BACKLOG_REGISTER, roadmap_operativa) ma **zero codice, schema o engine**. Backlog FD-058 esiste solo come nota.
- **Azione**: Formalizzare decision Master DD → ship FD-058 adesso **oppure** rimuovere dai cross-ref
- **Effort**: M

#### G1.2 — Utility AI non wired in round orchestrator (`docs/core/00-SOURCE-OF-TRUTH.md §13.5`)

- **Claim**: "AI SIS arricchita con roadmap Utility AI" + ref `services/ai/utilityBrain.js`
- **Realtà**: `utilityBrain.js` esiste ma **opt-in**, non integrato nel round orchestrator. ADR nota "integrazione sprint futuro". 7 considerazioni documentate, pipeline scoring→action non automatizzata. Test minimi.
- **Azione**: Completare integrazione round model + smoke test
- **Effort**: M

### G2 · Significativi

#### G2.1 — Tri-Sorgente Node bridge mancante (`docs/core/00-GDD_MASTER.md §8`)

- **Claim**: Pipeline "merge pool R/A/P → scoring composito → softmax → 3 pick + Skip"
- **Realtà**: Engine Python puro (`tests/tri_sorgente_sim.py` + config YAML). **Zero Node glue**, nessuna route `/api/tri-sorgente`, nessun handler backend.
- **Azione**: Scrivere bridge Node.js, integrare in session post-encounter
- **Effort**: M

#### G2.2 — Mating gene_slots incompleti (`docs/core/27-MATING_NIDO.md`)

- **Claim**: "gene_slots con 3 categorie (struttura/funzione/memorie), mutation_tiers T0-T2"
- **Realtà**: `data/core/mating.yaml` ha TODO espliciti su gene_slots. Doc canonico diviso in 27-MATING_NIDO.md (sintesi) e Mating-Reclutamento-Nido.md (dettaglio) senza redirect.
- **Azione**: Popolare gene_slots + creare canonical redirect
- **Effort**: S

#### G2.3 — Colyseus boilerplate assente (`docs/adr/ADR-2026-04-16-networking-colyseus.md`)

- **Claim**: ADR formale, decisione Colyseus per sync multiplayer
- **Realtà**: ADR presente, **zero codice**. Nessun service, nessuna room, nessun test.
- **Azione**: Implementare room manager + test base (P1 per battaglia multiplayer)
- **Effort**: L

### G3 · Minori

#### G3.1 — Sentience naming T0-T5 vs T1-T6 (`docs/guide/README_SENTIENCE.md`)

- **Issue**: README legacy usa T0-T5, RFC merged usa T1-T6. Schema `data/core/sentience.yaml` è canonico (T1-T6) ma guide non aggiornata.
- **Fix**: Allineare README + drop T0
- **Effort**: S

#### G3.2 — 00C XP Cipher self-ref (`docs/core/00C-WHERE_TO_USE_WHAT.md` riga 177-184)

- **Issue**: Tabella §4.8 elenca "XP Cipher" come "promoted core gap" ma non implementato. Self-referenziale con G1.1.
- **Fix**: Aggiornare tabella post-decisione G1.1
- **Effort**: S (dipende da G1.1)

#### G3.3 — Appendici senza frontmatter (`docs/appendici/{A,C,D}-CANVAS_*.md`)

- **Issue**: Convertiti .txt→.md ma mancano frontmatter canonici (doc_status, last_verified, workstream).
- **Fix**: Aggiungere minimal frontmatter `doc_status=historical_ref, workstream=research`
- **Effort**: S

#### G3.4 — Glossary schema duale (`packages/contracts/schemas/glossary.schema.json`)

- **Issue**: Game side ha schema in `packages/contracts/schemas/glossary.schema.json`, Game-Database in `server/schemas/glossary.schema.json` con `$comment: canonical`. Duale non consolidato.
- **Fix**: Game side come source of truth con test equivalenza
- **Effort**: S

---

## Docs Senza Gap (Zero Action)

- `docs/core/00-GDD_MASTER.md` (core sync)
- `docs/core/00-SOURCE-OF-TRUTH.md` §1-§12 (solo §13.5 partial)
- `docs/core/00D-ENGINES_AS_GAME_FEATURES.md`
- `docs/core/00E-NAMING_STYLEGUIDE.md`
- `docs/core/15-LEVEL_DESIGN.md`
- `docs/core/17-SCREEN_FLOW.md`
- `docs/hubs/combat.md`
- `docs/hubs/README.md`
- `docs/guide/naming-pipeline.md`
- `docs/guide/external-references.md`
- `docs/architecture/ai-policy-engine.md`
- `docs/adr/ADR-2026-04-16-grid-type-hex-axial.md`
- `docs/balance/MACHINATIONS_MODELS.md`
- `docs/planning/research/intentional-friendly-fire.md`

---

## Piano esecuzione su branch Q-001 (post-rettifica)

Ordine raccomandato (solo gap reali):

| # | Gap | Effort | Dipendenze | Action |
|---|-----|--------|------------|--------|
| 1 | G1.1 XP Cipher formal decision | M | Master DD input | ADR DRAFT kill-or-ship |
| 2 | G3.2 00C tabella XP Cipher | S | post-G1.1 | update post-ADR |
| 3 | G1.2 Utility AI default-on | M | Master DD approval (guardrail pilastro 5) | ADR DRAFT + eventual flag flip |
| 4 | G2.1 Tri-Sorgente Node bridge | M | Master DD approval | design spec nel branch, code su PR separata |
| 5 | G2.3 Colyseus boilerplate | L | opzionale | split PR dedicata post-merge Q-001 |

**Out of scope questo branch**: le 7 🔴 SoT §19.3 (Art Direction + Business Model — richiedono Master DD).
