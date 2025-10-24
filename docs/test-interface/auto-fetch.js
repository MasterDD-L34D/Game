const DATA_SOURCES = [
  { key: "packs", label: "Packs", path: "data/packs.yaml" },
  { key: "telemetry", label: "Telemetry", path: "data/telemetry.yaml" },
  { key: "biomes", label: "Biomi", path: "data/biomes.yaml" },
  { key: "mating", label: "Mating", path: "data/mating.yaml" },
];

const autoState = {
  dataBase: null,
  results: new Map(),
  selectedKey: null,
};

const autoElements = {};

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
  title.textContent = `${source.label} (${source.path})`;
  header.appendChild(title);

  const badge = document.createElement("span");
  badge.className = "data-badge";
  badge.textContent = "In attesa";
  header.appendChild(badge);

  const body = document.createElement("p");
  body.className = "data-message muted";
  body.textContent = "In attesa di fetch…";

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
  DATA_SOURCES.forEach((source) => {
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

  const previous = autoState.results.get(key) || {};

  autoState.results.set(key, {
    ...previous,
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
  if (text && text.trim().length < 800) {
    return text.trim();
  }

  try {
    const snippet = JSON.stringify(parsed, null, 2);
    if (snippet.length <= 1000) {
      return snippet;
    }
    return `${snippet.slice(0, 1000)}\n…`;
  } catch (error) {
    return text ? `${text.slice(0, 1000)}\n…` : "";
  }
}

async function fetchSource(source) {
  const url = resolveDataPath(source.path);
  updateResultStatus(
    source.key,
    "loading",
    `Download da ${url}`,
    { preview: "Caricamento…" }
  );

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  let parsed;
  try {
    parsed = jsyaml.load(text);
  } catch (error) {
    throw new Error(`Errore parsing YAML: ${error.message}`);
  }

  const summary = summariseData(parsed);
  const preview = buildPreview(text, parsed);

  autoState.results.set(source.key, {
    status: "success",
    message: summary,
    preview,
    url,
  });

  updateResultStatus(source.key, "success", summary, { preview, url });
}

async function runAutoFetch() {
  if (!autoElements.results) return;

  autoState.dataBase = detectDataBase();
  updateDataSourceHint();
  autoState.results.clear();
  autoState.selectedKey = null;
  renderResultsShell();

  updateGlobalStatus("loading", "Caricamento YAML in corso…");

  const outcomes = await Promise.allSettled(
    DATA_SOURCES.map(async (source) => {
      try {
        await fetchSource(source);
        return { key: source.key, status: "success" };
      } catch (error) {
        console.error(`Errore nel fetch di ${source.path}`, error);
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

  const hasError = outcomes.some((outcome) => outcome.value?.status === "error");
  if (hasError) {
    updateGlobalStatus("error", "Caricamento completato con errori. Controlla i dettagli sopra.");
  } else {
    updateGlobalStatus("success", "Caricamento completato con successo.");
  }

  if (!autoState.selectedKey && autoState.results.size > 0) {
    const firstKey = DATA_SOURCES[0]?.key;
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

document.addEventListener("DOMContentLoaded", () => {
  setupAutoDom();
  setupEventListeners();
  renderResultsShell();
  runAutoFetch();
});
