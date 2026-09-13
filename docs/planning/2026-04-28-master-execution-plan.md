---
title: 2026-04-28 Master execution plan v2 — Sprint G + Visual Map + Godot migration
doc_status: draft
doc_owner: master-dd
workstream: planning
last_verified: 2026-04-28
language: it
review_cycle_days: 14
related:
  - 'docs/planning/2026-04-28-godot-migration-strategy.md'
  - 'docs/planning/2026-04-28-asset-sourcing-strategy.md'
  - 'docs/playtest/2026-04-28-visual-upgrade-screenshots.md'
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/core/42-STYLE-GUIDE-UI.md'
  - 'docs/core/43-ASSET-SOURCING.md'
---

# Master execution plan v2 — Visual upgrade + Godot migration phased (2026-04-28)

> **Scope**: piano esecutivo unificato + dettagliato + dipendenze + gate criteri + rollback path. Riferimento singolo per tutta migration Q2-Q3 2026.

> **Versioning**: v2 post review 2 agent paralleli (general-purpose + balance-illuminator) — gap critici risolti, scope realistico, P2+P4 visibility nel decision gate Sprint N.

## Review findings v1 → v2 (2026-04-28)

### Gap CRITICAL risolti (3)

1. **Test coverage cliff** (gen agent): v1 "100/382 critical" → 282 perdi senza criterio. v2: Sprint Q.1 NEW test parity audit, target ≥250 GUT pre-cutover Sprint S.
2. **Cross-stack backend assumption** (gen agent): v1 zero spike pre-MVP. v2: Sprint M.5 NEW (~4h) cross-stack spike + Sprint M.6 NEW (~3h) CI minimal — entrambi PRIMA Sprint N commit.
3. **Vertical slice MVP misura wrong thing** (domain agent): v1 enc_tutorial_01 puro combat = P2+P4 invisibili gate. v2: Sprint N scope expand "3-feature slice" (combat + 1 mating trigger + 1 thoughts ritual) — gate Sprint N valida P1+P2+P4+P6.

### Gap HIGH risolti (5)

4. **Phone composer circular gate** (domain agent): v1 gate Sprint N richiede cosa non esiste fino Sprint R. v2: Sprint M.5 NEW pre-spike phone composer Godot HTML5 (~2g) — kill biggest abort risk before Sprint N.3-N.6 invest.
5. **vcScoring subset port = P4 invisible MVP** (domain agent): v1 plan punt vcScoring Fase 3. v2: Sprint N.4 espande con vcScoring iter2 subset (4 assi MBTI only, NO Ennea) — minimal porting per P4 visibility gate.
6. **Skiv canonical preservation cross-repo** (gen + domain agents): v1 missing protocol. v2: Sprint G.3 override `dune_stalker → LPC lizard path` esplicito (~5min) + Sprint Q.4 Skiv data ETL.
7. **Audio asset gap totale** (gen agent): v1 zero menzione. v2: Sprint G.5b (~2h) Kenney audio CC0 pack + wire VFX events.
8. **JOB_TO_ARCHETYPE 4 jobs orfani** (domain agent): v1 silent fallback default. v2: TKT-VISUAL-LEGACY-ARCHETYPE-WIRE (~3h) Sprint G.3b mappa warden/artificer/invoker/harvester a Legacy Battle Sprite concreto.

### Improvement opportunity adottate (4)

9. **Sprint G v3 effort realistic**: v1 ~12h ottimistico. v2 ~20h ~2.5g (multi-frame anim authoring + parallax masking trade-off + VFX 8 types).
10. **Sprint J || K parallel**: v1 sequential. v2 parallel (file-system disjoint Obsidian vault vs Donchitos cherry-pick) — save 3-5g.
11. **Plugin priority re-order**: v1 Aseprite Wizard #1. v2 GUT framework #1 (test parity gate critical), Aseprite #2.
12. **Hybrid stable/experimental channel**: v1 archive web v1 immediate Sprint S. v2 maintain web v1 stable durante Fase 3, archive solo post-cutover validation 2 settimane userland Godot v2.

### Risk non mitigati nuovi (3)

- Donchitos upstream drift (cherry-pick frozen) → Sprint K.6 quarterly diff review
- Godot 4.x version drift 4.4→4.5 breaking → Sprint M.1 pin `project.godot config_version` + version-lock
- User burnout 14-19 sett solo-dev → Sprint J.5 daily note ritual aggiungere `energy_score 1-5` + sprint exit gate burnout check explicit

## Goals

1. **Short-term** (Fase 1, ~3-5 sett): chiudere gap visivo "flat" + sblocca **TKT-M11B-06 playtest userland** = P5 Co-op 🟢 def.
2. **Mid-term** (Fase 2, ~4-8 sett post-playtest): Visual Map Obsidian + Godot R&D parallel branch + vertical slice MVP + decision gate cutover/abort.
3. **Long-term** (Fase 3, ~4-8 sett): cutover Godot v2 OR archive R&D + accept web v1 final.

**TOTALE phased**: ~14-21 settimane (3.5-5 mesi).

## Non-goals

- ❌ Migration Godot immediate (block playtest 4+ mesi)
- ❌ DevForge integration (closed Tauri app, no repo template)
- ❌ Trilium adoption (AGPL viral, kill MIT)
- ❌ Donchitos full adopt 49 agent + 72 skill (Unity/Unreal bloat)
- ❌ HermeticOrmus full import (90% generic, bloat)
- ❌ Mission Console rebuild (Vue bundle pre-built source NOT in repo)
- ❌ Re-invention art direction (ADR-2026-04-18 ACCEPTED già canon)

---

## FASE 1 — Web stack ship demo (3-5 settimane)

### Sprint G v3 — Legacy Collection asset swap (~20h, ~2.5 giorni)

> **v3 changelog vs v1**: effort revised 12h→20h (multi-frame anim authoring + parallax masking trade-off + VFX 8 types more realistic). +Sprint G.3b archetype wire 4 orfani + G.3c Skiv override + G.5b audio Kenney CC0.

**Branch**: `feat/sprint-g-legacy-asset-swap-2026-04-28` (NEW da main).

**Asset source primary**: Legacy Collection (Ansimuz CC0, fornito user via zip 2026-04-28).

#### G.1 — Filter & extract subset (~1h)

```
target dir: apps/play/public/assets/legacy/
size budget: 18-20MB (vs 80MB full)
license: CC0 (LICENSE.txt commit)
```

