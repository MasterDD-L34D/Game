<template>
  <section class="biome-setup">
    <NebulaShell :tabs="tabs" v-model="activeTab" :status-indicators="statusIndicators">
      <template #cards>
        <InsightCard icon="🪐" title="Profilo ambientale">
          <div class="biome-setup__chips">
            <TraitChip v-if="state.hazard" :label="state.hazard" variant="hazard" />
            <TraitChip v-if="state.climate" :label="state.climate" variant="climate" />
            <TraitChip
              v-for="role in state.requiredRoles"
              :key="role"
              :label="role"
              variant="role"
              icon="⚙"
            />
          </div>
        </InsightCard>
        <InsightCard v-if="traitFilterOptions.length" icon="🧬" title="Filtri tratti">
          <div class="biome-setup__filters">
            <button
              v-for="option in traitFilterOptions"
              :key="option.id"
              type="button"
              class="biome-setup__filter"
              :data-active="isTraitFilterActive(option.id)"
              :aria-pressed="isTraitFilterActive(option.id)"
              @click="toggleTraitFilter(option.id)"
            >
              <GlossaryTooltip :description="option.description">
                <TraitChip :label="option.label" variant="trait" />
              </GlossaryTooltip>
            </button>
          </div>
          <button v-if="activeTraitFilters.length" type="button" class="biome-setup__reset" @click="clearTraitFilters">
            Reset filtri
          </button>
        </InsightCard>
      </template>

      <template #default="{ activeTab: currentTab }">
        <div v-if="currentTab === 'setup'" class="biome-setup__panel">
          <form class="biome-setup__form" @submit.prevent="queueSynthesis">
            <fieldset>
              <legend>Perimetro ambientale</legend>
              <label>
                <span>Hazard dominante</span>
                <select v-model="state.hazard">
                  <option v-for="option in hazardOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </label>
              <label>
                <span>Clima operativo</span>
                <select v-model="state.climate">
                  <option v-for="option in climateOptions" :key="option" :value="option">{{ option }}</option>
                </select>
              </label>
            </fieldset>

            <fieldset>
              <legend>Ruoli richiesti</legend>
              <div class="biome-setup__roles">
                <label v-for="role in filteredRoleCatalog" :key="role">
                  <input type="checkbox" :value="role" v-model="state.requiredRoles" />
                  <TraitChip :label="role" variant="role" />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Seed grafico</legend>
              <div class="biome-setup__seed">
                <input v-model="state.graphicSeed" type="text" placeholder="Inserisci seed procedurale" />
                <button type="button" @click="randomizeSeed">Random</button>
              </div>
            </fieldset>

            <footer class="biome-setup__actions">
              <button type="submit" :disabled="!canSynthesize">Invoca biomeSynthesizer</button>
              <p>Il seed e i ruoli selezionati verranno passati come contesto obbligatorio per i nodi rigenerati.</p>
            </footer>
          </form>
        </div>

        <div v-else-if="currentTab === 'graph'" class="biome-setup__graph">
          <BiomeSynthesisMap
            :nodes="graphState.nodes"
            :connections="graphState.connections"
            @regenerate:layout="regenerateLayout"
            @regenerate:node="regenerateNode"
            @regenerate:connection="regenerateConnection"
          />
        </div>

        <div v-else class="biome-setup__validators">
          <header>
            <h3>Feedback dai validator runtime</h3>
            <p>Monitoraggio in tempo reale delle anomalie per bioma.</p>
          </header>
          <ul>
            <li v-for="item in validationDigest" :key="item.id" :class="`status-${item.status}`">
              <div class="biome-setup__validator-title">
                <TraitChip :label="item.biome" variant="validator" :icon="statusIcon(item.status)" />
                <span>{{ item.label }}</span>
              </div>
              <p>{{ item.message }}</p>
            </li>
          </ul>
        </div>
      </template>
    </NebulaShell>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import NebulaShell from '../components/layout/NebulaShell.vue';
