import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SpeciesPanel from '../src/components/SpeciesPanel.vue';

vi.mock('../src/services/speciesPreviewService', () => ({
  requestSpeciesPreviewBatch: vi.fn(() => Promise.resolve({ previews: [] })),
}));

const { requestSpeciesPreviewBatch } = await import('../src/services/speciesPreviewService.js');

const BASE_SPECIES = {
  id: 'synthetic-1d37afd07a',
  display_name: 'Predatore / Coda a Frusta Cinetica',
  summary: 'Artigli a Sette Vie, Coda a Frusta Cinetica, Scheletro Idro-Regolante',
  description:
    'Sintesi genetica focalizzata su Artigli a Sette Vie e Coda a Frusta Cinetica con impronta morfologica defensive, locomotor, omeostatico, prehensile, structural; comportamento climber. Ottimizzata per biomi: caverna_risonante.',
  traits: {
    core: ['Artigli a Sette Vie', 'Coda a Frusta Cinetica', 'Scheletro Idro-Regolante'],
    derived: ['struttura_elastica_amorfa', 'sacche_galleggianti_ascensoriali'],
  },
  morphology: {
    adaptations: ['Dita lunghe', 'Precauzione: vulnerabile ai veleni'],
  },
  behavior_profile: {
    tags: ['climber'],
  },
  statistics: {
    threat_tier: 'T3',
    rarity: 'R2',
    energy_profile: 'medio',
    synergy_score: 0.42,
  },
};

const VALIDATION = {
  messages: [
    { level: 'info', code: 'species.schema_version.defaulted', message: 'schema_version mancante' },
    { level: 'warning', code: 'species.environment_affinity.missing', message: 'environment_affinity non presente' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SpeciesPanel', () => {
  it('renders species narrative and mechanics', async () => {
    const wrapper = mount(SpeciesPanel, {
      props: { species: BASE_SPECIES, validation: VALIDATION, autoPreview: false },
    });
    expect(wrapper.text()).toContain('Predatore / Coda a Frusta Cinetica');
    expect(wrapper.text()).toContain('Tratti derivati');
    expect(wrapper.text()).toContain('Revisioni validate');
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('renders placeholder when missing species', () => {
    const wrapper = mount(SpeciesPanel);
    expect(wrapper.text()).toContain('Nessuna specie selezionata');
  });

  it('emits quick action events', async () => {
    const wrapper = mount(SpeciesPanel, {
      props: { species: BASE_SPECIES, autoPreview: false },
    });
    await wrapper.find('button').trigger('click');
    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.emitted('export')).toBeTruthy();
    expect(wrapper.emitted('save')).toBeTruthy();
  });

  it('requests preview batch when filters change', async () => {
    const wrapper = mount(SpeciesPanel, {
      props: { species: BASE_SPECIES },
    });
    await flushPromises();
    await vi.waitFor(() => {
      expect(requestSpeciesPreviewBatch).toHaveBeenCalled();
    });
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(checkbox.exists()).toBe(true);
    const callCount = requestSpeciesPreviewBatch.mock.calls.length;
    await checkbox.setValue(false);
    await flushPromises();
    await vi.waitFor(() => {
      expect(requestSpeciesPreviewBatch.mock.calls.length).toBeGreaterThan(callCount);
    });
  });
});
