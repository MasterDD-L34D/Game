<template>
  <section class="flow-view quality-release">
    <header class="flow-view__header">
      <h2>Quality &amp; Release</h2>
      <p>
        Coordinamento tra orchestrator e runtime validator per assicurare che i branch siano pronti alla
        pubblicazione.
      </p>
    </header>

    <div class="quality-release__status">
      <article class="quality-release__card">
        <h3>Finestra di release</h3>
        <p class="quality-release__primary">{{ orchestrator.releaseWindow }}</p>
        <p class="quality-release__meta">Stato orchestrator: {{ orchestrator.stage }}</p>
        <p class="quality-release__meta">Coordinatore: {{ orchestrator.coordinator }}</p>
        <ul>
          <li v-for="focus in orchestrator.focusAreas" :key="focus">{{ focus }}</li>
        </ul>
      </article>
      <article class="quality-release__card">
        <h3>Referenti QA</h3>
        <p class="quality-release__primary">{{ owners.join(', ') }}</p>
        <p class="quality-release__meta">Ultimo batch: {{ formatTimestamp(snapshot.lastRun) }}</p>
        <ul class="quality-release__notifications">
          <li v-for="notification in context.notifications" :key="notification.id">
            <strong>{{ notification.channel }}</strong>
            <span>{{ notification.message }}</span>
            <small>{{ notification.time }}</small>
          </li>
        </ul>
      </article>
    </div>

    <section class="quality-release__validators">
      <header class="quality-release__section-header">
        <h3>Runtime checks</h3>
        <p>Avvia validazioni mirate utilizzando il runtime validator collegato all'orchestrator.</p>
      </header>
      <div class="quality-release__checks">
        <article class="quality-check">
          <header>
            <h4>Specie</h4>
            <span class="quality-check__badge">{{ qualityCount('species') }}</span>
          </header>
          <p class="quality-check__summary">
            {{ checkSummaryText(speciesCheck.result, snapshot.checks?.species) }}
          </p>
          <p v-if="speciesCheck.error" class="quality-check__error">{{ speciesCheck.error }}</p>
          <footer>
            <button type="button" class="quality-check__action" :disabled="speciesCheck.running" @click="runSpeciesCheck">
              {{ speciesCheck.running ? 'In corso…' : 'Esegui batch specie' }}
            </button>
          </footer>
        </article>
        <article class="quality-check">
          <header>
            <h4>Biomi</h4>
            <span class="quality-check__badge">{{ qualityCount('biomes') }}</span>
          </header>
          <p class="quality-check__summary">
            {{ checkSummaryText(biomeCheck.result, snapshot.checks?.biomes) }}
          </p>
          <p v-if="biomeCheck.error" class="quality-check__error">{{ biomeCheck.error }}</p>
          <footer>
            <button type="button" class="quality-check__action" :disabled="biomeCheck.running" @click="runBiomeCheck">
              {{ biomeCheck.running ? 'In corso…' : 'Sanitizza bioma' }}
            </button>
          </footer>
        </article>
        <article class="quality-check">
          <header>
            <h4>Foodweb</h4>
            <span class="quality-check__badge">{{ qualityCount('foodweb') }}</span>
          </header>
          <p class="quality-check__summary">
            {{ checkSummaryText(foodwebCheck.result, snapshot.checks?.foodweb) }}
          </p>
          <p v-if="foodwebCheck.error" class="quality-check__error">{{ foodwebCheck.error }}</p>
          <footer>
            <button type="button" class="quality-check__action" :disabled="foodwebCheck.running" @click="runFoodwebCheck">
              {{ foodwebCheck.running ? 'In corso…' : 'Valida foodweb' }}
            </button>
          </footer>
        </article>
      </div>
    </section>

    <section class="quality-release__suggestions" v-if="suggestions.length">
      <header class="quality-release__section-header">
        <h3>Suggerimenti di correzione</h3>
        <p>Applica fix automatici o rigenera selezioni specifiche sulla base dei risultati runtime.</p>
      </header>
      <ul class="quality-suggestions">
        <li
          v-for="suggestion in suggestions"
          :key="suggestion.id"
          :class="['quality-suggestion', `quality-suggestion--${suggestion.scope}`]"
        >
          <div>
            <h4>{{ suggestion.title }}</h4>
            <p>{{ suggestion.description }}</p>
          </div>
          <div class="quality-suggestion__actions">
            <button
              type="button"
              class="quality-suggestion__action"
              :disabled="suggestion.applied || suggestion.running"
              @click="applySuggestion(suggestion)"
            >
              {{ suggestion.running ? 'In corso…' : suggestionLabel(suggestion) }}
            </button>
            <p v-if="suggestion.error" class="quality-suggestion__error">{{ suggestion.error }}</p>
          </div>
        </li>
      </ul>
    </section>

    <section class="quality-release__logs">
      <header class="quality-release__section-header">
        <h3>Log runtime</h3>
        <p>Traccia degli eventi emessi dal runtime validator e dalle azioni correttive.</p>
      </header>
      <div class="quality-logs__toolbar">
        <button
          v-for="option in scopeOptions"
          :key="option.value"
          type="button"
          :class="['quality-logs__filter', { 'quality-logs__filter--active': option.value === scopeFilter }]"
          @click="scopeFilter = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <ul class="quality-logs">
        <li v-for="log in filteredLogs" :key="log.id" :class="['quality-log', `quality-log--${log.level}`]">
          <div class="quality-log__meta">
            <span class="quality-log__scope">{{ displayScope(log.scope) }}</span>
            <time class="quality-log__time">{{ formatTimestamp(log.timestamp) }}</time>
          </div>
          <p class="quality-log__message">{{ log.message }}</p>
        </li>
        <li v-if="!filteredLogs.length" class="quality-log quality-log--empty">
          Nessun log per il filtro selezionato.
        </li>
      </ul>
    </section>
  </section>
