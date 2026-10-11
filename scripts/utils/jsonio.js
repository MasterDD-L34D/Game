const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual } = require('node:util');

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJsonFile(filePath, data) {
  const serialised = `${JSON.stringify(data, null, 2)}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, serialised, 'utf8');
}

function stripIgnoredKeys(value, ignoreKeys) {
  if (Array.isArray(value)) {
    return value.map((entry) => stripIgnoredKeys(entry, ignoreKeys));
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      if (ignoreKeys.has(key)) {
        continue;
      }
      result[key] = stripIgnoredKeys(val, ignoreKeys);
    }
    return result;
  }
  return value;
}

async function formatJsonForFile(filePath, data) {
  // Lazy require: keeps plain read/write usable in contexts without dev deps.
  const prettier = require('prettier');
  const config = (await prettier.resolveConfig(filePath)) ?? {};
  return prettier.format(JSON.stringify(data), { ...config, parser: 'json' });
}

/**
 * Writes `data` as prettier-formatted JSON. When the target already holds the
 * same semantic payload (ignoring `ignoreKeys` at any depth, e.g. generation
 * timestamps), the write is skipped so regeneration runs do not churn
 * timestamps or formatting. Returns true when the file was written.
 */
async function writeJsonFileFormatted(filePath, data, { ignoreKeys = [] } = {}) {
  // JSON roundtrip drops undefined-valued keys, matching what a write would
  // persist — without it the disk/memory comparison never reports equality.
  const normalised = JSON.parse(JSON.stringify(data));
  const ignored = new Set(ignoreKeys);

  if (fs.existsSync(filePath)) {
    let existing;
    try {
      existing = readJsonFile(filePath);
    } catch {
      existing = undefined;
    }
    if (
      existing !== undefined &&
      isDeepStrictEqual(stripIgnoredKeys(existing, ignored), stripIgnoredKeys(normalised, ignored))
    ) {
      return false;
    }
  }

  const serialised = await formatJsonForFile(filePath, normalised);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, serialised, 'utf8');
  return true;
}

module.exports = {
  readJsonFile,
  writeJsonFile,
  writeJsonFileFormatted,
};
