<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <h1 class="app-shell__title">Evo-Tactics Mission Console</h1>
      <nav class="app-shell__nav" aria-label="Sezioni principali">
        <RouterLink
          v-for="link in mainLinks"
          :key="link.name"
          :to="link.to"
          class="app-shell__nav-link"
          :class="{ 'app-shell__nav-link--active': link.active }"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
    </header>

    <main class="app-shell__main">
      <RouterView v-slot="slotProps">
        <component :is="slotProps.Component" v-bind="slotProps.route.props || {}" />
      </RouterView>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

const route = useRoute();

const mainLinks = computed(() => {
  const currentName = route.name;
  return [
    {
      name: 'workflow',
      to: { name: 'workflow' },
      label: 'Workflow Orchestrator',
      active: currentName === 'workflow',
    },
    {
      name: 'atlas',
      to: { name: 'atlas-pokedex' },
      label: 'Atlas Nebula Dataset',
      active: (currentName && String(currentName).startsWith('atlas-')) || currentName === 'atlas',
    },
  ];
});
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at 0 0, rgba(23, 28, 61, 0.45), transparent 60%),
    radial-gradient(circle at 100% 0, rgba(26, 51, 61, 0.4), transparent 55%),
    #0a0d14;
  color: #f2f4ff;
}

.app-shell__header {
  padding: 2.5rem clamp(2rem, 4vw, 4rem) 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: linear-gradient(135deg, rgba(18, 21, 37, 0.95), rgba(12, 20, 32, 0.8));
  border-bottom: 1px solid rgba(129, 161, 193, 0.1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}

.app-shell__title {
  font-size: clamp(1.75rem, 2vw, 2.25rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9dc3ff;
  margin: 0;
}

.app-shell__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.app-shell__nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 1.2rem;
  border-radius: 999px;
  font-size: 0.95rem;
  text-decoration: none;
  color: rgba(226, 237, 255, 0.82);
  background: rgba(34, 47, 79, 0.55);
  border: 1px solid rgba(94, 145, 221, 0.35);
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.app-shell__nav-link:hover {
  background: rgba(94, 145, 221, 0.45);
  color: #fff;
  transform: translateY(-1px);
}

.app-shell__nav-link--active {
  background: linear-gradient(135deg, rgba(94, 145, 221, 0.8), rgba(143, 197, 255, 0.65));
  color: #050812;
  box-shadow: 0 4px 14px rgba(94, 145, 221, 0.35);
}

.app-shell__main {
  flex: 1;
  padding: clamp(1.5rem, 3vw, 3rem);
}
</style>
