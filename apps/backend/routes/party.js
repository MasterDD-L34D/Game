// Party routes — expose modulation presets + config for frontend lobby.
// ADR-2026-04-17.

const { Router } = require('express');
const {
  getPartyConfig,
  listModulations,
  getModulation,
  gridSizeFor,
} = require('../../../services/party/loader');

function createPartyRouter() {
  const router = Router();

  // GET /api/party/config — full party config canonica
  router.get('/config', (req, res) => {
    const cfg = getPartyConfig();
    res.json({ version: 1, party: cfg });
  });

  // GET /api/party/modulations — lista preset per UI lobby
  router.get('/modulations', (req, res) => {
    res.json({ modulations: listModulations() });
  });

  // GET /api/party/modulations/:id — preset specifico
  router.get('/modulations/:id', (req, res) => {
    const m = getModulation(req.params.id);
    if (!m) return res.status(404).json({ error: `modulation '${req.params.id}' non trovata` });
    const [gw, gh] = gridSizeFor(m.deployed);
    res.json({ id: req.params.id, ...m, grid_size: [gw, gh] });
  });

  // GET /api/party/grid-size?deployed=N — ricava grid auto-scale
  router.get('/grid-size', (req, res) => {
    const deployed = Number(req.query.deployed) || 4;
    const [w, h] = gridSizeFor(deployed);
    res.json({ deployed, grid_size: [w, h], width: w, height: h });
  });

  return router;
}

module.exports = { createPartyRouter };
