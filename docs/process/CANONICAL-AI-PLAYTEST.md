---
title: 'Canonical AI-driven playtest — single reproducible best-test (SoT)'
workstream: ops-qa
category: process
doc_status: active
doc_owner: claude-code
last_verified: '2026-05-29'
source_of_truth: true
language: it
review_cycle_days: 90
tags: [playtest, calibration, ai-driven, balance, reproducible, sot]
supersedes:
  - docs/process/2026-04-26-calibration-harness-policy.md (gate-stance flipped; methodology absorbed)
---

# Canonical AI-driven Playtest — single reproducible best-test

> **SoT del metodo di playtest.** Decisione master-dd 2026-05-29: i playtest sono
> **AI-driven** (batch-sim win-rate su N), come fatto finora. Il playtest umano NON
> e' piu' il gate/oracolo: e' **conferma opzionale**, mai bloccante. Questo doc
> **inverte** la policy `2026-04-26-calibration-harness-policy.md` ("oracolo vero =
> playtest live umano") e ne **assorbe la metodologia** (Restricted-Play, predictCombat,
> composite metric). E' la summa dei playtest fatti + i migliori metodi dalle ricerche.

## 0. Paradigma (flip 2026-05-29)

| Prima (superseded)                                    | Ora (canonical)                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| Harness AI = diagnostic, NON merge gate               | **Harness AI = gate**: WR in-band a N=40 + test verdi = merge OK                |
| Oracolo vero = playtest live umano (4 amici TV+phone) | **Oracolo = AI-driven multi-policy**; human = conferma opzionale, mai bloccante |
| Sim = scaffold, humans = ground truth                 | Sim multi-policy + telemetria = ground truth riproducibile                      |

Razionale: il playtest umano 4-amici e' raro, non-riproducibile, e ha bloccato sprint
per settimane (TKT-M11B-06). L'AI-driven e' riproducibile **ogni volta**, scala, ed e'
gia' il metodo de-facto (tutti i dati ratify sotto vengono da li').

## 1. Il metodo (summa)

### 1.1 Multi-policy triangulation (Jaffe 2012) — l'upgrade chiave

NON usare single greedy come proxy-umano (anti-pattern, rejected da Jaffe 2012 +
Politowski 2023). Il best-test gira **>=3 policy** e produce una **banda** WR:

| Policy       | Ruolo                                    | Sorgente                                                                     |
| ------------ | ---------------------------------------- | ---------------------------------------------------------------------------- |
| `random`     | noise floor (WR minimo)                  | baseline                                                                     |
| `greedy`     | ceiling locale (atk-closest, focus-fire) | attuale default batch                                                        |
| `lookahead2` | tactical awareness                       | da wire                                                                      |
| `utility`    | smart brain                              | `apps/backend/services/ai/utilityBrain.js` (opt-in `ai_profile: aggressive`) |

Human WR stimato ~= banda `[random_WR, strong_WR]`. Banda larga = skill-dominated
(posizionamento conta); stretta = luck-dominated (tune variance). Formula iniziale
`greedy_WR*0.55 + lookahead_WR*0.45` (tunabile se/quando arrivano dati human opzionali).

### 1.2 N-ladder (autorita' L-069/L-070/L-072/L-073)

| Fase         | N   | CI95 WR | Quando                                                              |
| ------------ | --- | ------- | ------------------------------------------------------------------- |
| **Probe**    | 10  | ±30pp   | direzione del delta (NON band-placement). Mai claim upgrade da N=10 |
| **Ratify**   | 40  | ±15pp   | **gate decisionale** band-placement                                 |
| **Forensic** | 100 | ±10pp   | cross-scenario fairness / metagame lock                             |

Regole dure: N=10 = solo direzione (segno robusto, magnitudo rumorosa). MAI catene
iter1/iter2/iter3 di N=10 (rumore compounding). Un N=40 > tre N=10. Optimizer
(Optuna/Bayesian/MAP-Elites) objective N **deve** essere >= ratify threshold (40),
altrimenti converge a rumore (L-073).

### 1.3 Diagnosis metric-first (prima di toccare knob)

