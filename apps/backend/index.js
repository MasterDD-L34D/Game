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

// Sibling service contract (read-only stub).
// GAME_DATABASE_URL and GAME_DATABASE_ENABLED are reserved env var names for
// a future HTTP integration with the Game-Database repo. They are read here
// only to log a heads-up; no runtime call is made yet.
// See docs/adr/ADR-2026-04-14-game-database-topology.md for the roadmap.
const gameDatabaseUrl = process.env.GAME_DATABASE_URL || 'http://localhost:3333';
const gameDatabaseEnabled = process.env.GAME_DATABASE_ENABLED === 'true';

const { app } = createApp({ dataRoot });

const server = http.createServer(app);
server.listen(port, host, () => {
  console.log(`[idea-engine] API online su http://${host}:${port}`);
  console.log(`[idea-engine] Database URL: ${databaseUrl ? '[set]' : '[missing]'}`);
  if (gameDatabaseEnabled) {
    console.log(`[game-database] integration declared enabled at ${gameDatabaseUrl}`);
    console.log(
      '[game-database] NOTE: runtime integration is not yet wired — see docs/adr/ADR-2026-04-14-game-database-topology.md',
    );
  }
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
