const STORAGE_KEY = "evo-support-hub-config";

const elements = {
  repoInput: document.getElementById("repo-input"),
  branchInput: document.getElementById("branch-input"),
  dataRootInput: document.getElementById("data-root-input"),
  configForm: document.getElementById("config-form"),
  resetButton: document.getElementById("reset-config"),
  openButton: document.getElementById("open-simulator"),
  heroOpenButton: document.getElementById("hero-open-simulator"),
  simulatorFrame: document.getElementById("simulator-frame"),
  simulatorLink: document.getElementById("simulator-link"),
  dataRootPreview: document.getElementById("data-root-preview"),
  refreshActivity: document.getElementById("refresh-activity"),
  refreshChangelog: document.getElementById("refresh-changelog"),
  activityFeed: document.getElementById("activity-feed"),
  changelogFeed: document.getElementById("changelog-feed"),
  lastActivity: document.getElementById("last-activity"),
  activeBranch: document.getElementById("active-branch"),
  changelogStatus: document.getElementById("changelog-status"),
  datasetStatus: document.getElementById("dataset-status"),
  datasetUpdated: document.getElementById("dataset-updated"),
  refreshDatasets: document.getElementById("refresh-datasets"),
};

const datasetMetricElements = {
  forms: document.querySelector('[data-dataset-metric="forms"]'),
  random: document.querySelector('[data-dataset-metric="random"]'),
  indices: document.querySelector('[data-dataset-metric="indices"]'),
  biomes: document.querySelector('[data-dataset-metric="biomes"]'),
  speciesSlots: document.querySelector('[data-dataset-metric="speciesSlots"]'),
  speciesSynergies: document.querySelector('[data-dataset-metric="speciesSynergies"]'),
};

const DATASET_SOURCES = [
  { key: "packs", path: "data/packs.yaml", label: "Pack" },
  { key: "telemetry", path: "data/telemetry.yaml", label: "Telemetria" },
  { key: "biomes", path: "data/biomes.yaml", label: "Biomi" },
  { key: "species", path: "data/species.yaml", label: "Specie" },
];

const defaultConfig = {
  repo: detectDefaultRepo(),
  branch: "main",
  dataRoot: "",
};

let currentConfig = loadConfig();

function detectDefaultRepo() {
  try {
    if (window.location.hostname.endsWith("github.io")) {
      const [owner] = window.location.hostname.split(".");
      const [repo] = window.location.pathname.split("/").filter(Boolean);
      if (owner && repo) {
        return `${owner}/${repo}`;
      }
    }
  } catch (error) {
    console.warn("Impossibile rilevare repository di default", error);
  }
  return "";
}

function loadConfig() {
  try {
    const saved = window.localStorage?.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultConfig, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.warn("Impossibile leggere la configurazione salvata", error);
  }
  return { ...defaultConfig };
}

function saveConfig(config) {
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn("Impossibile salvare la configurazione", error);
  }
}

function sanitizeRepo(value) {
  if (!value) return "";
  return value
    .trim()
    .replace(/^https?:\/\/github.com\//i, "")
    .replace(/\.git$/i, "");
}

function ensureTrailingSlash(value) {
  if (!value) return value;
  return value.endsWith("/") ? value : `${value}/`;
}

function computeDataRoot(config = currentConfig) {
  if (config.dataRoot) {
    return ensureTrailingSlash(config.dataRoot.trim());
  }
  if (config.repo && config.branch) {
    return ensureTrailingSlash(
      `https://raw.githubusercontent.com/${config.repo}/${config.branch}/`
    );
  }
  return "";
}

function computeSimulatorUrl(config = currentConfig) {
  let baseReference = window.location.href;
  try {
    if (window.location.origin && window.location.origin !== "null") {
      baseReference = window.location.origin + window.location.pathname;
    }
  } catch (error) {
    console.warn("Impossibile calcolare la base di riferimento", error);
  }

  const url = new URL("test-interface/", baseReference);
  const params = new URLSearchParams();
  const dataRoot = computeDataRoot(config);
  if (dataRoot) {
    params.set("data-root", dataRoot);
  }
  if (config.branch) {
    params.set("ref", config.branch);
  }
  url.search = params.toString();
  return url.toString();
}

function updateSimulatorPreview() {
  const dataRoot = computeDataRoot();
  const simulatorUrl = computeSimulatorUrl();

  if (elements.dataRootPreview) {
    if (dataRoot) {
      elements.dataRootPreview.textContent = dataRoot;
      elements.dataRootPreview.href = dataRoot.startsWith("http")
        ? dataRoot
        : simulatorUrl;
    } else {
      elements.dataRootPreview.textContent = "Rilevamento automatico";
      elements.dataRootPreview.href = simulatorUrl;
    }
  }

  if (elements.simulatorLink) {
    elements.simulatorLink.textContent = simulatorUrl;
    elements.simulatorLink.href = simulatorUrl;
  }

  if (elements.simulatorFrame) {
    elements.simulatorFrame.src = simulatorUrl;
  }
}

function populateForm() {
  if (elements.repoInput) {
    elements.repoInput.value = currentConfig.repo;
  }
  if (elements.branchInput) {
    elements.branchInput.value = currentConfig.branch;
  }
  if (elements.dataRootInput) {
    elements.dataRootInput.value = currentConfig.dataRoot;
  }
}

function formatDate(value) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("it-IT", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (error) {
    console.warn("Impossibile formattare la data", value, error);
    return value;
  }
}

const REFRESH_DATASET_DEFAULT_LABEL =
  elements.refreshDatasets?.textContent?.trim() || "Aggiorna panoramica";

let datasetLoading = false;

function getYamlParser() {
  if (typeof window === "undefined") return null;
  const parser = window.jsyaml;
  if (!parser || typeof parser.load !== "function") {
    return null;
  }
  return parser;
}

function formatMetricValue(value) {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number") {
    return value.toLocaleString("it-IT");
  }
  return String(value);
}

