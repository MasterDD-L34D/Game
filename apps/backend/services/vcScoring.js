// SPRINT_003 fase 2 — VC scoring module (puro).
//
// Responsabilita':
//   1. Caricare (al boot) le configurazioni VC da data/core/telemetry.yaml
//      (pesi indici, formule MBTI, trigger Ennea, normalization_params).
//   2. Esporre funzioni pure che, dato uno `session` (con events + units +
//      cap_pt_used + grid), ritornano uno snapshot VC completo:
//        { per_actor: { <unit_id>: { raw_metrics, aggregate_indices,
//                                    mbti_axes, ennea_archetypes } },
//          meta: { events_count, turns_played, coverage, cap_pt_*, ... } }
//
// Nessun side-effect: legge telemetry.yaml una sola volta via loader,
// poi tutto il resto e' computazione sincrona sugli eventi.
//
// Variabili NON derivabili dai log attuali (pattern_entropy, cohesion,
// formation_time, 1vX, self_heal, overcap_guard, ecc.) ritornano `null`
// nel payload — scelta di "onesta' > completezza" dallo SPRINT_003.
//
// Il parser delle condition Ennea (`telemetry.yaml:ennea_themes[].when`)
// e' un mini tokenizer whitelisted scritto a mano: NO eval, NO new Function.

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { evaluateConviction } = require('./convictionEngine');

const DEFAULT_TELEMETRY_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'core',
  'telemetry.yaml',
);

const SCORING_VERSION = '0.1.0';

// Raw metrics derivabili dai log post-SPRINT_003 fase 0.
// L'ordine non conta, ma e' la lista autoritativa usata dalla
// rinormalizzazione dei pesi.
const DERIVABLE_RAW_KEYS = new Set([
  'attacks_started',
  'attack_hit_rate',
  'close_engage',
  'first_blood',
  'kill_pressure',
  'damage_taken_ratio',
  'damage_dealt_total',
  'low_hp_time',
  'assists',
  'support_bias',
  'setup_ratio',
  'total_actions',
  'moves_ratio',
  'utility_actions',
  'time_to_commit',
  'damage_taken',
  // SPRINT_005 fase 2: metrica per playstyle mordi-e-fuggi.
  // evasion_ratio = attacchi seguiti (nello stesso turno) da una
  // move che aumenta la distanza dal bersaglio / attacchi totali.
  'evasion_ratio',
  // SPRINT_011 (issue #5): metriche derivabili dagli eventi correnti.
  // 1vX = frazione di attacchi condotti in situazione "1 vs 1" (ciascuna
  //       fazione ha 1 sola unita' alive). Componente di `risk`.
  // new_tiles = numero di celle uniche visitate dall'attore nel suo
  //             percorso. Componente di `explore`.
  '1vX',
  'new_tiles',
  // P4 iter2 (2026-04-26): nuove raw metrics additive per axes refinement
  // MBTI secondo handoff Opzione A. Alimentano computeMbtiAxesIter2 (opt-in
  // via env VC_AXES_ITER=2). Non mutano iter1 axes (backward compat).
  //
  // enemy_target_ratio: eventi con target di team avverso / eventi totali
  //   con target. Proxy per Extraversion (bias verso contatto con nemico).
  // concrete_action_ratio: (attacks + moves) / total_actions. Proxy per
  //   Sensing (azioni fisiche dirette vs abstract ability/buff).
  // action_switch_rate: numero di transizioni action_type != prev /
  //   (total_actions - 1). Proxy per Perceiving (alta variance = P,
  //   bassa = J).
  'enemy_target_ratio',
  'concrete_action_ratio',
  'action_switch_rate',
]);

function loadTelemetryConfig(yamlPath = DEFAULT_TELEMETRY_PATH, logger = console) {
  try {
    const text = fs.readFileSync(yamlPath, 'utf8');
    const parsed = yaml.load(text);
    const indices = parsed?.indices || {};
    const mbtiAxes = parsed?.mbti_axes || {};
    const enneaThemes = Array.isArray(parsed?.ennea_themes) ? parsed.ennea_themes : [];
    const normalization = parsed?.telemetry?.normalization_params || {
      floor: 0.15,
      ceiling: 0.75,
      smoothing: 0.2,
    };
    logger.log(
      `[vc-scoring] telemetry config caricato: ${Object.keys(indices).length} indici, ${Object.keys(mbtiAxes).length} MBTI, ${enneaThemes.length} Ennea`,
    );
    return { indices, mbti_axes: mbtiAxes, ennea_themes: enneaThemes, normalization };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      logger.warn(`[vc-scoring] ${yamlPath} non trovato, registry vuoto`);
    } else {
      logger.warn(`[vc-scoring] errore caricamento ${yamlPath}: ${err.message || err}`);
    }
    return {
      indices: {},
      mbti_axes: {},
      ennea_themes: [],
      normalization: { floor: 0.15, ceiling: 0.75, smoothing: 0.2 },
    };
  }
}

function clamp01(x) {
  if (x === null || x === undefined || !Number.isFinite(x)) return null;
  return Math.max(0, Math.min(1, x));
}

function safeDivide(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 0;
  return num / den;
}

