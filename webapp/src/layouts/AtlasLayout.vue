<template>
  <section class="atlas-layout">
    <header class="atlas-layout__header">
      <div class="atlas-layout__intro">
        <StateBanner :tokens="stateTokens" :message="statusLabel" />
        <div>
          <h2>{{ headerTitle }}</h2>
          <p v-if="headerSummary" class="atlas-layout__summary">{{ headerSummary }}</p>
        </div>
      </div>
      <aside class="atlas-layout__aside">
        <MetricCard
          title="Finestra di release"
          :description="releaseWindowDescription"
          :value="dataset.releaseWindow || 'Non pianificata'"
          :tokens="releaseTokens"
        />
      </aside>
    </header>

    <section class="atlas-layout__metrics" aria-label="Progressione dataset">
      <MetricCard
        v-for="metric in overviewMetrics"
        :key="metric.id"
        :title="metric.title"
        :caption="metric.caption"
        :description="metric.description"
        :value="metric.value"
        :metrics="metric.metrics"
        :state="metric.state"
      />
    </section>

    <AtlasCollectionProgress :metrics="dataset.metrics" :dataset="dataset" :highlights="dataset.highlights" />

    <nav v-if="links.length" class="atlas-layout__nav" aria-label="Sottosezioni atlas">
      <RouterLink
        v-for="link in links"
        :key="link.name"
        :to="link.to"
        class="atlas-layout__nav-link"
        :class="{ 'atlas-layout__nav-link--active': link.active }"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <RouterView v-slot="{ Component }">
      <component :is="Component" :dataset="dataset" :is-demo="isDemo" :is-offline="isOffline" @notify="forwardNotification" />
    </RouterView>
  </section>
</template>

<script setup>
import { computed, onMounted, provide } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';

import AtlasCollectionProgress from '../components/atlas/AtlasCollectionProgress.vue';
import StateBanner from '../components/metrics/StateBanner.vue';
import MetricCard from '../components/metrics/MetricCard.vue';
import { atlasLayoutKey } from '../composables/useAtlasLayout';
import { atlasDataset, atlasTotals, ensureAtlasDatasetLoaded } from '../state/atlasDataset';
import { useNavigationMeta } from '../state/navigationMeta';

