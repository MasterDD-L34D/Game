---
title: Phone smoke test — userland playbook 2026-05-05
workstream: ops-qa
status: active
owner: master-dd
last_review: 2026-05-05
tags: [playtest, phone, smoke, godot-v2, w6, deploy, cloudflare-tunnel, telemetry]
---

# Phone smoke test — userland playbook 2026-05-05

> **2026-05-05 update — superseded deploy guidance**: Cloudflare Tunnel + named-tunnel setup originale è stato rimpiazzato da `deploy-quick.sh` shared-mode. Questo doc ora copre **solo** smoke test scenarios + verdict template. Per deploy ops vai upstream:
>
> - **Canonical no-domain Quick Tunnel**: [Game-Godot-v2 docs/godot-v2/deploy-quickstart.md](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/deploy-quickstart.md) — single command `tools/deploy/deploy-quick.sh` end-to-end (~30s subsequent runs).
> - **Canonical named tunnel + DNS**: [Game-Godot-v2 docs/godot-v2/deploy-master-dd-checklist.md](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/deploy-master-dd-checklist.md).
> - **Background spec**: [Game-Godot-v2 docs/godot-v2/deploy-w6.md](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/deploy-w6.md).
>
> Originale Cloudflare account / cloudflared install / tunnel auth / ingress sezioni rimosse — risultavano duplicate vs upstream e divergenti rispetto allo shared-mode (1 porta 3334 invece di 3 separate). History pre-rewrite: PR #2045 + #2047.

