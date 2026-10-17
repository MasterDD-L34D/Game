---
title: "Deep Analysis UI — TV + HUD + Onboarding + Co-op Phone+TV"
date: 2026-04-26
status: active
authority: A2
workstream: atlas
owners: [eduardo]
purpose: "Audit clarity gap doc-vs-runtime su tutte le surface UI: TV HUD, phone composer, onboarding 60s, co-op M15. Base per sprint UI polish."
sources:
  - docs/core/30-UI_TV_IDENTITA.md
  - docs/core/42-STYLE-GUIDE-UI.md
  - docs/core/44-HUD-LAYOUT-REFERENCES.md
  - docs/core/51-ONBOARDING-60S.md
  - docs/frontend/styleguide.md
  - docs/frontend/mockups_evo.md
  - docs/frontend/accessibility-deaf-visual-parity.md
  - docs/adr/ADR-2026-04-26-m15-coop-ui-redesign.md
  - docs/adr/ADR-2026-04-21b-onboarding-narrative-60s.md
  - apps/play/index.html
  - apps/play/lobby.html
  - apps/play/src/style.css
  - apps/play/src/render.js
  - apps/play/src/phoneComposerV2.js
  - apps/play/src/onboardingPanel.js
  - apps/play/src/lobbyBridge.css
  - docs/museum/MUSEUM.md (ui/hud domain — no card esistente)
---

# Deep Analysis UI — Audit 2026-04-26

Scope: surface TV (canvas + HUD), phone composer (M15), onboarding 60s, lobby. Caveman voice.

---

## 0 — Museum card check

Museum `MUSEUM.md` consultato: nessuna card esplicita dominio "ui/hud". Domain coverage attuale: ancestors, cognitive_traits, enneagramma, personality, mating_nido, old_mechanics, species_candidate, architecture. UI/HUD non ancora excavated.

Implicazione: nessun prior art recuperabile da museum per questo audit. Fonti primarie: spec canoniche + runtime code diretto.

---

## 1 — Gap doc vs runtime (per surface)

### 1.1 TV Canvas HUD