`win_rate` dice SE sei fuori band, non PERCHE'. Diagnosi prima:

| Sintomo                      | Causa                    | Knob                    |
| ---------------------------- | ------------------------ | ----------------------- |
| WR alto + boss residual >50% | survivability            | enemy DPR / HP party    |
| WR alto + boss residual <10% | DPR insufficiente nemico | enemy_damage_multiplier |
| Timeout 100% + turns=max     | timer                    | turn_limit_defeat       |
| WR ~target ma KD estremo     | swingy                   | variance                |

Composite metric (anti falso-"balanced"): `0.50*WR + 0.25*KD_ratio + 0.25*PE_ratio`.
Metriche gia' emesse: `boss_hp_remaining_avg_on_loss`, `kd_avg`, `dmg_dealt_avg`.

### 1.4 Multi-knob discipline (L-070/L-072)

Cambiare knob A per fix M2 quando knob B ha gia' ottimizzato M1, senza simulare joint
effect = overshoot. Evidenza: hardcore_06 iter3 (`turn_limit null` sopra boss_hp 0.65)
= WR 85% catastrofico. Regola: N=10 probe TRA i cambi knob; predici interazione
qualitativa prima di applicare due knob insieme.

### 1.5 predictCombat O(1) pre-check

Prima di ogni batch (costoso): `predictCombat(actor, target, n=1000)` in
`apps/backend/routes/sessionHelpers.js:171` (enumera 20 facce d20, no HTTP, deterministico)
-> se `avg_dmg * rounds_avg > player_hp_pool` la config e' rotta, skip il batch.

## 2. Tooling (esistente, riusabile)

| Tool                                                          | Cosa                                              | Invocazione                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `tools/py/batch_calibrate_hardcore06.py`                      | WR runner HC06                                    | `--host http://127.0.0.1:3340 --encounter-class hardcore --n 40 --out <json>`         |
| `tools/py/batch_calibrate_hardcore07.py`                      | WR runner HC07 (timer)                            | `--host http://127.0.0.1:3334 --n 40 --out <json>`                                    |
| `tools/py/batch_calibrate_non_elim.py` / `_skiv_solo_pack.py` | altri scenari                                     | analogo                                                                               |
| `tools/py/calibrate_parallel.py`                              | 4-shard parallel                                  | `--scenario hardcore_06 --n 40 --shards 4 --base-port 3341` (~10min vs ~36min serial) |
| `tools/py/calibrate_drift_verify.py`                          | N=10 probe -> auto-escalate N=40                  | `--scenario hardcore_06 --target-band 15-25`                                          |
| `tools/py/sprt_calibrate.py`                                  | Stockfish SPRT early-stop                         | `--scenario <s> --target-low 0.30 --target-high 0.50 --n-max 80`                      |
| `tools/py/playtest_2_analyzer.py`                             | aggregatore JSONL telemetry                       | post-run                                                                              |
| `.claude/agents/balance-illuminator.md`                       | agent: encoda tutto (calibration + research mode) | invoke                                                                                |

Optimizer/search (research-tier, primary-sourced in `balance-illuminator.md`): SPRT,
MCTS smart playout, MAP-Elites QD, Bayesian (Optuna/Ax, N>=40/trial), LLM-as-critic
(TITAN 2025). Vedi anche `docs/research/2026-05-20-calibration-knob-patterns-industry.md`.

## 3. Contratto di riproducibilita' ("ogni volta")

Per risultati ri-ottenibili:

1. **Config pinned**: `data/core/balance/damage_curves.yaml` (`scenario_overrides` + `target_bands`) e `apps/backend/services/hardcoreScenario.js`. Knob change = restart shard.
2. **`DAMAGE_CURVES_PATH` set**: il client DEVE leggere lo stesso staging file del backend, altrimenti gli override sono SILENT NO-OP client-side (bug L-069/OD-032).
3. **`LOBBY_WS_ENABLED=false`** per ogni shard parallel (collisione porta WS, L-071). Porte shard deterministiche (base 3341 + offset).
4. **Host `127.0.0.1` NON "localhost"** (Windows risolve IPv6 ::1 prima -> stall ~2s/call).
5. **SEED RNG pinnato** — **WIRED** (TKT-PLAYTEST-SEED, 2026-05-30): `batch_calibrate_hardcore0{6,7}.py --seed` propaga il seed a `/api/session/start`, che pinna la RNG combat seedabile (`apps/backend/services/combat/pseudoRng.js` `defaultRng`/`seedRng`). 2 run stesso seed = JSON bit-identici (smoke verde). Unseeded = `Math.random` (zero regressione prod). Run i usa `seed+i` (intero batch riproducibile).
6. **Policy fissate**: il set multi-policy (1.1) e' parte del contratto, non ad-hoc.
7. **Output archiviato**: `docs/playtest/YYYY-MM-DD-<scenario>-<phase>.json` + report `docs/playtest/YYYY-MM-DD-<scenario>-illuminator.md`.
8. **Runtime canonico = node 22** (la versione CI + repo-recommended `22.19.0`); MAI calibrare
   su un'altra versione node del dev box (2026-06-14). Il sim combat NON e' bit-deterministico
   cross-runtime: la leva ripida di hc06 amplifica un delta float/RNG tra versioni V8 -> a seed
   identico hc06 legge **12.5% su node 22 (CI ubuntu E windows) vs 22% su node 24 (dev box)**.
   NON e' un fatto di OS: ubuntu-runner e windows-runner danno lo STESSO 12.5% su node 22. Quindi
   calibra + gate sulla STESSA versione node (22). Il determinismo seed (TKT-PLAYTEST-SEED) e'
   garantito DENTRO una versione node, non tra versioni. hc07 (leva piatta) e' robusto
   cross-runtime (42% ovunque). **RISOLTO 2026-06-14 (pm)**: ri-calibrato hc06 su node 22
   (nvm-windows) -> `boss_hp 1.04 -> 1.02` = WR 23% in-banda su node 22 E node 24 (1.02-1.03 =
   plateau prima del cliff 1.04, cross-runtime-robusto; il 1.04 era uno spot node-sensibile
   sfortunato sul cliff). hc06 resta leva-ripida -> se serve piu' margine = banda piu' larga o
   leva meno ripida (design-call). Dev box: `nvm install 22 && nvm use 22` per calibrare.

## 4. Scenari canonici + bande ratificate (stato 2026-05-29)

Manifest macchina-leggibile: [`docs/playtest/canonical-suite.yaml`](../playtest/canonical-suite.yaml).

| Scenario                            | Band target       | Knob ratificato                                             | WR (N=40)                   | Stato                                                      |
| ----------------------------------- | ----------------- | ----------------------------------------------------------- | --------------------------- | ---------------------------------------------------------- |
| `enc_tutorial_06_hardcore`          | 15-30%            | `boss_hp_multiplier: 1.02`                                  | 23% (N=100 2026-06-14)      | RATIFIED. iter3 `turn_limit null` = overshoot 85% REJECTED |
| `enc_tutorial_07_hardcore_pod_rush` | 30-50%            | `enemy_damage_multiplier_override: 2.1` (REPLACE class 1.8) | 30-40% (post-wave 5-7 nerf) | IN-BAND                                                    |
| `enc_tutorial_01..05`               | designed-winnable | n/a                                                         | ~100% greedy                | NON balance-oracle (ladder di apprendimento)               |

Fonte knob: `data/core/balance/damage_curves.yaml`. Fonte dati: `docs/playtest/2026-05-20-*`, `2026-05-21-*`, `2026-05-26-ratify-2381-balance.md`.

## 5. Gate policy (canonical)

**Merge gate** (sostituisce "harness != gate"):

- AI regression `tests/ai/*.test.js` verde (obbligatorio).
- Scenario toccato: WR **in-band a N=40** (multi-policy) — ratify gate.
- No crash / no contract-ripple.

**Human playtest = conferma OPZIONALE**, mai bloccante. Se gira (G7 RC o quando capita)
= un singolo re-tune iter, non un blocco. Telemetria JSONL via `POST /api/session/telemetry`

- `playtest-analyzer` se ci sono dati human, ma la loro assenza NON blocca nulla.

## 6. Comando canonico (finche' il suite-runner non e' wired)