function manhattan(a, b) {
  if (!a || !b) return 0;
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

function computeRawMetrics(events, units, gridSize = 6) {
  if (!Array.isArray(events)) return {};
  if (!Array.isArray(units)) return {};

  // SPRINT_007 fase 1 (issue #4): mappa unit_id → attack_range per il
  // lookup efficiente durante il computo di close_engage. Il default
  // fallback e' 1 (pre-sprint-007 behavior: solo adiacenza contava).
  const unitRangeMap = {};
  for (const unit of units) {
    unitRangeMap[unit.id] = Number.isFinite(Number(unit?.attack_range))
      ? Number(unit.attack_range)
      : 1;
  }

  // SPRINT_011: lookup unit side/team per 1vX check. Al momento il gioco
  // ha 2 unita' (unit_1=player, unit_2=sistema) e la fazione e' determinata
  // dal campo `controlled_by`. Per generalizzare: due unita' sono "alleate"
  // se hanno lo stesso controlled_by.
  const unitTeamMap = {};
  for (const unit of units) {
    unitTeamMap[unit.id] = unit.controlled_by || 'unknown';
  }

  const perActor = {};
  for (const unit of units) {
    perActor[unit.id] = {
      attacks_started: 0,
      attack_hits: 0,
      attack_misses: 0,
      close_engage_attacks: 0,
      first_blood: 0,
      kills: 0,
      damage_dealt_total: 0,
      low_hp_events: 0,
      observed_events: 0,
      assists: 0,
      moves: 0,
      setup_attacks_after_move: 0,
      damage_taken: 0,
      first_attack_turn: null,
      total_actions: 0,
      move_distance_before_first_attack: 0,
      moves_before_first_attack: 0,
      // SPRINT_005 fase 2: tracking mordi-e-fuggi.
      // Un attacco diventa "evasivo" quando l'azione immediatamente
      // successiva dello stesso attore (nello stesso turno) e' un
      // move che aumenta la distanza Manhattan verso il bersaglio.
      // pendingEvasionAttack conserva il contesto fra l'attack e il
      // move successivo: { target_pos_at_attack, actor_pos_at_attack, turn }
      pendingEvasionAttack: null,
      evasion_attacks: 0,
      // SPRINT_011 (issue #5): metriche derivabili dagli eventi.
      // oneVxOneAttacks: count di attacchi dove l'actor era l'unica
      //   unita' viva del suo team E il target era l'unico nemico vivo.
      //   Usato per la metrica 1vX (frazione) in risk.
      // visitedTiles: set di chiavi "x,y" visitate dall'actor nel corso
      //   della sessione, per new_tiles (count) in explore.
      oneVxOneAttacks: 0,
      visitedTiles: new Set(),
      // P4 iter2: raw counters per axes refinement.
      // events_with_target: eventi che hanno un target_id valorizzato.
      // events_targeting_enemy: di cui target è team avverso.
      // action_switches: transizioni action_type diverso da quella precedente.
      // prev_action_type: cache per switch counting.
      events_with_target: 0,
      events_targeting_enemy: 0,
      action_switches: 0,
      prev_action_type: null,
      concrete_action_count: 0,
      abstract_action_count: 0,
    };
  }

  let totalDamageInSession = 0;
  let firstKillActor = null;
  const lastActionType = {};

  // SPRINT_011: replay HP state per 1vX. hpAtEvent[unit_id] = HP vivo
  // al momento corrente. Iniziale = max_hp (o hp iniziale dell'unita').
  // Decrementato su ogni attack hit contro quella unita'.
  const hpAtEvent = {};
  for (const unit of units) {
    hpAtEvent[unit.id] = Number.isFinite(unit.max_hp) ? unit.max_hp : (unit.hp ?? 10);
  }
  // Helper: conta alive per team alla situazione attuale.
  const countAliveByTeam = () => {
    const count = {};
    for (const unit of units) {
      if ((hpAtEvent[unit.id] ?? 0) > 0) {
        const team = unitTeamMap[unit.id];
        count[team] = (count[team] || 0) + 1;
      }
    }
    return count;
  };

  for (const event of events) {
    if (!event) continue;
    const actorId = event.actor_id;
    // Le azioni IA hanno actor_id="sistema" ma il metrics sono sempre
    // attribuiti allo unit reale. Usiamo ia_controlled_unit quando
    // presente per dirigere i contatori allo unit del Sistema.
    const bucketId = event.ia_controlled_unit || actorId;
    const bucket = perActor[bucketId];
    if (!bucket) continue;

    // P4 iter2 sidecar: target-team + action-type tracking, independent
    // from iter1 branches. Triggered solo per action_type "significativi"
    // (attack/move/ability). Exclude: kill/assist/bleeding/session_* che
    // sono eventi automatici o di tracking derivato.
    const ITER2_ACTION_TYPES = new Set(['attack', 'move', 'ability']);
    if (ITER2_ACTION_TYPES.has(event.action_type)) {
      // action_switches + concrete/abstract count
      if (bucket.prev_action_type !== null && bucket.prev_action_type !== event.action_type) {
        bucket.action_switches += 1;
      }
      bucket.prev_action_type = event.action_type;
      if (event.action_type === 'attack' || event.action_type === 'move') {
        bucket.concrete_action_count += 1;
      } else if (event.action_type === 'ability') {
        bucket.abstract_action_count += 1;
      }
      // enemy_target tracking: event con target_id di team avverso
      if (event.target_id && event.target_id !== bucketId) {
        bucket.events_with_target += 1;
        const actorTeam = unitTeamMap[bucketId];
        const targetTeam = unitTeamMap[event.target_id];
        if (actorTeam && targetTeam && actorTeam !== targetTeam) {
          bucket.events_targeting_enemy += 1;
        }
      }
    }

    if (event.action_type === 'attack') {
      bucket.attacks_started += 1;
      bucket.total_actions += 1;

      // SPRINT_011 (issue #5): 1vX check PRIMA di applicare il danno
      // dell'attacco corrente. Se al momento dell'attacco esisteva una
      // sola unita' viva per team (inclusi actor e target), conta come
      // attacco in duello 1v1. Semanticamente "sei rimasto l'unico contro
      // l'unico, ogni colpo vale doppio psicologicamente".
      const aliveByTeam = countAliveByTeam();
      const actorTeam = unitTeamMap[bucketId];
      const targetTeam = unitTeamMap[event.target_id];
      if (
        actorTeam &&
        targetTeam &&
        actorTeam !== targetTeam &&
        aliveByTeam[actorTeam] === 1 &&
        aliveByTeam[targetTeam] === 1
      ) {
        bucket.oneVxOneAttacks += 1;
      }

      if (bucket.first_attack_turn === null && Number.isFinite(event.turn)) {
        bucket.first_attack_turn = event.turn;
      }
      if (event.result === 'hit') {
        bucket.attack_hits += 1;
        bucket.damage_dealt_total += Number(event.damage_dealt) || 0;
        // SPRINT_007 fase 1 (issue #4): close_engage ridefinito come
        // "attacco in mutual range" — conta se la distanza e' <=
        // attack_range DEL BERSAGLIO (non dell'attaccante). Semantica:
        // "ti sei esposto al counter-attack nemico nello stesso turno".
        // Questo generalizza la vecchia condizione (d <= 1) senza
        // banalizzarla: un skirmisher r2 che colpisce da dist 2 un
        // vanguard r1 NON prende close_engage (il vanguard non puo'
        // rispondere). Fallback 1 per compat con sessioni legacy.
        if (event.target_position_at_attack && event.position_from) {
          const d = manhattan(event.position_from, event.target_position_at_attack);
          const targetRange = unitRangeMap[event.target_id] ?? 1;
          if (d <= targetRange) bucket.close_engage_attacks += 1;
        }
        // low_hp_time proxy: target_hp_after < 0.3 * target_hp_before (proxy)
        if (
          Number.isFinite(event.target_hp_after) &&
          Number.isFinite(event.target_hp_before) &&
          event.target_hp_before > 0 &&
          event.target_hp_after < 0.3 * event.target_hp_before
        ) {
          bucket.low_hp_events += 1;
        }
        // SPRINT_011: aggiorna hpAtEvent[target] col danno inflitto
        // DOPO aver usato lo stato pre-attack per il check 1vX.
        if (event.target_id && Number.isFinite(event.target_hp_after)) {
          hpAtEvent[event.target_id] = event.target_hp_after;
        } else if (event.target_id) {
          // Fallback se target_hp_after non disponibile
          const dmg = Number(event.damage_dealt) || 0;
          hpAtEvent[event.target_id] = Math.max(0, (hpAtEvent[event.target_id] ?? 0) - dmg);
        }
      } else {
        bucket.attack_misses += 1;
      }
      bucket.observed_events += 1;
      // setup_ratio: attack preceduto da move dello stesso actor
      if (lastActionType[bucketId] === 'move') {
        bucket.setup_attacks_after_move += 1;
      }
      // SPRINT_005 fase 2: registra il contesto per evasion detection.
      // position_from e target_position_at_attack sono entrambi presenti
      // grazie alla fase 1 del sprint-005. Se manca uno dei due, skip.
      if (event.position_from && event.target_position_at_attack) {
        bucket.pendingEvasionAttack = {
          actor_pos: event.position_from,
          target_pos: event.target_position_at_attack,
          turn: event.turn,
        };
      } else {
        bucket.pendingEvasionAttack = null;
      }
      lastActionType[bucketId] = 'attack';
    } else if (event.action_type === 'move') {
      bucket.moves += 1;
      bucket.total_actions += 1;
      // SPRINT_011 (issue #5): tracking delle celle uniche visitate
      // per new_tiles (esplorazione). Si contano sia la cella di partenza
      // che quella di arrivo: cosi' la prima azione di un'unita' registra
      // anche la sua posizione iniziale.
      if (event.position_from) {
        bucket.visitedTiles.add(`${event.position_from.x},${event.position_from.y}`);
      }
      if (event.position_to) {
        bucket.visitedTiles.add(`${event.position_to.x},${event.position_to.y}`);
      }
      // distanza prima del primo attack (proxy time_to_commit)
      if (bucket.first_attack_turn === null) {
        const d = manhattan(event.position_from, event.position_to);
        bucket.move_distance_before_first_attack += d;
        bucket.moves_before_first_attack += 1;
      }
      // SPRINT_005 fase 2: se avevamo un attack in pending e il move
      // nello stesso turno aumenta la Manhattan distance dal bersaglio,
      // l'attack e' "evasivo".
      if (bucket.pendingEvasionAttack && bucket.pendingEvasionAttack.turn === event.turn) {
        const before = manhattan(event.position_from, bucket.pendingEvasionAttack.target_pos);
        const after = manhattan(event.position_to, bucket.pendingEvasionAttack.target_pos);
        if (after > before) {
          bucket.evasion_attacks += 1;
        }
        bucket.pendingEvasionAttack = null;
      }
      lastActionType[bucketId] = 'move';
    } else if (event.action_type === 'kill') {
      bucket.kills += 1;
      if (firstKillActor === null) {
        firstKillActor = bucketId;
        bucket.first_blood = 1;
      }
    } else if (event.action_type === 'assist') {
      bucket.assists += 1;
    }
  }

  // damage_taken per attore: somma dei damage_dealt degli eventi attack
  // il cui target era l'attore corrente.
  for (const event of events) {
    if (!event || event.action_type !== 'attack' || event.result !== 'hit') continue;
    const targetBucket = perActor[event.target_id];
    if (!targetBucket) continue;
    const dmg = Number(event.damage_dealt) || 0;
    targetBucket.damage_taken += dmg;
    totalDamageInSession += dmg;
  }

  // Costruisci le raw metrics finali normalizzate.
  const finalRaw = {};
  const maxTurn = events.reduce((m, e) => Math.max(m, Number(e?.turn) || 0), 1);
  for (const [unitId, bucket] of Object.entries(perActor)) {
    const attacksStarted = bucket.attacks_started;
    const totalActions = bucket.total_actions || 0;
    const attackHitRate = attacksStarted > 0 ? bucket.attack_hits / attacksStarted : 0;
    const closeEngage = attacksStarted > 0 ? bucket.close_engage_attacks / attacksStarted : 0;
    const killPressure = safeDivide(bucket.kills, Math.max(1, maxTurn));
    const damageTakenRatio = safeDivide(bucket.damage_taken, totalDamageInSession || 1);
    const lowHpTime = safeDivide(bucket.low_hp_events, Math.max(1, bucket.observed_events));
    const setupRatio = safeDivide(bucket.setup_attacks_after_move, Math.max(1, attacksStarted));
    const movesRatio = safeDivide(bucket.moves, Math.max(1, totalActions));
    const utilityActions = setupRatio; // proxy: move+attack = utility
    // support_bias normalizzato su 1: (assists_norm + moves_ratio) / 2
    const assistsNorm = safeDivide(bucket.assists, Math.max(1, totalActions));
    const supportBias = (assistsNorm + movesRatio) / 2;
    // time_to_commit: frazione di grid percorsa prima del primo attack
    const timeToCommit = safeDivide(
      bucket.move_distance_before_first_attack,
      Math.max(1, gridSize),
    );

    // SPRINT_005 fase 2: evasion_ratio = attacchi seguiti da ritirata / attacchi totali.
    const evasionRatio = attacksStarted > 0 ? bucket.evasion_attacks / attacksStarted : 0;

    // SPRINT_011 (issue #5): metriche nuove.
    // 1vX: frazione degli attacchi condotti in situazione 1v1 isolata.
    const oneVxOneRatio = attacksStarted > 0 ? bucket.oneVxOneAttacks / attacksStarted : 0;
    // new_tiles: numero di celle uniche visitate, normalizzato su gridSize^2
    // cosi' e' in [0, 1] (1 = ha visitato tutto il grid).
    const newTilesRaw = bucket.visitedTiles.size;
    const newTilesNorm = safeDivide(newTilesRaw, Math.max(1, gridSize * gridSize));

    // P4 iter2 derived metrics.
    const enemyTargetRatio =
      bucket.events_with_target > 0
        ? bucket.events_targeting_enemy / bucket.events_with_target
        : null;
    const iter2Total = bucket.concrete_action_count + bucket.abstract_action_count;
    const concreteActionRatio = iter2Total > 0 ? bucket.concrete_action_count / iter2Total : null;
    // action_switch_rate: numero switch / (iter2Total - 1). Quando iter2Total
    // <=1 non derivabile (nessuna transizione possibile).
    const actionSwitchRate = iter2Total > 1 ? bucket.action_switches / (iter2Total - 1) : null;

    finalRaw[unitId] = {
      attacks_started: attacksStarted,
      attack_hit_rate: attackHitRate,
      close_engage: closeEngage,
      first_blood: bucket.first_blood,
      kill_pressure: killPressure,
      kills: bucket.kills,
      damage_dealt_total: bucket.damage_dealt_total,
      damage_taken: bucket.damage_taken,
      damage_taken_ratio: damageTakenRatio,
      low_hp_time: lowHpTime,
      assists: bucket.assists,
      moves: bucket.moves,
      total_actions: totalActions,
      setup_ratio: setupRatio,
      moves_ratio: movesRatio,
      utility_actions: utilityActions,
      support_bias: supportBias,
      time_to_commit: timeToCommit,
      evasion_ratio: evasionRatio,
      evasion_attacks: bucket.evasion_attacks,
      '1vX': oneVxOneRatio,
      new_tiles: newTilesNorm,
      new_tiles_count: newTilesRaw,
      // P4 iter2 additive.
      enemy_target_ratio: enemyTargetRatio,
      concrete_action_ratio: concreteActionRatio,
      action_switch_rate: actionSwitchRate,
    };
  }

  return finalRaw;
}

function computeAggregateIndex(weights, raw) {
  // Rinormalizza i pesi sugli elementi derivabili dalle raw metrics.
  // Se tutti sono null -> null. Coverage: full se nessun peso e'
  // stato scartato, partial altrimenti.
  let totalWeight = 0;
  let weightedSum = 0;
  const missing = [];
  for (const [weightKey, weight] of Object.entries(weights)) {
    if (typeof weight !== 'number') continue;
    const varName = weightKey.replace(/^w_/, '');
    const rawValue = raw[varName];
    if (DERIVABLE_RAW_KEYS.has(varName) && rawValue !== null && rawValue !== undefined) {
      totalWeight += Math.abs(weight);
      weightedSum += weight * clamp01(rawValue);
    } else {
      missing.push(varName);
    }
  }
  if (totalWeight === 0) return null;
  const value = clamp01(weightedSum / totalWeight);
  if (missing.length === 0) {
    return { value, coverage: 'full' };
  }
  return { value, coverage: 'partial', missing };
}

function computeAggregateIndices(raw, config) {
  const result = {};
  for (const [indexName, weights] of Object.entries(config.indices || {})) {
    // tilt ha una config diversa (window-based), non applicabile a snapshot
    if (indexName === 'tilt') {
      result[indexName] = null;
      continue;
    }
    // Filtra solo le key con prefisso w_
    const weightEntries = Object.fromEntries(
      Object.entries(weights || {}).filter(([k]) => k.startsWith('w_')),
    );
    if (Object.keys(weightEntries).length === 0) {
      result[indexName] = null;
      continue;
    }
    result[indexName] = computeAggregateIndex(weightEntries, raw);
  }
  return result;
}

function computeMbtiAxes(raw) {
  // SPRINT_003 decisione: solo gli assi derivabili ritornano valore.
  // - E_I: dipende da cohesion (null) -> null
  // - S_N: dipende da pattern_entropy/cover_discipline/pattern_break -> null
  // - T_F: utility_actions + support_bias entrambi derivabili -> full
  // - J_P: setup_ratio (proxy per setup) + time_to_commit derivabili,
  //   last_second null -> partial con pesi rinormalizzati
  const axes = {
    E_I: null,
    S_N: null,
    T_F: null,
    J_P: null,
  };

  // E_I: Extraversion vs Introversion (P4 completion)
  // close_engage = spatial engagement, support_bias = team interaction,
  // time_to_commit inversed = speed to action
  const closeEngage = clamp01(raw.close_engage);
  const supportBias = clamp01(raw.support_bias);
  const timeToCommit = clamp01(raw.time_to_commit);
  if (closeEngage !== null && supportBias !== null && timeToCommit !== null) {
    const value = 1 - 0.5 * closeEngage - 0.25 * supportBias - 0.25 * (1 - timeToCommit);
    axes.E_I = { value: clamp01(value), coverage: 'full' };
  } else if (closeEngage !== null && supportBias !== null) {
    const value = 1 - 0.6 * closeEngage - 0.4 * supportBias;
    axes.E_I = { value: clamp01(value), coverage: 'partial' };
  }

  // S_N: Sensing vs Intuition (P4 completion)
  // new_tiles = exploration diversity (N), setup_ratio = methodical (S),
  // evasion_ratio = improvisation (N)
  const newTiles = clamp01(raw.new_tiles);
  const setupRatio = clamp01(raw.setup_ratio);
  const evasionRatio = clamp01(raw.evasion_ratio);
  if (newTiles !== null && setupRatio !== null && evasionRatio !== null) {
    const value = 1 - 0.4 * newTiles + 0.3 * setupRatio - 0.3 * evasionRatio;
    axes.S_N = { value: clamp01(value), coverage: 'full' };
  } else if (newTiles !== null && setupRatio !== null) {
    const value = 1 - 0.55 * newTiles + 0.45 * setupRatio;
    axes.S_N = { value: clamp01(value), coverage: 'partial' };
  }

  // T_F: Thinking vs Feeling
  const utility = clamp01(raw.utility_actions);
  const support = clamp01(raw.support_bias);
  if (utility !== null && support !== null) {
    const value = 1 - 0.5 * utility + 0.5 * support;
    axes.T_F = { value: clamp01(value), coverage: 'full' };
  }

  // J_P: Judging vs Perceiving
  const setupProxy = clamp01(raw.setup_ratio);
  if (setupProxy !== null && timeToCommit !== null) {
    const totalWeight = 0.6 + 0.2;
    const normalised = 1 - (0.6 / totalWeight) * setupProxy - (0.2 / totalWeight) * timeToCommit;
    axes.J_P = { value: clamp01(normalised), coverage: 'partial' };
  }

  return axes;
}

/**
 * P4: derive MBTI 4-letter type from axes values.
 * VC Calibration iter1 (2026-04-17): dead-band 0.45-0.55 considerato
 * indeterminato per evitare false classification da rumore in sessioni corte.
 *
 * Sprint 2026-04-26 (telemetria VC compromesso): dead-band stretto
 * 0.45-0.55 per session lunghe (events_count >= 30); dead-band largo
 * 0.35-0.65 per session brevi (events_count < 30) per ridurre false
 * classification da pochi eventi rumorosi. La logica resta:
 *   value < band_low  → lettera "lo"
 *   value > band_high → lettera "hi"
 *   altrimenti        → null (indeterminato, propaga al deriveMbtiType)
 *
 * Returns null se (a) uno degli assi è null oppure (b) almeno un asse cade
 * in dead-band. Rationale: downstream mating logic usa
 * `partyMember.mbti_type || 'NEUTRA'` come fallback. Ritornare una stringa
 * non-vuota (es. 'XNTJ') bypasserebbe il fallback e genererebbe lookup
 * fallito nella compat table, distorcendo i compat modifiers silenziosamente.
 */
const MBTI_DEAD_BAND_LOW = 0.45;
const MBTI_DEAD_BAND_HIGH = 0.55;
const MBTI_DEAD_BAND_LOW_SHORT = 0.35;
const MBTI_DEAD_BAND_HIGH_SHORT = 0.65;
const MBTI_SHORT_SESSION_EVENTS = 30;

function resolveDeadBand(eventsCount) {
  if (Number.isFinite(eventsCount) && eventsCount < MBTI_SHORT_SESSION_EVENTS) {
    return { lo: MBTI_DEAD_BAND_LOW_SHORT, hi: MBTI_DEAD_BAND_HIGH_SHORT };
  }
  return { lo: MBTI_DEAD_BAND_LOW, hi: MBTI_DEAD_BAND_HIGH };
}

function letterOrUncertain(value, lo, hi, band = null) {
  const lowT = band?.lo ?? MBTI_DEAD_BAND_LOW;
  const highT = band?.hi ?? MBTI_DEAD_BAND_HIGH;
  if (value < lowT) return lo;
  if (value > highT) return hi;
  return null; // Bot review fix: dead-band axes MUST propagate null so mating fallback triggers correctly
}

/**
 * P4 iter2 (2026-04-26) — axes refinement con raw metrics canoniche.
 *
 * Handoff spec:
 *   - E_I: enemy_target_ratio (extraversion proxy diretto; bias verso nemico)
 *   - S_N: concrete_action_ratio (sensing proxy; azioni fisiche vs astratte)
 *   - J_P: action_switch_rate (perceiving proxy; alta variance tipo action = P)
 *   - T_F: invariato rispetto iter1 (utility + support_bias)
 *
 * Coverage = 'full' quando la raw metric primaria è non-null. Convenzione
 * direzione coerente con iter1 letterOrUncertain: value basso = lettera
 * iniziale del pair (E/N/F/P), value alto = seconda (I/S/T/J).
 *
 * Opt-in: `buildVcSnapshot` usa iter2 quando env `VC_AXES_ITER=2` oppure
 * `telemetryConfig.use_axes_iter2 === true`. Default = iter1 (backward compat).
 */
function computeMbtiAxesIter2(raw) {
  const axes = { E_I: null, S_N: null, T_F: null, J_P: null };

  // E_I: extravert attacca nemico → basso value. Invertiamo: value = 1 - ratio.
  const enemyRatio = raw.enemy_target_ratio;
  if (enemyRatio !== null && enemyRatio !== undefined) {
    axes.E_I = { value: clamp01(1 - enemyRatio), coverage: 'full' };
  }

  // S_N: sensing = concreto (attacco/move) → alto value (vicino 1 = S).
  // concrete_action_ratio alto = S side (letterOrUncertain high=S).
  const concreteRatio = raw.concrete_action_ratio;
  if (concreteRatio !== null && concreteRatio !== undefined) {
    axes.S_N = { value: clamp01(concreteRatio), coverage: 'full' };
  }

  // T_F: invariato (stesso formula iter1).
  const utility = clamp01(raw.utility_actions);
  const support = clamp01(raw.support_bias);
  if (utility !== null && support !== null) {
    const value = 1 - 0.5 * utility + 0.5 * support;
    axes.T_F = { value: clamp01(value), coverage: 'full' };
  }

  // J_P: high switch rate = P side (improvvisa). letterOrUncertain P=low,
  // J=high → invertiamo: value = 1 - switch_rate.
  const switchRate = raw.action_switch_rate;
  if (switchRate !== null && switchRate !== undefined) {
    axes.J_P = { value: clamp01(1 - switchRate), coverage: 'full' };
  }

  return axes;
}

function deriveMbtiType(axes, opts = {}) {
  if (!axes) return null;
  const get = (axis) => (axis && axis.value !== undefined ? axis.value : null);
  const ei = get(axes.E_I);
  const sn = get(axes.S_N);
  const tf = get(axes.T_F);
  const jp = get(axes.J_P);
  if (ei === null || sn === null || tf === null || jp === null) return null;
  // Sprint 2026-04-26: events_count gating. Short session → dead-band largo
  // (0.35-0.65); long session → dead-band stretto (0.45-0.55).
  const band = resolveDeadBand(opts.events_count);
  const letters = [
    letterOrUncertain(ei, 'E', 'I', band),
    letterOrUncertain(sn, 'N', 'S', band),
    letterOrUncertain(tf, 'F', 'T', band),
    letterOrUncertain(jp, 'P', 'J', band),
  ];
  if (letters.some((l) => l === null)) return null;
  return letters.join('');
}

// ----------- parser whitelisted per ennea_themes[].when --------------

function tokenizeCondition(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (/[a-z_]/i.test(c)) {
      let j = i;
      while (j < expr.length && /[a-z_0-9]/i.test(expr[j])) j += 1;
      tokens.push({ type: 'ident', value: expr.slice(i, j) });
      i = j;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j += 1;
      tokens.push({ type: 'number', value: Number(expr.slice(i, j)) });
      i = j;
      continue;
    }
    if (c === '>' || c === '<') {
      if (expr[i + 1] === '=') {
        tokens.push({ type: 'op', value: `${c}=` });
        i += 2;
        continue;
      }
      tokens.push({ type: 'op', value: c });
      i += 1;
      continue;
    }
    if (c === '&' && expr[i + 1] === '&') {
      tokens.push({ type: 'logical', value: '&&' });
      i += 2;
      continue;
    }
    if (c === '|' && expr[i + 1] === '|') {
      tokens.push({ type: 'logical', value: '||' });
      i += 2;
      continue;
    }
    throw new Error(`unexpected char '${c}' at pos ${i}`);
  }
  return tokens;
}