const props = defineProps({
  isDemo: {
    type: Boolean,
    default: false,
  },
  isOffline: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['notify']);

const route = useRoute();
const router = useRouter();
const { title: navigationTitle, description: navigationDescription, breadcrumbs, tokens: navigationTokens } =
  useNavigationMeta();

const dataset = atlasDataset;
const totals = atlasTotals;

onMounted(() => {
  ensureAtlasDatasetLoaded().catch((error) => {
    console.warn('[AtlasLayout] caricamento dataset demo fallito', error);
  });
});

const headerTitle = computed(() => navigationTitle.value || dataset.title || 'Nebula Atlas');
const headerSummary = computed(() => navigationDescription.value || dataset.summary || '');

const stateTokens = computed(() => {
  const tokens = [...(navigationTokens.value || [])];
  if (props.isDemo && !tokens.some((token) => token.id === 'atlas-demo')) {
    tokens.push({ id: 'atlas-demo', label: 'Modalità demo', variant: 'info', icon: '◎' });
  }
  if (props.isOffline && !tokens.some((token) => token.id === 'atlas-offline')) {
    tokens.push({ id: 'atlas-offline', label: 'Dataset offline', variant: 'warning', icon: '⚠' });
  }
  return tokens;
});

const statusLabel = computed(() => {
  if (props.isOffline) {
    return 'Modalità demo · dataset offline sincronizzato da fallback';
  }
  if (props.isDemo) {
    return 'Modalità demo attiva per le sezioni Atlas';
  }
  return '';
});

const releaseTokens = computed(() =>
  props.isOffline
    ? [{ id: 'release-offline', label: 'Sync offline', variant: 'warning' }]
    : [],
);

const releaseWindowDescription = computed(() => `Curatori · ${dataset.curator || 'Da definire'}`);

const overviewMetrics = computed(() => {
  const targetSpecies = Number(dataset.metrics?.species) || totals.species;
  const currentSpecies = Array.isArray(dataset.species) ? dataset.species.length : totals.species;
  const targetBiomes = Number(dataset.metrics?.biomes) || totals.biomes;
  const currentBiomes = Array.isArray(dataset.biomes) ? dataset.biomes.length : totals.biomes;
  const targetEncounters = Number(dataset.metrics?.encounters) || totals.encounters;
  const currentEncounters = Array.isArray(dataset.encounters) ? dataset.encounters.length : totals.encounters;

  return [
    {
      id: 'species',
      title: 'Specie catalogate',
      caption: 'Catalogo Nebula',
      description: 'Blueprint specie pronte per staging.',
      value: `${currentSpecies} / ${targetSpecies}`,
      metrics: [
        { label: 'Target', value: targetSpecies },
        { label: 'Disponibili', value: currentSpecies },
      ],
      state: currentSpecies >= targetSpecies ? 'success' : 'default',
    },
    {
      id: 'biomes',
      title: 'Biomi sincronizzati',
      caption: 'Setup ambientali',
      description: 'Biomi coordinati con telemetria attiva.',
      value: `${currentBiomes} / ${targetBiomes}`,
      metrics: [
        { label: 'Target', value: targetBiomes },
        { label: 'Allineati', value: currentBiomes },
      ],
      state: currentBiomes >= targetBiomes ? 'success' : 'default',
    },
    {
      id: 'encounters',
      title: 'Encounter calibrati',
      caption: 'Lab operativo',
      description: 'Pattern missione pronti per QA freeze.',
      value: `${currentEncounters} / ${targetEncounters}`,
      metrics: [
        { label: 'Target', value: targetEncounters },
        { label: 'Disponibili', value: currentEncounters },
      ],
      state: currentEncounters >= targetEncounters ? 'success' : 'default',
    },
  ];
});

const links = computed(() => {
  const currentName = route.name ? String(route.name) : '';
  const atlasRoute = router.getRoutes().find((record) => record.name === 'console-atlas');
  const childRoutes = atlasRoute?.children || [];
  if (!childRoutes.length) {
    return [];
  }
  return childRoutes
    .filter((child) => child.meta?.breadcrumb !== false)
    .map((child) => {
      const name = child.name ? String(child.name) : child.path;
      const label = child.meta?.breadcrumb?.label || child.meta?.title || name;
      const to = child.name ? { name: child.name } : { path: child.path };
      return {
        name,
        label,
        to,
        active: name === currentName,
      };
    });
});

provide(atlasLayoutKey, {
  dataset,
  totals,
  isDemo: computed(() => props.isDemo),
  isOffline: computed(() => props.isOffline),
  title: headerTitle,
  description: headerSummary,
  breadcrumbs,
});

function forwardNotification(payload) {
  emit('notify', payload);
}
</script>

<style scoped>
.atlas-layout {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  color: #0f172a;
}

.atlas-layout__header {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  gap: 2rem;
  padding: 2.5rem clamp(2rem, 3vw, 3rem);
  background: linear-gradient(135deg, rgba(211, 224, 255, 0.85), rgba(187, 215, 255, 0.75));
  border-radius: 1.5rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.atlas-layout__intro {
  display: grid;
  gap: 1.25rem;
}

.atlas-layout__summary {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(15, 23, 42, 0.8);
}

.atlas-layout__aside {
  display: flex;
  align-items: stretch;
}

.atlas-layout__metrics {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.atlas-layout__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.atlas-layout__nav-link {
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  border: 1px solid rgba(37, 99, 235, 0.35);
  background: rgba(255, 255, 255, 0.8);
  color: #1d4ed8;
  text-decoration: none;
  font-weight: 600;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.atlas-layout__nav-link:hover {
  background: rgba(37, 99, 235, 0.15);
  transform: translateY(-1px);
}

.atlas-layout__nav-link--active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(14, 165, 233, 0.18));
  border-color: rgba(59, 130, 246, 0.45);
}
</style>