| Subset                      | Source path Legacy                                                                                       | Target path                                                    | Size stim |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | :-------: |
| Battle Sprites 8 archetype  | `Legacy Collection/Assets/TinyRPG/Battle Sprites/`                                                       | `apps/play/public/assets/legacy/creatures/<archetype>/`        |   ~5MB    |
| Top-Down characters fantasy | `Legacy Collection/Assets/TinyRPG/Characters/Top-Down-16-bit-fantasy/`                                   | merge in `creatures/`                                          | inclusi ↑ |
| Tile bioma savana/foresta   | `Assets/TinyRPG/Environments/Overworld/` + `Top-Down-Forest/`                                            | `apps/play/public/assets/legacy/tiles/{savana,foresta_acida}/` |   ~3MB    |
| Tile bioma caverna          | `Assets/TinyRPG/Environments/single-dungeon-crawler/` + objects                                          | `legacy/tiles/caverna/`                                        |   ~2MB    |
| Tile bioma tundra/town      | `Assets/TinyRPG/Environments/Tiny RPG Mountain Files/` + `Top-Down-Town/`                                | `legacy/tiles/{tundra,town}/`                                  |   ~3MB    |
| Parallax bg layers          | `Assets/TinyRPG/Environments/parallax_forest_pack web/`                                                  | `apps/play/public/assets/legacy/parallax/` (4-6 layer)         |   ~1MB    |
| Gothicvania Boss tier       | `Assets/Gothicvania/Characters/Grotto-escape-2-boss-dragon/` + `Hell-Beast/` + `Ogre/`                   | `legacy/creatures/boss/`                                       |   ~3MB    |
| VFX Hit                     | `Assets/Explosions and Magic/Hit/Sprites/`                                                               | `legacy/vfx/hit/`                                              |  ~200KB   |
| VFX EnemyDeath              | `Assets/Explosions and Magic/EnemyDeath/`                                                                | `legacy/vfx/death/`                                            |  ~200KB   |
| VFX Explosion               | `Assets/Explosions and Magic/Explosions pack/explosion-1-a/Sprites/` (1 di 7)                            | `legacy/vfx/explosion/`                                        |  ~300KB   |
| VFX Slash 3 dir             | `Assets/Explosions and Magic/Grotto-escape-2-FX/sprites/{slash-circular,slash-horizontal,slash-upward}/` | `legacy/vfx/slash/`                                            |  ~200KB   |
| VFX Fire-ball               | `Assets/Explosions and Magic/Grotto-escape-2-FX/sprites/fire-ball/`                                      | `legacy/vfx/fireball/`                                         |  ~150KB   |
| VFX Electro-shock           | `Assets/Explosions and Magic/Grotto-escape-2-FX/sprites/electro-shock/`                                  | `legacy/vfx/electro/`                                          |  ~150KB   |
| VFX Bolt                    | `Assets/Explosions and Magic/Warped shooting fx/Bolt/sprites/`                                           | `legacy/vfx/bolt/`                                             |  ~150KB   |

**Script**: `tools/py/extract_legacy_subset.py` (NEW, ~80 LOC PIL + shutil)

- Input: `~/Desktop/Legacy Collection.zip` path
- Output: filter + copy subset → `apps/play/public/assets/legacy/`
- Idempotent (skip if dir exists)
- License compliance: copy `public-license.pdf` summary → `LICENSE.txt`

#### G.2 — Wire resolveTileImg Legacy path (~2h)

**File**: `apps/play/src/render.js` (linea ~6 helper esistente Sprint D)

```js
// 2026-04-28 Sprint G — Legacy Collection bioma tile path swap.
// Priority: legacy real PNG > procedural Sprint D fallback > checkered grid.
const TILE_BIOMA_MAP = {
  savana: 'legacy/tiles/savana',
  foresta_acida: 'legacy/tiles/foresta_acida',
  caverna: 'legacy/tiles/caverna',
  tundra: 'legacy/tiles/tundra',
  town: 'legacy/tiles/town',
  // Sprint D procedural fallback per biomi non-Legacy
  deserto: 'tiles/deserto',
  vulcanico: 'tiles/vulcanico',
  abissale: 'tiles/abissale',
  celeste: 'tiles/celeste',
  palude: 'tiles/palude',
};
```

Test: avvia encounter savana → vedi tile real Ansimuz invece procedural.

#### G.3 — Wire resolveCreatureSprite Legacy + multi-frame anim (~5h)

**v3 NEW**: include G.3b archetype wire orfani + G.3c Skiv canonical override.

**File**: `apps/play/src/render.js` resolveCreatureSprite + drawUnit

**Cambio significativo**: da static PNG single-frame → **AnimatedSprite multi-frame** con cycle ms-based.

```js
const CREATURE_ANIM_FRAMES = {
  vanguard: { idle: 4, walk: 6, attack: 5, hurt: 2 },
  skirmisher: { idle: 4, walk: 8, attack: 6, hurt: 2 },
  // ... per archetype
};
const ANIM_FPS = 8; // 8 frame/sec = 125ms/frame
```

`drawUnit()`:

- Determina `state` = idle (default) | walk (during interpolate move) | attack (during anim attack) | hurt (during flash)
- Frame index = `Math.floor((Date.now() / (1000/ANIM_FPS)) % frames[state])`
- `drawImage` source rect: `frame * frameW, stateRow * frameH, frameW, frameH`

**Force render loop continuous quando sprite anim active**:

- `needsAnimFrame()` ritorna `true` se almeno 1 unit alive con sprite (animation continua)
- Battery cost: trascurabile (60fps idle anim = ~2% CPU su mid-tier laptop)

#### G.4 — Parallax bg CSS layer (~1h)

**File**: `apps/play/src/style.css`

```css
.board {
  position: relative;
  background-image:
    url('/assets/legacy/parallax/sky.png'), url('/assets/legacy/parallax/clouds.png'),
    url('/assets/legacy/parallax/mountains.png'), url('/assets/legacy/parallax/trees.png');
  background-size:
    cover,
    200% auto,
    cover,
    cover;
  background-position:
    0 0,
    0 20%,
    0 70%,
    0 90%;
  background-repeat: no-repeat, repeat-x, no-repeat, no-repeat;
  animation: parallax-clouds 60s linear infinite;
}
@keyframes parallax-clouds {
  from {
    background-position:
      0 0,
      0 20%,
      0 70%,
      0 90%;
  }
  to {
    background-position:
      0 0,
      -200% 20%,
      0 70%,
      0 90%;
  }
}
```

Canvas `<canvas id="grid">` rimane on top transparent (drawCell con `tileImg` only — no fill se parallax visible). Trade-off: tile bioma masking parallax. Decision: keep tile bioma opaque, parallax visibile solo bordi canvas.

#### G.5 — VFX wire anim.js (~2h)

**File**: `apps/play/src/anim.js` (esistente popups + rays)

Aggiungi:

```js
// 2026-04-28 Sprint G — Legacy VFX sprite-based.
const VFX_ATLAS = {
  hit: { path: 'legacy/vfx/hit/', frames: 5, fps: 12 },
  death: { path: 'legacy/vfx/death/', frames: 8, fps: 12 },
  explosion: { path: 'legacy/vfx/explosion/', frames: 9, fps: 14 },
  slash_h: { path: 'legacy/vfx/slash/horizontal/', frames: 4, fps: 16 },
  slash_v: { path: 'legacy/vfx/slash/upward/', frames: 4, fps: 16 },
  fireball: { path: 'legacy/vfx/fireball/', frames: 6, fps: 12 },
  electro: { path: 'legacy/vfx/electro/', frames: 5, fps: 14 },
  bolt: { path: 'legacy/vfx/bolt/', frames: 4, fps: 14 },
};

export function spawnVFX(type, x, y, options = {}) {
  // Append to active VFX list, drawVFXFrames in render loop.
  // Auto-cleanup quando frame index > frames.length (anim end).
}
```

Wire chiamata:

- `session.js` post-attack hit → `spawnVFX('hit', target.x, target.y)`
- Death event → `spawnVFX('death', unit.x, unit.y)`
- AOE ability → `spawnVFX('explosion', center.x, center.y)`
- Channel-specific (psionic→electro, fire→fireball, ranged→bolt, melee→slash_h)

#### G.6 — Footer credit + LICENSE.txt (~15min)

**File**: `apps/play/index.html` footer

```html
<footer>
  <span id="selected-hint">Seleziona una tua unità.</span>
  <button id="cancel-pending" class="hidden">✕ Annulla ability</button>
  <small class="credit-line"> Pixel art: Luis Zuno (Ansimuz) — CC0 · UI: own SVG MIT </small>
</footer>
```

**File**: `apps/play/public/assets/legacy/LICENSE.txt`

```
Pixel art assets by Luis Zuno (Ansimuz)
License: Creative Commons Zero (CC0) — public domain
No attribution required, commercial use permitted, modification OK.
Source: https://ansimuz.itch.io/
Original: Legacy Collection (provided 2026-04-28)
```

#### G.7 — Test regression + format + commit (~1h)

```bash
node --test tests/ai/*.test.js          # 382/382 verde
npx prettier --check apps/play/src/     # all clean
git add apps/play/public/assets/legacy/ apps/play/src/render.js apps/play/src/anim.js apps/play/src/style.css apps/play/index.html tools/py/extract_legacy_subset.py
git commit -m "feat(visual): Sprint G — Legacy Collection asset swap (Ansimuz CC0)"
```

#### G.8 — Visual smoke test (~30min)

Preview localhost:5180:

- Reload page
- Avvia scenario `enc_tutorial_01` (savana)
- Verifica: tile real bioma + sprite multi-frame anim + parallax bg + VFX hit/death wire
- Screenshot pre/post → `docs/playtest/2026-04-28-sprint-g-screenshots.md`

**Effort totale Sprint G**: ~12h ~1.5 giorni.

**Gate exit Sprint G**: visual significantly upgraded vs Sprint F + 382/382 test verde + zero regression.

---

### Sprint H — itch.io gap-fill (OPZIONALE, ~3-4h)

**Trigger**: SE Sprint G insufficient su area specifica (UI border/button non in Legacy, secondary alternative).

**Process**:

- User browser apre itch.io tag-godot
- Cherry-pick 1 pack (max 2)
- Manual download → `apps/play/public/assets/itch-<pack>/`
- License txt copy
- Wire selettivo

**Default**: SKIP. Re-evaluate post-Sprint G visual smoke.

---

### Sprint I — TKT-M11B-06 playtest userland (~1 settimana)

**Branch**: `feat/playtest-m11b-06-prep` (NEW da main).

#### I.1 — Setup ngrok pubblico (~30min)

```bash
npm install -g ngrok
ngrok http 3334    # backend
ngrok http 5180    # play app
```

Verifica `lobby.html` + WS reachable da TV browser external. QR code via `qrcode-terminal` per phone-as-controller URL.

#### I.2 — Reclutamento 4 amici test (~1 giorno user-side)

DM amici, scheduling 1 sessione 1-2h.

#### I.3 — Preflight checklist (~1h)

```
- [ ] dev:stack runs clean
- [ ] backend WS lobby healthy /api/coop/health
- [ ] play app loads <2s su browser TV (Chromium ChromeOS / Smart TV)
- [ ] Phone composer V2 reachable da iOS/Android browser
- [ ] Lobby room code 4-letter consonanti generato
- [ ] Host-transfer path tested (kill host → reconnect grace 30s)
- [ ] Reconnect token persistent localStorage
- [ ] Audio mute toggle funziona
- [ ] Audio playtest no crash
- [ ] 1 encounter completable end-to-end (tutorial_01 prefer)
- [ ] Feedback form submit OK
```

#### I.4 — Playtest run live (~2h)

Setup TV + 4 phone connected lobby. 1 encounter o più.

Real-time observation:

- Bug critici (crash / state stuck) → log immediate
- Confusion player ("dove devo cliccare?") → UX gap note
- Lag / stutter network → perf log

#### I.5 — Retrospettiva + bug report (~2-3h)

Doc: `docs/playtest/2026-04-28-tkt-m11b-06-playtest-report.md`

Sezione obbligatoria:

- 4 amici tester demographic + experience prior
- Bug critici (P0) + flaky (P1) + UX gap (P2)
- Channel feedback (fisico/psionico/melee felt distinct?)
- Tension score 1-5
- Difficulty perceived
- Net Promoter Score (1-10)
- Liked / Improved / Bug textual

#### I.6 — Issue triage + hotfix (~1-2 giorni)

P0 fix immediate. P1 backlog. P2 UX archive next sprint.

#### I.7 — Pillar update — P5 Co-op 🟢 def

`CLAUDE.md` + `docs/core/02-PILASTRI.md`:

- P5 status: 🟡 → 🟢 def (post-playtest validato)
- Pillar score 6/6 🟢 def

**Gate exit Sprint I**: P5 Co-op validato run successful + bug P0 fixed + report committed.

**Gate exit Fase 1**: Sprint G + I shipped + Pillar 6/6 verde + demo-ready freezato.

---

## FASE 2 — Visual Map + Godot R&D (4-8 settimane)

### Sprint J — Visual Map Obsidian setup (~3-5 giorni — parallel a Sprint K)

> **v2 changelog**: parallel a Sprint K Donchitos cherry-pick (file-system disjoint, zero collision). Save 3-5g cumulative.

**Tool**: Obsidian (desktop free, MIT-friendly EULA, markdown-first git-compat).

**Vault**: `kb/` directory in repo (git-tracked).

#### J.1 — Install + plugin (~2h)

- Download Obsidian desktop (Win/Mac/Linux)
- Open vault `~/Desktop/Game/kb/`
- Plugin (Obsidian Community Plugins, all MIT/BSD-3):
  - Excalidraw (sketching)
  - Markmap (mind map markdown→visual)
  - Dataview (frontmatter query)
  - Kanban (sprint board)
  - Templater (template injection)
  - Periodic Notes (daily/weekly auto)
  - Git (sync conflict resolve)
  - Tag Wrangler (tag refactoring)