</template>

<script setup>
import { computed, reactive, ref, toRefs } from 'vue';
import { validateBiome, validateFoodweb, validateSpeciesBatch } from '../services/runtimeValidationService.js';
import { applyQualitySuggestion } from '../services/qualityReleaseService.js';

const props = defineProps({
  snapshot: {
    type: Object,
    required: true,
  },
  context: {
    type: Object,
    required: true,
  },
});

const { snapshot, context } = toRefs(props);

const speciesCheck = reactive({ running: false, result: null, error: null, lastRun: null });
const biomeCheck = reactive({ running: false, result: null, error: null, lastRun: null });
const foodwebCheck = reactive({ running: false, result: null, error: null, lastRun: null });

const runtimeLogs = ref([]);
const appliedSuggestionIds = ref([]);
const suggestionState = reactive({});
let logCounter = 0;

const orchestrator = computed(() => {
  const info = context.value.orchestrator || {};
  return {
    stage: info.stage || '—',
    releaseWindow: info.releaseWindow || '—',
    coordinator: info.coordinator || '—',
    focusAreas: Array.isArray(info.focusAreas) ? info.focusAreas : [],
  };
});

const owners = computed(() => {
  const value = snapshot.value && snapshot.value.owners;
  return Array.isArray(value) ? value : [];
});

const suggestions = computed(() => {
  const items = Array.isArray(context.value.suggestions) ? context.value.suggestions : [];
  return items.map((item) => {
    const state = suggestionState[item.id] || {};
    return {
      ...item,
      applied: appliedSuggestionIds.value.includes(item.id),
      running: Boolean(state.running),
      error: state.error || null,
    };
  });
});

const baseLogs = computed(() => {
  const logs = Array.isArray(context.value.logs) ? context.value.logs : [];
  return logs.map((item) => ({
    id: item.id,
    scope: item.scope || 'general',
    level: item.level || 'info',
    message: item.message,
    timestamp: item.timestamp,
  }));
});

const allLogs = computed(() => [...baseLogs.value, ...runtimeLogs.value]);

const scopeOptions = computed(() => [
  { value: 'all', label: 'Tutti' },
  { value: 'species', label: 'Specie' },
  { value: 'biome', label: 'Biomi' },
  { value: 'foodweb', label: 'Foodweb' },
]);

const scopeFilter = ref('all');

const filteredLogs = computed(() => {
  const logs = allLogs.value;
  if (scopeFilter.value === 'all') {
    return logs;
  }
  return logs.filter((log) => log.scope === scopeFilter.value);
});

function appendLogs(kind, entries = []) {
  if (!entries.length) {
    return;
  }
  const payload = entries.map((entry) => {
    const message = typeof entry === 'string' ? entry : entry.message || entry.text || '';
    const level = entry.level || entry.severity || (entry.type === 'error' ? 'error' : 'info');
    const timestamp = entry.timestamp || new Date().toISOString();
    return {
      id: `${kind}-${Date.now()}-${logCounter++}`,
      scope: entry.scope || kind,
      level,
      message,
      timestamp,
    };
  });
  runtimeLogs.value = [...runtimeLogs.value, ...payload];
}

