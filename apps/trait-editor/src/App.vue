<script setup lang="ts">
import { useTraitState } from './services/trait-state.service';

const { state } = useTraitState();

function statusIcon(): string {
  const status = state.status;
  if (!status) return '';
  if (status.variant === 'error') return '⚠️';
  if (status.variant === 'success') return '✅';
  return 'ℹ️';
}
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <h1 class="app-shell__title">Trait Editor</h1>
      <p class="app-shell__subtitle">
        Anteprima indipendente della libreria tratti con mock locali o dataset condivisi.
      </p>
      <nav class="app-shell__nav">
        <router-link to="/traits">Libreria</router-link>
      </nav>
    </header>
    <main class="app-shell__content">
      <div v-if="state.status" class="app-shell__status" :data-variant="state.status.variant">
        <span class="app-shell__status-icon">{{ statusIcon() }}</span>
        <span class="app-shell__status-message">{{ state.status.message }}</span>
      </div>
      <div v-if="state.isLoading" class="app-shell__loading">Caricamento...</div>
      <div class="app-shell__viewport">
        <router-view />
      </div>
    </main>
  </div>
</template>
