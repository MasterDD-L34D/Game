# CLAUDE.md section template — paste into your project CLAUDE.md

Questo template va **incollato** nel `CLAUDE.md` del tuo progetto (tipicamente prima della sezione "Platform notes" o equivalente). Personalizza `<PROJECT_NAME>`, `<MEMORY_PATH>`.

---

## Session workflow patterns (Claude Code + Flint)

Pattern codificati in memory per persistenza cross-session. Dettagli in `feedback_*.md` sotto `<MEMORY_PATH>` (tipicamente `~/.claude/projects/<proj-hash>/memory/`).

**File principali**:

- `feedback_claude_workflow_consolidated.md` — **9 pattern consolidati**: tabella opzioni, caveman voice, checkpoint memory, CI auto-merge, delega research, piano file:line, admit+reinvestigate, probe-before-batch, research-critique
- `feedback_meta_checkpoint_directive.md` — pausa riflessiva 5-step, auto-trigger su "analizza"/"ricorda"/"checkpoint", comando `/meta-checkpoint`
- `reference_flint_optimization_guide.md` — 40+ fonti research + kill-60 decision log + follow-up priorities

Memory files auto-caricati via `MEMORY.md` ogni sessione.

## Flint tool

`<PROJECT_NAME>` usa Flint (companion CLI + Claude Code integration) per:

- Classificatore commit semantico (pluggable taxonomy)
- Diagnostic passiva (`flint status` on-demand, no auto-hook)
- Classification framework 4D per decisioni kill/keep tool
- Archive preservation pattern per decisioni reversibili

**Canonical doc**: [flint/PROJECT.md](flint/PROJECT.md)
**Quick start**: `python3 flint/tools/flint_status_stdlib.py --output docs/flint-status.json`
**Narrative on-demand**: `dammi un flint` in chat (5 sub-comandi documentati)
