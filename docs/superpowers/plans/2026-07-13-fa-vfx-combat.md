# F-A VFX Combat -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secondo pilastro della slice F-A "vestita": VFX combat pixel-art veri (spritesheet Pimen, licenza verificata) al posto dei placeholder particellari -- hit spark, slash d'attacco, death dissolve, puff di status -- piu' l'estrazione del controller feedback da main.gd imposta dalla ratifica di PR Godot-v2 #599.

**Architecture:** Il pattern esiste gia' (audio foundation #599): catalogo statico + spawner figlio di Main. Si aggiunge `VfxCatalog` (chiave -> spritesheet + geometria frame, misurata e hardcoded sotto), una scena generica `AnimatedVfx` (AnimatedSprite2D costruito dal catalogo, play-once, autofree) e si estende `VfxSpawner` con `spawn_effect(key, world_pos)`. VINCOLO dalla ratifica #599: main.gd e' ESATTAMENTE al ceiling gdlint 1120 e non si ri-bumpa -- Task 4 estrae gli handler feedback (`_on_unit_damaged`/`_on_unit_died` + il blocco sfx di `_on_action_resolved`) in un controller `CombatFeedback`, liberando righe e dando un punto unico audio+vfx.

**Tech Stack:** come #599 (Godot 4.6, GUT tests/unit, gdformat/gdlint, trailer ADR-0011, PRD overlay stesso PR). Asset: Pimen (licenza custom verificata: commercial OK, no credit richiesto, no resell -- NON ridistribuire i sorgenti fuori dal gioco).

---

## Geometrie spritesheet (MISURATE 2026-07-13 dagli archivi in staging)

Sorgenti in `C:\dev\_evo-assets-staging\` (estratti in `_vfx-extract\`; gli sheet loose sono in root staging):

| Chiave | File sorgente                                    | Sheet  | Frame | hframes x vframes       | Frame usati |
| ------ | ------------------------------------------------ | ------ | ----- | ----------------------- | ----------- |
| hit    | `_vfx-extract/Hit Effect 01/Hit Effect 01 1.png` | 336x48 | 48x48 | 7 x 1                   | 7           |
| slash  | `Slash Sprite Sheet.png` (root staging)          | 64x512 | 64x64 | 1 x 8 (strip verticale) | 8           |
| death  | `_vfx-extract/Dark VFX 2/Dark VFX 2 (48x64).png` | 768x64 | 48x64 | 16 x 1                  | 16          |
| status | `_vfx-extract/Smoke Effect 01/Smoke VFX3.png`    | 320x16 | 32x16 | 10 x 1                  | 8           |

NB: i pack Pimen portano la frame-size nel filename quando la griglia non e' ovvia; le geometrie sopra sono verificate leggendo l'IHDR dei PNG. Se all'esecuzione un file differisce, ri-misurare (`python: struct.unpack('>II', header[16:24])`), NON tirare a indovinare.

### Task 0: asset prep (assets/vfx/pimen + PROVENANCE)

**Files:**

- Create: `assets/vfx/pimen/{hit_spark.png, slash.png, death_dissolve.png, status_smoke.png}`
- Create: `assets/vfx/pimen/PROVENANCE.md`

- [ ] **Step 0: GATE provenance (43-ASSET-SOURCING)**: verificare che l'addendum 2026-07-13 del report `docs/reports/2026-07-12-asset-staging-provenance.md` (repo Game, stesso PR di questo piano) elenchi i 4 pack sorgente con licenza per-pack verificata e free-tier match. Se un file sorgente NON e' coperto dall'addendum -> STOP, verificare la pagina del pack prima di copiarlo.
- [ ] **Step 1: copiare gli sheet** (bash, worktree Godot `C:\dev\_godot-wt-vfx`):

```bash
STG=/c/dev/_evo-assets-staging
WT=/c/dev/_godot-wt-vfx
mkdir -p "$WT/assets/vfx/pimen"
cp "$STG/_vfx-extract/Hit Effect 01/Hit Effect 01 1.png" "$WT/assets/vfx/pimen/hit_spark.png"
cp "$STG/Slash Sprite Sheet.png" "$WT/assets/vfx/pimen/slash.png"
cp "$STG/_vfx-extract/Dark VFX 2/Dark VFX 2 (48x64).png" "$WT/assets/vfx/pimen/death_dissolve.png"
cp "$STG/_vfx-extract/Smoke Effect 01/Smoke VFX3.png" "$WT/assets/vfx/pimen/status_smoke.png"
```

- [ ] **Step 2: `assets/vfx/pimen/PROVENANCE.md`**:

```markdown
# assets/vfx/pimen -- provenance

