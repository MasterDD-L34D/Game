import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SpeciesPanel from '../src/components/SpeciesPanel.vue';

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

describe('SpeciesPanel', () => {
  it('renders species narrative and mechanics', () => {
    const wrapper = mount(SpeciesPanel, {
      props: { species: BASE_SPECIES },
    });
    expect(wrapper.text()).toContain('Predatore / Coda a Frusta Cinetica');
    expect(wrapper.text()).toContain('Tratti derivati');
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('renders placeholder when missing species', () => {
    const wrapper = mount(SpeciesPanel);
    expect(wrapper.text()).toContain('Nessuna specie selezionata');
  });
});