function clearDatasetMetrics() {
  Object.values(datasetMetricElements).forEach((element) => {
    if (element) {
      element.textContent = "—";
    }
  });
}

function setDatasetStatus(text) {
  if (elements.datasetStatus) {
    elements.datasetStatus.textContent = text;
  }
}

function setDatasetUpdated(text, source) {
  if (!elements.datasetUpdated) return;
  elements.datasetUpdated.textContent = text;
  if (source) {
    elements.datasetUpdated.title = `Sorgente dati: ${source}`;
  } else {
    elements.datasetUpdated.removeAttribute("title");
  }
}

function resetDatasetOverview(message = "In rilevamento…") {
  setDatasetStatus(message);
  clearDatasetMetrics();
  setDatasetUpdated("Ultimo fetch: —");
}

function setDatasetLoading(isLoading) {
  datasetLoading = isLoading;
  if (elements.refreshDatasets) {
    elements.refreshDatasets.disabled = isLoading;
    elements.refreshDatasets.textContent = isLoading
      ? "Aggiornamento…"
      : REFRESH_DATASET_DEFAULT_LABEL;
  }
}

function updateDatasetMetrics(metrics) {
  Object.entries(metrics).forEach(([key, value]) => {
    const element = datasetMetricElements[key];
    if (element) {
      element.textContent = formatMetricValue(value);
    }
  });
}

function computeDatasetMetrics(datasets) {
  const packs = datasets.packs;
  const hasPacks = packs && typeof packs === "object";
  const formsCount = hasPacks ? Object.keys(packs.forms || {}).length : null;
  const randomCount = hasPacks
    ? Array.isArray(packs.random_general_d20)
      ? packs.random_general_d20.length
      : 0
    : null;

  const telemetry = datasets.telemetry;
  const hasTelemetry = telemetry && typeof telemetry === "object";
  const indicesCount = hasTelemetry
    ? telemetry.indices
      ? Object.keys(telemetry.indices).length
      : 0
    : null;

  const biomes = datasets.biomes;
  const hasBiomes = biomes && typeof biomes === "object";
  const biomeCount = hasBiomes
    ? biomes.biomes
      ? Object.keys(biomes.biomes).length
      : 0
    : null;

  const species = datasets.species;
  const hasSpecies = species && typeof species === "object";
  let speciesSlotCount = null;
  let synergyCount = null;
  if (hasSpecies) {
    const slots = species.catalog?.slots;
    if (slots && typeof slots === "object") {
      speciesSlotCount = Object.values(slots).reduce((total, slotGroup) => {
        if (!slotGroup || typeof slotGroup !== "object") {
          return total;
        }
        return total + Object.keys(slotGroup).length;
      }, 0);
    } else {
      speciesSlotCount = 0;
    }

    if (Array.isArray(species.catalog?.synergies)) {
      synergyCount = species.catalog.synergies.length;
    } else {
      synergyCount = 0;
    }
  }

  return {
    forms: formsCount,
    random: randomCount,
    indices: indicesCount,
    biomes: biomeCount,
    speciesSlots: speciesSlotCount,
    speciesSynergies: synergyCount,
  };
}

function resolveDatasetUrl(base, path) {
  try {
    return new URL(path, base).toString();
  } catch (error) {
    if (!base) {
      throw error;
    }
    const separator = base.endsWith("/") ? "" : "/";
    return `${base}${separator}${path}`;
  }
}

async function fetchDatasetPayload(base, source) {
  const url = resolveDatasetUrl(base, source.path);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`(${source.label}) risposta ${response.status}`);
  }
  const text = await response.text();
  const parser = getYamlParser();
  if (!parser) {
    throw new Error("Parser YAML non disponibile");
  }
  return parser.load(text) ?? {};
}

