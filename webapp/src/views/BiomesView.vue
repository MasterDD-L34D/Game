<template>
  <section class="flow-view">
    <header class="flow-view__header">
      <h2>Biomi candidati</h2>
      <p>Panoramica degli ambienti approvati e del grado di prontezza.</p>
    </header>
    <div class="flow-view__grid">
      <article class="biome-card" v-for="biome in biomes" :key="biome.id">
        <header>
          <h3>{{ biome.name }}</h3>
          <span class="biome-card__badge">{{ biome.climate }}</span>
        </header>
        <p class="biome-card__focus">{{ biome.focus }}</p>
        <p class="biome-card__hazard"><strong>Hazard:</strong> {{ biome.hazard }}</p>
        <ul>
          <li v-for="item in biome.opportunities" :key="item">{{ item }}</li>
        </ul>
        <ul class="biome-card__validators">
          <li
            v-for="validator in biome.validators || []"
            :key="validator.id"
            :class="`validator validator--${validator.status}`"
          >
            <span class="validator__marker"></span>
            <div>
              <strong>{{ validator.label }}</strong>
              <p>{{ validator.message }}</p>
            </div>
          </li>
        </ul>
        <footer>
          <div class="biome-card__meter">
            <div class="biome-card__meter-fill" :style="{ width: `${readinessPercent(biome)}%` }"></div>
          </div>
          <small>Readiness {{ biome.readiness }} / {{ biome.total }} · Rischio {{ biome.risk }}</small>
        </footer>
      </article>
    </div>
  </section>
</template>

<script setup>
import { toRefs } from 'vue';

const props = defineProps({
  biomes: {
    type: Array,
    default: () => [],
  },
});

const { biomes } = toRefs(props);

const readinessPercent = (biome) => {
  const total = Number.isFinite(biome.total) ? biome.total : 0;
  const readiness = Number.isFinite(biome.readiness) ? biome.readiness : 0;
  if (!total) {
    return 0;
  }
  return Math.min(100, Math.round((readiness / total) * 100));
};
</script>

<style scoped>
.flow-view {
  display: grid;
  gap: 1.5rem;
}

.flow-view__header h2 {
  margin: 0;
  font-size: 1.45rem;
}

.flow-view__header p {
  margin: 0.35rem 0 0;
  color: rgba(240, 244, 255, 0.7);
}

.flow-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.biome-card {
  background: rgba(9, 14, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  display: grid;
  gap: 0.65rem;
}

.biome-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.biome-card h3 {
  margin: 0;
  font-size: 1.1rem;
}

.biome-card__badge {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(96, 213, 255, 0.15);
  border: 1px solid rgba(96, 213, 255, 0.4);
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
}

.biome-card__focus {
  margin: 0;
  color: rgba(240, 244, 255, 0.75);
}

.biome-card__hazard {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.65);
}

.biome-card__hazard strong {
  color: rgba(240, 244, 255, 0.85);
}

.biome-card ul {
  margin: 0;
  padding-left: 1.25rem;
  color: rgba(240, 244, 255, 0.85);
  display: grid;
  gap: 0.35rem;
}

.biome-card__meter {
  height: 0.45rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.biome-card__meter-fill {
  height: 100%;
  background: linear-gradient(90deg, #57ca8a 0%, #61d5ff 100%);
}

small {
  color: rgba(240, 244, 255, 0.6);
}

.biome-card__validators {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.validator {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.55rem;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(12, 18, 26, 0.75);
}

.validator strong {
  font-size: 0.8rem;
  color: rgba(240, 244, 255, 0.9);
}

.validator p {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: rgba(240, 244, 255, 0.7);
}

.validator__marker {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  margin-top: 0.2rem;
  background: rgba(240, 244, 255, 0.35);
}

.validator--passed {
  border-color: rgba(129, 255, 199, 0.55);
}

.validator--passed .validator__marker {
  background: rgba(129, 255, 199, 0.85);
}

.validator--warning {
  border-color: rgba(255, 210, 130, 0.6);
}

.validator--warning .validator__marker {
  background: rgba(255, 210, 130, 0.85);
}

.validator--failed {
  border-color: rgba(255, 135, 135, 0.6);
}

.validator--failed .validator__marker {
  background: rgba(255, 135, 135, 0.85);
}
</style>
