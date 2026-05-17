---
title: 'Character Creation — Canonical Port Spec: Godot Phone v2'
doc_status: draft
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-05-06'
source_of_truth: false
language: it
review_cycle_days: 14
related:
  - docs/core/51-ONBOARDING-60S.md
  - docs/adr/ADR-2026-04-21b-onboarding-narrative-60s.md
  - data/core/campaign/default_campaign_mvp.yaml
  - docs/planning/2026-04-29-master-execution-plan-v3.md
---

# Character Creation — Canonical Port Spec: Godot Phone v2

**Trigger**: feedback master-dd 2026-05-06 — "creazione personaggio NON segue piano canonical".
**Authority**: `docs/core/51-ONBOARDING-60S.md` (A3 source-of-truth).
**Scope**: audit drift + spec port canonical → Godot phone v2.

---

## 1. Vision restated

User: "non una scelta ma combinazione di risposte che mutano mondo e ti donano prima combo."

Canonical attuale (`51-ONBOARDING-60S.md`): 1 scelta identitaria narrativa → 1 trait pre-assegnato a TUTTO il branco → enter Act 0.

**Gap vs user vision**: il canonical specifica 1 scelta flat → 1 trait output. User vision implica:

- **"combinazione di risposte"** → possibilmente N scelte sequenziali, non 1 sola
- **"mutano mondo"** → output va oltre il trait (biome, scenario seed, encounter variant)
- **"prima combo"** → output è 2-3 trait combinati, non 1 singolo

**Verdict**: canonical è MVP minimale corretto. La user vision è un **upgrade plausibile** della stessa struttura. Questo spec distingue le due opzioni:

- **Opzione BASE**: port fedele canonical 51 (1 scelta → 1 trait, mondo non muta)
- **Opzione COMBO** (upgrade): 2 scelte sequenziali → combo 2 trait + micro-deviazione mondo

---

## 2. Diff canonical vs shipped

### Layer comparison

| Layer                  | Canonical 51-ONBOARDING-60S.md                                    | Godot phone Sprint W7 shipped                                | Gap                                                                 |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| **Trigger flow**       | Splash "Sopravvivi all'Apex" → audio briefing 10s → scelta        | Direct dropdown form senza intro                             | Manca completamente il contesto narrativo                           |
| **Interaction mode**   | 3 card narrative identitarie (chi sei, non cosa fai)              | Dropdown Nome + Specie + Job — 4 opzioni hardcoded           | Paradigma opposto: CRPG classico vs Disco Elysium diegetic          |
| **Output semantico**   | 1 trait pre-assegnato all'intero branco (identità condivisa)      | `{name, species_id, job_id}` — 3 valori tecnici indipendenti | Nessun concetto di identità branco; 3 scelte atomiche non correlate |
| **Timing**             | 60s hard cap (briefing 10s + deliberazione 30s + transizione 10s) | Nessun timer — form aperto indefinitamente                   | Zero senso d'urgenza, zero ritmo narrativo                          |
| **Auto-select**        | option_a su timeout (tutorial gentle)                             | Nessun auto-select — blocca se non compilato                 | Regression potenziale in co-op se player AFK                        |
| **Mondo mutation**     | Non specificato in canonical (out of scope MVP)                   | Non presente                                                 | Allineati su questo layer — entrambi assenti                        |
| **Backend payload**    | `initial_trait_choice: option_a/b/c` → trait pre-slot             | `character_create {name, species_id, job_id}` via WS intent  | Schema completamente diverso                                        |
| **Retrocompatibilità** | Trait permanent per campagna (no respec)                          | Nessuna permanenza — solo WS round-trip                      | Diversa semantica lifecycle                                         |

### Web stack status

`apps/play/src/onboardingPanel.js` **Phase B SHIPPED** (esiste, completo, funzionale):

- Implementa canonical 51 fedelmente: briefing → 3 card → countdown → transizione
- API: `openOnboardingPanel({ onboarding, onPick })` lega a `campaign_def.onboarding`
- **MAI wired** in Godot (web stack != Godot stack)

`apps/play/src/characterCreation.js` **ALTRO modulo**:

- Non è onboarding — è creazione PG co-op (nome + MBTI form + specie)
- Pattern Jackbox M17: ogni player sceglie il proprio PG nel party
- Semantica diversa dalla scelta identitaria branco

**La confusione ha due origini**:

1. `phone_character_creation_view.gd` prende il nome da "character creation" ma bypassa completamente il flusso canonico
2. Il canonical descrive una scelta pre-campagna per il BRANCO; il modulo Godot è una creazione PG individuale co-op

---

## 3. Spec port canonical → Godot phone

### 3.1 Obiettivo del nuovo file

