import { createEventsScheduler } from '../../../services/eventsScheduler/index.js';
import { createTimelinePreview } from './timelinePreview.js';

const scheduler = createEventsScheduler({ timezone: 'UTC' });
const timeline = createTimelinePreview(document.querySelector('[data-timeline]'));

const state = {
  events: [],
  manualFallback: [],
  editingId: null,
};

const eventForm = document.querySelector('[data-event-form]');
const phaseList = document.querySelector('[data-phase-list]');
const addPhaseButton = document.querySelector('[data-add-phase]');
const resetButton = document.querySelector('[data-reset-form]');
const eventsList = document.querySelector('[data-events-list]');
const fallbackForm = document.querySelector('[data-fallback-form]');
const fallbackList = document.querySelector('[data-fallback-list]');
const fallbackClearButton = document.querySelector('[data-clear-fallback]');
const timezoneInput = document.querySelector('[data-scheduler-timezone]');
const exportButton = document.querySelector('[data-export-json]');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

function generateEventId(event) {
  if (event.id && event.id.trim()) {
    return event.id.trim();
  }
  const fromTitle = slugify(event.title);
  if (fromTitle) {
    return fromTitle;
  }
  return `event-${Date.now()}`;
}

function createPhaseRow(phase = {}) {
  const template = document.getElementById('phase-row-template');
  const fragment = template.content.cloneNode(true);
  const row = fragment.querySelector('.phase-row');
  const labelInput = fragment.querySelector('[data-phase-label]');
  const offsetInput = fragment.querySelector('[data-phase-offset]');
  const durationInput = fragment.querySelector('[data-phase-duration]');
  const removeButton = fragment.querySelector('[data-remove-phase]');

  const phaseId = phase.id || `phase-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  row.dataset.phaseId = phaseId;
  labelInput.value = phase.label || '';
  offsetInput.value = phase.offsetMinutes ?? 0;
  durationInput.value = phase.durationMinutes ?? 15;

  removeButton.addEventListener('click', () => {
    row.remove();
    refreshPreview();
  });

  return row;
}

function resetPhaseList(phases = []) {
  phaseList.innerHTML = '';
  if (!phases.length) {
    phases = [
      { label: 'Preparazione', offsetMinutes: 0, durationMinutes: 15 },
      { label: 'Climax', offsetMinutes: 30, durationMinutes: 30 },
    ];
  }
  phases.forEach((phase) => {
    phaseList.append(createPhaseRow(phase));
  });
}

function readPhases() {
  return Array.from(phaseList.querySelectorAll('.phase-row'))
    .map((row, index) => {
      const labelInput = row.querySelector('[data-phase-label]');
      const offsetInput = row.querySelector('[data-phase-offset]');
      const durationInput = row.querySelector('[data-phase-duration]');
      const label = labelInput.value.trim() || `Fase ${index + 1}`;
      const offsetMinutes = Math.max(0, Math.round(parseNumber(offsetInput.value, index * 10)));
      const durationMinutes = Math.max(5, Math.round(parseNumber(durationInput.value, 10)));
      return {
        id: row.dataset.phaseId || `phase-${index + 1}`,
        label,
        offsetMinutes,
        durationMinutes,
      };
    })
    .filter((phase) => Boolean(phase));
}

function formToEvent() {
  const data = new FormData(eventForm);
  const description = data.get('description')?.toString().trim();
  const rewards = data
    .get('rewards')
    ?.toString()
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const tags = data
    .get('tags')
    ?.toString()
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const event = {
    id: data.get('eventId')?.toString().trim() || undefined,
    title: data.get('title')?.toString().trim() || 'Evento senza titolo',
    start: data.get('start')?.toString(),
    durationMinutes: Math.max(15, Math.round(parseNumber(data.get('duration'), 60))),
    timezone: data.get('timezone')?.toString().trim() || undefined,
    metadata: {},
  };

  const phases = readPhases();
  if (phases.length) {
    event.phases = phases;
  }
  if (description) {
    event.metadata.description = description;
  }
  if (rewards?.length) {
    event.metadata.rewards = rewards;
  }
  if (tags?.length) {
    event.tags = tags;
  }
  if (event.metadata && Object.keys(event.metadata).length === 0) {
    delete event.metadata;
  }

  return event;
}

function fillForm(event) {
  eventForm.querySelector('[name="title"]').value = event.title || '';
  eventForm.querySelector('[name="eventId"]').value = event.id || '';
  eventForm.querySelector('[name="start"]').value = event.start || '';
  eventForm.querySelector('[name="duration"]').value = event.durationMinutes ?? 60;
  eventForm.querySelector('[name="timezone"]').value = event.timezone || '';
  eventForm.querySelector('[name="description"]').value = event.metadata?.description || '';
  eventForm.querySelector('[name="rewards"]').value = Array.isArray(event.metadata?.rewards)
    ? event.metadata.rewards.join(', ')
    : event.metadata?.rewards || '';
  eventForm.querySelector('[name="tags"]').value = Array.isArray(event.tags)
    ? event.tags.join(', ')
    : event.tags || '';
  resetPhaseList(event.phases || []);
  state.editingId = event.id;
}

function resetForm() {
  eventForm.reset();
  state.editingId = null;
  resetPhaseList();
}

function renderEventsList() {
  eventsList.innerHTML = '';
  if (!state.events.length) {
    const empty = document.createElement('p');
    empty.className = 'events-list__meta';
    empty.textContent = 'Nessun evento programmato. Salva dal form per aggiungerlo alla timeline.';
    eventsList.append(empty);
    return;
  }

  state.events
    .slice()
    .sort((a, b) => (a.start || '').localeCompare(b.start || ''))
    .forEach((event) => {
      const item = document.createElement('article');
      item.className = 'events-list__item';

      const header = document.createElement('div');
      header.className = 'events-list__header';

      const title = document.createElement('h3');
      title.className = 'events-list__title';
      title.textContent = event.title;
      header.append(title);

      const actions = document.createElement('div');
      actions.className = 'events-list__actions';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'ghost-button';
      editButton.textContent = 'Modifica';
      editButton.addEventListener('click', () => {
        fillForm(event);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      actions.append(editButton);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'ghost-button';
      removeButton.textContent = 'Rimuovi';
      removeButton.addEventListener('click', () => {
        state.events = state.events.filter((existing) => existing.id !== event.id);
        refreshPreview();
        renderEventsList();
      });
      actions.append(removeButton);

      header.append(actions);
      item.append(header);

      const meta = document.createElement('p');
      meta.className = 'events-list__meta';
      meta.textContent = `${event.start || '—'} · ${event.durationMinutes} min · ${
        event.timezone || 'timezone ereditato'
      }`;
      item.append(meta);

      if (event.phases?.length) {
        const phasesInfo = document.createElement('p');
        phasesInfo.className = 'events-list__meta';
        phasesInfo.textContent = `${event.phases.length} fasi configurate.`;
        item.append(phasesInfo);
      }

      eventsList.append(item);
    });
}

function renderFallbackList() {
  fallbackList.innerHTML = '';
  if (!state.manualFallback.length) {
    const empty = document.createElement('p');
    empty.className = 'events-list__meta';
    empty.textContent = 'Nessun fallback impostato.';
    fallbackList.append(empty);
    return;
  }

  state.manualFallback.forEach((event) => {
    const item = document.createElement('article');
    item.className = 'events-list__item';

    const header = document.createElement('div');
    header.className = 'events-list__header';

    const title = document.createElement('h3');
    title.className = 'events-list__title';
    title.textContent = event.title;
    header.append(title);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'ghost-button';
    removeButton.textContent = 'Rimuovi';
    removeButton.addEventListener('click', () => {
      state.manualFallback = state.manualFallback.filter((existing) => existing.id !== event.id);
      refreshPreview();
      renderFallbackList();
    });

    const meta = document.createElement('p');
    meta.className = 'events-list__meta';
    meta.textContent = `${event.start || '—'} · ${event.durationMinutes} min · ${
      event.timezone || 'UTC'
    }`;

    header.append(removeButton);
    item.append(header);
    item.append(meta);

    fallbackList.append(item);
  });
}

function refreshPreview() {
  const timezone = timezoneInput.value?.trim() || 'UTC';
  scheduler.setTimezone(timezone);
  scheduler.load(state.events);
  scheduler.setManualFallback(state.manualFallback);
  const timelineData = scheduler.getTimeline();
  timeline.render(timelineData, {
    usingFallback: scheduler.isUsingFallback(),
    timezone: scheduler.getTimezone(),
  });
}

function handleEventSubmit(event) {
  event.preventDefault();
  const payload = formToEvent();
  payload.id = generateEventId(payload);

  if (!payload.start) {
    alert("Specifica un orario di inizio valido per l'evento.");
    return;
  }

  const existingIndex = state.events.findIndex((item) => item.id === payload.id);
  if (existingIndex >= 0) {
    state.events[existingIndex] = { ...state.events[existingIndex], ...payload };
  } else {
    state.events.push(payload);
  }

  resetForm();
  renderEventsList();
  refreshPreview();
}

function handleFallbackSubmit(event) {
  event.preventDefault();
  const data = new FormData(fallbackForm);
  const fallback = {
    id: data.get('fallbackId')?.toString().trim() || undefined,
    title: data.get('fallbackTitle')?.toString().trim() || 'Fallback',
    start: data.get('fallbackStart')?.toString(),
    durationMinutes: Math.max(15, Math.round(parseNumber(data.get('fallbackDuration'), 60))),
    timezone: data.get('fallbackTimezone')?.toString().trim() || undefined,
  };

  fallback.id = fallback.id || `${slugify(fallback.title)}-fallback`;

  if (!fallback.start) {
    alert('Imposta una data di inizio valida per il fallback.');
    return;
  }

  const existingIndex = state.manualFallback.findIndex((item) => item.id === fallback.id);
  if (existingIndex >= 0) {
    state.manualFallback[existingIndex] = { ...state.manualFallback[existingIndex], ...fallback };
  } else {
    state.manualFallback.push(fallback);
  }

  fallbackForm.reset();
  renderFallbackList();
  refreshPreview();
}

function handleClearFallback() {
  state.manualFallback = [];
  renderFallbackList();
  refreshPreview();
}

function handleExport() {
  const payload = scheduler.toJSON();
  const json = JSON.stringify(payload, null, 2);

  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(json)
      .then(() => {
        alert('Configurazione copiata negli appunti.');
      })
      .catch(() => {
        window.open()?.document.write(`<pre>${json.replace(/</g, '&lt;')}</pre>`);
      });
  } else {
    window.open()?.document.write(`<pre>${json.replace(/</g, '&lt;')}</pre>`);
  }
}

addPhaseButton?.addEventListener('click', () => {
  phaseList.append(createPhaseRow());
});

resetButton?.addEventListener('click', () => {
  resetForm();
});

eventForm?.addEventListener('submit', handleEventSubmit);
fallbackForm?.addEventListener('submit', handleFallbackSubmit);
fallbackClearButton?.addEventListener('click', handleClearFallback);
timezoneInput?.addEventListener('change', refreshPreview);
exportButton?.addEventListener('click', handleExport);

if (timezoneInput && !timezoneInput.value) {
  timezoneInput.value = scheduler.getTimezone();
}

resetPhaseList();
renderEventsList();
renderFallbackList();
refreshPreview();
