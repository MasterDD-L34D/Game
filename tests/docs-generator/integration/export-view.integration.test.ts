import { describe, expect, it } from 'vitest';
import * as exportView from '../../../docs/evo-tactics-pack/views/export.js';

describe('export view', () => {
  it('renders payload preview preserving disclosure state', () => {
    const elements = createElements();
    const payload = { id: 'ecos-1', name: 'Ecosistema' };
    elements.exportPreviewJsonDetails.open = true;
    elements.exportPreviewYamlDetails.open = false;

    exportView.render({}, elements, {
      payload,
      toYAML: () => 'id: ecos-1\nname: Ecosistema',
    });

    expect(elements.exportPreview.hidden).toBe(false);
    expect(elements.exportPreviewEmpty.hidden).toBe(true);
    expect(elements.exportPreviewJson?.textContent).toContain('"id": "ecos-1"');
    expect(elements.exportPreviewYaml?.textContent).toContain('id: ecos-1');
    expect(elements.exportPreviewJsonDetails.open).toBe(true);
    expect(elements.exportPreviewYamlDetails.open).toBe(false);
  });

  it('clears preview when payload is missing', () => {
    const elements = createElements();
    elements.exportPreviewJson.textContent = 'stale';
    elements.exportPreviewYaml.textContent = 'old';
    elements.exportPreviewJsonDetails.open = true;
    elements.exportPreviewYamlDetails.open = true;

    exportView.render({}, elements, { payload: null, toYAML: () => 'unused' });

    expect(elements.exportPreview.hidden).toBe(true);
    expect(elements.exportPreviewEmpty.hidden).toBe(false);
    expect(elements.exportPreviewJson.textContent).toBe('');
    expect(elements.exportPreviewYaml.textContent).toBe('');
    expect(elements.exportPreviewJsonDetails.open).toBe(false);
    expect(elements.exportPreviewYamlDetails.open).toBe(false);
  });
});

function createElements() {
  const container = document.createElement('div');
  const empty = document.createElement('div');
  const json = document.createElement('pre');
  const yaml = document.createElement('pre');
  const jsonDetails = document.createElement('details');
  const yamlDetails = document.createElement('details');
  return {
    exportPreview: container,
    exportPreviewEmpty: empty,
    exportPreviewJson: json,
    exportPreviewYaml: yaml,
    exportPreviewJsonDetails: jsonDetails,
    exportPreviewYamlDetails: yamlDetails,
  };
}