Closes drift sync 2026-05-04 [Item 10 — Phone composer real-device smoke test](../planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md#item-10--phone-composer-real-device-smoke-test--master-dd-manual-ops-) critical path Fase 3 cutover ADR.

## Telemetry verdict gate

`TelemetryCollector` (Godot v2 PR #166) traccia round-trip command-latency input→resolved p95. Verdict gate Sprint M.7:

| p95       |    Verdict     |
| --------- | :------------: |
| <100ms    |    PASS ✅     |
| 100-200ms | CONDITIONAL ⚠️ |
| >200ms    |    ABORT ❌    |

Debug HUD legge p95 cumulative durante combat; verdict computato via `TelemetryCollector.threshold_verdict(p95)`.

---

## Pre-flight check (10 min)

Prima di iniziare, verifica che TUTTI i 5 punti siano OK:

- [ ] **Godot 4.6 installato** — `%LOCALAPPDATA%/Godot/godot.cmd --version` deve stampare `4.6.x`. Se manca: download da https://godotengine.org/download/windows/ → unzip → copia in `%LOCALAPPDATA%/Godot/`.
- [ ] **Project export preset Web esiste** — apri Godot v2 project, menu `Project → Export…`, deve esserci preset `Web` (preset.0). Se manca: Add → Web → Save. Required template: `Project → Tools → Manage Export Templates → Download` (4.6.x).
- [ ] **Game-Godot-v2 main pulled post PR #166** — `cd Game-Godot-v2 && git pull origin main && git log --oneline -5`. Deve includere PR #166 TelemetryCollector + #167 Ennea taxonomy commits.
- [ ] **cloudflared installed** — `cloudflared --version` deve ritornare `2025.x.x`. Install: `winget install --id Cloudflare.cloudflared`.
- [ ] **Game/ repo present + npm deps installed** — `cd Game && ls node_modules/express/package.json` deve esistere. Altrimenti: `npm ci`.

Se uno fallisce → ferma, fix prima di procedere.

---

## Boot stack — `deploy-quick.sh` shared mode (~30s)

Single-command end-to-end. Sostituisce 3-terminal setup precedente:

```bash
cd /c/Users/VGit/Desktop/Game-Godot-v2
bash tools/deploy/deploy-quick.sh
```

> ℹ️ Windows MSYS shell: bug `$USER` unbound + `command -v godot.cmd` fix-shipped via [Game-Godot-v2 PR #168](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/168). Pre-#168 user dovevano `export USER=$USERNAME GODOT_BIN=…/.exe` manuale; post-merge zero env required.

Cosa fa:

1. Genera AUTH_SECRET in `Game/.env` (gitignored, vedi `.gitignore`).
2. Build phone HTML5 (cache-aware; `FORCE_REBUILD=1` forza).
3. Copy phone build → `Game/apps/backend/public/phone/`.
4. Boot Game/ Express **shared mode** porta 3334 (REST + WS + phone same-origin, `LOBBY_WS_SHARED=true`).
5. Avvia Cloudflare Quick Tunnel.
6. Stampa URL `https://<random>.trycloudflare.com/phone/`.

**Stop**: `Ctrl+C` — chiude tunnel + backend insieme via trap.

### Deep-link helper (zero typing 4-letter code)

```bash
TUNNEL="https://<random>.trycloudflare.com"
CODE=$(curl -s -X POST "$TUNNEL/api/lobby/create" \
  -H "Content-Type: application/json" \
  -d '{"host_name":"Eduardo"}' | jq -r .code)
echo "Phone deep-link: $TUNNEL/phone/?room=$CODE"
```

`WebOriginResolver.read_url_query("room")` pre-compila `CodeInput`. `?code=XXXX` accettato come fallback.

---

## Smoke test scenarios (45-60 min)

4 scenari sequenziali. Ogni scenario: cronometro timer, screenshot bug evidenti, annota observation in verdict template.

### 5a. iOS Safari — lobby create

1. iPhone → Safari → apri tunnel URL `/phone/`.
2. Phone composer carica → tap **Create Lobby**.
3. host/port pre-compilati via `WebOriginResolver` (no manual edit).
4. Tap **Create** → riceve **codice 4-letter**.
5. ✅ **Pass**: codice visibile entro 5s, no error toast, console mobile zero error.
6. ❌ **Fail**: timeout >10s, "Network error", whitescreen.

📝 Annota: codice ottenuto + tempo create→code ms.

### 5b. Android Chrome — join URL + code

1. Android phone → Chrome → apri tunnel URL `/phone/?room=<da 5a>`.
2. Tap **Join Lobby**.
3. Player2 join → ridirezione a **World Setup vote**.
4. Master (iOS) e Player2 (Android) votano world setup → quando 2/2 vote → entra in scenario tutorial.
5. ✅ **Pass**: join entro 3s, world setup screen sync su entrambi i phone <500ms, vote tally consistente.
6. ❌ **Fail**: code "invalid", lobby mostra solo 1 player, vote tally divergente.

📝 Annota: tempo join + tempo vote sync ms.

### 5c. Combat scenario tutorial 01 — 5 round play

1. Da World Setup → seleziona **enc_tutorial_01**.
2. 5 round combat play normale: select unit → declare action → commit round → resolve.
3. Durante 5 round, `TelemetryCollector` raccoglie samples round-trip input→resolved.
4. Su debug HUD (se enabled) o `print(t.compute_p95_ms())` console Godot remote, leggi p95 cumulative.
5. ✅ **Pass** per ogni round: action UI responsive <500ms, no desync (entrambi phone vedono stesso state post-resolve), zero crash.
6. ❌ **Fail**: action button no-op, state divergente fra phone, crash hard.

📝 Annota: round 1-5 osservation + p95 finale + verdict (PASS/CONDITIONAL/ABORT).

### 5d. Disconnect simulation — reconnect verify

1. Su Android phone, durante combat round attivo, **enable airplane mode 5s**.
2. Phone deve mostrare overlay "Reconnecting…" (close 4002 `auth_expired` se JWT scaduto, altrimenti close 1006 `network`).
3. Disable airplane mode dopo 5s.
4. Phone deve **auto re-join** via `POST /api/lobby/join` con stesso player_token (back-compat hydrated rooms Sprint R codex bundle).
5. State session deve essere **preserved** (round corrente, HP unit, intent pending).
6. ✅ **Pass**: reconnect <10s, state identico pre-disconnect, partita riprende senza host intervention.
7. ❌ **Fail**: phone resta disconnesso, state divergente post-reconnect, host vede Player2 zombie.

📝 Annota: tempo disconnect→reconnect + state diff (se any).

---

## Verdict template

Compila tabella post-smoke. Se p95 >100ms → flag CONDITIONAL/ABORT, escalation drift sync Item 10.

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

📋 **Submit verdict**: salva tabella compilata in nuovo doc `docs/playtest/2026-05-XX-phone-smoke-results.md` + cross-ref drift sync 2026-05-04 Item 10 close.

---

## Troubleshooting common errors

### #1 — `cloudflared not in PATH` (Boot stack)

**Symptom**: `deploy-quick.sh` exit con `ERROR: cloudflared not in PATH`.

**Fix**: `winget install --id Cloudflare.cloudflared` + apri shell nuovo.

### #2 — `AUTH_SECRET not configured` (Boot stack)

**Symptom**: backend log "AUTH_SECRET missing, using random per-process" warning.

**Fix**: re-run `deploy-quick.sh` — script auto-genera AUTH_SECRET in `Game/.env` se assente. Verify: `grep AUTH_SECRET Game/.env`.

### #3 — Backend non parte (deploy-quick Step 4/5)

**Symptom**: `ERROR: backend failed to start within 20s`.

**Fix**:

- `tail Game-Godot-v2/.deploy-logs/backend.log` per stack trace.
- Verify port 3334 free: `netstat -ano | grep :3334` → kill process residual se LISTENING.
- Verify `npm ci` done (deps installed) in Game/.

### #4 — Quick Tunnel no URL output

**Symptom**: `deploy-quick.sh` Step 5/5 stuck, no `trycloudflare.com` URL.

**Fix**:

- Verify internet connection (`ping cloudflare.com`).
- `tail Game-Godot-v2/.deploy-logs/tunnel.log`.
- Cloudflare Quick Tunnel può fail occasionalmente — retry script.

### #5 — Phone HTML5 404 (`/phone/` returns Not Found)

**Symptom**: tunnel URL apre, `/phone/` returns 404.

**Fix**:

- Verify build mounted: `ls Game/apps/backend/public/phone/index.html`.
- Re-run con `FORCE_REBUILD=1 ./tools/deploy/deploy-quick.sh`.
- Check `build_web.sh` workaround applicato (USER + GODOT_BIN export, vedi pre-flight).

### #6 — WS close 4002 `auth_expired`

**Symptom**: phone disconnect mid-combat, codice 4002.

**Fix**: nessuno richiesto — phone fa REST re-join automatico via `POST /api/lobby/join`. Hydrated rooms back-compat preserva session state (Sprint R codex bundle, Game/ PR #2036).

---

## Refs

- [Game-Godot-v2 deploy-quickstart.md](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/deploy-quickstart.md) — canonical no-domain Quick Tunnel
- [Game-Godot-v2 deploy-master-dd-checklist.md](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/deploy-master-dd-checklist.md) — canonical named tunnel + DNS
- [Game-Godot-v2 deploy-w6.md](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/deploy-w6.md) — background spec
- [Game-Godot-v2 PR #166 TelemetryCollector](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/166) — round-trip command-latency p95
- [Game/ ADR-2026-04-29 master execution plan v3](../planning/2026-04-29-master-execution-plan-v3.md) — M.7 spec parity
- [`tools/deploy/deploy-quick.sh`](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/tools/deploy/deploy-quick.sh) — single-command shared-mode boot
- [Game-Godot-v2 PR #168](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/168) — MSYS compat fix `build_web.sh` + `serve_local.sh` (post-merge: zero env required)

## Out of scope

- Godot HTML5 export setup (covered by Game-Godot-v2 PR #74 deploy-w6.md upstream)
- Master-dd actual phone test execution (questo doc IS deliverable; user esegue manualmente post-merge)
- Production cert hardening (Cloudflare Tunnel managed cert sufficient per smoke + demo public)
- CI integration `.github/workflows/web-build.yml` (deferred follow-up Game-Godot-v2 side)
