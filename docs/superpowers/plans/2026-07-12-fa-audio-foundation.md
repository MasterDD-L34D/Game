# F-A Audio Foundation -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Primo pilastro della slice F-A "vestita" (40-ROADMAP): sistema audio greenfield in Game-Godot-v2 -- bus layout, SFX combat organici e musica per-fase su Path A, con gli asset license-verificati dello staging Fase 2.

**Architecture:** Nessun autoload esiste nel progetto (verificato: `project.godot` 45 righe, zero `[autoload]`): si segue il pattern repo esistente -- nodi figli posseduti da `Main` (mirror di `VfxSpawner`, `scripts/ui/vfx_spawner.gd`, istanziato in `main.gd:179`). Tre unita': `SfxCatalog` (mapping evento->stream, RefCounted testabile headless), `SfxSpawner` (one-shot AudioStreamPlayer pool, figlio di Main), `AudioDirector` (musica per-fase con crossfade, figlio di Main). Hook combat: `_on_unit_damaged`/`_on_unit_died` (`main.gd:512-525`) + segnale `action_resolved` (`round_orchestrator.gd:16`).

**Tech Stack:** Godot 4.6 (GDScript, tabs, gdlint/gdformat CI), GUT (`tests/unit/`, `extends GutTest`, CI: `godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/unit -gexit -glog=2`). Asset: OGG (musica), WAV/OGG/MP3 (SFX) da `C:\dev\_evo-assets-staging\` (licenze verificate, `docs/reports/2026-07-12-asset-staging-provenance.md` nel repo Game).

---

## Vincoli sessione (Game-Godot-v2, self-governed)

- Lavorare in un worktree proprio di Game-Godot-v2 (`git -C C:\dev\Game-Godot-v2 worktree add C:\dev\_godot-wt-audio origin/main` -> branch `feat/audio-foundation`), MAI checkout nel clone condiviso.
- Commit: Conventional Commits + trailer ADR-0011 (`Coding-Agent: <model-id>` + `Trace-Id:` uuidv7, ricetta nel piano Fase 1 `docs/superpowers/plans/2026-07-10-gdd-refresh-phase1.md` del repo Game).
- Lint: `gdformat` + `gdlint` girano in CI su tutti i `.gd` non-addons (config `gdlintrc`).
- Regola repo: aggiornare `docs/godot-v2/PRD-BUILD-STATUS-GODOT-V2.md` NELLO STESSO PR che shippa il sistema (Task 7).
- Attribution: SCP-x6x (Kevin MacLeod, CC-BY 4.0) richiede credit -- Task 0 crea PROVENANCE.md; la stringa esatta e' nel report provenance del repo Game.

### Mappa suoni scelta (owner-approved staging, file ESATTI)

| Evento                          | File sorgente (staging)                                                      | Classe |
| ------------------------------- | ---------------------------------------------------------------------------- | ------ |
| hit (danno)                     | `sfx-combat/sonniss-picks/Smash_Gore_Juicy_Smash_07.wav`                     | combat |
| crit                            | `sfx-combat/sonniss-picks/Attack_Gore_Flesh_Rip_01.wav`                      | combat |
| miss/whoosh                     | `evo-tactics-refs/.../skiv-audio-kit/whoosh-impact/Just_Whoosh_086.wav`      | combat |
| death                           | `sfx-combat/sonniss-picks/PM_BB_DESIGNED_CINEMATIC_TEXTURE_FLESH_GUSH_1.wav` | combat |
| status_apply                    | `80-CC0-creature-SFX.zip :: burble_01.ogg`                                   | combat |
| ui_click                        | `sfx-ui/UI_SFX_Set.zip :: click1.wav`                                        | ui     |
| ui_confirm                      | `sfx-ui/UI_SFX_Set.zip :: click3.wav`                                        | ui     |
| musica lobby/menu               | `music/dark-sci-fi-ogg.zip :: ogg/title.ogg`                                 | music  |
| musica planning/world_setup     | `ogg/airy.ogg`                                                               | music  |
| musica scenario_brief           | `ogg/sector.ogg`                                                             | music  |
| musica combat                   | `ogg/pulse.ogg`                                                              | music  |
| musica combat critico (riserva) | `ogg/urgent.ogg`                                                             | music  |
| debrief vittoria                | `ogg/victory.ogg`                                                            | music  |
| debrief sconfitta               | `music/SCP-x6x.mp3` (CC-BY, ATTRIBUTION)                                     | music  |

---

### Task 0: staging -> assets/audio (prep, nessun codice)

**Files:**

- Create: `assets/audio/music/` (7 ogg + 1 mp3), `assets/audio/sfx/combat/` (5 file), `assets/audio/sfx/ui/` (2 wav)
- Create: `assets/audio/PROVENANCE.md`

- [ ] **Step 1: estrarre e copiare i file** (bash, dal worktree Godot):

```bash
STG=/c/dev/_evo-assets-staging
REFS="/c/Users/VGit/Documents/evo-tactics-refs/references/sound-fx"
WT=/c/dev/_godot-wt-audio
mkdir -p "$WT/assets/audio/music" "$WT/assets/audio/sfx/combat" "$WT/assets/audio/sfx/ui"
cd /tmp && unzip -o "$STG/music/dark-sci-fi-ogg.zip" 'ogg/*.ogg' -d dsf \
  && cp dsf/ogg/{title,airy,sector,pulse,urgent,victory}.ogg "$WT/assets/audio/music/"
