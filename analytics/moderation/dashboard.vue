<template>
  <section class="moderation-dashboard">
    <header class="moderation-dashboard__header">
      <div>
        <h2>Moderazione community</h2>
        <p>
          Supervisione centralizzata di segnalazioni, trascrizioni vocali e classificazione automatica
          della tossicità.
        </p>
      </div>
      <dl class="moderation-dashboard__meta">
        <div>
          <dt>Ultimo retraining</dt>
          <dd>{{ lastRetrainingLabel }}</dd>
        </div>
        <div>
          <dt>Dataset annotato</dt>
          <dd>{{ datasetSize }} frasi</dd>
        </div>
      </dl>
    </header>

    <form class="moderation-dashboard__filters" @submit.prevent>
      <label>
        Ricerca
        <input v-model="filters.search" type="search" placeholder="ID, testo o owner" />
      </label>
      <label>
        Gravità
        <select v-model="filters.severity">
          <option value="all">Tutte</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Bassa</option>
        </select>
      </label>
      <label>
        Canale
        <select v-model="filters.channel">
          <option value="all">Tutti</option>
          <option value="text">Chat testuale</option>
          <option value="voice">Voice chat</option>
          <option value="reports">Segnalazioni</option>
        </select>
      </label>
      <label>
        Periodo
        <input v-model="filters.from" type="date" />
        <span>→</span>
        <input v-model="filters.to" type="date" />
      </label>
      <fieldset class="moderation-dashboard__actions">
        <legend>Azioni rapide</legend>
        <button type="button" @click="bulkResolve" :disabled="!selectedCount">Segna come risolti</button>
        <button type="button" @click="bulkEscalate" :disabled="!selectedCount">Escalation</button>
        <button type="button" @click="bulkSilence" :disabled="!selectedCount">Silenzia</button>
      </fieldset>
    </form>

    <section class="moderation-dashboard__summary">
      <article class="summary-card">
        <h3>Casi aperti</h3>
        <p class="summary-card__value">{{ openCases }}</p>
        <p class="summary-card__caption">{{ highSeverityCount }} con priorità alta</p>
      </article>
      <article class="summary-card">
        <h3>Tempo medio risposta</h3>
        <p class="summary-card__value">{{ averageResponseTime }}</p>
        <p class="summary-card__caption">SLA: {{ slaTarget }}</p>
      </article>
      <article class="summary-card">
        <h3>Trascrizioni elaborate</h3>
        <p class="summary-card__value">{{ processedTranscriptions }}</p>
        <p class="summary-card__caption">Ultime 24h</p>
      </article>
      <article class="summary-card">
        <h3>Accuratezza modello</h3>
        <p class="summary-card__value">{{ modelAccuracy }}</p>
        <p class="summary-card__caption">Val. hold-out</p>
      </article>
    </section>

    <section class="moderation-dashboard__table">
      <header>
        <h3>Segnalazioni da gestire</h3>
        <span>{{ filteredCases.length }} elementi</span>
      </header>
      <table>
        <thead>
          <tr>
            <th>
              <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
            </th>
            <th>ID</th>
            <th>Testo / Trascrizione</th>
            <th>Origine</th>
            <th>Gravità</th>
            <th>Stato</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredCases" :key="item.id">
            <td>
              <input type="checkbox" :value="item.id" :checked="isSelected(item.id)" @change="toggleSelection(item.id)" />
            </td>
            <td>{{ item.id }}</td>
            <td>
              <p class="table__text">{{ item.content }}</p>
              <small class="table__meta">{{ item.timestamp }} · {{ item.owner }}</small>
            </td>
            <td>
              <span class="badge" :class="`badge--${item.channel}`">{{ channelLabel(item.channel) }}</span>
            </td>
            <td>
              <span class="badge" :class="`badge--${item.severity}`">{{ severityLabel(item.severity) }}</span>
            </td>
            <td>
              {{ stateLabel(item.state) }}
              <small v-if="item.muted" class="table__muted">utente silenziato</small>
            </td>
            <td class="table__actions">
              <button type="button" @click="resolve(item.id)" :disabled="item.state === 'resolved'">Risolvi</button>
              <button type="button" @click="escalate(item.id)">Escala</button>
            </td>
          </tr>
          <tr v-if="!filteredCases.length">
            <td colspan="7" class="table__empty">Nessun elemento corrisponde ai filtri.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

