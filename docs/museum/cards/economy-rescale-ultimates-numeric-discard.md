---
title: Economy rescale ultimate -> numerico — discarded (keep consume-all)
museum_id: M-2026-06-02-002
type: discarded_decision_path
domain: economy-cost-gate-pp-sg
provenance:
  found_at: docs/superpowers/specs/2026-06-02-economy-cost-gate-pp-pt-followup.md
  git_sha_first: TBD
  git_sha_last: TBD
  last_modified: 2026-06-02
  last_author: claude-opus-4.8-design-closure
  buried_reason: handoff H2 §2 proponeva rescale rank-2 -> numerico; verify-first SoT-completo rivela PP-numerico anti-canon + SG-ultimate identity-change -> KEEP consume-all
relevance_score: 4
reuse_path: docs/superpowers/specs/2026-06-02-economy-cost-gate-pp-pt-followup.md (Lever, valori numerici pronti se master-dd vuole flippare cataclysm)
related_pillars: [P6]
related_od: []
status: curated
excavated_by: claude-opus-4.8 design-closure 2026-06-02 (goal Fase-2 task rescale, repo-archaeologist non in registry sessione codemasterdd -> card autorata in formato canonico)
excavated_on: 2026-06-02
last_verified: 2026-06-02
---

# Economy rescale ultimate -> numerico — discarded (keep consume-all)

## Summary (30s)

- Il handoff H2 (`2026-06-02-h2-economy-handoff.md` §2) proponeva, come leva balance opzionale, di
  **rescalare le ability rank-2 a costo gonfiato** (cataclysm `cost_sg 75`; PP rank-2 blade_flurry 6 /
  resonance 4 / kill_shot 6 / deathmark 4) da **consume-all** a **numerico** (`cost <= pool`).
- **Scartato dopo verify-first sul SoT completo** (currency-gate): per PP il numerico e' **anti-canon**
  (il SoT fissa SOLO "Ultimate = 3 PP consume all", nessuna spesa PP numerica esiste); per gli ultimate
  SG (cataclysm/arcane_lance/apocalypse_ray) il rescale cambia l'**identita'** (da ultimate AoE a AoE
  ripetibile). Verdetto: **KEEP consume-all**.
- **Reuse value**: i valori numerici sono **pronti** se master-dd vuole, in futuro, flippare cataclysm
  (legittimo: SG ha gia un modello misto synaptic/aberrant). Il PP-numerico resta sconsigliato.

## What was discarded

### Il rescale proposto (band-neutral, reversibile)

| Ability (rank-2)    | Pool | Oggi (consume-all) | Numerico proposto | Esito                     |
| ------------------- | :--: | -----------------: | ----------------: | ------------------------- |
| cataclysm           |  SG  |                 75 |          3 (≤cap) | leva legittima (rinviata) |
| blade_flurry        |  PP  |                  6 |                 2 | anti-canon (respinto)     |
| resonance_amplifier |  PP  |                  4 |                 2 | anti-canon (respinto)     |
| kill_shot           |  PP  |                  6 |                 2 | anti-canon (respinto)     |
| deathmark           |  PP  |                  4 |                 2 | anti-canon (respinto)     |

### Why discarded (evidenza, non over-caution)

| Criterio           |  PP  | SG ultimate | Rationale                                                                             |
| ------------------ | :--: | :---------: | ------------------------------------------------------------------------------------- |
| Canon (26-ECONOMY) | fail |   pass\*    | PP: solo "Ultimate = 3 consume all", zero spesa numerica -> rescale = invenzione      |
| Catalogo           | fail |    mixed    | PP: tutti i 12 cost_pp sono 4..12 (>pool 3); SG ha gia synaptic 2/aberrant 3 numerici |
| Identita' ability  |  ok  |    fail     | SG: cataclysm e' ultimate AoE (surge_aoe+stress_reset); numerico -> AoE spammabile    |
| Band-verify        | n/a  |     n/a     | band-neutral (nessuna sim lancia queste ability) -> non validabile, no signal         |

\* SG-numerico non e' anti-canon (precedente synaptic/aberrant) ma cambia l'identita' dell'ultimate.

### Cosa NON e' stato scartato

Il **cost-gate engine** resta invariato (consume-all per `cost > pool`, numerico per `cost <= pool`). I
costi numerici GIA esistenti (SG synaptic_burst 2, aberrant_overdrive 3; tutti i cost_pt 3..10) restano
numerici. Solo il **rescale degli ultimate** e' rinviato.

## Reuse paths

1. **Lever pronto**: se master-dd vuole cataclysm numerico -> set `cost_sg: 3` nel dato (`data/core/jobs.yaml`),
   1 valore, nessun codice. Il gate flippa automaticamente. Reversibile via git.
2. **Regola canon**: PP spende SOLO come ultimate consume-all (3 PP). Non introdurre cost_pp numerici
   senza prima estendere il SoT `26-ECONOMY §PP` (oggi NON li prevede).
3. **Pattern**: "valore-costo gonfiato > pool = sentinella consume-all" — leggibile, niente flag, niente
   campo extra. Riusabile per ogni nuova ability ultimate.

## Lifecycle

- **Status**: `curated` (verify-first catalogo + SoT documentati; verdetto nel spec sibling).
- **Reuse**: pendente eventuale preferenza master-dd su cataclysm-numerico.
- **Decommission**: se master-dd flippa cataclysm -> la card diventa training-evidence del verify-first
  currency-gate (revived), non si elimina.

## Related

- Spec/verdetto: `docs/superpowers/specs/2026-06-02-economy-cost-gate-pp-pt-followup.md` (§Rescale verdetto)
- Handoff (proposta originale): `docs/planning/2026-06-02-h2-economy-handoff.md` §2
- SoT economia: `docs/core/26-ECONOMY_CANONICAL.md` (§PP "Ultimate = consume all" / §SG)
- Lezione: currency-gate (leggi il SoT COMPLETO prima di chiamare una cosa "balance-pending") —
  anti-pattern #19 applicato al handoff stesso (come gia per PP/PT earn-curve)
