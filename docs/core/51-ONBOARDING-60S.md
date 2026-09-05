---
title: 'Onboarding narrativo 60s — 3 scelte identitarie pre-Act 0'
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-08'
source_of_truth: true
language: it
review_cycle_days: 180
related:
  - docs/core/02-PILASTRI.md
  - docs/core/40-ROADMAP.md
  - docs/adr/ADR-2026-04-21-campaign-save-persistence.md
  - docs/planning/2026-04-21-triage-exploration-notes.md
  - data/core/campaign/default_campaign_mvp.yaml
---

# Onboarding narrativo 60s — 3 scelte identitarie pre-Act 0

**Authority**: A3 canonical. Chiude **L05 P0 narrative arc framework** (audit 4-agent 2026-04-20).

**Trigger**: exploration-note deck v2 (2026-04-20) Nota 3 — "i primi 60 secondi non devono spiegare regole, devono far scegliere qualcosa di identitario".

**Re-verify 2026-06-06**: contenuto ancora canonico. `data/core/campaign/default_campaign_mvp.yaml` conserva `onboarding:`; `apps/backend/routes/campaign.js` espone `campaign_def.onboarding` e applica `initial_trait_choice` a `campaign.onboardingChoice` + `acquiredTraits[]`; `tests/api/campaignRoutes.test.js` copre default, option_b, option_c e fallback invalido. Il flow co-op/Godot in `apps/backend/services/coop/coopOrchestrator.js` ha una fase `onboarding`, ma il vecchio wording host-only va trattato come debito di riallineamento: la TV è mirror, gli input arrivano dai device.

**MA1 2026-06-08 (ADR-2026-06-08-onboarding-per-creature-trait, SUPERSEDE):** il modello canonico passa da "1 trait condiviso di branco" a **per-creatura** -- ogni player sceglie il trait della PROPRIA creatura -- + un **trait-branco emergente** dall'aggregato (Form Pulse). Data-model LIVE: `campaign.acquiredTraitsByCreature { creatureId: traitId }` (`campaign.js` accetta `initial_trait_choices`); `acquiredTraits[]` resta come union backward-compat (legacy single-choice = caso degenere). Tempi / 3-opzioni / auto-A invariati. Residuo: trait-branco emergente (Form Pulse aggregato) + wiring roster per-creatura.

## TL;DR

Prima di Act 0 (tutorial_01), ogni player compie **1 scelta identitaria** in 60 secondi. La scelta determina un trait iniziale **per-creatura** (+ trait-branco emergente) -- MA1, vedi nota sopra; il modello legacy = trait condiviso di branco (caso degenere). **Nessuna spiegazione regole in minute-0**. Regole introdotte nel tutorial_01 stesso (Act 0 chapter 1).

## Motivazione

Freeze §6 loop dice "onboarding sotto i 10 minuti" ma **non specifica cosa succede nei primi 60 secondi**. Audit 4-agent classifica "narrative arc framework" P0 blocking. Oggi tutorial_01 apre direttamente in match → zero affect emotivo, zero identità espressa dal player.

Nel primo minuto si costruisce la promessa narrativa:

- **Non** "come si gioca" (regole)
- **Sì** "chi sei" (identità)

Disco Elysium pattern: choice diegetic prima di ogni spiegazione meccanica.

## Flow canonical 60s

```
[00:00] Apri gioco → splash "Sopravvivi all'Apex"
[00:10] Briefing audio breve (2-3 frasi):
        "Il tuo branco è stato marcato.
         L'Apex ti troverà, ovunque andrai.
         Come vuoi che ti ricordino?"
[00:20] 3 scelte identitarie (30s max deliberazione):
        - OPZIONE A "Come veloce e sfuggente" → trait zampe_a_molla pre-slot
        - OPZIONE B "Come duro e inamovibile" → trait pelle_elastomera pre-slot
        - OPZIONE C "Come letale e preciso" → trait denti_seghettati pre-slot
[00:50] Transizione narrativa (10s): "Così sarà."
[01:00] Enter enc_tutorial_01 (Act 0 chapter 1)
```

### Timing strict

- **Briefing audio**: 10s max. 2-3 frasi sostanziali.
- **Deliberation window**: 30s max. Oltre, auto-select OPZIONE A (default "sfuggente" per tutorial gentle).
- **Transizione**: 10s singola riga narrativa.
- **Total budget**: 60s hard cap.

## Scelte identitarie canonical

| Opzione | Label player              | Trait assegnato    | Stat prevalente | Tier 1 species allineate                  |
| ------- | ------------------------- | ------------------ | --------------- | ----------------------------------------- |
| **A**   | "Come veloce e sfuggente" | `zampe_a_molla`    | mobilità +1     | dune_stalker, filatore_abisso             |
| **B**   | "Come duro e inamovibile" | `pelle_elastomera` | defense +1      | guardiano_caverna, cacciatore_corazzato   |
| **C**   | "Come letale e preciso"   | `denti_seghettati` | bleeding on-hit | apex_predatore (giovane), guardiano_pozza |

### Narrative text per opzione

**Opzione A** (zampe_a_molla):

> "Non saremo mai abbastanza forti. Dobbiamo essere **altrove** quando l'Apex arriva."

**Opzione B** (pelle_elastomera):

> "Ci guarderà in faccia, e noi resteremo. Questo è il branco che sopravvive."

**Opzione C** (denti_seghettati):

> "Non scappiamo e non ci nascondiamo. Mordiamo prima, e mordiamo **profondo**."