async function loadDatasetOverview() {
  if (!elements.datasetStatus) return;
  const base = computeDataRoot();
  if (!base) {
    resetDatasetOverview("Configura la sorgente dati");
    return;
  }

  if (datasetLoading) {
    return;
  }

  setDatasetLoading(true);
  setDatasetStatus("Aggiornamento in corso…");
  setDatasetUpdated("Ultimo fetch: in corso…", base);

  try {
    const results = await Promise.allSettled(
      DATASET_SOURCES.map((source) => fetchDatasetPayload(base, source))
    );

    const datasets = {};
    const missing = [];

    results.forEach((result, index) => {
      const source = DATASET_SOURCES[index];
      if (result.status === "fulfilled") {
        datasets[source.key] = result.value;
      } else {
        missing.push(source);
        console.warn(`Impossibile caricare il dataset ${source.key}`, result.reason);
      }
    });

    if (!Object.keys(datasets).length) {
      throw new Error("Nessun dataset disponibile");
    }

    const metrics = computeDatasetMetrics(datasets);
    updateDatasetMetrics(metrics);

    const summaryParts = [];
    if (metrics.forms !== null && metrics.forms !== undefined) {
      summaryParts.push(`${formatMetricValue(metrics.forms)} forme`);
    }
    if (metrics.biomes !== null && metrics.biomes !== undefined) {
      summaryParts.push(`${formatMetricValue(metrics.biomes)} biomi`);
    }
    if (metrics.speciesSlots !== null && metrics.speciesSlots !== undefined) {
      summaryParts.push(`${formatMetricValue(metrics.speciesSlots)} slot specie`);
    }

    let statusText = summaryParts.length
      ? summaryParts.join(" · ")
      : "Dataset sincronizzati";

    if (missing.length) {
      const missingLabels = missing.map((entry) => entry.label).join(", ");
      statusText = `${statusText} · Mancanti: ${missingLabels}`.trim();
    }

    setDatasetStatus(statusText);
    setDatasetUpdated(`Ultimo fetch: ${formatDate(new Date().toISOString())}`, base);
  } catch (error) {
    console.error("Errore durante l'aggiornamento del riepilogo dataset", error);
    resetDatasetOverview("Errore durante il caricamento");
  } finally {
    setDatasetLoading(false);
  }
}

function setActivityPlaceholder(message) {
  if (elements.activityFeed) {
    elements.activityFeed.innerHTML = `<p class="placeholder">${message}</p>`;
  }
}

function renderActivity(commits = []) {
  if (!elements.activityFeed) return;
  if (!commits.length) {
    setActivityPlaceholder("Nessun commit recente trovato per la configurazione selezionata.");
    return;
  }

  const fragment = document.createDocumentFragment();
  commits.forEach((commit) => {
    const item = document.createElement("article");
    item.className = "feed__item";

    const title = document.createElement("h4");
    title.textContent = commit.title;

    const meta = document.createElement("div");
    meta.className = "feed__meta";

    const author = document.createElement("span");
    author.textContent = commit.author;
    author.style.color = "var(--text-muted)";

    const time = document.createElement("time");
    time.dateTime = commit.date;
    time.textContent = formatDate(commit.date);

    meta.append(author, document.createTextNode(" • "), time);

    const link = document.createElement("a");
    link.href = commit.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `Apri ${commit.sha.slice(0, 7)}`;

    item.append(title, meta, link);
    fragment.appendChild(item);
  });

  elements.activityFeed.innerHTML = "";
  elements.activityFeed.appendChild(fragment);
}

async function loadActivity() {
  if (!currentConfig.repo) {
    setActivityPlaceholder("Configura il repository per iniziare il monitoraggio.");
    if (elements.lastActivity) {
      elements.lastActivity.textContent = "Configurazione richiesta";
    }
    return;
  }

  setActivityPlaceholder("Recupero dati da GitHub…");

  try {
    const url = new URL(`https://api.github.com/repos/${currentConfig.repo}/commits`);
    url.searchParams.set("per_page", "5");
    if (currentConfig.branch) {
      url.searchParams.set("sha", currentConfig.branch);
    }

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      throw new Error(`GitHub API ha risposto con stato ${response.status}`);
    }

    const commits = await response.json();
    if (!Array.isArray(commits)) {
      throw new Error("Formato inatteso della risposta GitHub");
    }

    const simplified = commits.map((entry) => ({
      title: entry.commit?.message?.split("\n")[0] ?? "Commit senza titolo",
      author: entry.commit?.author?.name ?? "Autore sconosciuto",
      date: entry.commit?.author?.date ?? new Date().toISOString(),
      url: entry.html_url ?? `https://github.com/${currentConfig.repo}`,
      sha: entry.sha ?? "",
    }));

    renderActivity(simplified);

    const latest = simplified[0];
    if (latest && elements.lastActivity) {
      elements.lastActivity.textContent = formatDate(latest.date);
    }
  } catch (error) {
    console.error(error);
    setActivityPlaceholder(
      "Impossibile caricare i commit. Verifica la connessione o il rate limit delle API GitHub."
    );
    if (elements.lastActivity) {
      elements.lastActivity.textContent = "Errore nel caricamento";
    }
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdownBlock(markdown) {
  const lines = markdown.trim().split(/\r?\n/);
  const html = [];
  let inList = false;

  lines.forEach((line) => {
    if (line.startsWith("### ")) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<h4>${escapeHtml(line.slice(4).trim())}</h4>`);
      return;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${escapeHtml(line.slice(2).trim())}</li>`);
      return;
    }

    if (!line.trim()) {
      return;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    html.push(`<p>${escapeHtml(line.trim())}</p>`);
  });

  if (inList) {
    html.push("</ul>");
  }

  return html.join("");
}

