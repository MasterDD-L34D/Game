<template>
  <section class="biome-setup">
    <NebulaShell :tabs="tabs" v-model="activeTab" :status-indicators="statusIndicators">
      <template #cards>
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
                <label v-for="role in roleCatalog" :key="role">
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
