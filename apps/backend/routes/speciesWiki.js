// Species wiki cross-link routes — Sprint 3 §II (2026-04-27).
//
// Surface AncientBeast wiki cross-link slug bridge via REST.
// Source: docs/research/2026-04-26-tier-s-extraction-matrix.md #6 AncientBeast.
//
// Gate 5 exemption (2026-05-05 audit): wiki endpoints are dev-tooling /
// data-exploration surface (no player-facing wiki UI in current scope).
// FE wire deferred post M18. Endpoints remain registered for developer use.
//
// Endpoints:
//   GET /api/species/:id/wiki         → { id, slug, url, has_runtime, has_catalog }
//   GET /api/species/:id/wiki/entry   → full catalog JSON or 404
//   GET /api/species/wiki/audit       → linked species coverage report
//
// Frontend wire opportunity: characterPanel external-link button "Apri scheda Wiki",
// codexPanel "Specie" tab future. Audit endpoint = governance reporting.

'use strict';

const { Router } = require('express');
const wikiBridge = require('../services/species/wikiLinkBridge');

function createSpeciesWikiRouter() {
  const router = Router();

  router.get('/species/wiki/audit', (_req, res) => {
    const list = wikiBridge.listLinkedSpecies();
    const total = list.length;
    const linked = list.filter((e) => e.slug && e.has_catalog && e.has_runtime).length;
    const missing_catalog = list.filter((e) => e.has_runtime && !e.has_catalog);
    const missing_runtime = list.filter((e) => e.has_catalog && !e.has_runtime);
    res.json({
      total,
      linked,
      coverage_pct: total > 0 ? Math.round((linked / total) * 100) : 0,
      missing_catalog: missing_catalog.map((e) => e.id),
      missing_runtime: missing_runtime.map((e) => e.id),
      species: list,
    });
  });

  router.get('/species/:id/wiki', (req, res) => {
    const id = req.params.id;
    const slug = wikiBridge.getWikiSlug(id);
    if (!slug) {
      return res.status(404).json({
        error: `wiki entry not found for species '${id}'`,
        species_id: id,
      });
    }
    res.json({
      id,
      slug,
      url: wikiBridge.getWikiUrl(id),
      url_html: wikiBridge.getWikiUrl(id, { ext: '.html' }),
    });
  });

  router.get('/species/:id/wiki/entry', (req, res) => {
    const id = req.params.id;
    const entry = wikiBridge.getWikiEntry(id);
    if (!entry) {
      return res.status(404).json({
        error: `catalog entry not found for species '${id}'`,
        species_id: id,
      });
    }
    res.json({
      id,
      slug: wikiBridge.getWikiSlug(id),
      entry,
    });
  });

  return router;
}

module.exports = { createSpeciesWikiRouter };
