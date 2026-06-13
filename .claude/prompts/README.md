# .claude/prompts/ — Prompt Library

Prompt template riusabili copy-paste in ChatGPT / Claude Code / Codex / NotebookLM. Sorgente: `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/05_TEMPLATE_REALI_PROMPTATI/` (archivio operativo esterno), cherry-picked + adattati a Evo-Tactics.

## Contenuto

| File                                      | Scenario                                                             | Target AI                 |
| ----------------------------------------- | -------------------------------------------------------------------- | ------------------------- |
| `02_game_design_core_loop.prompt.md`      | Chiarire player fantasy + core loop + unità minima                   | ChatGPT brainstorm        |
| `04_research_bridge.prompt.md`            | Trasformare sintesi NotebookLM in brief/backlog/archivio             | ChatGPT (post NotebookLM) |
| `05_claude_code_brief.prompt.md`          | Brief tecnico consolidato per Claude Code (implementation prep)      | Claude Code               |
| `09_first_principles_checklist.prompt.md` | Compilazione FIRST_PRINCIPLES_GAME_CHECKLIST per audit repo + design | Claude Code / ChatGPT     |

## Come usarli

1. Apri il file .prompt.md
2. Copia la sezione dentro il `text...` block
3. Sostituisci `[COMPILA]` / `[INCOLLA QUI]` con contenuto reale
4. Incolla nello strumento target

## Quando creare nuovo prompt

- Pattern ripetuto >2 volte in sessioni diverse → vale un template
- Scenario ha parametri `[COMPILA]` chiari (non vago)
- Output atteso è strutturato (non prosa libera)

**Non creare prompt per**: one-off, domande vaghe, chat informali.

## Policy

Prompt templates sono considerati "one-off assets" dalla policy 4-gate DoD — richiedono solo **Gate 1 (research)** mandatorio: citare la fonte (archivio file originale) + use case + target tool. Smoke test opzionale.

## Ref

- Sorgente archivio: `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/05_TEMPLATE_REALI_PROMPTATI/`
- MODEL_ROUTING: `MODEL_ROUTING.md` (quale prompt per quale fase)
- Skill `/compact`: `.claude/skills/compact.md` (copre session handoff, equivalente di archivio `07_Compact_Handoff.prompt.md`)