function evaluateClause(tokens, getValue) {
  if (tokens.length !== 3) throw new Error('clause must have 3 tokens');
  const [a, op, b] = tokens;
  if (op.type !== 'op') throw new Error('middle token must be op');
  const lhs = a.type === 'ident' ? getValue(a.value) : a.type === 'number' ? a.value : undefined;
  const rhs = b.type === 'ident' ? getValue(b.value) : b.type === 'number' ? b.value : undefined;
  if (lhs === null) return { value: null, missing: a.type === 'ident' ? a.value : null };
  if (rhs === null) return { value: null, missing: b.type === 'ident' ? b.value : null };
  switch (op.value) {
    case '>':
      return { value: lhs > rhs };
    case '<':
      return { value: lhs < rhs };
    case '>=':
      return { value: lhs >= rhs };
    case '<=':
      return { value: lhs <= rhs };
    default:
      throw new Error(`unknown op ${op.value}`);
  }
}

function evaluateCondition(expr, getValue) {
  const tokens = tokenizeCondition(expr);
  // Split su logical operators (precedenza: && left-to-right, || left-to-right)
  const clauses = [];
  const logicals = [];
  let current = [];
  for (const t of tokens) {
    if (t.type === 'logical') {
      clauses.push(current);
      logicals.push(t.value);
      current = [];
    } else {
      current.push(t);
    }
  }
  clauses.push(current);
  const clauseResults = clauses.map((c) => evaluateClause(c, getValue));
  let result = clauseResults[0];
  for (let idx = 0; idx < logicals.length; idx += 1) {
    const next = clauseResults[idx + 1];
    if (result.value === null || next.value === null) {
      result = { value: null, missing: result.missing || next.missing };
      continue;
    }
    if (logicals[idx] === '&&') result = { value: result.value && next.value };
    else if (logicals[idx] === '||') result = { value: result.value || next.value };
  }
  return result;
}

