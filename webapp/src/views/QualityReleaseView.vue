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

    <section class="quality-release__console">
      <header class="quality-release__section-header">
        <h3>Console editoriale</h3>
        <p>
          Programma rilasci per il dataset Nebula, monitora gli stream di validazione e coordina le notifiche al team
          prima della promozione.
        </p>
      </header>
      <div class="release-console">
        <section class="release-console__panel release-console__panel--form">
          <h4>Programmazione rilascio</h4>
          <form class="release-console__form" @submit.prevent="scheduleRelease">
            <div class="release-console__field">
              <label for="release-package">Pacchetto</label>
              <select id="release-package" v-model="releaseConsoleForm.packageId">
                <option
                  v-for="pkg in releasePackages"
                  :key="pkg.id"
                  :value="pkg.id"
                  :disabled="pkg.status === 'blocked'"
                >
                  {{ pkg.name }} · {{ pkg.environmentLabel }}
                </option>
              </select>
            </div>
            <div class="release-console__field">
              <label for="release-environment">Ambiente</label>
              <select id="release-environment" v-model="releaseConsoleForm.environment">
                <option value="staging">Staging</option>
                <option value="production">Produzione</option>
              </select>
            </div>
            <div class="release-console__field">
              <label for="release-window">Finestra</label>
              <input
                id="release-window"
                v-model="releaseConsoleForm.window"
                type="text"
                placeholder="19/05 · 10:00"
              />
            </div>
            <div class="release-console__field">
              <label for="release-notes">Note operative</label>
              <textarea
                id="release-notes"
                v-model="releaseConsoleForm.notes"
                rows="2"
                placeholder="Snapshot 42A con fix aurorali"
              ></textarea>
            </div>
            <p v-if="releaseConsoleForm.error" class="release-console__error">
              {{ releaseConsoleForm.error }}
            </p>
            <button type="submit" class="release-console__submit">Programma rilascio</button>
          </form>
        </section>

        <section class="release-console__panel release-console__panel--schedule">
          <h4>Rilasci programmati</h4>
          <ul class="release-console__list">
            <li v-for="slot in plannedReleases" :key="slot.id">
              <header>
                <strong>{{ slot.packageName }}</strong>
                <span class="release-console__status" :data-status="slot.status">
                  {{ scheduleStatusLabel(slot.status) }}
                </span>
              </header>
              <dl>
                <div>
                  <dt>Finestra</dt>
                  <dd>{{ slot.window }}</dd>
                </div>
                <div>
                  <dt>Ambiente</dt>
                  <dd>{{ environmentLabel(slot.environment) }}</dd>
                </div>
                <div>
                  <dt>Gate</dt>
                  <dd>{{ slot.approvals.join(', ') || '—' }}</dd>
                </div>
              </dl>
              <footer>
                <button
                  type="button"
                  class="release-console__action"
                  :disabled="slot.status !== 'scheduled' && slot.status !== 'awaiting-approval'"
                  @click="markScheduleApproved(slot)"
                >
                  Conferma approvazione
                </button>
                <button
                  type="button"
                  class="release-console__action"
                  :disabled="slot.status !== 'approved'"
                  @click="promoteSchedule(slot)"
                >
                  Promuovi in produzione
                </button>
              </footer>
            </li>
            <li v-if="!plannedReleases.length" class="release-console__empty">Nessun rilascio pianificato.</li>
          </ul>
        </section>

        <section class="release-console__panel release-console__panel--streams">
          <h4>Stream di validazione</h4>
          <ul class="release-console__list">
            <li v-for="stream in validationStreams" :key="stream.id">
              <header>
                <strong>{{ stream.label }}</strong>
                <span class="release-console__status" :data-status="stream.status">
                  {{ streamStatusLabel(stream.status) }}
                </span>
              </header>
              <p class="release-console__stream-meta">
                Ultimo evento · {{ formatTimestamp(stream.lastEvent) }} · Pending {{ stream.pending }}
              </p>
              <footer>
                <button
                  type="button"
                  class="release-console__action"
                  :disabled="stream.status === 'monitoring'"
                  @click="monitorStream(stream)"
                >
                  Avvia monitoraggio
                </button>
                <button type="button" class="release-console__action" @click="refreshStream(stream)">
                  Aggiorna stato
                </button>
                <button
                  type="button"
                  class="release-console__action"
                  :disabled="stream.status === 'cleared'"
                  @click="resolveStream(stream)"
                >
                  Segna risolto
                </button>
              </footer>
            </li>
            <li v-if="!validationStreams.length" class="release-console__empty">
              Nessuno stream di validazione attivo.
            </li>
          </ul>
        </section>

        <section class="release-console__panel release-console__panel--notifications">
          <h4>Notifiche team</h4>
          <ul class="release-console__list">
            <li v-for="notification in consoleNotifications" :key="notification.id">
              <header>
                <strong>{{ notification.channel }}</strong>
              </header>
              <p class="release-console__message">{{ notification.message }}</p>
              <p class="release-console__stream-meta">
                Ultimo invio · {{ formatTimestamp(notification.lastTriggeredAt) }}
              </p>
              <footer>
                <button type="button" class="release-console__action" @click="notifyTeam(notification)">
                  Invia aggiornamento
                </button>
              </footer>
            </li>
            <li v-if="!consoleNotifications.length" class="release-console__empty">
              Nessuna notifica configurata.
            </li>
          </ul>
          <div class="release-console__watchers" v-if="releaseConsoleWatchers.length">
            <h5>Referenti</h5>
            <ul>
              <li v-for="watcher in releaseConsoleWatchers" :key="watcher.id">
                {{ watcher.name }} · {{ watcher.channel }}
              </li>
            </ul>
          </div>
        </section>
      </div>
      <aside class="release-console__guide">
        <h4>Guida rapida alla release Nebula</h4>
        <ol>
          <li>Verifica che il pacchetto abbia superato la validazione automatica dal workflow publishing.</li>
          <li>Usa la sezione “Programmazione rilascio” per schedulare staging e raccogliere le approvazioni obbligatorie.</li>
          <li>Attiva il monitoraggio degli stream QA e invia la notifica al team quando il gate di approvazione è verde.</li>
        </ol>
        <p>
          Tutte le azioni sono sincronizzate con lo stato persistente in <code>services/publishing/workflowState.json</code> e
          vengono riportate nei log sottostanti.
        </p>
      </aside>
    </section>

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
        <div class="quality-logs__filters">
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
        <div class="quality-logs__actions">
          <button
            type="button"
            class="quality-logs__export"
            :disabled="!filteredLogs.length"
            @click="exportQaLogs('json')"
          >
            Esporta JSON QA
          </button>
          <button
            type="button"
            class="quality-logs__export"
            :disabled="!filteredLogs.length"
            @click="exportQaLogs('csv')"
          >
            Esporta CSV QA
          </button>
        </div>
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
import { computed, reactive, ref, toRefs, watch } from 'vue';
import { validateBiome, validateFoodweb, validateSpeciesBatch } from '../services/runtimeValidationService.js';
import { applyQualitySuggestion } from '../services/qualityReleaseService.js';
import { logEvent as logClientEvent, useClientLogger } from '../services/clientLogger.js';