cp "$STG/music/SCP-x6x.mp3" "$WT/assets/audio/music/defeat_scp_x6x.mp3"
cp "$STG/sfx-combat/sonniss-picks/Smash_Gore_Juicy_Smash_07.wav" "$WT/assets/audio/sfx/combat/hit_gore_smash.wav"
cp "$STG/sfx-combat/sonniss-picks/Attack_Gore_Flesh_Rip_01.wav" "$WT/assets/audio/sfx/combat/crit_flesh_rip.wav"
cp "$STG/sfx-combat/sonniss-picks/PM_BB_DESIGNED_CINEMATIC_TEXTURE_FLESH_GUSH_1.wav" "$WT/assets/audio/sfx/combat/death_flesh_gush.wav"
cp "$REFS/skiv-audio-kit/whoosh-impact/Just_Whoosh_086.wav" "$WT/assets/audio/sfx/combat/miss_whoosh.wav"
unzip -o "$STG/sfx-combat/80-CC0-creature-SFX.zip" '*burble_01.ogg' -d creature \
  && find creature -name 'burble_01.ogg' -exec cp {} "$WT/assets/audio/sfx/combat/status_burble.ogg" \;
unzip -o "$STG/sfx-ui/UI_SFX_Set.zip" click1.wav click3.wav -d uisfx \
  && cp uisfx/click1.wav "$WT/assets/audio/sfx/ui/ui_click.wav" \
  && cp uisfx/click3.wav "$WT/assets/audio/sfx/ui/ui_confirm.wav"
```

- [ ] **Step 2: verificare** `find "$WT/assets/audio" -type f | wc -l` -> 14 file (7 music + 5 combat + 2 ui). Se un nome interno dello zip differisce, correggere dal listing (`unzip -l`), NON saltare il file.

- [ ] **Step 3: scrivere `assets/audio/PROVENANCE.md`** (pattern repo: ogni dir asset ha PROVENANCE):

```markdown
# assets/audio -- provenance

Fonte: staging Fase 2 studio-track (licenze verificate al fetch 2026-07-12,
evidenza: repo Game docs/reports/2026-07-12-asset-staging-provenance.md).

| File                                                                    | Origine                       | Autore        | Licenza                                          |
| ----------------------------------------------------------------------- | ----------------------------- | ------------- | ------------------------------------------------ |
| music/title,airy,sector,pulse,urgent,victory (.ogg)                     | OGA dark-sci-fi-audio-pack    | SRG774        | CC0                                              |
| music/defeat_scp_x6x.mp3                                                | incompetech "SCP-x6x (Hopes)" | Kevin MacLeod | CC-BY 4.0 -- CREDIT OBBLIGATORIO                 |
| sfx/combat/hit_gore_smash.wav, crit_flesh_rip.wav, death_flesh_gush.wav | Sonniss GDC (pool locale)     | vari          | Sonniss royalty-free perpetual (eccezione owner) |
| sfx/combat/miss_whoosh.wav                                              | Sonniss GDC (skiv-audio-kit)  | vari          | Sonniss royalty-free perpetual                   |
| sfx/combat/status_burble.ogg                                            | OGA 80-CC0-creature-SFX       | rubberduck    | CC0                                              |
| sfx/ui/ui_click.wav, ui_confirm.wav                                     | OGA 51-UI-sound-effects       | Kenney        | CC0                                              |

