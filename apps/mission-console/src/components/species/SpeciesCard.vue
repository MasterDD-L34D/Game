<template>
  <article class="species-card">
    <header class="species-card__header">
      <div>
        <p class="species-card__kicker">{{ archetype }}</p>
        <h3 class="species-card__title">{{ name }}</h3>
      </div>
      <div class="species-card__badges">
        <TraitChip v-if="rarity" :label="rarity" variant="core" icon="✦" />
        <TraitChip v-if="threat" :label="`T${threat}`" variant="hazard" icon="⚡" />
      </div>
    </header>

    <p v-if="synopsis" class="species-card__synopsis">{{ synopsis }}</p>

    <section class="species-card__traits" aria-label="Tratti principali">
      <div>
        <h4>Core</h4>
        <div class="species-card__trait-grid">
          <TraitChip
            v-for="trait in traits.core"
            :key="`core-${trait}`"
            :label="trait"
            variant="core"
          />
        </div>
      </div>
      <div>
        <h4>Derivati</h4>
        <div class="species-card__trait-grid">
          <TraitChip
            v-for="trait in traits.derived"
            :key="`derived-${trait}`"
            :label="trait"
            variant="derived"
          />
        </div>
      </div>
      <div v-if="traits.optional.length">
        <h4>Optional</h4>
        <div class="species-card__trait-grid">
          <TraitChip
            v-for="trait in traits.optional"
            :key="`optional-${trait}`"
            :label="trait"
            variant="optional"
          />
        </div>
      </div>
    </section>

    <footer class="species-card__footer">
      <div class="species-card__info-block">
        <span class="species-card__label">Energia</span>
        <span>{{ energyProfile }}</span>
      </div>
      <div class="species-card__info-block">
        <span class="species-card__label">Habitat</span>
        <span>{{ habitats.join(', ') }}</span>
      </div>
      <div class="species-card__info-block" v-if="coverage">
        <span class="species-card__label">Coverage QA</span>
        <span>{{ coverage }}</span>
      </div>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import TraitChip from '../shared/TraitChip.vue';

const props = defineProps({
  species: {
    type: Object,
    default: () => ({}),
  },
});

const name = computed(() => props.species?.display_name || props.species?.name || props.species?.id || 'Specie');
const archetype = computed(() => props.species?.archetype || props.species?.role || 'Profilo non definito');
const rarity = computed(() => props.species?.rarity || props.species?.statistics?.rarity || '');
const threat = computed(() => {
  const tier = props.species?.threatTier || props.species?.statistics?.threat_tier || props.species?.balance?.threat_tier;
  if (!tier) return '';
  return String(tier).replace(/^T/i, '');
});
const synopsis = computed(() => props.species?.synopsis || props.species?.summary || '');
const traits = computed(() => ({
  core: props.species?.traits?.core || props.species?.core_traits || [],
  derived: props.species?.traits?.derived || props.species?.derived_traits || [],
  optional: props.species?.traits?.optional || props.species?.optional_traits || [],
}));
const energyProfile = computed(
  () => props.species?.energyProfile || props.species?.energy_profile || props.species?.statistics?.energy_profile || '—',
);
const habitats = computed(() => props.species?.habitats || props.species?.habitat || props.species?.morphology?.environments || []);
const coverage = computed(() => {
  const value = props.species?.telemetry?.coverage || props.species?.statistics?.coverage;
  if (typeof value !== 'number') return '';
  return `${Math.round(value * 100)}%`;
});
</script>

<style scoped>
.species-card {
  position: relative;
  display: grid;
  gap: 1.25rem;
  padding: 1.5rem;
  border-radius: 1.5rem;
  background: radial-gradient(circle at top left, rgba(59, 130, 246, 0.22), rgba(15, 23, 42, 0.92));
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #f8fafc;
  box-shadow: 0 20px 40px rgba(2, 6, 23, 0.45);
}

.species-card::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 1.6rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  pointer-events: none;
  opacity: 0.6;
}

.species-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.species-card__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.6);
}

.species-card__title {
  margin: 0.35rem 0 0;
  font-size: 1.6rem;
}

.species-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.species-card__synopsis {
  margin: 0;
  line-height: 1.6;
  color: rgba(226, 232, 240, 0.85);
}

.species-card__traits {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.species-card__traits h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(226, 232, 240, 0.7);
}

.species-card__trait-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.species-card__footer {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.species-card__info-block {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: rgba(15, 23, 42, 0.45);
  border-radius: 0.9rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(59, 130, 246, 0.35);
}

.species-card__label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  color: rgba(148, 163, 184, 0.75);
}
</style>
