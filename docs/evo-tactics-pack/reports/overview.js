import { loadPackCatalog } from "../pack-data.js";

const summaryEl = document.getElementById("overview-summary");
const metricsEl = document.getElementById("overview-metrics");
const connectionsTable = document.getElementById("connections-table");
const datasetsList = document.getElementById("overview-datasets");
const biomesGrid = document.getElementById("overview-biomes");
const pipelineList = document.getElementById("pipeline-list");
const pipelineError = document.getElementById("pipeline-error");
const flagMetricsEl = document.getElementById("flag-metrics");
const bridgeTable = document.getElementById("bridge-table");

const FLAG_LABELS = [
  ["apex", "Apex"],
  ["keystone", "Keystone"],
  ["bridge", "Bridge"],
  ["threat", "Threat"],
  ["event", "Eventi"],
  ["sentient", "Sentienti"],
];

const STAGE_LABELS = {
  "validate_ecosistema_v2_0.py": "Validazione meta-ecosistema",
  "validate_cross_foodweb_v1_0.py": "Validazione connessioni cross-bioma",
  "validate_bioma_v1_1.py": "Validazione bioma",
  "validate_species_v1_7.py": "Validazione specie",
  "validate_foodweb_v1_0.py": "Validazione foodweb",
};

function setSummary(message) {
  if (summaryEl) {
    summaryEl.textContent = message;
  }
}

function createMetric(label, value) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.innerHTML = `<strong>${value}</strong> ${label}`;
  return chip;
}

function renderMetrics({ biomi, species, connessioni, generatedAt }) {
  if (!metricsEl) return;
  metricsEl.innerHTML = "";
  metricsEl.appendChild(createMetric("Biomi", biomi));
  metricsEl.appendChild(createMetric("Specie", species));
  metricsEl.appendChild(createMetric("Connessioni", connessioni));
  if (generatedAt) {
    metricsEl.appendChild(createMetric("Ultimo export", generatedAt));
  }
}

