---
title: 'Playtest M3 human — setup + metrics plan per next session'
workstream: ops-qa
category: playtest-plan
status: draft
owner: master-dd
created: 2026-04-21
tags:
  - playtest-plan
  - m3-human
  - friction-followup
  - prompt-2
related:
  - docs/playtests/README.md
  - docs/playtests/2026-04-17/notes.md
  - docs/playtests/2026-04-17-02/notes.md
  - docs/playtests/2026-04-17-03/notes.md
  - docs/playtests/2026-04-17-m3-automated/notes.md
  - docs/planning/2026-04-20-integrated-design-map.md
---

# Playtest M3 human — micro-piano next session

Integrated design map Prompt 2: piano di setup + raccolta metrica per prossimo playtest "M3 human" su scenari T04 (Pozza Acida) e T05 (BOSS Apex).

**Formato**: tabletop guidato (Master DM), 1 sessione ~60-90 min, 2 PG player (scout + tank), enemy controllati Master.

**Scope**: testare FRICTION aperte #5/#6/#7 (ability budget post-move, positioning reach, effect miss semantics) su scenari tuned post-M3 automated (T04 hp -21%, T05 hp +22%).

## 1. Stato FRICTION (pre-playtest)

|   ID   | Descrizione                                          | Playtest source        |  Status   | Risolto da                 |
| :----: | ---------------------------------------------------- | ---------------------- | :-------: | -------------------------- |
|   #1   | Sintassi mosse non standard                          | 2026-04-17 T2 P1       | ✅ chiuso | PR #1491 AP budget         |
|   #2   | AP budget → azioni ambiguo                           | 2026-04-17 T2 S1       | ✅ chiuso | PR #1491                   |
|   #3   | Master richiede doppio attack, regola mancante       | 2026-04-17 T2 P2       | ✅ chiuso | PR #1491                   |
|   #4   | Job Skirmisher "hit-and-run" non integrato           | 2026-04-17 T3 P1       | ✅ chiuso | PR #1496 ability discovery |
| **#5** | **AP vincola "N attacks" dopo move**                 | 2026-04-17-02 T1 scout | 🔴 aperto | da testare                 |
| **#6** | **Positioning ability reach + scout start position** | 2026-04-17-02 T2 scout | 🔴 aperto | da testare                 |
| **#7** | **Ability effect miss semantics**                    | 2026-04-17-02 T2 tank  | 🔴 aperto | da testare                 |

## 2. Setup playtest raccomandato

### 2.1 Scenario primario: T04 Pozza Acida (post-tune hp -21%)

**Motivi**:

- FRICTION #5 + #7 più facili da riprodurre (multi-unit enemy + bleeding status)
- Hazard tiles (pozza_acida × 3) testano interazione movement + status
- T04 era 🔴 sotto band pre-tune → verifica se tuning ha chiuso gap

**Configurazione**:

- **Player** (2 PG canonical post-M3 `ap_max=2`):
  - `p_scout`: dune_stalker + skirmisher + trait `zampe_a_molla`, hp 10, ap 2, mod 3, dc 12, spawn (1,1)
  - `p_tank`: dune_stalker + vanguard + trait `pelle_elastomera`, hp 12, ap 2, mod 2, dc 13, spawn (1,4)

- **Enemy** (3 guardiani pozza, post-tune M3):
  - `e_lanciere`: guardiano_pozza + skirmisher + trait `denti_seghettati` (bleeding), hp 5 (was 6), ap 2, mod 3, dc 12, attack_range 2, spawn (3,2)
  - `e_corriere_1`: guardiano_pozza + skirmisher, hp 3 (was 4), ap 3, mod 2, dc 11, attack_range 2, spawn (4,0)
  - `e_corriere_2`: guardiano_pozza + skirmisher, hp 3 (was 4), ap 3, mod 2, dc 11, attack_range 2, spawn (4,5)

- **Hazard**: pozza_acida (damage 1 end-turn) su tile (2,1), (3,4), (2,3)
- **Bioma**: foresta_acida (mood oppressive, narrative oppressive)
- **Sistema pressure**: 75 (Critical tier, swarm unlocked)
- **Grid**: 6×6 (post coop-scaling, 2p deployed)

### 2.2 Scenario secondario (se tempo): T05 BOSS Apex (post-tune hp +22%)

Se sessione > 45 min e T04 chiuso, proseguire T05 per validare boss feel.

- **Player**: stesso p_scout + p_tank ma hp buffed 12/14, mod 4/3, dc 13/14
- **Enemy**: `e_apex` apex_predatore + vanguard + trait `martello_osseo, ferocia`, hp 11 (was 9), ap 3, mod 3, dc 13, attack_range 2, spawn (5,2)
- **Sistema pressure**: 95 (Apex tier, 4 intents/round, boss drama)

## 3. Content setup.md (da compilare PRE-partita)

