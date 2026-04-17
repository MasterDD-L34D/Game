---
title: 'Player Personas — Validation Framework'
doc_status: active
doc_owner: governance
workstream: cross-cutting
last_verified: 2026-04-17
source_of_truth: false
language: it
review_cycle_days: 30
---

# Player Personas — Validation Framework

**Stato**: 🟢 ACTIVE — approvato Master DD 2026-04-17 (Q-001 T2.2, scope espanso da 3 a 10 personas)
**Branch**: `explore/open-questions-triage` (Q-001)
**Risolve**: A5 (SoT §18.1 — 3 proposte insufficienti → estese a 10)

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

### P4 · Speedrunner

```yaml
persona_id: speedrunner
display_name: 'Speedrunner'
pillar_affinity: [1, 6] # tattica leggibile + fairness (timer/reproducibility)
background:
  origin_games: [Celeste, Hollow_Knight, Into_the_Breach, FTL]
  session_length_target_min: 15-45
  skill_level: advanced
context_of_play:
  setup: desktop|TV_couch
  social: solo
  frequency: daily
motivation_primary: 'Ottimizzare tempo di completamento encounter + campaign'
motivation_secondary: 'Trovare skip, sequence break, strategie dominanti'
friction_points:
  - 'Animazioni non-skippable'
  - 'Loading non skippabili'
  - 'RNG non-seedable (impossibile replay segment)'
  - 'Turni forzati lenti'
retention_hook:
  - 'Timer ufficiale tracciato, leaderboard locale'
  - 'Seed input per reproducibility run'
  - 'Any% + 100% categories'
success_metrics:
  onboarding:
    tutorial_completion_rate: '>=60%'
    time_to_first_win_min: '<10'
  retention:
    day_7: '>=30%'
    day_30: '>=20%'
  depth:
    runs_per_session: '>=3'
    skip_animations_enabled_pct: '>=80%'
```

### P5 · Streamer / Content Creator

```yaml
persona_id: streamer_creator
display_name: 'Streamer / Content Creator'
pillar_affinity: [4, 5] # temperamenti visibili + co-op visible System drama
background:
  origin_games: [Baldurs_Gate_3, Darkest_Dungeon, XCOM, Dungeons_Dragons]
  session_length_target_min: 60-180
  skill_level: intermediate-advanced
context_of_play:
  setup: desktop|multi_setup_stream
  social: solo_with_audience|co-op_remote
  frequency: weekly (stream schedule)
motivation_primary: 'Narrative + visible decision moments per audience engagement'
motivation_secondary: 'Replay clippable (highlight moments)'
friction_points:
  - 'UI troppo piccola per stream (1080p viewer)'
  - 'No spectator mode per co-op stream'
  - 'Decisioni interne senza visibility (no MBTI reveal)'
  - 'Copyright music (DMCA)'
retention_hook:
  - 'Debrief con replay + highlights auto-extractable'
  - 'UI grande TV-safe = anche stream-safe'
  - 'Music CC0/royalty-free (no DMCA)'
  - 'Overlay mode (hide internal stats per audience)'
success_metrics:
  onboarding:
    tutorial_completion_rate: '>=75%'
    time_to_first_win_min: '<25'
  retention:
    day_7: '>=50%' # content pipeline motiva ritorno
    day_30: '>=30%'
  depth:
    avg_session_length_min: '>=90'
    replay_exports_per_session: '>=1'
```

### P6 · Tryharder (competitive skill ceiling)

```yaml
persona_id: tryharder
display_name: 'Tryharder'
pillar_affinity: [1, 6] # tattica profonda + fairness assoluta
background:
  origin_games: [Slay_the_Spire, Monster_Train, Into_the_Breach, Teamfight_Tactics]
  session_length_target_min: 60-180
  skill_level: advanced-expert
context_of_play:
  setup: desktop
  social: solo
  frequency: daily
motivation_primary: 'Mastery absoluta, zero errore tattico, hard mode clear'
motivation_secondary: 'Breakdown matematico per ogni decisione'
friction_points:
  - 'RNG variance alto senza skill counterplay'
  - 'Informazione nascosta (hidden stat non disclosable)'
  - 'Nightmare difficulty troppo facile o impossibile (non skill-based)'
  - 'Nerf/buff balance shift senza patchnote dettagliato'
retention_hook:
  - 'Nightmare difficulty scalabile per skill'
  - 'Full stat disclosure + formula breakdown accessibile'
  - 'Daily challenge con seed fisso (leaderboard)'
  - 'Patchnote numerico (non solo narrative)'
success_metrics:
  onboarding:
    tutorial_completion_rate: '>=85%'
    time_to_first_win_min: '<15'
  retention:
    day_7: '>=60%'
    day_30: '>=40%'
  depth:
    nightmare_unlock_time_hours: '<40'
    avg_session_length_min: '>=120'
```