// 2026-05-10 audit cross-domain BACKLOG TKT-ENNEA-METRICS-FALLBACK:
// metrics che hanno semantica "0 quando inosservato in solo scenario"
// (es. assists, low_hp_time). Pre-fix: getValue ritornava null quando
// metric mancante → condition evaluator raggiungeva missing:<name> +
// trigger silently no-op. Calibration analysts vedevano "missing"
// pensando data broken, in realtà solo "scenario non aveva eventi
// quel tipo" (canonical 0 atteso). Fallback: known-zero-in-solo
// metrics default a 0 numeric quando assenti, così condition evalua
// correttamente come false (es. assists > 0.3 in solo → 0 > 0.3 →
// false con reason='triggered:false', NON 'missing:assists').
const ENNEA_ZERO_DEFAULT_METRICS = new Set([
  'assists',
  'low_hp_time',
  'evasion_count',
  'parry_count',
  'reaction_count',
]);

function computeEnneaArchetypes(aggregateIndices, config, rawMetrics = null) {
  const themes = Array.isArray(config.ennea_themes) ? config.ennea_themes : [];
  const getValue = (name) => {
    // Priorita' 1: aggregate indices (aggro, risk, cohesion, ...)
    const entry = aggregateIndices[name];
    if (entry && typeof entry === 'object' && 'value' in entry) return entry.value;
    if (entry === null) return null;
    // Priorita' 2: raw metrics (evasion_ratio, damage_taken_ratio, ...)
    // cosi' gli archetipi possono riferirsi direttamente a contatori
    // pre-aggregati senza dover creare un indice dedicato.
    if (rawMetrics && Object.prototype.hasOwnProperty.call(rawMetrics, name)) {
      const raw = rawMetrics[name];
      return typeof raw === 'number' ? raw : null;
    }
    // Priorita' 3: zero-default fallback per known-zero-in-solo metrics.
    // Questo evita reason='missing:<name>' false positive in scenari
    // dove la metrica semplicemente non ha eventi (es. solo run senza
    // alleati → assists semper 0).
    if (ENNEA_ZERO_DEFAULT_METRICS.has(name)) return 0;
    return null;
  };
  return themes.map((theme) => {
    if (!theme || !theme.when || !theme.id) {
      return { id: theme?.id || 'unknown', triggered: false, reason: 'invalid_theme' };
    }
    try {
      const res = evaluateCondition(theme.when, getValue);
      if (res.value === null) {
        return {
          id: theme.id,
          triggered: false,
          condition: theme.when,
          reason: res.missing ? `missing:${res.missing}` : 'missing',
        };
      }
      return {
        id: theme.id,
        triggered: Boolean(res.value),
        condition: theme.when,
      };
    } catch (err) {
      return {
        id: theme.id,
        triggered: false,
        condition: theme.when,
        reason: 'parse_error',
      };
    }
  });
}

