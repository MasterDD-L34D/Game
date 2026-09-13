export const PACK_PATH = "packs/evo_tactics_pack/";
export const DEFAULT_BRANCH = "main";
const DEFAULT_CATALOG_PATH = "docs/catalog/catalog_data.json";

function getProcessEnv() {
  if (typeof process !== "undefined" && process.env) {
    return process.env;
  }
  return {};
}

function parseEnvList(value) {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(value ?? "");
}

function ensureFileSeparator(value) {
  if (!value) return value;
  if (value.endsWith("/") || value.endsWith("\\")) {
    return value;
  }
  if (isRemoteUrl(value) || value.startsWith("file://")) {
    return `${value}/`;
  }
  return `${value}${value.includes("\\") ? "\\" : "/"}`;
}

export function ensureTrailingSlash(value) {
  return ensureFileSeparator(value);
}

export function resolveRelative(relativePath, base) {
  if (!relativePath) return relativePath;
  if (!base) return relativePath;
  try {
    if (isRemoteUrl(base) || base.startsWith("file://")) {
      return new URL(relativePath, ensureTrailingSlash(base)).toString();
    }
  } catch (error) {
    console.warn("Impossibile risolvere il percorso relativo", relativePath, base, error);
  }
  const separator = base.includes("\\") ? "\\" : "/";
  const trimmedBase = base.replace(/[\\/]+$/, "");
  const trimmedRelative = relativePath.replace(/^[\\/]+/, "");
  return `${trimmedBase}${separator}${trimmedRelative}`;
}

function joinPaths(base, relative) {
  if (!base) return relative;
  if (!relative) return ensureTrailingSlash(base);
  if (isRemoteUrl(base) || base.startsWith("file://")) {
    return new URL(relative, ensureTrailingSlash(base)).toString();
  }
  const separator = base.includes("\\") ? "\\" : "/";
  const trimmedBase = base.replace(/[\\/]+$/, "");
  const trimmedRelative = relative.replace(/^[\\/]+/, "");
  return `${trimmedBase}${separator}${trimmedRelative}`;
}

export function detectRepoRoot() {
  const env = getProcessEnv();
  if (env.EVO_REPO_ROOT) {
    return env.EVO_REPO_ROOT;
  }
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd();
  }
  return null;
}

export function candidatePackRoots(options = {}) {
  const {
    override,
    repoRoot = null,
    packPath = PACK_PATH,
    remoteSources = [],
    includeDefaults = true,
    allowEnv = true,
  } = options;

  const env = allowEnv ? getProcessEnv() : {};
  const roots = [];

  if (override) {
    roots.push(ensureTrailingSlash(override));
  }

  if (allowEnv) {
    ["EVO_PACK_ROOT", "EVO_PACK_BASE", "EVO_PACK_OVERRIDE"].forEach((key) => {
      const value = env[key];
      if (value) {
        roots.push(ensureTrailingSlash(value));
      }
    });
  }

  const combinedRemote = [
    ...remoteSources,
    ...(allowEnv ? parseEnvList(env.EVO_PACK_REMOTE) : []),
    ...(allowEnv ? parseEnvList(env.EVO_PACK_SOURCES) : []),
  ];
  combinedRemote.forEach((source) => {
    if (source) {
      roots.push(ensureTrailingSlash(source));
    }
  });

  if (includeDefaults) {
    const baseRoot = repoRoot || env.EVO_REPO_ROOT || detectRepoRoot();
    if (baseRoot) {
      roots.push(ensureTrailingSlash(joinPaths(baseRoot, packPath)));
    }
  }

  roots.push(ensureTrailingSlash(packPath));

  return unique(roots);
}

export function getPackRootCandidates(options = {}) {
  return candidatePackRoots(options);
}

let fsModulePromise = null;
let pathModulePromise = null;
let urlModulePromise = null;

function loadFsModule() {
  if (!fsModulePromise) {
    fsModulePromise = import("node:fs/promises").catch(() => null);
  }
  return fsModulePromise;
}

function loadPathModule() {
  if (!pathModulePromise) {
    pathModulePromise = import("node:path").catch(() => null);
  }
  return pathModulePromise;
}

function loadUrlModule() {
  if (!urlModulePromise) {
    urlModulePromise = import("node:url").catch(() => null);
  }
  return urlModulePromise;
}

