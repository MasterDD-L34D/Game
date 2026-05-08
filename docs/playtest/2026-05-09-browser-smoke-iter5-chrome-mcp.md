---
title: Browser smoke iter5 Chrome MCP — 7 nuovi bug + comparison vs web v1
workstream: ops-qa
doc_status: active
doc_owner: master-dd
last_verified: 2026-05-09
source_of_truth: true
language: it
review_cycle_days: 30
status: active
owner: master-dd
last_review: 2026-05-09
tags:
  [
    playtest,
    phone,
    smoke,
    godot-v2,
    chrome-mcp,
    iter5,
    browser-driven,
    bug-bundle,
    comparison,
    web-v1,
  ]
---

# Browser smoke iter5 Chrome MCP — 2026-05-09

Claude-driven browser smoke via Chrome MCP (`Browser 1` connected). 2-tab simulation host + amico via deep-link `?room=`. Stack live `https://dogs-schools-theatre-license.trycloudflare.com` con backend main `9f89f943` (post-merge B-NEW + B-NEW-bis bundle). 7 nuovi bug catturati. Comparison vs web v1 (`/play/lobby.html`) confermata regressione UX su Godot phone.

## Pre-flight ✅

| Check                        | Status                            |
| ---------------------------- | --------------------------------- |
| Chrome MCP connected         | ✅ `Browser 1` (Windows)          |
| Stack tunnel `dogs-schools`  | ✅ `/api/health` 200              |
| Backend main HEAD            | ✅ `9f89f943` (B-NEW-1-bis live)  |
| Godot phone `/phone/`        | ✅ HTML5 dist fresh (May 8 20:23) |
| Web v1 `/play/lobby.html`    | ✅ Vite build (rebuild this iter) |
| Structured log lobby-service | ✅ events captured                |

## Bug bundle catturato iter5

### B-NEW-7 P1 — Friend phone join `[network_error: 13]`

**Severity**: P1 — bloccante cross-device WAN smoke
**Repo target**: Game-Godot-v2 (out of scope this Game/ PR)
**File:line**: `scripts/net/lobby_api.gd:26 REQUEST_TIMEOUT_S := 10.0`
**Sintomo**: Friend1 phone via `?room=WDVS` deep-link → input nome → tap `Unisciti` → top banner: `[network_error: 13] Join fallito: network_error: 13`

**Forensic backend**:

- `/api/lobby/list` mostra Friend1 player record presente nel room (`event:join` log captured)
- HTTP 201 al CLI test diretto da stessa origin

**RCA**: `HTTPRequest.RESULT_TIMEOUT = 13` (Godot 4.x). Timeout client-side 10s troppo corto su cold-start tunnel WAN. Backend riceve + risponde, ma response arriva oltre 10s su prima request fresh tab (WASM load + TLS + DNS cumulative). REST processed + record committed → re-tap fa idempotent join (player_count cresce silently).

**Fix path Godot v2** (~5 LOC):

- Bump `REQUEST_TIMEOUT_S` 10.0 → 30.0
- Optional: distinguere timeout vs connect-fail in error message UX

**Repro**: aprire 2 tab Chrome separato cold-start tunnel `?room=XXXX` → tap Unisciti su 2nd tab subito post-load.

---

### B-NEW-9 P1 — Phone composer non swappa MODE post `character_accepted`

