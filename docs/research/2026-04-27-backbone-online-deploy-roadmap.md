---
title: 'Backbone online deploy roadmap — playtest live remoto Evo-Tactics'
workstream: cross-cutting
category: research
status: draft
owner: master-dd
created: 2026-04-27
tags:
  - research
  - deploy
  - hosting
  - backbone
  - playtest
  - render
  - cloudflare
  - postgres
  - websocket
  - m11
related:
  - docs/adr/ADR-2026-04-26-hosting-stack-decision.md
  - docs/playtest/2026-04-26-deploy-render-cf-pages.md
  - docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md
---

# Backbone online deploy roadmap — playtest live remoto Evo-Tactics

User direction 2026-04-26: _"per fare playtest serve prima tutto il backbone del sistema online"_. Audit di cosa esiste, cosa manca, 3 scenari deploy con effort/risk, decisione user, quick-start e anti-pattern guard.

> **Caveman scope**: tutto su Render free + CF Pages free, primo player click in 1 sessione. Stop "ship and pray".

---

## §1 Stato corrente

### Artefatti già esistenti (verified via filesystem read)

| Asset                                                      | Stato              | Note                                                                                          |
| ---------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| `docs/adr/ADR-2026-04-26-hosting-stack-decision.md`        | ✅ accepted        | Decisione: Render (BE pilot) + CF Pages (FE) + DurableObjects M14                             |
| `docs/playtest/2026-04-26-deploy-render-cf-pages.md`       | ✅ draft (175 LOC) | Playbook step-by-step Render+CF setup                                                         |
| `render.yaml` (root)                                       | ✅ shipped         | Blueprint Render: web service Frankfurt, Node 22.19.0, build `npm ci --include=dev`, 7 envvar |
| `wrangler.toml` (root)                                     | ✅ shipped         | CF Workers Assets static, SPA fallback `apps/play/dist`                                       |
| Backend WS shared mode (`apps/backend/index.js:42-73`)     | ✅ live            | `LOBBY_WS_SHARED=true` attach WS al server HTTP esistente                                     |
| Demo runner local (`scripts/run-demo.cjs`, `*-tunnel.cjs`) | ✅ shipped         | One-command playtest laptop+ngrok                                                             |
| AJV registry contracts (`apps/backend/app.js`)             | ✅ live            | Schema validation runtime cross-payload                                                       |
| Prisma schema (`apps/backend/prisma/schema.prisma`)        | ✅ esiste          | Migrations in repo, `LOBBY_PRISMA_ENABLED=false` di default                                   |
| `.env.example`                                             | ✅ shipped         | Solo dev local stack (Postgres docker), zero deploy/secret                                    |

### Gap già flagged in ADR/playbook

- Cold start 15min idle → mitigation playbook (UptimeRobot ping)
- M11 scope = no persist (Prisma OFF) → snapshot perso a restart
- Mobile/PWA deferred a M12 (manifest, SW, viewport)
- Path back ngrok preservato (revert render.yaml)

### Non ancora coperto dai docs (audit gap reale)

- **No JWT/AUTH secret rotazione**: `apps/backend/utils/jwt.js` legge `AUTH_SECRET` ma nessun playbook generation/storage
- **No `express-rate-limit` middleware** wired (verified grep): backend pubblico senza throttle = vulnerable
- **No log aggregation**: Render logs solo dashboard tail, nessun export
- **No health endpoint dedicato** (usa `/api/lobby/state` come healthcheck — accettabile ma non standard)
- **No DNS/dominio custom** — solo `*.onrender.com` + `*.pages.dev` provider subdomain
- **No DB free tier istruzioni** (Neon/Supabase/Render Postgres) per quando `LOBBY_PRISMA_ENABLED=true`
- **No CORS hardening** (`CORS_ORIGIN=*` default, OK demo NON OK prod)
- **No multi-instance WS strategy**: 1 Render dyno = sticky implicit, ma >1 dyno richiede Redis pub/sub o Durable Objects
- **No frontend asset cache headers** (CF Pages default OK ma `_headers` file assente)

