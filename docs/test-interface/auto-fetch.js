const DEFAULT_SOURCES = [
  { key: "packs", label: "Packs", path: "data/packs.yaml", format: "yaml" },
  {
    key: "telemetry",
    label: "Telemetry",
    path: "data/core/telemetry.yaml",
    format: "yaml",
  },
  { key: "biomes", label: "Biomi", path: "data/core/biomes.yaml", format: "yaml" },
  { key: "mating", label: "Mating", path: "data/core/mating.yaml", format: "yaml" },
];

const EXTERNAL_MANIFEST_PATH = "data/external/auto_external_sources.yaml";
let manifestLoaded = false;
let dataSources = [...DEFAULT_SOURCES];
const TEXT_PREVIEW_LIMIT = 1000;

const autoState = {
  dataBase: null,
  results: new Map(),
  selectedKey: null,
};

const autoElements = {};

function getDataSources() {
  return dataSources;
}

function normalizeManifestEntry(entry) {
  if (!entry || typeof entry !== "object") return null;

  const key = entry.key || entry.name;
  const path = entry.path || entry.url;
  if (!key || !path) return null;

  const normalized = {
    key,
    path,
    label: entry.label || entry.title || key,
    format: entry.format || entry.type || "auto",
  };

  if (entry.description) {
    normalized.description = entry.description;
  } else if (entry.notes) {
    normalized.description = entry.notes;
  }

  return normalized;
}

async function ensureManifestLoaded() {
  if (manifestLoaded) return;
  manifestLoaded = true;

  try {
    const manifestPath = resolveDataPath(EXTERNAL_MANIFEST_PATH);
    const response = await fetch(manifestPath, { cache: "no-store" });
    if (!response.ok) {
      if (response.status !== 404) {
        console.warn(
          "Manifest esterno non disponibile",
          manifestPath,
          response.status,
          response.statusText
        );
      }
      return;
    }

    const text = await response.text();
    let manifest;
    try {
      manifest = jsyaml.load(text);
    } catch (error) {
      console.error("Impossibile interpretare il manifest esterno", error);
      return;
    }

    const entries = Array.isArray(manifest)
      ? manifest
      : Array.isArray(manifest?.sources)
      ? manifest.sources
      : [];

    entries
      .map(normalizeManifestEntry)
      .filter(Boolean)
      .forEach((entry) => {
        if (dataSources.some((source) => source.key === entry.key)) {
          return;
        }
        dataSources.push(entry);
      });
  } catch (error) {
    console.error("Errore durante il caricamento del manifest esterno", error);
  }
}

function setupAutoDom() {
  autoElements.dataSource = document.getElementById("auto-data-source");
  autoElements.globalStatus = document.getElementById("auto-global-status");
  autoElements.results = document.getElementById("auto-results");
  autoElements.preview = document.getElementById("auto-preview");
  autoElements.reload = document.getElementById("auto-reload");
}

function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeBase(value) {
  if (!value) return null;

  try {
    const absolute = new URL(value, window.location.href);
    return ensureTrailingSlash(absolute.toString());
  } catch (error) {
    console.warn("Impossibile normalizzare la sorgente dati", value, error);
    return ensureTrailingSlash(value);
  }
}