function buildVcSnapshot(session, config) {
  const events = Array.isArray(session?.events) ? session.events : [];
  const units = Array.isArray(session?.units) ? session.units : [];
  const gridSize = session?.grid?.width || 6;
  const raw = computeRawMetrics(events, units, gridSize);

  // P4 iter2 (sprint 2026-04-26 telemetria VC) — REOPENED 2026-05-10
  // (TKT-VCSCORING-ITER2-DEFAULT cross-domain audit BACKLOG):
  //
  // History:
  //   2026-04-26: iter2 default ON shipped → broke tutorial seed thought unlock
  //               (axes null su events_count=0; iter1 derivava da setup_ratio
  //               anche senza eventi).
  //   2026-04-27: REVERTED → default iter1 backward compat.
  //   2026-05-10: REOPEN per chiudere P4 pillar gap (E_I + S_N partial < 30
  //               events). Hybrid: iter2 default ON ma fallback iter1 quando
  //               events_count < EVENTS_FALLBACK_THRESHOLD (preserve tutorial
  //               seed thought unlock + short-session classification).
  //
  // Threshold: 10 events = ~5 turni gameplay. Sotto, iter2 axes (enemy_target_ratio
  // / concrete_action_ratio / action_switch_rate) hanno noise eccessivo. Iter1
  // più robusto su sample size piccolo.
  //
  // Override priority:
  //   1. config.use_axes_iter2 (telemetry.yaml explicit)
  //   2. env VC_AXES_ITER=1 OR =2 (force)
  //   3. events_count >= 10 → iter2 (default reopen)
  //   4. events_count < 10 → iter1 (fallback short session)
  const EVENTS_FALLBACK_THRESHOLD = 10;
  let iter2;
  if (config?.use_axes_iter2 === true) {
    iter2 = true;
  } else if (config?.use_axes_iter2 === false) {
    iter2 = false;
  } else if (process.env.VC_AXES_ITER === '1') {
    iter2 = false;
  } else if (process.env.VC_AXES_ITER === '2') {
    iter2 = true;
  } else {
    // Default reopen 2026-05-10: iter2 ON quando events_count sufficient,
    // iter1 fallback per tutorial seed thought unlock compat.
    iter2 = events.length >= EVENTS_FALLBACK_THRESHOLD;
  }
  const axesFn = iter2 ? computeMbtiAxesIter2 : computeMbtiAxes;

  const perActor = {};
  // Sprint 2026-04-26: pass events_count a deriveMbtiType per dead-band
  // adattivo (short session < 30 eventi → 0.35/0.65, altrimenti 0.45/0.55).
  const eventsCount = events.length;
  // TKT-M14-B Phase A: conviction axis aggregato additivo, vedi
  // services/convictionEngine.js. Range 0..100 per axis, baseline 50.
  const convictionByActor = evaluateConviction(events, units);
  // 2026-05-14 OD-024 Phase B3 ai-station — sentience tier fold.
  // Reads species_catalog.json (Game/ canonical post #2262) and resolves
  // per-actor sentience_index (T0-T6). Adds 4th layer to 3-layer psicologico
  // (MBTI 4-axis + Ennea 9-arch + Conviction 3-axis + Sentience tier).
  // Cross-link: docs/governance/open-decisions/OD-024-031-verdict-record.md
  const sentienceByActor = _resolveSentienceTiers(units, session);
  for (const [unitId, rawMetrics] of Object.entries(raw)) {
    const aggregate = computeAggregateIndices(rawMetrics, config);
    const mbti = axesFn(rawMetrics);
    const ennea = computeEnneaArchetypes(aggregate, config, rawMetrics);
    perActor[unitId] = {
      raw_metrics: rawMetrics,
      aggregate_indices: aggregate,
      mbti_axes: mbti,
      mbti_type: deriveMbtiType(mbti, { events_count: eventsCount }),
      ennea_archetypes: ennea,
      // TKT-M14-B Phase A — additive, non rompe consumer esistenti.
      conviction_axis: convictionByActor[unitId] || {
        utility: 50,
        liberty: 50,
        morality: 50,
        events_classified: 0,
      },
      // 2026-05-14 OD-024 Phase B3 — sentience tier (4th psicologico layer).
      sentience: sentienceByActor[unitId] || {
        tier: 'T1',
        source: 'default-fallback',
      },
    };
  }

  // coverage summary
  const fullIndices = new Set();
  const partialIndices = new Set();
  const nullIndices = new Set();
  for (const actorData of Object.values(perActor)) {
    for (const [name, entry] of Object.entries(actorData.aggregate_indices)) {
      if (entry === null) nullIndices.add(name);
      else if (entry.coverage === 'full') fullIndices.add(name);
      else if (entry.coverage === 'partial') partialIndices.add(name);
    }
    for (const [name, entry] of Object.entries(actorData.mbti_axes)) {
      if (entry === null) nullIndices.add(name);
      else if (entry.coverage === 'full') fullIndices.add(name);
      else if (entry.coverage === 'partial') partialIndices.add(name);
    }
  }

  const turnsPlayed = events.reduce((m, e) => Math.max(m, Number(e?.turn) || 0), 0);

  return {
    session_id: session?.session_id || null,
    per_actor: perActor,
    meta: {
      events_count: events.length,
      turns_played: turnsPlayed,
      cap_pt_used: Number.isFinite(session?.cap_pt_used) ? session.cap_pt_used : 0,
      cap_pt_max: Number.isFinite(session?.cap_pt_max) ? session.cap_pt_max : null,
      coverage: {
        full: [...fullIndices].sort(),
        partial: [...partialIndices].sort(),
        null: [...nullIndices].sort(),
      },
      generated_at: new Date().toISOString(),
      scoring_version: SCORING_VERSION,
    },
  };
}