const props = defineProps({
  snapshot: {
    type: Object,
    required: true,
  },
  context: {
    type: Object,
    required: true,
  },
  orchestratorLogs: {
    type: Array,
    default: () => [],
  },
});

const { snapshot, context, orchestratorLogs } = toRefs(props);

const speciesCheck = reactive({ running: false, result: null, error: null, lastRun: null });
const biomeCheck = reactive({ running: false, result: null, error: null, lastRun: null });
const foodwebCheck = reactive({ running: false, result: null, error: null, lastRun: null });

const runtimeLogs = ref([]);
const appliedSuggestionIds = ref([]);
const suggestionState = reactive({});
let logCounter = 0;

const clientLogger = useClientLogger();

const releaseConsoleState = reactive({
  packages: [],
  schedule: [],
  streams: [],
  watchers: [],
  notifications: [],
});

const releaseConsoleForm = reactive({
  packageId: '',
  environment: 'staging',
  window: '',
  notes: '',
  error: null,
});

function assignArray(target, values) {
  target.splice(0, target.length, ...values);
}

function environmentLabel(environment) {
  if (environment === 'production') {
    return 'Produzione';
  }
  if (environment === 'staging') {
    return 'Staging';
  }
  return environment || '—';
}

function normalisePackage(pkg) {
  const id = pkg?.id || pkg?.packageId || `pkg-${Math.random().toString(36).slice(2, 8)}`;
  const environment = pkg?.environment || 'staging';
  return {
    id,
    name: pkg?.name || pkg?.label || id,
    environment,
    environmentLabel: environmentLabel(environment),
    status: pkg?.status || 'ready',
    approvals: Array.isArray(pkg?.approvals) ? [...pkg.approvals] : [],
    lastValidation: pkg?.lastValidation || null,
  };
}

