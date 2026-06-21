---
title: 'Scope -- wiring producer 4 trait interocettivi sensienza (Gate-5 closure)'
date: 2026-06-21
sprint: sentience-traits-wiring
doc_status: active
doc_owner: claude-code
workstream: backend
last_verified: '2026-06-21'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Scope -- wiring producer trait interocettivi sensienza (OD-024)

## TL;DR

- **Gap (Gate-5 "engine LIVE, producer DEAD")**: i 4 trait interocettivi RFC v0.1
  (`propriocezione`, `equilibrio_vestibolare`, `nocicezione`, `termocezione`)
  ESISTONO in `data/core/traits/active_effects.yaml` e SPARANO end-to-end nel
  trait engine (provato da `tests/api/interoception-traits-runtime.test.js`),
  ma NESSUN producer li assegna a un'unita' -> non compaiono mai in gioco reale.
- **Meccanismo scelto = (a) tier-based grant** (riusa il sentience tier gia'
  wirato): un'unita' la cui specie ha `sentience_index >= T1` riceve il set
  gateway. Nessun blocker trovato vs alternative (b)/(c) -- vedi sez. 2.
- **Costruito (parte meccanica, flag-OFF band-neutral)**: helper
  `applySentienceInteroceptionGrant`, wire in `coopOrchestrator.submitCharacter`,
  piu' i test. Default OFF dietro flag `SENTIENCE_INTEROCEPTION_GRANT_ENABLED`
  -> ship senza gate di calibrazione N=40.
- **Design-gated (master-dd, NON deciso qui)**: quali specie/tier, quale subset
  di trait, magnitudini effetto, se costruire gli hook stamina/encumbrance/timing
  o tenere gli effetti T1 semplificati, flip del flag. Lista in sez. 6.

## 1. Il gap (ground-truth 2026-06-21)

I 4 trait interocettivi sono definiti in `active_effects.yaml` (~riga 10487,
commento `OD-024 ai-station`) con effetti strutturati:

| trait                    | applies_to                | effect                |
| ------------------------ | ------------------------- | --------------------- |
| `propriocezione`         | actor                     | `attack_bonus` +1 dmg |
| `equilibrio_vestibolare` | target (on hit)           | `damage_reduction` -1 |
| `nocicezione`            | actor (requires `ferito`) | `extra_damage` +1     |
| `termocezione`           | target (on hit)           | `damage_reduction` -1 |

Wiring engine CONFERMATO:

- `apps/backend/services/traitEffects.js` `evaluateAttackTraits` gestisce tutti
  e 3 i kind (`attack_bonus` / `extra_damage` / `damage_reduction`).
- `loadActiveTraitRegistry()` carica la mappa COMPLETA dei trait
  (`apps/backend/routes/session.js:284`) -> i 4 id risolvono nel combat reale.
- `tests/api/interoception-traits-runtime.test.js` (13 assert) prova il firing.

**Causa del gap** (2 livelli):

1. **Producer assente**: `grep` dei 4 id su `data/core/species/` = 0 hit; non
   sono nemmeno tra i 16 grant innata delle Forme
   (`data/core/forms/mbti_forms.yaml` `innata_trait_id`). Nessuna creatura li
   porta fuori dagli harness test/sim.
2. **Solo gateway T1 costruito**: i `description_it` citano hook piu' ricchi
   (`-1 stack fatica sprint` folded in stamina engine, `penalita carico` folded
   in encumbrance engine, `ritardi quando Ferito` folded in action timing). Quei
   motori NON esistono -> gli hook sono stub. Gli effetti T1 attuali (+1/-1)
   sono la base RFC sez.5 MVP. Costruire gli hook = scelta design (sez. 6).