Attribution string CC-BY (da includere nei credits di gioco):
"SCP-x6x" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```

- [ ] **Step 4: aprire il progetto headless una volta per generare gli `.import`**:

```bash
cd "$WT" && godot --headless --quit-after 2 .
git status --short assets/audio | head   # attesi .import sidecar per ogni file
```

- [ ] **Step 5: commit** `git add assets/audio && git commit -m "feat(audio): import staged music + sfx with provenance"` (+ trailer ADR-0011).

### Task 1: bus layout (Master/Music/SFX)

**Files:**

- Create: `default_bus_layout.tres` (root del progetto -- path default Godot)
- Modify: `project.godot` (nessuna riga necessaria: Godot carica `res://default_bus_layout.tres` di default)

- [ ] **Step 1: creare `default_bus_layout.tres`**:

```
[gd_resource type="AudioBusLayout" format=3]

[resource]
bus/1/name = &"Music"
bus/1/solo = false
bus/1/mute = false
bus/1/bypass_fx = false
bus/1/volume_db = 0.0
bus/1/send = &"Master"
bus/2/name = &"SFX"
bus/2/solo = false
bus/2/mute = false
bus/2/bypass_fx = false
bus/2/volume_db = 0.0
bus/2/send = &"Master"
```

- [ ] **Step 2: test** `tests/unit/test_audio_buses.gd`:

```gdscript
extends GutTest


func test_bus_layout_has_music_and_sfx() -> void:
	var layout: AudioBusLayout = load("res://default_bus_layout.tres")
	assert_not_null(layout, "default_bus_layout.tres must exist")
	# AudioServer applies the layout at startup in a normal run; in headless
	# test we assert the resource content via a temporary apply.
	AudioServer.set_bus_layout(layout)
	assert_eq(AudioServer.get_bus_index("Music"), 1)
	assert_eq(AudioServer.get_bus_index("SFX"), 2)
```

- [ ] **Step 3: run** `godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/unit -gselect=test_audio_buses -gexit -glog=2` -> PASS.
- [ ] **Step 4: commit** `feat(audio): master/music/sfx bus layout`.

### Task 2: SfxCatalog (mapping evento -> stream)

**Files:**

- Create: `scripts/audio/sfx_catalog.gd`
- Test: `tests/unit/test_sfx_catalog.gd`

- [ ] **Step 1: test fallente** `tests/unit/test_sfx_catalog.gd`:

```gdscript
extends GutTest


func test_known_events_resolve_to_streams() -> void:
	for key in ["hit", "crit", "miss", "death", "status_apply", "ui_click", "ui_confirm"]:
		var stream: AudioStream = SfxCatalog.stream_for(key)
		assert_not_null(stream, "missing stream for event '%s'" % key)


func test_unknown_event_returns_null_without_error() -> void:
	assert_null(SfxCatalog.stream_for("nonexistent_event"))


func test_result_string_maps_to_sfx_key() -> void:
	assert_eq(SfxCatalog.key_for_result("miss"), "miss")
	assert_eq(SfxCatalog.key_for_result("moved"), "")
	assert_eq(SfxCatalog.key_for_result("skipped_stunned"), "")
```

- [ ] **Step 2: run** con `-gselect=test_sfx_catalog` -> FAIL (`SfxCatalog` not declared).
- [ ] **Step 3: implementare** `scripts/audio/sfx_catalog.gd`:

