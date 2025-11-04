/// <reference types="vitest" />
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAnchorNavigator } from '../../../docs/evo-tactics-pack/views/anchor.js';

describe('docs generator — anchor navigation integration', () => {
  let anchorNavigator: ReturnType<typeof createAnchorNavigator>;
  let anchorUi: ReturnType<typeof createAnchorFixtures>;

  beforeEach(() => {
    document.body.innerHTML = '';
    anchorNavigator = createAnchorNavigator();
    anchorUi = createAnchorFixtures();
    anchorNavigator.init(anchorUi);
  });

  afterEach(() => {
    anchorNavigator.destroy();
    document.body.innerHTML = '';
  });

  it('synchronises active section with breadcrumb targets and overlay minimap', () => {
    const [primaryBreadcrumb, overlayBreadcrumb] = anchorUi.breadcrumbTargets;

    expect(anchorNavigator.getActiveSection()).toBe('section-alpha');
    expect(primaryBreadcrumb.textContent).toBe('Section Alpha');
    expect(overlayBreadcrumb.textContent).toBe('Section Alpha');

    const overlayMap = anchorUi.minimapContainers[1];
    const initialOverlayItem = overlayMap.querySelector('[data-minimap-item="section-alpha"]');
    expect(initialOverlayItem).toBeTruthy();
    expect(initialOverlayItem?.classList.contains('is-active')).toBe(true);

    anchorNavigator.setActiveSection('section-beta');

    expect(anchorNavigator.getActiveSection()).toBe('section-beta');
    expect(primaryBreadcrumb.textContent).toBe('Section Beta');
    expect(overlayBreadcrumb.textContent).toBe('Section Beta');

    const overlayActive = overlayMap.querySelector('[data-minimap-item="section-beta"]');
    const overlayInactive = overlayMap.querySelector('[data-minimap-item="section-alpha"]');
    expect(overlayActive?.classList.contains('is-active')).toBe(true);
    expect(overlayInactive?.classList.contains('is-active')).toBe(false);
  });

  it('toggles the overlay via codex controls', () => {
    const [toggleButton] = anchorUi.codexToggles;
    const [closeButton] = anchorUi.codexClosers;

    expect(anchorUi.overlay.hidden).toBe(true);
    expect(document.body.classList.contains('codex-open')).toBe(false);

    toggleButton.click();

    expect(anchorUi.overlay.hidden).toBe(false);
    expect(anchorUi.overlay.getAttribute('aria-hidden')).toBe('false');
    expect(document.body.classList.contains('codex-open')).toBe(true);

    closeButton.click();

    expect(anchorUi.overlay.hidden).toBe(true);
    expect(anchorUi.overlay.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.classList.contains('codex-open')).toBe(false);
  });
});

function createAnchorFixtures() {
  const sections = [
    { id: 'section-alpha', label: 'Section Alpha' },
    { id: 'section-beta', label: 'Section Beta' },
  ];

  const anchors: HTMLAnchorElement[] = [];
  const panels: HTMLElement[] = [];

  sections.forEach((section) => {
    const anchor = document.createElement('a');
    anchor.dataset.anchorTarget = section.id;
    anchor.href = `#${section.id}`;
    anchor.textContent = section.label;
    document.body.appendChild(anchor);
    anchors.push(anchor);

    const panel = document.createElement('section');
    panel.dataset.panel = section.id;
    panel.id = section.id;
    panel.textContent = section.label;
    document.body.appendChild(panel);
    panels.push(panel);
  });

  const primaryBreadcrumb = document.createElement('p');
  primaryBreadcrumb.dataset.anchorBreadcrumb = 'true';
  document.body.appendChild(primaryBreadcrumb);

  const minimap = document.createElement('div');
  minimap.dataset.anchorMinimap = 'true';
  document.body.appendChild(minimap);

  const overlay = document.createElement('div');
  overlay.dataset.codexOverlay = 'true';
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');

  const overlayBreadcrumb = document.createElement('p');
  overlayBreadcrumb.dataset.anchorBreadcrumb = 'true';
  overlayBreadcrumb.dataset.breadcrumbMode = 'overlay';
  overlay.appendChild(overlayBreadcrumb);

  const overlayMinimap = document.createElement('div');
  overlayMinimap.dataset.anchorMinimap = 'true';
  overlayMinimap.dataset.minimapMode = 'overlay';
  overlay.appendChild(overlayMinimap);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.dataset.codexClose = 'true';
  overlay.appendChild(closeButton);

  document.body.appendChild(overlay);

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.dataset.codexToggle = 'true';
  document.body.appendChild(toggleButton);

  const breadcrumbTargets = [primaryBreadcrumb, overlayBreadcrumb];
  const minimapContainers = [minimap, overlayMinimap];
  const codexToggles = [toggleButton];
  const codexClosers = [closeButton];

  return {
    anchors,
    panels,
    breadcrumbTargets,
    minimapContainers,
    overlay,
    codexToggles,
    codexClosers,
  } as const;
}
