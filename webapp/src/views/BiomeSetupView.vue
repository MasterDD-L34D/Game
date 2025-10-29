<template>
  <section class="flow-view biome-setup">
    <header class="flow-view__header">
      <h2>Pre-sintesi biomi</h2>
      <p>Definisci vincoli critici e ruoli necessari prima di invocare il biomeSynthesizer.</p>
    </header>

    <div class="biome-setup__grid">
      <form class="biome-setup__panel" @submit.prevent="queueSynthesis">
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
          <div class="role-grid">
            <label v-for="role in roleCatalog" :key="role">
              <input type="checkbox" :value="role" v-model="state.requiredRoles" />
              <span>{{ role }}</span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Seed grafico</legend>
          <div class="seed-row">
            <input v-model="state.graphicSeed" type="text" placeholder="Inserisci seed procedurale" />
            <button type="button" @click="randomizeSeed">Random</button>
          </div>
        </fieldset>

        <footer class="biome-setup__actions">
          <button type="submit" :disabled="!canSynthesize">Invoca biomeSynthesizer</button>
          <p class="biome-setup__hint">
            Il seed e i ruoli selezionati verranno passati come contesto obbligatorio per i nodi rigenerati.
          </p>
        </footer>
      </form>

      <BiomeSynthesisMap
        :nodes="graphState.nodes"
        :connections="graphState.connections"
        @regenerate:layout="regenerateLayout"
        @regenerate:node="regenerateNode"
        @regenerate:connection="regenerateConnection"
      />
    </div>

    <section class="biome-setup__validators">
      <header>
        <h3>Feedback dai validator runtime</h3>
        <p>Monitoraggio in tempo reale delle anomalie per bioma.</p>
      </header>
      <ul>
        <li v-for="item in validationDigest" :key="item.id" :class="`status-${item.status}`">
          <div class="biome-setup__validator-title">
            <strong>{{ item.biome }}</strong>
            <span>{{ item.label }}</span>
          </div>
          <p>{{ item.message }}</p>
        </li>
      </ul>
    </section>
  </section>
</template>

<script setup>
import { computed, reactive, watch } from 'vue';
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

const hazardOptions = computed(() => props.config?.hazardOptions || []);
const climateOptions = computed(() => props.config?.climateOptions || []);
const roleCatalog = computed(() => props.config?.roleCatalog || []);

const canSynthesize = computed(
  () => state.hazard && state.climate && state.requiredRoles.length > 0 && state.graphicSeed
);

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
  graphState.connections = (props.graph?.connections || []).map((connection) =>
    createConnectionState(connection)
  );
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
        from: connection.from,
        to: connection.to,
        weight: connection.weight,
      })),
    },
  });
};

watch(
  () => [props.config?.hazard, props.config?.climate, props.config?.graphicSeed],
  syncConfig,
  { immediate: true }
);

watch(
  () => props.config?.requiredRoles && [...props.config.requiredRoles],
  () => {
    state.requiredRoles = [...(props.config?.requiredRoles || [])];
  },
  { immediate: true }
);

watch(
  () => [props.graph?.nodes?.length, props.graph?.connections?.length],
  syncGraph,
  { immediate: true }
);
</script>

<style scoped>
.biome-setup {
  display: grid;
  gap: 1.5rem;
}

.biome-setup__grid {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.biome-setup__panel {
  background: rgba(9, 14, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1.2rem;
  display: grid;
  gap: 1.1rem;
}

.biome-setup__panel fieldset {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.95rem;
  display: grid;
  gap: 0.8rem;
}

.biome-setup__panel legend {
  padding: 0 0.4rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.6);
}

.biome-setup__panel label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
}

.biome-setup__panel select,
.biome-setup__panel input[type='text'] {
  background: rgba(16, 24, 34, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  color: #f0f4ff;
}

.role-grid {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.role-grid label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.45rem;
  border-radius: 10px;
  background: rgba(16, 24, 34, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.role-grid input {
  accent-color: #61d5ff;
}

.seed-row {
  display: flex;
  gap: 0.6rem;
}

.seed-row button {
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

.biome-setup__hint {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(240, 244, 255, 0.6);
}

.biome-setup__validators {
  background: rgba(9, 14, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1.2rem;
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
  align-items: baseline;
  gap: 0.75rem;
}

.biome-setup__validator-title strong {
  font-size: 0.9rem;
}

.biome-setup__validator-title span {
  font-size: 0.75rem;
  color: rgba(240, 244, 255, 0.65);
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
