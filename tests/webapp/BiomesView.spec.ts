import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import BiomesView from '../../webapp/src/views/BiomesView.vue';

const NebulaShellStub = {
  props: ['tabs', 'modelValue', 'statusIndicators'],
  emits: ['update:modelValue'],
  template: `
    <div class="nebula-shell-stub">
      <div class="nebula-shell-stub__cards"><slot name="cards" /></div>
      <div class="nebula-shell-stub__default"><slot :activeTab="modelValue"></slot></div>
    </div>
  `,
};

const PokedexBiomeCardStub = {
  props: ['biome'],
  template: `
    <article class="pokedex-biome-card-stub">
      <header>{{ biome.name }}</header>
      <slot name="footer"></slot>
    </article>
  `,
};

const TraitChipStub = {
  props: ['label'],
  template: '<span class="trait-chip-stub">{{ label }}</span>',
};

const PokedexTelemetryBadgeStub = {
  props: ['label', 'value'],
  template: '<span class="telemetry-badge-stub">{{ label }}: {{ value }}</span>',
};

describe('BiomesView', () => {
  const biomes = [
    {
      id: 'frost',
      name: 'Frost Valley',
      readiness: 6,
      total: 10,
      risk: 3,
      hazard: 'Tempeste criogeniche',
      traits: ['fungi', { id: 'lumen', label: 'Lumen', description: 'Favorisce la luminescenza' }],
      affinities: [{ id: 'bio', label: 'Bio-simbiosi', description: 'Affinità biologica', roles: ['Healer'] }],
      validators: [{ id: 'val-1', status: 'warning', label: 'Energia instabile', message: 'Richiede bilanciamento' }],
    },
    {
      id: 'ember',
      name: 'Ember Dunes',
      readiness: 4,
      total: 8,
      risk: 2,
      hazard: 'Tempeste di cenere',
      traits: ['pyro'],
      affinities: ['Bio-simbiosi'],
      validators: [],
    },
  ];

  const mountView = () =>
    mount(BiomesView, {
      props: { biomes },
      global: {
        stubs: {
          NebulaShell: NebulaShellStub,
          PokedexBiomeCard: PokedexBiomeCardStub,
          TraitChip: TraitChipStub,
          PokedexTelemetryBadge: PokedexTelemetryBadgeStub,
        },
      },
    });

  it('mostra card di telemetria e chip filtrabili', () => {
    const wrapper = mountView();

    expect(wrapper.findAll('.telemetry-badge-stub').length).toBeGreaterThan(0);
    expect(wrapper.findAll('.biomes-view__filter').length).toBeGreaterThanOrEqual(3);
    expect(wrapper.findAll('.biomes-view__hazards .trait-chip-stub').length).toBeGreaterThan(0);
  });

  it('filtra i biomi in base ai tratti selezionati e consente il reset', async () => {
    const wrapper = mountView();

    expect(wrapper.findAll('.pokedex-biome-card-stub').length).toBe(2);

    const filters = wrapper.findAll('.biomes-view__filter');
    await filters[0].trigger('click');

    expect(wrapper.findAll('.pokedex-biome-card-stub').length).toBe(1);
    expect(wrapper.text()).toContain('Filtri attivi');

    await wrapper.find('.biomes-view__reset').trigger('click');
    expect(wrapper.findAll('.pokedex-biome-card-stub').length).toBe(2);
  });
});
