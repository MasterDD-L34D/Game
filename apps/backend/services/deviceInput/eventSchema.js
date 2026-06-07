const TIERS = new Set(['public', 'private', 'aggregated', 'secret']);

// Default tier per event class (override allowed via explicit ev.tier).
const DEFAULT_TIER_BY_CLASS = {
  decision: 'public', // group decisions are public by default
  signal: 'secret', // behavioral signals feed engines, hidden from humans
};

const VALID_KINDS = new Set(['decision', 'signal']); // 'raw' never crosses the wire

function validateDeviceEvent(ev) {
  if (!ev || typeof ev !== 'object') return { ok: false, error: 'event must be an object' };
  if (ev.kind === 'raw')
    return { ok: false, error: 'raw events must not cross the wire (edge-first)' };
  if (!VALID_KINDS.has(ev.kind)) return { ok: false, error: `invalid kind: ${ev.kind}` };
  if (typeof ev.type !== 'string' || !ev.type) return { ok: false, error: 'type required' };
  if (typeof ev.playerId !== 'string' || !ev.playerId)
    return { ok: false, error: 'playerId required' };
  const tier = ev.tier == null ? DEFAULT_TIER_BY_CLASS[ev.kind] : ev.tier;
  if (!TIERS.has(tier)) return { ok: false, error: `invalid tier: ${tier}` };
  return { ok: true, event: { ...ev, tier } };
}

module.exports = { TIERS, DEFAULT_TIER_BY_CLASS, validateDeviceEvent };
