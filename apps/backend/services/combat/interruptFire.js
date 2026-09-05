// Sprint α (2026-04-28) — Interrupt fire stack (light).
//
// Pattern source: Jagged Alliance 3 — interrupt queue su perception trigger.
// Strategy research §6 (interrupt light, scope ridotto vs full impl).
//
// Goal: aggiunge layer di reattività — actor con `interrupt_armed` + perk
// modifier può infilarsi nella resolve queue PRIMA di un'azione enemy via
// priority push. Light scope: solo queue + ordering, no full perception
// trigger graph (deferred).
//
// Pure module. In-memory queue passata per session. Caller scrive intents
// nella queue, poi chiama resolveQueue prima di una azione regolare per
// drain ordinato.
//
// API:
//   addToQueue(session, { actor_id, action, priority })
//   resolveQueue(session, executor) — pops in priority desc, exec(intent)
//   peekQueue(session)              — return copy senza mutare
//   clearQueue(session)             — reset
//   computePriority(actor, action)  — initiative + (perk modifier reaction_speed_bonus)
//
// Constants:
//   QUEUE_KEY = '_interrupt_queue'

'use strict';

const QUEUE_KEY = '_interrupt_queue';

/**
 * Compute priority per intent: initiative + perk modifier (reaction_speed_bonus).
 * Caller può sovrascrivere passando `priority` esplicita ad addToQueue.
 *
 * @param {object} actor
 * @param {object} _action — riservato per future signal (not used now)
 * @returns {number}
 */
function computePriority(actor, _action = {}) {
  if (!actor || typeof actor !== 'object') return 0;
  const init = Number(actor.initiative || 0);
  const perkBonus = Number(actor.reaction_speed_bonus || 0);
  return init + perkBonus;
}

function ensureQueue(session) {
  if (!session || typeof session !== 'object') return null;
  if (!Array.isArray(session[QUEUE_KEY])) session[QUEUE_KEY] = [];
  return session[QUEUE_KEY];
}

/**
 * Add an interrupt intent to the session queue.
 *
 * @param {object} session
 * @param {{ actor_id: string, action: object, priority?: number, actor?: object }} intent
 * @returns {{ ok: boolean, queue_size?: number, reason?: string }}
 */
function addToQueue(session, intent) {
  const queue = ensureQueue(session);
  if (!queue) return { ok: false, reason: 'no_session' };
  if (!intent || !intent.actor_id) return { ok: false, reason: 'invalid_intent' };
  let priority = Number(intent.priority);
  if (!Number.isFinite(priority)) {
    priority = computePriority(intent.actor || {}, intent.action || {});
  }
  queue.push({
    actor_id: String(intent.actor_id),
    action: intent.action || {},
    priority,
    enqueued_at: queue.length, // tiebreaker FIFO
  });
  return { ok: true, queue_size: queue.length };
}

/**
 * Pop intents in priority desc + FIFO tiebreaker. Calls executor(intent) per
 * ciascun pop. Continua finché queue vuota o executor returns { stop: true }.
 *
 * @param {object} session
 * @param {(intent: object) => object | undefined} executor
 * @returns {{ resolved: number, results: Array<object> }}
 */
function resolveQueue(session, executor) {
  const queue = ensureQueue(session);
  if (!queue || queue.length === 0) return { resolved: 0, results: [] };
  // Sort copy: priority desc, enqueued_at asc.
  const sorted = queue.slice().sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.enqueued_at - b.enqueued_at;
  });
  const results = [];
  for (const intent of sorted) {
    if (typeof executor !== 'function') {
      results.push({ actor_id: intent.actor_id, skipped: true, reason: 'no_executor' });
      continue;
    }
    const out = executor(intent);
    results.push({ actor_id: intent.actor_id, action: intent.action, result: out });
    if (out && out.stop === true) break;
  }
  // Drain queue (pure consumer semantic).
  session[QUEUE_KEY] = [];
  return { resolved: results.length, results };
}

/**
 * Read-only snapshot della queue. Non muta.
 */
function peekQueue(session) {
  if (!session || !Array.isArray(session[QUEUE_KEY])) return [];
  return session[QUEUE_KEY].slice();
}

/**
 * Reset queue (encounter end / session reset).
 */
function clearQueue(session) {
  if (!session) return;
  session[QUEUE_KEY] = [];
}

module.exports = {
  addToQueue,
  resolveQueue,
  peekQueue,
  clearQueue,
  computePriority,
  QUEUE_KEY,
};
