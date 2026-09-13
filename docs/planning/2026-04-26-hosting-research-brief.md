---
title: 'Research brief — hosting free tier 2026 (Evo-Tactics M11 co-op)'
workstream: cross-cutting
category: research
status: complete
owner: master-dd
created: 2026-04-26
tags:
  - research
  - hosting
  - free-tier
  - m11
related:
  - docs/adr/ADR-2026-04-26-hosting-stack-decision.md
---

# Research brief — hosting WS backend + FE static (free tier 2026)

Compilato 2026-04-26 via WebSearch su docs ufficiali (fly.io, railway.com, koyeb.com, render.com, cloudflare.com). Conoscenza pre-cutoff integrata con docs live 2026.

## TL;DR

**Pilot M11**: Render free backend + Cloudflare Pages frontend. Zero refactor, zero budget.
**M14 long-term**: Cloudflare Durable Objects (via PartyKit wrapper). Zero cold start, natural sharding.

## Free tier reality 2026 — providers verificati

### ❌ Rimossi / no free perpetual

| Provider           | Stato                     | Note                                                     |
| ------------------ | ------------------------- | -------------------------------------------------------- |
| Fly.io             | Free tier rimosso 2024-10 | Solo trial 2 VM hour o 7gg. Pay-as-you-go post.          |
| Railway            | $5/mese minimo            | Trial 30gg con $5 credit, poi Hobby $5/mese obbligatorio |
| Heroku             | Free rimosso 2022         | —                                                        |
| Glitch             | Free rimosso 2025 mid     | Progetti as-hosting deprecati                            |
| Deta Space         | Shutdown 2024 end         | —                                                        |
| Replit Deployments | No free 2024+             | —                                                        |

### ⚠️ Free con condizioni critiche

| Provider     | Free tier   | Gotcha M11                                     |
| ------------ | ----------- | ---------------------------------------------- |
| Koyeb        | Starter $0  | 1 service max, no always-on senza Pro $29/mese |
| Adaptable.io | Sì          | Sconosciuto WS track record, audit separato    |
| Northflank   | Sandbox dev | Limiti RAM/CPU stringenti verifica             |
| Zeabur       | Sì          | Regione Asia, latency EU peggiore              |

### ✅ Free perpetual con WS OK

| Provider                       | Free limits                           | WS verdict                                      |
| ------------------------------ | ------------------------------------- | ----------------------------------------------- |
| **Render** (web service)       | 512MB RAM, 750h/mese, spin-down 15min | **WS msg keepalive Feb 2026** → OK 1-3h session |
| **Cloudflare Workers + DO**    | 100k req/day, 1GB SQLite DO           | **Zero cold start + hibernation API** → optimal |
| **Cloudflare Pages** (FE only) | Unlimited bandwidth, 500 builds/mese  | Non applicabile WS backend                      |

## Deep dive Render free

- Plan Free: $0/mese, 512MB RAM, 0.1 CPU, 100GB egress
- Spin-down: dopo **15 min senza traffic** (HTTP **e** WS msg — fix Feb 2026)
- Cold start: 30-60s primo request post-spin
- Build: 500 min/mese
- Region: Frankfurt + Oregon + Singapore disponibili
- WS: supportato nativo, no config extra richiesta

**Gotcha mitigato**: prima di Feb 2026, solo HTTP teneva alive → WS cadevano mid-session. Ora WS msg bastano. Per playtest 1-3h = sicuro se activity continua.

Workaround extra robustezza: UptimeRobot ping `/api/lobby/state` ogni 5min gratis.

## Deep dive Cloudflare Durable Objects

- **Free tier**: 100k requests/day + 1GB SQLite storage/DO
- **WS**: `state.acceptWebSocket()` API + hibernation → duration charges evitate post-handler
- **Pricing ratio 20:1** messaggi WS→request billing
- **Natural sharding**: 1 room = 1 DO istanza → no shared state across rooms
- **State persistence**: SQLite built-in, survive restart automaticamente

PartyKit (acquisita CF 2024-04) fornisce wrapper ergonomico: `room.ts` class con lifecycle API.

**Effort migrazione M14**: ~4-6h per riscrivere `LobbyService` → DO, route `/api/lobby/*` → Worker routes. Tests esistenti restano validi (shape API preservata).

## Frontend free tier

| Provider             | Bandwidth  | Builds        | Custom domain   | Verdict                          |
| -------------------- | ---------- | ------------- | --------------- | -------------------------------- |
| **Cloudflare Pages** | Unlimited  | 500/mese      | 100/project     | **Raccomandato**                 |
| Vercel               | 100GB/mese | 6000 min/mese | 100/project     | Buon second-best, CDN US-centric |
| Netlify              | 100GB/mese | 300 min/mese  | Unlimited       | Build minutes limitati           |
| GitHub Pages         | 100GB soft | No CI         | 1 custom domain | SPA routing con limiti           |

## Decision matrix

| Criterio          | Render+Pages (A) | DO+Pages (B) |
| ----------------- | :--------------: | :----------: |
| Effort deploy (h) |        2         |      5       |
| Zero refactor     |        ✅        |      ❌      |
| Zero cold start   |        ❌        |      ✅      |
| Scale natural     |        ⚠️        |      ✅      |
| Rollback easy     |        ✅        |      ⚠️      |
| Free perpetual    |        ✅        |      ✅      |

## Sorgenti verificate 2026-04-26

- Fly.io pricing: https://fly.io/docs/about/pricing/
- Fly.io community free plan: https://community.fly.io/t/free-plan-clarification/18661
- Railway pricing: https://railway.com/pricing + https://docs.railway.com/reference/pricing/free-trial
- Koyeb pricing FAQ: https://www.koyeb.com/docs/faqs/pricing
- Render WebSockets: https://render.com/docs/websocket
- Render WS keepalive changelog Feb 2026: https://render.com/changelog/free-web-services-now-remain-active-while-receiving-websocket-messages
- Render free: https://render.com/docs/free
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Durable Objects pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Durable Objects WS: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Cloudflare acquires PartyKit: https://blog.cloudflare.com/cloudflare-acquires-partykit/
- PartyKit for Workers: https://github.com/cloudflare/partykit

## Next steps

1. ~~Deploy Render backend via `render.yaml`~~ → PR aperta
2. ~~Deploy CF Pages frontend via dashboard~~ → PR aperta
3. Smoke test live URL stabile
4. Playtest userland 4 amici → chiude P5 🟢 definitivo
5. M14: rewrite DO dopo 1-2 playtest validation