// 2026-05-14 OD-024 Phase B3 ai-station — sentience tier resolver.
// Reads species_catalog.json (Game/ data/core/species/) and maps each unit
// to its sentience_index via species_id lookup. Cache catalog per call site
// to avoid repeat disk reads.
//
// Resolution priority:
//   1. session.species_catalog (in-memory caller injection) — preferred
//   2. Load from data/core/species/species_catalog.json (canonical)
//   3. Fallback: empty index → all units default to "T1" (RFC v0.1 baseline)
//
// Returns { <unit_id>: { tier: "T0"|...|"T6", source: <provenance> } }
//
// Mirror Godot v2 scripts/scoring/vc_scoring.gd _resolve_sentience_tiers.
let _cachedSpeciesCatalog = null;
let _cachedCatalogPath = null;
const _DEFAULT_SPECIES_CATALOG_PATH = require('path').resolve(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'core',
  'species',
  'species_catalog.json',
);

function _loadSpeciesCatalog(filePath = _DEFAULT_SPECIES_CATALOG_PATH) {
  if (_cachedSpeciesCatalog !== null && _cachedCatalogPath === filePath) {
    return _cachedSpeciesCatalog;
  }
  try {
    const raw = require('fs').readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const index = {};
    if (Array.isArray(parsed?.catalog)) {
      for (const entry of parsed.catalog) {
        if (entry?.species_id) {
          index[entry.species_id] = entry;
        }
      }
    }
    _cachedSpeciesCatalog = index;
    _cachedCatalogPath = filePath;
    return index;
  } catch {
    _cachedSpeciesCatalog = {};
    _cachedCatalogPath = filePath;
    return {};
  }
}

