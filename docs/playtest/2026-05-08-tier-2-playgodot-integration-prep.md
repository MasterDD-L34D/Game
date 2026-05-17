---
title: 'Tier 2 PlayGodot integration prep — honest research + kill-60 verdict'
doc_status: draft
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-08
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/playtest/AGENT_DRIVEN_WORKFLOW.md
  - docs/planning/2026-05-07-phase-a-handoff-next-session.md
tags: [playtest, godot-v2, tier-2, kill-60, research, prep]
---

# Tier 2 PlayGodot integration prep

Phase A Day 2/7 monitoring window 2026-05-08. Tier 2 PlayGodot integration listed handoff doc come "post Phase A stable ~5h". Research doc honest verifica fattibilità + revised effort + kill-60 decision recommendation pre-impl.

**TL;DR**: 5h estimate originale era WRONG. Reality = 20-40h PlayGodot (custom Godot fork build + maintenance). GodotTestDriver C# stack mismatch GDScript (10-15h C# bindings). **Recommendation**: REJECT both. Estendi GUT (1964 test già verdi) + mantieni Playwright Tier 1 cross-stack. Kill-60 verdict.

## 1. Tool inventory + critical findings

### PlayGodot ([Randroids-Dojo/PlayGodot](https://github.com/Randroids-Dojo/PlayGodot))

> "Game automation framework for Godot Engine — like Playwright, but for games."

- **Architecture**: Python client esterno → TCP port 6007 → Godot RemoteDebugger (custom C++ build)
- **API**: Playwright-style async (launch/click/get_node/screenshot/keyboard/touch)
- **PyPI package**: `pip install playgodot` (Python 3.9+)

**🚨 BLOCKER**: requires **custom Godot build** with automation branch:

> "Clone: [Randroids-Dojo/godot](https://github.com/Randroids-Dojo/godot) (automation branch). Build: `scons platform=<your_platform> target=editor`"

**Implications**:

- Stock Godot 4.6 (current `project.godot config_version=5`) NON funziona
- Maintain Godot fork = scons C++ build pipeline + 5+ GB toolchain + cross-platform (Windows MSVC + Linux GCC + macOS clang)
- Master-dd hardware Mac + dev machine Windows → 2 build target minimum
- Sync con upstream Godot release = manual rebase automation branch
- CI build = GitHub Actions runner deve compilare Godot custom = build time +30-60min per CI run

### GodotTestDriver ([chickensoft-games/GodotTestDriver](https://github.com/chickensoft-games/GodotTestDriver))

> "Easy integration testing for Godot with simulated input, node drivers, and fixtures."

- **Architecture**: in-engine integration testing library (NuGet package)
- **API**: C# fixtures + node drivers (LoadScene/AutoFree)
- **Stack**: `.NET netstandard2.1` + `dotnet add package GodotTestDriver`

**🚨 BLOCKER**: C# only.

- Godot v2 stack = **GDScript** (config + scripts/\* tutti `.gd`)
- Adoption = enable C# / .NET in `project.godot` + `dotnet new` setup + `Player.cs` bindings duplication accanto `player.gd`
- Stack hybrid GDScript + C# = doppia maintenance + GDExtension marshalling overhead

### GUT (already adopted)

- **Stack**: in-engine GDScript (`addons/gut/`)
- **Coverage**: 202+ unit test files + 2 integration test, GUT 1964/1964 verde Day 2 tarda sera 2026-05-07
- **Run command**: `addons/gut/gut_cmdln.gd -gtest=res://tests/`
- **CI gate**: `.github/workflows/test.yml` runner Godot headless, ~3min runtime
- **Stack-native**: zero external deps, zero Godot fork

## 2. Effort estimate revised