### Impact runtime

- Scelta salvata in `PartyRoster.acquired_traits[]` pre-session via `/api/campaign/start` body field `initial_trait_choice`
- Trait applicato a TUTTI i PG del roster (identità condivisa di branco, non singolo)
- Trait **permanent** per tutta la campagna (non respec MVP)

### Device/TV authority

- La TV/shared screen mostra briefing, timer, tally/recap e transizione narrativa: è tavolo/mirror, non controller.
- La scelta viene espressa dai device connessi. In single-player può coincidere con un solo device; in co-op serve una policy device-authority esplicita per conferma/quorum.
- Se il backend usa un host token per sicurezza o orchestrazione, quel token non equivale a "la TV decide".
- Per il branch co-op/Godot il codice storico `submitOnboardingChoice()` è ancora host-only: da considerare gap tecnico da riallineare prima di dichiarare completa la device UX.

## Integration con campaign YAML

Estensione schema `data/core/campaign/default_campaign_mvp.yaml`:

```yaml
campaign_id: default_campaign_mvp
name: "Sopravvivi all'Apex"

onboarding:
  schema_version: '1.0'
  timing_seconds: 60
  deliberation_timeout_seconds: 30
  default_choice_on_timeout: option_a

  briefing:
    duration_seconds: 10
    lines:
      - 'Il tuo branco è stato marcato.'
      - "L'Apex ti troverà, ovunque andrai."
      - 'Come vuoi che ti ricordino?'

  choices:
    - option_key: option_a
      label: 'Come veloce e sfuggente'
      trait_id: zampe_a_molla
      narrative: "Non saremo mai abbastanza forti. Dobbiamo essere altrove quando l'Apex arriva."
    - option_key: option_b
      label: 'Come duro e inamovibile'
      trait_id: pelle_elastomera
      narrative: 'Ci guarderà in faccia, e noi resteremo. Questo è il branco che sopravvive.'
    - option_key: option_c
      label: 'Come letale e preciso'
      trait_id: denti_seghettati
      narrative: 'Non scappiamo e non ci nascondiamo. Mordiamo prima, e mordiamo profondo.'

  transition:
    duration_seconds: 10
    line: 'Così sarà.'

  next_encounter: enc_tutorial_01 # Act 0 chapter 1


# ... acts continue as-is
```

Validation rules schema:

- `onboarding.choices.length === 3` (exactly 3 options P0 scope)
- Ogni `trait_id` referenced deve esistere in `data/core/traits/active_effects.yaml`
- `timing_seconds === 60` (canonical lock)
- `default_choice_on_timeout` deve essere una delle `choices.option_key`

## Scope creep guards

**NON fare nel MVP**:

1. **Lore/dialogue branching extra** al minute-0. Canonical = 1 choice binary-per-opzione, non DAG.
2. **Tutorial interattivo** in 60s. Freeze §6 tutorial ≤10min ≠ 60s onboarding. Regole spiegate solo in enc_tutorial_01 chapter 1.
3. **Voice-over elaborato / animazioni** pre-renderizzate. 3 card statiche + audio line 10s basta.
4. **Choice tracker in UI campaign panel** (M11+). MVP reveal solo in debrief finale.
5. **Respec post-choice**: trait permanent. Replay campaign = nuova scelta.

## UX reference

`docs/archive/concept-explorations/2026-04/Vertical Slice - 60s Onboarding.html` — mockup HTML concept exploration (non spec). Usare come ispirazione layout 3-card + timing animations, ma **non come contratto di design**.

## Impl roadmap

**Phase A (doc, questo PR)**: design doc + YAML extend + ADR. Zero code.

**Phase B (M11-adjacent)**: frontend choice picker UI in `apps/play/src/onboardingPanel.js` + backend `/api/campaign/start` accept `initial_trait_choice` field. Backend API verified shipped 2026-06-06; picker/device surface still needs audit.

**Phase C (post-M11 Jackbox)**: co-op sync device-authority — connected devices submit/confirm; TV mirrors state and final resolved choice. Deferred.

## Criteri successo

Post-playtest M11+ (quando Phase B ships):

- **80%+ player** completano onboarding in ≤60s (auto-select <20%)
- **Ricordo choice al debrief**: player cita opzione scelta quando chiesto "come hai giocato?"
- **No confusione regole** in chapter 1: nessun player dice "non sapevo che si facesse così" nei primi 3 turn

Fallimento criteri = re-design pre-flight, non ship degradato.

## Deliverable questo PR

1. `docs/core/51-ONBOARDING-60S.md` (QUESTO doc) — canonical
2. `data/core/campaign/default_campaign_mvp.yaml` — extend con `onboarding:` section
3. `docs/adr/ADR-2026-04-21b-onboarding-narrative-60s.md` — decision record
4. Close issue #1675

## Open questions (deferred Phase B)

- Audio briefing 10s: voce umana recorded o TTS generated?
- Choice card icons: custom SVG o reuse trait icons esistenti?
- Skip button per replay? Freeze-first: NO. Replay campaign = ripeti choice.
- Mobile UX resolved direction 2026-06-06: input sui device connessi, TV solo mirror/broadcast. Restano da specificare quorum, timeout e sostituzione scelta in co-op.

Questo è onboarding identità, non tutorial. Regole si spiegano dopo.

## Autori

- Master DD (choice direction 2026-04-21)
- Claude Opus 4.7 (spec draft)
- Concept exploration deck v2 §Nota 3 (inspiration)