function renderConnections(connections) {
  if (!connectionsTable) return;
  connectionsTable.innerHTML = "";

  const head = document.createElement("thead");
  head.innerHTML = `
    <tr>
      <th>Da</th>
      <th>A</th>
      <th>Tipo</th>
      <th>Resistenza</th>
      <th>Stagionalità</th>
      <th>Note</th>
    </tr>`;
  connectionsTable.appendChild(head);

  const body = document.createElement("tbody");
  if (!connections.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "Nessuna connessione registrata.";
    row.appendChild(cell);
    body.appendChild(row);
  } else {
    connections.forEach((conn) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${conn.from}</td>
        <td>${conn.to}</td>
        <td>${conn.type.replace(/_/g, " ")}</td>
        <td>${conn.resistance ?? "—"}</td>
        <td>${conn.seasonality || "—"}</td>
        <td>${conn.notes || ""}</td>`;
      body.appendChild(row);
    });
  }
  connectionsTable.appendChild(body);
}

function appendDataset(label, href, options = {}) {
  if (!datasetsList || !href) return;
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  if (options.external) {
    link.target = "_blank";
    link.rel = "noreferrer";
  }
  item.appendChild(link);
  if (options.note) {
    const note = document.createElement("span");
    note.className = "form__hint";
    note.textContent = ` — ${options.note}`;
    item.appendChild(note);
  }
  datasetsList.appendChild(item);
}

function renderDatasets(context, data) {
  if (!datasetsList) return;
  datasetsList.innerHTML = "";
  appendDataset("catalog_data.json", context.catalogUrl, { external: true, note: "Export aggregato" });
  appendDataset("Validator HTML", context.resolvePackHref("out/validation/last_report.html"), {
    external: true,
    note: "Ultimo report CI",
  });
  appendDataset("Validator JSON", context.resolvePackHref("out/validation/last_report.json"), {
    external: true,
    note: "Dettaglio macchine e warning",
  });
  appendDataset("Meta network YAML", context.resolvePackHref("data/ecosystems/network/meta_network_alpha.yaml"), {
    external: true,
    note: "Schema 2.0",
  });
  appendDataset("Meta ecosistema YAML", context.resolvePackHref("data/ecosistemi/meta_ecosistema_alpha.yaml"), {
    external: true,
    note: "Ricevuta & regole",
  });
  appendDataset("Cross events YAML", context.resolvePackHref("data/ecosistemi/cross_events.yaml"), {
    external: true,
    note: "Propagazione eventi",
  });
  (data.ecosistema?.biomi || []).forEach((biomeRef) => {
    appendDataset(`Bioma YAML · ${biomeRef.id}`, context.resolveDocHref(biomeRef.path), {
      external: true,
    });
  });
}

function formatActiveFlags(flags) {
  return Object.entries(flags || {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
}

function renderFlagMetrics(species) {
  if (!flagMetricsEl) return;
  flagMetricsEl.innerHTML = "";
  const counts = new Map();
  (species || []).forEach((sp) => {
    FLAG_LABELS.forEach(([flag]) => {
      if (sp.flags?.[flag]) {
        counts.set(flag, (counts.get(flag) || 0) + 1);
      }
    });
  });
  FLAG_LABELS.forEach(([flag, label]) => {
    const chip = createMetric(label, counts.get(flag) || 0);
    chip.classList.add("chip--compact");
    flagMetricsEl.appendChild(chip);
  });
}

function renderBridgeSpecies(context, species) {
  if (!bridgeTable) return;
  bridgeTable.innerHTML = "";

  const bridges = (species || [])
    .filter((sp) => sp.flags?.bridge)
    .sort((a, b) => a.display_name.localeCompare(b.display_name, "it", { sensitivity: "base" }));

  const head = document.createElement("thead");
  head.innerHTML = `
    <tr>
      <th>Specie</th>
      <th>Biomi</th>
      <th>Ruolo trofico</th>
      <th>Flag attivi</th>
      <th>Dataset</th>
    </tr>`;
  bridgeTable.appendChild(head);

  const body = document.createElement("tbody");
  if (!bridges.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "Nessuna specie ponte definita.";
    row.appendChild(cell);
    body.appendChild(row);
  } else {
    bridges.forEach((sp) => {
      const row = document.createElement("tr");
      const flags = formatActiveFlags(sp.flags).join(", ") || "—";
      const biomes = (sp.biomes || []).join(", ") || "—";
      const href = context.resolveDocHref(sp.path);
      row.innerHTML = `
        <td>
          <strong>${sp.display_name}</strong>
          <p class="form__hint">(${sp.id})</p>
        </td>
        <td>${biomes}</td>
        <td>${sp.role_trofico || "—"}</td>
        <td>${flags}</td>
        <td><a href="${href}" target="_blank" rel="noreferrer">Apri YAML</a></td>`;
      body.appendChild(row);
    });
  }
  bridgeTable.appendChild(body);
}

function renderBiomeCard(context, biome) {
  const card = document.createElement("article");
  card.className = "card";

  const title = document.createElement("h3");
  title.textContent = biome.id;

  const manifest = document.createElement("div");
  manifest.className = "chip-list chip-list--compact";
  Object.entries(biome.manifest?.species_counts ?? {}).forEach(([key, value]) => {
    manifest.appendChild(createMetric(key, value));
  });

  const groups = document.createElement("p");
  groups.className = "form__hint";
  groups.textContent = `Functional groups: ${(biome.manifest?.functional_groups_present || []).join(", ") || "n/d"}`;

  const links = document.createElement("p");
  links.className = "form__hint";
  const parts = [];
  parts.push(`<a href="${context.resolveDocHref(biome.path)}" target="_blank" rel="noreferrer">Bioma YAML</a>`);
  if (biome.foodweb?.path) {
    parts.push(
      `<a href="${context.resolveDocHref(biome.foodweb.path)}" target="_blank" rel="noreferrer">Foodweb YAML</a>`
    );
    parts.push(
      `<a href="${context.resolveDocHref(`foodweb_png/${biome.id}.png`)}" target="_blank" rel="noreferrer">Foodweb PNG</a>`
    );
  }
  parts.push(`<a href="biomes/${biome.id}.html">Report web</a>`);
  links.innerHTML = parts.join(" · ");

  card.append(title, manifest, groups, links);
  return card;
}

function renderBiomes(context, biomes) {
  if (!biomesGrid) return;
  biomesGrid.innerHTML = "";
  biomes.forEach((biome) => {
    biomesGrid.appendChild(renderBiomeCard(context, biome));
  });
}

function createStatusChip(status, label) {
  const chip = document.createElement("span");
  chip.className = "chip chip--compact";
  chip.dataset.status = status;
  chip.textContent = label;
  return chip;
}

function parseValidationStage(report) {
  const command = report.cmd || "";
  const tokens = command.split(/\s+/).filter(Boolean);
  const scriptToken = tokens.find((token) => token.endsWith(".py"));
  const scriptName = scriptToken ? scriptToken.split("/").pop() : null;
  const scriptIndex = scriptToken ? tokens.indexOf(scriptToken) : -1;

  let target = null;
  if (scriptIndex >= 0) {
    const candidate = tokens[scriptIndex + 1];
    if (candidate && !candidate.startsWith("-")) {
      target = candidate;
    }
  }

  if (!target && tokens.includes("--species-root")) {
    const idx = tokens.indexOf("--species-root");
    target = tokens[idx + 1];
  }

  const normalizedTarget = target ? target.split("/").pop() : null;
  const label = scriptName ? STAGE_LABELS[scriptName] || scriptName.replace(/_/g, " ").replace(/\.py$/, "") : "Stage pipeline";

  return {
    label,
    script: scriptName,
    target: normalizedTarget,
  };
}

async function loadValidationReport(context) {
  const url = context.resolvePackHref("out/validation/last_report.json");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function formatStageHeading(stage) {
  if (!stage.target) {
    return stage.label;
  }
  const cleaned = stage.target.replace(/\.(ya?ml)$/i, "");
  return `${stage.label} · ${cleaned}`;
}

async function renderPipelineStatus(context) {
  if (!pipelineList) return;
  pipelineList.innerHTML = "";
  if (pipelineError) {
    pipelineError.hidden = true;
  }

  try {
    const report = await loadValidationReport(context);
    const entries = Array.isArray(report.reports) ? report.reports : [];

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "form__hint";
      empty.textContent = "Nessun esito registrato per la pipeline.";
      pipelineList.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const item = document.createElement("article");
      item.className = "feed__item";

      const stage = parseValidationStage(entry);
      const heading = document.createElement("h4");
      heading.textContent = formatStageHeading(stage);

      const statusLine = document.createElement("div");
      statusLine.className = "chip-list chip-list--compact";
      const hasWarning = /warn/i.test(entry.stdout || "") || /warn/i.test(entry.stderr || "");
      const status = entry.code === 0 ? (hasWarning ? "warn" : "ok") : "error";
      const label =
        status === "ok"
          ? "OK"
          : status === "warn"
          ? "Warning"
          : entry.code !== undefined
          ? `Errore (${entry.code})`
          : "Errore";
      statusLine.appendChild(createStatusChip(status, label));

      const details = [entry.stdout, entry.stderr]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(" \u2022 ");

      item.append(heading, statusLine);

      if (details) {
        const note = document.createElement("p");
        note.textContent = details;
        item.appendChild(note);
      } else if (stage.script) {
        const scriptNote = document.createElement("p");
        scriptNote.className = "form__hint";
        scriptNote.textContent = stage.script;
        item.appendChild(scriptNote);
      }

      pipelineList.appendChild(item);
    });
  } catch (error) {
    console.warn("Impossibile caricare il report di validazione", error);
    if (pipelineError) {
      pipelineError.textContent = "Impossibile recuperare gli esiti della pipeline di validazione.";
      pipelineError.hidden = false;
    }
  }
}

function formatGeneratedAt(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("it-IT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function init() {
  setSummary("Caricamento in corso…");
  try {
    const { data, context } = await loadPackCatalog();
    const biomeCount = data.biomi?.length ?? 0;
    const speciesCount = data.species?.length ?? 0;
    const connectionCount = data.ecosistema?.connessioni?.length ?? 0;
    const generatedAt = formatGeneratedAt(data.generated_at);

    setSummary(
      `${data.ecosistema?.label ?? "Meta-ecosistema"} — ${biomeCount} biomi, ${speciesCount} specie, ${connectionCount} connessioni.`
    );
    renderMetrics({ biomi: biomeCount, species: speciesCount, connessioni: connectionCount, generatedAt });
    renderConnections(data.ecosistema?.connessioni ?? []);
    renderDatasets(context, data);
    renderBiomes(context, data.biomi ?? []);
    renderFlagMetrics(data.species ?? []);
    renderBridgeSpecies(context, data.species ?? []);
    await renderPipelineStatus(context);
  } catch (error) {
    console.error("Impossibile caricare il catalogo del pack", error);
    setSummary("Errore durante il caricamento del pack. Controlla la console del browser.");
    if (pipelineError) {
      pipelineError.textContent = "Pipeline non disponibile per errore nel caricamento del pack.";
      pipelineError.hidden = false;
    }
  }
}

init();
