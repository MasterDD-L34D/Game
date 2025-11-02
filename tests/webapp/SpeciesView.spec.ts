import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import SpeciesView from '../../webapp/src/views/SpeciesView.vue';
import { createI18nForTests } from '../../webapp/tests/utils/i18n';

const createWrapper = () => {
  const status = {
    curated: 6,
    total: 10,
    shortlist: ['Draconis', 'Lycanis'],
  };

  const meta = {
    biomeId: 'glacier-01',
    telemetry: {
      coverage: 72,
      phases: [
        { id: 'draft', label: 'Draft', percent: 60, summary: 'Assemblaggio blueprint' },
        { id: 'qa', label: 'QA', percent: 40 },
      ],
    },
  };

  const validation = {
    messages: [
      { message: 'Controllo habitat completato', level: 'info' },
      { message: 'Bilanciamento da rivedere', level: 'warning' },
      { message: 'Errore adattamento', level: 'error' },
    ],
    discarded: ['mutation-A'],
    corrected: { id: 'adj-01' },
  };

  const traitCatalog = {
    labels: {
      apex: 'Predatore apex',
      stealth: 'Mimetismo',
      pack: 'Predazione di branco',
    },
    synergyMap: {
      apex: ['stealth', 'pack'],
    },
  };

  const traitCompliance = {
    badges: [
      { id: 'coverage', label: 'Coverage', value: '85%', tone: 'success' },
    ],
    generatedAt: '2035-04-01T12:00:00Z',
  };

  return mount(SpeciesView, {
    props: {
      species: { id: 'specimen-01' },
      status,
      meta,
      validation,
      requestId: 'orchestrator-77',
      error: 'Errore orchestrator test',
      traitCatalog,
      traitCompliance,
      traitDiagnosticsLoading: false,
      traitDiagnosticsError: 'Errore QA sincronia',
      traitDiagnosticsMeta: { fetched_at: '2035-04-01T12:05:00Z' },
    },
    global: {
      plugins: [createI18nForTests('it')],
      stubs: {
        SpeciesPanel: {
          template: '<div class="species-panel-stub" />',
        },
      },
    },
  });
};

describe('SpeciesView', () => {
  it('mostra progress bar di telemetria e metadati orchestrator', () => {
    const wrapper = createWrapper();

    const progressBars = wrapper.findAll('.telemetry-progress');
    expect(progressBars.length).toBeGreaterThanOrEqual(3);
    expect(wrapper.text()).toContain('Specie curate');
    expect(wrapper.text()).toContain('Copertura shortlist');
    expect(wrapper.text()).toContain('ID orchestrator');
    expect(wrapper.text()).toContain('Shortlist');
    expect(wrapper.text()).toContain('Errore orchestrator test');
  });

  it('visualizza le sinergie del catalogo nella tab dedicata', async () => {
    const wrapper = createWrapper();

    const tabs = wrapper.findAll('.insight-card__tab');
    await tabs[1].trigger('click');

    expect(wrapper.findAll('.species-view__synergy-card').length).toBe(1);
    expect(wrapper.text()).toContain('Predatore apex');
    expect(wrapper.text()).toContain('Mimetismo');
  });

  it('riassume i messaggi di QA nella tab QA', async () => {
    const wrapper = createWrapper();

    const tabs = wrapper.findAll('.insight-card__tab');
    await tabs[2].trigger('click');

    expect(wrapper.text()).toContain('Validazione runtime');
    expect(wrapper.text()).toContain('Errore adattamento');
    expect(wrapper.text()).toContain('Errore QA sincronia');
  });
});
