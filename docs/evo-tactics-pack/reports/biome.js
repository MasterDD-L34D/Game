import { loadPackCatalog } from "../pack-data.js";

const biomeId = document.body?.dataset?.biomeId;

const titleEl = document.getElementById("biome-title");
const summaryEl = document.getElementById("biome-summary");
const manifestEl = document.getElementById("biome-manifest");
const groupsEl = document.getElementById("biome-groups");
const foodwebImage = document.getElementById("biome-foodweb-image");
const foodwebMeta = document.getElementById("biome-foodweb-meta");
const resourcesList = document.getElementById("biome-resources");
const speciesTable = document.getElementById("biome-species");
const errorEl = document.getElementById("biome-error");

let packContext = null;

function setError(message) {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

function clear(element) {
  if (element) {
    element.innerHTML = "";
  }
}

function createChip(label, value) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.innerHTML = `<strong>${value}</strong> ${label}`;
  return chip;
}

function formatGroups(groups) {
  return groups && groups.length ? groups.join(", ") : "n/d";
}

function formatFlags(flags) {
  return Object.entries(flags || {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key)
    .join(", ");
}

function resolveDoc(path) {
  if (!packContext || !path) return path;
  return packContext.resolveDocHref(path);
}

function appendResource(label, href, options = {}) {
  if (!resourcesList || !href) return;
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
  resourcesList.appendChild(item);
}

function renderSpecies(speciesList) {
  if (!speciesTable) return;
  speciesTable.innerHTML = "";

  const head = document.createElement("thead");
  head.innerHTML = `
    <tr>
      <th>Nome</th>
      <th>ID</th>
      <th>Ruolo trofico</th>
      <th>Tag funzionali</th>
      <th>Flags</th>
      <th>YAML</th>
    </tr>`;
  speciesTable.appendChild(head);

  const body = document.createElement("tbody");
  if (!speciesList.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "Nessuna specie registrata per questo bioma.";
    row.appendChild(cell);
    body.appendChild(row);
  } else {
    speciesList.forEach((sp) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${sp.display_name}</td>
        <td>${sp.id}</td>
        <td>${sp.role_trofico || "—"}</td>
        <td>${(sp.functional_tags || []).join(", ")}</td>
        <td>${formatFlags(sp.flags)}</td>
        <td><a href="${resolveDoc(sp.path)}" target="_blank" rel="noreferrer">Apri</a></td>`;
      body.appendChild(row);
    });
  }
  speciesTable.appendChild(body);
}

function formatBiomeId(id) {
  return id.replace(/_/g, " ");
}

async function init() {
  if (!biomeId) {
    console.error("Nessun ID bioma definito per la pagina report.");
    setError("ID del bioma mancante nella pagina.");
    return;
  }

  setError("");
  if (summaryEl) {
    summaryEl.textContent = "Caricamento in corso…";
  }

  try {
    const { data, context } = await loadPackCatalog();
    packContext = context;
    const biome = (data.biomi || []).find((item) => item.id === biomeId);
    if (!biome) {
      throw new Error(`Bioma ${biomeId} non trovato nel catalogo.`);
    }

    document.title = `Ecosystem Pack · Report bioma — ${formatBiomeId(biome.id)}`;
    if (titleEl) {
      titleEl.textContent = `Report bioma — ${formatBiomeId(biome.id)}`;
    }
    if (summaryEl) {
      const speciesCount = biome.species?.length ?? 0;
      summaryEl.textContent = `${speciesCount} specie catalogate · parte di ${
        data.ecosistema?.label ?? "meta-ecosistema"
      }.`;
    }

    if (manifestEl) {
      clear(manifestEl);
      Object.entries(biome.manifest?.species_counts ?? {}).forEach(([key, value]) => {
        manifestEl.appendChild(createChip(key, value));
      });
    }

    if (groupsEl) {
      groupsEl.textContent = `Functional groups: ${formatGroups(
        biome.manifest?.functional_groups_present || []
      )}`;
    }

    if (foodwebImage) {
      const pngHref = resolveDoc(`foodweb_png/${biome.id}.png`);
      foodwebImage.src = pngHref;
      foodwebImage.alt = `Foodweb del bioma ${formatBiomeId(biome.id)}`;
    }

    if (foodwebMeta) {
      const links = [];
      if (biome.foodweb?.path) {
        links.push(
          `<a href="${resolveDoc(biome.foodweb.path)}" target="_blank" rel="noreferrer">Foodweb YAML</a>`
        );
      }
      links.push(
        `<a href="${resolveDoc(`foodweb_png/${biome.id}.png`)}" target="_blank" rel="noreferrer">Foodweb PNG</a>`
      );
      foodwebMeta.innerHTML = links.join(" · ");
    }

    if (resourcesList) {
      clear(resourcesList);
      appendResource("Bioma YAML", resolveDoc(biome.path), { external: true });
      if (biome.foodweb?.path) {
        appendResource("Foodweb YAML", resolveDoc(biome.foodweb.path), { external: true });
      }
      appendResource("Foodweb PNG", resolveDoc(`foodweb_png/${biome.id}.png`), { external: true });
      appendResource("Report legacy", resolveDoc(`biomes/${biome.id}.html`), {
        external: true,
        note: "Versione originale generata via CLI",
      });
      appendResource("Indice specie", "../species-index.html", { note: "Filtri avanzati" });
    }

    renderSpecies(biome.species || []);
    setError("");
  } catch (error) {
    console.error("Impossibile caricare il report del bioma", error);
    setError("Errore durante il caricamento del bioma. Controlla la console del browser.");
    if (summaryEl) {
      summaryEl.textContent = "Impossibile recuperare i dati del bioma.";
    }
  }
}

init();