function renderChangelog(sections) {
  if (!elements.changelogFeed) return;
  if (!sections.length) {
    elements.changelogFeed.innerHTML =
      '<p class="placeholder">Nessuna voce di changelog disponibile.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  sections.forEach((section) => {
    const item = document.createElement("article");
    item.className = "feed__item";

    const title = document.createElement("h4");
    title.textContent = section.title;

    const content = document.createElement("div");
    content.innerHTML = renderMarkdownBlock(section.body);

    item.append(title, content);
    fragment.appendChild(item);
  });

  elements.changelogFeed.innerHTML = "";
  elements.changelogFeed.appendChild(fragment);
}

async function loadChangelog() {
  if (elements.changelogStatus) {
    elements.changelogStatus.textContent = "Aggiornamento in corso…";
  }
  if (elements.changelogFeed) {
    elements.changelogFeed.innerHTML = '<p class="placeholder">Caricamento…</p>';
  }

  try {
    const response = await fetch("changelog.md?cache=" + Date.now());
    if (!response.ok) {
      throw new Error(`Impossibile recuperare il changelog (${response.status})`);
    }

    const text = await response.text();
    const rawSections = text.split(/^##\s+/m).slice(1);
    const sections = rawSections.slice(0, 3).map((block) => {
      const [titleLine, ...rest] = block.split(/\r?\n/);
      return {
        title: titleLine.trim(),
        body: rest.join("\n").trim(),
      };
    });

    renderChangelog(sections);
    if (elements.changelogStatus) {
      elements.changelogStatus.textContent = sections[0]
        ? sections[0].title
        : "Nessun dato";
    }
  } catch (error) {
    console.error(error);
    if (elements.changelogFeed) {
      elements.changelogFeed.innerHTML =
        '<p class="placeholder">Errore durante il caricamento del changelog.</p>';
    }
    if (elements.changelogStatus) {
      elements.changelogStatus.textContent = "Errore";
    }
  }
}

function applyConfig(config) {
  const nextConfig = {
    ...defaultConfig,
    ...currentConfig,
    ...config,
  };

  if (!nextConfig.branch) {
    nextConfig.branch = defaultConfig.branch;
  }

  currentConfig = nextConfig;

  populateForm();
  updateSimulatorPreview();
  if (elements.activeBranch) {
    elements.activeBranch.textContent = currentConfig.branch || "—";
  }
  saveConfig(currentConfig);
  loadActivity();
  loadDatasetOverview();
}

function resetConfig() {
  applyConfig({ ...defaultConfig });
}

function setupEvents() {
  elements.configForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    applyConfig({
      repo: sanitizeRepo(elements.repoInput?.value || ""),
      branch: (elements.branchInput?.value || "main").trim(),
      dataRoot: (elements.dataRootInput?.value || "").trim(),
    });
  });

  elements.resetButton?.addEventListener("click", () => {
    resetConfig();
  });

  const openSimulator = () => {
    const simulatorUrl = computeSimulatorUrl();
    window.open(simulatorUrl, "_blank", "noopener");
  };

  elements.openButton?.addEventListener("click", openSimulator);
  elements.heroOpenButton?.addEventListener("click", openSimulator);

  elements.refreshActivity?.addEventListener("click", () => {
    loadActivity();
  });

  elements.refreshChangelog?.addEventListener("click", () => {
    loadChangelog();
  });

  elements.refreshDatasets?.addEventListener("click", () => {
    loadDatasetOverview();
  });
}

function init() {
  populateForm();
  updateSimulatorPreview();
  if (elements.activeBranch) {
    elements.activeBranch.textContent = currentConfig.branch || "—";
  }
  setupEvents();
  loadChangelog();
  loadActivity();
  loadDatasetOverview();
}

init();
