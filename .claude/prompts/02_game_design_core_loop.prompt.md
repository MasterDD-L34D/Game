# Prompt 02 — Game Design / Core Loop (Evo-Tactics)

**Fonte**: `05_TEMPLATE_REALI_PROMPTATI/02_Game_Design_Core_Loop.prompt.md` archivio.

## Quando usarlo

- Design nuovo sub-system (job, trait class, biome, encounter pattern)
- Audit core loop esistente quando emergono segnali di confusione player
- Chiarire fantasy target prima di committare a ticket implementation

## Target tool

**ChatGPT (GPT-5 / o3)** — brainstorm senza commit pressure. Poi passa output a Claude Code via `05_claude_code_brief.prompt.md` per implementation.

## Campi da compilare

- **Titolo sub-system/feature**: es. "Mating/Nido system (V3 deferred)"
- **Genere di contesto**: tattico d20 co-op / evolutionary / MBTI-axis
- **Esperienza target**: cosa deve provare il player
- **Idea grezza**: 2-4 righe
- **Vincoli di scope**: effort max, dipendenze, guardrail

## Prompt pronto

```text
Sto lavorando su un sub-system del gioco Evo-Tactics (tactical RPG co-op d20
con evoluzione emergente stile Spore + temperamenti MBTI/Ennea + co-op vs AI
"Sistema"). Voglio mettere ordine nel design prima di codificare.

Agisci come Game Systems Designer + Product Designer del gameplay.

Voglio:
1. player fantasy centrale che questo sub-system supporta
2. core loop del sub-system (input → decisione → feedback → conseguenza)
3. sub-loop annidati se presenti
4. decisioni interessanti del giocatore (non false binaries, vero trade-off)
5. punti di confusione, noia, complessità tossica, rischio skip-player
6. come si intreccia con i 6 Pilastri (tattica / evoluzione / specie×job /
   MBTI / co-op / fairness)
7. priorità di design immediate (cosa shippare prima, cosa deferrere)

Se il sub-system è già parzialmente esistente, identifica cosa va mantenuto
vs cosa va rifatto. Non inventare dati, se manca qualcosa dillo.

Titolo sub-system:
[COMPILA]

Esperienza target:
[COMPILA]

Idea grezza + materiale esistente (ADR, doc, playtest data):
[INCOLLA QUI]

Vincoli di scope (effort, deps, guardrail):
[COMPILA]
```

## Output atteso

Doc markdown strutturato che Claude Code possa leggere come input a un ticket di implementation. Una volta completato, vedi `05_claude_code_brief.prompt.md` per passarlo a Claude.
