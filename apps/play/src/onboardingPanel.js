// V1 Onboarding Phase B — 60s identity choice overlay.
//
// Pattern: Disco Elysium diegetic reveal. 3 card grandi, timer visibile,
// auto-select su timeout (30s deliberation window per spec 51-ONBOARDING-60S).
//
// API:
//   openOnboardingPanel({ onboarding, onPick }) → Promise<option_key>
//
// onboarding shape (from /api/campaign/start campaign_def.onboarding):
//   { timing_seconds, deliberation_timeout_seconds, default_choice_on_timeout,
//     briefing{duration_seconds, lines[]},
//     choices[{option_key, label, trait_id, narrative}],
//     transition{duration_seconds, line} }
//
// Flow:
//   [briefing 10s] → [choices 30s w/ countdown] → [transition 10s] → next
//
// Auto-select on timeout: default_choice_on_timeout (option_a canonical).

'use strict';

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else node.appendChild(c);
  }
  return node;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Open the onboarding overlay. Resolves with selected option_key.
 *
 * @param {object} params
 * @param {object} params.onboarding — campaign_def.onboarding spec
 * @param {Function} [params.onPick] — called with option_key as side effect
 * @returns {Promise<string>}
 */
export async function openOnboardingPanel({ onboarding, onPick } = {}) {
  if (!onboarding || !Array.isArray(onboarding.choices) || onboarding.choices.length === 0) {
    throw new Error('openOnboardingPanel: onboarding spec required');
  }

  const briefingMs = (onboarding.briefing?.duration_seconds ?? 10) * 1000;
  const deliberationMs = (onboarding.deliberation_timeout_seconds ?? 30) * 1000;
  const transitionMs = (onboarding.transition?.duration_seconds ?? 10) * 1000;
  const defaultKey = onboarding.default_choice_on_timeout || onboarding.choices[0].option_key;

  const overlay = el('div', { class: 'onboarding-overlay', role: 'dialog', 'aria-modal': 'true' });
  const stage = el('div', { class: 'onboarding-stage' });
  overlay.appendChild(stage);
  document.body.appendChild(overlay);

  try {
    // ─── Stage 1: briefing ─────────────────────────────────────────────
    const briefingLines = Array.isArray(onboarding.briefing?.lines)
      ? onboarding.briefing.lines
      : [];
    stage.innerHTML = '';
    const briefing = el('div', { class: 'onboarding-briefing' });
    for (const line of briefingLines) {
      briefing.appendChild(el('p', { class: 'onboarding-briefing-line' }, [line]));
    }
    stage.appendChild(briefing);
    // Trigger fade-in animation
    requestAnimationFrame(() => briefing.classList.add('visible'));
    await sleep(briefingMs);

    // ─── Stage 2: choices con countdown ────────────────────────────────
    stage.innerHTML = '';
    const container = el('div', { class: 'onboarding-choices' });
    const countdown = el('div', { class: 'onboarding-countdown' }, [
      `${Math.round(deliberationMs / 1000)}s`,
    ]);
    container.appendChild(countdown);

    const cardGrid = el('div', { class: 'onboarding-card-grid' });
    let resolved = null;

    const resolvePick = (key) => {
      if (resolved) return;
      resolved = key;
      cardGrid.classList.add('picked');
    };

    onboarding.choices.forEach((choice) => {
      const card = el('button', {
        class: 'onboarding-card',
        type: 'button',
        dataset: { optionKey: choice.option_key },
      });
      card.appendChild(el('h3', { class: 'onboarding-card-label' }, [choice.label]));
      card.appendChild(el('p', { class: 'onboarding-card-narrative' }, [`"${choice.narrative}"`]));
      card.appendChild(
        el('small', { class: 'onboarding-card-trait' }, [`Trait: ${choice.trait_id}`]),
      );
      card.addEventListener('click', () => {
        Array.from(cardGrid.children).forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        resolvePick(choice.option_key);
      });
      cardGrid.appendChild(card);
    });
    container.appendChild(cardGrid);
    stage.appendChild(container);

    // Countdown tick
    const startTs = Date.now();
    const tickTimer = setInterval(() => {
      const remaining = Math.max(0, deliberationMs - (Date.now() - startTs));
      countdown.textContent = `${Math.ceil(remaining / 1000)}s`;
      if (remaining <= 5000) countdown.classList.add('onboarding-countdown-warn');
      if (remaining === 0) clearInterval(tickTimer);
    }, 200);

    // Race: user pick vs timeout
    await Promise.race([
      new Promise((r) => {
        const iv = setInterval(() => {
          if (resolved) {
            clearInterval(iv);
            r();
          }
        }, 100);
      }),
      sleep(deliberationMs),
    ]);
    clearInterval(tickTimer);

    const finalKey = resolved || defaultKey;
    if (!resolved) {
      // Visual confirm auto-select
      const autoCard = cardGrid.querySelector(`[data-option-key="${finalKey}"]`);
      if (autoCard) autoCard.classList.add('selected auto');
    }

    if (typeof onPick === 'function') onPick(finalKey);

    // ─── Stage 3: transition ───────────────────────────────────────────
    await sleep(400); // brief pause to show confirmed choice
    stage.innerHTML = '';
    const transition = el('div', { class: 'onboarding-transition' }, [
      el('p', { class: 'onboarding-transition-line' }, [
        onboarding.transition?.line || 'Così sarà.',
      ]),
    ]);
    stage.appendChild(transition);
    requestAnimationFrame(() => transition.classList.add('visible'));
    await sleep(transitionMs);

    return finalKey;
  } finally {
    overlay.classList.add('onboarding-fade-out');
    await sleep(250);
    overlay.remove();
  }
}

export default { openOnboardingPanel };