| Spec (doc) | Runtime (apps/play/) | Status |
|---|---|:---:|
| HP float sopra unit sprite | `render.js:346` implementato, bar sopra sprite con numeric `HP/max` | PASS |
| Enemy intent icon (SIS) floating | `render.js:372-413` `drawSisIntentIcon` — emoji glyph (✊/➜/🛡) badge darkred | PASS parziale* |
| Threat tile overlay rosso | `main.js:47-51,188,683,1243` `threatPreview` stored, passato a render. `render.js` riceve array ma NON disegna tile rosse — solo il badge su sprite | FAIL** |
| Player mini-strip LEFT (44-HUD spec) | `index.html` ha sidebar destra `#units`. Layout NON migrato a mini-strip left | FAIL |
| Recap chip TOP flottante | Non esiste in codice. Solo commit-reveal overlay (#commit-reveal) 2-3s | FAIL |
| Initiative timeline portrait TOP | Non esiste. Nessun `timelineBar.js` trovato | FAIL |
| Ability bottom card chunky (≥120px) | `#ability-bar` esiste. Font 0.82rem = ~14px su base 17px = 13.9px | PARTIAL |
| Safe zone 5% TV padding | `style.css:93-94` `2.5vw` = 48px su 1920px. Spec richiede 5% = 96px | FAIL*** |
| Font ≥24px TV body | Base html: 17px. Body: 16px. Spec 42-SG min 24px per Mission Console TV. `style.css` usa 16px body | FAIL |

**Note:**
- `*` intent icon wired ma usa fallback 'fist' sempre se `threat_preview` non arriva da `/round/begin-planning`. In solo play senza round orchestrator, icon = sempre ✊ indipendente da intent reale.
- `**` `threatPreview` array arriva a render (main.js wired) ma `render.js` non ha funzione `drawThreatTileOverlay`. Tile rimangono senza highlight rosso. ITB telegraph rule violata: player non vede dove attacca il SIS.
- `***` 2.5vw = ~48px su 1080p vs 5% spec (54px). Gap marginale ma dichiarato come 5% in spec.

### 1.2 Phone Composer (M15)

| Spec ADR-M15 | Runtime (`phoneComposerV2.js`) | Status |
|---|---|:---:|
| Card PG grande (HP/AP/DEF) | `#phv2-card` con `.phv2-card-stats` HP/AP/DEF | PASS |
| Action tiles (5 bottoni) | `ACTION_TILES` array 5: attack/move/defend/ability/end_turn | PASS |
| Target list con distanza | `#phv2-target-list` con `.phv2-empty` fallback | PASS |
| Phase banner (planning/idle/resolving) | `#phv2-phase` con `data-phase` + label | PASS |
| Party roster ready/planning | `#phv2-party` roster (verifica ulteriore) | PARTIAL |
| Chat relay | `phv2-chat` sezione (verifica nel file oltre 80 righe lette) | PARTIAL |
| Font ≥16px mobile (Jackbox rule) | CSS phoneComposerV2 non letto completo — base 17px html | NEEDS-CHECK |
| Tap target ≥48px phone | Non verificato in CSS phv2 | NEEDS-CHECK |

ADR wireframe scrive: `responsive phone: viewport ≤480px → stack vertical full-width`. Non verificato via runtime CSS.

### 1.3 Onboarding 60s

| Spec `51-ONBOARDING-60S.md` | Runtime (`onboardingPanel.js`) | Status |
|---|---|:---:|
| Phase A doc+YAML: SHIPPED | PR shippato (ADR-04-21b) | PASS |
| Phase B frontend picker | `onboardingPanel.js` ESISTE. Funzione `openOnboardingPanel` implementata | PASS |
| `role="dialog" aria-modal="true"` | `onboardingPanel.js:60` confermato | PASS |
| Countdown 30s visible | `onboarding-countdown` div + setInterval tick 200ms | PASS |
| Auto-select on timeout | Promise.race + `resolved || defaultKey` | PASS |
| Disco Elysium narrative feel | Briefing lines → choices cards → transition. 3-stage flow | PASS |
| Wire in `main.js` bootstrap | NON verificato — `main.js` chiama `openOnboardingPanel`? | NEEDS-CHECK |
| Co-op host-sync (Phase C) | Deferred M12+. Non shipped | DEFERRED |

### 1.4 Lobby (phone entrypoint)

| Spec Jackbox pattern | Runtime (`lobby.html`) | Status |
|---|---|:---:|
| Font ≥16px mobile | `font-size: 16px` body confermato | PASS |
| Safe area inset (notch) | `env(safe-area-inset-*)` wired in `.lobby-wrap` | PASS |
| Large tap targets | Input `padding: 10px 12px` = ~40px height. Spec 48px. GAP 8px | FAIL |
| Host card vs Join card separated | `.card.host` + `.card.join` con color + chip diverso | PASS |
| Role chip color = color only | `.card.host h2 .role-chip` color gold, `.card.join` color blue. No shape/symbol distinzione | FAIL (color-only) |
| Room code typography | `lobby-banner-code` letter-spacing 3px monospace | PASS |

---

## 2 — ITB Telegraph Rule + StS Intent Preview adoption

### Into the Breach (P0 — sacrifice cool for clarity)

**Status runtime**: PARTIAL FAIL.

- Spec `44-HUD-LAYOUT-REFERENCES.md` identifica ITB come Tier 1 ⭐⭐⭐⭐⭐ riferimento primario.
- Intent icon su enemy: WIRED (`drawSisIntentIcon` in `render.js:392-413`). Player vede badge con emoji sopra unit SIS.
- Threat tile overlay: MISSING. `threatPreview` array arriva al render ma nessun codice disegna tile rosse su griglia. "Dove attacca il SIS questa mossa?" = non visibile.
- Player cold-start test: vede ✊ sopra nemici (attack badge) ma non capisce QUALE tile viene minacciata. Violazione ITB core: "red box su tile + attack trail". Manca la tile.

**Fix P0**: aggiungere `drawThreatTileOverlay(ctx, threatPreview)` in `render.js`. Per ogni entry in `threatPreview` con `threat_tiles[]`, disegnare overlay semi-trasparente rosso (`rgba(212,74,74,0.35)`) su tile target.

Stima: 40-60 LOC in `render.js`. Non richiede backend change.

**Fonte**: [ITB UI Clarity GameDeveloper](https://www.gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time-)

### Slay the Spire (P0 — intent preview floating icon)

**Status runtime**: WIRED con fallback problem.

- `drawSisIntentIcon` esiste e disegna badge sopra enemy controlled_by='sistema'.
- Problema: `intent_icon` viene da `threatPreview` che arriva solo dopo `/round/begin-planning`. In sessione non-round (play solo, legacy flow), preview = `[]` → icon sempre 'fist' default.
- StS pattern: icon floating è SEMPRE aggiornata prima che player agisca. Nostro: solo in round model active.
- 3 intent types riconosciuti: 'fist', 'move', 'shield'. StS ne mostra 4+ con damage number. Manca: damage number preview sopra intent icon (es. "✊8" = attacca per 8).

**Fix P1**: aggiungere damage preview nel badge. Quando `threatPreview.row.damage_preview` presente, render `✊ ${dmg}` in piccolo sotto il glyph. Stima 20 LOC.

**Fonte**: [StS Intent Wiki](https://slaythespire.wiki.gg/wiki/Intent)

---

## 3 — Jackbox Phone+TV split coverage (M15 ADR)

ADR-2026-04-26-m15-coop-ui-redesign ACCEPTED. State machine specced: `idle→planning→ready→resolving→ended`.

### Coverage attuale

| Invariante ADR-M15 | Impl status |
|---|:---:|
| Phone = composer esclusivo | `phoneComposerV2.js` esiste. TV `index.html` ha anche un composer legacy (#ability-bar, #unit-select). Doppio composer presente | PARTIAL |
| Intent lock server-side post-ready | `pendingIntents` Map server → non verificato se gated in `phoneComposerV2` confirm button | NEEDS-CHECK |
| Chat relay room-wide WS | `phoneComposerV2.js:82` ha `#phv2-status aria-live="polite"`. Chat sezione vs WS relay: non verificato connessione | NEEDS-CHECK |
| Ready broadcast `round_ready` | ADR scrive "nuovo msg round_ready" — verifica wsSession.js non fatto in questo audit | NEEDS-CHECK |
| Narrative log TV bottom | `index.html` ha `#log` div. Compact log non separato da log tattico verbose | PARTIAL |
| Dark game-y palette consistent con 42-SG | `phoneComposerV2.js` usa hardcoded `#0b0f1a`, `#1a2035`, `#4fc3f7`, `#66bb6a` — NON usa CSS vars del 42-SG style guide. Token drift. | FAIL |

**Token drift critico**: `phoneComposerV2.js` definisce palette locale (`#0b0f1a`, `#1a2035`) divergente da `style.css` (`--bg: #1a1a1a`, `--player: #00b8d4`) e da `42-STYLE-GUIDE-UI.md` (`--bg-primary: #030912`). 3 palette diverse su 3 file. Jackbox pattern: interface visivamente consistent = zero confusion.

**Fonte**: [Jackbox UX Design Built In Chicago](https://www.builtinchicago.org/articles/jackbox-games-party-pack-design-ux)

---

## 4 — Diegetic UI opportunity (Dead Space / Disco Elysium)

### Status attuali

Spec `30-UI_TV_IDENTITA.md` menziona "Carte temperamentali" con assi MBTI + albero evolutivo con "nodi che pulsano". Pattern diegetic è il goal — overlay UI deve "vivere" come parte dell'universo.

Runtime: onboarding 60s usa pattern Disco Elysium (diegetic narrative choice, no tutorial spiegazione). `openOnboardingPanel` ha briefing testuale → 3 card choice → transition. Questo È diegetic correttamente implementato.

### Gap opportunity

| Superficie | Diegetic status | Opportunity |
|---|---|---|
| Onboarding 60s | PASS — Disco Elysium pattern corretto | — |
| Status reveal (panic/rage) | Status chip testuale plano. Nessuna animazione corpo unità | P1: Dead Space pattern — HP bar che "pulsa" quando critica. `render.js` già ha `--hp-crit: #f44336` ma nessun pulse animation |
| Thought Cabinet (MBTI) | `thoughtsPanel.js` esiste. Button `🧠 Mente` in header | P1: wiring check — pensa a Disco Elysium spheres floating che "si aprono" su unlock |
| Form Evolution reveal | `formsPanel.js` esiste. `🧬 Evo` button header | P2: animazione "DNA unfolding" su evolve confirm (diegetic, non modal popup piatto) |
| HP critico (≤30%) | Color change solo. Spec `accessibility-deaf-visual-parity.md` richiede "border rosso unità + icon pulsar" | FAIL — pulsar non implementato |

**P0 fix diegetic**: `render.js` drawUnit — quando `ratio < 0.3`, aggiungere canvas `strokeRect` con alpha pulsante (sin wave su timestamp) intorno alla tile unità. 15-20 LOC.

**Fonte**: [Dead Space Diegetic UI Analysis](https://medium.com/@jaiwanthshan/designing-effective-diegetic-ui-lessons-learned-from-dead-spaces-success-and-the-callisto-dbf803639dd6) — HP critico = visual signal immediato senza overlay extra.

---

## 5 — Accessibility WCAG AA gap

### Checklist 8-point

| Check | Expected | Actual | Status |
|---|---|---|:---:|
| Font ≥24px TV body | 24px (42-SG spec) | 16px body, 17px html. Molte classi: 0.62rem=10.5px, 0.65rem=11px, 0.68rem=11.5px | FAIL |
| Safe area ≥5% TV | 5% viewport padding | 2.5vw (~48px @1920px) vs 54px required. Delta 6px | BORDERLINE |
| Contrast ≥4.5:1 text | WCAG AA | Tokens doc: `--text-primary #f2f8ff` su `--bg-primary #030912` = 17.8:1 PASS. Runtime `style.css --fg: #e8e8e8` su `--bg: #1a1a1a` ≈ 13:1 PASS. `.dim: #666` su `#1a1a1a` ≈ 2.9:1 FAIL | PARTIAL |
| Color + symbol faction | Color + shape distinzione | `style.css` ha color tokens per faction ma `render.js` disegna unità con species abbreviation text solo. Nessun shape differenziante (player ≠ sistema visually oltre colore outline) | FAIL |
| Intent preview (SIS) | Floating icon pre-combat | WIRED ma con fallback flaw + no tile highlight | PARTIAL |
| Threat zone toggle | Long-press/tap per "dove posso essere attaccato?" | NON ESISTE in nessun file | FAIL |
| Microinteraction 200-500ms | Feedback azione ≤500ms | Hit/miss FX: `anim.js` (non letto). Commit-reveal flash `#commit-reveal` CSS. Duration non verificata | NEEDS-CHECK |
| Screen reader aria | `role=status` HP bar, `aria-label` grid tile, `aria-live` log | `render.js` = zero aria (Canvas non supporta aria nativamente). `ui.js:97` status chips hanno `role="img"` + `aria-label` PASS. `#log` `aria-live` non trovato in HTML | PARTIAL |

### Font size FAIL critico

Base html 17px. `style.css` contiene:
- `.unit-log li: 0.65rem` = **11.05px** — log eventi tattici illeggibili su TV 3m
- `.unit-tech-id: 0.62rem` = **10.54px** — tech ID unità illeggibile
- Multiple classi 0.68rem = **11.56px** — label stats, badge chips

10-foot rule: nessun testo funzionale sotto 18px equivalente. Queste classi violano anche la soglia 16px del doc 42-SG per "testo leggibile minimo".

**Fix P0**: aumentare html base a 18px (tutti i rem scalano proporzionalmente). Alternatively: eliminare classi sub-0.85rem nei contesti TV. `.unit-log li` → collapse in recap chip (44-HUD spec raccomanda già questo).

**Fonte**: [Microsoft 10-foot Experience Docs](https://learn.microsoft.com/en-us/windows/win32/dxtecharts/introduction-to-the-10-foot-experience-for-windows-game-developers)

### Color-only faction FAIL

`render.js` identifica faction via `unit.controlled_by === 'sistema'` e usa outline color. Ma forma visiva della tile (quadrato) è identica per player e sistema. Player distingue chi è nemico solo via:
1. Colore outline (red vs blue) — FAIL colorblind
2. Position (spesso misti su griglia) — non affidabile

42-SG spec dice: "Faction: colore + icon shape (player = triangolo, sistema = rombo, neutral = esagono)". Nessuno di questi shape è implementato.

**Fix P1**: `drawUnit` in `render.js` — aggiungere piccolo shape marker (canvas `polygon`) angolo top-left tile: triangolo player (3 punti), rombo sistema (4 punti rotati 45°). 30-40 LOC.

**Fonte**: [Mattel 80% color-blind 2024](https://www.fastcompany.com/91146946/mattel-is-making-its-games-colorblind-accessible) — symbol oltre color standard post-2024.

### `.dim` contrast FAIL

`style.css --dim: #666` su `--bg: #1a1a1a`. Contrasto: (#666 luminanza 0.133, #1a1a1a luminanza 0.010) = ratio ~2.9:1. WCAG AA richiede 4.5:1 per testo normale. Fallisce.

`.dim` usato in `.unit-tech-id`, label secondarie, placeholder text. Fix: alzare a `#888` (~4.5:1) o `#999` (~5.5:1).

---

## 6 — Frontmatter governance

File source verificati:

| File | Frontmatter | Workstream | source_of_truth | Status |
|---|:---:|---|:---:|:---:|
| `docs/core/30-UI_TV_IDENTITA.md` | YES | cross-cutting | false | OK |
| `docs/core/42-STYLE-GUIDE-UI.md` | YES | cross-cutting | true | OK |
| `docs/core/44-HUD-LAYOUT-REFERENCES.md` | YES | cross-cutting | true | OK |
| `docs/core/51-ONBOARDING-60S.md` | YES | combat | true | OK |
| `docs/frontend/styleguide.md` | YES | atlas | false | OK |
| `docs/frontend/mockups_evo.md` | YES | atlas | false | OK |
| `docs/frontend/accessibility-deaf-visual-parity.md` | YES | atlas | false | OK |
| `docs/adr/ADR-2026-04-26-m15-coop-ui-redesign.md` | YES | cross-cutting | (n/a ADR) | OK |
| `docs/adr/ADR-2026-04-21b-onboarding-narrative-60s.md` | YES | combat | true | OK |

Nessun file mancante di frontmatter.

**Gap doc governance**: `docs/frontend/styleguide.md` ha `source_of_truth: false` e `doc_status: draft`. È dichiarato superseded da `42-STYLE-GUIDE-UI.md` nel 42-SG testo stesso. Ma non c'è un campo `superseded_by:` nel frontmatter del styleguide legacy. Aggiungere: `superseded_by: docs/core/42-STYLE-GUIDE-UI.md`.

**Gap doc governance 2**: `docs/core/30-UI_TV_IDENTITA.md` = 18 LOC totali. È uno stub. Non ha `review_cycle_days` che triggeri aggiornamento. Il contenuto descrive albero evolutivo + carte MBTI — nessuno dei due è live in runtime. Candidato per espansione o per essere marcato `doc_status: stub`.

---

## 7 — Priority action list

| P | Finding | File | Stima |
|:---:|---|---|:---:|
| **P0** | Threat tile overlay rosso mancante (ITB telegraph violata) | `apps/play/src/render.js` | 50 LOC |
| **P0** | Font sub-12px in `.unit-log li` + `.unit-tech-id` — TV illeggibile | `apps/play/src/style.css` | 5 LOC |
| **P0** | `.dim: #666` contrast ratio 2.9:1 — WCAG AA fail | `apps/play/src/style.css` | 2 LOC |
| **P0** | HP critico pulse animation missing (accessibility-deaf spec richiede P0 visual) | `apps/play/src/render.js` | 20 LOC |
| **P1** | Faction shape marker — colore-solo = colorblind fail | `apps/play/src/render.js` | 35 LOC |
| **P1** | Palette token drift: `phoneComposerV2.js` vs `style.css` vs `42-SG` (3 palette) | `apps/play/src/phoneComposerV2.js` | 10 LOC |
| **P1** | Damage number nel SIS intent badge (StS pattern) | `apps/play/src/render.js` | 20 LOC |
| **P1** | Lobby role-chip color-only — nessun shape distinction | `apps/play/lobby.html` | 10 LOC |
| **P2** | Safe zone: alzare da 2.5vw a 5vw (TV border element clipping) | `apps/play/src/style.css` | 2 LOC |
| **P2** | Threat zone toggle (FE Engage L-press pattern) — non esiste | nuovo `apps/play/src/threatZoneToggle.js` | 80 LOC |
| **P2** | `main.js` wire verifica `openOnboardingPanel` call su campaign start | `apps/play/src/main.js` | check only |
| **P3** | `docs/frontend/styleguide.md` frontmatter: aggiungere `superseded_by:` | `docs/frontend/styleguide.md` | 1 LOC |

---

## 8 — Escalation path

- Bug CSS/JS P0 (`render.js` threat tile, font size): questo agent. Fix straightforward.
- Token palette drift (`phoneComposerV2.js`): questo agent.
- `main.js` wire onboarding check: questo agent (grep + verify).
- Threat zone toggle feature (P2, ~80 LOC): `session-debugger` agent per trace WS event path.
- Mission Console bundle (frozen Vue): NON modificare. READONLY. Source out-of-repo.
- WCAG AA full test con assistive tech: `design:accessibility-review` skill.

---

## Appendice — Evidence raw

```
# Font fails (html base 17px)
0.65rem × 17px = 11.05px  → .unit-log li [TV illeggibile]
0.62rem × 17px = 10.54px  → .unit-tech-id [TV illeggibile]
0.68rem × 17px = 11.56px  → multipli badge/chip [borderline]

# Contrast fails
--dim: #666 on --bg: #1a1a1a → ~2.9:1 (WCAG AA requires 4.5:1)

# Safe zone
2.5vw @ 1920px = 48px vs spec 5% = 96px (delta 48px — significant on TV)

# Intent icon wired
render.js:376-381 → drawSisIntentIcon called per sistema unit
threatPreview populated: main.js:683,1243,1474

# Threat tile overlay missing
grep "drawThreatTile\|threatTile\|threat.*tile.*overlay" apps/play/src/render.js → 0 results

# Faction shape marker missing
grep "polygon\|triangle\|diamond\|rombo\|triangolo" apps/play/src/render.js → 0 results

# aria on canvas
render.js → 0 aria results (Canvas API = no DOM aria, expected)
ui.js:97 → role="img" aria-label on status chips (PASS)
```
