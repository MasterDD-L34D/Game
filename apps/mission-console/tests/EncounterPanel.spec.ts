import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import EncounterPanel from '../src/components/EncounterPanel.vue';

const BASE_SEED = {
  id: 'dune-patrol:deserto_caldo:default',
  templateName: 'Pattuglia Termomagnetica',
  biomeName: 'Deserto Caldo',
  summary: 'Pattuglia standard tra le dune di Deserto Caldo',
  description: 'Il comandante Thermo Raptor coordina Scopritore di Dune con supporto limitato.',
  metrics: { threat: { tier: 'T4' } },
  parameters: {
    intensity: { value: 'standard', label: 'standard' },
  },
  slots: [
    {
      id: 'leader',
      title: 'Predatore alfa',
      quantity: 1,
      species: [
        {
          id: 'alpha-hunter',
          display_name: 'Thermo Raptor',
          role_trofico: 'predatore_apice_deserto_caldo',
        },
      ],
    },
    {
      id: 'outrider',
      title: 'Esploratori sinaptici',
      quantity: 2,
      species: [
        {
          id: 'sand-scout-1',
          display_name: 'Scopritore di Dune',
          role_trofico: 'predatore_specialista_deserto_caldo',
        },
        {
          id: 'sand-scout-2',
          display_name: 'Cuneo Magnetico',
          role_trofico: 'predatore_specialista_badlands',
        },
      ],
    },
  ],
  warnings: [],
};

describe('EncounterPanel', () => {
  it('renders encounter information with variants', async () => {
    const encounter = {
      templateName: BASE_SEED.templateName,
      biomeName: BASE_SEED.biomeName,
      variants: [
        BASE_SEED,
        {
          ...BASE_SEED,
          id: 'dune-patrol:deserto_caldo:high',
          summary: 'Pattuglia aggressiva tra le dune di Deserto Caldo',
          description: 'Versione aggressiva.',
          parameters: { intensity: { value: 'high', label: 'aggressiva' } },
        },
      ],
      parameterLabels: { intensity: 'Intensità tattica' },
    };
    const wrapper = mount(EncounterPanel, {
      props: { encounter },
    });

    expect(wrapper.text()).toContain('Pattuglia Termomagnetica');
    expect(wrapper.text()).toContain('Thermo Raptor');
    expect(wrapper.find('[data-testid="variant-select"]').exists()).toBe(true);

    await wrapper.find('[data-testid="variant-select"]').setValue('1');
    expect(wrapper.text()).toContain('Versione aggressiva.');
    expect(wrapper.text()).toContain('aggressiva');
  });

  it('renders placeholder when encounter is missing', () => {
    const wrapper = mount(EncounterPanel);
    expect(wrapper.text()).toContain('Nessun encounter generato');
  });
});
