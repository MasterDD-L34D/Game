---
title: Deploy Min — checklist operativa Sprint C backbone bundle
doc_status: draft
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-04-27
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/research/2026-04-27-backbone-online-deploy-roadmap.md
  - docs/adr/ADR-2026-04-26-hosting-stack-decision.md
  - docs/playtest/2026-04-26-deploy-render-cf-pages.md
---

# Deploy Min — checklist operativa Sprint C backbone bundle

> **Stato bundle**: BUNDLE READY — eseguire `bash scripts/deploy-min.sh` con credenziali utente per attivare. Questo PR NON deploya nulla.

Roadmap reference: [`docs/research/2026-04-27-backbone-online-deploy-roadmap.md`](../research/2026-04-27-backbone-online-deploy-roadmap.md) — Opzione B "Min ora".

Stack target:

- **Backend**: Render free web service (Frankfurt, Node 22.19.0)
- **Frontend**: Cloudflare Pages free (`apps/play/dist`)
- **Persistence**: in-memory (`LOBBY_PRISMA_ENABLED=false`)
- **WS**: shared mode (`LOBBY_WS_SHARED=true`, no second public port)
- **Costo**: $0 (free tier entrambi)

---

## §1 Pre-deploy (one-time setup, ~2h)

### Account + credenziali

