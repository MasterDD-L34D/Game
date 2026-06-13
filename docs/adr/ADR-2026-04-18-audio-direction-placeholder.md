---
title: 'ADR 2026-04-18 — Audio Direction canonical (ambient organic + percussive)'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-18
source_of_truth: false
language: it
review_cycle_days: 90
supersedes: []
related:
  - 'docs/adr/ADR-2026-04-18-art-direction-placeholder.md'
  - 'docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md'
  - 'docs/core/43-ASSET-SOURCING.md'
---

# ADR-2026-04-18 · Audio Direction canonical

**Stato**: 🟢 ACCEPTED — sprint M3.8
**Issue tracker**: GDD audit gap critico #2 (audio) — direction canonicizzata, implementation deferred post-MVP visuale
**Pair ADR**: `ADR-2026-04-18-art-direction-placeholder.md`
**Policy acquisition**: `ADR-2026-04-18-zero-cost-asset-policy.md` applicabile ad audio (zero-cost community + user hands-on)

## Contesto

GDD audit (`reference_gdd_audit` supermemory) gap critico #2: zero audio. Stato attuale:

- **SFX**: solo `apps/play/src/sfx.js` Web Audio synthesized (oscillator tone/sweep) — placeholder funzionale ma non identitario
- **Musica**: nessuna track
- **VO**: zero
- **Sound design**: zero documentato

Open Questions GDD ha 2 BLOCKED audio:

- Q-OPEN-21: stile musicale (orchestrale vs electronic vs ambient vs chiptune)
- Q-OPEN-24: SFX synthesized vs sampled (impatto pipeline + dimensione bundle)

## Decisione (provvisoria)

**Direzione MVP**: **"ambient organic + percussive cues"** ispirato a:

- **Hollow Knight** (ambient atmosferico, leitmotif specie)
- **Into the Breach** (SFX percussive secchi, leggibili in batch tattico)
- **Slay the Spire** (musica loop calma + accelera in boss)
- **Wildermyth** (folk acustico narrativo)

**Non**: orchestrale heroic-fantasy (no Skyrim/LOTR), no chiptune (rotto vs naturalistic art), no EDM.

**Pillar audio**:

1. **Leggibilità tattica via SFX** > musica (pilastro 1) — ogni azione (attack hit/miss/crit, move, ability cast, KO) ha un cue distinto + corto (<200ms)
2. **Ambient per biome** (pilastro 2) — 4 ambient track loop per biome shipping (savana=insetti+vento, caverna=gocce+riverbero, foresta=fronda+acqua, rovine=ronzio basso)
3. **Tension dinamica via sistema_pressure** (pilastro 5) — musica intensifica con pressure tier (Calm=ambient only, Critical=percussion entra, Apex=full mix)
4. **TV co-op leggibile** — SFX panning leggero (no surround richiesto), volume range 60-80dB, no whisper SFX

**Non-MVP**: VO (voice over) PG, dialoghi parlati, dynamic music engine FMOD-style.

## Conseguenze

- **Pro**: SFX synthesized esistenti restano valide come placeholder durante MVP, unblock chiamata audio designer freelance, pipeline minima (4 ambient + ~20 SFX cue)
- **Contra**: ambient loop = rischio fatica auditiva ses sessions lunghe (mitigare: layered loops 3+ min minimo), nessun audio lead onboard
- **Neutrale**: Web Audio API esistente (`apps/play/src/sfx.js`) può ospitare sample loading senza rewrite

## Roadmap aggiornata (post M3.8 zero-cost)

| Step                                                                               | Owner     | Stima |      Stato       |
| ---------------------------------------------------------------------------------- | --------- | ----- | :--------------: |
| 1. SFX cue list canonica (~20 entries) — `docs/audio/sfx_cues.md`                  | Master DD | 2h    |     🟡 todo      |
| 2. Ambient brief 9 biome (mood + reference) — `docs/audio/ambient_biomes.md`       | Master DD | 3h    |     🟡 todo      |
| 3. SFX acquisition zero-cost (freesound CC0/CC-BY + Bfxr/sfxr/Chiptone generate)   | Master DD | 4h    |     🟢 todo      |
| 4. Ambient track acquisition (OGA + Incompetech CC-BY + Pixabay Music CC0)         | Master DD | 4h    |     🟢 todo      |
| 5. Pipeline integration: sample loading in sfx.js, fallback synth se asset missing | dev       | 1d    | 🟡 todo post-3+4 |
| 6. Music intensity hook: legare a `sistema_pressure_tier` via event bus            | dev       | 1d    |  🟡 todo post-4  |

Step 1+2 text-only. Step 3-6 zero-cost (community + user curation). NO freelance commission (vincolo team M3.7 ADR zero-cost-asset-policy).

**Audio AI deferred**: Suno/Udio RIAA lawsuits 2024 pending → no AI music generation fino risoluzione lawsuit 2026-2027. Se needed, human-composed via Beepbox (chiptune online) come alternativa se user vuole custom.

## Open Questions chiuse da questo ADR

- Q-OPEN-21: ✅ ambient organic + percussive cues
- Q-OPEN-24: ✅ ibrido — SFX sampled (impact, identità) + ambient sampled, music loop sampled. Synth Web Audio resta come fallback dev/test.

## Rollback

ADR DRAFT — elimina file. `apps/play/src/sfx.js` Web Audio synth resta funzionale come placeholder.

## Riferimenti

- supermemory `reference_gdd_audit` — gap critici GDD
- supermemory `project_gdd_open_questions` — 28 open questions
- `apps/play/src/sfx.js` — Web Audio placeholder corrente
- `docs/core/00-SOURCE-OF-TRUTH.md` §pilastro 5 (TV co-op)
