---
title: 2026-04-28 Godot migration strategy — 3-fase phased approach
doc_status: draft
doc_owner: master-dd
workstream: planning
last_verified: 2026-04-28
language: it
review_cycle_days: 14
related:
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/adr/ADR-2026-04-18-art-direction-placeholder.md'
  - 'docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md'
  - 'docs/playtest/2026-04-28-visual-upgrade-screenshots.md'
---

# Godot migration strategy — 3-fase phased approach

## Context

User feedback iterativo Sprint A→F (visual upgrade web stack):

- _"sembra app telefono / sito Flash"_ → Sprint A-D shipped
- _"creature pallini/triangoli"_ → Sprint E shipped (sprite 64×64 procedural)
- _"ancora flat, lacune"_ → Sprint F shipped (borderImage cascade fix + tactical theming)
- _"Godot migliorerebbe? Donchitos completo? Integrare nel loro?"_
- _"mi sta convincendo Visual quality finale + Long-term maintenance"_

**Verdetto user**: lean Godot per visual quality finale + long-term maintenance.

**Trade-off critico**: migration full Godot = 3-4 mesi solo-dev. P5 Co-op TV (motivo originario progetto) gating = TKT-M11B-06 playtest userland pending. Migration mid-flight = blocca validation 4+ mesi.

**Strategia raccomandata**: 3-fase phased — ship web demo NOW + Godot R&D parallel + cutover post-playtest.

---

## Fase 1 — Web stack ship demo (3-5 settimane)

**Obiettivo**: chiudere gap visivo flat sufficiente per TKT-M11B-06 playtest userland. Validare P5 Co-op finalmente. Demo-ready.

### Sprint G — Real asset swap (~1 settimana)

- Kenney Roguelike RPG Pack CC0 (1700 asset) → tile bioma 9× reali sostituiscono procedural PIL
- Kenney Fantasy UI Borders CC0 (140 asset) → swap panel-frame.svg procedural
- Game-icons.net CC-BY 3.0 → 20+ SVG icon ability bar real
- LPC sprite atlas (Universal LPC Spritesheet) → 8 archetype × 4-frame walk + idle anim
- Footer attribution CC-BY auto

**Effort**: ~6-8h asset download/wire + 2-3h test/regression. **Risolve 60% gap "flat"** restante.

### Sprint H — PixiJS spike R&D (~1 settimana, OPZIONALE)

Decisione: SE Sprint G insufficiente per percezione "tactical RPG" → spike PixiJS WebGL renderer:

- 60 fps consistent vs Canvas 2D variable
- Native sprite anim AnimatedSprite + GPU particles
- Native filter chain (bloom, chromatic aberration, scanline shader)
- Drop-in replacement render.js (POC isolato spike)

**Effort**: 8-12h spike POC (1 encounter funzionante PixiJS). **Decision gate**: SE POC convince → Sprint I full migration PixiJS in 2 settimane (mantiene resto stack invariato). SE NO → resta su Canvas 2D, accept come-è.

### Sprint J — TKT-M11B-06 playtest userland (~1 settimana)

- Setup ngrok tunnel pubblico
- Reclutamento 4 amici test
- 1 sessione TV co-op live
- Bug report + retrospettiva
- **P5 🟢 def** dopo run successful

**Gate exit Fase 1**: P5 Co-op validato + Pillar score 6/6 🟢 def. Web stack demo-ready freezato.

---

## Fase 2 — Godot R&D parallel branch (4-8 settimane)

**Obiettivo**: prototype Godot v2 in parallelo, NON sostituire web stack. Validation qualità + scope serio prima cutover.

### Setup (~3 giorni)

- Clone Donchitos Claude-Code-Game-Studios template in NEW repo `Game-Godot-v2/` o branch dedicato `experimental/godot-v2`
- Tier engine: Godot 4.x (latest stable)
- Adattare 49 agent Donchitos al dominio:
  - Keep: godot-specialist, godot-gdscript-specialist, godot-shader-specialist, art-director, game-designer, gameplay-programmer, ai-programmer, ui-programmer, level-designer, qa-tester, performance-analyst, accessibility-specialist, narrative-director, sound-designer, prototyper
  - Drop: unity-_ / unreal-_ / godot-csharp-specialist (no need)
  - Add custom: `evo-tactics-domain-specialist` (MBTI + d20 + Spore + Skiv canon expert)
