---
title: M4 User playtest — enc_tutorial_01 (Primi passi nella Savana)
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-18'
source_of_truth: false
language: it
review_cycle_days: 30
---

# M4 User playtest — enc_tutorial_01 (Primi passi nella Savana)

Primo playtest reale user-driven post-sessione 28 PR (2026-04-18). Obiettivi: validare kill-60 feature decisions, raccogliere gameplay trace per eval set Flint v0.3, testare UI `apps/play/` end-to-end su canvas 2D.

## Setup

- **Date**: 2026-04-18 15:18–15:31 (13 min totali)
- **Scenario**: `enc_tutorial_01` (savana, diff 1/5, grid 6×6 — note: YAML dichiara 8×8, session internal usa 6×6 default)
- **Party**: 2 PG (p_scout skirmisher + p_tank vanguard) vs 2 SIS (e_nomad_1 + e_nomad_2)
- **Interface**: browser canvas 2D `apps/play/` port 5180 (Vite dev server)
- **Backend**: port 3334 (npm run start:api), session `ae96d108-762a-48a6-a4a1-d393c88114e5`
- **Player**: Master DD, decisione user-driven via browser click (sample zero-AI-ghostwriting)
- **Trace persisted**: `logs/m4_playtest_enc_tutorial_01_ae96d108.json` (17 eventi)

## Outcome

🏆 **VITTORIA turno 3**

| Metrica             |         Valore         |
| ------------------- | :--------------------: |
| Turni totali        |           3            |
| HP persi PG         | 3 (p_scout hit turn 1) |
| HP inflitti Sistema |   8 (total kill 3+5)   |
| p_scout HP finale   |          7/10          |
| p_tank HP finale    |         12/12          |
| Enemies alive       |          0/2           |

## Trace completo (17 eventi)

### Turn 1 (6 eventi)

```
p_scout → atk e_nomad_1 : miss
p_scout → atk e_nomad_1 : hit 1 dmg
p_scout → atk e_nomad_1 : hit 1 dmg  (e_nomad_1 3→1 HP)
p_tank → move
p_tank → move             (da [1,3] verso [3,3])
sistema → atk p_scout : hit 3 dmg  (p_scout 10→7 HP, PANIC status triggered)
```

**Observation T1**: p_scout ha speso 3 AP in attacks (3 attack invece 1 move+1 attack). Panic status applicato da SIS hit.

### Turn 2 (8 eventi)

```
p_scout → atk e_nomad_1 : miss
p_scout → atk e_nomad_1 : hit 5 dmg  (CRIT — 5 dmg overkill su 1HP remaining)
p_scout → kill e_nomad_1  (automatic event)
p_scout → move
p_tank → atk e_nomad_2 : hit 2 dmg  (e_nomad_2 5→3 HP)
p_tank → ability e_nomad_2 : hit 2 dmg  (shield_bash: 3→1 HP + push + sbilanciato status)
p_tank → move
sistema → move  (auto)
```

**Observation T2**:

- p_scout ha finalmente killato e_nomad_1 al secondo tentativo (primo miss)
- p_tank ha executed user strategia: attack + shield_bash (ability) + move — 3 AP consumati coerenti
- shield_bash hit 2 dmg + applica sbilanciato (1 turn) coerente con spec `abilities vanguard`

### Turn 3 (3 eventi)

```
p_tank → move  (raggiunto e_nomad_2 post-push)
p_tank → atk e_nomad_2 : hit 4 dmg  (1→0 HP)
p_tank → kill e_nomad_2  (automatic)
```

**Observation T3**: chiusura pulita, p_tank finisce e_nomad_2 post-push shield_bash.

## Kill-60 validation — features under test

| Feature                                         | Testato |            Verdetto            |
| ----------------------------------------------- | :-----: | :----------------------------: |
| UI Canvas 2D tile-based (42-SG hierarchy)       |   ✅    |          🟢 leggibile          |
| HP bar color coded (verde/giallo/rosso)         |   ✅    |          🟢 funziona           |
| Active unit marker (yellow triangolo)           |   ✅    | 🟡 divergenza header vs canvas |
| Status icon chip sopra unit (Panic (2))         |   ✅    |      🟢 visibile + label       |
| Faction color coding (cyan player, red sistema) |   ✅    |           🟢 chiaro            |
| AP consumption feedback in sidebar              |   ✅    |          🟢 realtime           |
| Error messages AP insufficienti                 |   ✅    |        🟢 testo chiaro         |
| Ability sidebar (shield_bash)                   |   ✅    |          🟢 funziona           |
| End-game modal "Vittoria!" con metriche         |   ✅    |    🟢 leggibile + metriche     |