function _resetSpeciesCatalogCache() {
  _cachedSpeciesCatalog = null;
  _cachedCatalogPath = null;
}

function _resolveSentienceTiers(units, session) {
  const out = {};
  if (!Array.isArray(units) || units.length === 0) return out;
  // Caller-injected catalog (e.g. tests) takes precedence over disk load.
  const sessionCatalog =
    session && session.species_catalog && typeof session.species_catalog === 'object'
      ? session.species_catalog
      : null;
  const catalog = sessionCatalog || _loadSpeciesCatalog();
  for (const u of units) {
    if (!u || !u.id) continue;
    const speciesId = u.species_id || u.species || '';
    const entry = catalog[speciesId];
    if (entry && typeof entry.sentience_index === 'string') {
      out[u.id] = { tier: entry.sentience_index, source: 'species_catalog' };
    } else {
      out[u.id] = { tier: 'T1', source: 'default-fallback' };
    }
  }
  return out;
}

module.exports = {
  loadTelemetryConfig,
  computeRawMetrics,
  computeAggregateIndices,
  computeMbtiAxes,
  computeMbtiAxesIter2,
  deriveMbtiType,
  computeEnneaArchetypes,
  buildVcSnapshot,
  tokenizeCondition,
  evaluateCondition,
  SCORING_VERSION,
  // 2026-05-14 Phase B3 — sentience tier resolver exports for tests + tools.
  _loadSpeciesCatalog,
  _resetSpeciesCatalogCache,
  _resolveSentienceTiers,
  DEFAULT_TELEMETRY_PATH,
};
