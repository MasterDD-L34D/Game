#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const checklistPath = resolve(__dirname, '../tests/manual/qa-checklist.md');

if (process?.stdout?.on) {
  process.stdout.on('error', (error) => {
    if (error && error.code === 'EPIPE') {
      process.exit(0);
      return;
    }
    throw error;
  });
}

async function printChecklist() {
  const stream = createReadStream(checklistPath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    process.stdout.write(`${line}\n`);
  }
}

printChecklist().catch((error) => {
  console.error('[webapp:qa] Impossibile leggere la checklist QA:', error.message);
  process.exitCode = 1;
});