import TraitChip from '../components/shared/TraitChip.vue';
import BiomeSynthesisMap from '../components/biomes/BiomeSynthesisMap.vue';
import InsightCard from '../components/shared/InsightCard.vue';
import GlossaryTooltip from '../components/shared/GlossaryTooltip.vue';

const props = defineProps({
  config: {
    type: Object,
    default: () => ({}),
  },
  graph: {
    type: Object,
    default: () => ({ nodes: [], connections: [] }),
  },
  validators: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['synthesize']);

const state = reactive({
  hazard: '',
  climate: '',
  requiredRoles: [],
  graphicSeed: '',
});

const graphState = reactive({
  nodes: [],
  connections: [],
});

const activeTab = ref('setup');

const tabs = [
  { id: 'setup', label: 'Setup', icon: '🛠' },
  { id: 'graph', label: 'Synth map', icon: '🛰' },
  { id: 'validators', label: 'Validatori', icon: '🛡' },
];

const hazardOptions = computed(() => props.config?.hazardOptions || []);
const climateOptions = computed(() => props.config?.climateOptions || []);
const roleCatalog = computed(() => props.config?.roleCatalog || []);

const traitFilterOptions = computed(() => {
  const map = new Map();
  const glossarySources = [props.config?.traitGlossary, props.config?.glossary];
  glossarySources.forEach((source) => {
    if (!source || typeof source !== 'object') {
      return;
    }
    Object.entries(source).forEach(([id, entry]) => {
      if (!id) return;
      const detail = entry || {};
      map.set(id, {
        id,
        label: detail.label || detail.name || id,
        description: detail.description || detail.summary || '',
        roles: Array.isArray(detail.roles)
          ? detail.roles
          : Array.isArray(detail.requiredRoles)
            ? detail.requiredRoles
            : [],
      });
    });
  });
  const affinitySources = [props.config?.affinities, props.config?.affinityCatalog];
  affinitySources.forEach((source) => {
    if (!Array.isArray(source)) {
      return;
    }
    source.forEach((entry) => {
      const id = typeof entry === 'string' ? entry : entry.id || entry.key || entry.slug || entry.name;
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, {
          id,
          label: typeof entry === 'string' ? entry : entry.label || entry.name || id,
          description: typeof entry === 'string' ? '' : entry.description || entry.summary || '',
          roles: Array.isArray(entry.roles)
            ? entry.roles
            : Array.isArray(entry.requiredRoles)
              ? entry.requiredRoles
              : [],
        });
      }
    });
  });
  return Array.from(map.values());
});

const activeTraitFilters = ref([]);

const traitRoleMap = computed(() => {
  const map = new Map();
  traitFilterOptions.value.forEach((option) => {
    if (Array.isArray(option.roles) && option.roles.length) {
      map.set(option.id, option.roles);
    }
  });
  const configMap = props.config?.traitRoleMap || props.config?.traitRoles || {};
  if (configMap && typeof configMap === 'object') {
    Object.entries(configMap).forEach(([traitId, roles]) => {
      if (!traitId) return;
      const list = Array.isArray(roles) ? roles : [];
      if (!map.has(traitId)) {
        map.set(traitId, list);
      } else {
        const merged = new Set(map.get(traitId));
        list.forEach((role) => merged.add(role));
        map.set(traitId, Array.from(merged));
      }
    });
  }
  return map;
});

const filteredRoleCatalog = computed(() => {
  const base = Array.isArray(roleCatalog.value) ? roleCatalog.value : [];
  if (!activeTraitFilters.value.length) {
    return base;
  }
  const map = traitRoleMap.value;
  const allowed = new Set();
  activeTraitFilters.value.forEach((traitId) => {
    (map.get(traitId) || []).forEach((role) => allowed.add(role));
  });
  if (!allowed.size) {
    return base;
  }
  const visible = base.filter((role) => allowed.has(role));
  const preserved = state.requiredRoles.filter((role) => !visible.includes(role));
  return [...visible, ...preserved];
});

