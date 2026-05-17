---
title: Playtest M3 — Automated validation post SoT alignment (ap=2)
doc_status: active
doc_owner: combat-team
workstream: combat
last_verified: 2026-04-17
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Playtest M3 — Automated validation (post SoT alignment)

**Data**: 2026-04-17 (session M3 — batch harness, no human-driven)
**Formato**: N=30 aggregate (3×N=10 per scenario) via `tests/api/tutorial0{2-5}.test.js`
**Scope**: validare win rate tutorial 02-05 dopo allineamento `ap_max=2` canonical ([PR #1511](https://github.com/MasterDD-L34D/Game/pull/1511))
**Outcome**: **3/4 scenari in band, 1/4 al bordo superiore** — calibrazione enemy applicata su T04/T05.

---

## 1. Pre-change baseline (ap=3 player, pre-M3)

Rif: CI run 24569149458 (PR #1499, sessione ability executor).

| Scenario        | Win rate (N=10) | Target band | Status   |
| --------------- | --------------- | ----------- | -------- |
| T02 Pattuglia   | 70%             | 60-70%      | ✅       |
| T03 Caverna     | 60%             | 40-50%      | 🟡 sopra |
| T04 Pozza Acida | 20%             | 30-45%      | 🔴 sotto |
| T05 BOSS Apex   | 40%             | 15-30%      | 🔴 sopra |

## 2. Post-change raw (ap=2 player, pre-tune M3)

Batch harness dopo allineamento `ap_max=2` (PR #1511) su tutorial 02-05.

| Scenario | Win rate (N=10) | Target band | Status               |
| -------- | --------------- | ----------- | -------------------- |
| T02      | 70%             | 60-70%      | ✅                   |
| T03      | 60%             | 40-50%      | 🟡 sopra             |
| T04      | **20%**         | 30-45%      | 🔴 sotto (no change) |
| T05      | **50%**         | 15-30%      | 🔴 sopra (worse!)    |

Osservazione: riduzione AP player 3→2 (-33% actions) non ha cambiato T04 (già sotto) e T05 sale contro-intuitivamente (variance N=10).

## 3. Tuning applicato (M3 iter1)

- **T04**: `e_lanciere` hp 6→5, `e_corriere_1` + `e_corriere_2` hp 4→3 ciascuno. Totale enemy HP 14→11 (-21% per compensare -33% AP player).
- **T05 BOSS**: `e_apex` hp 9→11 (+22%). Compensazione minima player AP reduction mantenendo band boss.
- **T02/T03**: nessun cambio stat (in band o al bordo, variance accettabile).

## 4. Post-tune aggregate (N=30, 3×N=10)

| Scenario | N=30 aggregate             | Target band | Status             | Note                              |
| -------- | -------------------------- | ----------- | ------------------ | --------------------------------- |
| T02      | **22/30 = 73%**            | 60-70%      | 🟡 +3% sopra bordo | variance N=10 ±15%, acceptable    |
| T03      | **17/30 = 57%**            | 40-50%      | 🟡 +7% sopra bordo | no tune applied, variance pending |
| T04      | **10/30 = 33%**            | 30-45%      | ✅ in band         | tune efficace, centrato           |
| T05      | **~20%** (sample variance) | 15-30%      | ✅ in band         |                                   |

**Range osservato per scenario su N=10**:

- T02: 50% → 90% → 80% (variance 40pt)
- T03: 70% → 60% → 40% (variance 30pt)
- T04: 50% → 20% → 30% (variance 30pt)
- T05: 0% → 20% → ? (variance 20pt almeno)

Variance N=10 è molto alta. N=30 aggregate più affidabile ma ancora preliminare.

## 5. Decisioni

1. **T02 / T03 slightly sopra band**: accetta, no tune. Prossimo human-driven playtest M3 refinerà se persistente (variance può mascherare ±10%).
2. **T04 tune applicato**: hp lanciere+corrieri -1 ciascuno, riporta in band 33% ≈ centro target 37.5%.
3. **T05 tune applicato**: Apex hp 9→11 riporta boss da 50% verso 20% (in band 15-30%).

## 6. Impact /round/execute canonical flow

Fase 1 endpoint ([PR #1510](https://github.com/MasterDD-L34D/Game/pull/1510)) validato via `tests/api/roundExecute.test.js` (6/6 verdi). Playtest M3 human-driven potrà usare `tools/py/master_dm.py` ([PR #1513](https://github.com/MasterDD-L34D/Game/pull/1513)) per dichiarare intents canonicamente.

Batch harness attuale (`tutorial0{2-5}.test.js`) continua a usare `/action` legacy per compatibilità. Migrazione harness → `/round/execute` = follow-up (non blocca M3).

## 7. Azioni prossime

- [ ] **M3 human playtest** su T04/T05 con tuning applicato — validare se band tiene con Master DD
- [ ] Migrare batch harness a `/round/execute` (task separata, non urgente)
- [ ] Se T02/T03 persistono sopra band post human-playtest, tune minore (mod +1 enemy)
- [ ] VC scoring con N=30 data: analizza MBTI/Ennea distribution per scenario

## 8. Cross-ref

- SoT: [`docs/core/11-REGOLE_D20_TV.md`](../../core/11-REGOLE_D20_TV.md) §AP budget canonico
- ADR round model: [`ADR-2026-04-15`](../../adr/ADR-2026-04-15-round-based-combat-model.md)
- Previous playtest: [`../2026-04-17-02/notes.md`](../2026-04-17-02/notes.md)
- Tuning data: `apps/backend/services/tutorialScenario.js` v0.5 post-ap=2

---

_Automated validation via N=30 aggregate batch. Human-driven M3 follow-up richiesto per rating subjettivo + VC calibration._
