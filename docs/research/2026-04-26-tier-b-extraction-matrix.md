---
title: Tier B postmortem extraction matrix — 15 giochi tactical/coop affini
doc_status: active
doc_owner: docs-team
workstream: cross-cutting
last_verified: 2026-04-26
source_of_truth: false
language: it
review_cycle_days: 90
tags: [research, postmortem, tactical, coop, museum-input, tier-b]
---

# Tier B extraction matrix — postmortem tactical/coop genere affine

## Scope

Estrazione one-shot 15 giochi Tier B catalogati in [`docs/guide/games-source-index.md`](../guide/games-source-index.md). Per ogni gioco: lezione chiave, pattern transferable concreto, pillar mappato, reuse priority, esistenza in Evo-Tactics, agent owner candidato.

Formato denso. Non duplica deep-dive in [`docs/planning/tactical-lessons.md`](../planning/tactical-lessons.md) (5 deep) — qui complementa il restante 10 + ribadisce key takeaway dei 5 deep per quick scan.

**Use case**: input museum cards (repo-archaeologist), priority feed agent illuminator (balance/creature/ui/coop), kill-keep-archive decision per follow-up sprint.

---

## Matrix

| #   | Gioco                          | Lezione chiave (1-2 frasi)                                                                                                                                  | Pattern transferable concreto                                                                                                        | Pillar | Priority | In Evo?  | Agent owner                  |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------- | -------- | ---------------------------- |
| 1   | **Halfway** (2014)             | Leggibilità griglia + varietà nemici behaviour-driven sono non negoziabili. Pixel art coerente paga su tactical screen-staring lunghi.                      | UI surface tutti numeri decisionali pre-azione: hit%, danno range, durata status, cooldown, soglie MoS. Niente info nascosta.        | P1+P5  | Alta     | parziale | ui-design-illuminator        |
| 2   | **Frozen Synapse** (2011)      | Pianificazione simultanea + simulatore "what-if" pre-commit elimina attesa avversario, crea tensione da incertezza, abbassa learning curve regole semplici. | Replay cinematico round risolto post-resolution. Per TV play: 3-5s loop visualizza outcome simultaneo squad+SIS.                     | P1     | Alta     | parziale | ui-design-illuminator        |
| 3   | **Cogmind** (2015+)            | Identità = equipaggiamento. Trade-off espliciti per ogni componente. UI a strati: info base sempre visibile, dettagli on-demand.                            | Trait `cost_ap` esteso a multi-cost (slot/energia/vulnerabilità). Tooltip stratificati con expand on hover/select.                   | P2+P3  | Alta     | parziale | balance-illuminator          |
| 4   | **Balatro** (2024)             | Iterazione meccaniche + community testing post-launch creano balance emergente. Joker combo = exponential build space.                                      | Tagging trait per "joker family" (trigger archetype) abilitando combo discovery + balance sweep MAP-Elites archive.                  | P6     | Media    | no       | balance-illuminator          |
| 5   | **Magicka** (2011)             | Spell combo coop emergente da 8 elementi base + ordering. Coop friendly-fire = tensione costruttiva, non punitiva.                                          | Trait combo system 2-step: chain trigger su action partner stesso round (focus_fire combo già wired, estendibile a 3+ elementi).     | P2+P5  | Media    | parziale | coop-phase-validator         |
| 6   | **Natural Selection 2** (2012) | Asimmetria coop ruoli (commander RTS + soldati FPS) crea esperienze diverse stessa partita. Layer comunicazione richiesto.                                  | Modulation 5p+: 1 player ruolo Strategist (vista atlas + pressure overlay + intent suggest), altri tactical 4p classic.              | P5     | Media    | no       | coop-phase-validator         |
| 7   | **Binding of Isaac** (2011)    | Build variety procedurale da pool item + sinergie non pianificate. "Run-defining moment" da pickup raro.                                                    | Pack roll d20+BIAS (M12.B shipped) estesa a "Anomaly Trait" raro 1/20 con effetto trasformativo cross-pillar.                        | P2     | Media    | parziale | balance-illuminator          |
| 8   | **SpaceChem** (2011)           | Complessità emergente da regole semplici + soluzioni aperte. Player generates own difficulty via constraint optimization.                                   | Encounter editor minimalist (3-5 tile primitive + 2-3 condition rule) per user-generated content post-MVP.                           | P6     | Bassa    | no       | pcg-level-design-illuminator |
| 9   | **System Shock 2** (1999)      | Immersive sim RPG systems + emergent gameplay da interazioni cross-system. "Psi/Cyber/OS Hack" tre stat tree assolutamente diversi.                         | 3 axis upgrade orthogonal: physical (HP+ATK) / cognitive (focus+intel) / symbiotic (mating+nido). Decisione esclusiva per session.   | P2+P3  | Bassa    | no       | balance-illuminator          |
| 10  | **Baldur's Gate II** (2000)    | Tactical RPG party identity + companion individuality + encounter design layered. NPC dialogue reactivity = retention long-term.                            | Companion arc: ogni unit reclutato ha 3-5 milestone narrative trigger su VC threshold (es. survive 3 missions = chapter unlock).     | P1+P3  | Bassa    | no       | narrative-design-illuminator |
| 11  | **Battle Brothers** (2017)     | Initiative timeline ATB visual + permadeath roster + retiring veteran teach next gen. Brutal scaling non-power-fantasy.                                     | Initiative timeline ATB già in HUD ref (44-HUD §3). Estensione: roster persistence cross-mission con XP transfer parziale on death.  | P1     | Media    | parziale | ui-design-illuminator        |
| 12  | **FF7 Remake** (2020)          | ATB modernized: real-time + pause for ability select. Hybrid tactical/action. Visual juice su ogni hit.                                                     | Animation juice: hit shake 80ms + flash 60ms + popup damage (già parziale). Estendere a critical: zoom 200ms + slow-mo.              | P1 HUD | Media    | parziale | ui-design-illuminator        |
| 13  | **Hades GDC** (2020)           | "Come giochi modella ciò che diventi" = visione P2/P4 Evo-Tactics. Narrativa reattiva + 2 loop progression + difficoltà come menu.                          | Pact of Punishment: difficulty = menu modificatori opt-in (es. "Sistema +1 pressure tier", "trait pool ridotto"), non slider piatto. | P2+P4  | Alta     | parziale | balance-illuminator          |
| 14  | **Wargroove** (2019)           | Tactical hex + commander unit con groove ability. Unit roster compatto + counter rock-paper-scissors leggibile.                                             | Commander unit (1 per squad): unique ability con cooldown lungo (5-8 round) + aura passive (+1 ATK adjacent). Capstone P3.           | P1     | Media    | no       | creature-aspect-illuminator  |
| 15  | **Songs of Conquest** (2024)   | Strategic-tactical hybrid hex (overworld + battle layer). Wielder magic spheres = job specialization deep.                                                  | Wielder pattern: Job specialization "sphere" (pick 1 di 4 tematiche per livello 4+) influenza ability pool unlock. Capstone P3.      | P1+P3  | Bassa    | no       | balance-illuminator          |

