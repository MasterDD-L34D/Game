<template>
  <button type="button" class="synergy-card" :class="{ 'synergy-card--flipped': flipped }" @click="toggle">
    <div class="synergy-card__face synergy-card__face--front">
      <span class="synergy-card__icon" aria-hidden="true">∞</span>
      <p class="synergy-card__title">{{ title }}</p>
      <p class="synergy-card__hint">Tocca per dettagli</p>
    </div>
    <div class="synergy-card__face synergy-card__face--back">
      <p class="synergy-card__title">{{ title }}</p>
      <p class="synergy-card__detail">{{ safeDetail }}</p>
    </div>
  </button>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  detail: {
    type: String,
    default: '',
  },
});

const flipped = ref(false);

const safeDetail = computed(() => {
  if (props.detail) {
    return props.detail;
  }
  return 'Sinergia tracciata: benchmark QA non annotato. Consultare telemetry per approfondimenti.';
});

function toggle() {
  flipped.value = !flipped.value;
}
</script>

<style scoped>
.synergy-card {
  position: relative;
  width: 180px;
  height: 140px;
  border: none;
  perspective: 1000px;
  background: transparent;
  cursor: pointer;
}

.synergy-card__face {
  position: absolute;
  inset: 0;
  border-radius: 18px;
  padding: 1rem;
  display: grid;
  place-items: center;
  text-align: center;
  backface-visibility: hidden;
  transition: transform 0.55s ease;
}

.synergy-card__face--front {
  background: radial-gradient(circle at top, rgba(96, 213, 255, 0.3), rgba(14, 165, 233, 0.08));
  border: 1px solid rgba(59, 130, 246, 0.32);
  color: #e0f2fe;
}

.synergy-card__face--back {
  background: radial-gradient(circle at bottom, rgba(56, 189, 248, 0.28), rgba(15, 23, 42, 0.92));
  border: 1px solid rgba(59, 130, 246, 0.5);
  color: #f8fafc;
  transform: rotateY(180deg);
}

.synergy-card__icon {
  font-size: 2.4rem;
  text-shadow: 0 0 18px rgba(125, 211, 252, 0.75);
}

.synergy-card__title {
  margin: 0;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.04em;
}

.synergy-card__hint {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.75;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.synergy-card__detail {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.4;
  opacity: 0.9;
}

.synergy-card--flipped .synergy-card__face--front {
  transform: rotateY(180deg);
}

.synergy-card--flipped .synergy-card__face--back {
  transform: rotateY(360deg);
}
</style>