---

## §2 Gap analysis "cosa manca per playtest live remoto"

Tabella dei gap concreti per partire da zero a "4-8 amici giocano via URL pubblico":

| #   | Area                     | Gap                                                                    | Impatto playtest                                        | Scenario gating |
| --- | ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------- | :-------------: |
| 1   | DNS/dominio              | Subdomain provider OK per pilot, no custom                             | Link lunghi `*.onrender.com` — meh ma OK demo           |       Mod       |
| 2   | Persistence              | NeDB local + `LOBBY_PRISMA_ENABLED=false`                              | Restart Render = lobby/room/state perso                 |       Mod       |
| 3   | Secrets management       | No `~/.config/api-keys/keys.env` integration prod                      | Render env var inseriti via dashboard — manuale         |       Min       |
| 4   | WS scalability           | 1 instance only, no sticky session config                              | Render free = 1 dyno automatico → OK fino ~50 player    |      Full       |
| 5   | Frontend CDN             | CF Pages default cache, no `_headers` tuning                           | Default OK 90% casi                                     |      Full       |
| 6   | Health check             | Healthcheck su `/api/lobby/state` (non dedicato)                       | Render usa per restart automatico, OK pratico           |       Min       |
| 7   | Monitoring               | No Sentry, no Grafana, solo Render log tail                            | Bug runtime invisibile post-deploy                      |       Mod       |
| 8   | Rate limit / DoS         | Zero middleware throttle wired                                         | Backend pubblico vulnerabile a script kiddie / bot      |       Mod       |
| 9   | Session persist x-deploy | Prisma adapter `formSessionStore` esiste ma room/lobby NO              | Refresh playtest mid-game = state lost                  |      Full       |
| 10  | Logs aggregation         | Render dashboard tail, no export                                       | Postmortem incident difficile                           |      Full       |
| 11  | ngrok deprecation        | `scripts/run-demo-tunnel.cjs` resta come fallback                      | OK come safety net, deprecato post first cloud playtest |       Min       |
| 12  | CORS hardening           | `*` wildcard prod = browser policy violation seria nelle WS auth flows | Pre-beta tighten obbligatorio                           |       Mod       |
| 13  | Auth secret JWT          | `AUTH_SECRET` env var richiesto ma no rotation playbook                | Demo OK auth-disabled, prod richiede gen+rotate         |       Mod       |

**Top 3 blocking per playtest Min**: #2 (persistence) accettabile se playtest = 1 sessione lunga senza Render restart. #6 OK pratico. #11 OK fallback. → **Min scenario è giocabile oggi**.

**Top 3 blocking per Stable**: #2, #7, #12 obbligatori. Effort ~5-7h aggregato.

---

## §3 Tre scenari deploy

### Scenario Min — "MVP playtest 1 sessione" (~3-5h)

**Obiettivo**: 4 amici premono link, giocano 1-2h, raccolgono telemetry, log a mano. Sufficiente per validare flow co-op end-to-end remoto prima di investire altro.

**Stack**:

- **Backend**: Render free web service (Frankfurt, Node 22.19.0)
  - Build: `npm ci --include=dev && npm run play:build`
  - Start: `node apps/backend/index.js`
  - WS shared mode `LOBBY_WS_SHARED=true` (no second port)
  - In-memory only (`LOBBY_PRISMA_ENABLED=false`)
- **Frontend**: Cloudflare Pages free
  - Build: `npm ci && npm run play:build`
  - Output: `apps/play/dist`
  - Env: `VITE_LOBBY_WS_URL=wss://evo-tactics-backend.onrender.com/ws`
- **DNS**: `*.onrender.com` + `*.pages.dev` provider subdomain
- **Persistenza**: nessuna (room state perso a restart Render — accettabile per 1 sessione)
- **Auth**: disabled (`AUTH_SECRET` non settato → routes open per playtest invite-only)
- **CORS**: `*` wildcard (OK demo, vietato prod)
- **Player limit**: 4-8 reali (validato locale), pratico hard cap 10-15 (RAM 512MB Render free)
- **Cold start**: 30-60s primo request post 15min idle → mitigazione `curl warmup` 5min prima invito

