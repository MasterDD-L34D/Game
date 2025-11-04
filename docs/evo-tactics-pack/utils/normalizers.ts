import { randomId } from './ids.ts';

/**
 * @typedef {import('./types.ts').FilterSet} FilterSet
 * @typedef {import('./types.ts').GenerationConstraints} GenerationConstraints
 * @typedef {import('./types.ts').HazardLevel} HazardLevel
 * @typedef {import('./types.ts').TagEntry} TagEntry
 * @typedef {import('./types.ts').TagLike} TagLike
 * @typedef {import('./types.ts').RandomIdGenerator} RandomIdGenerator
 */

const ROLE_FLAGS_DEFAULT = Object.freeze(['apex', 'keystone', 'bridge', 'threat', 'event']);

const CLIMATE_HINTS = Object.freeze([
  Object.freeze({ pattern: /frost|criogen|ghiacci|ice/i, value: 'frozen' }),
  Object.freeze({ pattern: /desert|sabbia|arid|dust/i, value: 'arid' }),
  Object.freeze({ pattern: /tempesta|storm|ion|vento/i, value: 'storm' }),
  Object.freeze({ pattern: /fung|micel|caver/i, value: 'subterranean' }),
  Object.freeze({ pattern: /abiss|idro|mare|ocean/i, value: 'aquatic' }),
]);

/**
 * @param {unknown} values
 * @param {RegExp} pattern
 * @returns {boolean}
 */
function filtersInclude(values, pattern) {
  if (!Array.isArray(values) || values.length === 0) return false;
  return values.some((value) => pattern.test(String(value)));
}

/**
 * @param {FilterSet | null | undefined} filters
 * @param {readonly string[]} [roleFlags]
 * @returns {string[]}
 */
export function extractRequiredRoles(filters = {}, roleFlags = ROLE_FLAGS_DEFAULT) {
  const safeRoleFlags = Array.isArray(roleFlags) ? roleFlags : ROLE_FLAGS_DEFAULT;
  const roles = new Set();
  const safeFilters = filters && typeof filters === 'object' ? filters : {};
  const flags = Array.isArray(safeFilters.flags) ? safeFilters.flags : [];
  const roleTokens = Array.isArray(safeFilters.roles) ? safeFilters.roles : [];

  flags.forEach((flag) => {
    const value = String(flag);
    if (safeRoleFlags.includes(value)) {
      roles.add(value);
    }
  });

  roleTokens.forEach((token) => {
    const value = String(token).toLowerCase();
    if (/apic|predator|apex/i.test(value)) roles.add('apex');
    if (/chiav|custod|warden|keystone/i.test(value)) roles.add('keystone');
    if (/ponte|bridge|logist|corridor/i.test(value)) roles.add('bridge');
    if (/minacc|threat|assalt|predator/i.test(value)) roles.add('threat');
    if (/evento|anomalia|event/i.test(value)) roles.add('event');
  });

  return Array.from(roles);
}

/**
 * @param {FilterSet | null | undefined} filters
 * @returns {string[]}
 */
export function collectPreferredTags(filters = {}) {
  const safeFilters = filters && typeof filters === 'object' ? filters : {};
  const tags = new Set();
  const tagTokens = Array.isArray(safeFilters.tags) ? safeFilters.tags : [];
  const roleTokens = Array.isArray(safeFilters.roles) ? safeFilters.roles : [];

  tagTokens.forEach((tag) => {
    if (tag) {
      tags.add(String(tag));
    }
  });

  roleTokens.forEach((token) => {
    const value = String(token).toLowerCase();
    if (/criogen|frost|ghiacci/i.test(value)) tags.add('criogenico');
    if (/desert|sabbia|arid/i.test(value)) tags.add('desertico');
    if (/idro|abiss|marino|ocean/i.test(value)) tags.add('abissale');
    if (/fung|micel/i.test(value)) tags.add('micelico');
  });

  return Array.from(tags);
}

/**
 * @param {FilterSet | null | undefined} filters
 * @returns {HazardLevel}
 */
export function inferHazardFromFilters(filters = {}) {
  const safeFilters = filters && typeof filters === 'object' ? filters : {};
  const flags = Array.isArray(safeFilters.flags) ? safeFilters.flags : [];
  if (flags.some((flag) => String(flag) === 'threat' || String(flag) === 'apex')) {
    return 'high';
  }
  if (filtersInclude(safeFilters.tags, /tempest|storm|pericolo|hazard|ferro/i)) {
    return 'high';
  }
  if (filtersInclude(safeFilters.tags, /rifug|tranquill|shelter|safe/i)) {
    return 'low';
  }
  return 'medium';
}

