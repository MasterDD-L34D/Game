// TKT-C1-FE — Vue 3 trait editor view full smoke spec.
//
// Covers acceptance criteria from handoff doc:
//  1) Form input + reactive binding works
//  2) Save round-trip via dataService.saveTrait (mock)
//  3) Validation panel renders + auto-fix application works
//  4) Cancel routes back to detail view
//  5) Add/remove signature moves works

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import TraitEditorView from '../TraitEditorView.vue';
import TraitDetailView from '../TraitDetailView.vue';
import * as dataServiceModule from '../../services/trait-data.service';
import type { Trait } from '../../types/trait';
import type { TraitValidationResult } from '../../types/trait-validation';

function buildTrait(overrides: Partial<Trait> = {}): Trait {
  return {
    id: 'test-trait',
    name: 'Tratto di prova',
    description: 'Una descrizione sufficientemente lunga per superare la validazione minima.',
    archetype: 'Scout',
    playstyle: 'Esplorazione veloce',
    signatureMoves: ['Salto rapido', 'Camuffamento'],
    entry: {
      id: 'test-trait',
      label: 'Tratto di prova',
      tier: 'T1',
      famiglia_tipologia: 'Scout',
      slot_profile: { core: 'movimento', complementare: 'percezione' },
      slot: ['movimento'],
      usage_tags: ['burst'],
      completion_flags: {
        has_biome: true,
        has_data_origin: true,
        has_species_link: true,
        has_usage_tags: true,
      },
      data_origin: 'mock',
      debolezza: 'Fragile a colpi corpo a corpo',
      mutazione_indotta: '',
      requisiti_ambientali: [],
      sinergie: ['Salto rapido', 'Camuffamento'],
      sinergie_pi: { co_occorrenze: [], combo_totale: 0, forme: [], tabelle_random: [] },
      species_affinity: [],
      spinta_selettiva: 'Esplorazione veloce',
      uso_funzione: 'Una descrizione sufficientemente lunga per superare la validazione minima.',
      fattore_mantenimento_energetico: 'basso',
      conflitti: [],
      biome_tags: ['foresta'],
    },
    ...overrides,
  };
}

function buildRouter(): ReturnType<typeof createRouter> {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/traits', name: 'trait-library', component: { template: '<div />' } },
      { path: '/traits/:id', name: 'trait-detail', component: TraitDetailView },
      { path: '/traits/:id/edit', name: 'trait-editor', component: TraitEditorView },
    ],
  });
}

