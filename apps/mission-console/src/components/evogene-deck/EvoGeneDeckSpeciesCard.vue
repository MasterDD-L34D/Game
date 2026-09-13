<template>
  <section class="evogene-deck-card" :data-tone="tone">
    <header v-if="title || icon || $slots.badge" class="evogene-deck-card__header">
      <div class="evogene-deck-card__title-group">
        <span v-if="icon" class="evogene-deck-card__icon" aria-hidden="true">{{ icon }}</span>
        <h3 v-if="title" class="evogene-deck-card__title">{{ title }}</h3>
      </div>
      <slot name="badge"></slot>
    </header>

    <div class="evogene-deck-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="evogene-deck-card__footer">
      <slot name="footer"></slot>
    </footer>
  </section>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  tone: {
    type: String,
    default: 'neutral',
  },
});
</script>

<style scoped>
.evogene-deck-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.evogene-deck-card__title-group {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.evogene-deck-card__title {
  margin: 0;
}
</style>
