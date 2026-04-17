---
title: 'Player Personas — Validation Framework (DRAFT)'
doc_status: draft
doc_owner: governance
workstream: cross-cutting
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# Player Personas — Validation Framework

**Stato**: 🟡 DRAFT — richiede validazione Master DD
**Branch**: `explore/open-questions-triage` (Q-001)
**Risolve**: A5 (SoT §18.1 — 3 proposte da validare)

## Contesto

SoT §18.1 propone 3 player personas senza formalizzazione:

1. **Tattico da salotto** — FFT/Fire Emblem background, TV condivisa, profondità
2. **Giocatore di ruolo** — tabletop background, apprezza d20 + personalità creature
3. **Curioso casual** — attratto co-op TV, retention via progressione

Nessun validation criterion definito → impossibile verificare se scelte design servono personas target.

## Framework proposto

Per ogni persona: **scheda canonica** con 7 campi validati da playtest + link a pilastri design.

### Template scheda persona

```yaml
persona_id: <slug>
display_name: <nome breve>
pillar_affinity: [pilastro_1, pilastro_5] # pilastri design più rilevanti
background:
  origin_games: [FFT, Fire_Emblem, ...]
  session_length_target_min: 30-60
  skill_level: beginner|intermediate|advanced
context_of_play:
  setup: TV_couch|desktop|companion_mobile
  social: solo|co-op_local|co-op_remote
  frequency: daily|weekly|weekend
motivation_primary: <1 frase>
motivation_secondary: <1 frase>
friction_points:
  - <cosa li fa abbandonare>
retention_hook:
  - <cosa li fa tornare>
success_metrics:
  onboarding:
    tutorial_completion_rate: '>=70%'
    time_to_first_win_min: '<30'
  retention:
    day_1: '>=40%'
    day_7: '>=20%'
    day_30: '>=10%'
  depth:
    avg_session_length_min: '>=25'
    trait_diversity_used: '>=15 different traits by h10'
```

## Personas draft canoniche

### P1 · Tattico da Salotto

```yaml
persona_id: tattico_salotto
display_name: 'Tattico da Salotto'
pillar_affinity: [1, 3, 4] # tattica leggibile + identità + temperamenti
background:
  origin_games: [FFT, Fire_Emblem_Three_Houses, Advance_Wars, Into_the_Breach]
  session_length_target_min: 45-90
  skill_level: intermediate
context_of_play:
  setup: TV_couch
  social: solo|co-op_local
  frequency: weekly
motivation_primary: 'Decisioni tattiche leggibili con conseguenze visibili'
motivation_secondary: 'Ottimizzare build creatura × job lungo più match'
friction_points:
  - 'UI non leggibile da 3m di distanza'
  - 'Turn sequence che spezza il flow'
  - 'RNG opaco che sembra bara'
retention_hook:
  - 'Incontri via via più complessi con nuovi pattern Sistema'
  - 'Meta-loop Nido → build nuove combinazioni'
success_metrics:
  onboarding:
    tutorial_completion_rate: '>=80%'
    time_to_first_win_min: '<20'
  retention:
    day_7: '>=30%'
    day_30: '>=15%'
  depth:
    avg_session_length_min: '>=45'
    trait_diversity_used: '>=25 by h20'
```

### P2 · Giocatore di Ruolo

