---
title: Cloudflare prod deploy execution guide — master-dd manual ops
doc_status: ready-for-execution
doc_owner: master-dd
workstream: ops-deploy
last_verified: 2026-05-14
language: it
related:
  - tools/deploy/deploy-quick.sh (Quick Tunnel — no domain, ephemeral)
  - Game-Godot-v2/tools/deploy/setup-once.sh (named tunnel one-time setup)
  - apps/backend/index.js GAME_DATABASE_ENABLED default ON (OD-030 post-#2261)
  - prisma/migrations/0010_godot_v2_campaign_states (D2-C, auto-deploys)
---

# Cloudflare prod deploy guide

Production deploy chain post ai-station wave 2026-05-14. Master-dd manual
execution required (Cloudflare auth + DNS + domain ownership gated).

## Pre-flight verification

```bash
# 1. Confirm latest main on both repos
cd /c/Users/VGit/Desktop/Game && git fetch && git log origin/main --oneline -5
cd /c/Users/VGit/Desktop/Game-Godot-v2 && git fetch && git log origin/main --oneline -5

# 2. Expected HEADs post-2026-05-14 wave:
#   Game/         484fef57 docs(audit): #2260 OR newer (Phase B3 + analyzer)
#   Game-Godot-v2 c2ca044  feat(ai-station): Phase B3 mirror OR newer

# 3. Verify cloudflared installed
which cloudflared && cloudflared --version
# Install if missing: winget install --id Cloudflare.cloudflared

# 4. Verify Game/.env present + AUTH_SECRET set
test -f /c/Users/VGit/Desktop/Game/.env || \
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" >> /c/Users/VGit/Desktop/Game/.env
grep -q "^AUTH_SECRET=" /c/Users/VGit/Desktop/Game/.env || \
  echo "ERROR: AUTH_SECRET missing — add manually"
```

## Stack ready post-ai-station wave

| Component                                  |     Status      | Source                                                   |
| ------------------------------------------ | :-------------: | -------------------------------------------------------- |
| Backend Express + WS shared mode port 3334 |       ✅        | apps/backend/index.js                                    |
| GAME_DATABASE_ENABLED default ON           |       ✅        | OD-030 post-PR #2261                                     |
| Howler.js audio middleware                 |       ✅        | apps/play/src/audio.js (OD-028)                          |
| Prisma migration 0010 ready                |       ✅        | prisma/migrations/0010_godot_v2_campaign_states (D2-C)   |
| Phone HTML5 export                         | Build on deploy | Game-Godot-v2/tools/web/build_web.sh                     |
| Promotions v0.2.0 5-tier                   |       ✅        | data/core/promotions/promotions.yaml                     |
| Species catalog + neurons bridge           |       ✅        | data/core/{species,ancestors}/                           |
| 4-layer psicologico engine                 |       ✅        | apps/backend/services/vcScoring.js + convictionEngine.js |

## Path A — Quick Tunnel (smoke, no domain, ephemeral URL)

Per validare stack end-to-end senza setup Cloudflare account:

```bash
cd /c/Users/VGit/Desktop/Game-Godot-v2
bash tools/deploy/deploy-quick.sh
```

Script auto-handles:

1. AUTH_SECRET generation if missing
2. Godot HTML5 build (set `SKIP_REBUILD=1` to use cache)
3. Phone export → Game/apps/backend/public/phone/
4. Game/ Express boot LOBBY_WS_SHARED=true port 3334
5. Cloudflare Quick Tunnel → ephemeral `*.trycloudflare.com` URL

**Output**: terminal prints URL like `https://qualifications-swimming-cedar-lions.trycloudflare.com`

**Smoke verify**:

```bash
TUNNEL_URL=https://...  # from script output
curl "$TUNNEL_URL/api/health"
# Expected: {"status":"ok",...}
curl -X POST "$TUNNEL_URL/api/lobby/create"
# Expected: {"code":"XXXX","host_token":"..."}
```

**Phone access**: `$TUNNEL_URL/phone/?room=XXXX`

**Teardown**: Ctrl+C kills both backend + tunnel. Ephemeral URL goes away.

## Path B — Named Tunnel (prod, custom domain)

Per production deploy con DNS record + persistente:

### One-time setup

```bash
cd /c/Users/VGit/Desktop/Game-Godot-v2
bash tools/deploy/setup-once.sh
```

Prerequisiti:

- Cloudflare account (master-dd auth)
- Domain ownership (es. `evo-tactics.example.com`)
- Cloudflare API token con DNS write + Tunnel create scope

Script creates:

1. Named tunnel `evo-tactics-prod`
2. DNS CNAME `evo-tactics.example.com → <tunnel-uuid>.cfargotunnel.com`
3. Tunnel credentials JSON at `~/.cloudflared/<tunnel-uuid>.json`

### Per-deploy

```bash
cd /c/Users/VGit/Desktop/Game-Godot-v2
bash tools/deploy/deploy.sh
# OR: explicit named-tunnel mode
cloudflared tunnel run evo-tactics-prod
```

### Prisma migration 0010 auto-deploy

D2-C cross-stack migration auto-runs via Docker compose backend:

```bash
cd /c/Users/VGit/Desktop/Game
docker-compose up -d backend
# Container entrypoint runs:
#   npm run dev:setup --workspace apps/backend
#   → npx prisma migrate deploy (idempotent via .docker-prisma-bootstrapped flag)
```

**Verify migration applied**:

```bash
docker-compose exec backend npx prisma migrate status
# Expected: "Database schema is up to date"
```

**Manual fallback** (if Docker broken — verified 2026-05-13):

```bash
cd /c/Users/VGit/Desktop/Game
DATABASE_URL=postgres://... npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
```

## Smoke matrix post-deploy

| Endpoint                                 |   Method   | Expected               | Verifies                         |
| ---------------------------------------- | :--------: | ---------------------- | -------------------------------- |
| `/api/health`                            |    GET     | 200 ok                 | Express + WS shared mode         |
| `/api/lobby/create`                      |    POST    | 200 {code, host_token} | Lobby create                     |
| `/api/lobby/state?code=X`                |    GET     | 200 snapshot           | Lobby state                      |
| `/api/session/:id/promotion-eligibility` |    GET     | 200 eligibility        | OD-025 promotionEngine (302 LOC) |
| `/api/campaign/godot-v2/state`           |    GET     | 200 / 404              | D2-C Prisma route (#2259)        |
| `/api/companion/pool`                    |    GET     | 200 pool               | W5-bb companion picker           |
| `/ws?code=X&token=Y&role=host`           | WS upgrade | hello msg              | M11 WS protocol                  |
| `/phone/?room=X`                         |    GET     | 200 HTML               | Phone HTML5 + deep-link          |
| `/phone/` (with Howler CDN)              |    GET     | 200                    | OD-028 audio middleware          |

## Production health checklist

Run dopo deploy:

```bash
DEPLOY_URL=https://evo-tactics.example.com  # or trycloudflare.com URL

# 1. Health probe
curl -fsS "$DEPLOY_URL/api/health" | jq

# 2. Lobby chain
ROOM=$(curl -fsS -X POST "$DEPLOY_URL/api/lobby/create" | jq -r .code)
echo "Room: $ROOM"
curl -fsS "$DEPLOY_URL/api/lobby/state?code=$ROOM" | jq .

# 3. WS handshake (wscat)
HOST_TOKEN=$(curl -fsS -X POST "$DEPLOY_URL/api/lobby/create" | jq -r .host_token)
wscat -c "wss://$DEPLOY_URL/ws?code=$ROOM&token=$HOST_TOKEN&role=host"

# 4. Game-Database flag ON verify
curl -fsS "$DEPLOY_URL/api/traits/glossary?species=elastovaranus_hydrus" | jq .
# OD-030: should HTTP-fetch from Game-Database OR fallback local files
```

## Rollback

### Frontend (CF Pages)

```bash
wrangler pages deployment list --project-name=evo-tactics-play
wrangler pages deployment activate <previous-ID> --project-name=evo-tactics-play
```

### Backend (Render — Mod scenario)

Render dashboard → service → Events → "Rollback to this deploy"

### Quick Tunnel (Path A)

Ctrl+C kills tunnel. New `deploy-quick.sh` run generates new ephemeral URL.

## Post-deploy → trigger Playtest #2

Once deploy LIVE + smoke green:

1. Telemetry endpoint reachable: master-dd shares URL with playtesters
2. Each session captures telemetry JSONL (per session)
3. Aggregate via:
   ```bash
   python tools/py/playtest_2_analyzer.py \
       --telemetry playtest-2-all-sessions.jsonl \
       --output docs/playtest/$(date +%Y-%m-%d)-playtest-2-report.md
   ```
4. Verdict 🟢/🟡/🔴 per pillar → master-dd decide promotion P3+P4+P6 🟢-cand → 🟢

## Reference baseline

Pre-userland synthetic baseline (30 sessions, seed=42):
`docs/playtest/baselines/playtest-2-synthetic-30-baseline.md`

Real playtest report should match or exceed synthetic verdict shape:

- 🟡-🟢 P3 promotions (depending on session length)
- 🟢 P4 4-layer psicologico (all 4 layers always populated)
- 🟡-🟢 P6 fairness (rewind frequency 15-35% expected)
- Performance: p95 < 100ms PASS (deploy infra + local network)

## Cross-link

- ai-station re-analisi: vault PR #5
- Phase B3 cross-stack: PR #2264 (Game/) + #261 (Godot v2)
- D2-C Prisma: PR #2259 (migration 0010)
- Envelope A/B/C all PRs in CLAUDE.md sprint context
- Playtest #2 plan: docs/playtest/2026-05-14-playtest-2-plan.md
- Analyzer: tools/py/playtest_2_analyzer.py
- Synthetic generator: tools/py/playtest_2_synthetic_generator.py
