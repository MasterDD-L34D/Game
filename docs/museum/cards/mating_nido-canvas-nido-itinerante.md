---
title: Nido Itinerante + Security Rating — D-CANVAS legacy detail (Skiv vagans direct fit)
museum_id: M-2026-04-25-008
type: artifact
domain: mating_nido
provenance:
  found_at: docs/appendici/D-CANVAS_ACCOPPIAMENTO.md
  git_sha_first: d6bc3a03
  git_sha_last: d6bc3a03
  last_modified: 2025-10-23
  last_author: MasterDD-L34D
  buried_reason: superseded
relevance_score: 4
reuse_path: M-007 Path A wire (mating engine activate) + Skiv vagans wandering nest narrative
related_pillars: [P2, P3]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# Nido Itinerante + Security Rating (D-CANVAS legacy)

## Summary (30s)

- **3 meccaniche mai migrate** dalla canvas legacy (ChatGPT export 2025-10-23): nido itinerante 2-Anchor, Security Rating vs minaccia bioma, rituali coesione spendono Legami
- **Skiv `vagans` direct fit**: "wandering loner" creature → nido itinerante (anchor-based, no fixed nest) è il pattern naturale per persona errante. Fit narrative assente nel canonical doc.
- **Status superseded ma detail-buried**: scala -3..+3 deprecata (canonical usa -2..+2 / 0..5 post P0 Q11) ma 3 detail meccaniche **non sono in alcun canonical doc**. Pure information loss se non recuperati.

## What was buried

### Meccanica 1: Nido itinerante 2-Anchor

> "Il nido può essere itinerante: invece di una posizione fissa, definisci 2 'Resonance Anchor' (es. una collinetta + uno stagno). Il nido si sposta tra anchor ogni 3 turni di campagna. Cosa cambia: la creatura si rifugia nell'anchor più vicino al threat detected."

**Canonical mismatch**: canonical mating doc assume nido statico (`nest_position: {x, y}`). Itinerante = `nest_anchors: [{x1,y1}, {x2,y2}]` + `nest_active_anchor: 0|1` + tick rule.

### Meccanica 2: Security Rating vs minaccia bioma

> "Ogni biome ha un threat_baseline. Ogni nido ha un security rating (sum traits + structure mods). Raid se threat > security. Risultato: lose 1 gene_slot or move anchor (forced)."

**Canonical mismatch**: canonical mating doc tratta nido come safe-by-default. Threat-based raid = layer mancante.

### Meccanica 3: Rituali coesione spendono Legami

> "Trib gradient (Legami 0..N). Ritual 'rinforza coesione' costa 2 Legami. Effetto: -1 stack StressWave per 3 turni. Trib grande = pochi Legami, but resilient. Trib piccola = molti Legami, but volatile."

**Canonical mismatch**: canonical mating doc ha trust 0..5 ma non Legami pool spendable. Risorsa NEW.

## Why it was buried

- Canvas D è stato approvato come reference initiale (commit `d6bc3a03` "Restore approved canvas archives" 2025-10-26)
- Canonical doc `docs/core/Mating-Reclutamento-Nido.md` evolve indipendentemente, scala revisita -3..+3 → -2..+2 (PR P0 Q11) ma **senza migrare le 3 meccaniche detail** sopra
- Bus factor 1 (MasterDD-L34D) — autore ricorda canvas, futuri agent no
- Mating engine M-007 NON usa nessuna delle 3 meccaniche → assenza runtime conferma deperdimento

## Why it might still matter

### Skiv vagans link FORTE

Skiv = `Arenavenator vagans` (lat. errante). Persona "wanders the dunes alone, returns to anchor only at dusk". Mating engine M-007 attualmente assume nido statico → Skiv mating impossibile (vagans senza nido).

**Fix narrative + meccanico**: Skiv ha `nest_type: itinerante` flag → 2-Anchor (es. dune ridge + oasis). Anchor switch ogni 3 round campagna = sprint forzato Skiv. Crea identity tactical unica (loner mating cycle).

### Pillar match

- **P2 Evoluzione**: Security Rating = bioma×nido interaction layer. Senza, mating è isolato dal bioma (gap V7 biome-aware spawn bias parallelo)
- **P3 Specie×Job**: Legami pool come resource per ritual = nuovo loop coesione team. Plug-in into V5 SG / SquadSync infrastructure esistente