- Migrare 49 ADR (most relevant) → `design/adr/` Donchitos structure
- Migrare 41-AD + 42-SG + 43-ASSET-SOURCING + 44-HUD → `design/art-bible/` via `/art-bible` skill
- Setup `production/review-mode.txt` = `lean` (solo-dev pragmatico)

### Vertical slice MVP (~3-4 settimane)

Goal: 1 encounter playable end-to-end in Godot, validare process Donchitos.

1. **Scene root**: `Main.tscn` con Camera2D + TileMap + UI Control overlay
2. **TileMap**: import Kenney Roguelike Pack come TileSet resource
3. **Unit scene**: `Unit.tscn` con AnimatedSprite2D + Area2D collision + AnimationPlayer (idle/walk/attack/hurt/die)
4. **Sprite import**: LPC atlas → AtlasTexture per 8 archetype, 4-state anim
5. **D20 resolver**: port `services/rules/resolver.py` logic → `scripts/combat/d20_resolver.gd` (~200 LOC)
6. **AI policy**: port `apps/backend/services/ai/policy.js` essence → `scripts/ai/sis_policy.gd` (subset, no full vcScoring)
7. **HUD**: Control nodes con theme tactical (Cinzel font + parchment border)
8. **Particles**: GPUParticles2D per hit/heal/AoE feedback
9. **Light2D**: ambient light + occluders biome-specific atmosfera
10. **Test**: GUT framework, port 30-50 test critici subset (no 382 full)

**Effort**: 80-120h solo-dev + AI pair (`/team-combat` orchestrator usato).

### Decision gate exit Fase 2

Vertical slice MVP playable + comparison side-by-side vs web demo. Domande gate:

| Q                                                     | Threshold                            |
| ----------------------------------------------------- | ------------------------------------ |
| Visual quality MVP Godot ≥ 80% Tactics Ogre target?   | Required for cutover                 |
| Effort MVP entro 4 settimane?                         | Required (else scope creep)          |
| Godot HTML5 export funzionante (TV browser playable)? | Required (P5 Co-op support)          |
| Phone composer V2 portable a Godot Control?           | Required (Jackbox lobby integration) |
| Backend Express + WS rimane unchanged?                | Mandatory (no double-rewrite)        |

Se 5/5 SÌ → cutover Fase 3. Se ≤4/5 → archive Godot R&D, accept web stack v1 come final.

---

## Fase 3 — Cutover Godot v2 (4-8 settimane)

**Obiettivo**: full port + replace web v1.

### Port priority

1. **Session engine** (1967 LOC) → `scripts/session/round_orchestrator.gd` + `session_helpers.gd` + `session_constants.gd`
2. **AI scoring + policy** (vcScoring 20+ raw + 6 aggregate + 4 MBTI + 6 Ennea, declareSistemaIntents) → `scripts/ai/`
3. **Trait effects 7 vivi** (`active_effects.yaml`) → Godot `Resource` custom class `TraitEffect.gd`
4. **Lifecycle system** (propagateLineage, mating, legacy ritual) → `scripts/lifecycle/`
5. **Encounter loader 60+ YAML** → import via `EncounterLoader.gd` ResourceLoader
6. **250+ trait + 100+ species + 9 biome data** → Godot `Resource` ETL one-shot
7. **Co-op WS lobby + host-transfer + phone composer** → Godot HTML5 + custom WebSocketClient (NO Godot MultiplayerAPI — keep Express WS backend authoritative)
8. **382 AI test** → GUT framework (sub-set 100 critici minimo)

### Backend persistence

Godot client only. Backend Express + Prisma + Postgres + WS = **unchanged**. Godot HTTPClient + WebSocketClient → /api/\* endpoints esistenti. Mission Console (`docs/mission-console/`) deprecated, freezato.

### Memoria + ADR + museum

- 49 ADR keep — port relevant a `design/adr/`, archive obsoleti
- Museum cards keep — port a `docs/museum/`
- Skiv canon keep — `docs/skiv/CANONICAL.md` mantenuto
- 12 mesi memory cross-PC handoff → `~/.claude/projects/<godot-repo>/memory/` paths nuovi

