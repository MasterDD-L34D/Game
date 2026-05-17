---
title: 'Creature SFX — Voice-less Audio Spec'
doc_status: active
doc_owner: audio-team
workstream: atlas
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# Creature SFX — Voice-less Audio Spec

**Stato**: 🟢 ACTIVE — approvato Master DD 2026-04-17 (Q-001 T1.4)
**Branch**: `explore/open-questions-triage` (Q-001)
**Risolve**: A9 (SoT §19 Q10 — "Nessuna voce, SFX ambientali. Creature non parlano. Bio-plausibile")
**Budget riferimento**: freesound.org asset pack (SoT §19 Q12)

## Principio

**Creature NON parlano**. Nessun voice-over, nessun linguaggio articolato, nessun accento umano. Expression = vocalizzazioni bio-plausibili + SFX corporei.

Criterio bio-plausibilità: suono deve essere **giustificabile dalla fisiologia** della creatura (dimensioni, trait respiratori, membrane, strutture risonanti). No effetti sovrannaturali non motivati.

## Taxonomia SFX per creatura

Ogni scheda specie (`data/core/species/*.yaml` o `packs/evo_tactics_pack/data/species/*`) deve includere blocco `audio_profile`:

```yaml
# Esempio per specie hypothetical
audio_profile:
  category: mammifero_medio # driver timbrico generale
  vocal_range:
    pitch_hz: [80, 400]
    intensity_db: [-30, -10] # relativo a master ref
  sfx_events:
    idle: creature_mammifero_breath_loop
    move: footsteps_soft_4x
    attack_physical: growl_short + impact_flesh
    attack_ranged: hiss_telegraph
    hit_taken: yelp
    death: grunt_long_falling
    panic: whimper_rapid
    rage: roar
    stunned: muffled_moan
    bleeding: ragged_breath
  biome_modifier:
    water: +reverb_short
    cave: +reverb_long
    open: -reverb
```

## Categorie timbriche canoniche

| Categoria          | Timbro reference              | Esempi animali           | Pitch range (Hz)    |
| ------------------ | ----------------------------- | ------------------------ | ------------------- |
| insetto_piccolo    | chitinous click/stridulazione | cavalletta, cicala       | 2000-8000           |
| insetto_grande     | low buzz + click              | scarabeo rinoceronte     | 100-800             |
| rettile            | hiss + low rumble             | iguana, varano           | 60-300              |
| anfibio            | croak + wet squelch           | rospo, salamandra        | 80-500              |
| mammifero_piccolo  | squeak + chirp                | topo, furetto            | 800-4000            |
| mammifero_medio    | growl + bark + breath         | lupo, iena               | 80-400              |
| mammifero_grande   | roar + rumble                 | leone, orso              | 40-250              |
| avifauna           | chirp + screech               | corvo, aquila            | 200-3000            |
| acquatico          | click + whale-song            | delfino, balena          | 20-8000 (wide)      |
| invertebrato_molle | wet squelch + pop             | cefalopode               | 50-400              |
| fungino            | breath + spore puff           | — (analogo respiratorio) | 30-200              |
| cristallino        | chime + resonance             | — (minerale animato)     | 400-4000            |
| alieno_sinaptico   | whisper + static              | — (bio-sintetico)        | 100-2000 (+texture) |

**Regola**: ogni specie è assegnata a **1 categoria primaria**; modifiers da trait.

## Modifier per trait

Trait che cambiano fisiologia vocale → mod applicato al profilo audio base:

| Trait                         | Effetto audio                          |
| ----------------------------- | -------------------------------------- |
| `cassa_toracica_risonante`    | +low bias, +reverb naturale            |
| `coda_frusta_cinetica`        | +whoosh suffix su attack               |
| `pelle_umida_venosa`          | +wet sustain, reduced attack transient |
| `apparato_respiratorio_duale` | +harmonic layer (2 pitch)              |
| `membrana_alata`              | +flap loop on move                     |
| `sinapsi_luminescenti`        | +high-freq sparkle on panic/rage       |
| `scheletro_idro_regolante`    | damped tone                            |
| `eco_sonar_attivo`            | periodic click/ping overlay            |

