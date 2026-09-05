# Swarm Candidates — artifact ready-for-integration da Dafne swarm

Questo directory contiene **proposte di content** generate dal [Dafne swarm](https://github.com/MasterDD-L34D/evo-swarm) (`C:\Users\edusc\Dafne\workspace\swarm`) che sono candidate per integrazione nel Game repo.

## Status: staging, NON canonical

- File qui sono **draft** prodotti dal swarm tramite ciclo `lore-designer → trait-curator → validator` (quando disponibile).
- **NON modificano runtime Game**: sono staged per review Eduardo prima di promozione in `data/core/*`.
- Ogni file ha `provenance:` che traccia origine swarm (agent, timestamp, artifact_id).

## Workflow di promozione

Definito in `docs/pipeline-swarm-to-game.md` del repo evo-swarm:

1. **Swarm produce** artifact (agent specialist via Ollama)
2. **Staging**: human+review integra manualmente qui in `incoming/swarm-candidates/<topic>/<name>.yaml`
3. **Review Eduardo**: decide ACCEPT (promuove in `data/core/traits/active_effects.yaml` o altra location canonical), REVISE (torna al swarm con note), REJECT (scarta)
4. **Promozione**: edit `data/core/*` + rimuove staging file + test `npm run test:api`
5. **Trace**: commit con reference a swarm_artifact_id

## Stato integrazione

| Data       | File                                  | Source agent                  | Artifact ID                                     | Status                                                                          |
| ---------- | ------------------------------------- | ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| 2026-04-24 | `traits/magnetic_rift_resonance.yaml` | trait-curator + lore-designer | `trait-curator_2026-04-24T01-08-27.414378.json` | **PROMOTED 2026-04-25** (OD-012 batch) → `data/core/traits/active_effects.yaml` |

## Out of scope del trait environmental costs M11

I trait qui non entrano automaticamente nel pilot M11 (`data/core/balance/trait_environmental_costs.yaml` — 4 trait × 3 biomi STRICT). Promozione in M11 richiede scope-extension deliberate.

## Out of scope attivazione SPRINT_002

Non entrano automaticamente in `data/core/traits/active_effects.yaml` (SPRINT_002 pilot 2 trait "Primo trait vivo"). Promozione richiede scope-extension.

## Riferimenti

- Pipeline definita: [evo-swarm docs/pipeline-swarm-to-game.md](https://github.com/MasterDD-L34D/evo-swarm/blob/main/docs/pipeline-swarm-to-game.md)
- SWARM-CONTROLS CO-02: formato artefatto output (JSON schema CO-02)
- Manifest swarm: [evo-swarm MANIFEST.md](https://github.com/MasterDD-L34D/evo-swarm/blob/main/MANIFEST.md) (Livello 1 famiglia + Livello 2 specialisti)
