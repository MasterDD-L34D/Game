#!/usr/bin/env node

const { spawnSync } = require('child_process');

function listAddedBackups() {
  const result = spawnSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=A', '--', 'reports/backups'],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    console.error('[check-backups] Impossibile leggere i file in staging.', result.stderr);
    process.exit(result.status || 1);
  }

  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function readBlob(path) {
  const result = spawnSync('git', ['show', `:${path}`], { encoding: null });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout;
}

function isLikelyBinary(buffer) {
  if (!buffer || buffer.length === 0) return false;
  const maxBytes = Math.min(buffer.length, 8000);
  let suspicious = 0;

  for (let i = 0; i < maxBytes; i += 1) {
    const byte = buffer[i];
    if (byte === 0) {
      return true;
    }
    if (byte < 7 || (byte > 13 && byte < 32) || byte > 126) {
      suspicious += 1;
    }
  }

  return suspicious / maxBytes > 0.3;
}

function main() {
  const added = listAddedBackups();
  if (added.length === 0) {
    process.exit(0);
  }

  const violations = [];

  added.forEach((path) => {
    const blob = readBlob(path);
    if (blob && isLikelyBinary(blob)) {
      violations.push(path);
    }
  });

  if (violations.length > 0) {
    console.error(
      '[check-backups] Rilevati nuovi file binari in reports/backups:** che non sono ammessi nel repo:',
    );
    violations.forEach((v) => console.error(` - ${v}`));
    console.error(
      '\nSposta gli archivi su storage esterno (es. s3://.../reports/backups/<label>/) e committa solo manifest/README testuali.',
    );
    console.error('Consulta docs/planning/REF_BACKUP_AND_ROLLBACK.md per la procedura completa.');
    process.exit(1);
  }
}

main();