```yaml
persona_id: giocatore_ruolo
display_name: 'Giocatore di Ruolo'
pillar_affinity: [2, 3, 4, 5] # evoluzione + identità + temperamenti + co-op
background:
  origin_games: [D&D_5e, Pathfinder, Baldurs_Gate_3, Solasta]
  session_length_target_min: 60-120
  skill_level: advanced
context_of_play:
  setup: TV_couch|desktop
  social: co-op_local|co-op_remote
  frequency: weekly
motivation_primary: 'Narrativa emergente da sistema d20 + personalità creature'
motivation_secondary: 'MBTI/Ennea come role-play layer, non stat wrapper'
friction_points:
  - 'MBTI ridotto a numeri, senza narrative payoff'
  - 'd20 risolto senza trasparenza (niente log, niente breakdown)'
  - 'Accoppiamento meccanico senza significato narrativo'
retention_hook:
  - 'Ogni creatura ha storia emergente via VC + mating memories'
  - 'Briefing Ink dinamico per encounter'
  - 'Debrief mostra decisioni alternative'
success_metrics:
  onboarding:
    tutorial_completion_rate: '>=70%'
    time_to_first_win_min: '<40'
  retention:
    day_7: '>=40%'
    day_30: '>=25%'
  depth:
    avg_session_length_min: '>=60'
    memory_slots_used: '>=5 distinct narrative threads by h15'
```

### P3 · Curioso Casual

```yaml
persona_id: curioso_casual
display_name: 'Curioso Casual'
pillar_affinity: [2, 5, 6] # evoluzione + co-op + fairness
background:
  origin_games: [Stardew_Valley, Overcooked, It_Takes_Two, Pokemon]
  session_length_target_min: 20-45
  skill_level: beginner
context_of_play:
  setup: TV_couch
  social: co-op_local
  frequency: weekend
motivation_primary: 'Vedere le creature evolvere con la partner/figlio/amico'
motivation_secondary: 'Sessioni brevi senza grind obbligatorio'
friction_points:
  - 'Tutorial che assume TTRPG background'
  - 'Fail state punitivo che blocca progresso'
  - 'Micro-management eccessivo (trait vs job vs equip)'
retention_hook:
  - 'Creature progressive che ricordano decisioni'
  - 'Briefing narrativi che spiegano perché combattiamo'
  - 'Difficoltà regolabile senza vergogna'
success_metrics:
  onboarding:
    tutorial_completion_rate: '>=65%'
    time_to_first_win_min: '<15'
  retention:
    day_1: '>=50%'
    day_7: '>=25%'
    day_30: '>=8%'
  depth:
    avg_session_length_min: '>=25'
    coop_sessions_pct: '>=70%'
```

## Validation plan

### Fase 1 — Internal review (Master DD, 1 settimana)

- [ ] Conferma che 3 personas coprono target mercato (o aggiungi P4 mancante)
- [ ] Conferma affinità pilastri 1-6
- [ ] Conferma success metrics realistici
- [ ] Conferma friction points via brainstorm team

### Fase 2 — Cross-check vs decisioni design (2 settimane)

Per ogni major design decision attiva o pianificata:

- Identifica persona primaria
- Verifica friction point risolto
- Verifica retention hook supportato

Esempio:

| Decision                       | P1 Tattico  | P2 Ruolo                | P3 Casual           | Notes                    |
| ------------------------------ | ----------- | ----------------------- | ------------------- | ------------------------ |
| d20 + MoS visibile             | ✅ primaria | ✅ primaria             | ⚠️ opzionale toggle | P3 vuole semplificazione |
| Tri-Sorgente offer 3+skip      | ✅ depth    | ⚠️ troppo random?       | ✅ scelta chiara    | P2 chiede breakdown      |
| Utility AI difficulty profiles | ✅ adatta   | ⚠️ voglio regole chiare | ✅ easy/normal/hard | P2 teme randomness       |

### Fase 3 — Playtest validation (post vertical slice)

Reclutare 3-5 persone per persona:

- Session 60-90 min TV setup
- Post-session interview: "ti riconosci in questa descrizione?"
- Metrics tracking: session length, abandonment point, retention day 1/7
- Output: confermare/ribaltare/aggiungere personas

## Aperto per Master DD

- 3 personas sufficienti? **[SI/NO/+P4]**
- Success metrics realistici? **[SI/NO/ADJUST]**
- Validation plan accettabile? **[SI/NO/ALT]**
- Priorità ingaggio playtester per Fase 3: **[Q2/Q3/post-M4]**?

Alla conferma DRAFT → active + promozione a `docs/core/18-PLAYER_PERSONAS.md`.