---

## Aggregazione per pillar

| Pillar | Giochi Tier B mappati                                                                      | Top reuse priority                                              |
| ------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| **P1** | Halfway, Frozen Synapse, Cogmind, BG2, Battle Brothers, FF7R, Wargroove, Songs of Conquest | UI surface decision numbers (Halfway) + replay cinematico (FS)  |
| **P2** | Cogmind, Balatro, Magicka, Isaac, SS2, Hades                                               | Tooltip stratificati + trait combo discovery (Cogmind+Balatro)  |
| **P3** | Cogmind, SS2, BG2, Wargroove, Songs of Conquest                                            | Identity = equipaggiamento + commander unit (Cogmind+Wargroove) |
| **P4** | Hades                                                                                      | "Come giochi modella" wired su VC scoring (già allineato)       |
| **P5** | Halfway, Magicka, NS2                                                                      | Asimmetria ruoli coop 5p+ (NS2) — gap presente                  |
| **P6** | Balatro, SpaceChem, Hades                                                                  | Difficoltà come menu (Hades Pact)                               |

---

## Reuse priority — kill/keep/archive

**KEEP (Alta — ship next 1-2 sprint candidate)**:

- Halfway UI decision-numbers surface (P1 polish, già parziale)
- Frozen Synapse replay cinematico round (P1 TV-play, gap)
- Cogmind tooltip stratificati + trade-off espliciti (P2+P3, allinea con M12 Form layer)
- Hades Pact menu difficoltà (P6, allinea hardcore scenario calibration)

