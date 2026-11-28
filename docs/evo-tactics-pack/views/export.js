export function setup() {}

export function render(state, elements, deps = {}) {
  const container = elements.exportPreview;
  const empty = elements.exportPreviewEmpty;
  if (!container || !empty) return;

  const payload = deps.payload ?? null;
  const hasPayload = Boolean(payload);
  container.hidden = !hasPayload;
  empty.hidden = hasPayload;

  if (!hasPayload) {
    if (elements.exportPreviewJson) elements.exportPreviewJson.textContent = '';
    if (elements.exportPreviewYaml) elements.exportPreviewYaml.textContent = '';
    if (elements.exportPreviewJsonDetails) elements.exportPreviewJsonDetails.open = false;
    if (elements.exportPreviewYamlDetails) elements.exportPreviewYamlDetails.open = false;
    return;
  }

  const jsonDetails = elements.exportPreviewJsonDetails;
  const yamlDetails = elements.exportPreviewYamlDetails;
  const jsonWasOpen = Boolean(jsonDetails?.open);
  const yamlWasOpen = Boolean(yamlDetails?.open);

  if (elements.exportPreviewJson) {
    elements.exportPreviewJson.textContent = JSON.stringify(payload, null, 2);
  }
  if (elements.exportPreviewYaml) {
    if (typeof deps.toYAML === 'function') {
      elements.exportPreviewYaml.textContent = deps.toYAML(payload);
    } else {
      elements.exportPreviewYaml.textContent = '';
    }
  }

  if (jsonDetails) jsonDetails.open = jsonWasOpen;
  if (yamlDetails) yamlDetails.open = yamlWasOpen;
}
