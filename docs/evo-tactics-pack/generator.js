import {
  loadPackCatalog,
  manualLoadCatalog,
  getPackRootCandidates,
} from "./pack-data.js";

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

const PACK_ROOT_CANDIDATES = getPackRootCandidates();

const state = {
  data: null,
  pick: {
    ecosystem: {},
    biomes: [],
    species: {},
    seeds: [],
  },
};

let packContext = null;
let resolvedCatalogUrl = null;
let resolvedPackRoot = null;
let packDocsBase = null;

function applyCatalogContext(data, context) {
  packContext = context ?? null;
  resolvedCatalogUrl = context?.catalogUrl ?? null;
  resolvedPackRoot = context?.resolvedBase ?? null;
  packDocsBase = context?.docsBase ?? null;
  state.data = data;
  populateFilters(data);
}

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

function pickMany(array, n) {
  if (!array?.length || n <= 0) return [];
  if (n >= array.length) return [...array];
  const pool = shuffle(array);
  return pool.slice(0, n);
}

function titleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function uniqueById(items) {
  const seen = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    if (!seen.has(item.id)) {
      seen.set(item.id, item);
    }
  });
  return Array.from(seen.values());
}

function randomId(prefix = "synt") {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${suffix}`;
}

function combineNames(primaryName, secondaryName) {
  const firstTokens = String(primaryName || "Alpha")
    .split(/\s+/)
    .filter(Boolean);
  const secondTokens = String(secondaryName || "Beta")
    .split(/\s+/)
    .filter(Boolean);
  const first = firstTokens[0] || "Neo";
  const last = secondTokens.length ? secondTokens[secondTokens.length - 1] : "Synth";
  return `${first} ${last}`;
}

function mixFlags(primary = {}, secondary = {}) {
  const result = { ...primary };
  Object.entries(secondary).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      result[key] = Boolean(value || result[key]);
    } else if (value && !result[key]) {
      result[key] = value;
    }
  });
  return result;
}

function combineTags(primary = [], secondary = []) {
  const merged = new Set();
  primary.forEach((tag) => merged.add(tag));
  secondary.forEach((tag) => merged.add(tag));
  if (!merged.size) {
    merged.add("ibrido");
  }
  return Array.from(merged);
}

function inferThreatTierFromRole(role = "", flags = {}) {
  if (flags.apex) return 4;
  if (flags.threat) return 3;
  if (flags.keystone) return 3;
  if (/predatore_terziario/.test(role)) return 4;
  if (/predatore/.test(role)) return 3;
  if (/evento/.test(role)) return 2;
  if (/minaccia/.test(role)) return 3;
  if (/detritivoro|erbivoro|prede/.test(role)) return 1;
  return 2;
}

function tierOf(species) {
  if (species?.syntheticTier) {
    return Math.max(1, Math.min(species.syntheticTier, 5));
  }
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

const CONNECTION_TYPES = ["corridor", "trophic_spillover", "seasonal_bridge"];
const SEASONALITY = [
  "primavera",
  "estate",
  "autunno",
  "inverno",
  "episodico",
  "multistagionale",
];

function synthesiseBiome(parents) {
  const parentIds = parents.map((parent) => parent.id);
  const displayName = parents.map((parent) => titleCase(parent.id)).join(" / ");
  const idBase = slugify(`${parentIds.join("-")}-${randomId("bio")}`);
  const sourceSpecies = uniqueById(
    parents.flatMap((parent) =>
      (parent.species ?? []).map((sp) => ({ ...sp, source_biome: parent.id }))
    )
  );

  const counts = sourceSpecies.reduce(
    (acc, sp) => {
      if (sp.flags?.apex) acc.apex += 1;
      if (sp.flags?.keystone) acc.keystone += 1;
      if (sp.flags?.bridge) acc.bridge += 1;
      if (sp.flags?.threat) acc.threat += 1;
      if (sp.flags?.event) acc.event += 1;
      return acc;
    },
    { apex: 0, keystone: 0, bridge: 0, threat: 0, event: 0 }
  );

  const functionalGroups = new Set();
  sourceSpecies.forEach((sp) => {
    (sp.functional_tags ?? []).forEach((tag) => functionalGroups.add(tag));
  });

  return {
    id: idBase || randomId("biome"),
    label: `Bioma sintetico ${displayName}`,
    synthetic: true,
    parents: parents.map((parent) => ({
      id: parent.id,
      label: titleCase(parent.id),
      path: parent.path ?? null,
    })),
    species: sourceSpecies,
    manifest: {
      species_counts: counts,
      functional_groups_present: Array.from(functionalGroups),
      sources: parentIds,
    },
  };
}

function generateSyntheticBiomes(baseBiomes, count) {
  if (!baseBiomes?.length) return [];
  const result = [];
  for (let i = 0; i < count; i += 1) {
    const parentCount = Math.min(3, Math.max(2, Math.floor(Math.random() * 3) + 2));
    const parents = pickMany(baseBiomes, Math.min(parentCount, baseBiomes.length));
    result.push(synthesiseBiome(parents));
  }
  return result;
}

function synthesiseConnections(biomes) {
  if (!biomes.length) return [];
  if (biomes.length === 1) {
    return [
      {
        from: biomes[0].id.toUpperCase(),
        to: biomes[0].id.toUpperCase(),
        type: "nested_loop",
        resistance: 0.5,
        seasonality: "continuo",
        notes: "Bioma autosufficiente generato proceduralmente.",
      },
    ];
  }
  const connections = [];
  const shuffled = shuffle(biomes);
  for (let i = 0; i < shuffled.length; i += 1) {
    const current = shuffled[i];
    const next = shuffled[(i + 1) % shuffled.length];
    if (!next) continue;
    const type = sample(CONNECTION_TYPES) ?? "corridor";
    const seasonality = sample(SEASONALITY) ?? "episodico";
    connections.push({
      from: current.id.toUpperCase(),
      to: next.id.toUpperCase(),
      type,
      resistance: Math.round((0.3 + Math.random() * 0.5) * 100) / 100,
      seasonality,
      notes: `Connessione sintetica derivata da ${
        current.parents?.map((p) => p.id).join("+") ?? "sorgenti ignote"
      } verso ${next.parents?.map((p) => p.id).join("+") ?? "target ignoto"}.`,
    });
  }
  return connections;
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

function generateHybridSpecies(biome, filters, desiredCount = 3) {
  const pool = filteredPool(biome, filters);
  const basePool = pool.length ? pool : biome.species ?? [];
  if (!basePool.length) return [];

  const hybrids = [];
  const maxAttempts = Math.max(desiredCount * 6, 12);
  let attempts = 0;

  while (hybrids.length < desiredCount && attempts < maxAttempts) {
    attempts += 1;
    const primary = sample(basePool);
    if (!primary) break;
    const secondaryCandidates = basePool.filter((sp) => sp.id !== primary.id);
    const secondary = secondaryCandidates.length ? sample(secondaryCandidates) : null;

    const combinedFlags = mixFlags(primary.flags, secondary?.flags);
    const combinedTags = combineTags(primary.functional_tags, secondary?.functional_tags);
    const roleOptions = [primary.role_trofico, secondary?.role_trofico].filter(Boolean);
    const role = roleOptions.length ? sample(roleOptions) : primary.role_trofico ?? null;
    const displayName = combineNames(primary.display_name, secondary?.display_name);
    const baseId = slugify(displayName) || slugify(`${primary.id}-${secondary?.id ?? "solo"}`);
    const tier = inferThreatTierFromRole(role ?? "", combinedFlags);

    const hybrid = {
      id: `${baseId}-${Math.random().toString(36).slice(2, 6)}`,
      display_name: displayName,
      role_trofico: role,
      functional_tags: combinedTags,
      flags: combinedFlags,
      biomes: [biome.id],
      synthetic: true,
      syntheticTier: tier,
      balance: { threat_tier: `T${tier}` },
      sources: {
        primary: {
          id: primary.id,
          biome: primary.source_biome ?? primary.biomes?.[0] ?? null,
        },
        secondary: secondary
          ? {
              id: secondary.id,
              biome: secondary.source_biome ?? secondary.biomes?.[0] ?? null,
            }
          : null,
      },
    };

    if (
      matchesFlags(hybrid, filters.flags) &&
      matchesRoles(hybrid, filters.roles) &&
      matchesTags(hybrid, filters.tags)
    ) {
      hybrids.push(hybrid);
    }
  }

  if (!hybrids.length) {
    return basePool.slice(0, Math.min(desiredCount, basePool.length)).map((sp) => ({
      ...sp,
      id: `${slugify(sp.id || sp.display_name)}-${Math.random().toString(36).slice(2, 5)}`,
      display_name: `${sp.display_name ?? sp.id} Neo-Variant`,
      biomes: [biome.id],
      synthetic: true,
      syntheticTier: inferThreatTierFromRole(sp.role_trofico ?? "", sp.flags ?? {}),
      balance: { threat_tier: `T${inferThreatTierFromRole(sp.role_trofico ?? "", sp.flags ?? {})}` },
      sources: {
        primary: {
          id: sp.id,
          biome: sp.source_biome ?? sp.biomes?.[0] ?? null,
        },
        secondary: null,
      },
    }));
  }

  return hybrids;
}

function rerollSpecies(filters) {
  state.pick.species = {};
  state.pick.biomes.forEach((biome) => {
    if (biome.synthetic) {
      const hybrids = generateHybridSpecies(biome, filters, 3);
      state.pick.species[biome.id] = hybrids;
      biome.generatedSpecies = hybrids;
      return;
    }

    const pool = filteredPool(biome, filters);
    const chosen = sample(pool) ?? sample(biome.species) ?? null;
    state.pick.species[biome.id] = chosen ? [chosen] : [];
  });
}

function rerollSeeds(filters) {
  state.pick.seeds = [];
  state.pick.biomes.forEach((biome) => {
    const generated = state.pick.species[biome.id] ?? [];
    const pool = generated.length ? generated : filteredPool(biome, filters);
    const fallback = generated.length ? generated : biome.species ?? [];
    const workingPool = pool.length ? pool : fallback;
    const apex = workingPool.find((sp) => sp.flags?.apex) ?? null;
    const threat = workingPool.find((sp) => sp.flags?.threat) ?? null;
    const keystone = workingPool.find((sp) => sp.flags?.keystone) ?? null;
    const bridge = workingPool.find((sp) => sp.flags?.bridge) ?? null;

    const usedIds = new Set([apex, threat, keystone, bridge].filter(Boolean).map((sp) => sp.id));
    const fillers = shuffle(workingPool)
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
        sources: sp.sources ?? null,
      });
    });
    fillers.forEach((sp) => {
      party.push({
        id: sp.id,
        display_name: sp.display_name,
        role: sp.role_trofico,
        tier: tierOf(sp),
        count: 1,
        sources: sp.sources ?? null,
      });
    });

    const budget = party.reduce((sum, entry) => sum + entry.tier, 0);
    state.pick.seeds.push({
      encounter_id: `auto_${biome.id}_${Date.now()}`,
      biome_id: biome.id,
      party,
      threat_budget: budget,
      notes: biome.synthetic
        ? "Seed sintetico basato su specie ibride generate dal tool web"
        : "Generato automaticamente dal tool web",
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
    title.textContent = biome.synthetic ? biome.label ?? biome.id : biome.id;

    const meta = document.createElement("p");
    meta.className = "form__hint";
    if (biome.synthetic) {
      const parentLinks = (biome.parents ?? []).map((parent) => {
        const href = parent.path ? resolvePackHref(parent.path) : null;
        if (href) {
          return `<a href="${href}" target="_blank" rel="noreferrer">${parent.label}</a>`;
        }
        return parent.label;
      });
      const parentSummary = parentLinks.length ? parentLinks.join(" + ") : "—";
      meta.innerHTML = `Origine: ${parentSummary} · <span>Sintetico</span>`;
    } else {
      const biomeHref = resolvePackHref(biome.path);
      const foodwebHref = biome.foodweb?.path ? resolvePackHref(biome.foodweb.path) : null;
      const reportHref = new URL(
        `catalog.html#bioma-${biome.id}`,
        window.location.href
      ).toString();
      const metaParts = [];
      if (biomeHref) {
        metaParts.push(
          `<a href="${biomeHref}" target="_blank" rel="noreferrer">Bioma YAML</a>`
        );
      }
      if (foodwebHref) {
        metaParts.push(
          `<a href="${foodwebHref}" target="_blank" rel="noreferrer">Foodweb</a>`
        );
      }
      if (reportHref) {
        metaParts.push(`<a href="${reportHref}">Report</a>`);
      }
      meta.innerHTML = metaParts.join(" · ") || "Bioma del catalogo";
    }

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
        const details = [sp.role_trofico ?? "—"];
        if (sp.synthetic) {
          details.push("Synth");
        }
        const tier = tierOf(sp);
        details.push(`T${tier}`);
        item.innerHTML = `<strong>${sp.display_name}</strong> <span class="form__hint">(${sp.id}) — ${details.join(
          " · "
        )}</span>`;
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
        const parts = [entry.id, entry.role ?? "—", `T${entry.tier}`];
        if (entry.sources) {
          parts.push("Synth");
        }
        item.innerHTML = `${entry.display_name} <span class="form__hint">(${parts.join(" · ")})</span>`;
        list.appendChild(item);
      });
    }

    card.append(header, list);
    container.appendChild(card);
  });
}

