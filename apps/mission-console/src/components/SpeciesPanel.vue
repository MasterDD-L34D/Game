<template>
  <section class="species-panel" v-if="species">
    <NebulaShell :tabs="tabs" v-model="activeTab" :status-indicators="statusIndicators">
      <template #actions>
        <SpeciesQuickActions @export="handleExport" @save="handleSave" />
      </template>

      <template #cards>
        <SpeciesCard :species="species" />
      </template>

      <template #default="{ activeTab: currentTab }">
        <div v-if="currentTab === 'overview'" class="species-panel__section">
          <SpeciesOverview :name="displayName" :summary="summary" :description="description" />
          <div v-if="metaInfo" class="species-panel__meta">
            <TraitChip :label="metaInfo" variant="telemetry" icon="⧉" />
          </div>
          <div class="species-panel__adaptations" v-if="adaptations.length">
            <h4>Adattamenti</h4>
            <ul>
              <li v-for="item in adaptations" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>

        <div v-else-if="currentTab === 'biology'" class="species-panel__section species-panel__section--grid">
          <SpeciesBiology
            :core-traits="coreTraits"
            :derived-traits="derivedTraits"
            :adaptations="adaptations"
            :behaviour-tags="behaviourTags"
            :drives="behaviourDrives"
          >
            <template #filters>
              <TraitFilterPanel
                v-model="traitFilters"
                :core-options="availableTraits.core"
                :derived-options="availableTraits.derived"
                :labels="traitLabelMap"
                :highlight="synergySuggestions"
              />
            </template>
            <template #synergy-suggestions>
              <div v-if="synergySuggestions.length" class="species-panel__suggestions">
                <p>Sinergie dal catalogo</p>
                <div class="species-panel__suggestions-list">
                  <button
                    v-for="suggestion in synergySuggestions"
                    :key="`suggestion-${suggestion}`"
                    type="button"
                    class="species-panel__suggestion"
                    @click="applySynergySuggestion(suggestion)"
                    :aria-label="`Applica suggerimento sinergia ${formatTraitLabel(suggestion)}`"
                  >
                    <TraitChip :label="formatTraitLabel(suggestion)" variant="synergy" />
                  </button>
                </div>
              </div>
            </template>
          </SpeciesBiology>
        </div>

        <div v-else-if="currentTab === 'telemetry'" class="species-panel__section species-panel__section--columns">
          <SpeciesStatistics :statistics="statistics" :synergy="formattedSynergy">
            <p v-if="metaInfo" class="species-panel__meta-text">{{ metaInfo }}</p>
          </SpeciesStatistics>
          <SpeciesRevisionTimeline :entries="timelineEntries" />
          <div class="species-panel__telemetry" v-if="telemetryInfo.length">
            <h4>Telemetry</h4>
            <ul>
              <li v-for="item in telemetryInfo" :key="item.label">
                <strong>{{ item.label }}</strong>
                <span>{{ item.value }}</span>
              </li>
            </ul>
          </div>
          <div v-if="previewError" class="species-panel__error" role="alert">{{ previewError }}</div>
        </div>

        <div v-else-if="currentTab === 'synergies'" class="species-panel__section species-panel__section--synergy">
          <div class="species-panel__synergy-grid" v-if="synergyCards.length">
            <SpeciesSynergyCard
              v-for="card in synergyCards"
              :key="card.id"
              :title="card.title"
              :detail="card.detail"
            />
          </div>
          <p v-else class="species-panel__empty">Nessuna sinergia registrata per questa specie.</p>
          <SpeciesPreviewGrid
            class="species-panel__previews"
            :previews="previewCards"
            :loading="isPreviewLoading"
            :error="previewError"
          >
            <template #filters>
              <button type="button" class="species-panel__refresh" @click="refreshPreviews" :disabled="isPreviewLoading">
                Aggiorna batch
              </button>
            </template>
          </SpeciesPreviewGrid>
        </div>
      </template>
    </NebulaShell>
  </section>
  <section v-else class="species-panel species-panel--empty">
    <p>Nessuna specie selezionata.</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

