import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as activityView from '../../../docs/evo-tactics-pack/views/activity.js';

const DEFAULT_TONES = ['info', 'success', 'warn', 'error'];
const TONE_LABELS = {
  info: 'Info',
  success: 'Successo',
  warn: 'Avviso',
  error: 'Errore',
};

function buildHaystack(entry) {
  const parts = [entry.message, entry.action];
  (entry.tags ?? []).forEach((tag) => {
    if (tag?.label) parts.push(tag.label);
  });
  return parts
    .filter((value) => value !== null && value !== undefined && value !== '')
    .join(' ')
    .toLowerCase();
}

function filtersActive(state) {
  const filters = state.activityFilters ?? {};
  if (filters.query) return true;
  if (filters.pinnedOnly) return true;
  if (filters.tags instanceof Set && filters.tags.size > 0) return true;
  if (filters.tones instanceof Set) {
    if (filters.tones.size !== DEFAULT_TONES.length) return true;
    const missing = DEFAULT_TONES.some((tone) => !filters.tones.has(tone));
    if (missing) return true;
  }
  return false;
}

function titleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(
      /(^|\s|[._-])(\p{L})/gu,
      (match, prefix, letter) => `${prefix}${letter.toUpperCase()}`,
    );
}

describe('activity view', () => {
  let state;
  let elements;
  let deps;

  beforeEach(() => {
    document.body.innerHTML = '';
    state = {
      activityLog: [
        {
          id: 'evt-1',
          message: 'Evento principale',
          tone: 'info',
          pinned: true,
          tags: [{ id: 'export', label: 'Export' }],
          action: 'roll-ecos',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'evt-2',
          message: 'Evento secondario',
          tone: 'error',
          pinned: false,
          tags: [{ id: 'misc', label: 'Misc' }],
          action: 'reroll-biomi',
          timestamp: new Date('2024-01-01T11:00:00Z'),
        },
      ],
      activityFilters: {
        query: '',
        pinnedOnly: false,
        tags: new Set(),
        tones: new Set(DEFAULT_TONES),
      },
    };
    elements = {
      logList: document.createElement('ul'),
      logEmpty: document.createElement('p'),
      activitySearch: document.createElement('input'),
      activityTagFilter: document.createElement('select'),
      activityPinnedOnly: document.createElement('input'),
      activityToneToggles: [document.createElement('input'), document.createElement('input')],
      activityReset: document.createElement('button'),
    };
    elements.activitySearch.type = 'search';
    elements.activityPinnedOnly.type = 'checkbox';
    elements.activityToneToggles.forEach((toggle, index) => {
      toggle.type = 'checkbox';
      toggle.value = DEFAULT_TONES[index];
      toggle.dataset.activityTone = DEFAULT_TONES[index];
    });
    const optionExport = document.createElement('option');
    optionExport.value = 'export';
    optionExport.textContent = 'Export';
    optionExport.selected = true;
    elements.activityTagFilter.appendChild(optionExport);
    const optionMisc = document.createElement('option');
    optionMisc.value = 'misc';
    optionMisc.textContent = 'Misc';
    elements.activityTagFilter.appendChild(optionMisc);

    deps = {
      defaultTones: DEFAULT_TONES,
      toneLabels: TONE_LABELS,
      buildActivityHaystack: buildHaystack,
      activityFiltersActive: filtersActive,
      titleCase,
    };
  });

  it('renders filtered activity entries', () => {
    state.activityFilters.query = 'export';
    state.activityFilters.pinnedOnly = true;
    state.activityFilters.tags = new Set(['export']);
    state.activityFilters.tones = new Set(['info']);

    activityView.render(state, elements, deps);

    expect(elements.logList.hidden).toBe(false);
    expect(elements.logList.children).toHaveLength(1);
    const item = elements.logList.firstElementChild;
    expect(item?.dataset.pinned).toBe('true');
    expect(item?.querySelector('.generator-timeline__message')?.textContent).toBe(
      'Evento principale',
    );
    expect(elements.logEmpty.hidden).toBe(true);
  });

  it('wires controls to the provided handlers', () => {
    const renderSpy = vi.fn();
    const resetSpy = vi.fn(() => {
      state.activityFilters.query = '';
      state.activityFilters.pinnedOnly = false;
      state.activityFilters.tags = new Set();
      state.activityFilters.tones = new Set(DEFAULT_TONES);
    });
    const togglePinSpy = vi.fn();
    const getSelectedValues = vi.fn(() => ['export']);

    activityView.setup(state, elements, {
      ...deps,
      render: renderSpy,
      resetFilters: resetSpy,
      togglePin: togglePinSpy,
      getSelectedValues,
    });

    elements.activitySearch.value = 'alpha';
    elements.activitySearch.dispatchEvent(new Event('input', { bubbles: true }));
    expect(state.activityFilters.query).toBe('alpha');

    elements.activityPinnedOnly.checked = true;
    elements.activityPinnedOnly.dispatchEvent(new Event('change', { bubbles: true }));
    expect(state.activityFilters.pinnedOnly).toBe(true);

    elements.activityToneToggles[0].checked = false;
    elements.activityToneToggles[0].dispatchEvent(new Event('change', { bubbles: true }));
    expect(state.activityFilters.tones.has(DEFAULT_TONES[0])).toBe(false);

    elements.activityTagFilter.dispatchEvent(new Event('change', { bubbles: true }));
    expect(getSelectedValues).toHaveBeenCalledTimes(1);
    expect(state.activityFilters.tags.has('export')).toBe(true);

    elements.activityReset.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(resetSpy).toHaveBeenCalledTimes(1);

    const pinButton = document.createElement('button');
    pinButton.dataset.action = 'toggle-activity-pin';
    pinButton.dataset.eventId = 'evt-2';
    elements.logList.appendChild(pinButton);
    pinButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(togglePinSpy).toHaveBeenCalledWith('evt-2');

    // Render should have been triggered for each change event above
    expect(renderSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});
