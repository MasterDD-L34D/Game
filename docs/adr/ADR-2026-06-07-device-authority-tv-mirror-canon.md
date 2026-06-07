---
title: 'ADR 2026-06-07 -- Device-authority / TV-mirror canon + reconstruction-suite ratification'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-07'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/planning/2026-06-06-evo-tactics-reconstruction-suite-index.md'
  - 'docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md'
  - 'docs/design/evo-tactics-godot-device-authority-reconciliation.md'
  - 'docs/core/00-SOURCE-OF-TRUTH.md'
  - 'docs/core/90-FINAL-DESIGN-FREEZE.md'
  - 'docs/core/00-GDD_MASTER.md'
---

# ADR-2026-06-07 - Device-authority / TV-mirror canon (reconstruction-suite ratification)

**Stato**: ACCEPTED (Eduardo 2026-06-07)
**Trigger**: reconstruction suite Codex weekend 2026-06-05/06 + ratifica Eduardo (Gate 1).
**Scopo**: dare backing di record alle decisioni di design che Codex aveva scritto nei
doc freeze/SoT/GDD con sola fonte "ratificata in chat" (non tracciabile). Questo ADR
le formalizza come decisione canonica.

## Contesto

Tra 2026-06-05 e 06 Codex ha prodotto una reconstruction suite (8 doc) e ha aggiornato
i doc-autorita' (`00-SOURCE-OF-TRUTH.md`, `90-FINAL-DESIGN-FREEZE.md`, `00-GDD_MASTER.md`)
con un reframe di canon. Il reframe contraddice in parte il wording precedente del GDD
(es. "TV = schermo principale ... azioni"). Serviva ratifica esplicita perche' una
fonte "chat" non e' verificabile e i doc toccati sono freeze/SoT.

## Decisione -- punti canon ratificati

1. **TV = mirror, non input-authority.** TV / shared screen = tavolo condiviso, mirror,
   recap, regia, memoria comune. NON e' un player e NON e' autorita' di input. Tutte le
   scelte/draft/commit/voti/route/Nido/mating gameplay avvengono dai **device collegati**
   (telefono, browser, client personale). Il wording storico "host/TV drives" e'
   superato. Supersede: GDD "TV ... azioni".
2. **Prima esperienza = 3 livelli.** onboarding narrativo 60s (3 scelte identitarie) +
   Form Pulse (micro-input device per Forma, MBTI-like, world/custode bias) + tutorial
   giocato. Non piu' solo "tutorial giocato".
3. **Tri-Sorgente esteso a dottrina.** Lo scambio carte non e' gimmick isolato:
   appartiene a Tri-Sorgente allargato = reward + scelte narrative/dottrinali +
   sedimentazione decisioni (branco/Nido/campagna) + scambio/eco carte tra player.
4. **Custodi.** Skiv = template canonico concreto, non il concetto totale. I Custodi
   sono entita' persistenti/esportabili con memoria, resync, incontri e ritorno in
   campagna (riferimento: pawn di Dragon's Dogma, non care-sim obbligatorio).
5. **Combat = multi-round loop.** planning device -> preview non canonica -> commit
   device -> Sistema/AI commit -> event-log deterministico -> piano-sequenza TV via
   animation planner -> nuovo planning. L'event-log e' la verita'; l'animation planner
   TV non altera l'esito.
6. **Stato runtime.** Nido/recruit/mating, route-choice, Form Pulse, ERMES, ALIENA,
   Custodi/Skiv = `LIVE_PARTIAL` / `LIVE_GATED`, non "solo design".

## Authority / processo (Gate 2 -- guardrail)

Un code-agent (Codex/Jules) PUO' draftare edit su doc `source_of_truth:true` / freeze,
MA il PR relativo e' **sempre Eduardo-merge esplicito** (mai auto-merge ne' classifier).
Questo ADR e i canon-edit associati vanno in un PR Eduardo-merge dedicato.

## Conseguenze

- La roadmap SPEC-A..L e SPEC-K (device-authority reconciliation) hanno ora backing
  canonico ratificato.
- I doc della suite restano `review_needed` per la rifinitura prosa; questo ADR ratifica
  la DIREZIONE, non ogni dettaglio testuale.
- Il GDD/SoT/FREEZE vanno tenuti allineati a questi 6 punti (fix wording stale incluso,
  es. riferimenti a `services/rules/*` rimosso per ADR-2026-04-19).