```gdscript
class_name SfxCatalog
extends RefCounted
## Static event->AudioStream catalog. Pure mapping, no playback: headless-testable.

const _PATHS := {
	"hit": "res://assets/audio/sfx/combat/hit_gore_smash.wav",
	"crit": "res://assets/audio/sfx/combat/crit_flesh_rip.wav",
	"miss": "res://assets/audio/sfx/combat/miss_whoosh.wav",
	"death": "res://assets/audio/sfx/combat/death_flesh_gush.wav",
	"status_apply": "res://assets/audio/sfx/combat/status_burble.ogg",
	"ui_click": "res://assets/audio/sfx/ui/ui_click.wav",
	"ui_confirm": "res://assets/audio/sfx/ui/ui_confirm.wav",
}

## combat `action_resolved` result strings that carry a dedicated sound.
## Everything else (moved/defending/parry_armed/trait_used/turn_ended/...)
## stays silent by design in this slice.
const _RESULT_TO_KEY := {"miss": "miss"}


static func stream_for(event_key: String) -> AudioStream:
	if not _PATHS.has(event_key):
		return null
	return load(_PATHS[event_key]) as AudioStream


static func key_for_result(result: String) -> String:
	return _RESULT_TO_KEY.get(result, "")
```

- [ ] **Step 4: run** -> PASS. **Step 5: commit** `feat(audio): sfx catalog event->stream mapping`.

### Task 3: SfxSpawner (one-shot player pool, mirror di VfxSpawner)

**Files:**

- Create: `scripts/audio/sfx_spawner.gd`
- Test: `tests/unit/test_sfx_spawner.gd`

- [ ] **Step 1: test fallente** `tests/unit/test_sfx_spawner.gd`:

```gdscript
extends GutTest


func _make_spawner() -> SfxSpawner:
	var s := SfxSpawner.new()
	add_child_autofree(s)
	return s


func test_play_event_creates_player_on_sfx_bus() -> void:
	var s := _make_spawner()
	var player := s.play_event("hit")
	assert_not_null(player)
	assert_eq(player.bus, &"SFX")
	assert_true(player.playing)


func test_unknown_event_is_noop() -> void:
	var s := _make_spawner()
	assert_null(s.play_event("nonexistent_event"))
	assert_eq(s.get_child_count(), 0)


func test_players_are_reaped_on_finish() -> void:
	var s := _make_spawner()
	var player := s.play_event("ui_click")
	player.stop()
	player.finished.emit()
	await wait_frames(2)
	assert_eq(s.get_child_count(), 0)
```

- [ ] **Step 2: run** `-gselect=test_sfx_spawner` -> FAIL.
- [ ] **Step 3: implementare** `scripts/audio/sfx_spawner.gd`:

```gdscript
class_name SfxSpawner
extends Node
## One-shot SFX playback owned by Main (same ownership pattern as VfxSpawner).
## Non-positional first slice: combat readability > spatialization (P1).

const MAX_CONCURRENT := 8


func play_event(event_key: String) -> AudioStreamPlayer:
	var stream := SfxCatalog.stream_for(event_key)
	if stream == null:
		return null
	if get_child_count() >= MAX_CONCURRENT:
		var oldest := get_child(0)
		oldest.queue_free()
	var player := AudioStreamPlayer.new()
	player.stream = stream
	player.bus = &"SFX"
	add_child(player)
	player.finished.connect(player.queue_free)
	player.play()
	return player
```

- [ ] **Step 4: run** -> PASS. **Step 5: commit** `feat(audio): sfx spawner one-shot pool`.

### Task 4: wiring combat (main.gd)

**Files:**

- Modify: `scripts/main.gd` (membro + istanza vicino a `vfx_spawner` `main.gd:179`; hook `_on_unit_damaged`/`_on_unit_died` `main.gd:512-525`; `_on_action_resolved` `main.gd:796`)
- Test: `tests/unit/test_sfx_combat_wiring.gd`

- [ ] **Step 1: test fallente** (testa la POLICY di mapping evento-combat -> chiave sfx, senza istanziare Main):

```gdscript
extends GutTest


func test_action_event_to_sfx_key_policy() -> void:
	assert_eq(SfxCatalog.key_for_action_event({"result": "miss", "is_kill": false, "damage_dealt": 0}), "miss")
	assert_eq(SfxCatalog.key_for_action_event({"result": "hit", "is_kill": false, "damage_dealt": 4}), "")
	# hit/death suonano gia' via _on_unit_damaged/_on_unit_died: niente doppio trigger.
	assert_eq(SfxCatalog.key_for_action_event({"result": "hit", "is_kill": true, "damage_dealt": 9}), "")
	assert_eq(
		SfxCatalog.key_for_action_event(
			{"result": "hit", "is_kill": false, "damage_dealt": 2, "status_applies": [{"id": "panic"}]}
		),
		"status_apply"
	)
```

