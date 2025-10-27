import React, { useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    if (!visible) {
      return;
    }
    setSelectedGroups(defaultFilters.recipientGroups);
    setSelectedStatuses(defaultFilters.statuses);
    setOnlyWithinSchedule(defaultFilters.onlyWithinSchedule);
  }, [visible, defaultFilters]);

  if (!visible) {
    return null;
  }

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(current => {
      if (current.includes(groupId)) {
        return current.filter(item => item !== groupId);
      }
      return [...current, groupId];
    });
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(current => {
      if (current.includes(status)) {
        return current.filter(item => item !== status);
      }
      return [...current, status];
    });
  };

  const handleReset = () => {
    setSelectedGroups(defaultFilters.recipientGroups);
    setSelectedStatuses(defaultFilters.statuses);
    setOnlyWithinSchedule(defaultFilters.onlyWithinSchedule);
  };

  const handleApply = () => {
    onApply({
      recipientGroups: normalizeIds(selectedGroups),
      statuses: normalizeIds(selectedStatuses),
      onlyWithinSchedule
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
                  onChange={event => setOnlyWithinSchedule(event.target.checked)}
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
