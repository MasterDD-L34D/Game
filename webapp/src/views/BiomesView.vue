<template>
  <section class="biomes-view">
    <NebulaShell :tabs="tabs" v-model="activeTab" :status-indicators="statusIndicators">
      <template #cards>
        <InsightCard icon="🛰" :title="t('views.biomes.cards.orchestrator')">
          <div class="biomes-view__telemetry">
            <PokedexTelemetryBadge
              v-for="indicator in statusIndicators"
              :key="indicator.id"
              :label="indicator.label"
              :value="indicator.value"
              :tone="indicator.tone || 'neutral'"
            />
          </div>
        </InsightCard>
        <InsightCard v-if="traitOptions.length" icon="🧬" :title="t('views.biomes.cards.traits')">
          <div class="biomes-view__filters">
            <button
              v-for="option in traitOptions"
              :key="option.id"
              type="button"
              class="biomes-view__filter"
              :data-active="isTraitActive(option.id)"
              :aria-pressed="isTraitActive(option.id)"
              @click="toggleTrait(option.id)"
            >
              <GlossaryTooltip :description="option.description">
                <TraitChip :label="option.label" variant="trait" />
              </GlossaryTooltip>
            </button>
          </div>
          <button v-if="activeTraits.length" type="button" class="biomes-view__reset" @click="clearTraits">
            {{ t('views.biomes.actions.resetFilters') }}
          </button>
        </InsightCard>
        <InsightCard v-if="hazardHighlights.length" icon="⚠" :title="t('views.biomes.cards.hazards')">
          <div class="biomes-view__hazards">
            <TraitChip
              v-for="highlight in hazardHighlights"
              :key="highlight.key"
              :label="highlight.label"
              :variant="highlight.variant"
              :icon="highlight.icon"
            />
          </div>
        </InsightCard>
      </template>

      <template #default="{ activeTab: currentTab }">
        <div v-if="currentTab === 'grid'" class="biomes-view__grid">
          <PokedexBiomeCard v-for="biome in filteredBiomes" :key="biome.id" :biome="biome">
            <template #footer>
              <div class="biomes-view__metrics">
                <PokedexTelemetryBadge :label="t('views.biomes.metrics.readiness')" :value="formatReadiness(biome)" :tone="readinessTone(biome)" />
                <TraitChip :label="t('views.biomes.metrics.riskLabel', { value: biome.risk })" variant="hazard" icon="⚠" />
              </div>
              <ul class="biomes-view__validators" v-if="(biome.validators || []).length">
                <li
                  v-for="validator in biome.validators"
                  :key="validator.id"
                  :class="`validator validator--${validator.status}`"
                >
                  <TraitChip :label="validator.label" variant="validator" :icon="statusIcon(validator.status)" />
                  <span>{{ validator.message }}</span>
                </li>
              </ul>
            </template>
          </PokedexBiomeCard>
        </div>

        <div v-else class="biomes-view__validator-feed">
          <header>
            <h3>{{ t('views.biomes.validator.feedTitle') }}</h3>
            <p>{{ t('views.biomes.validator.feedDescription') }}</p>
          </header>
          <ul>
            <li v-for="entry in validatorDigest" :key="entry.id" :class="`validator validator--${entry.status}`">
              <div>
                <strong>{{ entry.biome }}</strong>
                <span>{{ entry.label }}</span>
              </div>
              <p>{{ entry.message }}</p>
            </li>
          </ul>
        </div>
      </template>
    </NebulaShell>
  </section>
</template>

<script setup>
import { computed, ref, toRefs } from 'vue';
import { useI18n } from 'vue-i18n';
import NebulaShell from '../components/layout/NebulaShell.vue';
import TraitChip from '../components/shared/TraitChip.vue';
import PokedexBiomeCard from '../components/pokedex/PokedexBiomeCard.vue';
import PokedexTelemetryBadge from '../components/pokedex/PokedexTelemetryBadge.vue';
import InsightCard from '../components/shared/InsightCard.vue';
import GlossaryTooltip from '../components/shared/GlossaryTooltip.vue';

