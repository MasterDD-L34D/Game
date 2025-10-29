<template>
  <section class="species-preview-grid">
    <header class="species-preview-grid__header">
      <h3>Anteprime sintetiche</h3>
      <slot name="filters"></slot>
    </header>
    <p v-if="error" class="species-preview-grid__error">{{ error }}</p>
    <p v-else-if="loading" class="species-preview-grid__loading">Generazione in corso...</p>
    <div v-else-if="previews.length" class="species-preview-grid__cards">
      <article
        v-for="preview in previews"
        :key="preview.blueprint?.id || preview.meta?.request_id"
        class="species-preview-card"
      >
        <header class="species-preview-card__header">
          <h4>{{ preview.blueprint?.display_name || preview.blueprint?.id }}</h4>
          <span class="species-preview-card__badge">{{ preview.blueprint?.statistics?.threat_tier || 'T?' }}</span>
        </header>
        <p class="species-preview-card__summary">{{ preview.blueprint?.summary }}</p>
        <dl class="species-preview-card__stats">
          <div>
            <dt>Energia</dt>
            <dd>{{ preview.blueprint?.statistics?.energy_profile || 'n/d' }}</dd>
          </div>
          <div>
            <dt>Rarità</dt>
            <dd>{{ preview.blueprint?.statistics?.rarity || 'R?' }}</dd>
          </div>
        </dl>
        <p v-if="preview.blueprint?.traits?.core?.length" class="species-preview-card__traits">
          {{ preview.blueprint.traits.core.join(', ') }}
        </p>
      </article>
    </div>
    <p v-else class="species-preview-grid__empty">Nessuna anteprima disponibile.</p>
  </section>
</template>

<script setup>
defineProps({
  previews: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
});
</script>

<style scoped>
.species-preview-grid {
  background: rgba(10, 15, 22, 0.6);
  padding: 1rem;
  border-radius: 10px;
  display: grid;
  gap: 1rem;
}

.species-preview-grid__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.species-preview-grid__header h3 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.species-preview-grid__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.species-preview-card {
  background: rgba(9, 12, 18, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.85rem;
  display: grid;
  gap: 0.5rem;
}

.species-preview-card__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.species-preview-card__badge {
  background: rgba(39, 121, 255, 0.35);
  border-radius: 6px;
  padding: 0.1rem 0.45rem;
  font-size: 0.75rem;
}

.species-preview-card__summary {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
}

.species-preview-card__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.35rem 0.75rem;
  margin: 0;
}

.species-preview-card__stats dt {
  font-weight: 600;
  font-size: 0.75rem;
  color: rgba(240, 244, 255, 0.75);
}

.species-preview-card__stats dd {
  margin: 0;
  font-size: 0.85rem;
}

.species-preview-card__traits {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.75;
}

.species-preview-grid__error {
  color: #ff6070;
  margin: 0;
}

.species-preview-grid__loading,
.species-preview-grid__empty {
  margin: 0;
  color: rgba(240, 244, 255, 0.75);
}
</style>