Riproduce lo stato ratificato (N=40 parallel, ~10min):

```bash
# prereq: backend buildabile; staging damage_curves pinned
python tools/py/calibrate_parallel.py --scenario hardcore_06 --n 40 --shards 4 --base-port 3341
python tools/py/calibrate_parallel.py --scenario hardcore_07 --n 40 --shards 4 --base-port 3341
# verifica: WR HC06 in [0.15,0.25], HC07 in [0.30,0.50]
```

Suite-runner unico (`tools/py/playtest_canonical.py`, gira tutto il manifest a N=40 +
report datato + `--dry-run` backend-free) = **TKT-PLAYTEST-SUITE** -- **SHIPPED** 2026-05-30
(smoke verde: --dry-run + live hardcore_06 N=10). Comando: `python tools/py/playtest_canonical.py --n 40`.

## 7. Backlog (gap -> ticket) -- ALL SHIPPED 2026-05-30 (branch claude/canonical-ai-playtest-harness)

- **TKT-PLAYTEST-SEED** [SHIPPED]: `--seed` nei batch*calibrate*\* -> bit-identico via `pseudoRng.js` `defaultRng` + `/start` seed.
- **TKT-PLAYTEST-TRIANGULATE** [SHIPPED]: `--policy {random,greedy,lookahead2,utility,all}` (`calibrate_policies.py`) -> banda WR + stima human.
- **TKT-PLAYTEST-SUITE** [SHIPPED]: `playtest_canonical.py` (manifest -> N=40 parallel -> report datato; `--dry-run` backend-free).

## 8. Supersedes / flag (paradigma human-oracle declassato)

Questi riferimenti al playtest umano come gate/oracolo sono **declassati a opzionale**:

- `docs/process/2026-04-26-calibration-harness-policy.md` (`status: superseded`, gate-stance invertita)
- `docs/adr/ADR-2026-05-18-df-levels-integration-direction.md` gate (a) — ora AI-driven
- `docs/adr/ADR-2026-05-18-sistema-persistent-state-learning.md` gate ratify — ora AI-driven
- `BACKLOG.md` TKT-M11B-06 / "Playtest #2 userland 4 amici" — declassato
- `CLAUDE.md` / `COMPACT_CONTEXT.md` (Game) sprint-context "4 amici" gate — flag: vedi questo doc
- `docs/planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md` G7 RC sign-off — resta milestone RC, NON gate-dev

## 9. Band invalidation da correct-fix (protocollo, 2026-06-14)