### P7 · Collezionista (completionist)

```yaml
persona_id: collezionista
display_name: 'Collezionista'
pillar_affinity: [2, 3] # evoluzione + identità (collect all species/traits)
background:
  origin_games: [Pokemon, Monster_Hunter, Stardew_Valley, Animal_Crossing, Ni_no_Kuni]
  session_length_target_min: 45-120
  skill_level: intermediate
context_of_play:
  setup: TV_couch|desktop
  social: solo|co-op_local_relaxed
  frequency: daily
motivation_primary: 'Collezionare ogni specie, variant, trait, bioma'
motivation_secondary: 'Completare catalogo con dettagli narrativi'
friction_points:
  - 'Content gated dietro RNG drop troppo basso'
  - 'No tracker progressi collezione'
  - 'Missable content senza warning'
  - 'Respawn rates frustranti'
retention_hook:
  - 'Bestiary completo con lore per ogni specie'
  - 'Collection tracker in Settings (% completion, missing items)'
  - 'Meta-loop Nido = collezione via mating'
  - 'Platinum achievement su 100% catalog'
success_metrics:
  onboarding:
    tutorial_completion_rate: '>=75%'
    time_to_first_win_min: '<25'
  retention:
    day_7: '>=45%'
    day_30: '>=35%'
  depth:
    species_collected_by_h20: '>=60%'
    catalog_views_per_session: '>=3'
```

### P8 · Powerbuilder (min-maxer)

```yaml
persona_id: powerbuilder
display_name: 'Powerbuilder'
pillar_affinity: [2, 3] # evoluzione + identità (build crafting)
background:
  origin_games: [Path_of_Exile, Diablo_3, Elden_Ring, Grim_Dawn, Last_Epoch]
  session_length_target_min: 60-180
  skill_level: advanced
context_of_play:
  setup: desktop
  social: solo
  frequency: daily
motivation_primary: 'Costruire build broken/ottimale per trivializzare content'
motivation_secondary: 'Discover sinergie trait × job × species non ovvie'
friction_points:
  - 'Build diversity bassa (1-2 meta build dominanti)'
  - 'Respec costi proibitivi'
  - 'Trait interaction opache (no tooltip dettagliato)'
  - 'Endgame limited (no build test ground)'
retention_hook:
  - 'Respec economico o gratuito'
  - 'Theorycraft tools (damage calculator in-game)'
  - 'Endgame arena con enemy scalable per build test'
  - 'Community share build code (seed-based import)'
success_metrics:
  onboarding:
    tutorial_completion_rate: '>=70%'
    time_to_first_win_min: '<20'
  retention:
    day_7: '>=55%'
    day_30: '>=35%'
  depth:
    distinct_builds_tried: '>=5 by h30'
    theorycraft_usage_pct: '>=40%'
```

### P9 · Narrative Explorer

```yaml
persona_id: narrative_explorer
display_name: 'Narrative Explorer'
pillar_affinity: [2, 4, 5] # evoluzione emergente + temperamenti + Sistema
background:
  origin_games: [Disco_Elysium, Pentiment, Citizen_Sleeper, Norco, The_Banner_Saga]
  session_length_target_min: 60-150
  skill_level: beginner-intermediate
context_of_play:
  setup: TV_couch|desktop
  social: solo
  frequency: weekly
motivation_primary: 'Immergersi in lore Sistema + creature, scoperte narrative'
motivation_secondary: 'Storie emergenti da creature con personalità'
friction_points:
  - 'Combat forced ripetitivo fra beat narrativi'
  - 'Dialogue skippable ma non ri-leggibile'
  - 'No codex / no lore library'
  - 'Creature anonime (nomi generici senza storia)'
retention_hook:
  - 'Codex lore espandibile via progression'
  - 'Briefing/debrief Ink con scelte ramificate'
  - 'Creature named (anche auto-generated) con tratti narrativi'
  - 'Low combat mode / narrative mode (auto-resolve tattico)'
success_metrics:
  onboarding:
    tutorial_completion_rate: '>=70%'
    time_to_first_win_min: '<35'
  retention:
    day_7: '>=35%'
    day_30: '>=20%'
  depth:
    codex_entries_read_pct: '>=50%'
    narrative_choices_branching: '>=30 decisions per campaign'
```

