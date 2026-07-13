# F-A Polish + Content-Lock Badlands -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Terzo e ultimo pilastro della slice F-A "vestita" (40-ROADMAP): content-lock del Path A sul bioma badlands (1 bioma + 2 specie + 1 encounter reali al posto dei fallback tutorial), polish UI mirato sui gap piu' visibili, e assorbimento dei follow-up tracciati di #599/#601 (WAV->OGG per il peso web, smoke visivo VFX, verifica crackling su run nativo). Exit-gate F-A: slice giocabile end-to-end VESTITA.

**Architecture:** Il flusso live Path A oggi gira con `world.biome_id` VUOTO end-to-end (misurato, sotto): niente hero bioma, combat sempre su fixture `TUTORIAL_01_UNITS` 8x6, pool specie phone mai fetchato -> fallback 4 specie. Il lock si fa alla SORGENTE: un helper statico `SliceWorldSeed` costruisce il `WorldSetupState` iniziale (badlands + `enc_sabotage_01` + stamp `graph_routed`) e sostituisce il `WorldSetupState.new()` del boot lobby con uno swap di espressione a zero righe nette (main.gd e' a 1117/1120 gdlint: NON si ri-bumpa). Le 2 specie della slice si lockano su phone (`DEFAULT_SPECIES_OPTIONS`) e su TV (fixture PG + mapping sprite in `unit.gd`). Audio e polish sono task indipendenti sullo stesso branch.

**Tech Stack:** come #599/#601 (Godot 4.6, GUT `tests/unit`, gdformat/gdlint CI, trailer ADR-0011, PRD overlay stesso PR). In piu': ffmpeg (WinGet, verificato 8.1.1 su Ryzen) per WAV->OGG.

---

## Ground-truth misurato (origin/main Game-Godot-v2, 2026-07-13)

Stato reale del flusso live Path A (letture da `git show origin/main:<path>`, non dal working tree):

- **Biome vuoto end-to-end**: il boot web crea `_initial_world_state = WorldSetupState.new()` (`scripts/main.gd:157`, world = `{}`); NESSUNO scrive `world.biome_id` nel percorso live (grep esteso su scripts/ + backend Game: il backend broadcasta `phase_change` senza dict `world`; Godot `build_confirm_world_request` non manda `biome_id`). Risultato: "Bioma: --" nelle schermate world, `_build_encounter_runtime()` ritorna null (`main.gd:305-306`), combat = tutorial fallback.
- **Roster routed gia' pronto ma mai ingaggiato dal boot**: `MainEncounterRoster.build_combat_plan` (`scripts/main_encounter_roster.gd:136-159`) ingaggia il ramo routed SOLO se `scenario.graph_routed == true`; ogni fallback (encounter mancante, wave-0 vuota) torna al tutorial in modo sicuro.
- **enc_sabotage_01** = UNICO encounter badlands nel catalogo (`data/encounters/encounters.json`): "Detonazione nel Cuore", schema waves, grid 10x10, wave-1 = 2x `gulogluteus_scutiger` base + wave-2 = 1 elite, `player_spawn` [[0,0],[0,1],[1,0],[1,1]]. NB: l'objective `sabotage` (target_zone, time_limit) NON e' implementato lato TV (grep "sabotage" su scripts/ = zero): l'encounter gioca come waves + eliminazione. Accettato per la slice (fuori scope, sotto).
- **Specie**: pool companion badlands (`Game data/core/companion/skiv_archetype_pool.yaml`) = esattamente `gulogluteus_scutiger` (tank_shield, T2 Playable) + `elastovaranus_hydrus` (bruiser_melee, T2 Playable). Entrambe hanno GIA': sprite combat (`resources/sprite_frames/{gulogluteus_scutiger,elastovaranus_hydrus}_combat.tres` + `assets/creatures/<id>/` con portrait e onmodel), entry in `data/species/species_catalog.json` (verificato: 15 id, entrambi presenti), display IT in Game `apps/play/src/speciesNames.js` ("Scudo Roccioso Prensile" / "Varano Idraulico Elastico").
- **Fixture TV**: `MainCombatSetup.TUTORIAL_01_UNITS` (`scripts/main_combat_setup.gd:18-45`) = PG `pg_skiv_alpha` (dune_stalker) + `pg_pulverator_alpha` (perfusuas_pedes). Gli id unit sono citati da ~28 file di test: NON si rinominano (si cambiano solo i campi species).
- **main.gd = 1117 righe** (ceiling gdlint 1120, `gdlintrc` max-file-lines; commento nel file: "the next main.gd addition must extract a controller"). Ogni modifica main.gd in questo piano e' same-line (zero righe nette).
- **Audio**: `assets/audio/sfx/combat/death_flesh_gush.wav` = 35.5MB (meta' del peso pck audio); hit 511KB / crit 679KB / miss 876KB. `SfxCatalog._PATHS` (`scripts/audio/sfx_catalog.gd:5-13`) referenzia i .wav. ffmpeg 8.1.1 presente su Ryzen (WinGet Links).
- **Polish (inventario per-schermata)**: la copertura theme cinzel e' larga; i gap visibili sono (1) label `DebugInfo/MarginContainer/Status` in `scenes/Main.tscn:27-45` -- unica control NON-themed del Path A, font default Godot, testo iniziale "Sprint N.1+N.5 -- tactical scene + ambition HUD", bottom-center in OGNI sessione; refs solo `Main.tscn` + `main.gd:119`; (2) label top-strip `HudView.tscn` (`AmbitionLabel`, `TelemetryLabel`, `AiProgressLabel`) senza `theme_type_variation` (solo `BondStatsLabel` usa `label_meta`); (3) `assets/ui/ferrospora/` (8 subdir art-pass) SENZA `PROVENANCE.md` top-level, a differenza di audio/vfx/tiles (ha solo README per-subdir).
- **Tileset**: badlands ha `biome_class: "arid"` (`data/biomes/biomes.json:109`) -> il ground `arid_ground` gia' hardcoded in Main.tscn E' coerente col bioma. Zero lavoro tileset.
- **Residui tracciati**: (a) WAV lunghi -> OGG (QA `docs/godot-v2/qa/2026-07-13-audio-foundation-smoke.md`, finding 2); (b) crackling da riverificare su run NATIVO a macchina scarica PRIMA di toccare codice (finding 1 -- se il nativo e' pulito, e' underrun AudioWorklet web); (c) smoke visivo VFX (residuo esplicito del body #601); (d) follow-up VFX non-blocker #601: cache SpriteFrames per-key, re-entrancy guard, pre-validate unknown-key.

## Decisione owner: le 2 specie della slice

**Proposta (default se non overridden in review): `gulogluteus_scutiger` + `elastovaranus_hydrus`.**

| Criterio          | gulogluteus + elastovaranus (proposta)                                                                                           | 2 dei 4 fallback attuali (alternativa)                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Coerenza bioma    | native badlands (pool companion = esattamente loro 2; endpoint `/api/companion/pool?biome_id=badlands` coerente by-construction) | dune_stalker=savana, perfusuas=caverna, anguis=atollo, umbra=foresta: nessuna e' badlands  |
| Asset "vestiti"   | sprite combat + portrait + onmodel GIA' shipped per entrambe                                                                     | dune_stalker renderizza come skiv riuso, perfusuas come pulverator riuso (no art dedicata) |
| Identita' tattica | tank_shield vs bruiser_melee (ruoli distinti dichiarati nel pool)                                                                | coppie senza contrasto di ruolo dichiarato                                                 |
| Dati canon        | entrambe in species_catalog.json + speciesNames.js + creature_bonds                                                              | idem (pari)                                                                                |
| Flavor encounter  | i predoni di enc_sabotage_01 SONO gulogluteus (clan rivali della stessa specie, tinta SISTEMA distingue)                         | enemy e PG specie scollegate                                                               |

Costo dell'alternativa: perdere coerenza bioma+pool+art. La proposta vince su 4 criteri su 5. L'owner ratifica (o override) nella review di questo PR; i task sotto assumono la proposta.

## Vincoli sessione (Game-Godot-v2, self-governed)

- Worktree proprio: `git -C C:\dev\Game-Godot-v2 worktree add -b feat/fa-polish-badlands C:\dev\_godot-wt-polish origin/main` (il `-b` crea il branch; MAI checkout nel clone condiviso).
- **Trailer ADR-0011 (OGNI commit)** -- genera il Trace-Id una volta per commit (ricetta completa nel piano Fase 1 `docs/superpowers/plans/2026-07-10-gdd-refresh-phase1.md` del repo Game):

```bash
TRACE=$(node -e "const b=Buffer.alloc(16);require('crypto').randomFillSync(b);const t=Date.now();b[0]=t/2**40;b[1]=t/2**32;b[2]=t/2**24;b[3]=t/2**16;b[4]=t/2**8;b[5]=t;b[6]=(b[6]&0x0f)|0x70;b[8]=(b[8]&0x3f)|0x80;const h=b.toString('hex');console.log(h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20))")
git commit -m "<subject>" -m "Coding-Agent: <model-id della sessione>" -m "Trace-Id: $TRACE"
```

- Lint: `gdformat` + `gdlint` su ogni .gd toccato; **main.gd resta a 1117 righe** (solo swap same-line, verifica `wc -l` dopo ogni edit).
- GUT full suite: `godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/unit -gexit -glog=2` (per-file: `-gselect=<test_file>`). Baseline attesa: 3888 test, 5 pending pre-esistenti, 0 failures.
- Regola repo: `docs/godot-v2/PRD-BUILD-STATUS-GODOT-V2.md` aggiornato NELLO STESSO PR (Task 7).
- ASCII-only nelle righe nuove; asset non-CC con PROVENANCE.md per-directory (decisione owner no-redistribute gia' registrata su #601).

---

### Task 1: SliceWorldSeed -- content-lock badlands alla sorgente

**Files:**

- Create: `scripts/session/slice_world_seed.gd`
- Modify: `scripts/main.gd:157` (SOLO swap di espressione same-line)
- Test: `tests/unit/test_slice_world_seed.gd`

- [ ] **Step 1: test fallente**:

```gdscript
extends GutTest


func test_seed_is_badlands_locked() -> void:
	var s: WorldSetupState = SliceWorldSeed.initial_state()
	assert_eq(s.get_biome_id(), "badlands")
	assert_eq(s.get_scenario_id(), "enc_sabotage_01")
	assert_eq(s.phase, WorldSetupState.PHASE_LOBBY)


func test_seed_scenario_is_graph_routed() -> void:
	var s: WorldSetupState = SliceWorldSeed.initial_state()
	assert_true(bool(s.scenario.get("graph_routed", false)))
	assert_true(MainEncounterRoster.is_graph_routed(s))


func test_seed_scenario_exists_in_encounter_catalog() -> void:
	var cat := EncounterCatalog.new()
	assert_true(cat.load_from_json_file("res://data/encounters/encounters.json"))
	assert_not_null(cat.get_encounter(SliceWorldSeed.SCENARIO_ID))


func test_seed_biome_exists_in_biome_catalog() -> void:
	var cat := BiomeCatalog.new()
	assert_true(cat.load_from_json_file("res://data/biomes/biomes.json"))
	assert_not_null(cat.get_biome(SliceWorldSeed.BIOME_ID))
```

- [ ] **Step 2: run** `-gselect=test_slice_world_seed` -> FAIL (SliceWorldSeed not declared). **Step 3: implementare** `scripts/session/slice_world_seed.gd`:

```gdscript
class_name SliceWorldSeed
extends RefCounted
## F-A content-lock (40-ROADMAP slice-first): Path A fisso su badlands.
## Unica authority del WorldSetupState iniziale della slice. I valori
## rispecchiano data/biomes/biomes.json ("badlands") e
## data/encounters/encounters.json ("enc_sabotage_01"): aggiornare QUI se
## quei file cambiano, mai inventare.

const BIOME_ID := "badlands"
const SCENARIO_ID := "enc_sabotage_01"


static func initial_state() -> WorldSetupState:
	return WorldSetupState.from_dict(
		{
			"world":
			{
				"biome_id": BIOME_ID,
				"biome_label_it": "Calanchi Ferromagnetici",
				"pressure": "medium",
				"hazards": ["ferrous_spike", "dust_storm", "scrap_bloom"],
			},
			"scenario":
			{
				"id": SCENARIO_ID,
				"label_it": "Detonazione nel Cuore",
				"brief_it":
				"Altipiani arrugginiti battuti da tempeste ferrose: i clan di recupero convergono su un nucleo sepolto. Tenete il campo prima che la tempesta chiuda il passo.",
				"graph_routed": true,
			},
		}
	)
```

Note vincolanti: (a) `custode` NON si seeda -- `CompanionResolver.resolve(custode, biome_id)` in `world_seed_reveal_view.gd` lo genera dal pool badlands (name_pool Gorra/Rost/..., closing "Ferro tiene."); (b) `graph_routed: true` e' lo stamp che `MainEncounterRoster.build_combat_plan` richiede per ingaggiare l'encounter reale -- e' il meccanismo esistente di MainRouteChoice, riusato; ogni fallback interno (encounter mancante, wave-0 vuota) degrada al tutorial senza crash; (c) `brief_it` NON promette il sabotaggio a obiettivo (non implementato TV-side): il testo resta sul flavor.

- [ ] **Step 4: swap same-line in main.gd** (riga 157, dentro il ramo `if boot_phase == PHASE_LOBBY`):

```gdscript
# PRIMA:
			_initial_world_state = WorldSetupState.new()
# DOPO (F-A content-lock -- slice badlands, vedi SliceWorldSeed):
			_initial_world_state = SliceWorldSeed.initial_state()
```

Il commento sopra la riga NON si aggiunge se costa una riga: in tal caso solo lo swap. Verifica: `wc -l scripts/main.gd` -> DEVE restare 1117.

- [ ] **Step 5: run test nuovo -> PASS; poi full suite** -> zero regressioni NUOVE. Attenzione ai ~22 test che istanziano Main.tscn: ora il boot lobby seeda badlands; se un test asserisce world vuoto al boot, aggiornarlo dichiarando il cambio nel commit body.
- [ ] **Step 6: commit** `feat(slice): content-lock Path A on badlands via SliceWorldSeed` (+ trailer ADR-0011).

### Task 2: verifica del ramo routed (enc_sabotage_01 in combat)

**Files:**

- Test: `tests/unit/test_slice_world_seed_combat_plan.gd` (nuovo)

Il ramo routed esiste ed e' testato (test_main_encounter_roster); qui si pinna che IL SEED della slice lo ingaggia davvero.

- [ ] **Step 1: test fallente** (fallisce solo se Task 1 incompleto -- e' il pin di integrazione):

```gdscript
extends GutTest

const MainScene := preload("res://scenes/Main.tscn")


func test_slice_seed_engages_routed_plan() -> void:
	# NB: niente add_child -- _ready monterebbe il combat consumando la wave-1
	# (take_initial_specs e' consumante); il plan si costruisce fuori dal tree.
	var host = MainScene.instantiate()
	host.set_boot_phase(WorldSetupState.PHASE_COMBAT, SliceWorldSeed.initial_state())
	var plan: Dictionary = MainEncounterRoster.build_combat_plan(host)
	host.free()
	assert_true(bool(plan.get("graph_routed", false)), "slice seed must engage the routed branch")
	assert_eq(plan.get("grid"), Vector2i(10, 10))
	var sistema_count := 0
	for spec in plan.get("roster", []):
		if String((spec as Dictionary).get("faction", "")) == "SISTEMA":
			sistema_count += 1
	assert_eq(sistema_count, 2, "wave-1 of enc_sabotage_01 fields 2 gulogluteus")
```

- [ ] **Step 2: run -> verificare** (se il mount combat diretto richiede setup extra, mimare il pattern di `tests/unit/test_main_encounter_roster.gd` esistente -- leggerlo PRIMA di adattare). **Step 3:** full suite -> zero regressioni. **Step 4: commit** `test(slice): pin routed combat plan from slice seed`.

### Task 3: lock delle 2 specie (phone + fixture TV + sprite mapping)

**Files:**

- Modify: `scripts/phone/phone_character_creation_view.gd:28-33` (DEFAULT_SPECIES_OPTIONS)
- Modify: `scripts/main_combat_setup.gd:18-45` (TUTORIAL_01_UNITS, SOLO campi species dei 2 PG)
- Modify: `scripts/unit.gd:21-44` (SPRITE_FRAME_BY_KEY + SPECIES_ID_TO_KEY)
- Test: aggiornamenti a `tests/unit/test_phone_character_creation_view.gd`, `tests/unit/test_unit.gd`, `tests/unit/test_main_combat_setup_species_catalog.gd`

- [ ] **Step 1: ground-truth blast radius** (PRIMA di editare):

```bash
git grep -n "dune_stalker\|perfusuas_pedes" tests/unit/test_main_combat_setup_species_catalog.gd tests/unit/test_unit.gd tests/unit/test_phone_character_creation_view.gd
```

I 28 file che citano `pg_skiv_alpha`/`pg_pulverator_alpha` NON si toccano: gli id unit restano; cambiano SOLO i campi species dei 2 PG. Test che asseriscono `dune_stalker` su fixture PROPRIE (non TUTORIAL_01_UNITS) non vanno toccati.

- [ ] **Step 2: phone options** in `phone_character_creation_view.gd`:

```gdscript
# F-A content-lock: slice badlands, 2 specie (piano 2026-07-13-fa-polish-badlands).
const DEFAULT_SPECIES_OPTIONS: Array[Dictionary] = [
	{"id": "gulogluteus_scutiger", "label": "Scudo Roccioso Prensile (badlands)"},
	{"id": "elastovaranus_hydrus", "label": "Varano Idraulico Elastico (badlands)"},
]
```

- [ ] **Step 3: fixture TV** in `main_combat_setup.gd` -- i 2 PG diventano (id/speed/hp/cell/traits INVARIATI, cambiano species/species_id/lifecycle commento):

```gdscript
	{
		"id": "pg_skiv_alpha",
		"speed": 60,
		"species": "Scutiger \u03b1",
		"species_id": "gulogluteus_scutiger",
		"hp": 24,
		"faction": "PG",
		"cell": Vector2i(1, 4),
		"traits": ["ancestor_comunicazione_cinesica_cm_01"],
		"lifecycle_phase": "mature",
	},
	{
		"id": "pg_pulverator_alpha",
		"speed": 50,
		"species": "Hydrus \u03b1",
		"species_id": "elastovaranus_hydrus",
		"hp": 30,
		"faction": "PG",
		"cell": Vector2i(2, 4),
		"traits": ["ancestor_comunicazione_cinesica_cm_01"],
		"lifecycle_phase": "apex",
	},
```

NB encoding: le stringhe display esistenti usano il carattere greco alpha letterale ("Skiv alpha", legacy frozen); questo piano lo scrive come escape GDScript (backslash-u03b1) per restare ASCII -- a runtime la stringa e' identica; all'esecuzione va bene sia l'escape sia il letterale (coerenza col file). Aggiornare il commento 2026-05-15 sopra la const con la mappa nuova (gulogluteus T2 / elastovaranus T2). Stat INVARIATE by design: il bilanciamento e' authority del backend Game, non di questa slice.

- [ ] **Step 4: sprite mapping** in `unit.gd` -- aggiungere a `SPRITE_FRAME_BY_KEY`:

```gdscript
	"gulogluteus_scutiger": preload("res://resources/sprite_frames/gulogluteus_scutiger_combat.tres"),
	"elastovaranus_hydrus": preload("res://resources/sprite_frames/elastovaranus_hydrus_combat.tres"),
```

e a `SPECIES_ID_TO_KEY`:

```gdscript
	"gulogluteus_scutiger": "gulogluteus_scutiger",
	"elastovaranus_hydrus": "elastovaranus_hydrus",
```

Le entry esistenti (`dune_stalker`->skiv ecc.) RESTANO: servono agli encounter legacy non-slice.

- [ ] **Step 5: aggiornare i test** individuati allo Step 1: in `test_phone_character_creation_view.gd` il default-pool test si aspetta 2 entry (`gulogluteus_scutiger`, `elastovaranus_hydrus`) e il submit-test si aspetta `gulogluteus_scutiger` (index 0); in `test_main_combat_setup_species_catalog.gd` gli stub attesi diventano i 2 id nuovi; in `test_unit.gd` verificare che il contains-match legacy non collida (i nomi nuovi mappano via canonical id, precedenza gia' garantita da `_select_sprite_frames`).
- [ ] **Step 6:** leggere `MainCombatSetup.bootstrap_species_catalog()` e confermare che risolve i 2 id nuovi da `data/species/species_catalog.json` (entrambi presenti nel catalogo, verificato in ground-truth); se filtra per lista hardcoded, aggiornarla.
- [ ] **Step 7:** full suite -> zero failures. **Step 8: commit** `feat(slice): lock the two badlands species across phone and tv combat`.

### Task 4: WAV->OGG per il web export (residuo QA audio, finding 2)

**Files:**

- Modify: `assets/audio/sfx/combat/` (4 .wav -> 4 .ogg + .import rigenerati)
- Modify: `scripts/audio/sfx_catalog.gd:6-9` (4 path)
- Modify: `assets/audio/PROVENANCE.md` (nota conversione)

- [ ] **Step 1: convertire** (bash dal worktree Godot; ffmpeg 8.1.1 via WinGet gia' presente):

```bash
WT=/c/dev/_godot-wt-polish/assets/audio/sfx/combat
for f in hit_gore_smash crit_flesh_rip death_flesh_gush miss_whoosh; do
  ffmpeg -i "$WT/$f.wav" -c:a libvorbis -q:a 6 "$WT/$f.ogg" && rm "$WT/$f.wav" "$WT/$f.wav.import"
done
ls -la "$WT"   # attesi 4 .ogg; death_flesh_gush da 35.5MB a ~2-3MB
```

`status_burble.ogg` e i 2 ui .wav (16KB) restano invariati (peso irrilevante).

- [ ] **Step 2: aggiornare `SfxCatalog._PATHS`** (4 righe, estensione .wav -> .ogg):

```gdscript
	"hit": "res://assets/audio/sfx/combat/hit_gore_smash.ogg",
	"crit": "res://assets/audio/sfx/combat/crit_flesh_rip.ogg",
	"miss": "res://assets/audio/sfx/combat/miss_whoosh.ogg",
	"death": "res://assets/audio/sfx/combat/death_flesh_gush.ogg",
```

- [ ] **Step 3:** `godot --headless --quit-after 2 .` per rigenerare gli `.import`; `git status --short assets/audio` -> attesi 4 .ogg + 4 .ogg.import nuovi, 4 .wav + 4 .wav.import rimossi.
- [ ] **Step 4: PROVENANCE.md**: aggiungere in coda alla tabella esistente la riga di nota:

```markdown
Nota formato (2026-07-13, piano fa-polish-badlands): i 4 SFX combat Sonniss
sono stati transcodificati WAV -> OGG Vorbis q6 in-repo per il peso del web
export (death_flesh_gush: 35.5MB -> ~2.5MB). Licenza e provenienza invariate.
```

- [ ] **Step 5:** GUT `-gselect=test_sfx_catalog` + `-gselect=test_sfx_combat_wiring` -> PASS (i test caricano gli stream dai path del catalogo: se un path e' rotto falliscono). Full suite -> zero regressioni.
- [ ] **Step 6: commit** `feat(audio): transcode combat wavs to ogg for web export weight`.

### Task 5: polish UI mirato (i 3 gap piu' visibili)

**Files:**

- Modify: `scenes/Main.tscn:27-45` (label Status: theme + testo neutro)
- Modify: `scenes/HudView.tscn` (3 label top-strip: theme_type_variation)
- Create: `assets/ui/ferrospora/PROVENANCE.md`

- [ ] **Step 1: label Status** in `Main.tscn`: aggiungere in testa alla scena l'ext_resource del theme (stesso pattern delle altre scene ui, es. `LobbyView.tscn`; bump di `load_steps` +1):

```
[ext_resource type="Theme" path="res://resources/themes/cinzel.tres" id="theme_cinzel"]
```

e sul nodo `Status`:

```
[node name="Status" type="Label" parent="DebugInfo/MarginContainer"]
theme = ExtResource("theme_cinzel")
theme_type_variation = &"label_meta"
text = "Evo-Tactics -- avvio sessione..."
```

I nomi nodo (`DebugInfo`) NON si rinominano (referenziati da `main.gd:119`; rinominare = churn main.gd senza guadagno visibile). Il testo runtime resta gestito da main.gd (Lobby/combat/...): cambia solo il placeholder iniziale visibile al boot.

- [ ] **Step 2: HudView top-strip**: su `AmbitionLabel`, `TelemetryLabel`, `AiProgressLabel` aggiungere `theme_type_variation = &"label_meta"` (pattern identico al `BondStatsLabel` gia' presente nella stessa scena).
- [ ] **Step 3: PROVENANCE ferrospora**: creare `assets/ui/ferrospora/PROVENANCE.md` consolidando i README per-subdir ESISTENTI (leggerli tutti: `action_icons_v1`, `action_icons_v2`, `action_sigils_v4`, `action_dock_v2`, `dock_frame_v4`, `ct_medallions_v1`, `frames_v2`, `ui_frames_v1`). Schema tabella: `| Subdir | Fonte (verbatim dal README) | Wired in |`. Riga esempio gia' verificata (da `frames_v2/README.md`): fonte "ChatGPT Pro (IMG REf pack) + Ferrospora style-LoRA v1", wired UnitInfoPanel #489 / ForecastPanel. Intestazione obbligatoria: "AI-generated -- Steam AI-content disclosure at ship-time" (gia' dichiarata nei README). NON inventare fonti: solo trascrizione dai README.
- [ ] **Step 4:** GUT full (le scene .tscn toccate sono istanziate dai test Main/HudView: un errore di parse fallirebbe li'); gdlint/gdformat n/a per .tscn ma girano sui .gd invariati.
- [ ] **Step 5: commit** `feat(ui): dress status label + hud meta labels + ferrospora provenance`.

### Task 6 (OPZIONALE, se il budget sessione lo consente): follow-up VFX #601

**Files:**

- Modify: `scripts/vfx/animated_vfx.gd` (cache SpriteFrames per-key + re-entrancy guard)
- Modify: `scripts/ui/vfx_spawner.gd` (pre-validate unknown-key)
- Test: estendere `tests/unit/test_animated_vfx.gd` + `tests/unit/test_vfx_spawner_effects.gd`

- [ ] **Step 1: test fallenti** (aggiungere ai file esistenti):

```gdscript
func test_sprite_frames_cached_per_key() -> void:
	var a := AnimatedVfx.new()
	var b := AnimatedVfx.new()
	add_child_autofree(a)
	add_child_autofree(b)
	a.setup("hit")
	b.setup("hit")
	assert_true(a.sprite.sprite_frames == b.sprite.sprite_frames, "same key must share SpriteFrames")


func test_setup_twice_is_rejected() -> void:
	var fx := AnimatedVfx.new()
	add_child_autofree(fx)
	assert_true(fx.setup("hit"))
	assert_false(fx.setup("slash"), "re-entrant setup must be rejected")
```

```gdscript
func test_spawn_effect_unknown_key_allocates_no_child() -> void:
	var s := VfxSpawner.new()
	add_child_autofree(s)
	var before := s.get_child_count()
	assert_null(s.spawn_effect("nope", Vector2.ZERO))
	assert_eq(s.get_child_count(), before, "unknown key must not allocate a node")
```

- [ ] **Step 2: implementare** in `animated_vfx.gd`: dict statico `static var _frames_cache: Dictionary = {}` keyed per effect_key, costruito una sola volta (le AtlasTexture sono immutabili e condivisibili); guard `if sprite != null: return false` in testa a `setup()`. In `vfx_spawner.gd::spawn_effect`: `if VfxCatalog.entry_for(effect_key).is_empty(): return null` PRIMA di `AnimatedVfx.new()`.
- [ ] **Step 3:** run test nuovi -> PASS; full suite -> zero regressioni. **Step 4: commit** `perf(vfx): cache spriteframes per key + reject re-entrant setup + pre-validate keys`.

Se il task viene SALTATO: dichiararlo nel body PR (restano follow-up tracciati di #601, non regredisce nulla).

### Task 7: PRD overlay + smoke owner + PR

**Files:**

- Modify: `docs/godot-v2/PRD-BUILD-STATUS-GODOT-V2.md` (righe Audio, VFX + riga slice F-A)
- Create: `docs/godot-v2/qa/2026-07-13-fa-polish-smoke.md` (esiti smoke owner, pattern QA audio)

- [ ] **Step 1: smoke web build** (deploy-quick come per lo smoke audio, `tools/deploy/deploy-quick.sh`, accesso LAN): percorso Path A completo. Checklist:
  - world seed reveal mostra "Calanchi Ferromagnetici" + companion badlands (nome dal pool, es. Gorra/Rost);
  - phone character creation offre le 2 specie locked;
  - combat monta griglia 10x10 con wave gulogluteus (tinta SISTEMA) e PG con sprite Scutiger/Hydrus;
  - VFX smoke visivo (residuo #601): hit spark su danno, slash su attacco, dissolve su morte, smoke su status;
  - audio: cue distinti, OGG suonano identici ai WAV (hit/crit/death/miss).
- [ ] **Step 2: run NATIVO a macchina scarica** (residuo QA audio finding 1, owner-assisted): `godot .` desktop, stesso percorso, ascolto crackling. Esiti possibili da registrare nel QA doc: (a) nativo pulito -> conferma underrun AudioWorklet web, si valutera' `audio/driver/mix_rate`/buffer SOLO per il web export (follow-up, non questo PR); (b) crackling anche nativo -> aprire indagine asset/resample (follow-up separato).
- [ ] **Step 3:** se l'owner non e' disponibile in sessione: dichiarare i punti 1-2 come RESIDUO ESPLICITO nel body PR (stesso pattern #599/#601), il PR non li blocca.
- [ ] **Step 4: PRD overlay** (stesso PR, regola repo): riga Audio -> residuo WAV->OGG chiuso, resta (o si chiude) il residuo crackling nativo; riga VFX -> smoke visivo eseguito/residuo; aggiungere riga "F-A content-lock badlands" verde con puntatore a questo piano.
- [ ] **Step 5:** gdformat + gdlint + full GUT (baseline 3888/0 failures) + `wc -l scripts/main.gd` == 1117; push `feat/fa-polish-badlands`; PR Godot-v2 con gate standard (@codex review, triage P1, poll verdetto 4 canali); merge = owner.

---

## Mappa exit-gate F-A (slice giocabile end-to-end VESTITA)

| Requisito slice                       | Coperto da                                                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 bioma reale (badlands) end-to-end   | Task 1 (seed) + Task 2 (combat routed)                                                                                                        |
| 2 specie reali con art dedicata       | Task 3                                                                                                                                        |
| Audio veri (#599) sostenibili sul web | Task 4 (peso) + Task 7 Step 2 (qualita' nativa)                                                                                               |
| VFX veri (#601) verificati a occhio   | Task 7 Step 1 (smoke visivo)                                                                                                                  |
| UI senza placeholder visibili         | Task 5                                                                                                                                        |
| Quality Gate 3-step                   | smoke = Task 7 Step 1; ricerca edge = fallback tutorial/pool/graph_routed testati (Task 1-2); tuning = delta peso pck (Task 4) + esiti QA doc |

## Fuori scope (tracciato, piani successivi)

- Wire specie scelte dal phone -> unita' PG TV (oggi fixture; il lock rende coerente l'esperienza, il wire vero e' F-C con lo scale-out contenuto).
- Objective `sabotage` giocabile (target_zone/time_limit lato TV) -- l'encounter gioca come waves+eliminazione in questa slice.
- Title screen / splash brandizzato TV; background art per-bioma; tileset badlands dedicato (arid_ground e' coerente col biome_class arid).
- Art-pass ferrospora su BattleFeed/JobCardPanel/PressureMeter (uniformare i frame carapace: candidato al polish F-C).
- Telegraph marker sprite, status icon persistenti, VFX elementali per-mossa, heal VFX (gia' deferred da #601).
- Ambience/biome-variant audio cues (resta il W7 designer-sprint follow-up).
- Mix-rate/buffer tuning web export (si apre SOLO se il run nativo conferma l'ipotesi underrun).
