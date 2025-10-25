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
  form: document.getElementById("generator-form"),
  flags: document.getElementById("flags"),
  roles: document.getElementById("roles"),
  tags: document.getElementById("tags"),
  nBiomi: document.getElementById("nBiomi"),
  biomeGrid: document.getElementById("biome-grid"),
  seedGrid: document.getElementById("seed-grid"),
  status: document.getElementById("generator-status"),
};

const state = {
  data: null,
  pick: {
    ecosystem: {},
    biomes: [],
    species: {},
    seeds: [],
  },
};

function setStatus(message, tone = "info") {
  if (!elements.status) return;
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

function getSelectedValues(select) {
  return Array.from(select?.selectedOptions ?? []).map((opt) => opt.value);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample(array) {
  if (!array.length) return null;
  const index = Math.floor(Math.random() * array.length);
  return array[index];
}

function tierOf(species) {
  const raw = species?.balance?.threat_tier ?? "T1";
  const parsed = parseInt(String(raw).replace(/\D/g, ""), 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.max(1, Math.min(parsed, 5));
}

function ensureOption(select, value, label = value) {
  if (!select) return;
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

function collectFlags(data) {
  const flagSet = new Set();
  data.species.forEach((sp) => {
    Object.entries(sp.flags ?? {}).forEach(([flag]) => {
      flagSet.add(flag);
    });
  });
  return Array.from(flagSet).sort((a, b) => a.localeCompare(b));
}

function collectRoles(data) {
  const roleSet = new Set();
  data.species.forEach((sp) => {
    if (sp.role_trofico) {
      roleSet.add(sp.role_trofico);
    }
  });
  return Array.from(roleSet).sort((a, b) => a.localeCompare(b));
}

function collectTags(data) {
  const tagSet = new Set();
  data.species.forEach((sp) => {
    (sp.functional_tags ?? []).forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

function populateFilters(data) {
  elements.flags.innerHTML = "";
  elements.roles.innerHTML = "";
  elements.tags.innerHTML = "";

  collectFlags(data).forEach((flag) => ensureOption(elements.flags, flag));
  collectRoles(data).forEach((role) => ensureOption(elements.roles, role));
  collectTags(data).forEach((tag) => ensureOption(elements.tags, tag));
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

function currentFilters() {
  return {
    flags: getSelectedValues(elements.flags),
    roles: getSelectedValues(elements.roles),
    tags: getSelectedValues(elements.tags),
  };
}

function matchesFlags(species, requiredFlags) {
  if (!requiredFlags.length) return true;
  const flags = species.flags ?? {};
  return requiredFlags.every((flag) => Boolean(flags[flag]));
}

function matchesRoles(species, requiredRoles) {
  if (!requiredRoles.length) return true;
  return requiredRoles.includes(species.role_trofico ?? "");
}

function matchesTags(species, requiredTags) {
  if (!requiredTags.length) return true;
  const tags = species.functional_tags ?? [];
  return requiredTags.every((tag) => tags.includes(tag));
}

function filteredPool(biome, filters) {
  const { flags, roles, tags } = filters;
  return biome.species.filter(
    (sp) => matchesFlags(sp, flags) && matchesRoles(sp, roles) && matchesTags(sp, tags)
  );
}

function rerollSpecies(filters) {
  state.pick.species = {};
  state.pick.biomes.forEach((biome) => {
    const pool = filteredPool(biome, filters);
    const chosen = sample(pool) ?? sample(biome.species) ?? null;
    state.pick.species[biome.id] = chosen ? [chosen] : [];
  });
}

function rerollSeeds(filters) {
  state.pick.seeds = [];
  state.pick.biomes.forEach((biome) => {
    const pool = filteredPool(biome, filters);
    const apex = pool.find((sp) => sp.flags?.apex) ?? biome.species.find((sp) => sp.flags?.apex) ?? null;
    const threat = pool.find((sp) => sp.flags?.threat) ?? null;
    const keystone = pool.find((sp) => sp.flags?.keystone) ?? null;
    const bridge = pool.find((sp) => sp.flags?.bridge) ?? null;

    const usedIds = new Set([apex, threat, keystone, bridge].filter(Boolean).map((sp) => sp.id));
    const fillers = shuffle(pool)
      .filter((sp) => !usedIds.has(sp.id))
      .slice(0, Math.max(0, 3 - usedIds.size));

    const party = [];
    [apex, threat, keystone, bridge].filter(Boolean).forEach((sp) => {
      party.push({
        id: sp.id,
        display_name: sp.display_name,
        role: sp.role_trofico,
        tier: tierOf(sp),
        count: 1,
      });
    });
    fillers.forEach((sp) => {
      party.push({
        id: sp.id,
        display_name: sp.display_name,
        role: sp.role_trofico,
        tier: tierOf(sp),
        count: 1,
      });
    });

    const budget = party.reduce((sum, entry) => sum + entry.tier, 0);
    state.pick.seeds.push({
      encounter_id: `auto_${biome.id}_${Date.now()}`,
      biome_id: biome.id,
      party,
      threat_budget: budget,
      notes: "Generato automaticamente dal tool web",
    });
  });
}

function renderBiomes(filters) {
  const grid = elements.biomeGrid;
  if (!grid) return;
  grid.innerHTML = "";

  if (!state.pick.biomes.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Nessun bioma selezionato. Genera un ecosistema per iniziare.";
    grid.appendChild(placeholder);
    return;
  }

  state.pick.biomes.forEach((biome) => {
    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = biome.id;

    const meta = document.createElement("p");
    meta.className = "form__hint";
    const biomeHref = resolvePackHref(biome.path);
    const foodwebHref = biome.foodweb?.path ? resolvePackHref(biome.foodweb.path) : null;
    const reportHref = new URL(`catalog.html#bioma-${biome.id}`, window.location.href).toString();
    meta.innerHTML = `
      <a href="${biomeHref}" target="_blank" rel="noreferrer">Bioma YAML</a>
      · ${foodwebHref ? `<a href="${foodwebHref}" target="_blank" rel="noreferrer">Foodweb</a> · ` : ""}
      <a href="${reportHref}">Report</a>`;

    const list = document.createElement("ul");
    const picked = state.pick.species[biome.id] ?? [];
    if (!picked.length) {
      const empty = document.createElement("li");
      empty.className = "placeholder";
      const filtersText = [];
      if (filters.flags.length) filtersText.push(`flag: ${filters.flags.join(", ")}`);
      if (filters.roles.length) filtersText.push(`ruoli: ${filters.roles.join(", ")}`);
      if (filters.tags.length) filtersText.push(`tag: ${filters.tags.join(", ")}`);
      empty.textContent = filtersText.length
        ? `Nessuna specie soddisfa i filtri (${filtersText.join(" · ")}).`
        : "Nessuna specie estratta, riprova con un re-roll.";
      list.appendChild(empty);
    } else {
      picked.forEach((sp) => {
        const item = document.createElement("li");
        item.innerHTML = `<strong>${sp.display_name}</strong> <span class="form__hint">(${sp.id}) — ${
          sp.role_trofico ?? "—"
        }</span>`;
        list.appendChild(item);
      });
    }

    card.append(title, meta, list);
    grid.appendChild(card);
  });
}

function renderSeeds() {
  const container = elements.seedGrid;
  if (!container) return;
  container.innerHTML = "";

  if (!state.pick.seeds.length) {
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "Genera un ecosistema per ottenere encounter seed.";
    container.appendChild(placeholder);
    return;
  }

  state.pick.seeds.forEach((seed) => {
    const card = document.createElement("article");
    card.className = "card";

    const header = document.createElement("h3");
    header.innerHTML = `${seed.biome_id} · <span class="form__hint">Budget T${seed.threat_budget}</span>`;

    const list = document.createElement("ul");
    if (!seed.party.length) {
      const empty = document.createElement("li");
      empty.className = "placeholder";
      empty.textContent = "Nessuna specie disponibile per questo seed con i filtri selezionati.";
      list.appendChild(empty);
    } else {
      seed.party.forEach((entry) => {
        const item = document.createElement("li");
        item.innerHTML = `${entry.display_name} <span class="form__hint">(${entry.id} · ${
          entry.role ?? "—"
        } · T${entry.tier})</span>`;
        list.appendChild(item);
      });
    }

    card.append(header, list);
    container.appendChild(card);
  });
}

function exportPayload(filters) {
  return {
    pick: state.pick,
    filters,
    source: {
      catalog: CATALOG_URL,
      generated_at: new Date().toISOString(),
    },
  };
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toYAML(value, indent = 0) {
  const space = "  ".repeat(indent);
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return value
      .map((item) => `${space}- ${toYAML(item, indent + 1).replace(/^\s*/, "")}`)
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return "{}";
    return entries
      .map(([key, val]) => {
        const formatted = toYAML(val, indent + 1);
        const needsBlock = typeof val === "object" && val !== null;
        return `${space}${key}: ${needsBlock ? `\n${formatted}` : formatted}`;
      })
      .join("\n");
  }
  if (typeof value === "string") {
    if (/[:#\-\[\]\{\}\n]/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  return String(value);
}

function attachActions() {
  if (!elements.form) return;
  elements.form.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    if (!action) return;
    event.preventDefault();
    if (!state.data) {
      setStatus("Caricare i dati prima di utilizzare il generatore.", "error");
      return;
    }
    const filters = currentFilters();
    switch (action) {
      case "roll-ecos": {
        const n = Math.max(1, Math.min(parseInt(elements.nBiomi.value, 10) || 2, 6));
        const pool = shuffle(state.data.biomi);
        state.pick.ecosystem = {
          label: state.data.ecosistema.label,
          connessioni: state.data.ecosistema.connessioni,
        };
        state.pick.biomes = pool.slice(0, n);
        rerollSpecies(filters);
        rerollSeeds(filters);
        renderBiomes(filters);
        renderSeeds();
        setStatus(`Generati ${state.pick.biomes.length} biomi e ${state.pick.seeds.length} seed.`);
        break;
      }
      case "reroll-biomi": {
        if (!state.pick.biomes.length) {
          setStatus("Genera prima un ecosistema completo.", "warn");
          return;
        }
        const n = Math.max(1, Math.min(parseInt(elements.nBiomi.value, 10) || state.pick.biomes.length, 6));
        const pool = shuffle(state.data.biomi);
        state.pick.biomes = pool.slice(0, n);
        rerollSpecies(filters);
        rerollSeeds(filters);
        renderBiomes(filters);
        renderSeeds();
        setStatus("Biomi ricalcolati con i filtri correnti.");
        break;
      }
      case "reroll-species": {
        if (!state.pick.biomes.length) {
          setStatus("Genera prima un ecosistema per estrarre le specie.", "warn");
          return;
        }
        rerollSpecies(filters);
        renderBiomes(filters);
        setStatus("Specie ricalcolate.");
        break;
      }
      case "reroll-seeds": {
        if (!state.pick.biomes.length) {
          setStatus("Genera prima un ecosistema per creare gli encounter seed.", "warn");
          return;
        }
        rerollSeeds(filters);
        renderSeeds();
        setStatus("Seed rigenerati.");
        break;
      }
      case "export-json": {
        const payload = exportPayload(filters);
        downloadFile("ecosystem_pick.json", JSON.stringify(payload, null, 2), "application/json");
        setStatus("Esportazione JSON completata.");
        break;
      }
      case "export-yaml": {
        const payload = exportPayload(filters);
        const yaml = toYAML(payload);
        downloadFile("ecosystem_pick.yaml", yaml, "text/yaml");
        setStatus("Esportazione YAML completata.");
        break;
      }
      default:
        break;
    }
  });
}

async function loadData() {
  setStatus("Caricamento catalogo in corso…");
  let lastError = null;

  for (const base of PACK_ROOT_CANDIDATES) {
    try {
      const catalogUrl = new URL("docs/catalog/catalog_data.json", base).toString();
      const response = await fetch(catalogUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      resolvedPackRoot = ensureTrailingSlash(base);
      try {
        packDocsBase = new URL("docs/catalog/", resolvedPackRoot);
      } catch (error) {
        console.warn("Impossibile definire la base documenti del pack", error);
        packDocsBase = null;
      }

      state.data = json;
      populateFilters(json);
      setStatus("Catalogo pronto all'uso. Genera un ecosistema!");
      return;
    } catch (error) {
      lastError = error;
      console.warn("Tentativo di caricamento del catalogo fallito", base, error);
    }
  }

  console.error("Impossibile caricare il catalogo da alcuna sorgente", lastError);
  setStatus("Errore durante il caricamento del catalogo. Controlla la console.", "error");
}

attachActions();
loadData();
