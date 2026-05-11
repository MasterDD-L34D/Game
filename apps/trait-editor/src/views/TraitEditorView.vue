<script setup lang="ts">
// TKT-C1 — PARTIAL: full trait editor (legacy 1515 LOC AngularJS controller)
// pending Vue 3 port. This stub shows trait data + redirect-back. Full editor
// scoped follow-up — vedi docs/planning/2026-05-11-tkt-c1-partial-handoff.md.

import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getTraitDataService } from '../services/trait-data.service';
import type { Trait } from '../types/trait';

const route = useRoute();
const router = useRouter();
const trait = ref<Trait | null>(null);

onMounted(async () => {
  const id = route.params.id as string;
  trait.value = await getTraitDataService().getTraitById(id);
});

function back(): void {
  router.push(`/traits/${route.params.id}`);
}
</script>

<template>
  <section class="trait-editor-stub" data-testid="trait-editor-stub">
    <button class="trait-editor-stub__back" @click="back">← Dettaglio</button>
    <div class="trait-editor-stub__notice">
      <h2>Editor — pending full Vue 3 port</h2>
      <p>
        Il pannello di editing completo è in fase di porting da AngularJS. Tracking:
        <code>TKT-C1 partial handoff</code>.
      </p>
      <p v-if="trait">
        Stai visualizzando <strong>{{ trait.name }}</strong> (id <code>{{ trait.id }}</code
        >).
      </p>
    </div>
  </section>
</template>
