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

describe('Generation flow orchestrato', () => {
  it('renderizza il blueprint orchestrato', () => {
    const response = orchestrateSpecies();
    const wrapper = mount(SpeciesPanel, { props: { species: response.blueprint } });

    expect(wrapper.text()).toContain('Predatore Snapshot');
    expect(response.meta.fallback_used).toBe(false);
    expect(Array.isArray(response.validation.messages)).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });
});
