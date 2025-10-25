const DATA_ROOT = "../../packs/evo_tactics_pack/";
const CATALOG_URL = `${DATA_ROOT}docs/catalog/catalog_data.json`;

const elements = {
  summary: document.getElementById("ecosystem-summary"),
  connections: document.getElementById("ecosystem-connections"),
  biomeCards: document.getElementById("biome-cards"),
};

const packDocsBase = new URL(`${DATA_ROOT}docs/catalog/`, window.location.href);

function setSummary(message) {
  if (elements.summary) {
    elements.summary.textContent = message;
  }
}

function resolvePackHref(relativePath) {
  try {
    return new URL(relativePath, packDocsBase).toString();
  } catch (error) {
    console.error("Impossibile risolvere il percorso", relativePath, error);
    return relativePath;
  }
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
    meta.innerHTML = `<strong>${formatConnectionType(conn.type)}</strong> · resistenza ${conn.resistance ?? "—"} · ${
      conn.seasonality || "stagionalità n/d"
    }`;

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
  const staticReport = resolvePackHref(`biomes/${biome.id}.html`);
  const links = [
    `<a href="${biomeYaml}" target="_blank" rel="noreferrer">Bioma YAML</a>`,
  ];
  if (manifestYaml) {
    links.push(`<a href="${manifestYaml}" target="_blank" rel="noreferrer">Manifest</a>`);
  }
  if (foodwebYaml) {
    links.push(`<a href="${foodwebYaml}" target="_blank" rel="noreferrer">Foodweb YAML</a>`);
    links.push(`<a href="${foodwebPng}" target="_blank" rel="noreferrer">Foodweb PNG</a>`);
  }
  links.push(`<a href="${staticReport}" target="_blank" rel="noreferrer">Report originale</a>`);
  linkRow.innerHTML = links.join(" · ");

  const manifestBlock = renderManifest(biome.manifest);
  const speciesTable = renderSpeciesTable(biome.species || []);

  card.append(title, linkRow, manifestBlock, speciesTable);
  return card;
}

async function init() {
  setSummary("Caricamento del catalogo in corso…");
  try {
    const response = await fetch(CATALOG_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
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
  } catch (error) {
    console.error("Impossibile caricare il catalogo", error);
    setSummary("Errore durante il caricamento del catalogo. Controlla la console per i dettagli.");
  }
}

init();
