// Jobs discovery route — expone catalog da data/core/jobs.yaml.
//
// FRICTION #4 (playtest 2026-04-17): Master non aveva visibilità runtime
// su job abilities. Questo endpoint risolve discoverability.
//
// GET /api/jobs          → lista compatta: id, label, role, signature, ability_ids
// GET /api/jobs/:job_id  → job completo con abilities dettagliate
//
// Executor ability = PR separato (action_type='ability' in session route).

'use strict';

const { Router } = require('express');
const { loadJobs, extractAbilities } = require('../services/jobsLoader');

function createJobsRouter() {
  const router = Router();
  const catalog = loadJobs();

  router.get('/', (_req, res) => {
    if (!catalog || !catalog.jobs) {
      return res.status(503).json({ error: 'jobs catalog not loaded' });
    }
    // Filter pseudo jobs (trait_native: indice ability_ids esposto solo a abilityExecutor).
    const summary = Object.entries(catalog.jobs)
      .filter(([, job]) => job.status !== 'pseudo')
      .map(([id, job]) => ({
        id,
        label: job.label || job.label_it || id,
        label_en: job.label_en,
        role: job.role,
        signature_mechanic: job.signature_mechanic,
        initiative: job.initiative,
        attack_range: job.attack_range,
        resource_usage: job.resource_usage,
        status: job.status,
        ability_ids: extractAbilities(job).map((a) => a.ability_id),
        href: `/api/jobs/${id}`,
      }));
    res.json({ version: catalog.version || null, count: summary.length, jobs: summary });
  });

  router.get('/:job_id', (req, res) => {
    if (!catalog || !catalog.jobs) {
      return res.status(503).json({ error: 'jobs catalog not loaded' });
    }
    const job = catalog.jobs[req.params.job_id];
    if (!job) {
      return res.status(404).json({ error: `job not found: ${req.params.job_id}` });
    }
    res.json({
      id: req.params.job_id,
      ...job,
      abilities: extractAbilities(job),
    });
  });

  return router;
}

module.exports = { createJobsRouter };
