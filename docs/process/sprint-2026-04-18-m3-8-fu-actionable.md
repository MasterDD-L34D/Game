---
title: Sprint 2026-04-18 M3.8 — FU-M3.7 actionable (ToS verify + audio ADR + MVP playbook)
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-18'
source_of_truth: false
language: it
review_cycle_days: 90
---

# Sprint 2026-04-18 M3.8 — FU-M3.7 actionable

**Sessione autonoma** post-M3.7. Eseguiti 3 follow-up FU-M3.7 actionable + audio ADR formalize.

## Scope delivered

4 PR sequenziali (tutti docs, zero code):

| #   | Lane         | PR                                                                                                       | Size LOC | Status  |
| --- | ------------ | -------------------------------------------------------------------------------------------------------- | :------: | :-----: |
| 1   | ToS verify   | [#1591](https://github.com/MasterDD-L34D/Game/pull/1591) — Retro Diffusion audit + 43/ADR/CREDITS update |   ~161   | 🟡 open |
| 2   | Audio ADR    | [#1592](https://github.com/MasterDD-L34D/Game/pull/1592) — audio-direction DRAFT → ACCEPTED              |   ~35    | 🟡 open |
| 3   | MVP playbook | [#1594](https://github.com/MasterDD-L34D/Game/pull/1594) — asset-mvp-slice-playbook.md 14h               |   ~221   | 🟡 open |
| 4   | Sprint close | (this PR) — sprint doc + memory                                                                          |   ~170   | 🟡 open |

**Totale**: ~587 LOC docs.

## Trigger + scope

M3.7 aveva chiuso zero-cost asset policy. User richiesta "procedi" → eseguire FU-M3.7 actionable immediately.

Selected FU-M3.7 task (Claude-feasible):

- **C** (verify Retro Diffusion ToS): WebSearch + WebFetch
- **D** (audio ADR formalize): DRAFT → ACCEPTED allineato a zero-cost
- **B-stub** (MVP slice playbook): step-by-step 14h roadmap per user hands-on

Non eseguiti (require user hands-on o fuori capability Claude):

- **A** (palette master `.ase`): richiede user Libresprite
- **B** (MVP slice actual assets): richiede Retro Diffusion login + Libresprite

## PR 1 — Retro Diffusion ToS verify #1591

WebSearch + WebFetch conferma Premium tier safe:

- ✅ Commercial use ALLOWED ($10-25/mo)
- ✅ Output ownership: creator
- ✅ Training: licensed + artists consent
- Free tier: watermarked, non-commercial

Updates:

- 43-ASSET-SOURCING.md Retro Diffusion row con verified pricing + date
- ADR zero-cost-asset-policy Tool approvati row updated
- CREDITS.md Tool approvati section
- `reports/asset_sourcing_audit_2026-04-18.md` (nuovo): primo audit 90gg cycle

## PR 2 — Audio ADR ACCEPTED #1592

Audio direction DRAFT → ACCEPTED. Allineata con zero-cost-asset-policy (no freelance).

- Title: canonical "ambient organic + percussive"
- Roadmap step 3 "audio designer freelance" → zero-cost (freesound + Bfxr/sfxr/Chiptone + OGA + Incompetech + Pixabay Music)
- Audio AI deferred: Suno/Udio RIAA lawsuits pending, fallback Beepbox
- Registry entry aggiunto (governance drift fix)

Q-OPEN chiuse: Q-OPEN-21 (stile musicale) + Q-OPEN-24 (SFX synth vs sampled).

## PR 3 — MVP slice playbook #1594

`docs/playtest/asset-mvp-slice-playbook.md` step-by-step 14h roadmap.

Target: P0 palette + P0 20 icon + P1 3 biomi (savana/caverna/foresta_acida).

Breakdown:

- P0.1 Palette master .ase 3h (user Libresprite)
- P0.2 20+ UI icon Game-icons.net CC-BY 2h
- P1.1 Savana tileset Kenney 2h
- P1.2 Caverna Kenney+PixelFrog 2h
- P1.3 Foresta_acida OGA + AI Retro Diffusion 4h
- P1.4 Validation styleguide_lint.py 1h

Risk mitigation 6 categorie + execution log template.

## Gap #2 Audio status

- **Pre-M3.8**: GDD audit gap #2 = DRAFT (blocked audio lead freelance)
- **Post-M3.8**: SPEC-COMPLETE + PIPELINE-READY (zero-cost, deferred post-MVP visuale)

## Q-OPEN update

| Q-OPEN                           | Status pre-M3.8  | Status post-M3.8                                     |
| -------------------------------- | ---------------- | ---------------------------------------------------- |
| Q-OPEN-21 (stile musicale)       | 🔴 BLOCKED audio | ✅ ambient organic + percussive                      |
| Q-OPEN-24 (SFX synth vs sampled) | 🔴 BLOCKED audio | ✅ ibrido sampled primary + Web Audio synth fallback |

## Memo guardrail rispettati

- Regola 50 righe: tutti PR docs only, zero code
- Nessun file in `.github/workflows/`, `migrations/`, `services/generation/`, `packages/contracts/`
- Nessuna dipendenza npm/pip nuova
- 3 sub-commit con branch switch bug → recovery via cherry-pick (pattern memorizzato)

## Follow-up FU-M3.8

| ID  | Task                                                    | Blocker       | Priorità |
| --- | ------------------------------------------------------- | ------------- | :------: |
| A   | Palette master `.ase` (user hands-on Libresprite)       | User tempo    |    🟢    |
| B   | MVP slice P0+P1 (14h, playbook pronto)                  | User hands-on |    🟢    |
| C   | Audio SFX cue list + ambient brief (ADR §step 1+2 text) | User tempo    |    🟡    |
| D   | Audit next scheduled 2026-07-18 (90gg)                  | -             |    ⚪    |

## Pattern tecnici acquisiti

1. **WebFetch + WebSearch combinati**: verify SaaS ToS current tramite multiple source cross-check
2. **ADR DRAFT → ACCEPTED batch**: pattern ripetuto (art direction M3.6, audio direction M3.8)
3. **Branch switch bug recovery**: cherry-pick `git commit` quando finisce su wrong branch, poi amend con file missing
4. **Playbook canonical per user hands-on**: step-by-step 14h con commit messages + naming convention + CLI snippet = riproducibile
5. **Audit log separato (reports/)**: verifica periodica 90gg tracked separato da canonical docs per preservare history snapshot

## Memory da aggiornare

- `project_sprint_m3_8_fu_actionable.md` (nuovo)
- MEMORY.md index (append)

## Critical path MVP (aggiornato post-M3.8)

**Art direction**: PIPELINE-READY (zero-cost + playbook 14h)
**Audio direction**: SPEC-COMPLETE + PIPELINE-READY (zero-cost, deferred post-MVP visuale)
**Asset commission**: N/A (vincolo team solo-dev)
**Next actionable user task**: P0.1 palette master `.ase` 3h

## Riferimenti

- `docs/playtest/asset-mvp-slice-playbook.md` — step-by-step canonical
- `docs/adr/ADR-2026-04-18-audio-direction-placeholder.md` (ACCEPTED)
- `reports/asset_sourcing_audit_2026-04-18.md` — audit log
- `docs/core/43-ASSET-SOURCING.md` — pipeline canonical
- Research sessione M3.7 (40+ URL verificati)
