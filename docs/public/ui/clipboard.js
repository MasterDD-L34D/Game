let fallbackWarned = false;

function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'readonly');
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (error) {
    success = false;
  }
  document.body.removeChild(textArea);
  if (!fallbackWarned) {
    fallbackWarned = true;
    console.warn('Clipboard API non disponibile, uso fallback execCommand.');
  }
  return success;
}

export async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Prova fallback
    }
  }
  return fallbackCopy(text);
}
