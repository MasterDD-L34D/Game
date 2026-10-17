// M14 Path A — Mutation routes (unit-self post-encounter mutation framework).
//
// Endpoints (additive, no breaking changes):
//   GET  /api/v1/mutations/registry      — list all mutations + indexes
//   GET  /api/v1/mutations/:id           — single mutation detail
//   POST /api/v1/mutations/eligible      — body { unit } → eligible mutations
//   POST /api/v1/mutations/apply         — body { unit, mutation_id, session_id? }
//                                         → applies trait_swap (add/remove) + records to events
//
// IMPORTANT: questa PR NON deduce PE/PI dal store. Display-only del cost,
// charging deferred a M13.P3 progression integration. Marked in route doc per
// chiarezza, evitare double-charge quando si farà il wire definitivo.
//
// Decoupled da V3 mating per design semantics 2026-04-25.
//
// Cross-ref:
// - apps/backend/services/mutations/mutationCatalogLoader.js
// - data/core/mutations/mutation_catalog.yaml (30 entries)
// - card M-007 mating_nido-engine-orphan (mutation_catalog NON wired a V3)

'use strict';

const { Router } = require('express');
const {
  loadMutationCatalog,
  getMutation,
  listEligibleForUnit,
} = require('../services/mutations/mutationCatalogLoader');
// Sprint Spore Moderate (ADR-2026-04-26) — slot gating + bingo + applyPure.
const {
  checkSlotConflict,
  checkMpBudget,
  applyMutationPure,
  computeMutationBingo,
} = require('../services/mutations/mutationEngine');

