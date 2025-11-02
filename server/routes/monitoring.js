const express = require('express');
const { getPrometheusRegistry } = require('../services/orchestratorMetrics');

function createMonitoringRouter() {
  const router = express.Router();

  router.get('/metrics', async (req, res) => {
    try {
      const registry = getPrometheusRegistry();
      res.setHeader('Content-Type', registry.contentType);
      res.send(await registry.metrics());
    } catch (error) {
      res.status(503).json({ error: 'Metriche non disponibili', details: error?.message });
    }
  });

  return router;
}

module.exports = { createMonitoringRouter };
