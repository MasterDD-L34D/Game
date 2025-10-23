const DATA_SOURCES = [
  { key: "packs", path: "../../data/packs.yaml" },
  { key: "telemetry", path: "../../data/telemetry.yaml" },
  { key: "biomes", path: "../../data/biomes.yaml" },
  { key: "mating", path: "../../data/mating.yaml" }
];

const state = {
  data: {},
  loadedAt: null
};

const metricsElements = {};
const controlElements = {};

function setupDomReferences() {
  metricsElements.forms = document.querySelector('[data-metric="forms"]');
  metricsElements.random = document.querySelector('[data-metric="random"]');
  metricsElements.indices = document.querySelector('[data-metric="indices"]');
  metricsElements.biomes = document.querySelector('[data-metric="biomes"]');
  metricsElements.timestamp = document.getElementById("last-updated");

  controlElements.runTests = document.getElementById("run-tests");
  controlElements.testResults = document.getElementById("test-results");
  controlElements.fetchForm = document.getElementById("fetch-form");
  controlElements.fetchUrl = document.getElementById("fetch-url");
  controlElements.fetchStatus = document.getElementById("fetch-status");
  controlElements.fetchPreview = document.getElementById("fetch-preview");
}

async function loadYaml(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Impossibile caricare ${path} (${response.status})`);
  }
  const text = await response.text();
  return jsyaml.load(text);
}

async function loadAllData() {
  setTimestamp("Caricamento in corso…");
  try {
    const entries = await Promise.all(
      DATA_SOURCES.map(async (source) => {
        const value = await loadYaml(source.path);
        return [source.key, value];
      })
    );
    state.data = Object.fromEntries(entries);
    state.loadedAt = new Date();
    renderAll();
    setTimestamp(`Ultimo aggiornamento: ${state.loadedAt.toLocaleString()}`);
  } catch (error) {
    console.error(error);
    setTimestamp(`Errore nel caricamento: ${error.message}`);
  }
}

function renderAll() {
  updateOverview();
  populateFormSelector();
  renderRandomTable();
  renderTelemetry();
  renderBiomes();
}

function setTimestamp(text) {
  if (metricsElements.timestamp) {
    metricsElements.timestamp.textContent = text;
  }
}

function updateOverview() {
  const packs = state.data.packs || {};
  const forms = packs.forms ? Object.keys(packs.forms) : [];
  const randomTable = Array.isArray(packs.random_general_d20)
    ? packs.random_general_d20.length
    : 0;
  const indices = state.data.telemetry?.indices
    ? Object.keys(state.data.telemetry.indices).length
    : 0;
  const biomeCount = state.data.biomes?.biomes
    ? Object.keys(state.data.biomes.biomes).length
    : 0;

  if (metricsElements.forms) metricsElements.forms.textContent = forms.length;
  if (metricsElements.random) metricsElements.random.textContent = randomTable;
  if (metricsElements.indices) metricsElements.indices.textContent = indices;
  if (metricsElements.biomes) metricsElements.biomes.textContent = biomeCount;
}

function populateFormSelector() {
  const selector = document.getElementById("form-selector");
  if (!selector) return;

  const forms = state.data.packs?.forms ? Object.keys(state.data.packs.forms) : [];
  selector.innerHTML = '<option value="">Scegli…</option>';
  forms
    .sort()
    .forEach((formId) => {
      const option = document.createElement("option");
      option.value = formId;
      option.textContent = formId;
      selector.appendChild(option);
    });

  if (!selector.dataset.listenerAttached) {
    selector.addEventListener("change", (event) => {
      renderFormDetails(event.target.value);
    });
    selector.dataset.listenerAttached = "true";
  }
}

function renderFormDetails(formId) {
  const container = document.getElementById("form-details");
  if (!container) return;

  if (!formId) {
    container.innerHTML =
      "<p>Seleziona una forma per visualizzare combinazioni A/B/C, bias d12 e hook di collaborazione.</p>";
    return;
  }

  const packData = state.data.packs?.forms?.[formId];
  const compatibility = state.data.mating?.compat_forme?.[formId];

  if (!packData) {
    container.innerHTML = `<p>Nessun dato trovato per la forma <strong>${formId}</strong>.</p>`;
    return;
  }

  const packSections = ["A", "B", "C"].map((slot) => {
    const entries = Array.isArray(packData[slot]) ? packData[slot] : [];
    const listItems = entries
      .map((entry) => `<li>${formatEntry(entry)}</li>`)
      .join("");
    return `
      <article class="card pack-card">
        <h3>Pack ${slot}</h3>
        <ul>${listItems || "<li>—</li>"}</ul>
      </article>
    `;
  });

  const biasEntries = packData.bias_d12
    ? Object.entries(packData.bias_d12)
        .map(([pack, range]) => `<li><strong>${pack}</strong>: ${range}</li>`)
        .join("")
    : "";

  let compatibilityHtml = "";
  if (compatibility) {
    compatibilityHtml = `
      <article class="card persona">
        <h3>${compatibility.archetype || "Archetipo"}</h3>
        <p class="overview">${compatibility.overview || ""}</p>
        <div class="pill-groups">
          ${renderPillGroup("Affinità", compatibility.likes)}
          ${renderPillGroup("Neutrali", compatibility.neutrals)}
          ${renderPillGroup("Attriti", compatibility.dislikes)}
        </div>
      </article>
      <article class="card persona-details">
        ${renderListBlock("Punti di forza", compatibility.strengths)}
        ${renderListBlock("Trigger di stress", compatibility.stress_triggers)}
        ${renderListBlock("Hook di collaborazione", compatibility.collaboration_hooks)}
        <p class="scores">Base scores → like: ${compatibility.base_scores?.like ?? "-"}, neutral: ${compatibility.base_scores?.neutral ?? "-"}, dislike: ${compatibility.base_scores?.dislike ?? "-"}</p>
      </article>
    `;
  }

  container.innerHTML = `
    <div class="cards pack-grid">
      ${packSections.join("")}
      <article class="card bias-card">
        <h3>Bias d12</h3>
        <ul>${biasEntries || "<li>—</li>"}</ul>
      </article>
    </div>
    <div class="cards persona-grid">
      ${
        compatibilityHtml ||
        '<article class="card"><p>Nessun dato di compatibilità disponibile per questa forma.</p></article>'
      }
    </div>
  `;
}

function renderRandomTable() {
  const container = document.getElementById("random-list");
  if (!container) return;

  const table = state.data.packs?.random_general_d20;
  if (!Array.isArray(table) || table.length === 0) {
    container.innerHTML = "<p>Nessuna combinazione trovata.</p>";
    return;
  }

  const rows = table
    .map((entry) => {
      const combo = Array.isArray(entry.combo)
        ? `<ul class="inline-list">${entry.combo
            .map((item) => `<li>${formatEntry(item)}</li>`)
            .join("")}</ul>`
        : "—";
      return `
        <tr>
          <td>${entry.range || "—"}</td>
          <td>${entry.pack || "—"}</td>
          <td>${combo}</td>
          <td>${entry.notes || ""}</td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Range</th>
            <th>Pack</th>
            <th>Combo</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderTelemetry() {
  const container = document.getElementById("telemetry-content");
  if (!container) return;

  const telemetry = state.data.telemetry;
  if (!telemetry) {
    container.innerHTML = "<p>Nessun dato disponibile.</p>";
    return;
  }

  const telemetrySettings = telemetry.telemetry || {};
  const windows = telemetrySettings.windows || {};
  const indices = telemetry.indices || {};
  const axes = telemetry.mbti_axes || {};
  const ennea = telemetry.ennea_themes || [];
  const economy = telemetry.pe_economy || {};

  const indicesHtml = Object.entries(indices)
    .map(
      ([name, weights]) => `
        <li>
          <strong>${name}</strong>
          <ul>${Object.entries(weights)
            .map(([metric, value]) => `<li>${metric}: <span>${value}</span></li>`)
            .join("")}</ul>
        </li>
      `
    )
    .join("");

  const axesHtml = Object.entries(axes)
    .map(([axis, details]) => `<li><strong>${axis}</strong>: ${details.formula}</li>`)
    .join("");

  const enneaHtml = ennea
    .map((entry) => `<li><strong>${entry.id}</strong> — ${entry.when}</li>`)
    .join("");

  const economyHtml = Object.entries(economy)
    .map(([key, value]) => `<li><strong>${key}</strong>: ${formatEntry(value)}</li>`)
    .join("");

  container.innerHTML = `
    <div class="telemetry-grid">
      <article class="card">
        <h3>Finestra EMA</h3>
        <p><strong>Alpha:</strong> ${telemetrySettings.ema_alpha ?? "—"}</p>
        <p><strong>Debounce:</strong> ${telemetrySettings.debounce_ms ?? "—"} ms</p>
        <p><strong>Idle threshold:</strong> ${telemetrySettings.idle_threshold_s ?? "—"} s</p>
        <p><strong>Normalizzazione:</strong> ${telemetrySettings.normalization || "—"}</p>
        <h4>Windows</h4>
        <ul>${Object.entries(windows)
          .map(([key, value]) => `<li>${key}: ${formatEntry(value)}</li>`)
          .join("")}</ul>
      </article>
      <article class="card">
        <h3>Indici VC</h3>
        <ul class="nested-list">${indicesHtml}</ul>
      </article>
      <article class="card">
        <h3>Assi MBTI</h3>
        <ul>${axesHtml}</ul>
      </article>
      <article class="card">
        <h3>Temi Enneagramma</h3>
        <ul>${enneaHtml}</ul>
      </article>
      <article class="card">
        <h3>Economia PE</h3>
        <ul>${economyHtml}</ul>
      </article>
    </div>
  `;
}

function renderBiomes() {
  const container = document.getElementById("biomes-grid");
  if (!container) return;

  const biomesData = state.data.biomes;
  if (!biomesData) {
    container.innerHTML = "<p>Nessun dato disponibile.</p>";
    return;
  }

  const biomes = biomesData.biomes || {};
  const biomeCards = Object.entries(biomes)
    .map(([name, details]) => {
      return `
        <article class="card biome-card">
          <h3>${name}</h3>
          <p><strong>Diff. base:</strong> ${details.diff_base ?? "—"}</p>
          <p><strong>Mod. bioma:</strong> ${details.mod_biome ?? "—"}</p>
          <h4>Affissi</h4>
          <ul>${Array.isArray(details.affixes)
            ? details.affixes.map((affix) => `<li>${affix}</li>`).join("")
            : "<li>—</li>"}</ul>
        </article>
      `;
    })
    .join("");

  const vcAdapt = biomesData.vc_adapt || {};
  const vcHtml = Object.entries(vcAdapt)
    .map(
      ([key, value]) => `<li><strong>${key}</strong>: ${formatEntry(value)}</li>`
    )
    .join("");

  const mutations = biomesData.mutations || {};
  const mutationHtml = Object.entries(mutations)
    .map(([key, value]) => `<li><strong>${key}</strong>: ${formatEntry(value)}</li>`)
    .join("");

  const frequencies = biomesData.frequencies || {};
  const freqHtml = Object.entries(frequencies)
    .map(([key, value]) => `<li><strong>${key}</strong>: ${formatEntry(value)}</li>`)
    .join("");

  container.innerHTML = `
    <div class="biome-grid">
      ${biomeCards}
    </div>
    <div class="cards biome-details">
      <article class="card">
        <h3>VC Adapt</h3>
        <ul>${vcHtml}</ul>
      </article>
      <article class="card">
        <h3>Mutazioni</h3>
        <ul>${mutationHtml}</ul>
      </article>
      <article class="card">
        <h3>Frequenze</h3>
        <ul>${freqHtml}</ul>
      </article>
    </div>
  `;
}

function formatEntry(entry) {
  if (entry == null) return "—";
  if (typeof entry === "string" || typeof entry === "number") return entry;
  if (Array.isArray(entry)) {
    return `<ul>${entry.map((item) => `<li>${formatEntry(item)}</li>`).join("")}</ul>`;
  }
  if (typeof entry === "object") {
    return Object.entries(entry)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  }
  return String(entry);
}

function renderPillGroup(title, values) {
  if (!Array.isArray(values) || values.length === 0) return "";
  const pills = values.map((value) => `<span class="pill">${value}</span>`).join("");
  return `
    <div class="pill-group">
      <h4>${title}</h4>
      <div class="pills">${pills}</div>
    </div>
  `;
}

function renderListBlock(title, values) {
  if (!Array.isArray(values) || values.length === 0) return "";
  return `
    <div class="list-block">
      <h4>${title}</h4>
      <ul>${values.map((value) => `<li>${value}</li>`).join("")}</ul>
    </div>
  `;
}

function setupControlPanel() {
  if (controlElements.runTests) {
    controlElements.runTests.addEventListener("click", runDataTests);
  }

  if (controlElements.fetchForm) {
    controlElements.fetchForm.addEventListener("submit", handleFetchSubmit);
  }
}

function runDataTests() {
  if (!controlElements.testResults) return;

  if (!state.loadedAt) {
    renderTestResults([
      {
        passed: false,
        label: "Dataset non caricati",
        message: "Carica i dati prima di eseguire i test."
      }
    ]);
    return;
  }

  const tests = [
    {
      id: "packs",
      label: "Pacchetti PI caricati",
      run: () => {
        const packs = state.data.packs;
        const formsCount = packs?.forms ? Object.keys(packs.forms).length : 0;
        return {
          passed: formsCount > 0,
          message: formsCount
            ? `${formsCount} forme disponibili`
            : "Nessuna forma caricata"
        };
      }
    },
    {
      id: "randomTable",
      label: "Tabella random d20 valida",
      run: () => {
        const table = state.data.packs?.random_general_d20;
        const isValid = Array.isArray(table) && table.every((row) => row.range && row.pack);
        return {
          passed: Boolean(isValid),
          message: isValid
            ? `${table.length} righe con range e pack`
            : "Mancano range o pack nella tabella"
        };
      }
    },
    {
      id: "telemetry",
      label: "Indici VC presenti",
      run: () => {
        const indices = state.data.telemetry?.indices;
        const count = indices ? Object.keys(indices).length : 0;
        return {
          passed: count > 0,
          message: count
            ? `${count} indici registrati`
            : "Nessun indice configurato"
        };
      }
    },
    {
      id: "biomes",
      label: "Biomi definiti",
      run: () => {
        const biomes = state.data.biomes?.biomes;
        const count = biomes ? Object.keys(biomes).length : 0;
        return {
          passed: count > 0,
          message: count ? `${count} biomi disponibili` : "Nessun bioma trovato"
        };
      }
    }
  ];

  const results = tests.map((test) => {
    try {
      return { ...test.run(), label: test.label };
    } catch (error) {
      return {
        passed: false,
        message: error.message,
        label: test.label
      };
    }
  });

  renderTestResults(results);
}

function renderTestResults(results) {
  const container = controlElements.testResults;
  if (!container) return;

  if (!results.length) {
    container.innerHTML = "<li>Nessun test eseguito.</li>";
    return;
  }

  container.innerHTML = results
    .map((result) => {
      const statusClass = result.passed ? "result-ok" : "result-ko";
      const icon = result.passed ? "✅" : "⚠️";
      return `
        <li class="${statusClass}">
          <span class="result-icon">${icon}</span>
          <div>
            <p class="result-label">${result.label}</p>
            <p class="result-message">${result.message}</p>
          </div>
        </li>
      `;
    })
    .join("");
}

async function handleFetchSubmit(event) {
  event.preventDefault();
  if (!controlElements.fetchUrl) return;

  const url = controlElements.fetchUrl.value.trim();
  if (!url) {
    setFetchStatus("Specifica un URL da cui recuperare i dati.", "error");
    return;
  }

  try {
    setFetchStatus("Recupero in corso…", "loading");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Richiesta fallita (${response.status})`);
    }

    const text = await response.text();
    const payload = parseFetchedContent(url, text, response.headers.get("content-type"));
    updateFetchPreview(payload);
    const applied = applyFetchedData(payload);

    if (applied.length > 0) {
      setFetchStatus(
        `Aggiornati i dataset: ${applied.join(", ")}.`,
        "success"
      );
    } else {
      setFetchStatus(
        "Fetch riuscito ma nessun dataset riconosciuto da aggiornare.",
        "warning"
      );
    }
  } catch (error) {
    console.error(error);
    setFetchStatus(`Errore durante il fetch: ${error.message}`, "error");
  }
}

function parseFetchedContent(url, text, contentType = "") {
  const normalizedType = (contentType || "").toLowerCase();
  const looksLikeYaml =
    normalizedType.includes("yaml") ||
    normalizedType.includes("yml") ||
    url.endsWith(".yaml") ||
    url.endsWith(".yml");

  if (looksLikeYaml) {
    return jsyaml.load(text);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    try {
      return jsyaml.load(text);
    } catch (yamlError) {
      throw new Error("Impossibile interpretare la risposta come JSON o YAML valido.");
    }
  }
}

function updateFetchPreview(payload) {
  if (!controlElements.fetchPreview) return;
  if (payload === undefined || payload === null) {
    controlElements.fetchPreview.textContent = "(nessun contenuto)";
    return;
  }

  try {
    const formatted = JSON.stringify(payload, null, 2);
    controlElements.fetchPreview.textContent = formatted;
  } catch (error) {
    controlElements.fetchPreview.textContent = String(payload);
  }
}

function applyFetchedData(payload) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const updatedKeys = [];

  DATA_SOURCES.forEach((source) => {
    if (Object.prototype.hasOwnProperty.call(payload, source.key)) {
      state.data[source.key] = payload[source.key];
      updatedKeys.push(source.key);
    }
  });

  if (updatedKeys.length === 0) {
    const detectedKey = detectDataKey(payload);
    if (detectedKey) {
      state.data[detectedKey] = payload;
      updatedKeys.push(detectedKey);
    }
  }

  if (updatedKeys.length > 0) {
    state.loadedAt = new Date();
    renderAll();
    setTimestamp(`Ultimo aggiornamento: ${state.loadedAt.toLocaleString()} (fetch manuale)`);
    if (controlElements.testResults && controlElements.testResults.childElementCount > 0) {
      runDataTests();
    }
  }

  return updatedKeys;
}

function detectDataKey(payload) {
  if (!payload || typeof payload !== "object") return null;

  if (payload.forms || payload.random_general_d20) return "packs";
  if (payload.telemetry || payload.indices || payload.mbti_axes) return "telemetry";
  if (payload.biomes || payload.vc_adapt || payload.mutations) return "biomes";
  if (payload.compat_forme || payload.base_scores) return "mating";

  return null;
}

function setFetchStatus(message, variant) {
  if (!controlElements.fetchStatus) return;
  controlElements.fetchStatus.textContent = message;
  controlElements.fetchStatus.dataset.status = variant || "info";
}

document.addEventListener("DOMContentLoaded", () => {
  setupDomReferences();
  document
    .getElementById("reload-data")
    .addEventListener("click", () => loadAllData());
  setupControlPanel();
  loadAllData();
});