### M-007 dependency

Mating engine activate (M-007 Path A) **dovrebbe leggere queste 3 meccaniche** prima di scope-down a "minimal mating". Senza, perdi ricchezza tactical.

## Concrete reuse paths

1. **Minimal — Skiv-only itinerante (P0 Sprint A se M-007 Path A, ~3h)**

   Solo per Skiv come pilot:
   - Estendi `data/core/species/dune_stalker_lifecycle.yaml` con `nest_type: itinerante` + `nest_anchors_template: [dune_ridge, oasis]`
   - Modifica `metaProgression.setNest()` per accettare `anchors[]` invece di `position`
   - Tick rule in `roundOrchestrator.tickCampaignTurn()`: anchor switch ogni 3 round
   - Test: `node --test tests/api/meta.test.js` (Skiv mating roll su 2-anchor scenario)
   - Output: Skiv first canonical creature con itinerante nest. Pattern test-bed per altre `vagans`-style species future

2. **Moderate — Security Rating system completo (P1, ~8h)**

   Generalize beyond Skiv:
   - `data/core/biomes.yaml` extend con `threat_baseline: int` per ogni biome
   - `metaProgression.computeSecurityRating(nest, traits, structures)` → int sum
   - Round tick: if `threat_baseline > security_rating` → raid trigger (`-1 gene_slot` OR `force_anchor_move`)
   - UI HUD: nest hub mostra `Security: X/Threat: Y` con color coding
   - Tests + balance harness su 3 biome diversi
   - Pillar P6 Fairness: bilanciare biome con threat alto vs creatura debole

3. **Full — Legami pool + rituali (P2, ~12h)**

   New mechanics layer:
   - `unit.legami: int` (0..N range from canvas)
   - `data/core/affordances.yaml` extend con ritual entries (rinforza_coesione costo 2 Legami)
   - StressWave reduction integration
   - `apps/play/src/debriefPanel.js` ritual UI (post-encounter spend Legami)
   - Telemetry events `ritual_performed_count_by_archetype`
   - Pillar P4 Temperamenti link: ritual narrative cue per type Ennea (es. type 9 Stoico = ritual "silenzio condiviso")

## Sources / provenance trail

- Found at: [docs/appendici/D-CANVAS_ACCOPPIAMENTO.md:1](../../appendici/D-CANVAS_ACCOPPIAMENTO.md) (95 LOC)
- Git history: `d6bc3a03` (2025-10-26, MasterDD-L34D, "Restore approved canvas archives") — single commit, mai più toccato
- Source format: ChatGPT export 2025-10-23
- Bus factor: 1
- Related canonical (superseded scale, retains mechanics): [docs/core/Mating-Reclutamento-Nido.md](../../core/Mating-Reclutamento-Nido.md)
- Related canonical (engine target): [apps/backend/services/metaProgression.js](../../../apps/backend/services/metaProgression.js)
- Related canonical (Skiv): [data/core/species/dune_stalker_lifecycle.yaml](../../../data/core/species/dune_stalker_lifecycle.yaml)
- Related cross-card: [M-2026-04-25-007 Mating Engine Orphan](mating_nido-engine-orphan.md) — pre-req per Path A wire
- Inventory: [docs/museum/excavations/2026-04-25-mating_nido-inventory.md](../excavations/2026-04-25-mating_nido-inventory.md)

## Risks / open questions

- ❓ Path Minimal richiede M-007 Path A (mating engine activate) come pre-req. Se M-007 Path B (demolish) → questa card resta storica
- ⚠️ "Legami" pool è risorsa NEW non in canonical. Schema drift potential (link OD-009 hybrid pattern)
- ⚠️ Anchor switch tick rule potrebbe interferire con biome resonance (PR #1785) — check before wire
- ⚠️ Scala -3..+3 nella canvas è deprecata. Mai usare quei valori; solo le 3 meccaniche conceptual
- ✅ Encoding clean (UTF-8 nativi)

## Next actions

- **Cross-card link**: leggi M-007 PRIMA per decisione product Path A/B/C
- **Skiv link forte**: se M-007 Path A → questa card è prima da implementare (Skiv pilot)
- **Drift escalation**: schema Legami → `sot-planner` per ADR resource pool
