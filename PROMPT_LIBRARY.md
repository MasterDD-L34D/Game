# PROMPT_LIBRARY — Evo-Tactics

> **Entrypoint** alla prompt library riusabile. I template veri stanno in `.claude/prompts/`.
> **Scopo**: trovare velocemente il prompt giusto senza ricrearlo da zero.

---

## Template disponibili

Vedi `.claude/prompts/README.md` per elenco completo + policy usage.

**Quick reference**:

| Scenario                                          | Template                                                  | Tool target           |
| ------------------------------------------------- | --------------------------------------------------------- | --------------------- |
| Chiarire player fantasy + core loop nuova feature | `.claude/prompts/02_game_design_core_loop.prompt.md`      | ChatGPT               |
| Trasformare sintesi NotebookLM in backlog/brief   | `.claude/prompts/04_research_bridge.prompt.md`            | ChatGPT               |
| Brief tecnico consolidato per Claude Code         | `.claude/prompts/05_claude_code_brief.prompt.md`          | Claude Code           |
| Audit first-principles game + repo                | `.claude/prompts/09_first_principles_checklist.prompt.md` | Claude Code / ChatGPT |

## Cercare un prompt esistente prima di crearne uno

Grep before write:

```bash
grep -rn "<keyword>" .claude/prompts/
ls .claude/prompts/
```

## Quando aggiungere nuovo prompt

Criteri per meritare un template (da `.claude/prompts/README.md`):

- Pattern ripetuto **almeno 2 volte** in sessioni diverse
- Parametri `[COMPILA]` chiari (non vago)
- Output strutturato (non prosa libera)

**Anti-pattern**: creare prompt template per domande one-off o chat informali.

## Sorgenti esterne

- **Archivio operativo**: `C:/dev/codemasterdd-ai-station/Archivio_Libreria_Operativa_Progetti/05_TEMPLATE_REALI_PROMPTATI/` (9 template originali, 4 cherry-picked per Evo-Tactics)
- **Skill installate con prompt trigger**: `anthropic-skills:first-principles-game`, `anthropic-skills:multi-ai-routing`, ecc. (vedi `LIBRARY.md` sezione skills)
- **TikTok research** (Claude-specific prompts estratti): `docs/planning/2026-04-24-tiktok-screenshots-extraction.md`

## Policy (da 4-gate DoD, eccezione)

Prompt templates sono **one-off assets** — richiedono solo **Gate 1 (research)** mandatorio: citare fonte + use case + target tool. Gate 2 smoke test opzionale (sensato solo se il prompt viene usato cross-sessione con risultati variabili).

## Ref

- `.claude/prompts/README.md` — doc completo prompts library
- `MODEL_ROUTING.md` — quale prompt per quale fase
- `.claude/TASK_PROTOCOL.md` — come invocare prompt in flow ordinato
