<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getTraitDataService } from '../services/trait-data.service';
import { useTraitState } from '../services/trait-state.service';
import type { Trait } from '../types/trait';

const route = useRoute();
const trait = ref<Trait | null>(null);
const { setLoading, setStatus, setPreviewTrait } = useTraitState();
const dataService = getTraitDataService();

async function loadTrait(id: string): Promise<void> {
  setLoading(true);
  try {
    const found = await dataService.getTraitById(id);
    trait.value = found;
    if (found) {
      setPreviewTrait(found);
      setStatus(null);
    } else {
      setStatus(`Tratto "${id}" non trovato.`, 'error');
    }
  } catch (err) {
    console.error('Errore caricamento dettaglio:', err);
    setStatus('Errore caricamento dettaglio tratto.', 'error');
  } finally {
    setLoading(false);
  }
}

onMounted(() => {
  const id = route.params.id as string;
  loadTrait(id);
});

watch(
  () => route.params.id,
  (newId) => {
    if (typeof newId === 'string') loadTrait(newId);
  },
);
</script>

<template>
  <section class="trait-detail">
    <router-link to="/traits" class="trait-detail__back">← Libreria</router-link>
    <div v-if="trait" class="trait-detail__content" data-testid="trait-detail-content">
      <h2>{{ trait.name }}</h2>
      <p class="trait-detail__archetype">Archetipo: {{ trait.archetype }}</p>
      <p class="trait-detail__description">{{ trait.description }}</p>
      <p class="trait-detail__playstyle">{{ trait.playstyle }}</p>
      <ul class="trait-detail__moves">
        <li v-for="(move, i) in trait.signatureMoves" :key="i">{{ move }}</li>
      </ul>
      <router-link :to="`/traits/${trait.id}/edit`" class="trait-detail__edit">
        Modifica
      </router-link>
    </div>
    <div v-else class="trait-detail__missing" data-testid="trait-detail-missing">
      Caricamento dettaglio in corso o tratto non trovato.
    </div>
  </section>
</template>
