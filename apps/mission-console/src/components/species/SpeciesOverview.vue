<template>
  <header class="species-overview">
    <div class="species-overview__heading">
      <h2 class="species-overview__title">{{ name }}</h2>
      <p v-if="summary" class="species-overview__summary">{{ summary }}</p>
    </div>
    <p v-if="description" class="species-overview__description">{{ description }}</p>
    <slot name="actions"></slot>
  </header>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    default: '',
  },
  summary: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
});
</script>

<style scoped>
.species-overview {
  display: grid;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 1rem;
}

.species-overview__title {
  margin: 0;
  font-size: 1.85rem;
  font-weight: 700;
}

.species-overview__summary {
  margin: 0.25rem 0 0;
  color: rgba(240, 244, 255, 0.82);
  font-size: 1rem;
}

.species-overview__description {
  margin: 0;
  line-height: 1.5;
}
</style>
