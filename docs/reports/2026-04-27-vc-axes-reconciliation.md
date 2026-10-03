---
title: 'VC Axes Reconciliation — 6/5/4 layer mapping + player-facing decision'
workstream: cross-cutting
category: research
doc_status: active
doc_owner: claude-code
last_verified: '2026-04-27'
tags: [mbti, vc, axes, reconciliation, p4, telemetry]
---

# VC Axes Reconciliation: 6-axis / 5-axis / 4-MBTI / v3.2

## TL;DR 5 bullet

1. **Layer runtime**: 6-axis canonical (vcScoring.js) è l'unico engine wired. 4-MBTI sono derivati da 6-axis. 5-axis UI e v3.2 5-swipe input NON sono wired — sono proposal.
2. **Mapping concreto Task 1**: aggro→T_F (partial, via utility proxy), risk non mappa su MBTI (física), cohesion→E_I (partial), setup→S_N+J_P, explore→S_N, tilt→null (non derivabile). Risk e tilt rimangono fuori dalla proiezione MBTI — design gap reale.
3. **Player-facing raccomandato**: opzione **(d) hybrid — 3-axes radar Personalità + 2-stat scheda Specie** (già confermato da master-dd M1 2026-04-26 sera). Player vede Simbiosi/Solitario/Esplorativo nel radar phone; Agile/Robusto e Memoria/Istinto in scheda Specie. Coerente con Wildermyth top-2 pattern + CK3 label > numero.
4. **Verdict architetturale**: HYBRID_LAYERS_3_5. I 3 layer sottostanti (6-axis runtime / 4-MBTI proiezione / 5-axis surface) coesistono senza schema breaking change. 5-swipe input v3.2 agisce come seeding iniziale del vettore VC, non come layer separato.
5. **Migration effort**: ~11h totali. Zero breaking change. Prerequisito: user conferma SPEED_MIN/MAX per Agile/Robusto calibration.

---

## Task 1 — Mapping concreto 6 ↔ 5 ↔ 4 axes

### Struttura engine attuale

Fonte: `apps/backend/services/vcScoring.js:476-580`, `data/core/telemetry.yaml:27-54`.

I 6-axis raw hanno pesi espliciti:

```
aggro:    w_attacks_started=0.35, w_first_blood=0.25, w_close_engage=0.20, w_kill_pressure=0.20
risk:     w_damage_taken=0.28, w_1vX=0.28, w_low_hp_time=0.22, w_self_heal=-0.18, w_overcap_guard=0.18
cohesion: w_formation_time=0.40, w_assists=0.35, w_support_actions=0.25
setup:    w_overwatch_turns=0.35, w_trap_value=0.35, w_cover_before_attack=0.30
explore:  w_new_tiles=0.45, w_time_in_fow=0.25, w_optionals=0.30
tilt:     window-based EMA, non snapshot-derivabile
```

I 4 MBTI sono calcolati da raw metrics (NON dagli aggregate 6-axis):

```
E_I: 1 - 0.5*close_engage - 0.25*support_bias - 0.25*(1-time_to_commit)
S_N: 1 - 0.4*new_tiles + 0.3*setup_ratio - 0.3*evasion_ratio
T_F: 1 - 0.5*utility_actions + 0.5*support_bias
J_P: 1 - (0.6*setup_ratio + 0.2*time_to_commit) [partial coverage]
```

### Mapping table

