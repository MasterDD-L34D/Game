<template>
  <section class="nebula-timeline" v-if="entries.length">
    <h3>Timeline Nebula</h3>
    <ol class="nebula-timeline__list">
      <li
        v-for="entry in orderedEntries"
        :key="entry.id"
        class="nebula-timeline__entry"
        :data-tone="entry.status"
      >
        <header class="nebula-timeline__header">
          <span class="nebula-timeline__title">{{ entry.title }}</span>
          <time v-if="entry.timestamp" class="nebula-timeline__time">{{ formatTimestamp(entry.timestamp) }}</time>
        </header>
        <p class="nebula-timeline__summary">{{ entry.summary }}</p>
        <p v-if="entry.meta" class="nebula-timeline__meta">{{ entry.meta }}</p>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
});

const orderedEntries = computed(() => {
  return [...props.entries].sort((a, b) => {
    const dateA = new Date(a.timestamp || 0).getTime();
    const dateB = new Date(b.timestamp || 0).getTime();
    return dateB - dateA;
  });
});

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style scoped>
.nebula-timeline {
  background: rgba(12, 18, 28, 0.75);
  border: 1px solid rgba(97, 213, 255, 0.22);
  border-radius: 16px;
  padding: 1.25rem;
  display: grid;
  gap: 1rem;
}

.nebula-timeline h3 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.95rem;
  color: rgba(224, 237, 255, 0.92);
}

.nebula-timeline__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
}

.nebula-timeline__entry {
  border-radius: 12px;
  padding: 0.85rem 1rem;
  background: rgba(5, 8, 13, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 0.5rem;
  position: relative;
}

.nebula-timeline__entry::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  pointer-events: none;
  border: 1px solid transparent;
  transition: border-color 0.2s ease;
}

.nebula-timeline__entry[data-tone='success']::before {
  border-color: rgba(115, 255, 206, 0.45);
}

.nebula-timeline__entry[data-tone='warning']::before {
  border-color: rgba(255, 196, 96, 0.5);
}

.nebula-timeline__entry[data-tone='critical']::before {
  border-color: rgba(255, 105, 130, 0.6);
}

.nebula-timeline__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
}

.nebula-timeline__title {
  font-weight: 600;
  letter-spacing: 0.03em;
}

.nebula-timeline__time {
  font-size: 0.75rem;
  color: rgba(224, 237, 255, 0.6);
}

.nebula-timeline__summary {
  margin: 0;
  color: rgba(240, 244, 255, 0.9);
  line-height: 1.4;
}

.nebula-timeline__meta {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(224, 237, 255, 0.65);
}
</style>