async function readLocalCatalog(base, relativePath, modules) {
  const { fs, path, url } = modules;
  if (!fs) {
    throw new Error("Modulo fs non disponibile nell'ambiente corrente");
  }
  const resolvedBase = path ? path.resolve(base) : base;
  const catalogPath = path ? path.join(resolvedBase, relativePath) : joinPaths(resolvedBase, relativePath);
  const raw = await fs.readFile(catalogPath, "utf-8");
  const data = JSON.parse(raw);
  const docsBasePath = path
    ? path.join(resolvedBase, "docs", "catalog")
    : joinPaths(resolvedBase, "docs/catalog");
  const resolvedDocsBase = ensureTrailingSlash(docsBasePath);
  const resolvedBaseWithSlash = ensureTrailingSlash(resolvedBase);
  const context = {
    resolvedBase: resolvedBaseWithSlash,
    docsBase: resolvedDocsBase,
    catalogUrl: catalogPath,
    resolveDocHref(relative) {
      if (url?.pathToFileURL) {
        const docUrl = url.pathToFileURL(path ? path.join(resolvedBase, "docs", "catalog", relative) : joinPaths(resolvedBase, `docs/catalog/${relative}`));
        return docUrl.toString();
      }
      return joinPaths(resolvedDocsBase, relative);
    },
    resolvePackHref(relative) {
      if (url?.pathToFileURL && path) {
        const filePath = path.join(resolvedBase, relative);
        return url.pathToFileURL(filePath).toString();
      }
      return joinPaths(resolvedBaseWithSlash, relative);
    },
  };
  return { data, context };
}

async function readRemoteCatalog(base, relativePath, options) {
  const fetchImpl = options.fetch ?? (typeof fetch === "function" ? fetch : null);
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch non disponibile per sorgenti remote");
  }
  const resolvedBase = ensureTrailingSlash(base);
  const catalogUrl = new URL(relativePath, resolvedBase).toString();
  const response = await fetchImpl(catalogUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} durante il caricamento di ${catalogUrl}`);
  }
  const data = await response.json();
  const docsBase = ensureTrailingSlash(new URL("docs/catalog/", resolvedBase).toString());
  const context = {
    resolvedBase,
    docsBase,
    catalogUrl,
    resolveDocHref(relative) {
      return new URL(relative, docsBase).toString();
    },
    resolvePackHref(relative) {
      return new URL(relative, resolvedBase).toString();
    },
  };
  return { data, context };
}

async function loadCatalogFromCandidate(candidate, relativePath, options, modules) {
  if (isRemoteUrl(candidate) || candidate.startsWith("file://")) {
    if (candidate.startsWith("file://")) {
      const pathModule = await modules.path;
      const urlModule = await modules.url;
      const fsModule = await modules.fs;
      if (!urlModule?.fileURLToPath) {
        throw new Error("Modulo URL non disponibile per la sorgente file://");
      }
      const basePath = urlModule.fileURLToPath(candidate);
      return readLocalCatalog(basePath, relativePath, { fs: fsModule, path: pathModule, url: urlModule });
    }
    return readRemoteCatalog(candidate, relativePath, options);
  }
  const fsModule = await modules.fs;
  const pathModule = await modules.path;
  const urlModule = await modules.url;
  return readLocalCatalog(candidate, relativePath, { fs: fsModule, path: pathModule, url: urlModule });
}

export async function loadPackCatalog(options = {}) {
  const catalogRelativePath = options.catalogPath ?? DEFAULT_CATALOG_PATH;
  const candidates = Array.isArray(options.candidates)
    ? options.candidates
    : candidatePackRoots(options);

  const modules = {
    fs: loadFsModule(),
    path: loadPathModule(),
    url: loadUrlModule(),
  };

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const result = await loadCatalogFromCandidate(candidate, catalogRelativePath, options, modules);
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
      if (options.verbose) {
        console.warn("Tentativo di caricamento del catalogo fallito", candidate, error);
      }
    }
  }

  const failure = new Error("Impossibile caricare il catalogo del pack da alcuna sorgente candidata.");
  if (lastError) {
    failure.cause = lastError;
  }
  throw failure;
}

export async function manualLoadCatalog(options = {}) {
  return loadPackCatalog(options);
}

if (typeof globalThis !== "undefined") {
  globalThis.EvoPack = globalThis.EvoPack || {};
  globalThis.EvoPack.serverUtils = globalThis.EvoPack.serverUtils || {};
  globalThis.EvoPack.PACK_PATH = PACK_PATH;
  globalThis.EvoPack.DEFAULT_BRANCH = DEFAULT_BRANCH;
  globalThis.EvoPack.serverUtils.ensureTrailingSlash = ensureTrailingSlash;
  globalThis.EvoPack.serverUtils.candidatePackRoots = candidatePackRoots;
  globalThis.EvoPack.serverUtils.getPackRootCandidates = getPackRootCandidates;
  globalThis.EvoPack.serverUtils.loadPackCatalog = loadPackCatalog;
}

