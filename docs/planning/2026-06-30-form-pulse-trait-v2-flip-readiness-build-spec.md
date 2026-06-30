---
title: 'Form-Pulse trait v2 -- flip-readiness build-spec (grilling 2026-06-30, master-dd ratified)'
date: 2026-06-30
sprint: aa01-impronta-reconciliation
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-30'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [evo-tactics, form-pulse, aa01-impronta, trait, flip-readiness, grilling, build-spec]
---

# Form-Pulse trait v2 -- flip-readiness build-spec

> **Cosa e'**: il record canonico delle decisioni prese via `/grilling` (2026-06-30,
> ramo-per-ramo, ogni verdetto ratificato da master-dd con AskUserQuestion) sul percorso
> di flip di `FORM_PULSE_TRAIT_V2_ENABLED`. **Zero codice scritto** in quella sessione --
> solo grilling del piano. Questo doc serve a far partire la prossima sessione dai verdetti
> invece di ri-derivarli.
>
> **Headline**: il flip NON e' "un singolo deploy step" (come diceva
> [`2026-06-24-form-pulse-trait-v2-coverage-handoff.md`](2026-06-24-form-pulse-trait-v2-coverage-handoff.md)).
> Il grilling lo ha trasformato in un **build multi-item gated su un upgrade del sim-harness**.
>
> **Provenance / worktree caveat**: scritto nel worktree `claude/elegant-curran-356621`
> (HEAD `53c3f815`, 06-29) che e' DIETRO main. Il grant imprint D6 (`imprintTraitGrant` +
> flag `IMPRINT_TRAIT_GRANT_ENABLED` + fallback `fromPulses || imprint`) e' su **main**
> (#3083 `b57319ad`, 06-30) e NON in questo checkout. La prossima sessione deve branchare da
> main aggiornato.

## 0. Stato di partenza (ground-truth verificato durante il grilling)

- Form-Pulse trait v2 = **BUILT, flag-OFF** (#2992) + coverage matrix RATIFICATA (#3016) +
  evidence N=200 = **~1.21 power-equiv/creatura** (CI95 1.14..1.29,
  [`2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md`](2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md)).
- Offset enemy-HP = **1.4** (calibrato savana-only, #3017 +
  [`2026-06-24-aa01-form-pulse-trait-v2-encounter-offset.md`](2026-06-24-aa01-form-pulse-trait-v2-encounter-offset.md)).
- Il branco trait emergence e' **GIA' LIVE flag-independent** dal ADR-2026-06-08 (threshold
  0.30; `_applyBrancoTraitEmergence` chiamato unconditional su allReady,
  `apps/backend/services/coop/coopOrchestrator.js:842`). Il flag v2 aggiunge solo
  threshold->0 + i minor per-player (`_applyPlayerMinorTraits`, `:881`, gate `:870`).
- Random-fill timeout = **gia' built** (`autoFillFormPulses`, `:909` -> `rollRandomFormAxes`
  - `auto:true` frozen + re-emergence).
- Phase machine co-op: `lobby -> onboarding -> character_creation -> world_setup -> combat
-> debrief`. Form-pulse = fase UI-only transiente tra char_creation e world_setup
  (`submitFormPulse :807`). Imprint = side-collection host-opened NON-fase al seam
  lobby->char_creation (`openImprint :1622`), output documentato = hint bioma cosmetico.

## 1. Verdetti del grilling (ratificati master-dd 2026-06-30)

| #   | Branch               | Verdetto                                                                                                                                                      | Tipo            |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | Filosofia potere     | **Net-neutral within-band** -- i trait = layer identita'/varieta', NON potere; tieni l'offset                                                                 | design RATIFIED |
| 2   | Robustezza offset    | **Blocca: l'offset deve scalare** (vedi branch 4: scala sul buff reale, non flat ne' solo n_players)                                                          | build gate      |
| 3   | Stacking / two-beat  | **Blocca: ri-esamina il modello two-beat** (un solo produttore trait, non due flag intrecciati)                                                               | design RATIFIED |
| 3b  | Forma unificazione   | **U3** -- tieni entrambe le UI (imprint + form-pulse), centralizza il produttore                                                                              | design RATIFIED |
| 3c  | Precedenza           | **P-c** -- combina nell'aggregato: entrambi i segnali contano (UNA emergence sull'input combinato)                                                            | design RATIFIED |
| 3d  | Scope combine        | **D-2** -- union con TUTTI e 4 gli assi imprint (whole-imprint-matters)                                                                                       | design RATIFIED |
| 3e  | Trait_id delle celle | **Defer sotto liveness-audit HARD-gate** -- i pick si risolvono al build contro l'engine reale                                                                | build gate      |
| 4   | Solo                 | **A** -- solo resta baseline; l'offset gate-a sul buff EFFETTIVO (solo -> 0 buff -> offset 1.0). Chiude il bug solo-piu'-duro + assorbe branch 2              | design RATIFIED |
| 5   | Anti-deadlock        | **B** -- random-fill (come spec/as-built); timing provvisori env-tunable; RNG seam DI + roll frozen-persisted                                                 | design RATIFIED |
| 6   | Re-derivation        | **Gia' implementato** (swap idempotente, `_applyPlayerMinorTraits`) -- nessuna decisione                                                                      | non-issue       |
| 7   | Flip evidence gate   | **B** -- blocca su sim-harness upgrade (AI-player objective-aware/positioning) -> N=40 cross-biome REALE come gate; niente flip su evidenza passive-AI debole | build gate      |

