---
title: Temi Ennea — Biome Coherence & Telemetry Sync
doc_status: draft
doc_owner: data-pack-team
workstream: dataset-pack
last_verified: 2026-05-06
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Temi Ennea — Biome Coherence & Telemetry Sync

Questa nota di design sintetizza il ruolo dei temi Ennea utilizzati dal pack
**Evo-Tactics** per collegare telemetria VC, dati di bioma e preferenze
comportamentali. Le soglie di attivazione sono derivate dai dataset YAML
condivisi nel repository e alimentano sia i generatori Ennea sia i report
telemetrici TV.

## Stats & Eventi engine (v0.3)

- **Statistiche supportate**: `ac`, `aura_radius`, `bond_aura`, `burst_damage`,
  `charisma_checks`, `counter_chance`, `damage_taken`, `duel_bonus`,
  `evasion`, `hp_max`, `initiative`, `initiative_adv`, `melee_damage`, `pe`,
  `pp`, `ranged_damage`, `self_reliance`, `sg`, `skill_success`,
  `stamina_regen`, `stealth`, `support_power`, `teamwork_bonus`.
- **Trigger monitorati**: `on_adjacent_ally`, `on_ally_downed`,
  `on_ambush_initiated`, `on_coordinate_action`,
  `on_damage_taken_then_counter`, `on_finisher_hit`,
  `on_first_blood_received`, `on_goal_blocked`, `on_initiative_win`,
  `on_isolation`, `on_new_area_discovered`, `on_setback`,
  `on_skill_check_under_pressure`, `on_stealth_start`.
- **Alias namespaced**: le voci di compatibilità usano ora la forma
  `<dominio>.<sottodominio>.<metrica>` (es. `combat.defense.ac`,
  `events.team.coordinate_action`) per collegare direttamente gli identificativi
  del motore agli hook tematici senza traduzioni ad hoc.
- **Limiti confermati**: i gruppi esclusivi (`core_emotion`, `hornevian`,
  `harmonic`, `object_rel`) rispettano 1–2 attivazioni per incontro e i passivi
  mantengono `instincts_stack_with: none` con cap `add_pct` 0.2 e
  `add_flat_initiative` 4.

## Biome Coherence (Tipo 1)

- **Dataset & Hooks**: `themes.yaml` → `reformer_1`, `personality_module.v1.json` → `mechanics_registry.hooks["theme.reformer_1"].links`, `dataset.themes[reformer_1]`.
- **Scopo**: mantenere coerenza tra biomi, affissi e mutazioni per ridurre
  l'entropia ambientale degli encounter. I riferimenti principali sono
  `biomes`, `vc_adapt` e `mutations` in `data/core/biomes.yaml`, che vengono
  sincronizzati con gli adattamenti attivi della sessione.【F:data/core/biomes.yaml†L1-L18】
- **Trigger**: profilo di telemetria centrato su coesione e preparazione
  (`cohesion`, `setup`), con soglie >= 0.62/0.55 su due finestre consecutive.
- **Effetti**: bonus di controllo ambiente, riduzione costo mutazioni e reroll
  sulle prove di terreno quando gli adattamenti VC compatibili sono attivi.
- **Note operative**: usato come baseline per i generatori Ennea e per audit di
  coerenza dati-bioma.

## Coordinatore (Tipo 2)

- **Dataset & Hooks**: `themes.yaml` → `helper_2`, registry hook `theme.helper_2` con sinergie `triad.core_emotion.vergogna`, `hornevian.obbediente`, `harmonic.ottimisti`.
- **Scopo**: esaltare il supporto continuo e la gestione scudi nelle squadre ad
  alta coesione (telemetria `cohesion>0.70`).【F:data/core/telemetry.yaml†L14-L29】
- **Trigger**: azioni cooperative `assist`, `shield_share`, `revive` e
  comportamenti preferiti dal Coordinatore nel sistema di mating.【F:data/core/mating.yaml†L360-L368】
- **Effetti**: rigenerazione scudi aggiuntiva, carte reazione gratuite dopo
  azioni di supporto.
- **Note operative**: consigliato per sessioni tutorial e per test degli
  adattamenti `cohesion_high` che aggiungono controllo al campo.【F:data/core/biomes.yaml†L6-L10】

## Conquistatore (Tipo 3)

- **Dataset & Hooks**: `themes.yaml` → `achiever_3`, hook `theme.achiever_3` e links su `dataset.themes[achiever_3]`.
- **Scopo**: premiare squadre aggressive che mantengono pressione elevata.
- **Trigger**: telemetria `aggro>0.65` con `risk>0.55`, coerente con il tema
  Conquistatore nelle preferenze Ennea del sistema di mating.【F:data/core/telemetry.yaml†L24-L27】【F:data/core/mating.yaml†L363-L368】
- **Effetti**: aumento danni nelle cariche coordinate e recupero stamina dopo
  `first_strike`.
- **Note operative**: richiede monitoraggio di `overcap_guard` per evitare spike
  di tilt durante i playtest.

## Sintonizzatore (Tipo 4)

- **Dataset & Hooks**: `themes.yaml` → `individual_4`, `theme.individual_4` + sinergie Hornevian/Harmonic nel blocco `links`.
- **Scopo**: orchestrare pattern estetici e tattici, alternando rigore e
  improvvisazione regolata.
