import { fetchCatalog } from '../../services/api/generatorClient.ts';

export const PACK_PATH = 'packs/evo_tactics_pack/';
export const DEFAULT_BRANCH = 'main';

export function ensureTrailingSlash(value) {
  if (!value) return value;
  return value.endsWith('/') ? value : `${value}/`;
}

export function normalizeBase(value) {
  if (!value) return null;
  try {
    const absolute = new URL(value, window.location.href);
    return ensureTrailingSlash(absolute.toString());
  } catch (error) {
    console.warn('Impossibile normalizzare la base dati', value, error);
    return ensureTrailingSlash(value);
  }
}

export function detectRepoBase() {
  try {
    const origin = window.location.origin;
    if (!origin || origin === 'null') {
      return null;
    }

    const segments = window.location.pathname.split('/').filter(Boolean);
    const withoutFile = segments.slice(0, Math.max(segments.length - 1, 0));
    let baseSegments = [];

    if (window.location.hostname.endsWith('github.io')) {
      if (withoutFile.length > 0) {
        baseSegments = [withoutFile[0]];
      }
    } else {
      const docsIndex = withoutFile.indexOf('docs');
      if (docsIndex > 0) {
        baseSegments = withoutFile.slice(0, docsIndex);
      } else if (docsIndex === 0) {
        baseSegments = [];
      } else if (withoutFile.length > 1) {
        baseSegments = withoutFile.slice(0, withoutFile.length - 1);
      }
    }

    const basePath = baseSegments.length ? `/${baseSegments.join('/')}/` : '/';
    return ensureTrailingSlash(`${origin}${basePath}`);
  } catch (error) {
    console.warn('Impossibile determinare la base del repository', error);
    return null;
  }
}

export function detectPackRootOverride() {
  try {
    const params = new URLSearchParams(window.location.search);
    const override =
      params.get('pack-root') ||
      document.querySelector('meta[name="pack-root"]')?.getAttribute('content');
    return normalizeBase(override);
  } catch (error) {
    console.warn("Impossibile leggere l'override della base pack", error);
    return null;
  }
}

export function detectGitHubRawRoot() {
  if (!window.location.hostname.endsWith('github.io')) {
    return null;
  }

  const owner =
    document.querySelector('meta[name="data-owner"]')?.getAttribute('content') ||
    window.location.hostname.split('.')[0];
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const repo =
    document.querySelector('meta[name="data-repo"]')?.getAttribute('content') || pathParts[0] || '';
  const params = new URLSearchParams(window.location.search);
  const branch =
    params.get('ref') ||
    document.querySelector('meta[name="data-branch"]')?.getAttribute('content') ||
    DEFAULT_BRANCH;

  if (!owner || !repo) {
    return null;
  }

  return ensureTrailingSlash(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${PACK_PATH}`,
  );
}

export function candidatePackRoots() {
  const candidates = [];

  const override = detectPackRootOverride();
  if (override) {
    candidates.push(override);
  }

  const githubRaw = detectGitHubRawRoot();
  if (githubRaw) {
    candidates.push(githubRaw);
  }

  const repoBase = detectRepoBase();
  if (repoBase) {
    try {
      candidates.push(ensureTrailingSlash(new URL(PACK_PATH, repoBase).toString()));
    } catch (error) {
      console.warn('Impossibile costruire la base dati dal repository', error);
    }
  }

  try {
    candidates.push(
      ensureTrailingSlash(new URL(`../${PACK_PATH}`, window.location.href).toString()),
    );
  } catch (error) {
    console.warn('Impossibile calcolare la base dati relativa', error);
  }

  if (window.location.origin && window.location.origin !== 'null') {
    const origin = window.location.origin.endsWith('/')
      ? window.location.origin
      : `${window.location.origin}/`;
    candidates.push(ensureTrailingSlash(`${origin}${PACK_PATH}`));
  }

  candidates.push(ensureTrailingSlash(PACK_PATH));

  return Array.from(new Set(candidates.filter(Boolean)));
}

const PACK_ROOT_CANDIDATES = candidatePackRoots();

export function resolveRelative(relativePath, base) {
  if (!relativePath) return relativePath;
  if (!base) return relativePath;
  try {
    return new URL(relativePath, base).toString();
  } catch (error) {
    console.warn('Impossibile risolvere il percorso relativo', relativePath, base, error);
    return relativePath;
  }
}

export function getPackRootCandidates() {
  return [...PACK_ROOT_CANDIDATES];
}

export async function loadCatalogFromCandidates(candidates = PACK_ROOT_CANDIDATES) {
  return fetchCatalog({ candidates });
}

export async function manualLoadCatalog(options = {}) {
  const { candidates = PACK_ROOT_CANDIDATES } = options;
  return loadCatalogFromCandidates(candidates);
}

export async function loadPackCatalog(options = {}) {
  const { candidates = PACK_ROOT_CANDIDATES } = options;
  return loadCatalogFromCandidates(candidates);
}

if (typeof window !== 'undefined') {
  window.EvoPack = window.EvoPack || {};
  window.EvoPack.utils = window.EvoPack.utils || {};
  window.EvoPack.PACK_PATH = PACK_PATH;
  window.EvoPack.DEFAULT_BRANCH = DEFAULT_BRANCH;
  window.EvoPack.packRootCandidates = [...PACK_ROOT_CANDIDATES];
  window.EvoPack.utils.ensureTrailingSlash = ensureTrailingSlash;
  window.EvoPack.utils.normalizeBase = normalizeBase;
  window.EvoPack.utils.detectRepoBase = detectRepoBase;
  window.EvoPack.utils.detectPackRootOverride = detectPackRootOverride;
  window.EvoPack.utils.detectGitHubRawRoot = detectGitHubRawRoot;
  window.EvoPack.utils.candidatePackRoots = candidatePackRoots;
  window.EvoPack.utils.getPackRootCandidates = getPackRootCandidates;
  window.EvoPack.utils.resolveRelative = resolveRelative;
  window.EvoPack.utils.manualLoadCatalog = manualLoadCatalog;
  window.EvoPack.utils.loadPackCatalog = loadPackCatalog;
  window.EvoPack.utils.loadCatalogFromCandidates = loadCatalogFromCandidates;
}
