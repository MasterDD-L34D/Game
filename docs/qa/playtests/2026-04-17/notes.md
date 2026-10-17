# Note — First Documented Session

**Data**: 2026-04-17
**Formato**: tabletop testuale guidato (non fisico — Master da remoto, agent come DM + Sistema)
**Durata effettiva partita**: ~20 min
**Outcome**: WIN squadra PG (wipe Sistema round 3)
**Seed d20**: 2026 (deterministico)

---

## 1. Cosa funzionava

- **d20 + MoS** chiaro e leggibile. Calcolo `d20 + mod vs DC` immediato, zero ambiguità. MoS come "margine" intuitivo, crit a ≥10 soglia memorabile.
- **Grid 8×8 + Manhattan distance**: abbastanza spazio per planning, abbastanza piccolo per tenere 4 unità a mente.
- **Initiative fissa P1→S1→P2→E1**: elimina meta-gioco su iniziative variabili, flusso round prevedibile. Decisione attiva del giocatore è "dove muovo" non "quando agisco".
- **Bracket tattico** emerso naturalmente: P1 da sud + P2 da nord intorno a S1 = strategia "circondare" genuinely tattica, non giocata da regola forzata.
- **Crit drammatico**: P2 nat 20 su S1 con 1 HP ha generato momento memorabile. Crit su MoS ≥10 (non solo nat 20) raggiungibile con +mod alti → sensazione di skill reward.
- **Turno rapido** dopo il primo. 8 attacchi in 3 round = ritmo sostenuto.

## 2. Cosa era confuso in <30 secondi

- **Syntax mosse non canonica**. Chiedere "dove muovo P1" senza formato standard genera ambiguità (es. "2-5" = coord? distanza? range?). **Design need**: formato mossa canonico, tipo `P1: move [4,3] attack S1` o `P1 → N 1, atk S1`.
- **AP budget = quante azioni?** Setup dice "AP 2 = 1 move + 1 attack OR 2 move". Non copre "2 attack". Master istintivamente ha chiesto doppio attack al round 2 → regola mancante.
- **Attack range 2 vs range 1**: ricordarsi quale creatura ha quale range durante planning richiede lookup scheda. HUD future-need: icona distanza sotto unità.
- **Skirmisher job ability** ("hit-and-run"): costo AP? trigger? passivo? Non chiaro se attivo in questo playtest. **Ignorato**.
- **Orientamento griglia**: (x,y) con origin (0,0) basso-sx è convenzione matematica, ma "riga 3, colonna 5" (y,x) è più leggibile per ASCII. Inconsistenza potential tra render e input.

## 3. Cosa hai tagliato mentalmente durante la partita

- **Parata reattiva / PT economy**: skippato a setup. Primo playtest non regge complessità aggiuntiva.
- **MBTI/Ennea trigger** da telemetria: zero osservabile in 3 round.
- **Trait attivi**: creature "nude", trait non caricati. Non sentito il vuoto.
- **Cover / elevation**: griglia piatta. Non mancato perché 4 unità in 8×8 non giustificano profondità 3D.
- **Status effects** (panic/rage/stunned): zero proc in 3 round.
- **Fairness cap PT**: non osservabile senza PT economy.
- **Skirmisher hit-and-run**: ignorato nei fatti.
- **Flanking bonus**: bracket tattico fatto, ma nessun bonus numerico applicato.

---

## Insight prioritari

1. **Il core d20+MoS funziona**. Regole base non sono il problema — regole "facoltative" (PT, traits, statuses, job abilities) non integrate nel flusso danno friction ogni volta che emergono.
2. **Bilanciamento asimmetrico rotto**. 2 Predoni (HP 10 DC 12) vs 1 Dune Stalker (HP 12 DC 11) + 1 Echo Wing (HP 8 DC 13) = Sistema soccombe in 3 round con minimo danno PG. Serve o più unità Sistema, o buff HP/DC, o pressure AI (non agita come pressure tier).
3. **Doppio attack feedback**: Master lo ha chiesto intuitivamente perché matematicamente 2 AP → 2 azioni qualunque. Rule needs re-spec.
4. **AI Sistema legacy (REGOLA_001/002)**: S1 ha fatto lowest-HP pick corretto, ma E1 ha sprecato AP kite (ritorno home) senza design need. AI troppo passiva contro PG aggressive.

