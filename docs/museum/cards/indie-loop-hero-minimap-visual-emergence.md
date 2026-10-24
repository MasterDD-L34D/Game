---
title: Loop Hero Mini-Map Campaign Progress Visual Emergence
museum_id: M-2026-04-27-029
type: mechanic
domain: other
provenance:
  found_at: docs/research/2026-04-27-indie-design-perfetto.md §5
  source_game: 'Loop Hero — Four Quarters (2021)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 3
reuse_path: apps/play/src/ briefing panel + campaign advance endpoint hex_revealed array
related_pillars: [P2, P5]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P2
effort_estimate_h: 6
blast_radius_multiplier: low
trigger_for_revive: Decisione D5 risolta (diegetic vs HUD mini-map) + campaign definition update
related:
  - docs/research/2026-04-27-indie-design-perfetto.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.4.2
  - apps/backend/routes/session.js
verified: false
---

# Loop Hero Mini-Map Campaign Progress Visual Emergence

## Summary (30s)

- Mini-map hex 5×5 nel briefing panel: dopo ogni scenario completato, 1-3 hex si illuminano (colore bioma). Territorio conquistato visivamente.
- Deferred: decisione D5 pending (diegetic vs HUD), ~6-9h. Post-D5 + campaign definition update.
- Trigger revive: D5 risolta + campaign definition aggiornata per supportare `hex_revealed` array.

## What was buried

Pattern estratto da `indie-design-perfetto.md §5`. Loop Hero: mondo come foglio di carta quadrettato grigio che si popola di tile colorati man mano che il player costruisce. Il grigio iniziale crea attesa — il player vuole riempirlo. Visual emergence: il mondo bello non esiste all'inizio, il player lo costruisce.

Per Evo-Tactics: il briefing panel ha un mini-map hex 5×5 in alto a destra. Dopo ogni scenario completato, 1-3 hex si "illuminano" (colore bioma dell'area). Hex statici (non interattivi) — solo visual feedback del progress. Dopo 5 scenari, mini-map mostra territorio controllato riconoscibile.

**Prerequisiti già live**: `campaign advance` endpoint, `biomeSpawnBias.js` (sa quale bioma), scenario YAML ha `biome_id`. Manca: `hex_revealed` array in campaign state + mini-map HTML/CSS component.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.4.2`: "Decisione D5 pending (diegetic vs HUD), ~6-9h". La questione non è tecnica — è design policy: la mini-map deve essere diegetica (item in-world come "mappa del territorio") o HUD overlay? Le due implementazioni divergono in modo significativo.

## Why it might still matter

P2 Evoluzione (🟢 candidato): la mini-map che si popola è il feedback visivo più immediato dell'"evoluzione" della campagna. Player vede cosa ha conquistato — crea momentum emotivo. P5 Co-op: territorio condiviso visibile crea senso di proprietà collettiva della campagna.

## Concrete reuse paths

1. **Minimal (~4h, P2)**: `campaign advance` popola `hex_revealed[]` array nel campaign state. Nessun rendering ancora.
2. **Moderate (~6h, P1)**: HTML/CSS mini-map hex 5×5 nel briefing panel. Static read-only. 5 bioma colors da palette art ADR-2026-04-18.
3. **Full (~9h, P0 post-D5)**: versione diegetica (item "mappa tattica" nel briefing come oggetto) con reveal animato post-scenario, biome color dal YAML, cross-ref con Loop Hero visual emergence effect (fill animation da grigio a colore).

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-design-perfetto.md §5](../../../docs/research/2026-04-27-indie-design-perfetto.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.4.2](../../../docs/reports/2026-04-27-indie-research-classification.md)
- ADR palette: [docs/adr/ADR-2026-04-18-art-direction.md](../../../docs/adr/ADR-2026-04-18-art-direction.md)

## Risks / open questions

- NON rendere la mini-map interattiva nella prima implementazione (scope creep). Solo visual read-only. Interattività (selezione scenario da mappa) è feature M15+ separata.
- Decisione D5 (diegetic vs HUD) NON auto-decidere. Impatta significativamente l'implementazione. Diegetica = più effort + più impact, HUD overlay = più rapido + meno impact.
- Verificare palette bioma prima di implementare — colori bioma non sono definiti esplicitamente in YAML corrente. `grep -n "color:" data/core/biomes.yaml` — se assente → aggiungere campo colore per ~40 biomi prima del rendering.
