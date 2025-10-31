function createElement(tag, className, textContent) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (textContent !== undefined && textContent !== null) {
    element.textContent = textContent;
  }
  return element;
}

function formatDuration(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    return '';
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${rest} min`;
}

function formatLocalRange(event) {
  return `${event.localStart} → ${event.localEnd}`;
}

export function createTimelinePreview(root) {
  if (!root) {
    throw new Error('Timeline root non valido');
  }

  return {
    render(events = [], options = {}) {
      const { usingFallback = false, timezone } = options;
      root.innerHTML = '';

      const status = createElement('div', 'timeline-status');
      const summary = createElement('span', 'timeline-status__badge', `${events.length} eventi`);
      status.append(summary);

      const tzLabel = timezone ? `Fuso corrente: ${timezone}` : 'Fuso corrente non definito';
      status.append(createElement('span', 'timeline-status__hint', tzLabel));

      if (usingFallback) {
        status.append(
          createElement(
            'span',
            'timeline-status__warning',
            'Fallback manuale attivo',
          ),
        );
      }

      root.append(status);

      if (!events.length) {
        root.append(
          createElement(
            'div',
            'timeline-empty',
            usingFallback
              ? 'Nessun evento programmato: in uso i fallback manuali disponibili.'
              : 'Aggiungi un evento per popolare la timeline.',
          ),
        );
        return;
      }

      const list = createElement('ol', 'timeline-list');

      events.forEach((event) => {
        const item = createElement('li', `timeline-event timeline-event--${event.source}`);
        const header = createElement('div', 'timeline-event__header');
        const title = createElement('h3', 'timeline-event__title', event.title || event.id);
        header.append(title);

        const sourceBadge = createElement(
          'span',
          `timeline-event__source${event.source === 'manualFallback' ? ' timeline-event__source--fallback' : ''}`,
          event.source === 'manualFallback' ? 'Fallback' : 'Programmato',
        );
        header.append(sourceBadge);
        item.append(header);

        const time = createElement('div', 'timeline-event__time');
        time.append(createElement('span', null, formatLocalRange(event)));
        time.append(createElement('span', null, `Durata · ${formatDuration(event.durationMinutes)}`));
        time.append(createElement('span', null, `Timezone · ${event.timezone}`));
        item.append(time);

        if (event.metadata?.description) {
          item.append(
            createElement(
              'p',
              'timeline-event__metadata',
              event.metadata.description,
            ),
          );
        }

        if (event.tags?.length) {
          item.append(
            createElement(
              'p',
              'timeline-event__metadata',
              `Tag · ${event.tags.join(', ')}`,
            ),
          );
        }

        if (event.metadata?.rewards) {
          const rewards = Array.isArray(event.metadata.rewards)
            ? event.metadata.rewards.join(', ')
            : String(event.metadata.rewards);
          item.append(
            createElement('p', 'timeline-event__metadata', `Ricompense · ${rewards}`),
          );
        }

        if (event.phases?.length) {
          const phasesList = createElement('ul', 'timeline-event__phases');
          event.phases.forEach((phase) => {
            const phaseItem = createElement('li', 'timeline-event__phase');
            phaseItem.append(createElement('strong', null, phase.label));
            phaseItem.append(
              createElement(
                'span',
                null,
                `${phase.localStart} → ${phase.localEnd}`,
              ),
            );
            phaseItem.append(
              createElement(
                'span',
                null,
                `Offset ${phase.offsetMinutes} min · ${formatDuration(phase.durationMinutes)}`,
              ),
            );
            phasesList.append(phaseItem);
          });
          item.append(phasesList);
        }

        list.append(item);
      });

      root.append(list);
    },
  };
}

export default createTimelinePreview;
