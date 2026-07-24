// 2026-05-20 — propagateOffspringRitual negative-path coverage (gap closure).
//
// Pattern di riferimento: PR #2335 coopOrchestrator phase-skip negative tests
// (tests/api/coopOrchestrator.test.js §"Phase-skip negative tests").
//
// Engine: apps/backend/services/lineage/offspringRitual.js shipped 2026-05-10
// sera (Sprint Q+ Q-3 / ADR-2026-05-05 Phase B Path γ). 8 throw path interni
// + 1 throw path bridge → 9 percorsi totali. Pre-questo file: solo route
// tests indiretti (tests/api/offspringRitualRoutes.test.js) coprivano 4/8
// throw a livello HTTP 400. Unit-level direct assertion mancante.
//
// Test additive only — production code intoccato.

'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  propagateOffspringRitual,
  bridgeOffspringRitualOnChoice,
} = require('../../apps/backend/services/lineage/offspringRitual');
const offspringStore = require('../../apps/backend/services/lineage/offspringStore');

beforeEach(() => {
  offspringStore._resetMemory();
});

// --- sessionId guard --------------------------------------------------------

test('propagateOffspringRitual rejects when sessionId missing', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        parentA: { id: 'a' },
        parentB: { id: 'b' },
        mutations: ['armatura_residua'],
      }),
    /sessionId.*required/,
  );
});

test('propagateOffspringRitual rejects when sessionId is empty string', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: '',
        parentA: { id: 'a' },
        parentB: { id: 'b' },
        mutations: ['armatura_residua'],
      }),
    /sessionId.*required/,
  );
});

test('propagateOffspringRitual rejects when sessionId is non-string (number)', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 42,
        parentA: { id: 'a' },
        parentB: { id: 'b' },
        mutations: ['armatura_residua'],
      }),
    /sessionId.*required/,
  );
});

// --- parentA guard ----------------------------------------------------------

test('propagateOffspringRitual rejects when parentA omitted', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 'sess-1',
        parentB: { id: 'b' },
        mutations: ['armatura_residua'],
      }),
    /parentA\.id required/,
  );
});

test('propagateOffspringRitual rejects when parentA.id missing', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 'sess-1',
        parentA: { lineage_id: 'L1' },
        parentB: { id: 'b' },
        mutations: ['armatura_residua'],
      }),
    /parentA\.id required/,
  );
});

// --- parentB guard ----------------------------------------------------------

test('propagateOffspringRitual rejects when parentB omitted', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 'sess-1',
        parentA: { id: 'a' },
        mutations: ['armatura_residua'],
      }),
    /parentB\.id required/,
  );
});

test('propagateOffspringRitual rejects when parentB.id missing', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 'sess-1',
        parentA: { id: 'a' },
        parentB: { biome_origin: 'savana' },
        mutations: ['armatura_residua'],
      }),
    /parentB\.id required/,
  );
});

// --- parent identity guard --------------------------------------------------

test('propagateOffspringRitual rejects when parent_a_id === parent_b_id (self-mating)', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 'sess-1',
        parentA: { id: 'unit-x' },
        parentB: { id: 'unit-x' },
        mutations: ['armatura_residua'],
      }),
    /parent_a_id !== parent_b_id/,
  );
});

// --- mutations array shape --------------------------------------------------

test('propagateOffspringRitual rejects when mutations is not an array (string)', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 'sess-1',
        parentA: { id: 'a' },
        parentB: { id: 'b' },
        mutations: 'armatura_residua',
      }),
    /mutations must be array/,
  );
});

test('propagateOffspringRitual rejects when mutations is omitted', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 'sess-1',
        parentA: { id: 'a' },
        parentB: { id: 'b' },
      }),
    /mutations must be array/,
  );
});

test('propagateOffspringRitual rejects when mutations.length < 1 (empty array)', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 'sess-1',
        parentA: { id: 'a' },
        parentB: { id: 'b' },
        mutations: [],
      }),
    /mutations\.length must be 1-3/,
  );
});

test('propagateOffspringRitual rejects when mutations.length > 3 (4 mutations)', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 'sess-1',
        parentA: { id: 'a' },
        parentB: { id: 'b' },
        mutations: ['armatura_residua', 'tendine_rapide', 'cuore_doppio', 'vista_predatore'],
      }),
    /mutations\.length must be 1-3/,
  );
});

// --- mutation canonical guard ----------------------------------------------

test('propagateOffspringRitual rejects when mutation id not in canonical_list', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 'sess-1',
        parentA: { id: 'a' },
        parentB: { id: 'b' },
        mutations: ['fake_mutation_id'],
      }),
    /not in canonical_list/,
  );
});

test('propagateOffspringRitual rejects when at least one mutation is non-canonical (mixed valid + invalid)', async () => {
  await assert.rejects(
    () =>
      propagateOffspringRitual({
        sessionId: 'sess-1',
        parentA: { id: 'a' },
        parentB: { id: 'b' },
        mutations: ['armatura_residua', 'definitely_not_canonical'],
      }),
    /definitely_not_canonical.*not in canonical_list/,
  );
});

// --- bridgeOffspringRitualOnChoice guard -----------------------------------

test('bridgeOffspringRitualOnChoice rejects when choice fires lineage_merge but ctx is incomplete (missing parentB)', async () => {
  await assert.rejects(
    () =>
      bridgeOffspringRitualOnChoice(
        { completed: true, lineage_merge: true },
        { sessionId: 'sess-1', parentA: { id: 'a' }, mutations: ['armatura_residua'] },
      ),
    /ctx.*required/,
  );
});

test('bridgeOffspringRitualOnChoice rejects when ctx is fully empty on lineage_merge choice', async () => {
  await assert.rejects(
    () => bridgeOffspringRitualOnChoice({ completed: true, lineage_merge: true }, {}),
    /ctx.*required/,
  );
});

test('bridgeOffspringRitualOnChoice rejects when ctx.mutations is non-array on lineage_merge choice', async () => {
  await assert.rejects(
    () =>
      bridgeOffspringRitualOnChoice(
        { completed: true, lineage_merge: true },
        {
          sessionId: 'sess-1',
          parentA: { id: 'a' },
          parentB: { id: 'b' },
          mutations: 'armatura_residua',
        },
      ),
    /ctx.*required/,
  );
});
