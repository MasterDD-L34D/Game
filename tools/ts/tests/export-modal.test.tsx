import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import Module from 'node:module';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import React from 'react';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
(globalThis as unknown as { window: Window }).window = dom.window as unknown as Window;
(globalThis as unknown as { document: Document }).document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
(globalThis as unknown as { HTMLElement: typeof HTMLElement }).HTMLElement = dom.window.HTMLElement;

const modulePaths = [
  path.resolve(new URL('.', import.meta.url).pathname, '..', 'node_modules')
];
process.env.NODE_PATH = [
  ...modulePaths,
  process.env.NODE_PATH || ''
]
  .filter(Boolean)
  .join(path.delimiter);
Module.Module._initPaths();

let testingLibraryPromise: Promise<typeof import('@testing-library/react')> | null = null;

function loadTestingLibrary() {
  if (!testingLibraryPromise) {
    testingLibraryPromise = import('@testing-library/react');
  }
  return testingLibraryPromise;
}

afterEach(async () => {
  const { cleanup } = await loadTestingLibrary();
  cleanup();
  dom.window.document.body.innerHTML = '';
});

type RecipientGroupOption = {
  id: string;
  label: string;
  description?: string;
  recipients: string[];
  schedule?: Array<{ label: string; days: string[]; start: string; end: string }>;
  channels?: Record<string, string>;
};

type ExportFilters = {
  recipientGroups: string[];
  statuses: string[];
  onlyWithinSchedule: boolean;
};

const GROUPS: RecipientGroupOption[] = [
  {
    id: 'hud_ops',
    label: 'HUD Ops',
    description: 'Copertura 08:00-20:00',
    recipients: ['HUD', 'pi.balance.alerts'],
    channels: { slack: '#hud-alerts' },
    schedule: [
      { label: 'Mattina', days: ['mon', 'tue'], start: '08:00', end: '14:00' },
      { label: 'Pomeriggio', days: ['mon', 'tue'], start: '14:00', end: '20:00' }
    ]
  },
  {
    id: 'qa_leads',
    label: 'QA Leads',
    description: 'Standup triage',
    recipients: ['qa.lead'],
    schedule: [{ label: 'Feriali', days: ['mon', 'tue', 'wed'], start: '07:30', end: '18:00' }]
  }
];

test('render e applicazione filtri', async () => {
  const { render, screen, fireEvent } = await loadTestingLibrary();
  const { default: ExportModal } = await import('../../../public/analytics/export/ExportModal.tsx');
  let applied: ExportFilters | null = null;
  render(
    <ExportModal
      visible
      recipientGroups={GROUPS}
      onClose={() => undefined}
      onApply={filters => {
        applied = filters;
      }}
    />
  );

  // Tutti i gruppi selezionati di default
  expectChecked(screen, 'Filtra per HUD Ops', true);
  expectChecked(screen, 'Filtra per QA Leads', true);
  expectChecked(screen, 'Includi status open', true);

  // Deseleziona QA Leads
  fireEvent.click(screen.getByLabelText('Filtra per QA Leads'));
  // Rimuovi status "blocked"
  fireEvent.click(screen.getByLabelText('Includi status blocked'));
  // Disattiva guardia oraria
  fireEvent.click(screen.getByLabelText('Limita agli slot di copertura attivi'));

  fireEvent.click(screen.getByTestId('apply-filters'));

  assert.ok(applied, 'Il callback onApply deve essere invocato');
  assert.deepEqual(applied?.recipientGroups.sort(), ['hud_ops']);
  assert.equal(applied?.onlyWithinSchedule, false);
  assert.ok(applied?.statuses.includes('open'));
  assert.ok(!applied?.statuses.includes('blocked'));
});

test('reset ripristina i filtri iniziali', async () => {
  const { render, screen, fireEvent } = await loadTestingLibrary();
  const { default: ExportModal } = await import('../../../public/analytics/export/ExportModal.tsx');
  render(
    <ExportModal
      visible
      recipientGroups={GROUPS}
      initialFilters={{ recipientGroups: ['qa_leads'], statuses: ['open'], onlyWithinSchedule: false }}
      onClose={() => undefined}
      onApply={() => undefined}
    />
  );

  fireEvent.click(screen.getByLabelText('Filtra per HUD Ops'));
  fireEvent.click(screen.getByLabelText('Limita agli slot di copertura attivi'));
  fireEvent.click(screen.getByText('Reset'));

  expectChecked(screen, 'Filtra per HUD Ops', false);
  expectChecked(screen, 'Filtra per QA Leads', true);
  expectChecked(screen, 'Limita agli slot di copertura attivi', false);
});

test('modal invisibile non renderizza DOM', async () => {
  const { render } = await loadTestingLibrary();
  const { default: ExportModal } = await import('../../../public/analytics/export/ExportModal.tsx');
  const { container } = render(
    <ExportModal visible={false} recipientGroups={GROUPS} onClose={() => undefined} onApply={() => undefined} />
  );
  assert.equal(container.innerHTML, '');
});

function expectChecked(
  screenApi: Awaited<ReturnType<typeof loadTestingLibrary>>['screen'],
  label: string,
  expected: boolean
) {
  const element = screenApi.getByLabelText(label) as HTMLInputElement;
  assert.equal(element.checked, expected, `atteso stato ${expected} per ${label}`);
}
