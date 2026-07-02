---
title: 'Post-item-1 coordinated plan -- build-residues + cross-session coordination'
date: 2026-06-17
type: session-handoff
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-17'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, item1, planning, coordination, godot, n40, spec-h, spec-k, spec-j]
---

# Post-item-1 coordinated plan (2026-06-17)

> 🔴 **SUPERSEDED / PARTIALLY-CONSUMED (2026-06-19)**. Track A K-04 recruit = DONE e2e (#2826 +
> GGv2 #481); SPEC-J Nido ritual UI = DONE (GGv2 #479); Track C SPEC-H buildable arc = COMPLETE
> (#2828-#2835 + namespace guard #2851 + audit-fix #2838-#2848). Solo **Track B** (flip N=40-gated
> SPEC-J lethal + SPEC-H HA1) resta genuinamente aperto, e il suo gate e' cambiato: il **G2 harness
> e' ORA BUILT** (P1-P5 #2806-#2825) -> i flip sono gated su **content + PE_ratio PR2 + N=40**, NON
> piu' su capability-harness mancante. La sez.1 workstream-map qui sotto e' STALE (lista G2 P1-P5
> come in-flight = tutti shipped; omette dossier #2856/GGv2 #494, taxonomy/canon Phase A-D,
> species-calib #2850, Ferrospora GGv2). Stato corrente -> sprint pointer `CLAUDE.md` (blocco
> 2026-06-19) + BACKLOG sezioni "G2 calibration N=40 leverage" / "SPEC-J flip readiness" / "SPEC-K".

> **item-1 = 17/17 active COMPLETE** (suite reconstruction SPEC-A..Q tutta a `doc_status: active`,
> PR #2816 J/F/K + #2818 B + #2820 H). Il "piano" non e' piu' doc-flip: e' **build-residui** +
> coordinamento con i workstream paralleli attivi. Questo doc mappa chi-fa-cosa + cosa resta +
> la sequenza che evita conflitti.

## 1. Mappa workstream attivi (cross-session, 2026-06-17)

| Workstream                        | Owner-session | File-footprint                                                                                                                          | Overlap coi miei residui         |
| --------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **G2 calibration** (P1-P5+)       | parallela     | `tools/py/calibrate_*`, `objective.py`, `suite_manifest.py`, `auto_ratify.py`, `docs/playtest/canonical-suite.yaml`, `requirements.txt` | **LEVERAGE** (e' l'harness N=40) |
| **species-export** (RFC #4 v110c) | parallela     | species data/export, authority-map                                                                                                      | disgiunto                        |
| **G3 canon-consistency**          | parallela     | `scripts/check-canon-consistency.cjs`, `data/core/canon-*`                                                                              | disgiunto (winding down)         |
| **skiv-monitor**                  | parallela     | skiv state                                                                                                                              | disgiunto                        |
| **item-1 build-residui** (mio)    | questa        | Godot cross-repo + N=40 + SPEC-H impl                                                                                                   | --                               |

**Regola coordinamento**: G2 sta COSTRUENDO la macchina N=40 (per-template orchestrator + Optuna +
auto-ratify). I miei flip-gate N=40 (SPEC-J lethal, SPEC-H HA1) la USANO -> NON costruire un path N=40
parallelo; aspettare la stabilizzazione G2 e poi girare i gate con quella. Tutto il resto (Godot,
Codex surface) e' disgiunto dai file G2/species.

## 2. Build-residui item-1 (TUTTI build, NESSUNO doc-flip blocker)

### Track A -- Godot cross-repo (conflict-free, chip-able SUBITO)

Toccano SOLO `Game-Godot-v2` -> zero conflitto coi workstream Game-repo. Spawn chip quando vuoi.

- **SPEC-K K-01..K-07** (device-authority surfaces): K-04 Nido phone actions, K-02 world-confirm
  migration off dev-fallback, K-05 next-mission quorum, K-01 surface audit, K-06 wording, K-07
  real-device smoke. (K-03 = DONE #2597.) Ref BACKLOG.
- **SPEC-J Nido ritual UI** (heal/transform device + esito): backend `POST /nido/ritual` LIVE; manca
  la surface Godot. Mirror del chip consent #477.

### Track B -- flip N=40-gated (LEVERAGE harness G2, sequenza DOPO stabilizzazione G2)

- **SPEC-J prod flip** `LETHAL_MISSIONS_ENABLED=true`: prereq = (1) author >=1 encounter `lethal:true`
  (content, `docs/planning/encounters/`, master-dd review), (2) lethal-mission N=40 in banda. Poi flip
  (env keys.env + restart prod, mani master-dd).
- **SPEC-H HA1 flip** `aliena_enforcement.enabled:true` + `strength`: prereq = N=40 su
  `enc_badlands_pilot_01` (win-rate in banda + no regressione). Poi flip + propagazione
  `enforcement_factor` nel sample telemetria.
- Entrambi = girare via l'orchestrator G2 (per-template + auto-ratify) quando pronto.

### Track C -- SPEC-H impl (build, semi-indipendente, 1 decisione)

- **HA2 authoring-validator** (presence-check 6-dim A.L.I.E.N.A. su `data/codex/{id}.yaml` + campi
  runtime-read; HARD presenza, SOFT rubrica). 🔴 **DECISIONE LOCATION** (master-dd): `codex.schema.json`
  in `packages/contracts` (FORBIDDEN-PATH) vs validator in `tools/py` (adiacente a G2 ma file nuovo =
  no conflitto testuale). Poi build.
- **Codex 6-dim surface** (`apps/play/src/codexPanel.js` oggi TUNIC-glyph -> render 6 dimensioni
  `public` + unlock QBN + proxy diegetico HA5). Disgiunto da G2/species. Gate-5 player-visible.

## 3. Altri residui noti (fuori item-1, gia' tracciati)

- SPEC-F: durable crossbreed cooldown (campo schema `crossbreed_history` = `packages/contracts`
  forbidden-path master-dd) + offspring->playable lineage (SPEC-E) + QR/card export.
- SPEC-E: transform-trait grant (scar->trait) + ritual resource-cost (E6) = balance.
- A2: floor magnitude re-tune UPWARD-only post-playtest-umano.
- Prod: Postgres auto-start service (reboot-survival); META_NETWORK_ROUTING flip (env-only, gated prod-health).

## 4. Sequenza consigliata (coordinata)

1. **Track A subito** (Godot chips) -- conflict-free, alto valore Gate-5, indipendente da G2/species.
2. **Track C decision** -- master-dd sceglie location HA2 validator; poi build validator + Codex surface
   (no conflitto G2 se file nuovo in tools/py).
3. **Track B dopo G2** -- quando l'orchestrator G2 e' stabile, girare i N=40 (SPEC-J lethal, SPEC-H HA1)
   con quella macchina; poi i flip (mani master-dd).

## 5. Plan-docs aggiornati

- `docs/planning/2026-06-09-item1-spec-readiness-map.md` -> chiuso (item-1 COMPLETE, nota in testa).
- Handoff `2026-06-17-session-handoff-continuation.md` -> Item-1 17/17 COMPLETE (cont-7).
- `BACKLOG.md` -> SPEC-K + SPEC-H residue sections (Priorita' alta).
- `CLAUDE.md` sprint pointer -> 17/17 COMPLETE.