#### J.2 — Vault structure (~1h)

```
kb/
├── README.md                   # entry point
├── adr/                        # ETL 49 ADR
├── museum/                     # ETL 11 museum cards
├── memory/                     # ETL ~150 memory file selettivo
├── art-bible/                  # 41-AD + 42-SG + 43-ASSET-SOURCING + 44-HUD
├── maps/
│   ├── sprint-timeline.canvas  # mind map sprint M1→M11
│   ├── agent-graph.canvas      # 30 agent ecosystem
│   ├── repo-deps.canvas        # repo dependency graph
│   ├── pillar-status.canvas    # 6 Pilastri stato live
│   └── godot-migration.canvas  # 3-fase plan visualizzato
├── research/                   # ETL docs/research/
├── playtest/                   # symlink docs/playtest/
└── templates/
    ├── adr.md
    ├── museum-card.md
    └── sprint-retro.md
```

#### J.3 — ETL automation script (~3-4h)

**File**: `tools/py/etl_obsidian_kb.py` (NEW, ~150 LOC)

- Input: `docs/adr/*.md` + `docs/museum/cards/*.md` + `~/.claude/projects/<repo-id>/memory/*.md` + `docs/core/41-44*.md`
- Output: copy/symlink to `kb/<dir>/`
- Frontmatter normalize (Obsidian-friendly tags + aliases)
- Backlinks rewrite (`[[note-name]]` syntax)
- Dataview index inject

Idempotent. Re-runnable post-changes.

#### J.4 — Mind map authoring (~1-2 giorni manual)

3 mind map principali in Obsidian Canvas:

1. **sprint-timeline.canvas**: M1→M11 timeline con PR landed + key decision points + roadmap M12+
2. **agent-graph.canvas**: 30 agent (balance-illuminator, creature-aspect-illuminator, ui-design-illuminator, etc.) con dependency + invocation pattern + skill triggered
3. **repo-deps.canvas**: workspace dependency map (apps/play → packages/contracts → apps/backend → services/generation → data/core/\*)

Authoring iterativo. Initial draft 4-6h, polish ongoing.

#### J.5 — Daily/weekly note workflow (~30min setup)

Periodic Notes plugin → daily note auto in `kb/daily/YYYY-MM-DD.md`. Template inject TODO + log + insight section.

Integration: end-of-session ritual (CLAUDE.md riga ~150 "Memory Save Ritual") aggiungi step "update kb/daily/today.md".

**Gate exit Sprint J**: vault `kb/` populated + 3 mind map operational + daily note ritual integrated + git commit kb/.

---

### Sprint K — Donchitos cherry-pick + adapt (~3-5 giorni — parallel a Sprint J)

> **v2 changelog**: parallel a Sprint J Visual Map. +K.6 quarterly upstream diff review (Donchitos drift cherry-pick frozen mitigation).

**Source**: `https://github.com/Donchitos/Claude-Code-Game-Studios` (MIT).

#### K.1 — Clone + extract relevant (~1h)

```bash
git clone --depth 1 https://github.com/Donchitos/Claude-Code-Game-Studios.git /tmp/donchitos
```

#### K.2 — Cherry-pick agent (~6h)

**Filter rules**:

- Keep: art-director, game-designer, gameplay-programmer, ai-programmer, ui-programmer, level-designer, qa-tester, performance-analyst, accessibility-specialist, narrative-director, sound-designer, prototyper (12 generic)
- Keep: godot-specialist + godot-gdscript + godot-shader + godot-gdextension (4 Godot)
- Drop: unity-_ + unreal-_ + godot-csharp-specialist (engine non-target)
- Drop: live-ops-designer + community-manager + localization-lead + release-manager + writer + world-builder + economy-designer + systems-designer + engine-programmer + network-programmer + tools-programmer + devops-engineer + analytics-engineer + security-engineer + ux-designer (post-release scope o overlap)

**Adapt path**: copy 16 agent → `.claude/agents/donchitos-<original-name>.md`

**Custom add 2 agent**:

- `.claude/agents/evo-tactics-domain-specialist.md` (NEW): MBTI + d20 + Spore + Skiv canon expert (~150 LOC adapt da nostri creature-aspect-illuminator + balance-illuminator + narrative-design-illuminator)
- `.claude/agents/skiv-curator.md` (NEW): Skiv canonical voice + lifecycle (~100 LOC)

**TOTALE**: 18 nuovi agent. Existing 30+ noi → 48 total. Drop existing duplicate (overlap creature-aspect-illuminator with art-director? maintain entrambi distinct: nostro = research/audit, Donchitos = implementation).

#### K.3 — Cherry-pick skill (~6h)

**Filter rules**:

- Keep skill production-focused: `/art-bible`, `/asset-spec`, `/asset-audit`, `/ux-design`, `/ux-review`, `/balance-check`, `/scope-check`, `/perf-profile`, `/tech-debt`, `/gate-check`, `/consistency-check`, `/qa-plan`, `/smoke-check`, `/soak-test`, `/regression-suite`, `/test-evidence-review`, `/test-flakiness`, `/retrospective`, `/milestone-review`, `/bug-report`, `/bug-triage`, `/playtest-report`
- Keep team orchestrator: `/team-combat`, `/team-narrative`, `/team-ui`, `/team-level`, `/team-qa` (5)
- Keep meta: `/skill-test`, `/skill-improve`
- Keep architecture: `/architecture-decision`, `/architecture-review`, `/create-epics`, `/create-stories`, `/dev-story`, `/sprint-plan`, `/sprint-status`, `/story-readiness`, `/story-done`
- Drop post-release: `/team-release`, `/team-live-ops`, `/team-audio`, `/team-polish`, `/release-checklist`, `/launch-checklist`, `/changelog`, `/patch-notes`, `/hotfix`, `/day-one-patch`
- Drop one-shot: `/setup-engine`, `/onboard`, `/adopt`, `/reverse-document`, `/create-control-manifest`, `/create-architecture`
- Drop: `/localize` (defer post-launch)

**TOTALE**: ~32 skill cherry-picked. Adapt path: copy → `.claude/skills/donchitos-<original-name>/SKILL.md`.

**Conflict check**: nostre skill esistenti `/balance-check`? `/scope-check`? Pre-import grep `.claude/skills/` per duplicate. SE conflict → namespace `donchitos-*` or rename.

#### K.4 — Hooks integration (~2h)

12 hook Donchitos copy → `.claude/hooks/donchitos-*.sh`. Adapt path:

