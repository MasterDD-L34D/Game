import {
  loadPackCatalog,
  manualLoadCatalog,
  getPackRootCandidates,
} from "./pack-data.js";

const elements = {
  summary: document.getElementById("ecosystem-summary"),
  connections: document.getElementById("ecosystem-connections"),
  biomeCards: document.getElementById("biome-cards"),
};

let packContext = null;
let resolvedCatalogUrl = null;
let resolvedPackRoot = null;
let packDocsBase = null;

const PACK_ROOT_CANDIDATES = getPackRootCandidates();

function applyCatalogContext(context) {
  packContext = context ?? null;
  resolvedCatalogUrl = context?.catalogUrl ?? null;
  resolvedPackRoot = context?.resolvedBase ?? null;
  packDocsBase = context?.docsBase ?? null;
}

function setSummary(message) {
  if (elements.summary) {
    elements.summary.textContent = message;
  }
}

function resolvePackHref(relativePath) {
  if (!relativePath) return relativePath;
  if (packContext?.resolveDocHref) {
    try {
      return packContext.resolveDocHref(relativePath);
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite resolveDocHref", relativePath, error);
    }
  }
  if (packDocsBase) {
    try {
      return new URL(relativePath, packDocsBase).toString();
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite packDocsBase", relativePath, error);
    }
  }
  if (packContext?.resolvePackHref) {
    try {
      return packContext.resolvePackHref(relativePath);
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite resolvePackHref", relativePath, error);
    }
  }
  if (resolvedPackRoot) {
    try {
      return new URL(relativePath, resolvedPackRoot).toString();
    } catch (error) {
      console.warn("Impossibile risolvere il percorso tramite resolvedPackRoot", relativePath, error);
    }
  }
  return relativePath;
}

function formatConnectionType(type) {
  return type.replace(/_/g, " ");
}

function renderConnections(data) {
  if (!elements.connections) return;
  elements.connections.innerHTML = "";

  if (!data.connessioni?.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Nessuna connessione registrata.";
    elements.connections.appendChild(placeholder);
    return;
  }

  data.connessioni.forEach((conn) => {
    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = `${conn.from} → ${conn.to}`;

    const meta = document.createElement("p");
    meta.innerHTML = `<strong>${formatConnectionType(conn.type)}</strong> · resistenza ${
      conn.resistance ?? "—"
    } · ${conn.seasonality || "stagionalità n/d"}`;

    const notes = document.createElement("p");
    notes.textContent = conn.notes || "";

    card.append(title, meta, notes);

    elements.connections.appendChild(card);
  });
}

function createBadge(label, value) {
  const badge = document.createElement("span");
  badge.className = "chip";
  badge.textContent = `${label}: ${value}`;
  return badge;
}

function renderManifest(manifest) {
  const wrapper = document.createElement("div");
  wrapper.className = "manifest-block";

  const badgeRow = document.createElement("div");
  badgeRow.className = "chip-list chip-list--compact";
  Object.entries(manifest?.species_counts ?? {}).forEach(([key, value]) => {
    badgeRow.appendChild(createBadge(key, value));
  });
  wrapper.appendChild(badgeRow);

  if (manifest?.functional_groups_present?.length) {
    const groups = document.createElement("p");
    groups.className = "form__hint";
    groups.textContent = `Functional groups: ${manifest.functional_groups_present.join(", ")}`;
    wrapper.appendChild(groups);
  }

  return wrapper;
}

