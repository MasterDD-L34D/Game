---
title: Art Direction, Audio Direction, Business Model — Decisioni canoniche
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-17
source_of_truth: true
language: it
review_cycle_days: 30
---

# Art, Audio, Business — Decisioni canoniche

Registra le decisioni prese dal Master DD nella sessione serale **2026-04-17** su Art Direction, Audio Direction, Business Model e Identità Narrativa. Chiude gli 8 Open Questions marcati 🔴 in SoT §19 pre-2026-04-17.

**Autorita'**: livello **A1** (hub canonico). In caso di conflitto con [`90-FINAL-DESIGN-FREEZE.md`](90-FINAL-DESIGN-FREEZE.md) (A3), prevale il freeze.

Riferimenti: SoT §19 (Registro decisioni GDD), [`00B-CANONICAL_PROMOTION_MATRIX.md`](00B-CANONICAL_PROMOTION_MATRIX.md), `docs/reports/2026-04-17-audit-gap-implementativo-docs.md`.

---

## 1. Business Model

### 1.1 Go-to-market

**Early Access Steam → premium 1.0**. No F2P.

**Motivazione**:

- Target indie tattico niche (FFT/Wargroove/Into the Breach) — pubblico disposto a pagare premium per profondità.
- Early Access permette playtest pubblico + feedback loop sulle 6 pilastri (FFT/Spore/Identità/MBTI/Co-op/Fairness) prima del 1.0.
- F2P richiede economia gacha/loot che contraddice il principio "tri-sorgente progression" (§20 SoT) — loot non casuale, mutazioni significative.

### 1.2 Rating

**PEGI 16** — taglio adulto alla Mewgenics.

**Motivazione**:

- Creature modulari con tratti body-horror (denti seghettati, bleeding, fracture, status mentali panic/rage) giustificano 16+.
- Sistema antagonista distopico (narrative AI "Il Sistema") pesa sul tono.
- Permette scelte visive più espressive (mutazioni, ferite visibili) senza auto-censura.

### 1.3 Localizzazione

**it + en al lancio**. Struttura i18n-ready per espansione post-lancio.

**Motivazione**:

- Glossary già bilingue (`packs/evo_tactics_pack/docs/catalog/glossary.json` — labels it/en).
- Frontmatter docs `language: it-en` già standard.
- Chiavi i18n scaffold in `data/i18n/{it,en}/common.json` (Q3 deliverable DRAFT).

---

## 2. Art Direction

### 2.1 Stile rendering

**2.5D isometrico**.

**Motivazione**:

- Leggibilità FFT-like — grid tattica chiara, elevazione visibile per terrain_defense.
- Scala indie — sprite 2D meno costosi di 3D rig animato completo.
- TV-friendly — iso è storicamente la scelta più leggibile a 3+ metri di distanza (FFT/Disgaea/Wargroove).
- Compatibile con grid esistente (`services/rules/hexGrid.js` axial coordinates).

### 2.2 Animazioni

**Sprite animato 4-8 frame per azione**.

Stati minimi per creatura:

- `idle` (2-4 frame)
- `move` (4-6 frame direzionali)
- `attack` (4-8 frame)
- `hit` (2-4 frame reaction)
- `ko` (sequenza caduta 4-6 frame)

Animazioni aggiuntive (opt-in per creature hero/boss): `special`, `bleed`, `rage`, `panic`.

### 2.3 Budget asset per creatura

**Medio** — sprite multi-stato, no 3D rig.

Target: una creatura = 5-8 sprite animati + variant mutazioni visibili (body parts modulari quando trait lo richiede).

### 2.4 Moodboard

**Rimanda al prossimo sprint art.** 3 reference ufficiali preliminari:

- **Final Fantasy Tactics** — leggibilità grid, palette saturata, sprite piccoli ma leggibili.
- **Wargroove** — pixel art moderna, combattimento chiaro, palette vivida.
- **Into the Breach** — minimalismo iso, telegraphing azioni, UI sovrapposto al mondo.

