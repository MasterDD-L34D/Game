import { el } from './dom.js';
import { copyTextToClipboard } from './clipboard.js';

function createCopyButton(reportText) {
  const copyButton = el('button', { type: 'button', class: 'button button--ghost' }, 'Copia');
  copyButton.addEventListener('click', async () => {
    const success = await copyTextToClipboard(reportText);
    copyButton.textContent = success ? 'Copiato!' : 'Errore copia';
    setTimeout(() => {
      copyButton.textContent = 'Copia';
    }, 2000);
  });
  return copyButton;
}

export function createReportCard(reportText, downloadMarkdown, ideaId) {
  const header = el('div', { class: 'report__header' }, [
    el('h4', {}, 'Report Codex GPT'),
    (function createActions() {
      const downloadButton = el('button', { type: 'button', class: 'button button--ghost' }, 'Scarica report');
      downloadButton.addEventListener('click', () => {
        downloadMarkdown(reportText, `codex-report-${ideaId || 'idea'}`);
      });
      return el('div', { class: 'report__actions' }, [createCopyButton(reportText), downloadButton]);
    })()
  ]);

  const body = el('pre', { class: 'report__body' }, reportText);
  return el('div', { class: 'report' }, [header, body]);
}