### P10 · Social Co-op Regular

```yaml
persona_id: social_coop
display_name: 'Social Co-op Regular'
pillar_affinity: [5] # co-op vs System primario
background:
  origin_games: [Overcooked, It_Takes_Two, Keep_Talking_and_Nobody_Explodes, Heave_Ho]
  session_length_target_min: 45-90
  skill_level: beginner-intermediate
context_of_play:
  setup: TV_couch (fisso)
  social: co-op_local (partner/friend/family, sempre)
  frequency: weekly (social night)
motivation_primary: 'Giocare insieme, ridere, discutere strategie'
motivation_secondary: 'Progressione sharable'
friction_points:
  - 'Controller un solo player forzato'
  - 'Turni individuali lenti = partner annoiato'
  - 'Setup complesso richiede single expert'
  - 'Progressione solo per "host"'
retention_hook:
  - 'Simultaneous turn (parallel input durante planning)'
  - 'Roles co-op definiti (scout/attacker/support)'
  - 'Shared save profile (progresso per gruppo)'
  - 'Drop-in/drop-out friend'
success_metrics:
  onboarding:
    tutorial_completion_rate: '>=75%'
    time_to_first_win_min: '<20'
  retention:
    day_1: '>=60%'
    day_7: '>=30%' # social event-based
    day_30: '>=15%'
  depth:
    coop_session_pct: '>=95%' # quasi sempre co-op
    avg_group_size: '>=2'
```

## Persona coverage matrix

| Pilastro design            | P1 Tatt | P2 Ruo | P3 Cas | P4 Spd | P5 Str | P6 Try | P7 Col | P8 Pwr | P9 Nar | P10 Soc |
| -------------------------- | :-----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :-----: |
| 1. Tattica leggibile       |   ★★★   |   ★★   |   ★    |  ★★★   |   ★★   |  ★★★   |   ★    |   ★★   |   ★    |    ★    |
| 2. Evoluzione emergente    |   ★★    |  ★★★   |  ★★★   |   ★    |   ★★   |   ★    |  ★★★   |  ★★★   |  ★★★   |   ★★    |
| 3. Identità Specie×Job     |   ★★★   |  ★★★   |   ★    |   ★    |   ★★   |   ★★   |  ★★★   |  ★★★   |   ★★   |    ★    |
| 4. Temperamenti MBTI/Ennea |   ★★    |  ★★★   |   ★    |   ★    |  ★★★   |   ★    |   ★★   |   ★    |  ★★★   |    ★    |
| 5. Co-op vs Sistema        |    ★    |  ★★★   |   ★★   |   ★    |  ★★★   |   ★    |   ★    |   ★    |  ★★★   |   ★★★   |
| 6. Fairness                |   ★★    |   ★    |  ★★★   |  ★★★   |   ★    |  ★★★   |   ★★   |   ★    |   ★    |   ★★    |

Legenda: ★★★ = affinità primaria · ★★ = secondaria · ★ = marginale

**Copertura**: tutti 6 pilastri hanno almeno 2 personas con affinità primaria. Nessun gap persona→pilastro.

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

## Decisione Master DD (2026-04-17) — Q-001 T2.2

- 3 personas insufficienti → **estese a 10** (P1-P10): Tattico, Ruolo, Casual, Speedrunner, Streamer, Tryharder, Collezionista, Powerbuilder, Narrative Explorer, Social Co-op
- Success metrics: **SI** (realistici per ogni persona)
- Validation plan: **SI** (3 fasi: internal review, cross-check, playtest)
- Playtest Fase 3 timing: **POST-M4** (vertical slice necessario)

Follow-up: promozione a `docs/core/18-PLAYER_PERSONAS.md` dopo 1 settimana di review internal.