- [ ] Account Render free creato (https://render.com → Sign up + GitHub OAuth)
- [ ] Account Cloudflare creato (https://cloudflare.com → Sign up)
- [ ] CF Pages project initial scaffolded (`evo-tactics-play`)
- [ ] Render API key generato → Account Settings → API Keys → Create
- [ ] Render service ID noto (URL service: `https://dashboard.render.com/web/srv-XXXXXXXXX`)
- [ ] CF API token generato (Account → API Tokens → "Edit Cloudflare Pages" template) **OPPURE** `wrangler login` OAuth flow eseguito una volta
- [ ] Tool installati: `gh`, `wrangler`, `curl`, `node 22+`, `npm`

### Secret in canonical path

CRITICO: NESSUN secret in repo `.env*`. Tutti in `~/.config/api-keys/keys.env`.

```bash
mkdir -p ~/.config/api-keys
cat >> ~/.config/api-keys/keys.env <<'EOF'
export RENDER_API_KEY=rnd_xxxxxxxxxxxxxxxxxxxxxxxxxx
export RENDER_SERVICE_ID=srv-xxxxxxxxxxxxxxxxxxxx
export RENDER_BACKEND_HOST=evo-tactics-backend.onrender.com
export CLOUDFLARE_API_TOKEN=cf_xxxxxxxxxxxxxxxxxxxxxxxx
EOF
chmod 600 ~/.config/api-keys/keys.env
```

- [ ] `~/.config/api-keys/keys.env` esiste, perms 600
- [ ] `RENDER_API_KEY` valid (probe: `curl -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/services` ritorna JSON)
- [ ] `RENDER_BACKEND_HOST` matched al service Render (es. `evo-tactics-backend.onrender.com`)

### Render dashboard env vars (popolati manualmente UNA VOLTA)

`render.yaml` dichiara solo env var SAFE. Secret + override CORS → dashboard service → Environment.

Lista **richiesta** (block deploy se mancante):

| Var           | Valore                               | Note                                           |
| ------------- | ------------------------------------ | ---------------------------------------------- |
| `CORS_ORIGIN` | `https://evo-tactics-play.pages.dev` | Override `*` default. Whitelist single origin. |

Lista **opzionale** (default OK per Min):

| Var                                  | Default | Override scenario                                           |
| ------------------------------------ | ------- | ----------------------------------------------------------- |
| `AUTH_SECRET`                        | (none)  | Solo Mod scenario quando JWT enable                         |
| `DATABASE_URL`                       | (none)  | Solo Mod (Postgres Neon free → `LOBBY_PRISMA_ENABLED=true`) |
| `MUTATION_MP_ENFORCE`                | `true`  | `false` per disabilitare MP gating mutations                |
| `MP_POOL_MAX`                        | `30`    | Pool max global MP                                          |
| `IDEA_ENGINE_DISABLE_STATUS_REFRESH` | `1`     | Già impostato in render.yaml                                |
| `MBTI_REVEAL_THRESHOLD`              | (none)  | Threshold soft-reveal MBTI surface                          |
| `VC_AXES_ITER`                       | (none)  | Calibration iter mode 1/2                                   |
| `SKIV_WEBHOOK_SECRET`                | (none)  | Solo se webhook Skiv attivo                                 |

Audit completo env vars: vedi §6 sotto.

- [ ] `CORS_ORIGIN` settato in Render dashboard a CF Pages URL effettivo

---

## §2 Deploy (singolo comando, ~5-8min build + deploy)

```bash
bash scripts/deploy-min.sh
```

Lo script esegue:

1. Preflight (gh auth, wrangler, RENDER_API_KEY, anti-pattern guards)
2. `npm --prefix apps/play install && run build`
3. Inietta `runtime-config.production.js` → `apps/play/dist/runtime-config.js` con `RENDER_BACKEND_HOST` sostituito
4. `wrangler pages deploy apps/play/dist --project-name=evo-tactics-play`
5. `curl POST https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys` (stamp redeploy)
6. Smoke probe `/api/health` con 30s retry (15 attempt × 2s)
7. Print URL pubblici finali

**Dry-run** (skip steps 3-6, solo build + preflight):

```bash
DRY_RUN=1 bash scripts/deploy-min.sh
```

- [ ] Script eseguito senza FAIL
- [ ] CF Pages deploy mostra URL `https://<deployment-hash>.evo-tactics-play.pages.dev`
- [ ] Render API ritorna `{"id": "dep-..."}` (deploy stamped)
- [ ] Health probe ritorna 200 entro 30s

---

## §3 Post-deploy verifica (~10-15min smoke)

### Backend smoke

- [ ] `curl https://$RENDER_BACKEND_HOST/api/health` → `200 {"status":"ok",...}`
- [ ] `curl -X POST https://$RENDER_BACKEND_HOST/api/lobby/create` → `200 {"code":"XXXX","host_token":"..."}` (4-letter code consonanti)
- [ ] `curl https://$RENDER_BACKEND_HOST/api/lobby/state?code=XXXX` → snapshot room

### WebSocket smoke

```bash
# install wscat: npm i -g wscat
wscat -c "wss://$RENDER_BACKEND_HOST/ws?code=XXXX&token=$HOST_TOKEN&role=host"
# expect: { "type": "hello", ... }
```

- [ ] WS handshake OK, riceve `hello` event
- [ ] Heartbeat ping/pong ogni 30s

### Frontend smoke (browser)

- [ ] Apri `https://evo-tactics-play.pages.dev/lobby.html` → vedi UI lobby picker
- [ ] Inserire code 4-letter → connect → entrare in lobby
- [ ] DevTools console: zero error, WS connect aperto a `wss://$RENDER_BACKEND_HOST/ws`
- [ ] Tab 2 incognito → join stesso code → vedere player conta a 2

### Smoke playtest 2-player remoto

- [ ] Share URL CF Pages a 1 amico via Discord/Telegram
- [ ] Amico apre lobby.html → join code → lobby ha 2 player
- [ ] Inizia round → action → host vede world update → amico vede update
- [ ] 5 round completi senza disconnect

---

## §4 Rollback (se deploy rotto)

### Frontend rollback (CF Pages)

```bash
wrangler pages deployment list --project-name=evo-tactics-play
# copia ID deployment precedente working
wrangler pages deployment activate <DEPLOYMENT_ID> --project-name=evo-tactics-play
```

- [ ] Rollback CF Pages eseguito → URL serve versione previous
- [ ] Smoke `lobby.html` post-rollback OK

### Backend rollback (Render)

Via dashboard:

1. https://dashboard.render.com/web/srv-XXX → Events tab
2. Click "Rollback to this deploy" sul deploy precedente
3. Conferma

Via API (alternativa):

```bash
PREV_DEPLOY_ID="dep-xxxxxxxxxxxx"  # da Events tab dashboard
curl -X POST "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys/$PREV_DEPLOY_ID/rollback" \
  -H "Authorization: Bearer $RENDER_API_KEY"
```

- [ ] Rollback Render eseguito
- [ ] `/api/health` 200 post-rollback

### Path back ngrok (full revert)

Se entrambi cloud rotti, fallback locale:

```bash
node scripts/run-demo-tunnel.cjs
```

- [ ] ngrok URL up
- [ ] Notifica playtester URL temporaneo

---

## §5 Anti-pattern guards (block list)

Dal roadmap §7 — applicati durante deploy script + dashboard config.

| Guard                                            | Dove enforced                           | Outcome se violato                          |
| ------------------------------------------------ | --------------------------------------- | ------------------------------------------- |
| Secret in repo `.env*`                           | `scripts/deploy-min.sh` warn            | Spostare a `~/.config/api-keys/keys.env`    |
| `RENDER_API_KEY` hardcoded                       | `scripts/deploy-min.sh` FAIL block      | Rimuovere prima di runare                   |
| `autoDeploy: true` in `render.yaml`              | `render.yaml` set `false` esplicito     | Push accidentale main = downtime cold start |
| `CORS_ORIGIN: '*'` in production                 | `render.yaml` `sync: false` placeholder | Popolare via dashboard a CF Pages URL       |
| `LOBBY_PRISMA_ENABLED=true` senza `DATABASE_URL` | `render.yaml` `false` default           | App crash al boot                           |
| `LOBBY_WS_PORT=3341` come second port pubblico   | `render.yaml` `LOBBY_WS_SHARED=true`    | Render free supporta 1 port solo            |

---

## §6 Audit env vars effettivi backend

Da grep `apps/backend/`. Default + ruolo per scenario Min.

### Required (block boot se mancanti O wrong)

Nessuno. Backend boot OK con defaults (in-memory, no auth, no Game-Database).

### Settati da render.yaml (scenario Min)

| Var                                  | Valore       | Ruolo                                                                                                        |
| ------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------ |
| `NODE_VERSION`                       | `22.19.0`    | Render runtime                                                                                               |
| `NODE_ENV`                           | `production` | Express prod mode                                                                                            |
| `PORT`                               | (auto)       | Render injects, default `3334`                                                                               |
| `HOST`                               | (default)    | `0.0.0.0`                                                                                                    |
| `LOBBY_WS_ENABLED`                   | `true`       | Abilita WS server                                                                                            |
| `LOBBY_WS_SHARED`                    | `true`       | WS attach a HTTP server stesso PORT                                                                          |
| `LOBBY_WS_PORT`                      | (ignore)     | `3341` default — irrilevante in shared mode                                                                  |
| `LOBBY_WS_HOST`                      | (default)    | Eredita HOST                                                                                                 |
| `LOBBY_PRISMA_ENABLED`               | `false`      | In-memory only (Min)                                                                                         |
| `GAME_DATABASE_ENABLED`              | `false`      | Set explicit false in Min (default ON post-OD-030 2026-05-14 — Min deploy doesn't run sibling Game-Database) |
| `IDEA_ENGINE_DISABLE_STATUS_REFRESH` | `1`          | Disable background status refresh                                                                            |

### Da popolare in dashboard (override render.yaml)

| Var           | Default              | Min override                                     |
| ------------- | -------------------- | ------------------------------------------------ |
| `CORS_ORIGIN` | `*` (codice default) | `https://evo-tactics-play.pages.dev` (whitelist) |

### Opzionali (default OK in Min)

| Var                                     | Default                        | Note                                      |
| --------------------------------------- | ------------------------------ | ----------------------------------------- |
| `DATABASE_URL`                          | (none)                         | Solo se `LOBBY_PRISMA_ENABLED=true` (Mod) |
| `AUTH_SECRET`                           | (none)                         | JWT off se assente (Min OK)               |
| `AUTH_AUDIENCE` `AUTH_ISSUER`           | (none)                         | JWT validation                            |
| `AUTH_ROLES_CLAIM`                      | `roles`                        | Claim path                                |
| `AUTH_USERID_CLAIM`                     | (none)                         | Custom                                    |
| `AUTH_CLOCK_TOLERANCE`                  | `0`                            | Sec                                       |
| `AUTH_TOKEN_MAX_AGE` `AUTH_MAX_AGE`     | (none)                         | Token TTL                                 |
| `AUTH_DEFAULT_ROLES`                    | (none)                         | Fallback roles                            |
| `TRAIT_EDITOR_TOKEN` `TRAITS_API_TOKEN` | (none)                         | Legacy bearer                             |
| `GAME_DATABASE_URL`                     | `http://localhost:3333`        | Solo se `GAME_DATABASE_ENABLED=true`      |
| `GAME_DATABASE_TIMEOUT_MS`              | (parsed)                       | HTTP timeout                              |
| `GAME_DATABASE_TTL_MS`                  | (parsed)                       | Cache TTL                                 |
| `MUTATION_MP_ENFORCE`                   | `true`                         | MP enforcement                            |
| `MP_POOL_MAX`                           | `30`                           | Pool max                                  |
| `MBTI_REVEAL_THRESHOLD`                 | (none)                         | Soft-reveal threshold                     |
| `VC_AXES_ITER`                          | (none)                         | Calibration mode `1` o `2`                |
| `CATALOG_INVALIDATE_TOKEN`              | (empty)                        | Catalog cache invalidate auth             |
| `PLAY_DIST_PATH`                        | (auto)                         | Override dist path                        |
| `IDEA_ENGINE_DB`                        | `data/idea_engine.db`          | NeDB path                                 |
| `PRISMA_LOG_QUERIES`                    | (none)                         | Verbose Prisma                            |
| `ORCHESTRATOR_AUTOCLOSE_MS`             | (none)                         | Test only                                 |
| `ORCHESTRATOR_METRICS_DISABLED`         | (none)                         | Disable metrics                           |
| `PYTHON`                                | `python3`                      | Python orchestrator path                  |
| `EVO_TACTICS_API_BASE`                  | `https://api.evo-tactics.dev/` | External API                              |
| `GAME_SPECIES_RESISTANCES_PATH`         | (auto)                         | Override resistances YAML                 |
| `NIDO_UNLOCKED`                         | `false`                        | Feature flag mating                       |
| `AUDIT_LOG_PATH`                        | (none)                         | Audit log destination                     |
| `SKIV_WEBHOOK_SECRET`                   | (none)                         | Skiv webhook auth                         |

Tot: ~36 env var distinct. **Per Min basta `CORS_ORIGIN` override.** Tutto il resto default OK.

---

## §7 Limiti scenario Min noti

- Cold start 30-60s primo request post 15min idle (mitigation: `curl warmup` 5min prima invito)
- State perso a Render restart (M11 in-memory only — accettabile per playtest 1 sessione)
- No rate limit → URL Discord pubblico = potenziale abuso (mitigation: invite-only canale privato)
- No log aggregation → bug invisibile post-mortem (Render logs solo dashboard tail)
- No custom domain (`*.onrender.com` lungo da condividere)

Upgrade path: scenario Mod (~7-10h aggiuntive) — vedi roadmap §3.

---

## §8 Bundle file map

File aggiunti/modificati Sprint C:

| File                                      | Tipo   | Note                                                        |
| ----------------------------------------- | ------ | ----------------------------------------------------------- |
| `render.yaml`                             | modify | `autoDeploy: false`, CORS placeholder, prisma generate      |
| `wrangler.toml`                           | modify | `[env.pages]` section + comment chiarisce routing           |
| `apps/play/runtime-config.production.js`  | new    | Template runtime config (sed `RENDER_BACKEND_HOST`)         |
| `scripts/deploy-min.sh`                   | new    | One-command orchestrator preflight + build + deploy + smoke |
| `docs/ops/deploy-min-checklist.md`        | new    | Questo documento                                            |
| `tests/scripts/deploy-min-bundle.test.js` | new    | Sintassi + frontmatter + YAML/TOML valid                    |

Zero behavior change `apps/backend/`. Zero schema change.
