<template>
  <section class="synthesis-map">
    <header class="synthesis-map__header">
      <div>
        <h3>Schema modulare</h3>
        <p>Visualizza i nodi generati e le connessioni tattiche previste.</p>
      </div>
      <button type="button" class="synthesis-map__action" @click="$emit('regenerate:layout')">
        Rigenera layout
      </button>
    </header>

    <div class="synthesis-map__canvas-wrapper">
      <svg class="synthesis-map__canvas" viewBox="0 0 360 240" role="img">
        <defs>
          <pattern id="tile-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0 H0 V24" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="360" height="240" fill="url(#tile-grid)" />
        <g class="synthesis-map__connections">
          <line
            v-for="connection in connections"
            :key="connection.id"
            :x1="positionFor(connection.from).x"
            :y1="positionFor(connection.from).y"
            :x2="positionFor(connection.to).x"
            :y2="positionFor(connection.to).y"
            :stroke-width="1.5 + connection.weight * 0.6"
            :class="['synthesis-map__connection', `synthesis-map__connection--w${connection.weight}`]"
          />
        </g>
        <g class="synthesis-map__nodes">
          <g
            v-for="node in nodes"
            :key="node.id"
            class="synthesis-map__node"
            :transform="`translate(${positionFor(node.id).x} ${positionFor(node.id).y})`"
          >
            <circle :r="18" :class="[`synthesis-map__node-circle`, `synthesis-map__node-circle--${node.type}`]" />
            <text class="synthesis-map__node-label" y="32">{{ node.label }}</text>
            <text class="synthesis-map__node-metric" y="-26">{{ formatIntensity(node.intensity) }}</text>
          </g>
        </g>
      </svg>
    </div>

    <div class="synthesis-map__legend">
      <section>
        <h4>Nodi</h4>
        <ul>
          <li v-for="node in nodes" :key="node.id">
            <div>
              <strong>{{ node.label }}</strong>
              <span>{{ describeNode(node.type) }}</span>
            </div>
            <button type="button" @click="$emit('regenerate:node', node.id)">Rigenera</button>
          </li>
        </ul>
      </section>
      <section>
        <h4>Connessioni</h4>
        <ul>
          <li v-for="connection in connections" :key="connection.id">
            <div>
              <strong>{{ prettyConnection(connection) }}</strong>
              <span>Intensità {{ connection.weight }}</span>
            </div>
            <button type="button" @click="$emit('regenerate:connection', connection.id)">Rigenera</button>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  nodes: {
    type: Array,
    default: () => [],
  },
  connections: {
    type: Array,
    default: () => [],
  },
});

const nodeLookup = computed(() => {
  const map = new Map();
  props.nodes.forEach((node) => {
    map.set(node.id, node);
  });
  return map;
});

const formatIntensity = (value) => `${Math.round(value * 100)}%`;

const positionFor = (nodeId) => {
  const node = nodeLookup.value.get(nodeId);
  if (!node) {
    return { x: 0, y: 0 };
  }
  return node.position || { x: 0, y: 0 };
};

const describeNode = (type) => {
  const descriptions = {
    staging: 'Smistamento squadre',
    ambush: 'Punto di agguato',
    lure: 'Innesco diversivo',
    safe: 'Nodo di recupero',
  };
  return descriptions[type] || 'Nodo operativo';
};

const prettyConnection = (connection) => {
  const from = nodeLookup.value.get(connection.from)?.label || connection.from;
  const to = nodeLookup.value.get(connection.to)?.label || connection.to;
  return `${from} → ${to}`;
};
</script>

<style scoped>
.synthesis-map {
  background: rgba(9, 14, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1.25rem;
  display: grid;
  gap: 1.25rem;
}

.synthesis-map__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.synthesis-map__header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.synthesis-map__header p {
  margin: 0.35rem 0 0;
  color: rgba(240, 244, 255, 0.6);
}

.synthesis-map__action {
  background: rgba(16, 24, 34, 0.92);
  border: 1px solid rgba(96, 213, 255, 0.35);
  border-radius: 10px;
  padding: 0.55rem 0.95rem;
  color: #f0f4ff;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.synthesis-map__action:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 213, 255, 0.65);
}

.synthesis-map__canvas-wrapper {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
}

.synthesis-map__canvas {
  width: 100%;
  height: auto;
  display: block;
  background: rgba(11, 17, 25, 0.9);
  border-radius: 16px;
}

.synthesis-map__connection {
  stroke: rgba(96, 213, 255, 0.55);
  stroke-linecap: round;
}

.synthesis-map__connection--w1 {
  stroke: rgba(96, 213, 255, 0.4);
}

.synthesis-map__connection--w2 {
  stroke: rgba(142, 227, 255, 0.65);
}

.synthesis-map__connection--w3,
.synthesis-map__connection--w4 {
  stroke: rgba(161, 255, 212, 0.85);
}

.synthesis-map__node-circle {
  fill: rgba(15, 23, 34, 0.95);
  stroke-width: 2;
}

.synthesis-map__node-circle--staging {
  stroke: rgba(96, 213, 255, 0.7);
}

.synthesis-map__node-circle--ambush {
  stroke: rgba(255, 169, 105, 0.8);
}

.synthesis-map__node-circle--lure {
  stroke: rgba(207, 145, 255, 0.75);
}

.synthesis-map__node-circle--safe {
  stroke: rgba(129, 255, 199, 0.8);
}

.synthesis-map__node-label {
  fill: rgba(240, 244, 255, 0.9);
  font-size: 0.7rem;
  text-anchor: middle;
}

.synthesis-map__node-metric {
  fill: rgba(240, 244, 255, 0.55);
  font-size: 0.65rem;
  text-anchor: middle;
}

.synthesis-map__legend {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.synthesis-map__legend section {
  background: rgba(11, 17, 25, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 0.85rem;
  display: grid;
  gap: 0.75rem;
}

.synthesis-map__legend h4 {
  margin: 0;
  font-size: 0.95rem;
}

.synthesis-map__legend ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.synthesis-map__legend li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.synthesis-map__legend strong {
  display: block;
  font-size: 0.85rem;
}

.synthesis-map__legend span {
  display: block;
  font-size: 0.75rem;
  color: rgba(240, 244, 255, 0.6);
}

.synthesis-map__legend button {
  background: rgba(16, 24, 34, 0.92);
  border: 1px solid rgba(207, 145, 255, 0.35);
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  color: #f0f4ff;
  cursor: pointer;
  font-size: 0.75rem;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.synthesis-map__legend button:hover {
  transform: translateY(-1px);
  border-color: rgba(207, 145, 255, 0.6);
}
</style>
