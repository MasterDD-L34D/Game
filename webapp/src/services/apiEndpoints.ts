const hasImportMeta = typeof import.meta !== 'undefined' && typeof import.meta.env === 'object';

export type ResolveUrlOverrides = {
  apiBase?: string | null | undefined;
  baseUrl?: string | null | undefined;
};

export function readEnvString(key: string): string | undefined {
  if (!hasImportMeta) {
    return undefined;
  }
  const env = import.meta.env as Record<string, unknown>;
  const raw = env[key];
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

function isAbsoluteUrl(value: unknown): value is string {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:\/\/|[a-zA-Z][a-zA-Z0-9+.-]*:)/.test(value) || value.startsWith('//');
}

function normaliseBase(value: unknown, fallback = ''): string {
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

function joinUrl(base: string, path: string): string {
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

function isRelativeBase(value: unknown): boolean {
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

export function resolveApiUrl(target: string | null | undefined, overrides: ResolveUrlOverrides = {}): string {
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

export function resolveAssetUrl(target: string | null | undefined, overrides: ResolveUrlOverrides = {}): string {
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

export function isStaticDeployment(): boolean {
  return STATIC_BASE;
}

export const baseUrl = NORMALISED_BASE_URL;
export const apiBase = NORMALISED_API_BASE;

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