function createMutationsRouter(opts = {}) {
  const router = Router();
  // Optional event sink (usato dai test per asserire side-effect).
  // Shape: { recordEvent({ session_id, type, payload }) }
  const eventSink = opts.eventSink || null;

  /**
   * GET /registry — list all mutations.
   * Risposta: { mutations: [...], by_category: {...}, by_tier: {...}, count, schema_version }
   */
  router.get('/registry', (_req, res) => {
    const data = loadMutationCatalog();
    const mutations = Object.values(data.byId);
    res.json({
      mutations,
      by_category: data.byCategory,
      by_tier: data.byTier,
      count: mutations.length,
      schema_version: data.schema_version,
      generated_at: data.generated_at,
      ...(data.error ? { warning: data.error } : {}),
    });
  });

  /**
   * GET /:id — single mutation detail.
   * 404 se id non in catalog.
   */
  router.get('/:id', (req, res) => {
    const mut = getMutation(req.params.id);
    if (!mut) return res.status(404).json({ error: 'mutation_not_found', id: req.params.id });
    res.json(mut);
  });

  /**
   * POST /eligible — body { unit }.
   * Filtra mutazioni eligible per unit (prereq.traits + prereq.mutations).
   * PE/PI cost mostrato ma non charged.
   */
  router.post('/eligible', (req, res) => {
    const { unit } = req.body || {};
    if (!unit || typeof unit !== 'object') {
      return res.status(400).json({ error: 'unit (object) required' });
    }
    const eligible = listEligibleForUnit(unit);
    res.json({
      unit_id: unit.id || null,
      eligible,
      count: eligible.length,
      // NOTE: pe_cost / pi_cost shown but NOT deducted (defer to M13.P3 wire).
      cost_charging: 'deferred_m13_p3',
    });
  });

  /**
   * POST /apply — body { unit, mutation_id, session_id? }.
   * Applica trait_swap.add / trait_swap.remove a unit.trait_ids.
   * Marca unit.applied_mutations[] += mutation_id.
   * Optional event sink record.
   *
   * Conservative: lavora su copia di unit (caller decide se persistire).
   */
  router.post('/apply', (req, res) => {
    const { unit, mutation_id: mutationId, session_id: sessionId = null } = req.body || {};
    if (!unit || typeof unit !== 'object') {
      return res.status(400).json({ error: 'unit (object) required' });
    }
    if (!mutationId || typeof mutationId !== 'string') {
      return res.status(400).json({ error: 'mutation_id (string) required' });
    }

    const mut = getMutation(mutationId);
    if (!mut) return res.status(404).json({ error: 'mutation_not_found', id: mutationId });

    // Eligibility re-check (server-side enforcement).
    const eligible = listEligibleForUnit(unit).some((e) => e.id === mutationId);
    if (!eligible) {
      return res.status(409).json({
        error: 'mutation_not_eligible',
        mutation_id: mutationId,
        unit_id: unit.id || null,
        reason: 'prerequisites_not_met_or_already_applied',
      });
    }

    // Sprint Spore Moderate (ADR-2026-04-26) §S1 — slot conflict gating.
    // Blocca apply se body_slot canonical già occupato. Symbiotic exempt.
    const catalog = loadMutationCatalog();
    const slotCheck = checkSlotConflict(unit, mutationId, catalog);
    if (slotCheck.conflict) {
      return res.status(409).json({
        error: 'slot_conflict',
        mutation_id: mutationId,
        unit_id: unit.id || null,
        slot: slotCheck.slot,
        conflicting_mutation_id: slotCheck.conflicting_mutation_id,
        reason: 'body_slot_already_occupied',
      });
    }

    // Sprint Spore Moderate §S3 — MP budget gating (opt-in via flag).
    // Default: enforce. Disabilita con MUTATION_MP_ENFORCE=false per scenari
    // free-grant (es. tutorial / debug). Auto-skip se unit.mp non presente
    // (back-compat: vecchie call senza pool MP non rompono).
    const enforceMp =
      process.env.MUTATION_MP_ENFORCE !== 'false' &&
      Object.prototype.hasOwnProperty.call(unit, 'mp');
    if (enforceMp) {
      const mpCheck = checkMpBudget(unit, mut);
      if (!mpCheck.ok) {
        return res.status(409).json({
          error: 'insufficient_mp',
          mutation_id: mutationId,
          unit_id: unit.id || null,
          required: mpCheck.required,
          available: mpCheck.available,
          reason: 'mp_budget_exhausted',
        });
      }
    }

    // Apply via pure engine (immutable update + emerge derived_ability).
    const result = applyMutationPure(unit, mutationId, catalog, { deductMp: enforceMp });
    const updatedUnit = result.unit;

    // §S6 — recompute bingo state on updated unit (after this apply).
    const bingoState = computeMutationBingo(updatedUnit, catalog);

    const event = {
      session_id: sessionId,
      type: 'mutation_applied',
      payload: {
        unit_id: unit.id || null,
        ...result.applied_event,
        pe_cost: mut.pe_cost ?? null,
        pi_cost: mut.pi_cost ?? null,
      },
    };
    if (eventSink && typeof eventSink.recordEvent === 'function') {
      try {
        eventSink.recordEvent(event);
      } catch (err) {
        // Non-blocking: non far fallire l'apply per un sink crash.
        console.warn('[mutations.apply] eventSink.recordEvent failed:', err.message);
      }
    }

    res.json({
      success: true,
      applied: mutationId,
      unit: updatedUnit,
      new_traits: updatedUnit.trait_ids,
      derived_ability_id: result.derived_ability_id,
      mp_spent: result.mp_spent,
      bingo: bingoState,
      pe_cost: mut.pe_cost ?? null,
      pi_cost: mut.pi_cost ?? null,
      mp_cost: mut.mp_cost ?? null,
      body_slot: mut.body_slot ?? null,
      cost_charging: 'deferred_m13_p3',
      event,
    });
  });

  /**
   * GET /bingo/:unitId — read-only bingo state preview (used by UI panels).
   * Body alt: POST /bingo with { unit } per evitare GET con state inline.
   */
  router.post('/bingo', (req, res) => {
    const { unit } = req.body || {};
    if (!unit || typeof unit !== 'object') {
      return res.status(400).json({ error: 'unit (object) required' });
    }
    const catalog = loadMutationCatalog();
    const bingo = computeMutationBingo(unit, catalog);
    res.json({
      unit_id: unit.id || null,
      ...bingo,
    });
  });

  return router;
}

module.exports = { createMutationsRouter };
