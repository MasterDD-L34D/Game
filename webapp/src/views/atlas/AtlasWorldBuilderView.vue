<template>
  <section class="atlas-world">
    <header class="atlas-world__header">
      <h3>World Builder</h3>
      <p>
        Blueprint ambientali con preset già filtrati per il branch Nebula. Ogni ambiente include hazard stabilizzati e
        corridoi di ingaggio suggeriti.
      </p>
    </header>

    <div class="atlas-world__grid">
      <article v-for="biome in biomes" :key="biome.id" class="atlas-world__card">
        <header>
          <h4>{{ biome.name }}</h4>
          <span class="atlas-world__hazard">{{ biome.hazard }}</span>
        </header>
        <p class="atlas-world__story">{{ biome.storyHook }}</p>
        <dl class="atlas-world__meta" aria-label="Piano operativo">
          <div>
            <dt>Stabilità</dt>
            <dd>{{ biome.stability }}</dd>
          </div>
          <div>
            <dt>Operazioni</dt>
            <dd>{{ biome.operations.join(', ') }}</dd>
          </div>
          <div>
            <dt>Corridoi</dt>
            <dd>{{ biome.lanes.join(', ') }}</dd>
          </div>
        </dl>
        <footer>
          <strong>Infiltrazione</strong>
          <p>{{ biome.infiltration }}</p>
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

const biomes = computed(() => (Array.isArray(props.dataset.biomes) ? props.dataset.biomes : []));
</script>

<style scoped>
.atlas-world {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.atlas-world__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: rgba(15, 23, 42, 0.75);
}

.atlas-world__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1.75rem;
}

.atlas-world__card {
  padding: 1.75rem;
  border-radius: 1.25rem;
  background: linear-gradient(160deg, rgba(236, 254, 255, 0.92), rgba(224, 242, 254, 0.88));
  border: 1px solid rgba(125, 211, 252, 0.35);
  box-shadow: 0 14px 32px rgba(14, 116, 144, 0.18);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  color: #0f172a;
}

.atlas-world__card header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.atlas-world__hazard {
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(14, 116, 144, 0.12);
  color: #0e7490;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.atlas-world__story {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: rgba(15, 23, 42, 0.75);
}

.atlas-world__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.75rem;
}

.atlas-world__meta div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.atlas-world__meta dt {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.55);
}

.atlas-world__meta dd {
  margin: 0;
  font-weight: 600;
}

.atlas-world__card footer {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.9rem;
  color: rgba(15, 23, 42, 0.7);
}

.atlas-world__card footer strong {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(15, 23, 42, 0.55);
}
</style>
