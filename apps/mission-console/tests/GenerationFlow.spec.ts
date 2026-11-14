import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SpeciesPanel from '../src/components/SpeciesPanel.vue';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function orchestrateSpecies() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const scriptPath = path.resolve(repoRoot, 'services', 'generation', 'orchestrator.py');
  const payload = {
    trait_ids: ['artigli_sette_vie', 'coda_frusta_cinetica', 'scheletro_idro_regolante'],
    seed: 321,
    base_name: 'Predatore Snapshot',
    biome_id: 'caverna_risonante',
  };
  const pythonExecutable = process.env.PYTHON || 'python3';
  const result = spawnSync(pythonExecutable, [scriptPath, '--action', 'generate-species'], {
    cwd: repoRoot,
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `orchestrator exited with code ${result.status}`);
  }
  return JSON.parse(result.stdout);
}

function orchestrateSpeciesBatch() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const scriptPath = path.resolve(repoRoot, 'services', 'generation', 'orchestrator.py');
  const payload = {
    batch: [
      {
        trait_ids: ['artigli_sette_vie', 'coda_frusta_cinetica', 'scheletro_idro_regolante'],
        seed: 321,
        base_name: 'Predatore Snapshot',
        biome_id: 'caverna_risonante',
      },
      {
        trait_ids: ['artigli_sette_vie', 'coda_frusta_cinetica'],
        seed: 322,
        base_name: 'Predatore Variant',
        biome_id: 'caverna_risonante',
        fallback_trait_ids: ['scheletro_idro_regolante'],
      },
    ],
  };
  const pythonExecutable = process.env.PYTHON || 'python3';
  const result = spawnSync(pythonExecutable, [scriptPath, '--action', 'generate-species-batch'], {
    cwd: repoRoot,
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `orchestrator exited with code ${result.status}`);
  }
  return JSON.parse(result.stdout);
}

describe('Generation flow orchestrato', () => {
  it('renderizza il blueprint orchestrato', async () => {
    const response = orchestrateSpecies();
    const batch = orchestrateSpeciesBatch();
    const wrapper = mount(SpeciesPanel, {
      props: {
        species: response.blueprint,
        validation: response.validation,
        meta: response.meta,
        previewBatch: batch.results,
        autoPreview: false,
      },
    });

    expect(wrapper.text()).toContain('Predatore Snapshot');
    expect(response.meta.fallback_used).toBe(false);
    expect(Array.isArray(response.validation.messages)).toBe(true);

    const synergyTab = wrapper
      .findAll('button')
      .find((button) => button.text().toLowerCase().includes('sinergie'));
    expect(synergyTab).toBeDefined();
    if (synergyTab) {
      await synergyTab.trigger('click');
    }

    expect(wrapper.text()).toContain('Anteprime sintetiche');
    expect(wrapper.html()).toMatchSnapshot();
  });
});