**Pro**:

- Playbook esiste già (`docs/playtest/2026-04-26-deploy-render-cf-pages.md`)
- Zero CC required, zero scadenza trial
- Reversibilità <5 min: revert `render.yaml` → back a ngrok local

**Con**:

- Cold start visibile (primo player aspetta 30-60s)
- Stato room perso se Render redeploy/restart durante session
- No monitoring → bug invisibile post-mortem
- No rate limit → URL pubblicato su Discord = potenziale abuso
- `*.onrender.com` URL lungo da condividere

**Step-by-step (sintesi, dettagli §6)**:

1. Sign-up Render free + collega GitHub (5 min)
2. Render dashboard → New → Blueprint → seleziona repo → Apply (10 min, deploy auto)
3. Sign-up CF + collega GitHub (5 min)
4. CF Pages → Create → Pages → Connect → repo → build config + env (10 min)
5. Verifica curl `BE/api/lobby/state` + apri `FE/lobby.html` (5 min)
6. Smoke 2-tab incognito host+player WS connect (10 min)
7. Share URL Discord → playtest live (durata variabile)

**Effort**: ~3-5h prima sessione (account setup + 2 deploy + smoke test). Sessioni successive: zero overhead.

---

### Scenario Mod — "Stable playtest 4-8 player ricorrente" (~10-15h)

**Obiettivo**: playtest schedulati settimanalmente, log persistenti, room state preservato a restart, custom domain pulito, basic monitoring per triage bug.

**Stack** (delta vs Min):

- **Backend**: Render Standard plan **$7/mo** — 512MB→2GB RAM, no spin-down, autoscale opzionale
  - Persistent disk opzionale ($0.25/GB/mese) per logs JSONL
- **Postgres**: **Neon free tier** (3GB storage, 100h compute/mese) o **Render Postgres free 90gg trial**
  - `DATABASE_URL` set in Render env var
  - `LOBBY_PRISMA_ENABLED=true` + apply migration `0003_form_session_state.sql` + nuovo `0005_lobby_room_snapshot.sql` (da scrivere, ~50 LOC + 10 test)
  - Recovery flow: WS reconnect post-restart, ripristino state da snapshot Prisma
- **Frontend**: Cloudflare Pages (resta free)
- **DNS custom domain**: dominio `evotactics.gg` o equivalente (~$10/anno Cloudflare Registrar)
  - CF Pages: `play.evotactics.gg` → CNAME `evo-tactics.pages.dev`
  - Render: `api.evotactics.gg` → CNAME `evo-tactics-backend.onrender.com` (Render Standard plan supporta custom domain free)
- **CORS hardening**: `CORS_ORIGIN=https://play.evotactics.gg` (whitelist single origin)
- **Auth**: JWT abilitato. `AUTH_SECRET` generato (`openssl rand -base64 64`), salvato in `~/.config/api-keys/keys.env` locale + Render dashboard env var
  - Player invitati ricevono short-lived token (60min TTL) per join lobby
- **Rate limit**: aggiungi `express-rate-limit` middleware (~30 LOC + 3 test)
  - Cap default: 60 req/min per IP, 300 req/min per `/api/lobby/*`, 5 join/min per WS code
- **Monitoring**: UptimeRobot free (5min ping `/api/lobby/state`) + **Sentry free** (5k err/mo, integrazione `@sentry/node` ~20 LOC)
- **Logs**: Render Standard logs export → file rotation locale via `apps/backend/services/telemetry/jsonlSink.js` (~30 LOC, append a `data/logs/playtest-YYYY-MM-DD.jsonl`)

**Pro**:

- No cold start (Standard plan)
- Room state recovery cross-deploy
- URL share pulito (`play.evotactics.gg`)
- Bug visibili in Sentry → triage rapido
- Rate limit copre script abuse base

