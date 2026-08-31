---
title: Session handoff 2026-06-02 — GOAL MASTER (PHASEC 32/32 + design-closure goal doc)
date: 2026-06-02
type: session-handoff
sprint: v45 -> v46
pillar: [P1, P2, P3, P4, P5, P6]
status: complete
last_verified: 2026-06-02
---

# Session handoff 2026-06-02 — GOAL MASTER

## TL;DR (30s)

GOAL MASTER session su `C:/dev/Game`. **PHASEC job-expansion perks 32/32 COMPLETE** (capstone
`shared_hp_pool` #2542 → 9 round Codex / ~14 fix). Triage: **#2509 GAP-C merged** + D4 promote
risultato **già fatto** (#2505/#2510). Poi, su richiesta master-dd, costruito il **doc di riferimento
GOAL a 2 fasi** (design-closure → costruzione) `docs/planning/2026-06-02-design-closure-goal.md` (#2551
MERGED), verificato contro il codice via review Codex. **Scoperta-chiave: il design è ~90% già chiuso.**

## PR shipped main (questa sessione)

| PR                                                       | Squash     | Topic                                                                                 |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| [#2542](https://github.com/MasterDD-L34D/Game/pull/2542) | `0f9be016` | PHASEC V5 `shared_hp_pool` capstone (symbiont 8/8) → **PHASEC 32/32** (9 round Codex) |
| [#2509](https://github.com/MasterDD-L34D/Game/pull/2509) | `d05fe323` | GAP-C fase-2 arc-conditions Stage-1 (triage merge, owner idle/clean)                  |
| [#2551](https://github.com/MasterDD-L34D/Game/pull/2551) | `235c41f8` | Doc di riferimento GOAL design-closure 2-fasi (linkato dal `/goal`)                   |

(PHASEC 32/32 = #2538 Cat F 7/7 + #2539/#2541 symbiont B4 7/7 + #2544-#2549 minion B5 8/8 + #2550 V6
campaign-XP + #2542 capstone, tutti merged in sessioni precedenti+questa. Dettaglio: memory
`project_phasec_job_perks_plan.md`.)

## Decisioni master-dd di questa sessione (eseguite)

- **1-HP-tail rule** (shared_hp_pool): RATIFICATA (both-KO a pool ≤1; l'alternativa pin-both-at-1 = exploit immortalità 1-danno).
- **#2509 GAP-C**: merge ✅ (clean, owner idle, in-scope).
- **D4 promote**: risultato **già fatto** (#2505 staging + #2510 enrich/fuse) → no-op.
- **Worktree cleanup**: orfani rimossi.
- **GOAL prossima sessione**: 2 fasi (design-closure → build), doc di riferimento `2026-06-02-design-closure-goal.md`, riferimento giochi = `docs/guide/games-source-index.md`.

## Scoperta-chiave (anti-pattern #19, ~7× questa sessione)

L'inventory dei "buchi di design" costruita da memory era **largamente stale**: 6 voci risultate
**già shipped** sotto verify-first (review Codex su #2551): GAP-A #2447, GAP-C fase-1/2 #2509,
campaign-XP #2550, symbiont/minion #2539-2549, ecosystem producers #2510, ecosystem→combat wiring
(foodwebFilter legge `.ecosystem.yaml`). → **il design è ~90% già chiuso**. Lezione: `git log origin/main -S <simbolo>` + memory PRIMA di trattare un item come aperto. Marker/doc = ipotesi, origin/main+git = verità.

## Stato Fase-1 design-closure (residuo reale, verificato)

- **H2** economy combat cost-gate — `cost_sg/pp/pt` DECORATIVI + scale-incoerenti vs SoT pools (verdetto master-dd; spec #2530-A2). **L'unico verdetto design genuinamente aperto.**
- **H4** Cat F roll-tags — verifica copertura esatta (tutti i 7 referenziati; "deferred" sospetto).
- **H8** 1-HP comment cleanup (ratificato → togli "pending master-dd").
- **H9** OD residui (OD-022/023 verify+archive).
- **H7** pillar surface-audit (PILLAR-LIVE-STATUS 6/6 🟢).
- **H1 residuo** = DECISIONE GAP-C fase-3/4 (Godot UI + grammar): costruire o gated (Fase-1 decisione → Fase-2 build).

## Blocker / warning

- Main checkout `C:/dev/Game` = altra sessione (`claude/fix-ecotypes-enum` WIP) — MAI toccarlo.
- #2535 OD-058 woundSystem (combat, altra sessione) OPEN → collision-avoidance se Fase-2 tocca combat.
- Memory PC-local (non git-sync cross-PC) — questo handoff + il goal doc sono la fonte git cross-PC.

## Next entry point — `/goal` da incollare (prossima sessione)

> Il `/goal` ha cap ~4000 char; questo paste (~3000) linka il doc di riferimento che ha TUTTO il dettaglio.

```
GOAL: Fase 1 Design-closure → Fase 2 Costruzione. Autonomo fino a STOP/completamento.

DOC DI RIFERIMENTO (LEGGI PRIMA — canon, metodo, inventario H1-H9 verificata, 2 fasi, process, STOP): docs/planning/2026-06-02-design-closure-goal.md (https://github.com/MasterDD-L34D/Game/blob/main/docs/planning/2026-06-02-design-closure-goal.md). Poi memory: MEMORY.md + project_phasec_job_perks_plan.md + project_d4_biome_affinity_gate.md. Poi: git fetch origin main; gh pr list --state open; git worktree list.

2 FASI SEQUENZIALI:
FASE 1 — DESIGN-CLOSURE (prima): chiudi/decidi TUTTI i buchi di design aperti (doc §3) USANDO IL CANON, non a intuito. ⚠️ La maggior parte è GIA chiusa (verificato — vedi banner §3): aperti reali = H2 economy cost-gate (decorativo, verdetto master-dd) + micro H8 (1-HP comment) + go-check H9 (OD) + audit H7 (pillar) + verifica H4 (Cat F coverage) + DECISIONE H1 (GAP-C fase-3/4 build-vs-gate). Per ogni buco: verify-first -> verdetto preso (reversibile) o ratificato master-dd (gated). Gate Fase1->2: nessun design aperto resta indeciso.
FASE 2 — COSTRUZIONE (dopo Fase 1): costruisci le feature decise, seguendo SEMPRE le direttive usate finora (museum-first - Gate-5 engine-wired - TDD - flag OFF-default - band-verify - verify-first - ADR-0011 - auto-merge L3) + il Games Source Index docs/guide/games-source-index.md (catalogo completo giochi-fonte + ricerche; "Mappa pilastri -> top-3 source per pillar" + "Anti-reference"). Build frontier = GAP-C fase-3/4 (Godot UI + grammar) + feature sbloccate da Fase 1. ⚠️ GAP-A, GAP-C-fase1/2, campaign-XP, symbiont/minion, ecosystem-wiring = GIA SHIPPED — NON ricostruire (verify-first).

METODO (doc §2, OGNI riga): git log origin/main -S <simbolo> + memory (anti-pattern #19: ~7x near-rework questa sessione — 6 "buchi" gia shipped) -> museum-first -> SoT check -> catalogo giochi (mappa pilastri->top-3, cita il gioco-fonte) -> Style -> verdetto citato -> no-anticipated-judgment (fork balance/soggettivi = "Claude-proposed pending master-dd" + preserva alternative).

CANON (doc §1): SoT docs/core/00+90 + 30 GDD - PILLAR-LIVE-STATUS - catalogo giochi docs/guide/games-source-index.md (Triangle Strategy/Voidling Bound/Pokopia/Dwarf Fortress/Ancestors/Tactics Ogre/Wildermyth/CoQ/RimWorld...) + sintesi cross-game-extraction-MASTER - museum docs/museum/MUSEUM.md - Style 42-STYLE-GUIDE-UI/00E-NAMING/frontend/styleguide - OPEN_DECISIONS + DECISIONS_LOG.

CONSTRAINTS (doc §5): worktree ISOLATO off origin/main (npm ci se build), MAI il main checkout (claude/fix-ecotypes-enum WIP). ADR-0011 trailer (Coding-Agent: claude-opus-4.8 + Trace-Id uuidv7, NO Co-Authored-By); commit lowercase + <=72 + NO em-dash; prettier; governance errors=0; node --test tests/<dir>/*.test.js glob; TDD; Gate-5. NO forbidden paths. validate-datasets + trace_hash se yaml. Babysit OGNI PR (CI+Codex P1/P2+resolve, auto-merge L3 a 7 gate). COLLISION HARD: #2535 OD-058 woundSystem combat open -> coordina NO clobber.

STOP (doc §6): verdetto design/balance gated (H2/H1-residuo); flag GAP-C ON in prod; nuovo dep/schema/migration; band-verify fuori banda; canon ambiguo/contraddetto dal codice.

OUTPUT (doc §7): design-closure report (docs/reports/) con verdetto+citazione canon per buco; PR reversibili + spec per gated; museum card scartati; memory+handoff.
```

## Riferimenti

- Doc di riferimento GOAL: [`docs/planning/2026-06-02-design-closure-goal.md`](2026-06-02-design-closure-goal.md)
- Catalogo giochi-fonte: [`docs/guide/games-source-index.md`](../guide/games-source-index.md)
- Memory: `project_phasec_job_perks_plan.md` (PHASEC saga) + `project_d4_biome_affinity_gate.md` (D4) + `MEMORY.md` index.