const canSynthesize = computed(
  () => state.hazard && state.climate && state.requiredRoles.length > 0 && state.graphicSeed,
);

const statusIndicators = computed(() => {
  const items = [];
  if (state.hazard) {
    items.push({ id: 'hazard', label: 'Hazard', value: state.hazard, tone: 'warning' });
  }
  if (state.climate) {
    items.push({ id: 'climate', label: 'Clima', value: state.climate, tone: 'neutral' });
  }
  items.push({ id: 'roles', label: 'Ruoli', value: state.requiredRoles.length || 0, tone: 'success' });
  if (activeTraitFilters.value.length) {
    items.push({ id: 'filters', label: 'Filtri tratti', value: activeTraitFilters.value.length, tone: 'neutral' });
  }
  if (graphState.nodes.length) {
    items.push({ id: 'nodes', label: 'Nodi mappa', value: graphState.nodes.length, tone: 'neutral' });
  }
  return items;
});

const validationDigest = computed(() => {
  return props.validators.flatMap((biome) => {
    return (biome.validators || []).map((validator) => ({
      id: `${biome.id}-${validator.id}`,
      biome: biome.name,
      status: validator.status,
      label: validator.label,
      message: validator.message,
    }));
  });
});

const syncConfig = () => {
  state.hazard = props.config?.hazard || '';
  state.climate = props.config?.climate || '';
  state.graphicSeed = props.config?.graphicSeed || '';
  state.requiredRoles = [...(props.config?.requiredRoles || [])];
};

const randomPosition = () => ({
  x: 60 + Math.random() * 240,
  y: 60 + Math.random() * 140,
});

const createNodeState = (node) => ({
  ...node,
  position: node.position || randomPosition(),
});

const createConnectionState = (connection) => ({
  ...connection,
});

const syncGraph = () => {
  graphState.nodes = (props.graph?.nodes || []).map((node) => createNodeState(node));
  graphState.connections = (props.graph?.connections || []).map((connection) => createConnectionState(connection));
};

const bumpIntensity = (node) => {
  const baseline = Number.isFinite(node.intensity) ? node.intensity : 0.55;
  const next = Math.max(0.35, Math.min(0.95, baseline + (Math.random() * 0.4 - 0.2)));
  node.intensity = Number(next.toFixed(2));
};

const toggleTraitFilter = (id) => {
  if (!id) {
    return;
  }
  const index = activeTraitFilters.value.indexOf(id);
  if (index === -1) {
    activeTraitFilters.value = [...activeTraitFilters.value, id];
  } else {
    const next = [...activeTraitFilters.value];
    next.splice(index, 1);
    activeTraitFilters.value = next;
  }
};

const isTraitFilterActive = (id) => activeTraitFilters.value.includes(id);

const clearTraitFilters = () => {
  activeTraitFilters.value = [];
};

const regenerateNode = (nodeId) => {
  const node = graphState.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return;
  }
  node.position = randomPosition();
  bumpIntensity(node);
};

const regenerateConnection = (connectionId) => {
  const connection = graphState.connections.find((item) => item.id === connectionId);
  if (!connection) {
    return;
  }
  const delta = Math.round(Math.random() * 2 - 1);
  connection.weight = Math.max(1, connection.weight + delta);
};

const regenerateLayout = () => {
  graphState.nodes.forEach((node) => {
    node.position = randomPosition();
    bumpIntensity(node);
  });
};

const randomizeSeed = () => {
  const stamp = Math.random().toString(16).slice(2, 8).toUpperCase();
  state.graphicSeed = `${state.hazard?.split(' ')[0] || 'BIOME'}-${stamp}`;
};

const queueSynthesis = () => {
  if (!canSynthesize.value) {
    return;
  }
  emit('synthesize', {
    hazard: state.hazard,
    climate: state.climate,
    requiredRoles: [...state.requiredRoles],
    graphicSeed: state.graphicSeed,
    graph: {
      nodes: graphState.nodes.map((node) => ({
        id: node.id,
        position: node.position,
        intensity: node.intensity,
      })),
      connections: graphState.connections.map((connection) => ({
        id: connection.id,
        weight: connection.weight,
      })),
    },
  });
};

