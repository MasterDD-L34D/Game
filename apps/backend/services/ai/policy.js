// SPRINT_010 (issue #2): modulo IA — policy engine puro.
//
// Questo modulo contiene le funzioni "decisionali" dell'IA SIS senza
// side-effect. Non modifica lo stato della sessione, non emette eventi,
// non tocca file. Espone:
//
//   - DEFAULT_ATTACK_RANGE: const allineato a session.js per unit senza
//     attack_range esplicito.
//   - manhattanDistance(a, b): copia locale per evitare dipendenza
//     circolare con session.js. Pure.
//   - stepAway(from, to, gridSize?): un passo di ritirata sulla griglia
//     Manhattan. Preferisce l'asse con delta maggiore; fallback sull'altro
//     asse se bordo griglia. Ritorna null se la ritirata e' del tutto
//     impossibile (attore angolato).
//   - selectAiPolicy(actor, target): ritorna { rule, intent } basato
//     sullo stato dell'actor e del target.
//     Regole:
//       REGOLA_002 retreat: actor.hp <= 30% del actor.max_hp
//       REGOLA_001 attack:  distance <= actor.attack_range
//       REGOLA_001 approach: distance > actor.attack_range
//     Intent possibili: 'attack' | 'approach' | 'retreat'.
//
// Questo modulo e' pensato per essere estendibile con nuove regole
// (REGOLA_003 kite, stati emotivi panic/rage/confused, ecc.) senza
// toccare l'orchestrazione di runSistemaTurn (vedi sistemaTurnRunner.js).

// --- AI Intent Score Registry (W3 pattern) ---
// Valori di default inline, sovrascrivibili via loadAiConfig() da YAML.
let _cfg = {
  DEFAULT_ATTACK_RANGE: 2,
  DEFAULT_MAX_HP_FALLBACK: 10,
  LOW_HP_RETREAT_THRESHOLD: 0.3,
  KITE_BUFFER: 1,
};

/**
 * Carica configurazione AI da YAML parsed (ai_intent_scores.yaml).
 * Chiamare una volta all'avvio del backend o nei test.
 */
function loadAiConfig(yaml) {
  if (!yaml) return _cfg;
  const c = yaml.combat || {};
  const t = yaml.thresholds || {};
  _cfg = {
    DEFAULT_ATTACK_RANGE: c.default_attack_range ?? _cfg.DEFAULT_ATTACK_RANGE,
    DEFAULT_MAX_HP_FALLBACK: c.default_max_hp_fallback ?? _cfg.DEFAULT_MAX_HP_FALLBACK,
    LOW_HP_RETREAT_THRESHOLD: t.retreat_hp_pct ?? _cfg.LOW_HP_RETREAT_THRESHOLD,
    KITE_BUFFER: c.kite_buffer ?? _cfg.KITE_BUFFER,
  };
  return _cfg;
}

/**
 * Applica un profilo personalita (W5 pattern) sopra la config base.
 * Ritorna una copia di _cfg con gli override del profilo applicati.
 */
function applyProfile(profile) {
  if (!profile || !profile.overrides) return { ..._cfg };
  const o = profile.overrides;
  return {
    ..._cfg,
    DEFAULT_ATTACK_RANGE: o.default_attack_range ?? _cfg.DEFAULT_ATTACK_RANGE,
    LOW_HP_RETREAT_THRESHOLD: o.retreat_hp_pct ?? _cfg.LOW_HP_RETREAT_THRESHOLD,
    KITE_BUFFER: o.kite_buffer ?? _cfg.KITE_BUFFER,
  };
}

// Accessors per backward compatibility
const DEFAULT_ATTACK_RANGE = /* legacy ref */ 2;
const DEFAULT_MAX_HP_FALLBACK = 10;
const LOW_HP_RETREAT_THRESHOLD = 0.3;

