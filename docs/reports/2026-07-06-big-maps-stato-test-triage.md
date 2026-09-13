---
title: 'Big-maps arc 2026-07-06 -- quadro stato + test su main + triage delegabile'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-07-06'
source_of_truth: false
language: it
review_cycle_days: 30
---

# Big-maps arc — quadro stato, test su main, triage delegabile (2026-07-06 sera)

> Base: main `8026f9c49` (post-merge #3229/#3230/#3231), worktree = main esatto (0 behind).
> Macchina: Ryzen (Node v24.11.0, Python 3.13.2). Tutti i numeri misurati, non stimati.

---

## 1. Quadro stato

### Arco big-maps — FATTO (merged su main)

| Mattone | PR | SHA | Stato |
| --- | --- | --- | --- |
| D9 geometry gate (xpBudget flag-OFF + author-guard grid-ratify + drop estimated_turns) | #3197 | `83cf6e7dd` | MERGED 07-03 |
| fase-2c grid-wiring (`board_scale: party_sized\|grid_sized`, band-neutral opt-in) | #3199 | `6703f7821` | MERGED 07-03 |
| ADR-2026-07-03 board_scale draft→active | #3200 | `cf158b09c` | MERGED 07-03 |
| Primo encounter grid_sized 16x12 (`enc_badlands_dorsale_ferrosa_01`) + N=40 ratify + 3 bug backend reali fixati (clamp pre-resolve, ID rinforzi duplicati, stepAway quadrato) | #3229 | `c8d108da8` | MERGED 07-06 |
| Secondo grid_sized al cap 20x12 (`enc_badlands_canyon_lungo_01`) + probe GENERICO `tools/sim/grid-band-probe.js` | #3230 | `88b1d34b6` | MERGED 07-06 |
| D4 intents roster-scaling flag-gated + A/B N=10 (negative result: lever attivazione da solo non rompe il ceiling; collo = conversione) | #3231 | `8026f9c49` | MERGED 07-06 |

Bande pace RATIFICATE: 16x12 → **[10, 18]** (dorsale, avg 14.03 sd 1.9); 20x12 → **[10, 17]**
(canyon, avg 12.85 sd 1.25). Semantica banda = completion + pace + reinforcement-liveness,
NON letalita' (ceiling di modello WR 1.0 su ogni arm). Evidence:
`docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md` + `2026-07-06-canyon-lungo-grid-ratify.md`
+ `2026-07-06-intents-roster-scaling-ab.md`. Baseline: `data/core/balance/grid_ratify_baseline.json`
(23 entry, validator 0 warn).

⚠️ **Marker stale trovati (anti-pattern #19)**: `BACKLOG.md` sez. big-maps ha ancora aperti i
checkbox "autora >=1 grid_sized" e "N=10→N=40 ratify" — entrambi CHIUSI da #3229/#3230.
`COMPACT_CONTEXT.md:15` dice "0 big-board autorata" — stale. Fix nel mattone M4 sotto.

### In volo (altre sessioni — NON duplicare)

| PR | Cosa | Nota |
| --- | --- | --- |
| **#3232** `fix(sim): hash string seeds so full-loop combats pin the RNG` | Chip seeding fullLoopRouting | GIA' in corso, confermato aperto 07-06 19:10. M3 sotto ci si accoda DOPO il merge. |
| #3233 `test(tools): characterize schema_enum_diff helpers` | Lane char-test L3 | Fuori arco. |
| #3218 weekly drift audit (draft) | Governance | ESCLUSA dall'arco per direttiva. |
| #3196 daily tracker refresh | Automation | Routine. |

### Decisioni owner-gated pendenti (Eduardo)

1. **Flip `XP_BUDGET_GEOMETRY_ENABLED`** — gated su calibrazione D9 (mattone M2): oggi il
   termine geometry OVER-predice (dorsale: budget 200 / used 590 / ratio 2.95 → `critical_over`
   mentre il fight misurato e' WR 1.0; `activation_ratio` 0.75 e' il campo piu' vicino al vero).
2. **Variante capture_point** (layout dorsale gia' pronto) — gated su AI zone-defense (esito
   design D4, mattone D5): finche' l'AI non difende una zona, capture = ceiling.
3. **Flip scaling intents** (`#3231`, flag OFF) — NON proposto: negative result A/B N=10,
   il lever attivazione da solo non separa. Feed per la spec D5.
4. Merge di ogni PR dei mattoni sotto (policy: merge = Eduardo).

---

## 2. Test su main (misurati, seriali)

| Suite | Comando | Risultato |
| --- | --- | --- |
| AI | `node --test tests/ai/*.test.js` | **584 pass / 0 fail** (13 suite, 1.8s) |
| Sim (32 file, UNO alla volta) | `node --test tests/sim/<file>` seriale | **229 pass / 0 fail**, exit 0 su tutti i 32 file, zero EADDRINUSE, zero AssertionError |
| Grid-ratify author-guard | `node tools/js/validate_encounter_grid_ratify.js` | **0 warning**, exit 0 |
| Dataset | `py -3.13 tools/py/game_cli.py validate-datasets` | **PASS** — 14 controlli, 3 avvisi (non-fatali), "Tutti i dataset YAML sono validi" |

Nota ambiente: worktree fresco → `npm ci` completo (387 package, verificato conteggio —
lesson npm-ci-parziale). Full `npm run test:api` NON eseguito su Ryzen (EADDRINUSE noto,
memoria `reference_game_apisuite_eaddrinuse`).

---

## 3. Tabella metodi applicati

| Metodo | Applicazione concreta in questa sessione |
| --- | --- |
| Verify-first / ground-truth (anti-pattern #19, L-075) | Chip seeding = PR #3232 gia' aperta → non duplicato; BACKLOG big-maps = 2 checkbox stale (chiusi da #3229/#3230) → flaggati; encounter grid_sized localizzati su disco (`docs/planning/encounters/`), non fidato il marker |
| Test seriali per-file (memoria EADDRINUSE Ryzen) | tests/sim 32 file uno-a-uno con exit code per file; solo AssertionError = fail reale (0 trovati) |
| Numeri, non "sembra ok" | 584/584 · 229/0 · 0 warn · 14 controlli/3 avvisi · 387 package |
| agent-scanner LITE (OD-007, obbligo pre-raccomandazione) | Inventario: 17 agent progetto + 1 user (`sot-drift-verifier`) + skills; riuso mappato per ogni mattone; **0 agent nuovi proposti** (build-on-existing); ARCHON detected su HOME (tier FULL disponibile, non necessario qui) |
| N-sample authority | N=10 = direction probe, N=40 = ratify; bande [10,18]/[10,17] gia' ratificate N=40; M2 richiede evidence N=40 prima del flip |
| SDMG | Coefficienti calibrazione M2 = PROPOSED, decider Eduardo; nessun valore owner sostituito |
| Output-to-file (limiti token) | Questo report in `docs/reports/`, recap inline 1-2 frasi |
| ADR-0011 | Ogni prompt di delega impone trailer `Coding-Agent:` + `Trace-Id:` e VIETA `Co-Authored-By:` |

---

## 4. Agent discovery report (agent-scanner LITE, scope: Game worktree)

Fonti: `.claude/agents/` (17), `~/.claude/agents/` (1), skills progetto (7) + user. Cap 50 non raggiunto.
Nessun SILENT OVERRIDE (worktree e main repo condividono gli stessi file = stesso repo).

| Riuso per mattone | Agent/skill ESISTENTE |
| --- | --- |
| M1 terzo encounter grid_sized | Sessione standard + `pcg-level-design-illuminator` (audit layout pre-PR) + probe generico `grid-band-probe.js` gia' costruito |
| M2 calibrazione geometry D9 | `balance-auditor` (EV/outlier statico) + `balance-illuminator` modalita' calibration (toolkit SPRT/Optuna, memoria `feedback_calibration_toolkit_2026_05_21`) |
| M3 censimento seed | Sessione standard / subagent `Explore` (read-only sweep) — nessun agent dedicato serve |
| M4 doc-fix | Sessione standard, doc-only |
| D5 spec lever D4 | `sot-planner` + skill `grilling` (design-gated con Eduardo) |

Verdetto anti-shadow-duplicate: **nessun agent nuovo da creare** — ogni mattone ha copertura esistente.

---

## 5. Triage mattoni

| Mattone | Classe | Perche' |
| --- | --- | --- |
| M1 — Terzo encounter grid_sized su bioma con hazard | **Meccanico-delegabile** | Metodo replicabile (2 esemplari + probe generico + authority doc); valori encounter = PROPOSED comunque |
| M2 — Calibrazione N=40 termine geometry xpBudget (D9 warn→calibra→block) | **Meccanico-delegabile** (evidence + valori PROPOSED); il flip resta owner | Dati gia' in `reports/sim/` + spec D9 chiara; fit predicted-vs-measured e' lavoro d'harness |
| M3 — Censimento seed non-pinnati tests/sim | **Meccanico-delegabile** (DOPO merge #3232) | Sweep + fix pattern noto (lesson seed numerici); collisione con #3232 se partito ora |
| M4 — Doc-fix 15-LEVEL_DESIGN bande pace + BACKLOG/COMPACT sync | **Meccanico-delegabile** (piccolo) | Doc-only, evidence gia' ratificata |
| M5 (riserva) — Convergenza xpBudget Node vs Python | **Meccanico-analitico** (bassa priorita') | BACKLOG noto; sensato DOPO M2 (calibrare prima di convergere) |
| D5 — Lever D4 comportamentale (zone-defense / intent-type unlock tier alti) | **Design-gated** | Serve spec con fork espliciti PRIMA del build; delegabile solo lo SPEC-DRAFT recon-first |
| Flip `XP_BUDGET_GEOMETRY_ENABLED` | **Owner-gated** | Post-M2, decisione Eduardo |
| Variante capture_point dorsale | **Owner-gated** | Dipende dall'esito D5 (AI zone-defense) |

Sequenza consigliata: M4 (subito, 30min) → M1 e M2 in parallelo (file disgiunti) → M3 post-#3232 → D5 spec-draft quando vuoi il grilling → M5 post-M2.

---

## 6. Prompt di delega pronti

Regole comuni a TUTTI (incluse nei prompt): branch dedicato + PR, merge = Eduardo (NO self-merge,
NO auto-merge); commit trailer ADR-0011 `Coding-Agent: <agent-id>` + `Trace-Id: <uuidv7>` e
VIETATO `Co-Authored-By:`; prefissi commit lowercase; guardrail sprint (no `.github/workflows/`,
`migrations/`, `packages/contracts/`, `services/generation/`; regola 50 righe fuori `apps/backend/`);
niente nuove dipendenze.

### PROMPT M1 — Terzo encounter grid_sized (bioma hazard)

```text
Repo C:\dev\Game, parti da origin/main fresco (>= 8026f9c49). Task: autora il TERZO encounter
`board_scale: grid_sized` su un bioma DIVERSO da badlands, preferibilmente con hazard tiles
(candidato: deserto_caldo — e' l'unico encounter-bioma oggi con hazard, e da' segnale al termine
geometry D9). Board intermedia con aspect ratio nuovo, es. grid_size: [18, 10] (schema cap: w<=20).

AUTHORITY metodo (leggi PRIMA): docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md
(semantica banda = completion+pace+liveness, NON letalita' — ceiling WR 1.0 noto, non e' un bug)
+ docs/research/2026-07-06-canyon-lungo-grid-ratify.md (probe generico). Esemplari YAML:
docs/planning/encounters/enc_badlands_dorsale_ferrosa_01.yaml e enc_badlands_canyon_lungo_01.yaml.

Principi design B3 (spec docs/superpowers/specs/2026-07-03-encounter-geometry-difficulty-gate-design.md):
pochi nodi difendibili (2-3 strutture), chokepoint LOS-reali (LOS default ON), typed tiles ~15-20%
NO fill uniforme, reinforcement_entry_tiles mai alle spalle del party (Manhattan >= 4),
valvola finita max_total_spawns: 4, elimination + loss_conditions.time_limit anti-turtle.

Pipeline OBBLIGATORIA (L-069): (1) N=10 direction probe con
node tools/sim/grid-band-probe.js --encounter <id> (seeds numerici appaiati 1..10 — MAI stringhe,
lesson_numeric_seeds_paired_sim); (2) se direction stabile → N=40 ratify (seeds 1..40);
(3) SOLO post-N=40: aggiorna data/core/balance/grid_ratify_baseline.json (grid_size + evidence_ref
+ ratified_at) e scrivi doc evidence docs/research/2026-07-06-<slug>-grid-ratify.md con frontmatter
governance + registrazione in docs/governance/docs_registry.json stessa PR.

VINCOLI: nessun edit schema (il campo grid_size/board_scale esiste gia'); nessun flag flippato;
band-neutral per gli altri 23 encounter (validator deve dare 0 warn su di loro); valori encounter
= PROPOSED (SDMG, decider Eduardo). Se il bioma scelto non ha party canonico tutorial, usa il
party badlands canonico come i 2 esemplari e DICHIARALO nel doc.

DoD: N=10 e N=40 con tabella (WR + CI95 Wilson, KO-rate, avg_rounds + banda pace proposta,
avg_reinforcements, timeouts) + artifacts reports/sim/<slug>-n10|n40/;
node tools/js/validate_encounter_grid_ratify.js → 0 warning; py -3.13 tools/py/game_cli.py
validate-datasets → PASS; node --test tests/sim/scenarioEnemiesAuthoredGrid.test.js +
tests/api/sessionStartBoardScale.test.js verdi; python tools/check_docs_governance.py --strict
errors=0; npm run format:check verde. PR con rollback plan (revert singolo commit). Merge = Eduardo.
Commit trailer: Coding-Agent: claude-code + Trace-Id: <uuidv7 generato>. VIETATO Co-Authored-By.
```

### PROMPT M2 — Calibrazione N=40 termine geometry xpBudget (D9)

```text
Repo C:\dev\Game, parti da origin/main fresco (>= 8026f9c49). Task: calibra il termine
geometry-aware di xpBudget (D9 "warn poi promuovi") con evidence N=40. Il FLIP di
XP_BUDGET_GEOMETRY_ENABLED NON e' nel tuo scope (owner-gated, Eduardo).

CONTESTO: apps/backend/services/balance/xpBudget.js:205 (flag idiom, default OFF) +
data/core/balance/xp_budget.yaml sez. geometry terms (riga ~75) + spec
docs/superpowers/specs/2026-07-03-encounter-geometry-difficulty-gate-design.md.
PROBLEMA MISURATO (docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md sez. xpBudget):
sul primo grid_sized il modello stat-mass OVER-predice (budget 200 / used 590 / ratio 2.95 →
critical_over) mentre il fight misurato e' WR 1.0 — ignora l'action-economy (dial
intents_per_round: Calm 1 / Escalated 2 / Apex 3 azioni GLOBALI, sessionHelpers TIERS).
Il campo passivo activation_ratio (Shape 2, #3197) e' il piu' vicino al vero (0.75 → under).

TASK: (1) costruisci tabella predicted-vs-measured su TUTTI gli encounter con evidence sim
disponibile — riusa reports/sim/dorsale-ferrosa-n40, canyon-lungo-n40, intents-scaling-*
(runs.jsonl + summary.json) prima di lanciare run nuove; se servono run nuove usa
tools/sim/grid-band-probe.js --encounter <id>, seeds numerici appaiati, N=40 per ratify.
(2) Proponi ri-taratura dei coefficienti geometry in xp_budget.yaml (pesare activation_ratio
vs stat-mass) che elimini l'over-predict sui grid_sized SENZA rompere i 21 party_sized
(warn parity: stessi verdetti di oggi flag-OFF, o delta dichiarato riga per riga).
(3) Ogni valore proposto = PROPOSED (SDMG) con evidence a fianco; scrivi doc
docs/research/2026-07-06-xpbudget-geometry-calibration.md (frontmatter + registry stessa PR).

VINCOLI: flag resta OFF (band-neutral, byte-identical runtime a flag unset); modifiche codice
solo in apps/backend/services/balance/ (test inclusi); niente packages/contracts; valori yaml
solo data/core/balance/xp_budget.yaml. Riuso agent: balance-auditor per EV-parity statico
(la sim policy fa solo basic-attack → WR-probe su singola ability = false-null, memoria
TKT-P6-AP3); balance-illuminator calibration mode se serve Optuna/SPRT.

DoD: node --test tests/services/balance/*.test.js (o suite xpBudget esistente — trova con
grep -rl XP_BUDGET_GEOMETRY tests/) verde; node --test tests/ai/*.test.js → 584/584;
tabella predicted-vs-measured nel doc; python tools/check_docs_governance.py --strict errors=0;
npm run format:check verde. PR con rollback plan. Merge = Eduardo.
Commit trailer: Coding-Agent: claude-code + Trace-Id: <uuidv7 generato>. VIETATO Co-Authored-By.
```

### PROMPT M3 — Censimento seed non-pinnati tests/sim (POST-merge #3232)

```text
Repo C:\dev\Game. PREREQUISITO HARD: verifica che la PR #3232 (fix/sim-fullloop-routing-seed,
"hash string seeds so full-loop combats pin the RNG") sia MERGED su main — se ancora aperta
FERMATI e segnala (collisione). Parti da origin/main fresco post-#3232.

TASK: censimento + fix dei seed non-pinnati in tests/sim/ e tools/sim/. Lesson di riferimento
(lesson_numeric_seeds_paired_sim): il combat RNG di session.js accetta solo seed NUMERICO —
un seed stringa non hashata cade su Math.random = run non riproducibili e armi non appaiate.
#3232 introduce l'hashing nel path full-loop: LEGGI il suo diff per capire QUALI call-path
ora hashano, poi censisci il resto.

SOSPETTI GIA' INDIVIDUATI (grep 2026-07-06, verifica tu lo stato post-#3232):
tests/sim/combatAdapter.test.js seed stringa 'fl-seed-1'/'det-1'/'graded-1'/'stale-1'/'oa2-test'/'apr-1';
tests/sim/fullLoopObjectiveWire.test.js 'surv-wire-1'; tests/sim/fullLoopRunner.test.js
'fl1b'/'fl2c-esfp'/'fl-pi-skirm'; tests/sim/fullLoopRouting.test.js 'route-g'/'route-i'/'route-e'
(questi ultimi = oggetto di #3232, probabilmente gia' coperti).

PER OGNI ingresso seed: classifica (numerico / stringa-hashata / stringa-NON-pinnata / assente)
e per i non-pinnati fixa (numerico, o instrada nel path hashato di #3232 — coerente con la
convenzione che #3232 stabilisce, non inventarne una terza). PROVA obbligatoria: doppio run
byte-identical degli assert deterministici (2x node --test <file>, stesso esito e stessi valori).

VINCOLI: tests/sim seriale UNO alla volta (mai npm run test:api su Ryzen — EADDRINUSE;
solo AssertionError = fail reale); scope SOLO tests/sim + tools/sim (niente backend);
nessun cambio di comportamento dei probe N=40 gia' ratificati (se un fix seed cambia i valori
attesi di un assert, quello e' un assert che testava rumore: documentalo nel PR body).

DoD: tabella censimento completa nel PR body (file / riga / classe / azione); 32 file
tests/sim verdi seriali (riporta pass/fail per file); doppio-run proof. PR piccola.
Merge = Eduardo. Commit trailer: Coding-Agent: claude-code + Trace-Id: <uuidv7 generato>.
VIETATO Co-Authored-By.
```

### PROMPT M4 — Doc-fix 15-LEVEL_DESIGN bande pace + sync marker stale

```text
Repo C:\dev\Game, parti da origin/main fresco (>= 8026f9c49). Task doc-only, piccolo.

(1) docs/core/15-LEVEL_DESIGN.md, sezione "Regola re-ratify grid (2026-07-03)" (riga ~124):
aggiungi le bande pace RATIFICATE N=40 dei primi 2 encounter grid_sized —
16x12 [10, 18] (enc_badlands_dorsale_ferrosa_01, evidence
docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md) e 20x12 [10, 17]
(enc_badlands_canyon_lungo_01, evidence docs/research/2026-07-06-canyon-lungo-grid-ratify.md).
INCLUDI la semantica: banda = completion + pace + reinforcement-liveness, NON letalita'
(ceiling di modello WR 1.0 sul driver AI-vs-AI, vedi doc dorsale "Limite di modello").
Pointer agli esemplari YAML in docs/planning/encounters/. NON riscrivere il resto della sezione.

(2) BACKLOG.md sez. "Big-maps arc": spunta i primi 2 checkbox (autora grid_sized / N=10→N=40)
con SHA #3229 c8d108da8 + #3230 88b1d34b6; lascia aperti flip geometria (owner-gated) e
convergenza Node-vs-Python; aggiungi riga per #3231 8026f9c49 (D4 scaling infra flag-OFF,
negative result A/B — evidence docs/research/2026-07-06-intents-roster-scaling-ab.md).

(3) COMPACT_CONTEXT.md riga ~15: "0 big-board autorata" e' STALE → aggiorna (2 autorate+ratificate).

VINCOLI: doc-only, nessun file fuori da questi 3; 15-LEVEL_DESIGN e' docs/core → rispetta il
frontmatter esistente (bump last_verified a 2026-07-06); italiano.

DoD: python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict
→ errors=0; npm run format:check verde; git diff SOLO i 3 file. PR singola. Merge = Eduardo.
Commit trailer: Coding-Agent: claude-code + Trace-Id: <uuidv7 generato>. VIETATO Co-Authored-By.
```

### PROMPT D5 — SPEC-DRAFT lever D4 comportamentale (design-gated: SOLO spec, NO build)

```text
Repo C:\dev\Game, parti da origin/main fresco (>= 8026f9c49). Task: SPEC-DRAFT recon-first per
il lever comportamentale D4 — zone-defense AI e/o intent-type unlock dei tier alti negli YAML
intents. VIETATO buildare: deliverable = solo il documento spec con fork espliciti per Eduardo.

FEED OBBLIGATORIO (leggi tutti): docs/research/2026-07-06-intents-roster-scaling-ab.md
(negative result: il lever attivazione da solo NON rompe il ceiling; ipotesi di lavoro =
collo di bottiglia nella CONVERSIONE delle attivazioni) +
docs/research/2026-07-06-dorsale-ferrosa-grid-ratify.md sez. "Limite di modello" (dial
intents_per_round cappato: Calm 1 / Escalated 2 / Apex 3 azioni globali; variante capture_point
pronta nel layout ma ceiling finche' l'AI non difende una zona) +
docs/planning/2026-07-06-sistema-intents-roster-scaling-spec.md (spec D4 threat-dial gia'
shippata flag-OFF #3231) + apps/backend/services/ai/declareSistemaIntents.js + tools/sim/
combat-policy.js (ZONE_PURSUIT_OBJECTIVES esiste gia' lato PLAYER-sim: capture_point/sabotage/
escape/escort — il gap e' lato SISTEMA).

RECON: mappa dove vivono gli intent-type YAML e i tier (grep intents data/ + sessionConstants/
sessionHelpers), cosa serve per un intent "difendi zona X" (target = tile set, non actor) e per
un unlock per-tier. Fork da esplicitare (decider Eduardo, SDMG): (A) zone-defense come intent
nuovo vs riuso pattern esistente; (B) unlock tier-gated (Apex-only?) vs per-encounter authored;
(C) criterio di misura del "morde" (delta KO-rate/pace su capture_point N=40, arm control);
(D) interazione col dial roster-scaling #3231 (i due lever si compongono?).

FORMATO: docs/planning/2026-07-XX-sistema-zone-defense-spec-draft.md, frontmatter governance
+ registry stessa PR, sezioni: contesto / recon ground-truth / opzioni per fork con costi e
blast-radius / criterio evidence (N=10 direction → N=40 ratify) / cosa NON fa. Band-neutral
by construction (e' un doc). DoD: governance strict errors=0, format:check verde. PR draft,
review + verdetti = Eduardo (usa AskUserQuestion se interattivo, altrimenti lista fork nel doc).
Commit trailer: Coding-Agent: claude-code + Trace-Id: <uuidv7 generato>. VIETATO Co-Authored-By.
```

### PROMPT M5 (riserva, post-M2) — Convergenza xpBudget Node vs Python

```text
Repo C:\dev\Game. PREREQUISITO: M2 (calibrazione geometry) MERGED — convergere PRIMA di
calibrare significherebbe convergere due modelli entrambi scalibrati. Task: riconcilia
apps/backend/services/balance/xpBudget.js (Node, runtime) con tools/py/encounter_xp_budget.py
(Python, pipeline) — BACKLOG sez. big-maps "modelli divergenti". (1) Tabella divergenze
term-by-term sui 23 encounter (stesso input → output a confronto); (2) proposta: Node = SoT
runtime, Python si allinea (o viceversa con motivazione); (3) fix + test parity cross-runtime
(fixture JSON condivisa). VINCOLI: comportamento runtime flag-OFF invariato; niente
packages/contracts. DoD: test parity verde in entrambi i runtime, node --test tests/ai 584/584,
pytest mirato verde, tabella nel PR body. Merge = Eduardo. Trailer ADR-0011 come sopra.
```

---

## 7. Note finali

- Questo report e' UNTRACKED nel worktree: se lo committi, registralo in
  `docs/governance/docs_registry.json` nella stessa PR (governance strict).
- `?? dev/` untracked nel worktree: non mio, non toccato.
- M1+M2 parallelizzabili (file disgiunti); M3 serializza dietro #3232; M4 indipendente e immediato.