```markdown
# Setup — Playtest M3 human [DATE]

## Scenari

- Primary: T04 Pozza Acida (post-tune hp -21%)
- Fallback: T05 BOSS Apex (post-tune hp +22%) se tempo

## Player roster

- p_scout [dune_stalker/skirmisher/zampe_a_molla] hp 10 ap 2 mod 3 dc 12
- p_tank [dune_stalker/vanguard/pelle_elastomera] hp 12 ap 2 mod 2 dc 13

## Enemy T04

- e_lanciere hp 5 ap 2 mod 3 dc 12 range 2 (bleeding via denti_seghettati)
- e_corriere_1 hp 3 ap 3 mod 2 dc 11 range 2
- e_corriere_2 hp 3 ap 3 mod 2 dc 11 range 2

## Hazard

- pozza_acida damage 1/turno su (2,1), (3,4), (2,3)

## FRICTION tracking attesi

- #5 AP vincola attacks post-move → osserva quante volte scout muove+attacca vs deve skippare
- #6 positioning reach → osserva se scout ha ability inerti (reach < distanza target)
- #7 ability effect miss → osserva se ability miss applica comunque parte effect (confused?)

## Obiettivi playtest (in ordine priorità)

1. Chiudere FRICTION #5/#6/#7 (osservazione diretta → PR backlog)
2. Verificare win rate T04 post-tune (target band 30-45%)
3. Stress-test bleeding mechanic (T04 lanciere) + pozza_acida hazard
4. Opzionale: T05 boss feel drama (target band 15-30%)
```

## 4. Metriche da raccogliere in notes.md (POST-partita)

Entro 10 min dalla fine. No post-rationalization.

### 4.1 Sezioni obbligatorie

**Cosa funzionava** (min 3 item):

- Quale azione feeled satisfying?
- Quale decisione tattica ha premiato il giocatore?
- Quale status/mechanic ha generato tensione positiva?

**Cosa era confuso in <30 secondi** (min 2 item):

- Scout AP budget dopo move: player ha capito regola al volo?
- Hazard tile: player ha compreso pericolo pozza_acida senza spiegazione Master?
- Ability reach: player ha intuito target valido vs fuori range?

**Cosa hai tagliato mentalmente durante la partita** (min 1 item):

- Trait dimenticato (quale?)
- Ability trascurata (quale?)
- Status non tracciato (bleeding tick?)

### 4.2 FRICTION tracking (campo specifico)

Per ogni FRICTION aperta:

```markdown
### FRICTION #5 status: [riprodotta | NON riprodotta | chiusa | nuova-variante]

- Contesto: turn [N], unit [p_scout/p_tank], azione [move→attack]
- Outcome: [azione completata OK | blocker regola | confusione Master DM]
- Rimedio applicato in-session: [nessuno | decision-tree DM | consulta doc]
- Proposta fix: [design decision / code / doc update / deprecare FRICTION]
```

Ripeti per #6, #7.

### 4.3 Win rate + outcome

- `T04 outcome`: victory / defeat / timeout / abandoned
- `Turns to resolve`: N round
- `Player HP final`: scout X/10 + tank Y/12
- `Enemy KOs`: N/3
- `Bleeding ticks applied`: count (FRICTION #7 cross-check)
- `Hazard ticks suffered`: count per player

### 4.4 Design-level observation (free-form)

1 paragrafo: "Se dovessi cambiare UNA cosa su T04 per il prossimo tester, cosa?"

## 5. Anti-regola (da README.md)

- Non validare questo playtest via test automatici come proxy
- Non tagliare sezioni di notes.md — anche "cosa era confuso" banale
- Non rimandare compilazione a "dopo" — 10 min max

## 6. Deliverable playtest

1. `docs/playtests/2026-04-21-m3-human/setup.md` (pre-partita)
2. `docs/playtests/2026-04-21-m3-human/notes.md` (post-partita)
3. Optional: `docs/playtests/2026-04-21-m3-human/setup.jpg` (foto setup fisico)
4. Commit: `playtest: [2026-04-21] m3 human T04 friction #5/#6/#7 validation`
5. Aggiornare `docs/playtests/README.md` index tabella + `docs/playtests/2026-04-17-02/notes.md` FRICTION log con status nuovo

## 7. Post-playtest next steps

**Se FRICTION #5-#7 chiuse**: aprire 3 PR fix (ability budget wiring / positioning validator / effect miss spec).

**Se FRICTION #5-#7 NON riprodotte**: marca "aging out" in log + parcheggia su backlog 30gg.

**Se T04 win rate ≠ band 30-45%**: iter next stat tune (hp -5% più o -10%) + commit tune in `data/core/balance/damage_curves.yaml` tutorial_advanced class (NON `docs/core/balance/` — runtime dataset vive in `data/core/`).

**Se T05 fallback giocato**: verifica boss drama feel + iter hp nel range 9-13.

## 8. Riferimenti

- `docs/playtests/README.md` — anti-regola + index
- `docs/playtests/2026-04-17-02/notes.md` — origine FRICTION #5/#6/#7
- `docs/playtests/2026-04-17-m3-automated/notes.md` — M3 automated baseline post ap_max=2
- `docs/adr/ADR-2026-04-15-round-based-combat-model.md` — round model canonical
- `docs/adr/ADR-2026-04-20-damage-scaling-curves.md` — tutorial_advanced target_bands