## Eventi canonici (union con A8)

Ogni specie deve avere **minimo** SFX per:

- `idle` — loop breath/ambient
- `move` — footstep o equivalente
- `attack_physical` — vocale + impact
- `attack_ranged` — telegraph + release (se specie ha attacchi a distanza)
- `hit_taken` — reazione breve
- `death` — cadenza finale caratteristica

**Opzionali ma raccomandati**:

- `panic`, `rage`, `stunned`, `bleeding` — colour status
- `special_trait_activated` — per trait con cooldown visibile
- `proximity_ambient` — loop leggero quando nel FOV giocatore

## Sistema di generazione SFX (procedurale)

**Obiettivo**: copertura 100% species catalog senza dover produrre manualmente N×M samples.

**Proposta pipeline**:

1. **Pool base per categoria**: 3-5 variants per evento per categoria (es. mammifero_medio/attack = 5 growl)
2. **Modifier runtime**: pitch shift + filter + reverb applicati a runtime basati su trait
3. **Seed deterministico**: species_id → seleziona variant consistentemente
4. **Fallback**: se audio_profile mancante, uso categoria auto-derivata da `species.category`

### Audio engine contract

```typescript
interface CreatureSfxRequest {
  species_id: string;
  event: 'idle' | 'move' | 'attack_physical' | /* ... */;
  trait_overrides?: string[];
  biome_modifier?: 'water' | 'cave' | 'open' | 'dense';
  intensity?: number; // 0.0 - 1.0
  seed?: number;
}
// → returns SFX sample + runtime modifiers
```

Implementazione deferred a post-audio pipeline setup.

## Vincoli produzione

- **Budget**: freesound.org CC0 + CC-BY samples come base (SoT §19 Q12 🟡)
- **Storage target**: ≤ 50 MB audio bundle iniziale (compressed ogg/opus)
- **Streaming**: no (loop locale in RAM)
- **Sample rate**: 44.1 kHz min, 48 kHz per cristallino/alieno_sinaptico (alta freq)
- **Mono per creature SFX**, stereo solo per ambient biome

## Validation plan

### Fase 1 — Category mapping (1 settimana)

- [ ] Classificare tutte ~50 specie in `data/core/species/` per categoria
- [ ] Identificare trait che impattano audio (15-20 max)
- [ ] Coverage gap: quante specie hanno categoria custom non coperta?

### Fase 2 — Sample curation (2-4 settimane)

- Per ogni categoria × evento: 3-5 samples curati da freesound
- License tracking + credits file
- Bank test: ascolto in contesto

### Fase 3 — Playtest fit (post-vertical slice)

- "Ti suona bio-plausibile?" survey
- "Distinguibili fra specie diverse?" — test discrimination
- "Identifichi lo stato (panic/rage) senza UI?" — test clarity

## Decisione Master DD (2026-04-17) — Q-001 T1.4

- 13 categorie timbriche: **SI** — taxonomia confermata
- Pipeline: **HYBRID** — pool+modifier default, samples dedicati per boss/apex/creature signature
- Budget 50MB bundle: **SI**
- Timing audio: **POST-M4** — vertical slice prima, audio fase dedicata successiva

Follow-up branch: `feat/sfx-curation` post-M4 (freesound bank + license tracking).

## Cross-reference

- SoT §19 Q10 — creature senza voce
- SoT §19 Q11 — volume default (music 70%, SFX 100%, master 80%)
- SoT §19 Q12 — prototipo audio freesound 🟡
- docs/frontend/accessibility-deaf-visual-parity.md — parity audio/visuale
- data/core/ui/loading_tips.yaml — tip_acc_01/02 menzionano audio/visual parity