/**
 * @param {FilterSet | null | undefined} filters
 * @returns {string | null}
 */
export function inferClimateFromFilters(filters = {}) {
  const safeFilters = filters && typeof filters === 'object' ? filters : {};
  const tags = Array.isArray(safeFilters.tags) ? safeFilters.tags : [];
  for (const hint of CLIMATE_HINTS) {
    if (filtersInclude(tags, hint.pattern)) {
      return hint.value;
    }
  }
  if (filtersInclude(safeFilters.roles, /criogen|ghiacci|frost/i)) return 'frozen';
  if (filtersInclude(safeFilters.roles, /fung|micel/i)) return 'subterranean';
  if (filtersInclude(safeFilters.roles, /idro|abiss|mare|ocean/i)) return 'aquatic';
  return null;
}

/**
 * @param {FilterSet | null | undefined} filters
 * @param {readonly string[]} [roleFlags]
 * @returns {number}
 */
export function inferMinSize(filters = {}, roleFlags = ROLE_FLAGS_DEFAULT) {
  const safeRoleFlags = Array.isArray(roleFlags) ? roleFlags : ROLE_FLAGS_DEFAULT;
  const roles = extractRequiredRoles(filters, safeRoleFlags);
  const safeFilters = filters && typeof filters === 'object' ? filters : {};
  const tagCount = Array.isArray(safeFilters.tags) ? safeFilters.tags.length : 0;
  const base = roles.length >= 3 ? 4 : 3;
  const bonus = tagCount >= 4 ? 2 : tagCount >= 2 ? 1 : 0;
  return Math.min(6, base + bonus);
}

/**
 * @typedef {Object} BuildGenerationConstraintsOptions
 * @property {readonly string[]} [roleFlags]
 */

/**
 * @param {FilterSet | null | undefined} filters
 * @param {BuildGenerationConstraintsOptions} [options]
 * @returns {GenerationConstraints}
 */
export function buildGenerationConstraints(filters = {}, options = {}) {
  const roleFlags = Array.isArray(options.roleFlags) ? options.roleFlags : ROLE_FLAGS_DEFAULT;
  const requiredRoles = extractRequiredRoles(filters, roleFlags);
  const preferredTags = collectPreferredTags(filters);
  const hazard = inferHazardFromFilters(filters);
  const climate = inferClimateFromFilters(filters);
  const minSize = inferMinSize(filters, roleFlags);
  /** @type {GenerationConstraints} */
  const constraints = {
    requiredRoles,
    preferredTags,
    hazard,
    climate,
    minSize,
  };
  if (!constraints.requiredRoles || constraints.requiredRoles.length === 0)
    delete constraints.requiredRoles;
  if (!constraints.preferredTags || constraints.preferredTags.length === 0)
    delete constraints.preferredTags;
  if (!constraints.hazard) delete constraints.hazard;
  if (!constraints.climate) delete constraints.climate;
  if (!Number.isFinite(constraints.minSize)) delete constraints.minSize;
  return constraints;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normaliseTagId(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * @param {TagLike} tag
 * @param {RandomIdGenerator} [generator]
 * @returns {TagEntry | null}
 */
export function createTagEntry(tag, generator = randomId) {
  if (tag && typeof tag === 'object') {
    const tagObject = /** @type {Record<string, unknown>} */ tag;
    const labelCandidate =
      (typeof tagObject.label === 'string' ? tagObject.label : null) ??
      (typeof tagObject.name === 'string' ? tagObject.name : null) ??
      (typeof tagObject.title === 'string' ? tagObject.title : null) ??
      (typeof tagObject.text === 'string' ? tagObject.text : null) ??
      (typeof tagObject.value === 'string' ? tagObject.value : null) ??
      (typeof tagObject.id === 'string' ? tagObject.id : null) ??
      '';
    const label = String(labelCandidate || '').trim();
    if (!label) {
      return null;
    }
    const idCandidate =
      (typeof tagObject.id === 'string' ? tagObject.id : null) ??
      (typeof tagObject.value === 'string' ? tagObject.value : null) ??
      normaliseTagId(label);
    const id = normaliseTagId(idCandidate || label) || normaliseTagId(label) || generator('tag');
    return { id: id || generator('tag'), label };
  }
  const label = typeof tag === 'string' ? tag : String(tag ?? '');
  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }
  const id = normaliseTagId(trimmed) || generator('tag');
  return { id, label: trimmed };
}