| Tool             | Original estimate | Revised reality |  Delta  | Why                                                                                                                |
| ---------------- | :---------------: | :-------------: | :-----: | ------------------------------------------------------------------------------------------------------------------ |
| PlayGodot full   |        ~5h        |   **~20-40h**   | +15-35h | Godot fork scons build (~8h first-time) + CI custom build pipeline (~6h) + 2-platform maintenance (~6-26h ongoing) |
| GodotTestDriver  |        ~2h        |   **~10-15h**   | +8-13h  | C# enable .NET (~4h) + sample fixture port (~3h) + GDScript ↔ C# bridge ergonomics (~3-8h)                        |
| GUT scenario ext | (not in roadmap)  |    **~3-5h**    |    -    | Add scenario fixture pattern + 5 cross-feature integration test                                                    |

## 3. Risk analysis

### PlayGodot risks

- ⚠️ **Custom Godot fork lifecycle**: ogni Godot release upstream (4.7, 4.8, ...) richiede manual merge automation branch. Risk: stale fork → security/perf miss + new feature blockers.
- ⚠️ **Build infra burden**: scons + MSVC + LLVM + cross-compile = expert setup 8-16h. Solo-dev master-dd vincolo.
- ⚠️ **CI cost**: build time custom Godot ~30-60min per runner spin = 6x slower current GUT (~3min).
- ⚠️ **Master-dd onboarding**: nuova Mac dev session deve rebuild custom Godot localmente (~6-8h first-time).
- ⚠️ **Godot release lag**: PlayGodot automation branch al 2026-05-08 status sconosciuto vs Godot 4.6 stable. Fork age = stale risk.
- ✅ **API ergonomics**: Playwright-style async win, pytest integration ottimo.

### GodotTestDriver risks

- ⚠️ **Stack divergence**: GDScript + C# hybrid = 2x learning curve + duplicate test patterns
- ⚠️ **GDExtension marshalling**: signal/property bridge GDScript ↔ C# overhead runtime + dev cognitive load
- ⚠️ **No GDScript fixture API**: native API only C# = NON portabile a existing GUT corpus
- ✅ **Stock Godot compatible**: no fork required
- ✅ **Maintainer active**: Chickensoft community, recent commits

### Status quo (GUT + Playwright Tier 1) risks

- ✅ **Stack-native**: GDScript GUT in-engine, Node Playwright cross-stack — current Tier 1 verde
- ✅ **Stable upstream**: GUT addons/gut/ vendored, Playwright stable 1.40+ pinned
- ✅ **CI fast**: ~3min GUT + ~5min Playwright = ~8min total
- ⚠️ **GDScript no Playwright-style API**: GUT integration test patterns più verbose (manual node tree setup vs `.click("/root/Main/Button")`)
- ⚠️ **Cross-cutting bug detection gap**: Playwright vede HTML5 export (DOM canvas), NON vede Godot internal scene tree state. GUT vede scene tree, NON vede HTML5 export rendering.

## 4. Coverage gap analysis

Current Tier 1 layered QA infra (Phase A Day 1):

| Tier | Tool                          | Stack                    | Coverage gap       |
| ---- | ----------------------------- | ------------------------ | ------------------ |
| 1    | Playwright multi-context REST | Browser/HTTP/WS          | Engine internal NO |
| 1    | Artillery WS load             | HTTP/WS throughput       | Engine internal NO |
| 1    | canvas-grid visual reg        | HTML5 canvas pixels      | Engine internal NO |
| 1    | phone-smoke-bot agent         | Browser MCP coordination | Engine internal NO |
| 1    | GUT (already adopted)         | GDScript engine internal | HTML5 export NO    |

**Real gap**: integration test cross-cutting "Godot scene tree state ↔ HTML5 export render". Esempio: combat_session emit `unit_died` signal → debrief view show MVP label. GUT testa signal emit. Playwright testa label visibile DOM canvas. Gap = signal → DOM bridge correttezza.

**Tools that fill gap**:

