<template>
  <article class="biome-card">
    <header class="biome-card__header">
      <div>
        <p class="biome-card__kicker">Bioma operativo</p>
        <h3 class="biome-card__title">{{ biome.name }}</h3>
        <p class="biome-card__subtitle">{{ biome.hazard }}</p>
      </div>
      <div class="biome-card__indicators">
        <TraitChip v-if="biome.climate" :label="biome.climate" variant="climate" />
        <TraitChip v-if="biome.stability" :label="biome.stability" variant="hazard" icon="☍" />
      </div>
    </header>

    <section class="biome-card__lanes" v-if="lanes.length">
      <h4>Corridoi</h4>
      <div class="biome-card__chip-grid">
        <TraitChip v-for="lane in lanes" :key="lane" :label="lane" variant="core" icon="⤴" />
      </div>
    </section>

    <section class="biome-card__operations" v-if="operations.length">
      <h4>Operazioni</h4>
      <ul>
        <li v-for="operation in operations" :key="operation">{{ operation }}</li>
      </ul>
    </section>

    <section class="biome-card__infiltration" v-if="biome.infiltration">
      <h4>Infiltrazione</h4>
      <p>{{ biome.infiltration }}</p>
    </section>

    <footer class="biome-card__footer">
      <p>{{ biome.storyHook }}</p>
      <slot name="footer"></slot>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import TraitChip from '../shared/TraitChip.vue';

const props = defineProps({
  biome: {
    type: Object,
    required: true,
  },
});

const lanes = computed(() => props.biome?.lanes || props.biome?.paths || []);
const operations = computed(() => props.biome?.operations || props.biome?.opportunities || []);
</script>

<style scoped>
.biome-card {
  display: grid;
  gap: 1.1rem;
  padding: 1.4rem;
  border-radius: 1.4rem;
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(30, 64, 175, 0.55));
  border: 1px solid rgba(148, 163, 184, 0.28);
  color: #e2e8f0;
  position: relative;
  overflow: hidden;
}

.biome-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.25), transparent 60%);
  opacity: 0.85;
  pointer-events: none;
}

.biome-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.biome-card__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.7rem;
  color: rgba(148, 163, 184, 0.75);
}

.biome-card__title {
  margin: 0.3rem 0 0;
  font-size: 1.4rem;
  letter-spacing: 0.02em;
}

.biome-card__subtitle {
  margin: 0.25rem 0 0;
  color: rgba(226, 232, 240, 0.85);
  font-size: 0.9rem;
}

.biome-card__indicators {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-end;
}

.biome-card__lanes h4,
.biome-card__operations h4,
.biome-card__infiltration h4 {
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.8);
}

.biome-card__chip-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.biome-card__operations ul {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 0.3rem;
  color: rgba(226, 232, 240, 0.85);
}

.biome-card__infiltration p,
.biome-card__footer p {
  margin: 0;
  line-height: 1.5;
  color: rgba(226, 232, 240, 0.85);
}

.biome-card__footer {
  display: grid;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
}
</style>
