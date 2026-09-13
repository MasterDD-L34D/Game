---
title: 'Bridge species come colla di rete: echo-wing, ferrocolonia, archon-solare'
museum_id: M-2026-04-26-015
type: dataset
domain: [species_candidate]
provenance:
  found_at: 'packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml:111-133'
  git_sha_first: '8ee399e8'
  git_sha_last: '6b07b18e'
  last_modified: '2025-11-29'
  last_author: 'MasterDD-L34D'
  buried_reason: unintegrated
relevance_score: 3
reuse_path: "data/core/species.yaml — promuovere 3 bridge species a canonical con biome_affinity multi-biome; segnalare come edge case all'evaluator"
related_pillars: [P3]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-26
last_verified: 2026-04-26
---

# Bridge species come colla di rete: echo-wing, ferrocolonia, archon-solare

## Summary (30s)

- `meta_network_alpha.yaml` definisce `bridge_species_map` con 3 specie (`echo-wing`, `ferrocolonia-magnetotattica`, `archon-solare`) che fungono da colla tra nodi bioma della rete: `dispersore_ponte`, `impollinatore`, `sentinella`, `ingegnere_ecosistema`.
- Queste 3 specie NON esistono in `data/core/species.yaml` — vivono solo nel pack ecosystem network, senza canonical runtime.
- Score 3/5: rilevanza media. Il meccanismo è interessante ma richiede ADR su "bridge species come enemy type speciale vs NPC ambientale vs encounter event".

## What was buried

`bridge_species_map` in `meta_network_alpha.yaml`:

```yaml
bridge_species_map:
  - species_id: echo-wing
    roles: [dispersore_ponte, impollinatore]
    present_in_nodes: [BADLANDS, FORESTA_TEMPERATA, DESERTO_CALDO, ROVINE_PLANARI, CRYOSTEPPE]
    # → omnipresente, 5/5 biomi

  - species_id: ferrocolonia-magnetotattica
    roles: [sentinella, ingegnere_ecosistema]
    present_in_nodes: [BADLANDS]
    # → endemica badlands, gestisce infrastruttura ferro-magnetica

  - species_id: archon-solare
    roles: [dispersore_ponte, impollinatore]
    present_in_nodes: [ROVINE_PLANARI]
    # → endemica rovine planari
```

`ferrocolonia-magnetotattica` appare anche come nodo nel `badlands_foodweb.yaml` (kind: `resource`) — quindi è trattata sia come specie-ponte sia come risorsa ambientale. Ambiguità intenzionale o errore schema? Non documentato.

`echo-wing` appare sia nel `badlands_foodweb.yaml` (kind: `species`) sia in `bridge_species_map` — coerente.

Il validator `foodweb.py` ha regola `network.bridge.missing_species` che emette warning se non c'è bridge species per un edge cross-bioma — quindi la logica di validazione è attiva e consapevole di queste specie.

## Why it was buried

- Le 3 specie sono state definite come parte del `meta_network_alpha.yaml` (commit `8ee399e8`, 2025-10-25) in un momento in cui il modello worldgen era il focus.
- Nessuna successiva PR ha promosso queste specie a `data/core/species.yaml` — rimaste "metadata ecologico" senza canonical.
- `incoming/species/*.json` (10 file) sono stati canonicalizzati con PR #1453 (bilingual naming), ma non includevano queste 3 bridge species.
- `ferrocolonia-magnetotattica` ha ambiguità `species` vs `resource` non risolta.

## Why it might still matter

- **P3 Identità Specie×Job**: echo-wing come species omnipresente = candidato per encounter "scout/messenger" cross-bioma, ruolo bridge narrativo.
- Se cross-events vengono wireati (card M-2026-04-26-014), serve un "carrier" per la propagazione — bridge species sono già il veicolo naturale.
- Validator `network.bridge.missing_species` già emette warning per ogni edge senza bridge species coperta → fixing questo warning richiede decidere se queste specie diventano canonical.
- `ferrocolonia-magnetotattica` come `ingegnere_ecosistema` in BADLANDS = potenziale encounter "difesa del nido" con mechanic speciale (distruggi infrastruttura ferromagnetica → trigger cross-event).

## Concrete reuse paths

1. **Minimal** (P0, ~2h): aggiungi `echo-wing` a `data/core/species.yaml` con `biome_affinity: multi-biome` e ruolo `bridge` — silenza il validator warning, stabilisce canonical. Solo data, zero runtime change. Blast radius ×1.0 → ~2h.
2. **Moderate** (P1, ~8h): promuovi tutte e 3 a canonical con schema completo (biome_affinity[], role_trofico=bridge, spawn_rules, functional_tags). Estendi `biomeSpawnBias` per riconoscere `role=bridge` e ridurre spawn probability in biomi non-nativi per species non-bridge. Blast radius ×1.3 → ~10h.
3. **Full** (P2, ~20h): bridge species come encounter event speciale — quando cross-event è attivo, spawn di `echo-wing` come "herald" NPC (non combattente) che annuncia l'evento. Richiede narrative engine hook + ADR. Blast radius ×1.7 → ~34h.

## Sources / provenance trail

- Found at: [packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml:111-133](../../../packs/evo_tactics_pack/data/ecosystems/network/meta_network_alpha.yaml)
- Foodweb validation: [packs/evo_tactics_pack/validators/rules/foodweb.py:network.bridge.missing_species](../../../packs/evo_tactics_pack/validators/rules/foodweb.py)
- Badlands foodweb: [packs/evo_tactics_pack/data/foodwebs/badlands_foodweb.yaml](../../../packs/evo_tactics_pack/data/foodwebs/badlands_foodweb.yaml) — echo-wing e ferrocolonia-magnetotattica come nodi
- NOT in: [data/core/species.yaml](../../../data/core/species.yaml) — **false positive guard verificato**: grep confermato 0 hit su questi slug
- Parent card: [worldgen-bioma-ecosistema-foodweb-network-stack.md](worldgen-bioma-ecosistema-foodweb-network-stack.md)

## Risks / open questions

- `ferrocolonia-magnetotattica` ha kind `resource` nel foodweb ma ruolo `ingegnere_ecosistema`/`sentinella` nel bridge map — ambiguità da risolvere prima di promuovere a canonical. ADR o nota in species.yaml.
- Slug `echo-wing` usa trattino, `data/core/species.yaml` usa underscore per la maggior parte degli slug (es. `dune_stalker`). Pre-wire: standardizzare casing con styleguide commit `b1fe7e36` (bilingual naming 2026-04-17).
- Score basso (3/5) perché nessun ticket aperto cita bridge species, nessun backlog match, reuse path limitato. Se cross-events (M-2026-04-26-014) vengono approvati, questo score sale a 4/5.