import NebulaShell from './layout/NebulaShell.vue';
import SpeciesBiology from './species/SpeciesBiology.vue';
import SpeciesCard from './species/SpeciesCard.vue';
import SpeciesOverview from './species/SpeciesOverview.vue';
import SpeciesPreviewGrid from './species/SpeciesPreviewGrid.vue';
import SpeciesQuickActions from './species/SpeciesQuickActions.vue';
import SpeciesRevisionTimeline from './species/SpeciesRevisionTimeline.vue';
import SpeciesStatistics from './species/SpeciesStatistics.vue';
import SpeciesSynergyCard from './species/SpeciesSynergyCard.vue';
import TraitFilterPanel from './species/TraitFilterPanel.vue';
import TraitChip from './shared/TraitChip.vue';
import { requestSpeciesPreviewBatch } from '../services/speciesPreviewService';

const props = defineProps({
  species: {
    type: Object,
    default: null,
  },
  validation: {
    type: Object,
    default: null,
  },
  meta: {
    type: Object,
    default: null,
  },
  traitCatalog: {
    type: Object,
    default: () => ({ traits: [], labels: {}, synergyMap: {} }),
  },
  traitCompliance: {
    type: Object,
    default: () => ({ badges: [] }),
  },
  previewBatch: {
    type: Array,
    default: () => [],
  },
  autoPreview: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['export', 'save', 'preview-error']);

const summary = computed(() => props.species?.summary || null);
const description = computed(() => props.species?.description || props.species?.summary || '');
const traits = computed(() => props.species?.traits || {});
const coreTraits = computed(() => traits.value.core || props.species?.core_traits || []);
const derivedTraits = computed(() => traits.value.derived || props.species?.derived_traits || []);
const morphology = computed(() => props.species?.morphology || {});
const adaptations = computed(() => morphology.value.adaptations || []);
const behaviour = computed(() => props.species?.behavior || props.species?.behavior_profile || {});
const behaviourTags = computed(() => behaviour.value.tags || behaviour.value.behaviourTags || []);
const behaviourDrives = computed(() => behaviour.value.drives || []);
const statistics = computed(
  () =>
    props.species?.statistics || {
      threat_tier: props.species?.balance?.threat_tier,
      rarity: props.species?.rarity,
    },
);

const displayName = computed(() => props.species?.display_name || props.species?.id || 'Specie');

const telemetry = computed(() => props.species?.telemetry || props.meta?.telemetry || {});

const metaInfo = computed(() => {
  const attempt = props.meta?.attempts;
  const fallback = props.meta?.fallback_used;
  if (attempt || fallback) {
    const segments = [];
    if (attempt) segments.push(`Tentativi: ${attempt}`);
    if (fallback != null) segments.push(`Fallback: ${fallback ? 'sì' : 'no'}`);
    return segments.join(' · ');
  }
  return '';
});

const formattedSynergy = computed(() => {
  const value = statistics.value?.synergy_score;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.round(value * 100)}%`;
  }
  return 'n/d';
});

const traitCatalogEntries = computed(() =>
  Array.isArray(props.traitCatalog?.traits) ? props.traitCatalog.traits : [],
);
const traitLabelMap = computed(() => props.traitCatalog?.labels || {});
const traitSynergyMap = computed(() => props.traitCatalog?.synergyMap || {});

const catalogTraitIds = computed(() =>
  traitCatalogEntries.value
    .map((entry) => (entry && entry.id ? String(entry.id) : null))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b)),
);

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

const coreTraitOptions = computed(() => {
  const base = new Set(coreTraits.value || []);
  const fallback = catalogTraitIds.value.slice(0, 20);
  if (!base.size && fallback.length) {
    fallback.forEach((id) => base.add(id));
  }
  const seeds = [...(coreTraits.value || []), ...(derivedTraits.value || [])];
  for (const traitId of seeds) {
    const synergies = traitSynergyMap.value[traitId] || [];
    synergies.forEach((entry) => base.add(entry));
  }
  return uniqueSorted([...base]);
});

const derivedTraitOptions = computed(() => {
  const base = new Set(derivedTraits.value || []);
  const fallback = catalogTraitIds.value.slice(0, 20);
  if (!base.size && fallback.length) {
    fallback.forEach((id) => base.add(id));
  }
  const seeds = [...(coreTraits.value || []), ...(derivedTraits.value || [])];
  for (const traitId of seeds) {
    const synergies = traitSynergyMap.value[traitId] || [];
    synergies.forEach((entry) => base.add(entry));
  }
  return uniqueSorted([...base]);
});

const availableTraits = computed(() => ({
  core: coreTraitOptions.value,
  derived: derivedTraitOptions.value,
}));

const synergySuggestions = computed(() => {
  const suggestions = new Set();
  const currentCore = Array.isArray(traitFilters.value.core) ? traitFilters.value.core : [];
  for (const traitId of currentCore) {
    const entries = traitSynergyMap.value[traitId] || [];
    for (const entry of entries) {
      if (!currentCore.includes(entry)) {
        suggestions.add(entry);
      }
    }
  }
  return uniqueSorted([...suggestions]);
});

const traitFilters = ref({ core: [], derived: [] });
const activeTab = ref('overview');

const tabs = computed(() => [
  { id: 'overview', label: 'Scheda', icon: '🧬' },
  { id: 'biology', label: 'Biologia', icon: '🌿' },
  { id: 'telemetry', label: 'Telemetry', icon: '📡' },
  { id: 'synergies', label: 'Sinergie', icon: '∞' },
]);

function formatTraitLabel(traitId) {
  if (!traitId) {
    return '';
  }
  const label = traitLabelMap.value?.[traitId];
  if (label && label !== traitId) {
    return `${traitId} · ${label}`;
  }
  return traitId;
}

function applySynergySuggestion(traitId) {
  if (!traitId) {
    return;
  }
  const core = Array.isArray(traitFilters.value.core) ? [...traitFilters.value.core] : [];
  const derived = Array.isArray(traitFilters.value.derived) ? [...traitFilters.value.derived] : [];
  if (!derived.includes(traitId)) {
    derived.push(traitId);
  }
  traitFilters.value = {
    core,
    derived,
  };
}

const statusIndicators = computed(() => {
  const items = [];
  const rarity = props.species?.rarity || statistics.value?.rarity;
  if (rarity) {
    items.push({ id: 'rarity', label: 'Rarità', value: rarity, tone: 'neutral' });
  }
  const threat = statistics.value?.threat_tier || props.species?.threatTier;
  if (threat) {
    const numeric = Number.parseInt(String(threat).replace(/[^0-9]/g, ''), 10);
    let tone = 'neutral';
    if (Number.isFinite(numeric)) {
      if (numeric >= 3) tone = 'critical';
      else if (numeric >= 2) tone = 'warning';
    }
    items.push({ id: 'threat', label: 'Threat tier', value: `T${numeric || threat}`, tone });
  }
  const synergyScore = statistics.value?.synergy_score;
  if (typeof synergyScore === 'number') {
    const percent = Math.round(synergyScore * 100);
    let tone = 'warning';
    if (percent >= 80) tone = 'success';
    else if (percent < 50) tone = 'critical';
    items.push({ id: 'synergy', label: 'Allineamento', value: `${percent}%`, tone });
  }
  const coverage = telemetry.value?.coverage;
  if (typeof coverage === 'number') {
    const percent = Math.round(coverage * 100);
    let tone = 'neutral';
    if (coverage >= 0.8) tone = 'success';
    else if (coverage < 0.55) tone = 'warning';
    items.push({ id: 'coverage', label: 'Coverage QA', value: `${percent}%`, tone });
  }
  const complianceBadges = Array.isArray(props.traitCompliance?.badges)
    ? props.traitCompliance.badges
    : [];
  for (const badge of complianceBadges) {
    if (!badge) continue;
    items.push({
      id: `trait-${badge.id || badge.label}`,
      label: badge.label || 'Trait QA',
      value: badge.value || '',
      tone: badge.tone || 'neutral',
    });
  }
  return items;
});

const telemetryInfo = computed(() => {
  const info = [];
  if (telemetry.value?.lastValidation) {
    const date = new Date(telemetry.value.lastValidation);
    info.push({
      label: 'Ultima validazione',
      value: Number.isNaN(date.getTime())
        ? telemetry.value.lastValidation
        : new Intl.DateTimeFormat('it-IT', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(date),
    });
  }
  if (telemetry.value?.curatedBy) {
    info.push({ label: 'Curatore', value: telemetry.value.curatedBy });
  }
  if (typeof telemetry.value?.coverage === 'number') {
    info.push({ label: 'Coverage', value: `${Math.round(telemetry.value.coverage * 100)}%` });
  }
  return info;
});

const synergyCards = computed(() => {
  const entries = Array.isArray(props.species?.traits?.synergy)
    ? props.species.traits.synergy
    : [];
  const breakdown = props.species?.statistics?.synergy_breakdown || props.species?.statistics?.synergies || {};
  return entries.map((entry, index) => {
    const key = typeof entry === 'string' ? entry : entry?.id || String(index);
    const label = typeof entry === 'string' ? entry : entry?.label || entry?.name || `Sinergia ${index + 1}`;
    let note = '';
    if (Array.isArray(breakdown)) {
      const record = breakdown[index];
      if (record && typeof record === 'object') {
        note = record.note || record.summary || record.detail || '';
      } else if (typeof record === 'string') {
        note = record;
      }
    } else if (breakdown && typeof breakdown === 'object') {
      const record = breakdown[key] || breakdown[label];
      if (record && typeof record === 'object') {
        note = record.note || record.summary || record.detail || '';
      } else if (typeof record === 'string') {
        note = record;
      }
    }
    const details = [];
    if (note) {
      details.push(note);
    }
    if (typeof telemetry.value?.coverage === 'number') {
      details.push(`Coverage ${Math.round(telemetry.value.coverage * 100)}%`);
    }
    if (statistics.value?.synergy_score) {
      details.push(`Allineamento ${formattedSynergy.value}`);
    }
    if (!details.length) {
      details.push('Sinergia registrata dal generator senza annotazioni extra.');
    }
    return {
      id: `${props.species?.id || 'synergy'}-${index}`,
      title: label,
      detail: details.join(' · '),
    };
  });
});

const timelineEntries = computed(() => {
  const messages = Array.isArray(props.validation?.messages) ? props.validation.messages : [];
  return messages.map((message, index) => ({
    id: `${message.code || 'msg'}-${index}`,
    title: message.level === 'error' ? 'Errore' : message.level === 'warning' ? 'Avviso' : 'Info',
    message: message.message || message.code,
    code: message.code || 'n/d',
    level: message.level || 'info',
  }));
});

const previewCards = ref([]);
const isPreviewLoading = ref(false);
const previewError = ref('');

watch(
  () => props.previewBatch,
  (value) => {
    if (Array.isArray(value)) {
      previewCards.value = value;
    }
  },
  { immediate: true },
);

watch(
  () => props.species?.id,
  () => {
    activeTab.value = 'overview';
    traitFilters.value = {
      core: uniqueSorted([... (coreTraits.value || [])]),
      derived: uniqueSorted([... (derivedTraits.value || [])]),
    };
    previewCards.value = Array.isArray(props.previewBatch) ? props.previewBatch : [];
    previewError.value = '';
    if (props.autoPreview) {
      void refreshPreviews();
    }
  },
  { immediate: true },
);

watch(
  () => [
    traitFilters.value.core.slice().sort().join(','),
    traitFilters.value.derived.slice().sort().join(','),
    props.autoPreview,
    props.species?.id,
  ],
  async () => {
    if (props.autoPreview) {
      await refreshPreviews();
    }
  },
);

function buildPreviewRequests() {
  const coreSelection = traitFilters.value.core.length
    ? traitFilters.value.core
    : Array.isArray(coreTraits.value) && coreTraits.value.length
      ? uniqueSorted([...coreTraits.value])
      : coreTraitOptions.value;
  const derivedSelection = traitFilters.value.derived;
  const baseTraits = Array.from(new Set([...coreSelection, ...derivedSelection]));
  if (!baseTraits.length) {
    return [];
  }
  const biomeId = props.meta?.biome_id || morphology.value.environments?.[0] || null;
  const fallback = coreTraitOptions.value;
  const combos = [baseTraits];
  for (const trait of derivedSelection) {
    combos.push(Array.from(new Set([...coreSelection, trait])));
  }
  const uniqueCombos = [];
  const seen = new Set();
  for (const combo of combos) {
    const signature = combo.slice().sort().join('|');
    if (!signature || seen.has(signature)) continue;
    seen.add(signature);
    uniqueCombos.push(combo);
  }
  return uniqueCombos.slice(0, 4).map((combo, index) => ({
    trait_ids: combo,
    biome_id: biomeId,
    seed: index,
    base_name: `${displayName.value} Preview ${index + 1}`,
    request_id: `${props.species?.id || 'preview'}-${index}`,
    fallback_trait_ids: fallback,
  }));
}

async function refreshPreviews() {
  if (!props.species) {
    previewCards.value = [];
    return;
  }
  const requests = buildPreviewRequests();
  if (!requests.length) {
    previewCards.value = [];
    return;
  }
  isPreviewLoading.value = true;
  previewError.value = '';
  try {
    const response = await requestSpeciesPreviewBatch(requests);
    previewCards.value = response.previews || [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    previewError.value = message;
    emit('preview-error', message);
  } finally {
    isPreviewLoading.value = false;
  }
}

function handleExport() {
  emit('export', props.species);
}

function handleSave() {
  emit('save', props.species);
}
</script>

<style scoped>
.species-panel {
  color: inherit;
}

.species-panel--empty {
  text-align: center;
  color: rgba(240, 244, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 2rem;
}

.species-panel__section {
  display: grid;
  gap: 1.25rem;
}

.species-panel__section--grid {
  grid-template-columns: minmax(0, 1fr);
}

.species-panel__section--columns {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.species-panel__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.species-panel__meta-text {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.75;
}

.species-panel__adaptations h4,
.species-panel__telemetry h4 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
  color: rgba(226, 232, 240, 0.75);
}

.species-panel__adaptations ul,
.species-panel__telemetry ul {
  margin: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.35rem;
  color: rgba(226, 232, 240, 0.85);
}

.species-panel__telemetry li {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.species-panel__synergy-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.species-panel__empty {
  margin: 0;
  color: rgba(226, 232, 240, 0.65);
}

.species-panel__previews {
  margin-top: 1.5rem;
}

.species-panel__refresh {
  background: rgba(38, 52, 88, 0.4);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s ease;
}

.species-panel__refresh:hover:enabled {
  background: rgba(122, 196, 255, 0.18);
}

.species-panel__refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.species-panel__error {
  color: var(--color-danger);
  font-size: 0.85rem;
}

.species-panel__suggestions {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.35rem;
}

.species-panel__suggestions p {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.species-panel__suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.species-panel__suggestion {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.species-panel__suggestion:focus-visible {
  outline: 2px solid rgba(39, 121, 255, 0.6);
  outline-offset: 2px;
}
</style>
