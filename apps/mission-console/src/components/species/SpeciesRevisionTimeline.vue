<template>
  <section class="species-timeline" v-if="hasEntries">
    <div class="species-timeline__header">
      <h3>Revisioni validate</h3>
      <div class="species-timeline__filters">
        <button
          v-for="option in severityOptions"
          :key="option.value"
          type="button"
          :class="['species-timeline__filter', { 'species-timeline__filter--active': option.value === severityFilter }]"
          @click="severityFilter = option.value"
        >
          <span class="species-timeline__filter-icon">{{ option.icon }}</span>
          <span class="species-timeline__filter-label">{{ option.label }}</span>
          <span class="species-timeline__filter-count">{{ severityCounts[option.value] || 0 }}</span>
        </button>
      </div>
    </div>
    <ol class="species-timeline__list" v-if="filteredEntries.length">
      <li
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="species-timeline__entry"
        :data-tone="entry.tone"
      >
        <div class="species-timeline__entry-header">
          <span class="species-timeline__badge" :data-tone="entry.tone">
            <span class="species-timeline__badge-icon">{{ entry.badgeIcon }}</span>
            <span class="species-timeline__badge-text">{{ entry.badgeLabel }}</span>
          </span>
          <div class="species-timeline__entry-meta">
            <strong>{{ entry.title }}</strong>
            <span class="species-timeline__code">{{ entry.code }}</span>
          </div>
        </div>
        <p class="species-timeline__message">{{ entry.message }}</p>
      </li>
    </ol>
    <p v-else class="species-timeline__empty">Nessun evento per il filtro selezionato.</p>
  </section>
  <section class="species-timeline species-timeline--empty" v-else>
    <h3>Revisioni validate</h3>
    <p class="species-timeline__empty">Nessuna validazione registrata dal runtime.</p>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
});

const severityOptions = [
  { value: 'all', label: 'Tutte', icon: '✦' },
  { value: 'info', label: 'Info', icon: '✧' },
  { value: 'warning', label: 'Avvisi', icon: '⚠️' },
  { value: 'error', label: 'Critici', icon: '☠️' },
  { value: 'success', label: 'OK', icon: '✨' },
];

const levelVisuals = {
  info: { label: 'Info', icon: '✧', tone: 'info' },
  warning: { label: 'Avviso', icon: '⚠️', tone: 'warning' },
  error: { label: 'Critico', icon: '☠️', tone: 'error' },
  success: { label: 'Successo', icon: '✨', tone: 'success' },
};

const severityFilter = ref('all');

const normalisedEntries = computed(() => {
  const items = Array.isArray(props.entries) ? props.entries : [];
  return items.map((entry, index) => {
    const level = entry.level || entry.severity || 'info';
    const visuals = levelVisuals[level] || levelVisuals.info;
    return {
      id: entry.id || `revision-${index}`,
      title: entry.title || visuals.label,
      message: entry.message || '',
      code: entry.code || 'n/d',
      level,
      badgeLabel: visuals.label,
      badgeIcon: visuals.icon,
      tone: visuals.tone,
    };
  });
});

const severityCounts = computed(() => {
  const counts = { all: normalisedEntries.value.length };
  for (const entry of normalisedEntries.value) {
    counts[entry.level] = (counts[entry.level] || 0) + 1;
  }
  return counts;
});

const filteredEntries = computed(() => {
  if (severityFilter.value === 'all') {
    return normalisedEntries.value;
  }
  return normalisedEntries.value.filter((entry) => entry.level === severityFilter.value);
});

const hasEntries = computed(() => normalisedEntries.value.length > 0);
</script>

<style scoped>
.species-timeline {
  background: linear-gradient(180deg, rgba(10, 15, 22, 0.7), rgba(22, 28, 44, 0.85));
  padding: 1.1rem;
  border-radius: 14px;
  display: grid;
  gap: 0.9rem;
  border: 1px solid rgba(96, 213, 255, 0.12);
  box-shadow: 0 0 0 1px rgba(96, 213, 255, 0.05), 0 12px 28px rgba(5, 10, 18, 0.6);
}