Sostituire (o affiancare) `phone_character_creation_view.gd` con `phone_onboarding_view.gd` che implementa il flusso canonico 51-ONBOARDING-60S.md.

**Nota architetturale**: `phone_character_creation_view.gd` risolve un problema diverso (scelta individuale PG per co-op). Il canonical risolve la scelta identitaria del branco (singola, vincolante, pre-campagna). Possono coesistere come step sequenziali:

```
[phone_onboarding_view] → scelta branco (1 volta, host vota o host sceglie)
         ↓
[phone_character_creation_view] → ogni player sceglie il proprio PG
         ↓
[combat / world]
```

### 3.2 Spec Opzione BASE (fedele canonical)

**File**: `Game-Godot-v2/scripts/phone/phone_onboarding_view.gd`
**Scene**: `Game-Godot-v2/scenes/phone/phone_onboarding_view.tscn`

#### Flow

```
[enter] → HTTP GET /api/campaign/default → parse onboarding section
        → STAGE 1: mostra briefing lines (10s, timer visibile)
        → STAGE 2: 3 card scelta (30s countdown, auto-select option_a)
        → player tap card → highlight
        → STAGE 3: transizione line (10s)
        → emit signal onboarding_complete(option_key)
        → composer avanza a phase CHARACTER_CREATION o COMBAT
```

#### Payload backend

```gdscript
# Intent emesso via composer WS
{
  "action": "onboarding_choice",
  "option_key": "option_a" | "option_b" | "option_c",
  "auto_selected": false,  # true se timeout
  "player_id": <player_id>
}
```

Il backend Game/ deve:

1. Ricevere `onboarding_choice` in `coopOrchestrator.js` (o `sessionHelpers.js`)
2. Mappare `option_key` → `trait_id` via `campaign_def.onboarding.choices[]`
3. Salvare `initial_trait_choice` in `PartyRoster.acquired_traits[]` pre-session
4. Propagare a tutti i device: broadcast `onboarding_chosen { option_key, trait_id, label }`

#### Node structure (Godot)

```
phone_onboarding_view.tscn
├── VBoxContainer (fullscreen, padding 16px)
│   ├── StageContainer (Control, swap stages)
│   │   ├── BriefingStage (VBoxContainer)
│   │   │   ├── NarrativeLines (VBoxContainer, 3× Label)
│   │   │   └── TimerBar (ProgressBar, 10s)
│   │   ├── ChoicesStage (VBoxContainer)
│   │   │   ├── CountdownLabel (Label, "30s")
│   │   │   ├── CardGrid (HBoxContainer / GridContainer)
│   │   │   │   ├── CardA (Button → OptionCard)
│   │   │   │   ├── CardB (Button → OptionCard)
│   │   │   │   └── CardC (Button → OptionCard)
│   │   │   └── AutoSelectHint (Label, visibile <5s)
│   │   └── TransitionStage (CenterContainer)
│   │       └── TransitionLine (Label)
```

#### OptionCard component

```gdscript
# Ogni card mostra:
# - label grande (es. "Come veloce e sfuggente")
# - narrative quote (es. "Non saremo mai abbastanza forti...")
# - trait badge (piccolo, es. "zampe_a_molla")
```

#### Signals emessi

```gdscript
signal onboarding_complete(option_key: String, auto_selected: bool)
signal onboarding_stage_changed(stage: String)  # "briefing"|"choices"|"transition"
```

#### Timer management

```gdscript
var _briefing_timer: SceneTreeTimer
var _deliberation_timer: SceneTreeTimer
var _transition_timer: SceneTreeTimer
var _countdown_elapsed: float = 0.0
var _auto_key: String = "option_a"
var _picked_key: String = ""

# In _process(delta) durante choices stage:
_countdown_elapsed += delta
var remaining = max(0.0, deliberation_timeout - _countdown_elapsed)
countdown_label.text = "%ds" % int(ceil(remaining))
if remaining <= 5.0:
    countdown_label.add_theme_color_override("font_color", Color.RED)
if remaining <= 0.0 and _picked_key.is_empty():
    _picked_key = _auto_key
    _confirm_choice(auto_selected=true)
```

### 3.3 Spec Opzione COMBO (upgrade — master-dd input richiesto)

Questa opzione implementa la user vision "combinazione risposte + prima combo".

**Struttura**: 2 scelte sequenziali → combo di 2 trait

#### Scelta 1: stile di branco (come 51, invariata)

- A: sfuggente → `zampe_a_molla`
- B: inamovibile → `pelle_elastomera`
- C: letale → `denti_seghettati`

#### Scelta 2: tattica preferita (NUOVA — da definire con master-dd)

Esempio ipotetico (NON canonical, richiede approvazione):