function normaliseSchedule(entry) {
  const packageId = entry?.packageId || entry?.id || `pkg-${Math.random().toString(36).slice(2, 8)}`;
  const environment = entry?.environment || 'staging';
  const approvals = Array.isArray(entry?.approvals) ? [...entry.approvals] : [];
  return {
    id: entry?.id || `schedule-${packageId}-${Math.random().toString(36).slice(2, 8)}`,
    packageId,
    packageName: entry?.packageName || entry?.packageLabel || packageId,
    environment,
    window: entry?.window || '—',
    approvals,
    status: entry?.status || 'scheduled',
    notes: entry?.notes || '',
    lastUpdated: entry?.lastUpdated || entry?.createdAt || null,
  };
}

function normaliseStream(stream) {
  return {
    id: stream?.id || `stream-${Math.random().toString(36).slice(2, 8)}`,
    label: stream?.label || 'Stream QA',
    scope: stream?.scope || 'publishing',
    status: stream?.status || 'idle',
    pending: typeof stream?.pending === 'number' ? stream.pending : 0,
    lastEvent: stream?.lastEvent || null,
  };
}

function normaliseNotification(notification) {
  return {
    id: notification?.id || `notif-${Math.random().toString(36).slice(2, 8)}`,
    channel: notification?.channel || 'Canale interno',
    message: notification?.message || 'Aggiornamento pacchetto disponibile.',
    lastTriggeredAt: notification?.lastTriggeredAt || null,
  };
}

function syncReleaseConsole() {
  const payload = context.value?.releaseConsole || {};
  const packages = Array.isArray(payload.packages) ? payload.packages.map(normalisePackage) : [];
  const schedule = Array.isArray(payload.schedule) ? payload.schedule.map(normaliseSchedule) : [];
  const streams = Array.isArray(payload.streams) ? payload.streams.map(normaliseStream) : [];
  const watchers = Array.isArray(payload.watchers) ? payload.watchers.map((item) => ({ ...item })) : [];
  const notifications = Array.isArray(payload.notifications)
    ? payload.notifications.map(normaliseNotification)
    : [];

  assignArray(releaseConsoleState.packages, packages);
  assignArray(releaseConsoleState.schedule, schedule);
  assignArray(releaseConsoleState.streams, streams);
  assignArray(releaseConsoleState.watchers, watchers);
  assignArray(releaseConsoleState.notifications, notifications);

  if (!packages.some((pkg) => pkg.id === releaseConsoleForm.packageId)) {
    releaseConsoleForm.packageId = packages[0]?.id || '';
  }
}

syncReleaseConsole();

watch(
  () => context.value?.releaseConsole,
  () => {
    syncReleaseConsole();
  },
  { deep: true }
);

const releasePackages = computed(() => releaseConsoleState.packages);

const plannedReleases = computed(() => {
  const sorted = [...releaseConsoleState.schedule];
  sorted.sort((a, b) => {
    const left = Date.parse(a.window || '') || 0;
    const right = Date.parse(b.window || '') || 0;
    if (left && right) {
      return left - right;
    }
    if (left) return -1;
    if (right) return 1;
    return a.window.localeCompare(b.window);
  });
  return sorted;
});

const validationStreams = computed(() => releaseConsoleState.streams);
const consoleNotifications = computed(() => releaseConsoleState.notifications);
const releaseConsoleWatchers = computed(() => releaseConsoleState.watchers);

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
  const contextLogs = Array.isArray(context.value.logs) ? context.value.logs : [];
  const orchestratorEntries = Array.isArray(orchestratorLogs.value) ? orchestratorLogs.value : [];
  const merged = [...contextLogs, ...orchestratorEntries];
  return merged.map((item) => ({
    id: item.id,
    scope: item.scope || 'general',
    level: item.level || 'info',
    message: item.message || '',
    timestamp: item.timestamp || new Date().toISOString(),
  }));
});

const allLogs = computed(() => [...baseLogs.value, ...runtimeLogs.value]);

