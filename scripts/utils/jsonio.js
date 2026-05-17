const fs = require('node:fs');
const path = require('node:path');

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJsonFile(filePath, data) {
  const serialised = `${JSON.stringify(data, null, 2)}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, serialised, 'utf8');
}

module.exports = {
  readJsonFile,
  writeJsonFile,
};
