// Runtime config injection — used by demo one-tunnel flow (ngrok).
// Tells the LobbyClient to open WS on the SAME ORIGIN + `/ws` path
// instead of defaulting to the dedicated port `:3341` (which is not
// reachable via a single-tunnel ngrok forward).
//
// Requires backend launched with LOBBY_WS_SHARED=true (demo launcher
// does this in scripts/run-demo-tunnel.cjs).
window.LOBBY_WS_SAME_ORIGIN = true;
