<template>
  <section class="pokedex-card" :data-tone="tone">
    <header v-if="title || icon || $slots.badge" class="pokedex-card__header">
      <div class="pokedex-card__title-group">
        <span v-if="icon" class="pokedex-card__icon" aria-hidden="true">{{ icon }}</span>
        <h3 v-if="title" class="pokedex-card__title">{{ title }}</h3>
      </div>
      <slot name="badge"></slot>
    </header>

    <div class="pokedex-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="pokedex-card__footer">
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
.pokedex-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.pokedex-card__title-group {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.pokedex-card__title {
  margin: 0;
}
</style>