### 2.5 Asset pipeline

**Aseprite primary + Blender opzionale per backgrounds iso**.

- Aseprite: tutti gli sprite creatura + effetti + UI.
- Blender: pre-render backgrounds iso (biome tiles) se complessità lo richiede, altrimenti pixel art diretta.

---

## 3. Audio Direction

### 3.1 Budget musicale

**freesound.org prototype → asset pack produzione**. No composer dedicato in MVP.

- MVP/EA: freesound.org + royalty-free tracks per prototipi tematici (savana, caverna, foresta, boss arena).
- Post-EA: asset pack commerciale (HumbleBundle/Unity Asset Store/GameDev Market) per coerenza.
- 1.0: valutare composer dedicato solo se revenue lo consente.

### 3.2 Voci creature

**Solo SFX ambientali e d'azione. Nessuna voce.**

**Motivazione**:

- Coerente con tono "bio-plausibile" (§7 SoT) — creature non parlano, comunicano via comportamento.
- Budget indie — VO multi-lingua costa molto.
- Pattern A narrativo (Sistema-centric) non richiede voci creature.

### 3.3 Volume default

Musica 70%, SFX 100%, master 80%. Configurabile in Settings (§17 Screen Flow).

### 3.4 Prototype audio

freesound.org. Creature SFX spec in `docs/audio/creature-sfx-spec.md` (Q10 DRAFT).

---

## 4. Identità Narrativa (Q20 / D5)

**Decisione**: **fase A ora → fase B quando scriviamo storia**. Transizione pianificata, no opt-in incerto.

### 4.1 Fase 1 (ora → MVP/EA): **Pattern A — Sistema-centric**

**Scelta Master DD** 2026-04-17 (ispirazione AI War + Ink, ricerca agent sessione 17/04).

- **Unico attore narrativo**: il Sistema (antagonista persistente).
- **Multi-profile**: `packs/evo_tactics_pack/data/balance/ai_profiles.yaml` estende ogni profilo (Calm/Apex/etc.) con `narrative_voice`.
- **Creature player**: mute, slot anonimi ("Wolf-03"). Identità emerge da tratti + MBTI + decisioni playtest.
- **Briefing/debrief**: solo Sistema parla al player, tono varia per pressure tier.
- **Perché ora**: non abbiamo ancora una storia scritta; Pattern A costa poco e preserva emergent identity durante EA playtest.

### 4.2 Integrazione tecnica fase 1

1. Estendere schema `ai_profiles.yaml` con campo opzionale `narrative_voice: { tone, vocabulary, knots: [...] }`.
2. Mappare `sistema_pressure` tier (Calm / Tense / Apex) → ink knot selection in `services/narrative/narrativeEngine.js`.
3. Scrivere 5-8 knot Ink per profilo Sistema (briefing + debrief + taunt condizionali).
4. Contratto inkjs invariato — zero breaking change.

**Costo stimato**: 300-500 LOC ink, 0 nuove dipendenze, 0 refactor schema.

### 4.3 Fase 2 (quando scriviamo storia): **Pattern B — Overlord + Custodi named** (Descent ibrido)

**Trigger di transizione**: quando apriamo il workstream "narrative campaign / story mode" (post-EA playtest, previo green-light Master DD).

**Perché B e non A puro**:

- Storia significativa richiede POV umano (Custodi) che cresce arc-by-arc, non solo Sistema antagonista.
- Descent Overlord + Heroes = equilibrio testato tra antagonista persistente + cast POV memorabile.
- Ibrido preserva Pattern A (Sistema continua a parlare) e aggiunge 2-4 Custodi named come layer sopra — no strip, no rewrite.

**Contenuto fase 2**:

