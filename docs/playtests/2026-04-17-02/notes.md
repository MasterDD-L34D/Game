# Note — Second Documented Session

**Data**: 2026-04-17 (session 2, post-M1 fixes)
**Formato**: tabletop testuale guidato (agent DM, Master player)
**Durata**: ~25 min
**Outcome**: **WIN PG round 2** (wipe Sistema 3→0)
**Seed d20**: 2027
**Scenario**: enc_tutorial_02 (Pattuglia Asimmetrica)

---

## 1. Cosa funzionava

- **Doppio attack con AP 3**: scout ha usato 3 AP come budget flessibile (move 2 + atk 1 first turn, ability 2 + atk 1 second turn). Fluido, nessun blocco da regola.
- **Utility AI aggressive differenziabile**: e_hunter ha doppiato attack p_tank (miss + hit) mentre nomad legacy ha fatto move + 1 atk. Comportamento **visibile**.
- **Taunt funziona narrativamente**: forcing e_hunter su p_tank ha creato dilemma tattico (hunter ignora scout in range, va su bersaglio designato).
- **Ability manual resolve DM-driven**: Master capisce "dash_strike = move+atk+move" + "shield_bash = atk+sbilanciato" senza aprire doc. Narrativamente chiaro.
- **Encounter 2v3 più bilanciato** di #1 (2v2): Sistema ha dato 3 dmg p_tank (vs 3 dmg in #1 distribuito male), più pressure percepita.
- **Nat 20 crit su 2° attack** (MoS 10): momento drammatico, finisce hunter corazzato.

## 2. Cosa era confuso in <30 secondi

