export function setup(state, elements, deps = {}) {
  const triggerRender = () => {
    if (typeof deps.render === 'function') {
      deps.render(state, elements, deps);
    } else {
      render(state, elements, deps);
    }
  };

  if (elements.activitySearch) {
    elements.activitySearch.addEventListener('input', (event) => {
      state.activityFilters = state.activityFilters ?? {};
      state.activityFilters.query = String(event.target.value ?? '');
      triggerRender();
    });
  }

  if (elements.activityTagFilter && typeof deps.getSelectedValues === 'function') {
    elements.activityTagFilter.addEventListener('change', () => {
      const values = new Set(deps.getSelectedValues(elements.activityTagFilter));
      state.activityFilters = state.activityFilters ?? {};
      state.activityFilters.tags = values;
      triggerRender();
    });
  }

  if (elements.activityPinnedOnly) {
    elements.activityPinnedOnly.addEventListener('change', (event) => {
      state.activityFilters = state.activityFilters ?? {};
      state.activityFilters.pinnedOnly = Boolean(event.target.checked);
      triggerRender();
    });
  }

  if (Array.isArray(elements.activityToneToggles)) {
    elements.activityToneToggles.forEach((toggle) => {
      if (!(toggle instanceof HTMLInputElement)) return;
      toggle.addEventListener('change', (event) => {
        const tone = event.target.value || event.target.dataset.activityTone;
        if (!tone) return;
        state.activityFilters = state.activityFilters ?? {};
        if (!(state.activityFilters.tones instanceof Set)) {
          state.activityFilters.tones = new Set(deps.defaultTones ?? []);
        }
        if (event.target.checked) {
          state.activityFilters.tones.add(tone);
        } else {
          state.activityFilters.tones.delete(tone);
        }
        triggerRender();
      });
    });
  }

  if (elements.activityReset && typeof deps.resetFilters === 'function') {
    elements.activityReset.addEventListener('click', (event) => {
      event.preventDefault();
      deps.resetFilters();
    });
  }

  if (elements.logList && typeof deps.togglePin === 'function') {
    elements.logList.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('[data-action="toggle-activity-pin"]');
      if (!(button instanceof HTMLElement)) return;
      event.preventDefault();
      const { eventId } = button.dataset;
      if (!eventId) return;
      deps.togglePin(eventId);
    });
  }

  syncControls(state, elements, deps);
}

