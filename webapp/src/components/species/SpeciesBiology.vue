<template>
  <section class="species-biology">
    <div class="species-biology__section">
      <header class="species-biology__header">
        <h3>Tratti fondamentali</h3>
        <slot name="filters"></slot>
      </header>
      <ul class="species-biology__trait-list" data-testid="core-traits">
        <li v-for="trait in coreTraits" :key="trait">{{ trait }}</li>
      </ul>
      <slot name="synergy-suggestions"></slot>
    </div>

    <div v-if="derivedTraits.length" class="species-biology__section">
      <h3>Tratti derivati</h3>
      <ul class="species-biology__trait-list species-biology__trait-list--derived" data-testid="derived-traits">
        <li v-for="trait in derivedTraits" :key="trait">{{ trait }}</li>
      </ul>
    </div>

    <div v-if="adaptations.length" class="species-biology__section">
      <h3>Adattamenti</h3>
      <ul class="species-biology__list">
        <li v-for="adaptation in adaptations" :key="adaptation">{{ adaptation }}</li>
      </ul>
    </div>

    <div v-if="behaviourTags.length || drives.length" class="species-biology__section">
      <h3>Comportamento</h3>
      <p v-if="behaviourTags.length" class="species-biology__behaviour-tags">{{ behaviourTags.join(', ') }}</p>
      <ul v-if="drives.length" class="species-biology__list">
        <li v-for="drive in drives" :key="drive">{{ drive }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup>
defineProps({
  coreTraits: {
    type: Array,
    default: () => [],
  },
  derivedTraits: {
    type: Array,
    default: () => [],
  },
  adaptations: {
    type: Array,
    default: () => [],
  },
  behaviourTags: {
    type: Array,
    default: () => [],
  },
  drives: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped>
.species-biology {
  display: grid;
  gap: 1.25rem;
}

.species-biology__section {
  background: rgba(10, 15, 22, 0.6);
  padding: 1rem;
  border-radius: 10px;
  display: grid;
  gap: 0.75rem;
}

.species-biology__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.species-biology__header h3 {
  margin: 0;
}

.species-biology__trait-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.species-biology__trait-list li {
  background: rgba(39, 121, 255, 0.18);
  border: 1px solid rgba(39, 121, 255, 0.32);
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.85rem;
}

.species-biology__trait-list--derived li {
  background: rgba(180, 94, 255, 0.18);
  border-color: rgba(180, 94, 255, 0.32);
}

.species-biology__list {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.35rem;
}

.species-biology__behaviour-tags {
  margin: 0;
}
</style>
