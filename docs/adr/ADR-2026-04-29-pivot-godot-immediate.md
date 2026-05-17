---
title: 'ADR-2026-04-29: Pivot Godot immediate — drop Sprint G.2b BG3-lite Plus + rubric session, accelerate Sprint M onset'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-29
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - docs/planning/2026-04-29-master-execution-plan-v3.md
  - docs/planning/2026-04-28-master-execution-plan.md
  - docs/planning/2026-04-28-godot-migration-strategy.md
  - docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md
  - docs/adr/ADR-2026-04-28-deep-research-actions.md
  - docs/adr/ADR-2026-04-28-grid-type-square-final.md
  - docs/research/2026-04-29-godot-pivot-cross-check.md
---

# ADR-2026-04-29: Pivot Godot immediate

- **Data**: 2026-04-29
- **Stato**: Accepted
- **Owner**: Master DD
- **Stakeholder**: Tutti workstream Fase 2 (gameplay-programmer + ui-programmer + qa-tester + agent ecosystem)
- **Supersedes**:
  - [ADR-2026-04-28-bg3-lite-plus-movement-layer](./ADR-2026-04-28-bg3-lite-plus-movement-layer.md) (Sprint G.2b ~10-12g) — DEPRECATED
  - [ADR-2026-04-28-deep-research-actions](./ADR-2026-04-28-deep-research-actions.md) §"Sprint G.2b BG3-lite Plus" + §"Sprint H itch.io" + §"A1 rubric session" — DEPRECATED items only
- **Confirms**:
  - [ADR-2026-04-28-grid-type-square-final](./ADR-2026-04-28-grid-type-square-final.md) — square grid wins anche Godot (TileMap square-mode)
  - Plan v2 §"Backend Express + Prisma + WS persiste Fase 3" decision 8 — backend cross-stack KEEP

## 1. Contesto

