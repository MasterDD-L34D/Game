---
title: Sprint 2026-04-18 M3.7 — Zero-cost asset policy + AI pipeline
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-18'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Sprint 2026-04-18 M3.7 — Zero-cost asset policy + AI pipeline

**Sessione autonoma** post-M3.6. Correzione scope: team = solo-dev + AI curator (no freelance, no budget). Closes gap "asset commission freelance" della roadmap M3.6 con pipeline alternativa zero-cost + AI-generated.

## Scope delivered

5 PR sequenziali (tutti docs + registry, zero code change):

| #   | Lane             | PR                                                                                           | Size LOC | Status  |
| --- | ---------------- | -------------------------------------------------------------------------------------------- | :------: | :-----: |
| 1   | ADR policy       | [#1584](https://github.com/MasterDD-L34D/Game/pull/1584) — zero-cost-asset-policy + AI legal |   ~177   | 🟡 open |
| 2   | Canonical 43     | [#1585](https://github.com/MasterDD-L34D/Game/pull/1585) — docs/core/43-ASSET-SOURCING.md    |   ~274   | 🟡 open |
| 3   | Update 41-AD     | [#1586](https://github.com/MasterDD-L34D/Game/pull/1586) — remove freelance refs             |   ~28    | 🟡 open |
| 4   | CREDITS + README | [#1587](https://github.com/MasterDD-L34D/Game/pull/1587) — disclaimer template               |   ~183   | 🟡 open |
| 5   | Sprint close     | (this PR) — sprint doc + memory                                                              |   ~170   | 🟡 open |

**Totale net**: ~832 LOC (docs 649, adr 177, sprint 170).

## Trigger sessione

M3.6 aveva canonicizzato art direction con roadmap step 8-9 "asset commission freelance (budget holder)". User chiarificazione:

> team = solo-dev + AI curator, zero budget upfront. MVP-first per attrarre investitori.

Vincolo team esplicito → asset commission freelance NON più valido. Scope aggiustato:

1. Community CC0/MIT foundation (70%)
2. AI-generated gap-fill (30%) con human authorship layer obbligatorio
3. Disclosure legal compliant Steam/EU/US

## Research approfondita

Agent profondo (1, general-purpose) produce report 1550 parole + 40+ URL verificati:

### Community libraries (12 sources mapped)

- **CC0/MIT foundation**: Kenney, OGA (CC0 filter), Lucide (MIT), Heroicons (MIT), Google Fonts (OFL), Game-icons.net (CC-BY attribution)
- **OGA contributors CC0**: Buch (foresta/caverna), Surt (dungeon/rovine), PixelFrog (caverna)
- **itch.io CUSTOM**: ansimuz (foresta, verifica per-pack)
- **Texture source**: ambientCG (CC0)

### BANNED libraries

- ❌ **LPC (Liberated Pixel Cup)**: CC-BY-SA 3.0 viral, contamina progetto commerciale
- ❌ **Spriters Resource**: fan-ripped, NO commercial
- ❌ **Pixel Joint gallery**: per-artist copyright default

### AI legal landscape 2026

- **US Copyright Office**: output AI puro NON copyrightable, human authorship layer sufficiente
- **EU AI Act** (Ago 2024 + generative Ago 2025): disclosure training data + output marking
- **Steam AI policy** (Jan 2024): disclosure mandatory in submission form

### Tool AI approvati

| Tool                  | Uso                     |  License commerciale  |
| --------------------- | ----------------------- | :-------------------: |
| **Retro Diffusion**   | Primary pixel-art 32×32 |       SaaS ToS        |
| **Adobe Firefly**     | Legal-safe fallback     | Indemnification Adobe |
| **SDXL + LoRA local** | Custom offline          |    Open + LoRA CC0    |
| **Flux Pro**          | Alta qualità non-pixel  |    Licenza chiara     |

### Tool NON usabili senza review

- Midjourney (LAION contested)
- DALL-E 3 (generic, no pixel native)
- PixelLab.ai (training undisclosed)
- Suno/Udio (RIAA lawsuits pending)

## ADR zero-cost-asset-policy — #1584

Nuova ADR ACCEPTED. Policy canonica:

- **70% foundation** community CC0/MIT
- **30% gap-fill** AI + human authorship layer obbligatorio
- **NO freelance commission** (supersedes ADR-2026-04-18 art-direction §roadmap step 8-9)
- Vincoli legali tassativi (no style replication, palette lock + cleanup obbligatori, LPC banned)
- Disclosure obbligatoria README + in-game credits + Steam store

## Canonical 43-ASSET-SOURCING.md — #1585

Doc implementativo source_of_truth:

- Libraries matrix 12 sources + URL + licenza + volume + uso Evo-Tactics
- BANNED list (LPC, Spriters, Pixel Joint)
- AI pipeline approvati + NON usabili
- Prompt template + divieti (style replication) + accettati
- Human authorship layer 4 steps (palette lock, Libresprite cleanup, compositional, provenance log)
- Palette master Evo-Tactics spec (10 funzionali + sub-palette 9 biomi)
- Tool editing free (Libresprite, Piskel, Krita, GIMP, ImageMagick, upscayl)
- CLI batch palette lock snippet
- Roadmap 9 biomi + 20 icon (14h MVP, 100h full)
- Audio stub deferred
- Disclaimer template ready-to-use
- Verifica periodica 90gg

## Update 41-AD — #1586

Rimozione riferimenti freelance:

- Header: "commission art + UI" → "asset art + UI"
- Palette extension 11 biomi: "post budget commission" → "AI gap-fill disponibile"
- Section "Asset commission spec (per freelance)" → "Asset acquisition spec (pipeline zero-cost)"
- Matrice fonti con "Fonte primaria + secondaria"
- Q-OPEN-15b/19b blocker aggiornati

42-SG non aveva freelance refs (verificato grep).

## CREDITS.md + README — #1587

Template ready-to-populate per compliance:

- **CREDITS.md** (nuovo): team + software stack + asset attribution sections (populated on-demand) + AI disclosure completo con ethical commitments + legal notices
- **README.md** update: sezione "Asset Attribution & AI Disclosure" con pipeline zero-cost explicit + ethical commitments + ref 43-ASSET-SOURCING

## Q-OPEN update

| Q-OPEN                        | Status pre-M3.7       | Status post-M3.7              |
| ----------------------------- | --------------------- | ----------------------------- |
| Q-OPEN-15b (budget frame T3)  | 🔴 blocked artist     | 🟡 post-MVP playtest decision |
| Q-OPEN-19b (palette 11 biomi) | 🔴 blocked commission | 🟢 AI gap-fill disponibile    |

**Q-OPEN-19b CHIUDIBILE post-playtest** (no blocker esterno).

## Gap critici update (GDD audit)

- **Gap #1 Art**: SPEC-COMPLETE → **PIPELINE-READY** (zero-cost actionable immediately)
- **Gap #3 Audio**: DEFERRED (ADR-2026-04-18-audio-direction-placeholder DRAFT resta, pipeline audio in 43-ASSET §Audio stub)

## Memo guardrail rispettati

- Regola 50 righe: tutti PR docs, zero code
- Nessun file in `.github/workflows/`, `migrations/`, `services/generation/`, `packages/contracts/`
- Trait: zero modifica
- Nessuna dipendenza npm nuova
- Vincolo team esplicito incorporato in ADR canonical

## Follow-up FU-M3.7-A..D

| ID  | Task                                                       | Blocker           | Priorità |
| --- | ---------------------------------------------------------- | ----------------- | :------: |
| A   | Creare palette master `.ase` 32 colori (user hands-on)     | User tempo        |    🟢    |
| B   | Acquisire MVP slice (P0+P1: palette + 20 icon + 3 biomi)   | Stimato 14h       |    🟢    |
| C   | Verifica ToS Retro Diffusion 2026 current                  | -                 |    🟡    |
| D   | Audio direction ADR finalizzare (deferred ma formalizzare) | Audio lead futuro |    ⚪    |

## Quirks sessione

- Research agent usato in modalità single-profondo (user priorità pixel biomi + UI icon) invece di 2 agent paralleli (art + audio)
- Audio sezione mantenuta come stub minimale (non primary scope)
- AI-generated scope stato verificato lato legale prima procedere (40+ URL check)
- LPC viral license identificata come risk → documentata in BANNED list

## Critical path updated (post-M3.7)

Pre-M3.7: MVP visual slice **blocked su budget freelance**.
Post-M3.7: MVP visual slice **actionable immediately** (solo-dev + AI).

Tempo stimato MVP visuale: **14h** (P0 palette + P0 20 icon + P1 3 biomi).

## Riferimenti

- `docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md` (ACCEPTED)
- `docs/core/43-ASSET-SOURCING.md` (source of truth)
- `docs/core/41-ART-DIRECTION.md` (aggiornato)
- `CREDITS.md` (template ready)
- `README.md` §Asset Attribution & AI Disclosure
- Research report sprint M3.7 (40+ URL verificati, disponibile in conversation log)