| 6-axis canonical | Raw metric condivisa con MBTI | 4-MBTI mapping | 5-axis UI surface | Mapping function | Coverage |
|---|---|---|---|---|---|
| aggro | attacks_started, close_engage, first_blood, kill_pressure | T_F (proxy parziale via utility_actions) | Simbiosi/Predazione | aggro alto → utility-focused → T_F basso → Predazione | Partial — aggro usa kills, T_F usa utility proxy |
| risk | damage_taken, 1vX, low_hp_time | **Nessun asse MBTI** | Agile/Robusto (proposto) | risk = fisico/survivability. Non psicologico → stat-derivative (hp_max, speed) | **GAP** — risk non mappa su MBTI per design |
| cohesion | assists, support_bias (proxy) | E_I (0.25*support_bias) | Solitario/Sciame | cohesion alto → support_bias alto → E_I basso → Sciame (Extravert) | Partial — cohesion usa formation_time (null) + assists; E_I usa subset |
| setup | setup_ratio (proxy overwatch) | S_N (0.3*setup_ratio) + J_P (0.6*setup_ratio) | Cauto / Esplorativo/Cauto | setup alto → S_N alto (S pole) + J_P alto (J pole) → Cauto/Metodico | Partial — overwatch_turns/trap_value null, solo cover_proxy |
| explore | new_tiles | S_N (0.4*new_tiles) | Esplorativo/Cauto | explore alto → S_N basso (N/Intuitive pole) → Esplorativo | Full per new_tiles; time_in_fow/optionals null |
| tilt | EMA window-based | **Nessun asse MBTI** | Memoria/Istinto (proposto) | tilt = reazione emotiva a eventi. Proxy: action_switch_rate (alta varianza = instabilità emotiva) | **GAP** — tilt non derivabile da snapshot; proxy possibile |

**Note critiche**:

- Risk e tilt non hanno home MBTI per design. Questo è corretto — MBTI modella stile psicologico, non resistenza fisica o instabilità emotiva. La scelta di Opt 3 (stat-derivative per questi due) è quindi *forced by the math, not convenience*.
- cohesion usa `formation_time` (peso 0.40) che è null nei log attuali (`vcScoring.js:17` — "Variabili NON derivabili dai log attuali"). Cohesion è sempre `coverage: 'partial'`.
- E_I usa `support_bias` (weight 0.25) che si sovrappone con T_F (weight 0.5). Dipendenza shared: `support_bias = (assistsNorm + movesRatio) / 2`. Collinearità E_I ↔ T_F reale, già documentata in `5axes-ui-mapping-research.md:20`.

### Mapping 5-swipe v3.2 → 6-axis VC vector

Il v3.2 propone 5 dilemmi swipe (15s total, B1 del flusso V3) che generano un **vettore VC iniziale** sui 5-axis UI surface (non ancora wired). Retroazione proposta:

```
swipe_output[Simbiosi/Predazione] → seed T_F initial value
swipe_output[Solitario/Sciame]   → seed E_I initial value  
swipe_output[Esplorativo/Cauto]  → seed S_N+J_P blend initial value
swipe_output[Agile/Robusto]      → stat preference hint (NON vcScoring, serve spec)
swipe_output[Memoria/Istinto]    → seed action_switch_rate bias (NON vcScoring, serve spec)
```

Questi seed vanno trattati come **prior bayesiano** — il gameplay li sovrascrive progressivamente. Il meccanismo tecnico non è wired. Rischio: se il seed non decade con gameplay reale, il vettore rimane frozen sul prior iniziale (anti-pattern Sims hidden trait → zero feedback).

---

## Task 2 — Player-facing layer decision

### Tradeoff matrix