**Con**:

- Costo $7/mo + $10/anno dominio (~$94/anno totale)
- Nuovo Prisma adapter da scrivere + test (~3-4h)
- Sentry integration richiede DSN secret management
- Custom DNS propagation 1-24h prima setup
- Auth JWT richiede gestione token client-side (overlay invite link)

**Pro/Con vs Min**: Min OK per validare flow una volta. Mod necessario per loop playtest ricorrente. Salto Min→Mod evitabile solo se playtest restano 1-shot.

**Effort**: ~10-15h totale (5h Prisma adapter+test, 2h DNS+custom domain, 2h Sentry+rate limit middleware, 2h auth JWT pipeline, 2-4h smoke+troubleshooting).

---

### Scenario Full — "Production-grade beta pubblica" (~30-40h)

**Obiettivo**: open beta, traffic non controllato, multi-region latency, error tracking SLO 99.5%, infrastructure-as-code, observability completa.

**Stack** (delta vs Mod):

- **Backend**: Cloudflare **Durable Objects** (rewrite via PartyKit pattern, ~10-15h effort dichiarato in ADR M14)
  - Migration `LobbyService` class → DO instance per room (naturale, già isomorfo)
  - Zero cold start, scaling automatico, sharding per-room geografico
  - WS hibernation = bassi costi anche con 1000 room idle
  - Prezzi: 100k req/giorno free, oltre $0.15/M req
- **Postgres**: **Render Postgres Standard $7/mo** (10GB storage, daily backup, 99.95% SLA) o **Neon Pro $19/mo** (point-in-time recovery)
- **Frontend CDN**: CF Pages default OK + tuning `_headers`:
  - `Cache-Control: public, max-age=31536000, immutable` su `/assets/*`
  - `Cache-Control: no-cache` su `index.html`, `lobby.html`, `runtime-config.js`
- **Sentry**: Team plan **$26/mo** (50k err/mo, performance monitoring, release tracking)
- **Grafana Cloud free** (10k metric series, 14gg retention) per dashboard custom
  - Backend `/metrics` endpoint Prometheus (`prom-client` lib, ~50 LOC)
  - Metric: `lobby_rooms_active`, `lobby_players_total`, `ws_connections`, `combat_actions_per_min`
- **Rate limit avanzato**: Cloudflare WAF rules (free tier 5 rules) + custom challenge per IP suspicious
- **Multi-region**: CF DO già edge-distributed. Render unica region per dyno (Frankfurt OK EU, US separate dyno opzionale)
- **CI/CD**: GitHub Actions auto-deploy on tag (workflow `deploy.yml` da scrivere, ~80 LOC)
- **Backup automated**: Postgres daily dump → S3-compatible (Cloudflare R2 10GB free), retention 30gg
- **DDoS guard**: CF Pro tier $20/mo include WAF managed rules + bot fight mode
- **Status page**: Cloudflare Workers + Hono ~100 LOC custom o `instatus.com` free tier

**Pro**:

- Production-ready open beta
- SLO 99.5%+ realistic
- Observability completa (logs + metrics + traces + errors)
- Cost-efficient sotto 1k DAU (Durable Objects scaling)
- Reversibile a livello stack (DO ↔ Render swap docu)

**Con**:

- Costo ~$60/mese baseline (Render Standard $7 + Postgres $7 + Sentry $26 + CF Pro $20)
- Effort iniziale 30-40h (rewrite DO + observability stack + CI/CD + DNS + WAF tuning)
- Skill gap: Durable Objects ha learning curve (DO API, Hono, Workers limits)
- Multi-region richiede gestione consistency cross-DO (no shared state automatic)
- Open beta = mod policy + community management overhead non-tech

**Quando ha senso**: solo dopo 5-10 playtest Mod-tier validano design + user growth >50 DAU. Premature optimization altrimenti.

**Effort**: ~30-40h spalmati su 2-3 sprint. Rewrite DO da solo è 10-15h (dichiarato ADR M14).

---

## §4 Decisione utente — 4 opzioni