Fonte: pack Pimen (https://pimen.itch.io/), acquisiti dall'owner 2026-07-12
(staging Fase 2; identificazione e verifica licenza nel repo Game,
docs/reports/2026-07-12-asset-staging-provenance.md + DOWNLOAD-LOG staging).

Licenza (verbatim dalle pagine pack): "You can use and modify this asset for
personal and commercial purpose. Credit is not required but would be
appreciated. You cannot resell or redistribute those sprites."

| File               | Pack Pimen                                                     | Licenza (per-pack, verif. 2026-07-13)   | Frame                      |
| ------------------ | -------------------------------------------------------------- | --------------------------------------- | -------------------------- |
| hit_spark.png      | Battle VFX: Hit Spark ("Hit Effect 01", variante 1, free tier) | custom Pimen (commercial OK, no resell) | 7x 48x48                   |
| slash.png          | Cutting and Healing ("Slash Sprite Sheet")                     | CC-BY 4.0 (credit consigliato)          | 8x 64x64 (strip verticale) |
| death_dissolve.png | Dark Spell Effect ("Dark VFX 2", free tier)                    | custom Pimen (commercial OK, no resell) | 16x 48x64                  |
| status_smoke.png   | Smoke N Dust 01 ("Smoke VFX3", free tier)                      | custom Pimen (commercial OK, no resell) | 8x 32x16 (griglia 10)      |

Credit volontario (consigliato nei game credits): "VFX by Pimen (pimen.itch.io)".
```

- [ ] **Step 3:** `godot --headless --quit-after 2 .` per generare gli `.import`; commit `feat(vfx): import pimen combat spritesheets with provenance` (+ trailer ADR-0011).

### Task 1: VfxCatalog

**Files:**

- Create: `scripts/vfx/vfx_catalog.gd`
- Test: `tests/unit/test_vfx_catalog.gd`

- [ ] **Step 1: test fallente**:

```gdscript
extends GutTest


func test_known_effects_have_valid_geometry() -> void:
	for key in ["hit", "slash", "death", "status"]:
		var e: Dictionary = VfxCatalog.entry_for(key)
		assert_false(e.is_empty(), "missing entry for '%s'" % key)
		var tex: Texture2D = load(e["texture"])
		assert_not_null(tex, "missing texture for '%s'" % key)
		assert_eq(int(tex.get_width()) % int(e["frame_w"]), 0, "frame_w mismatch for '%s'" % key)
		assert_eq(int(tex.get_height()) % int(e["frame_h"]), 0, "frame_h mismatch for '%s'" % key)


func test_unknown_effect_returns_empty() -> void:
	assert_true(VfxCatalog.entry_for("nope").is_empty())


func test_frames_fit_grid() -> void:
	for key in ["hit", "slash", "death", "status"]:
		var e: Dictionary = VfxCatalog.entry_for(key)
		assert_true(int(e["frames"]) <= int(e["hframes"]) * int(e["vframes"]), key)
```

- [ ] **Step 2: run** (`-gselect=test_vfx_catalog`) -> FAIL. **Step 3: implementare** `scripts/vfx/vfx_catalog.gd`:

```gdscript
class_name VfxCatalog
extends RefCounted
## Static effect->spritesheet catalog. Geometry measured from the Pimen sheets
## (PNG IHDR verified 2026-07-13): do not guess new entries, measure them.

const _ENTRIES := {
	"hit":
	{
		"texture": "res://assets/vfx/pimen/hit_spark.png",
		"frame_w": 48,
		"frame_h": 48,
		"hframes": 7,
		"vframes": 1,
		"frames": 7,
		"fps": 18.0,
	},
	"slash":
	{
		"texture": "res://assets/vfx/pimen/slash.png",
		"frame_w": 64,
		"frame_h": 64,
		"hframes": 1,
		"vframes": 8,
		"frames": 8,
		"fps": 20.0,
	},
	"death":
	{
		"texture": "res://assets/vfx/pimen/death_dissolve.png",
		"frame_w": 48,
		"frame_h": 64,
		"hframes": 16,
		"vframes": 1,
		"frames": 16,
		"fps": 16.0,
	},
	"status":
	{
		"texture": "res://assets/vfx/pimen/status_smoke.png",
		"frame_w": 32,
		"frame_h": 16,
		"hframes": 10,
		"vframes": 1,
		"frames": 8,
		"fps": 14.0,
	},
}


static func entry_for(key: String) -> Dictionary:
	return _ENTRIES.get(key, {})
```

- [ ] **Step 4: run -> PASS. Step 5: commit** `feat(vfx): spritesheet catalog with measured geometry`.

### Task 2: AnimatedVfx (play-once, autofree)

**Files:**

- Create: `scripts/vfx/animated_vfx.gd`
- Test: `tests/unit/test_animated_vfx.gd`

- [ ] **Step 1: test fallente**:

```gdscript
extends GutTest


func test_setup_builds_frames_and_plays() -> void:
	var fx := AnimatedVfx.new()
	add_child_autofree(fx)
	var ok := fx.setup("hit")
	assert_true(ok)
	assert_not_null(fx.sprite.sprite_frames)
	assert_eq(fx.sprite.sprite_frames.get_frame_count("fx"), 7)
	assert_true(fx.sprite.is_playing())


func test_setup_unknown_key_fails_clean() -> void:
	var fx := AnimatedVfx.new()
	add_child_autofree(fx)
	assert_false(fx.setup("nope"))


func test_frees_itself_after_animation() -> void:
	var fx := AnimatedVfx.new()
	add_child(fx)
	fx.setup("status")
	fx.sprite.animation_finished.emit()
	await wait_frames(2)
	assert_false(is_instance_valid(fx))
```

- [ ] **Step 2: run -> FAIL. Step 3: implementare** `scripts/vfx/animated_vfx.gd`:

```gdscript
class_name AnimatedVfx
extends Node2D
## Generic one-shot spritesheet effect driven by VfxCatalog. Plays once, frees itself.

var sprite: AnimatedSprite2D = null


func setup(effect_key: String) -> bool:
	var e := VfxCatalog.entry_for(effect_key)
	if e.is_empty():
		return false
	var tex: Texture2D = load(e["texture"])
	if tex == null:
		return false
	var frames := SpriteFrames.new()
	frames.add_animation("fx")
	frames.set_animation_speed("fx", e["fps"])
	frames.set_animation_loop("fx", false)
	for i in range(e["frames"]):
		var at := AtlasTexture.new()
		at.atlas = tex
		var col := i % int(e["hframes"])
		var row := i / int(e["hframes"])
		at.region = Rect2(col * e["frame_w"], row * e["frame_h"], e["frame_w"], e["frame_h"])
		frames.add_frame("fx", at)
	sprite = AnimatedSprite2D.new()
	sprite.sprite_frames = frames
	add_child(sprite)
	sprite.animation_finished.connect(queue_free)
	sprite.play("fx")
	return true
```

- [ ] **Step 4: run -> PASS. Step 5: commit** `feat(vfx): animated one-shot spritesheet effect`.

### Task 3: VfxSpawner.spawn_effect + rewire hit/death

**Files:**

- Modify: `scripts/ui/vfx_spawner.gd` (aggiungere `spawn_effect`; `spawn_hit`/`spawn_death` restano e in piu' innescano lo sprite: label danno e particelle esistenti NON si rimuovono in questa slice)
- Test: `tests/unit/test_vfx_spawner_effects.gd`

- [ ] **Step 1: test fallente**:

```gdscript
extends GutTest


func test_spawn_effect_known_key() -> void:
	var s := VfxSpawner.new()
	add_child_autofree(s)
	var fx := s.spawn_effect("slash", Vector2(10, 20))
	assert_not_null(fx)
	assert_eq(fx.position, Vector2(10, 20))


func test_spawn_effect_unknown_key_returns_null() -> void:
	var s := VfxSpawner.new()
	add_child_autofree(s)
	assert_null(s.spawn_effect("nope", Vector2.ZERO))


func test_spawn_hit_also_spawns_sprite_effect() -> void:
	var s := VfxSpawner.new()
	add_child_autofree(s)
	s.spawn_hit(Vector2.ZERO, 3)
	var found := false
	for child in s.get_children():
		if child is AnimatedVfx:
			found = true
	assert_true(found, "spawn_hit must spawn an AnimatedVfx sprite effect")
```

- [ ] **Step 2: run -> FAIL. Step 3: implementare** in `scripts/ui/vfx_spawner.gd` -- aggiungere il metodo e le due chiamate:

```gdscript
## spawn a one-shot spritesheet effect from VfxCatalog at [code]world_pos[/code].
func spawn_effect(effect_key: String, world_pos: Vector2) -> AnimatedVfx:
	var fx := AnimatedVfx.new()
	fx.position = world_pos
	add_child(fx)
	if not fx.setup(effect_key):
		fx.queue_free()
		return null
	return fx
```

In `spawn_hit`, dopo la creazione dell'effetto particellare esistente: `spawn_effect("hit", world_pos)`. In `spawn_death`: `spawn_effect("death", world_pos)`.

- [ ] **Step 4: full unit suite -> zero regressioni. Step 5: commit** `feat(vfx): sprite effects wired into hit/death spawns`.

### Task 4: estrarre CombatFeedback da main.gd (obbligo ratifica #599) + slash/status wiring

**Files:**

- Create: `scripts/main_combat_feedback.gd`
- Modify: `scripts/main.gd` (RIMUOVERE i corpi di `_on_unit_damaged`/`_on_unit_died` e il blocco sfx in `_on_action_resolved`, delegare al controller: il file DEVE scendere sotto 1120 righe)
- Test: `tests/unit/test_combat_feedback.gd`

- [ ] **Step 1:** leggere lo stato corrente di `main.gd` (post-#599: handler a ~riga 524) e di `scripts/main_audio.gd` (pattern `MainAudio.install(host)` -- stesso stile).
- [ ] **Step 2: test fallente** (policy pura, senza Main):

```gdscript
extends GutTest


func test_feedback_for_lethal_hit_is_death_only() -> void:
	var fb := CombatFeedback.plan_for_damage(3, 0)
	assert_eq(fb, {"sfx": "death_skip", "vfx": "hit"})


func test_feedback_for_survivor_hit() -> void:
	var fb := CombatFeedback.plan_for_damage(3, 5)
	assert_eq(fb, {"sfx": "hit", "vfx": "hit"})


func test_action_event_status_gets_smoke() -> void:
	var e := {"result": "hit", "status_applies": [{"id": "panic"}]}
	assert_eq(CombatFeedback.vfx_key_for_action_event(e), "status")
	assert_eq(CombatFeedback.vfx_key_for_action_event({"result": "miss"}), "")
```

- [ ] **Step 3: implementare** `scripts/main_combat_feedback.gd`: `class_name CombatFeedback extends RefCounted` con (a) le funzioni-policy statiche del test (la semantica lethal replica il fix `hp_after > 0` di #599: sfx "death_skip" = non suonare hit, il death arriva dal segnale died); (b) un metodo `static func install(host) -> void` che connette gli handler spostati da main.gd (stesso pattern di `MainAudio.install`); (c) `vfx_key_for_action_event` che ritorna "status" se `status_applies` non vuoto, altrimenti "". Gli handler spostati chiamano `host.vfx_spawner` / `host.sfx_spawner` esattamente come oggi + `spawn_effect("slash", ...)` sull'attacco dell'attore quando `result` e' un esito d'attacco con `position_to` presente.
- [ ] **Step 4:** `wc -l scripts/main.gd` -> DEVE essere < 1120 (headroom recuperato). gdlint verde.
- [ ] **Step 5:** full unit suite -> zero regressioni (attenzione ai ~22 test che istanziano Main.tscn). **Step 6: commit** `refactor(main): extract combat feedback controller -- audio+vfx single point`.

### Task 5: smoke visivo + PRD overlay + PR

- [ ] **Step 1:** smoke manuale combat (stesso residuo-pattern di #599: se non fattibile in sessione, dichiararlo nel PR): hit spark su danno, slash su attacco, dissolve su morte, smoke su status.
- [ ] **Step 2:** aggiornare `docs/godot-v2/PRD-BUILD-STATUS-GODOT-V2.md` (riga VFX combat).
- [ ] **Step 3:** gdformat + gdlint + full GUT; push `feat/vfx-combat`; PR Godot-v2 con gate standard (@codex review se attivo, triage P1); merge = owner.

---

## Fuori scope (piani successivi)

- Telegraph marker sprite (oggi overlay celle via `CombatEmitter.overlay_requested`) -- valutare al polish.
- Status effect PERSISTENTI sull'unita' (icona/loop finche' lo status dura) -- questa slice fa il puff one-shot all'applicazione.
- Effetti elementali per-mossa (Fire/Water/Thunder/Acid Pimen gia' in staging) -- si agganciano a `spawn_effect` quando le mosse avranno un tipo elementale esposto.
- Heal VFX (sheet 512x512, griglia da misurare) -- nessun evento heal wired in questa slice.
- CodeManu VFX Pack (CC-BY) -- riserva, non necessario per la slice.
