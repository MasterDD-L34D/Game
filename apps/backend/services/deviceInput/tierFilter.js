const TV_VISIBLE_TIERS = new Set(['public', 'aggregated']);

// Fail-closed: anything not explicitly TV-visible is stripped.
function filterForTvMirror(events) {
  if (!Array.isArray(events)) return [];
  return events.filter((e) => e && TV_VISIBLE_TIERS.has(e.tier));
}

module.exports = { TV_VISIBLE_TIERS, filterForTvMirror };
