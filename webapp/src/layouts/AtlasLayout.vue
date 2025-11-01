<template>
  <section class="atlas-layout">
    <header class="atlas-layout__header">
      <div>
        <p class="atlas-layout__kicker" :data-offline="isOffline">{{ kickerLabel }}</p>
        <h2>{{ headerTitle }}</h2>
        <p v-if="headerSummary" class="atlas-layout__summary">{{ headerSummary }}</p>
        <dl class="atlas-layout__metrics" aria-label="Metriche principali">
          <div>
            <dt>Specie</dt>
            <dd>{{ totals.species }}</dd>
          </div>
          <div>
            <dt>Biomi</dt>
            <dd>{{ totals.biomes }}</dd>
          </div>
          <div>
            <dt>Encounter</dt>
            <dd>{{ totals.encounters }}</dd>
          </div>
        </dl>
      </div>
      <aside class="atlas-layout__aside">
        <h3>Finestra di release</h3>
        <p class="atlas-layout__release">{{ dataset.releaseWindow || 'Non pianificata' }}</p>
        <p class="atlas-layout__curator">Curatori · {{ dataset.curator || 'Da definire' }}</p>
      </aside>
    </header>

    <p v-if="statusLabel" class="atlas-layout__status" :data-offline="isOffline">
      {{ statusLabel }}
    </p>

    <AtlasCollectionProgress :metrics="dataset.metrics" :dataset="dataset" :highlights="dataset.highlights" />

    <nav v-if="links.length" class="atlas-layout__nav" aria-label="Sottosezioni atlas">
      <RouterLink
        v-for="link in links"
        :key="link.name"
        :to="link.to"
        class="atlas-layout__nav-link"
        :class="{ 'atlas-layout__nav-link--active': link.active }"
        :data-demo="link.demo"
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
import { computed, provide } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';

import AtlasCollectionProgress from '../components/atlas/AtlasCollectionProgress.vue';
import { atlasLayoutKey } from '../composables/useAtlasLayout';
import { atlasDataset, atlasTotals } from '../state/atlasDataset.js';
import { useNavigationMeta } from '../state/navigationMeta.js';

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
const { title: navigationTitle, description: navigationDescription, breadcrumbs } = useNavigationMeta();

const dataset = atlasDataset;
const totals = atlasTotals;

const headerTitle = computed(() => navigationTitle.value || dataset.title || 'Nebula Atlas');
const headerSummary = computed(() => navigationDescription.value || dataset.summary || '');
const kickerLabel = computed(() => {
  if (props.isOffline) {
    return 'Dataset offline';
  }
  if (props.isDemo) {
    return 'Dataset demo';
  }
  return 'Dataset dedicato';
});

const statusLabel = computed(() => {
  if (!props.isDemo && !props.isOffline) {
    return '';
  }
  if (props.isOffline) {
    return 'Modalità demo · dataset offline sincronizzato da fallback';
  }
  return 'Modalità demo attiva per le sezioni Atlas';
});

const links = computed(() => {
  const currentName = route.name ? String(route.name) : '';
  const atlasRoute = router.getRoutes().find((record) => record.name === 'atlas');
  const childRoutes = atlasRoute?.children || [];
  if (!childRoutes.length) {
    return [
      {
        name: 'atlas-pokedex',
        label: 'Pokédex Nebula',
        to: { name: 'atlas-pokedex' },
        active: currentName === 'atlas-pokedex',
        demo: true,
      },
      {
        name: 'atlas-world-builder',
        label: 'World Builder',
        to: { name: 'atlas-world-builder' },
        active: currentName === 'atlas-world-builder',
        demo: true,
      },
      {
        name: 'atlas-encounter-lab',
        label: 'Encounter Lab',
        to: { name: 'atlas-encounter-lab' },
        active: currentName === 'atlas-encounter-lab',
        demo: true,
      },
    ];
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
        demo: Boolean(child.meta?.demo ?? props.isDemo),
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
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 2rem;
  padding: 2.5rem clamp(2rem, 3vw, 3rem);
  background: linear-gradient(135deg, rgba(211, 224, 255, 0.85), rgba(187, 215, 255, 0.75));
  border-radius: 1.5rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.atlas-layout__kicker {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  color: rgba(15, 23, 42, 0.6);
}

.atlas-layout__kicker[data-offline='true'] {
  color: rgba(180, 83, 9, 0.8);
}

.atlas-layout__summary {
  margin-top: 1rem;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(15, 23, 42, 0.8);
}

.atlas-layout__metrics {
  display: flex;
  gap: 2rem;
  margin: 1.75rem 0 0;
  padding: 0;
}

.atlas-layout__metrics div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.atlas-layout__metrics dt {
  font-size: 0.75rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.5);
}

.atlas-layout__metrics dd {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
}

.atlas-layout__aside {
  padding: 1.75rem;
  background: rgba(15, 23, 42, 0.08);
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.atlas-layout__release {
  font-weight: 600;
  font-size: 1.05rem;
}

.atlas-layout__curator {
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.6);
}

.atlas-layout__status {
  margin: -1rem 0 0;
  padding: 0.85rem 1.25rem;
  border-radius: 0.85rem;
  background: rgba(59, 130, 246, 0.12);
  color: rgba(15, 23, 42, 0.85);
  font-weight: 600;
}

.atlas-layout__status[data-offline='true'] {
  background: rgba(245, 158, 11, 0.18);
  color: rgba(120, 53, 15, 0.9);
}

.atlas-layout__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.atlas-layout__nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 1.4rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: rgba(30, 64, 175, 0.12);
  color: rgba(30, 41, 59, 0.85);
  border: 1px solid rgba(59, 130, 246, 0.2);
  transition: background 0.18s ease, color 0.18s ease;
}

.atlas-layout__nav-link[data-demo='true']::after {
  content: 'demo';
  margin-left: 0.5rem;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(30, 64, 175, 0.7);
}

.atlas-layout__nav-link:hover {
  background: rgba(59, 130, 246, 0.25);
  color: #1e293b;
}

.atlas-layout__nav-link--active {
  background: rgba(59, 130, 246, 0.32);
  color: #0f172a;
  border-color: rgba(59, 130, 246, 0.4);
}
</style>