### Cutover checklist

- [ ] Vertical slice MVP shipped Fase 2 + 5/5 gate criteria SÌ
- [ ] Godot HTML5 export working + deployable GitHub Pages
- [ ] Phone composer Godot Control replica funzionante
- [ ] Backend Express + WS testato cross-stack (Godot client → Express server)
- [ ] 100/100 critical test GUT passing
- [ ] Asset shipping: tile bioma 9× + sprite archetype 8× + UI panel + icon set tutto reale
- [ ] Web v1 archived branch `archive/web-v1-2026-04-28` + tag

**Estimate**: 6-10 settimane Fase 3 cutover.

**TOTAL Fase 1+2+3**: ~14-21 settimane (3.5-5 mesi). Vs full migration ora: ~3-4 mesi MA NO playtest validation, NO P5 chiusura, alto rischio scope balloon.

---

## Vantaggi 3-fase vs migration immediata

| Aspect                                 |             3-fase             |   Migration immediata    |
| -------------------------------------- | :----------------------------: | :----------------------: |
| TKT-M11B-06 playtest validato Fase 1   |               ✅               |   ❌ deferred 4+ mesi    |
| Sunk cost 12 mesi preserved            |       ✅ archive branch        |   ⚠️ backport doloroso   |
| Demo-ready continuamente               | ✅ web v1 funziona durante R&D |  ❌ rotto fino cutover   |
| Decision gate post-MVP (cancel option) |      ✅ Fase 2 exit gate       | ❌ committed dall'inizio |
| Visual quality Godot v2 finale         |      ✅ 80% Tactics Ogre       |        ✅ stesso         |
| Long-term maintenance Godot            |        ✅ post-cutover         |        ✅ stesso         |
| Donchitos studio process adottato      |          ✅ Fase 2-3           |        ✅ stesso         |
| Bandwidth solo-dev sostenibile         |         ✅ progressive         |  ⚠️ scope balloon risk   |

---

## Risks & mitigations

| Risk                                                           | Mitigation                                                                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Fase 2 vertical slice fallisce gate                            | Archive Godot R&D, accept web stack v1 final. Sunk cost Fase 2 ~80-120h, recuperabile come "feasibility study" |
| Donchitos template engine-specific bloat (49 agent / 72 skill) | Adapt Fase 2 setup: keep solo Godot specialists + design/qa/art generic, drop Unity/Unreal                     |
| Phone composer Godot Control non replica web                   | Fallback: phone resta web (PWA), Godot solo TV view. Hybrid stack acceptable                                   |
| Backend Express + WS + Godot HTML5 latency                     | Fase 2 MVP test cross-stack performance early                                                                  |
| 12 mesi memory backport doloroso                               | Selettivo: solo museum cards score ≥4/5 + ADR ACCEPTED + Skiv canon. Ignore stale                              |
| User cambia idea mid-migration                                 | Fase 2 exit gate = abort point clean                                                                           |
| TKT-M11B-06 playtest fail in Fase 1 → re-priorità              | Fase 2 inizia comunque, Fase 1 itera in parallel                                                               |

---

## Donchitos integration spec (Fase 2)

### Agent set finale (~25 vs 49 originali)

**Keep + adapt**:

- Tier 1: creative-director, technical-director, producer (3)
- Tier 2: game-designer, lead-programmer, art-director, qa-lead, narrative-director (5)
- Tier 3 generic: gameplay-programmer, ai-programmer, ui-programmer, level-designer, technical-artist, sound-designer, qa-tester, accessibility-specialist, performance-analyst, prototyper (10)
- Engine specialists: godot-specialist, godot-gdscript-specialist, godot-shader-specialist, godot-gdextension-specialist (4)
- Custom domain: evo-tactics-domain-specialist (1) — MBTI + d20 + Spore + Skiv canon + co-op TV expert
- Existing nostri da migrare: skiv-curator (1) — Skiv canonical voice + lifecycle expert
- TOTAL: 24 agent

**Drop**:

- unity-_ / unreal-_ / godot-csharp-\* (engine non-target)
- live-ops-designer / community-manager / localization-lead / release-manager / writer / world-builder / writer / economy-designer / systems-designer / engine-programmer / network-programmer / tools-programmer / devops-engineer / analytics-engineer / security-engineer / ux-designer (overlap o non-fit solo-dev MVP)

### Skill set finale (~30 vs 72 originali)

**Keep**:

- /start /help /project-stage-detect (onboarding)
- /art-bible /asset-spec /asset-audit (art workflow — adopt subito anche Fase 1)
- /ux-design /ux-review (UI workflow)
- /architecture-decision /architecture-review (ADR workflow — sostituiscono nostro free-form)
- /create-epics /create-stories /dev-story /sprint-plan /sprint-status /story-readiness /story-done (sprint workflow)
- /design-review /code-review /balance-check /scope-check /perf-profile /tech-debt /gate-check /consistency-check (review)
- /qa-plan /smoke-check /soak-test /regression-suite /test-evidence-review /test-flakiness (QA)
- /retrospective /milestone-review /bug-report /bug-triage /playtest-report (production)
- /team-combat /team-narrative /team-ui /team-level /team-qa (orchestrators)
- /skill-test /skill-improve (meta)

**Drop**:

- /setup-engine (Godot only, irrelevante post-setup)
- /team-release /team-live-ops /team-audio /team-polish (post-release scope, defer)
- /release-checklist /launch-checklist /changelog /patch-notes /hotfix /day-one-patch (post-release)
- /localize (defer)
- /onboard /adopt /reverse-document /create-control-manifest /create-architecture (one-shot setup)

### Hooks finale (mantenere)

- session-start.sh + session-stop.sh
- pre-compact.sh + post-compact.sh
- detect-gaps.sh
- validate-commit.sh + validate-assets.sh + validate-skill-change.sh
- log-agent.sh + log-agent-stop.sh
- notify.sh

12/12 keep. **Cherry-pick ANCHE per Fase 1** (~2h adapt).

### Rules finale (path-scoped)

Adapt per Godot stack:

- `scripts/gameplay/**` → data-driven values, delta time, no UI references
- `scripts/ai/**` → perf budget, debuggability
- `scripts/ui/**` → no game state, localization-ready
- `shaders/**` → GLSL standards
- `design/gdd/**` → 8-section template
- `tests/**` → naming + coverage + GUT fixture
- `data/**` → JSON/YAML lint + Godot Resource validate

---

## Domande aperte (decision points)

1. **Fase 1 timeline accettabile** (3-5 settimane) prima Fase 2 inizia?
2. **Fase 2 budget hard-cap** (8 settimane) prima decision gate? Skipping budget = abort vs continue?
3. **Repo strategy**: NEW repo `Game-Godot-v2/` o branch `experimental/godot-v2/` in repo corrente?
4. **Vertical slice scope** Fase 2: 1 encounter o 3 encounter (savana / caverna / boss)?
5. **Backend stack persiste** post-cutover (Express + Prisma + Postgres + WS)? Conferma SÌ default.
6. **Mission Console** (`docs/mission-console/` Vue bundle pre-built) → archive immediate o fallback compatibility durante migration?
7. **Donchitos cherry-pick subito Fase 1**: `/art-bible` + `/asset-spec` + `/asset-audit` + 4 path-scoped rules. SÌ default.

---

## Next steps actionable

1. **Subito** (Fase 1 Sprint G): asset reali Kenney + LPC swap procedural. Effort ~1 settimana.
2. **Parallelo Fase 1 (~2h)**: cherry-pick Donchitos `/art-bible` `/asset-spec` `/asset-audit` skill in nostro `.claude/skills/`. Adapt minimo path da `src/` a `apps/play/`.
3. **Post-Fase 1 ship demo**: setup repo `Game-Godot-v2/` (clone Donchitos) + agent + skill set ridotto.
4. **Fase 2 start**: vertical slice MVP 1 encounter (savana base) → decision gate.

**Status doc**: DRAFT pending user approval su 7 decision points sopra. Una volta confermati → `doc_status: active` + linkare in `BACKLOG.md` come ROADMAP-2026-Q3.
