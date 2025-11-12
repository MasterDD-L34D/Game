// drift_check.js
// Pre-commit hook Echo-style: rileva variazioni semantiche anomale nei moduli

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const watchedFiles = ['docs/EVO_TACTICS_TEMPLATE.md', 'docs/VISION_AND_STRUCTURE.md'];

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function main() {
  let changesDetected = false;

  watchedFiles.forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;

    const current = fs.readFileSync(filePath, 'utf-8');
    const currentHash = hashContent(current);
    const hashPath = path.join('.hashes', path.basename(filePath) + '.sha');

    if (fs.existsSync(hashPath)) {
      const previousHash = fs.readFileSync(hashPath, 'utf-8');
      if (previousHash !== currentHash) {
        console.log(`⚠️ Drift rilevato in: ${filePath}`);
        changesDetected = true;
      }
    }

    fs.mkdirSync('.hashes', { recursive: true });
    fs.writeFileSync(hashPath, currentHash);
  });

  if (changesDetected) {
    console.error('❌ Commit bloccato: variazione di drift senza ricevuta.');
    process.exit(1);
  }

  process.exit(0);
}

main();
