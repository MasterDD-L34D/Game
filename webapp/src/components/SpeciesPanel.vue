<template>
  <section class="species-panel" v-if="species">
    <header class="species-panel__header">
      <h2 class="species-panel__title">{{ species.display_name || species.id }}</h2>
      <p class="species-panel__summary" v-if="summary">{{ summary }}</p>
    </header>

    <article class="species-panel__description">
      <p>{{ description }}</p>
    </article>

    <section class="species-panel__traits">
      <h3>Tratti fondamentali</h3>
      <ul class="species-panel__trait-list">
        <li v-for="trait in coreTraits" :key="trait">{{ trait }}</li>
      </ul>
    </section>

    <section class="species-panel__traits" v-if="derivedTraits.length">
      <h3>Tratti derivati</h3>
      <ul class="species-panel__trait-list species-panel__trait-list--derived">
        <li v-for="trait in derivedTraits" :key="trait">{{ trait }}</li>
      </ul>
    </section>

    <section class="species-panel__adaptations" v-if="adaptations.length">
      <h3>Adattamenti</h3>
      <ul>
        <li v-for="adaptation in adaptations" :key="adaptation">{{ adaptation }}</li>
      </ul>
    </section>

    <section class="species-panel__behavior" v-if="behaviourTags.length">
      <h3>Comportamento</h3>
      <p>{{ behaviourTags.join(', ') }}</p>
    </section>

    <section class="species-panel__statistics">
      <h3>Statistiche</h3>
      <dl>
        <div class="species-panel__stat">
          <dt>Minaccia</dt>
          <dd>{{ statistics.threat_tier }}</dd>
        </div>
        <div class="species-panel__stat">
          <dt>Rarità</dt>
          <dd>{{ statistics.rarity || 'R?' }}</dd>
        </div>
        <div class="species-panel__stat">
          <dt>Energia</dt>
          <dd>{{ statistics.energy_profile || 'n/d' }}</dd>
        </div>
        <div class="species-panel__stat">
          <dt>Sinergia</dt>
          <dd>{{ formattedSynergy }}</dd>
        </div>
      </dl>
    </section>
  </section>
  <section v-else class="species-panel species-panel--empty">
    <p>Nessuna specie selezionata.</p>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  species: {
    type: Object,
    default: null,
  },
});

const summary = computed(() => props.species?.summary || null);
const description = computed(() => props.species?.description || props.species?.summary || '');
const traits = computed(() => props.species?.traits || {});
const coreTraits = computed(() => traits.value.core || []);
const derivedTraits = computed(() => traits.value.derived || props.species?.derived_traits || []);
const morphology = computed(() => props.species?.morphology || {});
const adaptations = computed(() => morphology.value.adaptations || []);
const behaviour = computed(() => props.species?.behavior || props.species?.behavior_profile || {});
const behaviourTags = computed(() => behaviour.value.tags || behaviour.value.behaviourTags || []);
const statistics = computed(() => props.species?.statistics || { threat_tier: props.species?.balance?.threat_tier });
const formattedSynergy = computed(() => {
  const value = statistics.value?.synergy_score;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.round(value * 100)}%`;
  }
  return 'n/d';
});
</script>

<style scoped>
.species-panel {
  background: #0a0d12;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  color: #f0f4ff;
  display: grid;
  gap: 1.25rem;
}

.species-panel__header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.75rem;
}

.species-panel__title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
}

.species-panel__summary {
  margin: 0.25rem 0 0;
  color: rgba(240, 244, 255, 0.82);
  font-size: 1rem;
}

.species-panel__description p {
  margin: 0;
  line-height: 1.5;
}

.species-panel__traits,
.species-panel__adaptations,
.species-panel__behavior,
.species-panel__statistics {
  background: rgba(10, 15, 22, 0.6);
  padding: 1rem;
  border-radius: 10px;
}

.species-panel__traits h3,
.species-panel__adaptations h3,
.species-panel__behavior h3,
.species-panel__statistics h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.species-panel__trait-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.species-panel__trait-list li {
  background: rgba(39, 121, 255, 0.18);
  border: 1px solid rgba(39, 121, 255, 0.32);
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
}

.species-panel__trait-list--derived li {
  background: rgba(180, 94, 255, 0.18);
  border-color: rgba(180, 94, 255, 0.32);
}

.species-panel__adaptations ul {
  margin: 0;
  padding-left: 1.1rem;
}

.species-panel__statistics dl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem 1rem;
  margin: 0;
}

.species-panel__stat dt {
  font-weight: 600;
  margin-bottom: 0.1rem;
  color: rgba(240, 244, 255, 0.75);
}

.species-panel__stat dd {
  margin: 0;
  font-size: 0.95rem;
}

.species-panel--empty {
  text-align: center;
  color: rgba(240, 244, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 2rem;
}
</style>