function exportPayload(filters) {
  const catalogSource =
    resolvedCatalogUrl || packContext?.catalogUrl || resolvedPackRoot || packContext?.resolvedBase || null;
  return {
    pick: state.pick,
    filters,
    source: {
      catalog: catalogSource,
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
        const pool = generateSyntheticBiomes(state.data.biomi, n);
        state.pick.ecosystem = {
          id: randomId("ecos"),
          label: `Rete sintetica (${pool.length} biomi)`,
          synthetic: true,
          sources: state.data.ecosistema?.biomi?.map((b) => b.id) ?? [],
          connessioni: synthesiseConnections(pool),
        };
        state.pick.biomes = pool;
        rerollSpecies(filters);
        rerollSeeds(filters);
        renderBiomes(filters);
        renderSeeds();
        setStatus(
          `Generati ${state.pick.biomes.length} biomi sintetici e ${state.pick.seeds.length} seed.`
        );
        break;
      }
      case "reroll-biomi": {
        if (!state.pick.biomes.length) {
          setStatus("Genera prima un ecosistema completo.", "warn");
          return;
        }
        const n = Math.max(1, Math.min(parseInt(elements.nBiomi.value, 10) || state.pick.biomes.length, 6));
        const pool = generateSyntheticBiomes(state.data.biomi, n);
        state.pick.biomes = pool;
        rerollSpecies(filters);
        rerollSeeds(filters);
        renderBiomes(filters);
        renderSeeds();
        setStatus("Biomi sintetici ricalcolati con i filtri correnti.");
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
  try {
    const { data, context } = await loadPackCatalog();
    applyCatalogContext(data, context);
    setStatus("Catalogo pronto all'uso. Genera un ecosistema!");
    return;
  } catch (error) {
    console.warn("Caricamento catalogo tramite loader condiviso fallito", error);
  }

  try {
    const { data, context } = await manualLoadCatalog();
    applyCatalogContext(data, context);
    setStatus("Catalogo pronto all'uso dal fallback manuale. Genera un ecosistema!");
  } catch (error) {
    console.error("Impossibile caricare il catalogo da alcuna sorgente", error);
    setStatus("Errore durante il caricamento del catalogo. Controlla la console.", "error");
  }
}

attachActions();
loadData();

if (typeof window !== "undefined") {
  window.EvoPack = window.EvoPack || {};
  window.EvoPack.packRootCandidates = PACK_ROOT_CANDIDATES;
  window.EvoPack.generator = {
    get state() {
      return state;
    },
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