Default raccomandato: **Opzione B (Min ora, Mod in 1 settimana)**.

### Opzione A — "Min subito, scopri se giocoso prima di investire"

- Effort: 3-5h sessione singola
- Ship: cloud URL Discord-shareable in giornata
- Gating: nessuno (zero CC, zero secret)
- Quando: per **questa settimana**, prima di committare effort Mod
- Rischio: cold start visibile + room state perso a restart → accettabile per primo playtest "validation"

### Opzione B — "Min ora, Mod entro 1 settimana se primo playtest funziona" ⭐ **DEFAULT**

- Effort: Min 3-5h subito + Mod ulteriori 7-10h dopo prima validation
- Ship: playtest #1 cloud entro 1 sessione, playtest #2-#5 stable cross-restart
- Gating: dominio `$10/anno` + Render Standard `$7/mo` post #1 OK
- Quando: percorso minimo-rischio massimo-validation
- Rischio: secondo playtest postpone se gap #2 (persistence) si rivela bloccante

### Opzione C — "Skip Min, vai diretto Mod"

- Effort: 10-15h prima sessione utile
- Ship: stable playtest in ~1 sprint, no playtest "throwaway"
- Gating: dominio + Render Standard + Postgres da deployare prima del primo invite
- Quando: se user vuole loop ricorrente immediato + no first-impression negativa cold start
- Rischio: spend $7/mo prima di sapere se playtest è giocoso

### Opzione D — "Aspetta Full, no playtest cloud finché production-ready"

- Effort: 30-40h pre-playtest
- Ship: nessun playtest cloud per 2-3 sprint
- Gating: tutto Mod + Sentry + CF DO + CI/CD
- Quando: SOLO se user vuole open beta diretta senza closed playtest (sconsigliato — viola Quality Gate Step 2 Ricerca)
- Rischio: 30-40h investiti su infra prima di sapere se gioco regge co-op live remoto. Anti-pattern.

### Dubbi player-friendly

1. **"Cold start 60s al primo player è bloccante?"** → No, mitigation = 5min prima invio invite, host fa `curl /api/lobby/state` per warmup. Restanti player hanno backend già warm.
2. **"Persistenza a restart serve davvero per playtest 2h?"** → No se Render Standard (no spin-down). Sì se Render Free e session >15min idle in mezzo.
3. **"Custom domain $10/anno necessario?"** → No, `*.pages.dev` URL share su Discord va bene per closed playtest invite-only.
4. **"Auth JWT obbligatorio?"** → No per Min (playtest invite-only via link share). Sì per Mod+ (link share via Discord = pubblico de facto).
5. **"Posso saltare Sentry?"** → Sì in Min. In Mod altamente raccomandato (cost 0$ free tier, integrazione 20 LOC).

---

## §5 Pre-requisiti per ogni scenario

### Scenario Min

| Cosa user fornisce            | Costo | Tempo setup |
| ----------------------------- | :---: | :---------: |
| Account GitHub (esistente)    |   0   |      0      |
| Account Render free (sign-up) |   0   |    5 min    |
| Account Cloudflare free       |   0   |    5 min    |
| Discord o equiv per share URL |   0   |      -      |

**Total**: 0 USD, 10 min account setup.

### Scenario Mod (delta su Min)

| Cosa user fornisce                      |  Costo   | Tempo setup |
| --------------------------------------- | :------: | :---------: |
| Render Standard plan upgrade ($7/mo CC) |  $7/mo   |   10 min    |
| Account Neon (Postgres) free            |    0     |   10 min    |
| Dominio (es. Cloudflare Registrar)      | $10/anno |   15 min    |
| Account Sentry free                     |    0     |   10 min    |
| UptimeRobot free                        |    0     |    5 min    |
| `~/.config/api-keys/keys.env` setup     |    0     |    5 min    |

**Total delta**: ~$94/anno, 1h account+DNS setup + 7-10h dev work (Prisma adapter, rate limit middleware, Sentry wire, custom domain DNS).

