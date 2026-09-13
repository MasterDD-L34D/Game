const { execSync } = require('node:child_process');
const crypto = require('node:crypto');
const { loadProjectConfig } = require('./project-config');
const { getGitRoot } = require('./git-utils');

/**
 * Hashes the input string using SHA-256 and returns the first 16 hex characters.
 * @param {string} input
 * @returns {string}
 */
function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

/**
 * Gets the git repository name from the origin remote URL.
 * @param {string} cwd
 * @returns {string|null}
 */
function getGitRepoName(cwd) {
  try {
    const remoteUrl = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const match = remoteUrl.match(/[/:]([^/]+?)(?:\.git)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Gets a personal container tag based on project config or a hash of the base path.
 * @param {string} cwd
 * @returns {string}
 */
function getContainerTag(cwd) {
  const projectConfig = loadProjectConfig(cwd);
  if (projectConfig?.personalContainerTag) {
    return projectConfig.personalContainerTag;
  }
  const gitRoot = getGitRoot(cwd);
  const basePath = gitRoot || cwd;
  return `claudecode_project_${sha256(basePath)}`;
}

function sanitizeRepoName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Gets a repository-specific container tag based on project config or repo name.
 * @param {string} cwd
 * @returns {string}
 */
function getRepoContainerTag(cwd) {
  const projectConfig = loadProjectConfig(cwd);
  if (projectConfig?.repoContainerTag) {
    return projectConfig.repoContainerTag;
  }
  const gitRoot = getGitRoot(cwd);
  const basePath = gitRoot || cwd;

  const gitRepoName = getGitRepoName(basePath);
  const repoName = gitRepoName || basePath.split('/').pop() || 'unknown';

  return `repo_${sanitizeRepoName(repoName)}`;
}

/**
 * Gets the project name from the git repository name or base path.
 * @param {string} cwd
 * @returns {string}
 */
function getProjectName(cwd) {
  const gitRoot = getGitRoot(cwd);
  const basePath = gitRoot || cwd;
  const gitRepoName = getGitRepoName(basePath);
  return gitRepoName || basePath.split('/').pop() || 'unknown';
}

module.exports = {
  sha256,
  getGitRoot,
  getGitRepoName,
  getContainerTag,
  getRepoContainerTag,
  getProjectName,
};