- `validate-commit.sh` adapt per nostre pre-commit rules (mojibake check + worktree guard etc già esistenti). Merge logic.
- `validate-assets.sh` adapt per `apps/play/public/assets/` naming
- `detect-gaps.sh` adapt per workspace nostro
- `session-start.sh` + `session-stop.sh` keep
- `notify.sh` keep
- `pre-compact.sh` + `post-compact.sh` keep
- `log-agent.sh` + `log-agent-stop.sh` keep
- `validate-skill-change.sh` keep

Test: ogni hook firing senza errori su PR test branch.

#### K.5 — Path-scoped rules (~1-2h)

11 rules Donchitos → `.claude/rules/donchitos-*.md`. Adapt path scoping a nostro structure:

- `gameplay-code.md` → scope `apps/backend/services/combat/**` + `apps/play/src/session*.js`
- `engine-code.md` → scope `apps/backend/**` (Express server)
- `ai-code.md` → scope `apps/backend/services/ai/**` + `apps/play/src/aiPolicy.js`
- `network-code.md` → scope `apps/backend/services/lobby/**` + `apps/play/src/network.js`
- `ui-code.md` → scope `apps/play/src/**.js` excluso engine
- `data-files.md` → scope `data/**.yaml` + `packs/**.yaml`
- `design-docs.md` → scope `docs/**.md` (already governance esistente)
- `narrative.md` → scope `data/core/narrative/**`
- `prototype-code.md` → scope `prototypes/**` (NEW dir, vuoto inizialmente)
- `shader-code.md` → defer (no shader nostro web)
- `test-standards.md` → scope `tests/**`

**Gate exit Sprint K**: 18 agent + 32 skill + 12 hook + 10 rules cherry-picked + adapted + tested no-error.

---

### Sprint L — HermeticOrmus prompt cherry-pick (~2 giorni)

**Source**: `https://github.com/HermeticOrmus/claude-code-game-development` (MIT).

#### L.1 — Clone + skim docs (~2h)

```bash
git clone --depth 1 https://github.com/HermeticOrmus/claude-code-game-development.git /tmp/hermetic
```

Skim `docs/` (50k+ word) + `plugins/` + `tools/`. Identifier 10-15 prompt high-value tactical RPG focus.

#### L.2 — Cherry-pick prompts (~6h)

**Target**: 10-15 prompt tested high-quality vs full 100 generic.

**Categories preferred**:

- Pixel art generation prompts (Aseprite + AI tier)
- Tactical AI behavior tree prompts
- Combat balance formula prompts
- Procedural level generation prompts
- Encounter design prompts
- Narrative branching prompts (Disco Elysium adapt)

**Target path**: `.claude/prompts/hermetic-<topic>.md`

#### L.3 — Pattern docs cherry-pick (~4h)

Filter `docs/` per tactical RPG / web-stack / fantasy aesthetic patterns. Skip JS shooter / platformer / arcade focus.

Save: `docs/research/hermetic-game-dev-patterns/<topic>.md`

**Gate exit Sprint L**: 10-15 prompt + 5-8 pattern doc cherry-picked.

---

### Sprint M — Godot project bootstrap (~5-7 giorni — v2 expanded)

> **v2 changelog**: +M.5 cross-stack spike (~4h) + M.6 CI minimal setup (~3h) + M.7 phone composer Godot HTML5 spike (~2g). Total Sprint M expand 3-5g → 5-7g. **Pre-requirement Sprint N commitment**.

**Strategy**: NEW separate repo `MasterDD-L34D/Game-Godot-v2` (NO branch in Game/ — keep web stack clean).

**Reasoning**: Godot project structure (`project.godot`, `addons/`, `scenes/`, `scripts/`, `resources/`) NON sovrapponibile con Vue 3 web stack monorepo. Branch confusion.

#### M.1 — Repo creation + Godot 4.x install (~1h)

```bash
gh repo create MasterDD-L34D/Game-Godot-v2 --private --description "Evo-Tactics Godot 4.x port" --license mit
git clone https://github.com/MasterDD-L34D/Game-Godot-v2.git
cd Game-Godot-v2
```

Download Godot 4.x latest stable Windows. Open `project.godot` (auto-create).

#### M.2 — Donchitos template adopt (~3h)

Clone Donchitos template root → repo. Adapt:

- `.claude/agents/`: 18 agent (16 Donchitos + 2 custom da Sprint K)
- `.claude/skills/`: 32 skill da Sprint K
- `.claude/hooks/`: 12 hook adapted
- `.claude/rules/`: 10 rules adapted
- `CLAUDE.md`: NEW per repo (`Godot 4.x` stack + reference cross-repo Game/)
- `production/review-mode.txt`: `lean` (solo-dev pragmatico)
- `design/`: empty initially (popolato durante MVP)

#### M.3 — Plugin Godot Asset Library install priority order (~3h)

Godot editor → AssetLib tab. Install in ordine:

1. Aseprite Wizard
2. LDtk import
3. Phantom Camera 2D
4. Beehave (behavior tree)
5. Dialogue Manager 2
6. GdPlanningAI (deferred fino Fase MVP AI port)
7. Pixel-perfect outline shader
8. CRT shader
9. Dissolve shader
10. GUT framework

Verify ognuno: enable plugin in Project Settings → Plugins → restart editor → no error.

#### M.4 — Asset import Legacy Collection (~2-3h)

Copy `apps/play/public/assets/legacy/` → `Game-Godot-v2/assets/`.

Godot import:

- TileSet authoring per ogni bioma (TileSet resource `.tres`)
- AtlasTexture per character spritesheet (Battle Sprites)
- Aseprite Wizard import → SpriteFrames `.tres` per AnimationPlayer
- VFX → AnimatedSprite2D resources

#### M.5 — Cross-stack backend spike (NEW v2, ~4h)

**Trigger**: review agent gen-purpose CRITICAL gap. Backend Express + Godot HTML5 cross-stack assumption non testata.

**Test concrete**:

- CORS preflight OPTIONS GET/POST `/api/coop/*` da origin `https://masterdd-l34d.github.io` (Godot HTML5 deploy GitHub Pages)
- WS upgrade headers Godot WebSocketClient → Express ws@8.18.3 server :3341
- JWT Bearer auth `Authorization` header da Godot HTTPClient (auth.js token validate)
- Latency baseline p50/p95/p99 (action → state update round-trip) measured with 50ms artificial delay simulation
- Postgres session persistence Godot client diversi (UUID identity unique)

**Output**: `docs/research/2026-04-28-cross-stack-spike-godot-express.md` con findings + go/no-go signal per Sprint N commitment.

**Abort trigger**: SE latency p95 > 200ms o CORS unsolvable senza nginx reverse proxy → Sprint N delay + investigate alternative (Godot self-host server alongside Express).

#### M.6 — CI minimal Game-Godot-v2 setup (NEW v2, ~3h)

**Trigger**: review gap CI/CD pipeline silenti.

**File**: `Game-Godot-v2/.github/workflows/test.yml`