Per contrasto (gia' fatto, NON toccato): il **tier** `sentience_index` (T0-T6)
e' pienamente wirato -- `vcScoring.js` `_resolveSentienceTiers` lo legge da
`species_catalog.json` (75 specie popolate: 1 T0, 42 T1, 16 T2, 8 T3, 5 T4, 3 T5)
come 4o layer psicologico. Il tier funziona; solo i TRAIT interocettivi mancano
del producer.

## 2. Scelta del meccanismo producer

### (a) Tier-based grant -- SCELTO

Un'unita' la cui specie ha `sentience_index >= T1` riceve il set gateway.

**Pro**:

- Riusa l'infrastruttura sentience GIA' wirata (`_loadSpeciesCatalog` +
  `sentience_index`), unica fonte canonica. Zero nuovi campi specie, zero
  hand-edit di file derivati (vincolo canon-enforcement rispettato).
- Coerente con la semantica RFC: l'interocezione e' una proprieta' della
  sensienza; T1 = "gateway sentience" (RFC sez.5 MVP). Mappa 1:1 il concetto.
- Reversibile e flag-able a costo zero (lookup read-only).

**Contro / mitigati**:

- Grant uniforme dei 4 a tutti i T1+ -> molte unita' ricevono boost combat.
  Mitigato: **flag-OFF default** -> band-neutral finche' master-dd non flippa
  dopo N=40. La granularita' (subset per tier) e' un design-call (sez. 6).

**Blocker check**: nessuno. Il tier e' gia' SoT-backed, letto da disco con
cache, con fallback T1 documentato. Niente migrazione, niente schema, niente
forbidden-path.

### (b) Assegnazione esplicita per-specie -- scartato come default

Aggiungere un campo (es. `interoception_traits`) per specie in
`species_catalog.json`. **Scartato**: violerebbe il vincolo "mai hand-editare
file derivati" (catalog e' generato); richiederebbe estendere la pipeline di
generazione (forbidden-ish, piu' lento). E' la naturale evoluzione SE master-dd
vuole controllo fine per-specie -- ma allora va fatto via pipeline, non a mano.
Tenuto come opzione design (sez. 6, decisione D2).

### (c) Grant via ecotype / Forma -- scartato come default

Mappare i trait alle 16 Forme (come l'innata) o agli ecotype. **Scartato**: la
Forma e' un asse psicologico (MBTI), l'interocezione e' sensoriale/biologica ->
accoppiamento semanticamente sbagliato. L'ecotype e' ambientale, non sensoriale.
Meno coerente di (a). Resta possibile come layer additivo futuro.

## 3. Cosa e' stato COSTRUITO (parte meccanica, questa PR)

Tutto flag-OFF default -> band-neutral -> merge-abile senza gate N=40.

1. **Producer** `apps/backend/services/sentience/sentienceInteroceptionGrant.js`:
   - `applySentienceInteroceptionGrant(spec, opts)` -- puro, ritorna nuovo
     oggetto quando concede, altrimenti l'input invariato. Mirror di
     `formInnataTrait.js applyInnataTraitGrant`.
   - Flag gate `SENTIENCE_INTEROCEPTION_GRANT_ENABLED` (default OFF).
   - Fail-closed: `species_id` assente / sconosciuta / tier < T1 -> nessun grant.
   - No-dup: non duplica trait gia' presenti.
   - **Id validati contro la registry caricata** (yaml = SoT): se un id sparisce
     da `active_effects.yaml`, il producer smette di concederlo. NESSUN valore
     effetto hardcoded nel resolver (vincolo canon rispettato).
   - Riusa `loadActiveTraitRegistry` (validazione id) + `_loadSpeciesCatalog`
     (lookup tier) -- nessuna duplicazione di loader.
2. **Wire** in `coopOrchestrator.submitCharacter`, appeso dopo il grant innata
   (stesso pattern try/catch non-bloccante). Copre sia la route REST
   (`routes/coop.js`) sia WS (`wsSession.js`) perche' entrambe passano da
   `submitCharacter`.
3. **Test**:
   - `tests/api/sentience-interoception-grant.test.js` (17 assert): flag gate,
     tier gating (T0 no / T1+ si), fail-closed, no-dup, immutabilita',
     validazione id vs yaml, catalog reale, **firing end-to-end** attraverso
     `evaluateAttackTraits` (prova Gate-5: producer -> traits[] -> engine spara).
   - `tests/api/coopSentienceGrant.test.js` (2 assert): wire reale su
     `submitCharacter`, flag ON concede / OFF no.

### Riusabilita'

L'helper opera su un qualsiasi oggetto spec/unit con `species_id` + `traits[]`.
Lo stesso helper puo' essere applicato a roster nemici / unita' sistema quando
master-dd decide il perimetro (decisione D3, sez. 6). Questa PR wira solo il
path player-character (mirror innata).

## 4. Meccanico vs design-gated (separazione)

| Aspetto                                  | Tipo          | Stato                           |
| ---------------------------------------- | ------------- | ------------------------------- |
| Producer helper + flag + test            | meccanico     | FATTO (questa PR)               |
| Wire su `submitCharacter`                | meccanico     | FATTO                           |
| Quale tier qualifica (default T1)        | design        | proposto T1, master-dd ratifica |
| Quale subset di trait per tier           | design        | default = 4, master-dd decide   |
| Magnitudini effetto (+1/-1)              | balance       | invariate (T1 RFC), master-dd   |
| Hook stamina/encumbrance/timing          | design+build  | NON costruiti (stub), master-dd |
| Grant a nemici/sistema (non solo player) | design        | NON wirato, master-dd           |
| Flip del flag (ON in prod)               | balance+owner | gated N=40 + master-dd          |

## 5. Flip readiness

Il flag NON va flippato in questa PR. Pre-requisiti per `ON`:

1. master-dd ratifica perimetro (quali specie/tier, quale subset) -- decisioni
   D1-D4 sez. 6.
2. Calibrazione **N=40** (il grant sposta win-rate: +1 attack / -1 danno su
   molte unita') -> via harness G2 per-template, single-owner, banda verificata.
3. Flip = `export SENTIENCE_INTEROCEPTION_GRANT_ENABLED=true` in
   `~/.config/api-keys/keys.env` + restart task (mani owner, reversibile).
   Mirror del pattern `LETHAL_MISSIONS_ENABLED` / `PRESSURE_TIER_FLOOR_ENABLED`.

Finche' OFF: zero impatto su combat/sim (band-neutral), nessun gate per il merge.

## 6. Lista decisioni master-dd (NON decise qui)

- **D1 -- Tier che qualifica**. Default proposto: `T1` (gateway RFC sez.5). Opzioni:
  (i) T1+ (tutte le sensienti) [default]; (ii) soglia piu' alta (es. solo T2+);
  (iii) gating progressivo (vedi D2). _Decisione: soglia minima._
- **D2 -- Interocezione progressiva per tier**. Tutti i T1+ ricevono i 4, oppure
  i tier alti ricevono un set piu' ricco (es. T1 = propriocezione+vestibolare;
  T3+ = tutti e 4 + hook). Richiede tabella tier->subset (verrebbe parametrizzata
  via `opts.minTier` / nuova mappa, NON hardcoded). _Decisione: mappatura
  tier->trait._
- **D3 -- Perimetro unita'**. Solo player-character (questa PR) o anche
  nemici/sistema via roster/encounter build. Estendere ai nemici sposta la banda
  in modo bidirezionale -> da calibrare separatamente. _Decisione: a chi si
  applica il grant._
- **D4 -- Per-specie esplicito vs tier-uniforme**. Se serve controllo fine
  per-specie, costruirlo via pipeline di generazione (campo `interoception_traits`
  in input data, NON hand-edit del catalog). _Decisione: granularita' + se vale
  l'investimento pipeline._
- **D5 -- Magnitudini effetto**. Gli effetti attuali sono i T1 RFC semplificati
  (+1/-1). Restano cosi' o si ritarano? Qualsiasi cambio = SOLO in
  `active_effects.yaml`. _Decisione: balance dei valori._
- **D6 -- Hook stub (stamina / encumbrance / action-timing)**. Costruire i 3
  motori citati nei `description_it` o tenere gli effetti T1 semplificati. Ognuno
  e' un sotto-progetto (nuovo engine + dati + test). _Decisione: build vs keep
  simplified, e priorita'._
- **D7 -- Flip del flag**. Quando portare `SENTIENCE_INTEROCEPTION_GRANT_ENABLED`
  a ON, dopo N=40 + ratifica D1-D3. _Decisione: go/no-go flip._

## Refs

- `docs/guide/README_SENTIENCE.md` (source_of_truth, tier canon).
- `docs/governance/open-decisions/OD-024-031-verdict-record.md` (OD-024).
- `data/core/traits/active_effects.yaml` ~riga 10487 (le 4 definizioni).
- `apps/backend/services/traitEffects.js` (`evaluateAttackTraits`,
  `loadActiveTraitRegistry`).
- `apps/backend/services/vcScoring.js` (`_resolveSentienceTiers`,
  `_loadSpeciesCatalog`).
- `apps/backend/services/forms/formInnataTrait.js` (pattern producer mirror).
- `tests/api/interoception-traits-runtime.test.js` (firing engine pre-esistente).
