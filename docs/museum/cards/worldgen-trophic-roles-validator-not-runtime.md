---
title: 'Ruoli trofici: validator-time completo, runtime zero — gap M-future'
museum_id: M-2026-04-26-016
type: architecture
domain: [architecture]
provenance:
  found_at: 'packs/evo_tactics_pack/validators/rules/trophic_roles.py:1'
  git_sha_first: 'b36bfa35'
  git_sha_last: '5a06b64b'
  last_modified: '2025-10-31'
  last_author: 'MasterDD-L34D'
  buried_reason: deferred
relevance_score: 4
reuse_path: 'apps/backend/services/combat/reinforcementSpawner.js — leggere role_trofico da species + biome_pools per qualificare spawn pool'
related_pillars: [P1, P3, P6]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-26
last_verified: 2026-04-26
---

# Ruoli trofici: validator-time completo, runtime zero — gap M-future

## Summary (30s)

- `packs/evo_tactics_pack/validators/rules/trophic_roles.py` implementa un sistema completo di validazione ruoli trofici (apex, keystone, bridge, minion, ecc.) con alias resolution, default fallback, schema check. Operativo come validator pack — zero impatto su gameplay runtime.
- `packs/evo_tactics_pack/validators/rules/foodweb.py` valida la struttura della rete alimentare (allowed_edge_types, detritus sink, network connectivity). Entrambi validano YAML statici al build-time, non influenzano encounter generation.
- Il gap: tutti i dati trofici sono canonici e validati ma il runtime non li consulta per decidere chi spawnare quando.

## What was buried

**`trophic_roles.py`** (estratto chiave):

```python
REQUIRED_FIELDS = ("schema_version", "receipt", "id", "display_name", "biomes",
                   "role_trofico", "functional_tags", "vc", "playable_unit",
                   "spawn_rules", "balance")

ROLE_ALIASES = {
    "predatore_apice": "predatore_terziario_apex",
    "specie_chiave": "ingegneri_ecosistema",
    "specie_ponte": "dispersore_ponte",
    "minaccia_dinamica": "minaccia_microbica",
    "evento_dinamico": "evento_ecologico",
}
DEFAULT_ROLE = "evento_ecologico"
DEFAULT_ENCOUNTER_ROLE = "minion"
```

Il validator gestisce alias canonici, ruolo di default, campo `spawn_rules` e `balance` — tutto il design contract di una specie rispetto al suo ruolo trofico è formalizzato qui.

**`foodweb.py`** — 4 funzionalità:

1. `validate_foodweb_document()` — edge type check + node reference check
2. `has_detritus_sink()` — nodo `detrito` + edge `detritus/scavenging`
3. `validate_network_connectivity()` (probabile) — rete connessa
4. `collect_event_propagation()` — trace propagation paths per evento

**Runtime reality check**:

```javascript
// apps/backend/services/validator.js:32-33
if (kind === 'foodweb') {
  return runtimeValidator.validateFoodweb(payload.foodweb);
}
```

Il `runtimeValidator.validateFoodweb` è esposto via `/api/quality` endpoint — funziona per validazione on-demand (es. tool devteam), non come parte del flow encounter generation.

```javascript
// apps/backend/services/combat/biomeSpawnBias.js:1-13
// V7 Biome-aware spawn bias (ADR-2026-04-26).
// Augments reinforcement/director spawn pool weight based on
// biome affixes matching unit tags.
```

Il biomeSpawnBias usa `AFFIX_TAG_AFFINITIES` hardcoded, NON `role_trofico` da YAML.

## Why it was buried

- Validator ecosystem costruito 2025-10-29/31 in sprint separato dal session engine.
- `runtimeValidator` (Python bridge via `services/generation/`) è la stessa infrastruttura usata per validare specie e biomi, ma è strutturalmente separata dal combat runtime Node.
- La connessione "foodweb validator output → spawn decision" non esiste e non è stata mai progettata — il validator è pensato per CI, non per runtime gameplay.
- ADR-2026-04-19 ha killed il Python rules engine → il bridge Python↔Node è già marcato DEPRECATED → usare Python trophic_roles.py a runtime sarebbe contro-tendenza.