```yaml
name: Test
on: [push, pull_request]
jobs:
  gut:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: chickensoft-games/setup-godot@v1
        with:
          version: 4.x-stable
      - run: godot --headless --script tests/gut_runner.gd
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: gdformat --check scripts/
```

Pre-commit Husky port equivalent (mojibake check + path-scoped guard) → `.git/hooks/pre-commit` script.

#### M.7 — Phone composer Godot HTML5 spike (NEW v2, ~2g)

**Trigger**: review CRITICAL circular gate Sprint N (gate criterion phone composer ma port Sprint R).

**Scope minimal POC**:

- Godot HTML5 export → 1 button "ATTACK" pressed → emit WebSocket message → Express WS receive → state update → echo back → Godot HTML5 client render
- Test su iOS Safari + Android Chrome real device (browser PWA)
- **Baseline measure web v1 first** (zero-extra-effort, riusa current backend WS `apps/backend/services/lobby/`): 50 sample p95 round-trip via DevTools Network panel + custom timestamp marker su `apps/play` canvas click → `/api/session/action` → state-fetch. Comparison reference per Godot HTML5 measure.
- **DioField command-latency p95** round-trip button→state-echo (chain: button press → WS upgrade → Express WS receive → state update → echo back → Godot HTML5 client render)
- Virtual keyboard occlusion test (chat input field)
- DPI handling 320px width minimum

**Decision binary**: SE prototype works **DioField command-latency p95 < 100ms** round-trip + UI scale OK su 320px → Sprint N gate criterion "phone composer portable" PRE-validated. SE p95 > 200ms → abort Godot decision PRIMA Sprint N.3-N.6 (3-4 settimane risparmio).

**Output**: [`docs/research/2026-04-28-godot-phone-composer-spike.md`](../research/2026-04-28-godot-phone-composer-spike.md) + binary go/no-go signal.

**Source ref re-frame**: Action 4 ADR-2026-04-28-deep-research-actions §Action 4 (DioField command-latency design crux F1 + F2 line 97).

**Gate exit Sprint M**: project Godot bootstrappato + plugin install + asset Legacy importati + 1 scene `Main.tscn` aperta + cross-stack spike PASS + CI green + phone composer spike PASS. Tutti 3 spike PASS → Sprint N commitment.

---

### Sprint N — Vertical slice MVP 3-feature (~4-5 settimane — v2 expanded)

> **v2 changelog**: scope expand da "1 encounter combat-only" a "3-feature slice" per validare P1+P2+P4+P6 (NON solo P1+P6). Effort 3-4 sett → 4-5 sett. Domain agent finding: enc_tutorial_01 puro = "wrong differentiator gate".

**Goal**: 1 encounter combat + 1 mating trigger + 1 thoughts ritual playable end-to-end in Godot. Validare core loop Spore-like + MBTI thought cabinet visibility decision gate.

**Feature slice target**:

1. **Combat encounter**: `enc_tutorial_01` (savana, 2 PG vs 2 SISTEMA)
2. **Mating trigger**: post-combat 2 unit superstiti → `propagateLineage` lightweight (NO full lineage tree, solo 1-gen child stat preview)
3. **Thoughts ritual**: 1 PG end-of-encounter → 3 candidati top vcProxy score → choice UI (Disco Elysium-style) → status_lock

#### N.1 — Scene root + TileMap (~3 giorni)

`scenes/Main.tscn`:

- `Camera2D` (Phantom Camera 2D)
- `TileMap` (Kenney/Legacy savana TileSet)
- `Node2D` Units container
- `CanvasLayer` HUD overlay

Authoring tutorial_01 grid 8x6 hand-placed savana tile.

#### N.2 — Unit scene (~3 giorni)

`scenes/Unit.tscn`:

- `Area2D` (collision)
- `AnimatedSprite2D` (4-state anim idle/walk/attack/hurt)
- `Label` (species name)
- `ProgressBar` (HP)
- `Marker2D` (anchor effects)
- `AnimationPlayer` (idle bob + attack swing)

`scripts/unit.gd`:

- `@export` species_id, job, hp, max_hp, ap, faction
- `func play_anim(state)` → AnimatedSprite2D play
- `func take_damage(dmg)` → flash red + decrement HP + AnimationPlayer hurt
- `func die()` → AnimationPlayer death + queue_free post-anim

Use `/team-combat` orchestrator Donchitos: spawn `gameplay-programmer` + `godot-specialist` + `technical-artist` + `qa-tester`.

#### N.3 — D20 resolver port (~3 giorni)

Port `services/rules/resolver.py` → `scripts/combat/d20_resolver.gd` (~200 LOC):

- `func resolve_attack(attacker, target, channel) -> AttackResult`
- d20 + bonus vs DC + Margin of Success + damage step
- Return Resource `AttackResult.gd` (immutable struct)

Test GUT: port 20 critical test → `tests/test_d20_resolver.gd`.

#### N.4 — AI policy + vcScoring iter2 4-axes MBTI port (~4-5 giorni — v2 expanded)

> **v2 changelog**: include vcScoring iter2 subset (4 assi MBTI only, NO Ennea — defer Fase 3) per P4 visibility gate decision.

Port `apps/backend/services/ai/policy.js` essence → `scripts/ai/sis_policy.gd`:

- `enumerate_actions` + `score_action` basic + `select_best_action`
- Use Beehave behavior tree per archetype-specific decision (vanguard tank vs skirmisher offensive vs healer support)

Port `apps/backend/services/vcScoring.js` 4-MBTI subset → `scripts/ai/vc_scoring_mbti.gd`:

- 4 axes (E_I, S_N, T_F, J_P) computed from raw events action_type/target_id/result
- Real-time pubsub via Signal `vc_scoring_updated` → thoughts ritual UI listen
- NO Ennea + 6 aggregate themes (defer Sprint O Fase 3 full)
- GUT test 20 critical port (4 axes × 5 scenario threshold)

**Anti-pattern**: signal-based status effect ordering. Use explicit ordered pipeline `_compute_axes()` function NOT signal listener undefined order.

#### N.5 — HUD Cinzel theme (~2 giorni)

`scenes/HUD.tscn`:

- `Theme` resource Cinzel font + IM Fell English + parchment border via NinePatchRect
- HP bar gold-bronze gradient
- Ability bar bottom Cinzel uppercase
- Pressure meter bronze frame

Replicate visual Sprint A-F web stack in Godot Theme.

#### N.6 — Particles + lighting (~3 giorni)

- `GPUParticles2D` per hit/death/explosion (port da Sprint G VFX wire)
- `Light2D` ambient bioma savana golden hour
- Occluders su tile high (mountain shadow)
- Dissolve shader on death

#### N.7 — End-to-end 3-feature slice playable (~4-5 giorni — v2 expanded)

**Combat loop**:

- Avvia encounter → 2 PG spawn + 2 SISTEMA spawn
- Player turn → click PG → ability menu → click target → attack resolve → VFX play → damage update HP
- SISTEMA turn → AI behavior tree decide → attack
- Loop fino vittoria/sconfitta

**Post-combat mating trigger** (NEW v2):

- 2 superstiti player → `propagateLineage` lightweight call → child stat preview
- Mating UI overlay: 2 portrait parents + 1 child stat aggregato + bond_hearts indicator
- Choice: ACCEPT / REJECT lineage → narrative beat preview

**Thoughts ritual end-of-encounter** (NEW v2):

- 1 PG selezionato → vcProxy MBTI 4-axes top score → 3 candidati thought
- Disco Elysium-style overlay: 3 panels candidate + lore preview + voice line audio
- 30s timer countdown → choice irreversible → `status_lock` apply
- Cinzel font + parchment border NinePatchRect Theme

GUT test: 50 critical test port-end-to-end (combat 30 + mating 10 + thoughts 10).

#### N.8 — Side-by-side comparison vs web demo (~1 giorno)

Screenshot comparison Godot v2 MVP vs web stack post-Sprint G:

- Visual quality side-by-side (subjective + measurable contrast/saturation)
- Performance (Godot profiler vs Chrome DevTools)
- HTML5 export Godot → deployable build

**Gate exit Sprint N (Decision gate Fase 2)** — v2 expanded:

| Q                                                                                                                        | Threshold                                      | Verifica                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual quality MVP Godot ≥ 80% Tactics Ogre target                                                                       | Required                                       | Subjective user judgment                                                                                                                                                                                      |
| Effort MVP entro 5 settimane (v2 cap)                                                                                    | Required                                       | git log Sprint M+N elapsed                                                                                                                                                                                    |
| Godot HTML5 export funzionante                                                                                           | Required                                       | Browser test export deployable                                                                                                                                                                                |
| Phone composer V2 portable Control nodes                                                                                 | Required (Sprint M.7 PRE-validated)            | Mobile real device test                                                                                                                                                                                       |
| Backend Express + WS unchanged                                                                                           | Mandatory (Sprint M.5 spike PASS)              | API call cross-stack test                                                                                                                                                                                     |
| **P1 Tattica** combat playable + ITB telegraph                                                                           | NEW v2 Required                                | predict_combat hover + threat tile                                                                                                                                                                            |
| **P2 Spore** mating trigger funzionante post-combat                                                                      | NEW v2 Required                                | propagateLineage call + child stat preview UI                                                                                                                                                                 |
| **P4 MBTI** thoughts ritual + vcProxy 4-axes visible                                                                     | NEW v2 Required                                | 3 candidate UI + voice line + status_lock                                                                                                                                                                     |
| **P6 Fairness** combat balance check non-trivial                                                                         | NEW v2 Required                                | hardcore subset 1 scenario non-stalemate                                                                                                                                                                      |
| **Failure model parity**: `wounded_perma` persists Godot Resource state cross-encounter + `legacy_ritual` fires on death | **MANDATORY 5/5** (user verdict 2026-04-28 Q8) | Test integrato: encounter A finisce con unit ferita → encounter B unit reload preserved wounded_perma → unit muore → legacy_ritual UI overlay fires + Action 6 ambition lineage merge bond_path se applicable |

**Verdict**:

- 5/5 SÌ → cutover Fase 3
- 4/5 → re-evaluate, possible patch + retry
- ≤3/5 → archive Godot R&D, accept web stack v1 final

---

## FASE 3 — Cutover Godot v2 (4-8 settimane)

**Trigger**: Fase 2 decision gate 5/5 SÌ.

### Sprint O — Full session engine port (~2-3 settimane)

Port `apps/backend/routes/session.js` (1967 LOC) + `roundOrchestrator.js` + `sessionHelpers.js` + `sessionConstants.js` → GDScript `scripts/session/`.

Map:

- `session.js` createSessionRouter → `scripts/session/round_orchestrator.gd` (Resource + signal)
- `/start /action /turn/end /end /state /:id/vc` endpoint → backend HTTPClient calls (backend resta Express, Godot client only)
- AI scoring vcScoring 20+ raw + 6 aggregate + 4 MBTI + 6 Ennea → `scripts/ai/vc_scoring.gd`
- declareSistemaIntents → `scripts/ai/sistema_intents.gd`

GUT test: port 100/382 critical test → `tests/`.

### Sprint P — Trait + lifecycle + mating port (~1-2 settimane)

- 7 trait vivi `active_effects.yaml` → Godot `Resource` custom class `TraitEffect.gd`
- `propagateLineage` + mating + legacy ritual → `scripts/lifecycle/`
- Lifecycle phase + stadio system → `Resource`

### Sprint Q — Encounter + data ETL (~1 settimana)

- 60+ encounter YAML → import via `EncounterLoader.gd` ResourceLoader
- 250+ trait + 100+ species + 9 biome data → Godot `Resource` ETL one-shot script
- LDtk integration per encounter authoring future

### Sprint R — Co-op WS + phone composer port (~2-3 settimane)

- Lobby + Room + host-transfer + reconnect token → custom `WebSocketClient` in Godot HTML5 (NO Godot MultiplayerAPI — keep Express WS server authoritative)
- Phone composer V2 → Control nodes Godot (mantenere PWA web alternative come fallback se Godot phone troppo limitato)

### Sprint S — Cutover checklist + hybrid stable channel (~5-7 giorni — v2 expanded)

> **v2 changelog**: hybrid pattern instead of immediate archive. Web v1 stable maintained 2 settimane post-cutover Godot v2 = "experimental channel" → archive solo dopo userland validation Godot v2 stabile.

```
- [ ] All Sprint O-R shipped
- [ ] HTML5 export deploy GitHub Pages
- [ ] Phone composer Godot funzionante
- [ ] Backend Express + WS test cross-stack OK
- [ ] 100/100 critical GUT pass
- [ ] Asset Legacy import verified
- [ ] Web v1 archive: branch `archive/web-v1-2026-04-28` + tag `web-v1-final`
- [ ] CLAUDE.md update repo Game/ → mark deprecated, point Game-Godot-v2/
- [ ] Memory PC-local backport selettivo: museum cards score ≥4/5 + ADR ACCEPTED + Skiv canon → Game-Godot-v2 paths
```

**Gate exit Fase 3**: cutover complete, Godot v2 live.

---

## TOTAL effort summary v2

