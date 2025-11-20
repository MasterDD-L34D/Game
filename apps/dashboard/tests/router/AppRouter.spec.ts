import { describe, expect, it, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory } from 'vue-router';

import { createAppRouter } from '../../src/router';
import { resetNavigationMeta, useNavigationMeta } from '../../src/state/navigationMeta';

describe('App router metadata', () => {
  beforeEach(() => {
    resetNavigationMeta();
    document.title = 'Test Suite';
  });

  it('rispetta il BASE_URL personalizzato nella risoluzione dei link', () => {
    const router = createAppRouter({ history: createMemoryHistory('/mission/') });
    const resolved = router.resolve({ name: 'console-atlas-world-builder' });
    expect(resolved.href).toBe('/mission/console/atlas/world-builder');
  });

  it('aggiorna document title e breadcrumb condivisi', async () => {
    const router = createAppRouter({ history: createMemoryHistory('/console/') });
    const { title, description, demo, breadcrumbs } = useNavigationMeta();

    await router.push({ name: 'console-atlas-encounter-lab' });
    await router.isReady();
    await nextTick();

    expect(document.title).toContain('Atlas · Encounter Lab');
    expect(title.value).toBe('Atlas · Encounter Lab');
    expect(description.value).toContain('incontri');
    expect(demo.value).toBe(true);
    const labels = breadcrumbs.value.map((entry) => entry.label);
    expect(labels).toContain('Nebula Atlas');
    expect(labels.at(-1)).toBe('Encounter Lab');
  });
});
