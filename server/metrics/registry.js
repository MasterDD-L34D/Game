const client = require('prom-client');

const registry = new client.Registry();
let defaultMetricsRegistered = false;

function ensureDefaultMetrics() {
  if (!defaultMetricsRegistered) {
    client.collectDefaultMetrics({ register: registry });
    defaultMetricsRegistered = true;
  }
}

function getOrCreateMetric(name, factory) {
  const existing = registry.getSingleMetric(name);
  if (existing) {
    return existing;
  }
  const metric = factory();
  if (!metric) {
    throw new Error(`Factory for metric ${name} returned ${metric}`);
  }
  return metric;
}

function getOrCreateGauge(options) {
  const { name } = options;
  return getOrCreateMetric(name, () => new client.Gauge({ ...options, registers: [registry] }));
}

function getOrCreateCounter(options) {
  const { name } = options;
  return getOrCreateMetric(name, () => new client.Counter({ ...options, registers: [registry] }));
}

function getOrCreateHistogram(options) {
  const { name } = options;
  return getOrCreateMetric(name, () => new client.Histogram({ ...options, registers: [registry] }));
}

module.exports = {
  client,
  registry,
  ensureDefaultMetrics,
  getOrCreateGauge,
  getOrCreateCounter,
  getOrCreateHistogram,
};