| Fase | Sprint                                                                 | Effort v1 |                   Effort v2                    |  Cumulative v2   |
| ---- | ---------------------------------------------------------------------- | :-------: | :--------------------------------------------: | :--------------: | ----------------- | ----------- |
| 1    | G v3 (Legacy asset swap + audio + Skiv override + archetype wire)      | 12h ~1.5g |                 **20h ~2.5g**                  |       2.5g       |
| 1    | H (itch.io gap-fill) OPT                                               | 4h ~0.5g  |                    4h ~0.5g                    |        3g        |
| 1    | I (TKT-M11B-06 playtest)                                               |  1 sett   |                     1 sett                     |    ~1.5 sett     |
| 2    | \*\*J                                                                  |           | K parallel\*\* (Visual Map + Donchitos cherry) | 6-10g sequential | **3-5g parallel** | ~2-2.5 sett |
| 2    | L (HermeticOrmus cherry)                                               |    2g     |                       2g                       |   ~2-2.5 sett    |
| 2    | M v2 (Godot bootstrap + cross-stack spike + CI + phone composer spike) |   3-5g    |                    **5-7g**                    |    ~3-4 sett     |
| 2    | N v2 (Vertical slice MVP 3-feature)                                    | 3-4 sett  |                  **4-5 sett**                  |    ~7-9 sett     |
| 3    | O (session engine port)                                                | 2-3 sett  |                    2-3 sett                    |    ~9-12 sett    |
| 3    | P (trait+lifecycle port)                                               | 1-2 sett  |                    1-2 sett                    |   ~10-14 sett    |
| 3    | Q v2 (encounter+data ETL + test parity audit + Skiv migration)         |  1 sett   |                 **1.5-2 sett**                 |   ~12-16 sett    |
| 3    | R (co-op WS port)                                                      | 2-3 sett  |                    2-3 sett                    |   ~14-19 sett    |
| 3    | S v2 (cutover + hybrid stable 2-sett validation + archive)             |   3-5g    |                    **5-7g**                    |   ~15-20 sett    |

**TOTALE v2**: ~15-20 settimane (3.75-5 mesi). vs v1: +1 sett max (justified expand).

**Trade-off accepted**: +1 settimana effort vs v1 IN CAMBIO eliminazione 3 CRITICAL gap (test cliff, cross-stack untested, P2+P4 invisible gate) + 5 HIGH gap risolti. Plan v2 production-ready.

## Decision points pending (master)

1. ✅ Ordine fasi (Sprint G → I → J → K → L → M → N → gate → O-S) — confermato user 2026-04-28
2. ✅ Obsidian invece Trilium (no AGPL) — confermato
3. ⚠️ DevForge skip (closed Tauri app, no integration) — default
4. ⚠️ Donchitos cherry-pick (NOT full) — default
5. ⚠️ HermeticOrmus cherry-pick 10-15 prompt — default
6. ⚠️ Repo strategy Fase 2: NEW repo `Game-Godot-v2` separato (NOT branch experimental/) — default
7. ⚠️ Vertical slice scope Fase 2: 1 encounter (savana) — default
8. ⚠️ Backend stack persiste Fase 3 (Express + Prisma + Postgres + WS unchanged) — default
9. ⚠️ Mission Console deprecated immediate Fase 3 (not fallback compatibility) — default
10. ⚠️ Donchitos cherry-pick subito Fase 1 (Sprint G concurrent): `/art-bible` + `/asset-spec` + `/asset-audit` skill + 4 path-scoped rules — DEFER a Sprint K full cherry-pick (Fase 2) per consistency

## Risks & mitigations master

| Risk                                       | Mitigation                                                              | Owner         |
| ------------------------------------------ | ----------------------------------------------------------------------- | ------------- |
| Sprint G visual gap residuo post-Legacy    | Sprint H itch.io OR escalate Sprint G v3 multi-frame anim more          | user judgment |
| TKT-M11B-06 amici unavailable              | Defer 1-2 sett, parallel Sprint J Obsidian                              | user          |
| Sprint J Obsidian setup overhead           | Reduce scope ETL minimum (ADR + museum core 30 vs 150 memory full)      | user          |
| Donchitos cherry-pick conflict skill name  | Namespace `donchitos-*` prefix all imports                              | Claude        |
| Godot vertical slice exceeds 4-week budget | Scope cut: skip particles + lighting Sprint N.6, defer Fase 3           | user gate     |
| Phone composer V2 NON portable Godot       | Hybrid: Godot TV view + web PWA phone — acceptable                      | user gate     |
| Backend Express WS Godot HTML5 latency     | Sprint N.8 cross-stack perf test early                                  | qa-tester     |
| 12 mesi memory backport doloroso           | Selettivo museum ≥4/5 + ADR ACCEPTED + Skiv canon (NOT 150 memory full) | Claude        |
| User cambia idea mid-Fase 2                | Decision gate Sprint N abort clean point                                | user          |
| Solo-dev bandwidth burnout                 | Hard pause weekly + checkpoint user satisfaction                        | user          |
| TKT-M11B-06 fail playtest → re-priorità    | Fase 2 inizia comunque parallel Sprint J Obsidian, Sprint G itera       | user          |
| AGPL trap import asset code                | Filter MIT/CC0/CC-BY only (NO GPL/AGPL plugin code)                     | Claude verify |
| Asset bloat repo Sprint G                  | Filter selettivo 18-20MB (NOT 80MB full)                                | Claude        |
| itch.io Cloudflare blocca automation       | Manual download protocol Sprint H if needed                             | user          |

## Monitoring + checkpoint cadence

- **Daily** (during sprint active): kb/daily/YYYY-MM-DD.md log progress
- **Weekly** (Fri end-day): retrospective sprint progress + adjust scope next week
- **Bi-weekly** (every 2 sett): re-read master plan, update `last_verified`, adjust if scope drift
- **Phase exit**: gate criteria sopra → SÌ proceed o NO abort/retry

## Rollback paths

| Trigger                                      | Rollback action                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Sprint G break test 382/382                  | `git revert` HEAD, restore from last verde commit, investigate root cause                                    |
| Sprint G break visual user judgment          | `git checkout main` restore, accept Sprint F as final, defer Godot direct                                    |
| TKT-M11B-06 P0 critical bug                  | hotfix branch + ship + retry playtest 1 sett later                                                           |
| Sprint J Obsidian git conflict               | `git stash` kb/, mark `kb/` as gitignored fallback, manual sync via Obsidian Git plugin                      |
| Sprint K Donchitos hook breaks existing flow | Disable hook tagged `donchitos-*` in `.claude/settings.json`, investigate per-hook                           |
| Sprint M Godot project corrupt               | NEW repo init, re-clone, NO sunk cost (sprint M ~3-5g recoverable)                                           |
| Sprint N MVP gate ≤3/5 fail                  | Archive Godot R&D, mark `experimental/godot-v2` deprecated, accept web v1 final, return Sprint G+H+I iterate |
| Fase 3 cutover bug critico post-deploy       | Tag `web-v1-final` revert deploy, debug Godot v2 issue, retry post-fix                                       |

---

## Final output

Plan ready. Pending self-review per gap analysis + improvement opportunity.

Status: **DRAFT** — pending review before execution start.
