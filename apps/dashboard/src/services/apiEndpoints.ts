export function readEnvString(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined') {
    const value = import.meta.env[key];
    if (typeof value === 'string') {
      return value;
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key];
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

function joinUrl(base: string | undefined, path: string): string {
  if (!base) return path;
  const cleanedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return path.startsWith('/') ? `${cleanedBase}${path}` : `${cleanedBase}/${path}`;
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = readEnvString('VITE_API_BASE_URL');
  return joinUrl(base, path);
}

export function resolveAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = readEnvString('VITE_ASSETS_BASE_URL');
  return joinUrl(base, path);
}

export function isStaticDeployment(): boolean {
  const flag = readEnvString('VITE_STATIC_DEPLOYMENT');
  return flag === 'true' || flag === '1';
}
