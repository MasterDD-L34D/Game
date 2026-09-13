# 🏔️ Pillar Status Dashboard

> **Regola**: se uno stato è 🔴 da più di **14 giorni**, apri issue.
> **Update cadence**: ogni lunedì manuale. Caveman hook può ricordare.
> **Trigger re-assessment**: dopo ogni playtest (vedi `docs/qa/playtests/`).

---

## Ultima revisione: 2026-04-17 (post-playtest M1)

Legenda: 🟢 regge · 🟡 dubbi · 🔴 problema · ⚪ non testato

---

## Tabella stato

| #   | Pilastro                | Stato | Ultima modifica | Cartelle primarie                                                                                                                                                                                    | Prossimo micro-passo                                                                                              |
| --- | ----------------------- | :---: | :-------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Tattica leggibile (FFT) |  🟡   |   2026-04-17    | `apps/backend/services/combat/`, `apps/backend/routes/session.js`, `docs/hubs/combat.md` (Python `services/rules/` rimosso ADR-2026-04-19; runtime = Node)                                           | Chiudere FRICTION #1-#2 dal playtest (sintassi mosse + AP count ambiguo)                                          |
| 2   | Evoluzione emergente    |  🟡   |   2026-04-16    | `data/core/mating.yaml`, `docs/core/27-MATING_NIDO.md`, `services/generation/`                                                                                                                       | Integrare mating/gene_slots in playtest encounter (non testato al primo playtest)                                 |
| 3   | Identità Specie × Job   |  🟡   |   2026-04-17    | `data/core/jobs.yaml`, `packs/evo_tactics_pack/data/species/`, `apps/backend/services/traitEffects.js`                                                                                               | FRICTION #4: spec job abilities (es. Skirmisher hit-and-run) costo/trigger                                        |
| 4   | Temperamenti MBTI/Ennea |  🟡   |   2026-04-16    | `apps/backend/services/vcScoring.js`, `apps/backend/services/enneaEffects.js`, `docs/architecture/ai-policy-engine.md`                                                                               | Attivare VC tracking nel prossimo playtest (erano disattivati)                                                    |
| 5   | Co-op vs Sistema        |  🟡   |   2026-04-17    | `apps/backend/services/ai/`, `apps/backend/services/roundOrchestrator.js`, `docs/adr/ADR-2026-04-17-utility-ai-default-activation.md`                                                                | Sistema troppo debole in playtest: buff HP/DC o aumentare pressure tier. Utility AI opt-in aggressive → estendere |
| 6   | Fairness                |  🟡   |   2026-04-17    | `apps/backend/services/combat/resistanceEngine.js`, `apps/backend/services/fairnessCap.js`, `data/core/difficulty.yaml` (Python `services/rules/resolver.py` rimosso ADR-2026-04-19; runtime = Node) | Wipe 20→3 HP = asimmetria rotta. Bilanciare primo encounter prima di M4                                           |

---

## Contesto ultimo playtest

**2026-04-17** — First Documented Session (tabletop guidato, seed 2026)

- Setup: 8×8 savana, 2 Predone Nomade vs Echo Wing + Dune Stalker, job Skirmisher
- Outcome: **WIN PG round 3** (wipe Sistema, HP PG persi 3/20)
- 4 friction logged (vedi `docs/qa/playtests/2026-04-17/notes.md`)
- Pilastri testati: 1, 3, 5, 6 (2 e 4 non attivi in questa sessione)

## Insight aggregati dal playtest

1. **P1 Tattica**: core d20+MoS funziona, ma syntax mosse + AP ambigui → downgrade 🟢→🟡
2. **P3 Identità**: specie differenziate per stats, job totalmente ignorato (Skirmisher) → 🟡
3. **P5 Co-op**: Sistema non si è "fatto sentire", AI troppo passiva → 🟡
4. **P6 Fairness**: d20 trasparente ✅ ma encounter sbilanciato → 🟡
5. **P2 Evoluzione** + **P4 Temperamenti**: non osservabili (feature disattivate) → 🟡 default cautelativo

## Trending

Prima del playtest (CLAUDE.md §sprint-context): P1/P2/P3/P5 🟢, P4/P6 🟡.
Dopo il playtest: **tutti 🟡**. Non è regressione reale: è revisione onesta basata su gioco vero.

**Red flag futuro**: se P1 resta 🟡 per >14 giorni senza action su FRICTION #1-#2, apri issue.

---

## Azioni per prossimo lunedì

- [ ] Rileggere `docs/qa/playtests/2026-04-17/notes.md` friction log
- [ ] Decidere: risolvere FRICTION #1 (sintassi mosse) o FRICTION #2 (AP count) prima?
- [ ] Schedulare playtest #2 (stesso setup + 1 regola aggiuntiva per isolamento)
- [ ] Se dopo 14 gg nessun pilastro scende a 🔴, vittoria tattica settimanale

---

_File vivo. Aggiornare dopo ogni playtest o modifica rilevante ai pilastri._

---

## Aggiornamento 2026-05-29 -- ERMES runtime bridge FASE 2 (PR fase2b)

Plumbing del bridge ERMES (ADR-2026-05-29) shipped + reso **dimostrabile**, ma NON
ancora player-perceivable in combattimento. Nessun upgrade di stato pilastro.

- **P2 Evoluzione emergente** (resta 🟡): il bridge legge eco_pressure per bioma e
  applica delta DISCRETI bucketed (low -1 / med 0 / high +1) a attack/defense.
  Config pilota tunato per esercitare low+med+high (rovine LOW, cryosteppe HIGH).
  MA `applyErmesBiomeTraitCosts` non ha ancora caller nel loop di combattimento,
  quindi la reazione bioma NON e' percepibile in-game. Combat wiring = FASE 3.
- **P6 Fairness** (resta 🟡): output DISCRETO con cap +/-2 (mirror ADR-21c), max 3
  bucket attivi per unit -> niente stat-drift continuo (anti-ref Creatures). Cap
  testato; diventa rilevante per P6 quando il bridge sara' combat-wired.
- Calibration WR N=40 DEFERITA a FASE 3 (oggi il bridge e' inerte nel combat loop;
  rationale + before/after in `docs/playtest/2026-05-29-br12-ermes-band-tuning.md`).

Ref: PR fase2b (BR-03/04/08/09/11/12 + wiring test ermes prima orfani in CI).
