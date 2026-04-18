---
title: Commit Style — Evo-Tactics
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-17
source_of_truth: true
language: it
review_cycle_days: 30
---

# Commit Style

Convenzione prefix commit OBBLIGATORIA. Versione minimal di Conventional Commits. Niente scope-parenthesis obbligato, solo il prefix.

**Scopo**: classificare subito l'impatto (gameplay vs infra vs data vs docs) sia per umani che per tool automatici (caveman CLI, classifier).

---

## Prefix validi

### `play:` — gameplay

Modifiche che **cambiano come si gioca**.

Include:

- specie, tratti, mating, gene_slots
- combat rules (d20, MoS, damage step, parry, status)
- AI Sistema (policy, utilityBrain, pressure tier)
- jobs, morph, species×job
- biomi (regole, hazard, terreno)
- round orchestrator
- VC scoring (se tocca formula, non solo refactor)
- Encounter, missioni, tutorial

Esempi:

- `play: d20 crit soglia passa da MoS 10 a MoS 12`
- `play: aggiungi trait denti_seghettati a foglioni_rossi`
- `play: Utility AI aggressive profile default-on`
- `play: Nightmare difficulty unlock post-clear`

### `infra:` — infrastructure

Modifiche che **non toccano il gioco** ma abilitano sviluppo.

Include:

- CI/CD (.github/workflows, GitHub Actions)
- docker-compose, Dockerfile
- build tooling (vite, prettier, eslint)
- pre-commit hooks (Husky, lefthook)
- npm scripts non-gameplay
- migrations DB schema
- deploy scripts

Esempi:

- `infra: upgrade Node 22.19 matrix`
- `infra: Prisma migrate deploy in Docker bootstrap`
- `infra: prettier v3.3 config strict`

### `data:` — dataset

Modifiche **solo a dataset** (YAML/JSON canonici) senza logic code.

Include:

- data/core/\*.yaml
- packs/evo_tactics_pack/data/\*\*
- schemas/evo/\*.json (AJV)
- packages/contracts/schemas/\*.json
- i18n bundles (data/i18n/\*\*)
- mocks (apps/dashboard/public/data/\*\*)

Esempi:

- `data: mating.yaml aggiungi gene_slot memoria_ambientale`
- `data: biomes.yaml difficulty_base savana 1.0 → 0.8`
- `data: accessibility.yaml preset motion_sensitive`

### `doc:` — documentation

Modifiche a **solo documentazione/markdown** (no code, no data).

Include:

- README.md, CLAUDE.md, CONTRIBUTING.md
- docs/\*\* (inclusi core, hubs, ADR, planning, pitch, playtests, governance)
- changelog (se solo narrativa)
- RESEARCH_TODO.md

Esempi:

- `doc: ADR-2026-04-17 XP Cipher park`
- `doc: aggiorna PILLARS_STATUS post-playtest`
- `doc: sync README con pitch v4`

### `cut:` — remove

Commit che **tolgono roba** (deprecated, dead code, archive). Opzionale.

Include:

- rimozione moduli legacy
- archive docs superati
- delete feature flagged off
- rimozione test obsoleti

Esempi:

- `cut: legacy sistemaTurnRunner sequential-mode (M17 round-model default)`
- `cut: mission-console scaffold apps/dashboard/ (#1343)`
- `cut: XP Cipher cross-refs obsoleti (ADR-2026-04-17)`

---

## Formato completo raccomandato

```
<prefix>: <imperative summary ≤50 char>

<body opzionale, spiega "why" non "what"
— il diff spiega già il what>

<footer opzionale: refs, co-authors, Closes #N>
```

Esempio completo:

```
play: Nightmare difficulty unlock post-clear

Risolve Q-001 T2.3: nightmare profile non più sempre disponibile.
Flag player_progress.nightmare_unlocked triggerato su first campaign
victory (gate M6). Evita scoraggiamento onboarding, preserva retention
hook P1/P2 (Tattico / Ruolo).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

---

## Casi ambigui

| Situazione                           | Prefix                                         |
| ------------------------------------ | ---------------------------------------------- |
| Cambi YAML + JS handler che lo legge | `play:` (primario)                             |
| Aggiorni test per feature gameplay   | `play:` (sono parte del design)                |
| Aggiungi schema AJV senza handler    | `data:`                                        |
| Refactor pure code senza game change | `infra:`                                       |
| README + codice insieme              | `doc:` se minor, `play:` se cambia how-to-play |
| Playtest notes con dati raccolti     | `playtest:` (eccezione, per RESEARCH_TODO M1)  |

**Regola pollice**: se il **giocatore finale** noterebbe il cambio = `play:`. Altrimenti = altro.

---

## Anti-pattern

- ❌ `update`, `fix`, `wip` senza prefix → respinto da convention check (quando installato)
- ❌ Conventional Commits full (es. `feat(scope): ...`) — overkill, usa minimal
- ❌ Prefix multipli (`play,data:`) — scegli il più impattante
- ❌ Messaggi > 80 char in prima riga → linter warn

---

## Integrazione caveman CLI

**Pending**: quando `flint` (drop v0.2) sarà installato nel repo, `flint/src/caveman/repo.py` userà prefix come **primo segnale** di classificazione commit (più affidabile del keyword matching attuale su GAMEPLAY/INFRA/etc).

Mapping:

- `play:` → GAMEPLAY
- `infra:` → INFRA
- `data:` → DATA
- `doc:` → DOCS
- `cut:` → ALTRO (con flag `is_removal=True`)
- no-prefix → fallback keyword classifier (legacy)

Tracked: TODO post-install drop v0.2.

---

## Quando ignorare questa regola

Mai. Se serve cambiare, apri issue motivante prima (regola RESEARCH_TODO per file di governance).

---

_Vedi anche: `RESEARCH_TODO.md` S2 · `CAVEMAN.md` (quando installato drop v0.2) · README §How._
