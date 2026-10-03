---
title: 'ADR 2026-04-18 — Zero-cost asset policy + AI-generated legal framework'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-18
source_of_truth: false
language: it
review_cycle_days: 90
related:
  - 'docs/adr/ADR-2026-04-18-art-direction-placeholder.md'
  - 'docs/core/41-ART-DIRECTION.md'
  - 'docs/core/42-STYLE-GUIDE-UI.md'
  - 'docs/core/43-ASSET-SOURCING.md'
---

# ADR-2026-04-18 · Zero-cost asset policy + AI-generated legal framework

**Stato**: 🟢 ACCEPTED — sprint M3.7
**Supersedes roadmap**: ADR-2026-04-18 art-direction-placeholder §Roadmap step 8-9 (asset commission freelance)

## Contesto

Team Evo-Tactics = **solo-dev + AI curator** (user + Claude Code). Strategia **MVP-first per attrarre investitori**, zero budget upfront. ADR-2026-04-18 art-direction-placeholder roadmap originale prevedeva step 8-9 "Asset commission freelance (budget holder)" — **vincolo team ora esplicito**: nessuna commission, nessun hire.

Opzioni realistiche per acquisire asset visivi zero-cost:

1. **Community CC0/MIT libraries** (Kenney, OpenGameArt, Lucide, Game-icons) — foundation stabile ~90% UI + ~60% biomi generic
2. **AI-generated** (Stable Diffusion, Retro Diffusion, Flux, ecc.) — gap-fill per biomi custom (niche bio-fantastici)
3. **User hands-on pixel art** — Libresprite/Piskel free, ma budget tempo solo-dev

Ricerca 2026-04-18 (40+ URL verificati, sprint M3.7) ha mappato landscape libraries + AI tool + legal framework US/EU/platform.

## Decisione

Policy canonica per asset acquisition Evo-Tactics:

### Foundation (70%): community CC0 + MIT

Utilizzo **obbligatorio prima** di considerare AI generation. Risorse canoniche:

- **Kenney.nl** (CC0) — tileset base, UI generic, no attribution
- **OpenGameArt.org** — mix CC0/CC-BY, filtra per CC0 prima
- **Lucide** (MIT/ISC) — UI icon primary
- **Game-icons.net** (CC-BY 3.0) — combat ability/status icon (attribution obbligatoria in CREDITS.md)
- **Heroicons** (MIT) — fallback UI
- **Google Fonts** (OFL) — Inter, Noto Sans, Press Start 2P

### Gap-fill (30%): AI-generated con human authorship layer

Permitido **solo per gap non coperti da community** + **human post-process obbligatorio**.

#### Tool approvati

| Tool                                            | Uso                                | Giustificazione                                                                                                                                       |
| ----------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Retro Diffusion** (SaaS)                      | Primary pixel-art 32×32 generation | Specialized pixel-art. Premium $10-25/mo → commercial use + no watermark. Training: licensed assets + pixel artists consent. **Verified 2026-04-18**. |
| **Adobe Firefly**                               | Fallback legale-safe (non-pixel)   | Indemnification Adobe, training Adobe Stock + PD + licensed                                                                                           |
| **Stable Diffusion XL + pixel-art LoRA locale** | Custom control, offline            | Local = no SaaS lock-in; verifica LoRA singolo license CC0                                                                                            |
| **Flux Pro**                                    | Alta qualità non-pixel             | Licenza commercial chiara Black Forest Labs                                                                                                           |

#### Tool NON USABILI (senza review esplicita)

- **Midjourney** senza override training: LAION-derived contested, no indemnification default
- **DALL-E 3** generic (OpenAI): OK ma no pixel native
- **PixelLab.ai**: undisclosed training data (TBD verifica)
- **Suno/Udio** (audio): RIAA lawsuits 2024 pending → rinvia post-MVP

### Vincoli legali tassativi

1. **Style replication banned**: NO prompt "in style of [artista vivente]" — JB Saunders v Stability AI lawsuit pending
2. **Human authorship layer obbligatorio**: ogni AI output DEVE passare da:
   - Palette lock a palette master Evo-Tactics (32 colori indexed)
   - Aseprite/Libresprite cleanup manuale pixel
   - Compositional decision (placement, edge cleanup)
   - Documentazione processo in `docs/core/43-ASSET-SOURCING.md §provenance-log`
3. **LPC (Liberated Pixel Cup) CC-BY-SA 3.0 BANNED**: viral license, contamina progetto commerciale — evita anche come derivato
4. **Asset metadata**: ogni asset custom (AI o manuale) registrato in `CREDITS.md` con tool + provenance

### Disclosure obbligatoria

Prodotto finale DEVE includere:

- `README.md` sezione "AI-Generated Content Disclosure" (template in `docs/core/43-ASSET-SOURCING.md`)
- In-game credits screen con tool AI usati + workflow descritto
- Steam store page (quando pubblicato): spunta "Contains AI-generated content" + descrizione workflow (policy Steam 2024)

### Copyright legal posture

US Copyright Office (Marzo 2023 + update 2024-2025) nega copyright a output AI **puro**. Human authorship layer (palette lock + Aseprite cleanup + compositional editing) qualifica per copyright protection **solo sul layer umano**. Documentazione processo = **prova di human authorship** in eventuali dispute.

EU AI Act (Agosto 2024, provisioni generative Agosto 2025): richiede disclosure training data + marcatura output AI. Compliance tramite disclaimer README + in-game credits.

## Alternative valutate

### A. Budget freelance commission (ADR originale)

- **Pro**: qualità superiore, coerenza stilistica garantita
- **Contra**: VIOLA vincolo team (solo-dev), richiede budget zero-attualmente
- **Verdetto**: rigetto — vincolo team esplicito

### B. User hands-on pixel art 100%

- **Pro**: copyright pulito, controllo totale stile
- **Contra**: 100+ ore di produzione per MVP slice, user non necessariamente pixel artist professionale
- **Verdetto**: rigetto MVP timeline (25h stimate vs 100h+); user hands-on RESTA critico per human authorship layer + palette curation

### C. Community CC0 + MIT foundation + AI gap-fill (scelto)

- **Pro**: copertura 90% UI + 60% biomi via community, AI fill custom niche, human authorship layer garantito, legal disclosure compliant Steam/EU/US
- **Contra**: dipendenza tool SaaS (Retro Diffusion), coerenza palette richiede iter manuale, rischio lawsuit futuro AI landscape evolve
- **Verdetto**: 🟢 — best ROI per MVP solo-dev + investor pitch

### D. Full AI generation (no community foundation)

- **Pro**: generazione illimitata custom
- **Contra**: NO copyright protection pure AI, community ethics backlash (itch.io tag ban), nessuna coerenza stile garantita
- **Verdetto**: rigetto — rischio legale + etico + qualità

## Conseguenze

**Positive**:

- Zero-cost asset acquisition path esplicito → MVP visual slice feasible solo-dev
- Legal framework documentato → disclosure compliance Steam/EU pronta
- Human authorship layer obbligatorio → copyright ownership difendibile
- Pipeline riproducibile → investor pitch include "asset pipeline documented"

**Negative**:

- Dipendenza SaaS Retro Diffusion (rischio ToS change, vendor lock-in)
- Tempo cleanup manuale Aseprite ~30% budget ogni asset AI
- Coerenza palette cross-bioma richiede disciplina user
- No copyright protection full pure AI output (solo human layer)

**Neutrali**:

- Evo-Tactics naturalistic stylized pixel art compatibile con community CC0 style (no lock-in stile proprietario)
- Community attribution (Game-icons.net CC-BY) richiede CREDITS.md sempre aggiornato — overhead minimo

## Rollback

Revert ADR + cancella `docs/core/43-ASSET-SOURCING.md`. Fallback: ADR originale 2026-04-18 art-direction-placeholder con step 8-9 blocked su budget. Situazione pre-M3.7 = asset gap TOTAL → back to square one.

Per uscire da questa ADR (es. se user onboarda freelance), update stato → SUPERSEDED e ADR nuova "budget-funded asset commission" con nuovo workflow.

## Follow-up

- Implementazione pipeline: `docs/core/43-ASSET-SOURCING.md` canonical (creato sprint M3.7)
- Update `docs/core/41-ART-DIRECTION.md` + `42-STYLE-GUIDE-UI.md` per rimuovere "freelance commission" references
- `CREDITS.md` + README disclaimer template pronti per uso
- Q-OPEN-15b (budget frame T3): CHIUDIBILE post-investor pitch se funding arriva
- Q-OPEN-19b (palette 11 biomi non-shipping): AI gap-fill disponibile, deferred su playtest priority

## Riferimenti

- `docs/core/43-ASSET-SOURCING.md` — canonical pipeline + libraries matrix + disclaimer template
- `docs/adr/ADR-2026-04-18-art-direction-placeholder.md` — direction canonical (stile naturalistic stylized)
- `docs/core/41-ART-DIRECTION.md` — palette matrix + silhouette language
- `docs/core/42-STYLE-GUIDE-UI.md` — design tokens UI
- US Copyright Office AI Guidance: https://www.copyright.gov/ai/
- EU AI Act: https://artificialintelligenceact.eu
- Steam AI Disclosure Policy (Jan 2024): https://store.steampowered.com
- Research report sprint M3.7 (40+ URL verificati)