type Severity = 'high' | 'medium' | 'low';
type Channel = 'text' | 'voice' | 'reports';
type State = 'open' | 'in_progress' | 'resolved';

interface ModerationCase {
  id: string;
  content: string;
  owner: string;
  severity: Severity;
  channel: Channel;
  timestamp: string;
  state: State;
  muted?: boolean;
}

const now = new Date();

const filters = reactive({
  search: '',
  severity: 'all',
  channel: 'all',
  from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  to: now.toISOString().slice(0, 10),
});

const cases = ref<ModerationCase[]>([
  {
    id: 'FLAG-1042',
    content: 'Se continui così ti banno dalla lobby, idiota.',
    owner: 'auto-ml',
    severity: 'high',
    channel: 'text',
    timestamp: '2024-03-16T09:15:00Z',
    state: 'open',
    muted: false,
  },
  {
    id: 'VOICE-339',
    content: 'Trascrizione voice chat · tono aggressivo ma non tossico',
    owner: 'trascription-pipeline',
    severity: 'medium',
    channel: 'voice',
    timestamp: '2024-03-16T08:45:00Z',
    state: 'in_progress',
    muted: false,
  },
  {
    id: 'REP-771',
    content: 'Segnalazione utente: spam in lobby pubblica',
    owner: 'utente:camilla',
    severity: 'low',
    channel: 'reports',
    timestamp: '2024-03-15T22:00:00Z',
    state: 'open',
    muted: false,
  },
  {
    id: 'FLAG-1034',
    content: 'Basta parlare, fai schifo e rovini la ranked a tutti.',
    owner: 'auto-ml',
    severity: 'high',
    channel: 'text',
    timestamp: '2024-03-15T21:45:00Z',
    state: 'resolved',
    muted: true,
  },
]);

const selectedIds = ref<Set<string>>(new Set());

const filteredCases = computed(() => {
  return cases.value.filter((item) => {
    const matchesSeverity = filters.severity === 'all' || item.severity === filters.severity;
    const matchesChannel = filters.channel === 'all' || item.channel === filters.channel;
    const matchesSearch =
      !filters.search ||
      item.id.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.content.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.owner.toLowerCase().includes(filters.search.toLowerCase());

    const fromDate = filters.from ? new Date(filters.from) : null;
    const toDate = filters.to ? new Date(filters.to) : null;
    const caseDate = new Date(item.timestamp);
    const matchesFrom = !fromDate || caseDate >= fromDate;
    const matchesTo = !toDate || caseDate <= toDate;

    return matchesSeverity && matchesChannel && matchesSearch && matchesFrom && matchesTo;
  });
});

const allSelected = computed(() => filteredCases.value.length > 0 && filteredCases.value.every((item) => selectedIds.value.has(item.id)));
const selectedCount = computed(() => selectedIds.value.size);

const openCases = computed(() => cases.value.filter((item) => item.state !== 'resolved').length);
const highSeverityCount = computed(() => cases.value.filter((item) => item.severity === 'high').length);
const processedTranscriptions = computed(() => cases.value.filter((item) => item.channel === 'voice').length);
const averageResponseTime = computed(() => '2h 15m');
const slaTarget = '3h';
const modelAccuracy = '93.2%';
const datasetSize = 2400;
const lastRetrainingLabel = '2024-03-14 02:30';

function toggleSelection(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id);
  } else {
    selectedIds.value.add(id);
  }
  selectedIds.value = new Set(selectedIds.value);
}

function toggleSelectAll(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.checked) {
    filteredCases.value.forEach((item) => selectedIds.value.add(item.id));
  } else {
    selectedIds.value.clear();
  }
  selectedIds.value = new Set(selectedIds.value);
}

function isSelected(id: string) {
  return selectedIds.value.has(id);
}

function resolve(id: string) {
  updateCase(id, { state: 'resolved', muted: false });
}

function escalate(id: string) {
  updateCase(id, { state: 'in_progress', muted: false });
}

function bulkResolve() {
  selectedIds.value.forEach((id) => resolve(id));
  selectedIds.value.clear();
  selectedIds.value = new Set();
}