function manhattanDistance(a, b) {
  if (!a || !b) return 0;
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

function stepAway(from, to, gridSize = 6) {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const tryAxis = (axis) => {
    if (axis === 'x') {
      if (dx === 0) return null;
      const newX = from.x + Math.sign(dx);
      if (newX < 0 || newX >= gridSize) return null;
      return { x: newX, y: from.y };
    }
    if (dy === 0) return null;
    const newY = from.y + Math.sign(dy);
    if (newY < 0 || newY >= gridSize) return null;
    return { x: from.x, y: newY };
  };
  if (absDx >= absDy) {
    return tryAxis('x') || tryAxis('y');
  }
  return tryAxis('y') || tryAxis('x');
}

// SPRINT_013 (issue #10): stati emotivi temporanei che sovrascrivono
// la selezione policy normale. Ogni stato ha un turns_remaining > 0
// per essere attivo. Letti da actor.status (oggetto opzionale).
//
// Priorita' stati (alto → basso):
//   1. stunned : policy intent 'skip', rule STATO_STUNNED
//   2. rage    : forza 'attack' (o 'approach' se fuori range), rule
//                STATO_RAGE, bonus damage applicato altrove
//   3. panic   : forza 'retreat', rule STATO_PANIC
//
// Gli stati "confused" e "focused" sono dichiarati come flag ma non
// hanno ancora override nella policy — rimandati a sprint futuri
// (richiedono modifica target selection per confused, modifica
// resolveAttack per focused).
function checkEmotionalOverrides(actor, target) {
  const status = actor.status;
  if (!status) return null;
  const hasDuration = (name) => {
    const t = status[name];
    return Number.isFinite(t) && t > 0;
  };
  if (hasDuration('stunned')) {
    return { rule: 'STATO_STUNNED', intent: 'skip' };
  }
  if (hasDuration('rage')) {
    // rage = "carica" — attacca se possibile, altrimenti avvicina
    // ignorando qualunque consideration di HP o safe zone.
    const dist = manhattanDistance(actor.position, target.position);
    const range = actor.attack_range ?? _cfg.DEFAULT_ATTACK_RANGE;
    return {
      rule: 'STATO_RAGE',
      intent: dist <= range ? 'attack' : 'approach',
    };
  }
  if (hasDuration('panic')) {
    return { rule: 'STATO_PANIC', intent: 'retreat' };
  }
  return null;
}

function selectAiPolicy(actor, target, profile, threatCtx) {
  // SPRINT_013: stati emotivi hanno priorita' assoluta, bypassano HP
  // check e range check.
  const emotional = checkEmotionalOverrides(actor, target);
  if (emotional) return emotional;

  // W5: profile override — se fornito, sovrascrive soglie base
  const cfg = profile ? applyProfile(profile) : _cfg;

  // REGOLA_004_THREAT (AI War pattern): escalation reattiva.
  // Priorita' superiore a HP retreat — durante escalation, il Sistema
  // ignora autoconservazione per punire passivita' o fare all-in.
  if (threatCtx) {
    if (threatCtx.escalation_tier === 'passive') {
      // Giocatori non attaccano → forza ingaggio per rompere stallo
      const dist = manhattanDistance(actor.position, target.position);
      const range = actor.attack_range ?? cfg.DEFAULT_ATTACK_RANGE;
      return {
        rule: 'REGOLA_004_THREAT',
        intent: dist <= range ? 'attack' : 'approach',
      };
    }
    if (threatCtx.escalation_tier === 'critical') {
      // SIS in svantaggio grave → all-in disperato, ignora HP retreat
      const dist = manhattanDistance(actor.position, target.position);
      const range = actor.attack_range ?? cfg.DEFAULT_ATTACK_RANGE;
      return {
        rule: 'REGOLA_004_THREAT',
        intent: dist <= range ? 'attack' : 'approach',
      };
    }
  }

  const maxHp =
    Number.isFinite(actor.max_hp) && actor.max_hp > 0 ? actor.max_hp : cfg.DEFAULT_MAX_HP_FALLBACK;
  const hpRatio = actor.hp / maxHp;

  // REGOLA_002: autoconservazione prima di tutto
  if (hpRatio <= cfg.LOW_HP_RETREAT_THRESHOLD) {
    return { rule: 'REGOLA_002', intent: 'retreat' };
  }

  const distance = manhattanDistance(actor.position, target.position);
  const actorRange = actor.attack_range ?? cfg.DEFAULT_ATTACK_RANGE;
  const targetRange = target.attack_range ?? cfg.DEFAULT_ATTACK_RANGE;

  // SPRINT_012 (issue #2): REGOLA_003 kite opportunistico.
  // Se l'actor ha range superiore al target, preferisce colpire da fuori
  // dal range di risposta del nemico:
  //   - target_range + KITE_BUFFER <= distance <= actor_range → attacco "safe"
  //     intent 'attack' con rule REGOLA_003 (non consuma la 001)
  //   - distance < target_range + KITE_BUFFER → l'actor e' dentro il range
  //     del nemico, intent 'retreat' con rule REGOLA_003 (kite away to safe)
  //   - distance > actor_range → intent 'approach' per arrivare in safe zone
  //
  // Condizioni: actor.attack_range deve essere strettamente maggiore di
  // target.attack_range, altrimenti il kite non e' meccanicamente possibile
  // (sarebbe un attacco reciproco) e la policy cade su REGOLA_001.
  if (actorRange > targetRange) {
    const safeMinDist = targetRange + cfg.KITE_BUFFER;
    if (distance >= safeMinDist && distance <= actorRange) {
      return { rule: 'REGOLA_003', intent: 'attack' };
    }
    if (distance < safeMinDist) {
      // dentro range del nemico → scappa per tornare in zona safe
      return { rule: 'REGOLA_003', intent: 'retreat' };
    }
    // distance > actorRange → troppo lontano, avvicinati
    return { rule: 'REGOLA_003', intent: 'approach' };
  }

  // REGOLA_001: default — range <= target range (o uguale), fight simmetrico
  if (distance <= actorRange) {
    return { rule: 'REGOLA_001', intent: 'attack' };
  }
  return { rule: 'REGOLA_001', intent: 'approach' };
}

// ─────────────────────────────────────────────────────────────────
// B3 pattern: weighted objectives scoring (boardgame.io MCTS)
// ─────────────────────────────────────────────────────────────────

/**
 * Default objectives per il Sistema. Ogni objective ha:
 *   checker(actor, target, context) → boolean
 *   weight: numero (piu alto = piu importante)
 *
 * Personalita diverse = weight diversi.
 */
const DEFAULT_OBJECTIVES = {
  deal_damage: {
    checker: (actor, target, ctx) =>
      ctx.distance <= (actor.attack_range ?? _cfg.DEFAULT_ATTACK_RANGE),
    weight: 1.0,
  },
  protect_low_hp: {
    checker: (actor, target, ctx) => ctx.hpRatio <= 0.4,
    weight: 0.6,
  },
  maintain_range: {
    checker: (actor, target, ctx) =>
      (actor.attack_range ?? _cfg.DEFAULT_ATTACK_RANGE) >
      (target.attack_range ?? _cfg.DEFAULT_ATTACK_RANGE),
    weight: 0.4,
  },
  // Phase A status-awareness (Sprint_020): prefer debuffed targets.
  // slowed/disoriented/chilled reduce target effectiveness; marked amplifies next hit.
  // Weight 0.5 = soft preference, does not override HP or range considerations.
  attack_debuffed_target: {
    checker: (_actor, target) => {
      const s = target?.status;
      if (!s) return false;
      return (
        Number(s.slowed) > 0 ||
        Number(s.disoriented) > 0 ||
        Number(s.chilled) > 0 ||
        Number(s.marked) > 0
      );
    },
    weight: 0.5,
  },
};

/**
 * Calcola score pesato per una decisione AI data una serie di objectives.
 * Ritorna { totalScore, matchedObjectives[] }.
 */
function scoreObjectives(actor, target, objectives = DEFAULT_OBJECTIVES) {
  const distance = manhattanDistance(actor.position, target.position);
  const maxHp =
    Number.isFinite(actor.max_hp) && actor.max_hp > 0 ? actor.max_hp : _cfg.DEFAULT_MAX_HP_FALLBACK;
  const hpRatio = actor.hp / maxHp;
  const ctx = { distance, hpRatio };

  let totalScore = 0;
  const matched = [];
  for (const [name, obj] of Object.entries(objectives)) {
    if (obj.checker(actor, target, ctx)) {
      totalScore += obj.weight;
      matched.push(name);
    }
  }
  return { totalScore, matchedObjectives: matched };
}

module.exports = {
  DEFAULT_ATTACK_RANGE,
  DEFAULT_MAX_HP_FALLBACK,
  LOW_HP_RETREAT_THRESHOLD,
  DEFAULT_OBJECTIVES,
  loadAiConfig,
  applyProfile,
  scoreObjectives,
  manhattanDistance,
  stepAway,
  selectAiPolicy,
  checkEmotionalOverrides,
};
