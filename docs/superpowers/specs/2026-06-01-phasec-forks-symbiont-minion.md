---
title: 'PHASEC forks — symbiont bond (B4) + minion runtime (B5) [gated]'
workstream: combat
category: spec
doc_status: draft
doc_owner: claude-code
last_verified: '2026-06-01'
language: it
tags: [phasec, jobs-expansion, combat, symbiont, minion, bond, fork, gated, co-op]
---

# PHASEC forks — symbiont bond (B4) + minion runtime (B5)

> I 2 fork residui dopo le slice no-fork (1-4 + 4b). **Entrambi GATED** — il task
> richiede `spec → verdict master-dd → impl` (B4) e `spec + OQ-MINION` con build
> deferred salvo greenlight esplicito (B5). Questo doc **affina** lo scoping di
> [#2506](https://github.com/MasterDD-L34D/Game/pull/2506) §5/§6 con un modello di
> stato concreto (symbiont) + risposte raccomandate alle OQ, così che il verdict
> master-dd sia build-ready. NON costruisce nulla; NON tocca `data/`/codice.

## 0. Stato (ground-truth #2506, `origin/main`)

- `symbiotic_bond` esegue oggi come `shield` con `shield_amount: 0` = **no-op**.
  Nessuno stato di pairing né redirect.
- `summon_companion` esegue come `buff hp_max +5` su **se stesso** (`target: self`) —
  **non spawna** alcuna entità. Nessun tipo-unità minion.
- Template riusabile (B4): `bondReactionTrigger.js` documenta `shield_ally`
  ("bonded ally absorbs floor(damage/2)", "identical math to intercept reroute",
  hook "performAttack post damage step, AFTER intercept reroute check"). **DISTINTO**
  dai job-bond: la sua sorgente dati è `data/core/companion/creature_bonds.yaml`
  (companion/species-pair, AncientBeast Beast-Bond). Il symbiont riusa la _math/hook_,
  non i dati.
- Slice 1 (`#2522`) ha già il seam difensivo `computePerkDefenseBonus(defender,{units,round})`
  — riusabile per `bonded_proximity_defense`.

---

## B4 — Symbiont bond-redirect (8 tag Cat C/D/G) [GATED OQ-BOND]

### B4.1 — Tag in scope

| Tag                        | Perk                  | Effetto                                                  |
| -------------------------- | --------------------- | -------------------------------------------------------- |
| `bond_redirect_strong`     | sy_r1_strong_bond     | redirect 50% → 60%                                       |
| `dual_bond`                | sy_r2_dual_link       | 2 bonded (secondario @ 25% redirect)                     |
| `bonded_proximity_defense` | sy_r2_resonance       | +1 def/alleato adiacente al bonded (max 3) [usa slice 1] |
| `aura...` già fatto        | —                     | (aura_defense_2tile shippato slice 1)                    |
| `emergency_full_redirect`  | sy_r4_emergency_swap  | bonded HP≤30% → redirect 100% 1T, cooldown 5             |
| `chain_heal_adjacent`      | sy_r4_chain_heal      | shared_vitality cura anche adiacenti al bonded (50%)     |
| `bonded_death_grace`       | sy_r5_sacrifice_grace | bonded muore → symbiont heal 50% + rage 3T               |
| `shared_hp_pool`           | sy_r6_one_soul (caps) | pool HP condiviso (il più invasivo)                      |
| `bond_no_distance_limit`   | sy_r6_eternal_link    | bond senza adiacenza dopo trigger                        |

### B4.2 — Modello di stato proposto (build-ready, pending verdict)

1. **Pairing**: `symbiotic_bond` (oggi shield no-op) imposta
   `actor._bond = { partner_id, redirect_pct: 0.5, secondary_partner_id: null, secondary_pct: 0 }`
   sul symbiont, e un puntatore inverso `partner._bonded_by = actor.id`. Persiste
   per l'encounter. `bond_redirect_strong` → `redirect_pct = 0.6`. `dual_bond` →
   abilita `secondary_partner_id` @ `secondary_pct: 0.25`.
2. **Intercept danno**: hook in `performAttack` **dopo il damage step, dopo
   l'intercept-reroute esistente** (lo stesso punto documentato da
   `bondReactionTrigger.shield_ally`). Quando il `target` ha `_bonded_by` e il
   symbiont è vivo: `redirect = floor(damageDealt * redirect_pct)`; sposta
   `redirect` HP dal target al symbiont (target restored, symbiont -redirect,
   `session.damage_taken` aggiornato per entrambi, `applySgEarn` sul symbiont).
3. **Seam difensivo (slice 1)**: `bonded_proximity_defense` → un `case` nel
   `computePerkDefenseBonus` esistente (conta alleati adiacenti al bonded, max 3).

### B4.3 — OQ-BOND (verdict master-dd — risposte _raccomandate_ Claude)

- **Pairing UX / co-op**: chi/come si bonda? _Racc._: bond all'_cast_ su 1 alleato
  adiacente (come dice il testo), persiste l'encounter, ri-castabile (sposta il
  bond). In co-op il link è visibile sul HUD del symbiont owner. **Verdict**:
  adiacenza-al-cast OK? ri-bond libero o 1/encounter?