function normaliseMessages(kind, result) {
  const messages = [];
  if (Array.isArray(result?.messages)) {
    for (const item of result.messages) {
      if (item) {
        messages.push(item);
      }
    }
  }
  if (Array.isArray(result?.discarded) && result.discarded.length) {
    messages.push({
      level: 'warning',
      message: `Elementi scartati: ${result.discarded.length}`,
    });
  }
  if (Array.isArray(result?.corrected) && result.corrected.length) {
    messages.push({
      level: 'success',
      message: `Correzioni applicate: ${result.corrected.length}`,
    });
  }
  return messages.map((message) => ({ ...message, scope: kind }));
}

function checkSummaryText(result, check) {
  const passed = check?.passed ?? 0;
  const total = check?.total ?? 0;
  if (!result) {
    return `${passed} di ${total} check già superati.`;
  }
  const corrected = Array.isArray(result.corrected) ? result.corrected.length : 0;
  const discarded = Array.isArray(result.discarded) ? result.discarded.length : 0;
  return `Correzioni ${corrected} · Scartati ${discarded}`;
}

function qualityCount(kind) {
  const check = snapshot.value?.checks?.[kind];
  if (!check) {
    return '0 / 0';
  }
  return `${check.passed || 0} / ${check.total || 0}`;
}

function suggestionLabel(suggestion) {
  if (suggestion.applied) {
    return 'Completato';
  }
  if (suggestion.action === 'regenerate') {
    return 'Rigenera mirato';
  }
  return 'Applica fix';
}

function displayScope(scope) {
  if (scope === 'species') {
    return 'Specie';
  }
  if (scope === 'biome' || scope === 'biomes') {
    return 'Biomi';
  }
  if (scope === 'foodweb') {
    return 'Foodweb';
  }
  return 'Generale';
}