- **Trigger**: segnali MBTI `S_N` e `J_P`, basati su `pattern_entropy`,
  `cover_discipline` e `time_to_commit` nelle formule di `data/core/telemetry.yaml`.【F:data/core/telemetry.yaml†L20-L24】
- **Effetti**: accesso a mod estetici, swap istantanei di carte abilità quando i
  pattern superano soglie di entropia.
- **Note operative**: utile per generare seed "signature" e per documentare
  varianti visive dei biomi sintetici.

## Architetto (Tipo 5)

- **Dataset & Hooks**: `themes.yaml` → `investigator_5`, `mechanics_registry.hooks["theme.investigator_5"]` e `triad.core_emotion.paura`.
- **Scopo**: valorizzare pianificazione pre-battaglia e controllo di trappole.
- **Trigger**: `setup>0.70` e uso intenso di overwatch/trappole.
- **Effetti**: vantaggio ai tiri di trappola e recupero punti abilità dopo
  trigger riusciti.
- **Note operative**: integra i blueprint pre-missione e alimenta i seed
  difensivi.

## Telemetry Sync (Tipo 6)

- **Dataset & Hooks**: `themes.yaml` → `loyalist_6`, hook `theme.loyalist_6` collegato alle metriche EMA tramite `links.telemetry_metrics`.
- **Scopo**: garantire la sincronizzazione dell'infrastruttura di telemetria,
  verificando parametri `ema_alpha`, `debounce_ms` e `idle_threshold_s` descritti
  in `data/core/telemetry.yaml`.【F:data/core/telemetry.yaml†L1-L13】
- **Trigger**: tre missioni consecutive senza perdita di eventi VC e
  calibrazione confermata degli strumenti.
- **Effetti**: smoothing virtuale dei segnali EMA e attivazione di report live
  sul monitor TV.
- **Note operative**: prerequisito per campagne pubbliche; richiede audit dei
  log `logs/playtests/*/session-metrics.yaml`.

## Esploratore (Tipo 7)

- **Dataset & Hooks**: `themes.yaml` → `enthusiast_7`, hook `theme.enthusiast_7` e sinergia `triad.core_emotion.paura`.
- **Scopo**: incentivare rotte opzionali e scoperta di nuovi tile.
- **Trigger**: `explore>0.70` e azioni `optional_discovery`/`new_biome_entry`
  preferite dall'archetipo Esploratore.【F:data/core/telemetry.yaml†L24-L27】【F:data/core/mating.yaml†L363-L368】
- **Effetti**: tiri bonus sulle tabelle mutazione T0 e movimento gratuito quando
  si esplorano tile consecutivi.
- **Note operative**: raccoglie log per bilanciare affissi esplorativi nei biomi.

## Baluardo (Tipo 8)

- **Dataset & Hooks**: `themes.yaml` → `challenger_8`, `theme.challenger_8` + `harmonic.reattivi` nel blocco `links`.
- **Scopo**: trasformare il rischio controllato in dominanza difensiva.
- **Trigger**: valori `risk` elevati con `damage_taken_window` sotto soglia e
  adattamenti `risk_high` che modificano burst e armatura.【F:data/core/biomes.yaml†L6-L12】
- **Effetti**: riduzione danni post `overcap_guard` e danni da impatto extra
  durante knockback.
- **Note operative**: ideale per missioni difesa/ondata; monitorare eventi di
  guardia per evitare instabilità.

## Stoico (Tipo 9)

- **Dataset & Hooks**: `themes.yaml` → `peacemaker_9`, `theme.peacemaker_9` e sinergie `triad.core_emotion.rabbia`/`harmonic.ottimisti`.
- **Scopo**: mitigare tilt e mantenere equilibrio mentale della squadra.
- **Trigger**: `tilt>0.65` come definito in telemetria e gestione delle finestre
  EMA correlate.【F:data/core/telemetry.yaml†L18-L29】
- **Effetti**: recupero morale a fine fase e vantaggio ai tiri di resistenza se
  il tilt rientra rapidamente.
- **Note operative**: abilitare pause tattiche programmate e segnali calmanti
  durante sessioni lunghe.

## Modulo e dataset Enneagramma

- **Modulo**: `packs/evo_tactics_pack/tools/py/modules/personality/enneagram/personality_module.v1.json` collega gli hook `theme.reformer_1`→`theme.peacemaker_9` ai temi definiti nel file `themes.yaml` e alle soglie telemetriche aggiornate.
- **Dataset personaggi**: `packs/evo_tactics_pack/tools/py/modules/personality/enneagram/enneagramma_dataset.json` fornisce nove profili operativi (ruoli, motivazioni, azioni firma) allineati alle metriche VC e ai requisiti di mating.
- **Compatibilità**: `packs/evo_tactics_pack/tools/py/modules/personality/enneagram/compat_map.json` documenta sinergie/antagonismi tra temi e statistiche (`ac`, `pp`, `sg` ecc.) per gli script di generazione e bilanciamento.
- **Bindings**: `packs/evo_tactics_pack/tools/py/modules/personality/enneagram/hook_bindings.ts` espone gli helper TypeScript usati dai generatori per risolvere hook ↔ dataset senza logica duplicata.
- **Schema**: `packs/evo_tactics_pack/tools/py/modules/personality/enneagram/enneagramma_schema.json` valida che eventuali estensioni mantengano struttura e soglie richieste dagli strumenti `validate_v7.py`.
