// Skiv-as-Monitor — overlay panel (Phase 2 frontend wire 2026-04-25).
//
// Overlay modale che mostra:
//   - ASCII card live (fetch /api/skiv/card text/plain)
//   - Feed eventi GitHub (fetch /api/skiv/feed?limit=20)
//   - Auto-refresh ogni 15s mentre overlay aperto
//
// Exports:
//   initSkivPanel(opts) — wire HUD button #skiv-open
//   openSkivPanel()    — open programmatic
//   closeSkivPanel()   — close programmatic
//
// Persona canonical: docs/skiv/CANONICAL.md.
// Backend route: apps/backend/routes/skiv.js.

import { api } from './api.js';

const STATE = {
  overlayEl: null,
  cardEl: null,
  feedEl: null,
  statusEl: null,
  refreshTimer: null,
  open: false,
};

const REFRESH_MS = 15_000;
const FALLBACK_CARD = '[ Skiv dorme. Monitor non ha ancora girato. ]\nSabbia segue.';

function injectStyles() {
  if (document.getElementById('skiv-panel-styles')) return;
  const style = document.createElement('style');
  style.id = 'skiv-panel-styles';
  style.textContent = `
    .skiv-overlay {
      position: fixed; inset: 0; z-index: 9997;
      background: rgba(11, 13, 18, 0.82);
      display: none; align-items: flex-start; justify-content: center;
      padding: 32px 16px; overflow-y: auto;
      font-family: Inter, system-ui, sans-serif; color: #e8eaf0;
    }
    .skiv-overlay.visible { display: flex; }
    .skiv-card-wrap {
      max-width: 760px; width: 100%; background: #151922;
      border: 1px solid #5a4a2f; border-radius: 14px; padding: 22px 24px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    }
    .skiv-head {
      display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
    }
    .skiv-head h2 { margin: 0; font-size: 1.25rem; color: #c4a574; }
    .skiv-head .skiv-status-chip {
      margin-left: auto; background: #0b0d12; border: 1px solid #5a4a2f;
      border-radius: 999px; padding: 4px 12px; font-size: 0.85rem; color: #c4a574;
    }
    .skiv-head .skiv-close-btn {
      background: transparent; border: none; color: #ef9a9a;
      cursor: pointer; font-size: 1.3rem; padding: 4px 8px;
    }
    .db-skiv-card,
    .skiv-ascii-card {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      white-space: pre; background: #0b0d12; color: #c4a574;
      padding: 12px 14px; border: 1px solid #5a4a2f; border-radius: 8px;
      font-size: 0.78rem; line-height: 1.25; overflow-x: auto;
      margin: 0;
    }
    .skiv-feed-section { margin-top: 18px; }
    .skiv-feed-section h3 {
      margin: 0 0 10px 0; font-size: 0.95rem; color: #66d1fb;
    }
    .skiv-feed-list {
      list-style: none; padding: 0; margin: 0;
      max-height: 260px; overflow-y: auto;
    }
    .skiv-feed-entry {
      padding: 8px 10px; margin-bottom: 6px;
      background: #0b0d12; border-left: 3px solid #5a4a2f; border-radius: 4px;
      font-size: 0.85rem;
    }
    .skiv-feed-entry .ts { color: #8a8a8a; font-size: 0.78rem; }
    .skiv-feed-entry .kind { color: #c4a574; font-weight: bold; margin: 0 6px; }
    .skiv-feed-entry .voice { color: #e8eaf0; font-style: italic; display: block; margin-top: 4px; }
    .skiv-feed-entry.cat-fix { border-left-color: #66d1fb; }
    .skiv-feed-entry.cat-feat_p2 { border-left-color: #a26bff; }
    .skiv-feed-entry.cat-feat_p3 { border-left-color: #66d1fb; }
    .skiv-feed-entry.cat-feat_p6 { border-left-color: #ef9a9a; }
    .skiv-feed-entry.cat-wf_fail { border-left-color: #ef5350; }
    .skiv-feed-entry.cat-wf_pass { border-left-color: #81c784; }
    .skiv-empty { color: #8a8a8a; font-style: italic; padding: 10px; text-align: center; }
  `;
  document.head.appendChild(style);
}