.species-timeline--empty {
  align-items: center;
  justify-items: start;
}

.species-timeline h3 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.95rem;
}

.species-timeline__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.species-timeline__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.species-timeline__filter {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(96, 213, 255, 0.18);
  background: rgba(96, 213, 255, 0.12);
  color: rgba(240, 244, 255, 0.85);
  cursor: pointer;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: all 0.2s ease;
}

.species-timeline__filter:hover {
  border-color: rgba(159, 123, 255, 0.35);
  color: #f6f1ff;
}

.species-timeline__filter--active {
  background: linear-gradient(135deg, rgba(96, 213, 255, 0.35), rgba(159, 123, 255, 0.35));
  border-color: rgba(159, 123, 255, 0.55);
  box-shadow: 0 0 12px rgba(159, 123, 255, 0.25);
  color: #f9fbff;
}

.species-timeline__filter-icon {
  font-size: 0.85rem;
}

.species-timeline__filter-count {
  font-size: 0.7rem;
  opacity: 0.75;
}

.species-timeline__list {
  list-style: none;
  margin: 0;
  padding: 0 0 0 1.5rem;
  display: grid;
  gap: 0.8rem;
  position: relative;
}

.species-timeline__list::before {
  content: '';
  position: absolute;
  left: 0.4rem;
  top: 0.25rem;
  bottom: 0.25rem;
  width: 2px;
  background: linear-gradient(180deg, rgba(96, 213, 255, 0.55), rgba(159, 123, 255, 0.3));
}

.species-timeline__entry {
  position: relative;
  padding: 0.75rem 0.85rem 0.75rem 1.4rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  gap: 0.45rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  backdrop-filter: blur(6px);
}

.species-timeline__entry::before {
  content: '';
  position: absolute;
  left: -1.2rem;
  top: 1.1rem;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--timeline-node-color, rgba(96, 213, 255, 0.8));
  box-shadow: 0 0 12px var(--timeline-node-color, rgba(96, 213, 255, 0.8));
}

.species-timeline__entry:hover {
  transform: translateX(4px);
  box-shadow: 0 8px 24px rgba(5, 10, 18, 0.4);
}

.species-timeline__entry[data-tone='warning'] {
  --timeline-node-color: rgba(244, 196, 96, 0.9);
  border-color: rgba(244, 196, 96, 0.35);
}

.species-timeline__entry[data-tone='error'] {
  --timeline-node-color: rgba(244, 96, 96, 0.9);
  border-color: rgba(244, 96, 96, 0.4);
}

.species-timeline__entry[data-tone='success'] {
  --timeline-node-color: rgba(129, 255, 199, 0.9);
  border-color: rgba(129, 255, 199, 0.35);
}

.species-timeline__entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.species-timeline__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: rgba(96, 213, 255, 0.18);
  border: 1px solid rgba(96, 213, 255, 0.35);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.species-timeline__badge[data-tone='warning'] {
  background: rgba(244, 196, 96, 0.2);
  border-color: rgba(244, 196, 96, 0.45);
  color: #ffe2a8;
}

.species-timeline__badge[data-tone='error'] {
  background: rgba(244, 96, 96, 0.22);
  border-color: rgba(244, 96, 96, 0.45);
  color: #ffd0d0;
}

.species-timeline__badge[data-tone='success'] {
  background: rgba(129, 255, 199, 0.22);
  border-color: rgba(129, 255, 199, 0.45);
  color: #dbffee;
}

.species-timeline__entry-meta {
  display: grid;
  gap: 0.2rem;
}

.species-timeline__entry-meta strong {
  font-size: 0.95rem;
}

.species-timeline__code {
  font-size: 0.75rem;
  opacity: 0.75;
}

.species-timeline__message {
  margin: 0;
  line-height: 1.45;
  color: rgba(240, 244, 255, 0.85);
}

.species-timeline__empty {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.65);
}
</style>
