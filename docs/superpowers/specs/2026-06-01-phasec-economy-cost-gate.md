---
title: 'PHASEC economy follow-ups — combat cost gate (A2) + campaign-XP perk earn (A3)'
workstream: combat
category: spec
doc_status: draft
doc_owner: claude-code
last_verified: '2026-06-01'
language: it
tags: [phasec, jobs-expansion, combat, economy, cost-gate, campaign-xp, pe-canon]
---

# PHASEC economy follow-ups — combat cost gate (A2) + campaign-XP perk earn (A3)

> Due follow-up sollevati dalla chiusura PE-canon (`#2528`, verdict A). **A2 è
> GATED** (verdict master-dd sulla scala — NON deciso qui). **A3 è una decisione
> documentata reversibile** (defer, con wire-path preservato).
>
> Grounding economia: vault `Spaces/Dev/Evo-Tactics/core/26-ECONOMY_CANONICAL.md`
> (SoT). Token combat = **PT** (0-12, per-round), **PP** (0-3, per-encounter,
> "Ultimate = 3 PP consume all"), **SG** (0-3, per-encounter, Surge Burst). **PE**
> = XP campaign (mai combat). **PI** = build currency (5 PE = 1 PI).

## A2 — combat cost-scale gate [GATED master-dd]

### A2.1 — Problema

`#2528` ha rinominato l'aberrant `cost_pe` → `cost_sg` per chiudere la collisione
PE-XP, lasciando il costo **DECORATIVO** (un-gated) "coerente con gli altri
`cost_sg/cost_pt/cost_pp`". Ground-truth: **tutti** i `cost_sg/pt/pp` sono
decorativi — `executeAbility` (`abilityExecutor.js:1735`) gate **solo `cost_ap`**;
non controlla né deduce SG/PT/PP. Inoltre i valori sono su **scale incoerenti**
rispetto ai cap di pool del SoT.

### A2.2 — Census costi (ground-truth `8f1e1348`, jobs.yaml + jobs_expansion.yaml)

| Pool   | SoT cap           | Valori `cost_*` trovati                                                                                                                                                               | Coerente?                                         |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **PP** | **0-3** (max 3)   | blade_flurry 6, phantom_step 5, dervish 10, resonance 4, arcane_renewal 5, convergence 10, kill_shot 6, hunter_mark 5, headshot 12, deathmark 4, shadow_mark 5, shadow_assassinate 10 | ❌ **tutti > 3** → uncastabili se gated           |
| **SG** | **0-3** (max 3)   | cataclysm 75, arcane_lance 40, apocalypse_ray 100, synaptic_burst 2, aberrant_overdrive 3, stabilized_mutation 5, perfect_mutation 80                                                 | ❌ 5/7 > 3 (solo synaptic 2 + overdrive 3 stanno) |
| **PT** | **0-12** (max 12) | fortify 3, aegis 5, bulwark 8, sanctuary 4, chain 5, void 10, symbiotic_bloom 4, vital_drain 4, lifegrove 10, bond_amplify 4, unity_surge 8, feral_dominion 5, apex_pack 10           | ⚠️ stanno (≤12) ma vicini al cap                  |

**Diagnosi**: i `cost_*` sono stati scritti in "stile PI" (numeri grandi, come
`cost_pi` 4-22), NON calibrati ai pool combat reali. PP/SG (cap 3) sono i più rotti:
quasi ogni ultimate dichiara un costo che eccede il pool intero. Il SoT vuole pool
piccoli con ultimate "consume-all" (`PP: Ultimate = 3 PP consume all pool`).

### A2.3 — Design del gate (qualunque sia la scala scelta)

Mirror del gate `cost_ap` in `executeAbility`, prima del dispatch:

```
for (const pool of ['sg','pt','pp']) {
  const cost = Number(ability['cost_'+pool] || 0);
  if (cost > 0 && Number(actor[pool] || 0) < cost) return 400 { error, pool, cost, have };
}
// on 2xx success: deduct actor[pool] -= cost  (mirror del modello AP-inside-handler #2522)
```

**Stato pool (ground-truth `normaliseUnit`, `sessionHelpers.js`)**: solo `sg` è un
pool combat **seeded** (`:111`, via sgTracker); `pe` (`:115`) = XP campaign, `mp`
(`:129`) = mutazioni. **`pt`/`pp` NON sono campi pool persistiti** su `normaliseUnit`
(PT = roll per-round computato `:245`; PP compare solo ad-hoc in alcuni payload) —
corretto da Codex #2530 P2. → il gate su PT/PP richiede **PRIMA di seedare i pool**
(mirror `sg`) + definirne earn/reset (PP +1 crit / +1 kill; PT per-round cap 12, per
SoT) = **parte dello scope OQ-ECON, non solo la scala**. Per `sg` il gate è
meccanicamente piccolo (pool già esiste); per PT/PP va prima costruito il pool. Il
deduct va sul success path (come `cost_pe` slice-3 #2522, Codex P2: deduce solo
post-2xx). **Il blocco resta la SCALA + il pool-model PT/PP mancante**, non il
dispatch.

### A2.4 — OQ-ECON (verdict master-dd — NON deciso da Claude)