- X: "Attacca e fuggi" → trait `raffica_breve` (burst)
- Y: "Tieni la linea" → trait `formazione_serrata` (formation)
- Z: "Sfrutta l'ambiente" → trait `adattamento_bioma` (biome react)

#### Combo output (3×3 = 9 combinazioni)

| Scelta 1 + Scelta 2               | First Combo                            | Mundo mutation                             |
| --------------------------------- | -------------------------------------- | ------------------------------------------ |
| A + X (sfuggente + attacca/fuggi) | `zampe_a_molla` + `raffica_breve`      | Biome: savana aperta (+mobilità encounter) |
| A + Y (sfuggente + linea)         | `zampe_a_molla` + `formazione_serrata` | Biome: caverna (terreno che nega la fuga)  |
| A + Z (sfuggente + ambiente)      | `zampe_a_molla` + `adattamento_bioma`  | Biome: atollo (multi-surface)              |
| B + X                             | `pelle_elastomera` + `raffica_breve`   | Scenario: difesa ondata                    |
| …                                 | …                                      | …                                          |

**Attenzione anti-pattern**: 9 combinazioni × narrative = budget content enorme. Emily Short ([Beyond Branching](https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/)): pure branching without state explode combinatorially. Mantieni combo output come pair-of-traits, mondo mutation come seed integer (non N scene uniche).

#### Payload COMBO

```json
{
  "action": "onboarding_combo",
  "choice_1": "option_a",
  "choice_2": "option_x",
  "trait_ids": ["zampe_a_molla", "raffica_breve"],
  "world_seed_modifier": 1,
  "auto_selected": false
}
```

### 3.4 Co-op: chi decide l'onboarding?

Canonical (`51-ONBOARDING-60S.md`) §Phase C: "co-op sync — host fa la scelta vincolante per intero roster party. Deferred M12+."

Per Sprint M/N port: **host only sceglie**. Altri device vedono briefing + result broadcast, non interagiscono. Questo evita vote-sync complexity.

Se master-dd vuole vote co-op: ogni player vota, maggioranza vince. Effort +4h co-op vote protocol. **Deferred raccomandato.**

### 3.5 Cosa NON cambia nel Godot port

`phone_character_creation_view.gd` rimane per la scelta individuale PG. Il port aggiunge `phone_onboarding_view.gd` come step precedente nel flow del `phone_composer_view.gd`.

---

## 4. Backend changes richiesti

### 4.1 Nuovo intent handler `onboarding_choice`

**File**: `apps/backend/services/coop/coopOrchestrator.js`

```js
// Aggiungere a handleIntent() switch:
case 'onboarding_choice': {
  const { option_key, auto_selected } = payload;
  const campaignDef = await loadCampaignDef('default_campaign_mvp');
  const choice = campaignDef.onboarding.choices.find(c => c.option_key === option_key);
  if (!choice) throw new Error(`Unknown option_key: ${option_key}`);
  room.state.onboarding_choice = { option_key, trait_id: choice.trait_id, auto_selected };
  // Pre-assign trait to all party members
  for (const player of room.players.values()) {
    if (!player.acquired_traits) player.acquired_traits = [];
    if (!player.acquired_traits.includes(choice.trait_id)) {
      player.acquired_traits.push(choice.trait_id);
    }
  }
  broadcastToRoom(room, 'onboarding_chosen', {
    option_key, trait_id: choice.trait_id,
    label: choice.label, auto_selected
  });
  break;
}
```

### 4.2 Schema extension (minimal)

`packages/contracts/schemas/coop.schema.json` — aggiungere `onboarding_choice` come action type valido. **Non breaking**: aggiunta additiva.

### 4.3 `/api/campaign/start` — field esistente

Il canonical 51 già specifica `initial_trait_choice` nel body di `/api/campaign/start`. Backend deve semplicemente leggere il valore e applicare come documented. Verifica che `apps/backend/routes/campaign.js` lo accetti.

---

## 5. Open questions per master-dd

Questi punti BLOCCANO implementazione — richiedono risposta prima del chip spawn.

**Q1. Opzione BASE o COMBO?**

- BASE: fedele canonical, 1 scelta → 1 trait, 60s. Effort ~8-10h.
- COMBO: 2 scelte → 2 trait combo + micro-world mutation. Effort ~16-20h + design upfront 9 combo.
- **Raccomandazione**: BASE per Sprint M.x, poi COMBO come upgrade Sprint N.x dopo playtest.

**Q2. "Prima combo" = quali trait?**
Se COMBO: i 3 nuovi trait di scelta 2 esistono già in `data/core/traits/active_effects.yaml` o vanno creati? (Creazione nuovi trait = ADR separata + schema ripple su backend tests.)

**Q3. "Muta mondo" = cosa concretamente?**