function detectDataBase() {
  const params = new URLSearchParams(window.location.search);
  const override = params.get("data-root");
  if (override) {
    return normalizeBase(override);
  }

  const metaOverride = document
    .querySelector('meta[name="data-root"]')
    ?.getAttribute("content");
  if (metaOverride) {
    return normalizeBase(metaOverride);
  }

  if (window.location.hostname.endsWith("github.io")) {
    const owner = window.location.hostname.split(".")[0];
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const repo = pathParts.length > 0 ? pathParts[0] : "";
    const branch =
      params.get("ref") ||
      document.querySelector('meta[name="data-branch"]')?.getAttribute("content") ||
      "main";

    if (owner && repo) {
      return ensureTrailingSlash(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`
      );
    }
  }

  if (window.location.origin.startsWith("http")) {
    return ensureTrailingSlash(`${window.location.origin}/`);
  }

  return null;
}

function resolveDataPath(path) {
  if (!autoState.dataBase) {
    autoState.dataBase = detectDataBase();
    updateDataSourceHint();
  }

  if (!autoState.dataBase) {
    return path;
  }

  return new URL(path, autoState.dataBase).toString();
}

function updateDataSourceHint() {
  if (!autoElements.dataSource) return;

  if (!autoState.dataBase) {
    autoElements.dataSource.textContent = "Sorgente dati: in rilevamento…";
    return;
  }

  autoElements.dataSource.textContent = `Sorgente dati: ${autoState.dataBase}`;
}

function updateGlobalStatus(status, message) {
  if (!autoElements.globalStatus) return;
  autoElements.globalStatus.dataset.status = status;
  autoElements.globalStatus.textContent = message;
}

function createResultItem(source) {
  const item = document.createElement("li");
  item.className = "data-result";
  item.dataset.key = source.key;

  const header = document.createElement("div");
  header.className = "data-result-header";

  const title = document.createElement("h3");
  const target = source.path || source.url || "";
  title.textContent = target
    ? `${source.label} (${target})`
    : source.label;
  header.appendChild(title);

  const badge = document.createElement("span");
  badge.className = "data-badge";
  badge.textContent = "In attesa";
  header.appendChild(badge);

  const body = document.createElement("p");
  body.className = "data-message muted";
  const description = source.description || "In attesa di fetch…";
  body.textContent = description;
  if (source.description) {
    body.classList.remove("muted");
  }

  item.appendChild(header);
  item.appendChild(body);

  item.addEventListener("click", () => {
    selectResult(source.key);
  });

  return item;
}

function renderResultsShell() {
  if (!autoElements.results) return;

  autoElements.results.innerHTML = "";
  getDataSources().forEach((source) => {
    const item = createResultItem(source);
    autoElements.results.appendChild(item);
  });
}

function selectResult(key) {
  autoState.selectedKey = key;
  autoElements.results
    ?.querySelectorAll(".data-result")
    .forEach((element) => {
      element.classList.toggle("is-selected", element.dataset.key === key);
    });

  const result = autoState.results.get(key);
  if (!result) {
    autoElements.preview.textContent = "Nessun dataset selezionato.";
    return;
  }

  autoElements.preview.textContent = result.preview || "(Nessuna preview disponibile)";
}

function updateResultStatus(key, status, message, details) {
  const item = autoElements.results?.querySelector(`.data-result[data-key="${key}"]`);
  if (!item) return;

  const badge = item.querySelector(".data-badge");
  const body = item.querySelector(".data-message");

  item.dataset.status = status;
  if (badge) {
    badge.dataset.status = status;
    badge.textContent = statusLabel(status);
  }
  if (body) {
    body.textContent = message;
    body.classList.toggle("muted", status !== "error");
  }

  autoState.results.set(key, {
    ...autoState.results.get(key),
    status,
    message,
    ...details,
  });

  if (autoState.selectedKey === key) {
    selectResult(key);
  }
}

function statusLabel(status) {
  switch (status) {
    case "success":
      return "OK";
    case "error":
      return "Errore";
    case "loading":
      return "Caricamento";
    default:
      return "In attesa";
  }
}

function summariseData(value) {
  if (value == null) return "Dataset vuoto";
  if (Array.isArray(value)) {
    return `Array con ${value.length} elementi`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return `Oggetto con ${keys.length} chiavi`;
  }
  return `Valore ${typeof value}`;
}

function buildPreview(text, parsed) {
  if (text) {
    const trimmed = text.trim();
    if (trimmed.length <= TEXT_PREVIEW_LIMIT * 0.8) {
      return trimmed;
    }
  }

  try {
    const snippet = JSON.stringify(parsed, null, 2);
    if (snippet.length <= TEXT_PREVIEW_LIMIT) {
      return snippet;
    }
    return `${snippet.slice(0, TEXT_PREVIEW_LIMIT)}\n…`;
  } catch (error) {
    return buildTextPreview(text || "");
  }
}

function buildTextPreview(text, limit = TEXT_PREVIEW_LIMIT) {
  if (!text) {
    return "(contenuto vuoto)";
  }

  const trimmed = text.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }

  return `${trimmed.slice(0, limit)}\n…`;
}

function detectSourceFormat(source, contentType, url) {
  const declared = (source.format || "").toLowerCase();
  if (declared && declared !== "auto") {
    return declared;
  }

  const normalizedType = (contentType || "").toLowerCase();
  if (normalizedType.includes("yaml") || normalizedType.includes("yml")) {
    return "yaml";
  }
  if (normalizedType.includes("json")) {
    return "json";
  }
  if (normalizedType.includes("html")) {
    return "html";
  }
  if (normalizedType.includes("markdown") || normalizedType.includes("md")) {
    return "markdown";
  }
  if (normalizedType.includes("text")) {
    return "text";
  }

  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith(".yaml") || lowerUrl.endsWith(".yml")) {
    return "yaml";
  }
  if (lowerUrl.endsWith(".json")) {
    return "json";
  }
  if (lowerUrl.endsWith(".md") || lowerUrl.endsWith(".markdown")) {
    return "markdown";
  }
  if (lowerUrl.includes("wikipedia.org") || lowerUrl.includes("/canvas/")) {
    return "html";
  }

  return "text";
}

function summarisePlainText(text, label = "Testo") {
  const normalized = text || "";
  const wordCount = normalized.trim() ? normalized.trim().split(/\s+/).length : 0;
  const charCount = normalized.length;
  return {
    summary: `${label} (${wordCount} parole, ${charCount} caratteri)`,
    preview: buildTextPreview(normalized),
  };
}

function summariseMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const headingCount = lines.filter((line) => /^#{1,6}\s+/.test(line)).length;
  const plain = summarisePlainText(text, "Markdown");
  const summary = `${plain.summary} · ${headingCount} heading`;
  return { summary, preview: plain.preview };
}

function parseHtmlContent(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    doc.querySelectorAll("script,style,noscript").forEach((node) => node.remove());

    const title = doc.querySelector("title")?.textContent?.trim() || "";
    const headings = Array.from(doc.querySelectorAll("h1, h2, h3"))
      .map((node) => node.textContent?.trim())
      .filter(Boolean);
    const bodyText = doc.body?.textContent?.replace(/\s+/g, " ").trim() || "";

    return { title, headings, text: bodyText };
  } catch (error) {
    console.warn("Errore durante il parsing HTML", error);
    return { title: "", headings: [], text: html.slice(0, TEXT_PREVIEW_LIMIT) };
  }
}

function summariseHtml(info, url) {
  const segments = [];
  if (info.title) {
    segments.push(`“${info.title}”`);
  }

  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch (error) {
      return null;
    }
  })();

  const charCount = info.text?.length || 0;
  const headingCount = info.headings?.length || 0;

  let description = `Pagina HTML (${charCount} caratteri)`;
  if (hostname) {
    description = `${description} · ${hostname}`;
  }
  if (headingCount) {
    description = `${description} · ${headingCount} heading`;
  }

  segments.push(description);
  return { summary: segments.join(" · "), preview: buildTextPreview(info.text || ""), info };
}

function interpretSourcePayload({ source, text, contentType, url }) {
  const format = detectSourceFormat(source, contentType, url);

  if (format === "yaml") {
    try {
      const parsed = jsyaml.load(text);
      return {
        format,
        parsed,
        summary: summariseData(parsed),
        preview: buildPreview(text, parsed),
      };
    } catch (error) {
      throw new Error(`Errore parsing YAML: ${error.message}`);
    }
  }

  if (format === "json") {
    try {
      const parsed = JSON.parse(text);
      return {
        format,
        parsed,
        summary: summariseData(parsed),
        preview: buildPreview(text, parsed),
      };
    } catch (error) {
      throw new Error(`Errore parsing JSON: ${error.message}`);
    }
  }

  if (format === "markdown") {
    const details = summariseMarkdown(text);
    return { format, summary: details.summary, preview: details.preview, text };
  }

  if (format === "html") {
    const info = parseHtmlContent(text);
    const details = summariseHtml(info, url);
    return {
      format,
      summary: details.summary,
      preview: details.preview,
      html: info,
      text: info.text,
    };
  }

  const details = summarisePlainText(text, "Contenuto testuale");
  return { format: "text", summary: details.summary, preview: details.preview, text };
}

async function fetchSource(source) {
  const target = source.path || source.url;
  if (!target) {
    throw new Error("Sorgente non valida: nessun path/url definito");
  }

  const url = resolveDataPath(target);
  updateResultStatus(source.key, "loading", `Download da ${url}`, {
    preview: "Caricamento…",
  });

  let response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (networkError) {
    throw new Error(`Richiesta fallita: ${networkError.message}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  const interpreted = interpretSourcePayload({
    source,
    text,
    contentType,
    url,
  });

  const resultPayload = {
    status: "success",
    message: interpreted.summary,
    preview: interpreted.preview,
    url,
    format: interpreted.format,
  };

  if (interpreted.parsed !== undefined) {
    resultPayload.parsed = interpreted.parsed;
  }
  if (interpreted.html) {
    resultPayload.html = interpreted.html;
  }
  if (interpreted.text !== undefined) {
    resultPayload.text = interpreted.text;
  }

  autoState.results.set(source.key, resultPayload);

  updateResultStatus(source.key, "success", interpreted.summary, {
    preview: interpreted.preview,
    url,
  });
}

async function runAutoFetch() {
  if (!autoElements.results) return;

  autoState.dataBase = detectDataBase();
  updateDataSourceHint();
  await ensureManifestLoaded();
  autoState.results.clear();
  autoState.selectedKey = null;
  renderResultsShell();

  updateGlobalStatus("loading", "Caricamento fonti in corso…");

  const outcomes = await Promise.allSettled(
    getDataSources().map(async (source) => {
      try {
        await fetchSource(source);
        return { key: source.key, status: "success" };
      } catch (error) {
        const identifier = source.path || source.url || source.key;
        console.error(`Errore nel fetch di ${identifier}`, error);
        autoState.results.set(source.key, {
          status: "error",
          message: error.message,
          preview: error.stack,
        });
        updateResultStatus(source.key, "error", error.message, {
          preview: error.stack,
        });
        return { key: source.key, status: "error" };
      }
    })
  );

  const hasError = outcomes.some((outcome) => {
    if (outcome.status === "rejected") {
      return true;
    }
    return outcome.value?.status === "error";
  });
  if (hasError) {
    updateGlobalStatus("error", "Caricamento completato con errori. Controlla i dettagli sopra.");
  } else {
    updateGlobalStatus("success", "Caricamento completato con successo.");
  }

  if (!autoState.selectedKey && autoState.results.size > 0) {
    const firstKey = getDataSources()[0]?.key;
    if (firstKey) {
      selectResult(firstKey);
    }
  }
}

function setupEventListeners() {
  if (autoElements.reload) {
    autoElements.reload.addEventListener("click", () => {
      runAutoFetch();
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setupAutoDom();
  setupEventListeners();
  await ensureManifestLoaded();
  renderResultsShell();
  runAutoFetch();
});