watch(
  () => [props.config?.hazard, props.config?.climate, props.config?.graphicSeed],
  syncConfig,
  { immediate: true },
);

watch(
  () => props.config?.requiredRoles && [...props.config.requiredRoles],
  () => {
    state.requiredRoles = [...(props.config?.requiredRoles || [])];
  },
  { immediate: true },
);

watch(
  () => [props.graph?.nodes?.length, props.graph?.connections?.length],
  syncGraph,
  { immediate: true },
);

function statusIcon(status) {
  if (!status) return '◈';
  if (status === 'passed') return '✔';
  if (status === 'warning') return '⚠';
  if (status === 'failed') return '✖';
  return '◈';
}
</script>

<style scoped>
.biome-setup {
  display: grid;
  gap: 1.5rem;
}

.biome-setup__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.biome-setup__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.biome-setup__filter {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 12px;
  transition: transform 0.2s ease;
}

.biome-setup__filter[data-active='true'] {
  transform: translateY(-2px);
}

.biome-setup__reset {
  margin-top: 0.45rem;
  background: rgba(96, 213, 255, 0.18);
  border: 1px solid rgba(96, 213, 255, 0.35);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  color: #f0f4ff;
  cursor: pointer;
}

.biome-setup__panel {
  display: grid;
}

.biome-setup__form {
  display: grid;
  gap: 1.2rem;
}

.biome-setup__form fieldset {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  display: grid;
  gap: 0.9rem;
  background: rgba(15, 23, 42, 0.55);
}

.biome-setup__form legend {
  padding: 0 0.4rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.6);
}

.biome-setup__form label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
}

.biome-setup__form select,
.biome-setup__form input[type='text'] {
  background: rgba(16, 24, 34, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  color: #f0f4ff;
}

.biome-setup__roles {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.biome-setup__roles label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 24, 34, 0.6);
}

.biome-setup__roles input {
  accent-color: #61d5ff;
}

.biome-setup__seed {
  display: flex;
  gap: 0.6rem;
}

.biome-setup__seed button {
  background: rgba(16, 24, 34, 0.92);
  border: 1px solid rgba(207, 145, 255, 0.35);
  border-radius: 10px;
  padding: 0.5rem 0.9rem;
  color: #f0f4ff;
  cursor: pointer;
}

.biome-setup__actions {
  display: grid;
  gap: 0.5rem;
}

.biome-setup__actions button {
  background: linear-gradient(90deg, rgba(96, 213, 255, 0.8), rgba(161, 255, 212, 0.8));
  border: none;
  border-radius: 999px;
  padding: 0.65rem 1.2rem;
  color: #06101a;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.biome-setup__actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.biome-setup__actions button:not(:disabled):hover {
  transform: translateY(-1px);
}

.biome-setup__actions p {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(240, 244, 255, 0.6);
}

.biome-setup__graph {
  display: grid;
  min-height: 320px;
}

.biome-setup__validators {
  display: grid;
  gap: 1rem;
}

.biome-setup__validators header h3 {
  margin: 0;
  font-size: 1rem;
}

.biome-setup__validators header p {
  margin: 0.35rem 0 0;
  color: rgba(240, 244, 255, 0.6);
}

.biome-setup__validators ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.8rem;
}

.biome-setup__validators li {
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(16, 24, 34, 0.8);
  display: grid;
  gap: 0.35rem;
}

.biome-setup__validator-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.biome-setup__validators li p {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(240, 244, 255, 0.75);
}

.status-passed {
  border-color: rgba(129, 255, 199, 0.6);
}

.status-warning {
  border-color: rgba(255, 210, 130, 0.6);
}

.status-failed {
  border-color: rgba(255, 135, 135, 0.6);
}
</style>
