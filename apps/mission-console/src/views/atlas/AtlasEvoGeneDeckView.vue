<template>
  <section class="atlas-evogene-deck">
    <header class="atlas-evogene-deck__header">
      <h3>EvoGene Deck Nebula</h3>
      <p>
        Specie focalizzate sul dataset Nebula: solo blueprint già normalizzati secondo i tratti
        fotonici e pronti per staging/QA.
      </p>
    </header>

    <div class="atlas-evogene-deck__grid">
      <article v-for="entry in species" :key="entry.id" class="atlas-evogene-deck__card">
        <header>
          <div>
            <p class="atlas-evogene-deck__rarity">{{ entry.rarity }}</p>
            <h4>{{ entry.name }}</h4>
          </div>
          <span class="atlas-evogene-deck__badge" :data-state="badgeState(entry.readiness)">
            {{ entry.readiness }}
          </span>
        </header>
        <p class="atlas-evogene-deck__synopsis">{{ entry.synopsis }}</p>
        <dl class="atlas-evogene-deck__meta" aria-label="Dati operativi">
          <div>
            <dt>Archetipo</dt>
            <dd>{{ entry.archetype }}</dd>
          </div>
          <div>
            <dt>Threat</dt>
            <dd>{{ entry.threatTier }}</dd>
          </div>
          <div>
            <dt>Energia</dt>
            <dd>{{ entry.energyProfile }}</dd>
          </div>
        </dl>
        <div class="atlas-evogene-deck__traits">
          <div>
            <h5>Core</h5>
            <ul>
              <li v-for="trait in entry.traits.core" :key="trait">{{ trait }}</li>
            </ul>
          </div>
          <div>
            <h5>Optional</h5>
            <ul>
              <li v-for="trait in entry.traits.optional" :key="trait">{{ trait }}</li>
            </ul>
          </div>
          <div>
            <h5>Sinergie</h5>
            <ul>
              <li v-for="trait in entry.traits.synergy" :key="trait">{{ trait }}</li>
            </ul>
          </div>
        </div>
        <footer class="atlas-evogene-deck__footer">
          <div>
            <strong>Habitat</strong>
            <span>{{ entry.habitats.join(', ') }}</span>
          </div>
          <div>
            <strong>Copertura QA</strong>
            <span>
              {{ formatCoverage(entry.telemetry.coverage) }} ·
              {{ formatTimestamp(entry.telemetry.lastValidation) }}
            </span>
          </div>
          <div>
            <strong>Curatore</strong>
            <span>{{ entry.telemetry.curatedBy }}</span>
          </div>
        </footer>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  dataset: {
    type: Object,
    required: true,
  },
  isDemo: {
    type: Boolean,
    default: false,
  },
  isOffline: {
    type: Boolean,
    default: false,
  },
});

const species = computed(() => (Array.isArray(props.dataset.species) ? props.dataset.species : []));

function formatCoverage(value) {
  if (typeof value !== 'number') return '—';
  return `${Math.round(value * 100)}%`;
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function badgeState(readiness) {
  if (!readiness) return 'unknown';
  const normalised = readiness.toLowerCase();
  if (normalised.includes('approvazione')) return 'pending';
  if (normalised.includes('qa freeze') || normalised.includes('in staging')) return 'progress';
  if (normalised.includes('pronto') || normalised.includes('completato')) return 'ready';
  return 'info';
}
</script>

<style scoped>
.atlas-evogene-deck {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.atlas-evogene-deck__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: rgba(15, 23, 42, 0.75);
}

.atlas-evogene-deck__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1.75rem;
}

.atlas-evogene-deck__card {
  background: rgba(248, 250, 252, 0.95);
  border-radius: 1.25rem;
  padding: 1.75rem;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.atlas-evogene-deck__card header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.atlas-evogene-deck__rarity {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.7rem;
  margin-bottom: 0.35rem;
  color: rgba(15, 23, 42, 0.5);
}

.atlas-evogene-deck__badge {
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border: 1px solid rgba(59, 130, 246, 0.25);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.atlas-evogene-deck__badge[data-state='pending'] {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.35);
}

.atlas-evogene-deck__badge[data-state='progress'] {
  background: rgba(56, 189, 248, 0.18);
  color: #0369a1;
  border-color: rgba(14, 165, 233, 0.28);
}

.atlas-evogene-deck__badge[data-state='ready'] {
  background: rgba(34, 197, 94, 0.18);
  color: #15803d;
  border-color: rgba(34, 197, 94, 0.3);
}

.atlas-evogene-deck__synopsis {
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(15, 23, 42, 0.72);
}

.atlas-evogene-deck__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.75rem;
}

.atlas-evogene-deck__meta div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: rgba(15, 23, 42, 0.65);
}

.atlas-evogene-deck__meta dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.atlas-evogene-deck__meta dd {
  margin: 0;
  font-weight: 600;
}

.atlas-evogene-deck__traits {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 1rem;
}

.atlas-evogene-deck__traits h5 {
  margin: 0 0 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.7rem;
  color: rgba(15, 23, 42, 0.65);
}

.atlas-evogene-deck__traits ul {
  margin: 0;
  padding-left: 1.2rem;
  color: rgba(15, 23, 42, 0.75);
}

.atlas-evogene-deck__footer {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.75rem;
  font-size: 0.85rem;
  color: rgba(30, 41, 59, 0.75);
}

.atlas-evogene-deck__footer strong {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-bottom: 0.2rem;
  color: rgba(30, 41, 59, 0.55);
}
</style>
