// ADR-2026-05-29 TKT-BR-09 -- TraitSuggestionsView accept/reject UX.
//
// Mounts the view via @vue/test-utils + happy-dom, stubs global fetch (the
// suggestions service uses TraitDataService.fetchWithAuth -> global fetch),
// and verifies render + local accept/reject decision tracking + empty/error.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import TraitSuggestionsView from '../TraitSuggestionsView.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
});

function stubFetch(payload: unknown, ok = true, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status,
      json: async () => payload,
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function mountView() {
  await router.push('/');
  const wrapper = mount(TraitSuggestionsView, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe('TraitSuggestionsView (TKT-BR-09)', () => {
  it('renders suggestions and tracks accept/reject decisions in summary', async () => {
    stubFetch({
      schema: 'ermes_trait_suggestion',
      schema_version: '1.0.0',
      suggestions: [
        {
          trait_id: 'heat_resistance_x',
          biome_id: 'cryosteppe_convergence',
          kind: 'mutation_bias_match',
          rationale: 'High heat bias.',
          confidence: 0.5,
          proposed_patch: { op: 'add', path: '/biome_tags/-', value: 'cryosteppe_convergence' },
        },
        {
          trait_id: 'fragile_y',
          biome_id: 'savana',
          kind: 'extinction_risk_warning',
          rationale: 'High extinction risk.',
          confidence: 0.8,
          proposed_patch: { op: 'replace', path: '/tier', value: 'T2' },
        },
      ],
    });
    const wrapper = await mountView();

    const items = wrapper.findAll('[data-testid="suggestion-item"]');
    expect(items.length).toBe(2);
    expect(wrapper.findAll('[data-testid="patch"]').length).toBe(2);

    await items[0].find('[data-testid="accept-btn"]').trigger('click');
    await items[1].find('[data-testid="reject-btn"]').trigger('click');

    const summary = wrapper.find('[data-testid="summary"]').text();
    expect(summary).toContain('1 accettati');
    expect(summary).toContain('1 rifiutati');
    expect(summary).toContain('0 in sospeso');
  });

  it('renders empty state with backend note when no suggestions', async () => {
    stubFetch({
      schema: 'ermes_trait_suggestion',
      schema_version: '1.0.0',
      suggestions: [],
      note: 'nessun report ermes-suggestions trovato',
    });
    const wrapper = await mountView();

    expect(wrapper.find('[data-testid="suggestion-item"]').exists()).toBe(false);
    const empty = wrapper.find('[data-testid="empty"]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain('nessun report');
  });

  it('renders error state when the request fails', async () => {
    stubFetch({ error: 'boom' }, false, 500);
    const wrapper = await mountView();

    expect(wrapper.find('[data-testid="error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="suggestion-item"]').exists()).toBe(false);
  });
});
