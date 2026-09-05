---
title: 'ADR-2026-07-10 — Sistema action symmetry: per-unit AP + retreat gate + telegraph threats-only'
status: proposed
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-07-10'
source_of_truth: true
language: it
review_cycle_days: 90
---

# ADR-2026-07-10 — Sistema action symmetry (per-unit AP, retreat gate, telegraph threats-only)

Status: **PROPOSED** (decider: master-dd; il MERGE di questo ADR e il flip dei flag sono
azioni owner distinte -- l'ADR ratifica la direzione, il flip resta manuale su keys.env)
Arco evidence: spec+piano #3249 | apLedger #3251 | flag #3254 | telegraph #3258 |
prerequisito #3253 | misure `docs/research/2026-07-10-sistema-symmetry-factorial.md` +
`docs/research/2026-07-10-sistema-cap-falsification.md`.

## TL;DR

Le creature del Sistema passano all'economia d'azione del party (budget AP per-creatura
alla dichiarazione, flag `SISTEMA_PER_UNIT_AP_ENABLED`), la ritirata utility rispetta la
soglia `retreat_hp_pct` gia' dichiarata nei profili (flag `SISTEMA_RETREAT_GATE_ENABLED`),
e il telegraph mostra solo minacce (flag `SISTEMA_TELEGRAPH_THREATS_ONLY`). Rationale
owner: il player recluta i nemici sconfitti (meta.js) -- una creatura che gioca con
un'economia diversa da nemica e' illeggibile come futura reclutata. Evidence: l'arm
gate+AP rompe il ceiling WR 1.0 (dorsale N=40: WR 0.925, CI95 [0.801, 0.974], prime
sconfitte del party mai misurate; conversione attack 4.6%->16.7%, ritirate 55.7%->0.7%).

## Contesto

1. Il gioco era FUORI dalla propria banda ratificata: `data/core/balance/damage_curves.yaml`
   (ADR-2026-04-20) standard = WR [0.35, 0.55]; misurato = 1.000 ovunque.
2. Tre negative-result convergenti (roster-scaling #3231; cap-falsification; fix
   stepTowards da solo) hanno mostrato che ne' il numero di attivazioni ne' il movimento
   erano il collo: era il COMPORTAMENTO (ritirate utility 55.7%) piu' l'economia
   (1 azione/unita' vs 2 AP del PG).
3. L'"Asymmetry invariant" citava una fonte inesistente nel repo
   (`reference_tactical_postmortems.md` A.2) e non era coperto da alcun ADR.

## Decisioni

### D1 -- Economia d'azione: simmetrica (SUPERA l'Asymmetry invariant su questo asse)

Ogni creatura Sistema dichiara fino al proprio budget (`ap_remaining ?? ap`), mirror del
PG: move+attack nello stesso round (slot-2 lookahead2-style: attack solo se in gittata e
LOS dalla posizione post-move). L'addebito a risoluzione e il refill per-round erano GIA'
per-unita': si e' chiuso solo il buco alla dichiarazione.
Le asimmetrie RESTANTI sono ratificate ESPLICITAMENTE come volute:

- `ignores_trait_costs: true` (i tratti del Sistema non consumano PT/AP del modello PG)
  -- gap di leggibilita' del recruit DICHIARATO, asse rivalutabile in un ADR futuro;
- `ignores_fog_of_war: true` (il Sistema vede il campo);
- `reinforcement_from_pressure` (i rinforzi restano governati da `sistema_pressure`).
  La nota in `ai_profiles.yaml` `sistema_resource_model.note` viene aggiornata per puntare
  a questo ADR (non piu' "do NOT refactor", che vietava senza fonte).

### D2 -- Retreat gate: la soglia dichiarata vale per TUTTI i cervelli

`utilityBrain` non puo' proporre `retreat` sopra `retreat_hp_pct` (per-profilo, fallback
config base) -- la stessa soglia che il path rule-based onora da sempre. Sotto soglia la
ritirata resta legale e vince quando lo scoring lo dice (threshold-sensitivity pinnata da
mutation test). Question aperta al decider (non blocca il flip, nessun encounter di misura
ha `persistent_high_threat`): il path legacy ALLARGA la soglia a 1.2x sotto M1
persistent-threat -- estendere il widening anche al gate (addendum spec sez. 4.3) o
tenere la soglia piatta? [x] widening 1.2x [ ] piatta
Decisione owner 2026-07-10 (in-session): widening 1.2x M1 esteso anche al gate --
coerenza col contratto legacy; il gate segue lo stesso profilo del path rule-based.

### D3 -- Telegraph: minacce, non passi (lettura plan-reveal RATIFICATA)

`SISTEMA_TELEGRAPH_THREATS_ONLY`: righe solo per attack su unita' player + ingressi in
`objective.target_zone` (objective zone-based); move/retreat ordinari si vedono sulla
board. Questo ADR ratifica la lettura di ADR-2026-04-18: il plan-reveal promette le
MINACCE prima della risoluzione, non ogni passo di ogni creatura.
`PRESSURE_TIER_INTENT_CAP` cambia mestiere: da tetto d'azione a tetto di PRESENTAZIONE
(attack prioritari nel taglio). `sistema_pressure` resta il dial dei rinforzi.

### D4 -- Contesto storico onorato

Il cap globale fu ALZATO il 2026-04-17 dopo playtest umano ("solo 1 SIS muove"):
l'asimmetria nacque da feedback reale. Questo ADR la sostituisce CON misura N=40 paired
(non contro quella storia): oggi "tutte le creature agiscono" e' realta' meccanica, non
piu' un tuning del tetto.

## Conseguenze

- **Al flip (owner, keys.env + restart)**: le bande pace flag-OFF di `15-LEVEL_DESIGN`
  vanno ri-ratificate sotto flag-ON (L-069; le misure arm-ON N=40 esistono gia' nel doc
  fattoriale come base); il termine xpBudget `action_economy` (`dial_cap_reference: 3`)
  va neutralizzato/ricalibrato (quel 3 modellava il cap che non gata piu'); il warn
  /start cambiera' di conseguenza.
- **WR verso banda [0.35, 0.55]**: il ceiling e' rotto (0.925), la distanza residua e'
  tuning di authoring/pressure/tier -- fasi successive, non altri flag.
- **Rollback**: flag OFF (default): il prod odierno e' gia' il rollback.

## Alternative considerate (e scartate con misura)

- Rimuovere solo il cap globale (uncapped): dWR 0.000, falsificata (#3246).
- Solo retreat gate: KO ~0, il Sistema avanza e muore prima (fattoriale, arm gate).
- Solo per-unit AP: dKO deboli, le azioni extra si sprecano senza il gate (arm ap).
- Sostituire utilityBrain con lookahead2: scartata dal decider (personalita' = pilastro).
- 2 AP senza gate ne' fix stepTowards: "castello immobile" (misura contaminata, doc
  fattoriale sez. 1).

## Addendum 2026-07-10 -- Contratto telegraph threats-only (pre-flip, Codex P2 PR #3258)

Con `SISTEMA_TELEGRAPH_THREATS_ONLY=true` il filtro non droppa piu' le righe
non-threat: ogni unita' SIS viva con intent pendente ha SEMPRE una riga in
`threat_preview`; intent non-threat o tagliato dal cap -> riga mascherata
`intent_type: "hidden"` (icon `?`, zero campi informativi: niente target,
tiles, expected_damage). Riga assente = solo "preview non disponibile"
(pre-declare / legacy flow), mai "intent filtrato".

Motivo: il consumer legacy (apps/play, archiviato ma di riferimento) tratta la
riga assente di un'unita' SIS viva come fallback attacco ("Intento: attacco" +
icona fist) -- il telegraph mentiva proprio nel caso che il flag vuole
nascondere. Il downgrade oltre-cap ricostruisce la riga da zero (mai mask di
una riga threat esistente: conservare expected_damage sarebbe leak).

Il frontend canonico Godot (Game-Godot-v2) oggi NON consuma `threat_preview`
backend: il port locale `ThreatPreview` non ha consumer surface (roadmap
deferred) ne' filtro threats-only. Quando verra' cablato deve rispettare questo
contratto (riga sempre presente, `hidden` renderizzato come intent sconosciuto,
pattern StS).

Stato: pre-condizione (1) del flip risolta. Impl: `threatPreview.js` +
`tests/ai/threatPreviewThreatsOnly.test.js`.
