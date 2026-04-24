// M10 Phase B — campaign state store.
//
// Adapter pattern: in-memory Map storage per MVP demo (NeDB-compatible
// architettura). Phase B-future swap to Prisma Campaign model quando
// DATABASE_URL configurato.
//
// API:
//   - createCampaign(playerId, campaignDefId): new session
//   - getCampaign(id): fetch by UUID
//   - listCampaignsForPlayer(playerId): all of one player
//   - updateCampaign(id, patch): apply state mutation
//   - recordChapter(id, chapter): append Chapter record
//   - deleteCampaign(id): remove (rollback/reset)
//
// State shape coerente con Prisma Campaign model (ADR-2026-04-21):
//   {
//     id, playerId, campaignDefId,
//     currentChapter, currentAct,
//     branchChoices: [],          // array of binary choice keys
//     completionPct,
//     finalState,                 // 'completed' | 'abandoned' | null
//     chapters: [{chapterIdx, actIdx, encounterId, outcome, peEarned, piEarned, branchChosen}]
//     partyRoster: [],            // deferred M10 Phase D (Nido integration)
//     createdAt, updatedAt
//   }

'use strict';

const crypto = require('node:crypto');

const _campaigns = new Map(); // id → campaign
const _playerIndex = new Map(); // playerId → Set<campaignId>

function _uuid() {
  return crypto.randomUUID();
}

function _now() {
  return new Date().toISOString();
}

/**
 * Create new campaign session.
 *
 * @param {string} playerId
 * @param {string} [campaignDefId='default_campaign_mvp']
 * @returns {object} new campaign
 */
function createCampaign(playerId, campaignDefId = 'default_campaign_mvp', opts = {}) {
  if (!playerId || typeof playerId !== 'string') {
    throw new Error('createCampaign: playerId richiesto (string)');
  }
  const id = _uuid();
  const now = _now();
  const campaign = {
    id,
    playerId,
    campaignDefId,
    currentChapter: 1,
    currentAct: 0, // Act 0 = tutorial onboarding
    branchChoices: [],
    completionPct: 0.0,
    finalState: null,
    chapters: [],
    partyRoster: [],
    // V1 Onboarding Phase B — trait permanent pre-Act 0 shared roster
    onboardingChoice: opts.onboardingChoice || null, // { option_key, trait_id }
    acquiredTraits: Array.isArray(opts.acquiredTraits) ? [...opts.acquiredTraits] : [],
    createdAt: now,
    updatedAt: now,
  };
  _campaigns.set(id, campaign);
  if (!_playerIndex.has(playerId)) _playerIndex.set(playerId, new Set());
  _playerIndex.get(playerId).add(id);
  return campaign;
}

function getCampaign(id) {
  return _campaigns.get(id) || null;
}

function listCampaignsForPlayer(playerId) {
  const ids = _playerIndex.get(playerId);
  if (!ids) return [];
  return [...ids].map((id) => _campaigns.get(id)).filter(Boolean);
}

/**
 * Apply partial patch to campaign. Immutable-ish: crea nuova entry +
 * updates _updatedAt automatically.
 */
function updateCampaign(id, patch) {
  const cur = _campaigns.get(id);
  if (!cur) return null;
  const next = { ...cur, ...patch, updatedAt: _now() };
  _campaigns.set(id, next);
  return next;
}

/**
 * Append chapter record to campaign.chapters.
 */
function recordChapter(id, chapter) {
  const cur = _campaigns.get(id);
  if (!cur) return null;
  const entry = {
    chapterIdx: chapter.chapterIdx,
    actIdx: chapter.actIdx,
    encounterId: chapter.encounterId,
    outcome: chapter.outcome || null,
    peEarned: Number(chapter.peEarned || 0),
    piEarned: Number(chapter.piEarned || 0),
    branchChosen: chapter.branchChosen || null,
    completedAt: chapter.outcome ? _now() : null,
  };
  const nextChapters = [...cur.chapters, entry];
  return updateCampaign(id, { chapters: nextChapters });
}

function deleteCampaign(id) {
  const cur = _campaigns.get(id);
  if (!cur) return false;
  _campaigns.delete(id);
  const playerIds = _playerIndex.get(cur.playerId);
  if (playerIds) playerIds.delete(id);
  return true;
}

/** Reset store (per test). */
function _resetStore() {
  _campaigns.clear();
  _playerIndex.clear();
}

module.exports = {
  createCampaign,
  getCampaign,
  listCampaignsForPlayer,
  updateCampaign,
  recordChapter,
  deleteCampaign,
  _resetStore,
};
