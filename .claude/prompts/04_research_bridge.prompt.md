# Prompt 04 — Research Bridge (NotebookLM → ChatGPT → Claude Code)

**Fonte**: `05_TEMPLATE_REALI_PROMPTATI/04_NotebookLM_to_ChatGPT_Bridge.prompt.md` archivio.

## Quando usarlo

- Hai analizzato corpus research esterno con NotebookLM (PDF, transcripts, 20+ fonti)
- Vuoi trasformare la sintesi NotebookLM in struttura operativa committabile (brief, ticket, ADR)
- Esempio Evo-Tactics: sintesi Triangle Strategy (14 pagine NotebookLM) → 10 meccaniche classificate per transfer plan

## Target tool

**ChatGPT (GPT-5 / o3)** post-NotebookLM. Dopo quest'estrazione, passa il risultato a Claude Code per write diretto nel repo.

## Campi da compilare

- **Nome progetto**: Evo-Tactics (default)
- **Obiettivo fase**: es. "transfer plan Triangle Strategy mechanics"
- **Sintesi NotebookLM**: paste del markdown prodotto da NotebookLM

## Prompt pronto

```text
Questa sintesi viene da NotebookLM ed è basata su N fonti eterogenee del
progetto (ricerca esterna su tactical RPG, repo esterni, papers, video
transcripts). Le fonti sono già citate dentro.

Agisci come Project Architect + PM + Archivist per un co-op tactical game
d20 (Evo-Tactics) in fase MVP.

Voglio:
1. Separa il materiale in 5 categorie pure:
   - REFERENCE (pattern, esempi, prior art da citare)
   - DECISIONI (scelte prese o da prendere, con alternatives)
   - VINCOLI (limiti hard, dipendenze, blockers)
   - IDEE APERTE (proposte + rationale ma non ancora decise)
   - PROBLEMI (gap, bug, tension points identificati)

2. Identifica cosa di queste categorie entra in:
   - `PROJECT_BRIEF.md` (identità stabile, vision, vincoli long-term)
   - `DECISIONS_LOG.md` (index ADR esistenti) + eventuale ADR nuovo
   - `BACKLOG` ticket (CLAUDE.md sezione backlog ticket aperti)
   - `docs/research/` (se è deep dive riutilizzabile)
   - `docs/planning/` (se è roadmap/handoff)

3. Trasforma il materiale in struttura operativa:
   - 3-5 ticket concrete con effort S/M/L
   - 1-2 ADR draft se emergono decisioni vincolanti
   - 1 transfer plan doc se è research esterna

4. Dimmi quale prompt della libreria `.claude/prompts/` usare come prossimo
   step (02 game design? 05 Claude Code brief? 09 first principles?).

Se i dati sono insufficienti per una categoria, dillo — non inventare.

Nome progetto: Evo-Tactics

Obiettivo di questa fase:
[COMPILA]

Sintesi NotebookLM (paste raw markdown):
[INCOLLA QUI]
```

## Output atteso

Struttura markdown con 5 categorie + mapping a file target + 3-5 ticket actionable. Portabile in Claude Code come input a `05_claude_code_brief.prompt.md` se si vuole implementation immediate.
