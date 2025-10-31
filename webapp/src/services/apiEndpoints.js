const hasImportMeta = typeof import.meta !== 'undefined' && typeof import.meta.env === 'object';

function readEnvString(key) {
  if (!hasImportMeta) {
    return undefined;
  }
  const raw = import.meta.env[key];
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

function isAbsoluteUrl(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/.test(value);
}

function normaliseBase(value, fallback = '') {
  if (!value || typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  if (trimmed === '/') {
    return '/';
  }
  if (trimmed === './' || trimmed === '.') {
    return './';
  }
  if (trimmed === '../') {
    return '../';
  }
  if (trimmed.endsWith('/')) {
    return trimmed;
  }
  return `${trimmed}/`;
}

function joinUrl(base, path) {
  if (!base) {
    return path;
  }
  if (!path) {
    return base;
  }
  const baseHasSlash = base.endsWith('/');
  const pathHasSlash = path.startsWith('/');
  if (baseHasSlash && pathHasSlash) {
    return base + path.slice(1);
  }
  if (!baseHasSlash && !pathHasSlash) {
    return `${base}/${path}`;
  }
  return base + path;
}

function isRelativeBase(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return !/^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/)/.test(value.trim());
}

const RAW_BASE_URL = hasImportMeta && typeof import.meta.env.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
const RAW_API_BASE = readEnvString('VITE_API_BASE');

const NORMALISED_BASE_URL = normaliseBase(RAW_BASE_URL, '/');
const NORMALISED_API_BASE = RAW_API_BASE ? normaliseBase(RAW_API_BASE, '') : '';
const STATIC_BASE = isRelativeBase(RAW_BASE_URL);

function resolveApiUrl(target, overrides = {}) {
  if (!target || typeof target !== 'string') {
    const base = overrides.apiBase ?? NORMALISED_API_BASE;
    if (base) {
      return base;
    }
    return overrides.baseUrl ?? NORMALISED_BASE_URL;
  }
  const trimmed = target.trim();
  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }
  const apiBase = overrides.apiBase ?? NORMALISED_API_BASE;
  const baseUrl = overrides.baseUrl ?? NORMALISED_BASE_URL;
  const joinBase = apiBase || baseUrl;
  if (!joinBase) {
    return trimmed;
  }
  return joinUrl(joinBase, trimmed);
}

function resolveAssetUrl(target, overrides = {}) {
  if (!target || typeof target !== 'string') {
    return overrides.baseUrl ?? NORMALISED_BASE_URL;
  }
  const trimmed = target.trim();
  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }
  const baseUrl = overrides.baseUrl ?? NORMALISED_BASE_URL;
  const normalisedPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed.replace(/^\.\//, '');
  return joinUrl(baseUrl, normalisedPath);
}

function isStaticDeployment() {
  return STATIC_BASE;
}

export {
  resolveApiUrl,
  resolveAssetUrl,
  isStaticDeployment,
  readEnvString,
  NORMALISED_BASE_URL as baseUrl,
  NORMALISED_API_BASE as apiBase,
};

export const __internals__ = {
  readEnvString,
  isAbsoluteUrl,
  normaliseBase,
  joinUrl,
  isRelativeBase,
  resolveApiUrl,
  resolveAssetUrl,
  isStaticDeployment,
  baseUrl: NORMALISED_BASE_URL,
  apiBase: NORMALISED_API_BASE,
};
