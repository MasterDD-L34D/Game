import React, { useCallback, useEffect, useMemo, useState } from 'react';

export type RecipientScheduleWindow = {
  label: string;
  days: string[];
  start: string;
  end: string;
};

export type RecipientGroupOption = {
  id: string;
  label: string;
  description?: string;
  recipients: string[];
  schedule?: RecipientScheduleWindow[];
  channels?: Record<string, string>;
};

export type ExportFilters = {
  recipientGroups: string[];
  statuses: string[];
  onlyWithinSchedule: boolean;
};

type ExportModalProps = {
  visible: boolean;
  title?: string;
  recipientGroups: RecipientGroupOption[];
  initialFilters?: Partial<ExportFilters>;
  onClose: () => void;
  onApply: (filters: ExportFilters) => void;
};

const STATUS_OPTIONS = ['open', 'triaged', 'in_progress', 'blocked', 'resolved', 'closed'];

function normalizeIds(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

function sortNormalizedIds(values: string[]): string[] {
  return [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function buildTelemetryFilters(
  recipientGroups: string[],
  statuses: string[],
  onlyWithinSchedule: boolean
): ExportFilters {
  return {
    recipientGroups: sortNormalizedIds(normalizeIds(recipientGroups)),
    statuses: sortNormalizedIds(normalizeIds(statuses)),
    onlyWithinSchedule
  };
}

type TelemetryClient = {
  record?: (event: string, payload: unknown) => void;
  track?: (event: string, payload: unknown) => void;
};

declare global {
  interface Window {
    __ANALYTICS_TELEMETRY__?: TelemetryClient;
  }
}

function emitTelemetryEvent(event: string, filters: ExportFilters, meta: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const payload = {
    event,
    source: 'analytics.export_modal',
    timestamp,
    filters,
    context: meta
  };

  if (typeof window !== 'undefined') {
    const client = window.__ANALYTICS_TELEMETRY__;
    const handler = client?.record ?? client?.track;
    if (typeof handler === 'function') {
      try {
        handler.call(client, event, payload);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Telemetry] errore invio handler personalizzato', error);
        }
      }
    }

    const serialized = JSON.stringify(payload);
    const endpointPath = '/api/analytics/telemetry';
    let endpoint: string | null = null;
    if (typeof window.location === 'object' && typeof window.location.origin === 'string') {
      const origin = window.location.origin;
      if (origin && origin !== 'null') {
        try {
          endpoint = new URL(endpointPath, origin).toString();
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[Telemetry] URL non valida, skip invio', error);
          }
        }
      }
    }
    if (!endpoint && typeof window !== 'undefined' && typeof window.location === 'undefined') {
      endpoint = endpointPath;
    }
    if (endpoint) {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          const blob = new Blob([serialized], { type: 'application/json' });
          navigator.sendBeacon(endpoint, blob);
        } else if (typeof fetch === 'function') {
          void fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: serialized,
            keepalive: true
          }).catch(error => {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[Telemetry] errore fetch', error);
            }
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Telemetry] errore invio network', error);
        }
      }
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.debug(`[Telemetry] ${event}`, payload);
  }
}

function computeDefaultFilters(
  groups: RecipientGroupOption[],
  initial?: Partial<ExportFilters>
): ExportFilters {
  const allGroupIds = normalizeIds(groups.map(group => group.id));
  const allStatuses = [...STATUS_OPTIONS];
  return {
    recipientGroups: normalizeIds(initial?.recipientGroups || allGroupIds),
    statuses: normalizeIds(initial?.statuses || allStatuses),
    onlyWithinSchedule:
      typeof initial?.onlyWithinSchedule === 'boolean' ? initial.onlyWithinSchedule : true
  };
}

export function formatScheduleWindow(window: RecipientScheduleWindow): string {
  const days = Array.isArray(window.days) ? window.days.join(', ') : '';
  return `${window.start} → ${window.end}${days ? ` · ${days}` : ''}`;
}