**KEEP (Media — backlog post-MVP)**:

- Balatro joker family tagging (P6 emergent balance)
- Magicka 3+ element combo extension (P2+P5 coop)
- NS2 Strategist role 5p+ (P5 modulation feature)
- Isaac Anomaly Trait raro (P2 build variety)
- Battle Brothers roster persistence cross-mission (P1+meta)
- FF7R critical hit juice (P1 HUD polish)
- Wargroove commander unit (P1+P3 capstone)

**ARCHIVE (Bassa — reference-only, no dev resource)**:

- SpaceChem encoder editor (P6, post-1.0 community feature)
- SS2 3-axis orthogonal upgrade (P2+P3, troppo diverso da current trait pool model)
- BG2 companion arc (P1+P3, narrative depth out-of-scope MVP)
- Songs of Conquest wielder spheres (P1+P3, ridondante con M13 perks)

---

## Gap mapping vs Evo-Tactics state

| Gap concreto                                             | Source              | Scope effort | Owner                       |
| -------------------------------------------------------- | ------------------- | ------------ | --------------------------- |
| Replay cinematico round 3-5s post-resolution             | Frozen Synapse      | M (~10-14h)  | ui-design-illuminator       |
| Tooltip stratificati trait/ability (base+expand)         | Cogmind             | S (~4-6h)    | ui-design-illuminator       |
| Pact of Punishment menu modificatori difficoltà          | Hades               | M (~12-16h)  | balance-illuminator         |
| Commander unit con groove ability + aura                 | Wargroove           | L (~20-25h)  | creature-aspect-illuminator |
| Strategist role async 5p+ (vista atlas + intent suggest) | Natural Selection 2 | L (~25-30h)  | coop-phase-validator        |
| Roster persistence cross-mission con XP transfer death   | Battle Brothers     | M (~14-18h)  | balance-illuminator         |
| Anomaly Trait pool raro 1/20                             | Binding of Isaac    | S (~4-6h)    | balance-illuminator         |
| Joker family tagging per combo discovery                 | Balatro             | S (~6-8h)    | balance-illuminator         |
| Critical hit juice (zoom + slow-mo)                      | FF7 Remake          | S (~3-5h)    | ui-design-illuminator       |
| 3-elementi combo extension (chain >2 player)             | Magicka             | M (~8-12h)   | coop-phase-validator        |

---

## Cross-ref repo state

- **In Evo già**: focus_fire combo wired (M2 sessione 17/04), pack roll d20+BIAS (M12.B PR #1690), HUD ATB initiative timeline ref (`docs/core/44-HUD-LAYOUT-REFERENCES.md`), VC scoring "come giochi modella" (Hades alignment), trait `cost_ap` (parziale Cogmind).
- **Parziale**: hit% surface (manca durata status / cooldown / MoS soglie), animation juice damage popup (manca critical zoom), modulation 4-8p (manca Strategist asymmetric role).
- **Gap totale**: replay cinematico, Pact menu difficoltà, commander unit, roster persistence, Anomaly Trait pool, joker family tagging, 3+ element combo, encounter editor user-generated.

---

## Anti-pattern conferme

Già listate in [`games-source-index.md` Anti-reference](../guide/games-source-index.md). I 15 Tier B confermano:

- **NO grind XCOM-stat-bump invisibile** (Halfway anti): trait must trasform game visibly
- **NO opacity AI War-style** (cross-rec NS2): rendere visibile pressure/intent SIS
- **NO 6-on-6 Pokémon scale** (re-conferma da NS2 commander layering): 4-coop + 1 commander è soft cap

---

## Follow-up

1. **Museum input**: repo-archaeologist può promuovere a card 4 Top Alta (Halfway/FS/Cogmind/Hades) se non già presenti.
2. **Sprint kickoff candidate**: Hades Pact menu (P6 hardcore scenario calibration synergy) + Cogmind tooltip stratificati (P1+P2 quick win).
3. **Decisione user**: Wargroove commander unit (L effort, capstone P3) merita ADR pre-implementation? Conferma scope.
4. **Validation**: cross-check con [`docs/planning/tactical-lessons.md`](../planning/tactical-lessons.md) — i 5 deep (Halfway/AI War/FS/Hades/Cogmind) qui consolidati in 1 riga, deep-dive resta canonical.