| Opzione | Phone real estate | Cognitive load | Engine refactor | Alignment con decisioni shipped |
|---|---|---|---|---|
| (a) 6-axis radar diretto | Medio (6 barre) | Alto — label astratti (aggro/tilt) | Zero | No — label non creature-themed |
| (b) 5-axis UI surface completo | Medio-alto | Medio — label thematici ma 5 axes su phone piccolo | Basso (~9h) | Partial — M1 dice 3-axes radar |
| (c) 4-MBTI barre | Basso (4 barre) | Medio — MBTI noto ma non creature-thematic | Zero — già shipped | **Status attuale** (characterPanel.js PR #1868) |
| (d) 3-axes radar Personalità + 2-stat scheda Specie | Basso (3 axes phone Carattere + 2 in scheda Specie) | Basso — radar piccolo, stat in contesto giusto | Basso (~11h) | **Confermato da master-dd M1** |
| (e) v3.2 6-axis tuning + 16 Form label archetipico | Alto (tuning overlay + Form card) | Alto in setup, basso post-setup | Medio (~15h) | Partial — 16 Form già in mbti_forms.yaml, tuning non wired |

**Raccomandazione: Opzione (d) confermata.**

Rationale:
- Master-dd M1 (2026-04-26 sera): "3-axes radar Personalità + Agile/Memoria stat scheda Specie" — già signed off.
- Phone piccolo: 3 barre radar si leggono in 2s. 5 barre richiedono scroll o font < 12px.
- Agile/Robusto è stat fisico di specie (fixo al reclutamento) — semanticamente appartiene alla scheda Specie, non alla scheda Carattere/Temperamento.
- Memoria/Istinto è derivato comportamentale (action_switch_rate, setup_ratio) — può stare in scheda Specie come "stile cognitivo appreso".
- Wildermyth pattern: top-2 stats emergono narrativamente (combat log, eventi) — non richiedono radar dedicato. Memoria/Istinto potrebbe seguire questo pattern anziché avere barra esplicita.

### Scheda Carattere phone (post-opzione d)

```
[Phone - tab Carattere]
PERSONALITÀ (3-axes radar)
  ● Simbiosi ←——————→ Predazione    [barra, T_F proxy]
  ● Solitario ←——————→ Sciame        [barra, E_I proxy]
  ● Cauto ←————————→ Esplorativo   [barra, S_N+J_P blend]
  
[Archetype badge: Conquistatore | Esploratore | ... — top triggered Ennea]

[Phone - tab Specie / nel character sheet]  
FISICO (stat-derivative)
  Agilità ●●●○○  [da speed_norm + 1-hp_norm]
  Memoria ●●○○○  [da action_switch_rate + setup_ratio]
```

---

## Task 3 — Industry pattern best-fit

### Pattern prioritari (primary-sourced)

**P1 — Wildermyth top-2 emerge narrativamente** (Worldwalker Games 2021)

11 personality stats. Top-2 determinano eligibility per eventi. Player NON vede radar esplicito — vede il label usato nel testo narrativo ("il Bookish ha una visione"). Sistema "invisibile ma impattante".

Applicazione: Memoria/Istinto potrebbe NON avere barra UI — emerge come label in combat log ("ha improvvisato" vs "ha ricordato il pattern"). Effort: zero barra, ~1h combat log hook. Rischio: invisibilità totale (anti-pattern Sims).

Fonti: [Wildermyth Wiki Personality](https://wildermyth.com/wiki/Personality) · [Aywren review](https://aywren.com/2021/06/29/wildermyth-procedural-storytelling-rpg/)

---

**P2 — CK3 "Wroth, not irritable" — label archetipico > numero** (Paradox 2020)

3 trait visibili nel portrait. Label forti, non score. "Wroth" dice tutto senza mostrare `anger=0.82`. Tanya X. Short ([Game Developer](https://www.gamedeveloper.com/design/maximizing-the-impact-of-procedural-personalities)): "Characters in CK2 are Wroth, not irritable. Extreme archetypes over subtle adjectives."

Applicazione diretta: sostituire etichette intermedie ("Autonomo", "Adattivo") con archetipo polarizzato. Non mostrare mai il valore numerico MBTI raw al player — solo il label polarizzato con thresholds stretti (>0.65 / <0.35).

Fonti: [CK3 Wiki Traits](https://ck3.paradoxwikis.com/Traits) · [GD Procedural Personalities](https://www.gamedeveloper.com/design/maximizing-the-impact-of-procedural-personalities) · [CK3 Dev Diary #58](https://forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-58-stre-ss-tching-the-traits.1472092/)

---

**P3 — Disco Elysium phased reveal** (ZA/UM 2019)

24 skills con stat numeriche mostrate gradualmente. Il player scopre "chi è" Harry attraverso l'esperienza, non da una scheda iniziale. Confidence > threshold → reveal.

Già implementato in `apps/backend/services/mbtiSurface.js:44-109` con `computeRevealedAxes()`. Dead-band 0.35-0.65 (abbassato in PR #1868 per sessioni brevi). Threshold 0.7 → 0.6 se events_count < 30.

Il pattern è il migliore per la nostra UI perché: (a) già wired, (b) adatto a sessioni brevi tutorial, (c) evita il "scheda vuota" a inizio partita (label ? → ? → ? → reveal progressivo).

Fonti: [Disco Elysium Steam](https://store.steampowered.com/app/632470/Disco_Elysium__The_Final_Cut/) · Museum card M-009 Triangle Strategy (pattern confidence_per_axis proposta)

---

**P4 — Spore 3-path bucket + argmax label** (Maxis 2008)

DNA accumulo per 3 path (Social/Predator/Adaptable). Surface = label del bucket dominante, non il numero. Player vede "Predator path ●●●" non "predator_dna=0.67".

Applicazione: per i 3-axes radar, mostrare label dominante prominente + barra secondaria. "Predatore" a carattere grande + "Simbiotico ●●○○○" sotto. Se nessun axis supera 0.65 threshold → "Equilibrato" come label neutro.

Fonti: [Spore Wikipedia](https://en.wikipedia.org/wiki/Spore_(2008_video_game)) · [StrategyWiki Creature Stage](https://strategywiki.org/wiki/Spore/Creature_Stage)

---

**P5 — Pokemon Nature/IVs — stat-derivative fisso** (Game Freak)

Nature = +10%/−10% su stat fissa alla cattura. IV = 0-31 bonus fisso. Due layer distinti, non si mescolano. IVs "fisico di nascita", EVs "allenamento".

Applicazione per Agile/Robusto: stat-snapshot fisso al reclutamento (specie), non dinamico con vcScoring. Frame narrativo: "il corpo di nascita — non cambia con l'esperienza". Agile/Robusto in scheda Specie, non in scheda Carattere — esattamente come Nature compare nella scheda Pokemon base (non nella EV/IV detail sheet avanzata).

Anti-pattern da evitare: i 3 layer paralleli Pokemon (Base/IVs/EVs/Nature) sono stati giudicati opachi dai casual player. Noi dobbiamo mostrare UN solo numero per axis, non la scomposizione.

Fonti: [Cave of Dragonflies EVs/Natures Math](https://www.dragonflycave.com/evs-natures-and-math/) · [Serebii EV/Nature guide](https://forums.serebii.net/threads/a-basic-guide-to-evs-ivs-and-natures.499840/)

---

**Pattern best-fit per Evo-Tactics: Hybrid Disco Elysium phased reveal + CK3 label archetipico + Wildermyth emergenza narrativa.**

Cioè:
- 3-axes radar con phased reveal (confidence threshold, già wired)
- Label archetipico CK3-style (no numeri raw, solo label polarizzato)
- Memoria/Istinto emerge narrativamente nel combat log (Wildermyth), non in radar
- Agile/Robusto come Pokemon Nature: scheda Specie, fisso, non in scheda Carattere

---

## Task 4 — Migration effort + risks

### Stato attuale shipped vs needed

| Component | Stato | Gap verso opzione (d) |
|---|---|---|
| `vcScoring.js` 6-axis + 4-MBTI | **Wired** (PR #1868) | Zero |
| `mbtiSurface.js` phased reveal | **Wired** (PR #1868) | Zero |
| `characterPanel.js` 4-MBTI barre | **Wired** (PR #1868) | Aggiungere 3-axes radar alias (T_F→Simbiosi, E_I→Solitario, S_N+J_P→Esplorativo) |
| Agile/Robusto axis | **Non wired** | Nuova funzione stat-snapshot + UI in scheda Specie |
| Memoria/Istinto axis | **Non wired** | Aggregazione action_switch_rate + setup_ratio (già in vcScoring) |
| 5-swipe input v3.2 → seed | **Non wired** | Spec + wire — dipende da decision Q1 v3-canonical-flow-decisions.md |

### Effort estimate (opzione d)

| Task | File | Effort | Rischio |
|---|---|---|---|
| Alias 3-axes in characterPanel.js (T_F→Simbiosi, E_I→Solitario, blend→Esplorativo) | `apps/play/src/characterPanel.js:30+` | 1h | Basso |
| Blend S_N+J_P per Esplorativo/Cauto + J_P null fallback | `apps/backend/services/` nuovo helper | 1h | Basso — J_P partial coverage documentata |
| Agile/Robusto stat-snapshot function | Nuovo `agileRobustoAxis.js` o inline in characterPanel | 1.5h | Basso (verifica SPEED_MIN/MAX da `data/core/species.yaml`) |
| UI Agile/Robusto in scheda Specie (NOT radar Carattere) | `apps/play/src/` — identifica file scheda Specie | 1h | Basso |
| Memoria/Istinto behavioral-derivative | Aggregazione inline in characterPanel o helper | 2h | Basso-Medio — verifica coverage action_switch_rate in sessioni brevi |
| Label archetipico polarizzato (>0.65 / <0.35 + neutro) | characterPanel.js | 0.5h | Basso |
| Test unit nuovi (3 formule + null coverage graceful) | `tests/services/` | 2h | Basso |
| Smoke sessione tutorial_01 | manuale | 1h | Basso |
| **TOTALE** | | **~10-11h** | |

### Schema breaking change

Zero. Opzione (d) aggiunge layer UI surface sopra vcScoring già wired. Non tocca:
- `packages/contracts/` schema
- `buildVcSnapshot` shape (additive se serve alias)
- `data/core/telemetry.yaml` (nessuna modifica)
- Prisma migrations

### Test regression risk

Basso. Tests attuali:
- `tests/services/vcScoring.test.js` — 193 test, smoke after PR #1868
- `tests/services/mbtiSurface.test.js` — 68 test
- AI regression baseline 311/311

New code aggiunge funzioni pure nuove (stat-snapshot, blend, label-derivation) → test isolati, zero interferenza.

### UX validation needed

- **Smoke userland** (TKT-M11B-06 pending): mostrare le 3 barre + Ennea badge su phone reale. Verifica leggibilità a 4-5 player distanti.
- **Label calibration**: threshold 0.65/0.35 per label polarizzato vs "Equilibrato" — calibrare su telemetria playtest reale. Senza dati: defaults proposti da research M1 (`5axes-ui-mapping-research.md:241-267`).
- **Agile/Robusto SPEED_MIN/MAX**: verificare range reale da `data/core/species.yaml` prima di hardcode. Proposta: SPEED_MIN=1, SPEED_MAX=6, HP_MIN=6, HP_MAX=20 (da research M1).

---

## Raccomandazione finale

### Layer architecture (3 layer coesistono runtime)

```
LAYER 1 — Engine runtime (wired, non player-facing)
  vcScoring.js: 6-axis (aggro/risk/cohesion/setup/explore/tilt)
                → derivano raw metrics
                → proiettano su 4-MBTI (E_I/S_N/T_F/J_P)
                → Ennea archetypes (7/9 fire-able post-PR #1868)

LAYER 2 — Proiezione (wired parzialmente)
  mbtiSurface.js: 4-MBTI → phased reveal con confidence
  personalityProjection.js: 4-MBTI → 16 Form (euclidean distance)
  characterPanel.js: mostra risultati phased reveal

LAYER 3 — Surface UI (parzialmente wired, da completare ~11h)
  3-axes radar Carattere phone:
    Simbiosi/Predazione = T_F alias
    Solitario/Sciame    = E_I alias
    Esplorativo/Cauto   = S_N*0.6 + J_P*0.4 blend
  2-stat scheda Specie:
    Agile/Robusto  = f(speed, hp_max) — fisso al reclutamento
    Memoria/Istinto = f(action_switch_rate, setup_ratio) — evolve
```

### 5-swipe v3.2 positioning

I 5 swipe dilemmi sono un **onboarding flow** (B1 flusso V3), non un quarto layer runtime. Output: seed vettore iniziale per i 3-axes Carattere. Meccanismo:

```
swipe_simbiosi → T_F.seed (0.0=Predatore, 1.0=Simbiotico)
swipe_solitario → E_I.seed
swipe_esplorativo → S_N.seed (poi blend con J_P in runtime)
```

Il seed decae progressivamente con eventi reali (EMA `alpha=0.3` già in telemetry.yaml). Nessun layer aggiuntivo — è l'inizializzazione del vettore VC prima del primo combattimento. Effort design spec: ~2h. Effort wire: ~3h (estende `buildVcSnapshot` con optional `vc_seed` param da `POST /api/session/start`).

### Verdict

**HYBRID_LAYERS_3_5** (3 layer runtime coesistono + 5-axis surface al Layer 3 su opzione d).

Player-facing: **opzione (d)** — 3-axes radar Carattere phone + 2-stat scheda Specie. Confermato da master-dd M1 2026-04-26 sera (`docs/planning/2026-04-26-v3-canonical-flow-decisions.md:272`).

Migration: ~11h, zero breaking change, smoke userland obbligatorio post-wire.

---

## Fonti primary

- [Wildermyth Wiki Personality](https://wildermyth.com/wiki/Personality) — top-2 system design
- [Wildermyth Aywren review](https://aywren.com/2021/06/29/wildermyth-procedural-storytelling-rpg/) — player perception invisible system
- [CK3 Wiki Traits](https://ck3.paradoxwikis.com/Traits) — 3-slot label archetipico
- [GD: Maximizing Procedural Personalities — Tanya X. Short](https://www.gamedeveloper.com/design/maximizing-the-impact-of-procedural-personalities) — "Wroth not irritable" principle
- [CK3 Dev Diary #58 Stress/Traits](https://forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-58-stre-ss-tching-the-traits.1472092/) — engine ↔ surface bridge
- [Spore Wikipedia — Creature Stage](https://en.wikipedia.org/wiki/Spore_(2008_video_game)) — 3-path bucket + argmax label
- [StrategyWiki Spore Creature Stage](https://strategywiki.org/wiki/Spore/Creature_Stage) — Social/Predator/Adaptable accumulation
- [Cave of Dragonflies EVs/Natures Math](https://www.dragonflycave.com/evs-natures-and-math/) — stat-derivative fixed-at-recruitment pattern
- [Alan Zucconi — AI of Creatures](https://www.alanzucconi.com/2020/07/27/the-ai-of-creatures/) — drive system + behavior IS the surface

**Repo files citati**:
- `apps/backend/services/vcScoring.js:476-580` — computeAggregateIndices, computeMbtiAxes, computeMbtiAxesIter2
- `apps/backend/services/mbtiSurface.js:44-109` — computeRevealedAxes phased reveal
- `apps/backend/services/personalityProjection.js:34-78` — projectForm euclidean distance
- `data/core/telemetry.yaml:27-54` — 6-axis weights + 4-MBTI formulas
- `data/core/forms/mbti_forms.yaml` — 16 Form axes targets
- `docs/reports/2026-04-27-5axes-ui-mapping-research.md` — Opt 3 formulas concrete
- `docs/planning/2026-04-26-v3-canonical-flow-decisions.md:54-63,272` — design call §1.2 + M1 decision
- `apps/play/src/characterPanel.js` (git SHA `02234768`) — phone tab Carattere shipped PR #1868
