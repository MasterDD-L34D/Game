// apps/backend/services/combat/movementProfiles.js
'use strict';

// W6 movement-profile loader (pattern: biomeModifiers.js). Pure: load once, cache,
// soft-fail to a SAFE default if the yaml is missing/malformed. Consumed by
// movementResolver -> moveCost. Substrate flag-gated at the wire (MOVE_TERRAIN_COST_ENABLED).

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const DEFAULT_YAML = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'packs',
  'evo_tactics_pack',
  'data',
  'balance',
  'movement_profiles.yaml',
);

const SAFE_DEFAULT_NAME = 'medium';
const SAFE_PROFILES = Object.freeze({
  heavy: { terrain_cost_multiplier: { default: 1.0 } },
  medium: { terrain_cost_multiplier: { default: 1.0 } },
  light: { terrain_cost_multiplier: { default: 1.0 } },
});

let _cache = null;

function load(yamlPath = DEFAULT_YAML, logger = console) {
  if (_cache !== null) return _cache;
  try {
    const text = fs.readFileSync(yamlPath, { encoding: 'utf8' });
    const parsed = yaml.load(text) || {};
    const profiles = parsed.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {};
    _cache = {
      profiles: Object.keys(profiles).length ? profiles : SAFE_PROFILES,
      default_profile:
        typeof parsed.default_profile === 'string' ? parsed.default_profile : SAFE_DEFAULT_NAME,
    };
  } catch (err) {
    if (logger && logger.warn) logger.warn(`[movementProfiles] load failed: ${err.message}`);
    _cache = { profiles: SAFE_PROFILES, default_profile: SAFE_DEFAULT_NAME };
  }
  return _cache;
}

function _ensureMult(profile) {
  const m = (profile && profile.terrain_cost_multiplier) || {};
  return { terrain_cost_multiplier: { default: 1.0, ...m } };
}

function getProfile(name) {
  const { profiles, default_profile } = load();
  const chosen = profiles[name] || profiles[default_profile] || SAFE_PROFILES.medium;
  return _ensureMult(chosen);
}

function _resetCache() {
  _cache = null;
}

const DEFAULT_PROFILE = load().default_profile;
const PROFILE_NAMES = Object.keys(load().profiles);

module.exports = { getProfile, load, DEFAULT_PROFILE, PROFILE_NAMES, _resetCache, DEFAULT_YAML };
