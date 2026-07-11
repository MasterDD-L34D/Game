# GDD Refresh Fase 1 -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colmare i 4 gap del GDD distribuito (SoT sez.13 stale, audience sez.18, piano audio implementabile, accessibilita' minima) + refresh hub, come da spec `docs/superpowers/specs/2026-07-10-studio-track-v09-design.md` Fase 1.

**Architecture:** Solo documentazione, repo Game, UN branch `docs/gdd-refresh-phase1` -> 1 PR. Ogni task = edit -> verifica (governance/grep) -> commit. Nessun cambio runtime. I doc specialistici sono authority, l'hub sintetizza e linka (regola GDD_MASTER).

**Tech Stack:** Markdown ASCII-first (em-dash -> `--`), prettier via lint-staged (nei worktree senza node_modules: `"C:/dev/Game/node_modules/.bin/prettier" --write <file>`), governance check `tools/check_docs_governance.py` (usare Python313 esplicito su Ryzen: `/c/Users/VGit/AppData/Local/Programs/Python/Python313/python.exe`), subject <=72 char.

**Trailer ADR-0011 (OGNI commit):** genera il Trace-Id una volta per commit e passa i trailer con `-m`:

```bash
TRACE=$(node -e "const b=Buffer.alloc(16);require('crypto').randomFillSync(b);const t=Date.now();b[0]=t/2**40;b[1]=t/2**32;b[2]=t/2**24;b[3]=t/2**16;b[4]=t/2**8;b[5]=t;b[6]=(b[6]&0x0f)|0x70;b[8]=(b[8]&0x3f)|0x80;const h=b.toString('hex');console.log(h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20))")
# ogni `git commit` dei task sotto va eseguito cosi':
git commit -m "<subject del task>" -m "Coding-Agent: <model-id della sessione>" -m "Trace-Id: $TRACE"
```

Gli snippet dei Task 1-5 mostrano solo il subject per brevita': aggiungere SEMPRE i due `-m` trailer come sopra (il commit-msg hook li richiede).

**Vincoli sessione:** lavorare in un worktree proprio (mai checkout in C:\dev\Game); push con `git push origin HEAD:docs/gdd-refresh-phase1`.

---

### Task 1: SoT sez.13 -- da mappa stale a puntatore overlay

**Files:**

