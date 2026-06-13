<template>
  <section class="species-statistics">
    <h3>Statistiche</h3>
    <dl class="species-statistics__grid">
      <div class="species-statistics__stat">
        <dt>Minaccia</dt>
        <dd>{{ statistics.threat_tier || 'T?' }}</dd>
      </div>
      <div class="species-statistics__stat">
        <dt>Rarità</dt>
        <dd>{{ statistics.rarity || 'R?' }}</dd>
      </div>
      <div class="species-statistics__stat">
        <dt>Energia</dt>
        <dd>{{ statistics.energy_profile || 'n/d' }}</dd>
      </div>
      <div class="species-statistics__stat">
        <dt>Sinergia</dt>
        <dd>{{ synergy }}</dd>
      </div>
    </dl>
    <slot></slot>
  </section>
</template>

<script setup>
defineProps({
  statistics: {
    type: Object,
    default: () => ({}),
  },
  synergy: {
    type: String,
    default: 'n/d',
  },
});
</script>

<style scoped>
.species-statistics {
  background: rgba(10, 15, 22, 0.6);
  padding: 1rem;
  border-radius: 10px;
  display: grid;
  gap: 0.75rem;
}

.species-statistics h3 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.species-statistics__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem 1rem;
  margin: 0;
}

.species-statistics__stat dt {
  font-weight: 600;
  margin-bottom: 0.1rem;
  color: rgba(240, 244, 255, 0.75);
}

.species-statistics__stat dd {
  margin: 0;
  font-size: 0.95rem;
}
</style>
