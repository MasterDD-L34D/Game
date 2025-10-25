const PACK_PATH = "packs/evo_tactics_pack/";
const DEFAULT_BRANCH = "main";

function ensureTrailingSlash(value) {
  if (!value) return value;
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeBase(value) {
  if (!value) return null;
  try {
    const absolute = new URL(value, window.location.href);
    return ensureTrailingSlash(absolute.toString());
  } catch (error) {
    console.warn("Impossibile normalizzare la base dati", value, error);
    return ensureTrailingSlash(value);
  }
}

function detectRepoBase() {
  try {
    const origin = window.location.origin;
    if (!origin || origin === "null") {
      return null;
    }

    const segments = window.location.pathname.split("/").filter(Boolean);
    const withoutFile = segments.slice(0, Math.max(segments.length - 1, 0));
    let baseSegments = [];

    if (window.location.hostname.endsWith("github.io")) {
      if (withoutFile.length > 0) {
        baseSegments = [withoutFile[0]];
      }
    } else {
      const docsIndex = withoutFile.indexOf("docs");
      if (docsIndex > 0) {
        baseSegments = withoutFile.slice(0, docsIndex);
      } else if (docsIndex === 0) {
        baseSegments = [];
      } else if (withoutFile.length > 1) {
        baseSegments = withoutFile.slice(0, withoutFile.length - 1);
      }
    }

    const basePath = baseSegments.length ? `/${baseSegments.join("/")}/` : "/";
    return ensureTrailingSlash(`${origin}${basePath}`);
  } catch (error) {
    console.warn("Impossibile determinare la base del repository", error);
    return null;
  }
}

function detectPackRootOverride() {
  const params = new URLSearchParams(window.location.search);
  const override =
    params.get("pack-root") ||
    document.querySelector('meta[name="pack-root"]')?.getAttribute("content");
  return normalizeBase(override);
}

function detectGitHubRawRoot() {
  if (!window.location.hostname.endsWith("github.io")) {
    return null;
  }

  const owner = document
    .querySelector('meta[name="data-owner"]')
    ?.getAttribute("content") || window.location.hostname.split(".")[0];
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const repo =
    document.querySelector('meta[name="data-repo"]')?.getAttribute("content") ||
    pathParts[0] ||
    "";
  const params = new URLSearchParams(window.location.search);
  const branch =
    params.get("ref") ||
    document.querySelector('meta[name="data-branch"]')?.getAttribute("content") ||
    DEFAULT_BRANCH;

  if (!owner || !repo) {
    return null;
  }

  return ensureTrailingSlash(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${PACK_PATH}`
  );
}

function candidatePackRoots() {
  const candidates = [];

  const override = detectPackRootOverride();
  if (override) {
    candidates.push(override);
  }

  const githubRaw = detectGitHubRawRoot();
  if (githubRaw) {
    candidates.push(githubRaw);
  }

  const repoBase = detectRepoBase();
  if (repoBase) {
    try {
      candidates.push(ensureTrailingSlash(new URL(PACK_PATH, repoBase).toString()));
    } catch (error) {
      console.warn("Impossibile costruire la base dati dal repository", error);
    }
  }

  try {
    candidates.push(
      ensureTrailingSlash(new URL(`../${PACK_PATH}`, window.location.href).toString())
    );
  } catch (error) {
    console.warn("Impossibile calcolare la base dati relativa", error);
  }

  if (window.location.origin && window.location.origin !== "null") {
    const origin = window.location.origin.endsWith("/")
      ? window.location.origin
      : `${window.location.origin}/`;
    candidates.push(ensureTrailingSlash(`${origin}${PACK_PATH}`));
  }

  candidates.push(ensureTrailingSlash(PACK_PATH));

  return Array.from(new Set(candidates.filter(Boolean)));
}

const PACK_ROOT_CANDIDATES = candidatePackRoots();

let resolvedPackRoot = null;
let packDocsBase = null;

const elements = {
  summary: document.getElementById("ecosystem-summary"),
  connections: document.getElementById("ecosystem-connections"),
  biomeCards: document.getElementById("biome-cards"),
};

function setSummary(message) {
  if (elements.summary) {
    elements.summary.textContent = message;
  }
}

function resolvePackHref(relativePath) {
  try {
    if (packDocsBase) {
      return new URL(relativePath, packDocsBase).toString();
    }
    if (resolvedPackRoot) {
      return new URL(relativePath, resolvedPackRoot).toString();
    }
    return relativePath;
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

async function loadCatalog() {
  setSummary("Caricamento del catalogo in corso…");
  let lastError = null;

  for (const base of PACK_ROOT_CANDIDATES) {
    try {
      const catalogUrl = new URL("docs/catalog/catalog_data.json", base).toString();
      const response = await fetch(catalogUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      resolvedPackRoot = ensureTrailingSlash(base);
      try {
        packDocsBase = new URL("docs/catalog/", resolvedPackRoot);
      } catch (error) {
        console.warn("Impossibile definire la base documenti del pack", error);
        packDocsBase = null;
      }

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
      lastError = error;
      console.warn("Tentativo di caricamento del catalogo fallito", base, error);
    }
  }

  console.error("Impossibile caricare il catalogo da alcuna sorgente", lastError);
  setSummary("Errore durante il caricamento del catalogo. Controlla la console per i dettagli.");
}

loadCatalog();