- Modify: `docs/core/00-SOURCE-OF-TRUTH.md:561-755` (l'intera sez.13, fino alla riga PRIMA di `## 14.`)

- [ ] **Step 1: verifica perimetro sezione**

Run: `grep -n "^## 1[34]\." docs/core/00-SOURCE-OF-TRUTH.md`
Expected: due righe -- `561:## 13. Stato implementativo (sprint 001-019)` e `756:## 14. Grid & Map System ...` (se i numeri differiscono, adattare il perimetro: si sostituisce TUTTO fra le due intestazioni).

- [ ] **Step 2: sostituire il corpo della sez.13**

Sostituire dall'intestazione `## 13.` inclusa fino alla riga prima di `## 14.` con:

```markdown
## 13. Stato implementativo -> overlay LIVE (Godot-v2)

La vecchia mappa design->codice di questa sezione (sprint 001-019, fotografia
2026-04-16, frontend web-v1) e' STORICA: il frontend web e' archiviato (cutover
2026-05) e anche la mappa backend e' superata dai refactor 2026-06/07 (apLedger,
simmetria). Il dettaglio storico resta recuperabile dalla history git.

- **Stato implementativo LIVE**: `Game-Godot-v2/docs/godot-v2/PRD-BUILD-STATUS-GODOT-V2.md`
  (overlay del frontend canonico Godot; supersede questa sezione per lo stato build).
- **Fotografia 2026-07-10**: Path A end-to-end LIVE (lobby -> character_creation ->
  form_pulse -> world_seed -> scenario_brief -> combat -> debrief); combat round+d20,
  grid square+elevation, co-op WS 1-8 con reconnect, persistence Postgres; simmetria
  d'azione del Sistema FLAG-ON in prod (ADR-2026-07-10, bande quarta ratifica in
  `15-LEVEL_DESIGN`).
- **Runtime backend**: resta `Game/` (Node, porta 3334) -- questo repo e' la SoT dei
  sistemi; per la topologia prod vedi i runbook fleet.
```

- [ ] **Step 3: verifica**

Run: `grep -n "sprint 001" docs/core/00-SOURCE-OF-TRUTH.md`
Expected: 1 sola occorrenza (nella nuova frase "La vecchia mappa..."), nessuna tabella residua; `grep -c "roundOrchestrator" docs/core/00-SOURCE-OF-TRUTH.md` cala rispetto a prima (le occorrenze della vecchia sez.13 sparite).

- [ ] **Step 4: prettier + commit**

```bash
"C:/dev/Game/node_modules/.bin/prettier" --write docs/core/00-SOURCE-OF-TRUTH.md
git add docs/core/00-SOURCE-OF-TRUTH.md
git commit -m "docs(sot): sec.13 stale map -> live Godot overlay pointer"
```

### Task 2: SoT sez.18.1 -- audience DECISA

**Files:**

- Modify: `docs/core/00-SOURCE-OF-TRUTH.md` sez. `### 18.1 Target audience` (dalla riga `### 18.1` fino alla riga prima di `### 18.2`)

- [ ] **Step 1: sostituire il corpo di 18.1**

Sostituire il contenuto di 18.1 (mantenendo le 3 personas come strumento, ri-rankate) con:

```markdown
### 18.1 Target audience (DECISO 2026-07-10, owner)

**Primaria -- creature-strategist**: adulti cresciuti coi creature-collector
(Pokemon/monster-raising/Spore) che oggi vogliono sostanza tattica. La fantasia
guida e' "plasmo la mia specie" (P2 evoluzione emergente = pilastro-pitch); la
tattica d20 e' il mezzo che rende la fantasia consequenziale. Quando le esigenze
confliggono, si ottimizza per questo giocatore.

**Secondaria -- tattico-profondo** (XCOM / Into the Breach / FFT): lo tengono la
profondita' del d20 leggibile (P1) e le sconfitte by-design del flip simmetria.

**Anti-audience dichiarata -- party-casual puro** (Jackbox-style): il rito
TV+companion resta un differenziatore, ma non si ottimizza per sessioni
mordi-e-fuggi.

**Implicazioni**: store copy guidata dalla fantasia evolutiva, non dal
tactical-hardcore; onboarding 60s = ponte per la primaria; sconfitte accettabili
by-design con la leggibilita' P1 come guardrail; aggiornare la sez. Audience di
`00F` (business) quando si scrive lo store copy EA.

**Personas (ri-rankate, strumento di lavoro):**

1. **Evolutore** (primaria) -- ex-giocatore di creature-collector, resta per la
   progressione di specie; fonde le vecchie personas 2 (tabletop) e 3 (curioso).
2. **Tattico da salotto** (secondaria) -- gioca FFT/Fire Emblem, vuole profondita'
   su TV condivisa.
```

- [ ] **Step 2: verifica**

Run: `grep -n "DA DEFINIRE" docs/core/00-SOURCE-OF-TRUTH.md`
Expected: l'intestazione `## 18.` NON contiene piu' il marker (aggiornare `## 18. Target Audience & Accessibilita' -- DECISO (audience) + baseline (a11y)`; rimuovere l'emoji warning se presente). `grep -n "creature-strategist" docs/core/00-SOURCE-OF-TRUTH.md` = 1+ hit.

- [ ] **Step 3: prettier + commit**

```bash
"C:/dev/Game/node_modules/.bin/prettier" --write docs/core/00-SOURCE-OF-TRUTH.md
git add docs/core/00-SOURCE-OF-TRUTH.md
git commit -m "docs(sot): sec.18.1 audience decided -- creature-strategist primary"
```

### Task 3: piano audio implementabile (draft + 00F)

**Files:**

- Modify: `docs/planning/draft-audio-design.md` (append 3 sezioni prima di `## Riferimenti`)
- Modify: `docs/core/00F-ART_AUDIO_BUSINESS.md` sez. `### 3.1 Budget musicale`

- [ ] **Step 1: append a draft-audio-design.md** (subito PRIMA della sezione `## Riferimenti`)

```markdown
## Mappa eventi Path A -> classi suono (2026-07-10, implementabile)

Path A = flusso live Godot-v2: lobby -> character_creation -> form_pulse ->
world_seed -> scenario_brief -> combat -> debrief.

| Schermata Path A    | Eventi                                      | Classe suono                            |
| ------------------- | ------------------------------------------- | --------------------------------------- |
| lobby               | join, ready, countdown start                | UI stinger                              |
| character_creation  | select specie/job, confirm                  | UI (click morbido, tono positivo)       |
| form_pulse          | pulse, esito                                | evoluzione (cristallino, crescendo)     |
| world_seed          | reveal bioma                                | ambience bioma (attacco del loop)       |
| scenario_brief      | briefing in/out                             | drone briefing (10-15s, fade)           |
| combat (planning)   | selezione unita', intent dichiarato, commit | UI (soft lock-in, sigillo)              |
| combat (resolution) | attack/miss/crit, status, morte, telegraph  | SFX combat (tabella SFX Taxonomy sopra) |
| debrief             | vittoria/sconfitta, PE guadagnato           | fanfara / discendente / clink           |

## Criteri asset (input alla fase asset-hunt, spec studio-track Fase 2)

- **Licenze**: SOLO CC0 o CC-BY (con attribution file al primo import); esclusi
  CC-BY-SA e NC (EA premium).
- **Formati**: OGG per musica (streaming), WAV per SFX brevi; mono ok per SFX,
  stereo per musica; niente middleware in prima fase (player Godot nativo, la
  valutazione FMOD/Wwise resta nota storica sopra).
- **Tono**: biologico-alieno coerente con art direction (`41-ART-DIRECTION.md`):
  organico > metallico; UI "soft-organic", mai beep sintetici da menu anni-90.
- **Budget prima passata**: 40-60 SFX (~30 combat, ~15 UI, ~12 ambience/eventi
  bioma) + 6-8 tracce musicali (menu, draft, planning, risoluzione, turno critico,
  vittoria, sconfitta, evoluzione).

## Gap chiusi 2026-07-10 (in-session owner)

- Budget musicale: freesound/royalty-free per EA -- la decisione e' `00F` sez.3.1,
  questo doc la implementa.
- Prototipazione: si', placeholder liberi -> shortlist curata in `43-ASSET-SOURCING`.
- Indicatori visivi deaf/HoH: elenco eventi in `docs/core/45-ACCESSIBILITY.md`.
- Voci creature: APERTO (sintetiche vs nessuna) -> decisione owner alla slice F-A.
```

- [ ] **Step 2: puntatore in 00F sez.3.1** -- aggiungere in coda alla sezione:

```markdown
Piano implementabile (classi, mappa eventi Path A, criteri asset, budget
quantitativo): `docs/planning/draft-audio-design.md` (esteso 2026-07-10).
```

- [ ] **Step 3: verifica**

Run: `grep -n "Mappa eventi Path A" docs/planning/draft-audio-design.md && grep -n "draft-audio-design" docs/core/00F-ART_AUDIO_BUSINESS.md`
Expected: entrambe 1+ hit.

- [ ] **Step 4: prettier + commit**

```bash
"C:/dev/Game/node_modules/.bin/prettier" --write docs/planning/draft-audio-design.md docs/core/00F-ART_AUDIO_BUSINESS.md
git add docs/planning/draft-audio-design.md docs/core/00F-ART_AUDIO_BUSINESS.md
git commit -m "docs(audio): implementable plan -- Path A event map + asset criteria"
```

### Task 4: 45-ACCESSIBILITY.md + registry + puntatore da SoT 18.2

**Files:**

- Create: `docs/core/45-ACCESSIBILITY.md`
- Modify: `docs/governance/docs_registry.json` (entry nuova, stesso pattern delle altre)
- Modify: `docs/core/00-SOURCE-OF-TRUTH.md` sez. 18.2 (una riga puntatore in testa)

- [ ] **Step 1: creare il doc** con questo contenuto:

```markdown
---
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-07-10'
source_of_truth: true
language: it
review_cycle_days: 90
---

# Accessibilita' -- baseline v1 (EA)

Authority operativa per l'accessibilita'. Consolida le decisioni della SoT sez.18.2
(2026-04-16) e la baseline decisa nella spec studio-track (2026-07-10). Scope: EA
Steam, PEGI16, TV-first + companion. Dichiarata BASELINE, non certificazione.

## Visivo

- **Colorblind-safe al lancio** (WCAG 2.1 AA): telegraph e status mai codificati dal
  SOLO colore -- palette safe + shape-coding (icona/forma distinta per panic,
  disorient, bleed, telegraph hidden/attack). Riferimento contrasto: testo 4.5:1.
- **Text scaling TV** (10-foot UI): font grande di default, scala testo regolabile;
  nessuna informazione load-bearing sotto la soglia leggibile dal divano.
- **Indicatori visivi per eventi sonori** (deaf/HoH): critico, status applicato,
  wave/rinforzo spawn, turno nemico, StressWave (lista sincronizzata con
  `draft-audio-design.md` sez. Gap chiusi).

## Input

- Controller primary (TV-first, D-pad), keyboard fallback (PC), touch companion.
- **Remapping controlli**: previsto al lancio.

## Difficolta'

- Scaling enemy count esistente (Easy 0.7x / Normal 1.0x / Hard 1.3x, SoT sez.15.4).
- Le sconfitte by-design (simmetria flag-ON) restano: la leggibilita' P1 e' il
  guardrail, non la riduzione di difficolta' nascosta.

## Fuori scope v1

- Text-to-speech (post-lancio), sottotitoli (nessun voice-over, SoT sez.19 Q19),
  screen-reader companion (valutazione post-EA), surround/3D audio.

## Mappa implementativa

| Requisito                  | Superficie                          | Stato          |
| -------------------------- | ----------------------------------- | -------------- |
| Colorblind palette + shape | Godot-v2 combat HUD, telegraph      | da pianificare |
| Text scaling               | Godot-v2 theme                      | da pianificare |
| Indicatori eventi sonori   | Godot-v2 combat HUD                 | da pianificare |
| Remapping                  | Godot-v2 settings + companion input | da pianificare |
| Difficulty scaling         | backend (esistente, sez.15.4)       | LIVE           |
```

- [ ] **Step 2: registry entry** -- in `docs/governance/docs_registry.json`, dopo l'entry di `docs/superpowers/specs/2026-07-10-studio-track-v09-design.md`, aggiungere:

```json
{
  "path": "docs/core/45-ACCESSIBILITY.md",
  "title": "Accessibilita' -- baseline v1 (EA)",
  "doc_status": "active",
  "doc_owner": "master-dd",
  "workstream": "cross-cutting",
  "last_verified": "2026-07-10",
  "source_of_truth": true,
  "language": "it",
  "review_cycle_days": 90,
  "primary": false,
  "track": "active"
}
```

- [ ] **Step 3: puntatore in SoT 18.2** -- aggiungere come prima riga sotto l'intestazione `### 18.2 Accessibilita'`:

```markdown
> Authority operativa: `docs/core/45-ACCESSIBILITY.md` (baseline v1, 2026-07-10).
> Le decisioni sotto restano come storia.
```

- [ ] **Step 4: verifica governance**

Run: `/c/Users/VGit/AppData/Local/Programs/Python/Python313/python.exe tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict --report /c/Users/VGit/AppData/Local/Temp/gov_report.json`
Expected: `errors=0` (warnings pre-esistenti ok). NB: usare un path REALE per `--report` (un segnaposto tipo scratchpad fra parentesi angolari verrebbe interpretato come redirection dalla shell).

- [ ] **Step 5: prettier + commit**

```bash
"C:/dev/Game/node_modules/.bin/prettier" --write docs/core/45-ACCESSIBILITY.md docs/governance/docs_registry.json docs/core/00-SOURCE-OF-TRUTH.md
git add docs/core/45-ACCESSIBILITY.md docs/governance/docs_registry.json docs/core/00-SOURCE-OF-TRUTH.md
git commit -m "docs(a11y): 45-ACCESSIBILITY baseline v1 + registry + SoT pointer"
```

### Task 5: hub 00-GDD_MASTER refresh

**Files:**

- Modify: `docs/core/00-GDD_MASTER.md` (sez.12 combat, ordine di lettura, +1 riga audience in sez.1)

- [ ] **Step 1: sez.12 "Combat d20 (congelato)"** -- aggiungere in coda alla sezione:

```markdown
Dal 2026-07-10 la simmetria d'azione del Sistema e' FLAG-ON in prod
(`ADR-2026-07-10-sistema-action-symmetry`): per-unit AP, retreat gate, telegraph
threats-only; bande pace quarta ratifica in `15-LEVEL_DESIGN` (sconfitte by-design).
```

- [ ] **Step 2: sez.1 "Tesi di design"** -- aggiungere in coda:

```markdown
Audience primaria DECISA (SoT sez.18.1, 2026-07-10): creature-strategist -- la
fantasia "plasmo la mia specie" guida, la tattica d20 e' il mezzo.
```

- [ ] **Step 3: "Ordine di lettura consigliato"** -- aggiungere la voce:

```markdown
- `45-ACCESSIBILITY.md` -- baseline accessibilita' v1 (dopo 42-STYLE-GUIDE-UI)
```

- [ ] **Step 4: verifica + prettier + commit**

Run: `grep -n "45-ACCESSIBILITY\|creature-strategist\|FLAG-ON" docs/core/00-GDD_MASTER.md`
Expected: 3 hit (uno per step).

```bash
"C:/dev/Game/node_modules/.bin/prettier" --write docs/core/00-GDD_MASTER.md
git add docs/core/00-GDD_MASTER.md
git commit -m "docs(gdd): hub refresh -- symmetry flag-ON, audience, a11y link"
```

### Task 6: gate finale + PR

- [ ] **Step 1: governance completo + ASCII**

Run: governance check come Task 4 step 4 (`errors=0`) + `LC_ALL=C.UTF-8 grep -cP '[^\x00-\x7F]' docs/core/45-ACCESSIBILITY.md` = 0 (gli altri file sono legacy-mixed: contano solo le righe AGGIUNTE, il hook pre-commit le valida).

- [ ] **Step 2: push + PR**

```bash
git push origin HEAD:docs/gdd-refresh-phase1
gh pr create --title "docs(gdd): phase 1 refresh -- sot overlay, audience, audio, a11y" --body "Fase 1 della spec docs/superpowers/specs/2026-07-10-studio-track-v09-design.md: SoT sez.13 stale -> puntatore overlay Godot LIVE; sez.18.1 audience DECISA (creature-strategist primaria); piano audio implementabile (mappa eventi Path A, criteri asset, budget) in draft-audio-design + puntatore 00F; nuovo 45-ACCESSIBILITY.md baseline v1 (+ registry); hub 00-GDD_MASTER aggiornato. Solo doc, nessun cambio runtime."
gh pr comment docs/gdd-refresh-phase1 -R MasterDD-L34D/Game --body "@codex review"
```

- [ ] **Step 3: gate** -- CI verde + Codex clean (o sostituto harsh-reviewer se usage-limit x2), triage P1 obbligatorio, merge dopo review owner o autorizzazione standing.