const scopeOptions = computed(() => [
  { value: 'all', label: 'Tutti' },
  { value: 'species', label: 'Specie' },
  { value: 'biome', label: 'Biomi' },
  { value: 'foodweb', label: 'Foodweb' },
  { value: 'publishing', label: 'Publishing' },
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
  const baseTimestamp = Date.now();
  const payload = entries.map((entry) => {
    const message = typeof entry === 'string' ? entry : entry.message || entry.text || '';
    const level = entry.level || entry.severity || (entry.type === 'error' ? 'error' : 'info');
    const timestamp = entry.timestamp || new Date().toISOString();
    const scope = entry.scope || kind;
    return {
      id: `${kind}-${baseTimestamp}-${logCounter++}`,
      scope,
      level,
      message,
      timestamp,
    };
  });
  runtimeLogs.value = [...runtimeLogs.value, ...payload];
  const eventName = kind === 'publishing' ? `quality.${kind}` : `validator.${kind}`;
  payload.forEach((logEntry, index) => {
    const original = entries[index];
    const data = typeof original === 'string'
      ? { message: logEntry.message, level: logEntry.level }
      : original;
    logClientEvent(eventName, {
      id: logEntry.id,
      scope: logEntry.scope,
      level: logEntry.level,
      message: logEntry.message,
      timestamp: logEntry.timestamp,
      data,
      source: 'quality-console',
    });
  });
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
  if (scope === 'publishing') {
    return 'Publishing';
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

function scheduleStatusLabel(status) {
  if (status === 'scheduled') {
    return 'Programmato';
  }
  if (status === 'awaiting-approval') {
    return 'In approvazione';
  }
  if (status === 'approved') {
    return 'Approvato';
  }
  if (status === 'deployed') {
    return 'Promosso';
  }
  return '—';
}

function streamStatusLabel(status) {
  if (status === 'monitoring') {
    return 'Monitoraggio attivo';
  }
  if (status === 'cleared') {
    return 'Pulito';
  }
  if (status === 'idle') {
    return 'In attesa';
  }
  return status || '—';
}

function scheduleRelease() {
  releaseConsoleForm.error = null;
  if (!releaseConsoleForm.packageId) {
    releaseConsoleForm.error = 'Seleziona un pacchetto Nebula da pubblicare.';
    return;
  }
  if (!releaseConsoleForm.window || !releaseConsoleForm.window.trim()) {
    releaseConsoleForm.error = 'Indica una finestra di rilascio.';
    return;
  }
  const pkg = releaseConsoleState.packages.find((item) => item.id === releaseConsoleForm.packageId);
  if (!pkg) {
    releaseConsoleForm.error = 'Pacchetto selezionato non valido.';
    return;
  }
  const entry = {
    id: `schedule-${Date.now()}`,
    packageId: pkg.id,
    packageName: pkg.name,
    environment: releaseConsoleForm.environment,
    window: releaseConsoleForm.window.trim(),
    approvals: [...pkg.approvals],
    status: pkg.status === 'ready' ? 'awaiting-approval' : 'scheduled',
    notes: releaseConsoleForm.notes.trim(),
    lastUpdated: new Date().toISOString(),
  };
  releaseConsoleState.schedule.unshift(entry);
  releaseConsoleForm.window = '';
  releaseConsoleForm.notes = '';
  appendLogs('publishing', [
    {
      level: 'info',
      message: `Programmata finestra ${environmentLabel(entry.environment)} per ${entry.packageName} (${entry.window}).`,
    },
  ]);
}

function markScheduleApproved(slot) {
  const target = releaseConsoleState.schedule.find((item) => item.id === slot.id);
  if (!target || target.status === 'approved' || target.status === 'deployed') {
    return;
  }
  target.status = 'approved';
  target.lastUpdated = new Date().toISOString();
  appendLogs('publishing', [
    {
      level: 'success',
      message: `Pacchetto ${target.packageName} approvato per ${environmentLabel(target.environment)}.`,
    },
  ]);
}

function promoteSchedule(slot) {
  const target = releaseConsoleState.schedule.find((item) => item.id === slot.id);
  if (!target || target.status !== 'approved') {
    return;
  }
  target.status = 'deployed';
  target.lastUpdated = new Date().toISOString();
  appendLogs('publishing', [
    {
      level: 'success',
      message: `Promosso ${target.packageName} su ${environmentLabel(target.environment)}.`,
    },
  ]);
}

function monitorStream(stream) {
  const target = releaseConsoleState.streams.find((item) => item.id === stream.id);
  if (!target || target.status === 'monitoring') {
    return;
  }
  target.status = 'monitoring';
  target.lastEvent = new Date().toISOString();
  appendLogs('publishing', [
    {
      level: 'info',
      message: `Monitoraggio attivo per ${target.label}.`,
    },
  ]);
}

function refreshStream(stream) {
  const target = releaseConsoleState.streams.find((item) => item.id === stream.id);
  if (!target) {
    return;
  }
  const pending = Math.max(0, (target.pending || 0) - 1);
  target.pending = pending;
  target.lastEvent = new Date().toISOString();
  appendLogs('publishing', [
    {
      level: pending === 0 ? 'success' : 'info',
      message:
        pending === 0
          ? `${target.label} senza elementi pendenti.`
          : `${target.label} aggiornato, elementi rimanenti ${pending}.`,
    },
  ]);
}

function resolveStream(stream) {
  const target = releaseConsoleState.streams.find((item) => item.id === stream.id);
  if (!target) {
    return;
  }
  target.status = 'cleared';
  target.pending = 0;
  target.lastEvent = new Date().toISOString();
  appendLogs('publishing', [
    {
      level: 'success',
      message: `${target.label} contrassegnato come risolto.`,
    },
  ]);
}

function notifyTeam(notification) {
  const target = releaseConsoleState.notifications.find((item) => item.id === notification.id);
  const timestamp = new Date().toISOString();
  if (target) {
    target.lastTriggeredAt = timestamp;
  }
  appendLogs('publishing', [
    {
      level: 'success',
      message: `Notifica inviata su ${notification.channel}: ${notification.message}`,
    },
  ]);
}

async function runSpeciesCheck() {
  speciesCheck.running = true;
  speciesCheck.error = null;
  logClientEvent('validator.species.requested', {
    scope: 'species',
    level: 'info',
    message: 'Validazione specie avviata',
    source: 'quality-console',
  });
  try {
    const result = await validateSpeciesBatch(context.value.speciesBatch.entries, {
      biomeId: context.value.speciesBatch.biomeId,
    });
    speciesCheck.result = result;
    speciesCheck.lastRun = new Date().toISOString();
    appendLogs('species', normaliseMessages('species', result));
    const warnings = Array.isArray(result?.messages)
      ? result.messages.filter((item) => (item.level || item.severity) === 'warning').length
      : 0;
    const errors = Array.isArray(result?.messages)
      ? result.messages.filter((item) => (item.level || item.severity) === 'error').length
      : 0;
    logClientEvent('validator.species.success', {
      scope: 'species',
      level: errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'success',
      message:
        errors > 0
          ? `Validazione completata con ${errors} errori e ${warnings} warning`
          : warnings > 0
            ? `Validazione completata con ${warnings} warning`
            : 'Validazione specie completata',
      data: {
        warnings,
        errors,
        corrected: Array.isArray(result?.corrected) ? result.corrected.length : 0,
        discarded: Array.isArray(result?.discarded) ? result.discarded.length : 0,
      },
      source: 'quality-console',
    });
  } catch (error) {
    speciesCheck.error = error?.message || 'Errore validazione specie';
    appendLogs('species', [
      {
        level: 'error',
        message: speciesCheck.error,
      },
    ]);
    logClientEvent('validator.species.failed', {
      scope: 'species',
      level: 'error',
      message: speciesCheck.error,
      data: { error: error?.message || speciesCheck.error },
      source: 'quality-console',
    });
  } finally {
    speciesCheck.running = false;
  }
}

async function runBiomeCheck() {
  biomeCheck.running = true;
  biomeCheck.error = null;
  logClientEvent('validator.biome.requested', {
    scope: 'biome',
    level: 'info',
    message: 'Sanitizzazione bioma avviata',
    source: 'quality-console',
  });
  try {
    const result = await validateBiome(context.value.biomeCheck.biome, {
      defaultHazard: context.value.biomeCheck.defaultHazard,
    });
    biomeCheck.result = result;
    biomeCheck.lastRun = new Date().toISOString();
    appendLogs('biome', normaliseMessages('biome', result));
    const warnings = Array.isArray(result?.messages)
      ? result.messages.filter((item) => (item.level || item.severity) === 'warning').length
      : 0;
    const errors = Array.isArray(result?.messages)
      ? result.messages.filter((item) => (item.level || item.severity) === 'error').length
      : 0;
    logClientEvent('validator.biome.success', {
      scope: 'biome',
      level: errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'success',
      message:
        errors > 0
          ? `Sanitizzazione completata con ${errors} errori`
          : warnings > 0
            ? `Sanitizzazione completata con ${warnings} warning`
            : 'Sanitizzazione bioma completata',
      data: {
        warnings,
        errors,
        corrected: Array.isArray(result?.corrected) ? result.corrected.length : 0,
        discarded: Array.isArray(result?.discarded) ? result.discarded.length : 0,
      },
      source: 'quality-console',
    });
  } catch (error) {
    biomeCheck.error = error?.message || 'Errore sanitizzazione bioma';
    appendLogs('biome', [
      {
        level: 'error',
        message: biomeCheck.error,
      },
    ]);
    logClientEvent('validator.biome.failed', {
      scope: 'biome',
      level: 'error',
      message: biomeCheck.error,
      data: { error: error?.message || biomeCheck.error },
      source: 'quality-console',
    });
  } finally {
    biomeCheck.running = false;
  }
}

async function runFoodwebCheck() {
  foodwebCheck.running = true;
  foodwebCheck.error = null;
  logClientEvent('validator.foodweb.requested', {
    scope: 'foodweb',
    level: 'info',
    message: 'Validazione foodweb avviata',
    source: 'quality-console',
  });
  try {
    const result = await validateFoodweb(context.value.foodwebCheck.foodweb);
    foodwebCheck.result = result;
    foodwebCheck.lastRun = new Date().toISOString();
    appendLogs('foodweb', normaliseMessages('foodweb', result));
    const warnings = Array.isArray(result?.messages)
      ? result.messages.filter((item) => (item.level || item.severity) === 'warning').length
      : 0;
    const errors = Array.isArray(result?.messages)
      ? result.messages.filter((item) => (item.level || item.severity) === 'error').length
      : 0;
    logClientEvent('validator.foodweb.success', {
      scope: 'foodweb',
      level: errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'success',
      message:
        errors > 0
          ? `Validazione foodweb con ${errors} errori`
          : warnings > 0
            ? `Validazione foodweb con ${warnings} warning`
            : 'Validazione foodweb completata',
      data: {
        warnings,
        errors,
        corrected: Array.isArray(result?.corrected) ? result.corrected.length : 0,
        discarded: Array.isArray(result?.discarded) ? result.discarded.length : 0,
      },
      source: 'quality-console',
    });
  } catch (error) {
    foodwebCheck.error = error?.message || 'Errore validazione foodweb';
    appendLogs('foodweb', [
      {
        level: 'error',
        message: foodwebCheck.error,
      },
    ]);
    logClientEvent('validator.foodweb.failed', {
      scope: 'foodweb',
      level: 'error',
      message: foodwebCheck.error,
      data: { error: error?.message || foodwebCheck.error },
      source: 'quality-console',
    });
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
  logClientEvent('quality.suggestion.requested', {
    scope: suggestion.scope || 'publishing',
    level: 'info',
    message: `Suggerimento in esecuzione: ${suggestion.title}`,
    data: { id: suggestion.id, action: suggestion.action },
    source: 'quality-console',
  });
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
    logClientEvent('quality.suggestion.success', {
      scope: suggestion.scope || 'publishing',
      level: 'success',
      message: `Suggerimento completato: ${suggestion.title}`,
      data: { id: suggestion.id, action: suggestion.action },
      source: 'quality-console',
    });
  } catch (error) {
    const message = error?.message || 'Errore applicazione suggerimento';
    suggestionState[id] = { running: false, error: message };
    appendLogs(suggestion.scope, [
      {
        level: 'error',
        message,
      },
    ]);
    logClientEvent('quality.suggestion.failed', {
      scope: suggestion.scope || 'publishing',
      level: 'error',
      message,
      data: { id: suggestion.id, action: suggestion.action },
      source: 'quality-console',
    });
  }
}

function exportQaLogs(format = 'json') {
  if (!filteredLogs.value.length) {
    return;
  }
  const scope = scopeFilter.value;
  const filenameScope = scope === 'all' ? 'all-scopes' : scope;
  const extension = format === 'csv' ? 'csv' : 'json';
  const exportResult = clientLogger.exportLogs({
    filename: `qa-flow-logs-${filenameScope}.${extension}`,
    filter: scope === 'all' ? undefined : (entry) => entry.scope === scope,
    format,
  });
  const scopeMessage =
    scope === 'all'
      ? 'Esportazione log QA per tutti gli scope'
      : `Esportazione log QA per scope ${scope}`;
  logClientEvent('quality.logs.exported', {
    scope,
    level: 'info',
    message: `${scopeMessage} (${exportResult.format.toUpperCase()})`,
    data: {
      format: exportResult.format,
      filename: exportResult.filename,
      count: exportResult.entries.length,
    },
    source: 'quality-console',
  });
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

.quality-release__console {
  background: rgba(9, 14, 20, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1.2rem;
  display: grid;
  gap: 1.5rem;
}

.release-console {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.release-console__panel {
  background: rgba(12, 18, 26, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1rem;
  display: grid;
  gap: 0.85rem;
}

.release-console__panel h4 {
  margin: 0;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.75);
}

.release-console__form {
  display: grid;
  gap: 0.75rem;
}

.release-console__field {
  display: grid;
  gap: 0.35rem;
}

.release-console__field label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(240, 244, 255, 0.55);
}

.release-console__field input,
.release-console__field select,
.release-console__field textarea {
  background: rgba(9, 14, 20, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #f0f4ff;
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
}

.release-console__field textarea {
  resize: vertical;
}

.release-console__submit {
  border: none;
  background: linear-gradient(90deg, #57ca8a 0%, #61d5ff 100%);
  color: #05080d;
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.release-console__submit:hover {
  opacity: 0.85;
}

.release-console__error {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(255, 133, 133, 0.85);
}

.release-console__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
}

.release-console__list li {
  background: rgba(9, 14, 20, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.85rem;
  display: grid;
  gap: 0.65rem;
}

.release-console__list header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.release-console__status {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  border: 1px solid rgba(96, 213, 255, 0.35);
  color: rgba(96, 213, 255, 0.85);
}

.release-console__status[data-status='awaiting-approval'] {
  border-color: rgba(255, 200, 112, 0.45);
  color: rgba(255, 200, 112, 0.9);
}

.release-console__status[data-status='approved'] {
  border-color: rgba(129, 255, 199, 0.55);
  color: rgba(129, 255, 199, 0.85);
}

.release-console__status[data-status='deployed'] {
  border-color: rgba(238, 170, 255, 0.55);
  color: rgba(238, 170, 255, 0.9);
}

.release-console__list dl {
  margin: 0;
  display: grid;
  gap: 0.35rem;
}

.release-console__list dl div {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.75);
}

.release-console__list dt {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.65rem;
  color: rgba(240, 244, 255, 0.5);
}

.release-console__list dd {
  margin: 0;
  font-weight: 600;
  color: rgba(240, 244, 255, 0.85);
}

.release-console__action {
  border: none;
  background: rgba(96, 213, 255, 0.16);
  color: #61d5ff;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s ease, transform 0.2s ease;
}

.release-console__action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.release-console__action:not(:disabled):hover {
  background: rgba(96, 213, 255, 0.28);
  transform: translateY(-1px);
}

.release-console__empty {
  text-align: center;
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.6);
}

.release-console__stream-meta {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(240, 244, 255, 0.6);
}

.release-console__message {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(240, 244, 255, 0.78);
}

.release-console__watchers {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 0.75rem;
  display: grid;
  gap: 0.35rem;
}

.release-console__watchers h5 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.7rem;
  color: rgba(240, 244, 255, 0.55);
}

.release-console__watchers ul {
  margin: 0;
  padding-left: 1.1rem;
  color: rgba(240, 244, 255, 0.7);
}

.release-console__guide {
  background: rgba(12, 18, 26, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1rem;
  display: grid;
  gap: 0.65rem;
  font-size: 0.9rem;
  color: rgba(240, 244, 255, 0.75);
}

.release-console__guide h4 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.65);
}

.release-console__guide ol {
  margin: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.4rem;
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
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.quality-logs__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.quality-logs__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
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

.quality-logs__export {
  background: linear-gradient(135deg, rgba(96, 213, 255, 0.25), rgba(159, 123, 255, 0.25));
  border: 1px solid rgba(96, 213, 255, 0.35);
  color: #f0f4ff;
  padding: 0.4rem 0.85rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.quality-logs__export:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(96, 213, 255, 0.25);
}

.quality-logs__export:focus-visible {
  outline: 2px solid rgba(159, 123, 255, 0.65);
  outline-offset: 2px;
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