const props = defineProps({
  biomes: {
    type: Array,
    default: () => [],
  },
});

const { biomes } = toRefs(props);

const activeTab = ref('grid');

const { t } = useI18n();

const tabs = computed(() => [
  { id: 'grid', label: t('views.biomes.tabs.grid'), icon: '🌌' },
  { id: 'validators', label: t('views.biomes.tabs.validators'), icon: '🛡' },
]);

const traitOptions = computed(() => {
  const map = new Map();
  const list = Array.isArray(biomes.value) ? biomes.value : [];
  list.forEach((biome) => {
    const entries = [
      ...(Array.isArray(biome.traits) ? biome.traits : []),
      ...(Array.isArray(biome.affinities) ? biome.affinities : []),
    ];
    entries.forEach((entry) => {
      const id = typeof entry === 'string' ? entry : entry.id || entry.key || entry.slug || entry.name;
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, {
          id,
          label: typeof entry === 'string' ? entry : entry.label || entry.name || id,
          description: typeof entry === 'string' ? '' : entry.description || entry.summary || entry.detail || '',
        });
      }
    });
  });
  return Array.from(map.values());
});

const activeTraits = ref([]);

const traitIdSet = (biome) => {
  const values = [
    ...(Array.isArray(biome.traits) ? biome.traits : []),
    ...(Array.isArray(biome.affinities) ? biome.affinities : []),
  ];
  return new Set(
    values
      .map((entry) => (typeof entry === 'string' ? entry : entry.id || entry.key || entry.slug || entry.name))
      .filter(Boolean),
  );
};

const filteredBiomes = computed(() => {
  const selection = new Set(activeTraits.value);
  if (!selection.size) {
    return Array.isArray(biomes.value) ? biomes.value : [];
  }
  return (biomes.value || []).filter((biome) => {
    const tags = traitIdSet(biome);
    return Array.from(selection).every((id) => tags.has(id));
  });
});

const totals = computed(() => {
  const list = Array.isArray(filteredBiomes.value) ? filteredBiomes.value : [];
  const readiness = list.reduce((acc, biome) => acc + (Number(biome.readiness) || 0), 0);
  const capacity = list.reduce((acc, biome) => acc + (Number(biome.total) || 0), 0);
  const risk = list.reduce((acc, biome) => acc + (Number(biome.risk) || 0), 0);
  return {
    count: list.length,
    readiness,
    capacity,
    riskAverage: list.length ? Math.round((risk / list.length) * 10) / 10 : 0,
  };
});

const statusIndicators = computed(() => {
  const items = [];
  if (totals.value.count || activeTraits.value.length) {
    items.push({ id: 'count', label: t('views.biomes.metrics.activeBiomes'), value: totals.value.count, tone: 'neutral' });
  }
  if (totals.value.capacity) {
    const percent = Math.min(100, Math.round((totals.value.readiness / totals.value.capacity) * 100));
    let tone = 'warning';
    if (percent >= 80) tone = 'success';
    else if (percent < 50) tone = 'critical';
    items.push({ id: 'readiness', label: t('views.biomes.metrics.readinessCoverage'), value: `${percent}%`, tone });
  }
  items.push({ id: 'risk', label: t('views.biomes.metrics.riskAverage'), value: totals.value.riskAverage || '0', tone: 'warning' });
  if (activeTraits.value.length) {
    items.push({ id: 'filters', label: t('views.biomes.metrics.activeFilters'), value: activeTraits.value.length, tone: 'neutral' });
  }
  return items;
});

const hazardHighlights = computed(() => {
  const seen = new Set();
  const list = [];
  (filteredBiomes.value || []).forEach((biome) => {
    const hazard = biome.hazard || t('views.biomes.fallbacks.hazard');
    if (seen.has(hazard)) return;
    seen.add(hazard);
    list.push({ key: `${biome.id}-hazard`, label: hazard, variant: 'hazard', icon: '⚠' });
    if (biome.climate) {
      list.push({ key: `${biome.id}-climate`, label: biome.climate, variant: 'climate', icon: '☁' });
    }
  });
  return list.slice(0, 4);
});

