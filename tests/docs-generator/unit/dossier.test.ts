import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  loadDossierTemplate,
  generatePresetFileContents,
  buildPressKitMarkdown,
  type DossierContext,
  type PresetDescriptor,
} from '../../../services/export/dossier.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dossier template loading', () => {
  it('returns cached template without hitting the network', async () => {
    const cache = {
      get: vi.fn(() => 'cached-template'),
      set: vi.fn(),
    };
    const fetchImpl = vi.fn();

    const result = await loadDossierTemplate('/template.html', { cache, fetchImpl });

    expect(result).toBe('cached-template');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('fetches and caches templates when missing from cache', async () => {
    const cache = {
      get: vi.fn(() => null),
      set: vi.fn(),
    };
    const fetchImpl = vi.fn(async () => new Response('<html></html>', { status: 200 }));

    const result = await loadDossierTemplate('/template.html', { cache, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith('<html></html>');
    expect(result).toBe('<html></html>');
  });

  it('stores a null entry when template download fails', async () => {
    const cache = {
      get: vi.fn(() => null),
      set: vi.fn(),
    };
    const fetchImpl = vi.fn(async () => {
      throw new Error('network error');
    });

    const result = await loadDossierTemplate('/template.html', { cache, fetchImpl });

    expect(result).toBeNull();
    expect(cache.set).toHaveBeenCalledWith(null);
  });
});

describe('dossier preset generation', () => {
  const baseContext: DossierContext = {
    slug: 'demo-pack',
    folder: 'demo',
    ecosystemLabel: 'Demo Pack',
    metrics: { biomeCount: 2, speciesCount: 4, seedCount: 1 },
    payload: { id: 'demo-pack' },
    activityEntries: [],
    biomes: [],
    speciesBuckets: {},
    seeds: [],
    pinnedEntries: [],
  };

  const createHelpers = () => ({
    presetLabel: 'Internal',
    roleLabels: {},
    titleCase: (value: string) => value,
    findBiomeLabelById: () => null,
    toYAML: vi.fn(() => 'payload: demo'),
    activityLogToCsv: vi.fn(() => 'id,sum'),
  });

  it('produces the requested files using cached templates', async () => {
    const templateLoader = vi.fn().mockResolvedValue('<template></template>');

    const preset: PresetDescriptor = {
      files: [
        { id: 'json', builder: 'ecosystem-json', filename: 'ecosystem.json' },
        { id: 'yaml', builder: 'ecosystem-yaml', filename: 'ecosystem.yaml' },
        { id: 'csv', builder: 'activity-csv', filename: 'activity.csv' },
        { id: 'html', builder: 'dossier-html', filename: 'dossier.html' },
        { id: 'press', builder: 'press-kit-md', filename: 'press.md' },
      ],
    };

    const helpers = createHelpers();

    const { files } = await generatePresetFileContents(preset, baseContext, {
      ...helpers,
      templateLoader,
      slug: baseContext.slug,
      html2pdf: null,
    });

    expect(templateLoader).toHaveBeenCalledTimes(1);
    expect(helpers.toYAML).toHaveBeenCalledWith(baseContext.payload);
    expect(helpers.activityLogToCsv).toHaveBeenCalledWith(baseContext.activityEntries);
    expect(files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'json', mime: 'application/json' }),
        expect.objectContaining({ id: 'yaml', mime: 'text/yaml', data: 'payload: demo' }),
        expect.objectContaining({ id: 'csv', mime: 'text/csv', data: 'id,sum' }),
        expect.objectContaining({ id: 'html', mime: 'text/html' }),
        expect.objectContaining({ id: 'press', mime: 'text/markdown' }),
      ]),
    );

    const pressFile = files.find((file) => file.id === 'press');
    expect(pressFile?.data).toContain('Demo Pack');
    const htmlFile = files.find((file) => file.id === 'html');
    expect(typeof htmlFile?.data).toBe('string');
    expect((htmlFile?.data as string) ?? '').toContain('<!DOCTYPE html>');
  });

  it('skips HTML and PDF outputs when prerequisites are missing', async () => {
    const templateLoader = vi.fn().mockResolvedValue(null);
    const preset: PresetDescriptor = {
      files: [
        { id: 'html', builder: 'dossier-html', filename: 'dossier.html' },
        { id: 'pdf', builder: 'dossier-pdf', filename: 'dossier.pdf' },
      ],
    };

    const helpers = createHelpers();

    const { files } = await generatePresetFileContents(preset, baseContext, {
      ...helpers,
      templateLoader,
      slug: baseContext.slug,
      html2pdf: null,
    });

    expect(templateLoader).toHaveBeenCalledTimes(1);
    expect(files).toEqual([]);
  });
});

describe('press kit generation', () => {
  it('falls back gracefully when optional context information is missing', () => {
    const context: DossierContext = {
      slug: 'demo-pack',
      folder: 'demo',
      ecosystemLabel: 'Demo Pack',
      metrics: { biomeCount: 0, speciesCount: 0, seedCount: 0 },
      payload: {},
      activityEntries: [],
      biomes: [],
      speciesBuckets: {},
      seeds: [],
      pinnedEntries: [],
    };

    const markdown = buildPressKitMarkdown(context, {
      presetLabel: null,
      roleLabels: {},
      titleCase: (value: string) => value,
      findBiomeLabelById: () => null,
    });

    expect(markdown).toContain('# Demo Pack — Demo pubblico');
    expect(markdown).toContain('Biomi selezionati: 0');
  });
});