- PlayGodot: ✅ può Python esterno trigger signal + screenshot DOM in unico test (custom Godot fork required)
- GodotTestDriver: ❌ C# in-engine, NON tocca HTML5 export
- GUT scenario ext: 🟡 può simulate signal + check downstream node state, NON DOM

**Verdict gap**: PlayGodot UNICO che chiude gap, ma scope cost 20-40h non giustificato per coverage incrementale ~5%.

## 5. Decision recommendation — kill-60

**REJECT** PlayGodot adoption Sprint Q+ Phase B.

**REJECT** GodotTestDriver adoption (C# stack mismatch).

**ACCEPT** alternative low-cost path:

### Path raccomandato: estendi GUT scenario fixture

`tests/integration/` Godot v2 attualmente 2 file. Espandi a ~10 scenario integration test pattern:

```gdscript
# tests/integration/test_combat_to_debrief_flow.gd
extends GutTest

func test_combat_end_emits_debrief_signal():
    var combat_session = preload("res://scripts/session/combat_session.gd").new()
    var debrief_state = preload("res://scripts/session/debrief_state.gd").new()
    var lifecycle_hook = preload("res://scripts/session/combat_lifecycle_hook.gd").new()

    lifecycle_hook.bind(combat_session, debrief_state)
    combat_session.emit_signal("session_ended", {...})

    assert_true(debrief_state.has_mvp())
    assert_eq(debrief_state.mvp_unit_id, "skiv")
```

**Effort**: ~3-5h per 10 scenario fixture. Coverage gap: signal → state bridge stack-internal. NON tocca HTML5 export render (lasciato a Playwright Tier 1 canvas-grid).

**DoD Path raccomandato**:

1. ✅ 10 scenario fixture in `tests/integration/`
2. ✅ GUT 1964 + ~30-50 = ~2000 verde post-merge
3. ✅ CI gate `.github/workflows/test.yml` invariato
4. ✅ Documenta pattern `docs/playtest/` per reuse Sprint M9+

### Path SE master-dd vuole PlayGodot anyway

Se override decisione kill-60, allora:

1. **Branch isolato `experiment/playgodot`** Godot v2 — NON main
2. **Spike 4h timeboxed**: build custom Godot fork + 1 test fixture funzionante
3. **Decisione gate post-spike**: se 4h non bastano → abort, keep GUT path
4. **Mai merge senza CI green** Godot fork build su GitHub Actions (non assumere local-only build)

## 6. Actions Phase A Day 2/7 (today)

- ✅ Doc shipped (questo file) — research-only, NO impl
- ⏸ Master-dd review verdict pre-Phase-B (scope freeze decision)
- ⏸ SE accept kill-60 → update `docs/playtest/AGENT_DRIVEN_WORKFLOW.md` adoption roadmap §5+§6 row 5+6 strikethrough + redirect "GUT scenario ext"
- ⏸ SE accept kill-60 → BACKLOG add "Sprint M9+ scenario fixture extension ~3-5h"

## 7. Cross-ref

- [`docs/playtest/AGENT_DRIVEN_WORKFLOW.md`](AGENT_DRIVEN_WORKFLOW.md) §"Adoption roadmap" (current row 5+6 ~5h+~2h estimate da revisionare)
- [PlayGodot README](https://github.com/Randroids-Dojo/PlayGodot)
- [GodotTestDriver README](https://github.com/chickensoft-games/GodotTestDriver)
- [GUT (Godot Unit Test) docs](https://gut.readthedocs.io/)
- Handoff: [`docs/planning/2026-05-07-phase-a-handoff-next-session.md`](../planning/2026-05-07-phase-a-handoff-next-session.md) §"Tier 2/3 deferred"

## 8. Status

**SPEC DRAFT research-only**. Master-dd verdict required pre-Sprint-Q-or-M9-kickoff.

Anti-pattern guard CLAUDE.md §"Verify Before Claim Done": research doc senza impl = NON claim "Tier 2 done" né "PlayGodot ready". Solo decision-support material.
