<template>
  <section class="species-panel" v-if="species">
    <SpeciesOverview :name="displayName" :summary="summary" :description="description">
      <template #actions>
        <SpeciesQuickActions @export="handleExport" @save="handleSave" />
      </template>
    </SpeciesOverview>

    <div class="species-panel__layout">
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
          />
        </template>
      </SpeciesBiology>

      <aside class="species-panel__sidebar">
        <SpeciesStatistics :statistics="statistics" :synergy="formattedSynergy">
          <p v-if="metaInfo" class="species-panel__meta">{{ metaInfo }}</p>
        </SpeciesStatistics>
        <SpeciesRevisionTimeline :entries="timelineEntries" />
      </aside>
    </div>

    <SpeciesPreviewGrid :previews="previewCards" :loading="isPreviewLoading" :error="previewError">
      <template #filters>
        <button type="button" class="species-panel__refresh" @click="refreshPreviews" :disabled="isPreviewLoading">
          Aggiorna batch
        </button>
      </template>
    </SpeciesPreviewGrid>
  </section>
  <section v-else class="species-panel species-panel--empty">
    <p>Nessuna specie selezionata.</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

import SpeciesBiology from './species/SpeciesBiology.vue';
import SpeciesOverview from './species/SpeciesOverview.vue';
import SpeciesPreviewGrid from './species/SpeciesPreviewGrid.vue';
import SpeciesQuickActions from './species/SpeciesQuickActions.vue';
import SpeciesRevisionTimeline from './species/SpeciesRevisionTimeline.vue';
import SpeciesStatistics from './species/SpeciesStatistics.vue';
import TraitFilterPanel from './species/TraitFilterPanel.vue';
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
const description = computed(
  () => props.species?.description || props.species?.summary || ''
);
const traits = computed(() => props.species?.traits || {});
const coreTraits = computed(() => traits.value.core || props.species?.core_traits || []);
const derivedTraits = computed(
  () => traits.value.derived || props.species?.derived_traits || []
);
const morphology = computed(() => props.species?.morphology || {});
const adaptations = computed(() => morphology.value.adaptations || []);
const behaviour = computed(
  () => props.species?.behavior || props.species?.behavior_profile || {}
);
const behaviourTags = computed(
  () => behaviour.value.tags || behaviour.value.behaviourTags || []
);
const behaviourDrives = computed(() => behaviour.value.drives || []);
const statistics = computed(() =>
  props.species?.statistics || {
    threat_tier: props.species?.balance?.threat_tier,
    rarity: props.species?.rarity,
  }
);

const displayName = computed(
  () => props.species?.display_name || props.species?.id || 'Specie'
);

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

const availableTraits = computed(() => ({
  core: Array.from(new Set(coreTraits.value || [])).filter(Boolean),
  derived: Array.from(new Set(derivedTraits.value || [])).filter(Boolean),
}));

const traitFilters = ref({ core: [], derived: [] });

const timelineEntries = computed(() => {
  const messages = Array.isArray(props.validation?.messages)
    ? props.validation.messages
    : [];
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
  { immediate: true }
);

watch(
  () => props.species?.id,
  () => {
    traitFilters.value = {
      core: [...availableTraits.value.core],
      derived: [...availableTraits.value.derived],
    };
    previewCards.value = Array.isArray(props.previewBatch) ? props.previewBatch : [];
    previewError.value = '';
    if (props.autoPreview) {
      void refreshPreviews();
    }
  },
  { immediate: true }
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
  }
);

function buildPreviewRequests() {
  const coreSelection = traitFilters.value.core.length
    ? traitFilters.value.core
    : availableTraits.value.core;
  const derivedSelection = traitFilters.value.derived;
  const baseTraits = Array.from(new Set([...coreSelection, ...derivedSelection]));
  if (!baseTraits.length) {
    return [];
  }
  const biomeId = props.meta?.biome_id || morphology.value.environments?.[0] || null;
  const fallback = availableTraits.value.core;
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
  background: #0a0d12;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  color: #f0f4ff;
  display: grid;
  gap: 1.5rem;
}

.species-panel__layout {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 960px) {
  .species-panel__layout {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  }
}

.species-panel__sidebar {
  display: grid;
  gap: 1rem;
}

.species-panel__meta {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.75;
}

.species-panel__refresh {
  background: transparent;
  color: #f0f4ff;
  border: 1px solid rgba(240, 244, 255, 0.35);
  border-radius: 8px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s ease;
}

.species-panel__refresh:hover:enabled {
  background: rgba(39, 121, 255, 0.18);
}

.species-panel__refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.species-panel--empty {
  text-align: center;
  color: rgba(240, 244, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 2rem;
}
</style>
