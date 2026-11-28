---
title: Flint kill-60 archive manifest
doc_status: archived
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-18
source_of_truth: false
language: it-en
review_cycle_days: 180
---

# Flint kill-60 archive — 2026-04-18

## Contesto

Sessione 2026-04-18 ha eseguito research-critique su Flint (ex-evo-caveman). 2 agent paralleli + 40+ fonti letteratura → verdetto **Flint 4/10 investimento** → **kill 60%** del lavoro fatto.

Questo archive preserva tutto il materiale rimosso con **classificazione per valore/applicabilità/stato** così in futuro puoi decidere di:

- Riaprire il sotto-progetto specifico (restore da git + archive)
- Riusare pattern per altro progetto
- Validare decisione con dati nuovi

**PR di riferimento**: [#1556 chore(flint): kill 60%](https://github.com/MasterDD-L34D/Game/pull/1556). Questo archive = PR successiva (cronologica).

## Sources che hanno guidato il kill

Lista completa + altre 40+: vedi `~/.claude/projects/C--Users-VGit-Desktop-Game/memory/reference_flint_optimization_guide.md`.

**MUST READ** prima di eventuale re-open:

1. [Sam Liberty — Gamification undermines intrinsic motivation](https://medium.com/design-bootcamp/gamification-does-not-increase-motivation-heres-what-to-know-c6a0e9bdc136)
2. [Karl Zylinski — Solodevs trap of game engine](https://zylinski.se/posts/solodevs-and-the-trap-of-the-game-engine/)
3. [dev.to/azrael654 — Productivity tools = procrastination](https://dev.to/azrael654/most-developer-productivity-tools-are-just-procrastination-with-better-ux-39gl)
4. [ICSE 2021 — Gamification empirical](https://johanneswachs.com/papers/msw_icse21.pdf)
5. [Lethain — Skepticism meta-productivity](https://lethain.com/developer-meta-productivity-tools/)
6. [Sonar — Bit Rot silent killer](https://www.sonarsource.com/blog/bit-rot-the-silent-killer)
7. [Stackdevflow — Git hooks friction 2026](https://stackdevflow.com/posts/husky-modern-git-hooks-best-practices-and-whats-new-n72u)

---

## Inventario + classificazione

### Dimensioni

- **Valore scope**: quanto copre bisogni reali (🟢 alto · 🟡 medio · 🔴 basso)
- **Applicabilità**: chi/cosa può usarlo (universal / gamedev / solo-dev-only / single-user / evo-tactics-only)
- **Stato sviluppo**: production / experimental / draft / deprecated / killed
- **Re-open cost**: effort per riattivare (XS <30min / S ≤2h / M ≤1gg / L >1gg)

---

## Code rimosso

### 1. `code/achievements.py` — Achievement system Flint

| Dimensione     | Valore                                |
| -------------- | ------------------------------------- |
| Valore scope   | 🔴 Basso                              |
| Applicabilità  | single-user (gamification solo-dev)   |
| Stato sviluppo | deprecated                            |
| Re-open cost   | XS (paste back in `flint/src/flint/`) |

**Cosa fa**: 8 achievement pattern-matched su snapshot repo (Game-First Striker, Ruthless Cutter, Docker Addict warning, ecc). `compute_achievements(snap)` → lista Achievement con `unlocked` flag.

**Perché killed**: [Liberty](https://medium.com/design-bootcamp/gamification-does-not-increase-motivation-heres-what-to-know-c6a0e9bdc136) + NTNU — tangible rewards undermine intrinsic motivation. Self-gamification solo-dev = Skinner box di breve durata (2-3 settimane), poi satura. [ICSE 2021](https://johanneswachs.com/papers/msw_icse21.pdf) mostra streak counter rimozione → comportamento cambia (prova che è distorcente).

**Re-open condition**: se Evo-Tactics diventa team ≥3 person, gamification cross-team può avere senso (García-Mireles 2022 — engagement come mediatore). NOT per solo-dev.

### 2. `code/post-commit` — Husky hook auto-rigenera status JSON

| Dimensione     | Valore                              |
| -------------- | ----------------------------------- |
| Valore scope   | 🟡 Medio                            |
| Applicabilità  | evo-tactics-only                    |
| Stato sviluppo | deprecated                          |
| Re-open cost   | XS (copy back `.husky/post-commit`) |

**Cosa fa**: dopo ogni git commit, chiama `flint export` o `flint_status_stdlib.py` → rigenera `docs/flint-status.json`. Skip graceful durante rebase/merge.

**Perché killed**: [Stackdevflow 2026](https://stackdevflow.com/posts/husky-modern-git-hooks-best-practices-and-whats-new-n72u) — hooks aggiungono 300-500ms × 20 commit/giorno = friction invisibile senza ROI. Status rigenerabile on-demand senza hook.

**Re-open condition**: se vuoi dashboard live gameplay ratio per QA esterno. Alternativa: cron 5-min o manual `flint export` pre-commit tramite UI.

---

## Memory feedback files

8 file uno-per-pattern consolidati in 1 file (vedi `feedback_claude_workflow_consolidated.md`). Preservati qui in forma archiviale per futura ripristinabilità split.

| File                                                             |  Valore  | Applicabilità      |      Stato       | Re-open |
| ---------------------------------------------------------------- | :------: | ------------------ | :--------------: | :-----: |
| `memory-feedback/feedback_always_options_table.md`               | 🟢 Alto  | universal          | **consolidated** |   XS    |
| `memory-feedback/feedback_caveman_voice_permanent.md`            | 🟢 Alto  | evo-tactics-only   | **consolidated** |   XS    |
| `memory-feedback/feedback_checkpoint_memory_on_interrupt.md`     | 🟢 Alto  | universal          | **consolidated** |   XS    |
| `memory-feedback/feedback_ci_auto_merge_gate.md`                 | 🟢 Alto  | gamedev            | **consolidated** |   XS    |
| `memory-feedback/feedback_delegate_research_to_agents.md`        | 🟢 Alto  | universal          | **consolidated** |   XS    |
| `memory-feedback/feedback_plan_before_code_file_line.md`         | 🟢 Alto  | universal          | **consolidated** |   XS    |
| `memory-feedback/feedback_admit_incomplete_and_reinvestigate.md` | 🟢 Alto  | universal          | **consolidated** |   XS    |
| `memory-feedback/feedback_probe_before_batch.md`                 | 🟡 Medio | gamedev / data-ops | **consolidated** |   XS    |

**Motivazione consolidamento**: [Lethain skepticism meta-productivity](https://lethain.com/developer-meta-productivity-tools/) + [dev.to/leena_malhotra](https://dev.to/leena_malhotra/the-developer-productivity-trap-why-more-tools-doesnt-mean-better-output-l7k) — indirection N-file > 1 file con sezioni. Context budget Claude scala con N.

**Re-open condition**: se MEMORY.md supera 200 righe (soglia truncation) o se un pattern diventa sufficientemente grande da meritare file dedicato (es. 200+ righe).

**Nota**: i file archiviati qui sono **snapshot pre-consolidamento**. Il contenuto canonico vive nel consolidated. Se ri-split, usa questi come seed ma aggiorna per riflettere versione più evoluta nel consolidated.

---

## Skills rimosse

### `skills/flint-narrative.md` — Skill blocco narrativo Claude Code locale

| Dimensione     | Valore                                        |
| -------------- | --------------------------------------------- |
| Valore scope   | 🔴 Basso (novelty decay 5-7 giorni)           |
| Applicabilità  | single-user (narrative alter-ego Evo-Tactics) |
| Stato sviluppo | killed                                        |
| Re-open cost   | XS (move back to `.claude/skills/`)           |

**Cosa faceva**: auto-trigger blocco `🦴/🪨/🔥 *...*` a fine risposta su trigger phrase ("fatto", "merged", "caveman"). 5 categorie (micro_sprint / design_hint / mini_game / evo_twist / scope_check).

**Perché killed (2026-04-18)**: confusione concettuale con plugin upstream `caveman:caveman`. Plugin = voice compression ONLY. Skill narrativa = **ex-Flint**, non caveman. Utente ha identificato drift: continuavo a generare blocchi nonostante avessi codificato "no auto-trigger" in feedback. Coerenza kill 60% richiede rimozione completa dell'auto-trigger.

**Riferimenti fonte**: stesse di Flint kill 60% (dev.to/azrael654 novelty decay, Lethain meta-productivity).

**Preservato separato**: `flint-narrative-skill/` nella repo root resta come asset destinato upload Claude.ai web (non CLI). Se un giorno serve narrativa su claude.ai, zip + upload.

**Re-open condition**: utente esplicito richiede "riattiva narrativa caveman block". Nessun auto-trigger mai più in base all'episodio 2026-04-18.

---

## README/FLINT.md sections rimosse

| File                                   | Contenuto                                                      |  Valore  | Re-open |
| -------------------------------------- | -------------------------------------------------------------- | :------: | :-----: |
| `readme-sections/achievement-table.md` | Achievement table 8-row + "Hook automatico" setup instructions | 🔴 Basso |   XS    |

Se achievement.py viene ripristinato → anche table in README va ripristinata (copy-paste).

---

## Decisione gate (memorizzato per futuro)

**Data decisione**: 2026-04-18
**Autore**: Eduardo + Claude Opus 4.7 research-critique session

**Condizioni per re-open parziale**:

1. **Achievement system** → solo se team ≥3 persone (non solo-dev)
2. **Post-commit hook** → solo se serve dashboard live esterna (QA, stakeholder, sponsor)
3. **Memory split** → solo se consolidated supera 500 righe o un pattern specifico cresce molto

**Condizioni per re-open totale Flint**:

- Eduardo chiede esplicitamente "riattiva Flint" dopo aver fatto playtest reale di Evo-Tactics ≥10 sessioni
- Trovato bisogno concreto non coperto da `flint status` passivo diagnostic
- Budget tempo manutenzione allocato esplicitamente (>30 min/settimana)

**Condizioni per kill 100% Flint (cancellazione totale)**:

- 7 giorni dal kill 60% → flint status non consultato nemmeno 1 volta
- Tempo manutenzione Flint >30 min/settimana senza gameplay output proporzionale
- Noti di tweakare Flint invece che progredire su encounter 6-10 / art / audio

---

## Come rileggere questo archive

- **Chi**: Eduardo al prossimo research su dev-tooling Evo-Tactics, Claude Code al re-open
- **Quando**: se si manifesta pain reale non coperto da tool attuali (current: `flint status` diagnostic + CLAUDE.md workflow section + memory consolidated)
- **Come**: leggi MUST READ sources prima, poi valuta re-open condition sopra, poi decidi se ri-attivare parte specifica

---

## Sessione storica (contesto)

- **Giornata 2026-04-18 totali**: 15 PR merged (record)
- **Flint infra**: 14 PR (dal rename evo-caveman → flint al kill 60%)
- **Evo-Tactics gameplay**: 1 PR (il giorno precedente + iter sprint)
- **Kill decision**: basata su agent critique + 40+ fonti academic/industry
- **Risultato netto**: Flint ridotto a diagnostic passivo. 60% lavoro archiviato.

**Onesto**: le 14 PR Flint erano yak shaving. Il gioco è il prodotto. Archive come prova.
