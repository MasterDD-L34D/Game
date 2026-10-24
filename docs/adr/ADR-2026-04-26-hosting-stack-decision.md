---
title: 'ADR 2026-04-26 — Hosting stack decision: Render (pilot) + Cloudflare Pages + Durable Objects (M14)'
workstream: cross-cutting
category: adr
status: superseded
superseded_by:
  - docs/adr/ADR-2026-04-29-pivot-godot-immediate.md
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
owner: master-dd
created: 2026-04-26
last_verified: 2026-05-06
tags:
  - adr
  - hosting
  - deploy
  - render
  - cloudflare
  - m11
  - m14
  - superseded
related:
  - docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md
  - docs/adr/ADR-2026-04-29-pivot-godot-immediate.md
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/playtest/2026-04-26-demo-one-command.md
---

> ⚠️ **SUPERSEDED 2026-05-06** — Pivot Godot v2 (ADR-2026-04-29) + cutover Fase 3 STAGED canary (ADR-2026-05-05 PROPOSED) hanno spostato production target da `apps/play/` web stack a `Game-Godot-v2` HTML5 export + Cloudflared Quick Tunnel. TKT-M11B-06 playtest userland mai eseguito su CF Pages + Render. Config infra **rimossi 2026-05-06** in stesso PR: `wrangler.toml`, `render.yaml`, `scripts/deploy-min.sh`, `tests/scripts/deploy-min-bundle.test.js`. ADR mantenuto come historical record. `apps/play/` source TREE-INTACT (frontend Game/ ancora attivo per Spike POC + wave-3 UI + phone smoke), solo deploy bundle Min infra deprecato. Re-add cost ~20 min se Godot cutover regredisce + serve fallback web stack.

# ADR 2026-04-26 — Hosting stack co-op online

Decisione infra dopo research approfondito free-tier 2026. Filosofia applicata: `02_LIBRARY/01_Foundation_and_System.md` (Reference→Adattamento→Workflow) + `06_OpenCode_Ollama_Local_Cloud_Workflow.md` ("Locale prima. Cloud dopo. Cloud solo se porta valore reale").

## Contesto

TKT-M11B-06 playtest live richiede URL stabile 24/7. ngrok tunnel laptop-host è demo-only. Vincoli user:

1. **Budget**: free tier obbligatorio
2. **Persistenza**: scelta migliore ("se serve")
3. **Mobile**: desktop-first, PWA dopo
4. **Dominio**: subdomain provider OK

## Verità first principles

- **Verità gioco**: 1 host + 4-8 amici room live → 1 nodo logico per room
- **Verità sistema**: WS long-lived + state in-memory → NO serverless stateless (Vercel fn, Lambda)
- **Verità repo**: `LobbyService` class isomorfa a DurableObject → migration path pulita futura

## Opzioni considerate (research 2026-04-26)

| Provider                       | Free perpetual? | WS  | Verdict                                          |
| ------------------------------ | :-------------: | :-: | ------------------------------------------------ |
| Fly.io                         |       ❌        | ✅  | Trial 7gg only (rimosso 2024-10)                 |
| Railway                        |       ❌        | ✅  | $5/mese minimo post trial 30gg                   |
| Koyeb                          |       ⚠️        | ✅  | Starter $0 ma no always-on senza Pro $29         |
| **Render**                     |       ✅        | ✅  | Free + WS msg mantengono alive (Feb 2026 update) |
| **Cloudflare Durable Objects** |       ✅        | ✅  | 100k req/day + WS hibernation + no cold start    |
| **Cloudflare Pages** (FE)      |       ✅        | N/A | Unlimited bandwidth, 500 builds/mese             |

Sources: vedi `docs/planning/2026-04-26-hosting-research-brief.md`.

## Decisione

**Stack pilot (M11 close)**:

- **Frontend**: **Cloudflare Pages** — free perpetual, unlimited bandwidth, CDN globale, zero ops
- **Backend**: **Render free web service** — Express+ws zero refactor, Feb 2026 WS keepalive fix

**Stack M14 long-term (pianificato)**:

- **Backend**: **Cloudflare Durable Objects** (wrapper PartyKit o native) — LobbyService→DO naturale, zero cold start, scaling automatico, natural sharding per-room
- Trigger: dopo 1-2 playtest userland reali che validano design. Evita rewrite premature.

## Invarianti

1. **Free perpetual** (M11): zero credit-card required, zero scadenza
2. **WS-first backend**: WS upgrade deve rimanere long-lived, no serverless stateless
3. **Reversibilità**: path back a laptop+ngrok in <5 min (revert render.yaml)
4. **Opt-in cloud**: build locale + dev locale invariati (Vite dev + `npm run demo`)

## Deployment architettura

```
┌─ Player phone ─────┐     ┌─ Player phone ─────┐
│ browser → HTTPS   │     │ browser → HTTPS   │
└──────┬──────────────┘     └──────┬──────────────┘
       │                           │
       ▼                           ▼
  CDN Cloudflare Pages (apps/play/dist)
  https://evo-play.pages.dev
       │ static HTML/JS/CSS
       │ runtime-config.js → ws URL
       ▼
  WSS wss://evo-backend.onrender.com/ws
       ↕ WebSocket upgrade (shared HTTP+WS)
  ┌──────────────────────────────────┐
  │ Render free web service          │
  │ Node 22 + Express + ws           │
  │ LobbyService in-memory           │
  │ LOBBY_WS_SHARED=true             │
  │ LOBBY_PRISMA_ENABLED=false (M11) │
  └──────────────────────────────────┘
```

## Limiti noti Render free tier

- **Cold start 30-60s** primo request dopo 15 min inattività (mitigazione: WS msg keepalive, Feb 2026 update — pingare TV ogni 10min basta)
- **512MB RAM** — sufficiente per LobbyService + 10 rooms × 8 player
- **Spin-down** preserva durata build artifact, ma stato in-memory perso. `LOBBY_PRISMA_ENABLED=true` + Postgres free (Neon) se serve recovery. M11 scope = no persist.

## Mobile/PWA readiness (deferred M12)

Desktop-first ora. Mobile checklist pre-beta:

- [ ] `manifest.json` + icons per add-to-home
- [ ] Service worker cache static assets
- [ ] `<meta viewport>` + touch targets ≥48px
- [ ] iOS Safari WS gotcha (background tab kill WS) — reconnect backoff già copre

## Rollback

| Layer      | Rollback                                                             |
| ---------- | -------------------------------------------------------------------- |
| Frontend   | Revert CF Pages deploy → precedente commit via git push              |
| Backend    | Revert Render deploy via dashboard 1-click / `fly.toml` non presente |
| Full stack | `npm run demo` + `ngrok http 3334` → back a laptop self-host         |

## Riferimenti

- Research brief: `docs/planning/2026-04-26-hosting-research-brief.md`
- Playbook deploy: `docs/playtest/2026-04-26-deploy-render-cf-pages.md`
- Filosofia sorgente: `C:\Users\VGit\Desktop\Archivio_Libreria_Operativa_Progetti\02_LIBRARY\01_Foundation_and_System.md` + `06_OpenCode_Ollama_Local_Cloud_Workflow.md`