**Caso #2719** (2026-06-10): un bug-fix CORRETTO (channel routing -- `/round/execute`
ora passa `action.channel`; prima ogni attacco di round era `fisico`) ha sbloccato
l'exploit `psionico` della policy hc06 contro boss/elite corazzati -> hc06 da 17%
(padre #2717) a 51% OOB. La banda 15-25% era stata ratificata SOTTO il bug. NON e'
una regressione da revertare -- e' la banda a essere stale. git-bisect + forensic
N=100: `docs/playtest/2026-06-14-canonical-forensic-n100.md`. Gate mancante: la
SoT (sez. 5) dichiarava il merge-gate ma non era wired per-PR -> #2719 e' passato.

**Regola** (mirror Stockfish fishtest: la soglia e' decisione UMANA, mai auto-derivata).
Quando un PR di combat porta un oracolo fuori banda:

1. Il gate CI `.github/workflows/combat-balance-gate.yml` segnala (phase 1 = warn;
   phase 2 = block).
2. Classifica: e' un BUG (-> fixa/reverta, la banda resta giusta) o un FIX corretto
   che sposta la banda (-> ri-taratura)? Usa git-bisect per la ground-truth.
3. Se fix corretto: ri-tara il knob a **N>=40** (L-073: MAI scegliere il valore da
   N<=20) e ri-ratifica a **N=100** forensic; se il lever e' steep, N=100 obbligatorio.
4. Aggiorna `canonical-suite.yaml` (`ratified_knob` + `last_wr_n40` + `note`) **e** il
   knob in `data/core/balance/` atomicamente. Documenta vecchia banda / nuova / perche'.
5. **MAI auto-aggiornare `target_band` in CI.** Bande = human-ratified, machine-verified.
6. Approvazione master-dd esplicita prima del merge.

**Caveat storico**: qualunque banda ratificata PRIMA di #2719 (2026-06-10) e' stata
misurata sotto il channel-bug (tutto-fisico) -> potenzialmente stale dove la policy
usa channel-exploit. hc06 ri-ratificato (boss_hp_multiplier 0.65 -> 1.02, N=100 WR 23%
su node 22 E node 24 = cross-runtime-robust; il 1.04 era interim node-24-only [22%] ma
OOB-low 12.5% sul canonical node 22 -- ri-calibrato su node 22, sec 3 rule 8).
hc07 ri-centrato (enemy_damage_multiplier_override 2.1 -> 2.5, N=100 WR 42%; era al
ceiling 50-52% dal baseline 2026-05-30, **#2719-INDEPENDENT** fisico-only timer-race).
**Entrambi gli oracoli ora in-band -> gate phase-2 (blocking) SBLOCCATO** (flip = rimuovi
`continue-on-error` + verdict ::error::+exit1 nel workflow, AND registra `combat-oracle`
come required status check in branch protection [owner]; consigliato dopo ~1 sprint di bake).

**Robustezza oracolo (follow-up)**: hc06 e' fragile perche' la policy greedy hardcoda
l'exploit di canale (`CHANNEL_EXPLOIT_MAP`). Un gate secondario su policy `random`
(mechanic-robust, gia' in `--policy all`) misurerebbe la difficolta' dell'encounter
indipendente dallo skill = piu' diagnostico. Richiede ratificare `random_target_band`
a N=40 per oracolo.

## 10. Meta-loop gate (2026-06-14)

Estensione del gate combat al **meta-loop** (campaign / Nido / mating / recruit). Il runner
full-loop (`tools/sim/full-loop-runner.js` + `full-loop-batch.js`) gioca il loop intero
in-process; `tools/sim/meta-band-aggregator.js` piazza **7 band-metric ratificate**
(master-dd 2026-06-03, L-069): completion_rate [0.4-0.7], roster_attrition (0,1),
economy_flow drift [0.5-2.0], relationship_progress (composite), offspring_viability >=1,
lineage_diversity >=3, roster_composition >=3.

Gate: `.github/workflows/meta-loop-gate.yml` -- per-PR sui path meta-loop, gira
`full-loop-batch.js --runs 40 --seed-base 424242 --isolate --gate` (exit 1 se una metrica e'
OOB). **PHASE 1 = warn-only**. Diagnosi 2026-06-14 (N=40 su main): tutte e 7 in-banda
(meta-loop sano, nessun drift) -> il gate blinda lo stato. Stesso buco pre-#2719 di combat:
runner + invarianti c'erano, il band-gate no.

**Caveat -- gate STATISTICO** (non bit-deterministico come combat): il full-loop runner e'
solo parzialmente seed-pinnato (completion/lineage/roles stabili per `--seed-base`, ma
recruit/mate/attrition variano run-to-run). Le bande hanno margine -> un meta-#2719 le spinge
chiaramente fuori, il rumore no. **Follow-up per phase-2 (blocking)**: seed-pin completo del
runner (pinnare l'RNG combat dentro il loop, come `pseudoRng`/TKT-PLAYTEST-SEED di combat) ->
bit-deterministico -> rimuovi `continue-on-error` dal workflow.

## Riferimenti

- Metodologia: `.claude/agents/balance-illuminator.md` (calibration + research) + `docs/research/2026-05-20-calibration-knob-patterns-industry.md`
- Lezioni: L-069 (N=10 noise) / L-070 (multi-knob overshoot) / L-072 (direction-probe bisection) / L-073 (optimizer-on-noise) — `~/aa01/learnings/`
- Papers: Jaffe AIIDE 2012 (Restricted Play), Politowski IEEE CoG 2023, Fontaine 2019 (MAP-Elites Hearthstone), Stockfish SPRT/Fishtest
- Tooling: `tools/py/calibrate_*.py` + `batch_calibrate_*.py`
