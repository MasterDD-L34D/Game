<template>
  <section class="metrics-panel" v-if="metrics">
    <header class="metrics-panel__header">
      <h3>Metriche live</h3>
      <span class="metrics-panel__badge">{{ metrics.threat.tier }}</span>
    </header>
    <dl class="metrics-panel__list">
      <div>
        <dt>Punteggio minaccia</dt>
        <dd>{{ metrics.threat.score.toFixed(2) }}</dd>
      </div>
      <div>
        <dt>Riepilogo rarità</dt>
        <dd>
          <ul class="metrics-panel__rarity">
            <li v-for="(count, rarity) in metrics.rarityMix.counts" :key="rarity">
              <strong>{{ rarity }}:</strong>
              <span>{{ count }}</span>
              <small>({{ metrics.rarityMix.distribution[rarity] }}%)</small>
            </li>
          </ul>
        </dd>
      </div>
      <div>
        <dt>Unità totali</dt>
        <dd>{{ metrics.rarityMix.total }}</dd>
      </div>
    </dl>
    <section class="metrics-panel__suggestions" v-if="suggestions.length">
      <h4>Suggerimenti</h4>
      <ul>
        <li v-for="suggestion in suggestions" :key="suggestion">{{ suggestion }}</li>
      </ul>
    </section>
  </section>
</template>

<script setup>
defineProps({
  metrics: {
    type: Object,
    required: true,
  },
  suggestions: {
    type: Array,
    default: () => [],
  },
});
</script>

<style scoped>
.metrics-panel {
  margin-top: 1rem;
  background: rgba(10, 13, 18, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1.25rem;
  display: grid;
  gap: 1rem;
}

.metrics-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.metrics-panel__header h3 {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(240, 244, 255, 0.7);
}

.metrics-panel__badge {
  background: rgba(96, 213, 255, 0.15);
  border: 1px solid rgba(96, 213, 255, 0.45);
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-weight: 600;
}

.metrics-panel__list {
  margin: 0;
  display: grid;
  gap: 0.75rem;
}

.metrics-panel__list div {
  display: grid;
  gap: 0.25rem;
}

.metrics-panel__list dt {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.55);
}

.metrics-panel__list dd {
  margin: 0;
  font-size: 0.95rem;
}

.metrics-panel__rarity {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.metrics-panel__rarity li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.metrics-panel__rarity strong {
  font-weight: 600;
}

.metrics-panel__rarity small {
  color: rgba(240, 244, 255, 0.55);
}

.metrics-panel__suggestions {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 0.75rem;
  display: grid;
  gap: 0.5rem;
}

.metrics-panel__suggestions h4 {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(240, 244, 255, 0.75);
}

.metrics-panel__suggestions ul {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.35rem;
}
</style>
