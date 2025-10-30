<template>
  <section class="biomes-view">
    <NebulaShell :tabs="tabs" v-model="activeTab" :status-indicators="statusIndicators">
      <template #cards>
        <div class="biomes-view__hazards">
          <TraitChip
            v-for="highlight in hazardHighlights"
            :key="highlight.key"
            :label="highlight.label"
            :variant="highlight.variant"
            :icon="highlight.icon"
          />
        </div>
      </template>

      <template #default="{ activeTab: currentTab }">
        <div v-if="currentTab === 'grid'" class="biomes-view__grid">
          <BiomeCard v-for="biome in biomes" :key="biome.id" :biome="biome">
            <template #footer>
              <div class="biomes-view__metrics">
                <div>
                  <strong>Readiness</strong>
                  <span>{{ formatReadiness(biome) }}</span>
                </div>
                <TraitChip :label="`Rischio ${biome.risk}`" variant="hazard" icon="⚠" />
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
          </BiomeCard>
        </div>

        <div v-else class="biomes-view__validator-feed">
          <header>
            <h3>Feed validator runtime</h3>
            <p>Monitoraggio incrociato di tutte le anomalie.</p>
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
import NebulaShell from '../components/layout/NebulaShell.vue';
import BiomeCard from '../components/biomes/BiomeCard.vue';
import TraitChip from '../components/shared/TraitChip.vue';

const props = defineProps({
  biomes: {
    type: Array,
    default: () => [],
  },
});

const { biomes } = toRefs(props);

const activeTab = ref('grid');

const tabs = [
  { id: 'grid', label: 'Biomi', icon: '🌌' },
  { id: 'validators', label: 'Validatori', icon: '🛡' },
];

const totals = computed(() => {
  const list = Array.isArray(biomes.value) ? biomes.value : [];
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
  if (totals.value.count) {
    items.push({ id: 'count', label: 'Biomi attivi', value: totals.value.count, tone: 'neutral' });
  }
  if (totals.value.capacity) {
    const percent = Math.min(100, Math.round((totals.value.readiness / totals.value.capacity) * 100));
    let tone = 'warning';
    if (percent >= 80) tone = 'success';
    else if (percent < 50) tone = 'critical';
    items.push({ id: 'readiness', label: 'Copertura readiness', value: `${percent}%`, tone });
  }
  items.push({ id: 'risk', label: 'Rischio medio', value: totals.value.riskAverage || '0', tone: 'warning' });
  return items;
});

const hazardHighlights = computed(() => {
  const seen = new Set();
  const list = [];
  (biomes.value || []).forEach((biome) => {
    const hazard = biome.hazard || 'Hazard n/d';
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
  return (biomes.value || []).flatMap((biome) =>
    (biome.validators || []).map((validator) => ({
      id: `${biome.id}-${validator.id}`,
      biome: biome.name,
      status: validator.status || 'info',
      label: validator.label,
      message: validator.message,
    })),
  );
});

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
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.biomes-view__metrics strong {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(226, 232, 240, 0.7);
}

.biomes-view__metrics span {
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.85);
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
  padding: 0.65rem 0.75rem;
  border-radius: 0.9rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: rgba(226, 232, 240, 0.85);
}

.validator--passed {
  border-color: rgba(129, 255, 199, 0.55);
}

.validator--warning {
  border-color: rgba(255, 210, 130, 0.6);
}

.validator--failed {
  border-color: rgba(255, 135, 135, 0.6);
}

.biomes-view__validator-feed {
  display: grid;
  gap: 1rem;
}

.biomes-view__validator-feed header h3 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.9rem;
  color: rgba(226, 232, 240, 0.75);
}

.biomes-view__validator-feed header p {
  margin: 0;
  color: rgba(226, 232, 240, 0.65);
}

.biomes-view__validator-feed ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.9rem;
}

.biomes-view__validator-feed li {
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.6);
  display: grid;
  gap: 0.4rem;
}

.biomes-view__validator-feed li strong {
  display: block;
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.85);
}

.biomes-view__validator-feed li span {
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.65);
}

.biomes-view__validator-feed li p {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(226, 232, 240, 0.75);
}
</style>