### Scenario Full (delta su Mod)

| Cosa user fornisce                                   |  Costo   | Tempo setup |
| ---------------------------------------------------- | :------: | :---------: |
| Cloudflare Pro plan ($20/mo) per WAF                 |  $20/mo  |   15 min    |
| Sentry Team plan ($26/mo) per 50k err/mo + perf      |  $26/mo  |      -      |
| Render Postgres Standard ($7/mo) o Neon Pro ($19/mo) | $7-19/mo |   10 min    |
| Cloudflare R2 storage account (free 10GB)            |    0     |   10 min    |
| Skill: lettura Cloudflare Workers/DO docs (~6h prep) |    0     |     6h      |

**Total delta**: ~$640-780/anno + 6h skill ramp + 20-30h dev work (DO rewrite, Grafana, CI/CD, WAF tuning, status page).

---

## §6 Quick-start checklist (Scenario Min)

Ordine sequenziale per attivare playtest cloud in 1 sessione (~3-5h totale, max 1 ora real-active dev). Spuntare via task tracker o local checklist.

### Pre-flight (5 min)

- [ ] **PR-merge gating**: verifica branch `main` ha `render.yaml` + `wrangler.toml` (oggi sì, verified)
- [ ] **Repo public/accessible**: Render+CF richiedono lettura repo (private OK con install GitHub App)
- [ ] **Test locale verde**: `npm run demo` boot OK + `curl localhost:3334/api/lobby/state` 200

### Setup Render backend (~20 min)

- [ ] Visita `https://render.com` → **Sign up with GitHub**
- [ ] Authorize Render GitHub App per `MasterDD-L34D/Game`
- [ ] Render dashboard → **New** → **Blueprint**
- [ ] Connect repository → seleziona `MasterDD-L34D/Game` → branch `main`
- [ ] Render auto-detect `render.yaml` → mostra preview service config
- [ ] Verifica preview: name=`evo-tactics-backend`, plan=Free, region=Frankfurt, build=`npm ci --include=dev && npm run play:build`, start=`node apps/backend/index.js`, health=`/api/lobby/state`
- [ ] Click **Apply** → primo deploy 3-5 min (watch logs tab)
- [ ] Copy URL Render assegnata: `https://evo-tactics-backend.onrender.com` (o variante)

### Verifica backend (~5 min)

```bash
export BE=https://evo-tactics-backend.onrender.com

curl -sf $BE/api/lobby/state                  # → {...} 200
curl -sf $BE/play/runtime-config.js | head    # → window.LOBBY_WS_SAME_ORIGIN=true;
curl -sfI $BE/play/lobby.html                 # → 200
```

Se uno fallisce → diagnostica via Render logs tab. Anti-pattern: NON debuggare a buio, leggi build/runtime log prima.

### Setup Cloudflare Pages frontend (~15 min)

- [ ] Visita `https://dash.cloudflare.com` → **Sign up** (no CC)
- [ ] Verify email
- [ ] Workers & Pages → **Create** → **Pages** → **Connect to Git**
- [ ] Authorize Cloudflare GitHub App per `MasterDD-L34D/Game`
- [ ] Seleziona repo → branch `main`
- [ ] Build config:
  - Framework preset: **None**
  - Build command: `npm ci && npm run play:build`
  - Build output directory: `apps/play/dist`
  - Root directory: `/`
- [ ] Add env var build-time:
  - `VITE_LOBBY_WS_URL` = `wss://evo-tactics-backend.onrender.com/ws` (sostituisci con URL reale Render)
  - `NODE_VERSION` = `22.19.0`
- [ ] Click **Save and Deploy** → primo deploy 2-3 min
- [ ] Copy URL Pages: `https://evo-tactics.pages.dev` (o variante)

### Verifica frontend (~5 min)

```bash
export FE=https://evo-tactics.pages.dev

curl -sfI $FE/lobby.html                  # → 200
```

