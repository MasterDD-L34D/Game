/**
 * Difficulty Config Loader — Q-001 T2.3 PR-3
 *
 * Carica data/core/difficulty.yaml al boot e memoizza.
 * Separato da difficultyCalculator.js per mantenere calcolatore puro.
 */

const fs = require('node:fs');
const path = require('node:path');
const { loadDifficultyConfig } = require('./difficultyCalculator');

const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', '..', 'data', 'core', 'difficulty.yaml');

let _memoized = null;

function loadFromDisk(configPath = DEFAULT_CONFIG_PATH) {
  let yaml;
  try {
    yaml = require('js-yaml');
  } catch {
    return loadDifficultyConfig(null); // defaults
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return loadDifficultyConfig(yaml.load(raw));
  } catch {
    return loadDifficultyConfig(null);
  }
}

function getDifficultyConfig() {
  if (_memoized === null) {
    _memoized = loadFromDisk();
  }
  return _memoized;
}

function resetCache() {
  _memoized = null;
}

module.exports = { getDifficultyConfig, loadFromDisk, resetCache, DEFAULT_CONFIG_PATH };
