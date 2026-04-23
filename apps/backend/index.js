#!/usr/bin/env node
const http = require('node:http');
const path = require('node:path');
const { createApp } = require('./app');
const { createWsServer } = require('./services/network/wsSession');

// Default port changed from 3333 to 3334 in 2026-04 to avoid collision with
// the sibling Game-Database service which owns port 3333 for its REST API.
// See docs/adr/ADR-2026-04-14-game-database-topology.md for rationale.
// Override with PORT env var if you need the legacy 3333 default.
const port = Number.parseInt(process.env.PORT || '3334', 10);
const host = process.env.HOST || '0.0.0.0';
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const dataRoot = path.resolve(ROOT_DIR, 'data');
const databaseUrl = process.env.DATABASE_URL || '';

// Game-Database HTTP integration (Alternative B of ADR-2026-04-14).
// Default OFF: when GAME_DATABASE_ENABLED !== 'true' the catalog service
// reads the trait glossary from local files only (legacy behavior). When ON,
// the trait glossary is fetched from ${GAME_DATABASE_URL}/api/traits/glossary
// with a TTL cache and falls back to the local file on any failure.
// Other catalog sections (biome pools, trait catalog, ecology) remain Game-
// local: see docs/adr/ADR-2026-04-14-game-database-topology.md for the scope.
const gameDatabaseUrl = process.env.GAME_DATABASE_URL || 'http://localhost:3333';
const gameDatabaseEnabled = process.env.GAME_DATABASE_ENABLED === 'true';
const gameDatabaseTimeoutMs = Number.parseInt(process.env.GAME_DATABASE_TIMEOUT_MS || '', 10);
const gameDatabaseTtlMs = Number.parseInt(process.env.GAME_DATABASE_TTL_MS || '', 10);

const { app, lobby } = createApp({
  dataRoot,
  gameDatabase: {
    enabled: gameDatabaseEnabled,
    url: gameDatabaseUrl,
    timeoutMs: Number.isFinite(gameDatabaseTimeoutMs) ? gameDatabaseTimeoutMs : undefined,
    ttlMs: Number.isFinite(gameDatabaseTtlMs) ? gameDatabaseTtlMs : undefined,
  },
});

// M11 Phase A — Jackbox WebSocket server on dedicated port (ADR-2026-04-20).
// Separate port 3341 (default) to avoid collisions with:
//   HTTP :3334 (this backend), Vite :5180, calibration :3340.
// Override via LOBBY_WS_PORT env; disable via LOBBY_WS_ENABLED=false.
const wsEnabled = process.env.LOBBY_WS_ENABLED !== 'false';
const wsShared = process.env.LOBBY_WS_SHARED === 'true';
const wsPort = Number.parseInt(process.env.LOBBY_WS_PORT || '3341', 10);
const wsHost = process.env.LOBBY_WS_HOST || host;
let lobbyWs = null;

// Issue #1342: avverti se ORCHESTRATOR_AUTOCLOSE_MS e' settato in modo
// che potrebbe rompere il backend live (valori bassi pensati per i test).
const rawAutoclose = process.env.ORCHESTRATOR_AUTOCLOSE_MS;
const autocloseStatus = (() => {
  if (!rawAutoclose) return 'disabled (default)';
  const trimmed = String(rawAutoclose).trim().toLowerCase();
  if (['off', 'none', 'no', 'false', 'never', 'disable', 'disabled', '0', ''].includes(trimmed)) {
    return 'disabled';
  }
  const numeric = Number(rawAutoclose);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 'disabled (invalid value, ignored)';
  }
  return `${numeric}ms`;
})();

const server = http.createServer(app);

// WS server: shared mode (single port for demo/ngrok) or dedicated port.
if (wsEnabled && lobby) {
  if (wsShared) {
    lobbyWs = createWsServer({ lobby, server });
    console.log(`[lobby-ws] WebSocket server attached to HTTP server on /ws (shared mode)`);
  } else {
    lobbyWs = createWsServer({ lobby, port: wsPort });
    console.log(`[lobby-ws] WebSocket server online on ws://${wsHost}:${wsPort}/ws`);
  }
} else {
  console.log('[lobby-ws] WebSocket server disabled (LOBBY_WS_ENABLED=false)');
}

server.listen(port, host, () => {
  console.log(`[idea-engine] API online su http://${host}:${port}`);
  console.log(`[idea-engine] Database URL: ${databaseUrl ? '[set]' : '[missing]'}`);
  console.log(`[idea-engine] Orchestrator autoclose: ${autocloseStatus}`);
  if (autocloseStatus !== 'disabled (default)' && autocloseStatus !== 'disabled') {
    console.log(
      "[idea-engine] WARNING: ORCHESTRATOR_AUTOCLOSE_MS e' settato. Se questo backend" +
        ' deve servire richieste oltre il timeout, unset la variabile (vedi .env.example).',
    );
  }
  if (gameDatabaseEnabled) {
    console.log(`[game-database] HTTP integration ENABLED at ${gameDatabaseUrl}`);
    console.log(
      '[game-database] trait glossary fetched via HTTP with local file fallback. Scope: trait glossary only — see docs/adr/ADR-2026-04-14-game-database-topology.md',
    );
  } else {
    console.log('[game-database] HTTP integration disabled — using local files only');
  }
});

async function shutdown(signal) {
  console.log(`[idea-engine] ${signal} received — shutting down`);
  if (lobbyWs) {
    try {
      await lobbyWs.close();
    } catch {
      // noop
    }
  }
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
