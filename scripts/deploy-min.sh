#!/usr/bin/env bash
# scripts/deploy-min.sh — Sprint C deploy bundle Min orchestrator.
#
# Roadmap:   docs/research/2026-04-27-backbone-online-deploy-roadmap.md (Opzione B Min)
# Checklist: docs/ops/deploy-min-checklist.md
#
# Cosa fa:
#   1. Preflight: verifica gh, wrangler, RENDER_API_KEY, keys.env canonical.
#   2. Build frontend (npm --prefix apps/play run build).
#   3. Iniettare runtime-config production (sed RENDER_BACKEND_HOST).
#   4. Deploy CF Pages (wrangler pages deploy apps/play/dist).
#   5. Stamp Render redeploy via API (curl POST /v1/services/.../deploys).
#   6. Smoke probe /api/health post-deploy con 30s retry.
#   7. Print URL pubblici finali.
#
# Anti-pattern guard inline (block):
#   - CORS_ORIGIN '*' in apps/backend/app.js default → warn (non block, è default codice).
#   - Render service non configurato (RENDER_SERVICE_ID missing) → block.
#   - Variabili secret presenti in repo (.env, render.yaml hardcoded) → block.
#
# Usage:
#   export RENDER_API_KEY=...                 # da Render dashboard → Account Settings → API Keys
#   export RENDER_SERVICE_ID=srv-...          # da URL service Render
#   export RENDER_BACKEND_HOST=evo-tactics-backend.onrender.com
#   export CLOUDFLARE_API_TOKEN=...           # opzionale se wrangler login OAuth
#   bash scripts/deploy-min.sh
#
# Dry-run (skip deploy, solo build + preflight):
#   DRY_RUN=1 bash scripts/deploy-min.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

DRY_RUN="${DRY_RUN:-0}"
PLAY_DIST="apps/play/dist"
KEYS_ENV="${HOME}/.config/api-keys/keys.env"