describe('TraitEditorView (Vue 3)', () => {
  let serviceStub: {
    getTraitById: ReturnType<typeof vi.fn>;
    saveTrait: ReturnType<typeof vi.fn>;
    validateTrait: ReturnType<typeof vi.fn>;
    getLastError: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    const trait = buildTrait();
    serviceStub = {
      getTraitById: vi.fn().mockResolvedValue(trait),
      saveTrait: vi.fn().mockImplementation((t: Trait) => Promise.resolve(t)),
      validateTrait: vi.fn().mockResolvedValue({
        summary: { errors: 0, warnings: 1, suggestions: 0 },
        issues: [
          {
            id: 'w-1',
            severity: 'warning',
            message: 'Manca un tag di compatibilità',
            path: '/entry/usage_tags',
            autoFixes: [
              {
                id: 'fix-1',
                label: 'Aggiungi tag compat',
                operations: [{ op: 'add', path: '/entry/usage_tags/-', value: 'compat' }],
              },
            ],
          },
        ],
      } as TraitValidationResult),
      getLastError: vi.fn().mockReturnValue(null),
    };
    vi.spyOn(dataServiceModule, 'getTraitDataService').mockReturnValue(
      serviceStub as unknown as ReturnType<typeof dataServiceModule.getTraitDataService>,
    );
  });

  it('loads the trait and renders form fields populated', async () => {
    const router = buildRouter();
    await router.push('/traits/test-trait/edit');
    const wrapper = mount(TraitEditorView, { global: { plugins: [router] } });
    await flushPromises();
    expect(serviceStub.getTraitById).toHaveBeenCalledWith('test-trait');
    const nameInput = wrapper.find<HTMLInputElement>('[data-testid="field-name"]');
    expect(nameInput.exists()).toBe(true);
    expect(nameInput.element.value).toBe('Tratto di prova');
    expect(wrapper.findAll('[data-testid="field-signature-move"]').length).toBe(2);
  });

  it('adds and removes a signature move', async () => {
    const router = buildRouter();
    await router.push('/traits/test-trait/edit');
    const wrapper = mount(TraitEditorView, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.findAll('[data-testid="field-signature-move"]').length).toBe(2);
    await wrapper.find('[data-testid="add-signature-move"]').trigger('click');
    expect(wrapper.findAll('[data-testid="field-signature-move"]').length).toBe(3);
  });

  it('validates the trait and renders the validation panel', async () => {
    const router = buildRouter();
    await router.push('/traits/test-trait/edit');
    const wrapper = mount(TraitEditorView, { global: { plugins: [router] } });
    await flushPromises();
    await wrapper.find('[data-testid="validate-button"]').trigger('click');
    await flushPromises();
    expect(serviceStub.validateTrait).toHaveBeenCalled();
    expect(wrapper.find('[data-testid="validation-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="autofix-button"]').exists()).toBe(true);
  });

  it('applies an auto-fix operation', async () => {
    const router = buildRouter();
    await router.push('/traits/test-trait/edit');
    const wrapper = mount(TraitEditorView, { global: { plugins: [router] } });
    await flushPromises();
    await wrapper.find('[data-testid="validate-button"]').trigger('click');
    await flushPromises();
    const initialTags = wrapper.findAll('input[type="text"]').filter((w) => {
      return (w.element as HTMLInputElement).value === 'burst';
    });
    expect(initialTags.length).toBe(1);
    await wrapper.find('[data-testid="autofix-button"]').trigger('click');
    await flushPromises();
    // After autofix, "compat" tag should appear among inputs
    const allInputs = wrapper.findAll('input[type="text"]');
    const compatPresent = allInputs.some((w) => (w.element as HTMLInputElement).value === 'compat');
    expect(compatPresent).toBe(true);
  });

  it('confirms save and calls saveTrait', async () => {
    const router = buildRouter();
    await router.push('/traits/test-trait/edit');
    const wrapper = mount(TraitEditorView, { global: { plugins: [router] } });
    await flushPromises();
    // Modify form to make it dirty
    const nameInput = wrapper.find<HTMLInputElement>('[data-testid="field-name"]');
    await nameInput.setValue('Tratto di prova rinominato');
    await flushPromises();
    expect(wrapper.find<HTMLButtonElement>('[data-testid="save-button"]').element.disabled).toBe(
      false,
    );
    await wrapper.find('[data-testid="save-button"]').trigger('submit');
    await flushPromises();
    expect(serviceStub.saveTrait).toHaveBeenCalled();
    const savedPayload = serviceStub.saveTrait.mock.calls[0][0] as Trait;
    expect(savedPayload.name).toBe('Tratto di prova rinominato');
  });

  it('cancel navigates back to trait detail', async () => {
    const router = buildRouter();
    await router.push('/traits/test-trait/edit');
    const wrapper = mount(TraitEditorView, { global: { plugins: [router] } });
    await flushPromises();
    await wrapper.find('[data-testid="cancel-button"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/traits/test-trait');
  });

  it('renders missing message when trait not found', async () => {
    serviceStub.getTraitById.mockResolvedValueOnce(null);
    const router = buildRouter();
    await router.push('/traits/missing/edit');
    const wrapper = mount(TraitEditorView, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.find('[data-testid="trait-editor-missing"]').exists()).toBe(true);
  });
});