Sessione 2026-04-28/29 ha shipped 22 PR ondata 3+4 (#1996-#2022) chiudendo Sprint Fase 1 web stack 100% autonomous. Master-dd ha avviato playtest userland tester live tramite ngrok pubblico + 4 amici tester DIVERSI da TKT-M11B-06 pool.

**Bug critico emerged 2026-04-29 sera**: 7-PR cascade fix web stack co-op (PR #2016-#2022) NON risolve race conditions architetturali:

- HOST clicca "Nuova Sessione" → server `coopOrchestrator.startRun()` → `phase_change: lobby → character_creation` broadcast
- Player UI **stuck su lobby phase** "In attesa dell'host..."
- Server log: `Attendi 0/3 player hanno creato PG`
- Player char creation overlay NEVER renders despite all 7 fixes

**Diagnosi**: web stack co-op architecture has **systemic race conditions cascade** (WS event ordering + handler register timing + first-connect snapshot push + state sync HOST↔PLAYER). Patches #2016-#2022 = whack-a-mole. Estimated 5-10 latent race conditions remaining.

**User feedback master-dd 2026-04-29 sera**: _"anche con tutti connessi Nuova sessione attende che gli altri creino i pg ma sul loro device non cambia niente restano in attesa di Host... ascoltami mi sembra chiaro che non funziona! che ne dici di rifarlo bene seguendo le vertical sheet e usando godot e i nuovi asset e un design meglio studiato?"_

User esplicito: **rebuild Godot meglio**. Pivot decision-altering accepted.

## 2. Decisione

**Pivot Godot v2 IMMEDIATE** (Path B accelerated cap, NOT Path A drop everything):

1. **DEPRECATE web stack co-op debug** — stop Sprint G.2b BG3-lite Plus + A1 rubric session + Sprint H itch.io
2. **PRESERVE Express backend cross-stack** — confermato plan v2 §Decision 8 (Express + Prisma + WS persiste Fase 3)
3. **ACCELERATE Sprint M onset** — incorporate Sprint K Donchitos cherry-pick in Sprint M.1 (6-8d cap)
4. **MANDATORY 3 spike pre Sprint N** — M.5 cross-stack + M.6 CI minimal + M.7 phone composer Godot HTML5
5. **PRESERVE 16 PR shipped** — backend services + asset Legacy + research docs + ERMES = NOT lost, become reference for Godot port specs

## 3. Rationale (3 reason cross-check + risk agent convergent)

### 3.1 — Sprint M.7 phone composer spike è critical regardless of pivot path

Path A "skip rubric, direct Godot" e Path B "rubric → Godot" entrambi richiedono Sprint M.7 spike Godot HTML5 phone composer (~2g, p95 < 100ms round-trip). Path A salva solo 1-1.5 sett Fase 1, NON salva critical path Sprint M.7.

Path B vantaggio: rubric IS accelerated decision gate. Se rubric fail (very likely given race condition cascade), formal verdict closes loop + skip G.2b automatic. Net cost = 1d spike, NOT 10-12g G.2b.

Master-dd ha frustrazione legitimate post-cascade. Se preferisce ABORT rubric (no tester recruited), accepted per master plan v2 §"fallback se 4 amici NON disponibili" — declare rubric ABORT formal, then Sprint M direct.

### 3.2 — Backend Express persiste = zero rewrite risk + 16 PR shipped reference

Cross-check agent inventory:

- 18 backend services + 3 data layer = ALL KEEP cross-stack
- ZERO REWRITE pre-Fase 3
- 458 trait `active_effects.yaml` + 60+ encounter YAML preserved
- 384 AI tests preserved (target ≥250 GUT port Sprint Q.1)

Specific PR preserved (NON lost):

- #1999 BB hardening severity stack (P6 backend)
- #2004 ambition Skiv-Pulverator backend service (P2+P5)
- #2001 Action 1 reference codebase study (Sprint M.4 input)
- #2000 Action 2 Beehave templates (Sprint N.4 input)
- #2005 Action 3 Sprint N.7 spec (impl ready)
- #2002 Sprint G v3 Legacy 47 PNG CC0 (re-import Godot ~1h)

Specific PR DEPRECATED:

- #1998 Action 7 CT bar lookahead (re-impl Godot Sprint N.1)
- #2003 Spike POC BG3-lite Tier 1 (Tier 2 native Godot 2D, 0 effort)
- #2007 Rubric launcher .lnk suite (web stack tooling, archive)

### 3.3 — Native Godot 2D = BG3-lite Plus features ZERO extra effort

ADR-2026-04-28-bg3-lite-plus-movement-layer Tier 1+2 features:

- Hide grid lines: Godot TileMap configurable show/hide
- Smooth movement curva bezier: AnimationPlayer + Tween built-in
- Range cerchio gradient: Polygon2D + Shader2D native
- AOE shape sphere/cone: GPUParticles2D + Light2D + Shape2D
- Sub-tile float positioning: position Vector2 native (zero refactor)
- vcScoring `area_covered` float: Godot Vector2 distance.length() native
- Flanking 5-zone smooth angle: atan2() built-in

= **Sprint G.2b ~10-12g effort = ZERO in Godot**. Native primitives Godot 4.x replicano tutto BG3-lite Plus design intent gratis.

Sprint G.2b BG3-lite Plus = solution looking for problem post-pivot. DEPRECATE.

## 4. Cosa pivot NON cambia

- ADR-2026-04-28-grid-type-square-final → square grid stays (TileMap square-mode in Godot)
- Plan v2 §Decision 1 ordine fasi confermato (Fase 1 → Fase 2 Godot → Fase 3 cutover)
- Plan v2 §Decision 6 NEW repo `Game-Godot-v2` confermato
- Plan v2 §Decision 7 vertical slice MVP 3-feature (combat + mating + thoughts) confermato
- Plan v2 §Decision 8 Backend Express persiste Fase 3 confermato
- Plan v2 §Decision 9 Mission Console deprecated immediate Fase 3 confermato
- Skiv canon `docs/skiv/CANONICAL.md` preserved
- ERMES E0-E6 (#2009) prototype lab Python isolated — out-of-scope Godot
- 6 Pillar P1-P6 design intent preserved (round model M17 + d20 + AP + simultaneous planning)
- Anti-pattern guard ADR-bg3-lite §6: NO Midnight Suns / DioField / hex Brigandine

## 5. Cosa pivot CAMBIA (deprecated/superseded)

| Item                                         | Pre-pivot stato                  | Post-pivot stato                                    |
| -------------------------------------------- | -------------------------------- | --------------------------------------------------- |
| Sprint G.2b BG3-lite Plus ~10-12g            | BLOCKED rubric session           | **DEPRECATED** (native Godot 2D zero effort)        |
| A1 rubric session BG3-lite                   | BLOCKED master-dd 4 amici tester | **DEPRECATED** (formal abort, no tester run)        |
| Sprint H itch.io gap-fill OPT                | conditional Sprint G v3 review   | **DEPRECATED** (Godot Asset Library replace)        |
| ADR-2026-04-28-bg3-lite-plus-movement-layer  | Accepted                         | **Superseded** by this ADR                          |
| Spike POC #2003 toggle config ui_config.json | shipped                          | **archive web-v1-final**, NO Godot port             |
| Rubric launcher .lnk suite #2007             | shipped (4 .lnk Desktop)         | **archive web-v1-final**, NOT cross-port Godot repo |
| Sprint Fase 1 ordine §M-N timing plan v2     | sequential post-Sprint I         | **accelerated** Sprint M.1 onset NOW                |
| Action 7 CT bar #1998 frontend               | shipped web stack                | **re-impl Godot Sprint N.1** (HUD overlay GDScript) |

## 6. Plan v3 effort revised (vs plan v2)

| Fase                                   | Plan v2  | Plan v3 (post-pivot)                     | Delta             |
| -------------------------------------- | -------- | ---------------------------------------- | ----------------- |
| Fase 1 (Sprint G v3 + G.2b + H + I)    | 3-5 sett | **CHIUSA 2026-04-29** (1.5 sett shipped) | -1.5 to -3.5 sett |
| Fase 2 (Sprint J‖K + L + M + N + gate) | 7-9 sett | **6-8 sett** (incorporate K in M.1)      | -1 sett           |
| Fase 3 (Sprint O-S + cutover)          | 4-8 sett | 4-8 sett                                 | unchanged         |

**Total revised plan v3**: ~13-19 settimane (vs plan v2 14-21 settimane). Net savings ~1-2 sett (NOT 3-4 sett come stima initial pre-cross-check).

**Trade-off accepted**: master-dd frustrazione web stack legitimate. Pivot Godot risolve architectural race conditions cascade fundamental, NON whack-a-mole patches. Net effort comparable a plan v2 ma deliverable più solid + future-proof.

## 7. Sprint Fase 1 closure formal

**Stato Sprint Fase 1 post-pivot 2026-04-29**: **CHIUSA con scope ridotto**.

Shipped (10 PR ondata 3 + 6 PR ondata 4 + 6 PR cascade fix = 22 PR mergiati main):

- ✅ Action 4 Sprint M.7 doc re-frame (#1997)
- ✅ Action 5 BB hardening severity stack + slow_down (#1999) — backend preserved
- ✅ Action 1 SRPG engine reference codebase extraction (#2001) — Sprint M.4 input
- ✅ Action 2 tactical AI archetype templates (#2000) — Sprint N.4 input
- ✅ Action 3 Sprint N.7 spec failure-model parity (#2005) — impl ready
- ✅ Action 6 ambition Skiv-Pulverator alleanza (#2004) — backend preserved
- ✅ Sprint G v3 Legacy Collection asset swap (#2002) — re-import Godot ~1h
- ✅ Action 7 CT bar lookahead (#1998) — re-impl Godot Sprint N.1
- ✅ Spike POC BG3-lite Tier 1 (#2003) — DEPRECATED post-pivot
- ✅ Rubric launcher .lnk suite (#2007) — DEPRECATED post-pivot
- ✅ ERMES drop-in self-install E0-E6 (#2009) — out-of-scope, isolated
- ✅ Memory ritual + handoff doc (#2006/#2015)
- ✅ 6 cascade fix launcher (#2016-#2022)

NOT shipped (DEPRECATED):

- ❌ Sprint G.2b BG3-lite Plus ~10-12g (DEPRECATED: native Godot 2D)
- ❌ A1 rubric session 4 amici tester (DEPRECATED: formal abort)
- ❌ Sprint H itch.io gap-fill (DEPRECATED: Godot Asset Library)
- ❌ Sprint I TKT-M11B-06 playtest userland (DEPRECATED: post Godot Sprint N gate playtest)

## 8. Riferimenti

- Cross-check report: [`docs/research/2026-04-29-godot-pivot-cross-check.md`](../research/2026-04-29-godot-pivot-cross-check.md) (general-purpose agent)
- Risk analysis: balance-illuminator agent output (synthesis embedded in this ADR §3)
- Master plan v3: [`docs/planning/2026-04-29-master-execution-plan-v3.md`](../planning/2026-04-29-master-execution-plan-v3.md)
- Plan v2 superseded sections: master-execution-plan §"FASE 1 Sprint G v3 + G.2b + H + I" + §"Sprint Fase 1 ordine REVISED finale" — REPLACED da plan v3 §FASE 1 closure
- Skiv canon: [`docs/skiv/CANONICAL.md`](../skiv/CANONICAL.md) preserved
- ERMES integration: [`docs/planning/2026-04-29-ermes-integration-plan.md`](../planning/2026-04-29-ermes-integration-plan.md) E0-E6 isolated

## 9. Anti-pattern guard

**NO** quando esegue Sprint M.1 onset:

- NO mass rewrite backend Express (preserve cross-stack)
- NO drop 458 trait active_effects.yaml (preserve YAML data)
- NO drop encounter YAML 60+ files (preserve)
- NO Skiv canon LPC sprite swap (preserve override Sprint G v3)
- NO skip Sprint M.5/M.6/M.7 mandatory spike (CRITICAL gates)
- NO ship Sprint N gate ≤3/5 SÌ (abort decision gate)
- NO force-push branch (CLAUDE.md policy)

## 10. Esecuzione

| Step                                           | Quando                | Owner                   |
| ---------------------------------------------- | --------------------- | ----------------------- |
| ADR shipped + plan v3 commit                   | NOW (2026-04-29 sera) | claude-code             |
| Plan v2 superseded note add                    | NOW                   | claude-code             |
| BACKLOG update DEPRECATED items                | NOW                   | claude-code             |
| COMPACT_CONTEXT v21 + handoff update           | NOW                   | claude-code             |
| Archive branch web-v1-final tag                | NOW                   | claude-code             |
| Sprint M.1 chip spawn (NEW repo Game-Godot-v2) | post-merge plan v3    | master-dd + claude-code |
| Sprint M.2-M.7 chip dispatch                   | sequential post-M.1   | claude-code             |
| Sprint N onset                                 | post 3 spike PASS     | master-dd + claude-code |

## 11. Conseguenze

**Positive**:

- Web stack race condition cascade arch-fix (full Godot rebuild)
- 16 PR shipped backend preserved cross-stack (zero waste)
- Sprint M.7 phone composer spike de-risk early (Sprint Fase 2 abort gate clean)
- BG3-lite Plus features native Godot 2D (zero extra effort)
- Plan v3 effort delta -1 to -2 sett vs plan v2

**Negative / risks**:

- Master-dd burnout 13-19 sett solo-dev (mitigation: kill-60 + daily energy_score check)
- Godot bootstrap learning curve (mitigation: Donchitos template + 4 reference repos research shipped)
- 384 AI tests → GUT port effort (mitigation: target ≥250 critical pre-cutover)
- P5 Co-op Godot HTML5 phone composer p95 risk (mitigation: M.7 spike binary gate)

**Rollback**:

- Plan v3 abort: revert ADR + restore plan v2 baseline + resume Sprint G.2b rubric session
- Sprint M.7 spike fail: hybrid acceptable (phone stays web PWA, Godot = TV view only)
- Sprint N gate ≤3/5 fail: archive Godot v2 + restore web stack v1 final + accept feasibility study

## 12. Open questions RESOLVED master-dd 2026-04-30

1. ⏸️ Sprint J Visual Map Obsidian: **deferred** — valuta quando appropriato (post Sprint N gate o post-cutover). Default: defer post-Fase 3.
2. ✅ Sprint K Donchitos cherry-pick: **incorporate M.1** confermato (no separate Sprint K). 18 agent + 32 skill + 5 asset skill cherry-picked.
3. ✅ Sprint M.5 race condition diagnose: **frontend** (lobbyBridge.js handler register order race + first-connect snapshot push). Backend wsSession.js + coopOrchestrator.js diagnosed clean post fix #2020-#2021. Cross-stack spike Sprint M.5 valida Godot HTML5 client implementation no equivalent race (handler register PRE-connect via Godot WebSocketClient signal pattern).
4. ✅ Sprint N.7 failure-model parity gate: **ELEVATE GATE 0** mandatory pre Sprint N.1.
5. ✅ Spike POC #2003 + Rubric launcher #2007 archive method: **branch tag `web-v1-final`** Sprint S checklist.
6. ✅ GitHub repo create: **AUTHORIZED** `gh repo create MasterDD-L34D/Game-Godot-v2 --private --license mit`.
7. ✅ ERMES E7-E8 + asset workflow + Skiv asset + Donchitos asset skill: **integrated plan v3.1** §"ASSET PIPELINE" + §"ERMES ROADMAP" sections.

## 13. Plan v3.1 update master-dd input (2026-04-30)

Plan v3 v3.1 update post-pivot include:

- §"ASSET PIPELINE" 5 subsection: A.1 Workspace locale + A.2 3-path (Path 1|2|3 + ibridi) + A.3 Skiv asset spec (8 asset categorie portrait/lifecycle/run/echo/SFX/VFX/death) + A.4 Donchitos asset skill cherry-pick (`/art-bible` `/asset-spec` `/asset-audit` + create-icon + create-sprite + NEW `evo-tactics-create-sfx`) + A.5 timeline integrated Sprint M.1-Q.1
- §"ERMES ROADMAP" 4 subsection: stato E0-E6 shipped + E7 future runtime candidate (post-cutover ~1-2 sett) + E8 future foodweb candidate (post-E7 ~2-3 sett) + ERMES guard policy (NON gating Sprint Fase 2/3, isolated Python `prototypes/ermes_lab/`)

ERMES + asset workflow + Skiv asset + Donchitos asset skill TUTTI integrated in plan v3.1.

---

**Status doc**: ACTIVE. Decision-altering canonical. Plan v2 superseded sections replaced by plan v3.
