// Runtime config — PRODUCTION TEMPLATE.
// Sprint C bundle Min (docs/research/2026-04-27-backbone-online-deploy-roadmap.md).
//
// Sostituire __RENDER_BACKEND_HOST__ con hostname pubblico Render
// (es. evo-tactics-backend.onrender.com) prima di copiare in apps/play/dist/
// durante il deploy. scripts/deploy-min.sh esegue il sed automaticamente
// se RENDER_BACKEND_HOST è esportato in env.
//
// Quando deployato:
//   - Frontend served from CF Pages (https://evo-tactics-play.pages.dev)
//   - Backend + WS served from Render (https://__RENDER_BACKEND_HOST__)
//   - WS path: wss://__RENDER_BACKEND_HOST__/ws (LOBBY_WS_SHARED=true side)
//
// LOBBY_WS_SAME_ORIGIN = false in cross-origin setup CF Pages → Render.
// Cliente legge LOBBY_WS_URL esplicito invece di derivare da window.location.

window.LOBBY_WS_URL = 'wss://__RENDER_BACKEND_HOST__/ws';
window.LOBBY_API_BASE = 'https://__RENDER_BACKEND_HOST__';
window.LOBBY_WS_SAME_ORIGIN = false;
