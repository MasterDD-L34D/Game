import { describe, expect, it } from 'vitest';

import { getSampleTraits } from '../../data/traits.sample';
import { cloneTrait, mergeTrait, synchroniseTraitPresentation } from '../trait-helpers';

describe('trait helpers', () => {
  it('cloneTrait produces an independent copy of nested data', () => {
    const [original] = getSampleTraits();
    const copy = cloneTrait(original);

    copy.entry.completion_flags.has_biome = !copy.entry.completion_flags.has_biome;
    copy.entry.species_affinity[0].roles.push('tester');

    expect(copy.entry.completion_flags.has_biome).not.toBe(original.entry.completion_flags.has_biome);
    expect(original.entry.species_affinity[0].roles).not.toContain('tester');
  });

  it('mergeTrait preserves untouched fields while applying nested changes', () => {
    const [original] = getSampleTraits();
    const baseline = cloneTrait(original);
    const updates = cloneTrait(original);

    const toggledFlag = !updates.entry.completion_flags.has_biome;
    updates.entry.tier = 'TX';
    updates.entry.completion_flags.has_biome = toggledFlag;
    updates.entry.species_affinity[0].roles.push('supporto');
    updates.entry.requisiti_ambientali[0].meta.notes = 'Annotazione locale';
    updates.entry.requisiti_ambientali[0].condizioni.biome_class = 'artico';
    updates.entry.sinergie_pi.combo_totale = 99;

    const merged = mergeTrait(baseline, updates);
    synchroniseTraitPresentation(merged);

    expect(merged.entry.tier).toBe('TX');
    expect(merged.entry.completion_flags.has_biome).toBe(toggledFlag);
    expect(merged.entry.species_affinity[0].roles).toContain('supporto');
    expect(merged.entry.species_affinity[0].species_id).toBe(baseline.entry.species_affinity[0].species_id);
    expect(merged.entry.requisiti_ambientali[0].meta?.notes).toBe('Annotazione locale');
    expect(merged.entry.requisiti_ambientali[0].condizioni.biome_class).toBe('artico');
    expect(merged.entry.sinergie_pi.combo_totale).toBe(99);

    merged.entry.species_affinity[0].roles.push('diverso');
    expect(baseline.entry.species_affinity[0].roles).not.toContain('diverso');
  });
});