## 2. Findings ground-truth corretti dal grilling

1. **Il conflitto cross-plan si dissolve.** Lo spec form-pulse (sez.0) diceva "D6
   superseded", il close-out diceva "D6 built #3083". Verita': #3083 e' un **fallback**
   (`next = fromPulses || (flag ? imprint : null)`), NON un secondo canale -> nessun
   double-count; ~1.21/creatura resta valido. Il branch 3 NON nasce da un double-count ma
   dai due flag intrecciati sullo stesso slot branco.
2. **Bug solo (concreto).** In solo, form-pulse e' no-op (`routes/campaign.js:274` "SOLO
   no-op: getFormPulses finds no coop orch"). Ma l'offset 1.4 in `routes/session.js /start`
   e' gated SOLO dal flag, non dal grant effettivo -> flag-ON + solo = nemici +40% HP con
   zero buff player = **solo strettamente piu' duro**. Fix in W1.
3. **Branch 6 non e' aperto.** Lo spec sez.7 #4 lista "re-derivation su re-submit" come
   open-call, ma `_applyPlayerMinorTraits` (`:881-901`) fa gia' lo swap idempotente.
4. **Liveness-audit e' load-bearing (lezione #3083).** I pick spec-DRAFT per locomotion
   erano engine-INERT (`traitEffects.passesBasicTriggers:308` gate su
   `action_type==='attack'`; passive/min_mos/melee_attack falliscono). Shippa-inerte = N=40
   passa falsamente (no-op = ~0 delta). Vale per tutti gli 8 pick imprint (W3).

## 3. Work-items da costruire (W1-W6)

> Tutto flag-gated / band-neutral finche' non flippa. Nessuno scritto ancora.

### W1 -- offset-rework (piccolo; chiude branch 2 + 4)

- Cambia `formPulseV2EnemyHpOffset(env)` (`apps/backend/services/combat/biomeModifiers.js`)
  da costante flat a **funzione del buff trait effettivamente concesso** al team in quella
  sessione (somma power-equiv dei branco+minor realmente applicati). Solo (0 trait) -> 1.0
  = no-op safe. Co-op -> offset = potere reale -> net-neutral a ogni player-count.
- Resta foldato nel passo enemy-HP esistente in `routes/session.js /start` (un solo
  `applyEnemyHpMultiplier`, idempotente per-unit). Env override resta
  (`FORM_PULSE_V2_ENEMY_HP_OFFSET`) come knob di re-tune.
- Test: estendi `tests/services/combat/formPulseV2EnemyHpOffset.test.js` (solo->1.0;
  buff-scaling 2p/3p/4p; enemy-only; idempotente).

### W2 -- produttore unificato `brancoTraitProducer` (design-heavy)

- Nuovo modulo puro che fa **argmax pesato** sull'unione:
  `{5 assi form-pulse continui |avg|}` ∪ `{4 assi imprint binari, pesati w}`.
  Il vincitore dell'argmax decide quale mapping (form-pulse o imprint) fornisce l'UNICO
  branco trait. Niente proiezione tra assi (gli assi imprint hanno il loro mapping, sez. W3).
- **Rimpiazza** il fallback inline `fromPulses || imprint` di #3083 (su main) e centralizza
  in un solo posto la produzione del branco trait (precedenza esplicita = P-c combinata).
- Single-slot garantito (UN branco trait) -> nessun power-stack -> l'offset W1 resta valido.
- **`w`** = peso del segnale binario imprint nell'argmax = **knob N=40** (target: imprint
  vince ~30-40% delle emergence; troppo alto -> imprint domina come binario |v|=1 schiaccia
  le medie continue; troppo basso -> vestigiale).
- Mirror della disciplina `brancoTraitEmergence` (puro, no-mutate, tie-break deterministico,
  TDD). Riusa `aggregateFormPulses` / `emergeBrancoTraitFromPulses` di
  `services/identity/brancoTraitEmergence.js`.

### W3 -- mapping imprint 8-celle + liveness-audit HARD-gate

- Mappa completa 4 assi x 2 poli (locomotion/offense/defense/senses).
- **HARD-gate**: ogni pick deve passare un liveness-audit engine-reale (trigger
  `action_type==='attack'` live; test non-no-op che asserisce delta != 0) PRIMA del wire.
- Riusa i 2 pick **locomotion gia' LIVE-auditati** (#3083): VELOCE ->
  `coda_stabilizzatrice_vortex`, SILENZIOSA -> `cartilagini_flessoacustiche`.
