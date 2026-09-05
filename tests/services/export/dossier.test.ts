import test from 'node:test';
import assert from 'node:assert/strict';

// Simple polyfill for DOMParser
class DOMParserMock {
  parseFromString(string, type) {
    const doc: any = {
      _slots: new Map(),
      querySelector: function (selector) {
        if (!this._slots.has(selector)) {
          this._slots.set(selector, { textContent: '' });
        }
        return this._slots.get(selector);
      },
      querySelectorAll: function (selector) {
        return [];
      },
      createElement: function (tag) {
        return { appendChild: () => {}, classList: { add: () => {} } };
      },
      documentElement: {
        get outerHTML() {
          const heading = doc._slots.get('[data-slot="heading"]')?.textContent || '';
          return `<html><body><div data-slot="heading">${heading}</div></body></html>`;
        },
      },
    };
    return doc;
  }
}
global.DOMParser = DOMParserMock as any;

import { generateDossierHtml, type DossierContext } from '../../../services/export/dossier.ts';

test('generateDossierHtml generates HTML string given valid template and context', async () => {
  const context: DossierContext = {
    slug: 'demo-pack',
    folder: 'demo',
    ecosystemLabel: 'Test Ecosystem',
    metrics: { biomeCount: 0, speciesCount: 0, seedCount: 0 },
    payload: {},
    activityEntries: [],
    biomes: [],
    speciesBuckets: {},
    seeds: [],
    pinnedEntries: [],
    generatedAt: new Date('2023-01-01T00:00:00.000Z'),
  };

  const helpers = {
    templateLoader: async () => '<html><body><div data-slot="heading"></div></body></html>',
    presetLabel: 'Internal',
    roleLabels: {},
    titleCase: (value: string) => value,
    findBiomeLabelById: () => null,
  } as any;

  const html = await generateDossierHtml(context, helpers);

  assert.ok(html?.startsWith('<!DOCTYPE html>'));
  assert.ok(html?.includes('<div data-slot="heading">Test Ecosystem</div>'));
});

test('generateDossierHtml returns null if templateLoader returns null', async () => {
  const context = {} as any;
  const helpers = {
    templateLoader: async () => null,
  } as any;

  const html = await generateDossierHtml(context, helpers);

  assert.equal(html, null);
});
