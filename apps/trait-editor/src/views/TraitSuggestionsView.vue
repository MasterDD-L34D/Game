<script setup lang="ts">
// ADR-2026-05-29 TKT-BR-09 -- ERMES trait suggestions review (accept/reject UX).
// Read-only consumer of GET /api/traits/suggestions. Decisions are tracked
// locally (Eduardo gate); applying a proposed_patch to a trait is a separate
// flow (trait edit / FASE 3 wiring), not performed here.

import { computed, onMounted, ref } from 'vue';
import { getTraitDataService } from '../services/trait-data.service';
import { useTraitState } from '../services/trait-state.service';
import type { TraitSuggestion, TraitSuggestionDecision } from '../types/trait-suggestion';

const suggestions = ref<TraitSuggestion[]>([]);
const decisions = ref<TraitSuggestionDecision[]>([]);
const note = ref<string | undefined>(undefined);
const loading = ref(true);
const error = ref<string | null>(null);
const { setLoading, setStatus } = useTraitState();
const dataService = getTraitDataService();

const pendingCount = computed(() => decisions.value.filter((d) => d === 'pending').length);
const acceptedCount = computed(() => decisions.value.filter((d) => d === 'accepted').length);
const rejectedCount = computed(() => decisions.value.filter((d) => d === 'rejected').length);

function accept(index: number): void {
  if (index >= 0 && index < decisions.value.length) decisions.value[index] = 'accepted';
}

function reject(index: number): void {
  if (index >= 0 && index < decisions.value.length) decisions.value[index] = 'rejected';
}

function decisionLabel(decision: TraitSuggestionDecision): string {
  if (decision === 'accepted') return 'Accettato';
  if (decision === 'rejected') return 'Rifiutato';
  return '';
}

function confidencePct(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

onMounted(async () => {
  loading.value = true;
  setLoading(true);
  setStatus(null);
  error.value = null;
  try {
    const result = await dataService.getSuggestions();
    suggestions.value = result.suggestions;
    decisions.value = result.suggestions.map(() => 'pending');
    note.value = result.note;
  } catch (err) {
    error.value = 'Impossibile caricare i suggerimenti ERMES in questo momento.';
    setStatus(error.value, 'error');
    console.error('Errore caricamento suggestions ERMES:', err);
  } finally {
    loading.value = false;
    setLoading(false);
  }
});
</script>

<template>
  <section class="trait-suggestions" data-testid="trait-suggestions">
    <header class="trait-suggestions__header">
      <h1>Suggerimenti ERMES</h1>
      <p class="trait-suggestions__summary" data-testid="summary">
        {{ acceptedCount }} accettati, {{ rejectedCount }} rifiutati, {{ pendingCount }} in sospeso
      </p>
    </header>

    <p v-if="loading" class="trait-suggestions__loading" data-testid="loading">Caricamento...</p>

    <p v-else-if="error" class="trait-suggestions__error" data-testid="error">{{ error }}</p>

    <ul v-else-if="suggestions.length > 0" class="trait-suggestions__list">
      <li
        v-for="(s, i) in suggestions"
        :key="i"
        class="trait-suggestions__item"
        :class="`is-${decisions[i]}`"
        data-testid="suggestion-item"
      >
        <div class="trait-suggestions__meta">
          <strong class="trait-suggestions__trait">{{ s.trait_id }}</strong>
          <span class="trait-suggestions__kind">{{ s.kind }}</span>
          <span class="trait-suggestions__biome">{{ s.biome_id }}</span>
          <span class="trait-suggestions__confidence">{{ confidencePct(s.confidence) }}%</span>
        </div>
        <p class="trait-suggestions__rationale">{{ s.rationale }}</p>
        <code v-if="s.proposed_patch" class="trait-suggestions__patch" data-testid="patch">
          {{ s.proposed_patch.op }} {{ s.proposed_patch.path }}<template
            v-if="s.proposed_patch.value !== undefined"
          >
            = {{ s.proposed_patch.value }}</template
          >
        </code>
        <div class="trait-suggestions__actions">
          <button
            type="button"
            data-testid="accept-btn"
            :disabled="decisions[i] === 'accepted'"
            @click="accept(i)"
          >
            Accetta
          </button>
          <button
            type="button"
            data-testid="reject-btn"
            :disabled="decisions[i] === 'rejected'"
            @click="reject(i)"
          >
            Rifiuta
          </button>
          <span
            v-if="decisions[i] !== 'pending'"
            class="trait-suggestions__decision"
            data-testid="decision"
          >
            {{ decisionLabel(decisions[i]) }}
          </span>
        </div>
      </li>
    </ul>

    <p v-else class="trait-suggestions__empty" data-testid="empty">
      {{ note || 'Nessun suggerimento ERMES disponibile.' }}
    </p>
  </section>
</template>

<style scoped>
.trait-suggestions__item {
  border: 1px solid var(--border, #ccc);
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}
.trait-suggestions__item.is-accepted {
  border-color: #2e7d32;
  background: rgba(46, 125, 50, 0.06);
}
.trait-suggestions__item.is-rejected {
  border-color: #b71c1c;
  background: rgba(183, 28, 28, 0.06);
  opacity: 0.7;
}
.trait-suggestions__meta {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  flex-wrap: wrap;
}
.trait-suggestions__kind {
  font-size: 0.75rem;
  text-transform: uppercase;
  opacity: 0.7;
}
.trait-suggestions__patch {
  display: block;
  font-family: monospace;
  font-size: 0.85rem;
  opacity: 0.85;
  margin: 0.25rem 0;
}
.trait-suggestions__actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.4rem;
}
</style>