Apri `$FE/lobby.html` browser → UI carica → click **Crea stanza** → DevTools Network tab → verifica `WS wss://evo-tactics-backend.onrender.com/ws?code=...` → status **101 Switching Protocols**.

### Smoke test live host+player (~15 min)

- [ ] Tab 1 (host): `$FE/lobby.html` → Crea stanza → ottieni codice 4-char (es. `KZNT`)
- [ ] Tab 2 incognito (player): `$FE/lobby.html` → Join → inserisci codice → entra
- [ ] Tab 1 → Click "Nuova sessione" → verifica state broadcast a Tab 2
- [ ] Tab 2 → overlay world appare → componi intent → invia
- [ ] Tab 1 console log: intent relay ricevuto
- [ ] Test reconnect: Tab 2 close → riapri lobby con stesso codice → verifica state replay

### Share amici (~5 min)

```
🎮 Evo-Tactics playtest live
🔗 https://evo-tactics.pages.dev/lobby.html
📋 Codice stanza: KZNT
⏰ Start: 21:00 CET
🧪 Feedback: thread #playtest-feedback
```

Discord/Telegram/SMS — share link + codice, 4-8 amici joinano. Nessun laptop locale acceso necessario.

### Post-playtest (~10 min)

- [ ] Render dashboard → Logs tab → copy log → save `data/logs/playtest-cloud-YYYY-MM-DD.log`
- [ ] Crea report `docs/playtest/YYYY-MM-DD-cloud-min-playtest-report.md` (frontmatter compliance)
- [ ] Memo `BACKLOG.md` con bug/findings discovered
- [ ] Decisione gate: continue Min per playtest #2 o upgrade Mod?

**Total tempo**: ~75 min real-active. Restanti 2-4h sono attesa deploy + smoke + share + playtest sessione.

---

## §7 Anti-pattern guard

**Cosa NON fare**, derivato da insight `/insights` 2026-04-25 + ADR exposure pattern reali.

### Sicurezza

- ❌ **NON committare `AUTH_SECRET` o `DATABASE_URL` in repo** (`.env`, `render.yaml`, hardcode). Sempre via Render dashboard env var manuale O `~/.config/api-keys/keys.env` exported. Hook `pre-edit-env-keys-guard.sh` blocca writes a `.env*` fuori canonical path.
- ❌ **NON pushare CORS `*` in production**. Anche scenario Min: tighten a `https://evo-tactics.pages.dev` post primo smoke. `*` è OK solo durante setup-debugging primi 30min.
- ❌ **NON share invite-link Discord in canale pubblico senza rate limit**. Min OK per server amici (~10 persone trusted). Pubblico = aggiungi `express-rate-limit` PRIMA.
- ❌ **NON rimuovere healthcheck endpoint `/api/lobby/state`** — Render lo usa per restart automatic. Rimuovi = service flapping.
- ❌ **NON espose port WS dedicato (`LOBBY_WS_PORT=3341`) a Render**. Render free supporta 1 port pubblico solo → usa `LOBBY_WS_SHARED=true` (default in `render.yaml`).

### Persistence

- ❌ **NON attivare `LOBBY_PRISMA_ENABLED=true` in Min senza Postgres connection-string**. App crash al boot. Lascia `false` finché Mod scenario.
- ❌ **NON committare `apps/backend/data/idea_engine.db` (NeDB)** — file local-only, in `.gitignore`. Render parte da NeDB vuoto.
- ❌ **NON usare SQLite file-based su Render free**. Spin-down + ephemeral filesystem = perso a restart. Postgres external Neon/Render obbligatorio per persist.

### Deploy hygiene

- ❌ **NON fare deploy Friday sera** prima di playtest weekend. Smoke deploy 24h prima minimo.
- ❌ **NON lasciare `autoDeploy: true` (default `render.yaml`) durante playtest live** — push accidentale = redeploy + downtime cold start. Disabilita su Render dashboard durante session live, riabilita dopo.
- ❌ **NON skippare smoke test post-deploy**. Build green ≠ runtime green (insight 2026-04-25 verify-before-claim-done). Hit `/api/lobby/state` + WS handshake prima di share invite.
- ❌ **NON dichiarare "deploy ok" senza aver provato 2-tab incognito host+player live flow**. Compile-only ≠ behavior verified.