function formatTimestamp(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function runSpeciesCheck() {
  speciesCheck.running = true;
  speciesCheck.error = null;
  try {
    const result = await validateSpeciesBatch(context.value.speciesBatch.entries, {
      biomeId: context.value.speciesBatch.biomeId,
    });
    speciesCheck.result = result;
    speciesCheck.lastRun = new Date().toISOString();
    appendLogs('species', normaliseMessages('species', result));
  } catch (error) {
    speciesCheck.error = error?.message || 'Errore validazione specie';
    appendLogs('species', [
      {
        level: 'error',
        message: speciesCheck.error,
      },
    ]);
  } finally {
    speciesCheck.running = false;
  }
}

async function runBiomeCheck() {
  biomeCheck.running = true;
  biomeCheck.error = null;
  try {
    const result = await validateBiome(context.value.biomeCheck.biome, {
      defaultHazard: context.value.biomeCheck.defaultHazard,
    });
    biomeCheck.result = result;
    biomeCheck.lastRun = new Date().toISOString();
    appendLogs('biome', normaliseMessages('biome', result));
  } catch (error) {
    biomeCheck.error = error?.message || 'Errore sanitizzazione bioma';
    appendLogs('biome', [
      {
        level: 'error',
        message: biomeCheck.error,
      },
    ]);
  } finally {
    biomeCheck.running = false;
  }
}

async function runFoodwebCheck() {
  foodwebCheck.running = true;
  foodwebCheck.error = null;
  try {
    const result = await validateFoodweb(context.value.foodwebCheck.foodweb);
    foodwebCheck.result = result;
    foodwebCheck.lastRun = new Date().toISOString();
    appendLogs('foodweb', normaliseMessages('foodweb', result));
  } catch (error) {
    foodwebCheck.error = error?.message || 'Errore validazione foodweb';
    appendLogs('foodweb', [
      {
        level: 'error',
        message: foodwebCheck.error,
      },
    ]);
  } finally {
    foodwebCheck.running = false;
  }
}

async function applySuggestion(suggestion) {
  if (!suggestion || suggestion.running || suggestion.applied) {
    return;
  }
  const id = suggestion.id;
  suggestionState[id] = { running: true, error: null };
  try {
    const response = await applyQualitySuggestion({
      id: suggestion.id,
      scope: suggestion.scope,
      action: suggestion.action,
      payload: suggestion.payload,
    });
    const remoteLogs = Array.isArray(response?.logs) ? response.logs : [];
    appendLogs(suggestion.scope, remoteLogs);
    appendLogs(suggestion.scope, [
      {
        level: suggestion.action === 'regenerate' ? 'info' : 'success',
        message: `Suggerimento applicato: ${suggestion.title}`,
      },
    ]);
    if (!appliedSuggestionIds.value.includes(id)) {
      appliedSuggestionIds.value = [...appliedSuggestionIds.value, id];
    }
    suggestionState[id] = { running: false, error: null };
  } catch (error) {
    const message = error?.message || 'Errore applicazione suggerimento';
    suggestionState[id] = { running: false, error: message };
    appendLogs(suggestion.scope, [
      {
        level: 'error',
        message,
      },
    ]);
  }
}
</script>

<style scoped>
.quality-release {
  display: grid;
  gap: 1.75rem;
}

.quality-release__status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.quality-release__card {
  background: rgba(9, 14, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  display: grid;
  gap: 0.5rem;
}

.quality-release__card h3 {
  margin: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.6);
}

.quality-release__primary {
  margin: 0;
  font-size: 1.1rem;
  color: #f0f4ff;
}

.quality-release__meta {
  margin: 0;
  color: rgba(240, 244, 255, 0.65);
  font-size: 0.85rem;
}

.quality-release__card ul {
  margin: 0;
  padding-left: 1.1rem;
  color: rgba(240, 244, 255, 0.75);
  display: grid;
  gap: 0.25rem;
}

.quality-release__notifications {
  list-style: none;
  padding: 0;
}

.quality-release__notifications li {
  display: grid;
  gap: 0.15rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.quality-release__notifications li:last-child {
  border-bottom: none;
}

.quality-release__notifications strong {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: rgba(129, 255, 199, 0.8);
}

.quality-release__notifications span {
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.8);
}

.quality-release__notifications small {
  font-size: 0.75rem;
  color: rgba(240, 244, 255, 0.55);
}

.quality-release__validators,
.quality-release__suggestions,
.quality-release__logs {
  background: rgba(9, 14, 20, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1.2rem;
  display: grid;
  gap: 1rem;
}

.quality-release__section-header h3 {
  margin: 0;
  font-size: 1.05rem;
}

.quality-release__section-header p {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: rgba(240, 244, 255, 0.65);
}

.quality-release__checks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.quality-check {
  background: rgba(12, 18, 26, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
}

.quality-check header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.quality-check h4 {
  margin: 0;
  font-size: 1rem;
}

.quality-check__badge {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  border: 1px solid rgba(96, 213, 255, 0.45);
  color: rgba(96, 213, 255, 0.85);
}

.quality-check__summary {
  margin: 0;
  min-height: 2.2rem;
  color: rgba(240, 244, 255, 0.75);
}

.quality-check__error {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 133, 133, 0.85);
}

.quality-check footer {
  display: flex;
}

.quality-check__action {
  border: none;
  background: linear-gradient(90deg, #57ca8a 0%, #61d5ff 100%);
  color: #05080d;
  font-weight: 600;
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.quality-check__action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quality-suggestions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.quality-suggestion {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(12, 18, 26, 0.85);
}

.quality-suggestion__actions {
  display: grid;
  gap: 0.35rem;
  justify-items: end;
}

.quality-suggestion h4 {
  margin: 0 0 0.35rem;
  font-size: 1rem;
}

.quality-suggestion p {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(240, 244, 255, 0.7);
}

.quality-suggestion__action {
  border: none;
  background: rgba(96, 213, 255, 0.12);
  color: #61d5ff;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
}

.quality-suggestion__action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: rgba(129, 255, 199, 0.15);
  color: rgba(129, 255, 199, 0.85);
}

.quality-suggestion__error {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(255, 133, 133, 0.85);
}

.quality-logs__toolbar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.quality-logs__filter {
  background: rgba(96, 213, 255, 0.12);
  border: 1px solid transparent;
  color: rgba(240, 244, 255, 0.8);
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.quality-logs__filter--active {
  border-color: rgba(96, 213, 255, 0.55);
  color: #61d5ff;
}

.quality-logs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}

.quality-log {
  border-radius: 12px;
  padding: 0.6rem 0.75rem;
  background: rgba(12, 18, 26, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: grid;
  gap: 0.4rem;
}

.quality-log__meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(240, 244, 255, 0.6);
}

.quality-log__scope {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.quality-log__message {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(240, 244, 255, 0.8);
}

.quality-log--warning {
  border-color: rgba(255, 210, 113, 0.55);
}

.quality-log--error {
  border-color: rgba(255, 133, 133, 0.65);
}

.quality-log--success {
  border-color: rgba(129, 255, 199, 0.55);
}

.quality-log--empty {
  text-align: center;
  color: rgba(240, 244, 255, 0.55);
  font-style: italic;
}

@media (max-width: 720px) {
  .quality-suggestion {
    flex-direction: column;
  }

  .quality-release__checks {
    grid-template-columns: 1fr;
  }
}
</style>
