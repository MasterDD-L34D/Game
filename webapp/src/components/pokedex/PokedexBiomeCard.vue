<template>
  <article class="pokedex-biome-card" :data-tone="readinessTone">
    <header class="pokedex-biome-card__header">
      <div>
        <p class="pokedex-biome-card__kicker">Bioma operativo</p>
        <h3 class="pokedex-biome-card__title">{{ biome.name }}</h3>
        <p v-if="biome.hazard" class="pokedex-biome-card__subtitle">{{ biome.hazard }}</p>
      </div>
      <div class="pokedex-biome-card__telemetry">
        <PokedexTelemetryBadge label="Readiness" :value="`${biome.readiness || 0}/${biome.total || 0}`" :tone="readinessTone" />
        <PokedexTelemetryBadge v-if="biome.risk" label="Rischio" :value="biome.risk" tone="warning" />
      </div>
    </header>

    <section v-if="lanes.length" class="pokedex-biome-card__section">
      <h4>Corridoi</h4>
      <ul class="pokedex-biome-card__chips">
        <li v-for="lane in lanes" :key="lane">{{ lane }}</li>
      </ul>
    </section>

    <section v-if="operations.length" class="pokedex-biome-card__section">
      <h4>Operazioni</h4>
      <ul class="pokedex-biome-card__list">
        <li v-for="operation in operations" :key="operation">{{ operation }}</li>
      </ul>
    </section>

    <section v-if="biome.infiltration" class="pokedex-biome-card__section">
      <h4>Infiltrazione</h4>
      <p>{{ biome.infiltration }}</p>
    </section>

    <footer class="pokedex-biome-card__footer">
      <p v-if="biome.storyHook">{{ biome.storyHook }}</p>
      <slot name="footer"></slot>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import PokedexTelemetryBadge from './PokedexTelemetryBadge.vue';

const props = defineProps({
  biome: {
    type: Object,
    required: true,
  },
});

const lanes = computed(() => props.biome?.lanes || props.biome?.paths || []);
const operations = computed(() => props.biome?.operations || props.biome?.opportunities || []);

const readinessTone = computed(() => {
  const total = Number(props.biome?.total) || 0;
  const readiness = Number(props.biome?.readiness) || 0;
  if (!total) {
    return 'warning';
  }
  const percent = Math.round((readiness / total) * 100);
  if (percent >= 80) return 'success';
  if (percent < 50) return 'critical';
  return 'warning';
});
</script>

<style scoped>
.pokedex-biome-card {
  position: relative;
  display: grid;
  gap: 1.1rem;
  padding: 1.5rem;
  border-radius: 1.6rem;
  background: rgba(4, 18, 32, 0.82);
  border: 1px solid rgba(77, 208, 255, 0.24);
  box-shadow: inset 0 0 0 1px rgba(77, 208, 255, 0.08);
}

.pokedex-biome-card[data-tone='success'] {
  border-color: rgba(94, 252, 159, 0.45);
}

.pokedex-biome-card[data-tone='critical'] {
  border-color: rgba(255, 91, 107, 0.55);
}

.pokedex-biome-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: flex-start;
}

.pokedex-biome-card__kicker {
  margin: 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(242, 248, 255, 0.55);
}

.pokedex-biome-card__title {
  margin: 0.35rem 0 0;
  font-size: 1.35rem;
  letter-spacing: 0.04em;
  color: var(--pokedex-text-primary);
}

.pokedex-biome-card__subtitle {
  margin: 0.2rem 0 0;
  color: var(--pokedex-text-secondary);
  font-size: 0.9rem;
}

.pokedex-biome-card__telemetry {
  display: grid;
  gap: 0.5rem;
  justify-items: end;
}

.pokedex-biome-card__section h4 {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(242, 248, 255, 0.6);
}

.pokedex-biome-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.pokedex-biome-card__chips li {
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: rgba(77, 208, 255, 0.12);
  color: var(--pokedex-text-primary);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

.pokedex-biome-card__list {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 0.35rem;
  color: var(--pokedex-text-primary);
  font-size: 0.85rem;
}

.pokedex-biome-card__section p {
  margin: 0;
  color: var(--pokedex-text-primary);
  font-size: 0.85rem;
  line-height: 1.5;
}

.pokedex-biome-card__footer {
  border-top: 1px solid rgba(77, 208, 255, 0.16);
  padding-top: 0.75rem;
  display: grid;
  gap: 0.5rem;
  color: var(--pokedex-text-secondary);
  font-size: 0.8rem;
}
</style>
