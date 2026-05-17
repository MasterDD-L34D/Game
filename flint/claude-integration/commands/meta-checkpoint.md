---
name: meta-checkpoint
description: Pausa riflessiva su workflow — salva stato, auto-analizza sessione, spawn 2 agent paralleli (audit infra + pattern ispiratori), proponi Z-tight codifica
user_invocable: true
---

# Meta-Checkpoint

Invocare quando sessione è lunga/produttiva e vuoi codificare behaviors emergenti in memory persistente, prima di dimenticare. Pattern derivato dalla sessione 2026-04-18 (12 PR, 7 feedback files codificati).

Vedi anche: `feedback_meta_checkpoint_directive.md` in memory user per auto-trigger su phrase naturali ("analizza", "ricorda", "checkpoint").

## Steps

### 1. Save current checkpoint

Scrivi memory file `~/.claude/projects/<project>/memory/project_<slug>_progress.md` con:

- PR aperte + stato CI (pass/pending/fail)
- Prossimo step proposto (ultimo su tabella opzioni fornita all'utente)
- Cosa salti e perché (feature rinviate con motivo)
- Test count attuale + baseline

Usa `type: project` nel frontmatter. Aggiungi entry in `MEMORY.md` index.

### 2. Self-analyze last 15-20 user inputs

Trascrivi numerati in tabella:

| #   | Input (trunc 60 chars) | Tipo | Parole |
| --- | ---------------------- | ---- | -----: |

Tipologie: Vision/scope | Domanda chiarimento | Conferma | Scelta opzione | Meta-direttiva | Approvazione | Comando attivazione.

Poi categorizza per:

- **Stile scrittura**: tratti ricorrenti (typo rate, abbreviazioni, maiuscole, imperativo vs costruito)
- **Frequenza parole-chiave**: conta occorrenze top-10 con contesto
- **Pattern decisionale**: trust-delegate × N, scelta lettera/numero × N, meta-review × N, ecc
- **Errori/criticità**: typo su comandi tecnici, ambiguità scelte, perdita context
- **Preferenze implicite**: velocità > cerimonia, voce specifica, delega, ecc (forza 🟢🟡🔴)

### 3. Spawn 2 agent paralleli

Singola Agent tool call con multiple invocations:

**Agent #1 — Infrastructure audit** (`general-purpose`):

```
Mappa dove "come lavorare" è codificato in questo repo:
1. CLAUDE.md (root + eventuali sub) — sezioni meta, guardrail, DoD
2. Memory files ~/.claude/projects/.../memory/ — feedback_*, user_*, project_*, reference_*
3. Skills locali .claude/skills/
4. Agents locali .claude/agents/
5. Commands .claude/commands/
6. AGENTS.md root + .ai/ (Codex only, ma leggibile come riferimento)
7. Hooks in .claude/settings*.json
Output: tabella per layer + gap noti. Max 2000 parole.
```

**Agent #2 — Pattern inspiration** (`general-purpose`):

```
Trova pattern "meta-istruzione per AI" ispiratori:
1. In repo: AGENTS.md + .ai/BOOT_PROFILE.md, docs/ops/COMMAND_LIBRARY.md, docs/pipelines/GOLDEN_PATH.md, .ai/<agente>/PROFILE.md × 3
2. Skills Anthropic installate ~/.claude/plugins/cache/: identifica 3 pattern SKILL.md più polish
3. CLAUDE.md struttura sezioni
Output: pattern dal repo + pattern skills + template candidato SKILL.md con frontmatter + struttura sezioni (200 parole max). Max 2000 parole totali.
```

Parallel = singolo messaggio con 2 Agent invocations.

### 4. Synthesize comportamenti × utente × codifica

Tabella di riscontro:

| Behavior AI osservato | Utente reinforce? | Già codificato? | Action                   |
| --------------------- | :---------------: | :-------------: | ------------------------ |
| Pattern 1             |     🟢/🟡/⚪      |      ✅/❌      | CODIFICA / SKIP / UPDATE |

Gap list: cosa osservi che utente non ha toccato + cosa codificato ma non riflesso.

### 5. Proponi Z-tight

Minimo vitale. Preferenza ordine:

1. **N feedback memory files brevi** (10-30 righe ciascuno, auto-load via MEMORY.md)
2. **Eventuale CLAUDE.md update** (sezione "Workflow patterns" o simile, ≤20 righe)
3. **Skill complessa**: SOLO se pattern osservato ≥3 volte + user esplicito

**NON applicare** fino a "procedi" utente. Mostra lista file da creare + diff proposto.

### 6. Apply on confirmation

Scrivi file uno per uno. Aggiorna `MEMORY.md` index atomico. Se CLAUDE.md update, PR dedicata doc-only. Commit atomico.

### 7. Resume previous work

Dopo codifica, leggi `project_<slug>_progress.md` Step 1 e riprendi da step proposto.

## Quando invocare

- Fine sprint denso (≥5 PR giornata)
- Fine sessione lunga (≥15 turn)
- Dopo giornata di iterazioni su stesso scope
- Quando utente dice "analizza", "ricorda", "è rimasto qualcosa", "come lavoriamo"

## Quando NON invocare

- Single task conclusa (scope piccolo, costo > benefit)
- Richiesta stato tecnico sprint (usa `evo-tactics-monitor` invece)
- Già fatto meta-checkpoint in questa sessione (overkill)
