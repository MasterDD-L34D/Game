import { loadPackCatalog } from "../pack-data.js";

const summaryEl = document.getElementById("overview-summary");
const metricsEl = document.getElementById("overview-metrics");
const connectionsTable = document.getElementById("connections-table");
const datasetsList = document.getElementById("overview-datasets");
const biomesGrid = document.getElementById("overview-biomes");

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
  (data.ecosistema?.biomi || []).forEach((biomeRef) => {
    appendDataset(`Bioma YAML · ${biomeRef.id}`, context.resolveDocHref(biomeRef.path), {
      external: true,
    });
  });
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
  } catch (error) {
    console.error("Impossibile caricare il catalogo del pack", error);
    setSummary("Errore durante il caricamento del pack. Controlla la console del browser.");
  }
}

init();
