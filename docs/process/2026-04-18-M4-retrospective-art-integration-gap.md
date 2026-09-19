---
title: M4 Retrospective — Art integration gap (M3.6-M3.10 lesson)
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-04-18'
source_of_truth: false
language: it
review_cycle_days: 90
---

# M4 Retrospective — Art integration gap

Lesson learned post-playtest M4 user-driven (#1600). User ha rilevato disconnect: `apps/play/` già funzionante pre-M3.6 con shapes base, ma sprint M3.6→M3.10 hanno trattato art direction come blocker MVP.

## Trigger

Post-playtest enc_tutorial_01 (2026-04-18 15:31), user domanda:

> "La versione http del gioco sembrava molto più avanti e mancavano solo queste cose [asset]. Come mai? Abbiamo 2 giochi diversi?"

## Finding

**NO 2 giochi diversi**. UN gioco (`apps/play/`) già funzionante + asset standalone **non integrati**.

### Stato reale post-sessione 2026-04-18

| Componente                           | Status pre-M3.6 |    Status post-M3.10     | Delta reale                      |
| ------------------------------------ | :-------------: | :----------------------: | -------------------------------- |
| `apps/backend/`                      |       ✅        |            ✅            | wire G+H (M3.5 gameplay feature) |
| `apps/play/` Canvas 2D               | ✅ shapes base  |      ✅ shapes base      | **zero change**                  |
| `data/art/icons/*.svg`               |   ❌ mancanti   | 🟡 7 committed non usati | +7 SVG, 0 import                 |
| `data/art/tilesets/*.png`            |   ❌ mancanti   | 🟡 3 committed non usati | +3 PNG, 0 import                 |
| `tools/py/art/generate_tile.py`      |       ❌        |      ✅ standalone       | +tool, zero integrazione         |
| `docs/core/41-AD + 42-SG + 43-ASSET` |     ❌ spec     |    ✅ spec canonical     | +3 source_of_truth               |

**Gioco giocabile `apps/play/`** prova README riga ~84: _"Gioco giocabile ✅ — CLI e browser 2D"_. Già vero pre-M3.6.

Playtest M4 (#1600) = **ha validato apps/play/ esistente** (8/9 🟢 kill-60), NON asset M3.9-M3.10.

## Disconnect spec → integration

### Cosa ho fatto M3.6-M3.10

1. **M3.6**: art direction canonical docs (41-AD + 42-SG) — spec SOLO
2. **M3.7**: zero-cost asset policy ADR — policy SOLO
3. **M3.8**: audio ADR + MVP playbook — docs SOLO
4. **M3.9**: 7 SVG icon committed — asset standalone
5. **M3.10**: procedural tile generator + 3 PNG + Kenney guide — asset + tool standalone

### Cosa NON ho fatto

- **Zero modifica** `apps/play/src/render.js` (rendering engine)
- **Zero import** di `data/art/icons/*.svg` o `data/art/tilesets/*.png` in codice gioco
- **Zero test integration** asset↔game runtime
- **Zero flag feature** per switch shapes↔sprite

Asset committed = **dead code visivo** finché render.js non linkato.

## Errore concettuale

### Assunzione implicita errata

Ho trattato sprint M3.6+ come "unblock MVP visual" → falso. `apps/play/` era già MVP visual (shapes + colors + HP bars + status icons via emoji). User poteva giocare senza problemi.

**Fonte assunzione errata**: memory `reference_gdd_audit.md` cita "3 critical gaps: levels, art, audio". Ho interpretato "art gap" come "no gioco visuale possibile" → ERRATO. Gap era "no asset definitivi ship-quality", NON "gioco non-renderabile".

### Flint design_hint intervention (M3.9)

Flint voice caveman aveva già triggered course correction M3.9: "0 pixel committed". Ha forzato commit asset reali. Ma Flint NON ha verificato integration — solo committing.

Pattern: **Flint kill-60 = commit qualcosa reale**, MA non = **integra con ciò che funziona**. Due step separati.

## Lesson learned

### Pattern nuovo: Integration Gap Detection

Prima di dichiarare "gap colmato", verify 3 punti:

1. **Asset committed?** (content esiste repo)
2. **Asset importato da code?** (grep import/require/reference)
3. **Asset visibile a runtime?** (visual check OR integration test)

Spec docs (#1) + asset files (#2) ≠ integrated (#3). Tre passi distinti.

### Anti-pattern evidenziato

**"Spec-then-asset-then-maybe-integrate" cascata** senza gate espliciti produce:

- Spec canonical valida
- Asset orphan in repo
- Zero impatto su user experience attuale

**Correct pattern**: **Asset → integration → spec** (reverse) OR **Spec + asset + integration atomico** (bundled PR).

### Modifica memory

Update `feedback_claude_workflow_consolidated.md` con nuovo pattern §13 (TBD prossima sessione memory sync — race con altra sessione).

## Decision

### Tenere

- ✅ `docs/core/41-AD + 42-SG + 43-ASSET` — spec canonical valida, future-valid, zero rollback
- ✅ `docs/adr/ADR-2026-04-18-art-direction-placeholder.md` ACCEPTED
- ✅ `docs/adr/ADR-2026-04-18-zero-cost-asset-policy.md` ACCEPTED
- ✅ `docs/adr/ADR-2026-04-18-audio-direction-placeholder.md` ACCEPTED
- ✅ 7 SVG icon + 3 PNG tile + Python generator — assets usable, basta integration
- ✅ `CREDITS.md` + README disclaimer — compliance ready
- ✅ Kenney community guide — future asset path documented

### Rollback

**Nessun rollback**. Tutti output M3.6-M3.10 restano valid per future integration. Zero cancellazione.

### Integrate (path forward M4 step A)

- `apps/play/src/render.js`: feature flag `USE_NEW_ART` (localStorage/env)
- Ramo ON: carica `data/art/icons/*.svg` per faction marker + `data/art/tilesets/*.png` per grid bg
- Ramo OFF: current shapes base (default, safe)
- Test manual browser post-integration
- Rollback: localStorage toggle

## Severity assessment

- **Drift ore investite**: ~6h spec/docs M3.6-M3.10 senza integrazione
- **Rework richiesto**: ~2h integration render.js + test
- **Rollback costoso**: zero (spec + asset valid, solo integration ignored)
- **Perdita valore**: zero (spec future-valid)
- **Perdita tempo**: ~6h "in anticipo" invece "just-in-time"

Severity = **Low-Medium**. Drift ma non waste. Spec pronta, assets pronti, integration prossimo step natural.

## Pattern matches memory

- `feedback_claude_workflow_consolidated.md` §6 admit+reinvestigate → **applicato qui** (user domanda → admit + retrospective)
- `feedback_claude_workflow_consolidated.md` §10 preservation paranoid → tenere spec/asset
- Flint kill-60 §9 research-critique → validare ciò che esiste prima di aggiungere

## Action items

| ID  | Task                                                 |   Step   | Owner  |
| --- | ---------------------------------------------------- | :------: | ------ |
| C-1 | Questo doc retrospective committed                   | C (done) | Claude |
| A-1 | `apps/play/src/render.js` feature flag `USE_NEW_ART` |    A     | Claude |
| A-2 | Test browser manual post-integration                 |    A     | User   |
| B-1 | Playtest enc_tutorial_02 con flag ON                 |    B     | User   |
| B-2 | Playtest enc_tutorial_03 con flag OFF (baseline)     |    B     | User   |
| B-3 | Report comparativo visual integration                |    B     | Claude |

## Next step natural (non in questo PR)

**M4 step A** = `feat(play): render.js feature flag USE_NEW_ART integration M3.9-10 assets`.

## Riferimenti

- `docs/playtest/2026-04-18-M4-user-playtest-enc_tutorial_01.md` — playtest trigger
- `logs/m4_playtest_enc_tutorial_01_ae96d108.json` — trace
- `apps/play/src/render.js` — target integration step A
- `data/art/icons/` + `data/art/tilesets/` — asset pronti
- `docs/core/41-ART-DIRECTION.md` — palette/silhouette spec
- `docs/core/42-STYLE-GUIDE-UI.md` — token UI spec
- PR #1600 — playtest commit
