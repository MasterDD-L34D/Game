#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const STACK_PATTERNS = [
  /^apps\/backend\/(.+\.(?:(?:c|m)?js|ts|tsx|vue))$/,
  /^services\/(.+\.(?:(?:c|m)?js|ts|tsx|vue))$/,
  /^tests\/(.+\.(?:(?:c|m)?js|ts|tsx|vue))$/,
  // apps/dashboard/ rimosso in #1343 (sprint SPRINT_001 fase 2).
  /^apps\/trait-editor\/(.+\.(?:(?:c|m)?js|ts|tsx|vue))$/,
];

const run = (command, options = {}) =>
  execSync(command, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], ...options });

const hasRef = (ref) => {
  try {
    execSync(`git rev-parse --verify ${ref}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
};

const resolveBase = () => {
  const baseRefEnv = process.env.GITHUB_BASE_REF;
  const defaultRemote = baseRefEnv ? `origin/${baseRefEnv}` : 'origin/main';

  if (hasRef(defaultRemote)) {
    return `${defaultRemote}...HEAD`;
  }

  const remoteName = defaultRemote.replace(/^origin\//, '');
  try {
    execSync(`git fetch origin ${remoteName}`, { stdio: 'ignore' });
    if (hasRef(defaultRemote)) {
      return `${defaultRemote}...HEAD`;
    }
  } catch (error) {
    // ignore fetch issues
  }

  return null;
};

const getStatusPaths = () =>
  run('git status --porcelain')
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .join('\n');

const diffRange = resolveBase();
let diffOutput = '';
try {
  if (diffRange) {
    diffOutput = run(`git diff --name-only ${diffRange}`).trim();
  } else {
    diffOutput = getStatusPaths();
  }
} catch (error) {
  console.warn('Unable to compute diff for linting, falling back to working tree:', error.message);
  diffOutput = getStatusPaths();
}

if (!diffOutput) {
  process.exit(0);
}

const files = diffOutput
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((filePath) => {
    if (!existsSync(filePath)) {
      return false;
    }
    return STACK_PATTERNS.some((pattern) => pattern.test(filePath));
  });

if (files.length === 0) {
  process.exit(0);
}

const prettierArgs = ['prettier', '--check', ...files];
// Windows: the npx launcher is npx.cmd and Node >=18.20 refuses to spawn .cmd
// files without a shell (CVE-2024-27980) -> spawnSync('npx') dies with ENOENT.
// Single-string shell form (not args + shell:true, deprecated DEP0190); stack
// paths never contain spaces (STACK_PATTERNS), so no quoting is needed.
const result =
  process.platform === 'win32'
    ? spawnSync(['npx', ...prettierArgs].join(' '), { stdio: 'inherit', shell: true })
    : spawnSync('npx', prettierArgs, { stdio: 'inherit' });

if (result.error) {
  console.error('Failed to execute prettier:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
