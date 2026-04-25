// PlayerRunTelemetry store — write-through Prisma + in-memory fallback.
//
// Genesis: CAP-12 (audit Impronta CAP-10 F-4). Personal telemetry cross-run.
//
// Pattern: same di FormSessionState/LobbySession (Prisma authoritative se
// DATABASE_URL set, altrimenti in-memory Map). Graceful no-op se Prisma
// non disponibile (dev/test).
//
// API:
//   create({playerId, unitId, runId, vcSnapshot, ...}) → row
//   listByPlayer(playerId, limit=20) → rows[]
//   listByRun(runId) → rows[]

'use strict';

const memory = new Map(); // id → row
let prismaClient = null;

function tryLoadPrisma() {
  if (prismaClient !== null) return prismaClient;
  try {
    if (!process.env.DATABASE_URL) {
      prismaClient = false;
      return false;
    }
    const { PrismaClient } = require('@prisma/client');
    prismaClient = new PrismaClient();
    return prismaClient;
  } catch {
    prismaClient = false;
    return false;
  }
}

function genId() {
  // crypto.randomUUID disponibile da Node 16+
  return require('crypto').randomUUID();
}

function normalizeInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('invalid input');
  }
  const playerId = String(input.playerId || input.player_id || '').trim();
  if (!playerId) throw new Error('playerId required');
  const unitId = String(input.unitId || input.unit_id || '').trim();
  if (!unitId) throw new Error('unitId required');
  const runId = String(input.runId || input.run_id || '').trim();
  if (!runId) throw new Error('runId required');
  const campaignId = input.campaignId || input.campaign_id || null;
  const vcSnapshot = input.vcSnapshot || input.vc_snapshot;
  if (vcSnapshot === undefined || vcSnapshot === null) {
    throw new Error('vcSnapshot required');
  }
  const vcSnapshotJson = typeof vcSnapshot === 'string' ? vcSnapshot : JSON.stringify(vcSnapshot);
  const selectedForm = input.selectedForm || input.selected_form || null;
  const outcome = input.outcome || null;
  if (outcome && !['victory', 'defeat', 'abandon'].includes(outcome)) {
    throw new Error(`invalid outcome: ${outcome}`);
  }
  return { playerId, unitId, runId, campaignId, vcSnapshotJson, selectedForm, outcome };
}

async function create(input) {
  const data = normalizeInput(input);
  const prisma = tryLoadPrisma();

  if (prisma) {
    const row = await prisma.playerRunTelemetry.create({
      data: {
        playerId: data.playerId,
        unitId: data.unitId,
        runId: data.runId,
        campaignId: data.campaignId,
        vcSnapshot: data.vcSnapshotJson,
        selectedForm: data.selectedForm,
        outcome: data.outcome,
      },
    });
    return formatRow(row);
  }

  // In-memory fallback
  const id = genId();
  const row = {
    id,
    playerId: data.playerId,
    unitId: data.unitId,
    campaignId: data.campaignId,
    runId: data.runId,
    vcSnapshot: data.vcSnapshotJson,
    selectedForm: data.selectedForm,
    outcome: data.outcome,
    createdAt: new Date().toISOString(),
  };
  memory.set(id, row);
  return formatRow(row);
}

async function listByPlayer(playerId, limit = 20) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const prisma = tryLoadPrisma();

  if (prisma) {
    const rows = await prisma.playerRunTelemetry.findMany({
      where: { playerId: String(playerId) },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });
    return rows.map(formatRow);
  }

  const rows = Array.from(memory.values())
    .filter((r) => r.playerId === String(playerId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, safeLimit);
  return rows.map(formatRow);
}

async function listByRun(runId) {
  const prisma = tryLoadPrisma();

  if (prisma) {
    const rows = await prisma.playerRunTelemetry.findMany({
      where: { runId: String(runId) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(formatRow);
  }

  const rows = Array.from(memory.values())
    .filter((r) => r.runId === String(runId))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  return rows.map(formatRow);
}

function formatRow(row) {
  if (!row) return null;
  let parsedSnapshot = null;
  try {
    parsedSnapshot =
      typeof row.vcSnapshot === 'string' ? JSON.parse(row.vcSnapshot) : row.vcSnapshot;
  } catch {
    parsedSnapshot = null;
  }
  return {
    id: row.id,
    player_id: row.playerId,
    unit_id: row.unitId,
    campaign_id: row.campaignId,
    run_id: row.runId,
    vc_snapshot: parsedSnapshot,
    selected_form: row.selectedForm,
    outcome: row.outcome,
    created_at:
      typeof row.createdAt === 'string'
        ? row.createdAt
        : (row.createdAt && row.createdAt.toISOString && row.createdAt.toISOString()) || null,
  };
}

function _resetForTests() {
  memory.clear();
  prismaClient = null;
}

module.exports = {
  create,
  listByPlayer,
  listByRun,
  _resetForTests,
};
