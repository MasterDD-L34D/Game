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
    };
  }

  let totalDamageInSession = 0;
  let firstKillActor = null;
  const lastActionType = {};

  for (const event of events) {
    if (!event) continue;
    const actorId = event.actor_id;
    // Le azioni IA hanno actor_id="sistema" ma il metrics sono sempre
    // attribuiti allo unit reale. Usiamo ia_controlled_unit quando
    // presente per dirigere i contatori allo unit del Sistema.
    const bucketId = event.ia_controlled_unit || actorId;
    const bucket = perActor[bucketId];
    if (!bucket) continue;

    if (event.action_type === 'attack') {
      bucket.attacks_started += 1;
      bucket.total_actions += 1;

      if (bucket.first_attack_turn === null && Number.isFinite(event.turn)) {
        bucket.first_attack_turn = event.turn;
      }
      if (event.result === 'hit') {
        bucket.attack_hits += 1;
        bucket.damage_dealt_total += Number(event.damage_dealt) || 0;
        // close_engage: attack con Manhattan <= 1 dal target al momento
        if (event.target_position_at_attack && event.position_from) {
          const d = manhattan(event.position_from, event.target_position_at_attack);
          if (d <= 1) bucket.close_engage_attacks += 1;
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
      } else {
        bucket.attack_misses += 1;
      }
      bucket.observed_events += 1;
      // setup_ratio: attack preceduto da move dello stesso actor
      if (lastActionType[bucketId] === 'move') {
        bucket.setup_attacks_after_move += 1;
      }
      lastActionType[bucketId] = 'attack';
    } else if (event.action_type === 'move') {
      bucket.moves += 1;
      bucket.total_actions += 1;
      // distanza prima del primo attack (proxy time_to_commit)
      if (bucket.first_attack_turn === null) {
        const d = manhattan(event.position_from, event.position_to);
        bucket.move_distance_before_first_attack += d;
        bucket.moves_before_first_attack += 1;
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

  const utility = clamp01(raw.utility_actions);
  const support = clamp01(raw.support_bias);
  if (utility !== null && support !== null) {
    // formula originale: 1 - 0.5*utility_actions + 0.5*support_bias
    const value = 1 - 0.5 * utility + 0.5 * support;
    axes.T_F = { value: clamp01(value), coverage: 'full' };
  }

  const setupProxy = clamp01(raw.setup_ratio);
  const timeToCommit = clamp01(raw.time_to_commit);
  if (setupProxy !== null && timeToCommit !== null) {
    // formula originale: 1 - 0.6*setup - 0.2*time_to_commit + 0.2*last_second
    // last_second null -> scartato; rinormalizza i pesi rimanenti
    // (-0.6 e -0.2) su |total| = 0.8. Mantiene il segno.
    const totalWeight = 0.6 + 0.2;
    const normalised = 1 - (0.6 / totalWeight) * setupProxy - (0.2 / totalWeight) * timeToCommit;
    axes.J_P = { value: clamp01(normalised), coverage: 'partial' };
  }

  return axes;
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

function computeEnneaArchetypes(aggregateIndices, config) {
  const themes = Array.isArray(config.ennea_themes) ? config.ennea_themes : [];
  const getValue = (name) => {
    const entry = aggregateIndices[name];
    if (entry === null || entry === undefined) return null;
    if (typeof entry === 'object' && entry !== null && 'value' in entry) return entry.value;
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

  const perActor = {};
  for (const [unitId, rawMetrics] of Object.entries(raw)) {
    const aggregate = computeAggregateIndices(rawMetrics, config);
    const mbti = computeMbtiAxes(rawMetrics);
    const ennea = computeEnneaArchetypes(aggregate, config);
    perActor[unitId] = {
      raw_metrics: rawMetrics,
      aggregate_indices: aggregate,
      mbti_axes: mbti,
      ennea_archetypes: ennea,
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

module.exports = {
  loadTelemetryConfig,
  computeRawMetrics,
  computeAggregateIndices,
  computeMbtiAxes,
  computeEnneaArchetypes,
  buildVcSnapshot,
  tokenizeCondition,
  evaluateCondition,
  SCORING_VERSION,
  DEFAULT_TELEMETRY_PATH,
};