function formatFlags(flags) {
  return Object.entries(flags || {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key)
    .join(", ");
}

function renderSpeciesTable(speciesList) {
  const table = document.createElement("table");
  table.className = "table";
  const header = document.createElement("thead");
  header.innerHTML = `
    <tr>
      <th>Nome</th>
      <th>ID</th>
      <th>Ruolo trofico</th>
      <th>Tag funzionali</th>
      <th>Flags</th>
      <th>YAML</th>
    </tr>`;
  table.appendChild(header);

  const body = document.createElement("tbody");
  speciesList.forEach((sp) => {
    const row = document.createElement("tr");
    const yamlHref = resolvePackHref(sp.path);
    row.innerHTML = `
      <td>${sp.display_name}</td>
      <td>${sp.id}</td>
      <td>${sp.role_trofico || "—"}</td>
      <td>${(sp.functional_tags || []).join(", ")}</td>
      <td>${formatFlags(sp.flags)}</td>
      <td><a href="${yamlHref}" target="_blank" rel="noreferrer">Apri</a></td>`;
    body.appendChild(row);
  });
  table.appendChild(body);
  return table;
}

function renderBiomeCard(biome) {
  const card = document.createElement("article");
  card.className = "card";
  card.id = `bioma-${biome.id}`;

  const title = document.createElement("h3");
  title.textContent = `Bioma — ${biome.id}`;

  const linkRow = document.createElement("p");
  linkRow.className = "form__hint";
  const biomeYaml = resolvePackHref(biome.path);
  const manifestYaml = biome.manifest?.path ? resolvePackHref(biome.manifest.path) : null;
  const foodwebYaml = biome.foodweb?.path ? resolvePackHref(biome.foodweb.path) : null;
  const foodwebPng = resolvePackHref(`foodweb_png/${biome.id}.png`);
  const legacyReport = resolvePackHref(`biomes/${biome.id}.html`);
  const webReport = `reports/biomes/${biome.id}.html`;
  const links = [`<a href="${biomeYaml}" target="_blank" rel="noreferrer">Bioma YAML</a>`];
  if (manifestYaml) {
    links.push(`<a href="${manifestYaml}" target="_blank" rel="noreferrer">Manifest</a>`);
  }
  if (foodwebYaml) {
    links.push(`<a href="${foodwebYaml}" target="_blank" rel="noreferrer">Foodweb YAML</a>`);
    links.push(`<a href="${foodwebPng}" target="_blank" rel="noreferrer">Foodweb PNG</a>`);
  }
  links.push(`<a href="${webReport}">Report web</a>`);
  links.push(
    `<a href="${legacyReport}" target="_blank" rel="noreferrer">Report originale</a>`
  );
  linkRow.innerHTML = links.join(" · ");

  const manifestBlock = renderManifest(biome.manifest);
  const speciesTable = renderSpeciesTable(biome.species || []);

  card.append(title, linkRow, manifestBlock, speciesTable);
  return card;
}

async function loadCatalog() {
  setSummary("Caricamento del catalogo in corso…");
  try {
    const { data, context } = await loadPackCatalog();
    applyCatalogContext(context);

    const biomeCount = data.biomi?.length ?? 0;
    const connectionsCount = data.ecosistema?.connessioni?.length ?? 0;
    setSummary(
      `${data.ecosistema?.label ?? "Meta-ecosistema"} con ${biomeCount} biomi collegati e ${connectionsCount} connessioni.`
    );
    renderConnections(data.ecosistema ?? {});

    if (elements.biomeCards) {
      elements.biomeCards.innerHTML = "";
      data.biomi.forEach((biome) => {
        elements.biomeCards.appendChild(renderBiomeCard(biome));
      });
    }
    return;
  } catch (error) {
    console.warn("Caricamento catalogo tramite loader condiviso fallito", error);
  }

  try {
    const { data, context } = await manualLoadCatalog();
    applyCatalogContext(context);

    const biomeCount = data.biomi?.length ?? 0;
    const connectionsCount = data.ecosistema?.connessioni?.length ?? 0;
    setSummary(
      `${data.ecosistema?.label ?? "Meta-ecosistema"} con ${biomeCount} biomi collegati e ${connectionsCount} connessioni (fallback).`
    );
    renderConnections(data.ecosistema ?? {});

    if (elements.biomeCards) {
      elements.biomeCards.innerHTML = "";
      data.biomi.forEach((biome) => {
        elements.biomeCards.appendChild(renderBiomeCard(biome));
      });
    }
  } catch (error) {
    console.error("Impossibile caricare il catalogo del pack", error);
    setSummary("Errore durante il caricamento del catalogo. Controlla la console per i dettagli.");
  }
}

loadCatalog();

if (typeof window !== "undefined") {
  window.EvoPack = window.EvoPack || {};
  window.EvoPack.packRootCandidates = PACK_ROOT_CANDIDATES;
  window.EvoPack.catalog = {
    getResolvedCatalogUrl() {
      return resolvedCatalogUrl;
    },
    getResolvedPackRoot() {
      return resolvedPackRoot;
    },
    getPackDocsBase() {
      return packDocsBase;
    },
    getContext() {
      return packContext;
    },
    manualLoadCatalog,
    loadPackCatalog,
  };
}