function bulkEscalate() {
  selectedIds.value.forEach((id) => escalate(id));
  selectedIds.value.clear();
  selectedIds.value = new Set();
}

function bulkSilence() {
  selectedIds.value.forEach((id) => updateCase(id, { state: 'resolved', muted: true }));
  selectedIds.value.clear();
  selectedIds.value = new Set();
}

function updateCase(id: string, changes: Partial<ModerationCase>) {
  cases.value = cases.value.map((item) => (item.id === id ? { ...item, ...changes } : item));
}

function severityLabel(value: Severity) {
  return value === 'high' ? 'Alta' : value === 'medium' ? 'Media' : 'Bassa';
}

function channelLabel(value: Channel) {
  switch (value) {
    case 'voice':
      return 'Voice';
    case 'reports':
      return 'Segnalazione';
    default:
      return 'Chat';
  }
}

function stateLabel(value: State) {
  switch (value) {
    case 'resolved':
      return 'Risolto';
    case 'in_progress':
      return 'In lavorazione';
    default:
      return 'Aperto';
  }
}
</script>

<style scoped>
.moderation-dashboard {
  display: grid;
  gap: 1.5rem;
  padding: 1.5rem;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 1rem;
}

.moderation-dashboard__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

.moderation-dashboard__header h2 {
  font-size: 1.75rem;
  margin: 0 0 0.25rem;
}

.moderation-dashboard__header p {
  margin: 0;
  color: #94a3b8;
}

.moderation-dashboard__meta {
  display: grid;
  gap: 0.75rem;
  min-width: 200px;
}

.moderation-dashboard__meta dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.moderation-dashboard__meta dd {
  margin: 0;
  font-weight: 600;
}

.moderation-dashboard__filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 0.75rem;
}

.moderation-dashboard__filters label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: #cbd5f5;
}

.moderation-dashboard__filters input,
.moderation-dashboard__filters select,
.moderation-dashboard__filters button {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.5rem;
  padding: 0.45rem 0.65rem;
  color: inherit;
}

.moderation-dashboard__filters span {
  align-self: center;
  color: #64748b;
}

.moderation-dashboard__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: none;
  margin: 0;
  padding: 0;
}

.moderation-dashboard__actions button {
  cursor: pointer;
  transition: background 0.2s ease;
}

.moderation-dashboard__actions button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.moderation-dashboard__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.summary-card {
  background: rgba(30, 41, 59, 0.9);
  border-radius: 0.75rem;
  padding: 1rem;
  display: grid;
  gap: 0.5rem;
}

.summary-card__value {
  font-size: 1.75rem;
  font-weight: 600;
}

.summary-card__caption {
  margin: 0;
  color: #94a3b8;
}

.moderation-dashboard__table {
  background: rgba(15, 23, 42, 0.8);
  border-radius: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  padding: 1rem;
  display: grid;
  gap: 1rem;
}

.moderation-dashboard__table header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #94a3b8;
}

.moderation-dashboard__table table {
  width: 100%;
  border-collapse: collapse;
}

.moderation-dashboard__table th,
.moderation-dashboard__table td {
  padding: 0.75rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  text-align: left;
}

.moderation-dashboard__table th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.table__text {
  margin: 0;
}

.table__meta {
  color: #64748b;
}

.table__muted {
  display: inline-block;
  margin-left: 0.5rem;
  color: #22d3ee;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.table__actions {
  display: flex;
  gap: 0.5rem;
}

.table__actions button {
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 0.5rem;
  padding: 0.35rem 0.75rem;
  color: inherit;
  cursor: pointer;
}

.table__actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.table__empty {
  text-align: center;
  color: #64748b;
  padding: 2rem 0;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.badge--text {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.badge--voice {
  background: rgba(236, 72, 153, 0.2);
  color: #f472b6;
}

.badge--reports {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.badge--high {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.badge--medium {
  background: rgba(250, 204, 21, 0.2);
  color: #facc15;
}

.badge--low {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

@media (max-width: 960px) {
  .moderation-dashboard__header {
    flex-direction: column;
  }

  .table__actions {
    flex-direction: column;
  }
}
</style>