- Biome forzato all'encounter enc_tutorial_01? (facile: override `biome_id` in campaign start payload)
- Scenario seed deviation? (medio: `scenario.seed_modifier` già supportato?)
- Entrambi? (effort doppio, verifica backend prima)
- Niente per MVP? (raccomandato — muta-mondo = post-M game feature)

**Q4. Phone host sceglie O ogni player vota?**

- Host only: semplice, deferred co-op vote.
- Vote co-op: ogni phone mostra 3 card, maggioranza vince, +4h protocol.

**Q5. Posizione nel flow composer**
Attuale: `LOBBY_JOIN → CHARACTER_CREATION → WORLD_REVEAL → COMBAT → DEBRIEF`
Proposto: `LOBBY_JOIN → ONBOARDING → CHARACTER_CREATION → WORLD_REVEAL → COMBAT → DEBRIEF`
Conferma sequenza OK?

---

## 6. Sprint integration plan

### Gap position nel plan v3.2

Il `docs/planning/2026-04-29-master-execution-plan-v3.md` non ha ticket esplicito per narrative onboarding port a Godot. Il gap più vicino:

- **Sprint M.5 cross-stack spike** (data.4 onboarding wire) — menzione indiretta in gap audit
- **Sprint N.x** — Sprint N è Godot gameplay core, non onboarding pre-flow

**Raccomandazione**: inserire come **Sprint M.6 Narrative Onboarding Port** (dopo M.5 cross-stack spike, prima Sprint N.1). Motivo: l'onboarding è il gate 0 del flow player — senza questo il tutorial_01 arriva senza identità espressa, annullando tutto il lavoro P4 MBTI post-encounter.

### Ticket abbozzo

```
TKT-NARR-ONBOARD-GODOT-PORT-BASE: 8-10h
  Desc: Port canonical 51-ONBOARDING-60S.md → phone_onboarding_view.gd
  Dependencies:
    - Sprint M.5 cross-stack spike GREEN (backend HTTP reach verified)
    - master-dd risponde Q1/Q4/Q5 sopra
    - coopOrchestrator.js onboarding_choice handler (4h backend)
  Blocked by: Q1 answer (BASE vs COMBO)
  Pillar: P4 MBTI/Ennea (identità pre-match), P5 Co-op (host-side flow)
  Gate 5 check: player vede onboarding briefing + card in <60s, scelta salvata nel debrief

TKT-NARR-ONBOARD-GODOT-PORT-COMBO: 16-20h (conditional on Q1=COMBO answer)
  Desc: Upgrade a 2-scelta combinatoria + world mutation seed
  Dependencies: TKT-BASE complete + master-dd approva 9 combo design + Q2+Q3 answers
  Pillar: P4 + P5 + P2 (world mutation → evolution hint)
  Gate 5 check: debrief mostra 2 trait in "acquired pre-match" + encounter biome matches choice
```

### Integrazione sprint sequence

```
M.5 cross-stack spike (in progress)
  ↓
M.6 Narrative Onboarding Port [NUOVO — questo ticket]
  Deliverable: phone_onboarding_view.gd + onboarding_choice handler
  ↓
M.7 → M.8 (asset + CI)
  ↓
N.1 Godot gameplay core (tutorial_01 con onboarding già cablato)
```

---

## 7. Audit quality checklist (6-point narrative)

| Check                                  |              Shipped W7              |            Canonical 51 port spec            |
| -------------------------------------- | :----------------------------------: | :------------------------------------------: |
| Player agency preserved                |  Parziale (sceglie ma non identità)  |   SI (3 card narrative + identità branco)    |
| State reactive (menziona prior choice) |       NO (nessuna persistenza)       |       SI (trait in debrief, permanent)       |
| Failure valid path (auto-select)       |      NO (blocca se non compila)      |     SI (auto-select option_a su timeout)     |
| Pacing (non combat-interrupt)          | Fuori tempo — form aperto indefinito |              SI (60s hard cap)               |
| Voice/tone consistent                  |      Neutro tecnico (dropdowns)      | SI (narrative lines per card, tono "branco") |
| Accessibility (skip option)            |          NO skip necessario          |      Timer auto-select = skip implicito      |

**Diagnosi INFJ-A**: player arriva al tutorial_01 senza aver espresso chi è. Non sente il peso della scelta. Disco Elysium insegna: "scegli prima, spiega dopo". Il W7 shipped fa l'opposto — chiede competenza tecnica (job selection) senza ancoraggio emotivo. Il trait assegnato prima del tutorial cambia il tono del gioco: "come vuoi che ti ricordino?" costruisce anticipazione. "Scegli il job" è tutorial di management.

---

## Autori

- Master DD (direction 2026-05-06, feedback originale)
- Claude Sonnet 4.6 (audit + spec draft, narrative-design-illuminator)
