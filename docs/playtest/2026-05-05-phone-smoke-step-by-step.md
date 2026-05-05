---
title: Phone smoke test setup — step-by-step master-dd userland 2026-05-05
workstream: ops-qa
status: active
owner: master-dd
last_review: 2026-05-05
tags: [playtest, phone, smoke, godot-v2, w6, deploy, cloudflare-tunnel, telemetry]
---

# Phone smoke test setup — step-by-step master-dd userland 2026-05-05

Guida operativa userland (~2-4h, no DevOps expertise required) per eseguire smoke test end-to-end stack co-op tactical: phone HTML5 (Godot v2) + Game/ Express REST + Game/ wsSession real-time. Closes drift sync 2026-05-04 Item C3 critical path Fase 3 cutover ADR.

**Pre-condizioni assunte**: master-dd ha laptop Windows, account Cloudflare free tier, 2 phone (1 iOS + 1 Android) con dati cellulari/Wi-Fi.

**Cross-ref upstream**: spec tecnico build pipeline + Tunnel config in [Game-Godot-v2 deploy-w6.md](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/deploy-w6.md). Quel doc copre HTML5 export ops; questo doc copre l'esecuzione interactive userland del path completo.

**Telemetry HUD**: durante test, `TelemetryCollector` (Godot v2 PR #166) traccia round-trip command-latency input→resolved p95. Verdict gate Sprint M.7:

| p95       |    Verdict     |
| --------- | :------------: |
| <100ms    |    PASS ✅     |
| 100-200ms | CONDITIONAL ⚠️ |
| >200ms    |    ABORT ❌    |

---

## Pre-flight check (10 min)

Prima di iniziare, verifica che TUTTI i 5 punti siano OK:

- [ ] **Godot 4.6 installato** — `%LOCALAPPDATA%/Godot/godot.cmd --version` deve stampare `4.6.x`. Se manca: download da https://godotengine.org/download/windows/ → unzip → copia in `%LOCALAPPDATA%/Godot/`.
- [ ] **Project export preset Web esiste** — apri Godot v2 project, menu `Project → Export…`, deve esserci preset `Web` (preset.0). Se manca: Add → Web → Save. Required template: `Project → Tools → Manage Export Templates → Download` (4.6.x).
- [ ] **Game/ Express startup verificato** — `cd C:/Users/VGit/Desktop/Game && npm run start:api` deve bootare su `http://0.0.0.0:3334` senza errori. Probe: `curl http://localhost:3334/api/health` ritorna 200.
- [ ] **Game-Godot-v2 main pulled post PR #166** — `cd C:/Users/VGit/Desktop/Game-Godot-v2 && git pull origin main && git log --oneline -5`. Deve includere PR #166 TelemetryCollector commit.
- [ ] **Browser HTML5 build verified locale** — esegui `./tools/web/build_web.sh --mode=phone --output-dir=dist/web` + `./tools/web/serve_local.sh --port=8080 --dir=dist/web` → apri `http://localhost:8080/` in Chrome desktop, deve caricare PhoneComposerBoot scene senza errori console.

Se uno fallisce → ferma, fix prima di procedere.

---

## Step 1 — Cloudflare account setup (15 min)

Free tier sufficiente per 3 hostname Tunnel.

1. **Signup**: apri https://dash.cloudflare.com/sign-up → email + password robusta + signup.
2. **Email verify**: check inbox, click link verify (token valido 24h).
3. **2FA optional ma raccomandato**: Profile → Authentication → enable TOTP (Google Authenticator / Authy). Salva recovery codes offline.
4. **Dashboard tour**: scroll sidebar sinistra → cerca `Zero Trust` (Tunnel vive lì). Se prompt "Add team name" → inserisci `evo-tactics-demo` o simile (free plan).
5. **Verifica plan**: Account Home → Plan deve mostrare `Free` (zero costo, 50 user limit Zero Trust — sufficiente per playtest).

⚠️ **Domain non strettamente richiesto**: Cloudflare Tunnel può usare `*.trycloudflare.com` ephemeral subdomain (no DNS setup). Se hai già un domain registrato e attivo su Cloudflare, salta a Step 3 ingress. Altrimenti use trycloudflare ephemeral path (più semplice per smoke test one-off).

---

## Step 2 — Cloudflare Tunnel install (Windows) (10 min)

`cloudflared` è il binary tunnel client.

**Path A — winget (raccomandato, Windows 10+ build 1809+)**:

```powershell
winget install --id Cloudflare.cloudflared
```

**Path B — manual download**:

1. Apri https://github.com/cloudflare/cloudflared/releases/latest
2. Download `cloudflared-windows-amd64.exe`
3. Rinomina → `cloudflared.exe`
4. Sposta in `C:\Program Files\cloudflared\` (crea dir se serve)
5. Aggiungi a PATH: System Properties → Environment Variables → Path → New → `C:\Program Files\cloudflared`
6. Apri NUOVO terminale (PATH update non si propaga a shell aperti)

**Verify**:

```bash
cloudflared --version
# Atteso: cloudflared version 2025.x.x ...
```

Se `command not found` → PATH non propagato, apri shell nuovo.

---

## Step 3 — Tunnel auth + ingress config (20 min)

### 3a. Authenticate

```bash
cloudflared tunnel login
```

Apre browser → seleziona account Cloudflare → autorizza. Token scritto in `~/.cloudflared/cert.pem`.

### 3b. Create tunnel (one-time)

```bash
cloudflared tunnel create evo-tactics-demo
```

Output:

```
Created tunnel evo-tactics-demo with id <UUID>
Credentials file: ~/.cloudflared/<UUID>.json
```

📋 **Salva il `<UUID>`** — serve per config.

### 3c. Ingress config

Crea `~/.cloudflared/config.yml` (Windows path: `C:\Users\<TUO-USER>\.cloudflared\config.yml`):

```yaml
tunnel: <UUID-HERE>
credentials-file: C:\Users\<TUO-USER>\.cloudflared\<UUID>.json

ingress:
  # 1. HTML5 phone composer (HTTPS port 443 → local 8080)
  - hostname: evo-phone.<YOUR-DOMAIN>
    service: http://localhost:8080
  # 2. Game/ Express REST API (HTTPS port 443 → local 3334)
  - hostname: evo-api.<YOUR-DOMAIN>
    service: http://localhost:3334
  # 3. Game/ WebSocket (WSS port 443 → local 3341)
  - hostname: evo-ws.<YOUR-DOMAIN>
    service: http://localhost:3341
  # Catch-all 404
  - service: http_status:404
```

Sostituisci `<YOUR-DOMAIN>` con dominio Cloudflare-managed (es. `evo.example.com`).

### 3d. DNS records propagate

```bash
cloudflared tunnel route dns evo-tactics-demo evo-phone.<YOUR-DOMAIN>
cloudflared tunnel route dns evo-tactics-demo evo-api.<YOUR-DOMAIN>
cloudflared tunnel route dns evo-tactics-demo evo-ws.<YOUR-DOMAIN>
```

Propagation tipica <60s (Cloudflare auto-managed). Verify via:

```bash
nslookup evo-phone.<YOUR-DOMAIN>
# Atteso: CNAME → <UUID>.cfargotunnel.com
```

### 3e. Path B ephemeral (no domain) — Quick Tunnel

Se NO domain Cloudflare-managed → use Quick Tunnel (`*.trycloudflare.com`).

⚠️ **Incompatibility con config.yml**: Cloudflare Quick Tunnels NON funzionano se esiste `~/.cloudflared/config.yml` (conflict: cloudflared tenta load named-tunnel config). Se hai già fatto Step 3b+3c e stai switchando a Path B → **rinomina temp** il config:

```bash
# Linux/macOS:
mv ~/.cloudflared/config.yml ~/.cloudflared/config.yml.bak
# Windows PowerShell:
Rename-Item ~/.cloudflared/config.yml config.yml.bak
```

Restore con `mv ... .bak` reverse quando torni a named tunnel.

Then run **3 separate terminali** (Quick Tunnel = 1 subdomain per istanza):

```bash
# Terminal A — phone HTML5 (port 8080)
cloudflared tunnel --url http://localhost:8080
# Stampa: https://<random-A>.trycloudflare.com

# Terminal B — Game/ REST API (port 3334)
cloudflared tunnel --url http://localhost:3334
# Stampa: https://<random-B>.trycloudflare.com

# Terminal C — Game/ WebSocket (port 3341)
cloudflared tunnel --url http://localhost:3341
# Stampa: https://<random-C>.trycloudflare.com
```

📋 **Salva i 3 URL** — phone player serve `<random-B>` come host API + `<random-C>` come host WS (vedi Step 5 sostituzione `<YOUR-DOMAIN>`).

**Limitazione**: subdomain auto-generato cambia ogni restart. Per smoke test one-off OK. Per sessioni ripetute → use Path A named tunnel (Step 3a-3d).

---

## Step 4 — Game/ Express + Godot HTML5 boot (5 min)

Apri **3 terminali in parallelo** (NON chiudere fino a fine smoke test).

### Terminal 1 — Game/ backend

```bash
cd C:/Users/VGit/Desktop/Game

# Generate AUTH_SECRET (one-time, then persist in .env):
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# Copia output → ~/.config/api-keys/keys.env (canonical path):
# AUTH_SECRET=<paste here>

# Source secrets + boot:
source ~/.config/api-keys/keys.env
npm run start:api
# Atteso log: "Idea Engine API listening on 0.0.0.0:3334"
# WebSocket server: "wsSession listening on 0.0.0.0:3341"
```

### Terminal 2 — Godot HTML5 build + serve

```bash
cd C:/Users/VGit/Desktop/Game-Godot-v2

# One-time build (rebuild solo se source change):
./tools/web/build_web.sh --mode=phone --output-dir=dist/web
# Atteso: dist/web/{index.html, .pck, .wasm, .js} ~10-15 MB

# Serve con CORS headers required SharedArrayBuffer:
./tools/web/serve_local.sh --port=8080 --dir=dist/web
# Atteso: "Serving on http://localhost:8080"
```

### Terminal 3 — Cloudflare Tunnel

**Path A — named tunnel** (se hai seguito Step 3a-3d con domain):

```bash
cloudflared tunnel run evo-tactics-demo
# Atteso log: "Connection registered" x4 (4 edge replicas)
```

**Path B — Quick Tunnel** (se hai seguito Step 3e no-domain): hai già 3 cloudflared istanze attive (Terminal A/B/C dello Step 3e). NON lanciare `tunnel run` qui — Path B sostituisce Terminal 3 con quei 3 processi separati.

📋 **Smoke locale pre-phone**:

- Path A → apri `https://evo-phone.<YOUR-DOMAIN>` in browser desktop, deve caricare phone composer identica a `http://localhost:8080`.
- Path B → apri `https://<random-A>.trycloudflare.com` (Step 3e Terminal A output).

Se fail → vedi Troubleshooting #1.

**Step 5 sostituzione hostname** (Path B):

- Sostituisci `evo-phone.<YOUR-DOMAIN>` → `<random-A>.trycloudflare.com` (HTML5 phone)
- Sostituisci `evo-api.<YOUR-DOMAIN>` → `<random-B>.trycloudflare.com` (REST host field)
- Sostituisci `evo-ws.<YOUR-DOMAIN>` → `<random-C>.trycloudflare.com` (WSS host field)
- Port: lascia `443` (Cloudflare TLS termination uguale per entrambi i path).

---

## Step 5 — Smoke test scenarios (45-60 min)

4 scenari sequenziali. Ogni scenario: **timer cronometro**, screenshot bug evidenti, annota observation in Step 6 template.

### 5a. iOS Safari — lobby create

1. iPhone → Safari → apri `https://evo-phone.<YOUR-DOMAIN>`.
2. Phone composer carica → tap **Create Lobby**.
3. Insert host=`evo-api.<YOUR-DOMAIN>`, port=`443`, player_name=`Master`.
4. Tap **Create** → riceve **codice 4-letter** (es. `BCDF`).
5. ✅ **Pass criteria**: codice visibile entro 5s, no error toast, console mobile (Settings → Safari → Advanced → Web Inspector via Mac) zero error.
6. ❌ **Fail criteria**: timeout >10s, "Network error", whitescreen.

📝 **Annota**: codice ottenuto + tempo create→code ms.

### 5b. Android Chrome — join URL + code

1. Android phone → Chrome → apri `https://evo-phone.<YOUR-DOMAIN>`.
2. Tap **Join Lobby**.
3. Insert host=`evo-api.<YOUR-DOMAIN>`, port=`443`, code=`<da 5a>`, player_name=`Player2`.
4. Tap **Join** → ridirezione a **World Setup vote**.
5. Master (iOS) e Player2 (Android) votano world setup → quando 2/2 vote → entra in scenario tutorial.
6. ✅ **Pass criteria**: join entro 3s, world setup screen sync su entrambi i phone <500ms, vote tally consistente.
7. ❌ **Fail criteria**: code "invalid", lobby mostra solo 1 player, vote tally divergente (1/2 vs 2/2).

📝 **Annota**: tempo join + tempo vote sync ms.

### 5c. Combat scenario tutorial 01 — 5 round play

1. Da World Setup → seleziona **enc_tutorial_01** (default raccomandato per smoke).
2. 5 round combat play normale: select unit → declare action → commit round → resolve.
3. Durante 5 round, **TelemetryCollector** (Godot v2 PR #166) raccoglie samples round-trip input→resolved.
4. Su debug HUD (se enabled), o tramite `print(t.compute_p95_ms())` console Godot remote, leggi p95 cumulative.
5. ✅ **Pass criteria** per ogni round: action UI responsive <500ms, no desync (entrambi phone vedono stesso state post-resolve), zero crash.
6. ❌ **Fail criteria**: action button no-op, state divergente fra phone, crash hard.

📝 **Annota**: round 1-5 osservation + p95 finale + verdict (PASS/CONDITIONAL/ABORT).

### 5d. Disconnect simulation — reconnect verify

1. Su Android phone, durante combat round attivo, **enable airplane mode 5s**.
2. Phone deve mostrare overlay "Reconnecting…" (close 4002 `auth_expired` se JWT scaduto, altrimenti close 1006 `network`).
3. Disable airplane mode dopo 5s.
4. Phone deve **auto re-join** via `POST /api/lobby/join` con stesso player_token (back-compat hydrated rooms Sprint R).
5. State session deve essere **preserved** (round corrente, HP unit, intent pending).
6. ✅ **Pass criteria**: reconnect <10s, state identico pre-disconnect, partita riprende senza host intervention.
7. ❌ **Fail criteria**: phone resta disconnesso, state divergente post-reconnect, host vede Player2 zombie.

📝 **Annota**: tempo disconnect→reconnect + state diff (se any).

---

## Step 6 — Verdict template

Compila tabella post-smoke. Se p95 >100ms → flag CONDITIONAL/ABORT, escalation drift sync Item C3.

| Metrica                      | Valore  |          Verdict           |
| ---------------------------- | ------- | :------------------------: |
| Lobby create latency (5a)    | \_\_ ms |            \_\_            |
| Join + world setup sync (5b) | \_\_ ms |            \_\_            |
| Round 1 input→resolved p95   | \_\_ ms | PASS / CONDITIONAL / ABORT |
| Round 5 input→resolved p95   | \_\_ ms | PASS / CONDITIONAL / ABORT |
| Reconnect time (5d)          | \_\_ s  |            \_\_            |
| **OVERALL VERDICT**          | \_\_    |            \_\_            |

**Bug osservati** (free-text, screenshot path se applicable):

```
- Bug #1: <descr> | scenario: <5a-d> | severity: P0/P1/P2 | screenshot: <path>
- Bug #2: ...
```

**UX impressions** (free-text master-dd):

```
- Cosa funziona bene:
- Cosa frustra:
- Surprise positive/negative:
- Verdict overall: ship-ready / iter-needed / abort
```

📋 **Submit verdict**: salva tabella compilata in nuovo doc `docs/playtest/2026-05-XX-phone-smoke-results.md` + cross-ref drift sync Item C3 close.

---

## Troubleshooting common errors

### #1 — DNS not propagating (Step 3d)

**Symptom**: `https://evo-phone.<YOUR-DOMAIN>` → "DNS_PROBE_FINISHED_NXDOMAIN" o timeout.

**Fix**:

- Wait 60-120s (Cloudflare DNS edge propagation).
- Verify `cloudflared tunnel route dns` returned no error.
- Probe `nslookup evo-phone.<YOUR-DOMAIN> 1.1.1.1` (force Cloudflare resolver).
- Check `~/.cloudflared/config.yml` hostname EXACT match con DNS record (typo case-sensitive).

### #2 — Cloudflare auth fail (Step 3a)

**Symptom**: `cloudflared tunnel login` → browser "Authorization failed" o token salvato non valido.

**Fix**:

- Logout/login Cloudflare dashboard, riprova.
- Verify account ha Zero Trust enabled (Account Home → Zero Trust visible).
- Delete `~/.cloudflared/cert.pem` + retry login fresh.
- Se 2FA prompt loop → temporary disable 2FA, login, re-enable.

### #3 — Cross-origin blocked (Step 4 Terminal 2)

**Symptom**: phone composer carica index.html ma stuck su splash, browser console: "SharedArrayBuffer is not defined" o "isolation failed".

**Fix**:

- `serve_local.sh` MUST set headers `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`. Verify via `curl -I http://localhost:8080/` includes both.
- NO `python -m http.server` (no headers) — use script repo.
- Cloudflare Tunnel passa headers transparently — se OK locale ma fail via Tunnel, verify config.yml `originRequest` vuoto (nessun header strip).

### #4 — WSS handshake fail (Step 5b/5c)

**Symptom**: Join lobby OK ma combat scenario non start, console "WebSocket connection to 'wss://evo-ws.<YOUR-DOMAIN>' failed".

**Fix**:

- Verify Game/ ws server boot (Terminal 1 deve loggare "wsSession listening on 0.0.0.0:3341").
- Cloudflare Tunnel ingress `evo-ws.<YOUR-DOMAIN> → http://localhost:3341` (HTTP, NON HTTPS — Tunnel termina TLS).
- Check `AUTH_SECRET` env var presente (Sprint R.1 JWT required) — restart Terminal 1 con secret fresh.
- Phone player deve ricevere player_token JWT da `/api/lobby/join` PRIMA di connect WS — se token assente → REST flow rotto, debug REST endpoint prima.

### #5 — Mobile viewport zoom

**Symptom**: phone composer renders troppo zoom o troppo piccolo, tap target miss.

**Fix**:

- Verify `dist/web/index.html` contiene `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`.
- iOS Safari ignora `maximum-scale` → user può pinch-zoom; non bloccante per smoke ma annota UX impression.
- Se renders 1/4 screen → Godot HTML5 canvas `stretch_mode` config in `project.godot` deve essere `viewport` (NON `disabled`).

---

## Refs

- [Game-Godot-v2 deploy-w6.md](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/deploy-w6.md) — spec build pipeline + Tunnel config upstream
- [Game-Godot-v2 PR #166 TelemetryCollector](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/166) — round-trip command-latency p95 + threshold verdict
- [Game/ ADR-2026-04-29 master execution plan v3](../planning/2026-04-29-master-execution-plan-v3.md) — M.7 spec parity
- Cloudflare Tunnel docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- Godot HTML5 export: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html

## Out of scope

- Godot HTML5 export setup (covered by Game-Godot-v2 PR #74 deploy-w6.md upstream)
- Master-dd actual phone test execution (this doc IS the deliverable; user esegue manualmente post-merge)
- Production cert hardening (Cloudflare Tunnel managed cert sufficient per smoke + demo public)
- CI integration `.github/workflows/web-build.yml` (deferred follow-up Game-Godot-v2 side)
