const ISO_HAS_OFFSET = /(?:Z|[+-]\d\d:?\d\d)$/i;

function isValidTimeZone(timeZone) {
  try {
    if (!timeZone) {
      return false;
    }
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return true;
  } catch (error) {
    return false;
  }
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || undefined;
}

function normalizeNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function getTimezoneOffsetMinutes(timeZone, date = new Date()) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return (asUtc - date.getTime()) / 60000;
}

function formatOffset(minutes) {
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  const hours = String(Math.trunc(abs / 60)).padStart(2, '0');
  const mins = String(Math.trunc(abs % 60)).padStart(2, '0');
  return `${sign}${hours}:${mins}`;
}

function formatOffsetIso(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const offsetMinutes = getTimezoneOffsetMinutes(timeZone, date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${formatOffset(
    offsetMinutes,
  )}`;
}

function parseInTimeZone(value, timeZone) {
  if (!isValidTimeZone(timeZone)) {
    return new Date(Number.NaN);
  }
  const [datePart, timePart = '00:00:00'] = String(value).split('T');
  const [year, month, day] = datePart.split('-').map((part) => Number.parseInt(part, 10));
  const [hour = '00', minute = '00', second = '00'] = timePart.split(':');
  const [secondPart, milliPart = '0'] = second.split('.');
  const utc = Date.UTC(
    year,
    (month || 1) - 1,
    day || 1,
    Number.parseInt(hour, 10) || 0,
    Number.parseInt(minute, 10) || 0,
    Number.parseInt(secondPart, 10) || 0,
    Number.parseInt(milliPart, 10) || 0,
  );
  const offset = getTimezoneOffsetMinutes(timeZone, new Date(utc));
  return new Date(utc - offset * 60000);
}

function parseDateInput(value, timeZone) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value);
  }
  if (typeof value === 'string') {
    if (ISO_HAS_OFFSET.test(value)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    if (timeZone) {
      const parsedTz = parseInTimeZone(value, timeZone);
      if (parsedTz && !Number.isNaN(parsedTz.getTime())) {
        return parsedTz;
      }
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function cloneDefinition(definition) {
  return JSON.parse(JSON.stringify(definition ?? {}));
}

function buildPhase(phase, eventStart, defaultTimezone, index = 0) {
  if (!phase || typeof phase !== 'object') {
    return null;
  }
  const timezone = phase.timezone || defaultTimezone;
  if (!isValidTimeZone(timezone)) {
    return null;
  }
  const offsetMinutes = normalizeNumber(phase.offsetMinutes, index === 0 ? 0 : index * 5);
  const start = phase.start
    ? parseDateInput(phase.start, timezone)
    : new Date(eventStart.getTime() + offsetMinutes * 60000);
  if (!start || Number.isNaN(start.getTime())) {
    return null;
  }
  const durationMinutes = normalizeNumber(phase.durationMinutes, 0);
  const end = phase.end
    ? parseDateInput(phase.end, timezone)
    : new Date(start.getTime() + durationMinutes * 60000);
  if (!end || Number.isNaN(end.getTime())) {
    return null;
  }
  const safeDuration = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  return {
    id: String(phase.id ?? phase.key ?? `phase-${index + 1}`),
    label: String(phase.label ?? `Fase ${index + 1}`),
    offsetMinutes: Math.max(0, Math.round((start.getTime() - eventStart.getTime()) / 60000)),
    durationMinutes: safeDuration,
    start,
    end,
    isoStart: start.toISOString(),
    isoEnd: end.toISOString(),
    localStart: formatOffsetIso(start, timezone),
    localEnd: formatOffsetIso(end, timezone),
    timezone,
  };
}

function normalizeEvent(definition, defaultTimezone, source, index = 0) {
  if (!definition || typeof definition !== 'object') {
    return null;
  }
  const timezone = definition.timezone || defaultTimezone;
  if (!isValidTimeZone(timezone)) {
    return null;
  }
  const start = parseDateInput(definition.start, timezone);
  if (!start || Number.isNaN(start.getTime())) {
    return null;
  }
  const hasEnd = definition.end !== undefined && definition.end !== null;
  let end = hasEnd ? parseDateInput(definition.end, timezone) : null;
  const durationMinutes = normalizeNumber(definition.durationMinutes, NaN);
  if ((!end || Number.isNaN(end.getTime())) && Number.isFinite(durationMinutes)) {
    end = new Date(start.getTime() + Math.max(0, durationMinutes) * 60000);
  }
  if (!end || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return null;
  }
  const effectiveDurationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const phases = Array.isArray(definition.phases)
    ? definition.phases
        .map((phase, phaseIndex) => buildPhase(phase, start, timezone, phaseIndex))
        .filter(Boolean)
        .sort((a, b) => a.start.getTime() - b.start.getTime())
    : [];

  const tags = Array.isArray(definition.tags) ? definition.tags.map((tag) => String(tag)) : undefined;
  const metadata = definition.metadata && typeof definition.metadata === 'object' ? { ...definition.metadata } : undefined;

  const title = definition.title || definition.name || `Evento ${index + 1}`;
  const id = String(definition.id ?? slugify(title) ?? `event-${index + 1}`);

  return {
    id,
    title: String(title),
    timezone,
    start,
    end,
    isoStart: start.toISOString(),
    isoEnd: end.toISOString(),
    localStart: formatOffsetIso(start, timezone),
    localEnd: formatOffsetIso(end, timezone),
    durationMinutes: effectiveDurationMinutes,
    metadata,
    tags,
    phases,
    source,
  };
}

function serializeEvent(event) {
  return {
    id: event.id,
    title: event.title,
    timezone: event.timezone,
    isoStart: event.isoStart,
    isoEnd: event.isoEnd,
    localStart: event.localStart,
    localEnd: event.localEnd,
    durationMinutes: event.durationMinutes,
    metadata: event.metadata ? { ...event.metadata } : undefined,
    tags: event.tags ? [...event.tags] : undefined,
    phases: event.phases.map((phase) => ({
      id: phase.id,
      label: phase.label,
      offsetMinutes: phase.offsetMinutes,
      durationMinutes: phase.durationMinutes,
      isoStart: phase.isoStart,
      isoEnd: phase.isoEnd,
      localStart: phase.localStart,
      localEnd: phase.localEnd,
      timezone: phase.timezone,
    })),
    source: event.source,
  };
}

function normalizeEvents(definitions, timezone, source, allowUtcFallback = false) {
  return definitions
    .map((definition, index) => {
      const timezoneValid = isValidTimeZone(timezone);
      const candidateTimezone =
        definition?.timezone || (timezoneValid ? timezone : allowUtcFallback ? 'UTC' : timezone);
      return normalizeEvent(definition, candidateTimezone, source, index);
    })
    .filter(Boolean)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function createEventsScheduler(options = {}) {
  let timezone =
    typeof options.timezone === 'string' && options.timezone.trim() ? options.timezone.trim() : 'UTC';
  let timezoneValid = isValidTimeZone(timezone);
  let now = typeof options.now === 'function' ? options.now : () => new Date();
  let baseDefinitions = Array.isArray(options.events) ? options.events.map(cloneDefinition) : [];
  let fallbackDefinitions = Array.isArray(options.manualFallback)
    ? options.manualFallback.map(cloneDefinition)
    : [];

  let events = normalizeEvents(baseDefinitions, timezone, 'primary', false);
  let fallbackEvents = normalizeEvents(fallbackDefinitions, timezone, 'manualFallback', true);

  const usingFallback = () =>
    (!timezoneValid && fallbackEvents.length > 0) || (events.length === 0 && fallbackEvents.length > 0);
  const dataset = () => (usingFallback() ? fallbackEvents : events);

  function refresh() {
    events = normalizeEvents(baseDefinitions, timezone, 'primary', false);
    fallbackEvents = normalizeEvents(fallbackDefinitions, timezone, 'manualFallback', true);
    timezoneValid = isValidTimeZone(timezone);
  }

  function resolveDate(value) {
    const parsed = parseDateInput(value, timezone);
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }

  return {
    load(definitions = []) {
      baseDefinitions = Array.isArray(definitions) ? definitions.map(cloneDefinition) : [];
      refresh();
      return this;
    },
    setManualFallback(definitions = []) {
      fallbackDefinitions = Array.isArray(definitions) ? definitions.map(cloneDefinition) : [];
      refresh();
      return this;
    },
    setTimezone(value) {
      timezone = value && value.toString().trim() ? value.toString().trim() : 'UTC';
      timezoneValid = isValidTimeZone(timezone);
      refresh();
      return this;
    },
    getTimezone() {
      return timezone;
    },
    getTimeline({ from, to, includePast = true } = {}) {
      const fromDate = from ? resolveDate(from) : null;
      const toDate = to ? resolveDate(to) : null;
      let result = dataset();
      if (fromDate) {
        result = result.filter((event) => event.end.getTime() >= fromDate.getTime());
      }
      if (toDate) {
        result = result.filter((event) => event.start.getTime() <= toDate.getTime());
      }
      if (!includePast) {
        const nowDate = now();
        result = result.filter((event) => event.end.getTime() >= nowDate.getTime());
      }
      return result.map(serializeEvent);
    },
    getActiveEvents(reference) {
      const ref = reference ? resolveDate(reference) : now();
      if (!ref || Number.isNaN(ref.getTime())) {
        return [];
      }
      return dataset()
        .filter((event) => event.start.getTime() <= ref.getTime() && ref.getTime() < event.end.getTime())
        .map(serializeEvent);
    },
    getNextEvent(reference) {
      const ref = reference ? resolveDate(reference) : now();
      if (!ref || Number.isNaN(ref.getTime())) {
        return null;
      }
      const next = dataset()
        .filter((event) => event.start.getTime() > ref.getTime())
        .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
      return next ? serializeEvent(next) : null;
    },
    isUsingFallback() {
      return usingFallback();
    },
    toJSON() {
      return {
        timezone,
        events: events.map(serializeEvent),
        manualFallback: fallbackEvents.map(serializeEvent),
      };
    },
  };
}

export function buildEventTimeline(events, options) {
  return createEventsScheduler(options).load(events).getTimeline();
}

export default createEventsScheduler;
