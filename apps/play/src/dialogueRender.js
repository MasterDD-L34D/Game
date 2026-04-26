// OD-013 Path B — MBTI dialogue color codes (frontend renderer).
//
// Pure helper DOM-free testabile: parse stringhe con tag inline
// `<mbti axis="X">testo</mbti>` e rende HTML con `<span class="mbti-axis-X">`
// SOLO se l'asse `X_Y` è rivelato in `mbtiRevealed.revealed[]` (Path A
// gating). Asse nascosto o palette mancante → degrade a plain text
// (no color leak premature).
//
// Compose con OD-013 Path A:
//   - Backend tag il testo con mbtiTaggedLine(...)
//   - Backend invia mbti_revealed map per_actor (computeRevealedAxes)
//   - Frontend chiama renderMbtiTaggedHtml(text, mbtiRevealed) per render
//
// ADDITIVE only: testo senza tag MBTI passa-through unchanged. Tag
// malformati / non bilanciati → escape + plain text fallback.

const VALID_LETTERS = new Set(['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P']);

// Mapping lettera → axis pair (mirror palette YAML axis field).
const LETTER_TO_AXIS = {
  E: 'E_I',
  I: 'E_I',
  S: 'S_N',
  N: 'S_N',
  T: 'T_F',
  F: 'T_F',
  J: 'J_P',
  P: 'J_P',
};

const TAG_OPEN_RE = /<mbti\s+axis="([EISNTFJP])"\s*>/g;
const TAG_CLOSE_RE = /<\/mbti>/g;

/**
 * Escape `&`, `<`, `>`, `"` per safe HTML embedding.
 *
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Verifica se un asse MBTI è rivelato (Path A gating).
 *
 * @param {string} letter — E|I|S|N|T|F|J|P
 * @param {{revealed?: Array}} mbtiRevealed — payload setMbtiRevealed
 * @returns {boolean}
 */
function isAxisRevealed(letter, mbtiRevealed) {
  if (!mbtiRevealed || typeof mbtiRevealed !== 'object') return false;
  const axisPair = LETTER_TO_AXIS[letter];
  if (!axisPair) return false;
  const revealed = Array.isArray(mbtiRevealed.revealed) ? mbtiRevealed.revealed : [];
  return revealed.some((r) => r && r.axis === axisPair);
}

/**
 * Parse tag balance check. Ritorna true se # open == # close e ogni
 * close ha un open precedente. Tag malformati → false.
 *
 * @param {string} text
 * @returns {boolean}
 */
function tagsAreBalanced(text) {
  if (typeof text !== 'string') return false;
  let depth = 0;
  const re = /<\/?mbti(\s[^>]*)?>/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth < 0) return false;
    } else {
      depth += 1;
    }
  }
  return depth === 0;
}

/**
 * Render testo con tag MBTI inline a HTML colored. Asse non rivelato
 * → unwrap (plain text contenuto). Tag malformati → escape + plain.
 *
 * NB: l'output è HTML pronto per `innerHTML`. Gli unica entità che
 * vengono iniettate sono `<span class="mbti-axis-X">` chiusi da
 * `</span>`. Tutto il resto del testo è escape.
 *
 * @param {string} text — può contenere `<mbti axis="X">...</mbti>`
 * @param {{revealed?: Array}} [mbtiRevealed] — Path A payload
 * @returns {string} HTML safe
 */
function renderMbtiTaggedHtml(text, mbtiRevealed = null) {
  if (typeof text !== 'string') return '';
  if (text.length === 0) return '';
  // Fallback graceful per tag non bilanciati: escape + plain.
  if (!tagsAreBalanced(text)) {
    return escapeHtml(text);
  }
  // Splitta su tag boundaries preservandoli.
  const parts = text.split(/(<mbti\s+axis="[EISNTFJP]"\s*>|<\/mbti>)/);
  const stack = []; // stack di {letter, revealed}
  let out = '';
  for (const part of parts) {
    if (part === '') continue;
    const openMatch = part.match(/^<mbti\s+axis="([EISNTFJP])"\s*>$/);
    if (openMatch) {
      const letter = openMatch[1];
      const revealed = isAxisRevealed(letter, mbtiRevealed);
      stack.push({ letter, revealed });
      if (revealed) {
        out += `<span class="mbti-axis-${letter}" data-mbti-axis="${letter}">`;
      }
      continue;
    }
    if (part === '</mbti>') {
      const popped = stack.pop();
      if (popped && popped.revealed) {
        out += '</span>';
      }
      continue;
    }
    out += escapeHtml(part);
  }
  return out;
}

/**
 * Variante plain-text: stripa tag MBTI e ritorna solo il contenuto.
 * Utile per copy-paste, accessibility (screen reader fallback), log.
 *
 * @param {string} text
 * @returns {string}
 */
function stripMbtiTags(text) {
  if (typeof text !== 'string') return '';
  return text.replace(TAG_OPEN_RE, '').replace(TAG_CLOSE_RE, '');
}

const VALID_LETTERS_LIST = Array.from(VALID_LETTERS);

export {
  renderMbtiTaggedHtml,
  stripMbtiTags,
  isAxisRevealed,
  tagsAreBalanced,
  escapeHtml,
  LETTER_TO_AXIS,
  VALID_LETTERS_LIST as VALID_LETTERS,
};