export function render(state, elements, deps = {}) {
  const list = elements.logList;
  const empty = elements.logEmpty;
  if (!list) return;

  list.innerHTML = '';
  const entries = Array.isArray(state.activityLog) ? state.activityLog : [];
  const filters = state.activityFilters ?? {};
  const defaultTones = Array.isArray(deps.defaultTones) ? deps.defaultTones : [];
  const toneFilterActive = filters.tones instanceof Set;
  const toneSet = toneFilterActive ? filters.tones : new Set(defaultTones);
  const tagSet = filters.tags instanceof Set ? filters.tags : new Set();
  const query = String(filters.query ?? '')
    .trim()
    .toLowerCase();
  const pinnedOnly = Boolean(filters.pinnedOnly);

  const buildHaystack =
    typeof deps.buildActivityHaystack === 'function' ? deps.buildActivityHaystack : () => '';
  const toTitleCase = typeof deps.titleCase === 'function' ? deps.titleCase : (value) => value;
  const toneLabels = deps.toneLabels && typeof deps.toneLabels === 'object' ? deps.toneLabels : {};

  const filtered = entries.filter((entry) => {
    const tone = entry.tone ?? 'info';
    if (toneFilterActive) {
      if (!toneSet.size) return false;
      if (!toneSet.has(tone)) return false;
    }
    if (pinnedOnly && !entry.pinned) {
      return false;
    }
    if (tagSet.size) {
      const tagIds = (entry.tags ?? []).map((tag) => tag.id);
      if (!tagIds.some((id) => tagSet.has(id))) {
        return false;
      }
    }
    if (query) {
      const haystack = buildHaystack(entry);
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  const hasEntries = filtered.length > 0;
  list.hidden = !hasEntries;
  if (empty) {
    empty.hidden = hasEntries;
    const filtersActive =
      typeof deps.activityFiltersActive === 'function' ? deps.activityFiltersActive(state) : false;
    empty.textContent =
      hasEntries || !filtersActive
        ? 'Nessuna attività registrata.'
        : 'Nessun evento corrisponde ai filtri.';
  }

  if (!hasEntries) {
    return;
  }

  filtered.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'generator-timeline__item';
    item.dataset.tone = entry.tone ?? 'info';
    item.dataset.pinned = entry.pinned ? 'true' : 'false';

    const marker = document.createElement('div');
    marker.className = 'generator-timeline__marker';
    marker.setAttribute('aria-hidden', 'true');
    item.appendChild(marker);

    const content = document.createElement('div');
    content.className = 'generator-timeline__content';
    item.appendChild(content);

    const header = document.createElement('header');
    header.className = 'generator-timeline__header';
    content.appendChild(header);

    const time = document.createElement('time');
    time.className = 'generator-timeline__time';
    const stamp = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp);
    const safeStamp = Number.isNaN(stamp.getTime()) ? new Date() : stamp;
    time.dateTime = safeStamp.toISOString();
    time.textContent = safeStamp.toLocaleString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
    time.title = safeStamp.toLocaleString('it-IT');
    header.appendChild(time);

    const controls = document.createElement('div');
    controls.className = 'generator-timeline__controls';
    header.appendChild(controls);

    const toneBadge = document.createElement('span');
    toneBadge.className = `generator-timeline__tone generator-timeline__tone--${entry.tone ?? 'info'}`;
    toneBadge.textContent = toneLabels[entry.tone ?? 'info'] ?? toTitleCase(entry.tone ?? 'info');
    controls.appendChild(toneBadge);

    const pinButton = document.createElement('button');
    pinButton.type = 'button';
    pinButton.className = 'generator-timeline__pin';
    pinButton.dataset.action = 'toggle-activity-pin';
    pinButton.dataset.eventId = entry.id;
    pinButton.setAttribute('aria-pressed', entry.pinned ? 'true' : 'false');
    pinButton.title = entry.pinned ? 'Rimuovi pin evento' : 'Pin evento';
    pinButton.textContent = entry.pinned ? '📌' : '📍';
    controls.appendChild(pinButton);

    if (entry.action) {
      const meta = document.createElement('p');
      meta.className = 'generator-timeline__meta';
      meta.textContent = toTitleCase(entry.action.replace(/[-_]/g, ' '));
      content.appendChild(meta);
    }

    const messageText = document.createElement('p');
    messageText.className = 'generator-timeline__message';
    messageText.textContent = entry.message;
    content.appendChild(messageText);

    if (entry.tags?.length) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'chip-list chip-list--compact generator-timeline__tags';
      entry.tags.forEach((tag) => {
        if (!tag?.label) return;
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.dataset.tagId = tag.id;
        chip.textContent = tag.label;
        tagsContainer.appendChild(chip);
      });
      if (tagsContainer.childElementCount) {
        content.appendChild(tagsContainer);
      }
    }

    list.appendChild(item);
  });
}

export function syncControls(state, elements, deps = {}) {
  state.activityFilters = state.activityFilters ?? {};
  if (elements.activitySearch) {
    elements.activitySearch.value = state.activityFilters.query ?? '';
  }
  if (elements.activityPinnedOnly) {
    elements.activityPinnedOnly.checked = Boolean(state.activityFilters.pinnedOnly);
  }
  if (Array.isArray(elements.activityToneToggles)) {
    const defaultTones = Array.isArray(deps.defaultTones) ? deps.defaultTones : [];
    elements.activityToneToggles.forEach((toggle) => {
      if (!(toggle instanceof HTMLInputElement)) return;
      const tone = toggle.value || toggle.dataset.activityTone;
      if (!tone) return;
      if (!(state.activityFilters.tones instanceof Set)) {
        state.activityFilters.tones = new Set(defaultTones);
      }
      toggle.checked = state.activityFilters.tones.has(tone);
    });
  }
  if (elements.activityTagFilter) {
    const selected = state.activityFilters.tags ?? new Set();
    Array.from(elements.activityTagFilter.options).forEach((option) => {
      option.selected = selected instanceof Set ? selected.has(option.value) : false;
    });
  }
}
