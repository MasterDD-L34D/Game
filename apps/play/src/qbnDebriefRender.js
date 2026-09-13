// Sprint 10 (Surface-DEAD #7) — QBN narrative event diegetic render.
//
// Engine LIVE: apps/backend/services/narrative/qbnEngine.js drawEvent picks
// 1 narrative event per debrief based on VC qualities + campaign history.
// Wired in apps/backend/services/rewardEconomy.js buildDebriefSummary →
// debrief response includes `narrative_event: {id, title_it, body_it,
// choices, eligible_count}`.
//
// Surface DEAD pre-Sprint 10: debrief panel non consumava narrative_event
// dal payload. Player non vedeva mai l'evento narrativo selezionato.
//
// Surface NEW: debrief panel mostra un card stile journal con titolo IT +
// body italiano + choice list (se presente). Best-effort fallback: hidden
// se narrative_event mancante o malformato.

'use strict';

// Pure: narrative event payload → HTML card. Ritorna empty string se
// payload non valido (caller dovrà nascondere section).
export function formatNarrativeEventCard(narrativeEvent) {
  if (!narrativeEvent || typeof narrativeEvent !== 'object') return '';
  const id = String(narrativeEvent.id || '').trim();
  const title = String(narrativeEvent.title_it || narrativeEvent.title || '').trim();
  const body = String(narrativeEvent.body_it || narrativeEvent.body || '').trim();
  if (!id && !title && !body) return '';
  const titleHtml = title ? `<div class="db-qbn-title">${escapeHtml(title)}</div>` : '';
  const bodyHtml = body ? `<div class="db-qbn-body">${escapeHtml(body)}</div>` : '';
  const choices = Array.isArray(narrativeEvent.choices) ? narrativeEvent.choices : [];
  const choicesHtml = formatChoices(choices);
  const meta = Number.isFinite(Number(narrativeEvent.eligible_count))
    ? `<div class="db-qbn-meta">${escapeHtml(String(narrativeEvent.eligible_count))} eventi possibili</div>`
    : '';
  return `<div class="db-qbn-event" data-event-id="${escapeHtml(id)}">${titleHtml}${bodyHtml}${choicesHtml}${meta}</div>`;
}

function formatChoices(choices) {
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const items = choices
    .map((c, i) => {
      if (!c || typeof c !== 'object') return '';
      const label = String(c.label_it || c.label || c.id || `Opzione ${i + 1}`).trim();
      const id = String(c.id || `choice_${i}`);
      return `<li class="db-qbn-choice" data-choice-id="${escapeHtml(id)}">${escapeHtml(label)}</li>`;
    })
    .filter(Boolean)
    .join('');
  return items ? `<ul class="db-qbn-choices">${items}</ul>` : '';
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );
}

// Side effect: render narrative event into card container + show/hide
// section parent. Idempotent — sostituisce innerHTML.
//   sectionEl = #db-qbn-section
//   cardEl    = #db-qbn-card
//   payload   = narrative_event object | null
export function renderNarrativeEvent(sectionEl, cardEl, payload) {
  if (!sectionEl || !cardEl) return;
  const html = formatNarrativeEventCard(payload);
  if (!html) {
    sectionEl.style.display = 'none';
    cardEl.innerHTML = '';
    return;
  }
  sectionEl.style.display = '';
  cardEl.innerHTML = html;
}