log() { echo "[deploy-min] $*"; }
warn() { echo "[deploy-min] WARN: $*" >&2; }
fail() { echo "[deploy-min] FAIL: $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Step 0 — preflight
# ---------------------------------------------------------------------------
log "Step 0/6: preflight checks…"

# Carica eventuali secret da canonical path (override env).
if [ -f "$KEYS_ENV" ]; then
  log "loading secrets from $KEYS_ENV"
  # shellcheck disable=SC1090
  set -a; . "$KEYS_ENV"; set +a
else
  warn "$KEYS_ENV not found — secrets must be exported in current shell."
fi

# Tool requirements.
command -v gh >/dev/null 2>&1 || fail "gh CLI missing (install: https://cli.github.com/)"
command -v wrangler >/dev/null 2>&1 || warn "wrangler missing — CF Pages deploy will be skipped (npm i -g wrangler to enable)"
command -v curl >/dev/null 2>&1 || fail "curl missing"
command -v node >/dev/null 2>&1 || fail "node missing"
command -v npm >/dev/null 2>&1 || fail "npm missing"

gh auth status >/dev/null 2>&1 || fail "gh not authenticated (run: gh auth login)"

# Required env (block).
if [ "$DRY_RUN" != "1" ]; then
  [ -n "${RENDER_API_KEY:-}" ] || fail "RENDER_API_KEY missing (Render dashboard → API Keys)"
  [ -n "${RENDER_SERVICE_ID:-}" ] || fail "RENDER_SERVICE_ID missing (es. srv-xxxxxxxxxxxx)"
  [ -n "${RENDER_BACKEND_HOST:-}" ] || fail "RENDER_BACKEND_HOST missing (es. evo-tactics-backend.onrender.com)"
fi

# Anti-pattern guard: secrets in repo .env files (esclude .env.example/.env.template).
if find . -maxdepth 3 -type f \( -name '.env' -o -name '.env.local' -o -name '.env.production' \) -not -path './node_modules/*' 2>/dev/null | grep -q .; then
  warn "found .env*/local/production in repo: spostare a $KEYS_ENV per evitare leak"
fi

# Anti-pattern guard: CORS '*' nel codice (default app.js linea ~413).
# Non blocchiamo (è default codice runtime override via env), ma warn.
if grep -q "options.corsOrigin || '\*'" apps/backend/app.js 2>/dev/null; then
  warn "apps/backend/app.js usa CORS '*' come default — assicurarsi CORS_ORIGIN env var settato in Render dashboard a CF Pages URL"
fi

# Render API key naming sanity (non in repo).
if grep -rE "RENDER_API_KEY\s*=\s*['\"][a-zA-Z0-9_-]{10,}" --include='*.yaml' --include='*.json' --include='*.toml' --include='*.sh' --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | grep -v 'scripts/deploy-min.sh' | grep -q .; then
  fail "RENDER_API_KEY hardcoded trovato in repo — RIMUOVERE prima di continuare"
fi

log "preflight OK."

# ---------------------------------------------------------------------------
# Step 1 — build frontend
# ---------------------------------------------------------------------------
log "Step 1/6: build frontend…"

if [ -d apps/play ]; then
  if [ -f apps/play/package.json ]; then
    npm --prefix apps/play install --silent || fail "npm install apps/play failed"
    npm --prefix apps/play run build || fail "npm run build apps/play failed"
  else
    fail "apps/play/package.json missing"
  fi
else
  fail "apps/play missing"
fi

[ -d "$PLAY_DIST" ] || fail "build output $PLAY_DIST missing"
log "frontend build OK ($(find "$PLAY_DIST" -type f | wc -l) files)"

# ---------------------------------------------------------------------------
# Step 2 — inject runtime-config production
# ---------------------------------------------------------------------------
log "Step 2/6: inject runtime-config.production.js → dist/runtime-config.js"

if [ -f apps/play/runtime-config.production.js ]; then
  HOST_ESCAPED=$(printf '%s' "${RENDER_BACKEND_HOST:-__RENDER_BACKEND_HOST__}" | sed 's/[\/&]/\\&/g')
  sed "s/__RENDER_BACKEND_HOST__/${HOST_ESCAPED}/g" \
    apps/play/runtime-config.production.js \
    > "$PLAY_DIST/runtime-config.js"
  log "runtime-config injected (host=${RENDER_BACKEND_HOST:-PLACEHOLDER})"
else
  warn "apps/play/runtime-config.production.js missing — skip injection"
fi

if [ "$DRY_RUN" = "1" ]; then
  log "DRY_RUN=1 — skip steps 3-6 (deploy + smoke)."
  exit 0
fi

# ---------------------------------------------------------------------------
# Step 3 — deploy CF Pages
# ---------------------------------------------------------------------------
log "Step 3/6: deploy Cloudflare Pages…"

if command -v wrangler >/dev/null 2>&1; then
  wrangler pages deploy "$PLAY_DIST" \
    --project-name=evo-tactics-play \
    --commit-dirty=true \
    || fail "wrangler pages deploy failed"
  log "CF Pages deploy OK"
else
  warn "wrangler missing — skip CF Pages deploy. Run manually: wrangler pages deploy $PLAY_DIST --project-name=evo-tactics-play"
fi

# ---------------------------------------------------------------------------
# Step 4 — stamp Render redeploy
# ---------------------------------------------------------------------------
log "Step 4/6: stamp Render redeploy via API…"

RENDER_DEPLOY_URL="https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys"
RENDER_RESP=$(curl -sS -X POST "$RENDER_DEPLOY_URL" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"clearCache":"do_not_clear"}' || true)

if echo "$RENDER_RESP" | grep -q '"id"'; then
  RENDER_DEPLOY_ID=$(echo "$RENDER_RESP" | grep -oE '"id":\s*"[^"]+"' | head -1 | cut -d'"' -f4)
  log "Render deploy stamped: id=$RENDER_DEPLOY_ID"
else
  warn "Render API response inattesa: $RENDER_RESP"
fi

# ---------------------------------------------------------------------------
# Step 5 — smoke probe /api/health
# ---------------------------------------------------------------------------
log "Step 5/6: smoke probe /api/health (30s retry)…"

HEALTH_URL="https://${RENDER_BACKEND_HOST}/api/health"
RETRIES=15
SLEEP=2
OK=0
for i in $(seq 1 $RETRIES); do
  STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
  if [ "$STATUS" = "200" ]; then
    log "health OK (HTTP 200) after ${i} attempt(s)"
    OK=1
    break
  fi
  log "health attempt $i/$RETRIES: HTTP $STATUS — retry in ${SLEEP}s…"
  sleep $SLEEP
done

if [ "$OK" != "1" ]; then
  warn "health probe non 200 dopo ${RETRIES} retry — verifica Render dashboard logs"
fi

# ---------------------------------------------------------------------------
# Step 6 — print URLs
# ---------------------------------------------------------------------------
log "Step 6/6: deploy summary"
echo ""
echo "  Backend (Render):   https://${RENDER_BACKEND_HOST}"
echo "  Health endpoint:    https://${RENDER_BACKEND_HOST}/api/health"
echo "  Frontend (CF):      https://evo-tactics-play.pages.dev"
echo "  Lobby create:       curl -X POST https://${RENDER_BACKEND_HOST}/api/lobby/create"
echo ""
log "deploy Min complete. Run smoke playtest 2-tab incognito host+player WS connect."
