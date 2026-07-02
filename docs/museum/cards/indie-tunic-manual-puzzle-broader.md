---
title: Tunic Broader Manual-as-Puzzle — Diegetic Knowledge System
museum_id: M-2026-04-27-031
type: research
domain: other
provenance:
  found_at: docs/research/2026-04-27-indie-concept-rubabili.md §3 + docs/research/2026-04-27-indie-design-perfetto.md §3
  source_game: 'Tunic — Andrew Shouldice / Finji (2022)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 2
reuse_path: apps/play/src/onboardingPanel.js Thought Cabinet extension + data/core/thoughts/ codex entry type
related_pillars: [P3, P4]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P4
effort_estimate_h: 10
blast_radius_multiplier: low
trigger_for_revive: Post-MVP UX iteration (broader diegetic UI rework confermato come priority)
related:
  - docs/research/2026-04-27-indie-concept-rubabili.md
  - docs/research/2026-04-27-indie-design-perfetto.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.4.1
  - apps/play/src/onboardingPanel.js
verified: false
---

# Tunic Broader Manual-as-Puzzle — Diegetic Knowledge System

## Summary (30s)

- Full diegetic knowledge system: ogni scenario ha codex entry sbloccabile via condizione gameplay. Thought Cabinet esteso come container "conoscenza tattica acquisita", non solo onboarding perk.
- Deferred: subset shipper (Tunic decipher Codex è ADOPT in B.3 ~5h). Questo è il broader scope — full diegetic UI rework. Post-MVP.
- Trigger revive: post-MVP UX iteration, broader diegetic UI confermato come priority.

## What was buried

Pattern estratto da `indie-concept-rubabili.md §3` + `indie-design-perfetto.md §3`. Tunic: manuale del gioco in lingua gliffica raccoglibile pagina per pagina. Player impara a giocare come da manuale straniero — ricercando pattern, deducendo regole. L'ignoranza è stato di gioco valido: non sapere crea curiosità, non frustrazione.

**NOTA**: subset di questo pattern (Tunic decipher Codex pages, ~5h) è già classificato ADOPT in `indie-research-classification.md §B.3` come `TKT-CROSS-TUNIC-DECIPHER-CODEX`. Questa card copre il **broader scope** — full diegetic UI rework, non il quick-win decipher.

Broader scope: ogni scenario ha `codex_entry` sbloccabile dopo condizione ("sopravvivi 5 turni sotto pressure 60+" → sblocca "Rapporto Sistema: comportamento sotto pressione"). Thought Cabinet come knowledge container (tattica/emotiva/conoscenza categories). Visual: scheda non-internalized con `filter: blur(2px)` su metà testo, scheda internalized con glifo categoria.

**Prerequisiti**: Thought Cabinet V1 (`onboardingPanel.js`), `campaign advance` endpoint, `narrativeRoutes.js`. Mancano: codex entry trigger in campaign advance + thought category YAML field + visual CSS blur.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.4.1`: "subset shipped (decipher Codex). Broader scope = full diegetic UI rework". Il broader scope richiede rework significativo del Thought Cabinet come sistema, non solo aggiungere pagine. Post-MVP perché richiede UX decision su oscurità (quanto "nascondimento" è accettabile per co-op?).

## Why it might still matter

P4 MBTI/cognizione come gameplay: la conoscenza tattica acquisita in-game è il pillar P4 più profondo. Non VC axes che si modificano — la cognizione del personaggio che cresce. P3: species lore come risorsa tattica invece di flavor text.

## Concrete reuse paths

1. **Minimal (~4h, P2)**: `thought_category` field in `data/core/thoughts/` YAML (tattica/emotiva/conoscenza). Nessuna UI change.
2. **Moderate (~7h, P1)**: CSS scheda thought con blur su non-internalized + glifo categoria Unicode. Visual distinction only, no mechanics.
3. **Full (~10h, P0 post-MVP)**: `codex_entry` trigger in `campaign advance` per 5-8 entries + campaign advance popola `thoughts_unlocked[]` + Thought Cabinet render entries distinte per type.

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-concept-rubabili.md §3](../../../docs/research/2026-04-27-indie-concept-rubabili.md)
- Found at: [docs/research/2026-04-27-indie-design-perfetto.md §3](../../../docs/research/2026-04-27-indie-design-perfetto.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.4.1](../../../docs/reports/2026-04-27-indie-research-classification.md)
- ADOPT subset reference: TKT-CROSS-TUNIC-DECIPHER-CODEX (§B.3, ~5h, pre-shipped subset)

## Risks / open questions

- NON copiare alfabeto glifico di Tunic (ore di decifrazione, single-player). In co-op con 4 persone in serata, oscurità totale è frustrante. Concetto = "scoperta progressiva", non oscurità ostruttiva.
- NON offuscare informazione critica tattica (HP, danger level). Blur si applica solo a thought "flavor" e "narrative".
- Verificare struttura `data/core/thoughts/` prima di aggiungere category field. `ls data/core/thoughts/` — se la directory non esiste → crearla come parte di Minimal path.
- Anti-duplication: il subset ADOPT (TKT-CROSS-TUNIC-DECIPHER-CODEX ~5h) copre il quick-win Codex decipher. Questa card copre solo il broader diegetic system oltre quello. Implementare ADOPT prima, poi decidere se serve broader scope.
