# 🏔️ Pillar Status Dashboard

> **Regola**: se uno stato è 🔴 da più di **14 giorni**, apri issue.
> **Update cadence**: ogni lunedì manuale. Caveman hook può ricordare.
> **Trigger re-assessment**: dopo ogni playtest (vedi `docs/playtests/`).

---

## Ultima revisione: 2026-04-17 (post-playtest M1)

Legenda: 🟢 regge · 🟡 dubbi · 🔴 problema · ⚪ non testato

---

## Tabella stato

| #   | Pilastro                | Stato | Ultima modifica | Cartelle primarie                                                                                                                     | Prossimo micro-passo                                                                                              |
| --- | ----------------------- | :---: | :-------------: | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Tattica leggibile (FFT) |  🟡   |   2026-04-17    | `services/rules/`, `apps/backend/routes/session.js`, `docs/hubs/combat.md`                                                            | Chiudere FRICTION #1-#2 dal playtest (sintassi mosse + AP count ambiguo)                                          |
| 2   | Evoluzione emergente    |  🟡   |   2026-04-16    | `data/core/mating.yaml`, `docs/core/27-MATING_NIDO.md`, `services/generation/`                                                        | Integrare mating/gene_slots in playtest encounter (non testato al primo playtest)                                 |
| 3   | Identità Specie × Job   |  🟡   |   2026-04-17    | `data/core/jobs.yaml`, `packs/evo_tactics_pack/data/species/`, `apps/backend/services/traitEffects.js`                                | FRICTION #4: spec job abilities (es. Skirmisher hit-and-run) costo/trigger                                        |
| 4   | Temperamenti MBTI/Ennea |  🟡   |   2026-04-16    | `apps/backend/services/vcScoring.js`, `apps/backend/services/enneaEffects.js`, `docs/architecture/ai-policy-engine.md`                | Attivare VC tracking nel prossimo playtest (erano disattivati)                                                    |
| 5   | Co-op vs Sistema        |  🟡   |   2026-04-17    | `apps/backend/services/ai/`, `apps/backend/services/roundOrchestrator.js`, `docs/adr/ADR-2026-04-17-utility-ai-default-activation.md` | Sistema troppo debole in playtest: buff HP/DC o aumentare pressure tier. Utility AI opt-in aggressive → estendere |
| 6   | Fairness                |  🟡   |   2026-04-17    | `services/rules/resolver.py`, `apps/backend/services/fairnessCap.js`, `data/core/difficulty.yaml`                                     | Wipe 20→3 HP = asimmetria rotta. Bilanciare primo encounter prima di M4                                           |

---

## Contesto ultimo playtest

**2026-04-17** — First Documented Session (tabletop guidato, seed 2026)

- Setup: 8×8 savana, 2 Predone Nomade vs Echo Wing + Dune Stalker, job Skirmisher
- Outcome: **WIN PG round 3** (wipe Sistema, HP PG persi 3/20)
- 4 friction logged (vedi `docs/playtests/2026-04-17/notes.md`)
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

- [ ] Rileggere `docs/playtests/2026-04-17/notes.md` friction log
- [ ] Decidere: risolvere FRICTION #1 (sintassi mosse) o FRICTION #2 (AP count) prima?
- [ ] Schedulare playtest #2 (stesso setup + 1 regola aggiuntiva per isolamento)
- [ ] Se dopo 14 gg nessun pilastro scende a 🔴, vittoria tattica settimanale

---

_File vivo. Aggiornare dopo ogni playtest o modifica rilevante ai pilastri._