- [ ] **Step 2: estendere `scripts/audio/sfx_catalog.gd`** (aggiungere in fondo):

```gdscript
## Maps a RoundOrchestrator `action_resolved` event to at most ONE sfx key.
## hit/death intentionally excluded: they are driven by the Unit signals
## (_on_unit_damaged/_on_unit_died) to stay in sync with the VFX.
static func key_for_action_event(event: Dictionary) -> String:
	var status: Array = event.get("status_applies", [])
	if not status.is_empty():
		return "status_apply"
	return key_for_result(String(event.get("result", "")))
```

- [ ] **Step 3: run test** -> PASS.
- [ ] **Step 4: wiring in `scripts/main.gd`** -- (a) membro accanto a `vfx_spawner` e istanza dopo `main.gd:179-180`:

```gdscript
var sfx_spawner: SfxSpawner = null
# in _ready(), accanto alla creazione di vfx_spawner:
sfx_spawner = SfxSpawner.new()
add_child(sfx_spawner)
```

(b) in `_on_unit_damaged` (dopo la riga `vfx_spawner.spawn_hit(...)`):

```gdscript
	if sfx_spawner != null:
		sfx_spawner.play_event("hit")
```

(c) in `_on_unit_died` (dopo `vfx_spawner.spawn_death(...)`):

```gdscript
	if sfx_spawner != null:
		sfx_spawner.play_event("death")
```

(d) in `_on_action_resolved` (`main.gd:796`, in testa alla funzione):

```gdscript
	if sfx_spawner != null:
		var sfx_key := SfxCatalog.key_for_action_event(event)
		if sfx_key != "":
			sfx_spawner.play_event(sfx_key)
```

- [ ] **Step 5: full unit suite** `godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/unit -gexit -glog=2` -> zero regressioni. **Step 6: commit** `feat(audio): combat sfx wiring -- hit/death/miss/status`.

### Task 5: AudioDirector (musica per-fase)

**Files:**

- Create: `scripts/audio/audio_director.gd`
- Test: `tests/unit/test_audio_director.gd`

- [ ] **Step 1: test fallente**:

```gdscript
extends GutTest


func _make_director() -> AudioDirector:
	var d := AudioDirector.new()
	add_child_autofree(d)
	return d


func test_phase_to_track_mapping() -> void:
	assert_eq(AudioDirector.track_for_phase("lobby"), "res://assets/audio/music/title.ogg")
	assert_eq(AudioDirector.track_for_phase("world_setup"), "res://assets/audio/music/airy.ogg")
	assert_eq(AudioDirector.track_for_phase("scenario_brief"), "res://assets/audio/music/sector.ogg")
	assert_eq(AudioDirector.track_for_phase("combat"), "res://assets/audio/music/pulse.ogg")
	assert_eq(AudioDirector.track_for_phase("unknown_phase"), "")


func test_play_phase_switches_stream_and_loops_on_music_bus() -> void:
	var d := _make_director()
	d.play_phase("combat")
	assert_eq(d.player.bus, &"Music")
	assert_true(d.player.playing)
	var before: AudioStream = d.player.stream
	d.play_phase("combat")
	assert_eq(d.player.stream, before, "same phase must not restart the track")


func test_outcome_tracks() -> void:
	assert_eq(AudioDirector.track_for_outcome(true), "res://assets/audio/music/victory.ogg")
	assert_eq(AudioDirector.track_for_outcome(false), "res://assets/audio/music/defeat_scp_x6x.mp3")
```

- [ ] **Step 2: run** -> FAIL. **Step 3: implementare** `scripts/audio/audio_director.gd`:

```gdscript
class_name AudioDirector
extends Node
## Per-phase music for the TV/host surface. Owned by Main (no autoloads in repo).

const _PHASE_TRACKS := {
	"lobby": "res://assets/audio/music/title.ogg",
	"onboarding": "res://assets/audio/music/title.ogg",
	"character_creation": "res://assets/audio/music/title.ogg",
	"form_pulse": "res://assets/audio/music/airy.ogg",
	"world_seed_reveal": "res://assets/audio/music/sector.ogg",
	"world_setup": "res://assets/audio/music/airy.ogg",
	"scenario_brief": "res://assets/audio/music/sector.ogg",
	"combat": "res://assets/audio/music/pulse.ogg",
}

var player: AudioStreamPlayer = null
var _current_track := ""


func _ready() -> void:
	player = AudioStreamPlayer.new()
	player.bus = &"Music"
	add_child(player)
	player.finished.connect(_on_finished)


static func track_for_phase(phase: String) -> String:
	return _PHASE_TRACKS.get(phase, "")


static func track_for_outcome(victory: bool) -> String:
	if victory:
		return "res://assets/audio/music/victory.ogg"
	return "res://assets/audio/music/defeat_scp_x6x.mp3"


func play_phase(phase: String) -> void:
	_play_track(track_for_phase(phase))


func play_outcome(victory: bool) -> void:
	_play_track(track_for_outcome(victory))


func _play_track(path: String) -> void:
	if path == "" or path == _current_track:
		return
	var stream := load(path) as AudioStream
	if stream == null:
		return
	_current_track = path
	player.stream = stream
	player.play()


func _on_finished() -> void:
	# loop manually: works for both OGG and MP3 without touching import flags.
	if _current_track != "":
		player.play()
```

- [ ] **Step 4: run** -> PASS.
- [ ] **Step 5: wiring fase in `scripts/main.gd`**: istanza accanto a `sfx_spawner` (`audio_director = AudioDirector.new(); add_child(audio_director)`) e chiamata `audio_director.play_phase(phase)` nel punto unico dove `main.gd` fa lo switch di fase/vista (lo switch e' guidato dagli eventi WS `phase`; individuare la funzione che monta le viste -- i preload sono a `main.gd:314/329/344/385/421` -- e aggiungere la chiamata con la stringa fase corrente). Debrief: in `scripts/main_debrief.gd` / `debrief_view.gd`, dove arriva l'esito, chiamare `audio_director.play_outcome(victory)` via host.
- [ ] **Step 6: full unit suite -> zero regressioni. Commit** `feat(audio): per-phase music director + debrief outcome`.

### Task 6: smoke manuale Path A (exit-gate parziale F-A)

- [ ] **Step 1:** avviare host + 1 phone (procedura standard repo, backend Game attivo), percorrere Path A: lobby -> character_creation -> form_pulse -> world_seed -> scenario_brief -> combat (3+ azioni: hit, miss, kill) -> debrief.
- [ ] **Step 2:** verificare a orecchio: musica cambia per fase senza doppioni; hit/miss/death/status suonano; vittoria/sconfitta suona al debrief; nessun errore console audio.
- [ ] **Step 3:** annotare l'esito in `docs/godot-v2/qa/2026-07-XX-audio-foundation-smoke.md` (data reale, screenshot/note).

### Task 7: PRD overlay + gate finale + PR

- [ ] **Step 1:** aggiornare `docs/godot-v2/PRD-BUILD-STATUS-GODOT-V2.md`: nuova riga sistema Audio (verde, "foundation: bus + combat SFX + per-phase music, assets provenance-tracked").
- [ ] **Step 2:** `gdformat scripts/audio/*.gd tests/unit/test_sfx*.gd tests/unit/test_audio*.gd && gdlint scripts/audio tests/unit`.
- [ ] **Step 3:** full unit suite verde; push `feat/audio-foundation`; PR su Game-Godot-v2 con gate standard del repo (CI GUT + review; se Codex attivo sul repo, `@codex review` + triage P1).
- [ ] **Step 4:** merge = owner o autorizzazione esplicita.

---

## Fuori scope di questo piano (piani F-A successivi)

- VFX combat da pack Pimen/CodeManu (telegraph/status visivi) -- piano dedicato.
- Ambience per-bioma (badlands) + UI click wiring diffuso -- piano polish.
- Audio lato phone (companion) -- decisione owner (TV-first).
- Slider volumi in settings UI (i bus esistono gia': solo UI mancante).
- Indicatori visivi deaf/HoH (45-ACCESSIBILITY) -- si agganciano agli stessi hook.