- I 6 pick restanti (offense/defense/senses) dello spec D6 vanno **ri-auditati** (i loro
  proposal non sono mai stati verificati). 2 celle senza trait ovvio = **balance-pick
  master-dd** al momento dell'audit: `offense/RAPIDA` (candidato `artiglio_cinetico_a_urto`,
  da verificare) + `defense/FLESSIBILE` (nessun trait evasione pulito oggi = TBD).
- Ref: D6 spec sez.4
  [`2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md`](2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md).

### W4 -- flag-unification

- Collassa i due flag intrecciati (`FORM_PULSE_TRAIT_V2_ENABLED` +
  `IMPRINT_TRAIT_GRANT_ENABLED`) nel gating del produttore unico (W2). Un modello di flag
  coerente: l'offset (W1) e il branco-combinato girano sotto la stessa logica -> elimina il
  flag-coupling che ha innescato il branch 3 (offset che rideva solo del flag form-pulse).

### W5 -- sim-harness upgrade (LONG POLE, prerequisito del flip)

- AI-player **objective-aware / positioning** che vinca gli scenari non-elimination
  (capture/escort/escape/survival) e non saturi su hardcore. Oggi la passive
  closest-attack AI non li vince (12/14 encounter senza segnale,
  encounter-offset doc sez.4) -> impossibile validare cross-biome via sim.
- Sblocca l'N=40 cross-biome REALE (branch 7). E' un progetto a se' (settimane).

### W6 -- N=40 cross-biome + ratifica -> flip

- Con W1+W2+W3+W5 in piedi: run N=40 cross-biome (offset buff-scalato + produttore
  combinato + peso `w`) -> **ratifica** offset value(s) + `w` + i pick imprint (SDMG,
  master-dd) -> POI flip.
- Flip = `FORM_PULSE_TRAIT_V2_ENABLED=true` (+ flag unificato W4) in keys.env + restart =
  **mani operatore Ryzen** (`C:/Users/VGit/Desktop/Game`,
  `Game-Godot-v2/docs/godot-v2/qa/2026-06-23-prod-flag-flip-readiness.md`). Reversibile
  (OFF = byte-identical).

## 4. Critical path / sequencing

```
W1 (offset-rework, piccolo) ----------------------------\
W5 (sim-harness upgrade, LONG POLE) --------------------\
W2 (produttore unificato) + W3 (mapping+audit) ---------> W6 (N=40 cross-biome + ratifica) -> W4 flag-unif -> FLIP (Ryzen)
```

- W5 e (W2+W3) in parallelo = i due rami piu' lunghi.
- W1 piccolo, in qualsiasi momento (chiude anche il bug solo, valore safety immediato).
- W4 si chiude insieme a W2 (stesso punto del codice).
- W6 dipende da W1+W2+W3+W5 tutti pronti.

## 5. Residui N=40 / audit-gated (PROPOSED finche' non ratificati)

- Peso `w` (W2) -- N=40.
- Offset value(s) buff-scalati (W1) -- N=40 cross-biome.
- 6 pick imprint da ri-auditare + 2 celle balance-pick (W3) -- liveness-audit + master-dd.
- Timing random-fill (warn ~45000ms / grace +30000ms / incremento per-player) -- provvisori
  env-tunable, re-tune da playtest (branch 5).
- Flip prod = master-dd + operatore Ryzen (W6).

## 6. Cross-reference

- Spec madre: [`2026-06-23-aa01-form-pulse-player-trait-spec-draft.md`](2026-06-23-aa01-form-pulse-player-trait-spec-draft.md)
- N=40 ratify: [`2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md`](2026-06-23-aa01-form-pulse-trait-v2-n40-ratify.md)
- Encounter-offset: [`2026-06-24-aa01-form-pulse-trait-v2-encounter-offset.md`](2026-06-24-aa01-form-pulse-trait-v2-encounter-offset.md)
- Coverage handoff (la fonte del "single deploy step" superato): [`2026-06-24-form-pulse-trait-v2-coverage-handoff.md`](2026-06-24-form-pulse-trait-v2-coverage-handoff.md)
- Imprint D6 spec: [`2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md`](2026-06-23-aa01-imprint-axis-trait-grant-spec-draft.md)
- aa01 deferred-tracker (SoT): [`2026-06-22-aa01-deferred-tracker.md`](2026-06-22-aa01-deferred-tracker.md)
- PR: #2992 (build) / #3016 (coverage) / #3017 (combat A/B) / #3083 `b57319ad` (D6 imprint grant, su main)
- Memory: `form-pulse-v2-session-close-2026-06-23`, `project_aa01_impronta_reconciliation`, `trait-engine-live-surface`

## 7. Disposition

Decisioni di design RATIFICATE (sez.1). Build NON iniziato. Prossima sessione: branca da main
aggiornato (questo worktree e' dietro -- manca #3083), poi esegui W1-W6 nel sequencing sez.4,
ogni pezzo flag-gated finche' W6 non ratifica e l'operatore Ryzen non flippa.

> **Governance**: doc nuovo in `docs/` -> registrare in `docs/governance/docs_registry.json`
> (atomico, stessa PR) prima del commit/CI. Non ancora committato.
