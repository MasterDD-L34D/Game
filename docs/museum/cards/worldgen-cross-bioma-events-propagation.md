---
title: 'Cross-bioma event propagation: tempesta ferrosa pattern'
museum_id: M-2026-04-26-014
type: mechanic
domain: [architecture]
provenance:
  found_at: 'packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml:1'
  git_sha_first: '8ee399e8'
  git_sha_last: '61fe6079'
  last_modified: '2025-10-28'
  last_author: 'MasterDD-L34D'
  buried_reason: unintegrated
relevance_score: 4
reuse_path: 'apps/backend/services/combat/reinforcementSpawner.js — aggiungi cross_event loader come pressure modifier pre-wave'
related_pillars: [P1, P6]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-26
last_verified: 2026-04-26
---

# Cross-bioma event propagation: tempesta ferrosa pattern

## Summary (30s)

- `packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml` definisce 3 eventi (tempesta ferrosa, ondata termica, brinastorm) che si propagano da un bioma sorgente ad altri attraverso corridor/seasonal_bridge — con effetti gameplay concreti (penalità visibilità, stress termico, attrito).
- Zero runtime wiring: nessun endpoint né servizio legge questo file durante una sessione.
- Pattern Long War 2 mission pressure già citato in CLAUDE.md come soluzione per P6 Hardcore — cross-events sono la versione ecologicamente coerente dello stesso principio.

## What was buried

`cross_events.yaml` contiene 3 eventi tipizzati:

```yaml
events:
  - species_id: evento-tempesta-ferrosa
    from_nodes: [BADLANDS]
    propagate_via: [corridor, seasonal_bridge]
    to_nodes: [FORESTA_TEMPERATA, DESERTO_CALDO]
    effect: 'polveri ferrose e carica magnetica, penalità visibilità/gear metallico'

  - species_id: evento-ondata-termica
    from_nodes: [DESERTO_CALDO]
    propagate_via: [corridor]
    to_nodes: [BADLANDS]
    effect: 'ondata di calore e ionizzazione, stress termico esteso'

  - species_id: evento-brinastorm
    from_nodes: [CRYOSTEPPE]
    propagate_via: [seasonal_bridge, trophic_spillover]
    to_nodes: [FORESTA_TEMPERATA, BADLANDS]
    effect: 'ghiaccio fine in sospensione, visibilità ridotta e attrito aumentato'
```

Il validator `foodweb.py:collect_event_propagation()` già implementa la logica di tracing:

```python
def collect_event_propagation(network, node_events):
    for node_id, has_event in node_events.items():
        if not has_event: continue
        for edge in edges:
            if edge.get("from") == node_id and edge.get("type") in {"corridor", "seasonal_bridge"}:
                messages.append(ValidationMessage(
                    level="info",
                    code="network.events.propagation",
                    message=f"Evento in {node_id} può propagare verso {edge.get('to')}",
                ))
```

La logica di propagation checking esiste nel validator — non esiste nel runtime di sessione.

## Why it was buried

- Creato 2025-10-28 (`8ee399e8`), allineato con meta-network 2025-10-28 (`61fe6079`).
- Sprint 2025-2026 si sono concentrati su combat loop, round model, co-op — la dimensione "mondo dinamico" non è mai entrata in scope.
- Nessun ADR per "eventi cross-bioma come pressione sessione" → mai prioritizzato né rifiutato esplicitamente.
- Closed PR #1459 "atlas + foodweb migration" (2026-04-16) ha solo aggiunto label bilingui ai foodweb, non ha wireato gli eventi.

## Why it might still matter

- **P6 Fairness/Hardcore**: cross-event = pressione inattesa mid-mission senza spawn extra HP — elegante alternativa al "aggiungi nemici" che ha esaurito il multiplier knob (CLAUDE.md, Sprint 2026-04-24).
- **P1 Tattica**: penalità visibilità/attrito cambiano la tattica ottimale in modo narrativamente coerente (non stai "in una mappa difficile", sei investito da una tempesta ferrosa dai Badlands adiacenti).
- `StressWave` in `data/core/biomes.yaml` ha già `baseline + escalation` — gli event_effect potrebbero mappare come StressWave modifier mid-session.
- BACKLOG `TKT-08 backend stability under batch` è correlato: batch con pressure variabile = test realistico per stabilità.

## Concrete reuse paths

1. **Minimal** (P0, ~3h): all'inizio di ogni sessione, se `biome_id` corrisponde a un `to_node` in `cross_events.yaml`, tira d6: su 1-2 l'evento è "attivo" quella sessione → applica `StressWave.baseline += 0.05` (penalità fissa). Nessun propagation logic. Wire in `sessionHelpers.js` alla `/start`. Blast radius ×1.3 → ~4h.
2. **Moderate** (P1, ~8h): `crossEventService.js` loader + `/api/session/active_events` endpoint + `reinforcementSpawner` riceve `active_events[]` come pressure modifier sui tag affix. Wire in `sessionRoundBridge.js` pre-wave. Blast radius ×1.5 → ~12h.
3. **Full** (P2, ~20h): event propagation dinamica basata su `meta_network_alpha.yaml` edge graph — evento in bioma A si propaga con probabilità `(1 - resistance)` ogni round. `roundOrchestrator` emit `cross_event_arrived`. Atlas telemetry surface. ADR richiesto. Blast radius ×1.7 → ~34h.

## Sources / provenance trail

- Found at: [packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml:1](../../../packs/evo_tactics_pack/data/ecosystems/network/cross_events.yaml) — commit `8ee399e8` (MasterDD-L34D, 2025-10-25), last `61fe6079` (2025-10-28)
- Validator logic: [packs/evo_tactics_pack/validators/rules/foodweb.py:collect_event_propagation](../../../packs/evo_tactics_pack/validators/rules/foodweb.py)
- Parent stack: [worldgen-bioma-ecosistema-foodweb-network-stack.md](worldgen-bioma-ecosistema-foodweb-network-stack.md)
- SoT: [docs/core/00-SOURCE-OF-TRUTH.md:151-161](../../../docs/core/00-SOURCE-OF-TRUTH.md) — §3 Livello 4

## Risks / open questions

- Gli effetti (`penalità visibilità/gear metallico`) non sono quantificati numericamente nel YAML — serve design decision prima di wire (es. -1 accuracy? +10% StressWave? capire come mappa su `data/core/biomes.yaml` hazard structure).
- `species_id: evento-tempesta-ferrosa` usa campo `species_id` per naming di eventi — potenziale confusione con il campo omonimo per specie in altri schema. Pre-wire: verifica no collision con species catalog.
- Anti-pattern: NON promuovere a meccanica narrativa player-visible (popup "tempesta ferrosa in arrivo!") senza UX research. Il player può non capire il trigger ecologico. Minimo: log Atlas + pressure modifier invisibile.