- **Ordine vs intercept esistente**: il redirect symbiont **stacka** dopo
  l'intercept-reroute o lo sostituisce? _Racc._: stack DOPO (intercept prima, poi
  redirect sul danno residuo) — ma è un'interazione di sistema → **verdict**.
- **Symbiont KO durante redirect**: se il redirect porta il symbiont a HP≤0?
  _Racc._: il redirect è capped al HP del symbiont (non va sotto 0; il danno
  eccedente resta sul target). **Verdict**.
- **`dual_bond` somma redirect**: 60% primario + 25% secondario può superare 100%
  del danno? _Racc._: cap totale redirect a 100%; secondario applica sul danno
  residuo. **Verdict** (o i due bond sono su target diversi → no overlap).
- **`shared_hp_pool` (capstone, il più invasivo)**: due unità un pool → morte/KO
  come? _Racc._: trattare come **fase 2 separata** (tocca death/KO/party-wipe);
  shippare prima gli altri 7 tag, `shared_hp_pool` in un secondo PR dopo un verdict
  dedicato sulla semantica morte. **Verdict**: ship-in-fase-1 o defer?

### B4.4 — Build (post-verdict)

`spec → TDD → PR` per i 7 tag "redirect/heal/proximity" (riusa slice 1 +
intercept-hook), `shared_hp_pool` in PR separato (death/KO). Blast radius:
**alto** (core damage path). Band-verify obbligatorio (i symbiont non sono nei
band-scenari → probabile band-neutral, ma il redirect tocca il damage step →
verificare). Effort ~L (3-5 sessioni).

---

## B5 — Minion runtime (8 tag Cat E + capstone) [GATED OQ-MINION, DEFERRED]

> **DEFER esplicito** (task: "Solo spec + OQ-MINION verdict... salvo greenlight
> esplicito a costruire"). Peggior ROI (8 tag / ~5 sessioni = 1.6), blast radius
> molto alto, tocca **co-op P5** (rischio regressione). NON costruire senza
> greenlight master-dd.

### B5.1 — Tag bloccati (tutti sul minion runtime)

`minion_attack_buff`, `minion_proximity_dmg`, `encounter_start_buff_minions`,
`max_minions`, `pack_command_extended_range`, `minion_resurrect_chance`,
`alpha_pack_buff`, `minion_kill_pe_bonus` (co-req PE/XP — vedi spec economy A3).

### B5.2 — Perché è un nuovo tipo-unità (non un buff)

`summon_companion` oggi = `buff hp_max +5` su self. Per i tag serve: entità minion
spawnata, lifecycle (summon/cap/death/resurrect), ordini (`pack_command`), buff.
Tocca round-order, AI, spawn, death, grid occupancy, **co-op ownership**.

### B5.3 — OQ-MINION (verdict master-dd — risposte _raccomandate_ Claude)

- **`controlled_by`**: nuovo `'minion'` o `'player'` + `owner_id` = beastmaster?
  _Racc._: `controlled_by: 'player'` + `owner_id` (il campo esiste,
  `sessionHelpers.js:105`) → eredita la lose-condition del party senza un nuovo
  ramo "minion team". **Verdict**.
- **AI**: ordini scriptati o AI piena? _Racc._: scriptati minimi (move-to/attack
  nearest) + `pack_command` per l'ordine free/round; NO `declareSistemaIntents`
  pieno (riduce blast radius + non confonde la SIS-pressure). **Verdict**.
- **Death/party-wipe**: il minion conta verso il wipe? _Racc._: NO — è espendibile
  (coerente con `feral_sacrifice`); `minion_resurrect_chance` re-spawna a 1HP a fine
  round. **Verdict**.
- **Spawn tiles**: adiacente libero; se nessuno libero → summon fallisce con 400
  (no auto-place lontano). **Verdict**.
- **Initiative**: turno proprio nel round-order o agisce nel turno del BM? _Racc._:
  agisce nel turno del BM via `pack_command` (1 ordine free/round) → niente slot di
  initiative nuovo (meno impatto sul round orchestrator). **Verdict**.
- **Co-op ownership (rischio P5)**: nel flow Jackbox chi comanda i minion? _Racc._:
  il player owner del beastmaster; in assenza, il host. **Questo è il punto di
  rischio regressione → verdict + smoke co-op obbligatorio prima di ship.**

### B5.4 — Raccomandazione

**Restare deferred / post-MVP.** Se greenlight: spec dedicata + spike POC (1 minion,
no perk) prima dei 7 tag, co-op smoke gate (coop-phase-validator). `minion_kill_pe_bonus`
si sblocca col canale XP di economy-A3.

---

## Sequenza consigliata

1. **OQ-BOND verdict** → B4 fase 1 (7 tag) → B4 fase 2 (`shared_hp_pool`, verdict death).
2. **B5 resta deferred** salvo greenlight; allora OQ-MINION verdict → spike → tag.

Nessuno dei due è blocco per le slice no-fork già shippate.