function buildOverlay() {
  if (STATE.overlayEl) return STATE.overlayEl;
  injectStyles();
  const overlay = document.createElement('div');
  overlay.className = 'skiv-overlay';
  overlay.id = 'skiv-overlay';
  overlay.innerHTML = `
    <div class="skiv-card-wrap">
      <div class="skiv-head">
        <h2>🦎 Skiv — feed creatura</h2>
        <span class="skiv-status-chip" id="skiv-status-chip">—</span>
        <button class="skiv-close-btn" id="skiv-close" aria-label="Chiudi">✕</button>
      </div>
      <pre class="skiv-ascii-card" id="skiv-card">${FALLBACK_CARD}</pre>
      <div class="skiv-feed-section">
        <h3>Eventi recenti</h3>
        <ul class="skiv-feed-list" id="skiv-feed-list">
          <li class="skiv-empty">Carico…</li>
        </ul>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  STATE.overlayEl = overlay;
  STATE.cardEl = overlay.querySelector('#skiv-card');
  STATE.feedEl = overlay.querySelector('#skiv-feed-list');
  STATE.statusEl = overlay.querySelector('#skiv-status-chip');
  overlay.querySelector('#skiv-close').addEventListener('click', closeSkivPanel);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) closeSkivPanel();
  });
  document.addEventListener('keydown', (ev) => {
    if (STATE.open && ev.key === 'Escape') closeSkivPanel();
  });
  return overlay;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderFeedEntries(entries) {
  if (!STATE.feedEl) return;
  if (!entries || entries.length === 0) {
    STATE.feedEl.innerHTML = '<li class="skiv-empty">Nessun evento ancora. Sabbia ferma.</li>';
    return;
  }
  const html = entries
    .slice()
    .reverse()
    .map((e) => {
      const ev = e.event || {};
      const ts = (e.ts || '').slice(0, 19).replace('T', ' ');
      const kind = escapeHtml(ev.kind || '?');
      const num = ev.number ? `#${escapeHtml(String(ev.number))}` : '';
      const title = escapeHtml((ev.title || ev.summary || '').slice(0, 80));
      const cat = escapeHtml(e.category || 'default');
      const voice = escapeHtml(e.voice || '');
      return `
        <li class="skiv-feed-entry cat-${cat}">
          <span class="ts">${escapeHtml(ts)}</span>
          <span class="kind">${kind}</span>
          ${num} ${title}
          <span class="voice">🦎 ${voice}</span>
        </li>
      `;
    })
    .join('');
  STATE.feedEl.innerHTML = html;
}

async function refresh() {
  if (!STATE.open) return;
  // Card (text/plain).
  const cardRes = await api.skivCard();
  if (STATE.cardEl) {
    STATE.cardEl.textContent = cardRes.ok && cardRes.text ? cardRes.text : FALLBACK_CARD;
  }
  // Status chip.
  const statusRes = await api.skivStatus();
  if (STATE.statusEl) {
    if (statusRes.ok && statusRes.data) {
      const s = statusRes.data;
      const ts = (s.last_updated || '').slice(0, 19).replace('T', ' ') || 'mai';
      const lvl = s.level ?? '?';
      STATE.statusEl.textContent = `Lv ${lvl} · ${ts}`;
      if (s._fallback) {
        STATE.statusEl.textContent += ' (dormante)';
      }
    } else {
      STATE.statusEl.textContent = 'offline';
    }
  }
  // Feed.
  const feedRes = await api.skivFeed(20);
  if (STATE.feedEl) {
    if (feedRes.ok && feedRes.data && Array.isArray(feedRes.data.entries)) {
      renderFeedEntries(feedRes.data.entries);
    } else if (feedRes.networkError) {
      STATE.feedEl.innerHTML = '<li class="skiv-empty">Backend irraggiungibile. Sabbia tace.</li>';
    } else {
      renderFeedEntries([]);
    }
  }
}

export function openSkivPanel() {
  buildOverlay();
  STATE.open = true;
  STATE.overlayEl.classList.add('visible');
  refresh();
  if (!STATE.refreshTimer) {
    STATE.refreshTimer = setInterval(refresh, REFRESH_MS);
  }
}

export function closeSkivPanel() {
  STATE.open = false;
  if (STATE.overlayEl) STATE.overlayEl.classList.remove('visible');
  if (STATE.refreshTimer) {
    clearInterval(STATE.refreshTimer);
    STATE.refreshTimer = null;
  }
}

export function initSkivPanel() {
  buildOverlay();
  const btn = document.getElementById('skiv-open');
  if (btn) {
    btn.addEventListener('click', () => {
      if (STATE.open) closeSkivPanel();
      else openSkivPanel();
    });
  }
}

// Test surface (export for unit tests).
export const __skivPanelInternal = { renderFeedEntries, escapeHtml, FALLBACK_CARD };