## Why it might still matter

- **Il design contract esiste**: ogni specie in `packs/evo_tactics_pack/data/ecosystems/` ha `role_trofico` + `spawn_rules` + `balance` — solo mancante wire.
- **P3 Identità Specie×Job**: `role_trofico` mappa naturalmente su Job class (`apex`→vanguard, `keystone`→warden, `bridge`→skirmisher/artificer). Senza questo wire, la promessa "species identity shapes encounter" è documentata ma non vissuta.
- **P6 Hardcore fairness**: spawn basato su ruolo trofico + pool cap richiesto da `at_least` rules (`apex ≥1`, `keystone ≥2`) = bilanciamento strutturale invece di tuning manuale per encounter.
- `biomeSpawnBias.js` (ADR-2026-04-26) è il punto di entry naturale — già nel hot path, già legge biome config.

## Concrete reuse paths

1. **Minimal** (P0, ~4h): estratto Node-native dei role alias da `trophic_roles.py` → `troicRoleResolver.js` (50 LOC), usato in `biomeSpawnBias.js` per filtrare pool per `role_trofico` oltre all'affix match. NON usare il Python validator a runtime. Blast radius ×1.5 → ~6h.
2. **Moderate** (P1, ~10h): leggi `spawn_rules` da `*.ecosystem.yaml` per bioma sessione corrente, passa a `reinforcementSpawner` per constraint wave (es. `at_least: apex=1` → sempre uno spawner con role=apex nel primo wave). Blast radius ×1.5 → ~15h.
3. **Full** (P2, ~25h): trophic role enforcement completo + balance validator integrato nel loop encounter generation (non solo CI). Richiede portare `trophic_roles.py` logic a Node o wrap via `runtimeValidator` Python bridge. Ma Python bridge è DEPRECATED (ADR-2026-04-19) → forte raccomandazione: PORT to Node prima di questo path. Blast radius ×2.0 → ~50h. ADR obbligatorio.

## Sources / provenance trail

- Found at: [packs/evo_tactics_pack/validators/rules/trophic_roles.py:1](../../../packs/evo_tactics_pack/validators/rules/trophic_roles.py) — commit `b36bfa35` (MasterDD-L34D, 2025-10-29)
- Foodweb validator: [packs/evo_tactics_pack/validators/rules/foodweb.py](../../../packs/evo_tactics_pack/validators/rules/foodweb.py) — commit `b36bfa35` (2025-10-29)
- Runtime entry point: [apps/backend/services/combat/biomeSpawnBias.js](../../../apps/backend/services/combat/biomeSpawnBias.js) — commit `0d501169` (2026-04-24)
- DEPRECATED alert: [services/rules/DEPRECATED.md](../../../services/rules/DEPRECATED.md) + [docs/adr/ADR-2026-04-19-kill-python-rules-engine.md](../../../docs/adr/ADR-2026-04-19-kill-python-rules-engine.md)
- Parent card: [worldgen-bioma-ecosistema-foodweb-network-stack.md](worldgen-bioma-ecosistema-foodweb-network-stack.md)

## Risks / open questions

- **Python bridge DEPRECATED**: portare `trophic_roles.py` a runtime Node richiede porting (~4-6h aggiuntive). La logica è pulita Python puro, porting fattibile. Ma NON usare il bridge esistente in `runtimeValidator` per gameplay hot path — troppo lento e segnato per rimozione.
- `role_trofico` nei `*.ecosystem.yaml` usa slug italiani (`predatore_terziario_apex`) — `ROLE_ALIASES` in `trophic_roles.py` gestisce la traduzione ma serve implementazione Node. Candidato a `troicRoleResolver.js` standalone.
- NON promuovere trophic role enforcement a player-visible UI senza design review. È un motore di coerenza ecologica, non un sistema di progressione esplicita.
