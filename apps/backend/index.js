#!/usr/bin/env node
const http = require('node:http');
const path = require('node:path');
const { createApp } = require('./app');

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

const { app } = createApp({
  dataRoot,
  gameDatabase: {
    enabled: gameDatabaseEnabled,
    url: gameDatabaseUrl,
    timeoutMs: Number.isFinite(gameDatabaseTimeoutMs) ? gameDatabaseTimeoutMs : undefined,
    ttlMs: Number.isFinite(gameDatabaseTtlMs) ? gameDatabaseTtlMs : undefined,
  },
});

const server = http.createServer(app);
server.listen(port, host, () => {
  console.log(`[idea-engine] API online su http://${host}:${port}`);
  console.log(`[idea-engine] Database URL: ${databaseUrl ? '[set]' : '[missing]'}`);
  if (gameDatabaseEnabled) {
    console.log(`[game-database] HTTP integration ENABLED at ${gameDatabaseUrl}`);
    console.log(
      '[game-database] trait glossary fetched via HTTP with local file fallback. Scope: trait glossary only — see docs/adr/ADR-2026-04-14-game-database-topology.md',
    );
  } else {
    console.log('[game-database] HTTP integration disabled — using local files only');
  }
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
