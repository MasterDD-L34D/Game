import { describe, expect, it } from 'vitest';
import { generateEncounterSeed, generateEncounterSeedsForBiome } from '../src/state/generator/encounterGenerator.js';
import { getEncounterTemplate } from '../src/state/generator/encounters.js';

const BASE_SPECIES = [
  {
    id: 'alpha-hunter',
    display_name: 'Thermo Raptor',
    role_trofico: 'predatore_apice_deserto_caldo',
    biomes: ['deserto_caldo'],
    tags: ['predatore'],
    functional_tags: ['predatore'],
    statistics: { threat_tier: 'T4', rarity: 'R3' },
  },
  {
    id: 'sand-scout-1',
    display_name: 'Scopritore di Dune',
    role_trofico: 'predatore_specialista_deserto_caldo',
    biomes: ['deserto_caldo'],
    tags: ['ricognizione', 'trappola'],
    functional_tags: ['ricognizione'],
    statistics: { threat_tier: 'T2', rarity: 'R2' },
  },
  {
    id: 'sand-scout-2',
    display_name: 'Cuneo Magnetico',
    role_trofico: 'predatore_specialista_badlands',
    biomes: ['badlands'],
    tags: ['ricognizione', 'trappola'],
    functional_tags: ['ricognizione'],
    statistics: { threat_tier: 'T2', rarity: 'R1' },
  },
  {
    id: 'bio-engineer',
    display_name: 'Catalizzatore Ferroflore',
    role_trofico: 'ingegnere_ecologico_deserto_caldo',
    biomes: ['deserto_caldo'],
    tags: ['supporto', 'catalizzatore'],
    functional_tags: ['supporto'],
    statistics: { threat_tier: 'T1', rarity: 'R2' },
  },
];

describe('Encounter generation', () => {
  it('creates a seed with dynamic description for dune patrol', () => {
    const template = getEncounterTemplate('dune-patrol');
    if (!template) throw new Error('Template missing');
    const seed = generateEncounterSeed({
      templateId: template,
      biome: { id: 'deserto_caldo', display_name: 'Deserto Caldo' },
      speciesPool: BASE_SPECIES,
      parameterSelections: { intensity: 'high' },
      random: () => 0,
    });
    expect(seed.summary).toContain('Deserto Caldo');
    expect(seed.description).toContain('Thermo Raptor');
    expect(seed.metrics.threat.tier).toMatch(/^T/);
    const outriderSlot = seed.slots.find((slot) => slot.id === 'outrider');
    expect(outriderSlot?.species.length).toBe(1);
    expect(outriderSlot?.quantity).toBe(outriderSlot?.species.length);
    expect(seed.parameters.intensity.value).toBe('high');
    expect(seed.links.biome_id).toBe('deserto_caldo');
    expect(
      seed.warnings.some(
        (warning) => warning.code === 'encounter.slot.unfilled' && warning.slot === 'outrider'
      )
    ).toBe(true);
  });

  it('skips optional slots when no species match', () => {
    const template = getEncounterTemplate('glacier-ambush');
    if (!template) throw new Error('Template missing');
    const seed = generateEncounterSeed({
      templateId: template,
      biome: { id: 'cryosteppe', display_name: 'Cryosteppe' },
      speciesPool: BASE_SPECIES,
      random: () => 0.3,
    });
    expect(seed.warnings.some((warning) => warning.slot === 'vanguard')).toBe(true);
    expect(seed.slots.some((slot) => slot.id === 'sapper')).toBe(false);
  });

  it('generates seeds only for templates compatible with the biome', () => {
    const seeds = generateEncounterSeedsForBiome({
      biome: { id: 'deserto_caldo', display_name: 'Deserto Caldo' },
      species: BASE_SPECIES,
      variantsByTemplate: {
        'dune-patrol': [{ intensity: 'low' }, { intensity: 'standard' }],
      },
      random: () => 0.1,
    });
    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds.every((seed) => seed.biome.id === 'deserto_caldo')).toBe(true);
    const templateIds = new Set(seeds.map((seed) => seed.template_id));
    expect(templateIds.has('dune-patrol')).toBe(true);
    expect(templateIds.has('glacier-ambush')).toBe(false);
  });
});
