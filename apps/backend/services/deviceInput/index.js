const { validateDeviceEvent } = require('./eventSchema');

// Thin facade: validate -> consent-gate -> enrich the existing session event log.
// Engines consume `log` via the existing vcScoring.computeRawMetrics pipeline.
function ingest(sessionEvents, deviceEvent, { profilingConsent = false } = {}) {
  const v = validateDeviceEvent(deviceEvent);
  if (!v.ok) return { accepted: false, reason: `invalid: ${v.error}` };
  if (v.event.kind === 'signal' && !profilingConsent) {
    return { accepted: false, reason: 'profiling-opt-out' };
  }
  sessionEvents.push(v.event);
  return { accepted: true, event: v.event };
}

module.exports = { ingest };