Il gate è impossibile finché i costi eccedono i pool. Opzioni di riconciliazione:

- **A — Rescale ai cap**: riscrivi tutti i `cost_pp` a 1-3, `cost_sg` a 1-3,
  `cost_pt` a 1-12. Grande edit dati + pass di balance. Massima fedeltà al "gate
  reale per-ability".
- **B — Semantica consume-all (per ultimate)**: per le ability con `cost_pp/sg >=
pool_max`, il gate diventa "richiede pool PIENO, consuma tutto" (fedele al SoT
  "Ultimate = 3 PP consume all"). Le rank-1/2 con costi piccoli (synaptic 2,
  overdrive 3) restano a gate numerico. Nessun re-scaling dei dati; cambia la
  _semantica_ del campo per i big-cost.
- **C — Hybrid**: rank ≤2 = gate numerico esatto (rescale solo questi a ≤pool);
  capstone/ultimate = consume-all (B). Probabilmente il più fedele al design
  (piccoli costi tattici + ultimate che "scarica" il pool).
- **D — Leave decorative**: i `cost_*` restano flavor, solo `cost_ap` gate. Status
  quo. Sconsigliata (i costi mentono al player).

> **Proposta Claude**: **C (hybrid)**. Allinea al SoT senza un balance-pass enorme:
> i tier bassi diventano gate-esatti (riscalando i pochi costi >pool), gli ultimate
> diventano consume-all. Ma **è una decisione di balance/design → verdict master-dd**
> (no-anticipated-judgment). Servono anche: curva earn SG/PP (oggi SG +1/5 taken +1/8
> dealt cap 3; PP +1 crit +1 kill cap 3) per validare che gli ultimate siano
> raggiungibili.

**Scope impl post-verdict**: il gate (A2.3) + l'edit dati `cost_*` secondo il
verdict + band-verify (questo TOCCA il balance: i player non potranno più spammare
ultimate gratis → WR shift reale, a differenza di slice 4b). `data/core/*.yaml` →
`validate-datasets` obbligatorio.

## A3 — campaign-XP perk earn (first_kill_pe_bonus / minion_kill_pe_bonus) [DEFER]

### A3.1 — Stato

Post-`#2528`, `PE` = XP campaign. I perk `first_kill_pe_bonus` (stalker
st_r3_first_blood, +1 PE su primo kill) e `minion_kill_pe_bonus` (beastmaster
bm_r5_apex_companion, +1 PE su minion-kill) guadagnano "PE". Slice-3 `#2522` li
aveva agganciati al combat-`unit.pe`; `#2528` ha tolto la scrittura combat di
`unit.pe` → oggi **entrambi UNWIRED** (zero ref in `apps/backend`). Per il SoT,
"PE su kill" = **XP campaign** (reward universale, nessun sink per-job — il residue
"dead resource stalker" era un misread del combat-PE, vedi `#2527`).

### A3.2 — Perché il wire pulito NON è banale

Il XP campaign è assegnato da `grantXpToSurvivors(survivors, amount, {campaignId})`
(`campaign.js:290`), con `amount` **uniforme** per ogni survivor (default 12 da
`xp_curve.mission_victory`). Per dare +1 al solo unit che ha fatto il primo kill
servono **due cose che non esistono**:

1. **Canale combat → campaign**: l'evento "unit X ha fatto il primo kill
   dell'encounter" deve viaggiare dalla session combat (endpoint separato) alla
   `campaign advance` (chiamata dal client con `survivors` + `pe_earned`). Nessun
   canale del genere oggi (il debrief non porta per-unit-first-kill).
2. **Grant XP per-unit differenziato**: `grantXpToSurvivors` dà `amount` uguale a
   tutti. Servirebbe un bonus-map per-unit (nuovo param).

`minion_kill_pe_bonus` è inoltre **double-blocked**: richiede il minion runtime
(slice 6, deferred) come sorgente-kill.

### A3.3 — Decisione: DEFER (reversibile)

Valore marginale (+1 XP su ~12 base, una volta per encounter) vs un mini-feature
cross-layer (canale first-kill + bonus XP per-unit in `grantXpToSurvivors`) +
`minion_kill_pe_bonus` comunque bloccato sul minion. **Defer** finché si tocca il
flusso reward campaign O si costruisce il minion (slice 6).

**Wire-path preservato** (per chi lo costruirà):

- Combat debrief espone `first_kill_actor_id` per encounter (chi ha fatto il 1° KO).
- `grantXpToSurvivors(units, amount, { perUnitBonus: { [unitId]: n } })` somma il
  bonus all'`amount` per quell'unit, leggendo `first_kill_pe_bonus`/`minion_kill_pe_bonus`
  dai `_perk_passives`.
- `minion_kill_pe_bonus` si sblocca con la kill-attribution dei minion (slice 6).

Reversibile: nessun codice scritto, solo defer documentato. Se master-dd vuole il
wire ora (anche marginale), è una spec separata di ~S effort.

## Next action

1. **OQ-ECON verdict** (A2.4 A/B/C/D) → spec impl `cost-gate` (gate + edit dati +
   band-verify). Tocca balance reale.
2. A3 resta deferred salvo richiesta esplicita; si sblocca con la slice 6 (minion) o
   un refactor del reward campaign.
