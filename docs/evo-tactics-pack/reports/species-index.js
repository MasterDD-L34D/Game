import { loadPackCatalog } from "../pack-data.js";

const formEl = document.getElementById("species-form");
const biomeSelect = document.getElementById("filter-biome");
const roleSelect = document.getElementById("filter-role");
const tagSelect = document.getElementById("filter-tag");
const queryInput = document.getElementById("filter-query");
const resetButton = document.getElementById("filter-reset");
const countEl = document.getElementById("species-count");
const resultsEl = document.getElementById("species-results");
const errorEl = document.getElementById("species-error");

const ALL_OPTION = "(tutti)";

let dataset = null;
let packContext = null;

function setError(message) {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

function setCount(message) {
  if (!countEl) return;
  countEl.textContent = message;
}

function clearSelect(select) {
  if (!select) return;
  select.innerHTML = "";
}

function fillSelect(select, values) {
  if (!select) return;
  clearSelect(select);
  values.forEach((value, index) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (index === 0) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function createChip(text) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.textContent = text;
  return chip;
}

function formatFlags(flags) {
  return Object.entries(flags || {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
}

function resolveYaml(path) {
  if (!path) return path;
  if (!packContext) return path;
  return packContext.resolveDocHref(path);
}

function renderResults(items) {
  if (!resultsEl) return;
  resultsEl.innerHTML = "";

  if (!items.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Nessuna specie corrisponde ai filtri selezionati.";
    resultsEl.appendChild(placeholder);
    return;
  }

  items.forEach((sp) => {
    const card = document.createElement("article");
    card.className = "card card--link";

    const heading = document.createElement("h3");
    heading.innerHTML = `${sp.display_name} <span class="form__hint">(${sp.id})</span>`;

    const biomes = document.createElement("p");
    biomes.className = "form__hint";
    biomes.textContent = `Biomi: ${(sp.biomes || []).join(", ") || "—"}`;

    const role = document.createElement("p");
    role.className = "form__hint";
    role.textContent = `Ruolo trofico: ${sp.role_trofico || "—"}`;

    const tagsRow = document.createElement("div");
    tagsRow.className = "chip-list chip-list--compact";
    (sp.functional_tags || []).forEach((tag) => {
      tagsRow.appendChild(createChip(tag));
    });

    const flagsRow = document.createElement("div");
    flagsRow.className = "chip-list chip-list--compact";
    const flags = formatFlags(sp.flags);
    if (flags.length) {
      flags.forEach((flag) => flagsRow.appendChild(createChip(flag)));
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "form__hint";
      placeholder.textContent = "Nessun flag speciale";
      flagsRow.appendChild(placeholder);
    }

    const button = document.createElement("a");
    button.className = "button button--secondary";
    button.href = resolveYaml(sp.path);
    button.textContent = "Apri YAML";
    button.target = "_blank";
    button.rel = "noreferrer";

    card.append(heading, biomes, role, tagsRow, flagsRow, button);
    resultsEl.appendChild(card);
  });
}

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

function applyFilters() {
  if (!dataset) return;
  const biomeValue = biomeSelect?.value === ALL_OPTION ? "" : biomeSelect?.value;
  const roleValue = roleSelect?.value === ALL_OPTION ? "" : roleSelect?.value;
  const tagValue = tagSelect?.value === ALL_OPTION ? "" : tagSelect?.value;
  const queryValue = normalize(queryInput?.value);

  let items = dataset.species || [];
  if (biomeValue) {
    items = items.filter((sp) => (sp.biomes || []).includes(biomeValue));
  }
  if (roleValue) {
    items = items.filter((sp) => sp.role_trofico === roleValue);
  }
  if (tagValue) {
    items = items.filter((sp) => (sp.functional_tags || []).includes(tagValue));
  }
  if (queryValue) {
    items = items.filter((sp) => {
      const name = normalize(sp.display_name);
      const id = normalize(sp.id);
      return name.includes(queryValue) || id.includes(queryValue);
    });
  }

  renderResults(items);
  setCount(`${items.length} specie`);
}

function uniqueSorted(array) {
  return Array.from(new Set(array)).sort((a, b) => a.localeCompare(b));
}

function populateFilters(data) {
  const biomes = uniqueSorted(data.species.flatMap((sp) => sp.biomes || []));
  const roles = uniqueSorted(data.species.map((sp) => sp.role_trofico).filter(Boolean));
  const tags = uniqueSorted(data.species.flatMap((sp) => sp.functional_tags || []));

  fillSelect(biomeSelect, [ALL_OPTION, ...biomes]);
  fillSelect(roleSelect, [ALL_OPTION, ...roles]);
  fillSelect(tagSelect, [ALL_OPTION, ...tags]);
}

function attachEvents() {
  if (biomeSelect) biomeSelect.addEventListener("change", applyFilters);
  if (roleSelect) roleSelect.addEventListener("change", applyFilters);
  if (tagSelect) tagSelect.addEventListener("change", applyFilters);
  if (queryInput) queryInput.addEventListener("input", applyFilters);
  if (formEl) {
    formEl.addEventListener("reset", (event) => {
      event.preventDefault();
      if (biomeSelect) biomeSelect.selectedIndex = 0;
      if (roleSelect) roleSelect.selectedIndex = 0;
      if (tagSelect) tagSelect.selectedIndex = 0;
      if (queryInput) queryInput.value = "";
      applyFilters();
    });
  }
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      if (formEl) {
        formEl.dispatchEvent(new Event("reset"));
      }
    });
  }
}

async function init() {
  setCount("Caricamento in corso…");
  setError("");
  try {
    const result = await loadPackCatalog();
    dataset = result.data;
    packContext = result.context;
    populateFilters(dataset);
    attachEvents();
    applyFilters();
  } catch (error) {
    console.error("Impossibile caricare il catalogo del pack", error);
    setCount("");
    setError("Errore durante il caricamento dell'indice. Controlla la console del browser.");
  }
}

init();