**Scorecard**: 8/9 🟢, 1/9 🟡.

## Findings

### ⚠ Bug UX #1 — Divergenza active marker

Turn 2 header dice `Active: p_scout` ma canvas yellow triangolo visibile su `p_tank`. Inconsistenza:

- Se p_scout è active, yellow triangle dovrebbe essere su p_scout
- Possibile cause: active_unit state non sync con canvas render post-action

**Severity**: medio (confusione UX ma non blocca gameplay)
**Reproducible**: sì, turn 2 screenshot ricostruibile
**Next step**: file issue `apps/play/render.js` active marker sync

### ⚠ Bug UX #2 — Grid mismatch YAML vs session

YAML encounter_tutorial_01 dichiara `grid_size: [8, 8]` ma session internal usa 6×6 default (GRID_SIZE constant). Canvas render 6×6.

**Severity**: basso (no gameplay impact per tutorial_01, ma scenari larger potrebbero rompere)
**Next step**: verify backend session creation rispetta scenario.grid_size OR documenta override intentional

### ✅ Positive UX #1 — Error messages AP

`"AP insufficienti per muoversi di 5 celle (ap residui 1)"` — messaggio italiano chiaro, include distanza + AP rimasti. Buon segnale UX M3.8+ spec.

### ✅ Positive UX #2 — Ability UI working

shield_bash cliccato da sidebar → applied + status sbilanciato + push 1 cell. Flow ability end-to-end OK.

## Engagement curve reale

| Turn | Decisioni player                       | Tempo dal start |           Engagement            |
| :--: | -------------------------------------- | :-------------: | :-----------------------------: |
|  1   | 3 attack p_scout + 2 move p_tank       |     ~5 min      | Medium (apprendimento controls) |
|  2   | split focus (p_scout ksy, p_tank bash) |     ~3 min      |    High (tattica sinergica)     |
|  3   | finish (p_tank move + kill)            |     ~2 min      |          Low (mop-up)           |

**Curva**: start plateau → peak T2 → decline T3. Tutorial pacing accettabile per first playtest.

## Eval set Flint v0.3 — positive samples

Trace `logs/m4_playtest_enc_tutorial_01_ae96d108.json` usabile come positive sample per:

- **play: commit classification** (questo commit stesso = sample)
- **Gameplay decision patterns** (split focus vs overkill)
- **Error recovery UX** (AP insufficienti → user re-click)

## Q-OPEN da playtest

- Q-OPEN-28: grid_size YAML override vs default — conservare?
- Q-OPEN-29: active_unit sync canvas render (bug UX #1)
- Q-OPEN-30: crit chance p_scout (hit 5 dmg su base weapon mod 3) — balance o intended?

## Follow-up M4

| ID  | Task                                                              | Priorità |
| --- | ----------------------------------------------------------------- | :------: |
| A   | File bug report active marker divergence                          |    🟢    |
| B   | Verify grid_size backend consumption enc_tutorial_01              |    🟡    |
| C   | Playtest enc_tutorial_02 → 05 stessa modalità (curva progressiva) |    🟡    |
| D   | Eval set aggregator: raccogliere trace multiple per Flint v0.3    |    ⚪    |

## Memo guardrail rispettati

- Regola 50 righe: doc only, zero code
- Zero meta-checkpoint (race memory con sessione parallela)
- Trace committed in `logs/` (non in data/ per separation)
- Prefix commit: `play:` (positive sample Flint v0.3)

## Riferimenti

- `logs/m4_playtest_enc_tutorial_01_ae96d108.json` — trace 17 eventi
- `apps/play/` — UI Canvas 2D browser
- `tools/py/master_dm.py` — alternative CLI path (non usato)
- `docs/core/42-STYLE-GUIDE-UI.md` — hierarchy tested
- `docs/core/41-ART-DIRECTION.md` — faction colors tested