## Decisioni operative

- [ ] **Spec canonica AP**: decidere 1 vs 2 attack per turno → documentare in `docs/core/11-REGOLE_D20_TV.md` o equivalente
- [ ] **Format mossa canonico**: proporre syntax per input playtest (coord, cardinale, delta)
- [ ] **Bilanciamento primo encounter**: aggiungere 1 unità Sistema o buff HP per playtest 2
- [ ] **FRICTION #1-#4** → entry in `docs/planning/ideas/` per tracking design
- [ ] **Skirmisher ability integration**: spec esplicita o marca come "post-M4"
- [ ] **Prossimo playtest**: stesso setup + 1 regola aggiuntiva (es. parata reattiva) per isolare impatto

## Dati quantitativi

- Turni giocati: **3 round** (P1, S1, P2, E1 × 2 completi + metà round 3)
- Attacchi totali: **8** (5 PG, 3 SIS)
- Hit ratio PG: **4/5 = 80%**
- Hit ratio SIS: **1/3 = 33%**
- Crit: **2** (P1 MoS 11, P2 nat 20)
- HP persi PG: **3/20** (15%, solo P1)
- HP persi SIS: **20/20** (100%, wipe)
- Volte fermato per riguardare regole: **4** (sintassi mosse, AP count, Skirmisher ability, range check)
- Friction flags: **4**

---

## Ancoraggio ai pilastri (post-partita)

- **Pilastro 1 — Tattica leggibile**: 🟢 (d20, grid, bracket = tattica emersa naturale)
- **Pilastro 2 — Evoluzione emergente**: ⚪ (non testato — no trait, no mating)
- **Pilastro 3 — Identità Specie × Job**: 🟡 (specie differenziate per stats, job non sentito — Skirmisher ignorato)
- **Pilastro 4 — Temperamenti MBTI/Ennea**: ⚪ (non testato — no VC scoring, no status trigger)
- **Pilastro 5 — Co-op vs Sistema**: 🟡 (single-player, Sistema troppo debole — non si è "fatto sentire")
- **Pilastro 6 — Fairness**: 🟡 (wipe 20→3 HP = asimmetria rotta, ma d20 trasparente)

---

## Friction log completo

```
FRICTION #1 (T2 P1): sintassi mosse non standard.
  Trigger: Master scrive "2-5" per mossa, parsing ambiguo.
  Impact: stop flusso, chiarimento richiesto.
  Design need: formato canonico (coord/cardinale/delta).

FRICTION #2 (T2 S1): AP budget → azioni ambiguo.
  Trigger: S1 miss, AP residuo, cosa può fare?
  Impact: agent interpreta strict (1 attack/turno).
  Design need: spec esplicita "AP 2 = N attack max".
  ✅ RESOLVED 2026-04-17: doc canonico in docs/combat/action-types-guide.md
     §"AP budget per turno". Test tests/api/apBudget.test.js.

FRICTION #3 (T2 P2): Master richiede doppio attack, regola mancante.
  Trigger: "mossa P2 è doppio attacco".
  Impact: agent applica permissivo + flagga friction.
  Design need: 2 attack/turno = sì/no/condizionato?
  ✅ RESOLVED 2026-04-17: doppio attack VALID per design (1 AP + 1 AP = 2 AP).
     Codice già corretto (session.js:717+), mancava solo doc. Spec +
     test committati.

FRICTION #4 (T3 P1): job Skirmisher "hit-and-run" non integrato.
  Trigger: review job description post-partita.
  Impact: ignorato senza menzione.
  Design need: spec job abilities costo/trigger/cooldown.
```

---

_Compilato 2026-04-17 · draft agent + review Master · partita effettuata come tabletop testuale guidato, non setup fisico._
