const fs = require('node:fs');
const path = require('node:path');
const { getGitRoot } = require('./git-utils');

const CONFIG_DIR = path.join('.claude', '.supermemory-claude');
const CONFIG_FILE = 'config.json';

/**
 * Gets the path to the configuration file for the project.
 * @param {string} cwd - The current working directory.
 * @returns {string} The resolved path to the config file.
 */
function getConfigPath(cwd) {
  const gitRoot = getGitRoot(cwd);
  const basePath = gitRoot || cwd;
  return path.join(basePath, CONFIG_DIR, CONFIG_FILE);
}

/**
 * Loads the project configuration if it exists.
 * @param {string} cwd - The current working directory.
 * @returns {Object|null} The parsed configuration object, or null if it cannot be loaded.
 */
function loadProjectConfig(cwd) {
  try {
    const configPath = getConfigPath(cwd);
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return null;
}

/**
 * Saves the given configuration to the project config file.
 * @param {string} cwd - The current working directory.
 * @param {Object} config - The configuration data to save.
 * @returns {string} The path where the configuration was saved.
 */
function saveProjectConfig(cwd, config) {
  const gitRoot = getGitRoot(cwd);
  const basePath = gitRoot || cwd;
  const dirPath = path.join(basePath, CONFIG_DIR);
  const configPath = path.join(dirPath, CONFIG_FILE);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const existing = loadProjectConfig(cwd) || {};
  const data = {
    ...existing,
    ...config,
  };
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
  return configPath;
}

module.exports = {
  getConfigPath,
  loadProjectConfig,
  saveProjectConfig,
};
