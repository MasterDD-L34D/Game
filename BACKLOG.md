# BACKLOG — Evo-Tactics

> **Scope**: backlog prioritizzato ticket aperti + residui sprint.
> **Sorgente canonical**: CLAUDE.md sezione "Sprint context" + sprint doc in `docs/process/`.
> **Aggiornamento**: on-demand quando chiudi/apri un ticket. Sprint close aggiorna anche CLAUDE.md summary.
> **Ref template**: `04_BOOTSTRAP_KIT/BACKLOG.md` archivio.

---

## Goals (S/M/L)

> Canonical per-repo goals. Hub mirror: `codemasterdd/GOALS.md`. Horizons: Short=weeks / Mid=1-2mo / Long=3-6mo.

- **Short**: M1 Sistema full wired Game<->Godot -- validate/playtest the live loop end-to-end. Confirm the canonical read route (#2364 `units_observed`) feeds Godot brief "Il Sistema ricorda" + debrief Cronaca echo correctly across a full run; single-source render path holds (no `sistema_memory` orphan regress, #2377); capture playtest findings. (Promoted from Mid; M1 build CLOSED -- pilot #2363 + route #2364 + passthrough #2376 + Godot surface #342 + hardcore band #2365.)
- **Mid**: trait system completeness (post-A4 ionico/termico); M1 loop hardening from playtest findings.
- **Long**: shippable co-op tactical loop -- 4-8 friends, TV + phones (Jackbox model), ~60min runs, "how you play shapes what you become".

---

## 🎯 NEXT GOAL (2026-06-02) — Design-closure (Fase 1) → Costruzione (Fase 2)

> Doc di riferimento: [`docs/planning/2026-06-02-design-closure-goal.md`](docs/planning/2026-06-02-design-closure-goal.md). Handoff (con `/goal` paste): [`docs/planning/2026-06-02-goal-master-session-handoff.md`](docs/planning/2026-06-02-goal-master-session-handoff.md).

- **FASE 1 — chiudi il design** (la maggior parte è GIA chiusa, verify-first): aperti reali = **H2** economy combat cost-gate (`cost_sg/pp/pt` decorativi vs SoT pools — verdetto master-dd, spec #2530-A2) + **H4** verifica copertura Cat F + **H8** 1-HP comment cleanup + **H9** OD-022/023 verify/archive + **H7** pillar surface-audit + **DECISIONE H1** GAP-C fase-3/4 (build-vs-gate).
- **FASE 2 — costruisci** (post Fase 1): GAP-C fase-3/4 (Godot choice-UI + generative grammar) + feature sbloccate, seguendo le direttive + `docs/guide/games-source-index.md`.
- ⚠️ **GIA SHIPPED, NON ricostruire**: PHASEC 32/32 (#2542), GAP-A (#2447), GAP-C fase-1/2 (#2509), campaign-XP (#2550), symbiont/minion (#2539-2549), ecosystem producers+wiring (#2510/#2447). **+ H2 ECONOMY COMPLETO** (SG #2554 / PP #2555 / PT #2557; rescale=KEEP consume-all #2558). **+ Full-loop AI-playtest runner MVP** (#2559 spec / #2561 fase-0 / #2562 fase-1b-1 / **#2563 fase-1b-2 ✅ merged 2026-06-02** `e4eb65a8`).

### 🟢 MOSTLY SHIPPED — Full-loop AI-playtest runner (fase-2 + fase-1b landed; live continuation = G2 calibration)

L'AI gioca il loop INTERO (campagna→combat reale→advance→Nido recruit→choose→completed), `tools/sim/` 12/12 test. Handoff: `docs/planning/2026-06-02-full-loop-build-handoff.md`. #2563 fase-1b-2 ✅ merged 2026-06-02 (`e4eb65a8`). **fase-2 SHIPPED 2026-06-02/03** (ground-truth audit 2026-06-20): band-metriche completion #2576 + lineage_diversity policy-sensitive #2579 + gate lineage>=3 + ratify full-loop bands #2580; mbtiPolicy = `tools/sim/mbti-policy.js`. **fase-1b-3** recruit→combat coperto da #2563 Nido meta-step (recruit each chapter); residuo narrow = mating/affinity-in-loop (verificare). **Continuazione live = G2 calibration N=40 / PE_ratio (sez. sotto)**. Memory: `project_full_loop_ai_playtest_runner.md`.

---

## 🔴 Priorità alta (bloccanti o sbloccanti)

### 🟡 OPEN — SPEC-H ALIENA enforcement implementation-residue (2026-06-17)

Spec `docs/design/evo-tactics-aliena-enforcement-lore.md` flippata `active` 2026-06-17 come
**design ratificato** (HA1/HA2/HA4/HA5 ratificati 2026-06-08; acceptance sez.11 = contract+
ratifica). La machinery baseline (sez.2) e' LIVE default-OFF; questi sono i pezzi di
IMPLEMENTAZIONE (forward-work, NON doc-flip blocker):

- **HA2-CI-validator** — **DONE 2026-06-18** (PR #2833 `f300bfe3`): `tools/js/validate_codex_aliena.js`
  HARD su presenza 6-dim + content, SOFT su rubrica (100-300char / ancoraggio-hook / unlock-triggers);
  NO spawn-threshold (anti-pattern sez.5). Enforced via `scripts/run-test-api.cjs` (tests/codex 6/6).
  Location risolta = `tools/js` (NON contracts -> evitato forbidden-path; HARD-presence non serve schema).
- **Codex 6-dim surface** — **DONE 2026-06-18** (e2e): backend `GET /api/v1/codex/entries`
  (#2828 `fc4418da`, secret-leak guarded) + frontend "Specie" tab `apps/play/src/codexPanel.js`
  (#2829 `ef45b035`, 6-dim accordion diegetico + Skiv footer + localStorage unlock) + unlock
  through play (#2830 `0f6b29ab`).
- **HA5 proxy diegetico** — **DONE 2026-06-18** (PR #2835 `fe842537`): `presence_descriptor`
  (specie endemica / presenza adattata / presenza inattesa, bande ratificate). Verify-first =
  runtime scorer disallineato (combat pool↔ecosistema, no codex species) -> proxy codex-native
  3-dim su dati authored (master-dd verdict); score resta secret. Residuo minore: biome-aware
  Skiv pool, `species.yaml` fallback. (Cross-check species-side runtime-fields = resolved as a
  finding, see "ALIENA ancoraggio dimension" below.)
- **HA1 flip runtime** — `enabled:true` + `strength` target SOLO post playtest N=40 su
  `enc_badlands_pilot_01` (win-rate in banda + no regressione) + propagazione
  `enforcement_factor` nel sample telemetria (sez.4). master-dd + harness G2. **Unico residuo
  sostanziale SPEC-H** (la machinery e la surface sono complete).
- **Codex unlock-reachability gap (Gate-5)** — verify-first 2026-06-18 (#2851): l'unica codex
  entry autorata (`dune_stalker`) e' `controlled_by:'player'` in OGNI wave wired -> non entra
  mai nel set sistema-filtered dell'unlock hook; la sua unica apparizione non-player e'
  `enc_savana_pack_clash` (`apex_neutral`), che nessun routing referenzia -> nel flow default ~0
  entry sbloccabili. Fix = wire dell'encounter savana OPPURE aggiungere `dune_stalker` come nemico
  sistema in una wave (content/balance, master-dd). Il guard namespace (#2851) cattura l'orphan;
  questo gap = reachability del roster, separato. **DECISIONE 2026-06-20 (master-dd) = seed 1 entry per nemico ROUTED**: verify-first ha trovato che il fix reale e' content-mismatch (entry solo per specie non-incontrata; i nemici routed non hanno entry). Scaffold `data/codex/_drafts/predoni_nomadi.yaml` creato (factual/mechanical fields + unlock + 6 dim A.L.I.E.N.A. con `content:` = TODO prose master-dd; in `_drafts/` = loader flat NON lo serve). **Verify-trigger CONFERMATO**: `predoni_nomadi` ha `encounter_role:threat` + e' in `enc_tutorial_01/02` (routed) -> `markCodexEntrySeen` (apps/play/main.js:287-311) fire al primo tutorial. **Promotion (master-dd)**: autora la prosa A.L.I.E.N.A. -> move `_drafts/predoni_nomadi.yaml` -> `data/codex/predoni_nomadi.yaml` = primo unlock reale in-flow (gap chiuso e2e). Caveat: predoni e' tutorial-phantom stub (lore-light); una specie sentient/apex routed sarebbe entry piu' ricca per il futuro.
- **ALIENA ancoraggio dimension = boost opzionale mai autorato** — verify-first 2026-06-18: lo
  scorer `services/authorial/alienaCoherence.js` `_scoreAncoraggioNarrativo` legge
  `entry.narrative_hooks`/`lore_ref`/`narrative_tag` sulle spawn-pool entries, ma quei 3 field
  NON sono autorati in alcun file (`data/`/`packs/` = 0 occorrenze; compaiono solo nello scorer).
  Sono boost OPZIONALI (default 0.5 -> 1.0 se presenti) -> oggi ancoraggio e' uniformemente 0.5
  per ogni specie (irrilevante finche' HA1 flag OFF; quando ON, la dimensione narrativa non
  varia). Un presence cross-check species-side = rumore (warn su tutte = sono opzionali) o no-op
  -> **guard prematura**. Azione = decisione content/design (se/dove autorare narrative grounding:
  `species.yaml`? pool? encounter? + quali specie) PRIMA di una guard mirata (es. solo specie con
  codex entry). master-dd. NO PR codice (nessun dato da validare).

Doc-flip != runtime (precedent SPEC-I/K). item-1 = 17/17 a doc-level; questi residui = build.

### 🟡 OPEN — SPEC-J permadeath flip readiness (`LETHAL_MISSIONS_ENABLED`, 2026-06-18)

Lethal-wounds backend + Godot consent UI gia' shipped (flag OFF). La **gate-attaccamento
(precondizione emotiva del permadeath) e' ORA SODDISFATTA**: la creature-dossier story-card e'
player-visible end-to-end (backend #2856 `07996aea` + Godot GGv2 #494 `442c5b3` / hardening #497
`679277e`). Signal last30days: permadeath paga solo con attaccamento PRE-costruito -> ora c'e'.

Verdetto master-dd 2026-06-18 = **DEFER**. Il flip resta un push COORDINATO master-dd + G2, NON
una now-action. Prereq aperti:

- **schema `lethal` field** — assente in `schemas/evo/encounter.schema.json` (buildable nub, ma
  inerte con flag OFF -> 0 valore now).
- **>=1 encounter `lethal:true` autorato** — 0 oggi. Content + magnitude (quale biome/difficulty/
  opt-in vs forced / late-node-only) = design-call master-dd.
- **lethal-mission N=40 in banda** — mai girato; = harness G2 (per-template orchestrator), NON
  duplicare. Lethal cambia roster-attrition -> banda+composite-target da definire CON la sessione G2.
- **flip `LETHAL_MISSIONS_ENABLED=true`** (env keys.env + restart prod, mani master-dd) + verdict
  scar-transform narrativo-vs-mechanical (SPEC-E) prima del go-live.

Riprendere quando si coordina uno sprint lethal-content + N=40 con G2.

### 🟡 OPEN — SPEC-K device-authority item-3 build-residue (K-01..K-07, 2026-06-17; **6/7 DONE 2026-06-20; ALL 5 K-01 design-calls resolved (#2883 DC#1/2/4/9.5 + #2884/#2889 DC#5 ratify+reconnect-test); K-07 contract-level AI smoke PASS 8/8 (#2890); only K-07 REAL-DEVICE playtest remains**)

Spec `docs/design/evo-tactics-godot-device-authority-reconciliation.md` flippata `active`
2026-06-17 come **design ratificato** (ADR-2026-06-07); la sez.9 acceptance (surface) NON e'
completa -> i ticket sez.10 sono build-residue item-3 (cross-repo Game-Godot-v2), tracciati qui
(l'audit ha trovato che non erano mai stati depositati). Stato vs audit flip-readiness:

- **K-01** Surface audit Godot (inventory + `surface_role:` metadata su tutte le view) — **AUDIT DONE 2026-06-19** (PR #2878 `72b1db99`): `docs/reports/2026-06-19-spec-k-01-device-authority-surface-audit.md` (18 host-op classificate: 1 MIGRATION_GAP=confirmWorld, 4 DONE, 11 INTENDED_ARBITER, 2 DESIGN_CALL; surface_role taxonomy 6-value enum crit-9.1 + per-view assignment). **METADATA DONE 2026-06-20** (GGv2 PR #516 `f4ee8be1`): `scripts/coop/surface_role_registry.gd` (26-view->role map, 6-value enum) + GUT test (valid-role + file-exists, no drift) + `docs/godot-v2/spec-k-surface-role-map.md` (table + DEV_FALLBACK/LEGACY sub-element notes). DC#4 enum 6-value crit-9.1 ratified via master-dd '1+2'. **K-01 FULLY DONE.** **5 design-call surfacate** (ancora open) (master-dd, in #2878): DC#1 submitNextMacro keep-host, DC#2 onboarding=SPEC-A/B, DC#4 enum 8.2-vs-9.1, DC#5 route-vote disconnect-persist, + **9.5 contraddizione** spec-sez.13-UNMET-vs-BACKLOG-DONE (Currency-Gate -> MET, patch sez.13 spec). **RESOLVED #2883 (`db059530`, 2026-06-20)**: DC#1/DC#2/DC#4 + 9.5 reconcile chiusi -> solo **DC#5** route-vote disconnect-persist resta open.
- **K-02** World confirm migration (host dev-fallback `host_world_confirm_button` -> device/quorum) — **BACKEND DONE 2026-06-19** (PR #2879 `537f4160`): mechanism A1 (host CTA propone, device quorum auto-committa). `coopOrchestrator.proposeWorld`/`tryAutoConfirmWorld` + `proposedWorld` (mirror K-05) + REST/WS/disconnect surface. Flag-gated `WORLD_CONFIRM_QUORUM_ENABLED` **default OFF** (legacy byte-identical, prod untouched). Eventi nuovi: `world_proposed`/`world_confirm_accepted`. coop-phase-validator no-P1 + Codex P2 (reset-votes) fixed. **Godot surface DONE 2026-06-20** (GGv2 PR #513 `86c2b260`: host propose UX + phone world-ready + TV recap; +Codex P1 reenter-guard fixed master-dd `fd77fca`). **K-02 buildable COMPLETE e2e** (backend+Godot, flag OFF). Residue = flip `WORLD_CONFIRM_QUORUM_ENABLED` env-var gated su K-07 playtest + master-dd.
- **K-03** Route TV pick guard — **DONE** (route-vote distinzione, PR #2597).
- **K-04** Nido phone action surface (`phone_nido_view.gd` read-only -> azioni player-facing) — **DONE e2e 2026-06-18** (cross-repo GGv2): recruit-review prereq `GET /meta/npg` gate-enrich MERGED #2826 `3f5ecf21` -> Godot recruit-button GGv2 **#481 `200ac70`** (+overlay #482) + wound-ritual surface GGv2 **#479 `eac9232`**. `phone_nido_view.gd` ora ha azioni player-facing (criterio sez.9.5 MET). Chip `task_532a071a` consumato. **Residue** = mating / party-select / tri-sorgente / custode = SPEC-E slices (party-select eligibility = design-call blocking-rules). + dossier story-card surface GGv2 #494/#497 (attachment, fuori K-04 stretto).
- **K-05** Next mission quorum — **DONE 2026-06-19** (backend, PR #2871 `4534ddb2`). `coopOrchestrator` `markMissionReady`/`missionReadyTally` (per-player ready, mirror voteWorld/worldTally + connected-quorum) + route `POST /coop/mission/ready` (auto-advance quando all_connected_ready) + `POST /coop/mission/start` (host anti-deadlock fallback) + `mission_tally` broadcast (incl. WS disconnect re-eval/auto-advance + host-transfer parity). 4 P2 review fixati (coop-phase-validator: connected_pending acted-count + null-hostId fail-closed; Codex: creature_named reveal broadcast + disconnect quorum re-eval). coop+WS 438/438. **Surface DONE 2026-06-19** (GGv2 #507 client + #510 AI-playtest PASS) [audit 2026-06-20; chip `task_f5abccab` consumato]. Residuo follow-up chip `task_3ce69e8d` (submitNextMacro stesso null-hostId hole) resta open.
- **K-06** Wording cleanup ("host drives" residui) — **DONE 2026-06-20** (Game PR #2881: `confirmWorld` docstring -> DEV_FALLBACK clarity + `/coop/combat/end` "MVP host controls" -> HOST_TECHNICAL; `voteWorld` gia' in #2879). GGv2 stale-doc route-vote-DONE reconcile = nota nel map-doc (#516). Residuo minore = edit storici `sprint-context-archive`/`PRD-BUILD-STATUS` (low-value, snapshot — non fatti).
- **K-07** Real-device smoke playtest (2 telefoni + TV: route-vote/recruit/mating/Nido/next) — **CONTRACT-LEVEL AI SMOKE DONE 2026-06-20** (running backend PORT=3400 shared-WS flag-ON, NON prod): K-02 device-quorum flow e2e **8/8** (propose -> 2-vote auto-confirm + world_proposed/world_confirm_accepted broadcasts + host force:true + disconnect-completes-quorum + solo immediate-commit). Trovato+fixato 1 bug reale = REST vote auto-confirm non broadcastava world_confirm_accepted (#2890 `dee28bdf`, regression test). **REAL-DEVICE playtest (Godot rendering su 2 telefoni + TV) PENDING** (criterio sez.9.9 = master-dd hands). L'AI smoke de-risca il flip ma NON sostituisce il real-device (sez.10).
- **Codex namespace cross-check (HA2 follow-up)** — **DONE 2026-06-18** (PR #2851 `d0d59923`): `validate_codex_aliena.js` orphan-id guard -- una codex entry il cui id non e' in alcun roster sistema/encounter (scenario builders + `data/encounters/*.yaml`) warna SOFT (mai sbloccabile). Reso require()-able, 5 test, CI-enforced. Scoperto il gap reachability di cui sopra (SPEC-H).

Dipendenti gia' flippati che poggiano su questo seam: SPEC-J (consent UI #477) + SPEC-B (visibility).
Runtime/surface = item-3 Godot, NON blocca il doc-flip (precedent SPEC-I/A/G).

### 🟡 OPEN — G2 calibration N=40 leverage: PE_ratio PR2 + flip sequencing (2026-06-19)

Il G2 per-template calibration harness e' **BUILT + CAPABLE end-to-end** (P1-P5 #2809/#2815/#2817/#2821/#2824 + design #2806 + PE_ratio PR1 #2825). Il collo di bottiglia per i flip N=40 (SPEC-J lethal, SPEC-H HA1) si e' **SPOSTATO** da "harness mancante" a **content + esperimento**. Residui sequenziati (SINGLE OWNER per evitare la collision SPEC-J/SPEC-H che reclamano entrambi "via G2"):

- **PE_ratio experiment PR2 — DONE 2026-06-19** (#2867 `77973e47` wiring + #2869 `7d448884` instrumentation extension). `attach_composite_terms()` emette `kd_ratio` (=kd_avg/(kd_avg+1)) + `pe_ratio` (candidato B_time_avg) su OGNI aggregate (hc06 + badlands_elite + foresta_pilot estesi) -> il `composite_metric` di `canonical-suite.yaml` e' ora **COMPUTABILE** (objective non piu' None). 27 test. Esperimento N=40/100 seed-pinned node 22 girato. 🔴 **Finding (master-dd, OPEN)**: il segnale PE-from-pressure e' **MARGINALE** — tutti gli oracoli balance girano high-pressure, i candidati near-saturano (pe_ratio 0.81-0.94 ovunque), il |corr| e' rumore N-sensitive (nessun winner robusto; B tenuto per argomento-varianza). **Banda composite PROPOSTA** (mean 0.526, k=2.0 [0.236, 0.815]) ma NON scritta nel manifest (SDMG). **DECISIONE 2026-06-20 (master-dd) = (b) SWITCH a contestedness**: PE-from-pressure REJECTED (e' il negative-result che il design sec 4.5 anticipava; pe_ratio satura ovunque = ~0 discriminazione); banda pressure [0.236,0.815] DROPPED (non ratificata, non nel manifest). Wiring #2867 + instrumentation #2869 restano (composite computabile; cambia solo la SORGENTE PE). **Next (calib-session, single-owner)** = esperimento contestedness (turns-to-resolve + dmg_taken, derivabili dai raw events `{turn,damage_dealt}` su OGNI oracolo, NO nuova instrumentation): add candidati -> re-run orthogonality 3.2-3.4 -> selezione least-collinear-WR -> deriva+ratifica (master-dd, SDMG) banda su contestedness -> flip P4 gate-2/4b + P5. Escalation se contestedness ANCHE collineare -> drop-PE o defer (negative-result valido). Handoff: `docs/planning/2026-06-20-pe-ratio-contestedness-switch-handoff.md`. Evidence: `docs/playtest/2026-06-19-pe-ratio-experiment-n100.md`.
- **N=40 sequencing (SINGLE OWNER)** — un solo ticket: PE_ratio PR2 -> autora 1 scenario lethal/HA1 (content, design-call master-dd: biome/roster/banda-attrition) -> run N=40 ATTRAVERSO l'orchestrator G2 (`enc_badlands_pilot_01`), NON un path N=40 parallelo -> risolvi band+composite-target. Sblocca i flip SPEC-J `LETHAL_MISSIONS_ENABLED` (#2865 DEFER) + SPEC-H HA1.
- **auto-ratify prod-write activation** — oggi UNREACHABLE by-design; attivazione gated su (a) PE_ratio emission, (b) baseline node-22 seed-pinned per gate-3, (c) harsh-review SDMG + master-dd prima dei flag `--auto-ratify`/`--confirm-prod` live.

### 🟡 OPEN — Worldgen GAP-C only (meta-network -> runtime) — GAP-A+B SHIPPED #2447 (ground-truth 2026-05-31)

Source: design-docs currency reconcile (`docs/reports/2026-05-29-design-docs-currency-reconcile.md`) + worldgen-pcg-audit (2026-04-26). Museum cards M-013/M-014/M-016 + gallery worldgen.

**GAP-A + GAP-B closed 2026-05-31 (stale-row correction, L-075 / anti-pattern #19):** both were already shipped + wired + tested in PR #2447 (`04a3920a` on main) — the 2026-05-29 "zero consumer runtime" verified-state was already obsolete when written.

- ✅ **TKT-WORLDGEN-GAPA** (foodweb -> spawn composition): `apps/backend/services/worldgen/foodwebFilter.js` `filterReinforcementPool` wired into `reinforcementSpawner.js tick():172` (Caves of Qud whitelist; kill-switch `policy.foodweb_filter===false`; band-safe fallback never empties pool; Gate-5 console surface). Tests: `foodwebFilter.test.js` 8/8 + `reinforcementSpawner.test.js` 23/23.
- ✅ **TKT-WORLDGEN-GAPB** (cross-events -> pressure modifier): `crossEventEngine.js` `getCrossEventPressureDelta(biome,season)` wired into `session.js /start` (`:1532` call → `:1704` pressure_delta applied → `:1735` cross_events/hazards surfaced). Test: `crossEventEngine.test.js` 9/9.

| Ticket            | Gap                              | Verified state 2026-05-31                                                                                                                                                                              | Effort (post-blast-radius) | Decision                                                                                      |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------- |
| TKT-WORLDGEN-GAPC | meta-network -> campaign routing | `meta_network_alpha` HA consumer (`metaNetworkResolver`/`metaNetworkRouting` fase-1/2/3, #2509/#2597) [audit 2026-06-20, cella "zero consumer" era stale]; residuo = grammar generativa Dormans fase-4 | ~30-40h (POST-MVP)         | Dormans mission/space grammar (fase-4 only) — POST-MVP, gate normale, NON priorità automatica |

### 🟢 P2 DONE 2026-06-07 — Python->Node combat parity sweep -> 4 GAP (2 HIGH actionable)

Trigger: `docs/combat/README.md` SoT-flip review -- il README era `source_of_truth:true` ma descriveva il combat come Python `services/rules/*` (rimosso `d0c86c60` Phase-3 / ADR-2026-04-19); runtime canonical = Node.
**Superficial check 2026-06-07**: surface migrata (resolver->`resistanceEngine.js`+`abilityExecutor.js`, round_orchestrator->`roundOrchestrator.js`, grid->`services/grid/hexGrid.js` [esiste -- la nota SoT "hexGrid M12+ planned" e' STANTIA], worker/demo_cli obsoleti by-design). MA precedente `resistance-engine-gap` (M5/M6: Python aveva `apply_resistance`, Node no, scoperto tardi) prova che gap def-level possono nascondersi.

- **Task**: audit parita' def-by-def (~70 def Python da `d0c86c60~1:services/rules/*` vs Node `apps/backend/services/combat/*`). Delegabile (read+grep meccanico, Jules/LLM-locale + verifica). Home = SPEC-L (`runtime-feature-inventory-reconcile`).
- **Priorita'**: P2, NON urgente (Node gira/funziona/testato). Dopo SPEC-K.
- **DONE 2026-06-07** (sub-agent grep-verified, ~70 def vs Node): migrazione SOSTANZIALMENTE completa (resolver/round_orchestrator/hydration/grid/trait_effects portati; worker/demo obsoleti; damage-model divergenza intenzionale). **4 GAP** in stress/mental + PT-maneuver -> ticket sotto.
- Related decisions 2026-06-07: ADR pincer/plan-reveal/networking-colyseus/networking-co-op = SUPERSEDED; new ADR-2026-05-30-coop-server-authoritative-combat written.

### ✅ DONE 2026-06-07 — Stress / on-hit-status mental layer (port-to-Node + retire orphaned yaml) — SHIPPED #2613

Bug funzionale: effetti-trait progettati silenziosamente INERTI su Node + dati `trait_mechanics.yaml` orfani.

- **GAP-1 (HIGH)**: `on_hit_status` + `trigger_dc` (SV d20+tier -> disorient/panic on hit) = LIVE yaml (multi-trait), ZERO consumer Node (`grep on_hit_status apps/` = 0).
- **GAP-2 (HIGH)**: `on_hit_stress_delta` + breakpoint stress (rage@0.5 / panic@0.75) = LIVE yaml, nessuna logica Node -> loop "attacchi -> stress -> auto rage/panic" assente.
- **GAP-3 (MEDIUM)**: `spinta` -> `sbilanciato` -> defense-malus: status scritto (shield_bash) ma mai LETTO come malus nel resolver.
- **GAP-4 (DROP 2026-06-07)**: swarm `scaling_attacks` -- morto ovunque, mai dato live, esisteva solo nel Python rimosso; `multi_attack` copre lo spazio. No-action.
- **Decisione (Eduardo)**: portare il mental-state layer in `performAttack`, O ritirare i campi yaml orfani. Ref: `resolver.py` (d0c86c60~1) STEP3 vs `apps/backend/routes/session.js` performAttack + `traitEffects.js`. DECISO 2026-06-07: D1 = HYBRID (PORT `on_hit_status` 13 trait in performAttack + RETIRE `on_hit_stress_delta` 2 trait); GAP-3 `sbilanciato` = WIRE-IT (statusModifiers read-path). -> **SHIPPED #2613 (`66193685`, merged 2026-06-07)** [ground-truth audit 2026-06-20]: GAP-1 on_hit_status portato (`apps/backend/services/combat/onHitStatus.js`, wired `session.js` + `sessionRoundBridge.js`), GAP-2 on_hit_stress_delta retirato (`grep on_hit_stress_delta apps/` = 0), GAP-3 sbilanciato wired. I bullet GAP-1/2/3 sopra + il marker 🔴 OPEN erano stale.

### 🟢 P2 DONE 2026-06-07 — Sprint Impronta (aa01/cap-\*) = SUPERSEDE (design non-canonico)

Materiale era disk-only Lenovo (April 25-28); backuppato su `origin/aa01/cap-*` (13 branch) 2026-06-07. "Sprint Impronta Ondata 1" = sistema imprint/onboarding/primo-minuto:

- backend: biome resolver (CAP-11), player telemetry (CAP-12), `onboarding_v2` schema + `/campaign/start/v2` (CAP-14), imprint phase in `coopOrchestrator` (CAP-15), REST `/coop/imprint/*` (CAP-15b).
- frontend web `apps/play` `onboardingPanelV2` (CAP-14b, superseded da pivot Godot 04-29) + prototipo `prototypes/imprint-v2`.
- **VERDETTO 2026-06-07** (sub-agent grep-verified): **SUPERSEDE**. Il backend implementa un modello onboarding NON-canonico (4 body-part choices -> biome via `biomeResolver`) che CONFLIGGE col canon (1-trait/branco + biome-via-route-choice) e in 2 punti REGREDIREBBE main (imprint-phase collassa character_creation+world_setup che main tiene separati; host-token start = anti device-authority). NON merge -- branch preservati su `origin/aa01/cap-*`.
- **1 REUSE narrow (P3, gated-behind-spec)**: `PlayerRunTelemetry` (store+route+Prisma, `vcSnapshot`+`selectedForm` cross-run) = allineato Form-Pulse/MBTI canon (ADR-2026-06-07 pt3), standalone. Valutare lift SOLO dopo design-spec (no canon-home attuale).

### ✅ DONE — Stale services/rules (dead Python) doc/config refs cleanup (2026-06-07) — SHIPPED #2610 + #2860

Surfaced by the reconstruction-suite README SoT-flip + refresh audit: ~9 docs/configs still cite `services/rules/*` Python (REMOVED `d0c86c60` / ADR-2026-04-19) as if alive -- misfire if run. NOT touched by weekend Codex (pre-existing staleness).

- `.claude/agents/session-debugger.md` (resolver/round_orchestrator/hydration as live), `.claude/agents/balance-auditor.md` (`PYTHONPATH=services/rules`), `.claude/commands/{combat-sim,monitor,trait-lint,sprint-close}.md` + `.claude/TASK_PROTOCOL.md` (run/grep `services/rules`), `docs/PILLARS_STATUS.md` (pillar source), `docs/README_FULL_ARCHIVE.md` (engine "risiede in services/rules" + `demo_cli.py`).
- **Task**: sed-sweep -> repoint a Node runtime (`apps/backend/services/combat/*`, `roundOrchestrator.js`, `abilityExecutor.js`) o marcare removed-per-ADR-2026-04-19. Delegabile (Jules/aider, meccanico). Low-urgency (comandi probabilmente inusati post-Node).
- **Priorita'**: P3.
- **DONE [ground-truth audit 2026-06-20]**: SHIPPED #2610 (mark/repoint stale services/rules dead-Python refs) + #2860 (currency-fix Phase-3); i 5 file (session-debugger / balance-auditor / combat-sim / TASK_PROTOCOL / PILLARS_STATUS) ora marcano removed-per-ADR-2026-04-19 + repoint a `apps/backend/services/combat/*`. Marker 🟢 OPEN era stale.

### 🟢 P3 OPEN — Governance stale-doc burn-down campaign (progressive, 2026-06-07)

docs-governance: **314 stale_document warnings (0 errori, non-blocking / warning-only)** -- base 250 -> 397 col bulk-register #2695 (246 legacy entrate nel conteggio), poi batch-2 -32, batch-3 -11, batch-4 -7, batch-5 -29. Batch-1 (adr+core, 37) DONE -> 21 re-verified-bumped + 16 real-issue residue (#2611). Batch-2 (process+pipelines, 64) DONE -> 32 re-verified-bumped + 32 residue (29 DRIFTED + 2 SUPERSEDED-da-ratificare + 1 NEEDS-HUMAN) -> ticket TKT-STALE-B2-\* sotto. Batch-3 (ops+traits+balance, 37) DONE -> 11 re-verified-bumped + 26 residue (20 DRIFTED + 6 NEEDS-HUMAN) -> ticket TKT-STALE-B3-\* sotto. Batch-4 (evo-tactics-pack+guide+biomes+catalog+species, 27) DONE -> 7 re-verified-bumped + 20 residue (13 DRIFTED + 7 NEEDS-HUMAN) -> ticket TKT-STALE-B4-\* sotto. Batch-5 (playtest, 34) DONE -> 29 re-verified-bumped (26 record-storici archive-candidate + 3 living-harness) + 5 residue (3 DRIFTED + 2 NEEDS-HUMAN) -> ticket TKT-STALE-B5-\* sotto. Tool ora skippa superseded/deprecated/archived (#2612).

- **Pattern provato**: agent (NON Jules -- currency-judgment quality, doctrine) currency-verifica un dir-batch -> bump REGISTRY+frontmatter `last_verified` per i CURRENT (**NO blind-bump**) + flag DRIFTED/SUPERSEDED. 1 PR/batch.
- **Meccanismo**: `stale_document` legge REGISTRY `last_verified` (bump REGISTRY + file frontmatter).
- **Remaining ~3 dir-batch**: planning 67 + reports 43 (= ~110, i cluster GROSSI da splittare in sotto-batch ~30); tutorials+appendici+frontend+research+arch (~48); resto (museum/superpowers/adr/process/core/... ~70). (Ricalcolare col report a inizio batch.)
- **DRIFTED residue** -> fix-ticket separati (driver: `species.yaml` deprecato 05-15, pivot web->Godot, docs-reorg path-stale). Target = bump-stabili + converti-drift-in-ticket, **NON forced-0**.
- **Batch-2 residue tickets** (fix separati, dettaglio per-doc nella PR batch-2):
  - TKT-STALE-B2-SPECIESYAML -- script QA hardcodano `data/core/species.yaml` rimosso (#2271): `scripts/qa/frattura_abissale_validations.py:94` + `scripts/qa/check_biome_feature.py:69`; doc colpiti: Frattura pipeline_run, BIOME_FEATURE_CHECKS, GOLDEN_PATH\*, PIPELINE_SPECIES_BIOMES_STANDARD, PIPELINE_TEMPLATES, PIPELINE_TRAIT_STANDARD -> fix script o re-frame storico.
  - TKT-STALE-B2-REORG-PATHS -- link path-stale post docs-reorg (fix 1-riga ciascuno): qa_reporting_schema (7 link), feedback_collection_pipeline (5), telemetry (1x3), bug-template, demo-release, clone-setup, project-setup-todo (8), trait_data_reference, incoming_triage, incoming_review_log.
  - TKT-STALE-B2-CI-DRIFT -- doc CI descrivono workflow cancellati/pre-split: ci.md (3/4 workflow morti), ci-pipeline.md (job monolitico inesistente), ci-gap-analysis.md, gh-cli-manual-dispatch.md (9/18 workflow morti), traits_checklist sez. 5-6, web_pipeline (deploy-test-interface rimosso #1400) -> riscrivi vs `.github/workflows/` attuali o archivia.
  - TKT-STALE-B2-DEAD-PROCESS -- processi morti, retire/rewrite owner-gated: token-rotation (`ops_api_token` zero usi nel codice; token reali TRAIT_EDITOR/TRAITS_API scoperti), tooling_maintenance_log (mai eseguito), trait_rollout_plan (gate QA mai esistiti in git), telemetry_ingestion_pipeline (infra mai costruita), incoming_agent_streams + incoming_review_log + incoming_triage (pipeline AG-\* archiviata 2026-04-14).
  - ~~TKT-STALE-B2-SUPERSEDE~~ **DONE 2026-06-10** (verdetti master-dd): vc_playtest_plan + incoming_triage_pipeline flippati `superseded` (frontmatter+registry, pointer ai canonici).
  - ~~TKT-STALE-B2-AIRTABLE~~ **DONE 2026-06-10** (verdetto master-dd): processo ATTIVO, SoT esterna Airtable/Slack -> doc `active` + nota external-SoT + review_cycle 180gg.
  - Nota: 22 dei 32 CURRENT bumpati = record storici accurati (15 log Frattura + sprint/ticket/handoff datati) = candidate `doc_status: archived` (esenta dal ciclo stale; flip owner-gated, non urgente).
- **Batch-3 residue tickets** (ops+traits+balance; verdetti 3-agent fan-out read-only, evidenza per-doc nella PR batch-3):
  - TKT-STALE-B3-EDITOR-PIVOT -- doc descrivono il trait-editor come **AngularJS**, ora e' **Vue 3** (`apps/trait-editor/`, `@vitejs/plugin-vue`, zero Angular in package.json): `trait-editor.md`, `manuale/05-workflow-strumenti`, `manuale/06-standalone-trait-editor` -> riscrivi sezione tech-stack.
  - TKT-STALE-B3-REORG-PATHS -- link cross-doc rotti post docs-reorg (`docs/traits-manuale/` -> `docs/traits/manuale/`; rimossi: `README_HOWTO_AUTHOR_TRAIT.md`, `docs/contributing/traits.md`, `docs/Guida_*_v2.md`, `INTEGRAZIONE_GUIDE.md`, `scripts/simulate-trait-source.mjs`): `manuale/01-introduzione`, `manuale/06-standalone`, `next_steps_trait_migration`, `trait_reference_manual`, `traits_scheda_operativa`, `traits_template`, `README_TRAITS` (`.github/workflows/validate_traits.yml` rimosso) -> fix link 1-riga ciascuno.
  - TKT-STALE-B3-STALE-COUNTS -- conteggi catalogo obsoleti ("174 trait" / "57 famiglie" / "74 specie, 219 trait, 33 regole"); index.json ora schema 2.0, **254 trait / 263 file**: `README_TRAITS`, `manuale/02-modello-dati`, `manuale/03-tassonomia-famiglie`, `manuale/04-collegamenti-cross-dataset` -> ricalcola da index.json (lo schema/field-model resta accurato, drift = solo i numeri).
  - TKT-STALE-B3-DEPLOY-RENDER -- guide deploy puntano a Render free-tier (morto; prod ora Lenovo cloudflared) + script rimossi (`scripts/deploy-min.sh`, `render.yaml`, `tools/deploy/*.sh`): `cloudflare-prod-deploy-guide`, `deploy-min-checklist` -> riscrivi vs prod attuale o archivia (vedi `lesson_prod_host_ports`).
  - TKT-STALE-B3-CI-CONFIG-DRIFT -- doc ops citano workflow/job/workspace rimossi (`lighthouse.yml`, `config/jobs/nebula-atlas-rollout.yaml`, `--workspace webapp`, `nebulaTelemetryAggregator` spostato a `apps/backend/`, `docs/chatgpt_changes/`, vari `.github/workflows/`): `evo-tooling`, `nebula-rollout`, `observability`, `tool_run_report`, `workflow_diff` -> rifresca path o archivia (log pre-pivot Oct/Nov 2025).
  - TKT-STALE-B3-RULES-ENGINE -- `MACHINATIONS_MODELS.md` referenzia il Python rules engine ucciso (ADR-2026-04-19): `services/rules/predict_combat.py` + `statusEffectsMachine.js` rimossi -> re-frame su runtime Node combat (`apps/backend/services/combat/`) o archivia storico.
  - TKT-STALE-B3-NEEDS-HUMAN -- owner judgment (ratifica/archivia/retire): `AI_AGENT_AUDIT_LOG` (log completamento fasi Codex), `chatgpt_sync_status` (run-history Oct-2025), `publishing_calendar` (template editoriale, righe esempio stale), `qa-window-checklist` (ticket #1204/#1205 non verificabili), `Frattura_Abissale_Sinaptica_trait_draft` + `_balance_draft` (sandbox curator non-ratificati, HP scale 22 vs 300 proposto).
- **Batch-4 residue tickets** (evo-tactics-pack+guide+biomes+catalog+species; verdetti 3-agent fan-out read-only, evidenza per-doc nella PR batch-4):
  - TKT-STALE-B4-WEB-PIVOT -- doc descrivono infra web-v1 morta post pivot Godot (`webapp/`, `server/`, `docs/test-interface/`, `docs/ideas/`, `README_IDEAS.md` rimossi; `server/routes/generation.js` -> `apps/backend/routes/`; `services/api/`+`services/export/` subdir assenti; backend port 3333 -> 3334): `guide/structure_overview`, `guide/CONTRIBUTING_SITE`, `guide/INDEX`, `guide/faq`, `guide/templates/obsidian_template`, `evo-tactics-pack/deploy`, `evo-tactics-pack/handover-summary` -> rifresca path o archivia.
  - TKT-STALE-B4-SPECIESYAML -- `data/core/species.yaml` rimosso #2271 (ora dir + `species_catalog.json`); doc lo citano ancora come sorgente verificata: `guide/data-guidelines`, `biomes/manifest`, `species/Frattura_..._species_draft` -> re-frame su `data/core/species/` + catalog (estende [[TKT-STALE-B2-SPECIESYAML]]).
  - TKT-STALE-B4-DB-STACK -- `evo-tactics-pack/db-schema.md` descrive MongoDB + `scripts/db/run_migrations.py`/migration files; lo stack reale e' Prisma/Postgres, quegli script sono assenti -> riscrivi vs Prisma o archivia storico.
  - TKT-STALE-B4-REORG-PATHS -- `guide/INTEGRAZIONE_GUIDE` SSoT-target stale (`docs/trait_reference_manual.md`, `docs/traits-manuale/`, `validate_traits.yml` rimossi) -> fix link (allinea a [[TKT-STALE-B3-REORG-PATHS]]).
  - TKT-STALE-B4-FRATTURA-INTEGRATED -- il bioma Frattura Abissale Sinaptica e' stato **integrato** (biomes.yaml L755, species*catalog.json, 27 trait JSON) ma i doc Step-2/3 tengono ancora disclaimer "SANDBOX / non scrivere" + `biomes/biomes.md` tabella lo omette: `biomes/Frattura*..._biome`, `biomes/Frattura_...\_lore`, `biomes/biomes.md` -> riconcilia sandbox->integrated o archivia (owner: design).
  - TKT-STALE-B4-FRATTURA-ASSETS -- card/asset-plan sandbox che propongono file mai creati (`docs/catalog/biomes|species/`, asset PNG, non wired in `catalog_data.json`): `catalog/Frattura_..._assets_draft`, `catalog/bioma_frattura_abissale_sinaptica` -> ratifica+crea o archivia (owner: design/asset).
  - TKT-STALE-B4-NEEDS-HUMAN-TEMPLATES -- design-content senza ref meccanici verificabili: `evo-tactics-pack/generator-benchmarks` (QA-metrics + benchmark esterni), `guide/templates/MODELLI_RIF_EVO_TACTICS` + `guide/templates/incoming_triage_meeting` (template fill-in) -> archive-candidate o keep-as-template (owner).
- **Batch-5 residue tickets** (playtest; verdetti 3-agent fan-out read-only, evidenza per-doc nella PR batch-5):
  - TKT-STALE-B5-DRIFTED-RUNBOOKS -- doc-reference VIVI (da seguire ORA) che puntano a infra rimossa: `2026-05-07-master-dd-validation-10min-checklist` (pre-flight `cd` a worktree Ryzen `dazzling-mirzakhani` inesistente), `AGENT_DRIVEN_WORKFLOW` (pre-flight refs `apps/backend/public/phone/` + `tools/web/build_web.sh` + Ryzen Desktop -- tutti GONE; Patterns B/C/D + harness `phone-multi.spec.ts` restano validi), `VERTICAL_SLICE_PLAN` (regression protocol cita `services/rules/` ucciso ADR-2026-04-19 -> `apps/backend/services/combat/`) -> fix pre-flight/protocol o archivia.
  - TKT-STALE-B5-NEEDS-HUMAN -- owner judgment: `2026-04-29-playbook-90min` (playbook web-v1 2-browser, infra live ma pre-Godot-pivot -> run-now status post-cutover), `2026-05-14-phase-b-day-7-formal-closure-prestage` (cascade plan MAI eseguito: no `apps/play.archive/`, web-v1 ancora live, iter5-monitor mai creato -> plan-status).
  - Nota minore (non-drift, fix opzionale): 2 record (`day3-friends`, `browser-smoke-iter5`) linkano ADR inesistente `ADR-2026-05-05-cutover-fase-3-godot.md` (reale = `...-cutover-godot-v2-fase-3-formal.md`); `fase1-ai-sim`/`fase2-batch` pubblicizzano npm target `smoke:ai-sim`/`smoke:batch` assenti (gli script sottostanti girano via path diretto).
  - Nota: 26 dei 29 CURRENT = record storici datati (playtest/calibration logs + 3 JSON harness output) = candidate `doc_status: archived` (esenta dal ciclo stale; flip owner-gated). I 3 living-harness (fase1 ai-sim / fase1 t1.3 browser-sync / fase2 batch-runner) restano `active`.
- **Priorita'**: P3, progressive (sessioni dedicate). Non-blocking (gate verde).

### 🟢 P3 OPEN — ER6 overrun follow-up: fork carry-over + harness entropy (2026-06-11)

Da evidence `docs/reports/2026-06-11-spec-i-er6-overrun-n40-evidence.md` (ratifica `OVERRUN_BUDGET_BONUS=1` as-built, nicchia on-grid <=t8):

- **TKT-ER6-CARRYOVER** (design fork, non bloccante): semantica carry-over del bonus overrun (persiste fino al primo tick spawnabile O spawn-tick immediato al crossing) -> knob significativo in TUTTI i biomi stresswave invece che solo abisso. Richiede nuova N=40 + verdetto master-dd (la ratifica corrente copre l'as-built consume-once).
- **TKT-SIM-PROBE-ENTROPY** (harness reliability): gamba atollo ISO = floor +0.33 tra armi byte-identiche in processi separati (abisso -0.03 pulito) -- entropia process-level non-seedata in un path biome-specifico travolge il paired design. Investigare rng non-seedato (candidati: foodweb/eco path), fixare o documentare. Finche' aperto: ogni N=40 famiglia spec-i-gates-probe riporta il floor della propria gamba e scarta gambe anomale.

### ✅ SHIPPED — Canonical AI-driven playtest (paradigma flip 2026-05-29)

SoT: `docs/process/CANONICAL-AI-PLAYTEST.md` + `docs/playtest/canonical-suite.yaml`. Flip: AI-driven multi-policy (N=40) = gate/oracolo riproducibile; playtest umano = conferma opzionale, mai bloccante. Tooling esistente `tools/py/calibrate_*.py` + `batch_calibrate_*.py`.

**SHIPPED 2026-05-30** (branch `claude/canonical-ai-playtest-harness`): TKT-PLAYTEST-SEED `fd5c050c` + TKT-PLAYTEST-TRIANGULATE `b3ed0430` + TKT-PLAYTEST-SUITE `26387f52`. New: `tools/py/calibrate_policies.py` + `tools/py/playtest_canonical.py`; backend seedable RNG `apps/backend/services/combat/pseudoRng.js`. Smoke verde (backend up): seed bit-identico, banda WR random<greedy~lookahead2<utility, suite --dry-run + live N=10. PR pendente.

| Ticket                   | Scope                                                                                             | Effort | Note                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| TKT-PLAYTEST-SEED        | `--seed` pin RNG nei `batch_calibrate_*.py` per riproducibilita' bit-identica                     | ~2-3h  | gap "ogni volta" (oggi solo statistica N=40, non bit-identica)               |
| TKT-PLAYTEST-TRIANGULATE | wire multi-policy `--policy {random,greedy,lookahead2,utility}` (Restricted-Play, Jaffe 2012)     | ~4h    | stub gia' nel policy doc superseded; output = banda WR non single verdict    |
| TKT-PLAYTEST-SUITE       | `tools/py/playtest_canonical.py` orchestratore summa (manifest -> N=40 parallel -> report datato) | ~4-6h  | smoke-gated (backend up + ~10min). Anti-pattern #9: non shippare non-testato |

### 🟢 MOSTLY CLOSED — intensive fix/tuning audit 2026-05-22 (orphan inventory + balance ratify)

Source: `general-purpose` orphan hunt + `balance-auditor` sweep (2026-05-22). **Ground-truth re-sweep 2026-05-31:** all 4 Gate-5 orphans ✅ DONE (CUMSTATE/WOUNDPERMA/MORALE/VCSNAP wired #2463+earlier) + balance PR #2381 RATIFIED. **Only TKT-P6-AP3 remains open** (decision-gated: document unlock-mechanic vs reduce cost_ap — verified the 5 abilities still `cost_ap: 3` in `data/core/jobs.yaml`, NOT stale).

**Gate-5 backend orphans (Engine-LIVE-Surface-DEAD) — wire-vs-remove decision (NO autonomous delete: project = revive culture):**

| Ticket                | Module                                                     | Verified state                                                                                                                                                                                                                                                                                                                                  | Decision                                                                                                                                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TKT-ORPHAN-CUMSTATE   | `apps/backend/services/combat/cumulativeStateTracker.js`   | ✅ **already wired** (ground-truth 2026-05-30): `sessionRoundBridge.js:1162-1177` calls `updateCumulativeState` per living unit at end-of-round (Phase-7 wire 2026-05-22); consumer `mutationTriggerEvaluator` cases `ally_adjacent_turns`:239 + `trait_active_cumulative`:253 read the written fields. "zero callers" claim was stale (L-075). | ✅ DONE 2026-05-30 — verified end-to-end + regression test `tests/api/sessionCumulativeWire.test.js` (PR `claude/orphan-wiring-wave2`)                                                                                                                                                  |
| TKT-ORPHAN-WOUNDPERMA | `apps/backend/services/combat/woundedPerma.js`             | **write-path orphan** — `applyWound`/`initSessionMap` uncalled; `statusModifiers.js:84` is the live READ path only. Feature half-wired (read live, write dead)                                                                                                                                                                                  | ✅ DONE 2026-05-30 — write-path wired in PR #2463 (`0ff922e4`): `applyWound` on player-wipe (`/end`) + `restoreOnEncounterStart` (`/start`), campaign-keyed `woundedPermaByCampaign` Map; module test `tests/services/woundedPerma.test.js`                                             |
| TKT-ORPHAN-MORALE     | `apps/backend/services/combat/morale.js`                   | P6 feature shipped #1959, never wired to roundOrchestrator                                                                                                                                                                                                                                                                                      | ✅ DONE 2026-05-30 — wired in PR #2463 (`0ff922e4`): crit system (`resolveAttack.is_critical` MoS≥8) routes `enemy_critical_hit` through `checkMorale` + end-of-round `status_panic_high` contagion; `normaliseUnit` preserves `morale_mod`; test `tests/api/sessionMoraleWire.test.js` |
| TKT-ORPHAN-VCSNAP     | `apps/backend/services/coop/vcSnapshotToDebriefPayload.js` | test-only; cross-stack parity scaffold (Godot mirror)                                                                                                                                                                                                                                                                                           | ✅ DONE 2026-05-30 — wired in PR #2463 (`0ff922e4`): `vcSnapshotToDebriefPayload` server-derived into `/end` + `/:id/vc`; test `tests/api/sessionVcDebriefPayload.test.js`                                                                                                              |
| (KEEP)                | `services/replay/replayEngine.js`                          | test-only WIP for documented M12+ replay feature                                                                                                                                                                                                                                                                                                | KEEP (documented future)                                                                                                                                                                                                                                                                |

Note: orphan-agent over-claimed "woundedPerma superseded" — trust-but-verify caught it (read vs write path are different things).

**Balance — PR #2381 RATIFIED 2026-05-26 (no-regression + EV-parity, per L-069):**

- 5× `def_mod=2` cost_ap 1→2 (#2344 baseline remainder) · artigli dice 1d8+3→1d8+2 · armatura buff_duration 4→2 · rage duration 3→2 (cuore_in_furia + midollo_iperattivo) · corazzato elettrico 100→120 (lore sign-off) — all in PR #2381 (merged).
- ✅ **Ratify 2026-05-26** (Ryzen, real Postgres): Fendente EV-parity CONFIRMED deterministically (1d8+2 = 3.25 EV/AP == peer `frusta_fiammeggiante`, was 3.75 outlier). N=40 no-regression: hardcore_06 GREEN in-band (WR 0.25, turns_avg 24.2 == #2149 baseline); hardcore_07 N=40 clean. **Caveat L-069/14**: both hardcore scenarios non-discriminating for these knobs (only `zampe_a_molla` exercised; Fendente/corazzato unused) → N=40 = no-break, not direct knob-WR; accepted given conservative parity/dead-channel nature + deterministic EV proof. Evidence: `docs/playtest/2026-05-26-ratify-2381-balance.md`. Lore sign-off (corazzato elettrico) still master-dd.
- **TKT-P6-AP3**: 5 abilities `cost_ap=3` (frozen_stasis/meteoric_shield/power_strike/sonic_blast/armatura guard) exceed 2 AP/turn budget — flagged in-YAML. Decision: document unlock-mechanic (PT/SG) OR reduce to 2.

**Tooling:** `tools/py/ancestors_style_guide_proposal.py` v1 — completed migration tooling (ancestors/neurons taxonomy, museum-covered domain). NOT a dead dup to delete — repo-archaeologist museum-card candidate (reuse provenance). KEEP.

### 🔵 REUSE-REVIVAL — encounter-authoring CLI (da Fallout Tactics postmortem, archivio Ryzen 2026-05-28)

Source: reuse-queue triage codemasterdd `KNOWLEDGE_MAP.md` §7 (archivio `ryzen-memory-archive/Game-Desktop-old/reference_tactical_postmortems.md`). Unico pattern tattico genuinamente NON costruito tra gli 11 reference archiviati (prova-di-eliminazione: gli altri = backup già assorbito in SoT/code).

| Ticket            | Cosa                                                                                                                                               | Razionale                                                          | Stato                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| TKT-ENCOUNTER-CLI | `game_cli.py author-encounter` — CLI authoring encounter (numeric spec + vertical-slice playtest loop, pattern Fallout Tactics / Micro Forte 2001) | Sblocca volume content-slice M3 (encounter authoring oggi manuale) | OPEN — master-dd verdict (scope M3 vs defer) |

### ✅ Ecosystem audit + ai-station Envelope A+B+C cascade — sessione 2026-05-13/14/15 — 14 PR cross-stack shipped

User trigger 2026-05-13: "analizza col metodo tutta l'infrastruttura Ecosistema > ... > evoluzioni" → ecosystem 7-strati audit (495 LOC) + plan 22 ticket TKT-ECO-XX (730 LOC) → 8 OD raised → vault PR #5 ai-station re-analisi → master-dd direction "finish work, not conservative" → cascade 13 PR shipped cross-stack ~26h delivery.

**Ticket TKT-ECO-XX status post-cascade** (Phase A residue ai-station codemasterdd protocol):

| Ticket                                     | Effort |   Status   | Channel                                                                         |
| ------------------------------------------ | :----: | :--------: | ------------------------------------------------------------------------------- |
| A1 smoke mutations UI                      |  0.5h  |  ✅ DONE   | audit verify (PARTIAL-WIRED finding)                                            |
| A2 verify-only smoke promote               |  0.5h  | ✅ SHIPPED | Game/ #2261                                                                     |
| A3 museum card M-007 post-script           |  0.5h  |  ✅ DONE   | additive update mating_nido card                                                |
| A4 sentience tier backfill 15/15 lifecycle |  5-6h  | ✅ SHIPPED | Game/ #2262                                                                     |
| A4-residue 30 species heuristic            |  3-4h  | ✅ SHIPPED | Game/ #2271 (legacy_yaml_residue → sentience_tier mirror; catalog 53/53 tiered) |
| A5 bioma diff_base + hazard pressure       |   3h   | ✅ SHIPPED | engine #1864 (HP+pressure live) + chip #2366 (debrief Gate-5 surface)           |
| A6 starter_bioma trait                     |   3h   | ✅ SHIPPED | backend recommender + #2334 frontend label (characterCreation biome_label_it)   |
| A7 mating.yaml pack drift                  |   2h   |  ✅ DONE   | gene_slots core → pack sync this session                                        |
| A8 promotions engine Phase B3              |  3-4h  | ✅ SHIPPED | Game/ #2264                                                                     |
| B1-B6 various Envelope B                   |  ~17h  | ✅ SHIPPED | Game/ #2262 + #2263 + #2267 + #2268                                             |
| C1-C7 various Envelope C                   |  ~99h  | 🟡 PARTIAL | Atlas scaffold ✅ Godot v2 #260, runtime gated playtest                         |

**Pillar deltas v40 → v41**:

- P3 Identità: 🟢-cand → 🟢 candidato HARD (PromotionEngine + B3 + B4 + parity)
- P4 Temperamenti: 🟢-cand → 🟢 candidato HARD (sentience 15/15 + 51 neurons + vc_scoring fold)
- P6 Fairness: 🟢 candidato confermato (conviction tactical flags inline)

🟢 hard final: gate = **playtest AI-driven canonico** (multi-policy N=40 in-band, `docs/process/CANONICAL-AI-PLAYTEST.md`). Playtest umano "#2 userland 4 amici" = conferma OPZIONALE, NON bloccante (flip 2026-05-29). Synthetic baseline shipped #2266 (P3 🟡 + P4 🟢 + P6 🟢 con 30 sessions).

**Anti-pattern killer milestone**: cross-validation L7c Promotions ORPHAN claim FALSE NEGATIVE → museum discard card [M-2026-05-13-001](docs/museum/cards/promotions-orphan-claim-discarded.md) + lessons codify per Explore agent inventory.

**Source ref**: PR #2260 audit + plan + 13 PR cascade + COMPACT_CONTEXT v41 + governance file `docs/governance/open-decisions/OD-024-031-verdict-record.md`.

---

### ✅ Ticket coda master-dd verdict batch 2026-05-11 — 11 decisioni resolved cascade

User verdict cascade 11 decisioni outstanding (4 ADR PROPOSED + 6 OPEN_DECISIONS + 1 forbidden path). All ACCEPT modulo C5 (status quo flag-OFF).

**Verdict summary table** (11 verdicts → 4 PR autonomous cascade):

| #   | ID  | Topic                                                    | Verdict                          | Action shipped                                                                                                       |
| --- | --- | -------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | A1  | 2 T3 species ship + circolazione_supercritica tier T1→T3 | ACCEPT both + tier fix           | PR 2 impl                                                                                                            |
| 2   | A2  | Triangle Strategy sequenza M14-A → M14-B → M15           | ACCEPT sequenza                  | PR 4 scope ticket §1-3                                                                                               |
| 3   | A3  | Rewind safety valve IMPLEMENT ora                        | ACCEPT impl ora                  | PR 4 scope ticket §4                                                                                                 |
| 4   | A4  | P2 Brigandine seasonal PROMUOVI priorità M14             | ACCEPT promotion M12+ → M14      | PR 4 scope ticket §5                                                                                                 |
| 5   | B1  | V6 UI TV dashboard polish PROATTIVO ora                  | ACCEPT proattivo                 | SHIPPED 2026-05-11 — 4 polish edits style.css (1920px TV mode + .player-active pulse + CTA contrast + icon min size) |
| 6   | C1  | AngularJS Vue 3 trait-editor migration                   | ACCEPT Path C Vue 3              | PR 1 ADR ACCEPTED + PR 4 §7                                                                                          |
| 7   | C2  | ADR mutation Phase 4 auto-trigger                        | ACCEPT (status flip)             | PR 1 ADR ACCEPTED                                                                                                    |
| 8   | C3  | species_expansion Path B canonical migration             | ACCEPT Path B variant trait_plan | PR 1 ADR ACCEPTED + PR 3 impl                                                                                        |
| 9   | C4  | mutation Phase 6 forbidden path bundle GRANT             | ACCEPT scoped                    | SHIPPED 2026-05-11 — Prisma 0009 + mutation_trigger schema + evaluator 12/12 + cumulativeStateTracker + 10 test      |
| 10  | C5  | Game-Database HTTP runtime flag-OFF                      | STATUS QUO confermato            | PR 1 OD-004 status flip                                                                                              |
| 11  | C6  | Balance & Economy Tuning skill install                   | ACCEPT install ora               | install-doc 2026-05-11 (master-dd manual) — vedi `docs/planning/2026-05-11-tkt-c6-skill-install-instructions.md`     |

**Cumulative effort scoped per future sessions**: ~70-90h (TKT-M14-A 12h + TKT-M14-B 13h + TKT-M15 10h + TKT-P6 5-7h + TKT-P2 20h + TKT-B1 3-5h + TKT-C1 8-12h + TKT-C4 3-5h + TKT-C6 30min).

**Source ref**: master-dd verdict batch 2026-05-11 + scope ticket bundle `docs/planning/2026-05-11-big-items-scope-tickets-bundle.md` + OPEN_DECISIONS OD-002/003/004/005/014/015 status flip.

---

### ✅ Sprint Q+ Q-10 closure + trait orphan ASSIGN-A FULL CLOSURE — sessione 2026-05-10 notte — 5 PR shipped (cumulative Day 5+1+2 = 76 PR)

User resume trigger "verifica PR #217 Game-Godot-v2 master-dd review status + merge se verde — chiude Sprint Q+ Q-10 cross-stack 12/12" → autonomous closure cascade ~2h.

**5 PR shipped delta v37→v38**:

| #   | PR                                                              | Squash     | Topic                                                                             |
| --- | --------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| 1   | [#217](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/217) | `b53f67c7` | Sprint Q+ Q-10 — fix RefCounted add_child + gdformat 2 file (CI red → green)      |
| 2   | [#2207](https://github.com/MasterDD-L34D/Game/pull/2207)        | `849476d7` | Skiv-monitor auto-update admin merge                                              |
| 3   | [#2197](https://github.com/MasterDD-L34D/Game/pull/2197)        | `019881b3` | Cautious baseline 3rd empirical data point                                        |
| 4   | [#2213](https://github.com/MasterDD-L34D/Game/pull/2213)        | `6b5f871e` | Trait orphan ASSIGN-A wave 5+6 — 33 traits / 17 species → 68/91                   |
| 5   | [#2214](https://github.com/MasterDD-L34D/Game/pull/2214)        | `16e068a7` | Trait orphan ASSIGN-A wave 7 species*expansion — 26 traits / 14 sp*\* → **94/91** |

**Sprint Q+ cross-stack 12/12 CHIUSO**: Q-10 PR #217 fix shipped commit `2d0e4f4` (RefCounted add_child + gdformat) → CI 1974/1974 green → master-dd squash merged.

**Trait orphan ASSIGN-A FULL CLOSURE**: 14+6+15+33+26 = **94/91 effective** (target 91 + 3 wave 0+1 silent recovery − 2 T3 unmappable). Wave 7 schema decision: additive `trait_plan` parallel section alongside `morph_slots` in species_expansion.yaml, validator reads optional. Schema canonical migration ADR (morph_slots → trait_plan) **deferred master-dd**.

**Pillar deltas v38**:

- P3 Identità Specie × Job: 🟢++ → **🟢ⁿ confermato** (94 trait orphan player-visible cross-yaml additive)
- Altri invariati post-v37

**Outstanding master-DD action queue** (post-FULL-CLOSURE):

1. Phase B Day 8 verify 2026-05-14 (γ default ratificato, 14gg grace)
2. 2 T3 trait residue (`antenne_plasmatiche_tempesta` + `circolazione_supercritica`) — gated T3-capable species creation lore
3. species_expansion canonical migration ADR formal (morph_slots → trait_plan)
4. Mutation Phase 6 ADR + Prisma migration 0009+ (forbidden path bundle ~3-5h)
5. Vite/Vitest 5/2 → 6/3 major upgrade cross-3-apps (~3-5h, autonomous-actionable next session)
6. AngularJS migration ADR (~10-20h apps/trait-editor)
7. AUTODEPLOY_PAT renewal expires 2026-08-08 (90gg)
8. Worktree disk lock 5 dirs cleanup (reboot Claude Code)

---

### ✅ FULL Sprint Q+ closure + close-gaps cascade — sessione 2026-05-10 sera continuation — 20 PR shipped (cumulative Day 5+1+2 = 71 PR)

User cascade trigger: "cascade approval" → "facciamo gli auto trigger pending e poi continuiamo con i due next gate in parallel" → "procedi continuando in autonomia" → "3+4 e dopo facciamo 2+1" → power-out resume → "fai i rituali e tutti i passaggi senza tralasciare niente per continuare questa sessione in una nuova con tutto pronto".

**20 PR sera delta v36→v37**:

| #   | PR                                                              | Squash     | Topic                                                                                 |
| --- | --------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| 1   | [#2195](https://github.com/MasterDD-L34D/Game/pull/2195)        | `089cea2e` | V9+V10 reentry audit + C delete batch (3/4) + BACKLOG corrections                     |
| 2   | [#2196](https://github.com/MasterDD-L34D/Game/pull/2196)        | `299f9700` | QA reports regen post-#2195                                                           |
| 3   | [#2198](https://github.com/MasterDD-L34D/Game/pull/2198)        | `898d4968` | Phase B ACCEPTED Path γ default — master-dd verdict 2026-05-10                        |
| 4   | [#2199](https://github.com/MasterDD-L34D/Game/pull/2199)        | `e231423a` | Trait orphan ticket codification post-V10                                             |
| 5   | [#2200](https://github.com/MasterDD-L34D/Game/pull/2200)        | `862dde8b` | Sprint Q+ Q.A — Q-1 schema + Q-2 migration Offspring                                  |
| 6   | [#2201](https://github.com/MasterDD-L34D/Game/pull/2201)        | `f8f37904` | Sprint Q+ Q.B — Q-3 propagateOffspringRitual + Q-4 HTTP API + Q-5 bridge              |
| 7   | [#2202](https://github.com/MasterDD-L34D/Game/pull/2202)        | `41778bd1` | Sprint Q+ Q.C — Q-7 validator + Q-8 workflow gate                                     |
| 8   | [#2203](https://github.com/MasterDD-L34D/Game/pull/2203)        | `7092c24e` | Sprint Q+ Q-9 — Offspring Ritual UI surface DebriefView                               |
| 9   | [#2204](https://github.com/MasterDD-L34D/Game/pull/2204)        | `bdf16717` | Sprint Q+ Q.E — Q-11 E2E test + Q-12 closure ADR                                      |
| 10  | [#2205](https://github.com/MasterDD-L34D/Game/pull/2205)        | `df87a4b5` | npm audit C surgical — trait-editor semver fix                                        |
| 11  | [#2206](https://github.com/MasterDD-L34D/Game/pull/2206)        | `86ec898b` | trait orphan A=keep biome-aligned assignment proposal                                 |
| 12  | [#2208](https://github.com/MasterDD-L34D/Game/pull/2208)        | `61042522` | trait orphan ASSIGN-A wave 0+1 — 14 traits / 12 species                               |
| 13  | [#2209](https://github.com/MasterDD-L34D/Game/pull/2209)        | `e189f4e4` | trait orphan ASSIGN-A wave 2 DEFENSIVE — 6 traits / 6 species                         |
| 14  | [#2210](https://github.com/MasterDD-L34D/Game/pull/2210)        | `9c065375` | trait orphan ASSIGN-A wave 3+4 STATUS+SENSORY — 15 traits / 9 species                 |
| 15  | [#2211](https://github.com/MasterDD-L34D/Game/pull/2211)        | `25c124fc` | BACKLOG sync + ajv-cli investigation closure                                          |
| —   | [#217](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/217) | ✅ merged  | Game-Godot-v2 Q-10 OffspringRitualPanel + service (MERGED 2026-05-10, L-075 re-sweep) |

(5 PR pre-cascade sera già contati in v36 cascade L3 section sotto.)

**Sprint Q+ 12/12 ship state**:

- Q-1 ✅ schema lineage_ritual.schema.json (#2200)
- Q-2 ✅ Prisma migration 0008_offspring (#2200)
- Q-3 ✅ propagateOffspringRitual engine (#2201)
- Q-4 ✅ HTTP API 4 endpoints lineage (#2201)
- Q-5 ✅ bridgeOffspringRitualOnChoice (#2201)
- Q-6 ✅ mutationsLoader + canonical YAML (#2201)
- Q-7 ✅ swarm_canonical_validator.py (#2202)
- Q-8 ✅ swarm-validation.yml workflow gate (#2202)
- Q-9 ✅ DebriefView UI surface (#2203)
- Q-10 ✅ Godot v2 OffspringRitualPanel + service ([#217](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/217) MERGED 2026-05-10 — stale ⏳ closed in 2026-05-31 re-sweep, L-075)
- Q-11 ✅ offspringRitualE2E.test.js (#2204)
- Q-12 ✅ ADR-2026-05-10 closure (#2204)

**Effort actual ~3.5h Game-side vs ~19-21h estimated** (5-6x faster spec pre-stage + agent paralleli + cascade autonomous L3).

**Trait orphan ASSIGN-A waves 0-4**: 35/91 (38%) shipped. Residue 56:

- Wave 5+6 ~28 traits master-dd review TBD biome mapping
- Species*expansion schema ~28 traits 8 sp*\* species (morph_slots vs trait_plan extension)

**Phase B**: ACCEPTED Path γ default 2026-05-10 sera (#2198). Formal grace closure 2026-05-14.

**Pillar deltas v37**:

- P2 Evoluzione 🟢++ → 🟢ⁿ (offspring ritual cross-encounter lineage propagation LIVE cross-stack)
- P3 Identità Specie × Job 🟢ⁿ → 🟢++ confermato (39 trait abilities + 35 trait orphan player-visible)
- P5 Co-op vs Sistema 🟢 → 🟢++ (zero regression validated)

**Anti-pattern killer**: Engine LIVE / Surface DEAD pattern dominante (museum M-2026-04-25-007 mating engine orphan score 5/5 diagnostico 2026-04-25) → offspring ritual cross-stack ship 2026-05-10 (16gg gap closure).

**Outstanding master-DD action queue** (next session ready):

1. ~~Q-10 Godot v2 #217 review~~ ✅ DONE (#217 MERGED 2026-05-10 — closed in 2026-05-31 re-sweep, L-075)
2. Phase B Day 8 verify 2026-05-14 (γ default ratificato, monitor zero regression)
3. Wave 5+6 trait orphan biome mapping ~28 traits (~30min single-shot)
4. Species*expansion schema decision ~28 traits 8 sp*\* (~1h ADR)
5. Mutation Phase 6 ADR + Prisma migration 0009+ (forbidden path bundle ~3-5h)
6. Vite/Vitest major upgrade bundle (~3-5h cross-3-apps)
7. AngularJS migration ADR (~10-20h apps/trait-editor replace)
8. AUTODEPLOY_PAT renewal expires 2026-08-08 (90gg)
9. Worktree disk lock 5 dirs cleanup (reboot Claude Code)

---

### ✅ Cascade L3 autonomous + Phase 5 partial + npm audit + MC build PAT E2E — sessione 2026-05-10 sera — 10 PR shipped (cumulative Day 5+1+2 = 51 PR)

User resume trigger "cascade approval" → "facciamo gli auto trigger pending e poi continuiaimo con i due next gate in parallel" → "procedi continuando in autonomia". Cascade ~5h cumulative post-FULL-AUDIT-CLOSURE (41 PR pre-conv).

| #   | PR                                                       | Squash     | Topic                                                                       |
| --- | -------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| 1   | [#2185](https://github.com/MasterDD-L34D/Game/pull/2185) | _silent_   | V13 trait_native pseudo-job 39 abilities + jobs route filter pseudo         |
| 2   | [#2186](https://github.com/MasterDD-L34D/Game/pull/2186) | `6bbcaae7` | V6 Sprint Q+ FULL scope codification post-Phase-B (12 ticket Q-1 → Q-12)    |
| 3   | [#2184](https://github.com/MasterDD-L34D/Game/pull/2184) | `f9a9e282` | Workflow bundle V1+V17 — MC build PR-based + nightly NIT-1 + Codex 5 rounds |
| 4   | [#2187](https://github.com/MasterDD-L34D/Game/pull/2187) | `1b42d18f` | Cascade L3 pre-merge audit + Phase B accept ADR §13 stub                    |
| 5   | [#2188](https://github.com/MasterDD-L34D/Game/pull/2188) | `e50c49ca` | MC build auto-deploy dist (PAT validation E2E) — first cascade auto-PR live |
| 6   | [#2189](https://github.com/MasterDD-L34D/Game/pull/2189) | `6dcf2983` | Sprint Q+ Q.A pre-stage bundle (Q-1 schema + Q-2 migration + Day 8 fill)    |
| 7   | [#2190](https://github.com/MasterDD-L34D/Game/pull/2190) | `7f8dd93b` | Sprint Q+ Q.B+Q.C+Q.D+Q.E spec extension (Q-3 → Q-12 full pipeline)         |
| 8   | [#2191](https://github.com/MasterDD-L34D/Game/pull/2191) | `f3576a90` | npm audit fix 27 → 9 vulnerabilities (18 fixed semver-compat)               |
| 9   | [#2193](https://github.com/MasterDD-L34D/Game/pull/2193) | `d43b29d6` | Mutation Phase 5 partial 10/12 + terrain flaky 12→30 iters bundle           |

**Browser ops master-dd autonomous (Chrome MCP)**:

- Azione 1 ✅ AUTODEPLOY_PAT secret created — fine-grained PAT 4 permissions (Actions+Contents+Metadata+PR r+w), repo Game only, expiration 2026-08-08 (90gg). End-to-end via Chrome MCP (sudo OTP master-dd, scopes + repo selection + permissions + token gen + clipboard paste autonomous).
- Azione 2 ✅ Skiv Monitor toggle verified done (Settings → Actions → workflow permissions allow create/approve PR già checked).

**MC build workflow E2E validation**:

- Workflow_dispatch run [25629460120](https://github.com/MasterDD-L34D/Game/actions/runs/25629460120) SUCCESS post-PAT setup
- Auto-PR #2188 creato `auto/mission-console-dist-2026-05-10-1304` con labels `automation` + `auto-merge-l3-candidate` ✅
- PAT path active (no fallback dispatch fired)
- Native CI `pull_request` event fired (no recursion guard issue)
- Cascade L3 7-gate verification verde + auto-merge naturale

**Mutation Phase 5 partial (10/12 kinds)**:

- ally_killed_adjacent: kill events + position adjacency Manhattan ≤1 + species_filter
- assisted_kill_count: assist event filter actor_id (assist events già emessi via emitKillAndAssists SPRINT_003)
- 8 tests new tests/services/mutationTriggerEvaluatorPhase5.test.js
- Residue 2/12 deferred Phase 6 (Prisma migration 0008+/0009+): ally_adjacent_turns + trait_active_cumulative

**Codex iter cycle PR #2184 (5 rounds)**:

- Round 1 P1: GITHUB_TOKEN recursion guard → PAT chain + dispatch fallback
- Round 2 P2+P3: missing L3 label + PAT marker scope → label create + step output
- Round 3 P2: ci.yml lacks workflow_dispatch → + workflow_dispatch + validation
- Round 4 P2: DISPATCH_FAILURES exit 0 → exit 1 + ::error
- Round 5: "Delightful! No major issues" 🟢

**BACKLOG closure**:

- TKT-NIGHTLY-WORKFLOW-NIT-1 ✅ chiuso (PR #2184 top-level env LOBBY_WS_PORT)
- TKT-NIGHTLY-WORKFLOW-NIT-3 ✅ verified pre-shipped #2155
- **TKT-TERRAIN-FLAKY** ✅ chiuso (5/5 PASS reproduce post-fix shipped 12→30 iters già live, pre-fix-discovery stale entry)
- **TKT-TERRAIN-FLAKY-2** (fire channel attack on normal tile + acqua + lightning + ghiaccio) ✅ shipped fix bundled in PR #2193

**Pillar deltas**: P3 Identità Specie × Job 🟢ⁿ → 🟢++ (39 trait abilities runtime live).

**Outstanding master-dd action items** (non-blocking):

- Phase B Day 8 verdict (2026-05-14): ADR-2026-05-05 §13.3 fill template ready (γ default automatic ~5min compile OR α full social ~30min)
- Sprint Q+ kickoff cascade post-§13.3 commit: Q-1 + Q-2 spec ready ship cascade autonomous (~3h)
- Sprint Q+ Q.B → Q.E full pipeline spec ready (~21-23h post-Q.A merge)

**Pre-existing residue master-dd** (deferred):

- 9 npm audit residue (--force breaking changes)
- Mutation Phase 6 (ally_adjacent_turns + trait_active_cumulative) — Prisma migration ADR
- Lifecycle 5-fasi YAML 5 T4 species (design gate)
- ⚠️ BACKLOG correction 2026-05-10 sera (V9 audit reentry): "ancestors 297 zero runtime consumer" era WRONG. **290/297 traits LIVE (97%)** — 3 runtime consumers wired (passiveStatusApplier + evaluateMovementTraits + passesBasicTriggers). Solo 18 branch metadata categories unconsumed. Vedi [docs/research/2026-05-10-ancestors-297-reentry-audit.md](docs/research/2026-05-10-ancestors-297-reentry-audit.md) + museum card [M-2026-05-10-001 ancestors-297-orphan](docs/museum/cards/ancestors-297-orphan-2026-05-10.md). Path A biome seeder ~3h raccomandato future activation.
- ⚠️ Trait orphan count drift (V10 audit reentry): BACKLOG diceva 59 — **reality 109 core orphans** post waves 1-6 (active_effects.yaml 499 totali). C delete batch 3/4 shipped (agent false positive wounded_perma verified actively wired statusModifiers.js). Residue: A keep 91 + B defer 14 master-dd review window. Vedi [docs/research/2026-05-10-trait-orphan-audit-batch-review.md](docs/research/2026-05-10-trait-orphan-audit-batch-review.md).

#### Trait orphan ticket codification 2026-05-10 sera (master-dd verdict "2+3" cascade approval)

- **TKT-P3-TRAIT-ORPHAN-ASSIGN-A** (~4h initial → 35/91 shipped sera close-gaps cascade): 91 A-keep traits assignment to species wave 6. Biome-aligned batch (3-4 traits per new species). Audit table reference: [§1 Wave 0-6 listing](docs/research/2026-05-10-trait-orphan-audit-batch-review.md#1-full-audit-table--109-orphan-traits).
  - ✅ **Wave 0+1 SHIPPED PR #2208** `61042522` — 14 traits / 12 species (8 species_expansion deferred schema mismatch).
  - ✅ **Wave 2 SHIPPED PR #2209** `e189f4e4` — 6 traits / 6 species (7 species_expansion deferred).
  - ✅ **Wave 3+4 SHIPPED PR #2210** `9c065375` — 15 traits / 9 species.
  - ✅ **Wave 5+6 SHIPPED PR #2213** `6b5f871e` — 33 traits assigned (stale ⏳ closed 2026-05-31 re-sweep, L-075).
  - ✅ **Species_expansion schema extension SHIPPED**: wave 7 assign PR #2214 `16e068a7` (26 traits, additive `trait_plan` section) + canonical migration PR #2237 `79c780b6` (`morph_slots → trait_plan`, ADR #2230). Stale ⏳ closed 2026-05-31 re-sweep.

**Cumulative ASSIGN-A progress — FULL CLOSURE** (corrected 2026-05-31 re-sweep): **94/91 effective** across PRs #2208+#2209+#2210+#2213+#2214 (14+6+15+33+26). The "35/91 (38%) residue 56 deferred" snapshot was stale ⏳ lag (L-075) — superseded by the FULL CLOSURE block above. Only the `morph_slots → trait_plan` schema-canonical migration ADR is master-dd-deferred (migration itself shipped #2237).

#### Cluster C ajv-cli investigation closure (2026-05-10 sera close-gaps)

**STUCK upstream**: ajv-cli 5.0.0 = latest stable npm registry (verified `npm view ajv-cli versions` 27 versions, 5.0.0 latest 5.x). Audit `fixAvailable: 0.6.0` = downgrade weird signal. fast-json-patch 3.1.1 latest = upstream still vulnerable.

**Same pattern Cluster A AngularJS**: NO upstream patch. Solo paths:

1. Wait upstream patch (indefinite)
2. Replace ajv-cli con direct ajv invocation in `tools/ajv-wrapper.sh` (~30min refactor)
3. Accept residue (low impact: dev tool only, NOT runtime)

**Recommendation**: option 3 accept residue. Used solo via Makefile EVO_VALIDATE_AJV + schema-validate.yml workflow (dev validation, NOT prod runtime).

TKT-DEPS-AJV-CLI-INVESTIGATE ✅ closed (no actionable fix).

- **TKT-P6-TRAIT-ORPHAN-DESIGN-B** (~2h): 14 B-defer traits design call. Categorization audit doc:
  - Swarm cluster (3): `magnetic_rift_resonance` + `magnetic_sensitivity` + `rift_attunement` — non-canonical status strings (telepatic_link/sensed/attuned), need ADR canonical status enum extension OR rename
  - Miscellaneous unclear semantics (5): `aura_glaciale` + `sussurro_psichico` + `tela_appiccicosa` + `marchio_predatorio` + `antenne_wideband` — design call effect spec
  - Balance tuning (2): `mente_lucida` (panic 2t MoS≥3 troppo low threshold) + `cervello_predittivo` (stunned 2t T3 no T3 species slot)
  - Evaluator gap (2): `biochip_memoria` (`requires_target_status` not implemented in traitEffects.js) + others
  - Trigger: Sprint M-future window OR bundle Sprint Q+ Q.B per shared evaluator extension
- **TKT-P6-TRAIT-MECHANICS-SYNC** (~1h): add subset A-class traits to `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` (wave 1-3 families currently missing balance values). Trigger parallel TKT-P3-A.

Effort cumulative residue ~7h (4h A + 2h B + 1h mechanics sync) post-Sprint-Q+ window.

### ✅ FULL AUDIT CLOSURE — sessione 2026-05-10 — 27 PR shipped main (cumulative Day 5+1 = 41 PR)

User canonical resume trigger 2026-05-09 sera "verifica primo nightly cron run 2026-05-10 02:00 UTC". Cascade autonomous ~12h waves 7-19 chiude:

**17/17 cross-domain audit ticket addressed**:

- 15 shipped runtime/data
- 2 docs (ADR + handoff)
- 0 verdict residue

**13/13 master-dd user-explicit verdict closed**:

- A1-A4 Mission Console (install + bond toast + CI workflow + ADR)
- B1-B3 Mutation (Prisma migration + manual fill + manual_only)
- C1-C2 Trait (B4 YELLOW + heal handler new kind)
- D ship 5 T4 species sequenziali (T4=0→5 LADDER COMPLETE)
- F1-F3 (nightly NIT + terrain flaky + ancestors research+Path B)

**T4 ladder COMPLETE 5/5**:

- Apex electromanta_abyssalis (frattura_abissale_sinaptica)
- Keystone symbiotica_thermalis (dorsale_termale_tropicale)
- Threat sonaraptor_dissonans (canopia_ionica)
- Bridge psionerva_montis (caldera_glaciale)
- Playable fusomorpha_palustris (palude)

**Major findings**:

1. Mission Console source recovered (git commit 42d1d6f3) — ADR-2026-05-10 supersede
2. Mutation Phase 1+2+3+4 evaluator runtime + 12 kinds whitelist (8/12 implemented)
3. Heal kind canonical wired (effect.kind=heal hp_delta dice rolls)
4. Cron P0 caught T-7h pre-fire (WS port + set+e bugs)
5. F3 ancestors corrected — naming migration docs (290/297 already in AE)

**Pillar deltas**: P1 🟢, P2 🟢++, P3 🟢++, P4 🟢++, P5 🟢, P6 🟢.

**Residue deferred non-blocking**:

- Mutation Phase 5 stub kinds (4: ally_killed_adjacent, ally_adjacent_turns, assisted_kill_count, trait_active_cumulative)
- Aggregate update logic cumulative_biome_turns (end-of-encounter increment) -- write-side ORFANO; pre-req CONDIVISO: mutazioni-bioma (read-side live `mutationTriggerEvaluator.js:168-175`) + eventuale #1673 BiomeMemory (riuso contatore per-unita x per-bioma, NON nuova tabella; vedi museum M-2026-04-25-011)
- Lifecycle 5-fasi YAML 5 T4 species (master-dd design gate)
- Sprite assets 5 T4 species (skipped verdict #D)
- npm audit fix 18 vulnerabilities

### ✅ Nightly cron P0 fix + scenario diversity sweep harness extension — sessione 2026-05-09 sera→2026-05-10 — 3 PR shipped + 1 DRAFT

Resume trigger user "verifica primo nightly cron run 2026-05-10 02:00 UTC + esegui scenario diversity sweep aggressive default × enc_tutorial_02..05 + hardcore-\*". P0 caught a T-7h pre-prima cron + harness gap discovered.

| #   | PR                                                       | SHA                  | Topic                                                                          |
| --- | -------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| 1   | [#2155](https://github.com/MasterDD-L34D/Game/pull/2155) | `48eaf24a`           | nightly cron P0 — WS port 3334 vs 3341 split + `set +e` regression-detection   |
| 2   | [#2152](https://github.com/MasterDD-L34D/Game/pull/2152) | `5466cf45`           | Skiv Monitor auto-update admin merge (canonical pattern)                       |
| 3   | _label create_                                           | _direct_             | `ai-sim-regression` + `automated` labels create (3rd P0 surfaced via dispatch) |
| 4   | [#2156](https://github.com/MasterDD-L34D/Game/pull/2156) | DRAFT → ready-review | scenario diversity sweep harness YAML loader opt-in (master-dd verdict gated)  |

**N=40 verify dispatch [#25609294902](https://github.com/MasterDD-L34D/Game/actions/runs/25609294902)**: ✅ CLEAN — completion 100% × 3 profile, drift ±10pp tolerance, aggressive avg_rounds 24.2 = PR #2149 baseline exact.

**Cumulative Day 5 + 2026-05-10 closure** = 15 PR Game/ shipped main (#2140-#2151 + #2153 + #2155 + #2152) + 1 PR open (#2156).

**Codex P2 review #2156 addressed (commit `072d3e38` + `b3ee75ea`)**:

- P2 #1 grid sizing: `pickModulationForGrid()` mapping YAML grid_size edge → preset deployed count (`solo`/`trio_mid`/`duo_hardcore`) → backend allocates grid coerente
- P2 #2 objective whitelist: `SUPPORTED_OBJECTIVE_TYPES = [elimination, survival]` — escort/capture_point/etc throw + graceful fallback synthetic
- NIT 2 (self-review #2155): WS_URL scheme validation `/^wss?:\/\//`

### Cross-domain gap inventory 2026-05-10 — 4 audit paralleli (trait + form/morph/mutation + MBTI×Job + Ennea)

User trigger "ci sono altri gap nei trait, parti, morph, MBTI×Job, Ennea?". 4 balance-auditor + creature-aspect-illuminator agents audit paralleli. Findings consolidated:

#### P0 — 3 critical

| Ticket                   | Gap                                                                                                                                              | Domain   | Effort |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | :----: |
| **TKT-MUT-AUTO-TRIGGER** | 30/30 mutations `trigger_examples` prose-only — backend ZERO trigger evaluator (biome turn / kill streak / Sistema pressure auto-unlock 0% impl) | Mutation | ~5-8h  |
| **TKT-MBTI-JOB-VOCAB**   | mbti_forms `job_affinities` usa role-archetypes ("tattico"/"guaritore") vs canonical job IDs ("skirmisher"/"vanguard") — **0/176 combo resolve** | MBTI×Job |  ~2h   |
| **TKT-MBTI-EXP-JOBS**    | 4 expansion jobs (stalker/symbiont/beastmaster/aberrant) assenti da mbti_forms — 64/176 = 36% unaddressed                                        | MBTI×Job |  ~1h   |

#### P1 — 8 moderate

| Ticket                           | Gap                                                                                                          | Domain    | Effort |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------- | :----: |
| **TKT-ENNEA-1-5-DOUBLE-TRIGGER** | Riformatore(1)+Architetto(5) co-fire double `attack_mod +1` buff (no dedup in resolveEnneaEffects)           | Ennea     | ~30min |
| **TKT-ENNEA-METRICS-FALLBACK**   | `assists`/`low_hp_time` 0 in solo scenario → ennea trigger silent no-op (calibration risk)                   | Ennea     |  ~1h   |
| **TKT-MUT-CIRCULAR-SWAP**        | `simbionte_batteri_termofili` tier 3 `trait_swap.add: [batteri_endosimbionti_chemio]` = proprio prereq trait | Mutation  | ~10min |
| **TKT-BOND-HUD-SURFACE**         | bondReactionTrigger.js wired session response ma ZERO HUD player-visible (Gate 5 engine LIVE / surface DEAD) | Companion |  ~3h   |
| **TKT-SKIV-COMPANION-SERVICE**   | skiv_archetype_pool.yaml generativo unwired (`companionService.js` absent)                                   | Companion |  ~3h   |
| **TKT-MBTI-AFFINITY-RUNTIME**    | personalityProjection.job_affinities NO runtime wire (vcScoring NOT consume mbti_forms)                      | MBTI×Job  |  ~3h   |
| **TKT-TRAIT-MECH-NO-HANDLER**    | 31 traits in trait_mechanics.yaml hanno PT cost + damage tuned ma ZERO active_effects handler (dead economy) | Trait     | ~5-8h  |
| **TKT-TRAIT-EFFECT-KIND-MISS**   | 4 active_effects traits hanno `effect.kind` senza handler (`wounded_perma persistent_marker` novel kind)     | Trait     | ~1-2h  |

#### P2 — 6 minor

| Ticket                      | Gap                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| TKT-SKIV-ENNEA-ARCHETYPE    | `skiv_archetype_pool.yaml` 0/9 Ennea archetype assignments per biome pool                        |
| TKT-FORMPACK-EXP-JOB-BIAS   | `form_pack_bias.yaml job_bias` missing 3 expansion job slugs → silent [E,I] fallback             |
| TKT-ANCESTORS-CONSUMER      | `data/core/ancestors/` 297 proposal entries zero runtime consumer (proposal-only files inert)    |
| TKT-VCSCORING-ITER2-DEFAULT | iter2 E_I + S_N axis full coverage gated env flag `VC_AXES_ITER=2` (default partial < 30 events) |
| TKT-TRAIT-ORPHAN-ACTIVE     | 59/168 active_effects mai referenziati in code/data/scenario (no assignment path)                |
| TKT-TRAIT-AE-GLOSSARY-MISS  | 7 active_effects IDs senza glossary entry (no display name/description se UI surface)            |

**Aggregate effort**: P0+P1 ~22-27h × 11 ticket. P2 ~5-8h × 6 ticket. **Total ~27-35h cross-domain**.

**Engine LIVE / surface DEAD pattern hits Gate 5 — 3 ticket P0/P1 violation pervasive**:

- TKT-MUT-AUTO-TRIGGER (mutation engine sans trigger evaluator)
- TKT-BOND-HUD-SURFACE (bond reaction sans HUD)
- TKT-SKIV-COMPANION-SERVICE (skiv pool sans generative service wire)

### Deferred follow-up tickets (post-Codex review #2156)

| Ticket                             | Scope                                                                                                                                                                        |         Effort          | Trigger                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------: | ------------------------------------------------------------ |
| **TKT-SWEEP-MULTI-WAVE**           | extend `buildEnemiesFromYaml` a wave_id>1 turn_trigger handling (worker drives reinforcement spawn via session/round events)                                                 |          ~2-3h          | post-merge #2156 + sweep signal positivo su wave_id=1        |
| **TKT-SWEEP-ESCORT-TARGET**        | spawn `objective.escort_target` unit + extend `selectPlayerAction` a escort-protect policy                                                                                   |           ~2h           | post merge multi-wave OR if master-dd richiede escort sweep  |
| **TKT-SWEEP-CAPTURE-CAMP**         | extend `selectPlayerAction` a capture-point camp tile policy + tile occupancy detection                                                                                      |          ~2-3h          | post merge multi-wave OR if master-dd richiede capture sweep |
| **TKT-ENCOUNTER-T03-T05**          | crea YAML enc_tutorial_03/04/05 (PCG generation OR designer-authored) — pressure_start 50/75/95 progression                                                                  | ~3-5h design + ~1h YAML | post sweep harness validated + designer assigned             |
| **TKT-SWEEP-HARDCORE-PATH**        | bootstrap path harness per `apps/backend/services/hardcoreScenario.js` programmatic scenarios (separate da YAML loader)                                                      |          ~3-4h          | post sweep YAML loader validated                             |
| **TKT-SWEEP-PER-UNIT-PROFILE**     | `AI_SIM_USE_YAML_PROFILE=1` flag opt-in per granular per-wave ai_profile vs sweep override globale                                                                           |         ~30min          | low priority, design call gate                               |
| ~~**TKT-NIGHTLY-WORKFLOW-NIT-1**~~ | ✅ CHIUSO 2026-05-10 (workflow bundle PR) — top-level env `LOBBY_WS_PORT: '3341'` + step env reference `${{ env.LOBBY_WS_PORT }}`                                            |            —            | —                                                            |
| ~~**TKT-NIGHTLY-WORKFLOW-NIT-3**~~ | ✅ CHIUSO 2026-05-10 (verified shipped PR #2155 lines 124-127, comment block check-thresholds.js exit-code contract già canonical)                                           |            —            | —                                                            |
| ~~**TKT-TERRAIN-FLAKY**~~          | ✅ CHIUSO 2026-05-10 — reproduce 5/5 PASS verifica autonomous post-cascade. Fix 12→30 iters già shipped (test line 128-131 commento). Stale BACKLOG entry pre-fix-discovery. |            —            | —                                                            |

### ✅ K4 Approach B + 4 task autonomous closure — sessione 2026-05-09 sera — 4 PR shipped

K4 follow-up cycle complete + 3 task scaling parallel. Resume trigger user "leggi handoff PR #2148, esegui Option A K4 Approach B" + escalation "3+5+esegui FASE 1 T1.3" + grant esplicito `.github/workflows/`.

| #   | PR                                                       | SHA        | Topic                                                                          |
| --- | -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| 1   | [#2149](https://github.com/MasterDD-L34D/Game/pull/2149) | `e608ddd8` | K4 Approach B commit-window guard 100% WR N=40 (+10pp vs K3 baseline 90%)      |
| 2   | [#2150](https://github.com/MasterDD-L34D/Game/pull/2150) | `94dabd95` | Swap default aggressive profile → utility ON + commit_window 2                 |
| 3   | [#2151](https://github.com/MasterDD-L34D/Game/pull/2151) | `9f8bcaae` | FASE 1 T1.3 browser sync spectator Playwright harness + visual diff CLI        |
| 4   | [#2153](https://github.com/MasterDD-L34D/Game/pull/2153) | `ebb04e8f` | FASE 5 nightly cron `.github/workflows/ai-sim-nightly.yml` + threshold checker |

**K4 commit-window evidence (PR #2149 sweep N=40)**:

- victory: 40/40 = **100% WR** (cap), avg_rounds 24.2 (-0.8 vs baseline 25.0)
- baseline N=20 K3 prod re-validated stesso tunnel: 18V/2D = **90% WR** avg 25.0r
- ΔWR +10pp absolute (capped). Zero timeouts, zero defeats.
- Guard footprint: 90 firings / 1208 SIS decisions = 7.4%

**Side-fix critico (PR #2149)**: state tracking `last_action_type` + `last_move_direction` ora in `sessionRoundBridge.js realResolveAction` post-commit. Pre-PR esisteva solo in legacy `sistemaTurnRunner.js` (DEAD path M17 ADR-2026-04-16) → K4 sticky era no-op nel round flow.

**Production state ai_profiles.yaml post-#2150**: `aggressive` profile = utility ON + commit_window 2. Profile alternativi preservati ablation (`aggressive_no_util`, `aggressive_with_stickiness`, `aggressive_sticky_30`, `aggressive_commit_window`).

**FASE 5 nightly cron (PR #2153)**: cron 02:00 UTC daily, drift threshold ±10pp WR + completion floor 95%. Su regression: GH Issue label `ai-sim-regression,automated` + artifact upload 14d retention. **First scheduled run 2026-05-10 02:00 UTC**.

**T1.3 browser sync (PR #2151)**: Playwright chromium headless harness, hook `window.__evoLobbyBridge._currentPhase` poll 200ms, PNG + grid signature 4×4 RGBA su ogni `phase_change`. Smoke validato 4 PNG cattura. Open question master-dd: phone composer no canvas → DOM bbox sample vs PNG-only fallback.

**Cumulative Day 5 (2026-05-09 mattina+sera)** = 13 PR Game/ shipped main (#2140-#2151 + #2153) + 1 Godot v2 + 1 Godot v2 direct main.

**Pillar deltas**: P1 Tattica 🟢++ (commit-window deterministico = AI behavior più readable). Altri invariati.

**Open question pendenti master-dd**:

- T1.3 phone composer no canvas → DOM bbox sample vs PNG fallback (next-iter design call)
- BASELINE_WR.cautious update post empirical N=40 (default 0.85 placeholder)

**Day 5 (2026-05-11) iter3 schedule confermato per OD-021** (invariato).

### ✅ Phase A Day 3/7 trigger autonomous — sessione 2026-05-08 sera — 14 PR shipped (closure final)

Phase A LIVE Day 3/7 trigger autonomous (OD-021 schedule label `2026-05-09`, execution UTC `2026-05-08`). Master-dd weekend playtest signal **ABSENT** (12+h silenzio post Day 2/7 closure #2116). Cascade ~3.5h cumulative: synthetic iter2 + normalize chip + evo-swarm distillation + OD-022 add + triage + Skiv admin + closure cumulative + OD audit + completionist enrichment + final closure + multi-action + master-dd cross-repo + coordination + final-final.

| #   | PR                                                       | SHA        | Topic                                                                                           |
| --- | -------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| 1   | [#2118](https://github.com/MasterDD-L34D/Game/pull/2118) | `27dc92e6` | Phase B synthetic supplement iter2 (15/16 PASS 39.8s, ZERO regression Day 1→2→3)                |
| 2   | [#2108](https://github.com/MasterDD-L34D/Game/pull/2108) | `1cfd7220` | evo-swarm run #5 distillation merge (honesty pass shipped pre-merge: 7/13 hallucinated flagged) |
| 3   | [#2119](https://github.com/MasterDD-L34D/Game/pull/2119) | `0423001a` | Normalize chip Day 3 drift: handoff date label + PR count gh ground truth + CLAUDE.md sprint    |
| 4   | [#2120](https://github.com/MasterDD-L34D/Game/pull/2120) | `9d57a2c5` | OD-022 add: evo-swarm pipeline cross-verification gate pre run #6 (~7-9h Sprint Q+ candidate)   |
| 5   | [#2121](https://github.com/MasterDD-L34D/Game/pull/2121) | `1ee6fd94` | Triage run #5 5/7 questions closed via canonical grep (~25min, 2 deferred Sprint Q+)            |
| 6   | [#2117](https://github.com/MasterDD-L34D/Game/pull/2117) | `2656640c` | Skiv Monitor auto-update admin merge (canonical pattern post #2115 lesson)                      |
| 7   | [#2122](https://github.com/MasterDD-L34D/Game/pull/2122) | `95ac1ef3` | Closure cumulative: BACKLOG + COMPACT + CLAUDE.md + memory + handoff fill TBDs                  |
| 8   | [#2123](https://github.com/MasterDD-L34D/Game/pull/2123) | `bec82f12` | OD audit cleanup OD-016 sposta Aperte→Risolte + OD-022 cross-link (drift, corrected by #2125)   |
| 9   | [#2125](https://github.com/MasterDD-L34D/Game/pull/2125) | `e6e0ba0a` | Completionist enrichment + museum card M-2026-05-08-001 + lesson codify CLAUDE.md               |
| 10  | [#2126](https://github.com/MasterDD-L34D/Game/pull/2126) | `35c1ca31` | Final closure TBD fill + count audit fresh post #2125                                           |
| 11  | [#2129](https://github.com/MasterDD-L34D/Game/pull/2129) | `62cd6b60` | Multi-action: A pre-design preview + B+D+E findings + aggregate doc                             |
| 12  | [#2127](https://github.com/MasterDD-L34D/Game/pull/2127) | `c2e21551` | Skiv Monitor auto-update admin merge (cascade)                                                  |
| 13  | [#2128](https://github.com/MasterDD-L34D/Game/pull/2128) | `20dda146` | Master-dd cross-repo `.ai/GLOBAL_PROFILE.md` CO-02 v0.3 canonical_refs MANDATORY                |
| 14  | [#2130](https://github.com/MasterDD-L34D/Game/pull/2130) | `b492cdd6` | Sprint Q+ kickoff coordination + OD-022 implicit accept                                         |

**Closed senza merge**: #2124 (revert direction wrong, anti-completionist — preserved come learning case in PR thread).

**Test baseline post-cascade**: Tier 1 phone smoke 15/16 + 1 skip in 39.8s = ZERO regression Day 1 → Day 2 → Day 3. CI Game/ + Godot v2 main verde 5/5.

**Pillar deltas**: invariati 5/6 🟢++ + 2/6 🟢 cand (P2 + P4 unchanged).

**Outstanding master-dd action items** (5 RISOLTA + 1 IMPLICIT ACCEPT post-Day-3-sera):

- OD-017 Phase B trigger downgrade nice-to-have ✅ RISOLTA Day 2
- OD-018 Tier 2 PlayGodot OVERRIDE kill-60 ✅ RISOLTA Day 2
- OD-019 Skiv Monitor Option A ✅ RISOLTA Day 2
- OD-020 Sprint Q+ FULL deep scope ✅ RISOLTA Day 2 (gated post-Phase-B-accept)
- OD-021 Continuous monitoring Day 3+5+7 ✅ RISOLTA Day 2
- **OD-022 evo-swarm cross-verification gate pre run #6 ✅ IMPLICIT ACCEPT Day 3/7 sera** (cross-repo evidence convergente: master-dd #2128 swarm-side + Claude #2129 Game-side pre-design). Status: CANDIDATE-RIPE post-Phase-B-accept. Bundle Sprint Q+ kickoff (~5-6h Game-side residue). Vedi `docs/planning/2026-05-08-sprint-q-kickoff-coordination.md`.

**Net actionable run #5 per data integration immediate = ZERO** (Claude triage autonomous judgment). 5/13 verified consistency-minor (specie esistenti grep-confirmed) potrebbero avere valore non-data-integration **pending master-dd review** — criteri possibili: baseline pipeline metric ("swarm sa mappare canonical"), pattern reference, doc audit. 8/13 hallucinated + 2 redundant **discarded preserved** in [museum card M-2026-05-08-001](docs/museum/cards/evo-swarm-run-5-discarded-claims.md). OD-022 gate Sprint Q+ candidate.

**Day 5 (2026-05-11) iter3 schedule confermato per OD-021**.

### 🟢 Worktree cleanup post-Phase-B-accept — deferred (~10min userland)

8 worktree stale residue locali (eloquent-gagarin-db4e3f current preserved):

- `bold-wiles-5b8e81` (docs/memory-save-day2-sprint-m7-chip)
- `charming-mahavira-c45d4c` (docs/session-2026-05-07-sera-memory-save)
- `dazzling-mirzakhani-20117a` (docs/adr-2026-05-05-accepted-phase-a-pending-validation)
- `interesting-moore-8eddcc` (docs/closure-session-2026-05-06-wave-6-full-recap)
- `peaceful-chaplygin-b74aa4` (docs/memory-save-audit-14-15-closure)
- `practical-gauss-954b86` (claude/practical-gauss-954b86)
- `vibrant-faraday-472863` (claude/vibrant-faraday-472863)

Handoff §"Cleanup eseguito 2026-05-07" notes "left intact (claudia/handoff branches active)". Verify post-Phase-B accept (2026-05-14+) se branches ancora needed o safely removable. Comando:

```bash
git worktree remove .claude/worktrees/<name>
git branch -D <branch-name>  # se branch fully merged + pushed
```

Trigger: post-Phase-B-accept verdict master-dd. Pre-req: verify ogni branch fully merged main via `gh pr list --search "head:<branch> is:merged"`.

### ✅ Phase A Day 2/7 monitoring — sessione 2026-05-08 — 4 PR shipped autonomous

Phase A LIVE Day 2/7 monitoring window 2026-05-08. Master-dd silenzioso (no playtest signal). Claude autonomous research-only scoping + RCA + synthetic supplement.

| #   | PR                                                       | SHA        | Topic                                                                      |
| --- | -------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| 1   | [#2109](https://github.com/MasterDD-L34D/Game/pull/2109) | `66bfc200` | Sprint Q+ GAP-12 LineageMergeService ETL scoping (design-only, NO impl)    |
| 2   | [#2110](https://github.com/MasterDD-L34D/Game/pull/2110) | `009c812c` | Tier 2 PlayGodot integration prep — kill-60 verdict reject (research-only) |
| 3   | [#2111](https://github.com/MasterDD-L34D/Game/pull/2111) | `3c588278` | Skiv Monitor scheduled fail RCA + 4-option fix menu                        |
| 4   | [#2112](https://github.com/MasterDD-L34D/Game/pull/2112) | `c4515b31` | Phase B synthetic supplement iter1 (Tier 1 fresh capture localhost)        |

**Pillar deltas**: zero regression Day 1→Day 2. Phase A LIVE stable confirmed.

**Outstanding master-dd action items** (5 nuove decisioni — vedi `OPEN_DECISIONS.md`):

- OD-017 Phase B trigger 2/3 Option α/β/γ
- OD-018 Tier 2 PlayGodot kill-60 accept/reject
- OD-019 Skiv Monitor fix Option A/B/C/D
- OD-020 Sprint Q+ pre-kickoff 5 sub-decisione (gated post-Phase-B)
- OD-021 Continuous synthetic monitoring Day 3-7 schedule

### 🟢 STALE TICKET CLEANUP — closed/superseded post Phase A LIVE 2026-05-07

Cleanup batch 2026-05-08. Ticket pre-pivot e pre-Phase-A-LIVE marcati closed/superseded:

- [x] ~~**Sprint M.1 Game-Godot-v2 bootstrap**~~ → **✅ CHIUSO 2026-04-29→2026-05-07** Game-Godot-v2 repo created, Godot 4.x installed, Sprint M-N-O-P-Q-R progressivamente shipped (audit godot-surface-coverage 14/15 closed Day 2 2026-05-07).
- [x] ~~**Master-dd input Sprint M.5 race condition diagnose**~~ → **✅ SUPERSEDED 2026-05-07** Phase A LIVE cutover Godot v2 = web stack v1 race conditions OBSOLETE (web v1 archive deferred Phase B). NON applicable.
- [x] ~~**🚫 BLOCKED Sprint G.2b BG3-lite Plus movement layer**~~ → **❌ FORMAL ABORT 2026-04-29 sera** post-pivot Godot decision. ADR-2026-04-29-pivot-godot-immediate. Godot v2 native 2D = zero porting effort.
- [x] ~~**🚫 BLOCKED TKT-M11B-06 playtest userland**~~ → **✅ SUPERSEDED 2026-05-07** Phase B trigger 2/3 (OD-017) replace. Playtest scope = full social 4 amici + master-dd post-cutover Godot v2.
- [x] ~~**Playtest round 2 PR #1730 retest**~~ → **❌ OBSOLETE 2026-04-29** post-pivot Godot. Web v1 archive Phase B target. Narrative log prose feature M18+ deferred (gap non-bug, post-pivot reframe).
- [x] ~~**🛑 PIVOT GODOT 2026-04-29 sera** Sprint Fase 1 chiusa~~ → **✅ DONE 2026-05-07** Phase A LIVE cutover ACCEPTED ([PR #2088](https://github.com/MasterDD-L34D/Game/pull/2088) `7247656`). Web stack v1 secondary fallback, Godot v2 phone HTML5 primary.

### ✅ Cascade auto-merge L3 sessione 2026-05-07 sera — 4 PR shipped ~17min

**User formal authorization** 2026-05-07 sera grant L3 blanket auto-merge codified [`ADR-2026-05-07-auto-merge-authorization-l3`](docs/adr/ADR-2026-05-07-auto-merge-authorization-l3.md). 7 safety gate verification mandatory pre-merge.

| #   | PR                                                              | Repo     | SHA        | Topic                                                      |
| --- | --------------------------------------------------------------- | -------- | ---------- | ---------------------------------------------------------- |
| 1   | [#209](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/209) | Godot v2 | `87dd88df` | Lint debt cleanup main.gd 1101→999                         |
| 2   | [#2101](https://github.com/MasterDD-L34D/Game/pull/2101)        | Game/    | `98dbf058` | Plan v3.2 final close 8/8 P1 + 3/3 P2 + sentience T4 audit |
| 3   | [#2103](https://github.com/MasterDD-L34D/Game/pull/2103)        | Game/    | `6a3880ef` | Auto-merge L3 ADR codify                                   |
| 4   | [#208](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/208) | Godot v2 | `29640c5f` | GAP-10 AiProgressMeter wire (P5 🟢→🟢++)                   |

**Pillar deltas**:

- P5 Co-op vs Sistema 🟢 → 🟢++ (Sistema escalation HUD top-strip live)
- meta plan v3.2 audit synthesis 100% closed
- policy auto-merge L3 ATTIVO

**Phase A Day 1/7 monitoring**: Godot v2 main CI hygiene blocker resolved (#209 unblocks 5 consecutive lint failures post-#205).

### 🛑 PIVOT GODOT 2026-04-29 sera — Sprint Fase 1 CHIUSA (web stack co-op race conditions UNRESOLVED, pivot Godot immediate)

**Decision-altering**: ADR-2026-04-29-pivot-godot-immediate.md + master-execution-plan-v3.md SHIPPED. Path B accelerated cap. 22 PR mergiati main preserved come reference port Godot. Sprint G.2b BG3-lite Plus + A1 rubric + Sprint H + Sprint I DEPRECATED post-pivot.

### ✅ Plan v3.2 gap audit shipped 2026-04-30 — PR #2026 merged main `e8967285`

**Scope**: P0 fix plan v3 (line 305 ADR-19 contraddizione, counts inflated 60+→14 enc + 100+→15 species, Sprint N gate P3+P5 row 10/10 verdict). NEW ADR-2026-04-30 pillar promotion criteria (tier ladder formal). NEW gap audit synthesis 3 agent paralleli (~30 gap classified, 4 P0 fixed, 8 P1 + 3 P2 actionable). **STATUS FINAL 2026-05-07**: 100% P0+P1 closed (8/8) + 100% P2 actionable closed (P2.1+P2.2+P2.4) + P2.3 sentience T4 audit completed (2 candidate proposed, ADR deferred post-cutover Phase B). Synthesis doc → archive status post 2026-05-14.

**P1 deferred plan v3.3** — TUTTI CHIUSI ✅ (8/8):

- [x] ~~**§Sprint O combat services 16+ port matrix**~~ → **✅ CHIUSO 2026-05-06** [PR #2076](https://github.com/MasterDD-L34D/Game/pull/2076) squash `b8a666f5`. 28 combat services classificati Tier A (10 mandatory N.7 GATE 0, ~36-40h) + Tier B (10 recommended Sprint Q ETL, ~22h) + Tier C (8 optional Sprint R+, ~10h). Codex P2 catch traitEffects.js misclassified (root services/, NOT combat/) → swap timeOfDayModifier.js. Fix `01286f0d` squashed in.
- [x] ~~**§Sprint R 26 routes HTTP backend whitelist**~~ → **✅ CHIUSO 2026-05-06** [PR #2076](https://github.com/MasterDD-L34D/Game/pull/2076). 27 routes Tier A (7) + B (10) + C (9). HTTPClient adapter spec con Result[T,Error] + retry/backoff. Codex P2 catch unversioned mounts (companion/diary/skiv use `/api/*` only) + `/api/auth` doesn't exist (rimosso Tier A).
- [x] ~~**§Sprint O.4 8 AI services list**~~ → **✅ CHIUSO 2026-05-06** [PR #2076](https://github.com/MasterDD-L34D/Game/pull/2076). 8 AI services + Beehave 6-archetype expand. Total ~21-25h.
- [x] ~~**ADR drop HermeticOrmus formal**~~ → **✅ CHIUSO 2026-05-06** [ADR-2026-05-06](docs/adr/ADR-2026-05-06-drop-hermeticormus-sprint-l.md). Sprint L DROP formal, plan v3.3 effort -2g.
- [x] ~~**Sprint S Mission Console deprecation row**~~ → **✅ CHIUSO 2026-05-06** plan v3 §Sprint S checklist updated con riga deprecation + nota inline rationale.
- [x] ~~**Path drift correction table**~~ → **✅ CHIUSO 2026-05-06** audit grep: solo `data/skiv/` drift reale (2 ref attivi fixati: `docs/planning/2026-04-28-godot-migration-strategy.md:145` + `data/core/narrative/beats/skiv_pulverator_alliance.yaml:4` → `docs/skiv/CANONICAL.md`). Altri 3 path (ennea_voices + terrain_defense + ai_profiles) canonical correct, false-alarm.
- [x] ~~**§Sprint M.3 7 silhouette spec addendum**~~ → **✅ CHIUSO 2026-05-06** addendum in `docs/core/41-ART-DIRECTION.md §Job-to-shape silhouette spec` (canonical path è 41 non 22). 7 job × archetype base + key marker + frame budget +2/+3 + override scene `.tres`. Sprint M.3 Godot import pronto.
- [x] ~~**§Sprint N.5 accessibility parity bullet**~~ → **✅ CHIUSO 2026-05-06** [PR #2076](https://github.com/MasterDD-L34D/Game/pull/2076). Spec colorblind shape encoding + aria-label tooltip + prefers-reduced-motion (Global flag, OS env auto-detect). Sprint N.6 impl wave.
- [x] ~~**Pre-Sprint M.1 quick wins ~3h (P1.8)**~~ → **✅ CHIUSO ABORT 2026-05-07** [ADR-2026-05-07](docs/adr/ADR-2026-05-07-abort-web-quickwins-reincarnate-godot.md). 3 web stack v1 quick wins (TKT-MUTATION-P6-VISUAL + Thought Cabinet 8-slot + QBN debrief) ABORT post-pivot Godot. Re-incarnate target Godot v2 audit GAP-5 MissionTimer + GAP-7 PassiveStatusApplier + GAP-10 AiProgressMeter (Sprint M.7 chip post Phase A stable). GAP-9 already shipped Godot v2 [PR #203](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/203).
- [x] ~~**Sprint M.7 chip reincarnate ADR-2026-05-07-abort-web 3/3**~~ → **✅ CHIUSO 2026-05-07 Day 2/7** Phase A. GAP-10 AiProgressMeter [PR #208 Godot v2](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/208) `29640c5f` (sera) + GAP-7 PassiveStatusApplier [PR #210 Godot v2](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/210) `c89f7bfd` + GAP-5 MissionTimer [PR #211 Godot v2](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/211) `db745302`. Pillar P3 🟢ⁿ → 🟢++ + P5 🟢 → 🟢++ + P6 🟢 cand → 🟢++. GUT 1925/1925 baseline, format + gdlint clean.
- [x] ~~**Surface debt audit residuo 5/5 GAP-3+6+8+13+14**~~ → **✅ CHIUSO 2026-05-07 Day 2/7 sera** Phase A. 3 PR cascade L3: GAP-3+6+14 bundle [PR #212](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/212) `0b954949` + GAP-8 SgTracker live bar [PR #213](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/213) `0ccd8697` + GAP-13 lifecycle phase label [PR #214](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/214) `925933fe`. 5/6 pillar 🟢++ rinforzati (P1 telegraph + P3 lifecycle/time + P5 SG live + P6 defender). GUT 1957/1957, +32 cumulative Day 2 sera.
- [x] ~~**Audit godot-surface-coverage closure 14/15 (P2 GAP-11)**~~ → **✅ CHIUSO 2026-05-07 Day 2/7 tarda sera** Phase A. GAP-11 PseudoRng miss-streak compensation wire [PR #215](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/215) `42307516`. P6 🟢++ rinforzato (anti-frustration tilt). GUT 1964/1964, +7 GAP-11. **Audit closure 14/15** (GAP-12 LineageMergeService P2 deferred Sprint Q+ — requires bond_path + offspring pipeline).

**P2 actionable** — TUTTI CHIUSI ✅ (3/3):

- [x] ~~**§Sprint P bond reactions + Skiv crossbreeding (P2.1)**~~ → **✅ CHIUSO 2026-05-07** verified Sprint P closure W7.x bundle. BeastBondReaction wire pre-#37 `1172819` + propagateLineage runtime #63 `c8473cd` + caller wire W7.x #127 `2d929c7`. Zero gap residual.
- [x] ~~**§Sprint N.5 accessibility parity (P2.4)**~~ → ✅ vedi sopra (PR #2076).
- [x] ~~**Ennea archetypes UI surface (P2.2)**~~ → **✅ CHIUSO 2026-05-07** Godot v2 [PR #203](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/203) `5d098e7b` (GAP-2 debrief view top archetype) + [PR #204](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/204) `194a68da` (D3 expand toggle full 9 list).

**P2.3 sentience T4 audit** — completed 2026-05-07 (T4=0 confirmed, 46 species across 2 catalog file). Distribution T0:2 / T1:23 / T2:15 / T3:3 / T4:**0** / T5:3. Bridge gap T3→T5. Candidate A `umbra_alaris` (Playable, Skiv-bond ritual T3→T4 trigger) + Candidate B `terracetus_ambulator` (Keystone, legacy ritual T3→T4 trigger). ADR formal deferred post-cutover Phase B + 1+ playtest. Default fallback no signal entro 2026-06-01: promote A only. Synthesis: [`docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md §P2.3`](docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md).

### ✅ Issue #2746 coop WS/REST contract gaps closed (backend-side) 2026-06-14 — GGv2 playtest item-5/6

5 gap di contratto coop trovati dal playtest AI GGv2 item-5/6 (report `Game-Godot-v2/docs/godot-v2/qa/2026-06-12-item5-item6-ai-playtest.md`). Tutti mergiati. Handoff: `docs/planning/2026-06-14-issue-2746-coop-ws-closure-handoff.md`.

- [x] ~~**G4 [P2] npg/nest 500 Prisma reale**~~ → **✅ CHIUSO** [PR #2748](https://github.com/MasterDD-L34D/Game/pull/2748) `662fc761`. Store meta globale (campaignId null) usa `findFirst` su unique nullable (il client reale rigetta findUnique con null su unique key). +Codex P2: dup-row globale -> create serializzato in-process + read orderBy createdAt,id. Verificato live (Postgres portable Lenovo) 500->200.
- [x] ~~**G1 [P1] phase_change non versionata**~~ → **✅ CHIUSO** [PR #2751](https://github.com/MasterDD-L34D/Game/pull/2751) `087f60cd`. 3 emitter coop-WS (broadcastCoopState + host-transfer rebroadcast + fresh-join snapshot) mandavano phase_change raw -> Godot scartava come unknown_type (schermo vuoto). Fix: `publishEvent('phase_change', ...)` versionato + `version: room.stateVersion` sul snapshot.
- [x] ~~**G2 [P2] campaign_id null sul canale versionato**~~ → **✅ CHIUSO** [PR #2756](https://github.com/MasterDD-L34D/Game/pull/2756) `e02764f2`. `coopStore.linkSession` ora mirrora `room.campaignId` (oltre a sessionId).
- [x] ~~**G3 [P2] phase nido mai broadcastata**~~ → **✅ CHIUSO** PR #2756 `e02764f2`. Drain `next_macro` aggiunge ramo `publishPhaseChange('nido')`.
- [x] ~~**G5 [P3] world_tally conta host TV**~~ → **✅ CHIUSO** PR #2756 `e02764f2`. Quorum role-aware (host conta solo se gioca) + gate `not_a_player` (Codex P2: evita accept>total).
- [ ] **Residuo (lane GGv2, NON Game)**: re-check QA visivo phone Godot (B3 affinity-half + conferma G1/G2/G3/G5). ~15min Lenovo. Post-conferma -> chiudi #2746.

### ✅ Coop WS audit 6/6 closed 2026-05-06 — gap matrix complete

3 PR shipped main close audit `docs/reports/2026-05-06-coop-phase-ws-audit.md`. Harness 18 PASS / 0 FAIL / 0 GAP. 5/5 lifecycle action drained server-side (character_create + form_pulse_submit + lineage_choice + reveal_acknowledge + next_macro).

- [x] ~~**TKT-P5-WS-FORM-PULSE-DRAIN**~~ → **✅ CHIUSO 2026-05-06** [PR #2073](https://github.com/MasterDD-L34D/Game/pull/2073) squash `9f24791c`. `coopOrchestrator.submitFormPulse` + `formPulseList()` + `formPulses` Map mirror voteWorld pattern. +4 unit test (W4 series). Codex P2 #2073: host filter (excluding hostId from allPids) → fix `26758887` squashed in.
- [x] ~~**TKT-P5-WS-NEXT-MACRO-DESIGN**~~ → **✅ CHIUSO 2026-05-06** [PR #2075](https://github.com/MasterDD-L34D/Game/pull/2075) squash `19fccaad`. Design verdict: host-only post-debrief macro {advance, branch, retreat}. retreat forces phase=ended. +5 unit test. Codex P2 #2075: phase gate widen `world_setup` (post-auto-advance edge) → fix `3b820153` squashed in.

### ✅ Sprint M.6 Phase B Godot port shipped 2026-05-06

- [x] ~~**Sprint M.6 Phase B — phone_onboarding_view BASE port (Godot)**~~ → **✅ CHIUSO 2026-05-06** [PR #193 Game-Godot-v2](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/193) squash `9105c169`. Backend Phase A live (PR #2071). Frontend port: `phone_onboarding_view.gd` ~280 LOC + `PhoneOnboardingView.tscn` 3-stage Control + `phone_composer_view.gd` MODE_ONBOARDING + payload bind + `coop_ws_peer.gd` 3 dedicated signal + 18 GUT test. **3 round Codex P2 review** all addressed: round 1 retryable choices (`b28d00c`) + round 2 countdown reset + non-host transition (`0415239`) + round 3 defer phase_change swap until transition_complete (`50d28e7`). Total 758 insertions. 64/64 GUT pass + gdformat + gdlint clean.

### Userland (richiede azione umana)

- [x] ~~**Deep research analysis** (NEW session)~~ → **✅ CHIUSO 2026-04-28 sera** PR #1996.
- [x] ~~**Sprint G v3 Legacy Collection asset swap**~~ → **✅ CHIUSO 2026-04-29** PR #2002 (Ansimuz CC0 47 PNG re-import Godot Sprint M.3).
- [x] ~~**Spike POC BG3-lite**~~ → **✅ CHIUSO 2026-04-29** PR #2003 (Tier 1 frontend, archive web-v1-final post-pivot, native Godot 2D 0 effort).
- [x] ~~**Rubric launcher desktop suite**~~ → **✅ CHIUSO 2026-04-29** PR #2007 (DEPRECATED post-pivot, archive web-v1-final).
- [x] ~~**A1 Master-dd rubric session Spike POC BG3-lite**~~ → **❌ FORMAL ABORT 2026-04-29 sera** post-pivot Godot decision. No tester recruited. Reasoning: web stack co-op race conditions cascade architecturally broken (7-PR fix #2016-#2022 NOT enough), rubric value zero gating G.2b decision-binary (G.2b DEPRECATED post-pivot anyway).
- [ ] **NEW — Phase B trigger 2/3 master-dd action** (Option α full social ~1-2h | β solo hardware ~30min | γ synthetic only ❌ NON satisfies). Vedi OD-017. Window 7gg termina 2026-05-14. Default proposed: Option α weekend 2026-05-10/11.
- [ ] **NEW — Skiv Monitor fix master-dd action** Option A repo setting toggle (30s 1-click). Vedi OD-019. Restore pre-2026-04-25 verde state.

**Stale ticket marcati closed/superseded sopra in §"STALE TICKET CLEANUP"** (Sprint M.1 + Sprint M.5 race + Sprint G.2b BG3-lite Plus + TKT-M11B-06 + Playtest round 2 + Pivot Godot tutti chiusi).

### Sprint Fase 1 — TUTTI CHIUSI ✅ (10 PR ondata 3+ shipped 2026-04-28/29)

- [x] ~~**Action 4 Sprint M.7 doc re-frame DioField**~~ → **✅ CHIUSO 2026-04-29** PR #1997.
- [x] ~~**Action 5a Injury severity stack** + **Action 5b Slow_down trigger expanded**~~ → **✅ CHIUSO 2026-04-29** PR #1999. Severity enum light/medium/severe + slow_down trigger panic/confused/bleeding≥medium/fracture≥medium. 31/31 test verde + AI 382/382 zero regression. P6 🟡 → 🟢 candidato.
- [x] ~~**Action 7 CT bar visual lookahead 3 turni**~~ → **✅ CHIUSO 2026-04-29** PR #1998. `apps/play/src/ctBar.js` NEW module + 28 test verdi + AI 382/382 zero regression. P1 🟢 → 🟢++.
- [x] ~~**Action 1 Sprint M.4b reference codebase study**~~ → **✅ CHIUSO 2026-04-29** PR #2001. `docs/research/2026-04-28-srpg-engine-reference-extraction.md` shipped (4 repos studiati: Project-Tactics + nicourrea/Tactical-RPG + OpenXcom + Lex Talionis).
- [x] ~~**Action 2 Sprint N.4 pre-read tactical AI**~~ → **✅ CHIUSO 2026-04-29** PR #2000. `docs/research/2026-04-28-tactical-ai-archetype-templates.md` shipped (Battle Brothers AI + XCOM:EU postmortem + 3 archetype Beehave templates: vanguard / skirmisher / healer).
- [x] ~~**Action 3 Sprint N gate row failure-model parity + N.7 spec**~~ → **✅ CHIUSO 2026-04-29** PR #2005. Master plan v2 §Sprint N gate row MANDATORY 5/5 + `docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md` (WoundState.gd + LegacyRitualPanel.gd Godot impl deferred Sprint M.1).
- [x] ~~**Action 6 Ambition seed Skiv-Pulverator alleanza**~~ → **✅ CHIUSO 2026-04-29** PR #2004. `data/core/campaign/ambitions/skiv_pulverator_alliance.yaml` + `apps/backend/services/campaign/ambitionService.js` + `apps/play/src/ambitionHud.js` + `apps/play/src/ambitionChoicePanel.js` + 10 test verdi + AI 382/382 zero regression. P2 🟢 def → 🟢++ + P5 🟡 → 🟢 candidato.

### Sprint Fase 1 ondata 4 follow-up — TUTTI CHIUSI ✅ (6 PR 2026-04-29 post launcher suite)

- [x] ~~**fix(ai) ai_profile preserve in normaliseUnit**~~ → **✅ CHIUSO 2026-04-29** PR #2008 (`83f26050`). PR #1495 bot review P1 risolto. Side-effect: expone bug latente Utility AI oscillation (vedi #2013 below).
- [x] ~~**ERMES drop-in self-install E0-E6**~~ → **✅ CHIUSO 2026-04-29** PR #2009 (`2259634e`). `prototypes/ermes_lab/` modulo isolato (sim deterministica + JSON eco_pressure_report + experiment loop scoring). E7-E8 future runtime/foodweb deferred post-playtest + ADR.
- [x] ~~**governance registry ERMES planning docs**~~ → **✅ CHIUSO 2026-04-29** PR #2010 (`8b5d4ab9`). Frontmatter compliance.
- [x] ~~**asset-creation-workflow 3-path canonical**~~ → **✅ CHIUSO 2026-04-29** PR #2011 (`8acc7389`).
- [x] ~~**fix(ai) utilityBrain oscillation root cause**~~ → **✅ CHIUSO 2026-04-29** PR #2013 (`0fdd2853`). 3 root cause compounding: (1) faction key mismatch `team` vs `controlled_by` PRIMARY (2) multiplicative scoring annihilation SECONDARY (3) action-agnostic considerations TERTIARY. Re-enable `aggressive.use_utility_brain: true`. AI 384/384 verde + utility 23/23 verde. Doc: `docs/reports/2026-04-29-utility-ai-oscillation-bug.md`.
- [x] ~~**Workspace locale (out-of-repo) section asset workflow**~~ → **✅ CHIUSO 2026-04-29** PR #2014 (`6a9bcc43`).

### Future-proof deferred M12+

- [ ] **TKT-FUTURE-REPLAY-INFRASTRUCTURE M12+** — session replay storage tie-in telemetry pipeline. Trigger: post Sprint G.2b ship + post-playtest bug analysis. Synthetic test 10 scenari hardcoded sufficient ora (vedi `tests/services/areaCovered.test.js`).

### Autonomous (Claude Code può fare)

- [x] ~~**Sprint 13 Status engine wave A — passive ancestor producer wire**~~ → **✅ CHIUSO 2026-04-28** branch `claude/sprint-13-status-engine-wave-a`. Pre-Sprint 13: `statusModifiers.js` consumer LIVE (computeStatusModifiers + applyTurnRegen, 7 statuses) MA producer side DEAD: `traitEffects.js:226` `passesBasicTriggers` returns false per `action_type: passive` → 297 ancestor batch traits MAI eseguono → unit.status[X] sempre 0 → consumer engine vede niente. Helper backend nuovo `apps/backend/services/combat/passiveStatusApplier.js` (pure: `applyPassiveAncestors(unit, registry)` + `applyPassiveAncestorsToRoster` + `passiveStatusSpec` + `collectTraitIds`). Filter Wave A statuses (linked/fed/healing/attuned/sensed/telepatic_link) + `PASSIVE_BLOCKLIST=['frenzy']` (rage 2-turn canonical, no auto-permanent). Default turns 99 (effectively-permanent vs decay loop). Idempotent max-policy. Wire `apps/backend/routes/session.js /start` (initial wave dopo lineage inheritance) + `apps/backend/routes/sessionRoundBridge.js applyEndOfRoundSideEffects` (refresh wave pre regen+decay per traits gained mid-encounter via mating/recruit/evolve). Frontend extends `apps/play/src/render.js STATUS_ICONS` registry con 7 nuove entry (∞ linked gold / ◍ fed brown / ✚ healing green / ⌬ attuned cyan / ⊙ sensed purple / ⚹ telepatic_link violet / ᛞ frenzy red, esistente `drawStatusIcons` auto-itera). 27/27 test nuovi (`tests/services/passiveStatusApplier.test.js`) + AI 382/382 baseline + statusModifiers existing 13/13 = 422/422 zero regression. Format + governance verdi. **End-to-end integration verificato** via direct node: `ancestor_comunicazione_cinesica_cm_01` (CM 01 wiki source) → unit.status.linked = 2 → computeStatusModifiers emette `+1 attack_mod (ally adjacent)`. **Recupera 297 ancestor batch ROI** dormant (single largest single-sprint ROI batch). Producer/consumer separation chiusa.
- [x] ~~**Sprint 12 Mating lifecycle wire (§C.2 Surface-DEAD #4 — engine LIVE surface DEAD killer)**~~ → **✅ CHIUSO 2026-04-28** branch `claude/sprint-12-mating-lifecycle-wire`. Engine LIVE in `metaProgression.js` (`rollMatingOffspring` + `canMate` + offspringRegistry da PR #1879) era invisibile in player loop. Helper backend nuovo `apps/backend/services/mating/computeMatingEligibles.js` (pure: `filterPlayerSurvivors` + `pairCombinations` n-choose-2 + cap 6 + opzionale `metaTracker.canMate()` gate graceful con fallback permissivo on throw). Wire `apps/backend/services/rewardEconomy.js` `buildDebriefSummary` emette `mating_eligibles[]` solo on victory + best-effort require pattern (mirror QBN narrativeEvent Sprint 10). Module frontend nuovo `apps/play/src/lineagePanel.js` (pure `formatLineageCard` + `formatLineageList` con XSS escape + side-effect idempotent `renderLineageEligibles`). Reuse `iconForBiome` + `labelForBiome` da `biomeChip.js`. Plural offspring label quando count>1. Wire frontend: `debriefPanel.js` HTML slot `<div id="db-lineage-section">` + `<div id="db-lineage-list">` + import + `setLineageEligibles` setter API + `renderLineage()` registered in render() (gated outcome non-defeat). `phaseCoordinator.js` pipe `bridge.lastDebrief.mating_eligibles` → `dbApi.setLineageEligibles(...)` quando phase 'debrief'. CSS gold pair-bond card (linear-gradient + serif italic + offspring badge gold border + biome chip caps). 38/38 test nuovi (19 backend + 19 frontend) + AI 382/382 zero regression. Format + governance verdi. Smoke E2E preview limitazione worktree-path mismatch (Vite serve da repo principale) → validazione end-to-end via direct node integration test (buildDebriefSummary mock session emits 1 pair eligible biome=savana can_mate=true, defeat path → empty array). **§C.2 Surface-DEAD sweep: 7/8 chiusi** (residuo solo #3 Spore mutation dots ~15h authoring esterno). **Pillar P2 🟢 def → 🟢++** (ciclo Nido→pair-bond→offspring visibile post-encounter).
- [x] ~~**Sprint 11 Biome chip HUD (§C.2 Surface-DEAD #6 — engine LIVE surface DEAD killer)**~~ → **✅ CHIUSO 2026-04-27** branch `claude/sprint-11-biome-initial-wave`. Backend `publicSessionView` extended con `biome_id: session.biome_id || session.encounter?.biome_id || null` (fallback a encounter YAML loader) + module nuovo `apps/play/src/biomeChip.js` (pure `labelForBiome` 11 canonical IT labels + `iconForBiome` emoji + `formatBiomeChip` HTML pill + side-effect `renderBiomeChip` idempotent show/hide) + HUD slot `<div id="biome-chip">` in header next to objective-bar + main.js `refreshBiomeChip()` wire on bootstrap + post-state-fetch + CSS pill style (rgba green-tinted bg + border + caps label). 17/17 test nuovi + AI 363/363 zero regression. Smoke E2E preview validato live: bootstrap enc_tutorial_01 → HUD chip `🌾 Savana` con tooltip "Biome: savana — vedi Codex per dettagli" ✓. **§C.2 Surface-DEAD sweep: 6/8 chiusi** (residui solo #3 Spore mutation dots 15h authoring + #4 Mating lifecycle wire 5h).
- [x] ~~**Sprint 10 QBN narrative debrief beats (§C.2 Surface-DEAD #7 — engine LIVE surface DEAD killer)**~~ → **✅ CHIUSO 2026-04-27** branch `claude/sprint-10-qbn-debrief`. Module nuovo `apps/play/src/qbnDebriefRender.js` (pure `formatNarrativeEventCard` con title + body + choices + meta + XSS escape, side-effect `renderNarrativeEvent` idempotent + section show/hide) + setter `setNarrativeEvent(payload)` aggiunto a `debriefPanel.js` API + `<div id="db-qbn-section">` HTML template + render path call + `phaseCoordinator.js` pipe da `bridge.lastDebrief.narrative_event` quando phase transition a 'debrief' + CSS `.db-qbn-card` journal style (linear-gradient violet + Georgia serif body italic). Backend `qbnEngine.drawEvent` LIVE da PR #1914 + `rewardEconomy.buildDebriefSummary` già emetteva `narrative_event` (zero backend change). 15/15 test nuovi + AI 363/363 zero regression. Smoke E2E preview validato live (module + render path produces correct DOM). **§C.2 Surface-DEAD sweep: 5/8 chiusi** (#1 + #2 + #5 + #7 + #8). **Pillar P4 🟢 def → 🟢++** (cronaca diegetica visibile post-encounter).
- [x] ~~**Sprint 9 Objective HUD top-bar (§C.2 Surface-DEAD #5 — engine LIVE surface DEAD killer)**~~ → **✅ CHIUSO 2026-04-27** branch `claude/sprint-9-objective-hud`. Backend route nuovo `GET /api/session/:id/objective` (lazy evaluator wire) + module `apps/play/src/objectivePanel.js` (pure `labelForObjectiveType` + `iconForObjectiveType` + `statusForEvaluation` + `formatProgress` aligned con real backend payload keys 6 obj types: elimination/capture_point/escort/sabotage/survival/escape, side-effect `renderObjectiveBar`) + `api.objective` client + main.js `refreshObjectiveBar()` wire on bootstrap + post-state-fetch + index.html HUD slot `#objective-bar` in header next to pressure-meter + CSS `.objective-bar` band colors. Tutorial play UI ora pipe `encounter_id` a `/api/session/start` per attivare engine (sblocca encounter YAML loader → docs/planning/encounters/<id>.yaml). 29/29 test nuovi + AI 363/363 zero regression. Smoke E2E preview validato live: bootstrap enc_tutorial_01 → HUD render `⚔ Elimina i nemici · Sistema vivi: 2 · PG: 2` band active accent ✓. **§C.2 Surface-DEAD sweep: 4/8 chiusi** (#1 + #2 + #5 + #8). **Pillar P5 🟡 → 🟡++** (player vede esplicitamente cosa deve fare).
- [x] ~~**Sprint 8 predict_combat hover preview (§C.2 Surface-DEAD #1 — engine LIVE surface DEAD killer)**~~ → **✅ CHIUSO 2026-04-27** branch `claude/sprint-8-hp-floating-numbers` (originally planned for HP floating, pivoted dopo discovery che HP numerici già live M4 P0.2 — render.js line 768). Module `apps/play/src/predictPreviewOverlay.js` (pure `formatPredictionRow` + `colorBandForHit` + async cached `getPrediction`) + `api.predict` client + main.js mousemove wire + CSS band colors. Backend `/api/session/predict` LIVE pre-existing (analytic d20 enumeration in sessionHelpers.js predictCombat). Quando player hover su nemico vivo con player selezionato vivo → tooltip surface `⚔ HIT% · ~DMG · CRIT%` band high/medium/low + elevation hint. Cache invalidated su new session. Test 22/22 + AI baseline 363/363 + smoke E2E preview validato live (`⚔ 60% hit · ~1.4 dmg · 5% crit` band medium su e_nomad_1 hover con p_scout selezionato). **Pillar P1 🟢 → 🟢++** (decision aid live). **§C.2 Surface-DEAD sweep: 3/8 chiusi** (#1 + #2 + #8).
- [x] ~~**Sprint 7 Disco skill check passive→active popup (B.1.8 #3 — bundle saturator)**~~ → **✅ CHIUSO 2026-04-27** branch `claude/sprint-7-skill-check-popup`. Module `apps/play/src/skillCheckPopup.js` (pure `buildSkillCheckPayload` + side-effect `renderSkillCheckPopups`) + wire in `main.js processNewEvents`. Filtra `triggered=true` su `world.events[].trait_effects`, dedupes, format Disco-style `[NOME TRAIT]` floating sopra l'actor con stagger 220ms. Zero backend change. Test 22/22 + AI 363/363 zero regression. Smoke E2E preview validato (module load + payload transform + integration wire). **Bundle Disco Tier S 4/4 COMPLETO** (#1 PR #1966 + #2 PR #1945 + #3 this + #4 PR #1934).
- [x] ~~**Sprint 6 Thought Cabinet UI panel + cooldown round-based (Disco Tier S #9)**~~ → **✅ MERGED 2026-04-27** [PR #1966](https://github.com/MasterDD-L34D/Game/pull/1966) squash come `584c54c2`. Adoption follow-up scheduled 2026-05-11 09:00 Europe/Rome (`trig_01JJsMTpGWaEsBfhE51YFNMx`). Branch originale `claude/sprint-6-thought-cabinet-ui`. Engine `thoughtCabinet.js` bump `DEFAULT_SLOTS_MAX` 3→8 + `RESEARCH_ROUND_MULTIPLIER=3` + `mode='rounds'|'encounters'` opt + `tickAllResearch(bucket, delta)` bulk helper + snapshot `mode/scaled_cost/progress_pct/started_at_round`. Bridge `sessionRoundBridge.applyEndOfRoundSideEffects` → tick 1 round per fine-turno + auto-internalize + `updateThoughtPassives` apply su unit + emit `thought_internalized` event. Routes `/thoughts/research` accetta body `mode` (default `'rounds'`); response plumb `scaled_cost+mode`. Frontend `apps/play/src/thoughtsPanel.js` Assign/Forget buttons inline + progress bar `cost_remaining/cost_total round X%` + 8-slot grid + can-research-more gate + error banner + status classes (researching/internalized). API client `thoughtsList/thoughtsResearch/thoughtsForget` aliases. Test budget: thoughtCabinet 59/59 (+29 round-mode), sessionThoughts 17/17 (+5 E2E round-tick), AI baseline 353/353 zero regression. Smoke E2E preview validato: 8 slot default ✓, mode=rounds default cost_total=3 (T1) ✓, end-of-round auto-tick 3 round → internalize ✓, Assign ⇄ Forget round-trip UI ✓. Format prettier verde, governance 0 errors. **P4 🟢c → 🟢 def**. Stato-arte §B.1.8 aggiornato (3 pattern Disco residui).
- [x] ~~**M13 P3 Phase B**~~ — balance pass N=10 post XP grant hook → **✅ CHIUSO in PR #1697 (`a462d4d5`)** 2026-04-25. Campaign advance XP grant hook + combat resolver 5 passive tags wired (flank_bonus, first_strike_bonus, execution_bonus, isolated_target_bonus, long_range_bonus) + frontend progressionPanel overlay. Balance pass 448 builds validated. Pilastro 3 → 🟢 candidato.
- [x] ~~**M13 P6 Phase B calibration**~~ — N=10 hardcore 07 → **✅ SHIPPED in PR #1698 (`135b5b1f`)** 2026-04-25 (esecuzione harness userland resta). Calibration harness `tools/py/batch_calibrate_hardcore07.py` + HUD timer countdown + campaign auto-timeout outcome. Pilastro 6 → 🟢 candidato. **Userland residual**: eseguire harness N=10, valutare win rate 30-50%.

---

## 🟡 Priorità media

### jsonschema shadow removal -- exposed validation follow-ups (2026-06-18)

> **Context**: PR removed the tracked root `jsonschema/` stub (a no-op shim that
> silently shadowed the real jsonschema across the full pytest suite -- repo-root
> lands on sys.path during collection, so the stub was imported and cached before
> any schema test ran, neutralizing ALL JSON-schema validation in CI + local dev).
> Removal surfaced pre-existing drift. The dominant fix shipped in-PR
> (`schemas/evo/trait.schema.json` sinergie/conflitti pattern `^TR-\d{4}$` ->
> canonical slug, matching glossary.json + config/schemas); the rest is tracked
> below and quarantined as strict (self-clearing) xfail.

- [ ] **TKT-TRAITS-TR200X-METRICS** -- `data/external/evo/traits/TR-2006..2010.json` lack the schema-required `metrics` array (real balance values, cannot be fabricated). Enum + `meta.expansion` already normalized in-PR; only `metrics` remains. Quarantined via `INCOMPLETE_PENDING_METRICS` in `tests/schemas/test_evo_trait_schema.py`. Author the balance metrics, then drop each file from that set (strict xfail self-clears on XPASS).
- [x] ~~**TKT-DATATRAITS-SCHEMAVERSION-MIGRATION**~~ -- **RESOLVED (option A, migrate; PR pending master-dd review -- forbidden-path `config/schemas`)**. Governance contradiction: the `trait_schema_gate` pre-commit hook (ADR-2026-05-29) hard-required `schema_version: "2.0"` on `data/traits/*.json`, but `config/schemas/trait.schema.json` was `additionalProperties:false` and defined no such property -- so files declaring `schema_version` failed the schema while files omitting it failed the gate (any trait-file edit blocked). #2857 added only a top-level `schema_version` to the schema FILE + the `aliases` property; it did NOT add `schema_version` to the schema `properties`. **Fix (this PR)**: added `schema_version` (const `"2.0"`) to the schema `properties` + stamped `schema_version: "2.0"` on the 264 `data/traits/**/*.json` files lacking it (263 per-trait + `species_affinity.json`; the 18 category `index.json` were already stamped). Gate exit 0 on all 282 files + schema; `trait_template_validator` 3/3 + summary 263 traits; prettier clean. The `aliases` violation itself was already RESOLVED by #2857 (field deliberate -- commit `c2aa9cc5` "Add missing trait aliases", referenced in 8+ files).
- [x] ~~**TKT-TRAITVALIDATOR-WIN-ENCODING**~~ -- **RESOLVED**: `tools/py/trait_template_validator.py` crashed with `UnicodeEncodeError` on Windows (cp1252 stdout) when a schema pattern-violation message echoed the UCUM regex (contains U+22C5). Fix = `main()` reconfigures `sys.stdout`/`sys.stderr` to utf-8 (guarded), so diagnostics print on any console codepage. Verified: reproduced crash under `PYTHONIOENCODING=cp1252` (no longer crashes, prints the UCUM error clean) + pytest `tests/test_trait_template_validator.py` 3/3 on a default cp1252 console (previously 1 failed). CI (Linux/utf-8) was already unaffected.

### Audit 2026-05-05 — pre-cutover cleanup tickets

> **Source**: `docs/reports/2026-05-05-repo-audit-static-scan.md` — Phase 3 triage.
> **Shipped 2026-05-05**: PR [#2058](https://github.com/MasterDD-L34D/Game/pull/2058) (Game/) + [#177](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/177) (Godot v2).

- [x] ~~**TKT-SERVICES-ORPHAN**~~ → **✅ CHIUSO PR #2058** — deleted `aiPersonalityLoader.js` (121 LOC) + `sistemaActor.js` (zero callers).
- [x] ~~**TKT-SPECIES-BIOME-AFFINITY-FIX**~~ → **✅ CHIUSO PR #2058** — 10 species `biome_affinity` → canonical biome slugs. `isPerfectMatch()` now eligible for all 15 species.
- [x] ~~**TKT-GODOT-AI-STUB-DROP**~~ → **✅ CHIUSO PR #177** — `sistema_turn_runner.gd` Tier 3 abandoned.
- [x] ~~**TKT-GATE5-ENNEAEFFECTS**~~ → **✅ CHIUSO PR #2058** — Gate 5 exemption documented (telemetry/vcScoring surface).
- [x] ~~**TKT-GATE5-EVENTCHAIN**~~ → **✅ CHIUSO PR #2058** — Gate 5 exemption documented (design-complete infra, M18+ trigger).
- [x] ~~**TKT-GATE5-SPECIESWIKI**~~ → **✅ CHIUSO PR #2058** — Gate 5 exemption documented (dev-tooling).
- [x] ~~**TKT-GATE5-CONVICTION**~~ → **✅ CHIUSO PR #2058** — Deprecated: route+service+tests deleted (zero FE callers, Godot cutover in progress). vcScoring conviction_badge unaffected.
- [x] ~~**TKT-TRAITS-ANCESTOR-BUFF-STAT**~~ → **✅ CHIUSO PR #2058** — `evaluateMovementTraits` added to `traitEffects.js`. Wired in `session.js` move handler: `apCost = max(1, dist - move_bonus)`. 51 ancestor locomotion traits now reduce AP cost. 9 new tests verde.
- [x] ~~**TKT-RULES-SIMULATE-BALANCE**~~ → **✅ CHIUSO PR #2058** — `tools/py/simulate_balance.py` deleted. Unblocks `services/rules/` Phase 3 removal.
- [x] ~~**TKT-RULES-PHASE-3-REMOVAL**~~ → **✅ CHIUSO 2026-05-05** branch `chore/services-rules-phase-3-removal`. Deleted `services/rules/` (8 file Python) + 7 test Python (resolver/hydration/round_orchestrator/trait_effects/demo_cli/grid/master_dm_parser) + `tests/server/rules-bridge.spec.js` + `tools/py/master_dm.py` + `tools/py/mark_python_rules_deprecated.py`. Patched `gen_trait_types.py` (drop PY codegen, mantenuto TS+Schema). YAML comments + CLAUDE.md + combat hub + ADR-2026-04-19 status → CLOSED. ADR-2026-04-13 superseded.

### Bug / tech debt identificati

> **Audit 2026-04-24**: CLAUDE.md "Backlog ticket aperti" era stale. Verificato contro git history.

- [x] ~~**TKT-06**~~ — `predict_combat` ignora `unit.mod` stat → **✅ CHIUSO in PR #1588 (`2d6394dd`)** 2026-04-18. `resolve_attack_v2` + `predict_combat` Python + JS `predictCombat` ora includono actor.mod + aggregate_mod parity.
- [x] **TKT-07** ✅ — Tutorial sweep #2 N=10/scenario. SHIPPED 2026-05-21: nuovo tool generico `tools/py/batch_sweep_tutorials.py` (riusa helper hardcore06) + run N=10 × enc_tutorial_01-05 → `docs/playtest/2026-05-21-tutorial-sweep.json`. Risultato: 5/5 scenari funzionali + winnable (WR 100% scripted-AI, 0 errori, rounds 6-13) = HEALTH PASS. Caveat (nel report): player scripted ≠ ai_profiles/human (WR upward-biased) + diff_rating→class mapping coarse → verdict RED informativo, non balance-oracle. Balance vero = real ai_profiles / master-dd playtest.
- [x] ~~**TKT-08**~~ — Backend stability under batch (morì run #14 batch N=30) → **✅ CHIUSO 2026-04-26 (branch `fix/tkt-08-batch-harness-stability`)**. Diagnosi: (1) `planningTimers` Map in `sessionRoundBridge.js` non cancellato a `/end` → orphan setTimeout closures accumulano in Node timer queue su batch lunghi (callback no-op grazie al guard, ma queue cresce N×runs). Fix: `cancelPlanningTimer` esposto da `createRoundBridge` + invocato in `/end` prima di `sessions.delete` (defensive try/catch). (2) `batch_calibrate_hardcore07.py` era bare urlopen senza retry/health/cooldown/jsonl → transient backend stalls causavano crash mid-batch. Fix: porting hardening pattern da `batch_calibrate_hardcore06.py` (retry exp backoff 5×0.5s base, `/api/health` probe fail-fast pre-batch + ogni 10 run, cooldown 0.5s, JSONL incremental write resume-friendly, `--skip-health` opt-out). Test: AI 311/311 + session API 77/77 verdi, prettier verde, syntax python OK, CLI args wire OK. ADDITIVE only (zero breaking change). Doc: `docs/process/2026-04-26-tkt-08-backend-stability.md`.
- [x] ~~**TKT-09**~~ — `ai_intent_distribution` mancante in `/round/execute` response → **✅ CHIUSO in PR #1551 (`092bff14`)** 2026-04-18. Harness `_ai_actions_from_resp` filtra `results[]` per `actor_id ∈ SIS`.
- [ ] **TKT-10** — Harness retry+resume incrementale (JSONL write per-run). **Parziale**: PR #1551 probe_one addendum; retry+resume esplicito da confermare.
- [x] ~~**TKT-11**~~ — `predict_combat` 8p aggregate sanity boss vs full party → **✅ CHIUSO** (branch `test/tkt-11-predictcombat-8p-sanity`). 11 test additive in `tests/api/predict-combat-8p.test.js` (~200 LOC): no-NaN/Infinity guard 8p × boss, hit% bands sane 40-60%, aggregate hit chance bands 3.5-5.5/round, edge mod 10 vs DC 10 → 95-100%, edge mod 0 vs DC 18 → 5-25%, evasion_bonus_bonus + defense_mod_bonus stack additivo (PR #1830 ripple), attack_mod_bonus buff monotonic, asymmetry boss→tank vs tank→boss, reverse 8 enemies vs tank aggregate sanity, determinism analytic enumeration. AI baseline 311/311 verde, predict-combat baseline 10/10 verde, format:check verde. ADDITIVE test-only (zero production code change).

### Triangle Strategy MBTI surface tickets (proposed OD-013, pending user verdict)

- [x] ~~**TKT-P4-MBTI-001** — Phased reveal MBTI Disco-Elysium-style (Proposal A, ~6-8h)~~ → **✅ CHIUSO 2026-04-25 sera (branch `feat/d1a-mbti-phased-reveal`)**: `apps/backend/services/mbtiSurface.js` (NEW, ~140 LOC) helper `computeRevealedAxes` + `buildMbtiRevealedMap` con confidence derivata da coverage×decisiveness, threshold default 0.7 (env `MBTI_REVEAL_THRESHOLD` A/B testabile), label italiani conservative (T="Pensiero"/F="Sentimento"/E="Estroversione"/I="Introversione"/S="Sensazione"/N="Intuizione"/J="Giudizio"/P="Percezione") + hint diegetici per assi nascosti ("Sei socievole o solitario? Ancora non lo sai."). Routes `/:id/vc` e `/:id/pf` estese additivamente con `mbti_revealed` per_actor (lazy-import + try/catch non-blocking, zero breaking change). Frontend `debriefPanel.js` nuova sezione `#db-mbti-section` (4 axis card + hidden hints + confidence bar) + setter `setMbtiRevealed(payload)` + CSS `.db-mbti-*`. 12/12 unit test nuovi (`tests/services/mbtiSurface.test.js`), AI baseline 311/311 verde, vcScoring 56/56 verde, session API smoke verde. P4 🟡 → 🟡+ (UI surface live, playtest pending). Card [M-2026-04-25-009](docs/museum/cards/personality-triangle-strategy-transfer.md) reuse_path eseguito.
- [x] ~~**TKT-P4-MBTI-002** — Dialogue color codes diegetic (Proposal B, ~5-7h)~~ → **✅ CHIUSO 2026-04-26 (branch `feat/d1b-mbti-dialogue-color-codes`)**: palette canonical 8 lettere E/I/S/N/T/F/J/P in `data/core/personality/mbti_axis_palette.yaml` (WCAG AA garantito ≥5.02:1 contrast vs `#ffffff`, range 5.02-8.72). Backend helper `apps/backend/services/mbtiPalette.js` (loadMbtiPalette memoized + try/catch graceful, colorForAxis lookup, mbtiTaggedLine wrap inline `<mbti axis="X">...</mbti>`, wcagContrastRatio utility). Frontend renderer `apps/play/src/dialogueRender.js` (renderMbtiTaggedHtml DOM-free, isAxisRevealed gating compose con Path A, tagsAreBalanced + escapeHtml safety, stripMbtiTags accessibility fallback) + CSS `apps/play/src/dialogueRender.css` (8 axis classes, hover tooltip pure-CSS, dark-bg `text-shadow`, print-safe `@media print`). Reveal-gated: colore renderizzato SOLO se `mbtiRevealed.revealed[]` contiene axis pair (compose Path A). 26/26 test nuovi `tests/services/mbtiPalette.test.js` (load/lookup/tag/WCAG/render/escape/balance/strip). AI baseline 311/311 verde, format:check verde. ADDITIVE only: testo senza tag passa-through unchanged. P4 🟡+ → 🟡++ (Path A+B both shipped; integration in `narrativeEngine` + `render.js` pendente, helpers ready).
- [ ] **TKT-P4-MBTI-003** — Recruit gating by MBTI thresholds (Proposal C, ~4-6h). Hook `metaProgression.recruitFromDefeat`. ~~Pre-req: M-007 mating engine activate (Path A in OD-001)~~ **[audit 2026-06-20: pre-req CLEARED — mating engine SHIPPED (OD-001 Path A FULL CLOSURE + SPEC-J/K); ticket actionable, attende solo verdetto OD-013]**.

### Museum-driven autonomous tasks (user verdict 2026-04-25)

- [x] ~~**TKT-ANCESTORS-RECOVERY (P2 autonomous)**~~ — Caccia online 263 neuroni Ancestors → **✅ CHIUSO 2026-04-25 PR #1815 (`73bbab3e`)** "OD-011 Path B v07 wiki recovery 297/297 neurons". Method: Fandom wiki MediaWiki API bypass Cloudflare (`action=query&prop=revisions&rvslots=main` + custom UA). Branches recovered: Senses 37 + Ambulation 26 + Dexterity 33 + Attack 8 + Dodge 10 + Self-Control 12 + 9 bonus rami (Communication 20, Intelligence 14, Motricity 20, Omnivore 11, Settlement 10, Swim 5, Metabolism 4, Preventive 30, Therapeutic 24, Hominid lineages 33). Output: `reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv` 76KB + manifest SHA256. License CC BY-NC-SA 3.0. RFC v0.1 promise CLOSED.
  - [x] ~~**Follow-up wire 263 entries**~~ → **✅ CHIUSO 2026-04-26** branch `feat/ancestors-v07-residual-90-entries`. Diff CSV 297 codes vs YAML 290 records (post-PR #1817 batch wire 267) rilevò gap reale di **7 codes truly missing** (BB CO 02, BB DO 01/02/03-2, BB FR 02-04). Audit "22 residual" overstated — actual gap 7 (variant rows of Path A T2 genetic ancestors). Coverage chiusa via 2 range-extension provenance updates (`ancestor_attack_released_strength` BB CO 01 → BB CO 01-02; `ancestor_self_control_determination` BB FR 01 → BB FR 01-04) + 1 nuovo entry `ancestor_dodge_infundibular_pathway` T2 collassante BB DO 01/02/03-2 (Infundibular Pathway = genetic version di DO 06 Atarassia, target focused 2t). All 297/297 v07 codes ora hanno YAML mapping. Total ancestor entries 289 → **290**. AI baseline 311/311 verde, traitEffects 21/21 verde, schema lint passing, dataset validate 0 avvisi, prettier clean, docs governance 0 errors.
- [x] ~~**TKT-MUSEUM-ENNEA-WIRE (P1 autonomous)**~~ → **✅ CHIUSO 2026-04-25 sera** stack 3 PR consecutive: [#1825](https://github.com/MasterDD-L34D/Game/pull/1825) (`5c088ee5` enneaEffects 6/9 wire mechanical+log_only) + [#1827](https://github.com/MasterDD-L34D/Game/pull/1827) (`9f48cef6` 9/9 archetype coverage Riformatore+Individualista+Lealista) + [#1830](https://github.com/MasterDD-L34D/Game/pull/1830) (`b27a612c` 3 stat consumer wire move/stress/evasion → 9/9 mechanical). Card M-006 reuse_path fully implemented. Pre-req `buildVcSnapshot` per-round mode soluto via lazy invocation in `sessionRoundBridge.applyEndOfRoundSideEffects` post status decay (gate `session.turn > 1`, KO-skip, telemetry config caching). 311/311 AI baseline preserved + 31 tests new su `enneaEffectsWire.test.js`. P4 🟡 → 🟢 candidato definitivo. Card M-006 stato `curated → revived`.
- [x] ~~**TKT-MUSEUM-SKIV-VOICES (P1 autonomous)**~~ → **✅ CHIUSO 2026-05-05** PR #2061 (`d16cd941`) Type 5+7 + estensione 9/9 (Riformatore/Coordinatore/Conquistatore/Individualista/Lealista/Cacciatore/Stoico). 9 palette × 7 beat = ~189 line totali. Selector + endpoint `GET /api/session/:id/voice` + telemetry `ennea_voice_type_used`. P4 🟡++ → 🟢 candidato (9/9 archetype voice live).
- [x] ~~**TKT-MUTATION-P6-VISUAL**~~ → **✅ CHIUSO 2026-05-05** branch `feat/mutation-aspect-token`. `visual_swap_it` 36/36 (pre-shipped #711619e7) + `aspect_token` 36/36 backfill deterministico (`claws_glacial`/`wings_resonant`/etc.) + `tools/py/lint_mutations.py` esteso enforcement entrambi field + `apps/play/src/render.js` ASPECT_TOKEN_OVERLAY 4 → 36 token (glyph alphabet ◆▲◇◉✦❄◊▼⬢◈⌬☉ + colori thematic). Gate 5 surface live (player vede glifo overlay per ogni mutation). Card [M-2026-04-26-001](docs/museum/cards/evolution_genetics-voidling-bound-patterns.md) reuse_path Moderate complete.
- [x] ~~**TKT-MUSEUM-SWARM-SKIV (P0 Sprint A)**~~ — Single-shot magnetic_rift_resonance (OD-012) → **✅ CHIUSO 2026-04-25** in PR #1774 (`c06e02c4` biomeResonance.js + research_cost reduction) + PR #1779 (`8413fd47` Hybrid Path perks). magnetic_rift_resonance T2 trait + 2 prereq stub (magnetic_sensitivity, rift_attunement) promossi a `data/core/traits/active_effects.yaml`. Biome alias `atollo_ossidiana → atollo_obsidiana` in `biome_aliases.yaml`. Flag `magnetic_field_strength=1.0` su atollo_obsidiana in biomes.yaml. Wired in `apps/backend/services/combat/biomeResonance.js` (185 LOC, BIOME_FAMILIES.aquatic + skirmisher archetype). Staging file conservato come provenance.
- [x] ~~**TKT-MUSEUM-ANCESTORS-22-TRIGGER (P0 Sprint B)**~~ → **✅ CHIUSO 2026-04-25 PR #1813 (`59dc7195`)** "feat(traits): OD-011 Path A — 22 ancestors reaction trigger". Implementati 22 trait `ancestor_<ramo>_<name>` in `data/core/traits/active_effects.yaml` coprendo 5 rami con genetic variants collapsed: 8 Self-Control (FR 01-08, BB FR 01-04 → Determination ×1) + 6 Attack (CO 01-06) + 7 Dodge (DO 01-07) + 1 Released_Strength (BB CO 01-02 → ×1). Effect kind `extra_damage amount: 1`. **Reality note**: card originale claim "22 Self-Control" smentito da awk count CSV (12 SC reali). PR #1813 ha riinterpretato scope come "22 trigger overall (5 rami)" con BB collapsed = decisione difendibile. Card fix in PR drift fix #2 2026-04-25.

### Pre-playtest coop fixes (da audit coop-phase-validator 2026-04-24)

Ref: `docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md` (agent run verdict 🟡 minor, 0 blocker).

- [x] ~~**F-1 (P1, ~1h)**~~ — Host transfer mid-combat phase rebroadcast → **✅ CHIUSO PR #1736 (`b7abfe39`)** 2026-04-24. `wsSession.js` host transfer ora rebroadcast coop phase_change + character_ready_list al new host + peers post-promotion. coopStore inject opzionale in createWsServer (backward-compat se assente). Linea 627 nota: "Optional `coopStore` (F-1)".
- [x] ~~**F-2 (P1, ~1h)**~~ — Stuck-phase escape hatch → **✅ CHIUSO PR #1736 (`b7abfe39`)** 2026-04-24. Endpoint `POST /api/coop/run/force-advance` host-only in `apps/backend/routes/coop.js:206`. Whitelist `character_creation → world_setup`, `debrief → next scenario/ended`. Implementato in `coopOrchestrator.js:269 forceAdvance({reason})`.
- [x] ~~**F-3 (P2)**~~ — `submitCharacter` membership check → **✅ CHIUSO PR #1736 (`b7abfe39`)** 2026-04-24. Membership check `allPlayerIds` rifiuta ghost client con error `player_not_in_room` (quando `allPlayerIds` non vuoto).

### Test coverage gaps coop (non bloccanti, da audit)

- [x] ~~Phase-skip negative tests (`confirmWorld()` from lobby should throw)~~ → **✅ CHIUSO 2026-05-20** branch `claude/parallel-coop-test-coverage-2026-05-20`. 5 nuovi test in `tests/api/coopOrchestrator.test.js`: confirmWorld lobby/character_creation throw `not_in_world_setup`, startRun combat/debrief throw `cannot_start_from_phase:*`, startRun ended succeeds (allowed restart).
- [x] ~~Multi-player disconnect race test~~ → **✅ CHIUSO 2026-05-20** branch `claude/parallel-coop-disc-race-ws-e2e-2026-05-20`. 3 nuovi test WS-level e2e in `tests/api/coopDisconnectRace.test.js`: (1) 3-player vote scenario p_b abrupt terminate mid-tally → `connected_total` scende da 3→2, `all_connected_accepted` fires solo quando p_c (last connected) vota; (2) 2-player p_b reject + drop → `connected_reject=0` post-drop + `all_connected_accepted=true` (p_a unanime dei connected); (3) reconnect within ghostTimeoutMs → vote preserved in `orch.worldVotes` + tally reconciled. Composti pattern P1+P2+P5+P6 da museum card M-2026-05-20-001. Valida end-to-end B-NEW-1 fix 2026-05-08 (`wsSession.js:1524` connected-only quorum filter).
- [x] ~~Host-transfer + coop-state sync e2e~~ → **✅ CHIUSO 2026-05-20** branch `claude/parallel-coop-host-transfer-ws-e2e-2026-05-20`. 3 nuovi test WS-level in `tests/api/coopHostTransferSync.test.js` che chiudono gap F-1: (1) `world_tally` rebroadcast in `world_setup` phase post host-transfer abrupt (oltre a `phase_change` + `character_ready_list` già coperti F-1); (2) `debrief_ready_list` + `debrief_payload` rebroadcast in `debrief` phase post host-transfer (Bundle C parity, payload propagation `per_actor` sentience verified); (3) sequential host transfers A→B→C preservano `orch.hostId` sync via `setHostId()` (PR #2337 foundation). Composti pattern P1+P2+P3+P5+P6 da museum card M-2026-05-20-001. Valida end-to-end `wsSession.js:1015 rebroadcastCoopState` + sync `orch.hostId !== room.hostId` branch.
- [x] ~~Room-code alphabet regex purity test~~ → **✅ GIÀ CHIUSO** in `tests/api/wsRoomCode.test.js` (Wave 3 #4 audit 2026-04-24). 4 test: alphabet 20 consonant zero vowel, single-shot smoke, 1000-sample statistical purity, uppercase/no-space sanity. BACKLOG entry era stale.
- [x] ~~`startRun()` from combat phase untested~~ → **✅ CHIUSO 2026-05-20** stesso branch coop-test-coverage (vedi sopra).

### Triangle Strategy transfer (design-driven, new)

Da `docs/research/triangle-strategy-transfer-plan.md` — 10 meccaniche identificate, rollout 3 sprint slice:

- [x] **M14-A CHIUSO** — Mechanic 3 elevation damage multiplier + Mechanic 4 terrain reactions → helpers PR #1736 (`b7abfe39`) 2026-04-24, terrainReactions wire + elevation wire residual chiuso branch `feat/tkt-09-elevation-resolver-wire` 2026-04-26. Helpers: `elevationDamageMultiplier` in `hexGrid.js` (delta>=1 → 1.30, delta<=-1 → 0.85), `terrain_defense.yaml` attack_damage_bonus 0.30/-0.15, `apps/backend/services/combat/terrainReactions.js` + `chainElectrified` BFS.
  - [x] **terrainReactions wire** — branch `feat/m14a-terrain-reactions-wire` 2026-04-25: `performAttack` post-damage hook chiama `reactTile` quando `action.channel` mappa a fire/ice/water/lightning, `session.tile_state_map` persiste cross-round, decay ttl in `applyEndOfRoundSideEffects`, `terrain_reaction` field surfaced on attack event + response. +7 test (`tests/api/terrainReactionsWire.test.js`). 12/12 unit + 19/19 wire+unit verde, 311/311 AI baseline preserved.
  - [x] **elevation resolver wire residuo** — branch `feat/tkt-09-elevation-resolver-wire` 2026-04-26: `predictCombat` ora ritorna `elevation_multiplier` + `elevation_delta` + `expected_damage` (proxy hit_pct × (1+avg_pt) × multiplier). `performAttack` return surfacing `positional` info, `buildAttackEvent` emits `elevation_multiplier`/`elevation_delta`/`positional_multiplier`/`attack_quadrant` su event quando delta != 0 (rumor reduction). 9 buildAttackEvent call sites wired (sessionRoundBridge, sistemaTurnRunner, 7 in abilityExecutor). +10 test (`tests/services/elevationResolverWire.test.js`). 311/311 AI + 12/12 hardcore + 17/17 round + 7/7 terrainReactions verde. Calibration HC06 iter4 invariata (BOSS mod 5→3 + elev 1 attaccante).
  - **Ancora aperto**: facing system runtime (M14-B parzialmente shipped, full UI integration pending), chainElectrified BFS chain wire (deferred M-future).
- [ ] **M14-B** — ~~Mechanic 1 (Conviction → MBTI axis reveal)~~ **✅ Mechanic 1 SHIPPED #2248/#2249/#2250 (2026-05-11)** + **Mechanic 2 (Scales of Conviction → M18 world_setup upgrade) OUTSTANDING** [audit 2026-06-20: verificato no impl — `worldSetupVote.js` assente, `worldSetup.js` zero match conviction/weight, nessun PR; residuo = weighted-vote world_setup + persuasion sub-phase + tie-break, Effort M]. Target Pilastro 4 MBTI.
- [x] ~~**M15** — Mechanic 7 (Initiative CT bar / Wait action) + Mechanic 6 (class promotion XCOM-style)~~ → **✅ CHIUSO 2026-05-11** [audit 2026-06-20]: PR #2242 (CT bar audit + `promotionEngine.js` + `promotions.yaml` + 17 test) + #2245 (FE accept/defer UI). Artifacts su main: `ctBar.js` (lookahead 3-turni = "Wait"), `promotionPanel.js` wired `endgame.js`. Target Pilastro 3 Specie×Job.

### Sprint 3 archivio (chiude readiness 24/24)

- [x] BACKLOG.md file root (questo)
- [x] OPEN_DECISIONS.md root (vedi file)
- [ ] Master orchestrator decision formalizzata (deferred a sessione successiva via ADR o note inline)

---

## 🟢 Priorità bassa

### Research / exploratory

- [ ] **P1 skills install** — seguire `docs/guide/claude-code-setup-p1-skills.md` (filesystem/git/github MCP + superpowers + serena). ~35 min userland.
- [ ] **Cherry-pick `wshobson/agents`** bundle — valutare skill specifiche (NON bulk install, context bloat risk).
- [ ] **`Game Balance & Economy Tuning` skill** install (mcpmarket.com) — fit diretto Pilastro 6 calibration, post-playtest round 2.

### Deferred (post-MVP)

- [x] ~~**V3 Mating/Nido** system — ~20h, post-MVP~~ → **✅ ENGINE SHIPPED (OD-001 Path A FULL CLOSURE + SPEC-J/K)** [audit 2026-06-20]: nido sprint A-D (#1874/#1875/#1876/#1879) + `metaProgression.js` (canMate/rollMating/recruitFromDefeat) + SPEC-J #2823 + SPEC-K K-05 #2871. La cornice "~20h non-iniziato" era stale ("Engine LIVE Surface DEAD" museum case). Residuo reale = **M12+ P2 Form-evoluzione** (L1002) + **K-07 real-device smoke** recruit/mating/Nido (sez.9.9). Vedi `docs/core/Mating-Reclutamento-Nido.md`.
- [ ] **V6 UI TV dashboard polish** — ~6h, post-playtest live.
- [ ] **M12+ P2 Form evoluzione completa** Spore-core — ~35h, deferred (CLAUDE.md sprint roadmap).

### Tech debt long-term

- [ ] **Python rules engine Phase 2/3** removal — ADR-2026-04-19 kill-python. Phase 2 feature freeze + Phase 3 removal pending (services/rules/).
- [ ] **Prisma room persistence** (Phase C opzionale, default in-memory). Attiva solo se deploy pubblico.
- [ ] **Rate-limit / DoS hardening** (Phase D). Solo se deploy pubblico.
- [ ] **Alt B Game-Database HTTP runtime** attivazione (flag-OFF attuale, vedi `ADR-2026-04-14-game-database-topology.md`).

### Deferred decisions (gated post-playtest)

- [ ] **Colyseus adoption** — verdetto 2026-04-28 NO ora. Riapri SOLO se TKT-M11B-06 playtest live mostra trigger soglia (state broadcast lag >10KB, stanze concorrenti >50, host drop UX rotto, reconnect replay needed). Se nessun trigger → close decisione "ws native canonical". Vedi addendum 2026-04-28 in `docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md`.

---

## 🚫 Bloccato da

- **TKT-07** ← TKT-06 (predict_combat fix prima di sweep #2)
- **V6 UI polish** ← playtest canonico AI-driven (`docs/process/CANONICAL-AI-PLAYTEST.md`) OR feedback human opzionale (TKT-M11B-06 declassato, non bloccante)
- ~~**M15 Triangle Strategy** ← M14-A + M14-B completati~~ → **RISOLTO [audit 2026-06-20]**: M14-A shipped + M14-B Mechanic-1 shipped + M15 stesso CHIUSO (#2242/#2245). M14-B Mechanic-2 residuo non blocca M15 (gia' shipped).
- **Alt B HTTP runtime** ← Game-Database sibling repo availability + deployment pubblico

---

## Primo sprint consigliato post-merge PR #1732 — ⚠️ SUPERSEDED 2026-06-20 (archivio storico)

> **SUPERSEDED [ground-truth audit 2026-06-20]**: il gate del progetto e' ora **AI-driven batch-sim** (`docs/process/CANONICAL-AI-PLAYTEST.md` / PR #2802), NON playtest umano. Task 1 (TKT-M11B-06 playtest 2-4 amici) declassato a conferma opzionale non-bloccante (ref "Bloccato da" V6 L1020 + PROJECT_BRIEF). Task 3 M13 P6 calibration hardcore_07 SHIPPED #2359 (poi superseded da PE_ratio #2867). Blocco lasciato come archivio storico; nessun task live qui.

**Obiettivo (storico)**: chiudere Pilastri 5 + 6 🟢 definitivi tramite playtest live.

- **Task 1** (userland, 2-4h): **TKT-M11B-06** playtest live 2-4 amici
- **Task 2** (autonomous post-playtest, ~2h): invoke agent `playtest-analyzer` sui telemetry raccolti
- **Task 3** (autonomous, ~3h): **M13 P3 Phase B balance pass N=10** + **M13 P6 calibration hardcore 07**

**Definition of Done**:

- Playtest completato senza crash
- Analysis report in `docs/playtest/YYYY-MM-DD-playtest-round-2-analysis.md`
- Pilastri 5 + 6 aggiornati a 🟢 (o 🟢c con gap minori documentati) in CLAUDE.md
- TKT-06..11 aggiornati (chiusi o re-prioritizzati con evidenza)

---

## Audit log

**2026-05-06** (Wave 1-4 + closure bundle — 5 PR shipped main, 7 gap audit close):

- ✅ **Wave 1 docs sweep** PR [#2065](https://github.com/MasterDD-L34D/Game/pull/2065) (`42727de3`):
  - ADR-2026-05-06-drop-hermeticormus-sprint-l.md shipped — Sprint L formal DROP, plan v3.3 effort -2g.
  - Path drift correction: solo `data/skiv/` reale (2 ref fixati → `docs/skiv/`). Altri 3 path canonical.
  - COMPACT_CONTEXT v23 → v24, BACKLOG audit log entry, gap audit §P1.4 + §P1.6 CLOSED.
- ✅ **Wave 2 governance batch** PR [#2066](https://github.com/MasterDD-L34D/Game/pull/2066) (`a59985ed`):
  - 460 → 218 stale_document warnings (-52.6%). 249 entries updated (archive 112 + root 10 + planning/reports/playtest 98 + qa/logs/presentations 29).
  - `docs/reports/2026-05-06-governance-drift-audit-wave-2.md` audit report.
- ✅ **Wave 3 coop test coverage** PR [#2067](https://github.com/MasterDD-L34D/Game/pull/2067) (`e4447575`):
  - +9 negative tests audit 2026-04-24 §coop (items #1, #4, #5 + 4 defensive extras).
  - Items #2 (multi-disconnect race) + #3 (host-transfer e2e full) DEFERRED — port Godot Sprint M.7 incoming.
- ✅ **Wave 4 docs:smoke fix** PR [#2068](https://github.com/MasterDD-L34D/Game/pull/2068) (`50cbb04d`):
  - Fix spawn EINVAL Windows Node v22+ (CVE-2024-27980 mitigation): shell:true gate win32.
  - Item #7 TKT-07 Tutorial sweep N=10 DEFERRED — backend+telemetry infra dep, separate session.
- ✅ **Closure bundle** (this PR — pending):
  - Sprint S Mission Console deprecation row (gap audit P1.5 CLOSED) → plan v3 §Sprint S checklist + nota inline.
  - Sprint M.3 silhouette spec addendum (gap audit P1.7 CLOSED) → `docs/core/41-ART-DIRECTION.md §Job-to-shape` (path canonical 41 non 22).
  - Handoff doc sessione 2026-05-06 + BACKLOG cleanup row.

**Sessione totals 2026-05-05/06**: **15 PR shipped main** (cumulative #2056-#2068 + this bundle). 9+4 BACKLOG ticket chiusi. Plan v3.3 effort -2g. Governance -52.6% warnings. Coop test +9. Pillar P4 🟡 → 🟢 candidato.

**2026-05-05** (cutover Phase 3 + Sprint 8.1 expansion — 9 PR shipped main):

- ✅ 9 PR mergiati main: #2056 (handoff doc) + #2057 (Sprint 8.1 expansion r3/r4) + #2058 (cleanup audit Phase 3) + #2059 (services/rules/ removal Phase 3) + #2060 (mutation aspect_token 36/36) + #2061 (ennea voice Type 5+7) + #2062 (ennea voice 9/9) + #2063 (cleanup stale comments) + #2064 (test artifacts refresh).
- ✅ ADR-2026-04-19 ACCEPTED + Phase 3 closed (services/rules/ Python rimosso).
- ✅ ADR-2026-04-13 superseded.
- ✅ 7 BACKLOG ticket chiusi: TKT-RULES-PHASE-3 + TKT-RULES-SIMULATE-BALANCE + TKT-TRAITS-ANCESTOR-BUFF-STAT + TKT-GATE5-CONVICTION + TKT-MUTATION-P6-VISUAL + TKT-MUSEUM-SKIV-VOICES + TKT-SERVICES-ORPHAN.
- 📊 **Pillar shift**: P4 Temperamenti MBTI/Ennea 🟡 → 🟢 candidato (9/9 archetype voice live + endpoint + telemetry).
- 📊 **Test baseline post-merge**: AI 383/383 + pytest 735/735 + format clean + governance 0 errors.

**2026-04-24** (backlog audit post-Sprint 3):

- CLAUDE.md "Backlog ticket aperti" sezione 17-18/04 era stale:
  - TKT-06 listato come aperto → CHIUSO in PR #1588 (`2d6394dd`, 2026-04-18)
  - TKT-09 listato come aperto → CHIUSO in PR #1551 (`092bff14`, 2026-04-18)
  - TKT-08/TKT-10 parzialmente affrontati in PR #1551/#1559, marcati "parziale"
  - TKT-11 confermato aperto → CHIUSO 2026-04-26 (branch `test/tkt-11-predictcombat-8p-sanity`, 11 test additive)

**2026-04-24** (coop-phase-validator real run, primo uso post-policy 4-gate DoD):

- Agent invocato su codice reale (non smoke test). Verdict 🟡 minor issues, 0 blocker, cleared per playtest.
- 3 findings aggiunti al backlog (F-1, F-2, F-3)
- 5 test coverage gap identificati (non bloccanti pre-playtest)
- P1 fixes ~2h pre-playtest: F-1 (host transfer coop phase rebroadcast) + F-2 (force-advance endpoint)
- Report: `docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md`

**Lesson**: CLAUDE.md narrative sprint context tende a fossilizzarsi — BACKLOG.md è single source of truth per stato ticket. Sync manuale post-merge PR importanti, o via skill `sprint-close`.

**2026-04-25** (D2 Path A faithful pivot — M14 mutation framework foundation):

- ✅ D2 mutation_catalog Path A — M14 framework loader + routes. `apps/backend/services/mutations/mutationCatalogLoader.js` + `apps/backend/routes/mutations.js` + plugin wire. 30 entries shipped, 4 endpoint REST (`/registry`, `/:id`, `/eligible`, `/apply`). +12 test (8 loader + 4 routes). PE/PI charging deferred a M13.P3 wire (display-only). Decoupled da V3 mating per design semantics — vedi card M-007.

**2026-05-05** (Sprint 8.1 Ability r3/r4 expansion gap-fill — codename snoopy-milner):

- ✅ **Sprint 8.1** — Ability r3/r4 expansion roster gap-fill. Audit 2026-05-05 ha rilevato 4 expansion job orphan (stalker/symbiont/beastmaster/aberrant) con solo r1/r2 wired; PR #1978 originale shippò solo i 7 base. `data/core/jobs_expansion.yaml` v0.2.0 → v0.3.0 (12 → 20 ability expansion, +8 nuove: 2/job × 4 expansion). Cost ladder canonical r3=14 / r4=22 PI mirror base. 8 ability nuove via 6 effect_type esistenti (debuff, execution_attack, team_buff, team_heal, aoe_buff, buff, surge_aoe): stalker (shadow_mark+shadow_assassinate), symbiont (bond_amplify+unity_surge), beastmaster (feral_dominion+apex_pack), aberrant (stabilized_mutation+perfect_mutation). Vincolo critical: zero nuovi runtime types, zero modifica abilityExecutor.js (extension data-only — vincolo PR #1978 preservato). 4 test nuovi jobs.test (expansion ladder + naming + version bump + rank sort) + 5 test nuovi abilityExecutor (dervish/headshot/apocalypse/lifegrove smoke r4 base + shadow_assassinate r4 expansion) = jobs 18/18 + abilityExecutor 41/41. ADR-2026-04-27 §6 expansion roster + numeric-reference §12 expansion table. AI baseline 382/382 zero regression. Pillar P3 🟢ⁿ → 🟢++ (roster 11/11 job r1→r4 wired complete). Out of scope: balance playtest expansion (deferred a calibration sprint), frontend redesign (auto-respect via JSON catalog).

**2026-04-27** (Sprint 8 Ability r3/r4 tier progressive — AncientBeast Tier S #6 closure 4/4 100%):

- ✅ **Sprint 8** ([PR #1978](https://github.com/MasterDD-L34D/Game/pull/1978)) — Ability r3/r4 tier progressive. `data/core/jobs.yaml` v0.1.0 → v0.2.0 (21 → 35 base ability, +14 nuove: 2/job × 7 base job). Cost ladder canonical r1=3/r2=8/r3=14/r4=22 PI (curva quasi-quadratica). 14 ability nuove via 7 effect_type esistenti (move_attack, multi_attack, buff, aoe_buff, aoe_debuff, ranged_attack, surge_aoe, team_buff, team_heal, drain_attack, execution_attack, debuff): skirmisher (phantom_step+dervish_whirlwind), vanguard (aegis_stance+bulwark_aegis), warden (chain_shackles+void_collapse), artificer (arcane_renewal+convergence_wave), invoker (arcane_lance+apocalypse_ray), ranger (hunter_mark+headshot), harvester (vital_drain+lifegrove). Vincolo critical: zero nuovi runtime types, zero modifica abilityExecutor.js (extension data-only). 5 test nuovi (cost ladder + naming uniqueness + rank sort + version bump + r3/r4 specific keys) + 1 e2e smoke abilityExecutor (phantom_step move_attack via /api/session/action) + ADR-2026-04-27-ability-r3-r4-tier + numeric-reference §12 + stato-arte §B.1.5 marked 0 residui. jobs 14/14 + abilityExecutor 36/36 + AI 382/382 zero regression. Pillar P3 🟢c++ → 🟢ⁿ. **Tier S #6 100% closed** (channel resist #1964 + Beast Bond #1971 + wiki cross-link #1937 + r3/r4 progression this PR).

**2026-04-27** (Sprint 7 Beast Bond reactions — AncientBeast Tier S #6 closure 3/4):

- ✅ **Sprint 7** ([PR #1971](https://github.com/MasterDD-L34D/Game/pull/1971)) — Beast Bond creature reaction trigger system. `data/core/companion/creature_bonds.yaml` (6 bond pair canonical, 5 archetype combo) + AJV schema `creature_bond.schema.json` + engine `apps/backend/services/combat/bondReactionTrigger.js` (~250 LOC) + wire `session.js` performAttack post intercept + `sessionRoundBridge.js` capture/emit reaction_trigger event + 19 unit test (loader, eligibility gates, cooldown, counter_attack/shield_ally fire, back-compat) + ADR-2026-04-27 + numeric-reference §11 + stato-arte §B.1.5. Reaction types: counter_attack (-1 dmg_step + refund pulled punch) + shield_ally (50% absorb transfer). Caps: 1/round/actor + cooldown_turns regen + mutually exclusive con M2 intercept. Compat: missing YAML → no-op silent. AI 363→382 verde, format/schema/governance verdi. Pillar delta P1 🟢++ → 🟢ⁿ (creature reactivity surface) + P3 🟢c+ → 🟢c++ (species_pair semantics). Tier S #6 residuo: solo Ability r3/r4 ~10h aperto.

**2026-04-27 notte** (Sprint 1-5 autonomous + OD-001 closure + docs sync):

- ✅ **Sprint 1** (PR #1934) — Wesnoth time-of-day modifier + AI War defender's advantage + Disco day pacing flavor + Fallout numeric reference doc + 2 ADR design AI War. Tier S #5/#9/#10/#11 chiusi.
- ✅ **Sprint 2** (PR #1935) — Subnautica habitat lifecycle wire (Tier A #9 chiuso). `biomeAffinity` service + `dune_stalker_lifecycle.yaml` + 14 species lifecycle stub + `seed_lifecycle_stubs.py` + biomeSpawnBias init wave universal closure (Engine LIVE / Surface DEAD anti-pattern killed).
- ✅ **Sprint 3** (PR #1937) — Codex completion (3 chiusure): Tunic Glifi codexPanel tab + AncientBeast `wikiLinkBridge` slug + Wildermyth choice→permanent flag campaign state. Bonus: 4 stale fixture fix opportunistic (sangue_piroforico nerf #1869 + orphan currency #1870 + schema object #1871).
- ✅ **Sprint 4** (PR #1938) — UI polish: Cogmind stratified tooltip Shift-hold expand + Dead Space holographic AOE cone shimmer + Isaac Anomaly card glow effect. Tier B #3/#7 + Tier S #11 hybrid chiusi.
- ✅ **Sprint 5** (PR #1940) — Telemetry viz: Tufte sparkline HTML dashboard + DuckDB +4 SQL query (mbti_distribution / archetype_pickrate / kill_chain_assists / biome_difficulty). Tier E #9/#13 chiusi.
- ❌ **PR #1877 closed-superseded** — OD-001 Sprint C UI 51K LOC stale. Backend già live #1879 + UI Lineage tab #1911. OD-001 Path A 4/4 chiuso end-to-end via combo.
- ✅ **PR #1952 docs sync** — CLAUDE.md sprint context + COMPACT_CONTEXT v9 + stato-arte §A.2 + OPEN_DECISIONS OD-001 closure + 13 ticket auto-gen `proposed/` → `merged/` + combat hub cross-link.

**Pillars finali**: 5/6 🟢 def/c++/c+ + 1/6 🟢c (P5 unblock playtest live).
**Test baseline**: 324 → 364 (+40 nuovi + 4 fixture restore + 0 regression).
**Total PR shipped 2026-04-25 → 2026-04-27 notte**: **54** (+ 1 closed-superseded + 1 docs sync).
**Handoff**: `docs/planning/2026-04-27-sprint-1-5-autonomous-handoff.md`.

## Ref

- CLAUDE.md sezione "Sprint context" e "Pilastri" = dettagli completi stato
- ADR storici: `DECISIONS_LOG.md`
- Sprint doc: `docs/process/sprint-*.md`
- Vision + roadmap: `docs/core/` + `PROJECT_BRIEF.md`
- Triangle Strategy: `docs/research/triangle-strategy-transfer-plan.md`
- Readiness audit: `docs/reports/2026-04-24-repo-autonomy-readiness-audit.md`

## Policy backlog

- **Non ridondare con CLAUDE.md**: questo file è il registro operativo; CLAUDE.md narra sprint chiusi. Evita duplicazioni.
- **Chiusura ticket**: aggiorna qui + sposta in CLAUDE.md "milestone sessione YYYY-MM-DD" quando lo sprint close (via skill `sprint-close`).
- **Apertura ticket**: minimo richiesto = titolo + priorità + scope (autonomous/userland) + blocker se presente.
- **Eccessi da evitare**: non aggiungere ticket senza ownership o criterio di successo. "Refactor X quando possibile" ≠ ticket.
