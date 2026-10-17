import { el } from './dom.js';

export function createFeedbackCard(options, idea) {
  const apiBase = options?.apiBase ? options.apiBase.replace(/\/$/, '') : '';
  const apiToken = options?.apiToken;
  const templateUrl = options?.feedbackTemplateUrl;
  const slackChannel = options?.feedbackChannel ? String(options.feedbackChannel).trim() : '';
  const slackLink = slackChannel ? `https://slack.com/app_redirect?channel=${slackChannel.replace(/^#/, '')}` : '';
  const hasApi = Boolean(apiBase && idea && idea.id);
  if (!hasApi && !slackLink) return null;

  const wrapper = el('div', { class: 'feedback-card' });
  wrapper.appendChild(el('h4', {}, 'Idea Engine Feedback'));

  const introParts = [];
  if (templateUrl) {
    const link = el('a', { href: templateUrl, target: '_blank', rel: 'noreferrer', class: 'feedback-link' }, 'template completo');
    introParts.push('Aiutaci a migliorare il flusso (feedback rapido qui sotto o apri il ', link, ').');
  } else {
    introParts.push('Aiutaci a migliorare il flusso: lascia un commento rapido qui sotto.');
  }
  if (!hasApi && slackChannel) {
    const slackAnchor = el('a', { href: slackLink, target: '_blank', rel: 'noreferrer', class: 'feedback-link' }, slackChannel);
    introParts.push(' Puoi anche aprire ', slackAnchor, ' per discutere follow-up o allegare materiali.');
  }
  wrapper.appendChild(el('p', { class: 'note small' }, introParts));

  if (hasApi) {
    const textarea = el('textarea', { placeholder: 'Cosa ha funzionato? Cosa manca?' });
    const contact = el('input', { type: 'text', placeholder: 'Contatto o handle (opzionale)' });
    const actions = el('div', { class: 'actions' });
    const status = el('div', { class: 'status', role: 'status', 'aria-live': 'polite', tabindex: '-1' });
    const submit = el('button', { type: 'button', class: 'button button--secondary' }, 'Invia feedback');

    let busy = false;
    function setBusy(isBusy) {
      busy = isBusy;
      submit.disabled = isBusy;
      submit.classList.toggle('button--busy', isBusy);
      submit.textContent = isBusy ? 'Invio feedback…' : 'Invia feedback';
    }

    submit.addEventListener('click', async () => {
      if (busy) return;
      const message = (textarea.value || '').trim();
      const contactValue = (contact.value || '').trim();
      if (!message) {
        status.textContent = 'Inserisci un commento prima di inviare.';
        status.className = 'status err';
        status.focus?.();
        return;
      }
      status.textContent = '';
      status.className = 'status';
      try {
        setBusy(true);
        const response = await fetch(`${apiBase}/api/ideas/${idea.id}/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiToken ? { 'Authorization': 'Bearer ' + apiToken } : {})
          },
          body: JSON.stringify({ message, contact: contactValue })
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((json && json.error) ? json.error : `${response.status} ${response.statusText}`);
        }
        textarea.value = '';
        contact.value = '';
        status.textContent = 'Grazie! Feedback registrato.';
        status.className = 'status ok';
        status.focus?.();
      } catch (error) {
        status.textContent = 'Errore invio feedback: ' + (error && error.message ? error.message : error);
        status.className = 'status err';
        status.focus?.();
      } finally {
        setBusy(false);
      }
    });

    actions.appendChild(submit);
    if (slackLink) {
      const slackButton = el('a', { href: slackLink, target: '_blank', rel: 'noreferrer', class: 'button button--ghost' }, `Apri ${slackChannel}`);
      actions.appendChild(slackButton);
    }
    wrapper.appendChild(textarea);
    wrapper.appendChild(contact);
    wrapper.appendChild(actions);
    wrapper.appendChild(status);
  } else if (slackLink) {
    const fallback = el('p', { class: 'note small' }, [
      'API non configurata: usa ',
      el('a', { href: slackLink, target: '_blank', rel: 'noreferrer', class: 'feedback-link' }, slackChannel),
      ' per condividere il feedback (allega log o screenshot rilevanti).'
    ]);
    wrapper.appendChild(fallback);
  }

  return wrapper;
}
