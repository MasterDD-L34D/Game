import { randomId, type RandomIdGenerator } from './ids.ts';
import type { FilterSet, GenerationConstraints, HazardLevel, TagEntry, TagLike } from './types.ts';

const ROLE_FLAGS_DEFAULT = ['apex', 'keystone', 'bridge', 'threat', 'event'] as const;

const CLIMATE_HINTS = [
  { pattern: /frost|criogen|ghiacci|ice/i, value: 'frozen' },
  { pattern: /desert|sabbia|arid|dust/i, value: 'arid' },
  { pattern: /tempesta|storm|ion|vento/i, value: 'storm' },
  { pattern: /fung|micel|caver/i, value: 'subterranean' },
  { pattern: /abiss|idro|mare|ocean/i, value: 'aquatic' },
] as const;

function filtersInclude(values: unknown, pattern: RegExp): boolean {
  if (!Array.isArray(values) || !values.length) return false;
  return values.some((value) => pattern.test(String(value)));
}

export function extractRequiredRoles(
  filters: FilterSet = {},
  roleFlags: readonly string[] = ROLE_FLAGS_DEFAULT,
): string[] {
  const roles = new Set<string>();
  (Array.isArray(filters.flags) ? filters.flags : []).forEach((flag) => {
    if (roleFlags.includes(String(flag))) {
      roles.add(String(flag));
    }
  });
  (Array.isArray(filters.roles) ? filters.roles : []).forEach((token) => {
    const value = String(token).toLowerCase();
    if (/apic|predator|apex/i.test(value)) roles.add('apex');
    if (/chiav|custod|warden|keystone/i.test(value)) roles.add('keystone');
    if (/ponte|bridge|logist|corridor/i.test(value)) roles.add('bridge');
    if (/minacc|threat|assalt|predator/i.test(value)) roles.add('threat');
    if (/evento|anomalia|event/i.test(value)) roles.add('event');
  });
  return Array.from(roles);
}

export function collectPreferredTags(filters: FilterSet = {}): string[] {
  const tags = new Set<string>();
  (Array.isArray(filters.tags) ? filters.tags : []).forEach((tag) => {
    if (tag) {
      tags.add(String(tag));
    }
  });
  (Array.isArray(filters.roles) ? filters.roles : []).forEach((token) => {
    const value = String(token).toLowerCase();
    if (/criogen|frost|ghiacci/i.test(value)) tags.add('criogenico');
    if (/desert|sabbia|arid/i.test(value)) tags.add('desertico');
    if (/idro|abiss|marino|ocean/i.test(value)) tags.add('abissale');
    if (/fung|micel/i.test(value)) tags.add('micelico');
  });
  return Array.from(tags);
}

export function inferHazardFromFilters(filters: FilterSet = {}): HazardLevel {
  const flags = Array.isArray(filters.flags) ? filters.flags : [];
  if (flags.some((flag) => String(flag) === 'threat' || String(flag) === 'apex')) {
    return 'high';
  }
  if (filtersInclude(filters.tags, /tempest|storm|pericolo|hazard|ferro/i)) {
    return 'high';
  }
  if (filtersInclude(filters.tags, /rifug|tranquill|shelter|safe/i)) {
    return 'low';
  }
  return 'medium';
}

export function inferClimateFromFilters(filters: FilterSet = {}): string | null {
  const tags = Array.isArray(filters.tags) ? filters.tags : [];
  for (const hint of CLIMATE_HINTS) {
    if (filtersInclude(tags, hint.pattern)) {
      return hint.value;
    }
  }
  if (filtersInclude(filters.roles, /criogen|ghiacci|frost/i)) return 'frozen';
  if (filtersInclude(filters.roles, /fung|micel/i)) return 'subterranean';
  if (filtersInclude(filters.roles, /idro|abiss|mare|ocean/i)) return 'aquatic';
  return null;
}

export function inferMinSize(
  filters: FilterSet = {},
  roleFlags: readonly string[] = ROLE_FLAGS_DEFAULT,
): number {
  const roles = extractRequiredRoles(filters, roleFlags);
  const tagCount = Array.isArray(filters.tags) ? filters.tags.length : 0;
  const base = roles.length >= 3 ? 4 : 3;
  const bonus = tagCount >= 4 ? 2 : tagCount >= 2 ? 1 : 0;
  return Math.min(6, base + bonus);
}

export interface BuildGenerationConstraintsOptions {
  roleFlags?: readonly string[];
}

export function buildGenerationConstraints(
  filters: FilterSet = {},
  options: BuildGenerationConstraintsOptions = {},
): GenerationConstraints {
  const roleFlags = options.roleFlags ?? ROLE_FLAGS_DEFAULT;
  const requiredRoles = extractRequiredRoles(filters, roleFlags);
  const preferredTags = collectPreferredTags(filters);
  const hazard = inferHazardFromFilters(filters);
  const climate = inferClimateFromFilters(filters);
  const minSize = inferMinSize(filters, roleFlags);
  const constraints: GenerationConstraints = {
    requiredRoles,
    preferredTags,
    hazard,
    climate,
    minSize,
  };
  if (!constraints.requiredRoles?.length) delete constraints.requiredRoles;
  if (!constraints.preferredTags?.length) delete constraints.preferredTags;
  if (!constraints.hazard) delete constraints.hazard;
  if (!constraints.climate) delete constraints.climate;
  if (!Number.isFinite(constraints.minSize)) delete constraints.minSize;
  return constraints;
}

export function normaliseTagId(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createTagEntry(
  tag: TagLike,
  generator: RandomIdGenerator = randomId,
): TagEntry | null {
  if (tag && typeof tag === 'object') {
    const labelCandidate =
      (tag as { label?: string | null }).label ??
      (tag as { name?: string | null }).name ??
      (tag as { title?: string | null }).title ??
      (tag as { text?: string | null }).text ??
      (tag as { value?: string | null }).value ??
      (tag as { id?: string | null }).id ??
      '';
    const label = String(labelCandidate || '').trim();
    if (!label) {
      return null;
    }
    const idCandidate =
      (tag as { id?: string | null }).id ??
      (tag as { value?: string | null }).value ??
      normaliseTagId(label);
    const id = normaliseTagId(idCandidate || label) || normaliseTagId(label) || generator('tag');
    return { id: id || generator('tag'), label };
  }
  const label = String(tag ?? '').trim();
  if (!label) {
    return null;
  }
  const id = normaliseTagId(label) || generator('tag');
  return { id, label };
}
