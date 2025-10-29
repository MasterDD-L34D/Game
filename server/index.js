#!/usr/bin/env node
const http = require('node:http');
const path = require('node:path');
const { createApp } = require('./app');

const port = Number.parseInt(process.env.PORT || '3333', 10);
const host = process.env.HOST || '0.0.0.0';
const dataRoot = path.resolve(__dirname, '..', 'data');
const databasePath = process.env.IDEA_ENGINE_DB || path.join(dataRoot, 'idea_engine.db');

const { app } = createApp({ databasePath, dataRoot });

const server = http.createServer(app);
server.listen(port, host, () => {
  console.log(`[idea-engine] API online su http://${host}:${port}`);
  console.log(`[idea-engine] Database: ${databasePath}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
