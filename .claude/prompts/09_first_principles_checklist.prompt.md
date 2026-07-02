# Prompt 09 — First Principles Checklist (Evo-Tactics)

**Fonte**: `05_TEMPLATE_REALI_PROMPTATI/09_First_Principles_Game_Checklist.prompt.md` archivio.

## Quando usarlo

- Audit periodico pre-sprint: "siamo ancora sulla rotta giusta?"
- Decisione refactor grande (>200 LOC): vale la pena?
- Emergenza feature creep / scope confusion
- Onboarding nuovo collaboratore (produce brief leggibile cold)

## Target tool

**Claude Code** (Opus 4.7) per auto-audit con accesso repo, oppure **ChatGPT** se parte da zero in brainstorm mode.

**Skill installata**: `anthropic-skills:first-principles-game` trigger "applica first principles" / "audit del design" / "verità fondamentali del gioco".

## Campi da compilare

- **Contesto game**: stato attuale sprint + pilastri (da CLAUDE.md)
- **Contesto repo**: state + sistemi attuali rilevanti
- **Problemi percepiti**: friction points specifici

## Prompt pronto

```text
Agisci come Game Systems Designer + Principal Engineer per Evo-Tactics
(co-op tactical game d20, MVP 2026-04-26 completato M16-M20 + Vision Gap
V1-V7 6/7).

Ti fornirò contesto di gioco + stato del repo + sistemi attuali + problemi
percepiti. Compila (o aiutami a compilare) una checklist first-principles
per decidere se il progetto è pronto per il prossimo passo (refactor,
nuova feature, sprint close) o se serve consolidare prima.

Compila queste sezioni:

1. **Verità fondamentali del gioco** (game truths): 3-5 truths che se
   tagli, il gioco non è più quello che vuoi.
2. **Core mechanic first**: qual è la meccanica che regge tutto? è chiara?
3. **Test di cancellazione**: per ogni sistema X, se lo tagli, il core
   sopravvive? Se sì = accessory. Se no = core, protect it.
4. **Triade fondamentale** (game / system / repo): i 3 livelli sono
   allineati o si tradiscono?
5. **Rule of threes / progressione di apprendimento**: il player impara
   cose in ordine sensato? Troppo in una volta? Troppo dilazionato?
6. **Player dynamics first**: cosa produce il gioco davvero nel player
   (emozioni, decisioni, pattern)? corrisponde a visione?
7. **Rational design**: ogni sistema ha una ragione chiara di esistere?
   Cerimonie o eredità mascherate?
8. **Implicazioni per il repo**: il code rispetta le game truths o
   aggiunge ceremony?
9. **Decisione finale sul tipo di refactor**: nessuno / localizzato /
   boundary / systemic / riscrivere core?
10. **Gate finale**: è pronto per lo sprint proposto? sì / no / serve
    consolidare prima X?

Per ogni sezione:
- marca ciò che è chiaro
- marca ciò che è incerto
- evidenzia le ipotesi ancora non validate
- proponi cosa devo verificare prima di codificare

Se i dati sono insufficienti, non inventare. Scrivi cosa manca.

Contesto game (CLAUDE.md pilastri + sprint context + vision):
[INCOLLA o "leggi CLAUDE.md sezione Pilastri di design"]

Contesto repo (stato attuale, sistemi chiave, ultimi 5-10 PR):
[INCOLLA o "leggi COMPACT_CONTEXT.md + git log --oneline -10"]

Problemi percepiti (user friction, bug pattern, dev friction):
[COMPILA]
```

## Output atteso

Checklist compilata in 10 sezioni, ogni sezione con:

- ✅ confermato (data-backed)
- ⚠️ incerto (ipotesi non validata)
- ❌ gap (serve ulteriore verifica)
- Azione proposta

Doc salvato in `docs/reports/first-principles-audit-YYYY-MM-DD.md`. Se verdict section 9 è "systemic refactor" o "riscrivere core" → gate user mandatory prima di qualsiasi code.
