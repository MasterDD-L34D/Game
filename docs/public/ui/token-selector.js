import { el } from './dom.js';

export function createMultiSelectField({ slugify }, config) {
  const {
    id,
    placeholder,
    taxonomy,
    defaults = []
  } = config;

  const canonicalSet = taxonomy?.canonicalSet || new Set();
  const aliasMap = taxonomy?.aliasMap || {};
  const suggestions = taxonomy?.suggestions || [];

  const wrapper = el('div', { class: 'multi-select', 'data-field': id, role: 'group' });
  const control = el('div', { class: 'multi-select__control' });
  const tokens = el('div', { class: 'multi-select__tokens', role: 'list' });
  const inputId = `${id}_input`;
  const hintId = `${id}_hint`;
  const input = el('input', {
    type: 'text',
    id: inputId,
    class: 'multi-select__input',
    placeholder: placeholder || '',
    autocomplete: 'off',
    'aria-describedby': hintId,
    'aria-haspopup': 'listbox'
  });
  const datalistId = `${id}-options`;
  const datalist = el('datalist', { id: datalistId });
  suggestions.forEach((item) => {
    datalist.appendChild(el('option', { value: item }));
  });
  input.setAttribute('list', datalistId);
  const hidden = el('input', { type: 'hidden', id, dataset: { multi: 'json' }, value: '[]' });
  const hint = el('div', { class: 'multi-select__hint', id: hintId, hidden: true });
  const liveRegion = el('div', { class: 'visually-hidden', 'aria-live': 'polite', id: `${id}_live` });

  control.appendChild(tokens);
  control.appendChild(input);
  wrapper.appendChild(control);
  wrapper.appendChild(hint);
  wrapper.appendChild(hidden);
  wrapper.appendChild(datalist);
  wrapper.appendChild(liveRegion);

  const state = [];

  function announce(message) {
    if (!message) return;
    liveRegion.textContent = message;
  }

  function sync() {
    hidden.value = JSON.stringify(state.map((item) => item.value));
    const unknown = state.filter((item) => !item.known);
    hidden.dataset.unknownValues = JSON.stringify(unknown.map((item) => item.display || item.value));
    hidden.dataset.unknownCount = String(unknown.length);
    if (unknown.length) {
      hint.hidden = false;
      hint.textContent = 'Slug non catalogati: ' + unknown.map((item) => item.display || item.value).join(', ');
      input.setAttribute('aria-invalid', 'true');
    } else {
      hint.hidden = true;
      hint.textContent = '';
      input.removeAttribute('aria-invalid');
    }
  }

  function createTokenNode(tokenData) {
    const token = el('span', {
      class: 'multi-select__token' +
        (tokenData.known ? '' : ' multi-select__token--unknown') +
        (tokenData.aliasUsed ? ' multi-select__token--alias' : ''),
      role: 'listitem'
    });
    token.appendChild(el('span', { class: 'multi-select__label' }, tokenData.value));
    const removeButton = el('button', { type: 'button', 'aria-label': `Rimuovi ${tokenData.value}` }, '×');
    removeButton.addEventListener('click', () => {
      const index = state.findIndex((item) => item.value === tokenData.value);
      if (index >= 0) {
        state.splice(index, 1);
      }
      tokens.removeChild(token);
      sync();
      announce(`Rimosso ${tokenData.value}`);
      input.focus();
    });
    token.appendChild(removeButton);
    if (tokenData.aliasUsed || tokenData.originalDisplay !== tokenData.value) {
      token.title = `Inserito come: ${tokenData.originalDisplay}`;
    }
    return token;
  }

  function addToken(rawValue) {
    const normalisedInput = slugify(rawValue);
    if (!normalisedInput) return;
    const canonical = aliasMap[normalisedInput] || normalisedInput;
    if (state.some((item) => item.value === canonical)) {
      announce(`${canonical} già presente`);
      return;
    }
    const known = canonicalSet.has(canonical);
    const aliasUsed = canonical !== normalisedInput;
    const originalDisplay = rawValue && rawValue.trim() ? rawValue.trim() : canonical;
    const tokenData = { value: canonical, display: originalDisplay, known, aliasUsed, originalDisplay };
    const tokenNode = createTokenNode(tokenData);
    state.push(tokenData);
    tokens.appendChild(tokenNode);
    sync();
    announce(`Aggiunto ${canonical}` + (known ? '' : ' (fuori catalogo)'));
  }

  function removeLastToken() {
    if (!state.length) return;
    const last = state.pop();
    const tokenNodes = tokens.querySelectorAll('.multi-select__token');
    if (tokenNodes.length) {
      tokens.removeChild(tokenNodes[tokenNodes.length - 1]);
    }
    sync();
    input.value = slugify(last.display || last.value);
    input.select();
    announce(`Rimosso ${last.value}`);
  }

  function commitInput() {
    if (!input.value) return;
    const raw = input.value;
    input.value = '';
    addToken(raw);
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      event.preventDefault();
      commitInput();
      if (event.key === 'Tab') {
        const form = input.closest('form');
        if (form) {
          const focusable = form.querySelectorAll('input, button, textarea, select');
          const elements = Array.from(focusable).filter((el) => !el.disabled && el.tabIndex !== -1);
          const index = elements.indexOf(input);
          if (index >= 0 && index + 1 < elements.length) {
            elements[index + 1].focus();
          }
        }
      }
    } else if (event.key === 'Backspace' && !input.value) {
      removeLastToken();
    }
  });

  input.addEventListener('change', commitInput);
  input.addEventListener('blur', commitInput);

  defaults.forEach((value) => addToken(value));
  sync();

  return wrapper;
}