const validatorDigest = computed(() => {
  return (filteredBiomes.value || []).flatMap((biome) =>
    (biome.validators || []).map((validator) => ({
      id: `${biome.id}-${validator.id}`,
      biome: biome.name,
      status: validator.status || 'info',
      label: validator.label,
      message: validator.message,
    })),
  );
});

function toggleTrait(id) {
  if (!id) {
    return;
  }
  const index = activeTraits.value.indexOf(id);
  if (index === -1) {
    activeTraits.value = [...activeTraits.value, id];
  } else {
    const next = [...activeTraits.value];
    next.splice(index, 1);
    activeTraits.value = next;
  }
}

function isTraitActive(id) {
  return activeTraits.value.includes(id);
}

function clearTraits() {
  activeTraits.value = [];
}

function readinessPercent(biome) {
  const total = Number.isFinite(biome.total) ? biome.total : 0;
  const readiness = Number.isFinite(biome.readiness) ? biome.readiness : 0;
  if (!total) {
    return 0;
  }
  return Math.min(100, Math.round((readiness / total) * 100));
}

function formatReadiness(biome) {
  const percent = readinessPercent(biome);
  return `${biome.readiness || 0} / ${biome.total || 0} · ${percent}%`;
}

function readinessTone(biome) {
  const percent = readinessPercent(biome);
  if (percent >= 80) return 'success';
  if (percent < 50) return 'critical';
  return 'warning';
}

function statusIcon(status) {
  if (!status) return '◈';
  if (status === 'passed') return '✔';
  if (status === 'warning') return '⚠';
  if (status === 'failed') return '✖';
  return '◈';
}
</script>

<style scoped>
.biomes-view {
  display: grid;
  gap: 1.5rem;
}


.biomes-view__telemetry {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.biomes-view__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.biomes-view__filter {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 12px;
  transition: transform 0.2s ease;
}

.biomes-view__filter[data-active='true'] {
  transform: translateY(-2px);
}

.biomes-view__reset {
  margin-top: 0.5rem;
  align-self: flex-start;
  background: rgba(96, 213, 255, 0.18);
  border: 1px solid rgba(96, 213, 255, 0.35);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  color: var(--pokedex-text-primary);
  cursor: pointer;
}

.biomes-view__hazards {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.biomes-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
}

.biomes-view__metrics {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.biomes-view__metrics .trait-chip {
  background: rgba(255, 91, 107, 0.18);
  border-color: rgba(255, 91, 107, 0.25);
}

.biomes-view__validators {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}


.validator {
  display: grid;
  gap: 0.4rem;
  padding: 0.75rem 0.85rem;
  border-radius: 1rem;
  background: rgba(7, 23, 39, 0.75);
  border: 1px solid rgba(77, 208, 255, 0.18);
  color: var(--pokedex-text-primary);
}

.validator--passed {
  border-color: rgba(94, 252, 159, 0.45);
}

.validator--warning {
  border-color: rgba(255, 200, 87, 0.5);
}

.validator--failed {
  border-color: rgba(255, 91, 107, 0.55);
}

.biomes-view__validator-feed {
  display: grid;
  gap: 1rem;
}


.biomes-view__validator-feed header h3 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.9rem;
  color: var(--pokedex-text-secondary);
}

.biomes-view__validator-feed header p {
  margin: 0;
  color: var(--pokedex-text-muted);
}

.biomes-view__validator-feed ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.9rem;
}

.biomes-view__validator-feed li {
  padding: 0.95rem 1.1rem;
  border-radius: 1.1rem;
  border: 1px solid rgba(77, 208, 255, 0.18);
  background: rgba(7, 23, 39, 0.75);
  display: grid;
  gap: 0.4rem;
}

.biomes-view__validator-feed li strong {
  display: block;
  font-size: 0.85rem;
  color: var(--pokedex-text-primary);
}

.biomes-view__validator-feed li span {
  font-size: 0.75rem;
  color: var(--pokedex-text-secondary);
}

.biomes-view__validator-feed li p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--pokedex-text-primary);
}
</style>
