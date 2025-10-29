<template>
  <section class="species-timeline" v-if="entries.length">
    <h3>Revisioni validate</h3>
    <ol class="species-timeline__list">
      <li v-for="entry in entries" :key="entry.id" :class="['species-timeline__entry', `species-timeline__entry--${entry.level}`]">
        <header>
          <strong>{{ entry.title }}</strong>
          <span class="species-timeline__code">{{ entry.code }}</span>
        </header>
        <p>{{ entry.message }}</p>
      </li>
    </ol>
  </section>
</template>

<script setup>
defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped>
.species-timeline {
  background: rgba(10, 15, 22, 0.6);
  padding: 1rem;
  border-radius: 10px;
  display: grid;
  gap: 0.75rem;
}

.species-timeline h3 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.species-timeline__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.species-timeline__entry {
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 0.35rem;
}

.species-timeline__entry header {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: baseline;
}

.species-timeline__entry--warning {
  border-color: rgba(255, 184, 76, 0.5);
}

.species-timeline__entry--error {
  border-color: rgba(255, 96, 104, 0.6);
}

.species-timeline__code {
  font-size: 0.75rem;
  opacity: 0.75;
}

.species-timeline__entry p {
  margin: 0;
  line-height: 1.4;
}
</style>