### Costi

- ❌ **NON upgrade Render Standard $7/mo "tanto è poco" prima di validare Min**. Spend $84/anno preventivo prima di sapere se gioco regge cloud = waste.
- ❌ **NON attivare CF Pro $20/mo per "DDoS protection" preventiva**. CF free tier ha già DDoS automatic mitigation a livello L3/L4. Pro serve solo se WAF rule custom necessario (Full scenario).
- ❌ **NON pagare dominio premium**. `.gg` $30+/anno, `.com` $10/anno, `.dev` Cloudflare Registrar at-cost ~$10/anno. Subdomain free `*.pages.dev` per Min/Mod copre 90% casi.

### Observability

- ❌ **NON deploy senza log accessible**. Render free dashboard tail OK Min. Mod+ richiede log export O Sentry per triage post-mortem.
- ❌ **NON loggare PII player in plaintext** (email, IP raw). Hash o anonymize prima di append a JSONL/Sentry.
- ❌ **NON ignorare cold start timeout warning** Render free. Documenta in invite-link "primo player aspetta 30-60s, poi tutto warm".

### Schema/contracts

- ❌ **NON cambiare WS protocol (event names, payload shape) post-deploy senza version bump**. Client cached browser-side = mismatch silent failure. Bump `runtime-config.js` version o force-refresh `Cache-Control`.
- ❌ **NON skippare `npm run schema:lint` pre-deploy**. AJV registry runtime cross-payload può rompere se schema drift.

### Reversibility

- ❌ **NON cancellare `scripts/run-demo-tunnel.cjs`** post primo cloud playtest. Resta safety net se cloud down per maintenance / billing issue.
- ❌ **NON dimenticare path back ngrok documentato** in playbook `docs/playtest/2026-04-26-deploy-render-cf-pages.md` §Rollback. Se Render service flapping pre-playtest urgente → 5min revert a laptop+ngrok.

---

## Cross-reference

- ADR canonical: [`ADR-2026-04-26-hosting-stack-decision.md`](../adr/ADR-2026-04-26-hosting-stack-decision.md) — decisione stack accepted
- Playbook step-by-step: [`docs/playtest/2026-04-26-deploy-render-cf-pages.md`](../playtest/2026-04-26-deploy-render-cf-pages.md) — deploy Render + CF Pages dettagliato
- ADR M11 Phase A: [`ADR-2026-04-20-m11-jackbox-phase-a.md`](../adr/ADR-2026-04-20-m11-jackbox-phase-a.md) — beachhead WebSocket lobby
- TKT-M11B-06: playtest live execution (userland, unico bloccante umano, vedi sprint context CLAUDE.md)
- Memory: `feedback_workspace_audit_scope_lesson.md`, `feedback_data_grounded_expert_pattern.md` — anti-pattern hallucination + scope drift

## Esiti possibili decision gate user

1. **User sceglie A o B** → start Min scenario subito, follow §6 quick-start. Effort 3-5h primo playtest cloud entro 24h.
2. **User sceglie C** → schedule sprint dedicato 10-15h Mod scenario, definisci task ticket: T-MOD-01 Prisma room snapshot, T-MOD-02 rate-limit middleware, T-MOD-03 custom DNS, T-MOD-04 Sentry wire, T-MOD-05 auth JWT pipeline.
3. **User sceglie D** → blocca per discussione: D è anti-pattern (premature optimization 30-40h prima di validation co-op cloud). Surface concern prima di proceedere.
4. **User vuole hybrid** (es. Min senza CF Pages, solo Render full-stack) → fattibile, dettagli su richiesta. Render serve sia BE che FE assets via `apps/play/dist` static (già nel build).

> **Caveman closing**: Min oggi giocoso. Mod settimana prossima stable. Full quando user growth dimostra serve. Stop ship-and-pray.
