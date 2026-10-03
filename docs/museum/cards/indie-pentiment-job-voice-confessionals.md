---
title: Pentiment Job Voice + Confessionals — Character as Narrative Lens
museum_id: M-2026-04-27-026
type: research
domain: other
provenance:
  found_at: docs/research/2026-04-27-indie-narrative-gameplay.md §3 + docs/research/2026-04-27-indie-concept-rubabili.md §5
  source_game: 'Pentiment — Obsidian Entertainment (2022)'
  git_sha_first: unknown
  git_sha_last: unknown
  last_modified: 2026-04-27
  last_author: narrative-design-illuminator
  buried_reason: deferred
relevance_score: 3
reuse_path: apps/backend/services/narrative/narrativeRoutes.js job param + ink stitches per job
related_pillars: [P3, P4]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-27
last_verified: 2026-04-27
date_curated: 2026-04-27
domain_tag: P3
effort_estimate_h: 6
blast_radius_multiplier: low
trigger_for_revive: Writer commission o reduce scope a 3 job (invece di 7)
related:
  - docs/research/2026-04-27-indie-narrative-gameplay.md
  - docs/research/2026-04-27-indie-concept-rubabili.md
  - docs/reports/2026-04-27-indie-research-classification.md §C.3.2
  - apps/backend/services/narrative/narrativeRoutes.js
verified: false
---

# Pentiment Job Voice + Confessionals — Character as Narrative Lens

## Summary (30s)

- Il job del player character colora come il gioco comunica: Vanguard = imperativo diretto, Sniper = distanza analitica, Support = collaborativo. 7 job × 5 scenario = 35 ink stitches.
- Deferred: content bottleneck (35+ ink stitches per 7 job), writer required. Ridurre a 3 job scope per sbloccare.
- Trigger revive: writer commission O decision reduce scope a 3 job.

## What was buried

Pattern estratto da `indie-narrative-gameplay.md §3`. Pentiment: il job di Andreas colora la percezione di tutto (illustratore → metafore pittoriche). Il personaggio non è solo avatar — è filtro narrativo.

Per Evo-Tactics: briefing ink con varianti per job primary. Non solo tono — il contenuto dell'informazione varia:

- Vanguard: briefing su enemy frontline composition.
- Sniper: briefing su enemy positioning + range.
- Support: briefing su ally HP pool + expected damage.

**Prerequisiti già live**: `narrativeRoutes.js`, ink endpoint, `session.js /start` già riceve `job_primary`. Manca: job param passato a narrative endpoint + 35 ink stitches content.

## Why it was buried

Classificato MUSEUM in `indie-research-classification.md §C.3.2`: "35+ ink stitches per 7 job, content bottleneck". Dev è ~6h ma richiede writer per il content. Senza budget writer o decisione di ridurre a 3 job, non completabile.

## Why it might still matter

P3 Identità Specie×Job (🟢 candidato): il job visivamente esiste (abilità, progressione) ma non ha voce narrativa. Questo chiude il gap "job identity visibile → job identity sonora". P4 tone di voce come characterization. Cross-ref con `indie-design-perfetto.md §1` typography-as-faction: stesso principio, applicazione vocale.

## Concrete reuse paths

1. **Minimal (~2h, P2)**: `narrativeRoutes.js` riceve `job_primary` param. 1 knot per 3 job (Vanguard/Sniper/Support) con placeholder text. Dev-only smoke test.
2. **Moderate (~4h, P1)**: 3 job × 2 scenario briefing = 6 ink stitches writer-quality. Proof of concept per user review.
3. **Full (~6h, P0 post-writer)**: 7 job × 5 scenario = 35 ink stitches. Tono + contenuto informazione distinto per job. Integration test narrative endpoint.

## Sources / provenance trail

- Found at: [docs/research/2026-04-27-indie-narrative-gameplay.md §3](../../../docs/research/2026-04-27-indie-narrative-gameplay.md)
- Classification: [docs/reports/2026-04-27-indie-research-classification.md §C.3.2](../../../docs/reports/2026-04-27-indie-research-classification.md)
- Target: [apps/backend/services/narrative/narrativeRoutes.js](../../../apps/backend/services/narrative/narrativeRoutes.js)

## Risks / open questions

- NON tono troppo estremo (militaresco/poetico) — mantieni leggibilità tattica. Tono cambia, informazione critica rimane uguale.
- Cross-ref con Pentiment typography-as-faction (`indie-design-perfetto.md §1`) — stessa fonte, applicazione diversa (qui voce narrativa, lì visual code). Implementare insieme per ROI (6h voce + 3h tipografia = 9h totale vs 6+3 separati).
- Verificare che `session.js /start` response includa `job_primary` accessibile a `narrativeRoutes.js`. Se non esposto → aggiungere al `sessionState` object (1 campo additivo, bassa complessità).
