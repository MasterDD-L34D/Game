'use strict';

const express = require('express');
const { validateRuntime, ValidatorServiceError } = require('../services/validator');

function createValidatorsRouter({ runtimeValidator } = {}) {
  const router = express.Router();

  router.post('/runtime', async (req, res) => {
    try {
      const result = await validateRuntime(req.body || {}, { runtimeValidator });
      res.json({ result });
    } catch (error) {
      if (error instanceof ValidatorServiceError || error.statusCode) {
        const status = error.statusCode || 400;
        res.status(status).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: error.message || 'Errore validazione runtime' });
    }
  });

  return router;
}

module.exports = {
  createValidatorsRouter,
};