const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  title = 'Telemetry export',
  recipientGroups,
  initialFilters,
  onClose,
  onApply
}) => {
  const defaultFilters = useMemo(
    () => computeDefaultFilters(recipientGroups, initialFilters),
    [recipientGroups, initialFilters]
  );

  const [selectedGroups, setSelectedGroups] = useState<string[]>(defaultFilters.recipientGroups);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(defaultFilters.statuses);
  const [onlyWithinSchedule, setOnlyWithinSchedule] = useState<boolean>(
    defaultFilters.onlyWithinSchedule
  );

  const logFiltersTelemetry = useCallback(
    (
      eventName: string,
      groups: string[],
      statuses: string[],
      withinSchedule: boolean,
      meta: Record<string, unknown>
    ) => {
      const filters = buildTelemetryFilters(groups, statuses, withinSchedule);
      emitTelemetryEvent(eventName, filters, {
        availableRecipientGroups: recipientGroups.length,
        availableStatuses: STATUS_OPTIONS.length,
        ...meta
      });
    },
    [recipientGroups.length]
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    setSelectedGroups(defaultFilters.recipientGroups);
    setSelectedStatuses(defaultFilters.statuses);
    setOnlyWithinSchedule(defaultFilters.onlyWithinSchedule);
    logFiltersTelemetry(
      'analytics.export.modal_opened',
      defaultFilters.recipientGroups,
      defaultFilters.statuses,
      defaultFilters.onlyWithinSchedule,
      { preset: initialFilters ? 'custom' : 'default' }
    );
  }, [visible, defaultFilters, initialFilters, logFiltersTelemetry]);

  if (!visible) {
    return null;
  }

  const toggleGroup = (groupId: string) => {
    const exists = selectedGroups.includes(groupId);
    const nextGroups = exists
      ? selectedGroups.filter(item => item !== groupId)
      : [...selectedGroups, groupId];

    setSelectedGroups(nextGroups);
    logFiltersTelemetry('analytics.export.recipient_toggle', nextGroups, selectedStatuses, onlyWithinSchedule, {
      groupId,
      action: exists ? 'removed' : 'added'
    });
  };

  const toggleStatus = (status: string) => {
    const exists = selectedStatuses.includes(status);
    const nextStatuses = exists
      ? selectedStatuses.filter(item => item !== status)
      : [...selectedStatuses, status];

    setSelectedStatuses(nextStatuses);
    logFiltersTelemetry('analytics.export.status_toggle', selectedGroups, nextStatuses, onlyWithinSchedule, {
      status,
      action: exists ? 'removed' : 'added'
    });
  };

  const handleReset = () => {
    setSelectedGroups(defaultFilters.recipientGroups);
    setSelectedStatuses(defaultFilters.statuses);
    setOnlyWithinSchedule(defaultFilters.onlyWithinSchedule);
    logFiltersTelemetry(
      'analytics.export.filters_reset',
      defaultFilters.recipientGroups,
      defaultFilters.statuses,
      defaultFilters.onlyWithinSchedule,
      { reason: 'user_action' }
    );
  };

  const handleApply = () => {
    const filters = {
      recipientGroups: normalizeIds(selectedGroups),
      statuses: normalizeIds(selectedStatuses),
      onlyWithinSchedule
    };
    logFiltersTelemetry('analytics.export.filters_applied', filters.recipientGroups, filters.statuses, filters.onlyWithinSchedule, {
      selectedRecipientCount: filters.recipientGroups.length,
      selectedStatusCount: filters.statuses.length
    });
    onApply(filters);
  };

  const handleScheduleToggle = (checked: boolean) => {
    setOnlyWithinSchedule(checked);
    logFiltersTelemetry('analytics.export.schedule_toggle', selectedGroups, selectedStatuses, checked, {
      action: checked ? 'enabled' : 'disabled'
    });
  };

  return (
    <div className="export-modal" role="presentation">
      <div className="export-modal__backdrop" aria-hidden="true" />
      <div
        className="export-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
      >
        <header className="export-modal__header">
          <h2 id="export-modal-title">{title}</h2>
          <button type="button" className="export-modal__close" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </header>

        <section className="export-modal__section" aria-labelledby="export-modal-settings">
          <h3 id="export-modal-settings">Filter settings</h3>
          <div className="export-modal__section-description">
            Seleziona i gruppi destinatari e gli status delle segnalazioni da includere nell'export.
          </div>

          <div className="export-modal__filters">
            <div className="export-modal__filter-group" data-testid="recipient-filter">
              <h4>Recipient groups</h4>
              {recipientGroups.length === 0 ? (
                <p className="export-modal__empty">Nessun gruppo destinatario configurato.</p>
              ) : (
                <ul className="export-modal__list">
                  {recipientGroups.map(group => {
                    const checked = selectedGroups.includes(group.id);
                    return (
                      <li key={group.id} className="export-modal__list-item">
                        <label className="export-modal__checkbox">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleGroup(group.id)}
                            aria-label={`Filtra per ${group.label}`}
                          />
                          <span className="export-modal__label">
                            <strong>{group.label}</strong>
                            {group.description ? (
                              <span className="export-modal__description">{group.description}</span>
                            ) : null}
                            <span className="export-modal__meta">
                              Destinatari: {group.recipients.join(', ')}
                            </span>
                            {group.channels && Object.keys(group.channels).length > 0 ? (
                              <span className="export-modal__meta">
                                Canali:{' '}
                                {Object.entries(group.channels)
                                  .map(([channel, value]) => `${channel}: ${value}`)
                                  .join(', ')}
                              </span>
                            ) : null}
                            {group.schedule && group.schedule.length > 0 ? (
                              <ul className="export-modal__schedule">
                                {group.schedule.map(window => (
                                  <li key={`${group.id}-${window.label}`}>{formatScheduleWindow(window)}</li>
                                ))}
                              </ul>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="export-modal__filter-group" data-testid="status-filter">
              <h4>Status</h4>
              <ul className="export-modal__list export-modal__list--inline">
                {STATUS_OPTIONS.map(status => (
                  <li key={status}>
                    <label className="export-modal__checkbox">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status)}
                        onChange={() => toggleStatus(status)}
                        aria-label={`Includi status ${status}`}
                      />
                      <span className="export-modal__label">{status}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="export-modal__filter-group" data-testid="schedule-filter">
              <h4>Schedule guard</h4>
              <label className="export-modal__checkbox">
                <input
                  type="checkbox"
                  checked={onlyWithinSchedule}
                  onChange={event => handleScheduleToggle(event.target.checked)}
                  aria-label="Limita agli slot di copertura attivi"
                />
                <span className="export-modal__label">
                  Limita agli slot di copertura definiti in recipients.yaml
                </span>
              </label>
              <p className="export-modal__hint">
                Deseleziona per includere anche gli alert inviati fuori finestra (es. emergenze notturne).
              </p>
            </div>
          </div>
        </section>

        <footer className="export-modal__footer">
          <button type="button" className="export-modal__button" onClick={handleReset}>
            Reset
          </button>
          <button type="button" className="export-modal__button" onClick={onClose}>
            Annulla
          </button>
          <button
            type="button"
            className="export-modal__button export-modal__button--primary"
            onClick={handleApply}
            data-testid="apply-filters"
          >
            Applica filtri
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ExportModal;
