import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';

import { useHudOverlayModule } from '../../src/modules/useHudOverlayModule';

describe('useHudOverlayModule', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as { fetch?: typeof fetch }).fetch;
    }
  });

  it('reads thresholds from layout filters', () => {
    const module = useHudOverlayModule({
      missionTag: 'delta',
      overlayId: 'smart-risk-alerts',
      autoRefresh: false,
    });
    expect(module.thresholds.value.weighted).toBeCloseTo(0.6, 2);
    expect(module.thresholds.value.clear).toBeCloseTo(0.58, 2);
    expect(module.thresholds.value.consecutiveBelow).toBe(2);
  });

  it('falls back to bundled summary when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    const module = useHudOverlayModule({
      missionTag: 'delta',
      missionId: 'skydock_siege_tier3_retest',
      overlayId: 'smart-risk-alerts',
    });
    await nextTick();
    await module.refresh();
    expect(module.error.value).toBeTruthy();
    expect(module.summary.value?.alerts?.length).toBeGreaterThan(0);
    expect(module.contextMetrics.value.length).toBeGreaterThan(0);
  });
});
