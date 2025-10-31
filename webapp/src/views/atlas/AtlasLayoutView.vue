<template>
  <section class="atlas-layout">
    <header class="atlas-layout__header">
      <div>
        <p class="atlas-layout__kicker">Dataset dedicato</p>
        <h2>{{ dataset.title }}</h2>
        <p class="atlas-layout__summary">{{ dataset.summary }}</p>
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
        <p class="atlas-layout__release">{{ dataset.releaseWindow }}</p>
        <p class="atlas-layout__curator">Curatori · {{ dataset.curator }}</p>
      </aside>
    </header>

    <p v-if="statusLabel" class="atlas-layout__status" :data-offline="isOffline">
      {{ statusLabel }}
    </p>

    <AtlasCollectionProgress :metrics="dataset.metrics" :dataset="dataset" :highlights="dataset.highlights" />

    <nav class="atlas-layout__nav" aria-label="Sottosezioni atlas">
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
      <component :is="Component" :dataset="dataset" @notify="forwardNotification" />
    </RouterView>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { atlasDataset, atlasTotals } from '../../state/atlasDataset.js';
import AtlasCollectionProgress from '../../components/atlas/AtlasCollectionProgress.vue';

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

const dataset = atlasDataset;
const totals = atlasTotals;
const route = useRoute();

const emit = defineEmits(['notify']);

const links = computed(() => {
  const name = route.name ? String(route.name) : '';
  return [
    {
      name: 'atlas-pokedex',
      label: 'Pokédex Nebula',
      to: { name: 'atlas-pokedex' },
      active: name === 'atlas-pokedex',
    },
    {
      name: 'atlas-world-builder',
      label: 'World Builder',
      to: { name: 'atlas-world-builder' },
      active: name === 'atlas-world-builder',
    },
    {
      name: 'atlas-encounter-lab',
      label: 'Encounter Lab',
      to: { name: 'atlas-encounter-lab' },
      active: name === 'atlas-encounter-lab',
    },
  ];
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
  border: 1px dashed rgba(59, 130, 246, 0.3);
}

.atlas-layout__status[data-offline='true'] {
  background: rgba(244, 114, 182, 0.12);
  border-color: rgba(244, 114, 182, 0.4);
}

.atlas-layout__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0 0.5rem;
}

.atlas-layout__nav-link {
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 600;
  color: rgba(148, 163, 184, 0.85);
  background: rgba(15, 23, 42, 0.08);
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.atlas-layout__nav-link:hover {
  background: rgba(15, 23, 42, 0.18);
  color: rgba(15, 23, 42, 0.9);
  transform: translateY(-1px);
}

.atlas-layout__nav-link--active {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: #f8fafc;
  box-shadow: 0 10px 24px rgba(59, 130, 246, 0.25);
}
</style>
