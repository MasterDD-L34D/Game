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

const DEFAULT_ATTACK_RANGE = 2;
// HP fallback per unit senza max_hp esplicito. Allineato al DEFAULT_HP
// di session.js. Se cambi uno, ricordati di cambiare anche l'altro.
const DEFAULT_MAX_HP_FALLBACK = 10;
// Soglia di retreat REGOLA_002 (HP ratio).
const LOW_HP_RETREAT_THRESHOLD = 0.3;
// SPRINT_012 (issue #2): target range "da evitare" per REGOLA_003 kite.
// La regola e' che il SIS con range > target's range dovrebbe mantenersi
// a >= target.attack_range + KITE_BUFFER dal nemico.
const KITE_BUFFER = 1;

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
    const range = actor.attack_range ?? DEFAULT_ATTACK_RANGE;
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

function selectAiPolicy(actor, target) {
  // SPRINT_013: stati emotivi hanno priorita' assoluta, bypassano HP
  // check e range check.
  const emotional = checkEmotionalOverrides(actor, target);
  if (emotional) return emotional;

  const maxHp =
    Number.isFinite(actor.max_hp) && actor.max_hp > 0 ? actor.max_hp : DEFAULT_MAX_HP_FALLBACK;
  const hpRatio = actor.hp / maxHp;

  // REGOLA_002: autoconservazione prima di tutto
  if (hpRatio <= LOW_HP_RETREAT_THRESHOLD) {
    return { rule: 'REGOLA_002', intent: 'retreat' };
  }

  const distance = manhattanDistance(actor.position, target.position);
  const actorRange = actor.attack_range ?? DEFAULT_ATTACK_RANGE;
  const targetRange = target.attack_range ?? DEFAULT_ATTACK_RANGE;

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
    const safeMinDist = targetRange + KITE_BUFFER;
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

module.exports = {
  DEFAULT_ATTACK_RANGE,
  DEFAULT_MAX_HP_FALLBACK,
  LOW_HP_RETREAT_THRESHOLD,
  manhattanDistance,
  stepAway,
  selectAiPolicy,
  checkEmotionalOverrides,
};