**Severity**: P1 — riproduce ESATTAMENTE il bug originale master-dd 2026-05-08 sera ("bug su conferma personaggio per host")
**Repo target**: Game-Godot-v2 (out of scope)
**File:line**: `scripts/phone/phone_composer_view.gd:778 _on_character_ready_list_received` + `:785 _on_character_accepted_received`
**Sintomo**: Host phone Crea stanza → Conferma personaggio → status banner aggiornato `Personaggio accettato: Skiv (dune_stalker)` ma view CHARACTER_CREATION FORM **resta mounted**. Submit button **resta clickable**. User re-tap = re-submit (server-side dedupe shipped #2134 ammortizza, ma UX problema invariato).

**Backend confirmed working** (post-#2134):

- `submitCharacter` idempotent on identical spec ✓
- Dedupe-before-phase ✓ (Codex P2 fix)
- WS broadcast skip on dedupe ✓

**Frontend gap**:

- `_on_character_accepted_received` linea 785-796 solo `_set_status` (testo banner)
- ZERO `_swap_mode(MODE_WAITING)` o disable submit button
- Phase swap dipende da `phase_change` event server-side che fire SOLO quando ALL players submit
- In single-player smoke (Friend1 timeout) → other_player mai connesso → mai ALL ready → mai `phase_change('world_setup')` → form stuck FOREVER

**Fix path Godot v2** (~15 LOC):

```gdscript
func _on_character_accepted_received(spec: Dictionary, _phase: String) -> void:
    # ... existing _set_status ...
    # NEW: lock submit button + swap to waiting view if not host-led advance
    if _current_mode == MODE_CHARACTER_CREATION and is_instance_valid(_current_view):
        var char_view := _current_view as PhoneCharacterCreationView
        if char_view != null:
            char_view.lock_submit("Personaggio inviato. Attendo gli altri...")
```

E `phone_character_creation_view.gd` aggiungere `lock_submit(label: String)`:

```gdscript
func lock_submit(message: String) -> void:
    if _submit_button != null:
        _submit_button.disabled = true
        _submit_button.text = "✓ Inviato"
    if _validation_label != null:
        _validation_label.text = message
```

---

### B-NEW-3-bis P2 — Godot phone deep-link Crea stanza non demoted

**Severity**: P2 — UX cascade orphan-lobby risk
**Repo target**: Game-Godot-v2
**File:line**: `scripts/phone/phone_lobby_join_view.gd:73-78` + `:299` apply_room_code_from_url
**Sintomo**: deep-link `/phone/?room=WDVS` correttamente pre-fila code field MA Crea stanza button reste fully visible/clickable. Stesso UX cascade B-NEW-3 originale (master-dd 3 lobby orfane in <5min).

**Confronto web v1** (mesh `/play/lobby.html?room=WDVS`):

- Crea stanza card → `.card-secondary { opacity: 0.55 }`
- Unisciti card → `.card-primary { border-color: accent + box-shadow glow }`
- Status: `✓ Codice WDVS pronto. Inserisci il tuo nome ed entra.`
- Scroll Join card into view
- ✅ User visivamente guidato a Unisciti, NON Crea stanza

**Fix path Godot v2** (~10 LOC):

- In `_ready`: dopo `apply_room_code_from_url`, set `_create_button.disabled = true` o nascondere
- O label Crea stanza → "Crea nuova stanza (cancella deep-link)" disabled

---

### B-NEW-10 P3 informational — Lobby form expone http/ws port hardcoded fields

**Severity**: P3 — UX confusion
**Repo target**: Game-Godot-v2
**File:line**: `scripts/phone/phone_lobby_join_view.gd:54-68` (web platform branch)
**Sintomo**: form visibile su web HTML5 mostra fields:

- "host" (auto-filled to tunnel hostname)
- "http port (3334)" placeholder
- "ws port (3341)" placeholder

User vede 3 campi tecnici (host + 2 port) prima dei 2 reali (codice + nome). Field sono auto-resolved via `WebOriginResolver` ma rimangono visibili — confonde + sembra errore quando placeholder dice 3341 ma deploy-quick è shared mode.

**Fix path Godot v2** (~5 LOC):

- Hide host/http_port/ws_port fields se `OS.has_feature("web")` AND auto-resolved
- O collassa in un toggle "Avanzate" visibile solo dev mode

---

### B-NEW-11 P3 — Share screen no QR code

**Severity**: P3 — UX gap (master-dd request explicit 2026-04-29)
**Repo target**: Game-Godot-v2
**Reference web v1**: `apps/play/lobby.html:380-388` (api.qrserver.com 200x200)
**Sintomo**: post Crea stanza, share screen mostra solo:

```
STANZA CREATA
Codice: WDVS
Link amici: https://...trycloudflare.com/phone/?room=WDVS
Tieni questa pagina aperta.
Tap [Inizia partita ->] quando pronti.
```

Nessun QR code. Web v1 invece genera QR via `https://api.qrserver.com/v1/create-qr-code/?size=200x200&...`.

**Fix path Godot v2** (~20 LOC): aggiungere `TextureRect` con HTTP fetch QR PNG → applica via `ImageTexture.create_from_image`.

---

### B-NEW-12 P3 — Share URL no copy-to-clipboard button

**Severity**: P3 — UX friction
**Repo target**: Game-Godot-v2
**Reference web v1**: `apps/play/lobby.html:377` 📋 button + `apps/play/src/lobby.js:131-141 share-copy handler`
**Sintomo**: share URL pure text label, user deve manual select+copy. Web v1 ha 📋 button che fa `navigator.clipboard.writeText(shareUrl)` con feedback ✓ 1.5s.

**Fix path Godot v2** (~10 LOC): aggiungere Button "📋 Copia" che chiama `JavaScriptBridge.eval("navigator.clipboard.writeText(...)")`.

---

### B-NEW-13 P2 — Onboarding 4-card option auto-select pre-user-interaction

**Severity**: P2 — narrative beat skipped
**Repo target**: Game-Godot-v2
**File:line**: `scripts/phone/phone_onboarding_view.gd` (auto_selected logic)
**Sintomo**: phone host transitions dopo "Inizia mondo" → MODE_ONBOARDING brief view con narrativa ("Identità del branco / Il tuo branco è stato marcato. L'Apex ti troverà..."). Dopo ~4-6s auto-progress senza opzioni visibili. Backend log mostra `onboarding_chosen { option_key: 'option_a', auto_selected: false }` ma user non ha tappato nulla.

Master-dd vede solo narrative beat passare, nessuna scelta utente. Sprint M.6 narrative onboarding spec implies USER choice, non auto-pick.

**RCA hypothesis**: PhoneOnboardingView ha timer fallback OR layout issue cards offscreen. Card data viene da `onboarding_payload` broadcast (verified backend OK via campaignLoader `default_campaign_mvp`).

**Fix path Godot v2** (~30min RCA + ~10 LOC):

- Verifica PhoneOnboardingView render cards correttamente (probably issue layout bottom-of-viewport)
- Disable auto-progress timer se card visible
- Force user choice REQUIRED per advance

---

## Comparison surface Godot phone vs web v1

| Surface          | Godot phone `/phone/`              | Web v1 `/play/lobby.html`                         | Verdict                 |
| ---------------- | ---------------------------------- | ------------------------------------------------- | ----------------------- |
| Lobby title      | "Inserisci il codice della stanza" | "🦴 Evo-Tactics Lobby"                            | web v1 better           |
| Card design      | flat canvas form                   | Card panel + chip badge + emoji                   | web v1 polished         |
| Host card        | text label "Unisciti alla stanza"  | "📺 Crea stanza" (host · TV)                      | web v1 visual hierarchy |
| Player card      | shared with host (no separate)     | "📱 Unisciti" (player · phone)                    | web v1 distinct         |
| Submit button    | text-only generic                  | yellow (host) / cyan (player) high-contrast       | web v1 better           |
| Form fields      | 5 (incl 3 tecnici visible)         | 3 host (nome+campagna+max) / 2 player (code+nome) | web v1 cleaner          |
| Deep-link demote | ❌ Crea stanza still clickable     | ✅ `.card-secondary` opacity 0.55                 | web v1 fix shipped      |
| Status feedback  | text label                         | colored span + emoji ✓/⚠                         | web v1 redundancy       |
| QR code          | ❌ no                              | ✅ api.qrserver.com 200x200                       | web v1 only             |
| Copy URL button  | ❌ no                              | ✅ 📋 button                                      | web v1 only             |
| Footer credits   | none                               | "M11 Phase B · Jackbox · ADR-2026-04-20"          | web v1 contextual       |
| Mobile keyboard  | MobileKeyboardHelper.attach OK     | native HTML input native                          | parity                  |
| Validation msg   | inline ("Senza codice tocca...")   | aria-live polite                                  | parity                  |

**Verdict**: Phase A LIVE 2026-05-07 cutover Godot v2 phone primary lasciato regressione UX qualità. 7 di 13 surface-level features web v1 mancanti su Godot phone.

## Phase coverage map (Godot phone)

| Phase               | Render? | Functional?               | Bug                           |
| ------------------- | :-----: | ------------------------- | ----------------------------- |
| lobby (form)        |   ✅    | host create OK            | B-NEW-10 (port fields)        |
| lobby (share)       |   ✅    | code + URL visible        | B-NEW-11 + B-NEW-12 missing   |
| MODE_WAITING (host) |   ✅    | "Inizia mondo" CTA OK     | -                             |
| onboarding          |   ⚠️    | narrative visible         | B-NEW-13 auto-skip            |
| character_creation  |   ✅    | form OK + ACK             | **B-NEW-9 P1 stuck post ACK** |
| world_setup (vote)  |   ❓    | unreachable single-player | -                             |
| combat (5R + p95)   |   ❓    | unreachable               | -                             |
| debrief             |   ❓    | unreachable               | -                             |
| ended               |   ❓    | unreachable               | -                             |

**Combat 5-round + airplane reconnect + p95 capture** — DEFERRED master-dd hardware test, single-player browser smoke can't validate.

## Top 3 priority fixes (Godot v2 PR cycle)

1. **B-NEW-7 P1 timeout bump** — `REQUEST_TIMEOUT_S 10 → 30` + retry-on-timeout. ~30min effort. Unblocks ALL friends-online smoke (Friend1 join workable).
2. **B-NEW-9 P1 character_accepted MODE swap** — phone composer post-ACK lock submit + swap to MODE_WAITING. ~1h effort. Resolve UX-side della master-dd "bug conferma personaggio".
3. **B-NEW-13 P2 onboarding auto-skip** — RCA + force user choice. ~1h effort. Recover narrative beat.

**Cumulative ~2.5h Godot v2 work** chiude UX critical path master-dd phone flow.

## Out of scope this iteration

- Combat 5-round p95 capture (master-dd hardware test richiesto, browser non simula latency)
- Airplane reconnect 60s (browser non ha airplane mode toggle)
- Web v1 archive Phase B (post 7gg grace + 1+ playtest pass — ADR-2026-05-05 §6)
- Mission Console `/docs/mission-console/` audit (out of phone smoke scope)

## Refs

- [PR #2133](https://github.com/MasterDD-L34D/Game/pull/2133) B-NEW-1+2+3+4 server-side
- [PR #2134](https://github.com/MasterDD-L34D/Game/pull/2134) B-NEW-5 idempotent + dedupe-before-phase
- [PR #2136](https://github.com/MasterDD-L34D/Game/pull/2136) B-NEW-1-bis orch sync + B-NEW-4-bis 410
- [Phone-smoke-bot iter4 report](2026-05-08-agent-driven-smoke-comparison.md) Pattern B Playwright (Chrome MCP non disponibile precedente sessione)
- [ADR-2026-05-05](../adr/ADR-2026-05-05-cutover-fase-3-godot.md) Phase A LIVE