- Nuovo YAML `data/core/custodi.yaml` con 2-4 Custodi (background + barks + skill narrativi, no meccaniche).
- Ink scenes multi-speaker (Sistema vs Custode vs Custode).
- Custode scelto a inizio campagna (co-op: 1 Custode per player fino a 4; solo = scegli 1).
- Campaign arc strutturato: intro → 3-5 atti → climax → epilogo (Descent campaign book pattern).
- Sistema rimane Overlord persistente cross-campaign.

### 4.4 Reference repos per fase 2 (story writing)

Tracciati ufficialmente per ispirazione quando apriamo workstream narrative. Cross-ref `memory/reference_external_repos.md`.

| Repo                                             | URL                                                                       | Cosa estrarre                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Descent: Road to Legend** (campaign structure) | https://descent2e.fandom.com/wiki/Road_to_Legend                          | Overlord plot-card rhythm, quest branching win/loss, campaign book format                                                                |
| **wesnoth/wesnoth**                              | https://github.com/wesnoth/wesnoth                                        | Campaign dialogue inline pattern (`[message]` WML), leader named come unità giocabile, narrator senza portrait — vedi `data/campaigns/*` |
| **inkle/ink**                                    | https://github.com/inkle/ink                                              | Multi-speaker knot, stitches, variable state per scelte morali — già in uso (inkjs)                                                      |
| **inkle/inky**                                   | https://github.com/inkle/inky                                             | IDE editor Ink per writing pass — valutare per team writing                                                                              |
| **OpenRA/OpenRA**                                | https://github.com/OpenRA/OpenRA                                          | Mission briefing + campaign scripting (Lua) — pattern missione con objectives narrativi                                                  |
| **80 Days / Sorcery** (inkle)                    | https://www.inklestudios.com                                              | Gold standard Ink branching + character voicing multi-speaker (non-open source, studio per pattern)                                      |
| **FFT War of the Lions**                         | https://en.wikipedia.org/wiki/Final_Fantasy_Tactics:_The_War_of_the_Lions | Dialogo named compagni + generic recruits — acted scenes pattern                                                                         |

**Aggiornamento repo list**: quando apriamo fase 2, aggiorna `memory/reference_external_repos.md` promuovendo questi a tier "narrative-focus".

### 4.5 Alternative scartate

- **Pattern C** (Comandante player-named): ownership sì, ma poca caratterizzazione autoriale. Rischia generico. Manca anchor narrativo per storia.
- **Pattern D** (Ramza-light FFT): protagonista single POV contraddice ownership co-op. Alto costo writing campaign arc lineare. Meglio ibrido Custodi multi-POV.
- **Descent puro** (Heroes = creature): Heroes named fissi contraddice creature modulari (in Evo-Tactics creature sono sotto il player, non sono i player).

---

## 5. Implementation tracking

| Area      | Deliverable                                              | Stato                                      | Owner          |
| --------- | -------------------------------------------------------- | ------------------------------------------ | -------------- |
| Art       | 3 reference moodboard draft                              | ⏳ prossimo sprint art                     | Master DD      |
| Art       | Palette primarie 3 biomi pilota (savana/caverna/foresta) | ⏳ prossimo sprint art                     | Master DD      |
| Audio     | Creature SFX spec bilingue                               | 🟡 DRAFT `docs/audio/creature-sfx-spec.md` | Audio lead TBD |
| Narrativa | `narrative_voice` field in `ai_profiles.yaml`            | ⏳ task aperto                             | Backend        |
| Narrativa | Ink knot briefing Sistema per pressure tier              | ⏳ task aperto                             | Writing        |
| Business  | Steam Early Access page draft                            | ⏳ milestone pre-EA                        | Master DD      |
| Business  | i18n scaffold EN translation pass                        | 🟡 DRAFT Q3                                | Loc lead TBD   |

---

_Creato 2026-04-17 — chiude 8 Open Questions Master DD pre-2026-04-17. Prossima revisione entro 30 giorni._
