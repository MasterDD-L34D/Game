<template>
  <section class="atlas-progress">
    <header class="atlas-progress__header">
      <div>
        <h3>Nebula Atlas · Collezione</h3>
        <p>Tracking collezionabile basato sul dataset operativo.</p>
      </div>
      <ul class="atlas-progress__sprites" aria-label="Preview sprite">
        <li v-for="sprite in spritePreviews" :key="sprite.id" :style="sprite.style">
          <span>{{ sprite.initials }}</span>
        </li>
      </ul>
    </header>

    <div class="atlas-progress__meters">
      <div v-for="entry in progressEntries" :key="entry.id" class="atlas-meter">
        <header>
          <h4>{{ entry.label }}</h4>
          <span>{{ entry.percent }}%</span>
        </header>
        <div class="atlas-meter__bar">
          <div class="atlas-meter__fill" :style="{ width: `${entry.percent}%` }"></div>
        </div>
        <p class="atlas-meter__caption">{{ entry.current }} / {{ entry.target }} pronti</p>
      </div>
    </div>

    <aside class="atlas-progress__highlights" v-if="highlights.length">
      <h4>Highlights curatoriali</h4>
      <ul>
        <li v-for="item in highlights" :key="item">{{ item }}</li>
      </ul>
    </aside>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  metrics: {
    type: Object,
    default: () => ({}),
  },
  dataset: {
    type: Object,
    default: () => ({}),
  },
  highlights: {
    type: Array,
    default: () => [],
  },
});

const progressEntries = computed(() => {
  const targets = props.metrics || {};
  const entries = [
    {
      id: 'species',
      label: 'Specie',
      target: targets.species || 0,
      current: Array.isArray(props.dataset?.species) ? props.dataset.species.length : 0,
    },
    {
      id: 'biomes',
      label: 'Biomi',
      target: targets.biomes || 0,
      current: Array.isArray(props.dataset?.biomes) ? props.dataset.biomes.length : 0,
    },
    {
      id: 'encounters',
      label: 'Encounter',
      target: targets.encounters || 0,
      current: Array.isArray(props.dataset?.encounters) ? props.dataset.encounters.length : 0,
    },
  ];
  return entries.map((entry) => {
    const percent = !entry.target
      ? 0
      : Math.min(100, Math.round((entry.current / entry.target) * 100));
    return { ...entry, percent };
  });
});

const highlights = computed(() => props.highlights || []);

const spritePreviews = computed(() => {
  const species = Array.isArray(props.dataset?.species) ? props.dataset.species.slice(0, 4) : [];
  if (!species.length) {
    return Array.from({ length: 4 }).map((_, index) => buildSprite(`NA-${index + 1}`));
  }
  return species.map((entry) => buildSprite(entry.name || entry.id));
});

function buildSprite(seed) {
  const colours = ['#38bdf8', '#c084fc', '#f472b6', '#f97316', '#22d3ee'];
  const index = Math.abs(hashCode(seed)) % colours.length;
  const gradient = `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), transparent 55%), linear-gradient(135deg, ${colours[index]} 0%, rgba(2, 6, 23, 0.95) 100%)`;
  const initials = seed
    .split(' ')
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
  return {
    id: seed,
    initials: initials || 'NA',
    style: { backgroundImage: gradient },
  };
}

function hashCode(text) {
  let hash = 0;
  if (!text) return hash;
  for (let i = 0; i < text.length; i += 1) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
</script>

<style scoped>
.atlas-progress {
  display: grid;
  gap: 1.5rem;
  background: rgba(248, 250, 252, 0.92);
  border-radius: 1.5rem;
  border: 1px solid rgba(191, 219, 254, 0.6);
  padding: 1.75rem;
  color: #0f172a;
}

.atlas-progress__header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.atlas-progress__header h3 {
  margin: 0;
  font-size: 1.35rem;
}

.atlas-progress__header p {
  margin: 0.35rem 0 0;
  color: rgba(15, 23, 42, 0.65);
}

.atlas-progress__sprites {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
  gap: 0.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.atlas-progress__sprites li {
  height: 3.2rem;
  border-radius: 1.1rem;
  display: grid;
  place-items: center;
  color: rgba(248, 250, 252, 0.92);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 14px 24px rgba(15, 23, 42, 0.18);
}

.atlas-progress__meters {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.atlas-meter {
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(191, 219, 254, 0.6);
  border-radius: 1.25rem;
  padding: 1rem;
  display: grid;
  gap: 0.6rem;
}

.atlas-meter header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.atlas-meter h4 {
  margin: 0;
  font-size: 0.95rem;
}

.atlas-meter__bar {
  height: 0.55rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.25);
  overflow: hidden;
}

.atlas-meter__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #3b82f6 0%, #a855f7 100%);
  transition: width 0.3s ease;
}

.atlas-meter__caption {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(30, 41, 59, 0.7);
}

.atlas-progress__highlights h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(15, 23, 42, 0.65);
}

.atlas-progress__highlights ul {
  margin: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.45rem;
  color: rgba(15, 23, 42, 0.75);
}
</style>
