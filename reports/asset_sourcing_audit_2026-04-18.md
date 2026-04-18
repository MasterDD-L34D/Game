---
title: Asset Sourcing Audit — 2026-04-18 (verify Retro Diffusion ToS)
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-18'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Asset Sourcing Audit — 2026-04-18

Verifica periodica 90gg (come da `docs/core/43-ASSET-SOURCING.md §Verifica periodica`). Primo audit post-M3.7 canonicalization.

## Scope

- ToS SaaS primary tool: Retro Diffusion
- Legal landscape update (US Copyright Office + EU AI Act + Steam policy)
- Community libraries link rot check
- Platform policies (itch.io, Epic)

## Retro Diffusion ToS verify 2026

**Fonte**: WebSearch + WebFetch pages 2026-04-18.

### Findings

| Aspetto | Stato 2026-04-18 | Evidence |
|---------|------------------|----------|
| Commercial use | ✅ ALLOWED (Premium tier) | Search result: "Premium plans include unlimited high-resolution generations, commercial use license, watermark-free exports" |
| Pricing | $10-25/mo | Search result: "pricing typically ranging from $10–$25/month depending on features" |
| Output ownership | User owns output | Search result: "outputs of code/models owned by whoever creates them, able to be used commercially" |
| Software ownership | Astropulse LLC | EULA: "Astropulse LLC has complete ownership of the Software" |
| Training data | Ethical claim | Search result: "trained on licensed assets from Astropulse and other pixel artists with their consent" |
| Free tier | Non-commercial only (watermarked) | EULA default prohibits commercial without Premium |
| Watermark | Free tier = watermark, Premium = no watermark | Premium features list |

### Verdict

✅ **Retro Diffusion Premium tier (paid $10-25/mo) SAFE per Evo-Tactics commercial use**. Conferma ADR-2026-04-18-zero-cost-asset-policy assumptions.

**Requisiti compliance**:
1. Subscription Premium tier attiva durante generation (user responsibility)
2. Output archived con metadata in `CREDITS.md` provenance log
3. Human authorship layer applicato (palette lock + Libresprite)
4. Disclosure in README + Steam store submission

**Rischi residui**:
- Training data ethical claim non verificabile indipendentemente (company statement only)
- ToS change risk ogni cycle review 90gg
- SaaS lock-in (no offline fallback per Premium features)

## Legal landscape (update check)

### US Copyright Office

**Stato 2026-04-18**: Guidance originale Marzo 2023 + updates 2024-2025 resta valida.

- Zarya of the Dawn (2023): no copyright per immagini AI puro, copyright su selezione/arrangement
- Thaler v Perlmutter (2023): no copyright per opere AI-only senza human authorship
- 2024 update: "human authorship significativo" richiesto, prompt engineering NON sufficiente da solo
- 2025 update: selection/editing/compositional decisions QUALIFICANO per human authorship layer

**Implicazione Evo-Tactics**: pipeline human authorship layer (palette lock + Libresprite cleanup + compositional decision + provenance log) = compliant.

### EU AI Act

**Stato 2026-04-18**: Entrato in vigore Agosto 2024. Provisioni generative Agosto 2025.

- Disclosure training data obbligatoria
- Output marking per AI-generated content
- Enforcement incremental fino 2027 per sistemi alto-rischio
- Game industry non classificato alto-rischio (categoria limited/minimal)

**Implicazione**: disclosure README + CREDITS.md + Steam store = compliant.

### Steam AI policy

**Stato 2026-04-18**: Policy Jan 2024 resta valida.

- Disclosure mandatory in submission form
- Store page spunta "Contains AI-generated content"
- Workflow description richiesta
- No outright ban AI

**Implicazione**: compliance via submission checklist pre-release.

### itch.io

**Stato 2026-04-18**: No global ban, single-dev tag filter AI disponibile per community preference.

## Community libraries link rot check

| Library | URL | Status 2026-04-18 |
|---------|-----|-------------------|
| Kenney.nl | https://kenney.nl/assets | ✅ Live |
| OpenGameArt.org | https://opengameart.org | ✅ Live |
| Lucide | https://lucide.dev | ✅ Live |
| Game-icons.net | https://game-icons.net | ✅ Live |
| Heroicons | https://heroicons.com | ✅ Live |
| itch.io free tag | https://itch.io/game-assets/free/tag-pixel-art | ✅ Live |
| Google Fonts | https://fonts.google.com | ✅ Live |

Tutti live. Nessun link rot rilevato.

## Next audit scheduled

Prossima review: **2026-07-18** (90gg cycle).

Trigger early review se:
- Retro Diffusion announce ToS change / pricing update
- US Copyright Office nuova guidance AI
- EU AI Act enforcement update
- Steam AI policy revision

## Action items post-audit

- ✅ Update `docs/core/43-ASSET-SOURCING.md` — Retro Diffusion row (M3.8 PR 1)
- ✅ Update `docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md` — Tool approvati row (M3.8 PR 1)
- ✅ Update `CREDITS.md` — Tool approvati section (M3.8 PR 1)
- ✅ Create this audit log report (M3.8 PR 1)

## Riferimenti

- `docs/core/43-ASSET-SOURCING.md` §Verifica periodica
- `docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md`
- `CREDITS.md`
- US Copyright Office: https://www.copyright.gov/ai/
- EU AI Act: https://artificialintelligenceact.eu
- Steam AI Disclosure Policy (Jan 2024): https://store.steampowered.com

## Fonti verificate

- [Retro Diffusion](https://www.retrodiffusion.ai)
- [Retro Diffusion reviews](https://retro-diffusion.tenereteam.com/)
- [Astropulse home](https://astropulse.co/)
- [Astropulse itch.io Retro Diffusion Extension](https://astropulse.itch.io/retrodiffusion)
- [Terms.Law AI output rights 2026](https://terms.law/ai-output-rights/stable-diffusion/)
