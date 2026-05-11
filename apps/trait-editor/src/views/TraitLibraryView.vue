<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { getTraitDataService } from '../services/trait-data.service';
import { useTraitState } from '../services/trait-state.service';
import type { Trait } from '../types/trait';

const traits = ref<Trait[]>([]);
const filter = ref('');
const selectedArchetype = ref('all');
const { setLoading, setStatus } = useTraitState();
const dataService = getTraitDataService();

const archetypes = computed<string[]>(() => {
  const set = new Set<string>(traits.value.map((trait) => trait.archetype));
  return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
});

const filteredTraits = computed<Trait[]>(() => {
  const term = filter.value.trim().toLowerCase();
  return traits.value.filter((trait) => {
    const matchesArchetype =
      selectedArchetype.value === 'all' || trait.archetype === selectedArchetype.value;
    const matchesTerm =
      !term ||
      trait.name.toLowerCase().includes(term) ||
      trait.description.toLowerCase().includes(term) ||
      trait.signatureMoves.some((m) => m.toLowerCase().includes(term));
    return matchesArchetype && matchesTerm;
  });
});

onMounted(async () => {
  setLoading(true);
  setStatus(null);
  try {
    const loaded = await dataService.getTraits();
    traits.value = loaded;
    if (dataService.getLastError()) {
      setStatus('Dati caricati da backup locale a causa di un problema di rete.', 'info');
    }
  } catch (err) {
    console.error('Errore durante il caricamento dei tratti:', err);
    setStatus('Impossibile recuperare la libreria tratti in questo momento.', 'error');
  } finally {
    setLoading(false);
  }
});
</script>

<template>
  <section class="trait-library">
    <header class="trait-library__header">
      <input
        v-model="filter"
        type="search"
        class="trait-library__search"
        placeholder="Cerca tratto..."
      />
      <select v-model="selectedArchetype" class="trait-library__filter">
        <option v-for="a in archetypes" :key="a" :value="a">
          {{ a === 'all' ? 'Tutti gli archetipi' : a }}
        </option>
      </select>
    </header>
    <ul class="trait-library__list">
      <li
        v-for="trait in filteredTraits"
        :key="trait.id"
        class="trait-library__item"
        data-testid="trait-item"
      >
        <router-link :to="`/traits/${trait.id}`" class="trait-library__link">
          <strong>{{ trait.name }}</strong>
          <span class="trait-library__archetype">{{ trait.archetype }}</span>
          <span class="trait-library__description">{{ trait.description }}</span>
        </router-link>
      </li>
      <li v-if="filteredTraits.length === 0" class="trait-library__empty">
        Nessun tratto trovato.
      </li>
    </ul>
  </section>
</template>