- **Ability ap_cost non visibile**: Master ha assunto taunt=1 AP, shield_bash=2 AP. Nessuna verifica during-play. Serve `/api/jobs/vanguard` lookup veloce (endpoint esiste post #1496 ma non integrato in playtest flow).
- **Range ability**: dash_strike dichiara "compound" ma non specifica reach totale (scout da [2,1] non raggiunge nomad_2 [3,4] via dash, ha dovuto rinunciare all'intento "ability su nomad_2").
- **Sbilanciato status miss**: shield_bash miss non applica sbilanciato (on-hit only). Intuizione Master = "ability ≠ attack, status dovrebbe triggerare comunque". Design need: chiarire ability-effect semantics (always-on vs on-hit).
- **Utility AI hunter decision making**: hunter ha picka target p_tank via taunt forced. Senza taunt, avrebbe scelto p_tank (closer) o p_scout (lower HP)? Non chiaro quale criterio Utility AI applica (score weights opachi).

## 3. Cosa hai tagliato mentalmente durante la partita

- **Ability di rank R2**: solo R1 considerate. R2 abilities (più potenti, cost_pi) skippate.
- **Trait effects**: pelle_elastomera, zampe_a_molla presenti ma non invocati (no proc meccanico).
- **PT economy / combo meter / Surge**: tutto skipped.
- **Initiative reale via jobs.yaml** (skirmisher 15, vanguard 10): usato order dichiarato invece.
- **Status bleeding / fracture**: nessun trigger.
- **Reazione parata**: guardia=1 presente ma non invocata quando hunter hit p_tank.
- **Facing / backstab**: facing="W" dichiarato, mai usato per bonus.

---

## Insight prioritari

1. **Utility AI aggressive VISIBILE**: hunter double-attack vs legacy single-attack = differenza leggibile. Pilastro 5 upgrade 🟡→🟢 candidate.
2. **Ability workflow manual OK per tabletop, ma pessimo per live**: Master ha assunto cost AP. Una UI con ability cost visibile + AP counter real-time è essenziale quando ability executor (#1499) + frontend convergono.
3. **FRICTION #6 positioning ability**: dash_strike reach range limitato + scout start position possono creare "ability inerti" (target troppo distante). Design need: ability range explicit, O possibilità di combinare move + ability in same turn.
4. **Bilanciamento 2v3 funziona ma serve nomadi più cattivi**: nomadi hanno sparato miss su p_tank (roll 4). Con hit rate 33% baseline, 3v2 può essere fragile anche su primo round.

## Decisioni operative

- [ ] Spec `ability on-hit vs always-on` per shield_bash → probabilmente "atk roll → on-hit status" canonico
- [ ] `GET /api/jobs/:id` integrato in tool playtest (Master lookup ability durante turno)
- [ ] Nuovo playtest **con ability executor live** (#1499+) invece di manual DM
- [ ] FRICTION #7 logged: ability effect miss semantics
- [ ] Prossimo playtest: tutorial 03 (hazard + bleeding) per testare status ora visibile

## Dati quantitativi

- Turni giocati: **2 round**
- Attacchi totali: **9** (5 PG, 4 SIS)
- Hit ratio PG: **4/5 = 80%**
- Hit ratio SIS: **1/4 = 25%** (-8% vs #1)
- Crit: **1** (scout nat 20)
- HP persi PG: **3/22** (13%)
- HP persi SIS: **12/12** (100%, wipe)
- Ability usate: **2** (dash_strike, shield_bash, entrambe miss ma valore posizionale)
- Taunt applicato: **1** (forcing hunter su p_tank)
- Volte fermato regole: **2** (ability cost, sbilanciato miss semantics)
- Friction nuove: **#5** (AP vincola post-move) · **#6** (positioning ability reach) · **#7** (ability effect miss)

---

## Ancoraggio ai pilastri (post-partita)

- **Pilastro 1 — Tattica leggibile**: 🟢 upgrade da #1 🟡 (canonica AP funziona, ability readable)
- **Pilastro 2 — Evoluzione emergente**: ⚪ (non testato, no mating/gene_slots attivi)
- **Pilastro 3 — Identità Specie × Job**: 🟢 upgrade da #1 🟡 (dash_strike + shield_bash + taunt differenziano chiaramente scout/tank)
- **Pilastro 4 — Temperamenti MBTI/Ennea**: ⚪ (non testato)
- **Pilastro 5 — Co-op vs Sistema**: 🟢 upgrade da #1 🟡 (Utility AI hunter "si è fatto sentire" con double-attack)
- **Pilastro 6 — Fairness**: 🟡 stabile (encounter 2v3 migliore di 2v2, ma wipe ancora netto — 22 HP PG vs 12 HP SIS)

**Net**: 3 pilastri migliorati (P1, P3, P5). Nessuno peggiorato. Validation positiva delle fix post-M1.

---

## FRICTION log (aggiornato)

```
FRICTION #1-#4 (playtest #1): vedi docs/playtests/2026-04-17/notes.md

FRICTION #5 (T1 scout): AP vincola "N attacks" dopo move.
  Trigger: Master chiede 2 attack dopo avvicinamento.
  Realtà: move 2-cell = 2 AP, resta 1 AP = 1 attack.
  Design: by-design, accept. Educare via tutorial.

FRICTION #6 (T2 scout): positioning ability reach.
  Trigger: dash_strike su nomad_2 [3,4] da scout [2,1] non fattibile
    (reposition 1-cell insufficiente).
  Design need: ability range explicit; O permessa chain move+ability.

FRICTION #7 (T2 tank): ability effect miss semantics.
  Trigger: shield_bash miss → sbilanciato NON applicato.
  Intuizione Master: "ability paga AP, status dovrebbe triggerare comunque".
  Design need: chiarire ability-effect semantics (always-on vs on-hit).
  Default attuale: on-hit (conservativo).
```

---

## Cross-reference

- Playtest #1: `docs/playtests/2026-04-17/notes.md`
- PR #1491 AP budget (FRICTION #2+#3 resolution): cdc26cd3
- PR #1496 ability discovery (FRICTION #4): 03f672f9
- PR #1499-#1501 ability executor LIVE: usabile in playtest #3
- SoT §15 level design + `enc_tutorial_02.yaml` baseline

---

_Compilato 2026-04-17 (session 2) · agent DM + Master player · partita tabletop guidato, non setup fisico._
