/// <reference types="vitest" />
import { describe, expect, it, vi } from 'vitest';

import { randomId } from '../../../docs/evo-tactics-pack/utils/ids.ts';
import {
  buildGenerationConstraints,
  collectPreferredTags,
  createTagEntry,
  extractRequiredRoles,
  inferClimateFromFilters,
  inferHazardFromFilters,
  inferMinSize,
  normaliseTagId,
} from '../../../docs/evo-tactics-pack/utils/normalizers.ts';
import {
  activityLogToCsv,
  serialiseActivityLogEntry,
  toYAML,
} from '../../../docs/evo-tactics-pack/utils/serializers.ts';

describe('docs-generator utils — normalizers', () => {
  it('extracts distinct required roles from flags and role tokens', () => {
    const roles = extractRequiredRoles({
      flags: ['apex', 'keystone', 'unsupported'],
      roles: ['Predatore Apex', 'Custode logistico', 'Evento dinamico'],
    });

    expect(new Set(roles)).toEqual(new Set(['apex', 'keystone', 'bridge', 'event', 'threat']));
  });

  it('collects preferred tags from filters and role hints', () => {
    const tags = collectPreferredTags({
      tags: ['criogenico', null, ''],
      roles: ['Predatore desertico', 'Micelico di caverna'],
    });

    expect(tags).toEqual(['criogenico', 'desertico', 'micelico']);
  });

  it('infers hazard and climate from filters', () => {
    expect(inferHazardFromFilters({ flags: ['apex'] })).toBe('high');
    expect(inferHazardFromFilters({ tags: ['rifugio sicuro'] })).toBe('low');
    expect(inferHazardFromFilters({ tags: ['ambientale'] })).toBe('medium');

    expect(inferClimateFromFilters({ tags: ['tempesta ionica'] })).toBe('storm');
    expect(inferClimateFromFilters({ roles: ['fungoid subterraneo'] })).toBe('subterranean');
    expect(inferClimateFromFilters({})).toBeNull();
  });

  it('infers minimum size based on roles and tags', () => {
    expect(inferMinSize({ flags: ['apex', 'keystone'], tags: ['criogenico'] })).toBe(3);
    expect(
      inferMinSize({
        roles: ['predatore apex', 'evento instabile'],
        tags: ['criogenico', 'desertico'],
      }),
    ).toBe(5);
    expect(inferMinSize({}, ['alpha'])).toBe(3);
  });

  it('builds generation constraints removing empty collections', () => {
    const constraints = buildGenerationConstraints({
      flags: ['apex'],
      roles: ['Predatore apex'],
      tags: ['criogenico'],
    });

    expect(constraints).toEqual({
      requiredRoles: ['apex', 'threat'],
      preferredTags: ['criogenico'],
      hazard: 'high',
      climate: 'frozen',
      minSize: 3,
    });
  });

  it('normalises tag identifiers with accents and spaces', () => {
    expect(normaliseTagId('   Élite Operativo  ')).toBe('elite-operativo');
  });

  it('creates tag entries from primitives and objects', () => {
    const fallback = vi.fn().mockReturnValue('tag-fallback');

    expect(createTagEntry(' Nodo  ')).toEqual({ id: 'nodo', label: 'Nodo' });
    expect(createTagEntry({ label: 'Risonanza', id: 'risonanza-interna' })).toEqual({
      id: 'risonanza-interna',
      label: 'Risonanza',
    });
    expect(createTagEntry({ value: 'Nuovo' }, fallback)).toEqual({ id: 'nuovo', label: 'Nuovo' });
    expect(createTagEntry({ name: '  ' }, fallback)).toBeNull();
    expect(createTagEntry('', fallback)).toBeNull();
    expect(fallback).not.toHaveBeenCalled();
  });
});

describe('docs-generator utils — serializers', () => {
  it('serialises activity log entries applying defaults and tag normalisation', () => {
    const entry = serialiseActivityLogEntry({
      message: 'Catalogo pronto',
      tags: [{ label: 'Catalogo' }, 'Ready', null],
      tone: 'success',
      metadata: { source: 'test' },
      pinned: 1,
    });

    expect(entry).toMatchObject({
      id: null,
      message: 'Catalogo pronto',
      tone: 'success',
      pinned: true,
      tags: [
        { id: 'catalogo', label: 'Catalogo' },
        { id: 'ready', label: 'Ready' },
      ],
      metadata: { source: 'test' },
    });
    expect(entry?.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('renders CSV output with escaped values and metadata serialisation', () => {
    const csv = activityLogToCsv([
      {
        id: 'evt-1',
        message: 'Evento "critico"',
        tone: 'warn',
        timestamp: '2024-01-01T10:00:00.000Z',
        tags: [{ id: 'critical', label: 'Critical' }],
        action: 'guard',
        pinned: true,
        metadata: { note: 'Check' },
      },
    ]);

    expect(csv.split('\n')[0]).toBe('id,timestamp,tone,message,tags,action,pinned,metadata');
    expect(csv).toContain('"Evento ""critico"""');
    expect(csv).toContain('true');
    expect(csv).toContain('"{""note"":""Check""}"');
  });

  it('converts nested structures to YAML-like strings', () => {
    expect(
      toYAML({
        id: 'ecos-1',
        metrics: { biomes: 3 },
        tags: ['criogenico', 'desertico'],
      }),
    ).toBe('id: "ecos-1"\nmetrics: \n  biomes: 3\ntags: \n  - criogenico\n  - desertico');

    expect(toYAML(['alpha', 'beta'])).toBe('- alpha\n- beta');
  });
});

describe('docs-generator utils — ids', () => {
  it('generates random identifiers with configurable prefix', () => {
    const id = randomId('flow');
    expect(id).toMatch(/^flow-[a-z0-9]{6}$/);
  });
});
