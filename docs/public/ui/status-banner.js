import { el } from './dom.js';

export function createStatusBanner({ id = 'result' } = {}) {
  const banner = el('div', {
    id,
    class: 'note status-banner',
    role: 'status',
    'aria-live': 'polite',
    tabindex: '-1',
    'aria-atomic': 'true'
  });

  function clear() {
    banner.innerHTML = '';
  }

  function focus() {
    requestAnimationFrame(() => {
      banner.focus({ preventScroll: false });
    });
  }

  function setContent(nodes) {
    clear();
    append(nodes);
  }

  function append(nodes) {
    (Array.isArray(nodes) ? nodes : [nodes]).forEach((node) => {
      if (node === null || node === undefined) {
        return;
      }
      if (typeof node === 'string') {
        banner.appendChild(document.createTextNode(node));
      } else {
        banner.appendChild(node);
      }
    });
    focus();
  }

  function showError(message) {
    setContent(el('span', { class: 'err' }, message));
  }

  return {
    element: banner,
    clear,
    setContent,
    append,
    showError,
    focus
  };
}
