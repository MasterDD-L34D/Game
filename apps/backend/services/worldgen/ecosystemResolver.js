// Ecosystem trophic resolver — TKT-WORLDGEN-GAPA (2026-05-29).
//
// Read-only loader: maps a biome_id to the set of species in that biome's
// trophic web, parsed from packs/evo_tactics_pack/data/ecosystems/*.ecosystem.yaml.
// Consumed by foodwebFilter (spawn-pool whitelist). No writes, no generation.
//
// YAML shape (per file):
//   ecosistema:
//     id: BADLANDS
//     biome_id: badlands
//     trofico:
//       produttori: [..]
//       consumatori: { primari: [..], secondari: [..], terziari: [..] }
//       decompositori: [..]
//
// `species_all` = flat union of every species across all trophic tiers. A
// species present anywhere in a biome's foodweb is "of" that biome for the
// whitelist. Producers (plants) are harmless to include -- they never appear in
// reinforcement pools.
//
// SPEC-I ER7: `roles` = species -> trophic role from the trofico tier
//   (produttori->producer, consumatori.primari->prey, secondari->mesopredator,
//   terziari->apex, decompositori->decomposer). Consumed by foodwebFilter's
//   population-aware pool shaping (depleted role excluded, abundant weighted up).
//
// API:
//   getEcosystem(biomeId)    -> { biome_id, id, species_all: [string] } | null
//   getSpeciesRoles(biomeId) -> { [species]: role } (empty {} if unknown biome)
//   _resetCache()            -- test seam (re-read from disk on next call)

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ECOSYSTEMS_DIR = path.resolve(
  __dirname,
  '../../../../packs/evo_tactics_pack/data/ecosystems',
);

let _cache = null;

function _pushAll(target, arr) {
  if (!Array.isArray(arr)) return;
  for (const s of arr) {
    if (s) target.push(String(s).trim());
  }
}

function _collectSpecies(trofico) {
  if (!trofico || typeof trofico !== 'object') return [];
  const out = [];
  _pushAll(out, trofico.produttori);
  const consumatori = trofico.consumatori;
  if (consumatori && typeof consumatori === 'object') {
    _pushAll(out, consumatori.primari);
    _pushAll(out, consumatori.secondari);
    _pushAll(out, consumatori.terziari);
  }
  _pushAll(out, trofico.decompositori);
  return out;
}

// SPEC-I ER7: assign each species the trophic role of its tier. Last-write-wins
// on the rare cross-tier duplicate (harmless -- only consumer tiers feed pools).
function _assignRoles(target, arr, role) {
  if (!Array.isArray(arr)) return;
  for (const s of arr) {
    if (s) target[String(s).trim()] = role;
  }
}

function _collectRoles(trofico) {
  if (!trofico || typeof trofico !== 'object') return {};
  const roles = {};
  _assignRoles(roles, trofico.produttori, 'producer');
  const consumatori = trofico.consumatori;
  if (consumatori && typeof consumatori === 'object') {
    _assignRoles(roles, consumatori.primari, 'prey');
    _assignRoles(roles, consumatori.secondari, 'mesopredator');
    _assignRoles(roles, consumatori.terziari, 'apex');
  }
  _assignRoles(roles, trofico.decompositori, 'decomposer');
  return roles;
}

function _load() {
  if (_cache) return _cache;
  const map = new Map();
  let files = [];
  try {
    files = fs.readdirSync(ECOSYSTEMS_DIR).filter((f) => f.endsWith('.ecosystem.yaml'));
  } catch (err) {
    console.warn('[ecosystemResolver] dir read failed:', ECOSYSTEMS_DIR, err.message);
  }
  for (const f of files) {
    try {
      const raw = fs.readFileSync(path.join(ECOSYSTEMS_DIR, f), 'utf-8');
      const parsed = yaml.load(raw);
      const eco = parsed && parsed.ecosistema;
      if (!eco || !eco.biome_id) continue;
      map.set(String(eco.biome_id).trim().toLowerCase(), {
        biome_id: eco.biome_id,
        id: eco.id || null,
        species_all: _collectSpecies(eco.trofico),
        roles: _collectRoles(eco.trofico),
      });
    } catch (err) {
      console.warn('[ecosystemResolver] parse failed:', f, err.message);
    }
  }
  _cache = map;
  return map;
}

function getEcosystem(biomeId) {
  if (!biomeId) return null;
  return _load().get(String(biomeId).trim().toLowerCase()) || null;
}

// SPEC-I ER7: species -> trophic role map for a biome (empty {} if unknown).
function getSpeciesRoles(biomeId) {
  const eco = getEcosystem(biomeId);
  return eco && eco.roles ? eco.roles : {};
}

function _resetCache() {
  _cache = null;
}

module.exports = { getEcosystem, getSpeciesRoles, _resetCache, ECOSYSTEMS_DIR };
